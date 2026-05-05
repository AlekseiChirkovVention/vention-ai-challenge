---
trigger: model_decision
description: Use when working on task-1 (vibe coding) — short scripted/algorithmic problem
---
Vibe coding tactics:
- Read `task-1/README` (or `SPEC`) once; extract: input, output, constraints, scoring.
- Pick the simplest stdlib-only solution; no extra deps unless the spec demands.
- Single entry file (e.g., `main.py`/`solution.py`); deterministic, no prints beyond required output.
- Test with provided sample I/O first; then 2 edge cases (empty, max bound).
- Done = sample matches exactly + edge cases pass + `python solution.py < sample.in` reproducible.
