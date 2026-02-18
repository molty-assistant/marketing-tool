# Redesign Review — 18 Feb 2026

**Reviewer:** Opus (design & functional audit)  
**Branch:** redesign/staging  
**Live:** https://marketing-tool-production.up.railway.app  

---

## A. What's Working Well

1. **PlanSidebar.tsx is excellent.** Clean implementation with collapsible groups, active state detection, mobile icon bar, "Hot" badge on Distribution. Matches the proposal closely. The use of shadcn Collapsible is exactly right.

2. **GenerationOverlay.tsx is polished.** Full-screen progress with step-by-step animation, app icon/name detection, localStorage recent-analyses persistence, and a nice interval-based step advancement to keep the UI feeling alive during generation. Error handling is solid.

3. **Plan overview dashboard (`/plan/[id]/page.tsx`) is strong.** Hub cards with status badges, stats grid, suggested next steps with numbered items — all per spec. Distribution card is correctly highlighted with `highlight` prop and "Create Posts & Videos" CTA. Good use of parallel API calls (plan + overview).

4. **Distribution hub page is the standout.** Gradient CTA card for "Create Social Post" with channel status pills, platform icons, and clear hierarchy. This is visually distinct and easy to find — Tom's priority feature is well-served.

5. **Wizard redirect works.** `/wizard` → 307 redirect to `/` — clean, no dead routes.

6. **Dashboard (`/dashboard`) is clean.** Plan cards with icons, URLs, dates, and "Open →" CTAs. Empty state with CTA back to landing. Responsive grid.

7. **Landing page successfully integrates GenerationOverlay.** No redirect to `/analyze` — paste URL, overlay appears in-place. Single entry path as proposed.

8. **Layout.tsx is minimal and correct.** Server component that reads plan name from DB and passes to sidebar. Flex layout with sidebar + main content.

---

## B. Issues Found

### 🔴 BLOCKER

**1. Sidebar "Brief" link is broken (404)**

- **File:** `src/components/PlanSidebar.tsx`, line 52
- **Problem:** Child href is `'/brief'` which resolves to `/plan/[id]/brief`. But the brief page was moved to `/plan/[id]/strategy/brief/page.tsx`. There is NO page at `/plan/[id]/brief/`.
- **Impact:** Clicking "Brief" in the sidebar → 404. This is the #1 suggested next step and the primary content page.
- **Also broken in:** `src/app/plan/[id]/strategy/page.tsx`, line ~17 — Strategy hub links to `/plan/${id}/brief` (also 404).
- **Fix:** Change sidebar child href to `'/strategy/brief'`. Change Strategy hub href to `/plan/${id}/strategy/brief`.

### 🟠 HIGH

**2. Sidebar child routes don't match proposed IA — inconsistent URL structure**

- **File:** `src/components/PlanSidebar.tsx`, lines 52-90
- **Problem:** The proposal specified nested routes like `/plan/[id]/distribution/social`, `/plan/[id]/content/draft`, etc. Instead, sidebar children link to flat routes: `/plan/[id]/social`, `/plan/[id]/draft`, etc. These flat routes DO exist (old pages weren't moved), so they work. But the URLs don't match the navigation hierarchy.
- **Impact:** Not a crash, but confusing. Navigating to Distribution → Social Posts takes you to `/plan/[id]/social`, not `/plan/[id]/distribution/social`. The sidebar's active state detection still works (it matches `basePath + child.href`) but it's architecturally messy.
- **Recommendation:** Either move pages to nested routes (proper fix, Phase 4) or document this as intentional. Not a merge blocker since everything works.

**3. Strategy hub page links also 404 for Brief**

- **File:** `src/app/plan/[id]/strategy/page.tsx`, line ~17
- **Problem:** `href: /plan/${id}/brief` → 404 (same as blocker #1)
- **Fix:** Change to `/plan/${id}/strategy/brief`

### 🟡 MEDIUM

**4. Old routes still exist — no cleanup**

- Files like `src/app/plan/[id]/overview/page.tsx`, `src/app/plan/[id]/distribute/page.tsx`, `src/app/plan/[id]/reviews/page.tsx`, `src/app/plan/[id]/approvals/page.tsx`, `src/app/plan/[id]/digest/page.tsx` still exist.
- The proposal said to remove `/plan/[id]/overview` (merged into `/plan/[id]`), `/plan/[id]/reviews`, `/plan/[id]/approvals`, `/plan/[id]/digest`.
- Not breaking anything, but adds dead weight and potential confusion.

**5. Dashboard has no layout wrapper**

- **File:** `src/app/dashboard/page.tsx`
- **Problem:** The dashboard page renders without any layout padding/background. It's wrapped in the root layout but doesn't have the consistent `bg-slate-900` that plan pages get from the plan layout. Should have `p-6 sm:p-8` wrapper.
- **Impact:** May look visually inconsistent depending on root layout styles.

**6. Plan overview Strategy hub card links to `/strategy/brief` not `/strategy`**

- **File:** `src/app/plan/[id]/page.tsx`, line 284
- **Problem:** Strategy HubCard links to `/plan/${id}/strategy/brief` instead of `/plan/${id}/strategy` (the hub page). All other hub cards link to their hub. Strategy skips directly to brief.
- **Impact:** Minor — brief is the main content, so this is arguably fine. But it's inconsistent with the other hub cards.

### 🟢 LOW

**7. No animated hero text on landing**

- The proposal specified `AnimatedText` component with rotating words. Landing page has a static headline. Nice-to-have for visual polish (Phase 4).

**8. Mobile sidebar has no dropdown for sub-pages**

- Mobile icon bar shows the 6 hubs but no way to access sub-pages without tapping a hub first. This is fine UX — just noting the proposal mentioned a bottom sheet option.

**9. Distribution hub "Create Social Post" card doesn't show real data**

- **File:** `src/app/plan/[id]/distribution/page.tsx`
- StatusPills are hardcoded: Instagram "Ready", LinkedIn "Empty", TikTok "Empty". These should ideally reflect actual plan state.

---

## C. Social/Distribution Hub Assessment

### Is the Distribution hub easy to find and navigate to?

**Yes — excellent.** Three ways to reach it:
1. Sidebar: "Distribution" with "Hot" badge (indigo, visually distinct)
2. Plan overview: Highlighted hub card with gradient border + "Create Posts & Videos" CTA
3. Suggested next steps: #2 is "Generate social posts, images, and video prompts"

### Does the social posts creation flow still work?

**Yes.** The distribution hub links to `/plan/[id]/social` which is the existing social posts page (unchanged). The flow is preserved.

### Is image generation accessible?

**Yes.** The Distribution hub CTA card mentions "images" and links to the social page where image generation lives. The hub description says "Create social posts, images, and video content for each channel."

### Is the Veo 2 video generation accessible?

**Partially.** The hub mentions "video" in the description and CTA, but doesn't explicitly call out Veo 2 by name. The social posts page handles this. Video is referenced as "video variations" and "video prompts" in the CTA card.

### Is the "Hot" badge visible?

**Yes.** Desktop sidebar shows an indigo "Hot" badge next to Distribution. Mobile shows a small indigo dot indicator. Plan overview highlights the Distribution card with a gradient background.

### Overall assessment:

**Distribution hub is the best part of this redesign.** It's visually prominent, easy to find from multiple entry points, and the gradient CTA card is compelling. Tom's priority is well-served.

---

## D. Go/No-Go Recommendation

### **CONDITIONAL GO** — Merge after fixing one blocker

**Must fix before merge:**
1. **Brief link 404** — Two-line fix:
   - `src/components/PlanSidebar.tsx` line 52: change `href: '/brief'` → `href: '/strategy/brief'`  
   - `src/app/plan/[id]/strategy/page.tsx` line ~17: change `href: /plan/${id}/brief` → `href: /plan/${id}/strategy/brief`

**Should fix soon after merge:**
- Clean up old unused routes (overview, distribute, reviews, approvals, digest)
- Consider moving sub-pages to nested routes for URL consistency

**Everything else is solid.** The navigation overhaul from 20 tabs → 6 hubs is a massive UX improvement. The generation overlay is polished. The plan overview dashboard is well-structured. Distribution hub is the standout feature and is prominently positioned.

The redesign delivers on all three phases of the proposal. Fix the Brief link and ship it.
