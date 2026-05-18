import { loadConfig } from "./config";
import { AirportState, Flight, FlightStatus, ScheduleResult } from "./types";

export const state: AirportState = {
  flights: new Map(),
  schedule: [],
  lastScheduledAt: null,
  config: loadConfig(),
};

export interface SubmitFlightInput {
  flightNumber: string;
  operationType: string;
  priority: string;
  dependencies?: string[];
  requiredRunwayLength?: number;
}

/**
 * Iterative DFS cycle detection. Returns true if adding newFlightNumber with newDependencies
 * would create a cycle in the existing flight dependency graph.
 */
function hasCycle(
  newFlightNumber: string,
  newDependencies: string[],
  existingFlights: Map<string, Flight>
): boolean {
  // adjacency: flight → list of its dependencies (what it depends on)
  // We want to detect if we can reach newFlightNumber starting from newDependencies
  const adjacency = new Map<string, string[]>();
  for (const [fn, flight] of existingFlights) {
    adjacency.set(fn, [...flight.dependencies]);
  }
  // Add the hypothetical new flight
  adjacency.set(newFlightNumber, [...newDependencies]);

  // DFS from newFlightNumber through dependency edges
  // If we reach newFlightNumber again after starting from its dependencies → cycle
  const stack: string[] = [...newDependencies];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === newFlightNumber) {
      return true;
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);
    const deps = adjacency.get(current);
    if (deps) {
      for (const dep of deps) {
        if (!visited.has(dep)) {
          stack.push(dep);
        }
      }
    }
  }
  return false;
}

/**
 * Add a new flight to state. Returns an error string on validation failure, null on success.
 */
export function addFlight(input: SubmitFlightInput): string | null {
  const { flightNumber, operationType, priority, dependencies = [], requiredRunwayLength } = input;

  if (state.flights.has(flightNumber)) {
    return `Flight ${flightNumber} already exists in the queue`;
  }

  if (dependencies.includes(flightNumber)) {
    return `Flight ${flightNumber} cannot depend on itself`;
  }

  for (const dep of dependencies) {
    if (!state.flights.has(dep)) {
      return `Dependency ${dep} does not exist. Submit ${dep} first before submitting ${flightNumber}`;
    }
  }

  if (dependencies.length > 0 && hasCycle(flightNumber, dependencies, state.flights)) {
    return `Submitting flight ${flightNumber} with the given dependencies would create a circular dependency cycle`;
  }

  const flight: Flight = {
    flightNumber,
    operationType: operationType as Flight["operationType"],
    priority: priority as Flight["priority"],
    dependencies,
    requiredRunwayLength,
    submittedAt: Date.now(),
    status: FlightStatus.PENDING,
  };
  state.flights.set(flightNumber, flight);
  return null;
}

/**
 * Cancel a flight. Sets status to CANCELLED, re-queues SCHEDULED dependents to PENDING,
 * removes operations from schedule. Returns list of re-queued flight numbers.
 */
export function cancelFlight(flightNumber: string): string[] {
  const flight = state.flights.get(flightNumber);
  if (!flight) {
    return [];
  }
  flight.status = FlightStatus.CANCELLED;

  // Remove this flight's scheduled operation from schedule
  state.schedule = state.schedule.filter((op) => op.flightNumber !== flightNumber);

  const reQueued: string[] = [];
  for (const [fn, f] of state.flights) {
    if (f.dependencies.includes(flightNumber)) {
      if (f.status === FlightStatus.SCHEDULED) {
        f.status = FlightStatus.PENDING;
        // Remove their scheduled operations too
        state.schedule = state.schedule.filter((op) => op.flightNumber !== fn);
        reQueued.push(fn);
      } else if (f.status === FlightStatus.UNSCHEDULED) {
        // Keep UNSCHEDULED, update reason
        f.unscheduledReason = `Dependency ${flightNumber} was cancelled`;
      }
    }
  }
  // Schedule is now stale — clients must call generate_schedule to get a valid schedule
  state.lastScheduledAt = null;
  return reQueued;
}

/**
 * Atomically replace schedule with the new result and update flight statuses.
 */
export function applyScheduleResult(result: ScheduleResult): void {
  state.schedule = result.scheduled;

  const scheduledFns = new Set(result.scheduled.map((op) => op.flightNumber));
  const unscheduledMap = new Map(result.unscheduled.map((u) => [u.flightNumber, u.reason]));

  for (const [fn, flight] of state.flights) {
    if (flight.status === FlightStatus.CANCELLED) {
      continue;
    }
    if (scheduledFns.has(fn)) {
      flight.status = FlightStatus.SCHEDULED;
      flight.unscheduledReason = undefined;
    } else if (unscheduledMap.has(fn)) {
      flight.status = FlightStatus.UNSCHEDULED;
      flight.unscheduledReason = unscheduledMap.get(fn);
    }
    // PENDING flights not mentioned in result remain PENDING
  }

  state.lastScheduledAt = Date.now();
}

/**
 * Reset all state (used for testing convenience — NOT exposed as MCP tool).
 */
export function resetState(): void {
  state.flights.clear();
  state.schedule = [];
  state.lastScheduledAt = null;
}
