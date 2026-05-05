Path to task description.md: $ARGUMENTS

You are executing the **phase-execution** workflow — Phase 2 orchestrator.

**Step 1 — Load global rules.**
Read `.windsurf/rules/workflow-globals.md` and apply ALL principles throughout this session.

**Step 2 — Execute workflow.**
Read `.windsurf/workflows/phase-execution.md` and follow ALL instructions exactly, using the path above as `<path-to-description>`.

**Step 3 — Child workflow calls.**
When the workflow instructs you to "call" a child command, read and follow its file from `.windsurf/workflows/<child-name>.md` as an inline step.

Child workflow files:
- `/pe-execute` → `.windsurf/workflows/pe-execute.md`
- `/pe-finalize` → `.windsurf/workflows/pe-finalize.md`
- `/phase-atomic-execution` → `.windsurf/workflows/phase-atomic-execution.md`
- `/phase-atomic-validation` → `.windsurf/workflows/phase-atomic-validation.md`
- `/pae-implement` → `.windsurf/workflows/pae-implement.md`
- `/pae-finalize` → `.windsurf/workflows/pae-finalize.md`
- `/pav-check` → `.windsurf/workflows/pav-check.md`
- `/pav-propose` → `.windsurf/workflows/pav-propose.md`
- `/pav-close` → `.windsurf/workflows/pav-close.md`
- `/compress-state` → `.windsurf/workflows/compress-state.md`
