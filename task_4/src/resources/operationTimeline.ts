import { state } from "../state";

export const operationTimelineUri = "atc://schedule/timeline";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return `T+${parts.join(" ")}`;
}

export function operationTimelineHandler(): { contents: Array<{ uri: string; mimeType: string; text: string }> } {
  try {
    if (state.lastScheduledAt === null) {
      const result = {
        generated: false,
        lastGeneratedAt: null,
        completionTimeSeconds: null,
        operations: [],
      };
      return {
        contents: [{ uri: operationTimelineUri, mimeType: "application/json", text: JSON.stringify(result) }],
      };
    }

    const schedule = [...state.schedule].sort((a, b) => {
      if (a.startTime !== b.startTime) return a.startTime - b.startTime;
      return a.flightNumber.localeCompare(b.flightNumber);
    });

    const opMap = new Map(state.schedule.map((op) => [op.flightNumber, op]));
    const completionTime = schedule.length > 0 ? Math.max(...schedule.map((op) => op.endTime)) : 0;

    const operations = schedule.map((op, idx) => {
      let dependencyNote: string | null = null;
      if (op.dependsOn.length > 0) {
        // Use first scheduled dep for the note
        for (const dep of op.dependsOn) {
          const depOp = opMap.get(dep);
          if (depOp) {
            const depEndFormatted = formatTime(depOp.endTime);
            const bufMin = Math.floor(state.config.dependencyBuffer / 60);
            dependencyNote = `Waits for ${dep} (ends ${depEndFormatted}) + ${bufMin}m buffer`;
            break;
          }
        }
      }

      return {
        position: idx + 1,
        flightNumber: op.flightNumber,
        operationType: op.operationType,
        priority: op.priority,
        runwayId: op.runwayId,
        gateId: op.gateId,
        startTime: op.startTime,
        endTime: op.endTime,
        startTimeFormatted: formatTime(op.startTime),
        endTimeFormatted: formatTime(op.endTime),
        dependsOn: op.dependsOn,
        dependencyNote,
      };
    });

    const result = {
      generated: true,
      lastGeneratedAt: new Date(state.lastScheduledAt).toISOString(),
      completionTimeSeconds: completionTime,
      operations,
    };

    return {
      contents: [{ uri: operationTimelineUri, mimeType: "application/json", text: JSON.stringify(result) }],
    };
  } catch {
    return {
      contents: [
        {
          uri: operationTimelineUri,
          mimeType: "application/json",
          text: JSON.stringify({ generated: false, lastGeneratedAt: null, completionTimeSeconds: null, operations: [] }),
        },
      ],
    };
  }
}
