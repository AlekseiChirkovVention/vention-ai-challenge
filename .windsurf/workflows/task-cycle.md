---
description: Start-to-MVP cycle for a single AI Challenge task. Usage: /task-cycle <path-to-spec.md>
---
**Input:** path to a spec file (e.g. `task-1/description.md`, `task-2/bugs.md`). If missing → ask the user for it and stop.

1. **Sync**
   - Read the provided spec file in full. Infer task folder from its path (`task-N/`).
   - Post 4 bullets in chat: input, output, constraints, scoring/bonus (or: bug summary, repro, expected vs actual, affected files — if the spec is a bug report).
2. **Plan**
   - Lock approach (1–2 sentences) and list ≤3 concrete steps.
   - Identify the validator (sample I/O, test cmd, or manual check). For bug files: the failing case becomes the validator.
3. **Implement**
   - Ship MVP / minimal fix in one pass; run the validator immediately.
   - Fix only real failures; no scope creep beyond the spec.
4. **Edge pass**
   - Check empty/max/invalid inputs and output format (exact bytes).
   - For bugs: also run the full existing test suite to catch regressions.
5. **Handoff**
   - If stopping mid-task: log status + next step in `project_state.md`.
   - If complete: run `/submit`.
