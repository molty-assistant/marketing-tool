# Redesign Summary — Marketing Tool

**Date:** 18 Feb 2026 | **Full proposal:** `redesign-proposal-2026-02-18.md`

---

## The Problem

- **20 flat tabs** in plan navigation — overwhelming, no hierarchy
- **Two entry paths** (wizard + analyze) that do the same thing
- **No guided experience** — user lands on plan with no direction
- **No plan overview/dashboard** — just a brief page

## Key Decisions

### 1. Navigation: 20 tabs → 6 grouped hubs
- **Overview** → Strategy → Content → Distribution → SEO → Export
- Collapsible left sidebar (desktop), icon row (mobile)
- Sub-pages nested under each hub
- Delete `PlanNav.tsx`, create `PlanSidebar.tsx`

### 2. Kill the Wizard
- Single entry: paste URL on landing → generation overlay → plan
- Smart defaults (detect mobile/web, default tone)
- Config options available *after* generation on plan settings
- Delete `/wizard` route entirely

### 3. Plan Overview as Landing
- `/plan/[id]` becomes a dashboard, not the brief
- Shows: plan health, stats, hub cards, suggested next steps
- Brief moves to `/plan/[id]/strategy/brief`

### 4. Progressive Disclosure
- Only generate brief + foundation upfront
- Content, distribution, SEO generated on-demand from hub pages
- Status badges: Generated (emerald) / Pending (amber) / Empty (slate)

### 5. Add shadcn/ui
- `npx shadcn@latest init` + add button, badge, collapsible, sheet
- Provides accessible, Tailwind-native components
- No heavy framework (no Chakra/Material)

### 6. Visual Direction
- Keep dark theme + indigo primary
- Warmer backgrounds (`#0a0a0f` base instead of pure slate)
- Standardize card/button/badge components
- Add animated hero text on landing (rotating value props)

## Route Changes

```
DELETED:  /wizard
MOVED:    /plan/[id] (brief) → /plan/[id]/strategy/brief
NEW:      /plan/[id] (overview dashboard)
NEW:      /plan/[id]/strategy (hub)
NEW:      /plan/[id]/content (hub)
NEW:      /plan/[id]/distribution (hub)
NEW:      /plan/[id]/seo (hub)
NEW:      /plan/[id]/export (hub)
REMOVED:  /plan/[id]/reviews, /approvals, /digest (premature)
```

## Implementation Phases

| # | What | Effort | Impact |
|---|------|--------|--------|
| 1 | Nav & sidebar layout | 1-2 days | 🔴 Critical |
| 2 | Kill wizard, unify onboarding | 1 day | 🟠 High |
| 3 | Plan overview dashboard | 1 day | 🟠 High |
| 4 | Visual polish & tokens | 1-2 days | 🟡 Medium |
| 5 | Progressive generation | 2-3 days | 🟡 Medium |

**Ship phases 1-3 first (3-4 days total).**

## New Components to Build

- `PlanSidebar.tsx` — collapsible sidebar with 6 groups
- `GenerationOverlay.tsx` — full-screen progress during plan creation
- `HubCard.tsx` — overview card linking to each hub
- `SectionCard.tsx` — sub-section card within hubs
- `StatusBadge.tsx` — generated/pending/empty states
- `AnimatedText.tsx` — rotating hero text
