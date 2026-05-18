# T-10: Fix type casts in index.ts

## Goal
Replace the unsafe `params as Parameters<typeof handler>[0]` type assertions in `src/index.ts`
with properly typed handler invocations so that TypeScript can catch handler signature drift
at compile time.

## Problem
`src/index.ts` registers tool handlers via:
```typescript
async (params) => submitFlightHandler(params as Parameters<typeof submitFlightHandler>[0])
```
The `as` cast bypasses type checking. If a handler's parameter type changes, the cast silently
hides the mismatch.

## Invariants (from parent)
- All exported functions must have explicit TypeScript return types.
- No `any` type anywhere in source.

## Scope
**In scope:**
- `src/index.ts` — tool registration callbacks only.

**Out of scope:**
- Handler files themselves. No logic changes.

## Steps

1. Read `src/index.ts` and the MCP SDK types to understand what type `params` has in the tool callback.
2. For each tool registration that uses `params as Parameters<typeof handler>[0]`, replace the cast. Options: (a) destructure params inline using the Zod schema types, or (b) make the handler accept `Record<string, unknown>` and narrow internally, or (c) if the SDK provides a typed callback, use it directly. Choose the approach that eliminates the `as` assertion while keeping `npx tsc --noEmit` passing.
3. Run `npx tsc --noEmit` and verify it exits 0 with no cast-related workarounds.

## Acceptance Criteria
- [ ] All tool registrations in index.ts invoke handlers without `as` type assertions.
- [ ] The MCP SDK callback types are satisfied (params is typed correctly for each handler).
- [ ] `npx tsc --noEmit` exits 0 after the fix.

## Done Definition
All acceptance criteria pass. tsc clean. No `as` casts on tool handler calls.
