# UX Audit: Marketing Tool — Full Report

**Overall Score: 52/100 — Needs Work**
**Issues found: 4 Critical (P0), 9 High (P1), 12 Medium (P2), 8 Low (P3)**

## 🏁 Post-Audit Implementation Report (Feb 2026)

All planned critical (P0), high (P1), medium (P2), and polish (P3) issues have been resolved, with the exception of 3 mobile-specific P1 items deferred to a later mobile-focused sprint.

### Scoreboard
| Phase | Done | Open |
|-------|------|------|
| **P0** | 4/4 ✅ | — |
| **P1** | 6/9 ✅ | 3 (mobile deferred) |
| **P2** | 12/12 ✅ | — |
| **P3** | 8/8 ✅ | — |

### Key Improvements
- **Robustness**: 5 pages converted from "Loading..." text to proper skeleton loaders.
- **Navigation**: Sidebar cleaned up ("Hot" -> "New"), 5 orphaned pages restored to nav.
- **Data Integrity**: Templates now track dirty state before saving; Dashboard has search/filter/delete.
- **Polish**: Smooth fade-in animations, `DismissableTip` system, keyboard shortcuts (`⌘↵`, `⌘S`).
- **Dashboard**: Now shows plan completeness bars (e.g. "3/5 ready") and specific hub content previews.

### Staff Review Grade: A-
*Code is clean, localized, and robust. Hydration mismatches resolved. Accessibility patterns followed.*

---

## Key Strengths Worth Preserving

- **GenerationOverlay** — excellent step-by-step progress UX with cancel support
- **ErrorRetry** — clean, reusable error pattern used consistently
- **Overview hub dashboard** — well-designed HubCards with status badges
- **EnhanceButton** — gold standard for AI-assisted editing (tone picker, revert, cooldown)
- **Toast system** — solid context-based notification system

---

## P0 — Critical Issues (Fix First)

### P0-1: Five Functional Pages Unreachable from Navigation

- [x] **Fix this issue**

Reviews, Digest, Approvals, Performance, and Distribute pages exist and work but have **no sidebar links**. Users can only reach them by typing URLs directly.

**Orphaned pages:**

- `/plan/[id]/reviews` — App review monitoring
- `/plan/[id]/digest` — Weekly digest
- `/plan/[id]/approvals` — Content approval queue
- `/plan/[id]/performance` — Post performance tracker
- `/plan/[id]/distribute` — Content atomizer

**Fix:** Add to `src/components/PlanSidebar.tsx` `NAV_GROUPS` constant (lines 39-101). Suggested placement:

- Reviews → under "Strategy" group (market intelligence)
- Approvals → under "Content" group (content workflow)
- Performance → under "Distribution" group (post-publish tracking)
- Distribute → under "Distribution" group (content atomizer)
- Digest → under "Overview" (weekly summary relates to plan health)

**Effort:** S

---

### P0-2: CSS Dark Mode Variables Never Activate

- [x] **Fix this issue**

The `<html>` element in `src/app/layout.tsx` is missing `className="dark"`, so CSS variables in `src/app/globals.css` resolve to light-mode values. The app *looks* dark because of hardcoded Tailwind classes, but variable-based styles (markdown content, scrollbars) are broken.

**Current behaviour:**

- `src/app/layout.tsx` line 41: `<html lang="en">` — no `dark` class
- `src/app/globals.css` line 5: `@custom-variant dark (&:is(.dark *));` — requires `.dark` on ancestor
- `src/app/globals.css` lines 130-162: `.dark { ... }` block with dark variable values never activates

**Fix:** Change `<html lang="en">` to `<html lang="en" className="dark">` — one-line change. Then visually verify all pages, especially markdown content on the brief page.

**Effort:** S

---

### P0-3: Orphaned PlanNav Component

- [x] **Fix this issue**

`src/components/PlanNav.tsx` defines 22 nav items across 5 groups but is **never rendered anywhere**. It has different categorization than the active PlanSidebar, causing developer confusion.

- Keywords is under "Content" in PlanNav but under "SEO & ASO" in PlanSidebar
- PlanNav includes the 5 orphaned pages that PlanSidebar doesn't
- PlanNav uses a different icon set and grouping logic

**Fix:** Delete `src/components/PlanNav.tsx` after absorbing any useful route info into PlanSidebar (see P0-1). Search for imports to confirm nothing references it.

**Effort:** S

---

### P0-4: Inconsistent Background Colors Break Visual Coherence

- [x] **Fix this issue**

Five different background colors across plan pages. As users navigate, the background visibly shifts — the most immediately noticeable UX problem.

**Current background values:**

| Color | Used in |
|-------|---------|
| `bg-slate-900` | Plan layout (`src/app/plan/[id]/layout.tsx`) |
| `bg-gray-950` | Social page |
| `bg-zinc-950` | Keywords, Reviews, Digest, Variants pages |
| `bg-slate-950` | Schedule, Performance pages |
| `bg-[#0a0a0f]` | Root layout (`src/app/layout.tsx`) |

**Fix:** Remove per-page background classes from these files (let them inherit `bg-slate-900` from the plan layout):

- `src/app/plan/[id]/social/page.tsx` — remove `bg-gray-950`
- `src/app/plan/[id]/keywords/page.tsx` — remove `bg-zinc-950`
- `src/app/plan/[id]/schedule/page.tsx` — remove `bg-slate-950`
- `src/app/plan/[id]/performance/page.tsx` — remove `bg-slate-950`
- `src/app/plan/[id]/reviews/page.tsx` — remove `bg-zinc-950`
- `src/app/plan/[id]/digest/page.tsx` — remove `bg-zinc-950`
- `src/app/plan/[id]/variants/page.tsx` — remove `bg-zinc-950`

Also replace any `text-zinc-*`, `border-zinc-*`, `bg-zinc-*` one-offs with `slate-*` equivalents.

**Effort:** M

---

## P1 — High Severity Issues

### P1-1: Mobile Sidebar Shows Only Group Labels, Not Sub-Pages

- [ ] **Fix this issue**

On screens below `lg` breakpoint, PlanSidebar renders only 6 top-level group pills. Sub-pages (Brief, Foundation, Competitors, etc.) are unreachable without first navigating to the hub and clicking through.

**File:** `src/components/PlanSidebar.tsx` lines 143-185

**Fix options:**

- **Option A (simpler):** Add a second horizontal scroll row showing children of the active group
- **Option B (better UX):** Use shadcn Sheet component (`src/components/ui/sheet.tsx`) for a slide-out mobile menu

**Effort:** M

---

### P1-2: No Confirmation Before Destructive AI Regeneration

- [x] **Fix this issue**

Clicking "Generate Draft", "Regenerate", or "Generate Everything" immediately overwrites existing content with no warning and no undo.

**Files:**

- `src/app/plan/[id]/draft/page.tsx` lines 181-226 — `handleGenerate` and `handleRegenerate`
- `src/components/GenerateAllButton.tsx` lines 34-129 — triggers 7+ AI calls with one click

**Fix:** Add AlertDialog confirmation when content already exists. For "Generate Everything", additionally warn about API cost/time.

**Effort:** M

---

### P1-3: Duplicated Plan-Loading Boilerplate Across 12+ Pages

- [x] **Fix this issue**

Every plan page independently implements plan-loading logic with slight variations, causing inconsistent loading states, error handling, and caching.

**Inconsistencies:**

- Some pages use `sessionStorage` caching, others don't
- Some use `async/await`, others use `.then()` chains
- Loading states: `DraftSkeleton`, `PageSkeleton`, bare "Loading..." text, or inline `animate-pulse` divs

**Fix:** Extract a `usePlan(id)` custom hook:

```tsx
// src/hooks/usePlan.ts
export function usePlan(id: string) {
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ... fetch + sessionStorage cache logic
  return { plan, loading, error, reload };
}
```

**Effort:** L (many files, but each change is mechanical)

---

### P1-4: Draft Per-Section Copy Button Has Zero Feedback

- [x] **Fix this issue**

The per-section copy button calls `navigator.clipboard.writeText()` but provides no visual confirmation. Compare with "Copy All" on the same page which shows "Copied!" for 2 seconds.

**File:** `src/app/plan/[id]/draft/page.tsx` lines 401-411

**Fix:**

```tsx
const [copiedSection, setCopiedSection] = useState<string | null>(null);
// On copy:
setCopiedSection(s.key);
setTimeout(() => setCopiedSection(null), 2000);
// In render:
{copiedSection === s.key ? 'Copied!' : 'Copy'}
```

Better yet, extract the brief page's `CopyButton` component to the shared library and reuse it.

**Effort:** S

---

### P1-5: Schedule Page 7-Column Grid Unusable on Mobile

- [ ] **Fix this issue**

A 7-column grid for days of the week renders at all screen sizes. On a 375px phone, each column is ~40px — too narrow.

**File:** `src/app/plan/[id]/schedule/page.tsx`

**Fix:** Show vertical agenda/list view on mobile, keep 7-column grid on `md`+:

```tsx
<div className="hidden md:grid grid-cols-7 gap-2">...</div>
<div className="md:hidden space-y-4">...</div>
```

**Effort:** M

---

### P1-6: Competitors Table Requires 900px Minimum Width

- [ ] **Fix this issue**

The competitors table uses `min-w-[900px]` creating a horizontal scroll container on anything narrower.

**File:** `src/app/plan/[id]/competitors/page.tsx`

**Fix:** Card-based layout on mobile (one competitor per card, stacked), table on `lg`+.

**Effort:** M

---

### P1-7: ExportBundleButton Modal Lacks Accessibility

- [x] **Fix this issue**

The export modal is a raw `<div>` overlay with no ARIA roles, no focus trapping, no Escape key handler, and no focus restoration.

**File:** `src/components/ExportBundleButton.tsx` lines 106-255

**Fix:** Replace with shadcn Dialog component (Radix `@radix-ui/react-dialog`) which handles ARIA, focus trap, Escape, and focus restoration automatically.

**Effort:** M

---

### P1-8: Hub Landing Pages Add Unnecessary Navigation Depth

- [x] **Fix this issue**

Strategy, Content, Distribution, SEO, and Export hubs are simple link-list pages that add an extra click to reach sub-pages.

**Fix options:**

- **Option A (simpler):** Change sidebar group `href` values to navigate directly to the first child (Strategy → Brief, Content → Draft, etc.)
- **Option B (better):** Enhance hubs with summary data and quick actions to make them useful dashboards

**Effort:** S (Option A) or M (Option B)

---

### P1-9: Inconsistent `useParams()` vs `use(params)` Pattern

- [x] **Fix this issue**

Most pages use the React 19 `use(params)` pattern, but social and schedule pages use the older `useParams()` from Next.js.

**Files to update:**

- `src/app/plan/[id]/social/page.tsx` — change `useParams` to `use(params)`
- `src/app/plan/[id]/schedule/page.tsx` — change `useParams` to `use(params)`

**Effort:** S

---

## P2 — Medium Severity Issues

### P2-1: GenerateAllButton Uses Raw `<button>` Instead of shadcn Button

- [x] **Fix this issue**

**File:** `src/components/GenerateAllButton.tsx` lines 133-139

**Fix:** Import `{ Button }` from `@/components/ui/button` and replace the raw `<button>`.

**Effort:** S

---

### P2-2: Draft Page Raw Buttons Not Using Design System

- [x] **Fix this issue**

**File:** `src/app/plan/[id]/draft/page.tsx` lines 290-304 (Copy All, Generate Draft) and lines 393-411 (Regenerate, Copy per-section)

**Fix:** Replace raw `<button>` elements with `<Button variant="secondary">` for Copy and `<Button>` for Generate.

**Effort:** S

---

### P2-3: Inconsistent Loading States Across Pages

- [x] **Fix this issue**

**Good:** Draft → `DraftSkeleton`, Overview → inline `animate-pulse`, Preview → `PreviewSkeleton`
**Bad:** Emails, Digest, Approvals → bare "Loading..." text

**Fix:** Import `{ PageSkeleton }` from `@/components/Skeleton` in emails, digest, and approvals pages. Replace bare "Loading..." text.

**Effort:** S

---

### P2-4: Markdown Content Colors Wrong on Brief Page

- [x] **Fix this issue**

CSS variables for `.markdown-content` in `src/app/globals.css` lines 54-68 resolve to light-mode values. Largely fixed by P0-2.

**Fix:** Apply P0-2 first, then verify markdown rendering on the brief page.

**Effort:** S (contingent on P0-2)

---

### P2-5: No Search or Filter on Dashboard

- [x] **Fix this issue**

**File:** `src/app/(marketing)/dashboard/page.tsx`

**Fix:** Add `<Input>` search field with client-side filtering:

```tsx
const [search, setSearch] = useState('');
const filtered = plans.filter(p =>
  p.config.app_name?.toLowerCase().includes(search.toLowerCase())
);
```

**Effort:** S

---

### P2-6: No Delete Functionality for Plans

- [x] **Fix this issue**

Plans accumulate with no cleanup option. Dashboard only has "Open" action.

**Fix:** Add delete icon button to plan cards with AlertDialog confirmation. Call `DELETE /api/plans/${id}` on confirm.

**Effort:** M (requires backend endpoint)

---

### P2-7: Foundation Page Too Long Without Section Navigation

- [x] **Fix this issue**

Brand Voice, Positioning Angles, and Competitive Analysis sections render sequentially with no way to jump between them.

**File:** `src/app/plan/[id]/foundation/page.tsx`

**Fix options:**

- **Option A:** Add sticky jump-links nav at top with `id` anchors on section headings
- **Option B:** Use shadcn Tabs to show one section at a time

**Effort:** S (Option A) or M (Option B)

---

### P2-9: Templates "Save Changes" Button Always Visible

- [x] **Fix this issue**

**File:** `src/app/plan/[id]/templates/page.tsx` lines 328-334

**Fix:** Track a `dirty` flag, set it on user edits, reset on save. Only show button when dirty.

**Effort:** S

---

### P2-10: Emoji Used as Button Icons (Inconsistent with Lucide)

- [x] **Fix this issue**

Some buttons use emoji as icons, others use Lucide icons. Emoji render differently across platforms.

**Fix:** Replace emoji in buttons with Lucide equivalents:

- `Sparkles` for enhance/generate
- `ClipboardCopy` for copy
- `Undo2` for revert
- `Download` for download
- `RefreshCw` for regenerate

Keep emoji in page titles (h1) for personality if desired.

**Effort:** S

---

### P2-11: Preview Page Has Duplicate Editing Paradigm

- [x] **Fix this issue**

The preview page has both inline transparent inputs on the white card AND a dark-themed side panel editing the same fields.

**File:** `src/app/plan/[id]/preview/page.tsx` lines 198-209 (inline) and 331-360 (side panel)

**Fix:** Keep inline editing on the card (more intuitive), remove the side panel. Add subtle focus indicators on inline inputs.

**Effort:** S

---

### P2-12: Toast Close Button Uses Raw Character

- [x] **Fix this issue**

**File:** `src/components/Toast.tsx`

**Fix:** Replace `x` character with `<X className="w-3.5 h-3.5" />` from Lucide.

**Effort:** S

---

## P3 — Polish Issues

### P3-1: No Keyboard Shortcuts

- [x] **Fix this issue**

**Fix:** Add `Cmd/Ctrl+Enter` for generate, `Cmd/Ctrl+S` for save. Show hints next to buttons: `<kbd>⌘↵</kbd>`

**Effort:** M

---

### P3-2: No Data Freshness Indicators

- [x] **Fix this issue**

Users don't know when content was last generated or updated.

**Fix:** Display `createdAt`/`updatedAt` timestamps from plan object in `text-xs text-slate-500` near section headers.

**Effort:** S

---

### P3-3: Overview Hub Cards Don't Show Content Previews

- [x] **Fix this issue**

Overview shows status badges but no preview of actual content.

**Fix:** The overview API already returns `sections[key].preview` strings. Pass them to HubCard and render below the description.

**Effort:** S

---

### P3-4: Info Banners Not Dismissible

- [x] **Fix this issue**

Contextual banners at the top of pages help but take up space on repeat visits.

**Fix:** Create `<DismissableTip id="...">` component with X button and `localStorage` persistence.

**Effort:** S

---

### P3-5: No Page Transition Animations

- [x] **Fix this issue**

Page transitions are instantaneous with no visual continuity.

**Fix:** Add 200ms fade-in on page mount via CSS animation:

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
```

**Effort:** S

---

### P3-6: Sidebar "Hot" Badge Purpose Unclear

- [x] **Fix this issue**

**File:** `src/components/PlanSidebar.tsx` line 74 — `hot: true`

**Fix:** Change badge text to "New" or add a tooltip explaining what it means.

**Effort:** S

---

### P3-7: Dashboard Cards Don't Show Plan Completeness

- [x] **Fix this issue**

Users can't tell at a glance how complete their plan is without opening it.

**Fix:** Add completion indicator to plan cards (e.g., "3/5 hubs ready" or a small progress bar).

**Effort:** M

---

### P3-8: Preview "Get" Button Is Non-Functional

- [x] **Fix this issue**

**File:** `src/app/plan/[id]/preview/page.tsx` line 212

**Fix:** Add `pointer-events-none cursor-default` to make it clearly decorative, or add a tooltip: "This is a preview only."

**Effort:** S

---

## Design System Recommendations

### Inconsistencies to Resolve

1. **Color families:** Standardize on `slate-*` (currently mixed with `zinc-*` and `gray-*`)
2. **Buttons:** Use shadcn `<Button>` everywhere — no raw `<button>` elements
3. **Icons:** Lucide for interactive elements, emoji only for decorative headings
4. **Spacing:** Enforce conventions documented in plan layout: `pt-6`, `mb-8`, `p-6`, `space-y-4`

### Shared Components to Extract

1. **PageHeader** — h1 + subtitle + action buttons (used on nearly every page)
2. **SectionCard** — rounded card with title, subtitle, and content body
3. **CopyButton** — three different copy-to-clipboard implementations exist
4. **InfoBanner** — contextual tip banner with optional dismiss

### Design Tokens to Establish

```
Backgrounds:
  --app-bg:        #0a0a0f       (root/marketing pages)
  --workspace-bg:  slate-900     (plan workspace)
  --card-bg:       slate-800/30  (content cards)
  --input-bg:      slate-900/40  (form inputs)

Borders:
  --card-border:   slate-700/50
  --subtle-border: white/[0.06]
  --input-border:  slate-700

Actions:
  --action-primary:     indigo-600   (generate, save, CTA)
  --action-secondary:   slate-700    (copy, cancel)
  --action-success:     emerald-600  (generate all)
  --action-destructive: red-600      (delete, reject)
```

---

---
---

# Product Strategy: Solo Founder Autopilot

## Vision

**Turn this from a "marketing tool for marketers" into a "marketing autopilot for solo founders."**

The current app assumes the user wants to *think about* marketing — pick tones, review positioning angles, tweak SEO keywords, configure A/B variants. But the target user wants marketing to *just happen*.

### The Dream Flow

```
Paste URL
  → AI understands your app
    → AI creates a marketing plan (behind the scenes)
      → AI generates a week of social posts + images
        → You review/approve in 2 minutes
          → Approved posts auto-publish to Instagram via Buffer
```

**Target: ~10 minutes a day reviewing posts, not hours creating them.**

---

## Architecture: Progressive Disclosure (Not Mode Toggles)

No "Simple Mode" / "Power Mode" toggle. Instead, one interface with progressive disclosure. The simple experience is the default; detail is available on demand.

### Sidebar Structure

```
[App Name]
─────────────────────────
Dashboard                     ← your apps overview
Autopilot                     ← setup + review feed + status
Settings                      ← connections, preferences
─────────────────────────
Plan Details (collapsed)      ← click to expand
  Strategy
    Brief | Foundation | Competitors | Reviews
  Content
    Copy Draft | Email Sequences | Templates
    Translations | Approvals
  Distribution
    Social Posts | Schedule | Calendar
    Distribute | Performance
  SEO & ASO
    Keywords | SERP Preview | Variants
  Export
    Assets | Preview | Digest
```

"Plan Details" is **collapsed by default**. New users never see it unless they go looking. This is the Linear/Notion pattern — no confusion, no mode switching, no duplicate interfaces to maintain.

### Why Not Two Modes

- Mode toggles create cognitive overhead ("which mode am I in?")
- The modes aren't separate workflows — they're the same workflow at different zoom levels
- Two modes doubles the maintenance surface for a solo builder
- "We'll clean up Power Mode later" never happens

---

## Current Pipeline Status

### What Already Works (end-to-end chain exists in code)

```
generate-schedule (AI plans a week of topics)
  → content_schedule rows in SQLite
    → process-schedule (designed for cron — NOT wired up)
      → auto-publish (per scheduled post)
        → Gemini 2.5 Flash generates caption + hashtags
          → Imagen 3 generates image (with AI background)
            → Posts to Buffer via Zapier MCP
```

**Every link in this chain is built.** The critical gap: nothing calls `process-schedule`.

### What's Broken or Missing

| # | Gap | Impact | Fix |
|---|-----|--------|-----|
| 1 | **No cron trigger** | `process-schedule` is never called — the entire auto-publish pipeline is dead | Add Railway cron or internal scheduler |
| 2 | **No single "launch" button** | `GenerateAllButton` only does copy, not social/schedule | Build autopilot flow that chains everything |
| 3 | **Video is a dead end** | Veo 2 generates video but never flows to Buffer — download only | Fix video-to-Buffer path (needed for TikTok) |
| 4 | **Hardcoded Zapier token** | Security issue — literal string in `post-to-buffer/route.ts` line 16 | Move to env var `ZAPIER_MCP_TOKEN` |
| 5 | **No Buffer time-scheduling** | Posts queue in Buffer's default order, not at planned times | Pass `publishNow: true` at the right time, or set Buffer schedule |
| 6 | **No feedback loop** | Schedule page doesn't auto-update status without refresh | Add polling for live status |
| 7 | **No content quality validation** | Nobody has tested whether Gemini captions + Imagen images are good enough to post | Generate test batch and evaluate before building autopilot UI |
| 8 | **No review-before-publish flow** | Auto-publish goes straight to Buffer with zero human check | Build approve/edit/skip feed for v1 |
| 9 | **No content pillars** | Schedule generator creates random post types — feels directionless | Let user set 3-4 themes posts rotate through |
| 10 | **Buffer free tier limit** | 10 posts/channel queue — daily posting on 2 platforms = 14/week, over the limit | Frequency options must reflect Buffer constraints |

---

## Post Types & Media Strategy

### Instagram Post Types

| Type | Media | How it works |
|------|-------|-------------|
| **Single image** | 1080x1080 | Imagen 3 AI background + text overlay via Playwright template |
| **Carousel** | Up to 10 slides, 1080x1080 | User provides product screenshots/images. Gemini generates a "hook" first slide (attention-grabbing text + design). Remaining slides are the provided images with optional captions |
| **Story** | 1080x1920 | Same as single image but portrait orientation |
| **Reel** | 1080x1920 video | Veo 2 generated — Later phase, when video-to-Buffer works |

### Carousel Flow (New)

```
Autopilot generates carousel post:
  1. AI picks topic from content pillars
  2. AI writes caption + hook text for slide 1
  3. Playwright renders hook slide as branded image (bold typography + brand palette background)
  4. Remaining slides = app screenshots already scraped from App Store / Play Store / website
  5. Post queued to Buffer with all images attached
```

The hook slide is key — it's what stops the scroll. Gemini generates the hook text and layout brief, Playwright renders it (same approach as `asset-generator.ts`). No AI image generation or user upload needed — **the scraper already pulls app screenshots at plan creation time**. The plan's `config.screenshots` array is available immediately. Zero new infrastructure required for carousel v1.

### TikTok (Later — After Video Pipeline Works)

TikTok without video is pointless. Don't add TikTok support until Veo 2 video reliably flows through to Buffer. Start with Instagram only.

### Platform Expansion Order

1. **Instagram** (Now) — images + carousels
2. **TikTok** (Next) — when video pipeline works end-to-end
3. **X/Twitter** (Later) — short text + optional image, via Buffer
4. **Reddit** (Later) — conversational style, subreddit-aware, via Buffer

---

## Mobile Strategy

**Mobile is not a priority.** This is a desktop-first tool for developers working at their desk.

The only mobile-relevant flow is the daily review/approve feed — but that's naturally a card list which is responsive by default. Don't spend time fixing existing mobile issues (schedule 7-column grid, competitors table, sidebar pills) until there's a real reason.

**Now:** Build the autopilot review feed as a simple card list (responsive by nature)
**Later:** If you find yourself wanting to approve posts from your phone, polish the mobile experience then

Mobile-related audit items (P1-1, P1-5, P1-6) are moved to Later.

---

## Avoiding Tech Debt for Future SaaS

Not building for SaaS now, but avoiding decisions that create expensive migrations later:

| Decision | Do Now | Avoid |
|----------|--------|-------|
| **Auth** | HTTP Basic Auth is fine for solo use | Don't hardcode user-specific logic into DB queries. Keep a `user_id` concept even if there's only one user |
| **Database** | SQLite is fine | Don't use SQLite-specific features that don't exist in Postgres/Turso (e.g., avoid `GROUP_CONCAT`, use standard SQL) |
| **API keys** | Env vars for all secrets | Don't hardcode tokens, API keys, or URLs (current Zapier token violation) |
| **File storage** | Local volume is fine | Use a consistent path abstraction so switching to S3/R2 later is a config change, not a rewrite |
| **Multi-tenancy** | Single tenant | Keep `plan_id` as the primary data isolation key — this naturally becomes `user_id + plan_id` later |

---

## Roadmap: Now / Next / Later

### Phase 0: Foundation (NOW — 3-4 days)

Critical fixes + content quality validation. Nothing new gets built until the foundation is solid and we know the AI output is good enough.

#### UX Foundation

- [x] Add `className="dark"` to `<html>` element (P0-2)
- [x] Add orphaned pages to PlanSidebar navigation (P0-1)
- [x] Delete orphaned `PlanNav.tsx` (P0-3)
- [x] Unify background colors — remove per-page bg classes, inherit `slate-900` from layout (P0-4)
- [x] Move Zapier token to `ZAPIER_MCP_TOKEN` env var

#### Technical Foundation

- [x] Extract `usePlan(id)` custom hook — eliminates duplicated plan-loading across 12+ pages
- [ ] Add `autopilot_config` JSON column to `plans` table (platforms, frequency, content pillars, enabled flag)
- [ ] Add index on `content_schedule(plan_id, status)` for efficient autopilot queries
- [x] Move `social_posts` table creation from `post-to-buffer/route.ts` into central `getDb()` init
- [x] Standardize on `use(params)` React 19 pattern in social + schedule pages (P1-9)

#### Content Quality Test (CRITICAL)

- [ ] Use the existing social page to manually generate 10+ posts for a real app
- [ ] Evaluate caption quality — would you post these under your brand?
- [ ] Evaluate Imagen 3 image quality — usable for Instagram or generic AI slop?
- [ ] Evaluate Playwright template images — do the text overlays look professional?
- [ ] If quality is poor: fix AI prompts, adjust templates, improve image pipeline BEFORE Phase 1
- [ ] Document what works and what needs improvement

### Phase 1: Autopilot Core — Instagram Only (NOW — 5-7 days)

Build the primary experience. Instagram only. Review-before-publish (not fully autonomous yet).

#### Autopilot Page (`/plan/[id]/autopilot`)

- [ ] Setup section: Choose Instagram, set frequency (3x/week, daily — constrained by Buffer free tier), set content pillars (3-4 themes like "product tips", "founder story", "user wins", "industry takes")
- [ ] "Launch Autopilot" chains: `generate-schedule` with content pillars → creates week of posts → cron processing enabled for this plan
- [ ] Review feed: upcoming posts as cards with approve/edit/skip actions
- [ ] Each card shows: caption preview, image preview, scheduled time, content pillar tag
- [ ] Edit inline: tap caption to edit, regenerate image button
- [ ] Status section: autopilot running/paused, next post, posts this week, success/fail counts
- [ ] Pause/resume toggle
- [ ] Error recovery: failed posts shown with error message + retry button

#### Carousel Support (New)

- [ ] Add "carousel" as a content type in schedule generation
- [ ] Gemini generates hook text for slide 1 (attention-grabbing, on-brand)
- [ ] Playwright renders hook slide as branded image (bold typography + background from brand palette — same approach as `asset-generator.ts`)
- [ ] Remaining slides use `plan.config.screenshots` already scraped at plan creation — no upload needed
- [ ] Carousel posts queued to Buffer with multiple image attachments (hook slide + up to 9 screenshots)
- [ ] Add `approved` status to `content_schedule` status enum (alongside scheduled/generating/posted/failed/cancelled) — required for review-before-publish flow

#### Pipeline Wiring

- [ ] Add Railway cron to call `POST /api/process-schedule` every 15 minutes
- [ ] Only process posts that have been approved (add `approved` status to content_schedule)
- [ ] Auto-approve if user enables "trust mode" later — but v1 requires manual approval
- [ ] Autopilot review feed polls `/api/content-schedule` every 30 seconds for live status updates

#### Sidebar Restructure

- [ ] Primary nav: Dashboard, Autopilot, Settings (always visible)
- [ ] "Plan Details" section: collapsed by default, contains all existing nav groups
- [ ] Remember expanded/collapsed state in localStorage
- [ ] After plan generation, redirect to `/plan/[id]/autopilot` instead of `/plan/[id]`

### Phase 2: Dogfood (NOW — 2 weeks, 0 dev days)

**Stop building. Start using.** Run autopilot on your own app(s) for 2 weeks.

- [ ] Set up autopilot for at least one real app
- [ ] Review and approve posts daily (~2-5 minutes)
- [ ] Track: are the AI images good enough for Instagram?
- [ ] Track: are captions on-brand and engaging?
- [ ] Track: does the content pillar rotation feel intentional or random?
- [ ] Track: what's annoying? What's missing? What breaks?
- [ ] Track: how often do you want to edit vs. just approve?
- [ ] Note which "Plan Details" pages you actually visit (probably very few)
- [ ] This generates the REAL backlog for Phase 3

### Phase 3: Iterate Based on Reality (NEXT — ongoing)

Fix whatever Phase 2 revealed. Priorities will be informed by actual usage.

#### Likely Candidates Based on Current Assessment

- [ ] Improve AI prompt quality based on dogfooding feedback
- [ ] Add confirmation dialogs before destructive AI regeneration (P1-2)
- [ ] Fix ExportBundleButton modal accessibility — replace with shadcn Dialog (P1-7)
- [ ] Replace raw `<button>` elements with shadcn `<Button>` across all pages (P2-1, P2-2)
- [ ] Standardize loading states with skeleton components (P2-3)
- [ ] Replace emoji icons in buttons with Lucide equivalents (P2-10)
- [ ] Extract shared components as patterns emerge: PageHeader, SectionCard, CopyButton, InfoBanner
- [ ] Add "trust mode" toggle — skip review, auto-approve all posts (only after you trust the output)
- [ ] Dashboard improvements: autopilot status indicator, next post, plan delete, search/filter
- [ ] Reduce hub landing page click depth (P1-8)
- [ ] Fix draft copy button feedback (P1-4)

### Phase 4: Expand Platforms (LATER)

Only after Instagram autopilot is solid and trusted.

#### TikTok (requires video pipeline)

- [ ] Fix video-to-Buffer path: save Veo 2 video to persistent storage, serve public URL
- [ ] Add server-side video status polling (currently browser-only — won't work for cron)
- [ ] Add TikTok to platform picker in autopilot setup
- [ ] Adjust AI prompts for TikTok style (trend hooks, vertical format, faster pace)
- [ ] Platform-specific image sizing: TikTok cover (1080x1920)

#### X/Twitter

- [ ] Add to platform picker and AI prompt templates
- [ ] Style: short + punchy, conversation starters, thread support
- [ ] Via Buffer/Zapier pipeline

#### Reddit

- [ ] Add to platform picker
- [ ] Style: conversational, value-first, subreddit-aware (requires user to specify target subreddits)
- [ ] Different posting strategy — Reddit penalizes overtly promotional content
- [ ] Via Buffer/Zapier pipeline

### Phase 5: Power Page Cleanup (LATER)

Lower priority audit fixes. Do these as you encounter the pain or if prepping for other users.

#### Responsive / Mobile (only when needed)

- [ ] Mobile sub-page navigation in sidebar (P1-1)
- [ ] Schedule page responsive layout — agenda view on mobile (P1-5)
- [ ] Competitors table card layout on mobile (P1-6)

#### UX Polish

- [x] Foundation page section navigation — sticky jump-links or tabs (P2-7)
- [x] Templates dirty tracking for save button (P2-9)
- [x] Preview page — remove duplicate editing paradigm (P2-11)
- [x] Toast close button — Lucide X icon (P2-12)
- [x] Dashboard plan search/filter (P2-5)
- [x] Plan delete functionality (P2-6)
- [x] Page transition animations (P3-5)
- [x] Dismissible info banners with localStorage (P3-4)
- [x] Data freshness timestamps (P3-2)
- [x] Overview hub cards show content previews (P3-3)
- [x] Sidebar "Hot" badge — clarify or remove (P3-6)
- [x] Dashboard plan completeness indicator (P3-7)
- [x] Preview "Get" button — make clearly decorative (P3-8)
- [x] Keyboard shortcuts (P3-1)

---

## Tool Stack

| Need | Tool | Cost |
|------|------|------|
| AI text generation | Gemini 2.5 Flash (already using) | Free tier generous, then ~$0.15/1M tokens |
| AI image generation | Imagen 3 (already using) | Free tier, then ~$0.02/image |
| AI video generation | Veo 2 (already using) | Free tier limited, needed for TikTok later |
| Social scheduling | Buffer (via Zapier MCP) | Free: 3 channels, 10 posts/channel queue |
| Cron jobs | Railway cron (already on Railway) | Included in plan |
| Hosting | Railway (already using) | ~$5/mo hobby plan |
| Database | SQLite (already using) | Free, local |
| AI coding | Claude Code, Cursor, Codex | Already have |

### Buffer Free Tier Constraint

10 posts per channel queue. This directly affects autopilot frequency options:

| Frequency | Posts/week | Buffer capacity | Viable? |
|-----------|-----------|----------------|---------|
| 3x/week | 3 | 10 queue slots | Yes |
| 5x/week (daily weekdays) | 5 | 10 queue slots | Yes |
| 7x/week (daily) | 7 | 10 queue slots | Tight but ok |
| 2x/day | 14 | 10 queue slots | No — needs paid Buffer |

Autopilot frequency picker should reflect these limits. Don't offer options that will silently fail.
