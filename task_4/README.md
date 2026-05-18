# ATC MCP Server

An Air Traffic Control system exposed as a Model Context Protocol (MCP) server. Manages airport operations: submit flights, generate schedules, inspect state, cancel flights, and analyse scheduling bottlenecks.

## Installation

```bash
npm install
npm run build
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RUNWAY_COUNT` | Yes | — | Number of runways (positive integer) |
| `RUNWAY_LENGTHS` | Yes | — | Comma-separated runway lengths in meters, count must match RUNWAY_COUNT. E.g. `"3000,2800"` |
| `GATE_COUNT` | Yes | — | Number of gates (positive integer) |
| `GROUND_CREW_COUNT` | Yes | — | Number of ground crews (positive integer) |
| `SEPARATION_TAKEOFF_SEC` | No | `60` | Separation buffer between consecutive takeoffs on same runway (seconds) |
| `SEPARATION_LANDING_SEC` | No | `90` | Separation buffer between consecutive landings on same runway (seconds) |
| `SEPARATION_MIXED_SEC` | No | `120` | Separation buffer when switching between landing and takeoff on same runway (seconds) |
| `GATE_TURNAROUND_SEC` | No | `1800` | Gate occupancy duration per flight operation (seconds) |
| `DEPENDENCY_BUFFER_SEC` | No | `300` | Extra wait after dependency flight completes before dependent can start (seconds) |
| `MAX_HORIZON_SEC` | No | `86400` | Maximum scheduling window in seconds (24h default) |
| `ARRIVAL_DURATION_SEC` | No | `1800` | Duration of an arrival operation (seconds) |
| `DEPARTURE_DURATION_SEC` | No | `1800` | Duration of a departure operation (seconds) |

Copy `.env.example` and fill in the required values.

## Connecting from Claude Desktop / Claude Code

Add to your MCP client config (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "atc": {
      "command": "node",
      "args": ["/path/to/task_4/dist/index.js"],
      "env": {
        "RUNWAY_COUNT": "2",
        "RUNWAY_LENGTHS": "3000,2800",
        "GATE_COUNT": "5",
        "GROUND_CREW_COUNT": "8"
      }
    }
  }
}
```

For Claude Code, add to `.claude/settings.json` under `mcpServers`.

## Tools

### `submit_flight`
Submit a new arrival or departure flight to the queue.

**Required params:**
- `flightNumber` (string): Unique flight identifier, e.g. `"AA101"`
- `operationType` (string): `"arrival"` or `"departure"`
- `priority` (string): `"high"`, `"medium"`, or `"low"`

**Optional params:**
- `dependencies` (string[]): Flight numbers that must complete before this flight
- `requiredRunwayLength` (number): Minimum runway length in meters

### `generate_schedule`
Generate or refresh the airport schedule. No parameters. Replaces the current schedule with a freshly computed one.

### `get_status`
Get current airport operational status. No parameters. Returns flight counts, runway usage, gate usage, ground crew usage, and schedule metadata.

### `cancel_flight`
Cancel a flight and re-queue all dependent flights to PENDING status.

**Required params:**
- `flightNumber` (string): The flight to cancel

### `analyze_bottleneck`
Identify the longest dependency chain (critical path) in the current schedule. No parameters.

## Resources

### `atc://flights/queue`
The current flight queue including all flights in all statuses. Returns flights sorted by submission time with counts by status.

### `atc://runways/availability`
Runway configuration and current usage. Shows operations scheduled per runway, busy periods, and summary counts.

### `atc://schedule/timeline`
Chronological timeline of all scheduled operations. Sorted by start time. Includes formatted time strings and dependency notes.
