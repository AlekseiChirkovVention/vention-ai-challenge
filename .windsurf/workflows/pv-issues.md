---
description: Validation Step 3 — Compile numbered issue list with priorities, present to user, wait for decision
---

Invocation: `/pv-issues <path-to-description>`
Called by: `/phase-validation` as Step 3.

Task directory = parent directory of the provided `description.md`.

---

## Guard

1. Read `state.md` in the task directory.
2. Check `## Phases → validation`. If `complete` → **stop**: "Validation phase is already complete. Re-running will overwrite existing artifacts. Confirm to proceed? (yes/no)" Wait for explicit confirmation.
3. Check `## Code Review` present in `state.md`. If missing → **stop**: "Step 2 (/pv-review) must be completed first. Run /pv-review <path>."
4. Otherwise → continue.

---

## Instructions

1. Read `state.md` — extract `## Contract Check` and `## Code Review`.
2. Compile all findings into a single numbered list. For each item:

```
[N]. <Task name>
     Problem: <what is wrong or can be improved>
     Solution: <what specifically to do>
     Priority: critical | important | optional
```

3. Present the full list to the user.
4. **Wait for user's response**: which tasks to fix now, which to defer.
5. Write to `state.md`:

```
## Issue List

### Approved
<list of approved issue numbers with descriptions>

### Deferred
<list of deferred issue numbers with reasons>
```

6. Report: "Step 3 (Issue List) complete. N approved for fix, M deferred."
