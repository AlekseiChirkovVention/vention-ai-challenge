import { state } from "../state";
import { FlightStatus, OperationType } from "../types";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

export const getStatusSchema = {};

export async function getStatusHandler(_params: Record<string, never>): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    const flights = [...state.flights.values()];
    const schedule = state.schedule;

    // Flight counts
    const byStatus = {
      pending: 0,
      scheduled: 0,
      unscheduled: 0,
      cancelled: 0,
    };
    const byOperationType = { arrivals: 0, departures: 0 };
    for (const f of flights) {
      if (f.status === FlightStatus.PENDING) byStatus.pending++;
      else if (f.status === FlightStatus.SCHEDULED) byStatus.scheduled++;
      else if (f.status === FlightStatus.UNSCHEDULED) byStatus.unscheduled++;
      else if (f.status === FlightStatus.CANCELLED) byStatus.cancelled++;
      if (f.operationType === OperationType.ARRIVAL) byOperationType.arrivals++;
      else byOperationType.departures++;
    }

    // Runway usage
    const opsPerRunway = new Map<string, number>();
    for (const op of schedule) {
      opsPerRunway.set(op.runwayId, (opsPerRunway.get(op.runwayId) ?? 0) + 1);
    }
    const runwayDetails = state.config.runways.map((r) => ({
      id: r.id,
      lengthMeters: r.lengthMeters,
      operationsScheduled: opsPerRunway.get(r.id) ?? 0,
    }));
    const activeRunways = runwayDetails.filter((r) => r.operationsScheduled > 0).length;

    // Gates in use
    const gateIds = new Set(schedule.map((op) => op.gateId));
    const gatesInUse = gateIds.size;

    // Ground crew max concurrent usage (sweep-line)
    let maxConcurrent = 0;
    if (schedule.length > 0) {
      type Event = { time: number; delta: number };
      const events: Event[] = [];
      for (const op of schedule) {
        events.push({ time: op.startTime, delta: 1 });
        events.push({ time: op.endTime, delta: -1 });
      }
      events.sort((a, b) => a.time - b.time || b.delta - a.delta);
      let current = 0;
      for (const ev of events) {
        current += ev.delta;
        if (current > maxConcurrent) maxConcurrent = current;
      }
    }

    // Schedule metadata
    const scheduleGenerated = state.lastScheduledAt !== null;
    const completionTime = schedule.length > 0 ? Math.max(...schedule.map((op) => op.endTime)) : 0;

    // Unscheduled flights info
    const unscheduledFlights = flights
      .filter((f) => f.status === FlightStatus.UNSCHEDULED)
      .map((f) => ({ flightNumber: f.flightNumber, reason: f.unscheduledReason ?? "Unknown" }));

    const response = JSON.stringify({
      flightCounts: {
        total: flights.length,
        byStatus,
        byOperationType,
      },
      runways: {
        total: state.config.runways.length,
        inUse: activeRunways,
        details: runwayDetails,
      },
      gates: {
        total: state.config.gateCount,
        inUse: gatesInUse,
      },
      groundCrew: {
        total: state.config.groundCrewCount,
        maxConcurrentUsage: maxConcurrent,
      },
      schedule: {
        generated: scheduleGenerated,
        lastGeneratedAt: state.lastScheduledAt ? new Date(state.lastScheduledAt).toISOString() : null,
        completionTimeSeconds: scheduleGenerated ? completionTime : null,
        completionTimeFormatted: scheduleGenerated ? formatDuration(completionTime) : null,
      },
      resourceConstraints: {
        hasUnscheduledFlights: unscheduledFlights.length > 0,
        unscheduledFlights,
        isGroundCrewConstrained: maxConcurrent >= state.config.groundCrewCount,
      },
    });
    return { content: [{ type: "text", text: response }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      isError: true,
      content: [{ type: "text", text: JSON.stringify({ success: false, error: `Internal error: ${msg}` }) }],
    };
  }
}
