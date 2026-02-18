# Opus UX/UI Review — Marketing Tool redesign (main)
**Date:** 2026-02-18  
**Scope requested:** navigation/sidebar IA, onboarding/GenerationOverlay, `/dashboard`, `/plan/[id]` overview dashboard, hub pages (strategy/content/distribution/seo/export).  
**Repo:** `/Users/moltbot/Projects/marketing-tool` (main)

---

## Executive summary
The redesign is directionally strong (consistent dark theme, modern cards, clear hierarchy), but there are a few **navigation/IA breakages** and **layout-level inconsistencies** that will cause users to get lost or hit 404s. The biggest issues are:

- **Broken Strategy links** (sidebar + Strategy hub point to non-existent `/plan/[id]/brief` route).
- **Two competing “Overview” pages** (`/plan/[id]` vs `/plan/[id]/overview`) with mismatched sidebar routing.
- **Global root layout constrains plan pages** (top marketing nav + `max-w-6xl` wrapper) which undermines the new app-shell/side-nav design.
- Several **hardcoded “status” UI elements** (e.g., Distribution hub pills) that can mislead users.

Fixing the above will significantly improve usability, coherence, and perceived quality.

---

## Blocker issues

### B1) Strategy → Brief links are broken (likely 404)
**Where:**
- Sidebar: `src/components/PlanSidebar.tsx` → Strategy children includes `{ label: 'Brief', href: '/brief' }`
- Strategy hub: `src/app/plan/[id]/strategy/page.tsx` → Brief section uses `href: /plan/${id}/brief`

**Why it’s a problem:**
- Actual route exists at `src/app/plan/[id]/strategy/brief/page.tsx` (i.e. `/plan/[id]/strategy/brief`).
- Users clicking “Brief” from Strategy hub or sidebar will likely land on a missing page.

**Actionable fix:**
- Update **all** Brief links to `/plan/${id}/strategy/brief`.
  - In `PlanSidebar.tsx` change Strategy child href from `'/brief'` → `'/strategy/brief'`.
  - In `src/app/plan/[id]/strategy/page.tsx` change Brief section href from ``/plan/${id}/brief`` → ``/plan/${id}/strategy/brief``.
- Consider adding a defensive redirect route:
  - Add `src/app/plan/[id]/brief/page.tsx` that `redirect('/plan/[id]/strategy/brief')` to avoid broken shared links.

---

### B2) “Overview” IA is inconsistent: two overviews, sidebar points to only one
**Where:**
- `/plan/[id]` uses `src/app/plan/[id]/page.tsx` (hub-style overview with 5 hubs)
- `/plan/[id]/overview` uses `src/app/plan/[id]/overview/page.tsx` (readiness ring + sections grid)
- Sidebar “Overview” points to `href: ''` (i.e. `/plan/[id]`) in `src/components/PlanSidebar.tsx`

**Why it’s a problem:**
- Users can’t discover the more detailed readiness/sections dashboard unless they guess `/overview`.
- The codebase (and mental model) contains *two* “overview” experiences with different information architecture and tone.

**Actionable fix options (choose one):**
1) **Unify to a single Overview**
   - Pick either hub overview (`/plan/[id]`) *or* readiness/sections overview.
   - If choosing readiness/sections, move it to `/plan/[id]/page.tsx` and delete `/overview`.
2) **Keep both, but label them clearly and route accordingly**
   - Sidebar: rename group label(s) e.g. `Overview` and `Readiness` (or `Plan health`).
   - Make sidebar “Overview” go to `/overview` and add a separate “Hubs” entry to `/plan/[id]`.
3) **Redirect `/plan/[id]/overview` → `/plan/[id]`** if the readiness page is deprecated.

---

### B3) Global Root layout fights the Plan app-shell (layout + navigation duplication)
**Where:** `src/app/layout.tsx`
- Always renders a sticky marketing top nav and wraps pages in:
  - `main className="max-w-6xl mx-auto px-4 sm:px-6 py-8"`

**Why it’s a problem:**
- Plan pages (`/plan/[id]/*`) are designed like an app shell (sidebar + full-height). The root `max-w-6xl` and padding constrains and visually “boxes in” the shell.
- PlanSidebar also has its own mobile sticky header; combined with root sticky header, you can end up with **double sticky headers** and reduced viewport on mobile.
- The marketing-style emoji nav (“🎯 Marketing Tool”, “🧭 Wizard”, “📊 Dashboard”) clashes with the more product-like Lucide + slate aesthetic.

**Actionable fix:**
- Use **route groups** to split marketing shell vs plan shell:
  - Example:
    - `src/app/(marketing)/layout.tsx` → landing, dashboard, analyze
    - `src/app/(plan)/plan/[id]/layout.tsx` (or `src/app/plan/layout.tsx`) → full-bleed plan shell without marketing nav/max-width wrapper
- If you can’t restructure now, add a minimal conditional in RootLayout (but note `usePathname` requires client):
  - Better: create `src/app/plan/layout.tsx` that renders its own full-bleed wrapper and *does not* inherit the max-width content container.

---

## High severity issues

### H1) “Wizard” navigation item is misleading (it redirects to landing)
**Where:**
- Root nav links to `/wizard` (`src/app/layout.tsx`)
- `/wizard` is a hard redirect to `/` (`src/app/wizard/page.tsx`)

**Why it’s a problem:**
- Users click “Wizard” expecting a different flow; instead nothing changes.
- Feels like a broken feature.

**Actionable fix:**
- Either remove the nav item until it exists, or implement an actual wizard experience.
- If retained as alias, rename label to something truthful like **“Start”** or **“New plan”**, and link directly to `/`.

---

### H2) Distribution hub shows hardcoded “Ready/Empty” statuses (misleading)
**Where:** `src/app/plan/[id]/distribution/page.tsx`
- `StatusPill` is fed hardcoded statuses: Instagram `ready`, others `empty`.

**Why it’s a problem:**
- Users infer real connection/setup states.
- “Ready” suggests posting integrations exist; if they don’t, it erodes trust.

**Actionable fix:**
- Replace with actual computed state (e.g., based on `plan.config.distribution_channels`, connected accounts, generated post count).
- If not available yet, explicitly label as **“Not connected (coming soon)”** or remove the pills.

---

### H3) GenerationOverlay accessibility + control gaps (no cancel, no focus mgmt)
**Where:** `src/components/GenerationOverlay.tsx`

**Issues:**
- No clear **Cancel** action.
- No focus trapping / `aria-modal` / dialog semantics.
- Uses a timer to “advance steps” regardless of server progress; can feel deceptive when generation is slow or fails late.

**Actionable fix:**
- Make it a proper dialog:
  - `role="dialog" aria-modal="true" aria-labelledby=...`
  - Focus the dialog on open; return focus to input on close.
- Add **Cancel** that aborts ongoing requests via `AbortController` (scrape + generate-plan).
- Consider binding step states to server events/progress (or at least label them as “approximate”).

---

## Medium severity issues

### M1) Sidebar information architecture: mixed “hub” + “leaf” patterns
**Where:** `src/components/PlanSidebar.tsx`

**What’s happening:**
- Some groups have hub pages (`/strategy`, `/content`, `/distribution`, `/seo`, `/export`).
- Children are a mix of hub-subroutes (Strategy “Brief” should be under `/strategy/brief`) and top-level leaves (`/foundation`, `/keywords`, etc.).

**Why it matters:**
- Users don’t learn a stable URL pattern.
- Breadcrumbing is unclear (am I inside Strategy? Content? etc.).

**Actionable fix:**
- Decide on one consistent pattern:
  1) **Everything grouped under hub segments** (preferred):
     - e.g. `/strategy/brief`, `/strategy/foundation`, `/strategy/competitors` etc.
     - Then update routes accordingly.
  2) **Everything is a top-level leaf** (then hubs are just dashboards):
     - Keep `/foundation`, `/competitors`, etc. but ensure hub links point to the right leaves.

---

### M2) Visual consistency: emoji-heavy UI inside plan pages
**Where:**
- `src/app/plan/[id]/page.tsx` uses emoji headings (e.g. “📣 Distribute” exists elsewhere too)
- Root layout uses emoji nav

**Why it matters:**
- Emojis can be fine, but here they compete with the more “producty” Lucide iconography.
- Mixed tone makes UI feel stitched together.

**Actionable fix:**
- Pick one system:
  - Either keep emojis only on marketing landing, and use Lucide icons in product.
  - Or standardize emoji usage as small accents, not primary labels.

---

### M3) Missing/weak image alt text and icon-only affordances
**Where:**
- Dashboard plan card uses `alt=""` for app icons (`src/app/dashboard/page.tsx`).
- Plan overview headers also use `alt=""` for icons (`src/app/plan/[id]/page.tsx`, `/overview/page.tsx`).

**Why it matters:**
- Screen readers get no context; also fails basic a11y expectations for meaningful images.

**Actionable fix:**
- If decorative, keep `alt=""` but ensure the app name is adjacent and programmatically associated.
- If informative (app identification), use `alt={`${appName} icon`}`.

---

### M4) Several pages rely on `sessionStorage` for “instant hydration” (state confusion risk)
**Where:**
- `GenerationOverlay.tsx` stores `sessionStorage.setItem('plan-${id}', ...)`
- `src/app/plan/[id]/distribute/page.tsx` loads plan from sessionStorage first

**Why it matters:**
- Opening a plan in a new tab/device won’t have the cached object; content may flicker or differ.
- Cached plan can drift from server truth.

**Actionable fix:**
- Prefer SWR/React Query or a small fetch cache; treat sessionStorage as an optimization only.
- Add a subtle “Refreshing…” indicator when cached data is shown.

---

## Low severity issues / polish

### L1) Copy/labels: “Email Seqs” abbreviation
**Where:** sidebar + content hub

**Why it matters:**
- Abbreviations reduce clarity for new users.

**Fix:** rename to **“Email sequences”**.

---

### L2) Sidebar “Hot” badge meaning unclear
**Where:** `PlanSidebar.tsx` → Distribution has `hot: true` badge

**Fix:**
- Replace “Hot” with something descriptive like **“New”**, **“Beta”**, or remove.

---

### L3) External link truncation & discoverability
**Where:** `/plan/[id]/overview/page.tsx` app URL truncates at `max-w-[200px]`

**Fix:**
- Add a copy-to-clipboard icon/button for the URL.
- Keep full URL available via `title` (already mostly present) and/or a tooltip.

---

## Recommended next steps (implementation order)
1) Fix Strategy “Brief” routing everywhere (Blocker B1).
2) Decide on single Overview (or label both) and align sidebar accordingly (Blocker B2).
3) Split layouts (marketing vs plan shell) to remove root max-width + duplicate sticky header on plan pages (Blocker B3).
4) Remove/replace hardcoded Distribution statuses (High H2).
5) Improve GenerationOverlay dialog semantics + cancel/abort (High H3).

---

## Notes
- There is a legacy/unused navigation component: `src/components/PlanNav.tsx` appears unused but conflicts conceptually (it defines `/overview` differently). Consider deleting or consolidating to avoid future regressions.
