Arguments (optional path and/or --auto flag): $ARGUMENTS

You are executing the **compress-state** utility workflow — clean and compress state files.

Read `.windsurf/workflows/compress-state.md` and follow ALL instructions exactly.

Argument parsing:
- If `$ARGUMENTS` contains `--auto` → apply compression without asking for confirmation (skip Step 2 wait).
- If `$ARGUMENTS` contains a file path → use that as the target file.
- If no path provided → use `temp_docs/project_state.md` as default target.

Protected sections that must NEVER be removed: `## Phases`, `## Task Analysis`, `## Decomposition`, `## Solution Design`, `## Subtask Progress`, `## Execution Report`, `## Contract Check`, `## Code Review`, `## Issue List`, `## Fix-Tasks`, `## Deferred`, and task statuses in `plan.md`.
