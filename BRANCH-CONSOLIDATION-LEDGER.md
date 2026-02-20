# Branch Consolidation Ledger

Date: 2026-02-20
Target: converge to single clean `main`
Working branch: `codex/integration-main-cleanup`

## Step Log

1. Baseline
- [x] Created integration branch from current working state.
- [x] Captured full worktree as baseline integration checkpoint.

2. Inventory
- [x] Enumerate local/remote branches with commits not in `main`.
- [x] Classify candidates: include / already included / obsolete.

3. Integration
- [x] Integrate required unique commits in batches.
- [x] Resolve conflicts and record decisions.

4. Validation
- [x] Lint/build pass after integration.
- [ ] Smoke-check critical routes.

5. Finalize
- [ ] Merge integration branch into `main`.
- [ ] Delete/archive stale branches.

## Included Branches

- `main`
- `feat/bl-024-dark-mode-clean`
- `feat/bl-026-rate-limit-clean`
- `feat/client-summary-pdf-65`
- `feat/pack-ui-64`
- `origin/feat/competitive-intel-rebuild`
- `origin/feat/review-monitoring`
- `origin/feat/play-store-import`
- `origin/feat/weekly-digest`
- `origin/feature/app-store-preview`
- `origin/feature/export-bundle`
- `origin/feature/keyword-research`
- `origin/feature/review-monitoring`
- `origin/feature/variant-scoring`
- `origin/feature/video-pipeline`
- `origin/feature/weekly-digest`
- `origin/feature/task52-video-pipeline`
- `origin/fix/ghost-features`
- `origin/fix/social-image-quality-2026-02-18`
- `origin/redesign/staging`

## Skipped Branches (with reason)

- `origin/feat/competitive-intel-v2` (already contained by `origin/feat/competitive-intel-rebuild`)
- Local/remote duplicate tracking refs with identical tips (already represented by the merged source branch)

## Conflict Notes

- Many historical branches attempted to reintroduce deleted legacy navigation (`src/components/PlanNav.tsx`); conflict resolution kept deletion.
- In conflicting files, integration branch version was kept to preserve audited UX baseline and build stability.
- A stabilization commit restored the code tree to the known-good integration snapshot after ancestry merges, while preserving merged branch history.
