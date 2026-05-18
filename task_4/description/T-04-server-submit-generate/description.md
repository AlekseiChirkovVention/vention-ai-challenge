## Goal
A running MCP server (`src/index.ts`) with stdio transport and two working tools (`submit_flight`, `generate_schedule`) that an MCP client can call successfully.

## Context
Depends on T-01 (types/config), T-02 (state), T-03 (scheduler). The server entry point must add a shebang (`#!/usr/bin/env node`) as the first line of the compiled output. All tool handlers must be wrapped in try/catch. Error responses use `{ isError: true, content: [{ type: "text", text: "..." }] }`. Spec §8 Tools 1 and 2, §13 anti-patterns.

## Steps
1. Create `src/index.ts`; import `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js` and `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js`.
2. Instantiate `McpServer` with name `"ATC MCP Server"` and version `"1.0.0"`; create `StdioServerTransport`; connect and start — verify server process starts without crashing.
3. Create `src/tools/submitFlight.ts`; define the input schema object matching spec §8 Tool 1.
4. Implement the `submitFlight` handler: validate `operationType` and `priority` are valid enum values; call `addFlight`; return success or error response per spec §8 Tool 1 examples.
5. Wrap handler body in try/catch; unexpected errors return `{ isError: true, content: [{ type: "text", text: "Internal error: ..." }] }`.
6. Register `submit_flight` tool in `index.ts` with its schema and handler.
7. Create `src/tools/generateSchedule.ts`; implement handler: call `buildSchedule(state.flights, state.config)` → `applyScheduleResult(result)`.
8. Format the generate_schedule response per spec §8 Tool 2: summary object with counts and formatted completionTime, scheduledFlights array, unscheduledFlights array.
9. Register `generate_schedule` tool in `index.ts`.
10. Run `npm run build`; confirm `dist/index.js` compiles with zero errors; add shebang `#!/usr/bin/env node` as first line (via a build step or direct edit check).

## Acceptance Criteria
- `npm run build` succeeds with zero TypeScript errors.
- `npm run start` (with valid env vars set) starts the process and does not crash on startup.
- An MCP client calling `submit_flight` with valid params receives a success response with flight details.
- Calling `submit_flight` with a duplicate `flightNumber` returns `isError: true` with a descriptive error message.
- Calling `generate_schedule` after submitting Scenario 1 flights returns a summary showing 4 scheduled, 0 unscheduled.
