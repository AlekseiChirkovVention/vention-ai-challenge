---
description: Atomic Validation Step 2 — Propose improvements, categorize, wait for user approval
---

Invocation: `/pav-propose <path-to-atomic-description>`
Called by: `/phase-atomic-validation` as Step 2. Only runs if verdict is DONE.

Atomic task directory = parent directory of the provided `description.md`.

---

## Guard

1. Read parent `state.md`. Locate the `## Subtask Progress` block for this T-XX.
2. If block has `atomic-validation: complete` → **stop**: "Atomic validation already complete. Confirm to proceed? (yes/no)" Wait for explicit confirmation.
3. Otherwise → continue.

---

## Pre-check

Read parent `state.md → ## Subtask Progress` block for this T-XX.
If `atomic-validation: failed` → **stop**: "Verdict is NEEDS WORK. Fix issues first."
Verify `last_action` was set to `pav-check DONE` by `/pav-check`.

---

## Instructions

1. Read files changed during execution (derived from parent `## Subtask Progress → last_action` / `notes`) with focus on quality.
2. Identify improvements with concrete measurable effect:
   - **Simplification**: unnecessary layers, abstractions.
   - **Duplication**: repeated code worth extracting.
   - **Performance**: with justification (what, where, why slow).
   - **Readability**: renaming, condition simplification.
   - **Robustness**: unhandled edge cases visible from implementation.

3. Categorize:
   - **Do Now**: high effect, low risk, within parent `## Solution Design → Scope In`.
   - **Do Later**: high effect but outside Scope In or needs separate planning.
   - **Optional**: low effect, discretionary.
   If improvement is outside Scope In → automatically **Do Later**, regardless of effect.
   If no improvements found → no proposals section is written.

4. If **Do Now** items exist → present to user and ask: "Apply improvements now or close task?"
   **Wait for approval.** Apply only approved Do Now items.

5. If proposals are non-empty, append to parent `state.md` a section `## Improvement Proposals (T-XX)`:

```
## Improvement Proposals (T-XX)

### Do Now
<list or "None">

### Do Later
<list or "None">

### Optional
<list or "None">
```

If any `Do Later` / `Optional` items exist, also mirror them as a one-line summary into the `notes:` field of the T-XX `## Subtask Progress` block.

6. Report: "Step 2 (Improvements) complete."
