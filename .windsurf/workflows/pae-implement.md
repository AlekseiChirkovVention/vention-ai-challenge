---
description: Atomic Execution Step 1 — Execute implementation steps from plan.md, verify each step
---

Invocation: `/pae-implement <path-to-atomic-description>`
Called by: `/phase-atomic-execution` as Step 1.

Atomic task directory = parent directory of the provided `description.md`.
Parent task directory = one level above.

---

## Guard

1. Read parent `state.md` (one level above atomic task directory). Locate the `## Subtask Progress` block for this T-XX.
2. If the block has `atomic-execution: complete` → **stop**: "Atomic execution phase is already complete. Re-running will overwrite the parent `## Subtask Progress` block for this T-XX. Confirm to proceed? (yes/no)" Wait for explicit confirmation.
3. Check `T-XX/description.md` exists and contains `## Steps` and `## Acceptance Criteria`. If missing → **stop**: "description.md is incomplete. Run `/pd-decompose` + `/pd-finalize` in the parent task."
4. Otherwise → continue.

---

## Pre-check

1. Read `T-XX/description.md` — extract: `## Goal`, `## Context`, `## Steps`, `## Acceptance Criteria`.
2. Read parent `state.md` — extract `## Solution Design → Decision`, `### Off-limits`, `### Invariants`.
3. Read parent `state.md → ## Subtask Progress` block for this T-XX (if present) — extract `last_action`, `blocker`, `notes`. Determine starting step from `last_action`.

Output scope summary before making any changes:
- **Task**: T-XX directory + Goal (from description.md).
- **Context**: from `## Context`.
- **Steps**: full list from `## Steps`. Mark starting point if continuing.
- **Scope / Off-limits**: inherited from parent `## Solution Design`.
- **Invariants**: constraints that must not be violated.

---

## Execute Steps

For each step from `## Steps` in `T-XX/description.md` (starting from determined point):

1. Read target file or check target directory before making changes.
2. Execute the action described by the step.
   - Do not refactor beyond what the step specifies.
   - Do not add functionality beyond parent `## Solution Design → Scope In`.
   - Follow existing code style.
3. Verify the step produced the expected effect (each step must be independently observable).
   - If verification passes → update parent `state.md → ## Subtask Progress` block for this T-XX: set `last_action: completed step N — <short description>`. Next step.
   - If verification fails → **stop immediately**. Update parent block: `blocker: step N failed — <what was observed>`. Report to user and wait.
4. If a blocker is discovered (unknown dependency, invariant conflict) → **stop**. Update parent block `blocker:` field. Describe and wait.

**Important**: Update the parent `## Subtask Progress` block after EVERY completed step, not just at the end. This ensures correct continuation if interrupted.

---

## Final Verification

After all steps from `## Steps` are done:

1. Check each Acceptance Criterion from `T-XX/description.md → ## Acceptance Criteria`: pass/fail.
2. Verify no parent `### Invariants` are violated.
3. Verify changes don't touch files outside parent `## Solution Design → Scope In`.

If any check fails → **stop**. Update parent `## Subtask Progress` block `blocker:` field. Report to user. Do not proceed to finalization.

On success, update the parent `## Subtask Progress` block for this T-XX:

```
T-XX | <name> | atomic-execution: complete | atomic-validation: <current>
  last_action: all steps complete — <one-sentence summary of what was implemented>
  blocker: none
  notes: <optional — deviations or out-of-scope observations>
```

If out-of-scope observations were found during execution, capture them in the `notes:` field (one short line, or a reference to a separate section in parent `state.md`).
