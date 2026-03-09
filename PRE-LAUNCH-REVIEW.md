# Pre-Launch Review: Marketing Tool

## Context

Full multi-dimensional audit of the marketing tool before launch. The app is an AI-powered marketing content generator (paste URL → get marketing plan as PDF). Stack: Next.js 16, React 19, Tailwind v4, shadcn/ui, SQLite, Gemini 2.5, Kie.ai. Two tiers: Basic £39 and Pro £99. Target: solo founders and small businesses.

**Overall verdict: Not yet ready for paid launch.** Six blockers must be fixed first, plus several high-priority items for the first sprint. The core product flow is solid and the AI pipeline works — the gaps are in trust/legal, visual consistency, naming, and navigation polish.

---

## BLOCKERS (Must fix before any real payments)

### 1. No legal pages or contact method
- **Impact:** UK/EU law requires Terms of Service and Privacy Policy for online sales. The failed-generation error says "contact us" but provides no way to do so.
- **Fix:** Add `/terms`, `/privacy` pages. Add contact email to footer and error states. Add refund guarantee near pricing.
- **Files:** New pages in `src/app/(marketing)/terms/` and `src/app/(marketing)/privacy/`, update footer in layout, update `src/app/(marketing)/status/[orderId]/page.tsx` error state.

### 2. Plan detail pages broken in light mode
- **Impact:** All 20+ pages under `/plan/[id]/` use hardcoded dark-only classes (`bg-slate-800/50`, `text-white`, `border-slate-700`). Light mode is default — a paying customer opens their £99 plan and sees white text on white backgrounds. This isn't just a theming task — it's a trust/credibility crisis. Broken UI immediately makes users question whether the product is legitimate.
- **Fix:** Systematic migration to semantic tokens across all plan pages: `bg-slate-900/40` → `bg-card`, `text-white` → `text-foreground`, `border-slate-700` → `border-border`. Migrate 107 raw `<button>` elements to shadcn `<Button>`.
- **Files:** All `src/app/plan/[id]/*/page.tsx` (25+ files), plus components like `ExportBundleButton.tsx`.
- **Scope:** ~860 hardcoded color lines across ~52 files. Mechanical but large.

### 3. Form data lost on back navigation from checkout
- **Impact:** The "Back and change answers" link on checkout goes to `/start`, but intake form uses only `useState`. All 5 answers, URL, email, and context are destroyed. Direct conversion killer.
- **Fix:** Persist intake state in `sessionStorage`. Hydrate on mount if data exists. Clear on successful checkout.
- **Files:** `src/app/(marketing)/start/page.tsx`

### 4. Basic auth blocks the purchase flow
- **Impact:** Middleware exempts `/` and `/intake` but NOT `/start`, `/checkout`, `/status/*`, `/delivery/*`, or `/my-pdfs`. With `BASIC_AUTH_ENABLED=true`, customers cannot buy.
- **Fix:** Add all purchase-flow routes to the public exemption list in middleware.
- **Files:** `src/middleware.ts`

### 5. Stuck PDF orders never recover after deploy/crash
- **Impact:** `resetStuckGeneratingOrders()` exists but is NOT called at startup. Railway restarts containers during every deploy. If any orders are mid-generation when that happens, they're stuck in "generating" forever — no retry, no error, just limbo. 10 orders in flight during a deploy = 10 support requests day one.
- **Fix:** Call `resetStuckGeneratingOrders()` during app initialization. Single function call.
- **Files:** `src/lib/db.ts` or app startup

### 6. Product has no name
- **Impact:** The metadata title says "Vibe Marketing Brief Generator." CLAUDE.md calls it "marketing-tool." Internal references are inconsistent ("Marketing Tool" vs "Marketing Toolkit"). Before any marketing, SEO, or word-of-mouth can work, you need a real product name. It affects the page title, OG tags, landing page hero, and every piece of copy.
- **Fix:** Decide on a name. Update page metadata, landing page copy, and OG images.
- **Files:** `src/app/layout.tsx`, `src/app/(marketing)/page.tsx`, any OG image templates.

---

## HIGH PRIORITY (First sprint after launch)

### 7. Sidebar navigation is a flat dump, not progressive disclosure
- The sidebar has 3 groups: "Create" (2 items), "Plan" (1 item), "Supporting Tools" (17 items in a flat list). Documentation describes 7 sections but code doesn't implement them. On mobile, 17 items as horizontal scroll tabs is unusable.
- **Fix:** Restructure into 7 collapsible groups: Create, Plan, Strategy (4), Content (6), Distribution (4), SEO & ASO (3), Export (3).
- **Files:** `src/components/PlanSidebar.tsx`

### 8. No post-payment onboarding
- Users land on a 25+ page app with zero guidance. No first-visit banner, no completion indicators, no "start here" flow. A non-technical founder who pays £99 and feels lost will regret the purchase — buyer's remorse kills word-of-mouth, which is everything at this stage.
- **Fix:** Add a first-visit welcome banner on the overview page. Show completion indicators on SuiteCards (the `overview.sections.hasContent` data is already fetched but unused). Consider guiding users to Brief → Copy Draft as the natural first steps.
- **Files:** `src/app/plan/[id]/page.tsx`

### 9. Status page creates anxiety instead of confidence
- The status page says "Don't close it" which implies generation stops if the tab closes. It doesn't — generation continues server-side. Since there are no email notifications, this page + the `/my-pdfs` recovery path are the only ways users track their order. The copy must reassure, not threaten.
- **Fix:** Rewrite status copy: "Your plan is being generated. Feel free to close this tab — you can check back anytime at My Plans. Generation usually takes 1-3 minutes." Prominently link `/my-pdfs` as fallback.
- **Files:** `src/app/(marketing)/status/[orderId]/page.tsx`

### 10. No Gemini retry logic
- If `callGemini()` gets 429, 503, or timeout → throws immediately. No retry, no backoff, no circuit breaker. A single Gemini hiccup kills the entire user session.
- **Fix:** Add retry with exponential backoff (3 retries, 1-8s delays) to `callGemini()`.
- **Files:** `src/lib/pipeline.ts`

### 11. Sample link exposes Railway infrastructure URL
- Landing page has a hardcoded `https://marketing-tool-production.up.railway.app/shared/...` link.
- **Fix:** Use a relative path or `PUBLIC_BASE_URL`.
- **Files:** `src/app/(marketing)/page.tsx`

### 12. Pricing inconsistency
- £39.99 next to £99 looks unpolished. Charm pricing (£39.99) next to a round number (£99) is visually inconsistent and signals "not finished." Either £39/£99 or £40/£100.
- **Fix:** Align pricing format across landing page, checkout, and Stripe.
- **Files:** `src/app/(marketing)/page.tsx`, `src/app/(marketing)/checkout/page.tsx`, Stripe dashboard.

---

## MEDIUM PRIORITY (Post-launch iteration)

### 13. Landing page copy needs marketing polish
- **"No revisions"** in the hero pricing pills is a dealbreaker phrase. For a founder spending £99, it signals "you get what you get." Even if true, reframe as "Generated instantly, yours to edit freely."
- **"No account needed"** is a massive differentiator vs every SaaS competitor but it's buried in small text. Promote to headline or subheadline.
- **"How It Works" steps are backwards.** Currently: Answer 5 questions → Pay → Download. The value is the URL paste, not the questions. Should be: Paste your URL → Answer 5 quick questions → Download in minutes.
- **No urgency.** One-time payment removes subscription pressure, but also removes urgency. Consider: "X plans generated this week" or a money-back guarantee badge.
- **Files:** `src/app/(marketing)/page.tsx`

### 14. No real social proof
- Landing page has only a self-generated sample pack. No testimonials, no customer logos, no review count. For a £39-99 product, this hurts trust.
- **Fix:** Add testimonial section after first real users. Even "Used by X founders" with a number helps.

### 15. Plan overview has duplicate navigation targets
- "Brief" appears in both the ActionCards (top tier) and the SuiteCards grid below. Users won't know which to click. Deduplicate or make the distinction clear (e.g., ActionCards are "quick actions," SuiteCards are the full suite).
- **Files:** `src/app/plan/[id]/page.tsx`

### 16. "My PDFs" relies on email recall
- Returning users must remember the email they used. No bookmark link, no persistent session, no magic link. This is friction for returning customers.
- **Fix:** After purchase, show a "Bookmark this link" prompt with a direct URL. Or persist a session cookie.
- **Files:** `src/app/(marketing)/my-pdfs/page.tsx`, `src/app/(marketing)/delivery/[orderId]/page.tsx`

### 17. Dashboard shows all plans without user scoping
- `/dashboard` lists every plan in the database. No authentication, no user filtering.
- **Files:** `src/app/(marketing)/dashboard/page.tsx`

### 18. Checkout fires tier-sync API on page load
- The `useEffect` fires a POST immediately on mount, not just on user-initiated tier changes. Can cause spurious errors.
- **Files:** `src/app/(marketing)/checkout/page.tsx`

### 19. Stripe keys hardcoded instead of env vars
- Checkout page has Stripe publishable keys inline. Requires code deploy to change pricing.
- **Files:** `src/app/(marketing)/checkout/page.tsx`

### 20. Perplexity fails silently
- If Perplexity API fails, competitive analysis proceeds with empty data. User doesn't know insights are placeholder-based.
- **Files:** `src/lib/pipeline.ts`

### 21. Google Play scraper is fragile
- HTML scraping with regex. Google changes HTML frequently. No JavaScript rendering.
- **Files:** `src/lib/scraper.ts`

### 22. No request deduplication
- If user clicks "Generate" twice while first request is pending, both run. Both hit Gemini, second silently overwrites first.

---

## LOW PRIORITY (Polish)

- 23. Progress bar on intake stuck at 50% regardless of completion
- 24. Copy button implementations inconsistent (3+ patterns)
- 25. ThemeToggle hidden below 420px viewport
- 26. Carousel drag-to-reorder has no keyboard alternative
- 27. Missing ARIA labels on collapsible sections, drag handles
- 28. Image file orphans on crash (disk bloat over time)
- 29. No concurrency limits on image generation (Kie.ai may rate-limit)
- 30. Rate limit cleanup (old entries accumulate in `api_rate_limits`)

---

## STRENGTHS (Keep these)

- **Clean conversion funnel** — linear 5-step flow with minimal distractions
- **Real-time generation feedback** — animated step indicators on status page with auto-redirect
- **Effective pricing tier layout** — clear two-tier comparison, visual hierarchy
- **Smart sessionStorage caching** — email flows from intake to delivery seamlessly
- **Solid AI pipeline** — 7-step orchestration with resume-from-failed capability
- **Good rate limiting** — SQLite-backed, windowed, timing-safe auth
- **SSRF protection** — scraper validates IPs against private ranges
- **Atomic status transitions** — prevents concurrent pipeline starts for PDF orders
- **"No account needed" model** — massive differentiator vs SaaS competitors (needs better promotion)
- **Responsive sidebar patterns** — mobile nav with horizontal tabs and "More" button (needs restructuring but the pattern is right)

---

## Recommended Execution Order

**Phase A — Unblock launch (blockers 1-6):**
1. Fix middleware public routes (blocker 4) — smallest fix, biggest impact
2. Call resetStuckGeneratingOrders at startup (blocker 5) — one line
3. Decide on product name + update metadata (blocker 6)
4. Add legal pages + contact email (blocker 1)
5. Persist intake form in sessionStorage (blocker 3)
6. Migrate plan pages to semantic tokens (blocker 2) — largest effort, do last

**Phase B — First sprint (items 7-12):**
7. Restructure sidebar into 7 groups
8. Add post-payment onboarding
9. Rewrite status page copy (reassure, link to /my-pdfs)
10. Add Gemini retry logic
11. Fix sample link URL
12. Align pricing format

**Phase C — Iterate (items 13-22):**
Address based on user feedback and analytics. Landing page copy polish (item 13) should come first as it directly affects conversion.

---

## Verification

After fixes, verify end-to-end:
1. Visit `/` in light mode — all text readable, CTAs visible, product name consistent
2. Click "Get a plan" → fill intake form → click "Back" on checkout → form data preserved
3. Complete purchase → status page shows reassuring copy → delivery → download PDF
4. Open `/plan/[id]/` in both light and dark mode — all pages readable
5. Navigate sidebar on mobile (375px viewport) — all 7 groups accessible
6. Check footer has Terms, Privacy, Contact links
7. With `BASIC_AUTH_ENABLED=true`, verify `/start`, `/checkout`, `/status/*`, `/delivery/*` are accessible without auth
8. Kill server during generation → restart → verify stuck orders are recovered
9. Trigger Gemini 429 → verify retry logic recovers
10. Check pricing displays consistently across landing page and checkout
