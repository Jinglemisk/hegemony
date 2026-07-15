# Engine/UI Boundary Audit — Hegemony (/Users/jinglemisk/Desktop/hegemony, branch feat/phase1-currencies)

## 1. STATE FLOW

- **Single owner, React hook, no reducer.** `src/App.tsx:5` calls `useHegemonyGame()` from `src/game/controller.ts:167-188`. The entire `HegemonyState` lives in one `useState<HegemonyState>` (`controller.ts:169`), initialized by `createGameFromUrl()` (URL params → `createGame`). There is no Redux/useReducer/context; `G` is prop-drilled from `App` → `HegemonyBoard` → every panel/modal.
- **Dispatch = named move closures over `setG`.** `createMoves(setG)` (`controller.ts:197-262`) builds a `GameMoves` object: each move calls `setG(previous => commitGameplayMove(previous, G => engineMutator(G, G.currentPlayer, ...args)))`. `commitGameplayMove`/`commitSetupPlacement` (`controller.ts:266-306`) wrap the **pure engine mutator in an Immer `produce`**: the mutator mutates the draft imperatively and returns `{ok}`; on failure the draft is discarded and the previous frozen reference is returned (no re-render). Immer gives structural sharing + freezing, which is the immutability boundary hardener.
- **Engine mutators are mutation-style pure functions** (`src/game/actions.ts` etc.): `(G, playerID, ...args) => MoveResult` — they mutate `G` in place and return `{ok, reasons}`. The engine itself has no Immer dependency; Immer lives only in the controller.
- **Turn context** is a derived projection (`deriveContext`, `controller.ts:163-165`) memoized on `G`. `endTurn` is a separate `GameEvents` channel (`controller.ts:308-320`), not a `GameMoves` entry.
- **Hot-seat player switching:** `playerID` is local UI state auto-synced to `G.currentPlayer` via `useEffect` (`controller.ts:171-173`); `onPlayerIDChange` lets the scoreboard switch the viewed seat freely. `isActive = playerID === G.currentPlayer`.
- **Parallel dispatcher exists:** `src/game/legalMoves.ts` defines a `LegalMove` discriminated union (`legalMoves.ts:70+`) plus `enumerateLegalMoves(G, playerID)` and `applyMove(G, playerID, move)` — a uniform, data-only action protocol used by the sim/bots/tests but NOT by the React UI (the UI calls the per-move functions directly through `GameMoves`).

## 2. INVARIANT VIOLATIONS

### Rule math duplicated in components
- **`src/components/board/helpers.ts:57-90`** — `estimateGrowPopIncomeDelta` + `addSupportedPopBonus` re-implement the building "supported pops" bonus formula (marketplace/temple/workshop effects: `citizenInfluenceBonus`/`freemanGoldBonus`/`slavePrimaryResourceBonus`, including the `settlement.pops[pop] < support.supportedPops` gating). The engine's `economy/income.ts` is documented in the `rules.ts` barrel as "single source of the per-pop yield formula" — this is a second source that will drift.
- **`src/components/board/helpers.ts:106-124`** — `estimateBuildingIncomeDelta` re-implements building income math (`Math.min(pops, supportedPops) * amount` per effect type) as a fallback when `previewBuildBuilding` returns null. Note it disagrees with the gating logic in `addSupportedPopBonus` above (min-scaled vs threshold) — two UI-side variants of one engine formula.
- **`src/components/board/helpers.ts:35-49`** — `calculatePopEconomy` aggregates per-pop-class income across holdings. It calls the engine primitive `popIncome`, but the aggregation itself (ignoring building bonuses, event modifiers) is an economy projection that belongs in `game/economy/preview.ts`.
- **`src/components/PopulationModals.tsx:177,306`** — fall back to the **static** `ACTION_COSTS` from `game/data.ts` (`status.cost ?? ACTION_COSTS.foundColony`) instead of `G.ruleset.actionCosts.*`. The engine (`actions.ts:135,165`) falls back to `G.ruleset.actionCosts` — if a mode/ruleset patch changes costs, the modal displays the wrong price.
- **`src/components/board/command/ActionCommandPanel.tsx:64-66`** — computes `minGrowFood` from `G.ruleset.growPopCosts` inline (minor: reads ruleset data rather than duplicating a formula, but it ignores granary `growPopFoodDiscount`, so the displayed cost can overstate).
- **`src/components/board/ledger/EmpireIntelPanel.tsx:62-66`** — inline `popsUsed`/`popsCapacity`/`cityCount` aggregations (composed from engine primitives `totalPops`/`settlementPopCapacity`; mild, but a natural engine selector).

### UI concepts leaked into the engine directory
- **`src/game/controller.ts` is a React module living inside `src/game`.** It imports React hooks (`controller.ts:1-2`), reads `window.location.search` (`:55`), reads/writes `window.localStorage` (`:92-93`), reads `document` indirectly not at all — but it is browser-bound and React-bound. It also contains dev-only opening autoplay (`autoPlayOpening`, `:104-122`) that hand-rolls its own RNG stream (`G.seed ^ 0x9e3779b9`) outside `G.rng`. Functionally it is the UI adapter, but its location makes "src/game is pure" false as stated; `src/game` minus `controller.ts` and `config.ts` is genuinely pure (verified: no `Math.random`/`Date`/`window`/`document` anywhere else in `src/game` except `createSeed` in `core/rng.ts:8`, which is the intentional entropy source).
- No engine module imports from `src/components` or `src/ui` — the dependency direction is otherwise clean.

### Non-violations worth noting
- `HegemonyBoard.tsx:92-93` runs un-memoized O(tiles) `getFoundColonyStatus`/`getUpgradeColonyToCityStatus` scans on every render (perf smell, not a rules violation; the memoized variants at `:94-108` show the intended pattern).
- `src/components/board/events.ts` is pure presentation (card art URLs + effect text formatting) — correct side of the line.

## 3. SELECTOR LAYER

**Yes — and it's the strongest part of the architecture.** The engine ships a real query surface and the UI overwhelmingly uses it:
- `src/game/status.ts` — `get*Status` validators (`can`, `reasons`, `cost`) shared by mutators, enumeration, and UI button-disabling (MarketTab, BuildingsTab, GrowPopModal, CitiesTab, VentureModal, CalmModal, LadderModal all import `get*Status`).
- `src/game/economy/preview.ts` — `calculateEconomyProjection`, `previewBuildBuilding`, `previewUpgradeColonyToCity` (HegemonyBoard:86, PopsTab:43, PlayerScoreboard).
- `src/game/victory.ts` — `victoryStandings`/`victoryCardsHeld`; VictoryTab.tsx:10 explicitly states it reuses the same function the win check uses "so the ledger can never disagree with the rules."
- `src/game/unrest.ts` (`unrestStatus`), `core/calendar.ts` (`yearOf`, `seasonName`), `settlement.ts` (`settlementPopCapacity`, `settlementBuildingSlots`, `canPlaceColonyOnTile`).

Components computing derived data inline that belongs in the engine selector layer: **`components/board/helpers.ts`** (the three estimate/aggregate functions above — the whole file except the text-formatting helpers), **PopulationModals.tsx** cost fallbacks, **ActionCommandPanel.tsx** min-cost, **EmpireIntelPanel.tsx** pop-capacity aggregates. There is no UI-side memoized selector layer (no reselect equivalent); most panels call engine selectors directly in render, some memoized, some not.

## 4. SERVER-AUTHORITY READINESS

**Serializability: YES.** `HegemonyState` (`src/game/types.ts:364-399`) is pure JSON — primitives, arrays, `Record`s; no functions, classes, Maps, Sets, or Dates. `ruleset` is embedded data, `bank` rates are plain numbers, the RNG is `rng: number` (`types.ts:397`), the seed is stored (`:369`). `JSON.parse(JSON.stringify(G))` round-trips losslessly. The log rides in state (grows unboundedly; the sim already has `trimLogTo`).

**Determinism: YES, deliberately.** `src/game/core/rng.ts` — mulberry32 with explicit state threading; `shuffleWithSeed` returns `{cards, state}` and callers persist state on `G.rng`. `tables.ts:172` comments "never Math.random — the state [RNG]". Table rolls, deck shuffles, and event draws all consume `G.rng`. The only `Math.random()` in the engine is `createSeed()` (`rng.ts:8`) — the intentional entropy source, which a server would own. Same seed + same move sequence = same state, which is exactly what optimistic prediction + server replay needs.

**Actions as a wire protocol: ALREADY EXISTS, but the UI doesn't use it.** `LegalMove` (`legalMoves.ts:70+`) is a plain discriminated union — every move is `{type, ...scalar args}` (tileIds as strings, `Pops` records, cost snapshots). `applyMove(G, playerID, move)` is the uniform dispatcher, and enumeration reuses the same `get*Status` predicates so enumerated moves always apply. This union could travel over a websocket today, including `{type:"endTurn"}`. The React `GameMoves` object, by contrast, calls named mutators directly and keeps `endTurn` on a separate `GameEvents` channel — converging the UI on `applyMove` is the single biggest step toward a network protocol.

**Hidden information: NONE structurally — this is the biggest gap.** All four draw piles (`seasonalDrawPile`, `playerDrawPile`, `types.ts:382-385`) sit in full, ordered, inside the one state object every component receives. In hot-seat this is fine; online, shipping full state to clients leaks the entire future deck order (and any opponent-private info added later). There is no `playerView`/redaction layer. Options: server-side state redaction per client, or moving deck order out of client-visible state (server holds it, clients see counts + discards).

**Authorization: none.** Moves are dispatched with `G.currentPlayer` baked in (`controller.ts:200` etc.), not the viewer's `playerID`, and `onPlayerIDChange` lets any seat drive any seat. A server loop needs `(playerID, move)` pairs validated against `G.currentPlayer` — `applyMove` already takes `playerID` explicitly, so the engine side is ready; the controller side isn't.

**Concrete gaps to a server-authoritative loop with optimistic prediction:**
1. Route the UI through `LegalMove`/`applyMove` instead of `GameMoves`' direct mutator calls (fold `endTurn` in — `legalMoves` already has it).
2. Extract `useHegemonyGame` out of `src/game` into `src/ui` (or `src/client`); it's the transport-specific adapter (today: local Immer commit; tomorrow: send move, apply optimistically, reconcile on server ack). The Immer commit-on-ok pattern is already rollback-shaped: keeping `previous` on rejection is exactly optimistic-rollback.
3. Add a per-player state view (redact draw piles; possibly split the log).
4. Server owns `createSeed()`; clients never call `createGameFromUrl` (URL/localStorage/dev-autoplay logic stays client-dev-only).
5. Move IDs/ordering: transfers derive ids from `G.log.length` (`actions.ts:331`) — deterministic but couples identity to log retention; fine if log trimming never happens mid-game on the server.

## 5. SIM RUNNER (src/sim/runner.ts) — portability proof

`playTurn`/`runTurns` (`runner.ts:42-110+`) drive the full game headlessly: `enumerateLegalMoves` → policy chooses → `applyMove`, with deadlock/enumeration-mismatch errors as invariant tripwires, forced pending-event/riot resolution, and turn caps. Notably it mutates `G` **directly, with no Immer and no React** — proving the engine (a) has zero framework dependencies, (b) is fully drivable through the `LegalMove` protocol alone, (c) already runs an authoritative-server-shaped loop (validate → apply → hooks/telemetry). The sim's bot RNG (`createSimRng`, `deriveBotSeed`) is separate from `G.rng`, so policy randomness never perturbs game-rule randomness. In effect, `runner.ts` *is* the prototype of the server loop; the missing pieces are transport, per-client redaction, and auth — not engine work.

## TOP FINDINGS
- State flow: whole HegemonyState in one useState inside src/game/controller.ts:169; moves are closures wrapping pure engine mutators in Immer produce, committed only on {ok} — no reducer, no context, G prop-drilled everywhere
- Biggest boundary breach: src/components/board/helpers.ts:57-124 re-implements the engine's per-pop income + building-bonus formulas twice (estimateGrowPopIncomeDelta and estimateBuildingIncomeDelta), with mutually inconsistent gating, despite economy/income.ts being the documented single source
- PopulationModals.tsx:177,306 fall back to static ACTION_COSTS from data.ts instead of G.ruleset.actionCosts — displayed costs drift from engine costs under any ruleset patch
- src/game/controller.ts is a React+browser module (hooks, window.location, localStorage, dev autoplay) living inside the 'pure' engine directory — the engine is pure only if controller.ts/config.ts are excluded; move it to src/ui
- A real selector layer exists and is well used: status.ts get*Status, economy/preview.ts projections, victory.ts standings — VictoryTab even documents reusing the exact win-check function so UI can never disagree with rules
- Server-readiness is strong: HegemonyState is pure JSON (rng is a number on state, seed stored), engine RNG is fully seeded/deterministic (only Math.random is createSeed), and LegalMove + applyMove is already a serializable wire protocol — but the React UI bypasses it via GameMoves' direct mutator calls
- No hidden-information layer: ordered draw piles live in the single state object every client would receive — online play needs per-player redaction/playerView before shipping state over a socket
- No move authorization: GameMoves bakes in G.currentPlayer and the UI can switch seats freely; applyMove(G, playerID, move) already takes explicit playerID, so only the controller side needs auth
- src/sim/runner.ts proves engine portability: it drives full games headlessly via enumerateLegalMoves/applyMove with no React and no Immer — it is effectively the prototype of the server-authoritative loop
- Minor: HegemonyBoard.tsx:92-93 un-memoized O(tiles) status scans per render; ActionCommandPanel.tsx:64 and EmpireIntelPanel.tsx:62-66 compute small derived aggregates inline that belong in engine selectors
