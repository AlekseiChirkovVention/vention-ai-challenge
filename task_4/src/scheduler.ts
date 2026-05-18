import { AirportConfig, Flight, FlightPriority, FlightStatus, OperationType, ScheduledOperation, ScheduleResult } from "./types";

/** Returns operation duration in seconds. */
function getOperationDuration(opType: OperationType, config: AirportConfig): number {
  return opType === OperationType.ARRIVAL
    ? config.arrivalDurationSeconds
    : config.departureDurationSeconds;
}

/** Returns runway separation buffer in seconds between two consecutive operations on the same runway. */
function getSeparation(prevOpType: OperationType, nextOpType: OperationType, config: AirportConfig): number {
  if (prevOpType === OperationType.DEPARTURE && nextOpType === OperationType.DEPARTURE) {
    return config.separationSameRunwayTakeoff;
  }
  if (prevOpType === OperationType.ARRIVAL && nextOpType === OperationType.ARRIVAL) {
    return config.separationSameRunwayLanding;
  }
  return config.separationMixed;
}

function priorityWeight(p: FlightPriority): number {
  if (p === FlightPriority.HIGH) return 0;
  if (p === FlightPriority.MEDIUM) return 1;
  return 2;
}

interface RunwaySlot {
  start: number;
  end: number;
  opType: OperationType;
}

interface CrewEvent {
  time: number;
  delta: number;
}

/**
 * Pure scheduling function. Takes a snapshot of flights and config, returns a ScheduleResult.
 * Never imports from state.ts. Same input → same output always.
 */
export function buildSchedule(
  flights: Map<string, Flight>,
  config: AirportConfig
): ScheduleResult {
  // Phase 1: Filter eligible flights (all non-CANCELLED)
  const eligibleFlights: Flight[] = [];
  for (const flight of flights.values()) {
    if (flight.status !== FlightStatus.CANCELLED) {
      eligibleFlights.push(flight);
    }
  }

  // Phase 2: Topological sort with priority ordering (Kahn's algorithm)
  // 2a: Build dependency graph over eligible flights only
  const eligibleSet = new Set(eligibleFlights.map((f) => f.flightNumber));
  const inDegree = new Map<string, number>();
  // adjacency: dep → list of flights that depend on dep
  const adjacency = new Map<string, string[]>();

  for (const flight of eligibleFlights) {
    inDegree.set(flight.flightNumber, 0);
    adjacency.set(flight.flightNumber, []);
  }

  for (const flight of eligibleFlights) {
    for (const dep of flight.dependencies) {
      if (eligibleSet.has(dep)) {
        inDegree.set(flight.flightNumber, (inDegree.get(flight.flightNumber) ?? 0) + 1);
        const dependents = adjacency.get(dep) ?? [];
        dependents.push(flight.flightNumber);
        adjacency.set(dep, dependents);
      }
      // Cancelled/missing deps are ignored for topo-sort ordering (handled in phase 3)
    }
  }

  // 2b: Init ready queue with in-degree 0
  const flightMap = new Map(eligibleFlights.map((f) => [f.flightNumber, f]));
  let readyQueue: Flight[] = eligibleFlights.filter((f) => (inDegree.get(f.flightNumber) ?? 0) === 0);

  // 2c: Sort ready queue
  const sortFlights = (arr: Flight[]): void => {
    arr.sort((a, b) => {
      const pw = priorityWeight(a.priority) - priorityWeight(b.priority);
      if (pw !== 0) return pw;
      const st = a.submittedAt - b.submittedAt;
      if (st !== 0) return st;
      return a.flightNumber.localeCompare(b.flightNumber);
    });
  };
  sortFlights(readyQueue);

  // 2d: Kahn's algorithm
  const processingOrder: Flight[] = [];
  const unscheduledReasons = new Map<string, string>();

  while (readyQueue.length > 0) {
    const flight = readyQueue.shift()!;
    processingOrder.push(flight);
    for (const dependentFn of adjacency.get(flight.flightNumber) ?? []) {
      const newDeg = (inDegree.get(dependentFn) ?? 0) - 1;
      inDegree.set(dependentFn, newDeg);
      if (newDeg === 0) {
        const dep = flightMap.get(dependentFn);
        if (dep) {
          readyQueue.push(dep);
        }
      }
    }
    sortFlights(readyQueue);
  }

  // Defensive: cycle guard
  if (processingOrder.length < eligibleFlights.length) {
    const processedSet = new Set(processingOrder.map((f) => f.flightNumber));
    for (const flight of eligibleFlights) {
      if (!processedSet.has(flight.flightNumber)) {
        unscheduledReasons.set(flight.flightNumber, "Dependency cycle detected");
      }
    }
  }

  // Phase 3: Greedy resource allocation
  // Build gates list sorted by ID
  const gates: string[] = [];
  for (let i = 1; i <= config.gateCount; i++) {
    gates.push(`G${i}`);
  }

  // Tracking maps
  const runwaySlots = new Map<string, RunwaySlot[]>();
  for (const runway of config.runways) {
    runwaySlots.set(runway.id, []);
  }
  const gateSlots = new Map<string, Array<{ start: number; end: number }>>();
  for (const gate of gates) {
    gateSlots.set(gate, []);
  }
  const crewEvents: CrewEvent[] = [];

  const scheduledOps = new Map<string, ScheduledOperation>();
  const scheduled: ScheduledOperation[] = [];

  for (const flight of processingOrder) {
    if (unscheduledReasons.has(flight.flightNumber)) {
      continue;
    }

    const duration = getOperationDuration(flight.operationType, config);

    // 3a: Check runway length requirement
    let candidateRunways = [...config.runways].sort((a, b) => a.id.localeCompare(b.id));
    if (flight.requiredRunwayLength !== undefined) {
      candidateRunways = candidateRunways.filter((r) => r.lengthMeters >= flight.requiredRunwayLength!);
      if (candidateRunways.length === 0) {
        const maxLen = Math.max(...config.runways.map((r) => r.lengthMeters));
        unscheduledReasons.set(
          flight.flightNumber,
          `No runway meets required length of ${flight.requiredRunwayLength}m. Longest available: ${maxLen}m`
        );
        continue;
      }
    }

    // 3b: Compute earliest start from dependency constraints
    let earliestStart = 0;
    let unscheduledByDep = false;

    for (const depFn of flight.dependencies) {
      const depFlight = flights.get(depFn);
      if (!depFlight || depFlight.status === FlightStatus.CANCELLED) {
        // Cancelled dependency is ignored
        continue;
      }
      const depOp = scheduledOps.get(depFn);
      if (depOp) {
        earliestStart = Math.max(earliestStart, depOp.endTime + config.dependencyBuffer);
      } else {
        // Dependency not scheduled (UNSCHEDULED or not yet processed)
        unscheduledReasons.set(flight.flightNumber, `Dependency ${depFn} could not be scheduled`);
        unscheduledByDep = true;
        break;
      }
    }
    if (unscheduledByDep) {
      continue;
    }

    // 3c: Find best (runway, gate, startTime) triple
    let bestStartTime = Infinity;
    let bestRunwayId = "";
    let bestGateId = "";

    for (const runway of candidateRunways) {
      const slots = runwaySlots.get(runway.id) ?? [];
      const sortedSlots = [...slots].sort((a, b) => a.start - b.start);

      // Find earliest time on this runway respecting separation
      let earliestOnRunway = earliestStart;
      for (const slot of sortedSlots) {
        const sep = getSeparation(slot.opType, flight.operationType, config);
        // If our window [earliestOnRunway, earliestOnRunway+duration] overlaps with [slot.start, slot.end+sep]:
        // A conflict exists if earliestOnRunway < slot.end + sep AND earliestOnRunway + duration > slot.start
        if (earliestOnRunway < slot.end + sep && earliestOnRunway + duration > slot.start) {
          earliestOnRunway = slot.end + sep;
        }
      }

      // Find earliest available gate + crew start using iterative fixpoint:
      // gate and crew constraints are resolved together so that advancing for one
      // doesn't violate the other.
      for (const gate of gates) {
        const gSlots = gateSlots.get(gate) ?? [];
        const sortedGSlots = [...gSlots].sort((a, b) => a.start - b.start);

        let candidate = Math.max(earliestOnRunway, earliestStart);
        let stable = false;
        while (!stable) {
          stable = true;
          // Re-check all gate slots at current candidate
          for (const gs of sortedGSlots) {
            if (candidate < gs.end + config.gateTurnaroundTime && candidate + duration > gs.start) {
              candidate = gs.end + config.gateTurnaroundTime;
              stable = false;
            }
          }
          // Re-check crew constraint at current candidate
          const afterCrew = findCrewSlot(candidate, duration, config.groundCrewCount, crewEvents);
          if (afterCrew > candidate) {
            candidate = afterCrew;
            stable = false;
          }
        }

        if (candidate < bestStartTime) {
          bestStartTime = candidate;
          bestRunwayId = runway.id;
          bestGateId = gate;
        }
      }
    }

    // 3e: Check horizon
    if (bestStartTime === Infinity || bestStartTime + duration > config.maxSchedulingHorizonSeconds) {
      unscheduledReasons.set(flight.flightNumber, "No slot available within scheduling horizon");
      continue;
    }

    const endTime = bestStartTime + duration;
    const op: ScheduledOperation = {
      flightNumber: flight.flightNumber,
      operationType: flight.operationType,
      priority: flight.priority,
      runwayId: bestRunwayId,
      gateId: bestGateId,
      startTime: bestStartTime,
      endTime,
      dependsOn: [...flight.dependencies],
    };
    scheduledOps.set(flight.flightNumber, op);
    scheduled.push(op);

    // Update tracking maps
    const rSlots = runwaySlots.get(bestRunwayId) ?? [];
    rSlots.push({ start: bestStartTime, end: endTime, opType: flight.operationType });
    runwaySlots.set(bestRunwayId, rSlots);

    const gSlots = gateSlots.get(bestGateId) ?? [];
    gSlots.push({ start: bestStartTime, end: endTime });
    gateSlots.set(bestGateId, gSlots);

    crewEvents.push({ time: bestStartTime, delta: 1 });
    crewEvents.push({ time: endTime, delta: -1 });
  }

  // Phase 4: Collect results
  const scheduledFns = new Set(scheduled.map((op) => op.flightNumber));
  const unscheduled: Array<{ flightNumber: string; reason: string }> = [];

  for (const flight of eligibleFlights) {
    if (!scheduledFns.has(flight.flightNumber)) {
      const reason = unscheduledReasons.get(flight.flightNumber) ?? "Could not be scheduled";
      unscheduled.push({ flightNumber: flight.flightNumber, reason });
    }
  }

  const completionTime = scheduled.length > 0
    ? Math.max(...scheduled.map((op) => op.endTime))
    : 0;

  return { scheduled, unscheduled, completionTime };
}

/**
 * Given a candidateStart time and duration, find the earliest startTime >= candidateStart
 * where running crew count stays < groundCrewCount throughout [startTime, startTime+duration].
 * Uses a sweep-line over crew events for efficiency.
 */
function findCrewSlot(
  candidateStart: number,
  duration: number,
  groundCrewCount: number,
  crewEvents: CrewEvent[]
): number {
  if (crewEvents.length === 0) {
    return candidateStart;
  }

  // Collect all distinct time points including candidateStart
  const timePoints = new Set<number>();
  timePoints.add(candidateStart);
  for (const ev of crewEvents) {
    if (ev.time >= candidateStart) {
      timePoints.add(ev.time);
    }
  }

  const sortedTimes = [...timePoints].sort((a, b) => a - b);

  for (const t of sortedTimes) {
    if (t < candidateStart) continue;
    // Check if [t, t+duration] is feasible: at every crew event within this window,
    // the crew count must stay < groundCrewCount
    if (isCrewSlotFeasible(t, duration, groundCrewCount, crewEvents)) {
      return t;
    }
    // Try starting right after the next event that causes a conflict
  }

  // Fallback: try each event time that could open a slot
  const allTimes = crewEvents
    .map((ev) => ev.time)
    .filter((t) => t >= candidateStart)
    .sort((a, b) => a - b);

  for (const t of allTimes) {
    if (isCrewSlotFeasible(t, duration, groundCrewCount, crewEvents)) {
      return t;
    }
  }

  return candidateStart; // should not reach here in practice
}

/**
 * Check if [startTime, startTime+duration] has crew count < groundCrewCount at all points.
 */
function isCrewSlotFeasible(
  startTime: number,
  duration: number,
  groundCrewCount: number,
  crewEvents: CrewEvent[]
): boolean {
  const endTime = startTime + duration;
  // Compute crew count at startTime
  let count = 0;
  for (const ev of crewEvents) {
    if (ev.time <= startTime) {
      count += ev.delta;
    }
  }
  if (count >= groundCrewCount) return false;

  // Check all event points within (startTime, endTime)
  const eventsInWindow = crewEvents
    .filter((ev) => ev.time > startTime && ev.time < endTime)
    .sort((a, b) => a.time - b.time || a.delta - b.delta);

  for (const ev of eventsInWindow) {
    count += ev.delta;
    if (count >= groundCrewCount) return false;
  }
  return true;
}
