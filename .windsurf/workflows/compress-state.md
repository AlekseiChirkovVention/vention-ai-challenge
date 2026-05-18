---
description: Clean and compress state files — remove stale content, keep only what is current and accurate
---

Invocation: `/compress-state [path]`
Examples:
- `/compress-state` — compress `temp_docs/project_state.md` (default)
- `/compress-state temp_docs/task_foo/state.md` — compress specific file
- `/compress-state --auto temp_docs/task_foo/T-01-slug/state.md` — skip confirmation

---

## Step 0 — Read Input

1. Determine target file:
   - If path provided → use it.
   - Otherwise → `temp_docs/project_state.md`.
2. Read target file fully.
3. If target is `project_state.md` → also read all `state.md` files in task directories for context.
4. If target file does not exist → report and **stop**.

---

## Step 1 — Audit Content

Classify each section:

1. **Current** — describes active state, decisions, constraints. Keep unchanged.
2. **Stale** — describes what already changed: old decisions, completed phases, removed components. Mark `[STALE]`.
3. **Duplicate** — already present elsewhere in the same file without added value. Mark `[DUPLICATE]`.
4. **Inaccurate** — contradicts actual state. Mark `[INACCURATE]`.
5. **Verbose** — intermediate reasoning where only the conclusion matters. Mark `[VERBOSE]`.

Output list of all findings. If none: "File is current, no compression needed."

---

## Step 2 — Confirm Changes

Output plan: what will be removed, shortened, corrected, or kept.

If `--auto` flag is present → proceed to Step 3 immediately without waiting.
Otherwise → **wait for user confirmation**.

---

## Step 3 — Apply Compression

1. **Remove** `[STALE]` and `[DUPLICATE]` sections.
2. **Correct** `[INACCURATE]` sections to match actual state.
3. **Shorten** `[VERBOSE]` sections: keep conclusions, remove reasoning path.
4. **Preserve structure**: do not rename section headers used by other workflows.
5. **Do not add** new content — only clean and compress.

**Protected sections — never remove, rename, or summarize during compression:**
- `## Phases` (top-level and atomic)
- `## Task Analysis`
- `## Decomposition` (including `decomposition: complete` marker)
- `## Solution Design` (Invariants, Off-limits, Acceptance Criteria, Decision)
- `## Subtask Progress`
- `## Execution Report`
- `## Contract Check` (including `### Critical Failures Decision`)
- `## Code Review`
- `## Issue List`
- `## Fix-Tasks` (including `fixes-created` marker)
- `## Deferred`
- Task statuses in `plan.md` (`## Subtasks` table)

These sections are contracts read by orchestrators to determine continuation points. Removing or renaming any of them breaks phase/step detection. Inside a protected section, stale bullet points may be shortened, but headers and marker lines must remain verbatim.

---

## Step 4 — Verify Result

1. Confirm all sections referenced by workflows are still present.
2. Output statistics: lines before/after, what was removed/shortened/corrected.
3. If reduction < 10% → note: "Minimal compression — file was already in good shape."
