---
description: Validation Step 6 — Finalize validation, update state files, compress context
---

Invocation: `/pv-finalize <path-to-description>`
Called by: `/phase-validation` as Step 6.

Task directory = parent directory of the provided `description.md`.

---

## Guard

1. Read `state.md` in the task directory.
2. Check `## Phases → validation`. If `complete` → **stop**: "Validation phase is already complete. Re-running will overwrite existing artifacts. Confirm to proceed? (yes/no)" Wait for explicit confirmation.
3. Check `## Fix-Tasks` section present in `state.md`. If missing → **stop**: "Step 4 (/pv-create-fixes) must be completed first. Run /pv-create-fixes <path>."
4. If `## Fix-Tasks → fixes-created: complete (0 tasks)` → skip fix-task status check, continue. Otherwise read `## Fix-Tasks → Created` list and verify each listed T-XX has status `reviewed` in `plan.md`. If any is not `reviewed` → **stop**: "Step 5 (/pv-execute-fixes) must be completed first. Run /pv-execute-fixes <path>."
5. Otherwise → continue.

---

## Instructions

1. Update the following files explicitly:

   **Task-level `state.md` (in the task directory):**
   - Set `validation: complete` in `## Phases`.
   - If there are deferred tasks (from `## Fix-Tasks` or original subtasks) — record them in a `## Deferred` section, one line per task: `- T-XX: <reason>`.

   **`plan.md` (in the task directory):**
   - Ensure each fix-task and original subtask `Status` column reflects its final status (`reviewed` / `deferred` / `blocked`).

   **`temp_docs/project_state.md`:**
   - Update the status of this task: mark `validation: complete`. Mark the whole task as `reviewed` if no deferred items remain, otherwise record the deferred list.

   **`PROJECT_STATE.md`** (in repository root — always update if the file exists):
   - Update to reflect the current state of the codebase as it exists after this task: new modules, changed architecture, new endpoints, modified data flows, updated dependencies, resolved issues, etc.
   - Do NOT frame updates as "task completed" — write them as factual descriptions of how the system works now.
   - Do NOT remove unrelated sections. Only update what actually changed.

   **`CLAUDE.md`** (in repository root — always update if the file exists):
   - Identify any sections that describe architecture, decisions, or known issues that were changed or resolved by this task.
   - Update those sections to reflect the new state (new endpoints, changed behavior, resolved issues, etc.).
   - Do NOT rewrite unrelated sections. Only update what this task directly changed.

   **`ROADMAP.md`** (in repository root — update only if the file exists):
   - Find the item(s) corresponding to this task.
   - Mark them as complete (e.g., check off a checkbox, add ✓, or move to a "Completed" section — match the document's existing convention).

2. Run `/compress-state --auto` on task-level `state.md`.

3. Report to user:
   - Validation complete.
   - Summary: N fix-tasks completed, M deferred.
   - If deferred tasks exist — list them with status `deferred`.
