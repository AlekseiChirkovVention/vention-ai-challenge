# T-12: Fix non-deterministic tie-breaking in analyzeBottleneck

## Goal
Make `analyzeBottleneck` deterministic when multiple dependency chains share the same total
duration. Currently, the DFS iteration order determines which chain is returned, which can
vary depending on insertion order into the schedule array.

## Problem
In `analyzeBottleneckHandler` (src/tools/analyzeBottleneck.ts:57–77), the best path is updated
with `if (path.length >= 2 && duration > bestDuration)`. A strict `>` means the first equal-
duration path found wins, which depends on DFS stack order (non-deterministic).

## Invariants (from parent)
- `buildSchedule` is a pure function: same input → same output always.
- All scheduling outputs must be deterministic.

## Scope
**In scope:**
- `src/tools/analyzeBottleneck.ts` — the DFS loop and best-path selection.

**Out of scope:**
- No other files.

## Steps

1. In `src/tools/analyzeBottleneck.ts`, locate the condition `if (path.length >= 2 && duration > bestDuration)`.
2. Change it to also replace `bestPath` when `duration === bestDuration` but the current path's first flight number is lexicographically smaller than `bestPath[0]`. New condition: `if (path.length >= 2 && (duration > bestDuration || (duration === bestDuration && path[0]! < (bestPath[0] ?? '￿'))))`.
3. Run `npx tsc --noEmit` and verify it exits 0.

## Acceptance Criteria
- [ ] When two chains have equal `totalDurationSeconds`, the one whose first flight number is
  lexicographically smaller is returned.
- [ ] `npx tsc --noEmit` exits 0 after the fix.
- [ ] All 5 validation scenarios still pass.

## Done Definition
All acceptance criteria pass. tsc clean. Tie-breaking is deterministic by first-flight lexicographic order.
