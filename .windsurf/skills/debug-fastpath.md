---
trigger: model_decision
description: Use when a test fails, output mismatches spec, or behavior is unexpected
---
Fail-fast debug:
1. Reproduce in one command; capture exact failing output.
2. Diff actual vs expected — locate the first divergent token/line.
3. Form ONE hypothesis; insert a single targeted log/assert at the suspected boundary.
4. Re-run. If hypothesis wrong → discard, form next. Max 3 hypotheses before stepping back to re-read spec.
5. After fix: remove debug prints, re-run full validation, note the root cause in `project_state.md` only if it changes strategy.
