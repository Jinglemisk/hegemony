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
                  [--board continental|archipelago|scenario] [--bot-seed N] [--file path]
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
  keeps plains slots for the slaves that feed it. Dole moves (and bank moves, where a
  ruleset keeps the bank) enter search; each food the seat is short of now has a
  price, so it buys what it lacks and holds none ahead. Its forecast buys the food
  later years lack by the Dole, so a seat that can pay for imports grows past what
  its land feeds.
  Deterministic.
- `beam` — a within-turn **beam search** over the same `smart` score, so it values the
  within-turn sequences one-ply misses (build-then-promote chains). It does
  not search through `endTurn`, so the six-turn income projection is state evaluation,
  not income-to-future-action planning.
  Evaluates ventures as chance leaves using every public
  outcome, independently of the live die/deck stream. A riot on the table has one
  shared handler: it buys the insurance that saves more than it costs and then
  rolls. Record→replay remains deterministic. A `smart`-vs-`beam` A/B
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

Every search policy answers the offers that name its seat, and the master family
offers on its turn and in a sitting (see [AI](ai.md#trade)). The runner routes by who
may act: a seat an open offer names answers before the turn goes on, and an answer
does not count toward the turn's 30 actions. `--seats` gives each seat its own
answers.

The economic policies project up to six remaining incomes one step at a time through the
canonical active-effect descriptors. Pops on the move arrive before the first of them.
Each step burns suppressed
collections, settles hunger at the projected turn end, and recalculates authoritative
income after projected pop loss. Hunger draws no dice: the projection applies the engine's freemen-first default
(freemen before citizens, from the fullest settlement), the same choice the hunger
card opens with, and never reads or advances future game RNG. At the table the
hungry seat chooses; bots score the legal splits (see [AI](ai.md#hunger)).
Before anyone leaves, a later step buys the missing food through the engine's Dole
(and bank, where a ruleset keeps one) on the projected copy, and the stocks fall by
what was paid. The current turn and setup are not bought for. A projected riot is
charged the riot table's expected loss at the seat's weights, and the pops it is
expected to take leave the projected board once they add up to a whole one.

How the bots work, their limitations, and the path to CPU opponents with
difficulty settings: **docs/reference/ai.md**.

Bot decisions use their own PRNG stream (persisted on the save as
`botRngState`), never the game's deck RNG — changing policy never changes
which cards come up.

### `batch` — balance simulation

```bash
npm run sim -- batch --games 50 [--turns 56] [--policy random|greedy|smart|beam|political|settler|master|slaver|civic|trader]
                     [--mode …] [--board continental|archipelago|scenario] [--ruleset-patch p.json]
                     [--tune-preset low-number-core-v1] [--tune-patch p.json]
                     [--seats p0,p1,p2,p3] [--rotate] [--seed 1000] [--jobs N]
                     [--without-ideas all|id,id]
                     [--report .sim/report.json] [--csv .sim/turns.csv]
```

The default batch cap plays the whole year deck, one player-turn a seat a year: **56
player-turns** for fourteen years and four seats. Shorter caps are for partial
experiments. Endings record `finalYear` and `winningTitles` (the titles held by a race
winner). Telemetry includes the opening player-turn and excludes a terminal victory
check with no income. For a full-game gate:

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
In `results.perPolicy`, compare wins, all six final titles and final-card distributions.
Check whether slaves/Estates, citizens/Forums/Laws and freemen/Marketplaces/Ports
appear in their builds (the trader raised 12 Marketplaces in the 40 games of Step 17's
batch), that trades and Doles fund useful actions, and that hunger falls
when a seat can pay for food. Venture counts need not be even: bots now choose
expected value, rather than cycling tables. Under the owner ruling of 2026-10-03,
calm covers the buyer's current turn-end check and still cannot take Beloved.
Compare `currencyVerbs.civicCalm` (calm bought), `riots.perGame` and
`riots.revoltsPerGame` with the earlier batch; look for legal calm purchases when
a +2 lift avoids a visible riot or revolt. Since Step 19 a riot is charged what
the riot table takes, so expect less calm and more riots than in the batches
before it: a riot that calm would only move a year is faced. Capital Works is
weakly dominated by Urban Planning; other unused Ideas need context, not quotas.
Step 11 owns the 20–45% win-rate decision and any balance changes.

Time the forty-game rotation before starting Step 11's larger conditions. The
runtime target is under twenty minutes on one core; `--jobs 4` plays the same forty
games on four worker processes and writes the same report. The performance follow-up
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
counts two finished seat-games per game; `results.perPolicy[name].winRate` uses that denominator.
A neutral `master` fourth seat gives each personality equal exposure.

A rotation that repeats a seating already played is the same game again, so it is
skipped: four identical seats play each seed once, and `a,b,a,b` plays it twice.
`meta.rotations` records the seatings played per seed (1 without `--rotate`), and the
batch prints a line when fewer than four differ.

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

Income and the player draw are recorded at turn start, including on Year 14's last
turn. Each hunger choice counts as one hunger turn: it is made when a seat ends its
turn short of food. Riots and revolts are checked at the acting player's turn end, after hunger and
before the handoff, year boundary, Assembly or final tally. A riot roll records
its original player and year even when resolution opens the next turn. The next
income/draw is counted once when that turn opens. A year-card reveal is counted
even when the opener wins before collecting.

Runs `--games` self-contained games (game _i_ uses seed `base+i`), aggregates,
and writes a JSON report plus optional per-turn CSV (one row per
game/turn/player — pivot-table ready). Each game is gathered by itself and the
games are added up in game order, so every figure in the report is built from the
whole batch's game rows, turn snapshots and counts.

Each CSV row is one seat at the start of one player-turn, after the acting seat's
income and before it acts. After a game's turns come four more rows, one a seat, with
`final` set to 1: the state the game ended on. In a finished game no turn row shows
it, since the last turn's effects land after its snapshot. The columns
added in Step 18 sit at the end, so older columns keep their places: `policy` (the
seat's personality that game), `actingSeat`, `winner` (the game's winner, empty for a
capped game), `final`, `belovedHolder` (the seat holding Beloved, empty for none; the
same on all four rows) and `activeLuxuries`.

- `--board` — `continental` (default since 2026-10-24: seeded random terrain, as in the
  live game), `archipelago` (the same deck laid as islands in groups by the
  [generator](../reports/simulation/2026-10-25-archipelago-generator.md), drawn from the
  game seed) or `scenario` (the authored fixed board; `new --opening fixed` falls back to
  it). Reports before 2026-10-24 ran on the authored board unless they say otherwise. Until
  2026-10-25 the first and last were named `shuffled` and `classic`; older reports use those
  names, and the old names are now rejected. Recorded in the report and in saves/scripts.
- Island hopping is the ruleset value `placement.seaReach`, set with `--ruleset-patch`. A
  colony that does not border one of the seat's settlements must lie on a coastal tile
  within that many hexes of one of the seat's coastal settlements, in play and for the
  founding colony at setup (the capital is then the only one, so an inland capital's colony
  must border it). `null`, the default, is any shore to any shore. It reads no board name,
  so it applies on any board. Archipelago batches play hop 4, Q81's recommendation:
  `--board archipelago` with a patch of `{"placement":{"seaReach":4}}`.
- `--years N|open` — the game's length (`victory.years`, 14 by default), folded into the
  ruleset patch. A game longer than the 14-card year deck reshuffles it; `open` plays until
  the race is won, with a safety stop at year 40. `batch`'s default `--turns` follows it.
- `--tune-preset low-number-core-v1` — resolves the shared development preset before
  the batch. Unknown IDs fail. `meta` records the ID and stable full-content hash.
- `--tune-patch` — a dev tune-panel override map (the panel's "Copy patch" output):
  A/Bs building content (costs and effect sizes) and ruleset
  scalars in one run. It applies after the preset; the manual patch and its separate
  hash land in `meta`.
- `--seats p0,p1,p2,p3` — a policy per seat for mixed-policy tables. `--rotate` runs
  each seed through its distinct cyclic seat rotations (four for four different
  seats), cancelling first-player advantage.
- `--without-ideas all|id,id` — takes those National Ideas out of the batch's content.
  With `all` the setup draft is skipped and nothing is bought in play. A partial list
  must leave an Idea for every seat. `meta.withoutIdeas` records the list, and the
  definition ID changes with the content.
- `--jobs N` — plays the games on N worker processes and still writes one report and
  one CSV. The default is 1: every game runs in the command's own process. N is capped
  at the machine's cores less one (the help text gives the number) and at the number
  of games. A free worker takes the next game, so a slow core plays fewer. A game
  depends only on its seed and seating and keeps the index it has in a serial run, so
  the report and the CSV are the same for any N; `meta` does not record N. Progress
  lines count the seeds finished and name the one that finished last, which with
  workers is not always seed order. If a worker stops early the batch stops and writes
  no report.

The report contains:

- `meta.tuningPresetId` / `meta.resolvedContentHash` — the named preset and stable
  fingerprint of the complete effective content package; manual tune metadata remains
  separate
- `meta.definition` — the exact ruleset/content versions, hashes, and combined definition
  identity used by every game in the batch
- `meta.rotations` — seatings played per seed: 1 without `--rotate`, otherwise the
  distinct cyclic rotations. `meta.seatPolicies` is the base seating only; with
  rotation every per-seat figure mixes personalities, and the summary says so

**Cuts.** Every per-seat and per-personality figure has one shape, a cut:
`{ total, perSeat, perPolicy }`, the same figure over the table, over each seat and over
each personality, whichever seat it sat in. A count is `{ count, perGame }`, where
`perGame` is per game for the total and per seat-game for a seat or a personality. Each
fact is counted once, where the engine records it: commands, buildings and draws from
the reach counts, revolts and authored passes from the engine's counters, Assembly
spending from the stock change.

- `perGame` — one row a game: seed, `termination` (victoryRace|deckExhausted|turnCap),
  `winner` (null for turn-capped games), `leaderAtCap`, `decidedBy`, `winningTitles`,
  `voiceHolder`, `assembliesHeld`, `yearCards` in the order they turned, the game's own
  counts (`voiceTransfers`, `prizesGranted`, `actionCapHits`, `forcedResolutions`), the
  seat→policy map for mixed runs, and `seats[seat]`: everything the seat did that game,
  counted once as it played, and where it stood at the end (final cards and titles, pops
  lost, luxuries, gold, Ideas). `leaderAtCap` is the first seat of the engine's own
  age-end tally, so pops on the move count in its tiebreak. `decidedBy` is `race` (the
  title race), or at the deck's end `titles`, `happiness`, `pops` or `seat`, the first
  key that separated the top two seats; null for a capped game
- `terminations` — how games ended (the win rate's denominator context)
- `results` (cut) — finished and capped seat-games, wins and `winRate` (finished games
  only), cap leads and `capLeaderRate`, `winsDecidedBy`, `finalCards` percentiles over
  finished seat-games and zero-filled `finalTitles`. `results.perSeat` is the
  first-player check
- `perYear` — victory-card/pops/food/happiness/gold percentiles (mean, p10, median, p90)
  pooled across games and seats, `influence` as a cut of percentiles, and unrest-tier
  and active-effect shares. Each row is every game's last snapshot of that year: the
  start of the year's last turn, when its seat has collected and not yet acted, so one
  seat in four carries an unspent income. Step 11's influence rule reads
  `influence.total.median` for years 10 to 14; the Assembly sits in even years only, so
  the steps alternate
- `riots` (cut) — `riots` resolved and `revolts`, `turnShare` (the group's own turns
  that ended on the riot table) and `byYear` rows of `riots`, `revolts` and
  `playerTurns`, so a report can cut the late game. A revolt rolls nothing, so it is not
  in `riots`. The CSV carries the level as `happiness` and the `unrestTokens` count per
  row
- `hunger` (cut) — `hungerTurns` (turns that ended short of food), `popsLost`, and the
  mean idle slaves and their share of all slaves. Which class left at the hunger picks
  is in `reach` as `hunger:freemen` and `hunger:citizens`, one count per pop. The CSV
  carries `slaves`, `idleSlaves` and the running `popsLostToHunger` per row
- `foodPurchases` (cut) — `turnsBegunShort` (turns the acting seat began with food below
  zero, after income) and the food bought in two states: `coveringShortfall` while the
  stock is below zero, `buyingAhead` at zero or above. Each has `bankBuys` (only where a
  ruleset keeps the bank), `doles`, the `food` gained and the `gold` and `influence` paid
- `beloved` (cut) — Step 11's luxury rule, by the holder's personality: `turnsHeld` and
  how often the holder was the luxury leader, both ways of counting a tie.
  `soleLuxuryLeader` needs more active goods than every other seat;
  `luxuryLeaderOrTied` needs at least one good and no seat with more. Goods are counted
  in a Blockade year too, when they add nothing
- `influenceSpent` (cut) — influence paid by sink: `dole`, `ideas`, `calm`, `votes`
  (bought votes), `patronage` (riot insurance), `draws` (the Assembly draw, the price of
  proposing), `repeals` and `demotions`. Each amount is what the seat's stock fell by at
  the purchase, so a price changed by an Idea or a Law is counted as paid
- `trade` (cut) — player trade. Offers and the trades they settled belong to the
  offering seat, answers to the answering seat, units to whichever side moved them.
  `offers` by how they closed: `settled` (accepted, or a counter taken; a settled offer
  is a trade), `withdrawn`, or `closed` with the window (the turn or the preparation
  ended with it open). `settledInSitting`; `answers` by kind (accept, counter, decline);
  `given` and `received` by unit (wood, stone, food, gold, influence, goods, and pops by
  class); `titleChanges` (trades after which a title changed holder); `prices`, what one
  unit of a material fetched where one side was that material alone and the other one
  other stock, by material and then that stock, priced by the seat that sold it; and
  `exports`, the headline: per material, the games in which a seat of the group was the
  one whose land made the most of it (or the least), by its income summed over the
  game's snapshots, and the units that seat sent out a game, given less received. Trade
  works when the most-making seat's figure is positive and the least-making seat's
  negative. The summary prints the trade section only when the batch had offers
- `forced` — action-cap hits and forced resolutions (events, hunger picks and riots).
  The cap counts a seat's actions up to its `endTurn`; the hunger pick and riot choices
  that follow are the seat's own and are not counted, and neither is an answer to
  another seat's offer
- `movesByType` — zero-filled total and per-game counts for every typed legal move;
  this universal table makes missing or unexercised action paths visible
- `activeEffects` — zero-filled observations, per-player-turn counts, and player-turn
  prevalence for every canonical active-effect kind (suppression, hunger, the year
  card, Laws, Ideas, and pending Directives). The shares are over every seat in every
  snapshot, not over acting seats. `hunger` is the food warning (food income or stock
  below zero), not a hunger turn: the summary prints it as "food warning", and hunger
  turns are in `hunger`
- `nationalIdeas[id]` (cut) — setup picks, in-play purchases, finished holder
  seat-games, wins and holder win rate per Idea, including zeroes. Capped games count
  acquisitions but never holder wins. A personality drafts the same Idea most games, so
  read `perPolicy` beside the pooled rate
- `reach` (cut) — zero-filled use counts for every command, building, player card, year
  card, venture, Law and Directive (proposed and passed), Idea (setup and bought), calm
  payment, bank trade per material, ladder rung, growth, bought vote, riot insurance and
  politician draw, with per-seat-game rates. A hunger pick adds one count per pop sent
  away, by class. The summary prints every item under 0.2 a game as "Low reach". A zero
  is a bot that cannot see the move, a weak move, or a move that does nothing; the
  [reach audit](../reports/simulation/2026-10-04-v2-ai-reach-audit.md) shows how to tell
- `classes` (cut) — slave, freeman and citizen percentiles over every turn snapshot of
  the group's seats
- `drawSwings` — each resolved player card's immediate change in resources, pops and
  Unrest tokens, against that seat's projected income at the draw (`ratio`). That
  income is the next one printed, with food upkeep counted as a gain. `collected` is
  what the seat's stock changed by at this turn's income, under this year's card;
  `collectedMagnitude` sums its gains only; `collectedRatio` is the card's resource
  change over it. Both are empty for a game's opening turn when the setup was not
  observed
- `drawSwingSummary` (cut) — `draws` and those `discarded` for no room;
  `resourceCards` with the percentiles of their `collectedRatio`; `popCards` and
  `popsMoved`; `tokenCards` and `tokensMoved`; and `unchanged` (a loss with nothing to
  take, or no token to clear). Pop and token cards are counted in their own units
- `buildings`, `upgrades`, `currencyVerbs` (bank, Dole, calm, ladder, venture, riot)
  and `events` (draws by the twelve player-card kinds and eight year-card kinds) are
  read off the reach counts
- `luxuries` — goods claimed and active a game, their mean standing happiness per seat,
  and the end-of-game gold distribution
- `assembly` — `seats` (cut): Laws proposed, authored passes split into Laws and
  Directives, authored Laws standing at the end, votes bought and their gold, Voice
  claims and table-turns held, repeals filed, passed and failed, and passed Directives
  aimed at the seat. Beside it: sittings `held`, `prizesGranted`, `voiceTransfers`,
  `voiceHoldersAtEnd`, `voiceHolderWins`, the authored-pass lead margin and leader
  share, `lawsRemoved` (passed less still standing), the influence spent on votes,
  draws and repeals, and a per-verb breakdown. CSV snapshots include standing
  authorship and whether each seat holds Voice

Step 11's rules read from one rotated report, with no second script:

- Riots after year 7: `riots.total.byYear` rows for years 8 to 14, `riots` over
  `playerTurns`; `riots.perPolicy` for whose riots they are. Revolts sit beside them.
- Influence: `perYear[].influence.total.median` for years 10 to 14,
  `perYear[].influence.perPolicy` for the build behind it, and `influenceSpent` for
  where it goes.
- Win rates: `results.perPolicy[name].winRate`, with `winsDecidedBy` for how many are
  tiebreak wins.
- Beloved and luxuries: `beloved.total`, under either reading of a tie.
- Draws: `drawSwingSummary`.
- Length and endings: `terminations`, and `perGame[].finalYear`, `turnsPlayed` and
  `decidedBy`.
- Trade: `trade.total.exports`, and the trade commands in `reach`.

The summary prints each of these. The runaway-leader rule is not covered: its terms
wait for an owner answer (Q80). Reports written before player trade's second PR used
older names: `perSeat`, `perPolicy` and `winsByPolicy` are now `results`;
`hungerPerPolicy` is `hunger.perPolicy`; `influenceByPolicy` is
`perYear[].influence.perPolicy`; `assembly.lawsEnacted` is
`assembly.seats.total.lawsPassed`.

**Economy switches.** Three ruleset values turn player trade's economy on piece by
piece, so the same seeds can play the game before it beside the game after it:
`trade.enabled` (offers and the Assembly's Ready step), `economy.bank.enabled` (the
bank's buy and sell, off by default; no screen offers it) and `economy.baseIncome` (what
each settlement makes on its own, by resource, all 0 by default; `{"economy":{"baseIncome":{"food":1}}}`
is trade PR 2's base food). The economy before trade is
`{"economy":{"bank":{"enabled":true}},"trade":{"enabled":false}}`, passed with
`--ruleset-patch`.

Identical inputs produce byte-identical reports (minus `meta.generatedAt`), and
the same CSV, whatever `--jobs` is. Compare two patches by running two batches with
the same `--seed` and diffing the reports.

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
  "stateSchemaVersion": 19,
  "commandSchemaVersion": 7,
  "seed": 42, // game seed: decks, board draws, table rolls
  "mode": "standard",
  "rulesetPatch": null, // deep-merged over the mode's ruleset
  "definition": {
    "identity": {/* ruleset/content versions, hashes, and combined id */},
    "ruleset": {/* exact immutable rules package */},
    "content": {/* exact immutable content package */},
  },
  "opening": "random",
  "boardLayout": "scenario",
  "botRngState": 123, // where the bot decision stream is parked
  "history": [{ "player": "0", "command": { "type": "endTurn" } }],
  "state": {/* full HegemonyState — plain JSON */},
}
```

The save is a _recipe_: replaying `history` from its pinned definition and seed
reproduces `state` byte-for-byte. Saves double as shareable bug reports and
balance scenarios. Loading re-hashes the definition and rejects tampering, unsupported
schema versions, or a recipe/state mismatch. The state schema is 12 and the command
schema 6 (`src/game/version.ts`); older recipes are rejected. The save container
format remains v2.

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
