# Phase 9 Proposal — “Generate Full Pack” (One-click Marketing Agency)

**Date:** 2026-02-19

## Problem
We’ve shipped a *lot* of capability (strategy/brief, copy, variants, foundation, emails, translations, social images, video, ZIP/PDF export, scheduling, Buffer). But it’s still a **toolbox**, not an **agency experience**.

A new user should be able to:
1) Provide URL → 2) Choose goal → 3) Click **Generate Full Pack** → 4) Receive a polished deliverable + publishing queue

## Goal
Create a single orchestrated flow that produces a complete marketing pack end-to-end, with progress tracking, retries, and a client-ready output.

## Success Criteria
- A single CTA (**Generate Full Pack**) creates:
  - Foundation (positioning, brand voice, competitive analysis)
  - Brief
  - Draft copy (in chosen tone)
  - Email sequence
  - Distribution atoms
  - Social images (Hero/Hybrid mode)
  - Optional: video (if enabled)
  - Export bundle (ZIP) + a “client summary” PDF
- Progress UI shows steps + estimated time, and supports per-step retry.
- “Share to client” produces a clean shared link + downloadable deliverables.

## Scope (MVP)
### 1) Orchestrator API
- `POST /api/orchestrate-pack` with `{ planId, goal, tone, channels, includeVideo }`
- Runs steps sequentially (or limited parallelism) and persists a status record:
  - `orchestration_runs` table: step statuses, timestamps, errors

### 2) Orchestrator UI
- New tab: `/plan/[id]/pack` (or “Overview” gets a prominent section)
- Stepper UI:
  - Pending / Running / Done / Failed
  - “Retry failed step”
  - “Regenerate this section”

### 3) Deliverable polish
- “Client Summary” PDF: 
  - positioning, key messages, top channels, sample posts, CTA
- ZIP remains the canonical export; PDF is a high-signal front page.

## Out of Scope (Phase 9.1+)
- True background jobs/queue workers
- Billing/checkout
- Multi-tenant client accounts
- Automated posting beyond Buffer

## Key Risks
- Runtime/timeouts if we run everything synchronously.
- Need careful retry semantics to avoid overwriting user edits.

## Next Actions
1. Agree URL + UX placement for **Generate Full Pack**.
2. Decide step list + ordering.
3. Implement orchestration run record + stepper UI.
