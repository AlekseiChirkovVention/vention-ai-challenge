---
description: Validation Step 2 — Code review: readability, architecture consistency, security, edge cases
---

Invocation: `/pv-review <path-to-description>`
Called by: `/phase-validation` as Step 2.

Task directory = parent directory of the provided `description.md`.

---

## Guard

1. Read `state.md` in the task directory.
2. Check `## Phases → validation`. If `complete` → **stop**: "Validation phase is already complete. Re-running will overwrite existing artifacts. Confirm to proceed? (yes/no)" Wait for explicit confirmation.
3. Check `## Contract Check` must be present. If missing → **stop**: "Step 1 (`/pv-contract`) must be completed first."
4. Check `### Critical Failures Decision` inside `## Contract Check`:
   - If critical Invariant/Off-limits failures exist and the decision field is absent → **stop**: "`/pv-contract` stopped at the critical-failure gate. Resolve it before running `/pv-review`."
   - If decision is `pause` → **stop**: "Validation is paused pending critical-failure fix. Do not run `/pv-review`."
   - If decision is `continue-marked` or no critical failures → continue.
5. Otherwise → continue.

---

## Instructions

1. Read `state.md` — extract `## Solution Design → Decision` for architectural context.
   If `### Critical Failures Decision: continue-marked` is recorded in `## Contract Check` — carry every failed Invariant/Off-limits entry into `### Findings` as a `critical` item (prefixed with `contract:`).
2. Read all files changed by T-XX subtasks (from their `state.md → Target Files`).
3. Review for:
   - **Readability and clarity** — naming, structure, comments where needed.
   - **Architectural consistency** — implementation matches chosen approach.
   - **Security vulnerabilities** — injection, access control, secret handling.
   - **Uncovered edge cases** — null values, empty collections, error paths, boundary conditions.
   - **Contract violations** — public interfaces changed unexpectedly.
4. Write to `state.md`:

```
## Code Review

### Findings
<numbered list: file, description, severity (critical / major / minor)>

### Summary
<overall assessment: count by severity>
```

5. Report: "Step 2 (Code Review) complete. N findings (X critical, Y major, Z minor)."
