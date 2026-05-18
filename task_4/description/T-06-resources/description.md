## Goal
All three MCP resources (`atc://flights/queue`, `atc://runways/availability`, `atc://schedule/timeline`) implemented, registered, and returning correct JSON per spec §9.

## Context
Depends on T-04 (server skeleton with resource registration API available). Resources are read-only and must never throw — return empty/default state if nothing is initialised. Spec §9.

## Steps
1. Create `src/resources/flightQueue.ts`; serialize `state.flights` Map to a sorted array (sorted by submittedAt ascending); convert `submittedAt` from ms timestamp to ISO string.
2. Compute `summary` counts (pending/scheduled/unscheduled/cancelled) from the flights array.
3. Set `requiredRunwayLength` to `null` when not set (not `undefined`) and `unscheduledReason` to `null` when absent.
4. Register `atc://flights/queue` resource in `index.ts` with name "Flight Queue" and MIME type `application/json`.
5. Create `src/resources/runwayAvailability.ts`; group scheduled operations by runwayId; for each runway compute `operationsScheduled` count and `operations` list.
6. Compute `busyPeriods` per runway: sort ops by startTime, merge overlapping intervals (considering separation buffer? — no, just raw op periods as per spec schema).
7. Compute `activeRunways` (runways with ≥1 operation) and `scheduledOperations` (total count).
8. Register `atc://runways/availability` resource in `index.ts`.
9. Create `src/resources/operationTimeline.ts`; if no schedule generated, return the no-schedule JSON per spec §9 Resource 3.
10. Sort scheduled ops by `startTime ASC`, then `flightNumber ASC` for ties; assign 1-based `position`.
11. Format `startTime` and `endTime` using T+Xh Ym Zs format (omit zero components; zero-zero case → "T+0s").
12. Build `dependencyNote`: for ops with `dependsOn`, compute note string "Waits for {dep} (ends T+Xm) + Ym buffer" referencing the dep's endTime.
13. Register `atc://schedule/timeline` resource in `index.ts`.

## Acceptance Criteria
- `atc://flights/queue` returns all submitted flights with correct status, `submittedAt` as ISO string, and null (not undefined) for absent optional fields.
- `atc://runways/availability` correctly shows `operationsScheduled` per runway and `busyPeriods` matching the scheduled operations.
- `atc://schedule/timeline` returns operations sorted by startTime; `position` starts at 1; time format strings match `T+Xh Ym Zs` pattern.
- All three resources return valid JSON and do not throw when state is empty (no flights, no schedule).
- `npx tsc --noEmit` remains at zero errors after all resource files are added.
