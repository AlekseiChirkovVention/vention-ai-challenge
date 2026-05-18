import { state } from "../state";

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

export const analyzeBottleneckSchema = {};

export async function analyzeBottleneckHandler(_params: Record<string, never>): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    if (state.lastScheduledAt === null || state.schedule.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ exists: false, reason: "No schedule generated yet" }),
          },
        ],
      };
    }

    const schedule = state.schedule;
    const opMap = new Map(schedule.map((op) => [op.flightNumber, op]));

    // Build adjacency: for each scheduled op with deps, dep → op
    // adjacency[dep] = list of ops that depend on dep (both scheduled)
    const adjacency = new Map<string, string[]>();
    for (const op of schedule) {
      for (const dep of op.dependsOn) {
        if (opMap.has(dep)) {
          const arr = adjacency.get(dep) ?? [];
          arr.push(op.flightNumber);
          adjacency.set(dep, arr);
        }
      }
    }

    // Find root nodes: scheduled ops with no deps in the scheduled set
    const roots = schedule.filter((op) => {
      return op.dependsOn.every((dep) => !opMap.has(dep));
    });

    let bestPath: string[] = [];
    let bestDuration = 0;

    // DFS from each root, tracking path and total duration
    for (const root of roots) {
      const stack: Array<{ fn: string; path: string[] }> = [
        { fn: root.flightNumber, path: [root.flightNumber] },
      ];
      while (stack.length > 0) {
        const { fn, path } = stack.pop()!;
        const op = opMap.get(fn)!;
        const firstOp = opMap.get(path[0]!)!;
        const duration = op.endTime - firstOp.startTime;

        const isBetter =
          path.length >= 2 &&
          (duration > bestDuration ||
            (duration === bestDuration && path[0]! < (bestPath[0] ?? "￿")));
        if (isBetter) {
          bestDuration = duration;
          bestPath = [...path];
        }

        const dependents = adjacency.get(fn) ?? [];
        for (const dep of dependents) {
          stack.push({ fn: dep, path: [...path, dep] });
        }
      }
    }

    if (bestPath.length < 2) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ exists: false, reason: "No dependency chains exist in the current schedule" }),
          },
        ],
      };
    }

    const chainDetails = bestPath.map((fn) => {
      const op = opMap.get(fn)!;
      return {
        flightNumber: op.flightNumber,
        startTime: op.startTime,
        endTime: op.endTime,
        operationType: op.operationType,
      };
    });

    const response = JSON.stringify({
      exists: true,
      chain: bestPath,
      totalDurationSeconds: bestDuration,
      totalDurationFormatted: formatDuration(bestDuration),
      chainDetails,
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
