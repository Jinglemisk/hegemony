# Leapfrog off: does the coastal leapfrog make seat 0's lead?

Date: 2026-10-25. Code: `main` at `449656c`, whose engine and bots are those of `aad8e4e` (#136).
Two batches ran one after the other on two workers at the lowest CPU priority, 8 and 10
minutes. The setup and founding replays below took about 25 minutes more.

**Read with** [the last colony pick](2026-10-25-last-colony-pick.md), written later the same
day: every batch here ran with a bot bug that sent seat 0's last setup colony onto a second
plains in games without Ideas. Seat 3's lead without base food was that bug. Seat 0's edge with
1 base food survives the fix (16 of 40), so the leapfrog's part in it likely stands, though it
was measured with the bug in place.

## Question

On the shuffled board, four master bots, seeds 1000 to 1039, no National Ideas and 1 base food,
seat 0 won 17 of 40 ([2026-10-24](2026-10-24-balance-lines.md), §2). Its capital landed on the
rim and the coast, and with random openings the edge went (7 of 40). The rule under suspicion is
the coastal leapfrog: a seat that holds any coastal tile may found on any other coastal tile.
Does switching it off remove seat 0's edge?

Main now has no base income, and its confirming batch (#140) moved the edge to seat 3 (wins by
seat 4 / 8 / 9 / 19). So the leapfrog is tested twice: with 1 base food against the 10-24 batch,
and with none against the confirming batch.

## Data

- **Table:** four masters, seeds 1000 to 1039, 56 turns, shuffled board, no National Ideas.
- **Arms:**

  | Arm                  | Patch                                                         | Control                                                    |
  | -------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
  | 1 base food, off     | `{"economy":{"baseIncome":{"food":1}},"placement":{"coastalLeapfrog":false}}` | 10-24 `masters-shuffled`                |
  | No base income, off  | `{"placement":{"coastalLeapfrog":false}}`                     | the confirming batch (#140)                                |

- **Files** ([folder](2026-10-25-leapfrog-off/)): `masters-bf1.*` and `masters.*` are the two
  batches' reports and turn CSVs; the patches, run scripts and logs sit beside them.
  - `tools/setups.mts` replays the setup of every arm (no games) with the 10-24 rim method;
    `setups-*.json` hold its output.
  - `tools/foundings.mts` played both controls' games again, seed for seed, to record where
    each colony was founded. The batch report has no founding positions. All 80 replayed games
    ended with the report's winner. The 1-base-food replay ran on main with the patch, so main
    plus 1 base food is the 10-24 game.
  - `tools/compare.mjs`, `sites.mjs`, `years.mjs` and `foundings-summary.mjs` print the tables.

```bash
npm run sim -- batch --turns 56 --seed 1000 --jobs 2 --board shuffled --games 40 --policy master --without-ideas all --ruleset-patch docs/reports/simulation/2026-10-25-leapfrog-off/bf1-leapfrog-off.patch.json --report masters-bf1.json --csv masters-bf1.csv
npm run sim -- batch --turns 56 --seed 1000 --jobs 2 --board shuffled --games 40 --policy master --without-ideas all --ruleset-patch docs/reports/simulation/2026-10-25-leapfrog-off/leapfrog-off.patch.json --report masters.json --csv masters.csv
```

**How sure the numbers are:**
- At 40 games a win rate is uncertain by about ±13 points. The difference between two arms is
  uncertain by about ±10 points (one standard error).
- Each arm keeps the control's winner in 12 of 40 games, so the arms compare as fresh samples.
- **Reading by year:** a CSV row is the table at the start of the acting seat's turn. "At
  year 5" here is after each seat's own turn of year 5, so every seat has had five turns. The
  confirming batch's report read the year's last row, which comes before the last seat's turn;
  its year-5 figures for seat 3 are one turn short.

## Summary

- **The bots' setup scoring honours the switch.** A placement is scored partly by the best three
  sites the seat could found on next, asked through the same founding rule as play. With the
  leapfrog on, a coastal capital is credited with the island's three best coastal sites; with it
  off, only its neighbours. So the capital picks change, not only the foundings in play.
- **One exception:** the founding colony placed in setup has its own rule, any coastal tile,
  which ignores the switch. Every seat still gets one free voyage. With the leapfrog on, that
  coastal colony is what lets every seat sail: each may found on about 17 to 18 tiles at its
  first turn, and 7 to 8 with it off.
- **With 1 base food the leapfrog makes most of seat 0's edge.**
  - Seat 0 wins 9 of 40 with it off, against 17. Random openings gave 7.
  - Wins by seat go from 17 / 7 / 8 / 8 to 9 / 7 / 12 / 12. The 8-win drop is about two
    standard errors.
  - Seat 0's capital moves off the rim: 22 of 40 on the rim instead of 36, coastal 55% instead
    of 90%. It is the most central capital in 18 games instead of 8.
  - Its city lead at year 5 shrinks (2.10 against 1.85 to 2.03, from 2.38 against 1.80 to
    1.88). It holds Polis Builder in 6 games instead of 10.
- **Seat 0 does not sail more than the others.** In the 1-base-food control a quarter of all
  foundings in play were by the leapfrog: seat 0 22%, the others 21% to 35%. What changes with
  the rule is the worth of a rim capital:
  - with it on, rim capitals won 28% of their seat-games and the rest 19%; with it off, 24%
    and 27%;
  - seat 0 on the rim won 16 of 36 with it on and 3 of 22 with it off.
- **Without base food the leapfrog is not what makes seat 3's lead.**
  - Wins by seat go from 4 / 8 / 9 / 19 to 8 / 9 / 9 / 14. Seat 3's drop of 5 is inside the
    uncertainty, and it keeps the top income from year 3 and the most pops at the end.
  - Seat 3's start is not the richest: it holds the least food. Seat 0's start is the richest
    (capital and colony on plains, 9.5 food slots) and it wins 4. In the control, starts on
    stone and wood won more often than starts on food (§4). The cause of seat 3's lead is not
    proven.

## 1. Wins

|                                  | 1 base food: control (10-24) | 1 base food, off | No base income: control | No base income, off |
| -------------------------------- | ---------------------------- | ---------------- | ----------------------- | ------------------- |
| Wins by seat                     | 17 / 7 / 8 / 8               | 9 / 7 / 12 / 12  | 4 / 8 / 9 / 19          | 8 / 9 / 9 / 14      |
| Ended by the race, by the deck   | 4, 36                        | 9, 31            | 3, 37                   | 6, 34               |
| Race wins by seat                | 3 / 0 / 0 / 1                | 1 / 2 / 4 / 2    | 0 / 0 / 1 / 2           | 2 / 4 / 0 / 0       |
| Won on titles; on a tiebreak     | 23; 13                       | 20; 11           | 21; 16                  | 22; 12              |
| Same winner as the control       | –                            | 12 of 40         | –                       | 12 of 40            |
| Year-5 income leader wins        | 13 of 27                     | 10 of 33         | 16 of 31                | 11 of 29            |
| Year-5 income leader, by seat    | 7 / 8 / 4 / 8                | 5 / 8 / 12 / 8   | 5 / 5 / 9 / 12          | 7 / 6 / 6 / 10      |

- With the leapfrog off, more games end by the race on both settings (9 and 6, from 4 and 3).
- The year-5 income leader wins less often with it off: 10 of 33 and 11 of 29.

## 2. Where the capitals land

The setup replay, by seat. "Reach" is the number of tiles the seat may found on at its first
turn. "Food slots" counts the slots on plains among the capital and the founding colony.

**1 base food**

| Seat | Capital from centre (3 = rim) | On the coast | On the rim | Capital slots | Free land within 2 | Colony from capital | Colony on plains | Food slots | Start income | Reach |
| ---- | ----------------------------- | ------------ | ---------- | ------------- | ------------------ | ------------------- | ---------------- | ---------- | ------------ | ----- |
| 0    | 2.85 → 2.35                   | 90% → 55%    | 36 → 22    | 5.05 → 5.25   | 8.4 → 10.6         | 4.38 → 3.45         | 38 → 36          | 4.5 → 4.3  | 3.05 → 3.10  | 17.2 → 7.3 |
| 1    | 1.90 → 2.48                   | 38% → 65%    | 15 → 26    | 4.72 → 4.53   | 12.3 → 10.4        | 3.27 → 3.80         | 5 → 1            | 0.6 → 0.2  | 2.13 → 2.15  | 17.8 → 7.2 |
| 2    | 2.58 → 2.58                   | 75% → 68%    | 30 → 27    | 4.22 → 3.80   | 9.4 → 9.6          | 3.85 → 3.88         | 5 → 3            | 0.7 → 0.7  | 2.02 → 2.00  | 17.9 → 7.5 |
| 3    | 2.70 → 2.50                   | 78% → 65%    | 31 → 26    | 3.88 → 3.77   | 9.1 → 9.9          | 4.08 → 4.30         | 0 → 1            | 0.3 → 0.5  | 2.08 → 2.10  | 17.6 → 7.4 |

The control's column reproduces the 10-24 numbers exactly (2.85 / 1.90 / 2.58 / 2.70 from the
centre, 90 / 38 / 75 / 78% coastal, slots 5.05 / 4.72 / 4.22 / 3.88). The most central capital
is seat 0's in 18 games with the leapfrog off, against 8; seat 1's in 9, against 22.

**No base income**

| Seat | Capital from centre (3 = rim) | On the coast | On the rim | Capital slots | Free land within 2 | Colony from capital | Colony on plains | Food slots | Start income | Reach |
| ---- | ----------------------------- | ------------ | ---------- | ------------- | ------------------ | ------------------- | ---------------- | ---------- | ------------ | ----- |
| 0    | 2.92 → 2.52                   | 95% → 65%    | 38 → 26    | 4.78 → 4.72   | 8.0 → 9.7          | 3.48 → 3.08         | 37 → 38          | 9.5 → 9.6  | 2.00 → 2.00  | 16.7 → 6.7 |
| 1    | 2.15 → 2.52                   | 53% → 68%    | 21 → 27    | 4.83 → 4.78   | 11.0 → 9.9         | 3.65 → 3.52         | 5 → 7            | 5.4 → 5.8  | 1.20 → 1.18  | 17.1 → 7.3 |
| 2    | 2.55 → 2.40                   | 73% → 57%    | 29 → 23    | 4.83 → 4.72   | 9.6 → 10.4         | 4.05 → 3.70         | 1 → 7            | 4.8 → 5.3  | 1.27 → 1.20  | 17.5 → 7.7 |
| 3    | 2.38 → 2.33                   | 57% → 50%    | 23 → 20    | 4.95 → 4.65   | 10.4 → 10.8        | 3.90 → 4.22         | 5 → 7            | 4.5 → 4.4  | 1.38 → 1.45  | 18.2 → 7.9 |

- **Without base food every capital sits on plains** (152 of 160 in the control); with 1 base
  food, on stone or wood (157 of 160). Base food is what lets a capital skip the plains.
- **Seat 0 puts its founding colony on plains in 36 to 38 games in every arm.** It places the
  last founding colony: setup runs 0 → 3 for capitals, then 3 → 0 for colonies.
- **The founding voyage still sails with the leapfrog off:** the founding colony is not beside
  the capital in 34 to 40 games for seats 1 to 3, and 25 to 39 for seat 0.

## 3. Play

| Seat figures                              | 1 base food: control → off   | No base income: control → off |
| ----------------------------------------- | ---------------------------- | ----------------------------- |
| Cities at year 5                          | 2.38 / 1.80 / 1.88 / 1.85 → 2.10 / 1.88 / 2.03 / 1.85 | 1.88 / 1.60 / 1.70 / 1.73 → 1.65 / 1.58 / 1.73 / 1.53 |
| Colonies upgraded to cities a game        | 1.53 / 0.93 / 1.00 / 1.08 → 1.23 / 0.98 / 1.25 / 1.13 | 1.08 / 0.88 / 0.88 / 1.08 → 0.85 / 0.80 / 1.05 / 0.80 |
| Colonies founded in play a game           | 3.48 / 3.05 / 3.03 / 3.18 → 3.25 / 3.08 / 3.38 / 3.28 | 3.13 / 2.88 / 2.85 / 2.95 → 2.98 / 2.90 / 3.05 / 2.83 |
| Reach at year 3                           | 18.9 / 19.2 / 18.2 / 18.2 → 10.8 / 9.4 / 10.0 / 9.9 | 18.7 / 18.6 / 18.7 / 19.3 → 9.5 / 9.5 / 9.7 / 10.2 |
| Income at year 3                          | 5.50 / 5.75 / 5.38 / 5.55 → 5.15 / 5.93 / 5.70 / 5.35 | 3.33 / 3.30 / 3.33 / 3.73 → 3.33 / 3.35 / 3.48 / 3.67 |
| Income at year 5                          | 6.03 / 6.50 / 5.88 / 6.10 → 5.13 / 6.28 / 6.55 / 5.55 | 3.20 / 3.40 / 3.67 / 4.00 → 3.45 / 3.67 / 3.33 / 4.05 |
| Pops at year 5                            | 10.7 / 10.9 / 10.8 / 11.0 → 10.1 / 10.8 / 11.0 / 10.7 | 9.7 / 10.3 / 9.7 / 10.5 → 10.3 / 10.3 / 9.7 / 10.5 |
| Pops at the end                           | 16.6 / 15.4 / 16.3 / 16.8 → 15.6 / 16.4 / 17.7 / 16.3 | 13.9 / 13.6 / 14.6 / 15.3 → 14.7 / 14.9 / 14.0 / 15.2 |
| Pops lost to hunger a game                | 0 / 0 / 0 / 0.03 → 0 / 0 / 0 / 0.03 | 0.63 / 0.48 / 0.83 / 0.43 → 0.70 / 0.70 / 0.60 / 0.30 |
| Polis Builder held at the end             | 10 / 3 / 3 / 5 → 6 / 3 / 8 / 8 | 5 / 4 / 7 / 5 → 7 / 4 / 5 / 6 |
| Demos held at the end                     | 11 / 6 / 7 / 10 → 6 / 9 / 15 / 8 | 3 / 5 / 9 / 16 → 10 / 8 / 8 / 10 |
| Civic Elite held at the end               | 10 / 8 / 4 / 9 → 6 / 9 / 9 / 5 | 7 / 10 / 8 / 8 → 8 / 10 / 4 / 8 |

- **The switch halves every seat's reach in play** and leaves the number of foundings nearly
  unchanged (about 3 a seat-game).
- **With 1 base food, seat 0's lead in cities is what shrinks**: it upgraded 1.53 colonies a game
  against about 1, and 1.23 with the leapfrog off. Seats 2 and 3 take the wins seat 0 loses
  (8 → 12 each); seat 2 holds Demos in 15 games and ends with the most pops.

**How the controls used the leapfrog** (the founding replays):

|                                                   | 1 base food (10-24) | No base income |
| ------------------------------------------------- | ------------------- | -------------- |
| Colonies founded in play, all seats               | 509                 | 472            |
| Of them by the leapfrog (not bordering the realm) | 129 (25%)           | 115 (24%)      |
| By seat                                           | 31 of 139 / 26 of 122 / 42 of 121 / 30 of 127 | 32 of 125 / 34 of 115 / 22 of 114 / 27 of 118 |
| In years 1 to 5                                   | 94                  | 77             |
| Distance sailed from the nearest own settlement   | 3.3 to 3.5          | 3.4 to 3.7     |
| Slots, sites sailed to; sites bordering the realm | 3.2 to 3.5; 3.4 to 3.5 | 3.4 to 3.9; 3.5 to 3.8 |
| Colonies founded in year 1, by seat               | 80 / 62 / 67 / 60   | 80 / 61 / 72 / 63 |

- About half of all foundings come in year 1. Seat 0 plays first and makes the game's first
  founding in all 40 games; 11 and 13 of those sail.
- A site sailed to is no better than one beside the realm: about 3.4 slots either way.

## 4. Seat 3 without base food

Six possible causes, checked against the setup replay and the confirming batch's turn CSVs:

| Lead                     | What the data shows                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Placement order          | Seat 3 places the last capital and the first founding colony, back to back.               |
| Colony pick              | Its founding colony is on stone in 25 games, wood 10, plains 5; 3.9 hexes from the capital. |
| Food on its tiles        | The least: 4.5 food slots against seat 0's 9.5. Its capital is off the plains in 7 games. Start income 1.38, seat 0's 2.00. |
| Hunger                   | It loses the fewest pops to hunger (0.43 a game), with the least food.                    |
| Turn order in year 1     | It plays last in year 1. Every seat founds about 1.5 to 2 colonies in year 1.             |
| Income                   | The top income in years 2 and 3 (3.83 against 3.58 to 3.70, then 3.73 against 3.30 to 3.33) and in years 5 to 8 (4.00 to 4.33); seat 2 edges it in year 4. |

Over all 160 seat-games of the control:

| Start                       | Wins of seat-games |
| --------------------------- | ------------------ |
| Capital on plains           | 35 of 152 (23%)    |
| Capital on stone            | 5 of 7             |
| Founding colony on plains   | 8 of 48 (17%)      |
| Founding colony on stone    | 21 of 80 (26%)     |
| Founding colony on wood     | 11 of 32 (34%)     |

- **In the control, starts that make materials won more often than starts that make food.**
  Seat 0's start, food on food, is the richest at the start and wins 4. Seat 3, picking the
  first colony, takes stone or wood.
- This is a lead, not a proof: the stone capitals are seven, and the colony split is within
  noise for wood and stone. In the leapfrog-off arm the split is flatter: plains 14 of 59,
  stone 17 of 71, wood 9 of 30.

## Verdict

- **With 1 base food: yes, mostly.** Switching the leapfrog off takes seat 0 from 17 wins to 9,
  as random openings did. As far as this data shows, the rule acts through placement: with it
  a rim capital is worth more, and the first pick takes the rim. Seat 0 does not sail more
  than the others.
- **Without base food (main): there is no seat 0 edge to take.** The leapfrog does not make seat
  3's lead either: off, seat 3 still has the top income and wins the most (14). Seat 3's lead
  looks like a matter of the setup order and what each seat's tiles make, not of sailing.

## What it means for the Archipelago sea rule

- "Any shore reaches any shore" is what made a rim capital the best first pick with base food.
  Island hopping within N hexes makes reach local again, so a small N should play like this
  report's off arms: no seat 0 edge with base food, about even seats without.
- The bots' placement scoring asks the founding rule itself. If island hopping is built into
  that rule, the bots' capital picks follow it with no extra work; a check written anywhere
  else would leave them scoring the old geometry.
- The founding voyage at setup has its own rule, any coastal tile, which the switch does not
  touch. Island hopping has to say whether it limits that voyage too. As it stands, every seat
  starts holding the coast.
- Judge the Archipelago batch with this report's seat tables: wins by seat, capital placement by
  seat and cities at year 5.

## Next

- Owner decision: keep the leapfrog, or replace it with island hopping if the Archipelago test
  supports it. With no base food the leapfrog no longer makes a seat 0 edge.
- Seat 3's lead without base food may be a setup-order question (last capital, first colony).
  A test that changes the colony round's order, or gives the last capital pick a bonus, would
  tell.
