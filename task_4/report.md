# ATC MCP Server — Implementation Report

## Scheduling Algorithm Overview

The scheduler (`src/scheduler.ts`) is a pure function `buildSchedule(flights, config)` that runs in four phases:

**Phase 1 — Filter:** Select all non-CANCELLED flights as eligible for scheduling.

**Phase 2 — Topological Sort (Kahn's algorithm with priority queue):**
Build an in-degree map and adjacency map over eligible flights. Initialise a ready queue with zero-in-degree flights, sorted by `(priorityWeight ASC, submittedAt ASC, flightNumber ASC)`. Process with Kahn's: pop the highest-priority ready flight, append to processing order, decrement in-degrees of dependents, re-sort after each insertion. This guarantees dependency ordering while giving high-priority flights precedence.

**Phase 3 — Greedy Resource Allocation:**
For each flight in processing order:
1. Filter runways by required length.
2. Compute `earliestStart` from dependency end-times + buffer.
3. For each candidate runway (sorted by ID for determinism): scan existing runway slots to find the earliest time respecting separation buffers (`getSeparation` returns per-pair separation based on landing/takeoff combination).
4. For each gate (sorted by ID): find earliest slot ≥ max(runway time, earliest start), considering gate turnaround.
5. Apply the ground crew constraint: use a sweep-line feasibility check — given candidate start time, verify crew count stays below limit throughout `[startTime, startTime+duration]` by scanning crew events; advance to next event time if infeasible.
6. If `startTime + duration > maxHorizonSec`, mark UNSCHEDULED.

**Phase 4 — Collect Results:** Gather scheduled operations, unscheduled flights with reasons, and max endTime as completionTime.

## Key Design Decisions

### 1. Pure Scheduler Function
The scheduler never imports from `state.ts` and never mutates its arguments. This was the most critical architectural decision: it enables deterministic replay, simplifies testing, and prevents subtle state-corruption bugs that would arise if scheduling mixed reads and writes to the same singleton.

### 2. Iterative DFS for Cycle Detection
`hasCycle` in `state.ts` uses an explicit stack instead of recursive DFS. The spec mandates this to avoid stack overflow on large dependency graphs. The iterative approach also makes the traversal order predictable and easier to reason about: push all initial dependencies, visit each, push their dependencies if unvisited, return true immediately if the new flight number is reached again.

### 3. Kahn's Algorithm over DFS Topo-sort
Kahn's algorithm naturally integrates with the priority queue — after decrementing in-degrees, newly ready flights are inserted and the queue is re-sorted. A recursive DFS topo-sort would produce a correct order but would require a separate priority step to interleave high-priority flights among their topological peers.

### 4. Sweep-Line Ground Crew Constraint
Rather than scanning every second (which would be O(maxHorizon × flights)), the ground crew check builds a list of crew events `(time, +1/-1)` and probes feasibility at each event time ≥ candidateStart. This is O(n log n) per flight where n is the number of existing scheduled operations — efficient enough for any realistic airport horizon.

## What Worked Well

- The four-phase scheduler structure made each concern independently testable. Validating Phase 2 (topo-sort ordering) separately from Phase 3 (greedy allocation) caught a gate-turnaround overlap bug early.
- Using Zod for MCP tool schemas eliminated an entire class of runtime type errors — the SDK's strong typing via Zod infers parameter types automatically.
- All 5 validation scenarios passed on the first complete run of the integrated system, confirming the spec was faithfully implemented.

## What Was Complex

The ground crew feasibility check required careful thinking: naively counting overlapping operations at a single point is insufficient — the new operation occupies a window `[t, t+duration]`, so the crew count must stay below the limit at every sub-interval, not just at `t`. The solution probes at each crew-event boundary within the candidate window to find the first fully feasible slot.
