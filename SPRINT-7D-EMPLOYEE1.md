# 7-Day Dev Sprint Plan (Employee 1)

## Day 1 - Phase 3.5 pre-deploy audit and gap fixes
- Audit main for #11, #12, #13, #14, #15.
- Implement missing fixes immediately.
- Run lint, tests, and production build checks.
- Open PR with audit checklist and proof.

## Day 2 - Auth hardening verification
- Validate middleware behavior for public vs protected routes.
- Add/adjust route-level auth checks for mutation-heavy endpoints where needed.
- Add regression notes for cron/API-key flows.

## Day 3 - AI route reliability pass
- Normalize Gemini response parsing and error handling patterns.
- Ensure model metadata is accurate across all text-generation routes.
- Reduce route-to-route prompt/config drift for maintainability.

## Day 4 - SSRF and internal fetch safety pass
- Re-audit API routes for header-derived URL construction.
- Enforce `internalBaseUrl()` for internal server calls.
- Add targeted safeguards where hostnames/URLs are user-controlled.

## Day 5 - Deployment and config consistency
- Validate single Railway build path and healthcheck behavior.
- Verify environment variable docs vs actual code usage.
- Add a pre-deploy checklist section to deployment docs.

## Day 6 - Data/runtime stability
- Review SQLite startup/schema assumptions and edge cases.
- Validate volume/path assumptions (`/app/data`, `IMAGE_DIR`) in production-like runs.
- Tighten error reporting for persistence failures.

## Day 7 - Release readiness
- Final lint/build/test pass and security checks.
- Close remaining sprint items and publish summary.
- Prepare merge notes and rollback considerations.

## Execution Started
- Day 1 execution started: Phase 3.5 audit completed, missing items being fixed in branch `employee1/phase-3-5-audit-fixes`.
