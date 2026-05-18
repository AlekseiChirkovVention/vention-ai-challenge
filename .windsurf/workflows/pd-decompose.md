---
description: Discovery Step 2 — Decompose task into atomic T-XX subtasks, create directories and files
---

Invocation: `/pd-decompose <path-to-description>`
Called by: `/phase-discovery` as Step 2.

Task directory = parent directory of the provided `description.md`.

---

## Guard

1. Read `state.md` in the task directory. If it does not exist or `## Task Analysis` section is missing → **stop**: "Step 1 (Task Analysis) must be completed first. Run `/pd-analyze <path>`." Do not continue.
2. Check `## Phases → discovery`:
   - If `complete` → **stop**: "Discovery phase is already complete. Re-running will overwrite existing artifacts. Confirm to proceed? (yes/no)" Wait for explicit confirmation.
   - If `in-progress` and `decomposition: complete` marker is present in `state.md`, or any T-XX subdirectories already exist → list the existing T-XX directories and **stop**: "Decomposition already started. Existing subtasks: [list]. Re-running will overwrite their `description.md`. Confirm to proceed? (yes/no)" Wait for explicit confirmation.
3. Otherwise → continue.

---

## Instructions

1. Read `state.md` in the task directory — use `## Task Analysis` as input.
2. Break the task into subtasks (T-01, T-02, ...) following the `## Decomposition Rules` in `.windsurf/rules/workflow-globals.md`:
   - Each subtask is a logical unit of work (domain/module), not a single file operation.
   - Internal step count per subtask: 3–15.
   - Max 8 subtasks per task. Merge smaller related ones if exceeded.
   - If a candidate subtask has < 3 steps — absorb into the closest neighbor.
   - If decomposition boundaries are ambiguous — **stop**, describe the ambiguity, propose 2–3 decomposition options with trade-offs, and wait for user decision.

3. For each subtask, create directory `T-XX-<slug>/` containing exactly ONE file:

   `T-XX-<slug>/description.md` with the following sections (and only these):

   ```
   ## Goal
   One sentence describing the done-state of this subtask.

   ## Context
   Why this subtask exists, dependencies on other T-XX, constraints inherited
   from parent task (Invariants, Off-limits).

   ## Steps
   Numbered implementation steps (3–15 items).
   Each step: one concrete action grouped by domain (not split by file operation).

   ## Acceptance Criteria
   Explicit, checkable conditions (at least 2). Used verbatim during atomic-validation.
   ```

   Do NOT create `state.md` or `plan.md` inside the T-XX directory.

4. Create or update top-level `plan.md`:

```
## Subtasks

| ID   | Name   | Key Steps (summary)                    | Depends On | Status       |
|------|--------|----------------------------------------|------------|--------------|
| T-01 | <name> | step1 → step2 → step3                  | —          | not-started  |
| T-02 | <name> | ...                                    | T-01       | not-started  |

## Execution Strategy
<execution order, parallelism constraints, rationale>
```

`Key Steps` — short inline list (separated by `→`) summarising main steps from `T-XX/description.md → ## Steps`.

5. Append to top-level `state.md` an explicit completion marker:

```
## Decomposition
- decomposition: complete
- subtasks: T-01, T-02, ...
```

If the section already exists — overwrite it with the updated list.

6. Report: "Step 2 (Decomposition) complete. Created N subtasks."
