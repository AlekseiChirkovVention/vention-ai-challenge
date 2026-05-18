Path to task description.md: $ARGUMENTS

You are executing the **phase-pipeline** — a fully autonomous pipeline that runs Discovery → Execution → Validation in a single continuous session without manual phase transitions.

---

## Pipeline Overrides

These rules override the corresponding rules in `.windsurf/rules/workflow-globals.md` for this command only. All other global rules remain in full force.

| Overridden rule | Pipeline behavior |
|---|---|
| "Never auto-advance between phases" | **Auto-advance**: after each phase completes, continue to the next immediately. |
| "Architectural choice → present options, wait for user" | **Use Deep Architectural Analysis Protocol** (defined below) to decide independently. |
| "pv-issues → wait for user to approve/defer issues" | **Auto-decide**: fix all `critical` and `important` issues; defer `optional` ones. |
| "pav-propose → wait for user approval of Do Now items" | **Auto-apply** all `Do Now` improvements. `Do Later` / `Optional` → write to state, skip. |

**Escalate to user (pause and wait) ONLY when:**
- A hard blocker appears that cannot be resolved without external information (missing secret, unavailable external service, missing requirement with no reasonable default).
- A decision would change an external API contract already consumed by clients in a breaking way.
- Two or more variants score identically on all 5 lenses AND have fundamentally different user-visible trade-offs that cannot be resolved by the simplicity tie-breaker.
- Clarifying questions arise in `pd-analyze` about requirements that are genuinely ambiguous (ask them — wrong requirements waste all three phases).

All other ambiguities → resolve using the Deep Architectural Analysis Protocol.

---

## Deep Architectural Analysis Protocol

Use this whenever an architectural or design choice is required (replaces "present options, wait for user" in `pd-design` and at any ambiguous decision point during execution).

### Step 1 — Generate variants (2–3)
Same as standard `pd-design`: describe each variant with approach summary, advantages, disadvantages, risks.

### Step 2 — Score on 5 lenses (1–5, higher = better)

| Lens | Question to answer |
|---|---|
| **Simplicity** | How much new code, concepts, or abstractions does this add? Fewer = better. |
| **Reversibility** | How hard is it to change this decision later without breaking things? Easier = better. |
| **Codebase fit** | How well does it align with patterns, conventions, and abstractions already present in the repo? |
| **Testability** | How easy is it to write fast, deterministic, isolated tests for this? |
| **Blast radius** | How many existing files / modules need to change? Fewer = better. |

### Step 3 — Apply anti-overengineering filter
If the highest-scoring variant introduces an abstraction or pattern NOT already present in the codebase, verify it solves a *current, concrete* problem stated in the task description — not a hypothetical future one. If it only addresses a hypothetical, reduce its Simplicity score by 2 before totalling.

### Step 4 — Select winner
Highest total score wins. On a tie → the simpler variant wins (lowest Simplicity-score variant is eliminated). If still tied → the variant with best Codebase fit wins.

### Step 5 — Check escalation threshold
Apply the escalation conditions from "Pipeline Overrides" above. If escalation applies → pause, show the scored table, explain the blocker, wait for user. Otherwise continue.

### Step 6 — Document decision in `state.md`
Use the standard `## Solution Design` format, and add an `### Autonomous Decision` sub-section inside `## Solution Design`:

```
### Autonomous Decision
| Variant | Simplicity | Reversibility | Codebase fit | Testability | Blast radius | Total |
|---|---|---|---|---|---|---|
| Variant 1 | N | N | N | N | N | N |
| Variant 2 | N | N | N | N | N | N |

**Winner:** Variant X — <one-sentence rationale>
**Anti-overengineering check:** passed / adjusted (reason)
```

---

## Step 0 — Bootstrap

1. Read `.windsurf/rules/workflow-globals.md`. Apply ALL principles with the overrides above.
2. Verify `$ARGUMENTS` is provided. If not — ask the user for the path to `description.md` and stop.
3. Read `state.md` in the task directory (if it exists). Determine pipeline resume point from `## Phases`:
   - `discovery: not-started` or absent → start from Discovery.
   - `discovery: in-progress` → resume Discovery from last completed step.
   - `discovery: complete`, `execution: not-started` → skip to Execution.
   - `execution: in-progress` → resume Execution from first incomplete subtask.
   - `execution: complete`, `validation: not-started` → skip to Validation.
   - `validation: in-progress` → resume Validation from last completed step.
   - All three `complete` → report "Pipeline already complete." Stop.

Output resume point before proceeding:
```
Pipeline resume point: <Phase N — Step M / starting fresh>
```

---

## Phase 1 — Discovery

Read `.windsurf/rules/workflow-globals.md` continue/never-restart rules. Then execute child workflows in order, skipping completed steps as determined in Step 0.

**Child workflow files:**
- `/pd-analyze` → `.windsurf/workflows/pd-analyze.md`
- `/pd-decompose` → `.windsurf/workflows/pd-decompose.md`
- `/pd-design` → `.windsurf/workflows/pd-design.md`
- `/pd-finalize` → `.windsurf/workflows/pd-finalize.md`
- `/compress-state` → `.windsurf/workflows/compress-state.md`

**Execution:**
1. Read and follow `pd-analyze.md` inline.
   - Clarifying questions about requirements → **ask, wait for answers** (requirements must be correct).
2. Read and follow `pd-decompose.md` inline.
3. Read and follow `pd-design.md` inline, **replacing** the "present variants, wait for user choice" step with the **Deep Architectural Analysis Protocol** above.
4. Read and follow `pd-finalize.md` inline.

After Discovery completes, output:
```
─── DISCOVERY COMPLETE ──────────────────────────────────────
Architecture: <one-line summary of chosen approach>
Subtasks: <N> × T-XX
Auto-advancing to Phase 2 — Execution…
─────────────────────────────────────────────────────────────
```

---

## Phase 2 — Execution

Read and follow `.windsurf/workflows/phase-execution.md` inline.

**Child workflow files:**
- `/pe-execute` → `.windsurf/workflows/pe-execute.md`
- `/pe-finalize` → `.windsurf/workflows/pe-finalize.md`
- `/phase-atomic-execution` → `.windsurf/workflows/phase-atomic-execution.md`
- `/phase-atomic-validation` → `.windsurf/workflows/phase-atomic-validation.md`
- `/pae-implement` → `.windsurf/workflows/pae-implement.md`
- `/pae-finalize` → `.windsurf/workflows/pae-finalize.md`
- `/pav-check` → `.windsurf/workflows/pav-check.md`
- `/pav-propose` → `.windsurf/workflows/pav-propose.md`
- `/pav-close` → `.windsurf/workflows/pav-close.md`
- `/compress-state` → `.windsurf/workflows/compress-state.md`

**Execution overrides during this phase:**
- At any ambiguous situation that is NOT a hard blocker → apply the **Deep Architectural Analysis Protocol** and decide independently. Document decision in the T-XX `## Subtask Progress → notes` field.
- Hard blockers (missing external info, invariant conflict with no valid resolution) → escalate per the escalation threshold above.
- `pav-propose` "Do Now" items → apply automatically. `Do Later` / `Optional` → record in state, skip.

After Execution completes, output:
```
─── EXECUTION COMPLETE ──────────────────────────────────────
Completed: <N> subtasks
Blocked / deferred: <M> subtasks
Auto-advancing to Phase 3 — Validation…
─────────────────────────────────────────────────────────────
```

---

## Phase 3 — Validation

Read and follow `.windsurf/workflows/phase-validation.md` inline.

**Child workflow files:**
- `/pv-contract` → `.windsurf/workflows/pv-contract.md`
- `/pv-review` → `.windsurf/workflows/pv-review.md`
- `/pv-issues` → `.windsurf/workflows/pv-issues.md`
- `/pv-create-fixes` → `.windsurf/workflows/pv-create-fixes.md`
- `/pv-execute-fixes` → `.windsurf/workflows/pv-execute-fixes.md`
- `/pv-finalize` → `.windsurf/workflows/pv-finalize.md`
- `/phase-atomic-execution` → `.windsurf/workflows/phase-atomic-execution.md`
- `/phase-atomic-validation` → `.windsurf/workflows/phase-atomic-validation.md`
- `/pae-implement` → `.windsurf/workflows/pae-implement.md`
- `/pae-finalize` → `.windsurf/workflows/pae-finalize.md`
- `/pav-check` → `.windsurf/workflows/pav-check.md`
- `/pav-propose` → `.windsurf/workflows/pav-propose.md`
- `/pav-close` → `.windsurf/workflows/pav-close.md`
- `/compress-state` → `.windsurf/workflows/compress-state.md`

**Execution overrides during this phase:**
- `pv-issues` "wait for user" step → **skip the wait**. Instead, automatically approve all `critical` and `important` issues as fix-tasks. Automatically defer all `optional` issues. Write the `## Issue List → Approved / Deferred` sections accordingly.
- `pav-propose` "Do Now" approval → same as Execution phase: auto-apply.

---

## Final Report

After all three phases complete, output:

```
═══ PIPELINE COMPLETE ═══════════════════════════════════════
Task: <path to description.md>

Discovery:  complete — <architecture one-liner>
Execution:  <N> subtasks complete, <M> blocked/deferred
Validation: <N> issues found → <N_fix> fixed, <N_defer> deferred

State:  <path>/state.md
Plan:   <path>/plan.md
═════════════════════════════════════════════════════════════
```

---

## Interruption Recovery

If the pipeline is interrupted mid-run, re-run `/phase-pipeline <same-path>`. Step 0 will read `state.md`, identify the resume point from `## Phases` and `## Subtask Progress`, and continue from exactly where work stopped.
