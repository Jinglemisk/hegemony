# Owner questions

Only unresolved owner decisions live here. Answer in chat or after `Answer:`; the
answer is then incorporated into the affected plan and this entry is removed.
Recommendations are defaults for discussion, not silent authorization.

Last updated: 2026-10-22.

## Q80 — What shape should Step 11 take?

**Context:** The [sim parity audit](reports/simulation/2026-10-10-v2-sim-parity-audit.md)
found that three parts of Step 11 cannot run as written. The runaway-leader rule speaks of
"round 5" and "stock": a round is a v1 unit, and v2 never defined stock. Under rotated
personalities the income leader is a build, not a snowball. The plan asks for at least 60
games a condition, where a measured 20% could be anything from 12% to 32%; separating a 15%
win rate from the 20% floor needs about 470 games. The v1 baseline's tables cannot be
regenerated: the scripts that made them are gone, and v1 has no personalities and no class,
draw or riot-by-year telemetry. Steps 18 and 19 are merged, so this is the last input Step
11 waits for.

**Options:**

- **Runaway leader.** A: year 5's income leader, and stock as wood, stone, gold and food
  with the laggard counted as at least 1, as the baseline did. B: the same, measured in a
  batch where all four seats play the same personality, so the leader is a lead and not a
  build. C: drop the rule and report the figures only.
- **Games.** A: 60, as planned, with the uncertainty printed beside each rate. B: about 480
  (120 seeds × 4 rotations), once Step 19 lets batches run across cores. C: 60 for the rules
  that measure a level, 480 for the win-rate rule only.
- **v1 comparison.** A: drop it; judge v2 against the rules' thresholds alone. B: backport
  the telemetry to a v1 branch and rerun it with food floored at zero. C: compare only the
  fields both sides already have (win spread, game length, riots a game).
- **Win rates.** A: keep "each personality wins 20% to 45%" as a rule. B: report it as a
  bot matter, and judge the other rules on tables where all four seats play one policy.
  Step 19's five batches moved the trader's rate 30 points and the civic's 23 on the same
  rules.

**Recommendation:** Runaway leader B, games C, v1 comparison C, win rates B. Runaway leader
B answers the question the rule was written for. The win-rate rule is the only one a small sample cannot decide. The v1
backport is the largest item in the audit and v1 is not coming back, so its numbers would
change no decision.

**Same-policy batches (2026-10-11 and 12):** 40 games each with the master bot in all
four seats, seeds 1000 to 1039, on Step 19's build. `--without-ideas` takes Ideas out of a
batch.

|                                           | All twelve Ideas   | No Slave Colonies  | No Ideas           |
| ----------------------------------------- | ------------------ | ------------------ | ------------------ |
| Wins by seat, first to fourth             | 55 / 13 / 15 / 18% | 33 / 23 / 18 / 28% | 23 / 25 / 15 / 38% |
| Pops at the end of year 1, seat 0, others | 11.2, 6.3          | 6.7, 6.4           | 6.4, 6.2           |
| Pops a seat at year 14                    | 15.3               | 14.2               | 13.0               |
| Ended by the deck, by the race            | 35, 5              | 35, 5              | 37, 3              |
| Winner holds one, two, three titles       | 15, 19, 6          | 17, 18, 5          | 21, 15, 4          |
| Decided by the tiebreak                   | 11                 | 14                 | 14                 |
| Riot turns from year 8                    | 7.6%               | 7.4%               | 7.8%               |
| Median influence a year, years 10 to 14   | +5.0               | +5.3               | +3.3               |
| Turns begun short of food, of 2,240       | 730                | 662                | 738                |
| Dole uses a game                          | 52.5               | 51.9               | 48.3               |
| Pops lost to hunger a seat-game           | 0.41               | 0.27               | 0.61               |

- Slave Colonies makes the first seat's edge. Seat 0 drafts it in every game with all
  twelve Ideas, founds two colonies on its first turn and holds 11 pops against 6 at the
  end of year 1. Without the Idea seat 0 wins 13 of 40, and with no Ideas 9 of 40. On Step
  18's build the mixed table's seats were even and Slave Colonies was a late pick; Step
  19's bots put the slaves to work. Step 21 cut it to one slave per founding: on Step 20's
  bots seat wins went from 24, 8, 3 and 5 of 40 to 14, 6, 10 and 10.
- The fourth seat's 38% with no Ideas is 15 wins where 10 are expected, which 40 games
  cannot tell from chance.
- With no Ideas a seat grows from 6 pops to 13 in fourteen years. A third of all turns
  begin short of food, and the Dole covers it: 145 of the 208 influence a table spends in
  a game buys food.
- Games run to the deck with or without Ideas, and the winner most often holds one or two
  titles. About 2.5 of the six titles are held when a game ends. Treasurer is never held,
  and a table builds 0.1 Marketplaces a game.
- With all twelve Ideas the seat with the most pops at year 5 wins 24 of 39 games; with
  none, 12 of 29.
- Step 20 (2026-10-13) changed how the bots plan, and the no-Ideas column reads
  differently on its build: 630 turns begun short of food, 40.7 Dole uses a game, pops
  lost to hunger 0.46 a seat-game, 13.3 pops a seat at year 14, riot turns from year 8
  at 5.4%, 38 games by the deck and 2 by the race, the winner holding one, two, three
  titles in 10, 28 and 2 games, 11 decided by the tiebreak, wins by seat 23 / 30 / 13 /
  35%. Polis Builder is held at the end of 17 games where it was 4. The other two
  columns have not been run again.

**Trade batches (2026-10-22):** the no-Ideas batch again on trade PR 2's build, in three
economies ([report](reports/simulation/2026-10-22-trade-paired.md)). The bank column is
Step 20's economy and lands within a unit or two of its figures above.

|                                           | Bank               | Trade, no base food | Trade and base food |
| ----------------------------------------- | ------------------ | ------------------- | ------------------- |
| Wins by seat, first to fourth             | 23 / 30 / 13 / 35% | 25 / 15 / 30 / 30%  | 35 / 5 / 30 / 30%   |
| Pops at the end of year 1, seat 0, others | 6.2, 6.4           | 6.6, 6.5            | 7.0, 6.4            |
| Pops a seat at year 14                    | 13.4               | 14.4                | 16.4                |
| Ended by the deck, by the race            | 38, 2              | 36, 4               | 33, 7               |
| Winner holds one, two, three titles       | 11, 27, 2          | 17, 18, 5           | 9, 24, 7            |
| Decided by the tiebreak                   | 13                 | 15                  | 9                   |
| Riot turns from year 8                    | 5.4%               | 4.4%                | 3.6%                |
| Median influence a year, years 10 to 14   | +4.5               | +4.5                | +9.3                |
| Turns begun short of food                 | 629                | 510                 | 155                 |
| Dole uses a game                          | 40.5               | 41.8                | 19.3                |
| Pops lost to hunger a seat-game           | 0.46               | 0.62                | 0.02                |

- Base food, not trade, ends the food shortage. The influence the Dole took now piles up,
  at nearly twice the plateau rule's 5 a year.
- Seat 1 wins 2 of 40 with base food, which 40 games seldom give by chance.
- On the rotated table with base food the trader wins 23 of 40 and holds Treasurer at the
  end of 39: its gold piles up with no bank to spend it in, yet it still loses 3.3 pops a
  seat-game to hunger. That is part rules, part bot, and only a mixed table shows it. With
  trade and no base food the four builds win 20 to 33%.

**Answer:**

## Q81 — Approve the Archipelago generator, and which sea rule?

**Context:** The generator is built and validated over 1,000 seeds
([report](reports/simulation/2026-10-25-archipelago-generator.md)). It lays today's whole
37-tile deck as 6 to 9 islands of 3 to 7 tiles, in 3 or 4 groups of 2 or 3 islands, around the
oracle alone at the centre. Islands of a group are one sea cell apart, groups two or three. Each
island is drawn round, as a line (one tile may sit off its side) or bent (one turn), in roughly
equal shares, with its two farthest tiles at most 4 hexes apart. No board broke a limit, none
needed the fallback, and every board gave four legal starts. Each group holds plains, forest and
mountain; each landmark sits on its own island; six goods reach all but 6 of 3,460 groups. The
board draws about 1.6 times as wide and 1.8 times as high as today's disc, so its tiles draw at
about 55% of today's size.

On these boards nearly every tile is coastal, so today's rule (any shore reaches any shore) lets
every seat found on 26 or 27 sites, and the bots' founding colonies land in another group 73% of
the time. Island hopping limits founding across water to N hexes from one of the seat's own
coastal settlements. By the bots' placement score after four capitals, seat 0 leads seat 3 by:

|                        | Lead | Seat 0 best placed | Sites a seat reaches |
| ---------------------- | ---- | ------------------ | -------------------- |
| Continental, today     | 5.5  | 45%                | 11 to 14             |
| Archipelago, today     | 5.1  | 92%                | 27                   |
| Hop 4                  | 7.9  | 47%                | 9 to 10              |
| Hop 3                  | 9.8  | 65%                | 6 to 7               |
| Hop 2                  | 10.1 | 84%                | 4 to 5               |
| Own group, Port across | 10.1 | 61%                | 8                    |
| No leapfrog, or a Port | 11.8 | 98%                | 2 to 3               |

A 5-slot tile among a seat's best three sites is worth 10 points. The score sees position, not
tempo: under today's rule the first seat's edge is moving first on a shared coast, which only
batches show. With the founding voyage at setup held to the same reach, every seat still has
somewhere to found once setup ends at hop 3 and hop 4 (median 7 and 11 sites); no leapfrog leaves
191 of 4,000 seats with none.

**Batches, 2026-10-25** ([report](reports/simulation/2026-10-25-archipelago-batches.md)). #145
puts the board in the game with island hopping as one ruleset number, off by default. At hop 4,
on the voyage and in play, 80 games finished without a forced turn. Four masters won by seat
11 / 6 / 8 / 15 (Continental 7 / 10 / 11 / 12), and the mixed table 12 / 10 / 10 / 8 by seat and
15 / 10 / 9 / 6 by build (Continental 13 / 10 / 10 / 7). Both are within the noise of 40 games
(±5). The islands end with more cities than Continental (2.36 against 1.99 a seat). On the same
islands, hop 4 against any shore gives fewer cities (2.36 against 2.68) and temples (6.4 against
8.4 a game); its more gold (16 against 9 a seat-game), trade and Ports do not clear the noise.
How many foundings cross water is not measured yet.

**Options:**

- **Generator:** A: approve the defaults as drawn. B: approve with named limits changed (for
  example `mapRadius`, `groups`, `channelGap`, `islandSpan` or the shape weights).
- **Sea rule in play:** A: today's. B: hop 2. C: hop 3. D: hop 4. E: free within the own group, a
  Port to cross to another (needs a Port that can be built without a good). F: a Port to cross
  water.
- **Founding voyage at setup:** A: any coastal tile, as today. B: the same reach as in play,
  measured from the capital.
- **Continental:** A: keeps unlimited reach. B: takes the same limit. The range is one ruleset
  number, so neither branches on the board's name.
- **Goods:** A: keep six, evenly spaced. B: keep six, one per group first. C: scale them with the
  moorings.

**Recommendation:** Generator A, sea rule D (hop 4), voyage B, Continental A until the
leapfrog-off batch reports, goods A. Hop 4 cuts each seat's reach to its own group and the
shores facing it while holding the first pick to Continental's worth; the island shapes did not
change that. Choose hop 3 instead if the islands should bite harder.

**Answer:**
