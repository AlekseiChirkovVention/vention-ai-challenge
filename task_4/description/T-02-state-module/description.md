## Goal
A fully functional `src/state.ts` module with the in-memory AirportState singleton and all four mutation functions — including robust cycle detection — verified by manual test calls.

## Context
Depends on T-01 (types + config). The state module is the single source of truth for runtime data. It must never be mutated by the scheduler. Cycle detection must use iterative DFS (not recursive). All validation in `addFlight` must return error strings without mutating state on failure. Spec §6.1 and §6.2.

## Steps
1. Create `src/state.ts`; import `loadConfig` from config and all types from types; initialise `export const state: AirportState` singleton calling `loadConfig()`.
2. Implement `addFlight(input): string | null` — check flightNumber uniqueness in `state.flights`; return descriptive error string if duplicate.
3. Validate that all entries in `input.dependencies` reference existing flightNumbers; return error if any are missing.
4. Check direct self-cycle (`input.dependencies.includes(input.flightNumber)`); return error if present.
5. Implement `hasCycle(newFlightNumber, newDependencies, existingFlights): boolean` using iterative DFS — build adjacency map (flight → its dependencies), push `newFlightNumber` onto stack, visit dependencies; return true if `newFlightNumber` is reached again.
6. Call `hasCycle` inside `addFlight`; return transitive cycle error if detected.
7. On all validations passing, add flight to `state.flights` with `status: PENDING` and `submittedAt: Date.now()`.
8. Implement `cancelFlight(flightNumber): string[]` — set flight status to CANCELLED; find all flights whose `dependencies` include `flightNumber`.
9. For each dependent: if SCHEDULED → set to PENDING; remove its ScheduledOperation from `state.schedule`.
10. Return array of re-queued flight numbers.
11. Implement `applyScheduleResult(result): void` — atomically replace `state.schedule` with `result.scheduled`; update flight statuses (SCHEDULED / UNSCHEDULED / leave PENDING untouched); set `state.lastScheduledAt`.
12. Implement `resetState(): void` — clear flights Map, reset schedule array and lastScheduledAt.
13. Add inline test block (guarded by a flag or comment) that exercises addFlight, cycle detection, cancelFlight, and applyScheduleResult; verify output matches expected.

## Acceptance Criteria
- `addFlight` returns a non-null error string for: duplicate flightNumber, missing dependency, self-dependency, transitive cycle.
- `addFlight` returns null and mutates state only when all validations pass.
- `cancelFlight` sets the flight to CANCELLED, moves SCHEDULED dependents to PENDING, removes their ScheduledOperations from state.schedule, and returns the affected flight numbers.
- `applyScheduleResult` sets flights to SCHEDULED/UNSCHEDULED correctly and does not touch PENDING or CANCELLED flights not mentioned in the result.
- `npx tsc --noEmit` remains at zero errors after this module is added.
