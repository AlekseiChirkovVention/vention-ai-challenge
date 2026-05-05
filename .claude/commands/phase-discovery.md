Path to task description.md: $ARGUMENTS

You are executing the **phase-discovery** workflow — Phase 1 orchestrator.

**Step 1 — Load global rules.**
Read `.windsurf/rules/workflow-globals.md` and apply ALL principles throughout this session (continue/never-restart, wait for user on ambiguity, trust mechanism, strict adherence to artifacts, file updates after each phase).

**Step 2 — Execute workflow.**
Read `.windsurf/workflows/phase-discovery.md` and follow ALL instructions exactly, using the path above as `<path-to-description>`.

**Step 3 — Child workflow calls.**
When the workflow instructs you to "call" a child command (e.g. `/pd-analyze <path>`), read and follow that child's workflow file from `.windsurf/workflows/<child-name>.md` as an inline step — do not stop and ask the user to run a separate command.

Child workflow files:
- `/pd-analyze` → `.windsurf/workflows/pd-analyze.md`
- `/pd-decompose` → `.windsurf/workflows/pd-decompose.md`
- `/pd-design` → `.windsurf/workflows/pd-design.md`
- `/pd-finalize` → `.windsurf/workflows/pd-finalize.md`
- `/compress-state` → `.windsurf/workflows/compress-state.md`
