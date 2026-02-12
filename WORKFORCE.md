# Workforce workflow (Codex + Claude + Local)

This repo is worked on by a small AI workforce orchestrated by Molty.

## Conventions
- Work orders live in `workorders/WO-XXXX.md`
- Outputs live in `artifacts/WO-XXXX/`

## Roles
- **Codex CLI (Builder)**: implements changes.
- **Claude Code (Principal Reviewer)**: reviews diffs and calls out risks/tests.
- **LM Studio (Ops/QA)**: proofreading/extraction only.

## Golden rules
1) No hidden state: all handoffs are files.
2) One work order per worker at a time.
3) Codex implements, Claude reviews, Codex fixes, Molty accepts.

## Running the pipeline (manual)
From workspace root:

```bash
WO=projects/marketing-tool/workorders/WO-0001.md
REPO=projects/marketing-tool
ART=projects/marketing-tool/artifacts/WO-0001

bash tools/workforce/run-codex.sh "$WO" "$REPO" "$ART" gpt-5.2
bash tools/workforce/run-claude-review.sh "$REPO" "$ART"
```

## No paid APIs policy
We use subscription auth only:
- Codex CLI via ChatGPT Plus login
- Claude Code via Claude Code Max login

We do **not** use metered API keys.
