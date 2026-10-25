---
status: proposed
phase: "post-v2"
updated: 2026-10-25
---

# Board modes: Continental and Archipelago

## Outcome

A game is played on one of two boards, chosen before setup:

- **Continental**: one landmass. This is today's shuffled board, renamed, and the default.
- **Archipelago**: islands and groups of islands with sea between them. The sea changes where
  a seat can settle, who it can reach and what it has to trade for.

## Non-goals

- Ships as units, fleets or fighting at sea.
- A fair board. On 2026-08-22 the owner declined seat balancing: sane placements on whatever
  board is dealt, not equal boards. The generator must give every seat a legal, playable
  start, not an equal one.
- The screen that picks the board. That is the [game settings plan](game-settings.md).
- Changing the authored fixed board. It stays for tests and the scripted opening.

## Settled inputs

- Owner, 2026-10-24 and 25:
  - Two board modes, Continental and Archipelago. In Archipelago, islands and island groups
    affect play.
  - The shuffled board is the sim's default (done on `feat/game-settings-engine`).
  - Archipelago is its own spec and branch, built by another agent in its own worktree.
- The [2026-10-24 balance batches](../reports/simulation/2026-10-24-balance-lines.md) showed
  that the board alone moves balance a lot. Moving from the authored board to the shuffled
  one:
  - cut the trader's hunger from 3.3 to 1.1 pops a game;
  - cut Beloved's link to luxuries from 88% to 52%;
  - halved influence growth.

  Archipelago must be judged by batches, not by eye.

- **The first pick takes the richest coastal tile, not the centre** (2026-10-25). This comes
  from replaying the setup of the 40 four-master games in those batches, on the shuffled board.
  - Seat 0, which places its capital first, builds on the rim in 36 of 40 games. That is a
    mean distance of 2.85 from the centre, where 3 is the rim. Its capital is coastal in 90% of
    games and has the most slots: 5.05, against 3.88 for seat 3.
  - Seat 1 takes the middle: a mean distance of 1.90.
  - Seat 0 then wins 17 of 40, with the same early income as the others.
  - The likely cause is the coastal leapfrog. A coastal capital may found on every coastal
    tile from turn one, and the luxury goods sit on the coast.
  - The owner's reading is that reach comes from the richest coastal tile, wherever it lies.
    An overnight batch with the leapfrog off tests it.

- Coast is an occupancy query: a tile is coastal when a neighbouring cell holds no tile. The
  [luxury plan](luxury-goods.md) chose this so that "a later archipelago has the same coast in
  every engine rule".
- The [2026-07-23 production-gate report](../reports/product/2026-07-23-phase-3c-production-gate.md)
  proposed one shared board topology for every rule and renderer, and warned against rules that
  branch on the layout's name.

## What exists today

**The board**

- One hex disc of radius 3: 37 tiles, 18 of them on the rim.
- It is laid from a 37-entry terrain deck: 15 forest, 8 mountain, 8 plains, 5 hill and the
  oracle.
- The map builder indexes the deck by the disc's coordinates, so a deck of another length
  breaks it.
- Continental (named `shuffled` until slice 1) is a seeded shuffle of that deck over the same
  37 cells. Nothing is constrained: landmarks can cluster or land on the rim.
- The sea is any cell that holds no tile. There is no sea tile type.

**Rules that read the sea today**

- **Founding colony at setup.** It may go on any coastal tile (the founding voyage), or next to
  the seat's own settlements.
- **Founding in play** (coastal leapfrog). A seat that holds any coastal tile may found on any
  other coastal tile. Any shore reaches any shore.
- **The Port** needs a coastal tile and an unclaimed luxury good beside it.
- **Luxury moorings.** A good sits on a vertex shared by two tiles and one sea cell. Six goods
  are spread evenly around the coast, or placed at random from the seed.
- **Everything else ignores the sea:** pop moves, trade, ventures and city spacing. Distance is
  plain hex distance, with sea cells counted like land.
- Since slice 1, every rule here that reads the coast, a neighbour or a distance asks the board
  topology, never the layout's name.

**Bots, maps and tests**

- The bots' placement scoring reads the board through three things: the tiles the seat could
  found on, the luxury goods within reach, and colonies that could later become cities.
- The 2D map draws one shape per tile and fits whatever tiles exist, so gaps would render.
  The arrow keys move to the nearest drawn tile in the pressed direction, not by the
  topology, so they would jump across gaps.
- The 3D living map is a showcase, not part of the app. It assumes one disc centred on the
  origin.
- 32 test files use the scripted opening and 23 hard-code tile ids of the authored board. They
  stay on it.

## The builder's first deliverable: a working generator

Every Archipelago board is generated at random from the game seed. The owner judges the system
that generates them, not a few chosen maps (owner, 2026-10-25: "a system that actually works
and delivers"). Before anything is wired into the game, the builder delivers:

- **The generator, as code meant to ship.**
  - A pure, seeded function from a seed and the terrain content to a board: tile coordinates
    and terrain.
  - It uses the game's own RNG.
  - Its limits (item 2 below) are named parameters with defaults.
  - It stays out of the game's setup path until the owner approves it.
- **A validation run over at least 1,000 seeds.**
  - Every board meets every limit.
  - Every board gives four legal starts, checked with the engine's own placement rules.
  - It reports how often a board is redrawn, how often the fallback is used, and the time per
    board.
  - It reports the spread of tiles, islands, group sizes, coastal tiles, moorings and plains
    per group across seeds.
  - The run is light: it generates boards and plays no games.
- **A one-page artifact.**
  - A grid of boards from consecutive seeds, not chosen ones.
  - The spreads.
  - Each parameter and what changing it does.
  - The builder's answers to items 3 to 6.
- **A question in [questions.md](../questions.md)**, asking the owner to approve the generator
  and its defaults, and to pick the sea rules.

The game's rules for the sea, the map, the bots and the sim flag wait for that answer.

1. **Shape.**
   - How many islands, how large, how grouped.
   - Total land against today's 37 tiles, since batches compare the two.
   - Whether island groups are one sea cell apart or more.
2. **Generator limits.** Numbers the generator enforces on every seed, rejecting and redrawing
   a board that breaks them (owner, 2026-10-25):
   - **Islands:** the fewest and most per board, the smallest and largest island in tiles,
     and whether a one-tile islet may exist at all.
   - **Groups:** the fewest and most islands per group, the number of groups, the sea gap
     inside a group and between groups.
   - **Compact islands:** no chains or snakes. An island of n tiles fits in a small radius
     around its centre; a line of islands like 1-1-1-1 across the board is impossible.
   - **Map size:** the whole board fits a fixed radius and a width-to-height limit, so it
     fits the screen. Groups spread around the board rather than in a row.
   - **A bounded redraw:** a fixed number of tries, then a fallback that always passes, so
     setup never hangs.
3. **Resources.** Whether each island can feed and build for itself, or each lacks something.
   An island without plains must buy its food, which ties in with
   [recurring deals](recurring-deals.md) and the removal of base income.
4. **What the sea limits.** Today any shore reaches any shore. On an archipelago nearly every
   tile is coastal, so this rule decides both whether islands mean anything and how much the
   first pick is worth. Weigh at least these:
   - **Island hopping:** found across water only within N hexes of one of the seat's own
     coastal settlements. The owner floated about 3.
     - Test N = 2, 3 and 4, unlimited (today's rule), and no leapfrog.
     - For each, measure over the 1,000 seeds how much the first capital pick is worth: the
       bots' placement score of the first pick against the fourth.
     - Then recommend one value.
   - Founding free within the seat's own island group, with a Port needed to cross to another
     group.
   - Pop moves between islands costing more or taking a turn longer.
   - A Port required to found, move or trade across water.
   - Trade left as it is.

   Name which rules change and which stay.

5. **Starts.** Every seat gets a legal capital and colony with room to grow. Say whether seats
   start on separate islands or share them. Equal starts are not required.
6. **Landmarks and goods.**
   - Where the oracle and the landmarks may fall.
   - Islands have more coast, which means more moorings: keep six goods, or scale them.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                                                     |
| ---------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | Yes      | One board generator per mode; the layout type gains `continental` and `archipelago`; the sea rules the owner picks; invariants; a state schema bump; tests            |
| Frontend         | Yes      | The 2D map renders sea between islands; arrow keys move sensibly across gaps; founding, move and Port prompts say when water blocks them; the rulebook and `rules.md` |
| Simulation & AI  | Yes      | `--board continental\|archipelago\|scenario`; placement and frontier scoring under the new sea rules; telemetry for founding and moves across water; batches          |

## Architecture impact

- **Per-match setting.**
  - The board mode stays on the state (`boardLayout`), generated from the game seed and
    recorded in saves and scripts.
  - Slice 1 renamed `shuffled` to `continental`, and the authored board `classic` to
    `scenario`, since `classic` clashed with the default settings preset the owner calls
    Classic (owner, 2026-10-25). State schema 18: older saves and scripts are rejected under
    the versioning rule, with no aliases.
- **Topology.** One board topology (land cells, neighbours, coast, water distance) that every
  rule and renderer reads. No rule branches on the mode's name. Slice 1 built it with the
  land cells, neighbours and coast that today's rules read; water distance comes with the
  sea rules.
- **Determinism.** The generator draws from the seeded RNG chain. Today the year and event
  decks shuffle before the terrain and the politician decks after it, so a change here moves
  the politician decks.
- **Save/replay.** Bump the state schema; older saves are rejected.

## PR slices

0. **The generator and its validation**, delivered as above. It may run alongside slice 1, using
   today's map helpers, and is rebased onto the topology module once that merges.
1. **Topology and the Continental rename.**
   - One topology module, with every coast and adjacency reader moved onto it.
   - `shuffled` becomes `continental`, and `classic` becomes `scenario`.
   - No behaviour change: batches match byte for byte.
2. **Archipelago in the game.** The approved generator wired into setup, the sea rules the owner
   picked, the 2D map, the bots and the sim flag.
3. **Batches.**
   - Mixed and masters tables, Continental against Archipelago, on the same seeds.
   - Run with base income at 0, as the game now plays.
   - A dated report.

## Acceptance and validation

- A test over many seeds: every Archipelago board meets every generator limit and gives four
  legal starts.
- Batches compare, against Continental:
  - hunger and food traded;
  - Ports built;
  - wins by seat and by personality;
  - games ended by the race and by the clock.
- The owner plays one Archipelago game.

## Retirement

After validation, update `rules.md`, the rulebook and the simulation reference. Then move this
plan to `docs/archive/plans/` with its PRs and the batch report.
