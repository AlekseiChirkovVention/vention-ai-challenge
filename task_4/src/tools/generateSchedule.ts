import { applyScheduleResult, state } from "../state";
import { buildSchedule } from "../scheduler";

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

export const generateScheduleSchema = {};

export async function generateScheduleHandler(_params: Record<string, never>): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    const result = buildSchedule(state.flights, state.config);
    applyScheduleResult(result);

    const totalFlights = state.flights.size;
    const response = JSON.stringify({
      success: true,
      summary: {
        totalFlights,
        scheduledCount: result.scheduled.length,
        unscheduledCount: result.unscheduled.length,
        completionTimeSeconds: result.completionTime,
        completionTimeFormatted: formatDuration(result.completionTime),
      },
      scheduledFlights: result.scheduled.map((op) => ({
        flightNumber: op.flightNumber,
        startTime: op.startTime,
        endTime: op.endTime,
        runwayId: op.runwayId,
        gateId: op.gateId,
      })),
      unscheduledFlights: result.unscheduled,
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
