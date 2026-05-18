import { state } from "../state";
import { FlightStatus } from "../types";

export const flightQueueUri = "atc://flights/queue";

export function flightQueueHandler(): { contents: Array<{ uri: string; mimeType: string; text: string }> } {
  try {
    const flights = [...state.flights.values()].sort((a, b) => a.submittedAt - b.submittedAt);

    const summary = { pending: 0, scheduled: 0, unscheduled: 0, cancelled: 0 };
    for (const f of flights) {
      if (f.status === FlightStatus.PENDING) summary.pending++;
      else if (f.status === FlightStatus.SCHEDULED) summary.scheduled++;
      else if (f.status === FlightStatus.UNSCHEDULED) summary.unscheduled++;
      else if (f.status === FlightStatus.CANCELLED) summary.cancelled++;
    }

    const result = {
      totalFlights: flights.length,
      flights: flights.map((f) => ({
        flightNumber: f.flightNumber,
        operationType: f.operationType,
        priority: f.priority,
        status: f.status,
        dependencies: f.dependencies,
        requiredRunwayLength: f.requiredRunwayLength ?? null,
        submittedAt: new Date(f.submittedAt).toISOString(),
        unscheduledReason: f.unscheduledReason ?? null,
      })),
      summary,
    };

    return {
      contents: [
        {
          uri: flightQueueUri,
          mimeType: "application/json",
          text: JSON.stringify(result),
        },
      ],
    };
  } catch {
    return {
      contents: [
        {
          uri: flightQueueUri,
          mimeType: "application/json",
          text: JSON.stringify({ totalFlights: 0, flights: [], summary: { pending: 0, scheduled: 0, unscheduled: 0, cancelled: 0 } }),
        },
      ],
    };
  }
}
