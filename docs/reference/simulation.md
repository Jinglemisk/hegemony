# Headless Simulation & Testing Toolkit

The game engine (`src/game`) is pure and deterministic, so it can be driven
entirely from the terminal — no browser, no React. This toolkit is the primary
instrument for testing rules and simulating balance scenarios.

Simulation intensity is risk-based. Gameplay PRs require deterministic examples,
invariants, replay and policy behavior when applicable; they do **not** require an
arbitrary fixed number of full games. Use broader matched batches when changing
probabilities, balance values, policy evaluation, multi-system interactions, or when
making a balance claim. Record the seeds, definition/version, policies, turns, and
known policy limits with every campaign.

```bash
npm run sim -- <command> [args] [--file path]
```

All commands operate on a JSON save file (default `.sim/game.json`, gitignored).
`--file` targets a different save so several games can run side by side.

**See also:** [simulation reports](../reports/simulation/) — the dated campaign
writeups and their reports — plus the
[archived balance/tuning plan](../archive/notes/simulation-plan.md). How the bots
work: [AI reference](ai.md).

## Quick start

```bash
npm run sim -- new --seed 42        # new game, auto-setup, lands in gameplay
npm run sim -- show                 # full state: players, resources, settlements
npm run sim -- legal                # numbered list of every legal move
npm run sim -- move index 3         # apply move #3 from that list
npm run sim -- end-turn
npm run sim -- auto --turns 24      # let bots play six rounds
npm run sim -- batch --games 50 --turns 40 --policy greedy   # balance report
```

## Commands

### `new` — start a game

```bash
npm run sim -- new --seed 42 [--mode standard|fastStart|deathmatch]
                  [--ruleset-patch patch.json]
                  [--manual-setup | --opening random|fixed]
                  [--bot-seed N] [--file path]
```

- `--seed` drives **everything**: deck shuffles, random placements, unrest pop
  removal. Same seed → same game, always. Omitting it picks (and prints) one.
- Openings: `random` (default) plays seed-driven legal placements straight to
  the gameplay phase; `fixed` replays the scripted UI opening
  (`TEST_OPENING_SETUP`); `--manual-setup` stops in `setupCapital` so
  placements are made by hand (`move place-capital …`).
- `--ruleset-patch` deep-merges a JSON file onto the mode's ruleset — the fast
  path for balance experiments. Example patch:

  ```json
  {
    "actionCosts": { "foundColony": { "wood": 15, "food": 2 } },
    "economy": { "unrest": { "popLossThreshold": -6 } }
  }
  ```

### `show` / `log` / `legal` / `preview` — inspect

```bash
npm run sim -- show [--json] [--player 2]
npm run sim -- log [--tail 30]
npm run sim -- legal [--json]
npm run sim -- preview                          # income projection, itemized
npm run sim -- preview build 0,0 granary        # before/after economics
npm run sim -- preview found -2,1 0,0 slaves
npm run sim -- preview upgrade -2,1
npm run sim -- preview pops 0,0 -2,1 citizens=1
npm run sim -- preview --index 4                # preview the Nth legal move
```

`legal` lists moves in deterministic order with indices for `move index <N>`.
While a player event is pending, resolving it is the _only_ legal move — the
engine blocks everything else, including ending the turn.

### `move` / `end-turn` — act

```bash
npm run sim -- move build <tile> <building>       # marketplace|temple|workshop|granary
npm run sim -- move found <tile> <srcTile> <pop>  # pop: citizens|freemen|slaves (or c|f|s)
npm run sim -- move upgrade <tile>
npm run sim -- move grow <tile> <pop>
npm run sim -- move pops <src> <dst> <popSpec>    # popSpec: citizens=1,slaves=2 (or c=1,s=2)
npm run sim -- move place-capital <tile> <popSpec>
npm run sim -- move place-colony <tile> <popSpec>
npm run sim -- move resolve [choiceIndex] [targetTile]
npm run sim -- move index <N>
npm run sim -- end-turn
```

Tile ids are axial `q,r` coordinates: `0,0`, `-2,1`, `3,-1`. Rejected moves
exit non-zero and print the engine's reasons. Every applied move is appended
to the save's `history`, and new log lines are echoed (income collected,
events drawn, pops arriving).

Income is **automatic** — it is collected at the start of every turn, so there
is no `collect` command. Each collection also draws a player event card, which
must be resolved (`move resolve`) before anything else.

### `auto` — bot play

```bash
npm run sim -- auto [--turns 40] [--policy random|greedy|smart|beam|political|settler|master]
                    [--bot-seed N] [--record script.json] [--quiet]
```

Plays N player-turns (4 players → 4 turns per round) from the current save.
Works from any phase — bots will finish a manual setup too. Policies:

- `random` — uniform by move type, then within type (keeps big move families
  from dominating; turns always self-terminate).
- `greedy` — one-ply lookahead over a card-anchored positional score with a
  6-turn income projection. Deterministic. Blind to Phase 2's strategic layer: it
  values pops tier-blind and materials flat, so it never promotes and never builds Villa/Gymnasion.
- `smart` — same one-ply search, but the score weights pops BY TIER (a citizen is
  worth far more than a slave), materials by role, building room, and the Gymnasion's
  promotion synergy. So it climbs the social ladder, builds the Phase 2 buildings, and
  favours slot-rich cities — the bot that actually exercises the terrain rework.
  Deterministic.
- `beam` — a within-turn **beam search** over the same `smart` score, so it values the
  within-turn sequences one-ply misses (build-then-promote and bank chains). It does
  not search through `endTurn`, so the six-turn income projection is state evaluation,
  not income-to-future-action planning.
  Branches only on RNG-free moves — it never reads the seeded die/deck, so it stays
  deterministic (record→replay is byte-identical, proving zero game RNG consumed) and
  plays the stochastic families (riot/venture/bank) by the same hard-coded rules as
  one-ply. Stronger but slower — a `smart`-vs-`beam` A/B isolates search depth from
  evaluation. See docs/reference/ai.md and docs/reports/simulation/ for the head-to-head.
- `political` — the influence-aware bot (Phase 3-C). Same `smart` economy, but it plays
  the **Assembly**: it scores a resolution's DIFFERENTIAL impact (my gain minus the
  strongest rival's — "does this hurt me, help me, or help a rival more?") and draws /
  proposes / votes / bribes / vetoes by that, atop permanent authored-and-passed progress
  toward Voice. Directive proposals evaluate each legal rival target separately. It reuses
  the engine's own enactment on clones,
  so it stays deterministic and reads no game RNG. A `political`-vs-`smart` A/B isolates
  the political layer. Assemblies convene from Year 2, so use long games (`--turns 280`)
  or the agora barely opens. See docs/archive/plans/influence-aware-ai.md and docs/reports/simulation/.
- `settler` — `smart` plus **map/expansion foresight**: a frontier term (the total yield of
  the tiles it could legally found a colony on _next_) so the one-ply search prefers
  placements that OPEN expansion — the second-order move the board-static scorer misses.
  A `settler`-vs-`smart` A/B isolates map foresight. See docs/reports/simulation/2026-07-21-map-foresight.md.
- `master` — the cumulative bot: `smart` economics, `beam`'s four-action within-turn
  planning, `political`'s Assembly strategy and rival-aware resolution scoring, plus the
  measured one-step expansion-frontier signal from `settler`. This is the strongest single
  policy for whole-game runs. It combines all EXISTING specialist knowledge; cross-turn
  saving, general opponent replies, multi-hop route planning, and chance expected value
  remain future work. See docs/reports/audits/2026-07-23-ai-bot-parity.md.

The economic policies project six future upkeeps one step at a time through the
canonical active-effect descriptors. Each step applies timed mood, burns suppressed
collections, advances starvation, and recalculates authoritative income after projected
pop loss. Starvation uses the mean state of the engine's uniform pop-removal bag, so the
forecast responds when fewer pops repair the deficit without reading or advancing future
game RNG.

How the bots work, their limitations, and the path to CPU opponents with
difficulty settings: **docs/reference/ai.md**.

Bot decisions use their own PRNG stream (persisted on the save as
`botRngState`), never the game's deck RNG — changing policy never changes
which cards come up.

### `batch` — balance simulation

```bash
npm run sim -- batch --games 50 [--turns 40] [--policy random|greedy|smart|beam|political|settler|master]
                     [--mode …] [--board classic|shuffled] [--ruleset-patch p.json]
                     [--tune-preset low-number-core-v1] [--tune-patch p.json]
                     [--seats p0,p1,p2,p3] [--rotate] [--seed 1000]
                     [--report .sim/report.json] [--csv .sim/turns.csv]
```

Runs `--games` self-contained games (game _i_ uses seed `base+i`), aggregates,
and writes a JSON report plus optional per-turn CSV (one row per
game/turn/player — pivot-table ready).

- `--board` — `classic` (default, reproducible) or `shuffled` (seeded random terrain,
  as the live game defaults to). Recorded in the report and in saves/scripts.
- `--tune-preset low-number-core-v1` — resolves the shared development preset before
  the batch. Unknown IDs fail. `meta` records the ID and stable full-content hash.
- `--tune-patch` — a dev tune-panel override map (the panel's "Copy patch" output):
  A/Bs building content (Villa/Gymnasion strength, costs, level caps) and ruleset
  scalars in one run. It applies after the preset; the manual patch and its separate
  hash land in `meta`.
- `--seats p0,p1,p2,p3` — a policy per seat for mixed-policy tables. `--rotate` runs
  each seed through every seat permutation, cancelling first-player advantage.

The report contains:

- `meta.tuningPresetId` / `meta.resolvedContentHash` — the named preset and stable
  fingerprint of the complete effective content package; manual tune metadata remains
  separate
- `meta.definition` — the exact ruleset/content versions, hashes, and combined definition
  identity used by every game in the batch
- `perGame` — seed, `termination` (victoryRace|deckExhausted|turnCap), `winner`
  (null for turn-capped games), `leaderAtCap`, final cards + pops lost per player,
  and the seat→policy map for mixed runs
- `perSeason` — end-of-season victory-card/pops/food/happiness percentiles (mean,
  p10, median, p90) pooled across games and seats, plus unrest-tier and active-effect
  player-turn shares
- `perSeat` — real `winRate` (finished games only), `capLeaderRate` (turn-capped
  games), and mean final cards per seat (first-player advantage check)
- `terminations` — how games ended (the winRate denominator context)
- `forced` — action-cap hits / forced resolutions / forced end-turns (previously hidden)
- `winsByPolicy` — wins credited to each policy over finished games (mixed/rotated runs)
- `movesByType` — zero-filled total and per-game counts for every typed legal move;
  this universal table makes missing or unexercised action paths visible
- `activeEffects` — zero-filled observations, per-player-turn counts, and player-turn
  prevalence for every canonical active-effect kind (suppression, deficit, timed
  mood, seasonal/omen modifiers, discounts, Laws, and pending Directives)
- `buildings` — build counts and per-game rates
- `events` — draw counts by card id, and per-option pick counts for choice cards
- `finalCardsDistribution`
- `assembly` — agora engagement: assemblies held/game, Laws enacted / removed / standing,
  Directives and their target distribution, authored passes, prize resources, Voice claims
  and transfers, final Voice ownership/win correlation, authored-pass lead margin and
  concentration, **influence sunk**/game, and a per-verb breakdown
- `currencyVerbs` — per-verb currency-move counts (bank / calm / ladder / venture / riot)
- `upgrades` — colony→city upgrades per game

Identical inputs produce byte-identical reports (minus `meta.generatedAt`).
Compare two patches by running two batches with the same `--seed` and diffing
the reports.

### `replay` — regression net

```bash
npm run sim -- auto --turns 24 --record .sim/script.json
npm run sim -- replay --script .sim/script.json [--out .sim/game.json]
```

A script is a save minus its state: seed, mode, patch, and every move.
Replaying rebuilds the game from scratch and asserts every move still applies —
if a recorded game stops replaying cleanly, a rules change moved under it.
Replays are byte-identical to the original run.

## Save file format

```jsonc
{
  "version": 2,
  "engineVersion": "0.1.0",
  "stateSchemaVersion": 1,
  "commandSchemaVersion": 1,
  "seed": 42, // game seed: decks, board draws, unrest removals
  "mode": "standard",
  "rulesetPatch": null, // deep-merged over the mode's ruleset
  "definition": {
    "identity": {/* ruleset/content versions, hashes, and combined id */},
    "ruleset": {/* exact immutable rules package */},
    "content": {/* exact immutable content package */},
  },
  "opening": "random",
  "boardLayout": "classic",
  "botRngState": 123, // where the bot decision stream is parked
  "history": [{ "player": "0", "command": { "type": "endTurn" } }],
  "state": {/* full HegemonyState — plain JSON */},
}
```

The save is a _recipe_: replaying `history` from its pinned definition and seed
reproduces `state` byte-for-byte. Saves double as shareable bug reports and
balance scenarios. Loading re-hashes the definition and rejects tampering, unsupported
schema versions, or a recipe/state mismatch. Legacy v1 saves are migrated on load:
missing definitions are hydrated from their embedded ruleset plus authored content,
legacy command costs are discarded, and settlement IDs are derived deterministically
from placement history. New writes always use v2.

**Phase 3.6 architecture:** definition pinning, the canonical atomic transition, workflow
actors/projections, stable settlement and transfer IDs, versioned recipes, legacy migration,
and post-transition invariants are implemented. Browser, simulation, and replay submit
intent-only `GameCommand` values; policies receive the acting seat's redacted `PlayerView`.
Replay errors distinguish unsupported history from deterministic command divergence, while
authoritative saves and replay proofs run exact card-zone conservation. Import, parity,
dead-code, formatting, bounded-test, and browser-smoke enforcement is now shipped; see the
[runtime architecture contract](architecture.md).

## Writing tests and scenarios

- `src/game/legalMoves.ts` — `enumerateLegalCommands` / `enumerateLegalOptions` /
  `transition` / `describeCommand`. Import directly (deliberately not in the `rules.ts` barrel).
- `src/game/testing/scenario.ts` — chainable mid-game state builder for tests:

  ```ts
  const G = scenario({ seed: 7, mode: "fastStart" })
    .stackPlayerEvent("player-new-citizen") // rig the next draw (before .opening()!)
    .opening() // scripted 4-player opening → gameplay
    .withResources("0", "wealthy")
    .withSettlement("2", "0,0", "city", { citizens: 2, freemen: 1, slaves: 0 })
    .withHappiness("2", -7)
    .build();
  ```

- `src/sim/runner.ts` — `runGame`/`runTurns`/`playTurn` with hooks
  (`onGameStart`, `onMove`, `onTurnEnd`) for programmatic experiments.

## Determinism notes

- Pass an explicit `--seed`; only the unseeded default uses `Math.random`.
- Game RNG (`state.rng`) and bot RNG (`botRngState`) are independent mulberry32
  streams; both are persisted, so any command sequence is reproducible.
- The engine ends games for real: the victory race (hold enough cards at your
  turn start) or deck exhaustion set `phase: "gameOver"` with a `gameOverReason`.
  The `--turns` cap is only a ceiling for truncated experiments — a turn-capped
  game is recorded as `termination: "turnCap"` and is NOT counted as a win.
- `batch` trims each game's log to 200 entries (transfer/discount ids embed the
  log length, so trimmed and untrimmed runs differ in those cosmetic ids —
  never in rules outcomes). `auto` and manual play never trim, so saves stay
  byte-replayable.
