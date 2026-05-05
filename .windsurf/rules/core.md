---
trigger: always_on
description: Core operating rules for the Vention AI Challenge
---
- Goal: correct submission first, speed second. Never sacrifice correctness for time.
- MVP-first: ship the shortest path that passes the spec, then stop.
- Validate every change immediately (run tests/script/lint). No "should work".
- No undocumented assumptions: if spec is ambiguous, mark a TODO in `project_state.md` and pick the safest interpretation.
- Files in English; chat in Russian. Cite code as `@path:Lstart-Lend`.
- Update `project_state.md` only when status, blocker, or submit-state changes.
