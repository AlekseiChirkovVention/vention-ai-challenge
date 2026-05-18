---
trigger: model_decision
description: Workflow process reference — load when using any /phase-* or child workflow slash command.
---

# Workflow Process Reference

Canonical status formats (`## Phases`, subtask statuses) live in `.windsurf/rules/workflow-globals.md` (always-on). This file holds extended rationale and examples only.

## File Responsibility

**Parent task directory (`temp_docs/<task>/`):**
- `description.md` — task specification. Immutable after creation.
- `state.md` — current state, all decisions (including architectural), phase statuses, execution report, fix-tasks marker, `## Subtask Progress` (per-T-XX atomic execution/validation status).
- `plan.md` — decomposition only: subtask table (with `Key Steps` column), dependencies, execution strategy. No architectural decisions.

**Subtask directory (`T-XX-<slug>/`):**

Each T-XX directory contains exactly ONE file: `description.md`.

`description.md` structure (T-XX level):
```
## Goal
One sentence describing the done-state of this subtask.

## Context
Why this subtask exists, dependencies on other T-XX, constraints.

## Steps
Numbered implementation steps (3–15 items).
Each step must be atomic enough to verify but grouped by domain, not by file operation.

## Acceptance Criteria
Explicit, checkable conditions that define completion.
These are used verbatim during atomic-validation.
```

`plan.md` and `state.md` are NOT created at the T-XX level.
All progress tracking lives in the parent task's `state.md → ## Subtask Progress`.
All step listings live in the parent task's `plan.md` table (summary) and in `T-XX/description.md → ## Steps` (full).

## Parent `plan.md` Table Format

```
## Subtasks

| ID   | Name | Key Steps (summary)                              | Depends On | Status       |
|------|------|--------------------------------------------------|------------|--------------|
| T-01 | ...  | create variables.tf → terraform fmt → validate   | —          | not-started  |
| T-02 | ...  | ...                                              | T-01       | not-started  |
```

`Key Steps` — short inline list (separated by `→`) of the main steps of the subtask.
Example: `create variables.tf → terraform fmt → validate outputs`.
Detailed steps live in `T-XX/description.md → ## Steps`.

## Parent `state.md` — `## Subtask Progress` Format

One block per T-XX:

```
T-XX | <name> | atomic-execution: <status> | atomic-validation: <status>
  last_action: <one line — what was done last>
  blocker: <none | description of blocker>
  notes: <optional — key decisions or deviations>
```

Status values: `not-started` | `in-progress` | `complete` | `blocked` | `skipped` | `failed`.

## Status Lifecycle Notes

- `not-started` → `in-progress` when atomic-execution begins.
- `in-progress` → `done` when atomic-execution completes.
- `done` → `reviewed` when atomic-validation passes.
- `blocked` vs `deferred`: `blocked` is an external dependency issue (data, infra, upstream team); `deferred` is an explicit user decision to postpone.
- `not-reached` is set by `/pe-finalize` for subtasks present in `plan.md` but absent from `## Execution Report` (usually due to session interruption or earlier blocker).

## Key State-File Markers

Markers are read by orchestrators to determine continuation points:

- `## Task Analysis` — written by `/pd-analyze`.
- `## Subtask Progress` — written and updated by `/pae-implement`, `/pae-finalize`, `/pav-check`, `/pav-close`.
- `## Decomposition` with `decomposition: complete` — written by `/pd-decompose`.
- `## Solution Design` with `### Decision` — written by `/pd-design`.
- `## Execution Report` — written by `/pe-execute`, finalized by `/pe-finalize`.
- `## Contract Check` with optional `### Critical Failures Decision` — written by `/pv-contract`.
- `## Code Review`, `## Issue List` — written by `/pv-review`, `/pv-issues`.
- `## Fix-Tasks` with `fixes-created: complete [(0 tasks)]` — written by `/pv-create-fixes`.
- `## Deferred` — written by `/pv-finalize`.
