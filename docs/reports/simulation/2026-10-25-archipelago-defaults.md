# Archipelago defaults: the oracle on an island, seven goods, hop 3

Date: 2026-10-25. Code: `feat/archipelago-defaults` on `main` at `9004fbe` (#145). One process at
the lowest CPU priority, 14 minutes. It generates boards and plays no games.

An addendum to the [generator report](2026-10-25-archipelago-generator.md), which stays as
merged. The owner answered Q81 the same day:

- island hopping reaches 3 hexes on Archipelago, in play and on the founding voyage from the
  capital; Continental keeps any shore;
- luxury goods are 2n − 1 on every board, seven for four seats, with Silphium as the seventh;
- the oracle is dealt like any other tile and lands on an island as part of it.

## Question

What do the generator report's numbers become with these defaults: redraws and the fallback,
where the oracle falls, goods per group with seven goods, and the sea-rule table with hop 3 as
the board's rule?

## Data

- **Seeds 1 to 1,000**, the standard rules, no National Ideas and the master bot's placement
  scoring, as in the generator report.
- **The script** is [`tools/validate.ts`](2026-10-25-archipelago-defaults/tools/validate.ts), a
  copy of the generator report's with four changes:
  - the row once called "unlimited (today)" is now "any shore", since the board's own rule is
    hop 3;
  - setups under the engine's hop 3, the board's ruleset patch: one drawn at random from the
    legal moves and one by the bots, on every board;
  - counts for the oracle and the goods;
  - the replay of the bots' placements scores each placement where it lands, as the bots do
    since #144. Without that, the replay put seat 0's last colony elsewhere on 3 of the first 4
    boards. With it, the replay agrees with the bots' own capitals and colonies under any shore
    (seeds 1 to 50) and with the engine's hop 3 setups on all 1,000 boards.
- **Files:** the raw output is [`validation.txt`](2026-10-25-archipelago-defaults/validation.txt),
  and the first 24 boards with their starts are in
  [`boards.json`](2026-10-25-archipelago-defaults/boards.json).

```bash
nice -n 19 npx tsx docs/reports/simulation/2026-10-25-archipelago-defaults/tools/validate.ts 1000 docs/reports/simulation/2026-10-25-archipelago-defaults/boards.json "no leapfrog,hop 2,hop 3,hop 4,own group"
```

The sea-rule figures are placement scores, not wins; the generator report explains what the
score sees and what it does not.

## Summary

- **The generator still works.** No board broke a limit and none needed the fallback. Boards
  take more redraws: 40% pass on the first draw (46% before) and the mean is 2.47 draws
  (2.16), at most 15 of the 40 allowed.
- **The oracle lands anywhere.** It sat on islands of 3 to 7 tiles, so its island kept 2 to 6
  settleable tiles, and 1 to 6 hexes from the centre. It was coastal on 987 boards.
- **Seven goods reach every group.** No group of 3,455 went without a good; six goods missed 6
  groups of 3,460.
- **Hop 3 by the score:** seat 0 leads seat 3 by 9.6 after four capitals and is the best placed
  of the four on 63% of boards, against 5.2 and 44% on Continental. The generator report gave
  9.8 and 65%.
- **Every seat starts with room under hop 3.** Random legal setups and the bots' setups both
  gave every seat a capital, a founding colony and a site to found on next, on all 1,000
  boards. The bots' founding colony stays on the capital's island in 36% of starts, elsewhere in
  its group in 54%, and crosses to another group in 10%.

## 1. Redraws

|                                   | Before (oracle at the centre) | Now                                      |
| --------------------------------- | ----------------------------- | ---------------------------------------- |
| Boards breaking a limit, fallback | 0, 0                          | 0, 0                                     |
| Draws a board                     | mean 2.16, most 17            | mean 2.47, most 15                       |
| Passing on the first draw         | 464                           | 400                                      |
| Draws, round islands only         | mean 1.79                     | mean 1.98                                |
| Islands of 6 or 7 tiles           | 1,573 of 8,019                | 1,900 of 7,984                           |
| Time a board, mean (most)         | 5.47 ms (40)                  | 8.69 ms (153), beside other work running |

The islands now share 37 tiles instead of 36, so more of them are large. That is the likely
reason for the extra redraws; it was not tested apart. At 40% a draw, 40 failures in a row stay
out of reach. The fallback board is now one the new generator drew (seed 11), three groups of
three islands; every deal on it passed every limit on 1,000 seeds.

## 2. The oracle

| Measure                       | Spread over 1,000 boards                                             |
| ----------------------------- | -------------------------------------------------------------------- |
| Tiles on its island           | 3: 111, 4: 269, 5: 286, 6: 169, 7: 165                               |
| Hexes from the centre         | 1: 15, 2: 86, 3: 197, 4: 200, 5: 267, 6: 235                         |
| Islands in its group          | 2: 629, 3: 371                                                       |
| Its island drawn              | round 397, line 263, bent 340                                        |
| On a coastal tile             | 987                                                                  |
| Goods moored beside it        | 358 across the 1,000 boards, each claimable only from its other tile |
| Capitals on its island, hop 3 | 436 of 4,000 seats, on 424 boards                                    |

The landmarks still each take an island of their own, and every group still holds plains,
forest and mountain: no board broke either limit.

## 3. Goods, seven a board

| Goods in a group | Six goods (before) | Seven goods (now) |
| ---------------- | ------------------ | ----------------- |
| 0                | 6                  | 0                 |
| 1                | 1,172              | 638               |
| 2                | 2,018              | 2,106             |
| 3                | 264                | 694               |
| 4                | 0                  | 17                |

Moorings per board run 34 to 57, median 46. The goods are spaced evenly round the coast as
before; nothing seats one per group, so reaching every group is an outcome of the spacing and
the check stays in the script.

## 4. The sea rule, with hop 3 as the board's rule

After the four capitals, seat 0 (first pick) against seat 3 (fourth pick), by the bots' placement
score. A 5-slot tile among a seat's best three founding sites is worth 10.

| Board, rule                    | Seat 0 lead (median) | Of which sea | Of which tile | Seat 0 best placed | Founding sites, seat 0 / 3 | Two capitals on one island |
| ------------------------------ | -------------------- | ------------ | ------------- | ------------------ | -------------------------- | -------------------------- |
| Archipelago, no leapfrog       | 11.93 (11)           | 9.10         | 2.83          | 98.1%              | 2.8 / 1.8                  | 10.7%                      |
| Archipelago, hop 2             | 10.10 (10)           | 6.39         | 3.70          | 82.9%              | 4.5 / 3.7                  | 6.9%                       |
| **Archipelago, hop 3 (board)** | **9.55 (10)**        | **5.63**     | **3.92**      | **63.3%**          | **6.7 / 6.1**              | **14.0%**                  |
| Archipelago, hop 4             | 7.79 (7)             | 4.23         | 3.56          | 46.5%              | 9.9 / 8.9                  | 17.7%                      |
| Archipelago, own group         | 10.00 (9)            | 6.13         | 3.88          | 61.6%              | 8.2 / 7.7                  | 10.9%                      |
| Archipelago, any shore         | 5.02 (6)             | 0.05         | 4.97          | 91.6%              | 26.7 / 26.7                | 23.6%                      |
| Continental, any shore (board) | 5.21 (4)             | 1.54         | 3.67          | 44.0%              | 13.6 / 10.5                | —                          |

Every row is within 0.4 of the generator report's lead and 2 points of its best-placed share.
The reading does not change: hop 3 makes the first pick worth about 4 points more than on
Continental, a little under half a good founding site, and seat 0 holds the best position on
63% of boards. The batches measure whether that shows in wins.

## 5. Starts under hop 3

The founding voyage at setup reaches coastal tiles within 3 hexes of the capital, or a tile
beside it. Of 4,000 seats placed by the bots:

| Rule, in play and at setup | Colony on the capital's island | Elsewhere in its group | In another group | Sites after setup, median (least) | Seats with no site |
| -------------------------- | ------------------------------ | ---------------------- | ---------------- | --------------------------------- | ------------------ |
| No leapfrog                | 100%                           | 0%                     | 0%               | 2 (0)                             | 215                |
| Hop 2                      | 61%                            | 39%                    | 0%               | 4 (0)                             | 1                  |
| **Hop 3 (board)**          | **36%**                        | **54%**                | **10%**          | **7 (1)**                         | **0**              |
| Hop 4                      | 25%                            | 53%                    | 22%              | 11 (3)                            | 0                  |
| Own group                  | 27%                            | 73%                    | 0%               | 7 (2)                             | 0                  |
| Any shore                  | 7%                             | 19%                    | 75%              | 26 (23)                           | 0                  |

Sites here are tiles a slave can work, as in the generator report. Counting hills too, a seat
has 9 sites after a hop 3 setup (median) and never fewer than 3. Setups drawn at random from the
engine's legal moves under hop 3 gave four legal starts on every board.
