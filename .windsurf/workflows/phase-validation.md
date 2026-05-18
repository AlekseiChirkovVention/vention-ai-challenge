---
description: Phase 3 — Validation orchestrator: verify contract, review code, create and execute fix-tasks
---

Invocation: `/phase-validation <path-to-description>`
Example: `/phase-validation temp_docs/task_foo/description.md`

If path is not provided — ask the user and do not continue.
Task directory = parent directory of the provided `description.md`.

To run a single step directly, call the child workflow:
`/pv-contract`, `/pv-review`, `/pv-issues`, `/pv-create-fixes`, `/pv-execute-fixes`, `/pv-finalize`.

---

## Step 0 — State Check

Read `state.md` in the task directory. Check `## Phases`:

- If `state.md` is not found in the task directory → report: "state.md not found. Run `/phase-execution` first." **Stop.**
- If `execution` is not `complete` → report: "Execution not complete. Run `/phase-execution` first." **Stop.**
- If `validation: complete` → report: "Validation already complete." **Stop.**
- If `validation: in-progress` → determine last completed step:
  - `## Contract Check` present → Step 1 done.
  - `## Code Review` present → Steps 1–2 done.
  - `## Issue List` present → Steps 1–3 done.
  - Fix-task directories (T-XX-fix-*) with `description.md` exist → Steps 1–4 done.
  - All fix-tasks have status `reviewed` → Steps 1–5 done.
  - Output: `Validation partially complete. Continuing from Step N.`
- If `validation: not-started` → start from Step 1.

---

## Execution

Update `## Phases` in `state.md`: set `validation: in-progress`.

Run child workflows in order, skipping completed steps:

1. Call `/pv-contract <path-to-description>` — Contract verification
2. Call `/pv-review <path-to-description>` — Code review
3. Call `/pv-issues <path-to-description>` — Issue list for user (waits for decision)
4. Call `/pv-create-fixes <path-to-description>` — Create fix-task directories.
   After it returns, re-read `state.md` and inspect `## Fix-Tasks → fixes-created`. If the marker reads `complete (0 tasks)` — skip Step 5 and jump to Step 6.
5. Call `/pv-execute-fixes <path-to-description>` — Execute fix-tasks via atomic cycles (skipped when 0 fix-tasks were created).
6. Call `/pv-finalize <path-to-description>` — Finalization + compress

After all steps, report final status including any deferred tasks.
