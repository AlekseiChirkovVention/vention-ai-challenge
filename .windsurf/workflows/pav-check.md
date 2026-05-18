---
description: Atomic Validation Step 1 — Final check against DoD, find bugs, determine verdict
---

Invocation: `/pav-check <path-to-atomic-description>`
Called by: `/phase-atomic-validation` as Step 1.

Atomic task directory = parent directory of the provided `description.md`.
Parent task directory = one level above.

---

## Guard

1. Read parent `state.md`. Locate the `## Subtask Progress` block for this T-XX.
2. If block has `atomic-validation: complete` → **stop**: "Atomic validation already complete. Re-running will overwrite the parent block. Confirm to proceed? (yes/no)" Wait for explicit confirmation.
3. If `atomic-execution` is not `complete` in the block → **stop**: "Atomic execution must be completed first. Run /phase-atomic-execution <path>."
4. Otherwise → continue.

---

## Instructions

1. Read `T-XX/description.md` — extract `## Goal`, `## Acceptance Criteria`.
2. Read parent `state.md` — extract `## Solution Design → Decision`, `### Off-limits`, `### Invariants`.
3. Read parent `state.md → ## Subtask Progress` block for this T-XX — extract `last_action`, `notes` for context on what was implemented.
4. Read the files that were changed (derived from `last_action` / `notes`; if unclear — ask the user) with focus on behavior.

**Check completeness:**
- Each Acceptance Criterion from `T-XX/description.md`: met / not met / partial. Mark `[INCOMPLETE]` if not fully met.

**Find bugs** in changed files:
- **Edge cases**: null values, empty collections, repeated calls.
- **Error handling**: all error paths explicitly handled, no silent swallowing.
- **Interface contracts**: public interfaces in changed files respected.
- **Approach consistency**: implementation matches parent `## Solution Design → Decision`.
- **Invariants**: none violated.

For each bug: file, description, reproducible scenario, severity (`[CRITICAL]` / `[MAJOR]` / `[MINOR]`).

**Verdict:**
- **DONE**: all criteria met, no `[CRITICAL]` or `[MAJOR]` bugs.
- **NEEDS WORK**: has `[INCOMPLETE]`, `[CRITICAL]`, or `[MAJOR]` bugs.

Record the verdict in the parent `state.md → ## Subtask Progress` block for this T-XX:

- On **DONE**: do NOT mark `atomic-validation: complete` yet (that happens in `/pav-close`). Update `last_action: pav-check DONE` and preserve `notes`.
- On **NEEDS WORK**: set `atomic-validation: failed`, and in `notes:` list the specific Acceptance Criteria that were not met, plus `[CRITICAL]` / `[MAJOR]` bug summary. Do NOT create fix-tasks automatically — surface findings to the user first.

**If NEEDS WORK** → present the list of unmet criteria and bugs to the user. **Stop.** Do not proceed to Step 2.

Report: "Step 1 (Final Check) complete. Verdict: DONE / NEEDS WORK."
