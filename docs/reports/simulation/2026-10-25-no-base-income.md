# No base income: the confirming batch on main

Date: 2026-10-25. Code: `28c2c79`, whose engine and bots are those of `main` at `aad8e4e` (#136:
base income per resource at 0, the game's length in years). The two batches ran one after the
other on two workers at the lowest CPU priority: 22 minutes for the mixed table, 11 for the
masters table.

## Question

#136 made no base income the game's rule. Does `main` play as the
[2026-10-24 batches](2026-10-24-balance-lines.md) predicted with a patch, and what does the
masters table look like without base food? This batch is also the control for two overnight
tests: the coastal leapfrog switched off, and a starting bonus by pick order.

## Data

- **Mixed:** slaver, civic, trader and master rotated through the seats, seeds 1000 to 1009 ×
  4 seatings = 40 games.
- **Masters:** the master bot in all four seats, seeds 1000 to 1039, no National Ideas.
- 56 turns, the shuffled board, no ruleset patch.
- **Files:** reports, turn CSVs and logs are in [the batch folder](2026-10-25-no-base-income/).
  `tools/summarize.mjs` is the 10-24 summary script pointed at these arms; `tools/seats.mjs`
  prints the seat table.

```bash
npm run sim -- batch --turns 56 --seed 1000 --jobs 2 --board shuffled --games 10 --seats slaver,civic,trader,master --rotate --report mixed.json --csv mixed.csv
npm run sim -- batch --turns 56 --seed 1000 --jobs 2 --board shuffled --games 40 --policy master --without-ideas all --report masters.json --csv masters.csv
```

At 40 games a win rate is uncertain by about ±13 points.

## Summary

- **Main reproduces the 10-24 no-base-food arm exactly.** All 40 mixed games and every figure
  in the report match `mixed-no-base-food`, apart from the metadata. At 14 years the engine
  change did nothing besides removing base food.
- **Without base food the seat edge moves from seat 0 to seat 3.**
  - Masters: wins by seat 4 / 8 / 9 / 19, against 17 / 7 / 8 / 8 with 1 base food.
  - Mixed: 7 / 11 / 6 / 16.
  - Chance gives one seat of four 19 or more wins of 40 in under 1% of batches.
  - Seat 3 ends with the most pops (15.3 at year 14) and holds Demos in 16 games.
  - Seat 0's lead in cities at year 5 shrinks: 1.88 against 1.60 to 1.70, where it was 2.38
    against 1.60 to 1.88.
  - So the first-pick edge measured on 10-24 belongs to the game with base food. The leapfrog
    test now runs against both.
- **Hunger is back on the masters table.**
  - 450 turns begun short of food, against 166.
  - 0.59 pops lost to hunger a seat-game, against 0.01.
  - 36 Dole uses a game, against 23.
- **Influence growth falls under the plateau rule** of 5 a year on both tables: 3.8 a year on
  the masters table (9.3 with base food) and 2.5 on the mixed table (5.3).
- **Every build wins 17.5% or more on the mixed table:** slaver 13, civic 10, trader 10,
  master 7. The trader pays for it in hunger, 5.2 pops a seat-game.

## 1. Mixed table

The no-base-income column is both the 10-24 patched arm and main: they are identical.

|                                                     | 1 base food (10-24)  | No base income        |
| --------------------------------------------------- | -------------------- | --------------------- |
| Games by race / by the clock                        | 11 / 29              | 4 / 36                |
| Won on a tiebreak                                   | 14                   | 20                    |
| Wins by seat                                        | 14 / 12 / 11 / 3     | 7 / 11 / 6 / 16       |
| Wins, slaver / civic / trader / master              | 7 / 6 / 16 / 11      | 13 / 10 / 10 / 7      |
| Treasurer held at the end; winners holding it       | 39; 16               | 22; 12                |
| End gold, median (trader)                           | 75                   | 27.5                  |
| Gold income a seat-game (trader)                    | 139                  | 84                    |
| Pops at year 14, mean                               | 19.7                 | 16.8                  |
| Turns begun short of food                           | 132                  | 428                   |
| Dole uses a game                                    | 14.9                 | 27.3                  |
| Pops lost to hunger a seat-game, slaver / civic / trader / master | 0.2 / 0 / 1.13 / 0 | 1.4 / 0.05 / 5.23 / 0.8 |
| Trades settled a game; food traded a game           | 6.7; 8.7             | 9.7; 6.8              |
| Influence median, year 10 → 14 (a year)             | 11 → 32 (5.3)        | 4 → 14 (2.5)          |
| Riot turns from year 8 (slaver), rule ≤10%          | 8% (25%)             | 11% (25%)             |
| Beloved: turns held; holder the sole luxury leader, rule ≤60% | 297; 52%   | 67; 52%               |
| Year-5 income leader wins, rule ≤40%                | 7 of 40              | 13 of 38              |
| Year-10 stock, leader ÷ laggard: median; games ≤2.5× | 8.2; 0 of 36        | 11.2; 0 of 40         |

## 2. Masters table

|                                                     | 1 base food (10-24) | No base income (main) |
| --------------------------------------------------- | ------------------- | --------------------- |
| Games by race / by the clock                        | 4 / 36              | 3 / 37                |
| Won on a tiebreak                                   | 13                  | 16                    |
| Wins by seat                                        | 17 / 7 / 8 / 8      | 4 / 8 / 9 / 19        |
| Slave share at the end                              | 34%                 | 45%                   |
| Pops at year 14, mean                               | 16.4                | 14.4                  |
| Turns begun short of food                           | 166                 | 450                   |
| Dole uses a game                                    | 23                  | 36.4                  |
| Pops lost to hunger a seat-game                     | 0.01                | 0.59                  |
| Trades settled a game; food traded a game           | 5.3; 4.6            | 7.4; 4.4              |
| Ventures a game                                     | 11.8                | 10.3                  |
| Influence median, year 10 → 14 (a year)             | 41 → 78 (9.3)       | 18 → 33 (3.8)         |
| Riot turns from year 8, rule ≤10%                   | 3%                  | 5%                    |
| Beloved: turns held; holder the sole luxury leader, rule ≤60% | 227; 68%  | 29; 69%               |
| Year-5 income leader wins, rule ≤40%                | 13 of 27            | 16 of 31              |
| Year-10 stock, leader ÷ laggard: median; games ≤2.5× | 3.9; 6 of 38       | 3.9; 12 of 38         |

## 3. Seats on the masters table

The state after each seat's year, averaged over 40 games. Titles are those held when the game
ended.

| Seat | Wins, 1 base food → none | Cities, colonies at year 5 | Pops at year 5, 14 | Pops lost to hunger | Polis Builder / Demos / Civic Elite / Voice |
| ---- | ------------------------ | -------------------------- | ------------------ | ------------------- | ------------------------------------------- |
| 0    | 17 → 4                   | 2.38, 2.45 → 1.88, 2.42    | 10.1, 15.9 → 9.4, 13.5  | 0.00 → 0.63    | 10 / 11 / 10 / 7 → 5 / 3 / 7 / 5            |
| 1    | 7 → 8                    | 1.80, 2.58 → 1.60, 2.42    | 10.5, 15.7 → 10.0, 13.8 | 0.00 → 0.47    | 3 / 6 / 8 / 6 → 4 / 5 / 10 / 4              |
| 2    | 8 → 9                    | 1.88, 2.55 → 1.70, 2.40    | 10.4, 16.6 → 9.5, 14.8  | 0.00 → 0.82    | 3 / 7 / 4 / 3 → 7 / 9 / 8 / 2               |
| 3    | 8 → 19                   | 1.60, 2.60 → 1.65, 2.30    | 10.5, 17.2 → 10.4, 15.3 | 0.03 → 0.42    | 5 / 10 / 9 / 2 → 5 / 16 / 8 / 6             |

- Seat 3 is ahead on pops by year 5 and further ahead by year 14, and loses the fewest pops to
  hunger.
- This report does not find the cause. The leapfrog report replays these setups and looks at
  placement order, the colony pick, food on each seat's tiles and the turn order.

## For the balance check (Q80)

- The mixed table's builds sit at 17.5% to 32.5%; the master's 7 wins of 40 are under the 20%
  floor, inside the uncertainty.
- Read as Q80's same-policy option for the runaway-leader rule, the masters table fails it: the
  year-5 income leader wins 16 of 31, against a 40% limit.
- Riots pass on the masters table and fail by a point on the mixed table, through the slaver.
- Beloved fails on the masters table, but on 29 turns held in 40 games.
