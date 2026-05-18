---
description: Discovery Step 3 — Generate 2-3 architectural variants, present to user, record decision
---

Invocation: `/pd-design <path-to-description>`
Called by: `/phase-discovery` as Step 3.

Task directory = parent directory of the provided `description.md`.

---

## Guard

1. Read `state.md` in the task directory. If it does not exist or `## Task Analysis` section is missing → **stop**: "Step 1 (Task Analysis) must be completed first. Run `/pd-analyze <path>`." Do not continue.
2. Verify that decomposition has been performed: `## Decomposition` section with `decomposition: complete` must be present in `state.md`, and at least one T-XX subdirectory must exist in the task directory. If either is missing → **stop**: "Step 2 (Decomposition) must be completed first. Run `/pd-decompose <path>`." Do not continue.
3. Check `## Phases → discovery`. If `complete` → **stop**: "Discovery phase is already complete. Re-running will overwrite existing artifacts. Confirm to proceed? (yes/no)" Wait for explicit confirmation.
4. Otherwise → continue.

---

## Instructions

1. Read `state.md` in the task directory — use `## Task Analysis` and `### Codebase Analysis` as input.
2. Read `plan.md` — understand the subtask decomposition.
3. Generate 2–3 architectural approach variants for the task.
4. For each variant describe: approach summary, advantages, disadvantages, risks.
5. Present all variants to the user. **Wait for their choice. Do not choose independently.**
6. After user decides, add to `state.md`:

```
## Solution Design

### Variants
<all variants with pros/cons/risks>

### Decision
<chosen approach and rationale>

### Rejected
<rejected variants with reasons for rejection>

### Off-limits
<what must not be violated under any circumstances>

### Invariants
<system invariants that must hold throughout implementation>

### Acceptance Criteria
<measurable criteria for the entire task completion>
```

7. Report: "Step 3 (Architectural Design) complete. Decision recorded."
