# The last colony pick: seat 0's second plains was a bot bug

Date: 2026-10-25. Code: `9d47850`, the fix in #144 on top of `main` at `565e3cf`. The two
batches ran one after the other on two workers at the lowest CPU priority: 8 minutes without
base income, 13 with 1 base food.

## Question

In #140's masters games seat 0 put its colony on a second plains in 37 of 40 games, although
about four stone sites were still open. Seats 3, 2 and 1 took stone or wood in 35 to 39. Seat 0
then had almost no stone and won 4 games, seat 3 won 19. Is that a real reason or a bot
mistake, and what do the seats look like without it?

## Data

- Four masters, seeds 1000 to 1039, 56 turns, the continental board, no National Ideas.
- Two arms: no base income (main's rule), and 1 base food a settlement
  (`base-food-1.ruleset.json`).
- Controls: #140's masters arm for no base income, and the 2026-10-24 masters arm for 1 base
  food. Both ran the same seeds on the same board before the fix (it was called shuffled
  until #139).
- **Files:** reports, turn CSVs and logs are in [the batch folder](2026-10-25-last-colony-pick/).
  `tools/summarize.mjs` and `tools/seats.mjs` are #140's scripts with these arms added.
  `tools/colony-picks.mts` replays the setups and prints each seat's colony site.
  `tools/early-income.mjs` prints stone and food income by seat.

```bash
npm run sim -- batch --turns 56 --seed 1000 --jobs 2 --board continental --games 40 --policy master --without-ideas all --report masters.json --csv masters.csv
npm run sim -- batch --turns 56 --seed 1000 --jobs 2 --board continental --games 40 --policy master --without-ideas all --ruleset-patch docs/reports/simulation/2026-10-25-last-colony-pick/base-food-1.ruleset.json --report masters-bf1.json --csv masters-bf1.csv
```

At 40 games a win rate is uncertain by about ±13 points.

## Summary

- **It was a bot mistake.** Seat 0 was the only seat whose colony was scored with the
  gameplay forecast. The fix scores every seat the same way.
- **Without base income the seats even out:** wins by seat 7 / 10 / 11 / 12, where they were
  4 / 8 / 9 / 19. Seat 3's lead in #140 came from the bug.
- **With 1 base food seat 0 keeps its lead:** 16 / 4 / 11 / 9, against 17 / 7 / 8 / 8.
- Hunger, food shortage and the Dole stay where they were. Influence grows 5.3 a year without
  base income, against 3.8.

## 1. The bug

Without an Idea draft, seat 0's colony is the last setup placement, and the engine opens year
1 in the same step: it draws the year card, pays seat 0 its first income and switches the phase
to gameplay. The bot scored the colony on that state, so its forecast ran in gameplay mode.
That mode buys food with the Dole on later turns and follows hunger to year 14. The setup
forecast, used for the other three seats, does neither. A stone colony costs 2 food a year.
For seats 3, 2 and 1 the 12 starting food covers exactly the six years the forecast sees, so
the colony looks fed. For seat 0 the same colony starves from year 7.

Seed 1000, seat 0's best plains and best stone sites:

|                                                     | Plains, 7 slots | Stone, 3 slots |
| --------------------------------------------------- | --------------- | -------------- |
| Score after year 1 opens (before the fix)           | 276.9           | 215.6          |
| of which: pops lost to hunger after year 6          | 0               | −64.6 (1.1 pops) |
| of which: influence left after the Dole buys food   | 14              | 2              |
| Score as a setup placement (the fix)                | 287.4           | 288.0          |

Scored as a setup placement, the best site is a 4-slot forest at 292.9, and seat 0 takes it.

A player would not see it this way: the shortage in year 7 is the same for every seat with a
stone colony. With an Idea draft after the colony round, as in the live game, the last
placement is not the one that opens the year. Before the fix, seat 0's colony pick differed
between the two in 37 of 40 games. After it, all 40 setups are identical with and without the
draft.

## 2. The fix

The bot now scores a placement on the board as it stands just after the placement, before the
engine moves on to the next turn. Only the bot changed; the rules did not.

Replay of the 40 setups (`tools/colony-picks.mts`), before → after:

| Colony pick (seat) | No base income: plains / stone / wood | Moved site | 1 base food: plains / stone / wood | Moved site |
| ------------------ | ------------------------------------- | ---------- | ---------------------------------- | ---------- |
| 1st (seat 3)       | 5 / 25 / 10 → same                    | 0          | 0 / 15 / 25 → same                 | 0          |
| 2nd (seat 2)       | 1 / 27 / 12 → same                    | 0          | 5 / 10 / 25 → same                 | 0          |
| 3rd (seat 1)       | 5 / 25 / 10 → same                    | 0          | 5 / 14 / 21 → same                 | 0          |
| 4th (seat 0)       | 37 / 3 / 0 → 7 / 12 / 21              | 31         | 38 / 1 / 1 → 11 / 12 / 17          | 27         |

No capital moved. Seat 0 now takes wood more often than stone: three stone sites are gone by
its turn, and the ones left are smaller. A 4-slot forest beats a 3-slot quarry.

## 3. The batches

|                                       | No base income: #140 | Fix              | 1 base food: 10-24 | Fix              |
| ------------------------------------- | -------------------- | ---------------- | ------------------ | ---------------- |
| Wins by seat                          | 4 / 8 / 9 / 19       | 7 / 10 / 11 / 12 | 17 / 7 / 8 / 8     | 16 / 4 / 11 / 9  |
| Games by race / by the clock          | 3 / 37               | 4 / 36           | 4 / 36             | 7 / 33           |
| Won on a tiebreak                     | 16                   | 13               | 13                 | 14               |
| Year-5 income leader wins, rule ≤40%  | 16 of 31 (52%)       | 17 of 34 (50%)   | 13 of 27 (48%)     | 11 of 28 (39%)   |
| Influence median, year 10 → 14 (a year) | 18 → 33 (3.8)      | 15 → 36 (5.3)    | 41 → 78 (9.3)      | 44 → 80 (9.0)    |
| Pops at year 14, mean                 | 14.4                 | 14.0             | 16.4               | 15.8             |
| Turns begun short of food             | 450                  | 442              | 166                | 161              |
| Pops lost to hunger a seat-game       | 0.59                 | 0.57             | 0.01               | 0.01             |
| Dole uses a game                      | 36.4                 | 37.9             | 23.0               | 22.1             |
| Trades settled a game                 | 7.4                  | 6.8              | 5.3                | 4.8              |

Seats. Income is what the seat collects on its own turn. Each seat's state is read right after
its own turn of the year.

| Seat | No base income: wins | Stone income, year 1 | Food income, year 1 | Pops at year 14 | 1 base food: wins | Stone income, year 1 |
| ---- | -------------------- | -------------------- | ------------------- | --------------- | ----------------- | -------------------- |
| 0    | 4 → 7                | 0.15 → 0.60          | −0.15 → −2.00       | 14.1 → 14.6     | 17 → 16           | 0.90 → 1.15          |
| 1    | 8 → 10               | 1.25 → 1.25          | −2.00 → −2.00       | 13.8 → 13.3     | 7 → 4             | 1.15 → 1.15          |
| 2    | 9 → 11               | 1.40 → 1.40          | −2.00 → −2.00       | 14.8 → 13.8     | 8 → 11            | 0.85 → 0.85          |
| 3    | 19 → 12              | 1.50 → 1.50          | −2.00 → −2.00       | 15.3 → 14.5     | 8 → 9             | 0.88 → 0.88          |

- Seat 0 now starts on the same food footing as the others. Its stone over years 1 to 5 is
  unchanged at 0.52 a turn, against 0.78 to 1.02: it takes wood more often.
- Seat 3 loses 7 wins, and none of the other seats gains more than 3. No seat stands out
  beyond the ±13-point noise.

## 4. What it changes in the open reports

- **The confirming batch (#140):** seat 3's lead, 19 of 40, was the bug. The finding that the
  first-pick edge belongs to the game with base food still holds.
- **The starting-bonus test (#143):** its +1 stone a place later in the colony round made up
  for the bot's mistake, not for a weakness of picking last. Without the bug the seats are
  even without a bonus.
- **The leapfrog-off batch (#142):** its 1-base-food result was measured with the bug in
  place. The seat-0 edge it explains survives the fix: 16 wins of 40, against 17.
- **The 2026-10-24 balance lines:** with Ideas on, seat 0's edge went, which that report left
  unexplained. The colony pick is not the reason: Ideas-on games never had the bug, and with
  the fix seat 0 still wins 16 at 1 base food.
- Every masters batch run with `--without-ideas all` before #144 has this bug. The live game,
  which has the Idea draft, never had it.
