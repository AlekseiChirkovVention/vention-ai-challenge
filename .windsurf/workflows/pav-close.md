---
description: Atomic Validation Step 3 — Close the task, update parent plan status to reviewed
---

Invocation: `/pav-close <path-to-atomic-description>`
Called by: `/phase-atomic-validation` as Step 3. Only runs if verdict is DONE.

Atomic task directory = parent directory of the provided `description.md`.
Parent task directory = one level above.

---

## Guard

1. Read parent `state.md`. Locate the `## Subtask Progress` block for this T-XX.
2. If block has `atomic-validation: complete` → **stop**: "Atomic validation already complete. Confirm to proceed? (yes/no)" Wait for explicit confirmation.
3. Otherwise → continue.

---

## Pre-check

Read parent `state.md → ## Subtask Progress` block for this T-XX.
If `atomic-validation: failed` → **stop**: "Cannot close: verdict is NEEDS WORK."

---

## Instructions

1. Update parent `state.md → ## Subtask Progress` block for this T-XX:
   - Set `atomic-validation: complete`.
   - Update `last_action:` to a one-line summary (DoD status + key outcome).
   - Keep `blocker: none` and preserve `notes:`.

2. Update parent `plan.md`: set the `Status` column for this T-XX row to `reviewed`.

3. Do NOT write to `T-XX/state.md` — it does not exist in the new structure.

4. Run `/compress-state --auto` on the parent task's `state.md`.

5. Report: "Task T-XX closed. Status: reviewed. Parent `plan.md` and `## Subtask Progress` updated."
