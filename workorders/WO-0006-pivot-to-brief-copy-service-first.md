# WO-0006 — Pivot UI to “Brief + Copy” (service-first)

**Created:** 2026-02-25
**Owner:** Molty
**Context:** Revenue mandate (first £ fast). We’re selling a **£99 service** (Launch Brief + Copy Pack) using a Stripe Payment Link, while we harden the product for SaaS later.

## Goal
Make the **live app experience** match the “Brief + Copy” positioning by **removing social-first pathways** (without deleting routes yet).

## Why
Right now the app is still effectively a social suite:
- Landing flow redirects new plans to `/plan/[id]/social`
- Distribution hub promotes Social Posts → Schedule → Calendar
- Quick Win includes Buffer/video/image/social generation

This mismatch will confuse prospects if we send them to the site.

## Decision
- **Do not delete features yet**. Hide/delist social pages from the default nav and flows.
- Keep all routes accessible directly for internal use.
- We can sell the service today without sending leads to the app.

## Stripe
**Live payment link (£99 intro):** https://buy.stripe.com/6oU28t1uwbKY0lx8vt0Ny00

## Minimum change set (Phase 1 — fast fix)
### Landing flow
- Update landing generation redirect: `/plan/[id]/social` → `/plan/[id]` (Brief) or `/plan/[id]/draft` (Copywriting)

### Header CTA
- Add prominent CTA: **Buy £99 Launch Pack** (links to Stripe payment link)

### Remove Wizard as primary entry
- Wizard currently emphasises platform selection; either hide it from top nav or repurpose Step 2.

### Plan nav
- Remove/delist tabs that are social-first:
  - Distribution / Social / Schedule / Calendar / Digest / Distribute (exact names depend on current nav component)

## Clean pivot (Phase 2 — tidy UX map)
Primary tabs:
- Brief (`/plan/[id]`)
- Copywriting (rename Draft)
- Emails
- Translate
- Competitors
- Export

Secondary (More):
- Foundation
- SERP
- Reviews

Hidden (still routable):
- Social Posts (`/plan/[id]/social`)
- Schedule
- Calendar
- Digest
- Assets (keep OG/screenshot tools if useful)

## Acceptance criteria
- A new user can paste a URL and never see social-first pages by default.
- No links on the landing page or primary nav mention Buffer, scheduling, video, or social posting.
- Existing plan IDs remain valid; no DB changes.
- Hidden pages remain reachable via direct URL.

## Implementation notes (delegate)
- Keep changes UI-only where possible.
- Avoid breaking exports/generate-all; if those endpoints include social content, make it conditional.

## Risks
- Confusion if docs still claim “ready-to-post social content” (update README/landing copy accordingly).
- Local repo currently has merge conflicts; recommend clean working tree before coding.

## Rollback
Single PR revert.
