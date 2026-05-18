import { z } from "zod";
import { addFlight, state } from "../state";
import { OperationType, FlightPriority } from "../types";

export const submitFlightSchema = {
  flightNumber: z.string().describe("Unique flight identifier (e.g. 'AA101')"),
  operationType: z.enum(["arrival", "departure"]).describe("Whether this is an arriving or departing flight"),
  priority: z.enum(["high", "medium", "low"]).describe("Scheduling priority"),
  dependencies: z.array(z.string()).optional().describe("Flight numbers that must complete before this flight can operate"),
  requiredRunwayLength: z.number().optional().describe("Minimum runway length required in meters (optional)"),
};

export async function submitFlightHandler(params: {
  flightNumber: string;
  operationType: string;
  priority: string;
  dependencies?: string[];
  requiredRunwayLength?: number;
}): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const validOpTypes: string[] = Object.values(OperationType);
    if (!validOpTypes.includes(params.operationType)) {
      const response = JSON.stringify({
        success: false,
        error: `Invalid operationType: "${params.operationType}". Must be one of: ${validOpTypes.join(", ")}`,
      });
      return { isError: true, content: [{ type: "text", text: response }] };
    }

    const validPriorities: string[] = Object.values(FlightPriority);
    if (!validPriorities.includes(params.priority)) {
      const response = JSON.stringify({
        success: false,
        error: `Invalid priority: "${params.priority}". Must be one of: ${validPriorities.join(", ")}`,
      });
      return { isError: true, content: [{ type: "text", text: response }] };
    }

    const error = addFlight({
      flightNumber: params.flightNumber,
      operationType: params.operationType,
      priority: params.priority,
      dependencies: params.dependencies ?? [],
      requiredRunwayLength: params.requiredRunwayLength,
    });

    if (error !== null) {
      const response = JSON.stringify({ success: false, error });
      return { isError: true, content: [{ type: "text", text: response }] };
    }

    const flight = state.flights.get(params.flightNumber)!;
    const response = JSON.stringify({
      success: true,
      flight: {
        flightNumber: flight.flightNumber,
        operationType: flight.operationType,
        priority: flight.priority,
        status: flight.status,
        dependencies: flight.dependencies,
        submittedAt: flight.submittedAt,
      },
      message: `Flight ${params.flightNumber} submitted successfully`,
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
