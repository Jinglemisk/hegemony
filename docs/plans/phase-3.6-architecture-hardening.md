---
status: active
phase: "3.6"
updated: 2026-08-04
---

# Phase 3.6 architecture hardening

## Outcome

Close the remaining browser/engine/simulator seams before Phase 4 adds transferable
luxuries, multi-seat trade, and per-player National Ideas. The game keeps its current
React/Vite frontend and deterministic TypeScript engine; this phase makes their shared
contracts true enough that full multiplayer can follow the v1 mechanics freeze without
rewriting gameplay.

This is a bounded hardening phase, not a multiplayer implementation or repository rewrite.

## Non-goals

- A production server, database, lobby, accounts, reconnect UI, or deployment platform.
- Moving the repository into workspaces before a second runtime actually exists.
- MCTS, learned policies, or the complete outcome-driven AI plan.
- Broad visual refactoring or balance changes unrelated to proving these seams.

## Settled inputs

- Trade and National Ideas are both part of v1.
- Full multiplayer begins after luxury goods, trade, National Ideas, and the remaining
  authored Resolution/Idea effects pass the v1 mechanics-freeze gate.
- The engine, browser, simulator, replay, and future server use one command transition.
- Network-shaped foundations land now: explicit actors, player-safe projections,
  per-match content, stable identities, and versioned replays.
- React, Vite, TypeScript, Vitest, and Immer remain. There is no frontend rewrite.
- Simulation remains risk-based. Deterministic scenarios and invariants belong in PRs;
  fixed-size balance batches do not.

## Open owner questions

None.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                               |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | Yes      | Per-match definition, pure atomic command transition, actor eligibility, projections, versioning, invariants, and boundary tests                |
| Frontend         | Yes      | Browser dispatch through the shared command contract, player-view consumption, unchanged interaction behavior, and focused browser verification |
| Simulation & AI  | Yes      | Commands and replay through the same transition, fair observation seam, deterministic fixtures, and unchanged policy behavior                   |

## Architecture contract

### 1. Per-match game definition; no module-global content

Replace the mutable `activeContent` package with an immutable definition selected when a
match is created:

```ts
type GameDefinition = {
  identity: {
    id: string;
    rulesetVersion: string;
    rulesetHash: string;
    contentVersion: string;
    contentHash: string;
  };
  ruleset: Ruleset;
  content: GameContent;
};
```

Engine queries and transitions receive the definition explicitly or resolve it through a
pinned definition identifier. Two simultaneous games may use different definitions without
leaking content into each other. Tuning produces a new definition; it never installs a
process-wide package.

### 2. One command contract and one transition

Split client input from engine-derived legal options:

```ts
type GameCommand =
  | { type: "buildBuilding"; tileId: string; buildingId: BuildingId }
  | { type: "endTurn" }
  | /* exhaustive remaining commands */ never;

type LegalOption = {
  command: GameCommand;
  cost?: Partial<Resources>;
  blockedReasons: string[];
};
```

The client never submits derived cost, eligibility, random outcome, or effective effect.
The browser, simulator, replay, and future server all call one atomic boundary:

```ts
transition(definition, state, actor, command)
  -> { ok: true, state, events }
   | { ok: false, reasons };
```

Immer may implement the copy-on-write transition inside the engine. Callers receive a new
state only on success; a rejected command cannot leave partial mutation behind. The browser's
per-action mutator wrappers are retired, and `controller.ts` moves out of `src/game` into a
client adapter.

### 3. Explicit actor eligibility, including multi-seat workflows

`currentPlayer` is not a universal authorization rule. Normal turns are single-actor;
Assembly proposals and future trade negotiations may allow several seats to act. A shared
actor query determines who may submit which command in the current workflow.

The Assembly's asynchronous proposal behavior must work through command enumeration and the
transition—not only through direct UI mutators. Trade reuses tested workflow primitives for
actor eligibility, completion, cancellation, deadlines, and public/private projection without
forcing Assembly and trade into one generic rules machine.

### 4. Player-safe and spectator-safe projections

Add explicit projections before networking:

```ts
projectForPlayer(definition, state, playerId): PlayerView;
projectForSpectator(definition, state): SpectatorView;
```

They redact other seats' held cards, private event choices, deck order, RNG state, and any
future private negotiation data. The browser consumes the player view instead of receiving the
complete authoritative state. Outcome-driven AI begins with the same fair observation vocabulary,
so multiplayer redaction and anti-peek policy tests reinforce one another.

### 5. Versioned games, saves, and replays

Every match recipe records:

- engine/state schema version;
- command schema version;
- ruleset version and stable hash;
- content version and stable hash;
- seed, board layout, and command history.

An ongoing match remains pinned to the definition with which it started across deployments.
Replay failures distinguish an unsupported historical version from an actual deterministic
divergence. Ambient entropy creation moves to the browser/server adapter; engine state creation
requires an injected seed.

### 6. Stable identities and post-transition invariants

Introduce stable identifiers for entities that future commands and events must reference,
including settlements, transferable luxury assets, offers, and decisions. Do not rely on array
positions, UI labels, or a tile id that can contain more than one settlement.

Run inexpensive invariants after transitions in tests, simulations, and development builds:

- player settlement indexes and board settlements agree;
- pops, transfers, and claimed assets are conserved and valid;
- each card occupies exactly one valid deck/hand/ballot/discard zone;
- each unique luxury has at most one owner and one claim origin;
- Assembly actor/proposal/ballot state is internally consistent;
- version and definition identifiers remain unchanged during a match.

Use property-based tests selectively for command sequences and conservation rules; do not make
large balance batches a universal PR requirement.

## Enforcement and repository hygiene

- Add import restrictions proving the pure engine cannot import React, browser globals,
  development tooling, server frameworks, or persistence adapters.
- Make the canonical-command parity test prove that frontend dispatchers construct real
  commands and that simulator/replay use the same transition. File existence alone is not
  behavioral parity.
- Add Knip or an equivalent unused-file/export/dependency check; ratchet existing lint warnings
  to zero and then fail CI on new warnings.
- Establish a formatting baseline for active code and living docs. Exclude immutable reports and
  archives if they are intentionally preserved, then make `format:check` a real CI gate.
- Avoid running the parity subset and the same files again in the full suite. Use one aggregate
  required check or non-overlapping Vitest projects.
- Add one Playwright smoke path covering setup, a normal command, a forced decision, and reload.
- Split large files only along proven responsibilities while touching them: policy evaluation,
  search, Assembly workflow, telemetry aggregation, CLI commands, and board orchestration. File
  size alone is not a rewrite mandate.
- Generate the external player guide from typed rules/content after the v1 mechanics freeze so
  the Compendium and guide cannot become separate rules authorities.

## Incremental package direction

Keep the current single application during this phase:

```text
src/game/        pure engine and domain queries
src/client/      React controller and browser adapters
src/components/  presentation
src/sim/         policies, campaigns, CLI
src/parity/      cross-consumer contracts
```

When the server work begins after the v1 freeze, migrate without changing domain behavior:

```text
apps/web
apps/server
packages/engine
packages/protocol
packages/content
packages/simulator
packages/test-kit
```

The intended runtime remains a server-authoritative TypeScript application: React/Vite web,
Fastify plus Socket.IO server, PostgreSQL with Drizzle persistence, and the existing engine and
simulator packages. Redis, microservices, and a plugin framework wait for demonstrated scale.

## PR slices

1. **Definition isolation (implemented):** immutable `GameDefinition`, tuning resolution
   without globals, definition provenance in saves/replays/reports, and concurrent-definition
   and replay fixtures.
2. **Canonical transition (implemented):** intent-only `GameCommand`, derived `LegalOption`,
   atomic transition, and browser, simulator, and replay adapters using it. Legacy v1 replay
   records are normalized at load and cannot restore caller-supplied costs.
3. **Actor and projection contract (implemented):** workflow-aware actor eligibility,
   asynchronous Assembly parity, player/spectator views, browser consumption, fair AI
   observation, public-zone political uncertainty, and anti-peek tests.
4. **Identity, version, and invariants:** stable entity ids, versioned recipes, migrations or
   explicit rejection, invariant suite, and deterministic replay proof.
5. **Mechanical enforcement:** import boundaries, stronger parity tests, dead-code ratchet,
   non-duplicative CI, formatting baseline, and a browser smoke test.

Every slice is independently complete across applicable axes; none merges an engine seam whose
browser or simulator migration is deferred to a later PR.

## Acceptance and validation

- Two games using different definitions can run interleaved without cross-contamination.
- Every browser action, bot action, and replayed action reaches the same transition.
- An off-turn Assembly participant can legally act during the asynchronous proposal phase through
  the public command API, while unauthorized actors remain rejected.
- Player projections reveal exactly the acting seat's private information and no deck/RNG secrets.
- A recorded game identifies its exact definition and replays byte-for-byte on the supported
  engine version.
- Invariants survive targeted generated command sequences and the existing deterministic suite.
- Type-check, docs, parity, lint, full tests, build, dead-code check, format check, and browser smoke
  are green without duplicate long-running test work.

## Retirement

After all slices ship, move this plan to `docs/archive/plans/`. Preserve the architecture contract
as a short living reference and make Phase 4 plans link to it rather than restating it.
