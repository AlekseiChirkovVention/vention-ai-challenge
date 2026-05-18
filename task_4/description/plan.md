## Subtasks

| ID   | Name                         | Key Steps (summary)                                                                                 | Depends On   | Status      |
|------|------------------------------|-----------------------------------------------------------------------------------------------------|--------------|-------------|
| T-01 | Scaffolding, Types & Config  | npm init + deps → tsconfig + package.json → types.ts (enums + interfaces) → config.ts (loadConfig) → .env.example → tsc verify | —            | reviewed |
| T-02 | State Module                 | state singleton → addFlight (uniqueness + deps + self-cycle + hasCycle DFS) → cancelFlight (cascade) → applyScheduleResult → resetState | T-01         | reviewed |
| T-03 | Scheduler                    | helpers (getSeparation, getDuration) → Phase1 filter → Phase2 topo-sort (Kahn's + priority queue) → Phase3 greedy (runway sep + gate + crew sweep-line) → Phase4 collect results | T-01         | reviewed |
| T-04 | MCP Server + submit + generate | index.ts (McpServer + stdio) → submitFlight handler + schema → generateSchedule handler → register both → build verify | T-01, T-02, T-03 | reviewed |
| T-05 | Remaining Tools              | getStatus (counts + runway + gate + crew + schedule meta) → cancelFlight handler → analyzeBottleneck (critical path DFS) → register all 3 | T-04         | reviewed |
| T-06 | Resources                    | flightQueue resource → runwayAvailability resource → operationTimeline resource (time formatting + depNotes) → register all 3 | T-04         | reviewed |
| T-07 | Validation & Docs            | build verify → run 5 scenarios → fix any bugs → README.md → report.md                              | T-05, T-06   | reviewed |

| T-08 | Fix gate re-check after crew advance | Re-verify gate availability after findCrewSlot advances startTime in scheduler.ts Phase 3 | T-07 | reviewed |
| T-09 | Fix crew event tie-breaking | Sort eventsInWindow by (time, delta) in isCrewSlotFeasible | T-07 | reviewed |
| T-10 | Fix index.ts type casts | Replace `as Parameters<...>` casts with properly typed tool registrations | T-07 | reviewed |
| T-11 | Fix cancelFlight staleness | Set state.lastScheduledAt = null in cancelFlight | T-07 | reviewed |
| T-12 | Fix bottleneck tie-breaking | Use lexicographic first-flight tie-break for equal-duration chains | T-07 | reviewed |

## Execution Strategy
- **T-01** first: unblocks everything else.
- **T-02 and T-03** can run in parallel after T-01 (T-03 only imports from types.ts, not state.ts).
- **T-04** requires T-01 + T-02 + T-03 all complete.
- **T-05 and T-06** can run in parallel after T-04.
- **T-07** last: requires all tools and resources complete.
- Critical path: T-01 → T-02 → T-04 → T-05 → T-07 (or T-01 → T-03 → T-04 → T-06 → T-07).
- The scheduler (T-03) is the most complex module and should be allocated the most time.
