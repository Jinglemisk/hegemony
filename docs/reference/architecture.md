# Runtime architecture contract

Hegemony is one React/Vite application around a deterministic TypeScript engine. The
repository remains a single package until a server runtime exists, but its runtime boundaries
are already explicit and mechanically enforced.

## Pure engine

Production code under `src/game/` owns rules, state, legal options, transitions, projections,
versions, and invariants. It cannot import React, browser globals, client/dev adapters,
simulation code, Node APIs, or persistence/server frameworks. New matches receive an injected
seed; the engine never creates ambient entropy.

Each match pins one immutable `GameDefinition` containing the exact ruleset and content
identity. Stable entity IDs, schema versions, definition hashes, and the original seed travel
with save and replay recipes.

## One command boundary

Browser, simulator, and replay consumers submit intent-only `GameCommand` values through
`transition(definition, state, actor, command)`. Costs, eligibility, random outcomes, and
effective effects are derived inside the engine. A successful transition publishes a new state
and typed events; a rejection leaves the input byte-identical.

Actor eligibility is workflow-aware rather than synonymous with `currentPlayer`, allowing the
Assembly and future trade negotiation to admit multiple seats safely. `projectForPlayer` and
`projectForSpectator` redact private cards, deck order, RNG state, and private decisions before
state reaches a consumer. AI policies receive the same fair player observation vocabulary.

## Integrity and compatibility

Post-transition invariants cover settlement indexes, population and transfers, card zones,
Assembly state, stable definition identity, and compatibility versions. Saves and scripts
distinguish unsupported historical versions from deterministic replay divergence. Supported
recipes replay byte-for-byte.

## Mechanical gates

- ESLint enforces engine imports, runtime globals, hook correctness, and a zero-warning ratchet.
- Behavioral parity tests exhaustively prove browser command construction and byte-identical
  browser, simulator, replay, and direct-engine execution.
- Knip rejects unused files, exports, types, dependencies, and unlisted binaries.
- Prettier gates active source and living documentation; immutable archives and reports retain
  their historical formatting.
- CI runs typecheck, documentation checks, lint, formatting, dead-code analysis, the bounded
  Vitest suite once, production build, and one deterministic Chromium smoke journey.

The shipped implementation history and non-goals remain in the
[archived Phase 3.6 plan](../archive/plans/phase-3.6-architecture-hardening.md).
