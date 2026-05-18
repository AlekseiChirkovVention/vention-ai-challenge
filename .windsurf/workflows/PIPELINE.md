---
description: Reference documentation — not an executable workflow. Contains full pipeline reference guide: file structure, phase steps, child workflow table, cycle examples.
---

# AI-Assisted SDLC Pipeline

Three-phase workflow system: Discovery → Execution → Validation.
Each phase is launched manually via slash command. To re-run a specific step, call its child workflow directly (see *Child Workflows* table below).
Global principles are defined in `.windsurf/rules/workflow-globals.md` (always-on rule).

---

## How to Pass Task Context

```
/workflow-name <path-to-description.md>
```

| What to pass | Format | Example |
|---|---|---|
| Top-level task | path to `description.md` | `temp_docs/task_foo/description.md` |
| Atomic subtask | path to T-XX `description.md` | `temp_docs/task_foo/T-01-slug/description.md` |
| Specific step | call the corresponding child workflow directly | `/pd-design temp_docs/task_foo/description.md` |

Path to `description.md` is the only required argument. If not provided — workflow stops and asks.
Task directory = parent directory of the provided `description.md`.

---

## File Structure

```
temp_docs/
  project_state.md                        # project-wide state
  task_<name>/
    description.md                        # task specification (immutable after creation)
    state.md                              # task state + all decisions + phase statuses
    plan.md                               # decomposition: T-XX table + dependencies + strategy
    T-XX-<slug>/
      description.md                      # atomic subtask specification
      state.md                            # atomic subtask state + decisions + phase statuses
      plan.md                             # implementation plan (steps + verification)
```

---

## Phase 1 — Discovery

```
/phase-discovery <path>              # full cycle (steps 0–4)
```

To run a single step, call its child workflow directly (e.g. `/pd-design <path>`).

| Step | Name | What it does |
|---|---|---|
| 0 | State check | Read state, determine continuation point |
| 1 | Task analysis | Analyze description, ask clarifying questions |
| 2 | Decomposition | Break into T-XX subtasks, create directories |
| 3 | Architectural design | Generate 2–3 variants, user decides |
| 4 | Finalization | Update files, compress, mark complete |

**Output:**
- `state.md` — Goal, Affected Parts, Solution Design, Off-limits, Invariants, Acceptance Criteria
- `plan.md` — T-XX table with statuses and dependencies
- `T-XX-<slug>/` directories with `description.md`, `state.md`, `plan.md`

---

## Phase 2 — Execution

```
/phase-execution <path>              # execute all pending subtasks
```

To run a single step, call its child workflow directly (e.g. `/pe-execute <path>`).

| Step | Name | What it does |
|---|---|---|
| 0 | State check | Verify discovery complete, find first incomplete subtask |
| 1 | Subtask execution | For each T-XX: atomic-discovery → atomic-execution → atomic-validation |
| 2 | Finalization | Summary report, update files, compress |

**Output:**
- Implemented functionality
- Task statuses in `plan.md` (`done` / `reviewed` / `blocked` / `deferred`)
- `## Progress` in each `T-XX-*/state.md`

---

## Phase 3 — Validation

```
/phase-validation <path>             # full validation
```

To run a single step, call its child workflow directly (e.g. `/pv-issues <path>`).

| Step | Name | What it does |
|---|---|---|
| 0 | State check | Verify execution complete |
| 1 | Contract verification | Check Invariants, Acceptance Criteria, Off-limits |
| 2 | Code review | Readability, security, edge cases |
| 3 | Issue list | Numbered list with priorities, wait for user |
| 4 | Create fix-tasks | New T-XX subtasks from approved issues |
| 5 | Execute fix-tasks | Atomic cycles for each fix-task |
| 6 | Finalization | Update files, compress, list deferred tasks |

**Output:**
- Fix-tasks created and executed
- Deferred tasks listed
- Clean, compressed state files

---

## Atomic Workflows

For each T-XX subtask. Launched automatically by `/phase-execution` and `/phase-validation`, or manually by user.

```
/phase-atomic-execution <T-XX-path>     # orchestrator: implement (reads T-XX/description.md)
/phase-atomic-validation <T-XX-path>    # orchestrator: validate + close
```

Note: Atomic discovery as a separate phase was removed. All per-subtask implementation detail (`## Steps`, `## Acceptance Criteria`) is produced in `T-XX/description.md` during parent `/pd-decompose` + `/pd-finalize`.

---

## Child Workflows (Direct Step Access)

Call any step directly without running the full phase.

| Slash command | Phase | Step |
|---|---|---|
| `/pd-analyze` | Discovery | 1 — Task analysis + codebase |
| `/pd-decompose` | Discovery | 2 — Decompose into T-XX |
| `/pd-design` | Discovery | 3 — Architectural design |
| `/pd-finalize` | Discovery | 4 — Finalize + compress |
| `/pe-execute` | Execution | 1 — Run atomic cycles |
| `/pe-finalize` | Execution | 2 — Summary + finalize |
| `/pv-contract` | Validation | 1 — Contract verification |
| `/pv-review` | Validation | 2 — Code review |
| `/pv-issues` | Validation | 3 — Issue list for user |
| `/pv-create-fixes` | Validation | 4 — Create fix-tasks |
| `/pv-execute-fixes` | Validation | 5 — Execute fix-tasks |
| `/pv-finalize` | Validation | 6 — Finalize |
| `/pae-implement` | Atomic Execution | 1 — Execute steps |
| `/pae-finalize` | Atomic Execution | 2 — Update statuses |
| `/pav-check` | Atomic Validation | 1 — Final check + verdict |
| `/pav-propose` | Atomic Validation | 2 — Improvement proposals |
| `/pav-close` | Atomic Validation | 3 — Close task |

---

## Utility

```
/compress-state [path]               # compress specific state file
/compress-state                      # compress project_state.md (default)
```

---

## Full Cycle Example

```
# PHASE 1 — DISCOVERY
/phase-discovery temp_docs/task_foo/description.md

# PHASE 2 — EXECUTION
/phase-execution temp_docs/task_foo/description.md

# PHASE 3 — VALIDATION
/phase-validation temp_docs/task_foo/description.md

# MANUAL ATOMIC (single T-XX):
/phase-atomic-execution   temp_docs/task_foo/T-01-slug/description.md
/phase-atomic-validation  temp_docs/task_foo/T-01-slug/description.md
```

---

## Quick Start

1. Create `temp_docs/task_foo/` directory with `description.md` describing the task.
2. Run `/phase-discovery temp_docs/task_foo/description.md`.
3. Run `/phase-execution temp_docs/task_foo/description.md`.
4. Run `/phase-validation temp_docs/task_foo/description.md`.
