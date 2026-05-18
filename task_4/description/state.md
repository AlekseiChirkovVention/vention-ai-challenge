## Phases
- discovery: complete
- execution: complete
- validation: complete

## Contract Check

### Invariants
| Invariant | Status |
|-----------|--------|
| `state` is a module-level singleton; all mutations go through the four exported functions | PASS |
| `buildSchedule` is a pure function: same input → same output always | PASS |
| `ScheduledOperation.endTime === startTime + operationDuration` always | PASS: `endTime = bestStartTime + duration` in scheduler.ts:240 |
| `startTime` and `endTime` are in seconds relative to t=0, always within [0, maxHorizonSec] | PASS: horizon check at scheduler.ts:235; startTime always ≥ 0 |
| A flight can only exist once in `state.flights` (flightNumber is unique key) | PASS: `addFlight` checks `state.flights.has(flightNumber)` |
| Dependency graph in `state.flights` is always acyclic (enforced at addFlight time) | PASS: iterative DFS `hasCycle` called in `addFlight` |

### Acceptance Criteria
| Criterion | Status |
|-----------|--------|
| Server starts with valid env vars without errors | PASS: McpServer + StdioTransport; config loaded at module init |
| Server fails with descriptive error on missing required env var | PASS: `loadConfig` collects all errors and throws |
| Server fails with descriptive error on invalid env var values | PASS: parsePositiveInt / parseNonNegativeInt collect errors |
| MCP client can connect via stdio | PASS: StdioServerTransport in index.ts |
| `submit_flight` accepts valid flights and rejects duplicates | PASS: uniqueness check in `addFlight` |
| `submit_flight` rejects self-referencing dependencies | PASS: `dependencies.includes(flightNumber)` check |
| `submit_flight` rejects dependencies on non-existent flights | PASS: dep existence check loop in `addFlight` |
| `generate_schedule` produces no two ops sharing a runway at same time | PASS: runway slot conflict detection in scheduler.ts |
| `generate_schedule` respects separation buffers | PASS: `getSeparation` applied per slot pair |
| `generate_schedule` schedules higher-priority flights earlier | PASS: Kahn's with priority sort (HIGH=0, MEDIUM=1, LOW=2) |
| `generate_schedule` marks flights UNSCHEDULED with clear reasons | PASS: unscheduledReasons map; runway/dep/horizon reasons |
| `generate_schedule` deterministic (same state → same output) | PASS: no Math.random; sort by (priority, submittedAt, flightNumber); runway/gate iterated by sorted ID |
| `get_status` returns all required fields | PASS: flightCounts, runways, gates, groundCrew, schedule, resourceConstraints |
| `cancel_flight` marks CANCELLED and re-queues dependents to PENDING | PASS: cancelFlight in state.ts |
| `analyze_bottleneck` returns longest dependency chain | PASS: DFS from roots over scheduled ops |
| `atc://flights/queue` lists all flights with correct statuses | PASS: flightQueueHandler reads state.flights |
| `atc://runways/availability` shows runway usage | PASS: runwayAvailabilityHandler |
| `atc://schedule/timeline` shows ops sorted by startTime | PASS: sorted by startTime then flightNumber |
| Scenario 1 (Morning Rush): all 4 flights scheduled, priority order respected | PASS (verified in T-07) |
| Scenario 2 (Heavy Hauler): BIG001 unscheduled with runway reason | PASS (verified in T-07) |
| Scenario 3 (Connecting Flight): OUT001.startTime >= IN001.endTime + buffer | PASS (verified in T-07) |
| Scenario 4 (Cycle Prevention): self-dependency rejected | PASS: self-dep check returns error "cannot depend on itself" |
| Scenario 5 (Cancellation Cascade): cancellation re-queues all dependents | PASS (verified in T-07) |
| TypeScript compilation with `strict: true` produces zero errors | PASS: `npx tsc --noEmit` exits 0 |
| No `any` types in source code | PASS: grep found 0 occurrences |
| README covers install, build, env vars, MCP client, tool/resource reference | PASS: README.md present with all sections |
| report.md covers scheduling approach, decisions | PASS: report.md present |

### Off-limits
| Constraint | Status |
|------------|--------|
| No database | PASS: no db imports |
| No HTTP framework | PASS: no express/fastify/etc |
| No external scheduling libraries | PASS: only @modelcontextprotocol/sdk and zod |
| No Math.random() | PASS: grep found 0 occurrences |
| Scheduler is pure (no state.ts import) | PASS: scheduler.ts imports from types only |
| No process.stdin/stdout directly | PASS: uses StdioServerTransport |
| No unhandled promise rejections | PASS: all tools wrapped in try/catch |
| No raw Error objects in MCP responses | PASS: all serialized to string |
| No CANCELLED flights scheduled | PASS: Phase 1 filters status !== CANCELLED |
| No self-dependency allowed | PASS: direct self-dep check + hasCycle in addFlight |

## Fix-Tasks
fixes-created: complete
Created: T-08-fix-gate-recheck, T-09-fix-crew-tiebreak, T-10-fix-index-casts, T-11-fix-cancel-staleness, T-12-fix-bottleneck-tiebreak

## Issue List

### Approved
1. Gate re-check after crew constraint advance — fix gate availability re-verification in scheduler.ts after findCrewSlot advances startTime
2. Crew event tie-breaking at same timestamp — sort eventsInWindow by (time ASC, delta ASC) in isCrewSlotFeasible
3. Type casts in index.ts — replace `params as Parameters<...>` casts with properly typed wrappers
4. cancelFlight doesn't reset lastScheduledAt — set state.lastScheduledAt = null in cancelFlight
5. Non-deterministic tie-breaking in analyzeBottleneck — prefer chain with lexicographically smallest first flight number on duration tie

### Deferred
(none)

## Code Review

### Findings

1. **scheduler.ts:195–230** — Gate availability is checked against `gateStart` (the crew-agnostic earliest time), but `findCrewSlot` can return a `finalStart > gateStart`. Since the gate conflict loop only ran for `[gateStart, gateStart+duration]`, a gate slot starting between `gateStart` and `finalStart+duration` is missed. Concrete: existing gate op [5000–6800], duration=1800, gateTurnaround=1800, gateStart=2000 (no conflict detected), crew constraint pushes to finalStart=4000 → schedules [4000–5800] which overlaps [5000–6800]. Severity: **major**

2. **scheduler.ts:339–365** — `isCrewSlotFeasible` processes same-timestamp events sorted by time only. When a crew operation ends and another starts at exactly the same time, arbitrary order could cause a transient count spike, returning false for a feasible slot. Severity: **minor**

3. **index.ts:22,29,43** — `params as Parameters<typeof handler>[0]` casts bypass TS inference. Low-risk since Zod schemas enforce the shape, but could hide handler signature drift. Severity: **minor**

4. **state.ts:104–128** — `cancelFlight` does not reset `state.lastScheduledAt`. After cancellation, `atc://schedule/timeline` reports `generated: true` with a stale schedule (cancelled op and dependents removed). Clients have no way to detect the schedule needs regeneration. Severity: **minor**

5. **analyzeBottleneck.ts:57–77** — No tie-breaking when multiple chains share the same duration. DFS order determines which chain is returned, which can vary if `state.schedule` iteration order ever differs. Severity: **minor**

### Summary
5 findings total: 0 critical, 1 major, 4 minor.

## Task Analysis

### Goal
Build a fully functional TypeScript MCP (Model Context Protocol) server that acts as an in-memory Air Traffic Control system, exposing 5 tools (`submit_flight`, `generate_schedule`, `get_status`, `cancel_flight`, `analyze_bottleneck`) and 3 resources (`atc://flights/queue`, `atc://runways/availability`, `atc://schedule/timeline`) over stdio transport using the `@modelcontextprotocol/sdk`.

### Affected Parts
- **task_4/** — Fully implemented MCP server.
- **src/types.ts** — Domain enums and interfaces (Flight, Runway, Gate, ScheduledOperation, AirportConfig, ScheduleResult, AirportState, BottleneckResult).
- **src/config.ts** — Environment variable parsing with fail-fast validation (all errors collected before throwing).
- **src/state.ts** — Mutable in-memory singleton; mutation functions: addFlight (with cycle detection), cancelFlight, applyScheduleResult, resetState.
- **src/scheduler.ts** — Pure scheduling function: topological sort (Kahn's + priority queue) → greedy resource allocation (runway separation, gate, ground crew) → ScheduleResult.
- **src/index.ts** — MCP server entry point; registers all tools and resources, starts stdio transport.
- **src/tools/*.ts** — 5 tool handler files, each delegating to state/scheduler.
- **src/resources/*.ts** — 3 resource handler files reading from state.
- **package.json / tsconfig.json / .env.example / README.md / report.md** — Project scaffolding and documentation.

### Codebase Analysis
Greenfield project; all modules implemented under `task_4/src/`. Key constraints: no external state, deterministic scheduling, pure scheduler (no state.ts import), iterative DFS cycle detection, sweep-line crew constraint.

## Decomposition
- decomposition: complete
- subtasks: T-01, T-02, T-03, T-04, T-05, T-06, T-07

## Subtask Progress

T-01 | Scaffolding, Types & Config | atomic-execution: complete | atomic-validation: complete
  last_action: reviewed — all acceptance criteria met; tsc --noEmit exits 0, types + config implemented, .env.example complete
  blocker: none
  notes: added "types": ["node"] to tsconfig to resolve process global

T-02 | State Module | atomic-execution: complete | atomic-validation: complete
  last_action: reviewed — addFlight (uniqueness + self-cycle first + dep exists + hasCycle DFS), cancelFlight cascade, applyScheduleResult, resetState all verified
  blocker: none
  notes: reordered self-cycle check before dep-exists check so correct error message is returned

T-03 | Scheduler | atomic-execution: complete | atomic-validation: complete
  last_action: reviewed — buildSchedule pure function; scenarios 1-3 pass; determinism verified; no state.ts import
  blocker: none
  notes: sweep-line crew check uses feasibility probe at each candidate time point

T-04 | MCP Server + submit + generate | atomic-execution: complete | atomic-validation: complete
  last_action: reviewed — server starts, submit_flight and generate_schedule tools working with Zod schemas; shebang added via postbuild step
  blocker: none
  notes: SDK requires Zod schemas not JSON Schema objects; installed zod dependency

T-05 | Remaining Tools | atomic-execution: complete | atomic-validation: complete
  last_action: reviewed — getStatus, cancelFlight, analyzeBottleneck implemented and registered; all accept/error paths verified; tsc clean
  blocker: none
  notes: none

T-06 | Resources | atomic-execution: complete | atomic-validation: complete
  last_action: reviewed — flightQueue, runwayAvailability, operationTimeline resources implemented and registered; empty-state safety verified; tsc clean
  blocker: none
  notes: none

T-07 | Validation & Docs | atomic-execution: complete | atomic-validation: complete
  last_action: reviewed — all 5 scenarios pass; build exits 0; README.md and report.md written; determinism verified
  blocker: none
  notes: none

T-08 | Fix gate re-check after crew advance | atomic-execution: complete | atomic-validation: complete
  last_action: reviewed — iterative fixpoint (while !stable) resolves gate+crew jointly; all AC met; tsc clean
  blocker: none
  notes: none

T-09 | Fix crew event tie-breaking | atomic-execution: complete | atomic-validation: complete
  last_action: reviewed — (time, delta) sort ensures end events before start events at same time; tsc clean
  blocker: none
  notes: none

T-10 | Fix index.ts type casts | atomic-execution: complete | atomic-validation: complete
  last_action: reviewed — all unsafe casts removed; SDK infers correct types from Zod schemas; tsc clean
  blocker: none
  notes: none

T-11 | Fix cancelFlight staleness | atomic-execution: complete | atomic-validation: complete
  last_action: reviewed — lastScheduledAt = null in cancelFlight; timeline resource returns generated:false after cancel; tsc clean
  blocker: none
  notes: none

T-12 | Fix bottleneck tie-breaking | atomic-execution: complete | atomic-validation: complete
  last_action: reviewed — lexicographic tie-break on first flightNumber for equal-duration chains; tsc clean
  blocker: none
  notes: none

## Execution Report
- T-01: reviewed — npm init, tsconfig, package.json, types.ts, config.ts, .env.example; tsc exits 0
- T-02: reviewed — state singleton, addFlight with iterative DFS cycle detection, cancelFlight cascade, applyScheduleResult, resetState
- T-03: reviewed — buildSchedule pure function; 4-phase algorithm; all scenarios and determinism verified
- T-04: reviewed — McpServer + StdioTransport; submit_flight + generate_schedule with Zod schemas; shebang via postbuild
- T-05: reviewed — getStatus, cancelFlight, analyzeBottleneck tools implemented and registered
- T-06: reviewed — flightQueue, runwayAvailability, operationTimeline resources implemented and registered
- T-07: reviewed — all 5 validation scenarios pass; README.md + report.md written; build clean

## Solution Design

### Decision
**Variant A — Direct Import.** Tool and resource files import the `state` singleton and `buildSchedule` directly. `index.ts` registers each tool/resource by importing its handler and schema.

### Off-limits
- No database, HTTP framework, or external scheduling libraries.
- No `Math.random()` anywhere — scheduling must be deterministic.
- Scheduler (`src/scheduler.ts`) must NOT import from `src/state.ts`.
- Never use `process.stdin/stdout` directly — only `@modelcontextprotocol/sdk` transport.
- No `any` type anywhere in source.
- CANCELLED flights must never be scheduled.
- Cycle detection must use iterative DFS (not recursive).

### Invariants
- `state` is a module-level singleton; all mutations go through the four exported functions.
- `buildSchedule` is a pure function: same input → same output always.
- `ScheduledOperation.endTime === startTime + operationDuration` always.
- `startTime` and `endTime` are in seconds relative to t=0, always within [0, maxHorizonSec].
- A flight can only exist once in `state.flights` (flightNumber is unique key).
- Dependency graph in `state.flights` is always acyclic (enforced at addFlight time).

### Acceptance Criteria
- All 14 acceptance criteria in spec §14 pass (server startup, tools, resources, validation scenarios, quality).
- `npx tsc --noEmit` produces zero errors with `strict: true`.
- No `any` types in source.
- All 5 validation scenarios produce outputs matching spec §11 exactly.
- Calling `generate_schedule` twice with identical state produces byte-identical `scheduled` arrays.
