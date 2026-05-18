---
description: Phase 2 — Execution orchestrator: execute all pending subtasks via atomic cycles
---

Invocation: `/phase-execution <path-to-description>`
Example: `/phase-execution temp_docs/task_foo/description.md`

If path is not provided — ask the user and do not continue.
Task directory = parent directory of the provided `description.md`.

To run a single step directly, call the child workflow:
`/pe-execute`, `/pe-finalize`.

---

## Step 0 — State Check

Read `state.md` and `plan.md` in the task directory. Read `## Subtask Progress` blocks (one per T-XX) from the parent `state.md`.

- If `state.md` is not found in the task directory → report: "state.md not found. Run `/phase-discovery` first." **Stop.**
- If `discovery` is not `complete` → report: "Discovery not complete. Run `/phase-discovery` first." **Stop.**
- If `execution: complete` → report: "Execution already complete." Suggest `/phase-validation <path>`. **Stop.**
- If `execution: in-progress` → find first incomplete subtask, continue from it.
- If `execution: not-started` → start from first subtask per `plan.md` order.

Output status summary:
- Completed (`done` / `reviewed`): list.
- Skipped (`blocked` / `deferred`): list with reasons.
- Pending: list — will be executed.

If no pending subtasks → suggest `/phase-validation`. **Stop.**

---

## Execution

Update `## Phases` in `state.md`: set `execution: in-progress`.

Run child workflows in order:
1. Call `/pe-execute <path-to-description>` — Execute all pending subtasks
2. Call `/pe-finalize <path-to-description>` — Summary report + finalization

After all steps complete, report to the user (display as text — do NOT invoke):
- Number of completed subtasks.
- Path to `plan.md` with updated statuses.
- "Execution complete. Run `/phase-validation <path-to-description>` to start validation."

**STOP. Do not run `/phase-validation` automatically.**
