# Spec Driven Development: ATC MCP Server
## Air Traffic Control System via Model Context Protocol

**Version:** 1.0  
**Language:** TypeScript (Node.js)  
**Runtime:** Node.js 18+  
**Transport:** stdio (MCP standard)

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Directory Structure](#3-directory-structure)
4. [Domain Model & Type Definitions](#4-domain-model--type-definitions)
5. [Environment Configuration](#5-environment-configuration)
6. [Core Modules Specification](#6-core-modules-specification)
7. [Scheduling Algorithm — Deep Spec](#7-scheduling-algorithm--deep-spec)
8. [MCP Tools Specification](#8-mcp-tools-specification)
9. [MCP Resources Specification](#9-mcp-resources-specification)
10. [Error Handling Strategy](#10-error-handling-strategy)
11. [Validation Scenarios with Expected Outputs](#11-validation-scenarios-with-expected-outputs)
12. [Implementation Order](#12-implementation-order)
13. [Anti-Patterns & Constraints](#13-anti-patterns--constraints)
14. [Acceptance Criteria](#14-acceptance-criteria)

---

## 1. PROJECT OVERVIEW

### What We Are Building

A **Model Context Protocol (MCP) server** written in TypeScript that acts as an AI-ready Air Traffic Control system. The server exposes Tools and Resources that allow any MCP-compatible AI client (Claude Desktop, Claude Code, etc.) to manage airport operations: submit flights, generate schedules, inspect state, cancel flights, and analyse scheduling bottlenecks.

### What We Are NOT Building

- No HTTP server, no REST API
- No web UI, no dashboard, no visual rendering
- No real aircraft physics simulation
- No database — all state is in-memory
- No authentication layer

### Key Constraints

- MCP transport: **stdio only** (stdin/stdout JSON-RPC)
- State resets on process restart — this is acceptable and expected
- Scheduling must be **deterministic**: same inputs + config → same schedule every time
- Server must **fail fast** on invalid environment configuration

---

## 2. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP CLIENT                               │
│          (Claude Desktop / Claude Code / any MCP client)        │
└────────────────────────────┬────────────────────────────────────┘
                             │ stdio (JSON-RPC 2.0)
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     MCP SERVER (index.ts)                       │
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │  Tool Handlers   │    │      Resource Handlers           │  │
│  │                  │    │                                  │  │
│  │ submit_flight    │    │ atc://flights/queue              │  │
│  │ generate_schedule│    │ atc://runways/availability       │  │
│  │ get_status       │    │ atc://schedule/timeline          │  │
│  │ cancel_flight    │    │                                  │  │
│  │ analyze_bottlenck│    └──────────────────────────────────┘  │
│  └──────────┬───────┘                                          │
│             │                                                   │
│  ┌──────────▼───────────────────────────────────────────────┐  │
│  │                    AirportState                          │  │
│  │  (single in-memory singleton, all mutable state here)   │  │
│  │                                                          │  │
│  │  flights: Map<string, Flight>                            │  │
│  │  schedule: ScheduledOperation[]                          │  │
│  │  config: AirportConfig                                   │  │
│  └──────────┬───────────────────────────────────────────────┘  │
│             │                                                   │
│  ┌──────────▼──────────────────┐  ┌──────────────────────────┐ │
│  │      Scheduler              │  │   ConfigLoader           │ │
│  │  (pure function, no state)  │  │  (reads & validates env) │ │
│  │                             │  └──────────────────────────┘ │
│  │  buildSchedule(flights,cfg) │                               │
│  │  → ScheduleResult           │                               │
│  └─────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

### Module Responsibilities

| Module | File | Responsibility |
|--------|------|----------------|
| Entry point | `src/index.ts` | Create MCP server, register tools/resources, start stdio transport |
| Config loader | `src/config.ts` | Parse and validate all env variables, export typed `AirportConfig` |
| Domain types | `src/types.ts` | All TypeScript interfaces and enums, no logic |
| Airport state | `src/state.ts` | Mutable singleton holding all runtime state, pure data mutations only |
| Scheduler | `src/scheduler.ts` | Pure scheduling algorithm — takes state snapshot, returns schedule result |
| Tool handlers | `src/tools/*.ts` | One file per MCP tool, each handler calls state + scheduler |
| Resource handlers | `src/resources/*.ts` | One file per MCP resource |

---

## 3. DIRECTORY STRUCTURE

```
task-4/
├── src/
│   ├── index.ts              # MCP server entry, registers tools/resources
│   ├── config.ts             # Env var loading + validation
│   ├── types.ts              # All domain types and interfaces
│   ├── state.ts              # AirportState singleton
│   ├── scheduler.ts          # Scheduling algorithm (pure)
│   ├── tools/
│   │   ├── submitFlight.ts
│   │   ├── generateSchedule.ts
│   │   ├── getStatus.ts
│   │   ├── cancelFlight.ts
│   │   └── analyzeBottleneck.ts
│   └── resources/
│       ├── flightQueue.ts
│       ├── runwayAvailability.ts
│       └── operationTimeline.ts
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── report.md
```

---

## 4. DOMAIN MODEL & TYPE DEFINITIONS

**File: `src/types.ts`**

### 4.1 Enums

```typescript
export enum FlightPriority {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

export enum OperationType {
  ARRIVAL = "arrival",
  DEPARTURE = "departure",
}

export enum FlightStatus {
  PENDING = "pending",       // Submitted, not yet scheduled
  SCHEDULED = "scheduled",   // Successfully placed in schedule
  UNSCHEDULED = "unscheduled", // Attempted but could not be placed
  CANCELLED = "cancelled",   // Explicitly cancelled
}
```

### 4.2 Core Interfaces

```typescript
export interface Flight {
  flightNumber: string;         // Unique identifier, e.g. "AA101"
  operationType: OperationType;
  priority: FlightPriority;
  dependencies: string[];       // Array of flightNumbers this flight depends on
  requiredRunwayLength?: number; // Optional: minimum runway length in meters
  submittedAt: number;          // Unix timestamp ms — for deterministic tie-breaking
  status: FlightStatus;
  unscheduledReason?: string;   // Set when status === UNSCHEDULED
}

export interface Runway {
  id: string;          // e.g. "R1", "R2"
  lengthMeters: number;
}

export interface Gate {
  id: string;          // e.g. "G1", "G2"
}

// A single scheduled operation (one flight placed in time)
export interface ScheduledOperation {
  flightNumber: string;
  operationType: OperationType;
  priority: FlightPriority;
  runwayId: string;
  gateId: string;
  startTime: number;   // Offset in seconds from schedule epoch (t=0)
  endTime: number;     // startTime + operation duration
  dependsOn: string[]; // Copied from Flight.dependencies for timeline display
}

export interface AirportConfig {
  runways: Runway[];           // Length per runway
  gateCount: number;
  groundCrewCount: number;
  // Separation buffers in seconds
  separationSameRunwayTakeoff: number;  // Between two takeoffs on same runway
  separationSameRunwayLanding: number;  // Between two landings on same runway
  separationMixed: number;              // Between landing and takeoff on same runway
  // Other timing constants in seconds
  gateTurnaroundTime: number;   // How long a gate is occupied per operation
  dependencyBuffer: number;     // Extra wait after dependency completes before dependent can start
  maxSchedulingHorizonSeconds: number; // Max time window; flights beyond this are UNSCHEDULED
  // Derived: operation durations in seconds
  arrivalDurationSeconds: number;
  departureDurationSeconds: number;
}

export interface ScheduleResult {
  scheduled: ScheduledOperation[];
  unscheduled: Array<{ flightNumber: string; reason: string }>;
  completionTime: number; // Max endTime across all scheduled operations (seconds)
}

export interface AirportState {
  flights: Map<string, Flight>;
  schedule: ScheduledOperation[];
  lastScheduledAt: number | null; // Unix timestamp ms of last generate_schedule call
  config: AirportConfig;
}

export interface BottleneckResult {
  exists: boolean;
  chain: string[];             // Ordered flight numbers forming the critical path
  totalDurationSeconds: number; // Total elapsed time of the chain
}
```

### 4.3 Type Invariants (enforce in code)

- `Flight.flightNumber` must be unique across all flights in state
- `Flight.dependencies` must reference existing flightNumbers (validate at submit time)
- A flight cannot depend on itself (cycle check)
- `ScheduledOperation.endTime` must always equal `startTime + duration`
- `startTime` and `endTime` must be >= 0 and <= `maxSchedulingHorizonSeconds`

---

## 5. ENVIRONMENT CONFIGURATION

**File: `src/config.ts`**

### 5.1 All Environment Variables

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `RUNWAY_COUNT` | integer ≥ 1 | Yes | — | Number of runways |
| `RUNWAY_LENGTHS` | comma-separated integers | Yes | — | Length in meters per runway, count must match RUNWAY_COUNT. E.g. `"3000,2500"` |
| `GATE_COUNT` | integer ≥ 1 | Yes | — | Number of gates |
| `GROUND_CREW_COUNT` | integer ≥ 1 | Yes | — | Number of ground crews |
| `SEPARATION_TAKEOFF_SEC` | integer ≥ 0 | No | `60` | Buffer between consecutive takeoffs on same runway |
| `SEPARATION_LANDING_SEC` | integer ≥ 0 | No | `90` | Buffer between consecutive landings on same runway |
| `SEPARATION_MIXED_SEC` | integer ≥ 0 | No | `120` | Buffer when switching between landing/takeoff on same runway |
| `GATE_TURNAROUND_SEC` | integer ≥ 0 | No | `1800` | How long a gate is occupied per flight (30 min default) |
| `DEPENDENCY_BUFFER_SEC` | integer ≥ 0 | No | `300` | Extra wait after dependency flight ends (5 min default) |
| `MAX_HORIZON_SEC` | integer ≥ 1 | No | `86400` | Max scheduling window in seconds (24h default) |
| `ARRIVAL_DURATION_SEC` | integer ≥ 1 | No | `1800` | Duration of arrival operation (30 min default) |
| `DEPARTURE_DURATION_SEC` | integer ≥ 1 | No | `1800` | Duration of departure operation (30 min default) |

### 5.2 Validation Rules (fail at startup if violated)

```
RUNWAY_COUNT must be a positive integer
RUNWAY_LENGTHS must have exactly RUNWAY_COUNT comma-separated positive integers
GATE_COUNT must be a positive integer
GROUND_CREW_COUNT must be a positive integer
All SEC values must be non-negative integers
MAX_HORIZON_SEC must be > 0
ARRIVAL_DURATION_SEC must be > 0
DEPARTURE_DURATION_SEC must be > 0
```

### 5.3 Config Loader Implementation Pattern

```typescript
export function loadConfig(): AirportConfig {
  const errors: string[] = [];
  
  // Parse each variable, collect ALL errors before throwing
  // ...
  
  if (errors.length > 0) {
    throw new Error(`Invalid airport configuration:\n${errors.join('\n')}`);
  }
  
  return config;
}
```

**CRITICAL:** Collect ALL validation errors before throwing. Do not fail on first error.

### 5.4 .env.example

```env
# Required
RUNWAY_COUNT=2
RUNWAY_LENGTHS=3000,2800
GATE_COUNT=5
GROUND_CREW_COUNT=8

# Optional (shown with defaults)
SEPARATION_TAKEOFF_SEC=60
SEPARATION_LANDING_SEC=90
SEPARATION_MIXED_SEC=120
GATE_TURNAROUND_SEC=1800
DEPENDENCY_BUFFER_SEC=300
MAX_HORIZON_SEC=86400
ARRIVAL_DURATION_SEC=1800
DEPARTURE_DURATION_SEC=1800
```

---

## 6. CORE MODULES SPECIFICATION

### 6.1 AirportState (`src/state.ts`)

```typescript
// Module exports a single mutable state object.
// No class, no constructor — just a plain object exported as singleton.

export const state: AirportState = {
  flights: new Map(),
  schedule: [],
  lastScheduledAt: null,
  config: loadConfig(), // Called once at module init; throws on invalid config
};
```

**State mutation functions** (exported from state.ts):

```typescript
// Add a new flight. Returns error string if validation fails, null on success.
export function addFlight(input: SubmitFlightInput): string | null

// Mark a flight cancelled. Returns list of now-unscheduled dependent flight numbers.
export function cancelFlight(flightNumber: string): string[]

// Replace schedule with new result (atomic replace, not merge)
export function applyScheduleResult(result: ScheduleResult): void

// Reset all flights and schedule (for testing convenience — NOT exposed as MCP tool)
export function resetState(): void
```

**addFlight validation:**
1. `flightNumber` not already present in `state.flights`
2. All items in `dependencies` exist in `state.flights`
3. `flightNumber` not in its own `dependencies` (direct self-cycle)
4. Transitive cycle check: adding this flight does not create a dependency cycle
5. If any check fails, return descriptive error string; do not mutate state

**cancelFlight logic:**
1. Set `flight.status = CANCELLED`
2. Find all flights where `flight.dependencies.includes(cancelledFlightNumber)`
3. For each such dependent:
   - If it was SCHEDULED, mark as PENDING (re-queue for next schedule run)
   - If it was UNSCHEDULED, keep UNSCHEDULED but update reason to mention cancellation
4. Remove cancelled flight's `ScheduledOperation` from `state.schedule`
5. Return list of flight numbers that were re-queued to PENDING

**applyScheduleResult logic:**
1. Replace `state.schedule` with `result.scheduled`
2. For each flight in `result.scheduled`: set `state.flights[fn].status = SCHEDULED`
3. For each flight in `result.unscheduled`: set status = UNSCHEDULED, set reason
4. Flights with status PENDING that appear in neither list remain PENDING
5. Flights with status CANCELLED are never modified by schedule application
6. Set `state.lastScheduledAt = Date.now()`

### 6.2 Cycle Detection

Implement as a separate utility function used by `addFlight`:

```typescript
function hasCycle(
  newFlightNumber: string,
  newDependencies: string[],
  existingFlights: Map<string, Flight>
): boolean {
  // Build adjacency: flight → its dependencies
  // Run DFS from newFlightNumber
  // If we can reach newFlightNumber again → cycle
}
```

Use iterative DFS (not recursive) to avoid stack overflow on large graphs.

---

## 7. SCHEDULING ALGORITHM — DEEP SPEC

**File: `src/scheduler.ts`**

This is the most complex module. Read carefully.

### 7.1 Algorithm Overview

The scheduler is a **pure function** — takes a snapshot of flights and config, returns a `ScheduleResult`. It never reads from or writes to `state` directly.

```typescript
export function buildSchedule(
  flights: Map<string, Flight>,
  config: AirportConfig
): ScheduleResult
```

The algorithm runs in four phases:

```
Phase 1: Filter eligible flights
Phase 2: Topological sort with priority ordering  
Phase 3: Greedy resource allocation
Phase 4: Collect unscheduled and reasons
```

### 7.2 Phase 1 — Filter Eligible Flights

Only consider flights with status `PENDING` or `SCHEDULED` (not CANCELLED, not already-UNSCHEDULED with no hope).

Actually — include ALL non-CANCELLED flights to allow rescheduling after state changes.

```
eligibleFlights = all flights where status !== CANCELLED
```

### 7.3 Phase 2 — Topological Sort with Priority

**Goal:** Produce a processing order that respects dependencies AND prioritises high-priority flights.

**Step 2a — Build dependency graph:**
```
For each eligible flight F:
  - in-degree[F] = count of F's dependencies that are also eligible
  - adjacency[D] → [F, ...] means F depends on D
```

**Step 2b — Initialise ready queue with flights that have no dependencies (in-degree = 0)**

**Step 2c — Sort ready queue by priority then by submittedAt:**
```
Sort key: (priorityWeight ASC, submittedAt ASC)
Where: HIGH=0, MEDIUM=1, LOW=2
```

This means: high priority comes first; ties broken by earliest submission.

**Step 2d — Process in order (Kahn's algorithm with priority queue):**
```
while readyQueue is not empty:
  pop F from front of readyQueue (highest priority available)
  append F to processingOrder
  for each flight G that depends on F:
    in-degree[G] -= 1
    if in-degree[G] == 0:
      add G to readyQueue
      re-sort readyQueue by (priorityWeight, submittedAt)
```

**If processingOrder.length < eligibleFlights.length → cycle detected** (should not happen if addFlight validates, but handle defensively).

### 7.4 Phase 3 — Greedy Resource Allocation

Process flights one by one in `processingOrder`. For each flight:

**Step 3a — Check runway requirement:**
```
If flight.requiredRunwayLength is set:
  candidateRunways = runways.filter(r => r.lengthMeters >= flight.requiredRunwayLength)
  If candidateRunways is empty:
    mark flight UNSCHEDULED with reason: "No runway meets required length of {X}m. Available: {max}m"
    continue to next flight
Else:
  candidateRunways = all runways
```

**Step 3b — Compute earliest start time:**
```
earliestStart = 0

// Constraint 1: Dependencies must be complete + buffer
for each dep in flight.dependencies:
  if dep is in scheduledOps:
    earliestStart = max(earliestStart, scheduledOps[dep].endTime + config.dependencyBuffer)
  else if dep is CANCELLED:
    // Cancelled dependency is ignored — don't block the flight
    pass
  else:
    // Dependency is UNSCHEDULED or not yet processed
    // This flight cannot be scheduled
    mark flight UNSCHEDULED with reason: "Dependency {dep} could not be scheduled"
    continue to next flight (use outer continue)

// Constraint 2: Ground crew limit
// At any given time t, count of operations overlapping t must be < groundCrewCount
// (simplified: track crew timeline to find earliest slot)
```

**Step 3c — Find the best (runway, gate, startTime) triple:**

Iterate over each `candidateRunway` sorted by ID (for determinism):

```
For runway R:
  // Track runway occupancy
  runwaySlots[R] = list of (start, end, opType) already scheduled on R
  
  // Find earliest time on R that fits separation constraints:
  earliestOnRunway = earliestStart
  
  for each existing slot S on runway R (sorted by start time):
    separation = getSeparation(S.opType, flight.operationType, config)
    if there is a conflict: advance earliestOnRunway past S.end + separation
  
  // Check gate availability
  gateSlots[G] = list of (start, end) already scheduled on gate G
  for each gate G (sorted by ID for determinism):
    Find earliest time >= max(earliestOnRunway, earliestStart) that G is free
    
  // Pick runway+gate+time combination with minimum startTime
  candidates.push({ runway: R, gate: G, startTime: T })

Pick candidate with minimum startTime.
If minimum startTime + operationDuration > maxHorizonSec:
  mark UNSCHEDULED with reason: "No slot available within scheduling horizon"
  continue
```

**Separation rules:**
```typescript
function getSeparation(
  prevOpType: OperationType,
  nextOpType: OperationType,
  config: AirportConfig
): number {
  if (prevOpType === DEPARTURE && nextOpType === DEPARTURE) return config.separationSameRunwayTakeoff;
  if (prevOpType === ARRIVAL && nextOpType === ARRIVAL) return config.separationSameRunwayLanding;
  return config.separationMixed; // Any mixed combination
}
```

**Step 3d — Check ground crew constraint:**
```
At startTime T, operation will run from T to T+duration.
Count how many already-scheduled operations overlap [T, T+duration].
If count >= groundCrewCount:
  advance startTime to next available slot (scan forward in 1-second increments is too slow)
  
  // Efficient approach: collect all crew-busy intervals, find first gap
  crewEvents = all (start, +1) and (end, -1) events from scheduled ops
  Sort events by time, scan to find first moment where running_crew < groundCrewCount
  and the gap is long enough for this operation
```

**Step 3e — Schedule the operation:**
```
Create ScheduledOperation:
  flightNumber: flight.flightNumber
  operationType: flight.operationType
  priority: flight.priority
  runwayId: chosen runway
  gateId: chosen gate
  startTime: computed startTime
  endTime: startTime + operationDuration
  dependsOn: flight.dependencies

Add to scheduledOps map and scheduled list.
```

### 7.5 Phase 4 — Collect Results

```
scheduled = all ScheduledOperation objects created in Phase 3
unscheduled = all eligible flights NOT in scheduled, with their reasons
completionTime = max(endTime) across all scheduled operations, or 0 if none
```

### 7.6 Determinism Guarantee

The algorithm is deterministic because:
1. All randomness is eliminated — tie-breaking is by `submittedAt` then `flightNumber` alphabetically
2. Runway and gate iteration is always sorted by ID (string sort)
3. The topological sort produces the same order for the same input

### 7.7 Operation Duration

```typescript
function getOperationDuration(opType: OperationType, config: AirportConfig): number {
  return opType === OperationType.ARRIVAL
    ? config.arrivalDurationSeconds
    : config.departureDurationSeconds;
}
```

---

## 8. MCP TOOLS SPECIFICATION

All tools use the `@modelcontextprotocol/sdk` Server class. Each tool:
- Takes a `params` object matching its input schema
- Returns a `{ content: [{ type: "text", text: string }] }` response
- On error, returns `{ isError: true, content: [{ type: "text", text: errorMessage }] }`

### Tool 1: `submit_flight`

**Description:** Submit a new arrival or departure flight to the airport queue.

**Input Schema:**
```json
{
  "type": "object",
  "required": ["flightNumber", "operationType", "priority"],
  "properties": {
    "flightNumber": {
      "type": "string",
      "description": "Unique flight identifier (e.g. 'AA101')"
    },
    "operationType": {
      "type": "string",
      "enum": ["arrival", "departure"],
      "description": "Whether this is an arriving or departing flight"
    },
    "priority": {
      "type": "string",
      "enum": ["high", "medium", "low"],
      "description": "Scheduling priority"
    },
    "dependencies": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Flight numbers that must complete before this flight can operate",
      "default": []
    },
    "requiredRunwayLength": {
      "type": "number",
      "description": "Minimum runway length required in meters (optional)"
    }
  }
}
```

**Logic:**
1. Validate operationType, priority are valid enum values
2. Call `addFlight(input)` from state module
3. If error returned → return error response
4. Return success with flight details and current status

**Success Response Example:**
```json
{
  "success": true,
  "flight": {
    "flightNumber": "AA101",
    "operationType": "arrival",
    "priority": "high",
    "status": "pending",
    "dependencies": [],
    "submittedAt": 1700000000000
  },
  "message": "Flight AA101 submitted successfully"
}
```

**Error Response Example:**
```json
{
  "success": false,
  "error": "Flight AA101 already exists in the queue"
}
```

---

### Tool 2: `generate_schedule`

**Description:** Generate or refresh the airport schedule. Replaces the current schedule entirely with a freshly computed one based on the current flight queue and airport configuration.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {}
}
```
No inputs required.

**Logic:**
1. Call `buildSchedule(state.flights, state.config)`
2. Call `applyScheduleResult(result)` to update state
3. Return summary of the result

**Success Response Example:**
```json
{
  "success": true,
  "summary": {
    "totalFlights": 4,
    "scheduledCount": 3,
    "unscheduledCount": 1,
    "completionTimeSeconds": 5400,
    "completionTimeFormatted": "1h 30m"
  },
  "scheduledFlights": [
    { "flightNumber": "AA101", "startTime": 0, "endTime": 1800, "runwayId": "R1", "gateId": "G1" }
  ],
  "unscheduledFlights": [
    { "flightNumber": "XL999", "reason": "No runway meets required length of 4000m. Available: 3000m" }
  ]
}
```

---

### Tool 3: `get_status`

**Description:** Get current airport operational status including resource usage, flight counts, and schedule completion time.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {}
}
```

**Logic:** Compute and return all status fields from current state.

**Success Response — full structure:**
```json
{
  "flightCounts": {
    "total": 5,
    "byStatus": {
      "pending": 0,
      "scheduled": 3,
      "unscheduled": 1,
      "cancelled": 1
    },
    "byOperationType": {
      "arrivals": 3,
      "departures": 2
    }
  },
  "runways": {
    "total": 2,
    "inUse": 1,
    "details": [
      { "id": "R1", "lengthMeters": 3000, "operationsScheduled": 2 },
      { "id": "R2", "lengthMeters": 2500, "operationsScheduled": 1 }
    ]
  },
  "gates": {
    "total": 5,
    "inUse": 2
  },
  "groundCrew": {
    "total": 8,
    "maxConcurrentUsage": 2
  },
  "schedule": {
    "generated": true,
    "lastGeneratedAt": "2024-01-01T10:00:00Z",
    "completionTimeSeconds": 5400,
    "completionTimeFormatted": "1h 30m"
  },
  "resourceConstraints": {
    "hasUnscheduledFlights": true,
    "unscheduledFlights": [
      { "flightNumber": "XL999", "reason": "No runway meets required length" }
    ],
    "isGroundCrewConstrained": false
  }
}
```

**Note on `inUse` for runways:** Count runways that have at least one operation in the current schedule.

---

### Tool 4: `cancel_flight`

**Description:** Cancel a flight and re-evaluate all flights that depended on it.

**Input Schema:**
```json
{
  "type": "object",
  "required": ["flightNumber"],
  "properties": {
    "flightNumber": {
      "type": "string",
      "description": "The flight number to cancel"
    }
  }
}
```

**Logic:**
1. Check flight exists and is not already CANCELLED
2. Call `cancelFlight(flightNumber)` from state module
3. Return which flights were affected

**Success Response Example:**
```json
{
  "success": true,
  "cancelledFlight": "UA200",
  "affectedFlights": ["UA300", "UA400"],
  "message": "Flight UA200 cancelled. 2 dependent flight(s) re-queued to pending status and require rescheduling.",
  "recommendation": "Run generate_schedule to update the schedule."
}
```

**Error Cases:**
- Flight not found → error
- Flight already CANCELLED → error

---

### Tool 5: `analyze_bottleneck`

**Description:** Identify the longest dependency chain (critical path) in the current schedule. Returns the sequence of dependent flights that drives the total schedule duration.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {}
}
```

**Logic:**
1. If no schedule generated yet → return `{ exists: false, reason: "No schedule generated yet" }`
2. Build dependency graph from `state.schedule` (only SCHEDULED operations)
3. Run critical path analysis (see algorithm below)
4. Return result

**Critical Path Algorithm:**
```
For each scheduled operation, compute:
  earliestFinish[F] = max over all predecessors P of:
    (scheduledOps[P].endTime + dependencyBuffer)
  plus its own duration
  
  Actually simpler: use actual startTime/endTime from schedule.
  
  chainDuration[F] = endTime[F] - startTime[chainStart[F]]
  
Algorithm:
  For each flight F with no dependencies in the SCHEDULED set:
    DFS to find the longest chain starting from F
    Track path (list of flight numbers)
  
  Return the longest path and its total duration
    duration = last flight's endTime - first flight's startTime
```

**Success Response Example:**
```json
{
  "exists": true,
  "chain": ["AA101", "UA300", "UA400"],
  "totalDurationSeconds": 7200,
  "totalDurationFormatted": "2h 0m",
  "chainDetails": [
    { "flightNumber": "AA101", "startTime": 0, "endTime": 1800, "operationType": "arrival" },
    { "flightNumber": "UA300", "startTime": 2100, "endTime": 3900, "operationType": "departure" },
    { "flightNumber": "UA400", "startTime": 4200, "endTime": 7200, "operationType": "departure" }
  ]
}
```

**No chain response:**
```json
{
  "exists": false,
  "reason": "No dependency chains exist in the current schedule"
}
```

---

## 9. MCP RESOURCES SPECIFICATION

Resources are read-only. They use URI-based access. Clients call `resources/read` with the URI.

### Resource 1: `atc://flights/queue`

**Name:** `Flight Queue`
**Description:** The current flight queue including all flights in all states.
**MIME Type:** `application/json`

**Response structure:**
```json
{
  "totalFlights": 5,
  "flights": [
    {
      "flightNumber": "AA101",
      "operationType": "arrival",
      "priority": "high",
      "status": "scheduled",
      "dependencies": [],
      "requiredRunwayLength": null,
      "submittedAt": "2024-01-01T09:00:00.000Z",
      "unscheduledReason": null
    }
  ],
  "summary": {
    "pending": 0,
    "scheduled": 3,
    "unscheduled": 1,
    "cancelled": 1
  }
}
```

---

### Resource 2: `atc://runways/availability`

**Name:** `Runway Availability`
**Description:** Runway configuration and current usage information from the active schedule.
**MIME Type:** `application/json`

**Response structure:**
```json
{
  "runways": [
    {
      "id": "R1",
      "lengthMeters": 3000,
      "operationsScheduled": 2,
      "operations": [
        {
          "flightNumber": "AA101",
          "operationType": "arrival",
          "startTime": 0,
          "endTime": 1800
        }
      ],
      "busyPeriods": [
        { "from": 0, "to": 1800 },
        { "from": 1890, "to": 3690 }
      ]
    }
  ],
  "totalRunways": 2,
  "activeRunways": 1,
  "scheduledOperations": 3
}
```

---

### Resource 3: `atc://schedule/timeline`

**Name:** `Operation Timeline`
**Description:** Chronological timeline of all scheduled airport operations.
**MIME Type:** `application/json`

**Response structure:**
```json
{
  "generated": true,
  "lastGeneratedAt": "2024-01-01T10:00:00.000Z",
  "completionTimeSeconds": 5400,
  "operations": [
    {
      "position": 1,
      "flightNumber": "AA101",
      "operationType": "arrival",
      "priority": "high",
      "runwayId": "R1",
      "gateId": "G1",
      "startTime": 0,
      "endTime": 1800,
      "startTimeFormatted": "T+0m 0s",
      "endTimeFormatted": "T+30m 0s",
      "dependsOn": [],
      "dependencyNote": null
    },
    {
      "position": 2,
      "flightNumber": "UA300",
      "operationType": "departure",
      "priority": "medium",
      "runwayId": "R1",
      "gateId": "G2",
      "startTime": 2100,
      "endTime": 3900,
      "startTimeFormatted": "T+35m 0s",
      "endTimeFormatted": "T+1h 5m",
      "dependsOn": ["AA101"],
      "dependencyNote": "Waits for AA101 (ends T+30m) + 5m buffer"
    }
  ]
}
```

**Sorting:** Operations are sorted by `startTime` ascending, then by `flightNumber` for ties.

**Time formatting:** Use `T+Xh Ym Zs` format (omit 0 components except when all are 0 → `T+0s`).

**If no schedule generated:**
```json
{
  "generated": false,
  "lastGeneratedAt": null,
  "completionTimeSeconds": null,
  "operations": []
}
```

---

## 10. ERROR HANDLING STRATEGY

### Startup Errors
- Config validation failure → log error to stderr, `process.exit(1)`
- MCP server init failure → log error to stderr, `process.exit(1)`

### Tool Errors (runtime)
- All tool handlers are wrapped in try/catch
- Unexpected errors return `{ isError: true, content: [{ type: "text", text: "Internal error: {message}" }] }`
- Never let an unhandled exception crash the MCP server process

### Validation Errors (tool input)
- Return `{ isError: true, content: ... }` with descriptive message
- Do not throw — use return values

### Resource Errors
- Resources should never throw — return empty/default state if not initialized

### Error Message Format
All error messages must:
1. State WHAT went wrong
2. State WHY (what constraint was violated)
3. State WHAT TO DO next (when applicable)

Example:
```
"Flight XL999 cannot be scheduled: no runway meets required length of 4000m. 
Longest available runway: 3000m (R1). 
Submit a flight with requiredRunwayLength <= 3000 or remove the runway requirement."
```

---

## 11. VALIDATION SCENARIOS WITH EXPECTED OUTPUTS

### Scenario 1: Morning Rush

**Setup:**
```
Config: RUNWAY_COUNT=2, RUNWAY_LENGTHS=3000,2800, GATE_COUNT=5, GROUND_CREW_COUNT=8
```

**Inputs (in order):**
```
submit_flight: { flightNumber: "AA101", operationType: "arrival", priority: "high" }
submit_flight: { flightNumber: "UA200", operationType: "departure", priority: "medium" }
submit_flight: { flightNumber: "DL300", operationType: "arrival", priority: "low" }
submit_flight: { flightNumber: "SW400", operationType: "departure", priority: "low" }
generate_schedule
```

**Expected schedule (conceptual):**
- AA101 (high arrival) → scheduled first on a runway
- UA200 (medium departure) → scheduled on same or different runway after separation
- DL300, SW400 (low) → scheduled after AA101 and UA200 where resources permit
- No overlapping operations on the same runway (separation enforced)
- All 4 flights SCHEDULED (enough resources)

**Verification checks:**
```
✓ All 4 flights have status "scheduled"
✓ No two operations on same runway overlap (including separation buffer)
✓ AA101 has earlier startTime than DL300 (higher priority wins)
✓ UA200 has earlier startTime than SW400 (higher priority wins)
✓ flight queue shows 0 unscheduled
```

---

### Scenario 2: Heavy Hauler

**Setup:**
```
Config: RUNWAY_COUNT=2, RUNWAY_LENGTHS=3000,2800, GATE_COUNT=5, GROUND_CREW_COUNT=8
```

**Inputs:**
```
submit_flight: { 
  flightNumber: "BIG001", 
  operationType: "departure", 
  priority: "high",
  requiredRunwayLength: 4000
}
submit_flight: { flightNumber: "AA101", operationType: "arrival", priority: "medium" }
generate_schedule
```

**Expected:**
```json
{
  "scheduledFlights": [
    { "flightNumber": "AA101", "status": "scheduled" }
  ],
  "unscheduledFlights": [
    { 
      "flightNumber": "BIG001", 
      "reason": "No runway meets required length of 4000m. Longest available: 3000m"
    }
  ]
}
```

**Verification checks:**
```
✓ BIG001 has status "unscheduled"
✓ BIG001 appears in flight queue with reason about runway length
✓ AA101 is successfully scheduled (other flights not blocked)
✓ generate_schedule summary shows 1 scheduled, 1 unscheduled
```

---

### Scenario 3: Connecting Flight

**Setup:**
```
Config: RUNWAY_COUNT=2, RUNWAY_LENGTHS=3000,2800, GATE_COUNT=5, GROUND_CREW_COUNT=8, 
        DEPENDENCY_BUFFER_SEC=300, ARRIVAL_DURATION_SEC=1800
```

**Inputs:**
```
submit_flight: { flightNumber: "IN001", operationType: "arrival", priority: "high" }
submit_flight: { 
  flightNumber: "OUT001", 
  operationType: "departure", 
  priority: "high",
  dependencies: ["IN001"]
}
generate_schedule
```

**Expected timeline:**
```
IN001:  startTime=0, endTime=1800  (30 min arrival)
OUT001: startTime >= 1800 + 300 = 2100  (endTime of IN001 + dependencyBuffer)
```

**Verification checks:**
```
✓ Both IN001 and OUT001 have status "scheduled"
✓ OUT001.startTime >= IN001.endTime + DEPENDENCY_BUFFER_SEC (2100)
✓ Timeline resource shows "Waits for IN001" note on OUT001
✓ analyze_bottleneck returns chain: ["IN001", "OUT001"]
```

---

### Scenario 4: Cycle Prevention

**Inputs:**
```
submit_flight: { flightNumber: "F1", operationType: "arrival", dependencies: [] }
submit_flight: { flightNumber: "F2", operationType: "departure", dependencies: ["F1"] }
submit_flight: { flightNumber: "F3", operationType: "arrival", dependencies: ["F2", "F1"] }
```

**Attempting to create a cycle:**
```
submit_flight: { flightNumber: "F1_mod" ... dependencies: ["F3"] }
```
— This cannot work since F1 already exists. But if we tried to re-submit F1 with F3 as dependency:

**Test: submit F4 that creates cycle:**
```
submit_flight: { flightNumber: "F4", dependencies: ["F3"] }
// Then attempt:
submit_flight: { flightNumber: "F5", dependencies: ["F4"] }
// If we then tried submit_flight with flightNumber="F3", dependencies=["F5"] — cycle!
// Not possible since F3 exists. But test submit where dep chain loops back.
```

**Practical cycle test:** Submit F1, then F2 depending on F1. Attempt submit_flight with flightNumber="F3" and dependencies=["F2", "F3"] (self-dependency).

**Expected:**
```json
{
  "success": false,
  "error": "Flight F3 cannot depend on itself"
}
```

---

### Scenario 5: Cancellation Cascade

**Inputs:**
```
submit_flight: { flightNumber: "IN001", operationType: "arrival" }
submit_flight: { flightNumber: "OUT001", operationType: "departure", dependencies: ["IN001"] }
submit_flight: { flightNumber: "OUT002", operationType: "departure", dependencies: ["IN001"] }
generate_schedule
// All 3 scheduled
cancel_flight: { flightNumber: "IN001" }
```

**Expected:**
```json
{
  "success": true,
  "cancelledFlight": "IN001",
  "affectedFlights": ["OUT001", "OUT002"],
  "message": "Flight IN001 cancelled. 2 dependent flight(s) re-queued to pending status."
}
```

**After cancellation — flight queue state:**
```
IN001: CANCELLED
OUT001: PENDING (was SCHEDULED, re-queued)
OUT002: PENDING (was SCHEDULED, re-queued)
```

---

## 12. IMPLEMENTATION ORDER

Implement in this exact order. Do not skip ahead. Each step builds on the previous.

### Step 1: Project Scaffolding
```bash
mkdir task-4 && cd task-4
npm init -y
npm install @modelcontextprotocol/sdk
npm install -D typescript @types/node ts-node
npx tsc --init
```

Configure `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

`package.json` scripts:
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts"
  },
  "bin": {
    "atc-mcp": "./dist/index.js"
  }
}
```

First line of `dist/index.js` must be: `#!/usr/bin/env node`

### Step 2: Types (`src/types.ts`)
Implement all interfaces and enums from Section 4. No logic. Compile and verify.

### Step 3: Config (`src/config.ts`)
Implement `loadConfig()`. Test with valid and invalid env vars. Must throw descriptively.

### Step 4: State (`src/state.ts`)
Implement `state` singleton and all mutation functions.
Write inline tests (console.log based) to verify addFlight, cancelFlight.

### Step 5: Scheduler (`src/scheduler.ts`)
Implement `buildSchedule`. This is the core — spend the most time here.
Test manually by calling with mock flight data and logging results.

### Step 6: MCP Server Skeleton (`src/index.ts`)
Initialize MCP server, connect stdio transport. Verify server starts without crashing.

### Step 7: Tools (one by one)
- `submit_flight` → test via MCP client
- `generate_schedule` → test with Scenario 1
- `get_status` → verify all fields
- `cancel_flight` → test Scenario 5
- `analyze_bottleneck` → test Scenario 3

### Step 8: Resources (one by one)
- `atc://flights/queue`
- `atc://runways/availability`
- `atc://schedule/timeline`

### Step 9: Validation Scenarios
Run all 5 scenarios from Section 11. Verify all assertions.

### Step 10: README and report.md

---

## 13. ANTI-PATTERNS & CONSTRAINTS

### Never Do These

```
❌ Do NOT use any database (SQLite, PostgreSQL, Redis, etc.)
❌ Do NOT use any HTTP framework (Express, Fastify, etc.)
❌ Do NOT use external scheduling libraries (unless trivial utility functions)
❌ Do NOT add authentication or authorization
❌ Do NOT create a UI or CLI beyond what MCP requires
❌ Do NOT use Math.random() anywhere — scheduling must be deterministic
❌ Do NOT mutate state inside the scheduler function — it must be pure
❌ Do NOT use process.stdin/stdout directly — use @modelcontextprotocol/sdk transport
❌ Do NOT let unhandled promises reject silently — always catch in tool handlers
❌ Do NOT return raw Error objects in MCP responses — serialize to string first
❌ Do NOT hardcode any airport config values — always read from AirportConfig
❌ Do NOT schedule CANCELLED flights
❌ Do NOT allow a flight to be submitted with a dependency on itself (directly or transitively)
```

### Code Style Constraints

```
✓ All exported functions must have explicit TypeScript return types
✓ No `any` type — use proper interfaces
✓ Prefer `Map` over plain objects for flight storage (O(1) lookup)
✓ All time values are in SECONDS (integers) relative to schedule epoch t=0
   — never use actual wall clock time in scheduling logic
✓ All functions longer than 30 lines must have a JSDoc comment explaining purpose
✓ The scheduler function must be pure — no imports from state.ts
```

---

## 14. ACCEPTANCE CRITERIA

The implementation is complete and correct when ALL of the following are true:

### Server Startup
- [ ] Server starts with valid env vars without errors
- [ ] Server fails with descriptive error when any required env var is missing
- [ ] Server fails with descriptive error when env vars have invalid values
- [ ] MCP client can connect via stdio

### Tools
- [ ] `submit_flight` accepts valid flights and rejects duplicates
- [ ] `submit_flight` rejects self-referencing dependencies
- [ ] `submit_flight` rejects dependencies on non-existent flights
- [ ] `generate_schedule` produces a schedule where no two ops share a runway at the same time
- [ ] `generate_schedule` respects separation buffers between same-runway operations
- [ ] `generate_schedule` schedules higher-priority flights earlier when resources are contested
- [ ] `generate_schedule` marks flights UNSCHEDULED with clear reasons when impossible
- [ ] `generate_schedule` called twice with same state produces identical results (determinism)
- [ ] `get_status` returns all required fields (flight counts, runway usage, gate usage, completion time)
- [ ] `cancel_flight` marks flight CANCELLED and re-queues dependents to PENDING
- [ ] `analyze_bottleneck` returns longest dependency chain with duration

### Resources
- [ ] `atc://flights/queue` lists all flights with correct statuses
- [ ] `atc://runways/availability` shows which runways are in use
- [ ] `atc://schedule/timeline` shows operations sorted by start time

### Validation Scenarios
- [ ] Scenario 1 (Morning Rush): all 4 flights scheduled, priority order respected
- [ ] Scenario 2 (Heavy Hauler): BIG001 unscheduled with runway reason, AA101 scheduled
- [ ] Scenario 3 (Connecting Flight): OUT001.startTime >= IN001.endTime + dependencyBuffer
- [ ] Scenario 4 (Cycle Prevention): self-dependency rejected with clear error
- [ ] Scenario 5 (Cancellation Cascade): cancellation re-queues all dependents

### Quality
- [ ] TypeScript compilation with `strict: true` produces zero errors
- [ ] No `any` types in source code
- [ ] README covers: install, build, env vars, connecting from MCP client, tool/resource reference
- [ ] report.md covers: scheduling approach, decisions, what worked/didn't

---

*End of Spec. This document is the single source of truth for implementation.*