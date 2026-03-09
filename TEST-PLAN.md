# Automated Test Suite Plan

## Context

The project has **zero test infrastructure** — no test framework, no test utilities, no test files (except one `tools/check-secrets.test.js` using Node's native runner). With 67+ API routes, 9 DB tables, security-critical auth/rate-limiting, and SSRF protection, automated tests are essential before production hardening.

## Framework: Vitest

**Why Vitest over Jest:**
- Native ESM support (project uses `module: "esnext"`)
- TypeScript without extra config (no `ts-jest`)
- Resolves `@/*` path aliases via `vite.config.ts`
- Fast re-runs via Vite's module graph
- Coexists with the existing `node --test` script

## Infrastructure Setup

### Install dependencies
```bash
npm install -D vitest @vitest/coverage-v8
npm install -D @testing-library/react @testing-library/jest-dom jsdom  # Phase 3 only
```

### New files

**`vitest.config.ts`** (project root):
```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', 'e2e'],
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    environmentMatchGlobs: [
      ['src/components/**/*.test.tsx', 'jsdom'],
    ],
  },
});
```

**`src/test/setup.ts`** — Global env stubs for all tests.

**`src/test/db-helper.ts`** — Creates in-memory `better-sqlite3` instance with full schema (copied from `db.ts` DDL). Exports `createTestDb()` and a `vi.mock` helper.

### Update `package.json` scripts
```json
"test:unit": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage",
"test:secrets": "node --test tools/check-secrets.test.js",
"test": "npm run test:secrets && npm run test:unit"
```

---

## Phase 1 — Security & Data Integrity (highest priority)

### 1. `src/lib/auth-guard.test.ts`
File: [auth-guard.ts](src/lib/auth-guard.ts) (67 lines, all exported)

| Function | Tests |
|----------|-------|
| `secureCompare()` | equal strings → true; different strings → false; different lengths → false; empty strings; unicode |
| `hasValidApiKey()` | no `API_KEY` env → false; valid `x-api-key` header → true; valid `api_key` query → true; wrong key → false; missing both → false |
| `hasValidBasicAuth()` | no env vars → false; valid auth → true; invalid creds → false; no header → false; non-Basic scheme → false; malformed base64 → false; no colon → false; password with colons (splits on first `:` at line 51) |
| `requireOrchestratorAuth()` | valid API key → null; valid basic auth → null; neither → 401 response |

**Mocking:** `vi.stubEnv()` for env vars; construct `NextRequest` objects directly.

### 2. `src/middleware.test.ts`
File: [middleware.ts](src/middleware.ts) (108 lines)

| Area | Tests |
|------|-------|
| Public routes | `/`, `/start`, `/checkout`, `/terms`, `/privacy`, `/status/abc`, `/delivery/xyz`, `/my-pdfs`, `/shared/tok`, `/api/shared/tok`, `/api/pdf/orders`, `/api/health`, `/api/scrape`, `/api/generate-plan` all return `NextResponse.next()` |
| Static assets | `/favicon.ico`, `/robots.txt`, `/sitemap.xml` pass through |
| API key auth | Valid `x-api-key` header bypasses; valid `api_key` query bypasses; invalid key does NOT bypass |
| Basic auth disabled | `BASIC_AUTH_ENABLED` not set → all routes pass through |
| Basic auth enabled | Valid creds → pass; invalid creds → 401 with `WWW-Authenticate` header |
| `isAuthEnabled()` | Recognizes `'1'`, `'true'`, `'yes'`, `'on'` (case-insensitive) |
| Edge `secureCompare` | equal → true; different → false; different lengths → false |

### 3. `src/lib/scraper.test.ts` (SSRF focus)
File: [scraper.ts](src/lib/scraper.ts)

| Area | Tests |
|------|-------|
| SSRF blocking | `127.0.0.1`, `10.x`, `172.16-31.x`, `192.168.x`, `169.254.x`, `0.0.0.0`, `::1`, `fd00::`, `fe80::`, `::ffff:127.0.0.1` all blocked |
| `detectUrlType()` | App Store URLs → `'appstore'`; Play Store → `'googleplay'`; generic → `'website'` |
| `extractFeatures()` | bullet points, checkmarks extracted; caps at 10 |
| `decodeHtmlEntities()` | all 7 entity replacements |
| `extractMeta()` | `property` attr, `name` attr, reversed attribute order |

**Mocking:** `vi.mock('dns/promises')` for DNS resolution; `vi.stubGlobal('fetch')` for HTTP.

### 4. `src/lib/api-guard.test.ts`
File: [api-guard.ts](src/lib/api-guard.ts)

| Area | Tests |
|------|-------|
| IP extraction | `x-forwarded-for` (first IP), fallback chain (`x-real-ip`, `cf-connecting-ip`, etc.), null when no headers |
| `guardApiRoute()` | first request → allowed; at limit → allowed; over limit → 429 + `Retry-After` header; DB error → fail-open |

**Needs:** in-memory SQLite via `db-helper.ts`.

### 5. `src/lib/db.test.ts`
File: [db.ts](src/lib/db.ts)

| Function | Tests |
|----------|-------|
| `savePlan/getPlan/deletePlan` | CRUD cycle; upsert on conflict; delete non-existent returns false |
| `saveContent/getContent` | upsert with UNIQUE constraint; null key normalized to empty string; list by content_type |
| `consumeApiRateLimit` | first request creates row + returns allowed; sequential decrements remaining; over max → not allowed; different endpoints independent; different time windows separate |
| `transitionPdfOrderStatus` | matching from-status → true; non-matching → false; multiple `fromStatuses` array |
| `tryIncrementDownloadCount` | under limit → true + increment; at limit → false |
| `trackApiUsage` | creates new row; increments existing; `blocked: true` increments `blocked_count` |
| `createRun/updateRun/getRun` | orchestration run lifecycle |

**Uses:** fresh in-memory DB per test via `createTestDb()`.

### 6. `src/lib/stripe.test.ts`
File: [stripe.ts](src/lib/stripe.ts)

| Area | Tests |
|------|-------|
| `verifyAndParseWebhook` | valid signature → parsed event; invalid signature → throws; expired timestamp (>5min) → throws; future timestamp → throws; missing env var → throws; malformed header → throws; tampered body → throws |

**Approach:** compute valid HMAC in test using same algorithm (HMAC-SHA256 of `${timestamp}.${body}`).

---

## Phase 2 — Core Functionality

### 7. `src/lib/pipeline.test.ts`
File: [pipeline.ts](src/lib/pipeline.ts)

**Prerequisite:** Export `parseGeminiJson` (currently module-private) — it's a pure function with complex edge cases that warrant direct testing.

| Function | Tests |
|----------|-------|
| `parseGeminiJson` | clean JSON; markdown code block wrapping; missing outer braces; regex fallback for partial JSON; invalid JSON throws |
| `callGemini` (mock fetch) | success → parsed data; 429 → retries with backoff (3 max); 500/502/503 → retries; 400 → no retry; all retries exhausted → throws |

### 8. `src/lib/orchestrator.test.ts`
File: [orchestrator.ts](src/lib/orchestrator.ts)

| Function | Tests |
|----------|-------|
| `normalizeOrchestratePackInput` | valid tone passes; invalid tone defaults to `'bold'`; channels dedup/lowercase/trim; non-array defaults to `[]`; goal trims whitespace; `includeVideo` boolean coercion |
| `buildInitialSteps` | without video → 7 steps all pending; with video → 8 steps |

### 9. `src/lib/asset-generator.test.ts`
File: [asset-generator.ts](src/lib/asset-generator.ts)

| Function | Tests |
|----------|-------|
| `generateAssets` | returns 3 assets (og-image, social-card, github-social); correct dimensions; HTML contains substituted values |
| `fillTemplate` | all placeholders replaced; feature_1-10 with fallback; `{{year}}` = current year |

### 10. `src/lib/screenshot-compositor.test.ts`
File: [screenshot-compositor.ts](src/lib/screenshot-compositor.ts)

| Function | Tests |
|----------|-------|
| `buildCompositeHtml` | returns HTML with correct width/height; headline HTML-escaped; device profiles produce different frames; missing headline throws |

### 11. API Route Integration Tests

**`src/app/api/health/route.test.ts`:**
- GET → 200 with `{ status: 'ok' }`

**`src/app/api/plans/route.test.ts`:**
- GET → lists plans; POST → creates plan

**`src/app/api/plans/[id]/route.test.ts`:**
- GET existing → 200; GET missing → 404; DELETE existing → 200; DELETE missing → 404

**Approach:** Import route handler functions directly; construct `NextRequest`; mock DB with in-memory helper.

---

## Phase 3 — UI & E2E (lower priority)

### Component Tests (requires jsdom environment + @testing-library/react)

- `src/components/Toast.test.tsx` — context provider, show/dismiss, auto-dismiss timer
- `src/components/PlanSidebar.test.tsx` — localStorage persistence of collapsed sections
- `src/components/ConfirmDialog.test.tsx` — open/close, confirm/cancel callbacks

### E2E Smoke Tests (requires @playwright/test)

Install `@playwright/test` as devDependency. Create `e2e/` directory + `playwright.config.ts`.

- `e2e/smoke.spec.ts` — landing page loads with expected content
- `e2e/plan-flow.spec.ts` — submit URL → plan page created

Script: `"test:e2e": "playwright test"`

---

## Mocking Strategy Summary

| Dependency | Approach |
|---|---|
| `fetch` (Gemini, Kie.ai, Perplexity) | `vi.stubGlobal('fetch', vi.fn())` |
| SQLite (`getDb()`) | `vi.mock('@/lib/db')` + in-memory `better-sqlite3(':memory:')` |
| `process.env` | `vi.stubEnv('KEY', 'value')` |
| `dns.lookup` | `vi.mock('dns/promises')` |
| `NextRequest/NextResponse` | Use real classes from `next/server` |
| `localStorage` | jsdom environment (Phase 3 only) |
| `Date.now()` | `vi.useFakeTimers()` or pass `nowMs` params |

## Verification

After implementation, verify with:
1. `npm run test:unit` — all Vitest tests pass
2. `npm run test:coverage` — review coverage report for gaps
3. `npm run test` — both secrets check + unit tests pass
4. `npm run test:e2e` — E2E smoke tests pass (Phase 3)
5. Ensure `npm run build` still succeeds (test files excluded from build)

## Implementation Order

1. Infrastructure (vitest.config.ts, helpers, package.json)
2. auth-guard.test.ts (simplest — pure functions, no DB)
3. middleware.test.ts (similar — Edge secureCompare)
4. stripe.test.ts (pure crypto)
5. scraper.test.ts (SSRF — mock dns/fetch)
6. db.test.ts (in-memory SQLite)
7. api-guard.test.ts (DB + request mocking)
8. pipeline.test.ts (mock fetch, export parseGeminiJson)
9. orchestrator.test.ts (input normalization)
10. asset-generator.test.ts + screenshot-compositor.test.ts
11. API route integration tests
12. Component tests (Phase 3)
13. E2E tests (Phase 3)
