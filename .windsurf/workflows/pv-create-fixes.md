---
description: Validation Step 4 — Create fix-task subtask directories from approved issues
---

Invocation: `/pv-create-fixes <path-to-description>`
Called by: `/phase-validation` as Step 4.

Task directory = parent directory of the provided `description.md`.

---

## Guard

1. Read `state.md` in the task directory.
2. Check `## Phases → validation`. If `complete` → **stop**: "Validation phase is already complete. Re-running will overwrite existing artifacts. Confirm to proceed? (yes/no)" Wait for explicit confirmation.
3. Check `## Issue List` with `### Approved` present in `state.md`. If missing → **stop**: "Step 3 (/pv-issues) must be completed first. Run /pv-issues <path>."
4. Check `## Fix-Tasks → fixes-created`. If `complete` → **stop**: "Fix-tasks already created. Re-running will recreate directories and overwrite their contents. Confirm to proceed? (yes/no)" Wait for explicit confirmation.
5. Otherwise → continue.

---

## Instructions

1. Read `state.md` → `## Issue List → Approved`.

   **Empty-Approved early exit.** If `### Approved` is empty (all issues deferred or no issues found):
   - Append to `state.md`:
     ```
     ## Fix-Tasks
     fixes-created: complete (0 tasks)
     Created: none
     ```
   - Report to user: "No approved issues. All findings deferred. Skipping `/pv-execute-fixes`. Proceeding to `/pv-finalize`."
   - Do not execute any of the steps below. The `fixes-created: complete (0 tasks)` marker in `state.md` is the contract the orchestrator uses to skip Step 5.

2. Read `plan.md` → determine next available T-XX number (continue numbering after existing subtasks).
3. For each approved issue, create a new subtask directory `T-XX-fix-<slug>/` containing:
   - `description.md` — with the problem description and solution from the issue list.
     Include: Goal, Invariants (from parent), Scope In/Out, Acceptance Criteria, Done Definition.
   - `state.md` — initialized with `## Phases` (all atomic phases `not-started`).
   - `plan.md` — empty placeholder.
4. Update top-level `plan.md` → add new fix-task rows to `## Subtasks` table with status `not-started`.
5. Update `state.md`:
   a. Add `## Fix-Tasks` section (create if absent):
   ```
   ## Fix-Tasks
   fixes-created: complete
   Created: T-XX-fix-<slug>, T-YY-fix-<slug>, ...
   ```
   b. In `## Issue List → Deferred`, mark deferred issues with status `deferred`.
6. Report: "Step 4 (Create Fix-Tasks) complete. Created N fix-tasks: T-XX, T-YY, ..."
