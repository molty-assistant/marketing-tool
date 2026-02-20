# UX Audit — Marketing Tool
**Date:** 2026-02-18  
**Auditor:** Opus (AI UX reviewer)  
**Method:** Source code review (app returned 401 on live URL — authentication blocks unauthenticated access, which is itself an issue)

---

## Implementation Tracker (Updated 2026-02-20)

This section tracks delivery status against the 28 prioritized items in this file.

### Scoreboard

- `Done`: 28
- `Partial`: 0
- `Open`: 0

### Item-by-Item Status

| # | Status | Notes |
|---|---|---|
| 1 | ☑ Done | DB-first persistence is enforced in `/api/generate-plan`; generation returns success only after DB save. |
| 2 | ☑ Done | Public access policy is explicit: auth now requires `BASIC_AUTH_ENABLED=true`; default remains public/no-signup. |
| 3 | ☑ Done | Legacy `PlanNav` removed; grouped sidebar navigation is active (`src/components/PlanSidebar.tsx`). |
| 4 | ☑ Done | Navigation now uses Next `<Link>` patterns in active sidebar. |
| 5 | ☑ Done | Entry flow is consolidated: `/wizard` and `/analyze` now redirect to `/`; landing is primary start path. |
| 6 | ☑ Done | Pricing section removed from marketing page (`src/app/(marketing)/page.tsx`). |
| 7 | ☑ Done | Channel-model mismatch resolved by retiring wizard flow from active UX (`/wizard` redirects to `/`). |
| 8 | ☑ Done | Wizard-only goals/tone UX gap resolved by retiring wizard as a user path. |
| 9 | ☑ Done | PDF export uses server API route (`/api/export-pdf`) rather than `window.print()`. |
| 10 | ☑ Done | Stage discoverability improved via grouped hubs + sidebar/mobile child-nav routing. |
| 11 | ☑ Done | Navigation icon system is Lucide-based; legacy emoji nav removed with `PlanNav`. |
| 12 | ☑ Done | Retry friction resolved with single-path landing flow + reusable generation overlay retry loop. |
| 13 | ☑ Done | `metadataBase` points to production marketing tool URL in `src/app/layout.tsx`. |
| 14 | ☑ Done | PlanNav subtitle noise removed with legacy nav removal. |
| 15 | ☑ Done | Static "New" indicators removed from grouped sidebar. |
| 16 | ☑ Done | Primary input now explicitly labels URL as required on landing page. |
| 17 | ☑ Done | Target-audience default now uses contextual inference (`inferTargetAudience`) instead of generic "Users of X apps". |
| 18 | ☑ Done | Hub onboarding copy is aligned and standardized across Strategy/Content/Distribution/SEO/Export with explicit recommended order guidance. |
| 19 | ☑ Done | Social video generation includes elapsed/progress bar and remaining estimate. |
| 20 | ☑ Done | Template save flow exists (`/api/plans/[id]/templates`). |
| 21 | ☑ Done | Distribute now provides pre-generation output expectations and per-platform generated output views. |
| 22 | ☑ Done | Confusing legacy share/unshare controls from old brief nav flow are no longer present in primary UI path. |
| 23 | ☑ Done | Brief page uses `react-markdown` instead of regex markdown rendering. |
| 24 | ☑ Done | Shared plan-page primitives now standardize hub layouts/cards and key remaining outlier pages migrated to shared UI components. |
| 25 | ☑ Done | Landing feature grid simplified and balanced in current implementation. |
| 26 | ☑ Done | Wizard-specific tone-preview gap is no longer user-facing after wizard retirement. |
| 27 | ☑ Done | Screenshots rendering already guards on available screenshot data in analyze flow. |
| 28 | ☑ Done | Spacing normalization completed on remaining outlier pages (`keywords`, `schedule`, `performance`, `social`) to align with plan-shell conventions. |

### Historical Context

Content below this tracker is the original audit narrative from 2026-02-18 and is retained for traceability. The tracker above is the source of truth for current implementation status.

---

## Executive Summary

The Marketing Tool has strong bones — a clear value prop, a logical wizard flow, and an impressive breadth of AI-generated outputs. However, the app suffers from **navigation overload** (19 tabs), **inconsistent entry points** (3 ways to start, creating confusion), **no persistent data layer for unauthenticated users** (plans live in sessionStorage), and **several interaction design gaps** (missing loading states, no empty states, poor mobile nav). The prioritised fix list below contains 28 actionable items.

---

## 1. Overall Flow & Information Architecture

### The Journey: Landing → Plan → Tabs

There are **three entry paths**, which is two too many for an MVP:

1. **Landing page** → paste URL → `/analyze` (scrape + config form) → generate → `/plan/[id]`
2. **Wizard** → 5-step guided flow (URL → platforms → goals → tone → confirm) → generate → `/plan/[id]`
3. **Dashboard** → paste URL → `/analyze` → same as #1

**Problems:**
- The landing page, dashboard, and wizard all have URL inputs that do subtly different things. A new user has no idea which to use.
- The wizard collects platforms, goals, and tone — but the `/analyze` page collects different config (app type, competitors, differentiators, channels). These flows produce different plan configurations with no way to reconcile them.
- The wizard's platform list (X, Instagram, TikTok, LinkedIn, Facebook, Threads) doesn't match the analyze page's channel list (Reddit, Hacker News, Product Hunt, Twitter/X, LinkedIn, App Store). This is confusing and inconsistent.
- The "How it works" section says 3 steps. The wizard has 5 steps. The analyze page has ~2 steps. Nothing matches.

### What's working
- The core value prop is immediately clear ("Turn any URL into a complete marketing brief")
- The "no signup required" badge is good for conversion
- Having quick-try example URLs (LightScout, Spotify, Linear) is excellent

### What's confusing
- "Guided wizard" vs "Generate brief" vs "Go to dashboard" — three CTAs with unclear differentiation
- Pricing section with "Pricing UI only — wire up billing when ready" visible to users
- The wizard saves to `sessionStorage` — refresh the page and your progress is fine, but close the tab and it's gone. Plans also live in sessionStorage first, falling back to a DB fetch. If the DB save fails silently, users lose their generated plan.

---

## 2. Individual Page Issues

### Landing Page (`page.tsx`)

| What works | What doesn't |
|---|---|
| Strong hero copy | Three competing CTAs confuse the user |
| Feature grid is scannable | Pricing tiers are dummy (visible "wire up billing" text) |
| "No signup required" badge | Footer links go to wizard/dashboard — no plan needed? |
| Dark theme is well-executed | "New" badge will become stale |

**Specific issues:**
- The `handleStart` navigates to `/analyze?url=...` — this triggers a scrape immediately with no config. Fine for power users, but the wizard collects more context. Which is better?
- Enter key triggers submit — good.
- No rate limiting or abuse protection visible on the client.

### Wizard (`/wizard/page.tsx`)

| What works | What doesn't |
|---|---|
| Clean step-by-step flow | 5 steps is too many for what's collected |
| Progress bar with percentage | Platform list doesn't match analyze page |
| Session persistence | Goals are "saved for context" but never actually used in generation |
| Example URL buttons | Tone selection has no preview of what each tone produces |
| Back/Continue flow is solid | No skip option for optional steps |

**Specific issues:**
- Step 5 (Confirm) shows a summary then "Generate Everything" — but the button doesn't show what will happen or how long it takes.
- The `handleGenerateEverything` function calls `/api/scrape` then `/api/generate-plan` sequentially. There's no progress indicator between these two calls — just "Generating…" on the button.
- If scrape fails, the error is shown but there's no retry button — user must click "Start over" and redo all 5 steps.
- The "or paste a URL directly on the home page" link at the bottom undermines the wizard's purpose.

### Analyze Page (`/analyze/page.tsx`)

| What works | What doesn't |
|---|---|
| Auto-scrape on load is fast | Full-page spinner with no cancel option |
| App card with icon/stats is polished | Config form is very long — 9+ fields before you can generate |
| Editable list fields (differentiators, competitors) | "Target Audience" is auto-filled with generic "Users of X apps" |
| Distribution channel toggles | No indication which fields are optional vs required |
| Toast notifications | Screenshots section has no fallback for websites (only apps have screenshots) |

**Specific issues:**
- The scrape result is stored in `localStorage` under `recent-analyses` — but the plan itself goes to `sessionStorage`. Inconsistent persistence strategy.
- The "Configure Plan" section appears after scrape completes but there's no visual transition — it just pops in.
- `line-clamp-3` on description works but there's no "show more" option.

### Plan Brief Page (`/plan/[id]/page.tsx`)

| What works | What doesn't |
|---|---|
| PlanNav breadcrumb ("← All Plans / AppName") | **19 tabs** in the nav — overwhelming, unscrollable on mobile |
| Collapsible stage sections with copy buttons | Stages are collapsed by default except stage 1 — users may not discover stages 2-5 |
| Markdown rendering inline | `renderMarkdown` is a fragile regex-based parser — will break on complex markdown |
| Export to .md and PDF | PDF export just calls `window.print()` — terrible PDF output |
| Share link functionality | "Generate Everything" button's purpose unclear vs individual tab generation |
| "What's next" workflow guide is excellent | Config summary pills are tiny and uninformative |

**Specific issues:**
- The plan helper text ("explore the tabs above") appears as a small muted banner that's easy to miss.
- `ExportBundleButton` and `GenerateAllButton` are imported but their behavior isn't clear from the page — what do they generate?
- The "What's next" section at the bottom lists 8 recommended steps — but the nav has 19 tabs. Which ones matter?
- Share/unshare toggle works but the UX is confusing (green "Copy link" next to red "✕" unshare button with no confirmation).

### PlanNav (`PlanNav.tsx`)

**This is the biggest UX problem in the app.**

- **19 navigation items** displayed as a `flex-wrap` grid of pills, each with a label AND a description subtitle.
- On desktop this likely wraps to 3-4 rows of tabs. On mobile it's a wall of buttons.
- No grouping, no sections, no hierarchy. Brief, Foundation, Draft, Variants, Preview, Approvals, Emails, Calendar, Digest, Distribute, Translate, SERP, Competitors, Assets, Reviews, Keywords, Social, Templates, Schedule — all at the same level.
- Active state detection for non-exact routes uses `startsWith` which could match incorrectly (e.g., `/plan/123/` would match all routes).
- Uses `<a>` tags instead of Next.js `<Link>`, causing full page reloads on every tab switch.
- Each tab shows both a label and description, making the nav extremely tall and visually noisy.

### Social Page (`/plan/[id]/social/page.tsx`)

- Multi-step flow (platform → generate idea → generate image/video → queue to Buffer) is logical
- Video generation polls every 10 seconds — no visual progress indicator besides "Generating…"
- History section loads posts from `/api/post-to-buffer` — mixes concerns
- Image generation and video generation are separate but presented side by side with no guidance on which to use

### Keywords Page (`/plan/[id]/keywords/page.tsx`)

- Clean table layout with difficulty/relevance badges — nicely designed
- Color-coded difficulty (green/yellow/red) is intuitive
- Separate tables for main keywords and long-tail — good IA
- Loading skeleton is well-implemented

### Templates Page (`/plan/[id]/templates/page.tsx`)

- 8 pre-built templates with char limits — very useful
- Template fill with plan data is clever
- Character count warnings are helpful
- Missing: no way to save edited templates, no copy-all button

### Distribute Page (`/plan/[id]/distribute/page.tsx`)

- "One post → all platforms" concept is strong
- Platform toggle chips are clear
- Cached results in sessionStorage avoid re-generation — good
- Missing: no preview of what each platform's output will look like before generating

---

## 3. Visual Design & Consistency

### What's working
- **Dark theme** is well-executed throughout — consistent `slate-800/900` backgrounds with `indigo` accents
- **Border radius** is consistent (`rounded-xl` / `rounded-2xl`)
- **Typography hierarchy** is clear (bold white headings, slate-400 body, slate-500 muted)
- **Indigo as primary colour** with emerald for success, red for errors — good semantic use

### Issues
- **No design system / component library** — every page rebuilds buttons, cards, inputs from scratch with slight variations
- **Button styles vary**: some are `rounded-xl`, some `rounded-lg`. Some have `py-3`, others `py-2`. The "Generate" buttons are different sizes on every page.
- **Spacing inconsistency**: Landing page uses `mt-12` between sections, plan page uses `mb-6` / `mb-4` mixed
- **Font sizes**: The app uses default Tailwind sizes with no custom type scale. Body text varies between `text-sm` and `text-base` across pages.
- **No favicon** — `favicon.ico` exists but no custom design mentioned
- **Emoji as icons**: 📋🧱📝🏆📱✅✉️📅📊📣🌍🔍🏆🎨⭐🔑📱🧩⏰ — 19 emoji in the nav. This looks unprofessional and renders differently across platforms.

### Mobile considerations
- **PlanNav is unusable on mobile** — 19 flex-wrapped pills with descriptions will fill most of the viewport
- Landing page uses `sm:` breakpoints well for responsive layout
- Most forms stack properly on mobile (`flex-col sm:flex-row`)
- The plan page's export buttons stack on mobile but take up a lot of space
- No hamburger menu or mobile-specific navigation pattern

---

## 4. Interaction Design

### Loading States
- ✅ Landing page: button shows "Generating…" (but no spinner)
- ✅ Analyze page: full-page spinner during scrape
- ✅ Wizard: "Generating…" on final button with disabled state
- ✅ Keywords page: skeleton loader
- ❌ Plan page: no loading indicator when switching tabs (full page reloads via `<a>` tags)
- ❌ Social page: video polling shows text only, no progress bar
- ❌ Most tab pages: no loading state when fetching plan from DB

### Error Handling
- ✅ Analyze page: `ErrorRetry` component with retry button
- ✅ Plan page: error state with retry for DB fetch
- ✅ Inline red error messages on forms
- ✅ Toast notifications for success/error
- ❌ Wizard: error after generation requires "Start over" — no retry
- ❌ No global error boundary visible in the layout (wait — there is `ErrorBoundary` in layout, good)
- ❌ No offline detection or network error handling

### Empty States
- ✅ Dashboard: "No recent analyses yet" message
- ❌ Most plan sub-pages: no empty state if plan data is missing or incomplete
- ❌ Social history: silently empty if no posts
- ❌ Keywords: depends on generation — no "not yet generated" state visible

### Button Clarity
- Primary actions use `bg-indigo-600` consistently — good
- Secondary actions use `bg-slate-700` — good
- Destructive actions (unshare) use `bg-red-800` — good
- ❌ "Generate Everything" vs "Generate Plan" vs "Generate brief" — three different labels for similar actions
- ❌ Copy buttons show "📋 Copy" / "📋 Copy section" — fine but clipboard icon would be better than emoji

---

## 5. Prioritised Fix List

| # | Priority | Page | Issue | Recommended Fix |
|---|----------|------|-------|-----------------|
| 1 | P0 | Global | **Plans stored in sessionStorage can be lost** — close tab = lose plan if DB save fails | Always persist to DB first, use sessionStorage as cache only. Show save confirmation. |
| 2 | P0 | Live URL | **App returns 401 to unauthenticated users** — the "no signup required" promise is broken | Either remove auth or add a public access mode for plan generation |
| 3 | P0 | PlanNav | **19 tabs with no grouping is unusable** — especially on mobile | Group into 4-5 categories (Brief, Content, Distribution, Research, Settings). Use collapsible sections or a sidebar. Max 6-8 visible tabs. |
| 4 | P0 | PlanNav | **Uses `<a>` tags instead of `<Link>`** — every tab switch is a full page reload | Replace all `<a>` with Next.js `<Link>` for client-side navigation |
| 5 | P1 | Landing | **Three competing entry points confuse users** — wizard, direct URL, dashboard | Pick ONE primary flow. Recommend: landing URL input → analyze page. Move wizard to a secondary "Guided setup" link. Remove dashboard CTA from hero. |
| 6 | P1 | Landing | **Pricing section shows "wire up billing when ready"** | Remove pricing section entirely until billing is implemented, or hide the developer note |
| 7 | P1 | Wizard | **Platform list doesn't match analyze page channel list** | Unify to a single canonical list of distribution channels used everywhere |
| 8 | P1 | Wizard | **Goals collected but never used** | Either use goals in plan generation (tailor output) or remove the step |
| 9 | P1 | Plan Brief | **PDF export uses `window.print()`** — produces ugly output | Implement proper PDF generation (e.g., puppeteer on server, or react-pdf) |
| 10 | P1 | Plan Brief | **Stages 2-5 collapsed by default** — users may never discover them | Open all stages by default, or show a progress indicator showing which stages have content |
| 11 | P1 | PlanNav | **Emoji as icons look unprofessional** | Replace with a consistent icon set (Lucide, Heroicons, or custom SVGs) |
| 12 | P1 | Wizard | **No retry on generation failure** — must restart all 5 steps | Add a "Retry" button on the confirm step that re-runs generation without resetting |
| 13 | P1 | Global | **metadataBase points to mission-control URL, not marketing-tool URL** | Fix `metadataBase` in layout.tsx to point to correct production URL |
| 14 | P2 | PlanNav | **Description subtitles on every tab add visual noise** | Show descriptions as tooltips on hover only, not inline |
| 15 | P2 | Landing | **"New" badge will become stale** | Make it dynamic (show for first 30 days, or tie to a feature flag) |
| 16 | P2 | Analyze | **Config form has 9+ fields with no indication of optional vs required** | Mark optional fields, collapse advanced options (competitors, differentiators) under an "Advanced" toggle |
| 17 | P2 | Analyze | **Auto-filled "Target Audience" is generic** | Use AI to generate a better default based on scraped data, or leave blank with good placeholder text |
| 18 | P2 | Plan Brief | **"What's next" section lists 8 steps but nav has 19 tabs** | Align these — either reduce nav to match recommended workflow, or group remaining tabs as "More tools" |
| 19 | P2 | Social | **Video polling has no progress indicator** | Add a progress bar or percentage estimate based on typical generation time |
| 20 | P2 | Templates | **No way to save edited templates** | Add save-to-plan functionality so edits persist |
| 21 | P2 | Distribute | **No preview before generation** | Show a brief preview/summary of what each platform atom will contain |
| 22 | P2 | Plan Brief | **Share unshare has no confirmation** | Add "Are you sure?" confirmation before unsharing (link becomes dead) |
| 23 | P2 | Plan Brief | **`renderMarkdown` is fragile regex-based** | Replace with a proper markdown library (marked, remark, or react-markdown) |
| 24 | P2 | Global | **No consistent component library** — buttons, inputs, cards rebuilt per page | Extract shared components: `Button`, `Input`, `Card`, `Badge`, `SectionHeader` |
| 25 | P3 | Landing | **Feature grid has 8 items but only 4 columns on lg** — uneven grid | Use 3 or 4 features per row, or ensure even numbers |
| 26 | P3 | Wizard | **Tone selection has no preview** | Show a sample sentence in each tone so users can compare |
| 27 | P3 | Analyze | **Screenshots section shows nothing for websites** | Hide the section entirely when `screenshots` array is empty (currently conditional, but check edge cases) |
| 28 | P3 | Global | **Inconsistent spacing** — `mt-12` vs `mb-6` vs `mb-4` | Define a spacing scale and apply consistently (e.g., sections: `mt-12`, within-section: `space-y-6`) |

---

## Summary of Top 5 Actions

1. **Fix PlanNav** — group 19 tabs into categories, use `<Link>`, remove inline descriptions, replace emoji with icons
2. **Unify entry flows** — one primary path (landing → analyze → plan), wizard as secondary
3. **Fix data persistence** — DB-first, sessionStorage as cache
4. **Remove dummy pricing** — it undermines trust
5. **Extract shared components** — buttons, inputs, cards for consistency

---

*Report generated from source code analysis. Live testing was blocked by 401 authentication. Recommend re-running this audit with authenticated access for interaction-level findings.*
