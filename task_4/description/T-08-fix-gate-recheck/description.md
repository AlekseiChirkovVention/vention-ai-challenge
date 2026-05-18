# T-08: Fix gate re-check after crew constraint advance

## Goal
Fix a correctness bug in `src/scheduler.ts` where a flight can be scheduled on a gate that is
already occupied. The root cause: gate availability is checked against `gateStart`, but
`findCrewSlot` can return a `finalStart > gateStart`. Any gate slot that starts between
`gateStart` and `finalStart + duration` is never checked.

## Problem
In Phase 3 of `buildSchedule` (scheduler.ts:195–230):
1. `gateStart` is computed as the earliest gate-free time (accounting for all existing gate slots).
2. `findCrewSlot(candidateStart, duration, ...)` can advance `finalStart` past `gateStart`.
3. No re-verification of gate availability at `[finalStart, finalStart+duration]` is done.

Concrete failure case: existing gate op at [5000–6800], duration=1800, gateTurnaround=1800,
`gateStart=2000` (conflict check: 2000+1800=3800 ≤ 5000, no conflict) → crew constraint pushes
to `finalStart=4000` → schedules [4000–5800] which overlaps [5000–6800].

## Invariants (from parent)
- `buildSchedule` is a pure function: same input → same output always.
- `ScheduledOperation.endTime === startTime + operationDuration` always.
- No two operations may share a gate at overlapping times.

## Scope
**In scope:**
- `src/scheduler.ts` — the inner runway/gate/crew loop in Phase 3.

**Out of scope:**
- Any other file. No changes to state.ts, tools, resources, or tests.

## Steps

1. In `src/scheduler.ts` Phase 3, extract the gate availability check into a helper or inline re-check loop. After `findCrewSlot` returns `finalStart`, iterate: re-check gate availability at `[finalStart, finalStart+duration]` using the same conflict condition; if a conflict exists, advance `finalStart` past `gs.end + config.gateTurnaroundTime`, then call `findCrewSlot` again on the new candidate. Repeat until no gate conflict is found.
2. Ensure the re-check loop also respects the runway separation constraint: if `finalStart` moves beyond the runway-cleared window, re-run the runway earliest-start computation for that runway or conservatively treat the new `finalStart` as valid for the runway (the runway slots were already checked for the initial window; since `finalStart >= earliestOnRunway`, separation is maintained unless a new runway op was added — but within a single flight's scheduling, no new ops are added, so this is safe).
3. Run `npx tsc --noEmit` and verify it exits 0.
4. Manually trace the bug-triggering scenario (gate slot [5000–6800], duration=1800, gateStart=2000, crew pushes to 4000) and confirm the fix schedules the flight at or after gate slot clears.

## Acceptance Criteria
- [ ] After `findCrewSlot` returns `finalStart`, gate availability at `[finalStart, finalStart+duration]` is verified.
- [ ] If a gate conflict is found at `finalStart`, the start time is advanced past the conflict and crew is re-checked iteratively until both constraints are satisfied.
- [ ] The fix is contained within the Phase 3 loop; the rest of the scheduler is unchanged.
- [ ] `npx tsc --noEmit` exits 0 after the fix.
- [ ] All 5 validation scenarios (spec §11) still pass after the fix.

## Done Definition
All acceptance criteria pass. No regressions in existing scenarios. tsc clean.
