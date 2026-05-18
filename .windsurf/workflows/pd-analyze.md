---
description: Discovery Step 1 — Analyze task and codebase, ask clarifying questions
---

Invocation: `/pd-analyze <path-to-description>`
Called by: `/phase-discovery` as Step 1.

Task directory = parent directory of the provided `description.md`.

---

## Guard

1. Read `state.md` in the task directory.
2. Check `## Phases → discovery`. If `complete` → **stop**: "Discovery phase is already complete. Re-running will overwrite existing artifacts. Confirm to proceed? (yes/no)" Wait for explicit confirmation.
3. Otherwise → continue.

---

## Instructions

1. Read `description.md` fully.
2. Read `temp_docs/project_state.md` if it exists — extract relevant project context.
3. If there are ambiguities or unclear requirements — ask clarifying questions.
   **Wait for answers before continuing.**
4. Analyze the codebase parts relevant to the task (read key files, understand structure).
5. Write to `state.md` in the task directory:

```
## Phases
- discovery: in-progress
- execution: not-started
- validation: not-started

## Task Analysis

### Goal
<one paragraph: what needs to be achieved>

### Affected Parts
<list: which parts of the system are affected and how>

### Codebase Analysis
<key findings from the codebase relevant to the task>

### Open Questions
<resolved questions and answers, or "None">
```

6. Report: "Step 1 (Task Analysis) complete."
