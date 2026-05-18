---
description: Atomic Validation orchestrator — Validate a single T-XX subtask: check, propose improvements, close
---

Invocation: `/phase-atomic-validation <path-to-atomic-description>`
Example: `/phase-atomic-validation temp_docs/task_foo/T-01-slug/description.md`

If path is not provided — ask the user and do not continue.
Atomic task directory = parent directory of the provided `description.md`.
Parent task directory = one level above.

To run a single step directly, call the child workflow:
`/pav-check`, `/pav-propose`, `/pav-close`.

---

## Step 0 — State Check

Read parent `state.md`. Locate the `## Subtask Progress` block for this T-XX.

**Input for validation:**
- `T-XX/description.md → ## Acceptance Criteria` — source of truth for what "done" means.
- Parent `state.md → ## Subtask Progress → T-XX` block — context on what was done (`last_action`, `notes`).
- Parent `state.md → ## Solution Design` — `### Invariants`, `### Off-limits`.

Checks:
- If `T-XX/description.md` is missing or has no `## Acceptance Criteria` → **stop**: "description.md is incomplete. Run `/pd-decompose` + `/pd-finalize`."
- If the `## Subtask Progress` block for this T-XX is missing → **stop**: "No execution record for T-XX. Run `/phase-atomic-execution` first."
- If `atomic-execution` is not `complete` → **stop**: "Atomic execution not complete. Run `/phase-atomic-execution` first."
- If `atomic-validation: complete` → **stop**: "Atomic validation already complete."
- If `atomic-validation: in-progress` → continue from last completed step (see Execution below).
- If `atomic-validation: not-started` (or field absent) → start from Step 1.

---

## Execution

Update parent `state.md → ## Subtask Progress` block for this T-XX: set `atomic-validation: in-progress`.

Run child workflows in order, skipping completed steps:
1. Call `/pav-check <path-to-atomic-description>` — Final check against `## Acceptance Criteria` + verdict (DONE / NEEDS WORK).
2. Call `/pav-propose <path-to-atomic-description>` — Improvement proposals (only if DONE).
3. Call `/pav-close <path-to-atomic-description>` — Close task (only if DONE).

After validation:
- Parent `state.md → ## Subtask Progress → T-XX`: set `atomic-validation: complete | failed`.
- If `failed` → add to `notes:` the specific Acceptance Criteria that were not met.
- Do NOT create fix-tasks automatically. Surface findings to the user first.

After completion, report final verdict and updated status.
