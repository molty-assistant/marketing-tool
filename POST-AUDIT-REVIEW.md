# Post-Audit Engineering & UX Review

**Date:** 2026-02-19
**Reviewers:** Staff Engineer (code review) + Senior UX Design Partner
**Scope:** UX Audit changes from `UX-AUDIT.md` (P0-P3, 30+ issues planned)

---

## CRITICAL: Stashed Changes — Nothing Is Live

All UX audit changes exist in `git stash@{0}` ("wip: interrupted codex phase-9-63 (auto-stash)"). The working tree is **clean** — none of the audit fixes are applied to the codebase. The stash contains 42 files (2,769 additions, 1,501 deletions) including 10 new untracked files.

**Before any of the findings below are relevant, run:**
```bash
git stash pop
```

This review covers the code as it exists **in the stash**. Findings are split into:
- **Section 1:** Verification of what the stash actually changes (vs what UX-AUDIT.md claims)
- **Section 2:** Issues found in the stashed code itself
- **Section 3:** Issues that remain unfixed even with the stash applied

---

## Section 1: Stash Contents vs UX-AUDIT.md Claims

### P0 Fixes — Verified in Stash

| # | Claim | Stash Status | Evidence |
|---|-------|:------------:|----------|
| P0-1 | Orphaned pages added to sidebar | **In stash** | `PlanSidebar.tsx` +21 lines — adds Reviews, Digest, Approvals, Performance, Distribute |
| P0-2 | Dark mode `className="dark"` | **In stash** | `layout.tsx` +2/-2 lines |
| P0-3 | PlanNav.tsx deleted | **In stash** | `PlanNav.tsx` -260 lines |
| P0-4 | Background colors unified | **Partial** | Page-level bg classes removed in stash, but `zinc-*`/`gray-*` internal elements remain (see Section 3) |

**Current state on disk (without stash):**
- `layout.tsx:41` — `<html lang="en">` (NO dark class)
- `PlanNav.tsx` — still exists (6,094 bytes)
- `PlanSidebar.tsx` — missing Reviews, Digest, Approvals, Performance, Distribute
- `social/page.tsx:303` — still has `bg-gray-950`
- `keywords/page.tsx:181` — still has `bg-zinc-950`
- `schedule/page.tsx:142` — still has `bg-slate-950`
- `performance/page.tsx:274,284,295` — still has `bg-slate-950`

### P1 Fixes — Verified in Stash

| # | Claim | Stash Status | Evidence |
|---|-------|:------------:|----------|
| P1-2 | Confirmation before destructive regeneration | **In stash** | `GenerateAllButton.tsx` now imports `ConfirmDialog`; `draft/page.tsx` wraps generate/regenerate in `ConfirmDialog` |
| P1-3 | `usePlan` hook extracted | **In stash** | New file `src/hooks/usePlan.ts` (57 lines); 16+ pages import it |
| P1-4 | Draft copy button feedback | **In stash** | `draft/page.tsx` +192/-lines includes `copiedSection` state |
| P1-7 | ExportBundleButton Dialog migration | **In stash** | `ExportBundleButton.tsx` +265/-lines — imports `Dialog` from `@/components/ui/dialog` |
| P1-8 | Hub landing page depth reduced | **In stash** | Hub pages simplified in stash |
| P1-9 | `use(params)` standardized | **NOT in stash** | `social/page.tsx:3` and `schedule/page.tsx:3` still use `useParams` even in stash |

**Current state on disk (without stash):**
- No `usePlan` hook (each page has own fetch logic)
- No `ConfirmDialog` component
- `ExportBundleButton` uses raw `<div class="fixed inset-0">` modal
- `GenerateAllButton` uses raw `<button>` with emoji `✨`, no confirmation
- Draft page has no per-section copy feedback
- Social and schedule pages use `useParams()` (not `use(params)`)

### P2/P3 Fixes — Verified in Stash

| # | Claim | Stash Status | Evidence |
|---|-------|:------------:|----------|
| P2-1 | GenerateAllButton uses shadcn Button | **In stash** | Imports `Button` + `Sparkles` from lucide |
| P2-3 | Skeleton loading states | **In stash** | Pages import from `@/components/Skeleton` |
| P2-12 | Toast close uses Lucide X | **In stash** | `Toast.tsx` +9/-lines — imports `{ X } from 'lucide-react'` |
| P3-1 | Keyboard shortcuts | **In stash** | New file `src/hooks/useKeyboardShortcuts.tsx` (43 lines) |
| P3-4 | DismissableTip component | **In stash** | New file `src/components/DismissableTip.tsx` (52 lines) |
| P3-6 | "Hot" badge changed to "New" | **NOT in stash** | `PlanSidebar.tsx:255` still says `Hot` even in stash |

**Current state on disk (without stash):**
- `Toast.tsx:62` — close button uses `×` character, no `aria-label`
- No keyboard shortcuts anywhere
- No `DismissableTip` component
- No skeleton loaders on emails/digest/approvals
- `GenerateAllButton` uses raw `<button>` with emoji
- Sidebar badge still says "Hot"

### New Components in Stash (Untracked Files)

| File | Lines | Status |
|------|:-----:|--------|
| `src/hooks/usePlan.ts` | 57 | Only in stash |
| `src/hooks/useKeyboardShortcuts.tsx` | 43 | Only in stash |
| `src/components/ConfirmDialog.tsx` | 69 | Only in stash |
| `src/components/DismissableTip.tsx` | 52 | Only in stash |
| `src/components/ui/alert-dialog.tsx` | 196 | Only in stash |
| `src/components/ui/dialog.tsx` | 158 | Exists on disk (untracked) |

---

## Section 2: Issues Found in the Stashed Code

These issues exist in the stash and would need fixing after `git stash pop`.

### Must Fix

#### 1. `usePlan` hook never revalidates when cache exists
**Severity:** P1 — Data freshness

The stashed `src/hooks/usePlan.ts` returns early after a sessionStorage cache hit and never contacts the API. Users see permanently stale data after navigating between pages. Also missing AbortController for fetch cancellation on unmount.

**Fix:** Remove early return. Show cached data immediately but always fire API fetch in background (stale-while-revalidate). Add AbortController cleanup.
**Effort:** S

#### 2. `useKeyboardShortcuts` stale closure bug
**Severity:** P1 — Functional bug

The stashed `src/hooks/useKeyboardShortcuts.tsx` accepts a `shortcuts` array that is recreated every render (inline array at call sites). The `useEffect` re-runs constantly. Handlers capture stale state.

**Fix:** Use `useRef` internally to always call the latest handler:
```typescript
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
    const ref = useRef(shortcuts);
    ref.current = shortcuts;
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            for (const s of ref.current) { ... }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []); // stable — never re-subscribes
}
```
**Effort:** S

#### 3. `KbdHint` component has malformed JSX whitespace
**Severity:** P2

The stashed `src/hooks/useKeyboardShortcuts.tsx` lines 37-43 has a space between `className=` and the string literal, introducing unnecessary whitespace nodes.

**Fix:** Remove extra spaces in JSX.
**Effort:** S

---

## Section 3: Issues That Remain Unfixed Even With Stash Applied

These exist in the current committed code AND persist after applying the stash.

### Must Fix

#### 4. Hand-rolled modals on schedule + calendar pages
**Severity:** P0 — Accessibility blocker

`src/app/plan/[id]/schedule/page.tsx` has 2 raw `<div class="fixed inset-0">` modals. `src/app/plan/[id]/calendar/page.tsx` has 1. No ARIA roles, no focus trap, no Escape handler, no focus restoration. The stash does NOT migrate these to Dialog (unlike ExportBundleButton).

**Fix:** Replace with shadcn `<Dialog>` (will be available from `src/components/ui/dialog.tsx` after stash pop).
**Effort:** M

#### 5. `ExportBundleButton` stash migration is incomplete
**Severity:** P1 — Accessibility

The stash changes ExportBundleButton, but based on the stash diff size (+265/-lines being a rewrite), this needs verification after pop. The current version on disk uses a raw `<div>` overlay with no ARIA, no focus trap, no Escape handler. Confirm the stashed version fully migrates to the Dialog component.

**Effort:** S (verification only)

#### 6. `useParams()` not standardized on social + schedule
**Severity:** P2 — Consistency

The stash does NOT change `social/page.tsx:3` or `schedule/page.tsx:3` from `useParams()` to `use(params)`. The UX-AUDIT.md marks P1-9 as done, but it isn't.

**Fix:** Change both files to use `use(params)` pattern.
**Effort:** S

#### 7. Sidebar badge still says "Hot" (not "New")
**Severity:** P3 — Clarity

`PlanSidebar.tsx:255` still renders `Hot` in the badge text even in the stash. UX-AUDIT.md marks P3-6 as done, but it isn't.

**Fix:** Change `Hot` to `New` on line 255.
**Effort:** S

### Should Fix (pre-existing issues the stash doesn't address)

#### 8. 61 raw `<button>` elements across 17 pages
**Severity:** P1 — Design system coherence

The stash only converts `GenerateAllButton` and `draft/page.tsx` buttons to shadcn `<Button>`. The remaining pages still use raw `<button>` with inline Tailwind:

| Page | Raw buttons |
|------|:-----------:|
| assets | 11 |
| social | 10 |
| calendar | 5 |
| variants | 4 |
| translate | 4 |
| distribute | 4 |
| brief | 3 |
| reviews | 2 |
| keywords | 2 |
| foundation | 2 |
| digest | 1 |
| emails | 1 |

**Variant mapping:**
- `bg-indigo-600 hover:bg-indigo-500` -> `variant="default"`
- `bg-slate-700 hover:bg-slate-600` -> `variant="secondary"`
- `bg-red-600 hover:bg-red-500` -> `variant="destructive"`
- `border border-slate-700 bg-slate-900/40` -> `variant="outline"`
- Text-only actions -> `variant="ghost"`

**Effort:** L (mechanical, best done page-by-page)

#### 9. zinc/gray color families remain in 3+ pages
**Severity:** P1 — Color consistency

Even with the stash applied, internal elements in reviews, digest, and variants pages use `zinc-*` classes. The social page uses `gray-950` as a page background, and keywords uses `zinc-950`.

**Fix:** Find-and-replace within each file: `zinc-` -> `slate-`, `gray-` -> `slate-`.
**Effort:** S

#### 10. Container max-widths vary wildly
**Severity:** P1 — Visual rhythm

| Width | Pages |
|-------|-------|
| `max-w-4xl` | social, serp, brief |
| `max-w-5xl` | overview, draft, templates, emails, distribute, variants, assets |
| `max-w-6xl` | preview, foundation, reviews, digest, keywords, calendar |
| `max-w-7xl` | schedule |

**Fix:** Standardize to two widths: `max-w-5xl` (standard) and `max-w-6xl` (data-dense).
**Effort:** S

#### 11. Social page uses no design system components
**Severity:** P1 — Highest-traffic page

10 raw buttons, emoji loading spinners, no confirmation on "Queue to Buffer", inconsistent error styling. The stash does not address this.

**Fix:** Import Button, ConfirmDialog. Wrap "Queue to Buffer" in ConfirmDialog. Replace emoji spinners with Lucide `Loader2`.
**Effort:** M

#### 12. Approvals page uses native `confirm()` for delete
**Severity:** P1 — Consistency

`src/app/plan/[id]/approvals/page.tsx` uses browser `confirm()` instead of the ConfirmDialog component.

**Fix:** Replace with ConfirmDialog (available after stash pop).
**Effort:** S

#### 13. Markdown CSS uses wrong variable for text color
**Severity:** P2 — Brief page readability

`src/app/globals.css` — `.markdown-content` paragraph/list/table text uses `var(--muted)` which resolves to a near-invisible dark gray on dark backgrounds. Should use `var(--muted-foreground)`.

**Fix:** Replace `color: var(--muted)` with `color: var(--muted-foreground)` in 3 locations.
**Effort:** S

### Polish

| # | Issue | Location | Effort |
|---|-------|----------|--------|
| 14 | Toast status icons use unicode instead of Lucide | `Toast.tsx:46` | S |
| 15 | ExportBundleButton uses emoji for download icon | `ExportBundleButton.tsx:103` | S |
| 16 | Mobile "hot" dot is meaningless | `PlanSidebar.tsx:179` | S |
| 17 | No keyboard shortcuts on social page | `social/page.tsx` | S |
| 18 | ARIA labels only on 3 of 20+ pages | Various | M |
| 19 | Missing `text-white` on schedule + performance h1 | 2 files | S |

---

## What's Actually Good (Verified on Disk Right Now)

These positives exist in the **committed code** (not the stash):

1. **ErrorRetry component** — `src/components/ErrorRetry.tsx` exists and is imported by 16 plan pages. Clean, reusable error-with-retry pattern.
2. **Skeleton component** — `src/components/Skeleton.tsx` exists and is used by 13 pages for loading states.
3. **Toast system** — Context-based with `useToast()` hook. Exit animations, auto-dismiss, max-5 stacking. (Close button is `×` character, not Lucide X — that fix is in stash only.)
4. **PlanSidebar** — Uses Radix Collapsible, auto-expands active group, remembers open state. Clean architecture. (Missing 5 orphaned pages — that fix is in stash only.)
5. **Plan layout** — `bg-slate-900` background, spacing conventions documented in comment block, server-side plan name resolution.
6. **shadcn UI components** — `Button`, `Badge`, `Collapsible`, `Input`, `Textarea`, `Label`, `Select`, `Card` all installed and available. Underutilized but present.
7. **GenerateAllButton** — Streaming progress bar with step labels, error accumulation, toast on completion. (Uses raw `<button>` and emoji — shadcn migration is in stash only.)

---

## Implementation Plan

### Step 0: Recover the stash
```bash
git stash pop
```
Then verify the working tree matches the stash contents (42 files changed). Commit immediately.

### Step 1: Fix issues in stashed code (before committing)
| Item | Effort |
|------|--------|
| Fix usePlan SWR + AbortController (#1) | S |
| Fix useKeyboardShortcuts stale closure (#2) | S |
| Fix KbdHint whitespace (#3) | S |
| Fix `useParams` on social + schedule (#6) | S |
| Change sidebar "Hot" to "New" (#7) | S |
| Verify ExportBundleButton Dialog migration (#5) | S |

### Step 2: Address remaining gaps
| Session | Items | Effort |
|---------|-------|--------|
| **Quick wins** | zinc->slate (#9), max-widths (#10), markdown CSS (#13), approvals confirm (#12) | Half day |
| **Modals** | Schedule + calendar Dialog migration (#4) | Half day |
| **Social page** | Design system alignment + Queue confirmation (#11) | Half day |
| **Button sweep** | 61 raw buttons -> shadcn Button (#8) | 1-2 days |
| **Polish** | #14-19 | Half day |

---

## Corrections Log

The original version of this report (v1) contained significant errors because the review agents read files from a working tree that was subsequently auto-stashed by an interrupted Codex session. The agents reported on code that existed momentarily but was not committed. Specific false claims in v1:

| Claim | Reality |
|-------|---------|
| "P0-2 dark mode confirmed correct" | `className="dark"` only exists in stash, not on disk |
| "P0-3 PlanNav deleted, zero imports" | PlanNav.tsx still exists on disk (6,094 bytes) |
| "ConfirmDialog smart enabled prop" | `ConfirmDialog.tsx` doesn't exist on disk |
| "DismissableTip handles hydration" | `DismissableTip.tsx` doesn't exist on disk |
| "ExportBundleButton migrated to Dialog" | Still uses raw `<div>` overlay on disk |
| "Toast Lucide X with aria-label" | Still uses `×` character, no aria-label on disk |
| "usePlan adopted by 16 pages" | `src/hooks/` directory doesn't exist on disk |
| "Keyboard shortcuts with KbdHint" | No keyboard shortcuts anywhere on disk |
| "Hot changed to New badge" | Still says "Hot" on disk AND in stash |
| "use(params) standardized, zero useParams" | social + schedule still use useParams on disk AND in stash |
| "social_posts table moved to db.ts" | Still only in `post-to-buffer/route.ts` on disk |
