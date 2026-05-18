## Goal
Three additional MCP tools (`get_status`, `cancel_flight`, `analyze_bottleneck`) fully implemented, registered, and verified against spec response schemas.

## Context
Depends on T-04 (server skeleton is running, submit_flight and generate_schedule registered). All handlers follow same try/catch and error-response patterns established in T-04. Spec §8 Tools 3, 4, 5.

## Steps
1. Create `src/tools/getStatus.ts`; compute `flightCounts` — total, byStatus (pending/scheduled/unscheduled/cancelled counts), byOperationType (arrivals/departures counts).
2. Compute `runways` section: total count, inUse (runways with ≥1 operation in current schedule), and per-runway details (id, lengthMeters, operationsScheduled).
3. Compute `gates.inUse`: count distinct gateIds in current schedule.
4. Compute `groundCrew.maxConcurrentUsage`: sweep-line over scheduled ops to find peak concurrent count.
5. Compute `schedule` section: generated flag, lastGeneratedAt as ISO string, completionTime, and formatted completionTime string (e.g. "1h 30m").
6. Compute `resourceConstraints`: hasUnscheduledFlights, list of unscheduled flights with reasons, isGroundCrewConstrained flag (maxConcurrentUsage >= groundCrewCount).
7. Register `get_status` in index.ts.
8. Create `src/tools/cancelFlight.ts`; validate flight exists and is not already CANCELLED (return isError for each case); call `cancelFlight` from state; format success response per spec §8 Tool 4.
9. Register `cancel_flight` in index.ts.
10. Create `src/tools/analyzeBottleneck.ts`; if no schedule generated return `{ exists: false, reason: "No schedule generated yet" }`.
11. Build sub-graph from scheduled ops only: for each op with dependencies, link dep → op.
12. For each scheduled op with no deps (root nodes): DFS tracking path and total duration (`lastOp.endTime - firstOp.startTime`); collect the longest path.
13. If longest path has length > 1 (or any scheduled dep chain exists), return `exists: true` with chain, totalDurationSeconds, formatted duration, and chainDetails array; otherwise `exists: false` with "No dependency chains" reason.
14. Register `analyze_bottleneck` in index.ts.

## Acceptance Criteria
- `get_status` returns all required top-level keys: `flightCounts`, `runways`, `gates`, `groundCrew`, `schedule`, `resourceConstraints` — each with the correct nested fields per spec §8 Tool 3.
- `cancel_flight` on a non-existent flight returns `isError: true`; on an already-cancelled flight returns `isError: true`.
- `cancel_flight` on Scenario 5 setup returns affectedFlights containing OUT001 and OUT002.
- `analyze_bottleneck` on Scenario 3 schedule returns `chain: ["IN001", "OUT001"]` and `totalDurationSeconds >= 3000`.
- `analyze_bottleneck` when no schedule exists returns `exists: false` with a reason string.
