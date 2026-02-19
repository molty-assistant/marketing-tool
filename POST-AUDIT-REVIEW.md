# Post-Audit Engineering & UX Review

**Date:** 2026-02-19
**Reviewers:** Staff Engineer (code review) + Senior UX Design Partner
**Scope:** UX Audit changes from `UX-AUDIT.md` (P0-P3, 30+ issues planned)
**Status:** All changes confirmed live on `main`

---

## Summary

The UX audit changes are applied and committed. Core P0/P1 issues are resolved. New hooks and components are well-implemented. Several gaps remain and are tracked in the "Still Needs Work" section below.

---

## Verified Fixes

### P0

| # | Issue | Status | Notes |
|---|-------|:------:|-------|
| P0-1 | Orphaned pages added to sidebar | ✅ Fixed | Reviews, Digest, Approvals, Performance, Distribute all present in `PlanSidebar.tsx` |
| P0-2 | Dark mode `className="dark"` | ✅ Fixed | `layout.tsx` — `<html lang="en" className="dark">` |
| P0-3 | PlanNav.tsx deleted | ✅ Fixed | File removed, zero remaining imports |
| P0-4 | Background colors unified (page-level) | ✅ Fixed | `bg-slate-900` consistent across pages; some internal `zinc-*`/`gray-*` elements remain (see #9 below) |

### P1

| # | Issue | Status | Notes |
|---|-------|:------:|-------|
| P1-2 | Confirmation before destructive regeneration | ✅ Fixed | `GenerateAllButton` wraps `run` in `ConfirmDialog`; `draft/page.tsx` wraps regenerate actions |
| P1-3 | `usePlan` hook extracted | ✅ Fixed | `src/hooks/usePlan.ts` (69 lines); 16+ pages import it |
| P1-4 | Draft copy button per-section feedback | ✅ Fixed | `draft/page.tsx` has `copiedSection` state |
| P1-7 | ExportBundleButton — accessible modal | ✅ Fixed | Migrated to shadcn `<Dialog>` (Radix-based, focus-trapped, Escape handler) |
| P1-9 | `use(params)` standardized | ✅ Fixed | No `useParams()` calls remaining in plan pages |

### P2 / P3

| # | Issue | Status | Notes |
|---|-------|:------:|-------|
| P2-1 | GenerateAllButton — shadcn Button + Sparkles | ✅ Fixed | Imports `Button` from `@/components/ui/button`, Lucide `Sparkles` |
| P2-3 | Skeleton loading states | ✅ Fixed | Pages import from `@/components/Skeleton` |
| P2-12 | Toast close — Lucide X with aria-label | ✅ Fixed | `Toast.tsx` — `<X className="w-3.5 h-3.5" />` with `aria-label="Dismiss"` |
| P3-1 | Keyboard shortcuts | ✅ Fixed | `src/hooks/useKeyboardShortcuts.tsx` (46 lines) + `KbdHint` component |
| P3-4 | DismissableTip component | ✅ Fixed | `src/components/DismissableTip.tsx` (52 lines) — localStorage with hydration safety |
| P3-6 | "Hot" badge → "New" | ✅ Fixed | `PlanSidebar.tsx:260` — renders "New" |

### New Components (all confirmed on disk)

| File | Lines | Quality |
|------|:-----:|---------|
| `src/hooks/usePlan.ts` | 69 | Clean — SWR pattern, AbortController, sessionStorage cache |
| `src/hooks/useKeyboardShortcuts.tsx` | 46 | Clean — stable listener via `useRef`, no stale closures |
| `src/components/ConfirmDialog.tsx` | 69 | Clean — `enabled` prop prevents double-wrap footgun |
| `src/components/DismissableTip.tsx` | 52 | Clean — mounted guard prevents hydration mismatch |
| `src/components/ui/dialog.tsx` | 158 | Standard shadcn Dialog (Radix) |
| `src/components/ui/alert-dialog.tsx` | 196 | Standard shadcn AlertDialog (Radix) |

---

## Code Quality: New Code Review

The new hooks and components are well-written. No bugs found.

**`usePlan.ts`** — Correct stale-while-revalidate pattern: serves cached data immediately, then fetches fresh in background and updates. AbortController prevents state updates on unmounted components. `useCallback` dependency on `id` means the hook correctly re-fetches when the plan ID changes.

**`useKeyboardShortcuts.tsx`** — Correctly uses `useRef` to hold the latest shortcuts array, with an empty `useEffect` dependency array for a single stable event listener. Handlers always call `ref.current` so they never close over stale state. This is the idiomatic pattern.

**`ConfirmDialog.tsx`** — The `enabled` prop (defaults to `true`) is a smart footgun prevention. When `enabled=false` the trigger fires immediately with no dialog — useful for in-flight states. Uses AlertDialog (Radix) for correct focus management, ARIA roles, and Escape handling.

**`DismissableTip.tsx`** — `mounted` state guard is correct for preventing hydration mismatch on SSR. localStorage reads are inside `useEffect` (client-only). The component returns `null` until mounted.

---

## Still Needs Work

### Must Fix

#### 1. Hand-rolled modals on schedule + calendar pages
**Severity:** P0 — Accessibility blocker

`src/app/plan/[id]/schedule/page.tsx` has 2 raw `<div class="fixed inset-0">` modals.
`src/app/plan/[id]/calendar/page.tsx` has 1. No ARIA roles, no focus trap, no Escape handler, no focus restoration. The audit ExportBundleButton migration was done; these were not.

**Fix:** Replace with shadcn `<Dialog>` (already installed at `src/components/ui/dialog.tsx`).
**Effort:** M

#### 2. 61 raw `<button>` elements across 17 pages
**Severity:** P1 — Design system coherence

The audit only converted `GenerateAllButton` and `draft/page.tsx`. The rest of the app still uses raw `<button>` with inline Tailwind:

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
- `bg-indigo-600 hover:bg-indigo-500` → `variant="default"`
- `bg-slate-700 hover:bg-slate-600` → `variant="secondary"`
- `bg-red-600 hover:bg-red-500` → `variant="destructive"`
- `border border-slate-700 bg-slate-900/40` → `variant="outline"`
- Text-only → `variant="ghost"`

**Effort:** L (mechanical, best done page-by-page)

#### 3. Social page uses no design system components
**Severity:** P1 — Highest-traffic page

10 raw buttons, emoji loading spinners (`⚡`), no confirmation on "Queue to Buffer", inconsistent error styling.

**Fix:** Import `Button`, `ConfirmDialog`. Wrap "Queue to Buffer" in `ConfirmDialog`. Replace emoji spinners with Lucide `Loader2`.
**Effort:** M

#### 4. zinc/gray color families remain in 3+ pages
**Severity:** P1 — Color consistency

Internal elements in reviews, digest, and variants pages still use `zinc-*` classes. Social page uses `gray-950` for some elements. Keywords uses `zinc-950` in spots.

**Fix:** Find-and-replace within each file: `zinc-` → `slate-`, `gray-` → `slate-`.
**Effort:** S

#### 5. Approvals page uses native `confirm()` for delete
**Severity:** P1 — Consistency

`src/app/plan/[id]/approvals/page.tsx` calls `window.confirm()` instead of `ConfirmDialog`.

**Fix:** Replace with `ConfirmDialog` (already installed).
**Effort:** S

#### 6. Container max-widths vary wildly
**Severity:** P1 — Visual rhythm

| Width | Pages |
|-------|-------|
| `max-w-4xl` | social, serp, brief |
| `max-w-5xl` | overview, draft, templates, emails, distribute, variants, assets |
| `max-w-6xl` | preview, foundation, reviews, digest, keywords, calendar |
| `max-w-7xl` | schedule |

**Fix:** Standardize to two widths: `max-w-5xl` (standard) and `max-w-6xl` (data-dense).
**Effort:** S

### Should Fix

#### 7. Markdown CSS uses wrong variable for text color
**Severity:** P2 — Brief page readability

`src/app/globals.css` — `.markdown-content` paragraph/list/table text uses `var(--muted)` which resolves to a near-invisible dark gray on dark backgrounds. Should use `var(--muted-foreground)`.

**Fix:** Replace `color: var(--muted)` with `color: var(--muted-foreground)` in 3 locations.
**Effort:** S

### Polish

| # | Issue | Location | Effort |
|---|-------|----------|--------|
| 8 | Toast status icons use unicode (✓ ✕ ℹ) not Lucide | `Toast.tsx:46` | S |
| 9 | ExportBundleButton trigger uses emoji ⬇️ | `ExportBundleButton.tsx:112` | S |
| 10 | Mobile "hot dot" has no tooltip/meaning | `PlanSidebar.tsx:184` | S |
| 11 | No keyboard shortcuts on social page | `social/page.tsx` | S |
| 12 | ARIA labels sparse — only on 3 of 20+ pages | Various | M |
| 13 | Missing `text-white` on schedule + performance h1 | 2 files | S |

---

## What's Good

1. **`usePlan` hook** — SWR pattern is correct and clean. AbortController prevents stale state on navigation. One central hook adopted by 16 pages eliminates duplicated fetch logic.
2. **`useKeyboardShortcuts`** — Idiomatic `useRef` pattern. No stale closures. KbdHint renders correctly with correct spacing.
3. **`ConfirmDialog`** — The `enabled` prop is a thoughtful API. Wrapping non-destructive calls doesn't require special-casing the dialog.
4. **`DismissableTip`** — Hydration guard is correct. localStorage persistence is clean.
5. **`ExportBundleButton`** — Full Dialog migration with `onOpenChange={(v) => !exporting && setOpen(v)}` (prevents accidental close during export). `showCloseButton={!exporting}` is a nice detail.
6. **`GenerateAllButton`** — Streaming progress bar with step labels, error accumulation. ConfirmDialog prevents accidental destructive runs.
7. **Toast system** — Context-based, exit animations, auto-dismiss, max-5 stacking, Lucide X with aria-label.
8. **PlanSidebar** — All orphaned pages reachable. Radix Collapsible for auto-expand. "New" badge on Distribution. Group hrefs point directly to first child (not dead hub pages).
9. **shadcn component library** — Button, Badge, Dialog, AlertDialog, Collapsible, Input, Textarea, Label, Select, Card all installed. Foundation for the remaining button migration is there.

---

## Implementation Plan

### Next session: Quick wins
| Item | Effort |
|------|--------|
| zinc→slate, gray→slate sweep (#4) | S |
| Standardize container max-widths (#6) | S |
| Fix markdown CSS variable (#7) | S |
| Replace approvals `confirm()` with ConfirmDialog (#5) | S |

### Following session: Modals + social
| Item | Effort |
|------|--------|
| Schedule + calendar Dialog migration (#1) | M |
| Social page design system alignment (#3) | M |

### Sweep: Button migration
| Item | Effort |
|------|--------|
| 61 raw buttons → shadcn Button (#2) | L |

### Polish
| Item | Effort |
|------|--------|
| Toast unicode icons → Lucide (#8) | S |
| ExportBundleButton emoji trigger (#9) | S |
| ARIA labels sweep (#12) | M |
| Remaining polish (#10, #11, #13) | S |
