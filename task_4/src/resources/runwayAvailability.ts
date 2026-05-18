import { state } from "../state";

export const runwayAvailabilityUri = "atc://runways/availability";

export function runwayAvailabilityHandler(): { contents: Array<{ uri: string; mimeType: string; text: string }> } {
  try {
    const schedule = state.schedule;

    // Group operations by runway
    const opsByRunway = new Map<string, typeof schedule>();
    for (const op of schedule) {
      const arr = opsByRunway.get(op.runwayId) ?? [];
      arr.push(op);
      opsByRunway.set(op.runwayId, arr);
    }

    const runways = state.config.runways.map((runway) => {
      const ops = (opsByRunway.get(runway.id) ?? []).sort((a, b) => a.startTime - b.startTime);
      const operationsScheduled = ops.length;

      // Compute busy periods (raw op intervals, merged overlapping)
      const busyPeriods: Array<{ from: number; to: number }> = [];
      for (const op of ops) {
        if (busyPeriods.length === 0) {
          busyPeriods.push({ from: op.startTime, to: op.endTime });
        } else {
          const last = busyPeriods[busyPeriods.length - 1]!;
          if (op.startTime <= last.to) {
            last.to = Math.max(last.to, op.endTime);
          } else {
            busyPeriods.push({ from: op.startTime, to: op.endTime });
          }
        }
      }

      return {
        id: runway.id,
        lengthMeters: runway.lengthMeters,
        operationsScheduled,
        operations: ops.map((op) => ({
          flightNumber: op.flightNumber,
          operationType: op.operationType,
          startTime: op.startTime,
          endTime: op.endTime,
        })),
        busyPeriods,
      };
    });

    const activeRunways = runways.filter((r) => r.operationsScheduled > 0).length;
    const totalScheduledOperations = schedule.length;

    const result = {
      runways,
      totalRunways: state.config.runways.length,
      activeRunways,
      scheduledOperations: totalScheduledOperations,
    };

    return {
      contents: [
        {
          uri: runwayAvailabilityUri,
          mimeType: "application/json",
          text: JSON.stringify(result),
        },
      ],
    };
  } catch {
    return {
      contents: [
        {
          uri: runwayAvailabilityUri,
          mimeType: "application/json",
          text: JSON.stringify({ runways: [], totalRunways: 0, activeRunways: 0, scheduledOperations: 0 }),
        },
      ],
    };
  }
}
