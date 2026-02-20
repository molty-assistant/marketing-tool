# Phase 9.1 — Orchestrator Auth + Safety Hardening

**Date:** 2026-02-20

## Why
The orchestrator endpoints trigger multiple AI calls + asset generation and can be abused if callable without proper auth. Middleware already enforces Basic Auth and supports API_KEY bypass, but we should make the orchestrator routes explicitly defensive.

## Current endpoints
- `POST /api/orchestrate-pack`
- `GET /api/orchestrate-pack/[runId]`
- `POST /api/orchestrate-pack/[runId]/retry`

## Goals
1. Ensure endpoints require either:
   - Basic Auth session (normal browser usage), OR
   - `x-api-key` (automation)
2. Avoid leaking run details across plans / users.
3. Prevent accidental or malicious expensive re-runs.

## Proposed implementation
### A) Central guard helper
Create `src/lib/auth-guard.ts` (or similar) with:
- `requireAuth(request: NextRequest): { ok: true } | NextResponse`

The guard should:
- If `process.env.API_KEY` is set and header/query matches → OK
- Otherwise rely on existing Basic Auth middleware, **but still validate** that `Authorization` header exists and matches configured credentials if present in env, *or* return 401.

Note: If Basic Auth is only implemented in middleware and not in route handlers, prefer reusing the same credential-check logic (extract from middleware into a shared function).

### B) Plan/run scoping
- For `GET /api/orchestrate-pack/[runId]`:
  - Load run → get `plan_id`.
  - Optionally require caller to provide `planId` and verify it matches to avoid run-id guessing.
  - Consider returning 404 on mismatch.

### C) Rate limiting / replay protection (lightweight)
- Add a simple in-process limiter for orchestrator routes:
  - max N concurrent orchestrations
  - max M requests/min per IP (if available)
- Alternatively store `started_at` and deny retries more frequent than X seconds.

### D) Error hygiene
- Ensure `last_error` is always a short, user-safe message.
- Never store raw upstream response bodies.

## Acceptance criteria
- Calling orchestrator routes without Basic Auth / API key returns 401.
- Retry cannot be spammed; concurrent retries are rejected with 409.
- GET status endpoint does not leak content to unauthenticated callers.
