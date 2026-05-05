---
description: Final pre-submit gate. Usage: /submit [path-to-spec.md]
---
**Input:** optional path to the task spec (e.g. `task-1/description.md`). If provided, re-read it now. Otherwise use the spec from the current `/task-cycle` context.

1. **Spec map**
   - List every requirement from the spec → which file/test satisfies it. Any gap → STOP.
2. **Green run**
   - Execute the task's test/validator command and paste output (must be green).
   - Compare output against the sample in the spec byte-for-byte.
3. **Repo hygiene**
   - `git status`: only intended files staged; no scratch/temp/venv/node_modules/.env.
   - Task README has: run command, dependencies, expected I/O.
4. **Commit & push**
   - One clear commit message: `task-N: <what>`.
   - Push.
5. **Log**
   - Update `project_state.md`: submitted task-N, timestamp, any known risk.
