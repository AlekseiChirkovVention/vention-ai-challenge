# T-11: Fix cancelFlight not resetting lastScheduledAt

## Goal
After `cancelFlight` is called, the `atc://schedule/timeline` resource should accurately reflect
that the current schedule is stale. Currently `state.lastScheduledAt` is left set, so the
resource reports `generated: true` even though the schedule is incomplete.

## Problem
`cancelFlight` in `src/state.ts` removes the cancelled flight's scheduled operation (and
re-queues dependents to PENDING, removing their ops too), but does not reset
`state.lastScheduledAt`. As a result, `atc://schedule/timeline` shows `generated: true` with
a partial schedule, misleading clients into thinking the schedule is current.

## Invariants (from parent)
- `state` is a module-level singleton; all mutations go through the four exported functions.

## Scope
**In scope:**
- `src/state.ts` — `cancelFlight` function: add `state.lastScheduledAt = null` after removing
  scheduled operations.

**Out of scope:**
- No other files need changing. Resources and tools already handle `lastScheduledAt === null`.

## Steps

1. In `src/state.ts`, locate `cancelFlight`. After the block that removes scheduled operations from `state.schedule` and re-queues dependents, add `state.lastScheduledAt = null;`.
2. Run `npx tsc --noEmit` and verify it exits 0.
3. Trace through Scenario 5: after cancel_flight("IN001"), verify `state.lastScheduledAt` is null and that `operationTimeline` resource would return `{ generated: false, ... }`.

## Acceptance Criteria
- [ ] `cancelFlight` sets `state.lastScheduledAt = null` after modifying the schedule.
- [ ] After a cancel, `atc://schedule/timeline` returns `{ generated: false, ... }`.
- [ ] After a cancel followed by `generate_schedule`, `lastScheduledAt` is set again and
  timeline shows `generated: true`.
- [ ] `npx tsc --noEmit` exits 0 after the fix.
- [ ] All 5 validation scenarios still pass.

## Done Definition
All acceptance criteria pass. tsc clean.
