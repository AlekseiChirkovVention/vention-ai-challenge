---
description: Validation Step 1 — Verify implementation against Invariants, Acceptance Criteria, Off-limits
---

Invocation: `/pv-contract <path-to-description>`
Called by: `/phase-validation` as Step 1.

Task directory = parent directory of the provided `description.md`.

---

## Guard

1. Read `state.md` in the task directory.
2. Check `## Phases → validation`. If `complete` → **stop**: "Validation phase is already complete. Re-running will overwrite existing artifacts. Confirm to proceed? (yes/no)" Wait for explicit confirmation.
3. Otherwise → continue.

---

## Instructions

1. Read `state.md` — extract `## Solution Design`: `### Invariants`, `### Acceptance Criteria`, `### Off-limits`.
2. Read all implementation files referenced in T-XX subtask `state.md` files (`### Target Files`).
3. For each Invariant: verify it holds. Record pass/fail with reason.
4. For each Acceptance Criterion: verify it is met. Record pass/fail with reason.
5. For each Off-limits constraint: verify it is not violated. Record pass/fail with reason.
6. Write to `state.md`:

```
## Contract Check

### Invariants
| Invariant | Status |
|-----------|--------|
| <name> | PASS / FAIL: <reason> |

### Acceptance Criteria
| Criterion | Status |
|-----------|--------|
| <name> | PASS / FAIL: <reason> |

### Off-limits
| Constraint | Status |
|------------|--------|
| <name> | PASS / FAIL: <reason> |
```

7. **Critical-failure stop gate.** If at least one Invariant or Off-limits entry has status `FAIL` — **stop immediately** before yielding back to the orchestrator or `/pv-review`:
   - List all critical failures (Invariant / Off-limits) with reasons.
   - Ask the user: "Critical contract failures detected. Choose: (1) pause validation and fix now, (2) continue review with these failures marked `critical` in the issue list."
   - Wait for explicit user decision. Do not proceed to `/pv-review` or any subsequent step until an answer is received.
   - Record the chosen decision in `state.md` as `### Critical Failures Decision: <pause | continue-marked>`.

   Acceptance Criteria failures do not trigger the gate — they are batched for `/pv-issues` as usual.

8. Report: "Step 1 (Contract Verification) complete. N passes, M failures (K critical)."
