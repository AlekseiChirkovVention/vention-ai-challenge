---
description: Execution Step 1 — Execute all pending subtasks via atomic execution → validation cycles
---

Invocation: `/pe-execute <path-to-description>`
Called by: `/phase-execution` as Step 1.

Task directory = parent directory of the provided `description.md`.

---

## Guard

1. Read `state.md` in the task directory. If `state.md` is not found → **stop**: "state.md not found. Run `/phase-discovery` first."
2. Check `## Phases → discovery`. If not `complete` → **stop**: "Discovery not complete. Run `/phase-discovery` first."
3. Check `## Phases → execution`. If `complete` → **stop**: "Execution phase is already complete. Re-running will overwrite existing artifacts. Confirm to proceed? (yes/no)" Wait for explicit confirmation.
4. Otherwise → continue.

---

## Instructions

Read `plan.md` in the task directory. For each subtask in `## Subtasks` table, in the order defined by `## Execution Strategy`:

1. **Check status**: if `done` / `reviewed` → skip. If `blocked` / `deferred` → skip, record in report.
2. **Check dependencies**: if any dependency is not `done` or `reviewed` → skip, record: "Skipped T-XX: dependency T-YY not complete."
3. **Run atomic cycle** for the subtask (atomic discovery is no longer a separate phase — all implementation detail lives in `T-XX/description.md`, produced during parent `/pd-decompose` + `/pd-finalize`):
   a. Call `/phase-atomic-execution <path-to-T-XX/description.md>`
   b. Call `/phase-atomic-validation <path-to-T-XX/description.md>`

Before calling atomic-execution for a T-XX, verify `T-XX/description.md` contains `## Steps` and `## Acceptance Criteria`. If missing → **stop** and report: "T-XX/description.md is incomplete. Run `/pd-decompose` + `/pd-finalize` to regenerate."

At any blocker or ambiguous situation in any atomic workflow:
- Stop immediately.
- Describe the problem clearly and concretely.
- Propose 2–3 solution options with trade-offs.
- Wait for user's choice.
- Continue only after receiving an answer.

After each completed subtask (status `reviewed`), run `/compress-state --auto` on the parent task's `state.md` (T-XX directories have no `state.md`).

## Execution Report persistence

After processing each subtask (including skipped, blocked, deferred), append its outcome to the `## Execution Report` section in the task-level `state.md`. Create the section if it does not exist. Format — one line per subtask:

```
## Execution Report
- T-01: done — <one-line summary>
- T-02: blocked — dependency T-YY not complete
- T-03: deferred — deferred by user decision
- T-04: reviewed — <one-line summary>
```

If a T-XX entry for the current subtask already exists in the section (for example on re-run) — overwrite the line in place. Do not keep duplicates.

This file-based record is the source of truth for `/pe-finalize`. Do not rely on session memory.
