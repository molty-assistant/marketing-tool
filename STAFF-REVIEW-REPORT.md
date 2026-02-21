# Staff Review Report

Date: 2026-02-20
Scope: Full codebase pass (server routes, DB, scheduling, security posture, runtime/deploy constraints, validation coverage)
Mode: Review-only (no code changes applied in this audit)

## Findings (Ordered by Severity)

### 1. [FIXED] [P1] `post-to-buffer` is broken on fresh DBs (`social_posts` table missing)
- File refs:
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/post-to-buffer/route.ts:107`
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/post-to-buffer/route.ts:141`
  - `/Users/moltbot/Projects/marketing-tool/src/lib/db.ts:22`
- Detail:
  - API reads/writes `social_posts`, but schema initialization does not create that table.
  - Fresh environments can fail with `no such table: social_posts`.

### 2. [P1] `review-monitor` POST flow is non-functional due to request-contract mismatches
- File refs:
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/review-monitor/route.ts:57`
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/scrape-reviews/route.ts:202`
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/review-monitor/route.ts:99`
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/review-sentiment/route.ts:36`
- Detail:
  - `review-monitor` calls `scrape-reviews` with only `{ planId }`, but `scrape-reviews` requires `appStoreUrl`.
  - `review-monitor` calls `review-sentiment` with only `{ planId }`, but `review-sentiment` requires `reviews`.
  - Result: automated monitoring path fails or degrades immediately.

### 3. [P1] Security posture is public-by-default unless env auth is explicitly enabled
- File refs:
  - `/Users/moltbot/Projects/marketing-tool/src/proxy.ts:33`
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/plans/[id]/route.ts:30`
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/auto-publish/route.ts:26`
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/content-schedule/route.ts:31`
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/process-schedule/route.ts:10`
- Detail:
  - Middleware allows all requests when basic auth is not enabled/configured.
  - Multiple mutable routes have no route-level auth.

### 4. [P1] Potential host-header SSRF/API-key exfiltration path in scheduler
- File refs:
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/process-schedule/route.ts:32`
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/process-schedule/route.ts:36`
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/process-schedule/route.ts:40`
- Detail:
  - Endpoint derives callback base URL from request origin and forwards `x-api-key` on internal callback.
  - If host/proxy headers are spoofable, internal auth header can be leaked externally.

### 5. [FIXED] [P1] SSRF risk in generic scraper endpoint
- File refs:
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/scrape/route.ts:20`
  - `/Users/moltbot/Projects/marketing-tool/src/lib/scraper.ts:157`
- Detail:
  - Arbitrary URL fetching with no private IP / metadata host protections.

### 6. [P2] Scheduler can double-process jobs under concurrent execution
- File refs:
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/process-schedule/route.ts:16`
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/process-schedule/route.ts:27`
- Detail:
  - Due rows are selected then updated in separate operations.
  - Concurrent callers can claim and process the same rows.

### 7. [FIXED] [P2] Image generation/storage is tightly coupled to Railway path and breaks outside that runtime
- File refs:
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/generate-post-image/route.ts:30`
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/generate-hero-bg/route.ts:19`
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/images/[filename]/route.ts:5`
- Detail:
  - Hardcoded `/app/data/images` path fails on environments where `/app` is missing or non-writable.

### 8. [P2] Performance update endpoint can report success when no row was updated
- File refs:
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/content-schedule/[id]/performance/route.ts:27`
  - `/Users/moltbot/Projects/marketing-tool/src/lib/db.ts:342`
- Detail:
  - Handler always returns success; DB helper does not return change count for validation.

### 9. [FIXED] [P2] Media attachment base URL is deployment-coupled
- File ref:
  - `/Users/moltbot/Projects/marketing-tool/src/app/api/post-to-buffer/route.ts:19`
- Detail:
  - `PUBLIC_BASE_URL` is hardcoded to a single production domain.
  - Breaks in staging/preview/custom domain deployments.

### 10. [P3] Operational quality gaps: no test suite and some lifecycle debt
- File refs:
  - `/Users/moltbot/Projects/marketing-tool/package.json:8`
  - `/Users/moltbot/Projects/marketing-tool/src/hooks/usePlan.ts:61`
  - `/Users/moltbot/Projects/marketing-tool/src/hooks/usePlan.ts:64`
- Detail:
  - No `test` script; no automated regression guardrails.
  - `usePlan` returns an abort cleanup from inside async callback, but effect does not wire cleanup.

## Fix Status

| # | Status |
|---|--------|
| 1 | **FIXED** — `social_posts` table added to schema init |
| 5 | **FIXED** — private IP / metadata host blocklist added to scraper |
| 7 | **FIXED** — `IMAGE_DIR` env var with `/app/data/images` default |
| 9 | **FIXED** — `PUBLIC_BASE_URL` configurable via env var |
| 2, 3, 4, 6, 8, 10 | Open |

## Validation Status

1. `npm run lint --silent`: passed.
2. `npm run build`: passed.
3. `npm test`: failed because `test` script is missing.
