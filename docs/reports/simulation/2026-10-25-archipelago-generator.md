# Archipelago generator: 1,000 boards and the sea-rule test

Date: 2026-10-25. Code: `feat/archipelago-generator`, with `main` at `565e3cf` (the board
topology, #139) merged in. One process at the lowest CPU priority, 12 minutes. It generates
boards and plays no games.

The first version drew every island as a round blob. The owner asked for varied shapes the same
day; this report is the run with them.

## Question

The [board-modes plan](../../plans/board-modes.md) asks for a working Archipelago generator before
anything is wired into the game, judged as a system over many seeds rather than by a few maps:

1. The generator as shipping code, its limits named parameters with defaults.
2. A validation over at least 1,000 seeds: every limit holds, four legal starts by the engine's
   own placement rules, redraw and fallback rates, time per board, and the spreads of tiles,
   islands, group sizes, coastal tiles, moorings and plains per group.
3. The sea-rule test: today any shore reaches any shore. Island hopping (found across water
   only within N hexes of one of the seat's own coastal settlements) at N = 2, 3 and 4,
   unlimited and no leapfrog, each judged by the bots' placement score of the first capital
   pick against the fourth, with today's Continental board as a reference.
4. Answers to the plan's items 3 to 6: resources per island, starts, landmarks and goods.

## Data

- **Seeds:** 1 to 1,000. Each seed's Archipelago board is generated from the seed, and the same
  seed's Continental board is built for the reference rows.
- **Rules and bots:** the standard rules as on `main` (base income 0), no National Ideas, the
  master bot's placement scoring (`evaluatePlacement`, default weights), as in the masters
  batches.
- **The board in a match:** the generated tiles replace the disc in a new match, and the luxury
  moorings and bank rates are derived from them the way match creation derives them. The engine
  is not changed.
- **The sea rules:** live in the script only. A rule keeps every engine placement check and
  swaps only the reach across water: a tile is legal when it borders the realm, or when it is
  coastal, the seat holds coast, and the rule reaches it. The bots' capital chooser is replayed
  with the frontier term of the score taken under the rule. On seeds 1 to 50 the replay picks
  the same capital as the bots' own chooser in every case, and on seeds 1 to 20 the same four
  capitals as a real master-bot setup on Continental. The founding colonies are replayed the
  same way; on seeds 1 to 50 under today's rule they match the bots' own colonies.
- **Redraws the shapes add:** each seed is also generated with round islands only
  (`islandShapes` of round 1, line 0, bent 0), the first version's islands.
- **Files:** the script is [`tools/validate.ts`](2026-10-25-archipelago-generator/tools/validate.ts);
  its raw output is [`validation.txt`](2026-10-25-archipelago-generator/validation.txt); the
  first 24 boards with their shapes and starts are in
  [`boards.json`](2026-10-25-archipelago-generator/boards.json).

```bash
nice -n 19 npx tsx docs/reports/simulation/2026-10-25-archipelago-generator/tools/validate.ts 1000 docs/reports/simulation/2026-10-25-archipelago-generator/boards.json "no leapfrog,hop 2,hop 3,hop 4,own group"
```

**How sure the numbers are:** the generator figures are exact counts over 1,000 boards. The
sea-rule figures are placement scores, not wins. The score values a position: the seat's
income, the best three sites it could found on next, and how many of those a rival could also
take. It does not see tempo. Under today's rule every seat reaches the same coast, so the score
gives the first seat no edge from the sea, while in play the first seat moves first and takes
the best of that shared coast. The batches in slice 3 measure that.

## Summary

- **The generator works.** No board in 1,000 broke a limit and none needed the fallback. 46% of
  boards pass on the first draw, the mean is 2.16 draws and the most was 17 of the 40 allowed.
  A board takes 5.5 ms on average and 40 ms at most.
- **Islands come in three shapes:** 36% round, 30% lines and 34% bent, each within a span of 4
  hexes. The shapes cost 0.37 draws a board: round islands alone take 1.79 on the same seeds.
- **Every board gives four legal starts.** Setups drawn at random from the engine's legal moves
  and setups by the bots both gave every seat a capital, a founding colony and a site to found
  on next, on all 1,000 boards.
- **Islands mean nothing under today's rule.** On an archipelago nearly every tile is coastal,
  and after setup a seat can found on 26 of the board's sites (median). The bots' founding
  colonies land in another island group 73% of the time.
- **Any limit on the sea raises the first pick's worth by the score.** After four capitals, seat
  0's score leads seat 3's by 5.1 under today's rule and 7.9, 9.8 and 10.1 at hop 4, 3 and 2.
  Hop 4 is closest to Continental today (5.5): seat 0 is the best placed of the four on 47% of
  boards, against 45% on Continental.
- **Recommendation: hop 4,** applied both in play and to the founding voyage at setup, as before
  the shapes. It cuts each seat's reach from the whole coast to its own group and the shores
  facing it, 9 or 10 sites, 11 after setup, and keeps the first pick near Continental's worth.
  Hop 3 is the alternative if the islands should bite harder: 6 or 7 sites, with seat 0 best
  placed on 65% of boards.

## 1. The generator

`generateArchipelago(seed, deck, limits)` in `src/game/archipelago.ts` returns the tiles, the
islands and groups as they lie, the shape each island was drawn as, the rng state after the
board, the draws it took and whether the fallback was dealt. It draws from the game's mulberry32
step, so a seed always gives the same board. It reads distances and neighbours from the board
topology (`src/game/mapTopology.ts`). Setup does not call it.

**Shape of a board.** The board holds today's whole deck: 37 tiles, 36 settleable and the
oracle, so batches compare the sea and not a different economy. The settleable land is split
into 6 to 9 islands of 3 to 7 tiles, in 3 or 4 groups of 2 or 3 islands. Islands of a group are
one sea cell apart; groups are two or three apart. The oracle stands alone at the centre with the
groups around it.

**Shape of an island.** Each island draws one of three shapes, equally weighted by default, among
those that can hold its tiles:

- **round:** grown tile by tile around a centre, inside the disc of radius 1, preferring the
  cells that touch most of it;
- **line:** along one hex axis, with at most one tile off its side, so a line of four with one
  tile beside it is a line; a line can hold at most six tiles within the span;
- **bent:** straight for at least two tiles, then one turn of 60° or 120°, so a line of three with
  a two-tile arm off one end is bent.

Every island's two farthest tiles are at most `islandSpan` hexes apart (4): a line of five fits,
a line of six does not.

**How a board is drawn.**

1. Pick the number of groups, then the number of islands within both the per-board and the
   per-group limits, then split the 36 tiles among the islands.
2. Give each group an even share of the circle round the centre, the whole turned at random
   and each group nudged by up to a tenth of its share.
3. Place the islands a group at a time in rotation, the largest of each group first. Each draws
   its shape, then tries up to 30 starting cells near its group; a line or bent island takes one
   of the ways it can lie there at random. No tile may come within the group gap of its own
   group, within the channel gap of another group, beside the oracle, outside its group's share
   of the circle, or beyond the map radius.
4. Deal the deck: each of the four landmarks to its own island, then one plains, forest and
   mountain to any group that lacks one, then the rest at random.
5. Check every limit with `checkArchipelago`, which reads islands and groups from the land
   itself, not from the draw. A board that breaks one is drawn again, up to 40 times. Then a
   fixed board of three groups of three islands is dealt from the same seed; the focused test
   shows it passes every limit on every deal.

**The limits** (`ARCHIPELAGO_LIMITS`):

| Limit | Default | What changing it does |
| --- | --- | --- |
| `islands` | 6 to 9 | Fewer means larger islands and more shared starts; more means smaller islands and more coast. |
| `islandSize` | 3 to 7 tiles | A minimum of 2 allows islands that hold a single colony site; a larger maximum needs a wider span or leaves big islands round. |
| `islet` | no | Allows one-tile islands: stepping stones that extend a hop rule's reach, and the 1-1-1-1 chain the plan rules out. |
| `islandSpan` | 4 hexes | The most hexes between an island's two farthest tiles. 3 rules out the long lines; 5 or more lets an island reach across its group. |
| `islandShapes` | round 1, line 1, bent 1 | The weight of each shape. A line holds at most six tiles, so seven-tile islands are round or bent. Line and bent at 0 give the first version's round islands. |
| `groups` | 3 or 4 | 4 can give every seat a group of its own; 3 makes seats share; 2 would split the board in halves. |
| `islandsPerGroup` | 2 or 3 | 1 would let a lone island count as a group; more needs a wider `groupRadius`. |
| `groupGap` | 1 sea cell | Islands of a group are two hexes apart. 2 loosens groups and enlarges the board. |
| `channelGap` | 2 to 3 sea cells | Groups are three or four hexes apart. Hop N crosses a channel only when N is at least the gap plus one: hop 3 crosses 2-cell channels, hop 4 crosses all. |
| `groupRadius` | 4 | Every tile of a group within 4 hexes of its middle; larger allows strung-out groups. |
| `mapRadius` | 6 | Every tile within 6 hexes of the centre. At 5 most draws fail with these gaps; at 7 there is more sea and smaller tiles. |
| `aspect` | 0.8 to 1.35 wide to high | A narrower range means more redraws. |
| `maxGroupAngle` | 150° | The widest angle between neighbouring groups seen from the centre; at 180° or more groups could stand in a row. |
| `draws` | 40 | Redraws before the fallback. A draw passes 46% of the time, so 40 failures in a row has odds near 10⁻¹¹. |

**No chains.** Each island fits its span, there are no one-tile islets, each group stays within
radius 4 of its middle, and the groups stand round the centre, so a line of islands across the
board cannot occur.

## 2. Validation over 1,000 seeds

| Check | Result |
| --- | --- |
| Boards breaking a limit | 0 |
| Boards from the fallback | 0 |
| Draws a board | 1: 464, 2: 267, 3: 117, 4: 69, 5: 36, 6 to 17: 47; mean 2.16 |
| Draws a board, round islands only | 1: 548, 2: 246, 3: 123, 4: 49, 5 to 8: 34; mean 1.79 |
| Time a board | mean 5.47 ms, median 3.90, 90th percentile 11.42, most 40.14 |
| Random legal setups without four legal starts | 0 of 1,000 |
| Bot setups: seats without a colony, without a site to found on next | 0 and 0 of 4,000 |

A capital can never be blocked: three capitals and their neighbours cover at most 21 of the 36
settleable tiles. A founding colony can go on any coastal tile, and nearly every tile is coastal.
The run confirms both.

**Island shapes**, of 8,019 islands:

| Shape | Share | Tiles | Span in hexes |
| --- | --- | --- | --- |
| Round | 2,900 (36.2%) | 3: 582, 4: 940, 5: 680, 6: 352, 7: 346 | 1: 423, 2: 2,477 |
| Line | 2,391 (29.8%) | 3: 609, 4: 873, 5: 617, 6: 292 | 1: 252, 2: 933, 3: 770, 4: 436 |
| Bent | 2,728 (34.0%) | 3: 618, 4: 884, 5: 643, 6: 282, 7: 301 | 1: 295, 2: 973, 3: 911, 4: 549 |
| All | 8,019 | | 1: 970, 2: 4,383, 3: 1,681, 4: 985 |

Lines fall short of a third because no line holds seven tiles. A three-tile line with its side
tile is a triangle, span 1.

**Spreads**, per board unless stated:

| Measure | Spread |
| --- | --- |
| Tiles | 37 on every board |
| Islands | 6: 126, 7: 112, 8: 379, 9: 383 |
| Groups | 3: 540, 4: 460 |
| Islands per group | 2: 2,361, 3: 1,099 groups |
| Island size | 3: 1,809, 4: 2,697, 5: 1,940, 6: 926, 7: 647 islands |
| Tiles per group | 6 to 19, median 10 |
| Plains per group | 1: 758, 2: 1,360, 3: 925, 4: 343, 5: 69, 6: 5 groups |
| Food slots per group | 3 to 31, median 11 |
| Coastal tiles | 34 to 37, median 37 (Continental: 18) |
| Moorings | 34 to 56, median 45 (Continental: 18) |
| Goods per group, six goods | 0: 6, 1: 1,172, 2: 2,018, 3: 264 groups |
| Width to height | 0.82 to 1.34, median 1.03 |
| Drawn size against today's disc | 1.57 times as wide, 1.82 times as high (medians) |

On the same screen the board's tiles draw at about 55% of today's size.

## 3. The sea rule

Each rule below replaces only the reach across water. After the four capitals are down, each
seat's position is scored in the same state, so seat 0 (first pick) and seat 3 (fourth pick) are
compared like for like. The gap is split into the frontier term, which is the sea, and the rest,
which is the tile. For scale, a 5-slot tile among a seat's best three founding sites is worth 10.

| Board, rule | Seat 0 lead over seat 3 (median) | Of which sea | Of which tile | Seat 0 best placed of four | Founding sites, seat 0 / seat 3 | Boards with two capitals on one island |
| --- | --- | --- | --- | --- | --- | --- |
| Archipelago, no leapfrog | 11.81 (12) | 9.22 | 2.59 | 98.2% | 2.8 / 1.8 | 10.9% |
| Archipelago, hop 2 | 10.12 (10) | 6.29 | 3.83 | 84.4% | 4.6 / 3.7 | 6.3% |
| Archipelago, hop 3 | 9.75 (10) | 5.71 | 4.04 | 64.8% | 6.9 / 6.0 | 11.2% |
| Archipelago, hop 4 | 7.89 (7) | 4.38 | 3.51 | 47.1% | 9.9 / 8.9 | 13.3% |
| Archipelago, own group free | 10.11 (9) | 5.98 | 4.13 | 61.2% | 8.2 / 7.8 | 10.7% |
| Archipelago, unlimited (today) | 5.08 (6) | 0.04 | 5.04 | 91.8% | 26.8 / 26.8 | 23.4% |
| Continental, unlimited (today) | 5.49 (5) | 1.69 | 3.80 | 44.8% | 13.6 / 10.7 | — |

Seat 0's score when it picks, with no rival on the board, is 239 under today's rule and 221 to
233 under the others; seat 3's is 209 to 215 under every rule. In the first version's run, with
round islands only, every lead was within half a point of these and every best-placed share
within four points: hop 4 then led by 7.9 with seat 0 best placed on 46% of boards.

**Reading it.**

- **Unlimited reach erases the islands.** Every seat reaches the same 27 sites, so the sea
  part of the gap is zero and the first pick is worth only its tile. Seat 0 still holds the best
  position on 92% of boards because it takes the best tile, and in play it moves first on a
  coast everyone shares.
- **Every limit makes the first pick worth more by the score,** because seat 0 can then choose
  a corner whose sites are its own, and the last seat gets the corners left. The tighter the
  limit, the larger the lead: 7.9 at hop 4, 9.8 at hop 3, 10.1 at hop 2, 11.8 with no leapfrog.
- **Hop 4 holds the first pick to Continental's worth:** a lead of 7.9 against 5.5, a quarter of a
  good founding site more, and seat 0 best placed on 47% of boards against 45%. A seat reaches
  9 or 10 sites: its own group and the near shore of the next.
- **Hop 3 makes the islands bite** (6 or 7 sites) and puts seat 0 best on 65% of boards. Hop 2
  never crosses a channel, since channels are at least two cells wide, so it behaves like a
  smaller "own group" rule with seat 0 best on 84%.
- **Free within the own group, a Port to cross to another,** scores like hop 3 (10.1, 61%) before
  any Port is built. It needs two new things: islands and groups known to the rules, and a Port
  that can be built without a luxury good beside it, or a seat without a mooring could never
  leave its group.
- **A Port to cross water** is, before the first Port, the no-leapfrog row: the largest lead, 11.8,
  seat 0 best placed on 98% of boards, and 5 seats left with no site at all. It also makes the
  Port a requirement for growth, which today it is not.
- **The same rule reaches Continental.** No rule branches on the board's name, so a hop limit
  applies on the disc too. There hop 4 moves the lead from 5.5 to 7.5 and seat 0's best-placed
  share from 45% to 52%, and no leapfrog moves them to 10.1 and 82%. Tonight's batch with the
  leapfrog off measures that in wins.

**The founding voyage.** Under today's setup rule the founding colony may go on any coastal
tile, and on these boards the bots send it to another group in 2,925 of 4,000 starts. A sea rule
for play leaves that untouched, so every seat would start astride two groups. With the voyage
limited by the same rule, measured from the capital, the bots place the colonies like this (of
4,000 seats; sites are those the seat can found on once setup ends):

| Rule, in play and at setup | Colony on the capital's island | Elsewhere in its group | In another group | Sites after setup, median (least) | Seats with no site |
| --- | --- | --- | --- | --- | --- |
| No leapfrog (beside the capital) | 100% | 0% | 0% | 2 (0) | 191 |
| Hop 2 | 62% | 38% | 0% | 4 (0) | 3 |
| Hop 3 | 38% | 52% | 10% | 7 (2) | 0 |
| Hop 4 | 28% | 49% | 23% | 11 (2) | 0 |
| Own group | 28% | 72% | 0% | 7 (2) | 0 |
| Today: any coast | 9% | 18% | 73% | 26 (23) | 0 |

No leapfrog and hop 2 can leave a seat with nowhere to found once setup ends: a capital and colony
on a small island whose other tiles are taken. Hop 3 and hop 4 never do on these boards.

## 4. Answers to the plan's items 3 to 6

**3. Resources.** Each group can feed and build for itself; each island need not. The deal gives
every group at least one plains, one forest and one mountain. Islands are left to chance: 28% of
islands have no plains, and 43% have all three resources. A plain shuffle of the same deck would
have left 6% of groups without plains and 13% without one of the three. A seat on a plains-less
island feeds itself by founding within its group or by trade, which is where recurring deals come
in.

**4. What the sea limits.** Island hopping at N = 4. Rules that change:
- founding in play: a coastal tile across water must lie within 4 hexes of one of the seat's own
  coastal settlements (today: any coastal tile while the seat holds coast);
- the founding colony at setup: the voyage reaches coastal tiles within 4 hexes of the capital
  (today: any coastal tile).

The range is one ruleset number, so the Continental board can keep unlimited reach or take the
same limit without a rule naming the board. Rules that stay: contiguity, capital and city
placement, the Port's requirement of a coastal tile and an unclaimed good, moorings, pop moves,
trade, ventures and city spacing, all on plain hex distance, and the coast as an occupancy
query. Pop moves across water and trade by sea are left as they are until batches show a need.

**5. Starts.** Seats may share an island; no new rule is needed. The generator always leaves at
least six islands, and the bots put four capitals on four islands on 87% of boards under hop 4
(77% today). Capitals usually sit in three of the groups. Every seat got a capital, a colony and
room to grow on every board, under today's rules and with the voyage limited to hop 4.

**6. Landmarks and goods.**
- The oracle stands alone at the centre, part of no island or group, so it never takes land from
  an island.
- The four landmarks (the breadbasket, the quarry, the two old-growth forests) each go to a
  different island, at random within it.
- Keep six goods, spaced evenly round the coast as today. With the shapes, islands have about 45
  moorings against Continental's 18. Six goods give a group one to three, but 6 groups in 3,460
  got none. If every group should have one, slice 2 can seat one good per group before spacing
  the rest. Scaling the goods would add named content and multiply the luxury happiness on the
  table: a balance change of its own.

## Next

- Owner decision: Q81, the generator's defaults and the sea rule.
- Then slice 2 wires Archipelago into setup with the chosen rule.
