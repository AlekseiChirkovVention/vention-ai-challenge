Path to T-XX/description.md: $ARGUMENTS

You are executing the **phase-atomic-execution** workflow — Atomic Execution orchestrator for a single T-XX subtask.

**Step 1 — Load global rules.**
Read `.windsurf/rules/workflow-globals.md` and apply ALL principles throughout this session.

**Step 2 — Execute workflow.**
Read `.windsurf/workflows/phase-atomic-execution.md` and follow ALL instructions exactly, using the path above as `<path-to-atomic-description>`.

**Step 3 — Child workflow calls.**
When the workflow instructs you to "call" a child command, read and follow its file from `.windsurf/workflows/<child-name>.md` as an inline step.

Child workflow files:
- `/pae-implement` → `.windsurf/workflows/pae-implement.md`
- `/pae-finalize` → `.windsurf/workflows/pae-finalize.md`
- `/compress-state` → `.windsurf/workflows/compress-state.md`
