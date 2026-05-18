---
description: Discovery Step 4 — Finalize discovery, verify consistency, compress state
---

Invocation: `/pd-finalize <path-to-description>`
Called by: `/phase-discovery` as Step 4.

Task directory = parent directory of the provided `description.md`.

---

## Guard

1. Read `state.md` in the task directory.
2. Check `## Phases → discovery`. If `complete` → **stop**: "Discovery phase is already complete. Re-running will overwrite existing artifacts. Confirm to proceed? (yes/no)" Wait for explicit confirmation.
3. Check `## Solution Design` with `### Decision` present in `state.md`. If missing → **stop**: "Step 3 (/pd-design) must be completed first. Run /pd-design <path>."
4. Otherwise → continue.

---

## Instructions

1. Review all artifacts in the task directory for consistency:
   - `state.md` has sections: `## Task Analysis`, `## Solution Design` with `### Decision`.
   - `plan.md` has `## Subtasks` table with columns: `ID`, `Name`, `Key Steps (summary)`, `Depends On`, `Status`, with correct dependencies.
   - Each `T-XX-*/description.md` is consistent with the chosen architecture from `## Solution Design`.

2. **Per-subtask verification.** Before marking `discovery: complete`, verify for each T-XX listed in `plan.md`:
   1. `T-XX-*/description.md` exists.
   2. It contains all four sections: `## Goal`, `## Context`, `## Steps`, `## Acceptance Criteria`.
   3. `## Steps` has between 3 and 15 numbered items.
   4. `## Acceptance Criteria` has at least 2 checkable conditions.
   5. No extra files (`state.md`, `plan.md`) exist in the T-XX directory.

   If any T-XX fails this check — **stop** and return to `/pd-decompose` for that specific subtask before proceeding. Report the failing T-XX and which check did not pass.

3. Run `/compress-state --auto` on `state.md` in the task directory.
4. Update `## Phases` in `state.md`: set `discovery: complete`.
5. Report to user (display as text — do NOT invoke):
   - Path to `state.md` — full analysis and chosen solution.
   - Path to `plan.md` — subtask list with dependencies.
   - "Discovery complete. Run `/phase-execution <path-to-description>` to start execution."

**STOP. Do not run `/phase-execution` automatically.**
