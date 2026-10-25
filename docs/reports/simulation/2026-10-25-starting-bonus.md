# Starting bonus by pick order: one hypothesis, one batch

Date: 2026-10-25. Code: `ba1c20d`, which is `main` at `449656c` plus the `--seat-bonus` batch
option below. One batch, four masters, on two workers at the lowest CPU priority: 8 minutes.

## Question

Without base income the seat edge sits with seat 3: four masters win 4 / 8 / 9 / 19 by seat in
the confirming batch (#140). The leapfrog-off batch (#142) found that the coastal leapfrog does
not make it. The owner asked for one hypothesis about which seat lacks what, one starting bonus
by pick order sized to cancel it, and one batch. No sweep, no second dose.

## Summary

- **The wins even out as predicted:** 9 / 10 / 8 / 13 by seat, against 4 / 8 / 9 / 19 in the
  control and about 9 / 10 / 10 / 11 predicted.
  - With even seats, a spread as wide as the control's comes up in under 1% of batches; a top
    seat with 13 or more comes up in about two batches of three.
- **The mechanism did not move as predicted.**
  - Seat 0 built no more Temples, Forums or city upgrades: 3.63 a game in both batches.
  - It bought less stone from rivals: net +0.38 a game, against +1.88. It paid less food and
    gold for it.
  - The food it kept became pops. It grew one more pop a game, had the most pops at years 1
    and 5, and held Demos in 12 games, against 3.
- **Seat 3 loses Demos,** 16 → 7. It held Demos in 14 of its 19 wins in the control; seat 0
  holds it in 7 of its 9 here.
- **So the last colony pick is short of stone, as the hypothesis said, but the shortage cost
  seat 0 food, not buildings.** It paid for stone in trade with what grows pops.
- The lever is a sim option, granted after setup. A game setting needs a ruleset field (below).

## Hypothesis (written before the run)

Kept as written, before the batch. Figures are from the confirming batch (#140, four masters, no
base income, seeds 1000 to 1039) and the leapfrog-off batch's setup replay (#142). Year figures
are read right after each seat's own turn.

**Which seat lacks what.** Without base food every capital sits on plains (152 of 160 in the
control) to feed its pops, so the capital round settles little. The founding colony is where a
seat gets its stone. That round runs 3 → 0, and stone income and wins fall along it:

| Seat | Founding colony pick | Colony on plains / stone / wood | Stone paid, years 1–5 | Stone paid, the game | Wins |
| ---- | -------------------- | ------------------------------- | --------------------- | -------------------- | ---- |
| 3    | 1st                  | 5 / 25 / 10                     | 5.88                  | 19.0                 | 19   |
| 2    | 2nd                  | 1 / 27 / 12                     | 4.78                  | 13.1                 | 9    |
| 1    | 3rd                  | 5 / 25 / 10                     | 4.40                  | 13.2                 | 8    |
| 0    | 4th                  | 37 / 3 / 0                      | 2.58                  | 8.5                  | 4    |

- **Seat 3** picks first and takes the biggest colony sites (4.35 slots against 3.9 for seats 1
  and 2). It spends about 2 stone a game more than any other seat on Temples, Forums, Ports and
  city upgrades (14.0 against 11.5 to 12.3), grows the most pops and holds Demos in 16 games.
- **Seat 0** picks last and puts its colony on plains in 37 games, though seat 1 just before it
  still finds stone in 25. Its start income is 0.15 stone a turn against 1.20 to 1.55. Its stone
  stock sits at 1.0 to 1.4 from year 2 to year 8: what comes in is spent at once. It buys the
  rest with food: net +1.9 stone, +1.1 wood and −0.8 food a game in trade.
- Wood differs less and not in pick order (5.1 to 6.8 paid by year 5). Food is not short for
  the late pickers. Stone is.

**What a stone is worth.**
- The bots score a stone at 1.06, a wood at 0.75, a food at 0.5 and a pop at 12 (a slave) to 30
  (a citizen). At those weights seat 0's start and seat 3's are about level, 2.6 against 2.8 a
  turn, so the bots take a food colony thinking it as good.
- The costs say otherwise. Stone buys in threes: a Temple, a Forum, half a city upgrade. Only
  tiles, trade and a few cards make it. Food has another source, the Dole (influence for food),
  which every seat uses 8 to 10 times a game.

**The bonus.** +1 stone for each place a seat picks its founding colony after the first:

| Seat         | 0  | 1  | 2  | 3 |
| ------------ | -- | -- | -- | - |
| Bonus, stone | +3 | +2 | +1 | 0 |

- Granted once, after setup and before the first turn, so every game's setup is the control's.
- Sized to the stone each seat is short of the first colony pick by year 5: 3.3, 1.5 and 1.1.
- 3 stone is one Temple or Forum. To the bots it is small: 3.2 points, a quarter of a slave.

**Predicted.**
- **Wins by seat:** about 9 / 10 / 10 / 11, from 4 / 8 / 9 / 19. The hypothesis fails if seat 3
  keeps 16 or more, or seat 0 stays at 5 or fewer.
- **Mechanism figure:** seat 0's Temples, Forums and city upgrades a game, 3.63 in the control
  (seat 3: 4.15), rise to about 4.5, past seat 3's. One standard error is about 0.3.

## The lever

- **There was no per-seat lever.** The ruleset's `startingResources` is one stock for every
  seat, and neither the tune panel nor a ruleset patch can give one seat more.
- **Added: `batch --seat-bonus b.json`,** a sim option.
  - It adds stock to the named seats once setup is done, before the first turn.
  - No rule, engine or state schema change. The definition ID is the control's
    (`1:9b065eb93415ff76/1:08e754de419b15ad`).
  - `meta.seatBonus` records the bonus, so the batch reproduces from its report.
  - One focused test (the bonus lands, the placements do not move) and a line in the
    simulation reference.
- **Granted after setup, every game's setup is the control's:** the same capitals and colonies
  in all 40 games. A rule would be known before placement, and the bots might place
  differently. This batch does not test that.
- **A game setting needs an engine change,** not built here: a ruleset field holding stock by
  place in the founding-colony round, first to last, for example
  `[{}, {"stone": 1}, {"stone": 2}, {"stone": 3}]`, paid as each founding colony is placed.
  - The definition would record it and the tune panel could edit it; Classic leaves it empty.
  - It bumps the state schema, as base income did.
  - Paid at placement, the bots' placement scoring would see the stock.

## The run

```bash
caffeinate -is nice -n 19 node --import tsx src/sim/cli.ts batch --turns 56 --seed 1000 --jobs 2 --board shuffled --games 40 --policy master --without-ideas all --seat-bonus docs/reports/simulation/2026-10-25-starting-bonus/stone-by-colony-pick.json --report masters.json --csv masters.csv
```

- The hypothesis was committed (`6cebeae`) before the batch ran.
- **Files** ([folder](2026-10-25-starting-bonus/)): the bonus file, `run.sh`, the report and
  turn CSV, the batch log, and `tools/compare.mjs`, which prints every figure below against the
  control (its output is `logs/compare.txt`).
- **The control** is the confirming batch's masters arm, #140:
  `docs/reports/simulation/2026-10-25-no-base-income/masters.json` once that PR is on main.
- **How sure the numbers are:**
  - At 40 games a win rate is uncertain by about ±13 points, about ±5 wins.
  - 17 of 40 games keep the control's winner. The setups are the same, but play leaves the
    control's path within the first years, so the two compare as fresh samples.
  - Year figures are each seat's row right after its own turn of the year.

## Predicted against observed

**Wins**

|                                          | Control (#140)  | Predicted          | Observed        |
| ---------------------------------------- | --------------- | ------------------ | --------------- |
| Wins by seat                             | 4 / 8 / 9 / 19  | about 9 / 10 / 10 / 11 | 9 / 10 / 8 / 13 |
| Fails if                                 | –               | seat 3 ≥ 16 or seat 0 ≤ 5 | neither  |
| Ended by the race, by the clock          | 3, 37           | –                  | 3, 37           |
| Won on titles, by seat                   | 2 / 3 / 6 / 10  | –                  | 5 / 4 / 2 / 8   |
| Won on the happiness tiebreak, by seat   | 2 / 4 / 1 / 3   | –                  | 2 / 5 / 5 / 5   |
| Won on the race, by seat                 | 0 / 0 / 1 / 2   | –                  | 2 / 1 / 0 / 0   |

**By seat**, control → bonus. Trade figures are received less given, a game.

| Seat | Bonus | Wins    | Temples, Forums and upgrades | Stone from trade | Food from trade | Pops grown  | Pops at year 5 | Pops at year 14 | Demos held |
| ---- | ----- | ------- | ---------------------------- | ---------------- | --------------- | ----------- | -------------- | --------------- | ---------- |
| 0    | +3    | 4 → 9   | 3.63 → 3.63 (predicted 4.5)  | +1.88 → +0.38    | −0.80 → −0.40   | 7.30 → 8.30 | 9.43 → 10.28   | 14.05 → 15.16   | 3 → 12     |
| 1    | +2    | 8 → 10  | 3.58 → 3.83                  | −0.42 → +0.33    | +0.55 → +0.10   | 7.05 → 7.35 | 9.97 → 10.05   | 13.76 → 13.92   | 5 → 9      |
| 2    | +1    | 9 → 8   | 3.30 → 3.38                  | −0.95 → −0.93    | −0.45 → −0.15   | 7.70 → 7.35 | 9.53 → 9.60    | 14.78 → 14.71   | 9 → 7      |
| 3    | 0     | 19 → 13 | 4.15 → 3.95                  | −0.50 → +0.23    | +0.70 → +0.45   | 8.53 → 7.78 | 10.28 → 9.60   | 15.27 → 15.34   | 16 → 7     |

- **Seat 0 spends the bonus on what it used to buy.** Its stone from trade falls by 1.5 a game,
  and it gives 0.4 less food and 0.5 less gold. Its stone spent on Temples, Forums, Ports and
  upgrades barely moves (12.2 → 12.5).
- **The food goes into pops from the first turn.** After its year-1 turn seat 0 holds 7.17 pops
  against 6.83, and 0.90 food against 1.68. Its food paid by year 5 is 1.45 against 0.50: the
  extra slaves work its plains.
- **Seat 1, given 2, is the only seat that builds clearly more with stone** (3.58 → 3.83).

**Moved the wrong way, or not at all**

- The mechanism figure: flat for seat 0, where the hypothesis put the effect.
- Seat 2, given 1 stone, wins one fewer (9 → 8) and holds Civic Elite in 1 game instead of 8.
- Seat 3's stone income in play falls from 19.0 a game to 15.0 (5.88 → 4.97 by year 5) with the
  same start and no bonus; seat 2's rises from 13.1 to 16.1. Stone paid in year 1 is the
  control's to the hundredth for seats 0 to 2. So after year 1 the stone gradient in the
  hypothesis's table is partly how the games went, not the colony pick alone.
- Seat 0's happiness at year 14 falls, −0.05 → −0.51: more slaves (5.95 → 6.76), no more
  Temples.

## Verdict

- **Wins: supported.** Both of the hypothesis's fail conditions are clear: seat 3 13, seat 0 9.
  Seat 0's change is 1.3 standard errors, seat 3's 1.6. The stronger evidence is the spread:
  the control's is a 1-in-150 draw for even seats, this arm's an ordinary one.
- **Mechanism: the wrong route.** Seat 0 was short of stone, and the bonus cancels it, but the
  shortage did not cost it buildings. It cost the food and gold seat 0 paid rivals for stone.
  The bonus works through trade, then food, pops and Demos.
- **As a setting, +1 stone a place later in the founding-colony round is the candidate.** Six
  stone across the table evens the seats here. Not tested:
  - with base food, where the edge was seat 0's first capital pick;
  - on the mixed table;
  - known at placement, as a rule would be.

## For the game-settings plan

The plan's row "Starting bonus by pick order: a bonus for seats that place later" should
change, not edited here:
- "Later" should say **later in the founding-colony round**. Seat 0 places the first capital but
  the last colony, and without base food the colony round is the one that counts.
- The candidate is +1 stone a place (seat 0 +3, seat 1 +2, seat 2 +1), judged so far on one
  batch of four masters without base income.
- It needs the ruleset field above before it can be a setting.

## Next idea, not run

**The same bonus known at placement.** Grant it before setup, as a rule would, and replay this
batch: same table, same bonus file. It tells whether the bots, seeing the stone while they
place, pick the same sites (seat 0 on plains in 37 games) or undo the bonus by placing
differently. Judge it on this report's seat table plus the setup replay's colony sites (#142's
`tools/setups.mts`). The sim option can do it by granting before the placement loop; the ruleset
field would do it for real.
