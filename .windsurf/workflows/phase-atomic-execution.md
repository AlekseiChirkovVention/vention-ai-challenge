---
description: Atomic Execution orchestrator — Execute a single T-XX subtask step by step using its plan.md
---

Invocation: `/phase-atomic-execution <path-to-atomic-description>`
Example: `/phase-atomic-execution temp_docs/task_foo/T-01-slug/description.md`

If path is not provided — ask the user and do not continue.
Atomic task directory = parent directory of the provided `description.md`.
Parent task directory = one level above.

To run a single step directly, call the child workflow:
`/pae-implement`, `/pae-finalize`.

---

## Step 0 — State Check

Read parent `state.md` (one level above the atomic task directory) and `T-XX/description.md`.

- If `T-XX/description.md` does not exist → **stop**: "description.md not found. Run `/pd-decompose` + `/pd-finalize` in the parent task."
- Verify `T-XX/description.md` contains both `## Steps` and `## Acceptance Criteria`. If either is missing → **stop**: "description.md is incomplete (missing ## Steps or ## Acceptance Criteria). Run `/pd-decompose` + `/pd-finalize` to regenerate."
- Look up this T-XX block in parent `state.md → ## Subtask Progress`:
  - If block is missing → treat as `atomic-execution: not-started` (will be created).
  - If `atomic-execution: complete` → report: "Atomic execution already complete." **Stop.**
  - If `atomic-execution: blocked` → report blocker from the block's `blocker:` line and ask: "Is it resolved? (yes/no)". **Wait.**
  - If `atomic-execution: in-progress` → continue from `last_action` (may require re-running last step for idempotency).
  - If `atomic-execution: not-started` → start from step 1 of `## Steps`.

T-XX directories no longer contain their own `state.md` or `plan.md`. All progress lives in the parent's `## Subtask Progress`.

---

## Execution

Update parent `state.md → ## Subtask Progress` block for this T-XX: set `atomic-execution: in-progress`.

Run child workflows in order:
1. Call `/pae-implement <path-to-atomic-description>` — Execute steps from `## Steps` + verify
2. Call `/pae-finalize <path-to-atomic-description>` — Update parent state/plan

After completion, report:
- Steps completed.
- Verification result.
- Next: `/phase-atomic-validation <path>`.