---
description: Phase 1 — Discovery orchestrator: analyze task, decompose, design architecture, finalize plan
---

Invocation: `/phase-discovery <path-to-description>`
Example: `/phase-discovery temp_docs/task_foo/description.md`

If path is not provided — ask the user and do not continue.
Task directory = parent directory of the provided `description.md`.

To run a single step directly, call the child workflow:
`/pd-analyze`, `/pd-decompose`, `/pd-design`, `/pd-finalize`.

---

## Step 0 — State Check

Read `state.md` in the task directory (if it exists). Check `## Phases` section:

- `discovery: complete` → report: "Discovery already complete." Suggest `/phase-execution <path>`. **Stop.**
- `discovery: in-progress` → determine last completed step from explicit markers in `state.md`:
  - `## Task Analysis` present → Step 1 done.
  - Above + `## Decomposition` with `decomposition: complete` → Steps 1–2 done.
  - Above + `## Solution Design` with `### Decision` → Steps 1–3 done.
  - Output: `Discovery partially complete. Completed: Steps [list]. Continuing from Step N.`
- `discovery: not-started` or `state.md` absent → start from Step 1.

---

## Execution

Run child workflows in order, skipping already completed steps:

1. Call `/pd-analyze <path-to-description>` — Task analysis + codebase examination
2. Call `/pd-decompose <path-to-description>` — Decomposition into T-XX subtasks
3. Call `/pd-design <path-to-description>` — Architectural design (2–3 variants → user decides)
4. Call `/pd-finalize <path-to-description>` — Finalization + compress

If any child workflow encounters a blocker — stop and report to user before continuing.

After all steps complete, report to the user (display as text — do NOT invoke):
- Path to `state.md` — full analysis and chosen solution.
- Path to `plan.md` — subtask list with dependencies.
- "Discovery complete. Run `/phase-execution <path-to-description>` to start execution."

**STOP. Do not run `/phase-execution` automatically.**
