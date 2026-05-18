---
description: Execution Step 2 — Summary report, update state files, compress context
---

Invocation: `/pe-finalize <path-to-description>`
Called by: `/phase-execution` as Step 2.

Task directory = parent directory of the provided `description.md`.

---

## Guard

1. Read `state.md` in the task directory.
2. Check `## Phases → execution`. If `complete` → **stop**: "Execution phase is already complete. Re-running will overwrite existing artifacts. Confirm to proceed? (yes/no)" Wait for explicit confirmation.
3. Otherwise → continue.

---

## Instructions

1. Read the `## Execution Report` section from the task-level `state.md` (populated by `/pe-execute`). If the section is missing → **stop**: "Execution report not found. `/pe-execute` was not completed." Do not continue.

2. Compile summary report from `## Execution Report`:
   - List of completed subtasks (status `done` or `reviewed`).
   - List of skipped subtasks (`blocked` / `deferred`) with reasons.
   - Any subtasks from `plan.md` that are missing from the report (not reached).

3. Update the following files explicitly:

   **Task-level `state.md` (in the task directory):**
   - Set `execution: complete` in `## Phases`.
   - Finalize `## Execution Report`: ensure one line per subtask from `plan.md`; add missing ones as `not-reached` with reason.

   **`plan.md` (in the task directory):**
   - Ensure each subtask `Status` column reflects the value from `## Execution Report` (`done` / `reviewed` / `blocked` / `deferred` / `not-reached`).

   **`temp_docs/project_state.md`:**
   - Update the status of this task to match its current phase (`execution: complete`, validation pending).

4. Run `/compress-state --auto` on task-level `state.md`.

5. Report to user (display as text — do NOT invoke):
   - Summary table of all subtask outcomes (from `## Execution Report`).
   - "Execution complete. Run `/phase-validation <path-to-description>` to start validation."

**STOP. Do not run `/phase-validation` automatically.**
