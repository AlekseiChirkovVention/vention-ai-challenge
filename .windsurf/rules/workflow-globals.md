---
trigger: always_on
---

# Workflow Global Principles

These rules govern ALL phase workflows (`/phase-discovery`, `/phase-execution`, `/phase-validation` and their atomic counterparts) without exception.

**Never auto-advance between phases.** After completing a phase (`/phase-discovery`, `/phase-execution`, `/phase-validation`), STOP completely. Do NOT invoke the next phase command. Display the next command as plain text for the user to run manually. Phase transitions are always initiated by the user, never by Claude.

**Continue, never restart.** Before any workflow, read state files. If progress exists — continue from stopping point. Never restart from scratch.

**Wait for user decisions.** Architectural / technical / ambiguous choice → present 2–3 options with trade-offs, wait for user decision. Never decide independently in ambiguous situations.

**Trust mechanism in execution.**
- Trivial task (clear plan, no dependencies, no ambiguity) → execute autonomously without stopping.
- Non-trivial task (ambiguity, architectural choice, Off-limits risk, blocker) → stop immediately, describe the problem, propose 2–3 options with trade-offs, wait for user decision.
- AI evaluates triviality based on the plan from atomic-discovery. Any doubt → treat as non-trivial.
- Number of stops is unlimited: an extra stop is always better than a silent wrong decision.

**Strict adherence to artifacts.** Execution at any level follows the plan and architecture from the corresponding Discovery exactly. No deviations.

**File updates after each phase.** After completing any phase, update relevant state/plan files and run `/compress-state --auto`. Only update files relevant to the completed phase. Current phase status must always be present in `state.md`.

**Direct child-workflow invocation for partial reruns.** To re-run a specific step, call its child workflow directly (for example `/pd-analyze`, `/pae-implement`). There is no `--step=N` flag. Each child workflow has a `## Guard` section that detects already-completed work and asks for explicit confirmation before overwriting.

---

## Canonical Status Formats

These formats are the contract between all workflows. Do not rename, reformat, or extend them without updating every workflow that reads them.

**Top-level task `state.md`:**
```
## Phases
- discovery: not-started | in-progress | complete
- execution: not-started | in-progress | complete
- validation: not-started | in-progress | complete
```

**Parent `state.md` → `## Subtask Progress` (one block per T-XX):**
```
T-XX | <name> | atomic-execution: <status> | atomic-validation: <status>
  last_action: <one line — what was done last>
  blocker: <none | description of blocker>
  notes: <optional — key decisions or deviations>
```

Status values for atomic-execution / atomic-validation: `not-started` | `in-progress` | `complete` | `blocked` | `skipped` | `failed`.

T-XX subdirectories no longer contain their own `state.md` or `plan.md`. All atomic-level progress lives in the parent task's `state.md → ## Subtask Progress`.

**Subtask statuses in `plan.md`:**

| Status | Meaning |
|---|---|
| `not-started` | Not started |
| `in-progress` | In progress |
| `done` | Execution complete, validation not started |
| `reviewed` | Validation passed, task closed |
| `deferred` | Postponed by decision after phase-validation |
| `blocked` | External blocker not dependent on code |
| `not-reached` | Execution finished without reaching this subtask |

Extended examples, file-role rationale → `.windsurf/rules/workflow-reference.md`.

---

## Decomposition Rules

A subtask (T-XX) must represent a logical unit of work, not an individual operation.

Criteria for a valid subtask:
- Groups related operations around a single domain or module
  (e.g., "Terraform staging module" — NOT "create variables.tf" + "create outputs.tf" as separate tasks)
- Contains between 3 and 15 implementation steps internally
- Is independently verifiable (has a clear done-state)
- Is NOT split by operation type (create / configure / validate must live together inside one subtask)

Decomposition limits:
- Maximum 8 subtasks per task
- If natural decomposition produces more than 8 — merge the smallest related ones
- If a candidate subtask has fewer than 3 steps — absorb it into its closest neighbor

These rules apply strictly during `/pd-decompose` and must be enforced before `/pd-finalize` runs.

---

## Legacy tasks

Legacy tasks (`temp_docs/task2_*`, `temp_docs/task3_*`) follow the pre-refactor structure (with `T-XX/state.md` and `T-XX/plan.md`) and are exempt from these rules.
