## Goal
A fully configured TypeScript project with all domain types defined and the config loader implemented, ready for logic modules to be built on top.

## Context
This is the foundational subtask. All other subtasks depend on the types and config produced here. The spec mandates strict TypeScript (`strict: true`, no `any`) and a specific project layout under `task_4/`. No existing code — greenfield.

## Steps
1. Run `npm init -y` inside `task_4/`, install runtime dep `@modelcontextprotocol/sdk` and dev deps `typescript @types/node ts-node`.
2. Create `tsconfig.json` with `target: ES2020`, `module: CommonJS`, `outDir: ./dist`, `rootDir: ./src`, `strict: true`, `esModuleInterop: true`, `skipLibCheck: true`, `resolveJsonModule: true`.
3. Update `package.json` with scripts (`build: tsc`, `start: node dist/index.js`, `dev: ts-node src/index.ts`) and `bin.atc-mcp: ./dist/index.js`.
4. Create `src/types.ts` and implement the three enums: `FlightPriority` (high/medium/low), `OperationType` (arrival/departure), `FlightStatus` (pending/scheduled/unscheduled/cancelled).
5. Implement interfaces `Flight`, `Runway`, `Gate`, and `ScheduledOperation` exactly as specified in spec §4.2.
6. Implement interfaces `AirportConfig`, `ScheduleResult`, `AirportState`, and `BottleneckResult` exactly as specified in spec §4.2.
7. Create `src/config.ts` and implement `loadConfig(): AirportConfig` — parse all required env vars (`RUNWAY_COUNT`, `RUNWAY_LENGTHS`, `GATE_COUNT`, `GROUND_CREW_COUNT`) with proper integer validation.
8. Parse all optional env vars with their defaults (all `SEC` vars and duration vars) per spec §5.1 table; validate non-negative / positive as per §5.2.
9. Collect ALL validation errors into an array before throwing a single combined error (never fail on first error).
10. Create `.env.example` with all variables shown per spec §5.4.
11. Run `npx tsc --noEmit` and verify zero compilation errors.

## Acceptance Criteria
- `npx tsc --noEmit` exits with code 0 (zero TypeScript errors).
- `src/types.ts` exports all required enums and interfaces matching the spec types exactly (names, fields, types).
- `loadConfig()` throws a single combined error listing all invalid vars when called with a bad environment.
- `loadConfig()` succeeds and returns correct defaults for all optional vars when only required vars are set.
- `.env.example` contains all 11 environment variables with correct example values.
