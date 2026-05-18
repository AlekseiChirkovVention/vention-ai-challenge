---
description: Atomic Execution Step 2 — Update statuses in atomic and parent state files, compress
---

Invocation: `/pae-finalize <path-to-atomic-description>`
Called by: `/phase-atomic-execution` as Step 2.

Atomic task directory = parent directory of the provided `description.md`.
Parent task directory = one level above.

---

## Guard

1. Read parent `state.md`. Locate the `## Subtask Progress` block for this T-XX.
2. If block has `atomic-execution: complete` → **stop**: "Atomic execution already complete for this T-XX. Re-running will overwrite the parent `## Subtask Progress` block. Confirm to proceed? (yes/no)" Wait for explicit confirmation.
3. Otherwise → continue.

---

## Pre-check

Read parent `state.md → ## Subtask Progress` block for this T-XX.
Verify the block reports `atomic-execution: complete` with all Acceptance Criteria met (as set by `/pae-implement` during Final Verification).
If Final Verification has not completed successfully → **stop**: "Not all acceptance criteria met. Cannot finalize."

---

## Instructions

After atomic-execution completes for T-XX:

1. Update parent `state.md → ## Subtask Progress` block for this T-XX:
   - Set `atomic-execution: complete`.
   - Fill `last_action:` with a one-line summary of what was implemented.
   - Set `blocker: none` (or describe if execution finished in a blocked state).
   - Preserve `notes:` if already set by `/pae-implement`.

2. Update parent `plan.md`: set the `Status` column for this T-XX row to `done`.

3. Do NOT write to `T-XX/state.md` or `T-XX/plan.md` — those files do not exist in the new structure.

4. Run `/compress-state --auto` on the parent task's `state.md`.

5. Report: "Atomic execution complete for T-XX. Parent `## Subtask Progress` and `plan.md` updated. Next: `/phase-atomic-validation <path>`."
