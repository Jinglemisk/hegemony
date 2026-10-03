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
npm run sim -- auto --turns 24      # let bots play six years
npm run sim -- batch --games 50 --turns 56 --policy greedy   # balance report
```

## Commands

### `new` — start a game

```bash
npm run sim -- new --seed 42 [--mode standard|fastStart|deathmatch]
                  [--ruleset-patch patch.json]
                  [--manual-setup | --opening policy|random|fixed]
                  [--policy master|slaver|civic|trader] [--seats p0,p1,p2,p3]
                  [--bot-seed N] [--file path]
```

- `--seed` drives **everything**: deck shuffles, random placements, table rolls. Same seed → same game, always. Omitting it picks (and prints) one.
- Openings: `policy` (default) places capitals and founding colonies with the
  shared placement evaluator — the same brain the bots play with, so a reload
  or a batch starts from a sane opening; `random` draws uniformly among legal
  placements (the chaos baseline); `fixed` replays the scripted UI opening
  (`TEST_OPENING_SETUP`); `--manual-setup` stops in `setupCapital` so
  placements are made by hand (`move place-capital …`). `batch` takes
  `--opening policy|random` too, and records it in the report's `meta`.
- `--ruleset-patch` deep-merges a JSON file onto the mode's ruleset — the fast
  path for balance experiments. Example patch:

  ```json
  {
    "actionCosts": { "foundColony": { "wood": 15, "food": 2 } },
    "economy": { "unrest": { "riotThreshold": -4 } }
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
npm run sim -- move build <tile> <building>       # marketplace|estate|forum|temple|granary|port
npm run sim -- move found <tile> <srcTile> <pop>  # pop: citizens|freemen|slaves (or c|f|s)
npm run sim -- move upgrade <tile>
npm run sim -- move grow <tile> <pop>
npm run sim -- move pops <src> <dst> <popSpec>    # popSpec: citizens=1,slaves=2 (or c=1,s=2)
npm run sim -- move dole                          # 3 influence for 1 food
npm run sim -- move place-capital <tile> <popSpec>
npm run sim -- move place-colony <tile> <popSpec>
npm run sim -- move resolve [targetTile]
npm run sim -- move venture <expeditionId>        # merchantConvoy|grandEmbassy|colonistsVoyage
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
npm run sim -- auto [--turns 40] [--policy random|greedy|smart|beam|political|settler|master|slaver|civic|trader]
                    [--seats p0,p1,p2,p3] [--bot-seed N] [--record script.json] [--quiet]
```

Plays N player-turns (4 players → 4 turns per year) from the current save.
Works from any phase — bots will finish a manual setup too. Policies:

- `random` — uniform by move type, then within type (keeps big move families
  from dominating; turns always self-terminate).
- `greedy` — one-ply lookahead over a card-anchored positional score with a
  6-turn income projection. Deterministic. Blind to Phase 2's strategic layer: it
  values pops tier-blind and materials flat, so it never promotes.
- `smart` — same one-ply search, but the score weights pops BY TIER (a citizen is
  worth far more than a slave), materials by role, and each open work slot as the slave
  who could work it. So it climbs the social ladder, raises the class buildings, and
  keeps plains slots for the slaves that feed it. Bank and Dole moves enter search;
  a food-reserve term makes individual purchases useful before they cover a deficit.
  Deterministic.
- `beam` — a within-turn **beam search** over the same `smart` score, so it values the
  within-turn sequences one-ply misses (build-then-promote and bank chains). It does
  not search through `endTurn`, so the six-turn income projection is state evaluation,
  not income-to-future-action planning.
  Searches bank moves and evaluates ventures as chance leaves using every public
  outcome, independently of the live die/deck stream. Forced riots keep the shared
  insurance handler. Record→replay remains deterministic. A `smart`-vs-`beam` A/B
  isolates search depth from evaluation. See docs/reference/ai.md and docs/reports/simulation/ for the head-to-head.
- `political` — `smart` economy plus standing-authorship valuation outside the
  Assembly. All non-random policies share its Assembly handler: draw and propose
  useful cards, support coalitions, block a winning rival, and buy affordable
  pivotal votes. It evaluates real engine enactment on clones and reads unordered
  public card composition. Directives score each legal rival target. Assemblies
  convene in Years 2, 4, 6, 8, 10, 12 and 14; `--turns 56` lets the year deck finish.
- `settler` — `smart` plus **map/expansion foresight**: a frontier term (the total yield of
  the tiles it could legally found a colony on _next_) so the one-ply search prefers
  placements that OPEN expansion — the second-order move the board-static scorer misses.
  A `settler`-vs-`smart` A/B isolates map foresight. See docs/reports/simulation/2026-07-21-map-foresight.md.
- `master` — the cumulative bot: `smart` economics, `beam`'s four-action within-turn
  planning, `political`'s Assembly strategy and rival-aware resolution scoring, plus the
  measured one-step expansion-frontier signal from `settler`. This is the strongest single
  policy for whole-game runs. It combines all EXISTING specialist knowledge; cross-turn
  saving, general opponent replies and multi-hop route planning remain future work.
- `slaver`, `civic`, `trader` — the master search and shared political scorer with
  different weights. Those weights apply to placement, Idea picks and purchases,
  economic moves and Assembly choices. See the [weight table](ai.md).

The economic policies project up to six remaining incomes one step at a time through the
canonical active-effect descriptors. Each step burns suppressed
collections, runs hunger, and recalculates authoritative income after projected pop
loss. Hunger draws no dice (freemen leave before citizens, from the fullest
settlement), so the projection runs the engine's own rule and never reads or advances
future game RNG.

How the bots work, their limitations, and the path to CPU opponents with
difficulty settings: **docs/reference/ai.md**.

Bot decisions use their own PRNG stream (persisted on the save as
`botRngState`), never the game's deck RNG — changing policy never changes
which cards come up.

### `batch` — balance simulation

```bash
npm run sim -- batch --games 50 [--turns 56] [--policy random|greedy|smart|beam|political|settler|master|slaver|civic|trader]
                     [--mode …] [--board classic|shuffled] [--ruleset-patch p.json]
                     [--tune-preset low-number-core-v1] [--tune-patch p.json]
                     [--seats p0,p1,p2,p3] [--rotate] [--seed 1000]
                     [--report .sim/report.json] [--csv .sim/turns.csv]
```

The default batch cap is **56 player-turns**, enough for all fourteen years. Shorter
caps are for partial experiments. Endings record `finalYear` and `winningTitles`
(the titles held by a race winner). Telemetry includes the opening player-turn and
excludes a terminal victory check with no income. For a full-game gate:

```bash
npm run sim -- batch --games 40 --turns 56 --policy smart --seed 1000
```

For the Step 10 handoff, run these jobs separately:

```bash
step10_out=$(mktemp -d)
# Ten seeds × four cyclic seat rotations = forty actual games.
npm run sim -- batch --games 10 --turns 56 --seats slaver,civic,trader,master --rotate --seed 1000 --report "$step10_out/batch.json" --csv "$step10_out/batch.csv"
npm run dev -- --port 5199
npm run ui:audit
npm run ui:conduct
node docs/reference/design/shell-v2/gates.mjs http://127.0.0.1:5199 --query '?dev=preload&seed=42' --click '.fateCard .ceremonyCommit' --out "$step10_out/gates"
node docs/reference/design/shell-v2/gates.mjs http://127.0.0.1:5199 --query '?dev=assembly4&seed=42' --out "$step10_out/gates-asm"
```

Look for forty finishes by the title race or Year-14 deck end, no action caps or
illegal commands, four setup picks per game, and at most one Idea purchase per seat.
In `perPolicy`, compare wins, all six final titles and final-card distributions.
Check that slaves/Estates, citizens/Forums/Laws and freemen/Marketplaces/Ports
appear in their builds, that bank moves fund useful actions, and that hunger falls
when a seat can pay for food. Venture counts need not be even: bots now choose
expected value, rather than cycling tables. Under the owner ruling of 2026-10-03,
calm covers the buyer's current turn-end check and still cannot take Beloved.
Compare `currencyVerbs.civicCalm` (calm bought), `riots.perGame` and
`riots.revoltsPerGame` with the earlier batch; look for legal calm purchases when
a +2 lift avoids a visible riot or revolt, and fewer riots per game. Capital Works is
weakly dominated by Urban Planning; other unused Ideas need context, not quotas.
Step 11 owns the 20–45% win-rate decision and any balance changes.

Time the forty-game rotation before starting Step 11's larger conditions. The
runtime target is under twenty minutes on one core. The performance follow-up
keeps width 3, depth 4 and all public venture outcomes; cached queries and scores
must preserve choices, full-game finishes and the absence of action caps.

The 2026-10-03 performance follow-up ran those forty rotations serially through
the runner and CLI telemetry hooks in a scratch Vitest harness: 17 minutes
6 seconds, no caps, and the same 13/14/5/8 wins for slaver/civic/trader/master.
The mixed seed-1000 game also matched all 425 commands and resulting states
against the original engine and AI. The lead still times the CLI itself.

For Step 11's minimum sixty rotated games per condition, use `--games 15 --rotate`
with the same four named seats and baseline seeds. `--games` counts base seeds;
rotation multiplies the actual games by four and records that total in `meta.games`.
Rotation is cyclic, not all 24 permutations. Repeating a personality in two seats
counts two finished seat-games per game; `perPolicy.winRate` uses that denominator.
A neutral `master` fourth seat gives each personality equal exposure.

Uniform and mixed examples:

```bash
example_out=$(mktemp -d)
npm run sim -- new --seed 42 --policy slaver --file "$example_out/slaver.json"
npm run sim -- auto --turns 56 --policy slaver --file "$example_out/slaver.json"
npm run sim -- new --seed 42 --seats slaver,civic,trader,master --file "$example_out/mixed.json"
npm run sim -- auto --turns 56 --seats slaver,civic,trader,master --file "$example_out/mixed.json"
```

Seat choices are command-line options, not new save fields: repeat them on `auto`.
Random openings stay uniform; policy openings use each seat's personality, and
fixed openings keep their scripted placements but score Ideas by seat.
`?dev=bots&seed=42` still runs `master` in every browser seat; the lead should let
one game finish. Audit and shell gates must retain the 25-row conduct ceiling and
pass at 1280, 1440 and 1920. No shell components change in Step 10.

Income, hunger and the player draw are recorded at turn start, including on
Year 14's last turn. Riots and revolts are checked at the acting player's turn end,
before the handoff, year boundary, Assembly or final tally. A riot roll records
its original player and year even when resolution opens the next turn. The next
income/draw is counted once when that turn opens. A year-card reveal is counted
even when the opener wins before collecting.

Runs `--games` self-contained games (game _i_ uses seed `base+i`), aggregates,
and writes a JSON report plus optional per-turn CSV (one row per
game/turn/player — pivot-table ready).

- `--board` — `classic` (default, reproducible) or `shuffled` (seeded random terrain,
  as the live game defaults to). Recorded in the report and in saves/scripts.
- `--tune-preset low-number-core-v1` — resolves the shared development preset before
  the batch. Unknown IDs fail. `meta` records the ID and stable full-content hash.
- `--tune-patch` — a dev tune-panel override map (the panel's "Copy patch" output):
  A/Bs building content (costs and effect sizes) and ruleset
  scalars in one run. It applies after the preset; the manual patch and its separate
  hash land in `meta`.
- `--seats p0,p1,p2,p3` — a policy per seat for mixed-policy tables. `--rotate` runs
  each seed through four cyclic seat rotations, cancelling first-player advantage.

The report contains:

- `meta.tuningPresetId` / `meta.resolvedContentHash` — the named preset and stable
  fingerprint of the complete effective content package; manual tune metadata remains
  separate
- `meta.definition` — the exact ruleset/content versions, hashes, and combined definition
  identity used by every game in the batch
- `perGame` — seed, `termination` (victoryRace|deckExhausted|turnCap), `winner`
  (null for turn-capped games), `leaderAtCap`, final cards + pops lost per player,
  and the seat→policy map for mixed runs
- `perYear` — end-of-year victory-card/pops/food/happiness percentiles (mean,
  p10, median, p90) pooled across games and seats, plus unrest-tier and active-effect
  player-turn shares
- `perSeat` — real `winRate` (finished games only), `capLeaderRate` (turn-capped
  games), and mean final cards per seat (first-player advantage check)
- `riots` — riots resolved per game, revolts per game (`revoltsPerGame`), the share of
  player-turns that ended on the riot table, and the same counts year by year
  (`byYear`), so a report can cut the late game. The CSV carries the level as
  `happiness` and the `unrestTokens` count per row
- `hunger` — food under work slots, per seat: incomes that left a mouth unfed per
  game, pops lost to hunger per game, mean idle slaves and their share of all slaves.
  The CSV carries `slaves`, `idleSlaves` and the running `popsLostToHunger` per row
- `terminations` — how games ended (the winRate denominator context)
- `forced` — action-cap hits / forced resolutions / forced end-turns (previously hidden)
- `winsByPolicy` — wins credited to each policy over finished games, including
  uniform CLI batches
- `movesByType` — zero-filled total and per-game counts for every typed legal move;
  this universal table makes missing or unexercised action paths visible
- `activeEffects` — zero-filled observations, per-player-turn counts, and player-turn
  prevalence for every canonical active-effect kind (suppression, hunger, the
  year card, Laws, Ideas, and pending Directives)
- `nationalIdeas` — setup picks, in-play purchases, finished holder seat-games, wins
  and holder win rate per Idea, including zeroes. Each game records ownership and
  acquisition route; capped games count acquisitions but never holder wins.
- `buildings` — build counts and per-game rates
- `events` — draw counts by the twelve player-card kinds and eight year-card kinds;
  retired card IDs and choice-pick telemetry are gone
- `perPolicy` — finished/capped seat-game counts, wins and win rate, final victory
  card percentiles and zero-filled final title counts per policy/personality.
  Includes uniform batches. Capped seats contribute only to the cap count.
  `perGame.finalTitles` names the engine-derived title IDs held by every seat at
  the end; this includes deck finishes and caps for inspection.
- `finalCardsDistribution`
- `assembly` — agora engagement: assemblies held/game, Laws enacted / removed / standing,
  Directives and their target distribution, authored passes, prize resources, Voice claims
  and transfers, final Voice ownership/win correlation, authored-pass lead margin and
  concentration, gold and influence spent/game, votes bought and a per-verb breakdown.
  `assembly.perSeat` gives counts and per-game rates for Laws proposed and passed,
  authored Laws standing at game end, passed Directives, votes bought, Voice claims
  and table-turn observations of Voice held. CSV snapshots include standing
  authorship and whether each seat holds Voice.
- `currencyVerbs` — per-verb currency-move counts (bank / Dole / calm / ladder / venture / riot)
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
  "stateSchemaVersion": 9,
  "commandSchemaVersion": 5,
  "seed": 42, // game seed: decks, board draws, table rolls
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
schema versions, or a recipe/state mismatch. Step 10 keeps state schema 9 and command
schema 5 and rejects older recipes. The save container format remains v2.

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
    .stackPlayerEvent("player-free-settlers") // rig the next draw (before .opening()!)
    .opening() // scripted 4-player opening → gameplay
    .withResources("0", "wealthy")
    .withSettlement("2", "0,0", "city", { citizens: 2, freemen: 1, slaves: 0 })
    .withHappiness("2", -2) // places the Unrest tokens that bring the level to −2
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
- `batch` trims each game's log to 200 entries without changing entity IDs or rules
  outcomes. `auto` and manual play never trim, so saves stay byte-replayable.
