## Goal
A fully implemented, pure `buildSchedule(flights, config): ScheduleResult` function in `src/scheduler.ts` that correctly handles priority ordering, dependency constraints, runway separation, gate allocation, and ground crew limits — deterministically.

## Context
Depends on T-01 (types only — **must NOT import from state.ts**). This is the most complex module. The scheduler is a pure function; it receives a snapshot and returns a result. Determinism is enforced by sorting all queues and iterating all collections by fixed keys. Spec §7 is the authoritative reference.

## Steps
1. Create `src/scheduler.ts`; implement `getOperationDuration(opType, config)` and `getSeparation(prevOp, nextOp, config)` helper functions as specified in §7.3/§7.4.
2. Phase 1 — implement eligible flight filter: include all non-CANCELLED flights.
3. Phase 2a — build dependency graph: compute `inDegree` map and `adjacency` map (dep → list of dependents) over eligible flights only.
4. Phase 2b-c — initialise ready queue with in-degree 0 flights; sort by `(priorityWeight ASC, submittedAt ASC, flightNumber ASC)` where HIGH=0, MEDIUM=1, LOW=2.
5. Phase 2d — Kahn's algorithm: pop front of ready queue → append to processingOrder → decrement in-degree of dependents → re-insert ready dependents → re-sort ready queue after each insertion.
6. Defensive cycle guard: if `processingOrder.length < eligibleFlights.length`, mark remaining eligible flights UNSCHEDULED with "Dependency cycle detected" reason.
7. Phase 3 — initialise tracking maps: `runwaySlots` (runway → sorted list of {start, end, opType}), `gateSlots` (gate → sorted list of {start, end}), `crewEvents` (list of {time, delta}).
8. Phase 3a — for each flight in processingOrder: filter candidate runways by `requiredRunwayLength`; mark UNSCHEDULED with runway reason if none qualify.
9. Phase 3b — compute `earliestStart`: apply dependency constraints; skip CANCELLED deps; mark UNSCHEDULED if a required dep is not scheduled.
10. Phase 3c — for each candidate runway (sorted by ID): scan existing runway slots to find `earliestOnRunway` respecting separation rules; then for each gate (sorted by ID) find earliest slot ≥ max(earliestOnRunway, earliestStart).
11. Phase 3d — apply ground crew constraint: build sweep-line from `crewEvents`; scan forward to find earliest interval `[t, t+duration]` where running crew count stays < `groundCrewCount` at all points; use that `t` as final startTime.
12. Phase 3e — if `startTime + duration > maxHorizonSec`, mark UNSCHEDULED with horizon reason; otherwise create `ScheduledOperation`, append to scheduled list, update runwaySlots/gateSlots/crewEvents.
13. Phase 4 — collect `ScheduleResult`: scheduled list, unscheduled list (flights not scheduled with reasons), `completionTime = max(endTime)`.

## Acceptance Criteria
- `buildSchedule` is a pure function: it has no imports from `state.ts` and does not mutate its arguments.
- Scenario 1 (4 flights, 2 runways): all 4 scheduled; AA101 (high) has earlier startTime than DL300 (low); no runway overlap including separation buffers.
- Scenario 2 (BIG001 needs 4000m runway): BIG001 is UNSCHEDULED with a runway-length reason; AA101 is SCHEDULED.
- Scenario 3 (dependency): OUT001.startTime >= IN001.endTime + dependencyBuffer.
- Calling `buildSchedule` twice with identical arguments returns identical results (determinism).
- `npx tsc --noEmit` remains at zero errors.
