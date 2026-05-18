import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { submitFlightSchema, submitFlightHandler } from "./tools/submitFlight";
import { generateScheduleSchema, generateScheduleHandler } from "./tools/generateSchedule";
import { getStatusSchema, getStatusHandler } from "./tools/getStatus";
import { cancelFlightSchema, cancelFlightHandler } from "./tools/cancelFlight";
import { analyzeBottleneckSchema, analyzeBottleneckHandler } from "./tools/analyzeBottleneck";
import { flightQueueUri, flightQueueHandler } from "./resources/flightQueue";
import { runwayAvailabilityUri, runwayAvailabilityHandler } from "./resources/runwayAvailability";
import { operationTimelineUri, operationTimelineHandler } from "./resources/operationTimeline";

const server = new McpServer({
  name: "ATC MCP Server",
  version: "1.0.0",
});

// Tools
server.tool(
  "submit_flight",
  "Submit a new arrival or departure flight to the airport queue.",
  submitFlightSchema,
  async (params) => submitFlightHandler(params)
);

server.tool(
  "generate_schedule",
  "Generate or refresh the airport schedule.",
  generateScheduleSchema,
  async (_params) => generateScheduleHandler(_params)
);

server.tool(
  "get_status",
  "Get current airport operational status including resource usage, flight counts, and schedule completion time.",
  getStatusSchema,
  async (_params) => getStatusHandler(_params)
);

server.tool(
  "cancel_flight",
  "Cancel a flight and re-evaluate all flights that depended on it.",
  cancelFlightSchema,
  async (params) => cancelFlightHandler(params)
);

server.tool(
  "analyze_bottleneck",
  "Identify the longest dependency chain (critical path) in the current schedule.",
  analyzeBottleneckSchema,
  async (_params) => analyzeBottleneckHandler(_params)
);

// Resources
server.resource(
  "Flight Queue",
  flightQueueUri,
  { mimeType: "application/json" },
  () => flightQueueHandler()
);

server.resource(
  "Runway Availability",
  runwayAvailabilityUri,
  { mimeType: "application/json" },
  () => runwayAvailabilityHandler()
);

server.resource(
  "Operation Timeline",
  operationTimelineUri,
  { mimeType: "application/json" },
  () => operationTimelineHandler()
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
