# T-09: Fix crew event tie-breaking at same timestamp

## Goal
Fix a potential spurious feasibility failure in `isCrewSlotFeasible` in `src/scheduler.ts`.
When a crew operation ends and another starts at exactly the same time, arbitrary event ordering
can produce a transient crew-count spike that incorrectly rejects a valid slot.

## Problem
In `isCrewSlotFeasible` (scheduler.ts:339–365), `eventsInWindow` is sorted by time only.
When delta=-1 (end) and delta=+1 (start) share the same timestamp, if start is processed before
end, the running count temporarily spikes, potentially reaching groundCrewCount and returning
false even though the net count is within limit.

## Invariants (from parent)
- `buildSchedule` is a pure function: same input → same output always.

## Scope
**In scope:**
- `src/scheduler.ts` — `isCrewSlotFeasible` function only.

**Out of scope:**
- No other files.

## Steps

1. In `src/scheduler.ts`, locate `isCrewSlotFeasible`. Find the sort on `eventsInWindow` (`.sort((a, b) => a.time - b.time)`).
2. Change the sort comparator to `(a, b) => a.time - b.time || a.delta - b.delta` so that at the same timestamp, delta=-1 (end) sorts before delta=+1 (start).
3. Run `npx tsc --noEmit` and verify it exits 0.

## Acceptance Criteria
- [ ] `eventsInWindow` is sorted by `(time ASC, delta ASC)` so end events (-1) are processed before start events (+1) at the same timestamp.
- [ ] `npx tsc --noEmit` exits 0 after the fix.
- [ ] All 5 validation scenarios still pass.

## Done Definition
All acceptance criteria pass. tsc clean.
