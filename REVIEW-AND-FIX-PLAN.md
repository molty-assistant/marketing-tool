# Marketing Tool: Post-Review Fix & Redesign Plan

**Created:** 2026-02-21
**Updated:** 2026-02-21 (Phase 1 + 2 + 3 complete + P2 hardening; Phase 3.5 pre-deploy added after verified review)

## Context

A comprehensive 5-part review (code quality, UX/UI, product fit, deploy readiness, MVP assessment) identified 9 blocking issues and a navigation problem: the core "paste URL, get social content" flow is buried under 38 pages and 25+ sidebar items. This plan addresses all blockers and redesigns the navigation to serve both the quick-win user and the full-suite power user, without removing any existing features.

---

## Phase 1: Critical Fixes (P0/P1) — COMPLETE

All 7 items implemented and verified. Build passes clean.

### 1.1 Fix `usePlan` hook cleanup (memory leak) — DONE
**File:** `src/hooks/usePlan.ts`
**Problem:** Abort controller cleanup returned from `load()` callback, not from `useEffect`. Cleanup never fires on unmount.
**What was done:** useEffect now captures the cleanup promise from `load()` and returns an unmount handler that resolves it: `return () => { cleanup.then((abort) => abort?.()); }`

### 1.2 Fix `process-schedule` SSRF vulnerability — DONE
**File:** `src/app/api/process-schedule/route.ts`
**Problem:** `request.nextUrl.origin` is spoofable via Host header, leaking `x-api-key` to attacker-controlled domains.
**What was done:** Replaced `request.nextUrl.origin` with `internalBaseUrl()` imported from `src/lib/orchestrator.ts` (uses `http://localhost:${PORT}`).

### 1.3 Fix `process-schedule` double-processing race condition — DONE
**File:** `src/app/api/process-schedule/route.ts`
**Problem:** Separate SELECT then UPDATE allows concurrent callers to claim the same rows.
**What was done:** Wrapped in `db.transaction()` with atomic `UPDATE content_schedule SET status = 'generating' ... WHERE ... AND status = 'scheduled' RETURNING *`.

### 1.4 Fix `proxy.ts` timing attack on API key comparison — DONE
**File:** `src/proxy.ts` + `src/lib/auth-guard.ts`
**Problem:** Used `===` for API key and basic auth comparisons — vulnerable to timing attacks.
**What was done:** Imported `secureCompare` from `auth-guard.ts` (uses `timingSafeEqual` from `node:crypto`). Applied to both API key comparison and basic auth username/password comparison.

### 1.5 Fix dark mode on Tone Compare page — DONE
**File:** `src/app/plan/[id]/tone-compare/page.tsx`
**Problem:** ~30 hardcoded dark slate colors, ~20 raw `<button>` elements.
**What was done:** Full rewrite — all colors replaced with theme tokens (`bg-card`, `text-foreground`, `bg-muted`, `border-border`, `bg-primary/10`, `bg-destructive/10`). Generate/Copy buttons migrated to shadcn `<Button>`. Custom section/tone selector buttons use theme tokens for active/inactive states.

### 1.6 Fix dark mode on ErrorBoundary — DONE
**File:** `src/components/ErrorBoundary.tsx`
**Problem:** Hardcoded `bg-slate-800/50`, `text-white`, `bg-slate-900/40`.
**What was done:** Replaced with `bg-card border-border`, `text-foreground`, `text-muted-foreground`, `bg-muted/50 border-border`.

### 1.7 Fix dark mode on Skeleton components — DONE
**File:** `src/components/Skeleton.tsx`
**Problem:** `Bone` uses `bg-slate-700/50` (invisible in light mode). All skeleton card wrappers use hardcoded dark colors.
**What was done:** `Bone` now uses `bg-muted`. All card wrappers use `bg-card border-border`. SERP preview section uses `bg-primary/5 border-primary/20`. SERP card uses `bg-card`.

---

## Phase 2: Navigation Redesign (Sidebar + Hub) — COMPLETE

Both items implemented and verified. Build passes clean. All 15 sub-page links verified working.

### 2.1 Restructure PlanSidebar.tsx — DONE
**File:** `src/components/PlanSidebar.tsx`
**What was done:**
- Regrouped nav into 7 sections: **Create** (always expanded, no collapse toggle) with Quick Win, Social Posts, Carousel; **Plan** (default open) with Overview; then collapsible Strategy, Content, Distribution, SEO & ASO, Export sections
- Create section styled with indigo uppercase label and visual separator — impossible to miss
- localStorage persistence (key: `sidebar-collapsed`) with hydration-safe initializer function
- Mobile nav: Create items as primary row (Quick Win, Social Posts, Carousel, Overview), "More" button for suite sections
- Quick Win / Social / Carousel removed from Distribution group (no duplicates)

### 2.2 Redesign Plan Overview page — DONE
**File:** `src/app/plan/[id]/page.tsx`
**What was done:**
- Header kept (app icon, name, one-liner, date)
- Top tier: 3 large gradient ActionCards (Quick Win indigo→violet, Carousel pink→rose, Social Posts cyan→blue) with hover scale+shadow
- Bottom tier: 12 smaller SuiteCards in responsive 2/3/4-col grid (Brief, Competitors, Draft, Keywords, Tone Compare, SERP, Emails, Templates, Translations, Schedule, Calendar, Export)
- Removed old 5 equal hub cards, stats row, and "suggested next steps"
- Loading skeleton matches final layout; error state links back to dashboard

---

## Phase 3: UX Polish (P1/P2) — COMPLETE

All 5 items implemented and verified. Build passes clean.

### 3.1 Quick Win: Cache generated results — DONE
**File:** `src/app/plan/[id]/quickwin/page.tsx`
**Problem:** Auto-fires generation on every page visit. No caching. Wastes API credits and makes navigation slow.
**What was done:** On mount, checks `sessionStorage` for `quickwin-${planId}`. If cached data exists, hydrates `igData`, `tiktokData`, and `image` state, skips generation. On successful generation, saves results to sessionStorage. Added "Regenerate" button (visible when cached) that clears cache and re-triggers all generation. Button re-appears after regeneration completes.

### 3.2 Quick Win: Surface all generated fields — DONE
**File:** `src/app/plan/[id]/quickwin/page.tsx`
**Problem:** The AI generates `hook`, `cta`, `best_posting_time`, `engagement_tips`, `media_concept` but only `caption` and `hashtags` were displayed.
**What was done:** Updated `SocialPostData` type to include all API fields. On both Instagram and TikTok cards: `hook` shown as indigo callout above caption, `cta` as badge below hashtags, `best_posting_time` as clock badge. Collapsible "Tips" disclosure per card shows `engagement_tips` as bullet list.

### 3.3 Carousel: Add progress indicator — DONE
**File:** `src/app/plan/[id]/carousel/page.tsx`
**Problem:** Generation takes 60-90s but only showed a generic spinner with static text.
**What was done:** Added `generationStep` + `elapsed` state. `useEffect` cycles through step labels based on elapsed time: "Generating concept..." (0-5s), "Creating hero slide..." (5-15s), "Rendering slide N of M..." (15s+, cycling per slide), "Finalizing..." (near end). Progress bar with elapsed timer, estimated remaining, capped at 95%.

### 3.4 Social page: Persist state to sessionStorage — DONE
**File:** `src/app/plan/[id]/social/page.tsx`
**Problem:** All state (platform, caption, hashtags, image, idea) lost on page refresh.
**What was done:** Debounced save (500ms) of `selectedPlatform`, `caption`, `hashtagsInput`, `imageMode`, `idea`, `image` to `sessionStorage` keyed by `social-${planId}`. Hydration on mount. Cleared after successful Buffer queue. Added "Start Over" button next to Regenerate that clears cache and resets all state. Video state intentionally not persisted (transient). Also fixed edge case: video polling now handles `done === true` without `videoUrl` or `error`.

### 3.5 Fix review-monitor silent failure — DONE
**File:** `src/app/api/review-monitor/route.ts`
**Problem:** SSRF via `request.nextUrl.origin`, missing data in downstream calls, silent failures.
**What was done:** (1) Replaced `request.nextUrl.origin` with `internalBaseUrl()` from orchestrator (SSRF fix). (2) Fixed scrape-reviews call to pass `url: appUrl` so scraper knows what to scrape. (3) Fixed review-sentiment call to pass `reviews` array (was only sending `planId`). (4) Added `console.warn` logging when sentiment call fails instead of silently swallowing.

### Post-Phase 3: P2 Hardening Pass — COMPLETE

Staff-level review of Phase 3 changes identified additional P2 issues. All fixed, build passes clean.

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `quickwin/page.tsx` | Duplicated ~60 lines of generation logic between `useEffect` and `handleRegenerate` | Extracted shared `runGeneration(cancelled)` callback used by both |
| 2 | `quickwin/page.tsx` | `handleRegenerate` async IIFE had no unmount/cancellation guard | `regenCancelRef` tracks in-flight regen; new calls cancel previous |
| 3 | `quickwin/page.tsx` | `navigator.clipboard.writeText` fire-and-forget (unhandled rejection) | Added `.catch()` to `copyToClipboard` |
| 4 | `carousel/page.tsx` | `onDragEnter` missing `e.preventDefault()` — breaks drag-and-drop in Firefox | `handleDragEnter` now receives event and calls `preventDefault()` |
| 5 | `social/page.tsx` | Debounced save effect re-writes cache 500ms after hydration (race) | Added `hydrated` ref; save effect skips until hydration completes |
| 6 | `social/page.tsx` | `sessionStorage.setItem` not wrapped in try/catch | Added try/catch (fixed in earlier pass) |
| 7 | `review-monitor/route.ts` | Contract mismatch: sent `url` but `scrape-reviews` expects `appStoreUrl` | Fixed parameter name (P1, fixed in earlier pass) |
| 8 | `quickwin/page.tsx` | Inconsistent optional chaining on `.hashtags.map()` (4 occurrences) | Added `?? []` fallback on all unguarded calls (P3, fixed in earlier pass) |

---

## Phase 3.5: Pre-Deploy Fixes (verified review findings)

A 5-area review on Feb 21 (code quality, UX/UI, product fit, deploy readiness, MVP assessment) was run and all findings verified against actual code. False positives from earlier reviews were removed. These items block the dog-food test.

### 3.5.1 Activate middleware — REQUIRED (P1)
**File:** `src/proxy.ts` → rename to `src/middleware.ts`
**Problem:** `proxy.ts` exports `proxy()` function + `config` matcher, but Next.js ONLY discovers middleware from files named `middleware.ts`. The build's `middleware-manifest.json` is empty `{}`. Auth (basic auth + API key) is silently not running on any route.
**Fix:**
1. Rename `src/proxy.ts` → `src/middleware.ts`
2. Change `export function proxy(request: NextRequest)` → `export default function middleware(request: NextRequest)`
3. Build and verify `middleware-manifest.json` has entries
4. Set env vars in Railway: `BASIC_AUTH_ENABLED=true`, `BASIC_AUTH_USER`, `BASIC_AUTH_PASS`

### 3.5.2 Gemini Pro/Flash split — REQUIRED (P2)
**Problem:** 6 routes use `gemini-2.0-flash`, rest use `gemini-2.5-flash`. We want creative routes on 2.5 Pro, structured routes on 2.5 Flash. Single `GEMINI_API_KEY` (free tier), just different model strings.

**Change to `gemini-2.5-pro`** (5 routes — user-facing creative content):
| File | Line | Currently |
|------|------|-----------|
| `src/app/api/generate-social-post/route.ts` | 96 | `gemini-2.0-flash` |
| `src/app/api/caption-to-image-brief/route.ts` | 49 | `gemini-2.5-flash` |
| `src/app/api/generate-carousel/route.ts` | 133 | `gemini-2.5-flash` |
| `src/app/api/brand-voice/route.ts` | 26 | `gemini-2.5-flash` |
| `src/app/api/generate-draft/route.ts` | 98 | `gemini-2.5-flash` |

**Change to `gemini-2.5-flash`** (5 routes — currently on 2.0, upgrade to 2.5):
| File | Line | Currently |
|------|------|-----------|
| `src/app/api/caption-to-veo-prompt/route.ts` | 32 | `gemini-2.0-flash` |
| `src/app/api/generate-schedule/route.ts` | 89 | `gemini-2.0-flash` |
| `src/app/api/content-calendar/route.ts` | 104 | `gemini-2.0-flash` |
| `src/app/api/auto-publish/route.ts` | 77 | `gemini-2.0-flash` |
| `src/app/api/review-monitor/route.ts` | 117 | `gemini-2.0-flash` |

**Keep on `gemini-2.5-flash`** (pipeline.ts + 12 other routes — already correct):
`pipeline.ts` line 34, `generate-translations`, `positioning-angles`, `score-variants`, `enhance-copy`, `generate-emails`, `generate-variants`, `review-sentiment`, `weekly-digest`, `atomize-content`, `competitive-analysis`, `export-bundle`

**Also update metadata labels** in response objects to match actual model used (cosmetic but prevents confusion).

### 3.5.3 Fix export-pdf SSRF — REQUIRED (P2)
**File:** `src/app/api/export-pdf/route.ts`
**Problem:** `getBaseUrl()` at lines 17-22 uses `x-forwarded-host` / `host` headers to construct fetch URLs at lines 68 and 76. Attacker can spoof these headers to make the server fetch from attacker-controlled domains. Same pattern that was fixed in `process-schedule`.
**Fix:** Replace `getBaseUrl()` with `internalBaseUrl()` from `src/lib/orchestrator.ts`.

### 3.5.4 Fix Railway config conflict — REQUIRED (P2)
**Files:** `railway.toml` + `railway.json`
**Problem:** `railway.toml` says `dockerfilePath = "Dockerfile"`, `railway.json` says `"builder": "NIXPACKS"`. `railway.json` wins, making `railway.toml` misleading. Health check paths also differ (`/api/health` vs `/`).
**Fix:** Pick one. Recommend keeping `railway.toml` (has the better healthcheck path `/api/health`), delete `railway.json`.

### 3.5.5 Update env var documentation — REQUIRED (P2)
**Files:** `.env.example`, `CLAUDE.md`
**Problem:** `.env.example` documents 4 of 13 env vars. Missing `KIE_API_KEY` (images/video silently fail), `PERPLEXITY_API_KEY` (4 routes return 500), all auth vars, `PUBLIC_BASE_URL`.
**Fix:** Update both files with complete env var list (see PRODUCT-STRATEGY.md env table for reference).

---

## Phase 4: Deferred Items (documented, not in this sprint)

These should NOT block the internal launch:

| Item | Phase | Notes |
|------|-------|-------|
| #8: Performance update false success (`updateSchedulePerformance` ignores `.run()` return, always returns 200) | Phase 4 | Minor — cosmetic, verified in code |
| #10: Test suite | Phase 5 | Acceptable for 1 internal user |
| #16: 107 raw `<button>` across 25 files | Phase 4+ | Migrate incrementally per page when touching files |
| #17: 1,238 bare dark mode color lines across 52 files | Phase 4+ | Only 3 components fixed (tone-compare, ErrorBoundary, Skeleton). Top offenders: foundation (109), assets (108), competitors (77), distribute (72) |
| #18: Missing FK constraints on `social_posts.plan_id` and `content_schedule.plan_id` | Phase 4+ | No referential integrity on these tables |
| Guided/manual carousel screenshot integration | Phase 4 | Auto mode works |
| Homepage messaging alignment | Phase 4 | |
| Social page emoji-as-icons inconsistency | Phase 4 | |
| Carousel drag keyboard accessibility | Phase 4 | |

---

## File Change Summary

### Phase 1 + 2 (COMPLETE):

| File | Changes | Phase | Status |
|------|---------|-------|--------|
| `src/hooks/usePlan.ts` | useEffect captures + returns cleanup from async load() | 1.1 | DONE |
| `src/app/api/process-schedule/route.ts` | Import internalBaseUrl, atomic UPDATE...RETURNING in transaction | 1.2, 1.3 | DONE |
| `src/proxy.ts` | Import + use secureCompare for API key and basic auth | 1.4 | DONE |
| `src/lib/auth-guard.ts` | secureCompare already exported (no change needed) | 1.4 | DONE |
| `src/app/plan/[id]/tone-compare/page.tsx` | Full rewrite — theme tokens + shadcn Button | 1.5 | DONE |
| `src/components/ErrorBoundary.tsx` | Theme tokens replacing hardcoded dark colors | 1.6 | DONE |
| `src/components/Skeleton.tsx` | bg-muted for Bone, bg-card for cards, bg-primary/5 for SERP | 1.7 | DONE |
| `src/components/PlanSidebar.tsx` | 7-section nav with Create always-open, localStorage, mobile "More" | 2.1 | DONE |
| `src/app/plan/[id]/page.tsx` | 3 gradient ActionCards + 12 SuiteCards grid | 2.2 | DONE |

### Phase 3 (COMPLETE):

| File | Changes | Phase | Status |
|------|---------|-------|--------|
| `src/app/plan/[id]/quickwin/page.tsx` | sessionStorage cache + hydration, Regenerate button, expanded SocialPostData type, hook/cta/time/tips UI, collapsible Tips disclosure, extracted shared `runGeneration`, unmount guard on regen, clipboard `.catch()`, hashtags `?? []` safety | 3.1, 3.2, P2 | DONE |
| `src/app/plan/[id]/carousel/page.tsx` | generationStep + elapsed state, useEffect step timer, progress bar with step labels, `onDragEnter` `preventDefault()` for Firefox | 3.3, P2 | DONE |
| `src/app/plan/[id]/social/page.tsx` | sessionStorage hydrate/debounce-save, Start Over button, clear on queue, video polling edge case fix, hydrate/save race guard, save try/catch | 3.4, P2 | DONE |
| `src/app/api/review-monitor/route.ts` | internalBaseUrl() import, SSRF fix, pass appStoreUrl to scrape, pass reviews to sentiment, console.warn on failure | 3.5, P2 | DONE |

---

## Verification

### After Phase 1-3 (all DONE):
1. [x] Toggle light/dark mode — Tone Compare, ErrorBoundary, Skeleton render correctly
2. [x] Navigate away/back to plan — no React setState warnings (usePlan fix)
3. [x] process-schedule uses internalBaseUrl (not request origin)
4. [x] Sidebar "Create" section always expanded
5. [x] Plan overview shows 3 ActionCards + 12 SuiteCards
6. [x] Quick Win caching + regenerate works
7. [x] Quick Win shows hook, CTA, posting time, tips
8. [x] Carousel progress indicator shows step labels
9. [x] Social page state persists across refresh

### After Phase 3.5 (Pre-Deploy):
1. Build passes clean after middleware rename
2. `middleware-manifest.json` has entries (not empty `{}`)
3. Visit deployed URL without credentials → get 401 (basic auth working)
4. Visit with credentials → access granted
5. Check Gemini calls use correct model (Pro for social-post/brief/carousel/brand-voice/draft, Flash for everything else)
6. `export-pdf` route uses `internalBaseUrl()` not `x-forwarded-host`
7. Only one Railway config file exists (no builder conflict)

### End-to-end dog-food test (after deploy):
1. Paste a real App Store URL on homepage
2. Wait for scrape + plan generation → should land on Quick Win
3. Verify Instagram caption + TikTok script + hero image all appear
4. Check: does the caption use product-specific details from the scrape?
5. Copy one post → would you actually post it?
6. Queue one post to Buffer → verify it arrives in Buffer dashboard with image
7. Navigate to Carousel → generate auto carousel → download slides
8. Generate a video → download → check aspect ratio and content
9. Navigate to plan overview → verify hub layout makes sense
10. Check sidebar → verify "Create" section is prominent and logical

---

## Order of Execution

1. ~~Phase 1.1-1.4 (security + hook fixes)~~ — **DONE**
2. ~~Phase 1.5-1.7 (dark mode fixes)~~ — **DONE**
3. ~~Phase 2.1 (sidebar restructure)~~ — **DONE**
4. ~~Phase 2.2 (hub page redesign)~~ — **DONE**
5. ~~Phase 3.1-3.5 (UX polish + P2 hardening)~~ — **DONE**
6. Phase 3.5.1 — Activate middleware (rename proxy.ts, fix export)
7. Phase 3.5.2 — Gemini Pro/Flash split (update model strings in 10 routes + metadata labels)
8. Phase 3.5.3 — Fix export-pdf SSRF
9. Phase 3.5.4 — Fix Railway config conflict
10. Phase 3.5.5 — Update env var documentation
11. Deploy to Railway + verify env vars + volume
12. Dog-food test + fix whatever breaks
