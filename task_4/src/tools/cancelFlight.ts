import { z } from "zod";
import { cancelFlight as cancelFlightState, state } from "../state";
import { FlightStatus } from "../types";

export const cancelFlightSchema = {
  flightNumber: z.string().describe("The flight number to cancel"),
};

export async function cancelFlightHandler(params: { flightNumber: string }): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    const flight = state.flights.get(params.flightNumber);
    if (!flight) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: `Flight ${params.flightNumber} not found in the queue`,
            }),
          },
        ],
      };
    }

    if (flight.status === FlightStatus.CANCELLED) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: `Flight ${params.flightNumber} is already cancelled`,
            }),
          },
        ],
      };
    }

    const reQueued = cancelFlightState(params.flightNumber);
    const count = reQueued.length;
    const response = JSON.stringify({
      success: true,
      cancelledFlight: params.flightNumber,
      affectedFlights: reQueued,
      message: `Flight ${params.flightNumber} cancelled. ${count} dependent flight(s) re-queued to pending status and require rescheduling.`,
      recommendation: count > 0 ? "Run generate_schedule to update the schedule." : undefined,
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
