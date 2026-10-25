# Starting bonus by pick order: one hypothesis, one batch

Date: 2026-10-25.

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
