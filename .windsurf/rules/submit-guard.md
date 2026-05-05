---
trigger: always_on
description: Hard gate before any submit/push action
---
Before `git push`, "submit", "final", or marking a task done:
1. Spec re-read: every requirement in task `README`/`SPEC` mapped to a passing artifact.
2. Tests/validators run green in the current shell — paste the command + result.
3. Output format byte-checked against the example (no extra logs/whitespace).
4. `git status` clean except intended files; no temp/scratch files committed.
5. If anything above is uncertain → STOP and surface the risk; do not push.
