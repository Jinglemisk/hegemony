# Archipelago batches: island hopping at 4 against any shore and Continental

Date: 2026-10-25. Code: `4fdf564` (#145: `main` at `127bc65`, the last-colony bot fix #144 and
the Archipelago board). The Continental masters control is the masters arm of the
[last colony pick report](2026-10-25-last-colony-pick.md) (#144, `9d47850`), copied here as
`conti-masters`; #145's parity run shows the two codes play Continental identically. The batches ran one at a time on two
workers at the lowest CPU priority, 12:13 to 13:22.

## Question

Two questions, asked before the owner answers Q81:

1. Does Archipelago play, with island hopping at 4 hexes (Q81's recommendation)? Do games
   finish, and does any seat or build run away against Continental?
2. On the same islands, what does hop 4 change against any shore (today's rule)?

## Data

- **Tables:**
  - **Masters:** the master bot in all four seats, seeds 1000 to 1039, no National Ideas.
  - **Mixed:** slaver, civic, trader and master, rotated through the seats. Seeds 1000 to 1009,
    × 4 seatings = 40 games.
  - Every game is 56 turns, with no base income, as `main` plays.
- **Arms:**

  | Arm                      | Board       | Table   | Founding across water                     |
  | ------------------------ | ----------- | ------- | ----------------------------------------- |
  | `conti-masters`          | Continental | Masters | any shore (#144's batch, the control)     |
  | `archi-masters-hop4`     | Archipelago | Masters | hop 4, in play and on the founding voyage |
  | `archi-masters-anyshore` | Archipelago | Masters | any shore                                 |
  | `conti-mixed`            | Continental | Mixed   | any shore (the control)                   |
  | `archi-mixed-hop4`       | Archipelago | Mixed   | hop 4                                     |

- **Files:** the reports and turn snapshots are in
  [the batch folder](2026-10-25-archipelago-batches/), the logs in
  [`logs/`](2026-10-25-archipelago-batches/logs/), the patch in
  [`patches/`](2026-10-25-archipelago-batches/patches/), and the runner and summary scripts in
  [`tools/`](2026-10-25-archipelago-batches/tools/).

```bash
npm run sim -- batch --turns 56 --seed 1000 --jobs 2 --board archipelago --games 40 --policy master --without-ideas all --ruleset-patch docs/reports/simulation/2026-10-25-archipelago-batches/patches/hop4.ruleset.json --report <out>.json --csv <out>.csv
npm run sim -- batch --turns 56 --seed 1000 --jobs 2 --board archipelago --games 10 --seats slaver,civic,trader,master --rotate --ruleset-patch docs/reports/simulation/2026-10-25-archipelago-batches/patches/hop4.ruleset.json --report <out>.json --csv <out>.csv
node docs/reports/simulation/2026-10-25-archipelago-batches/tools/summarize.mjs --md conti-masters,archi-masters-hop4,archi-masters-anyshore,conti-mixed,archi-mixed-hop4
```

The any-shore arm drops the patch; the Continental arms swap the board.

**How sure the numbers are:**

- At 40 games a win rate is uncertain by about ±13 points, about ±5 games.
- **Archipelago against Continental** is played on different boards, so the arms are fresh
  samples, not pairs.
- **Hop 4 against any shore** is played on the same islands: the board is drawn from the seed,
  not the rules. The founding voyage differs from the first colony on, though, and only 11 of 40
  games keep their winner, which is what chance gives among four seats. Read them as fresh
  samples on the same boards.
- **The mixed Continental arm is identical, game for game, to #140's mixed arm** (on `main`
  without #144). So #144 and the board change leave games with Ideas on untouched.
- For per-game figures, [`tools/spread.mjs`](2026-10-25-archipelago-batches/tools/spread.mjs)
  gives the mean and twice its standard error over the 40 games. The trade, influence and
  Beloved figures have no per-game spread in the report.

## Summary

- **Archipelago with hop 4 plays.** All 80 of its games finished: 34 and 36 of 40 by the
  deck, as on Continental, with no forced resolution and no action-cap hit in any arm.
- **No seat or build runs away beyond the noise.**
  - Four masters, wins by seat: 11 / 6 / 8 / 15, against 7 / 10 / 11 / 12 on Continental.
    Seat 3's 15 and seat 1's 6 sit at the edge of ±5 games.
  - The mixed table is the flattest of the three: 12 / 10 / 10 / 8 by seat, and
    15 / 10 / 9 / 6 by build (slaver, civic, trader, master), against 13 / 10 / 10 / 7 on
    Continental.
  - Seat 0, which picks the first capital, wins 11 of 40, against 7 on Continental and with any
    shore. That is within the noise. The generator report's placement score expected hop 4 to
    raise its lead, and 40 games cannot show a lead of that size.
- **Against Continental, the islands build more cities:** 2.36 a seat at the end against 1.99
  on the masters table, and 2.59 against 2.10 on the mixed one, both beyond the noise. The
  trader starves a little less (4.33 pops a seat-game against 5.23) and the slaver a little
  more (1.85 against 1.40). The year-5 income leader wins 45% of masters games (Continental
  50%) and 33% of mixed ones (34%).
- **Hop 4 against any shore, on the same islands:**
  - fewer cities at the end (2.36 against 2.68) and fewer temples (6.4 against 8.4 a game),
    both beyond the noise;
  - more gold income (16 against 9 a seat-game), at the edge of the noise, because a few games
    make most of it;
  - more Ports (2.7 against 2.3 a game), within the noise;
  - more trade (7.1 against 6.4 trades settled a game, 3.3 against 2.1 food), less influence
    (3.5 against 4.8 a year), and Beloved held by the sole luxury leader in 40% of its turns
    against 62% (Continental 69%). None of these has a spread in the report.

## 1. Four masters

|                                                       | Continental      | Archipelago, hop 4 | Archipelago, any shore |
| ----------------------------------------------------- | ---------------- | ------------------ | ---------------------- |
| Ended by the race, by the deck                        | 4, 36            | 6, 34              | 6, 34                  |
| Won on a tiebreak                                     | 13               | 9                  | 15                     |
| Wins by seat                                          | 7 / 10 / 11 / 12 | 11 / 6 / 8 / 15    | 7 / 12 / 9 / 12        |
| Cities at the end, a seat                             | 1.99 ± 0.08      | 2.36 ± 0.15        | 2.68 ± 0.14            |
| Colonies at the end, a seat                           | 2.76             | 2.57               | 2.42                   |
| Colonies founded in play, a game                      | 11.3             | 12.7               | 12.6                   |
| Ports a game                                          | 3.23 ± 0.41      | 2.67 ± 0.43        | 2.33 ± 0.42            |
| Temples a game                                        | 5.70 ± 0.93      | 6.38 ± 0.91        | 8.38 ± 1.04            |
| Gold income a seat-game                               | 17.1 ± 5.7       | 16.1 ± 7.1         | 8.6 ± 2.1              |
| Trades settled a game                                 | 6.8              | 7.1                | 6.4                    |
| Food traded a game                                    | 3.1              | 3.3                | 2.1                    |
| Pops lost to hunger a seat-game                       | 0.57             | 0.71               | 0.53                   |
| Turns begun short of food                             | 442              | 429                | 429                    |
| Influence median, year 10 → 14 (a year)               | 15 → 36 (5.3)    | 15 → 29 (3.5)      | 17 → 36 (4.8)          |
| Riot turns from year 8                                | 5%               | 6%                 | 5%                     |
| Beloved: turns held; holder the sole luxury leader    | 54; 69%          | 50; 40%            | 53; 62%                |
| Year-5 income leader wins                             | 17 of 34         | 14 of 31           | 13 of 27               |
| Year-10 stock, leader ÷ laggard: median; games ≤ 2.5× | 5; 6 of 37       | 4.2; 11 of 38      | 3.7; 7 of 37           |

- **Cities.** Archipelago seats end with more cities than Continental ones, and more again with
  any shore, although both Archipelago arms found as many colonies in play. Not checked why.
  Temples rise with the cities across the three arms.
- **Gold.** The any-shore arm has none of the high-gold games: its best game makes 26 gold a
  seat, against 128 under hop 4 and 111 on Continental. The medians are closer: 8, 11 and 11.
- **Seats.** Seat 3 at 15 under hop 4 is the largest gap in this report, at the edge of the
  noise. [`tools/seats.mjs`](2026-10-25-archipelago-batches/tools/seats.mjs) shows no head
  start behind it: at year 5 seat 3 holds 1.77 cities against 1.65 to 1.93, and it loses as
  many pops to hunger. It ends with the most pops (15.5 against 13.7 to 14.4) and holds Demos
  and Civic Elite most often (15 and 14 of 40).

## 2. The mixed table

|                                                    | Continental      | Archipelago, hop 4 |
| -------------------------------------------------- | ---------------- | ------------------ |
| Ended by the race, by the deck                     | 4, 36            | 4, 36              |
| Wins by seat                                       | 7 / 11 / 6 / 16  | 12 / 10 / 10 / 8   |
| Wins, slaver / civic / trader / master             | 13 / 10 / 10 / 7 | 15 / 10 / 9 / 6    |
| Cities at the end, a seat                          | 2.10 ± 0.10      | 2.59 ± 0.13        |
| Ports a game                                       | 3.65 ± 0.25      | 3.67 ± 0.39        |
| Gold income a seat-game, same order                | 28 / 9 / 84 / 14 | 25 / 10 / 79 / 15  |
| Pops lost to hunger a seat-game, same order        | 1.4 / 0.05 / 5.23 / 0.8 | 1.85 / 0.3 / 4.33 / 0.6 |
| Turns begun short of food                          | 428              | 385                |
| Trades settled a game                              | 9.7              | 8.6                |
| Food traded a game                                 | 6.8              | 6.3                |
| Influence median, year 10 → 14 (a year)            | 4 → 14 (2.5)     | 4 → 11 (1.8)       |
| Riot turns from year 8 (slaver)                    | 11% (25%)        | 9% (24%)           |
| Beloved: turns held; holder the sole luxury leader | 67; 52%          | 112; 46%           |
| Year-5 income leader wins                          | 13 of 38         | 12 of 36           |

- The builds keep their order and their shares. The mixed table plays only ten boards, so its
  seat figures are weaker evidence than the masters table's.
- Continental's seat 3 at 16 is the mixed control's own draw; on Archipelago it is 8.

## Verdict

Archipelago with island hopping at 4 works. Its 80 games finished without a forced turn, and
no seat or build stands out beyond the noise of 40 games. Against Continental it builds more
cities and starves the trader a little less. Against any shore on the same islands, hop 4
gives fewer cities and temples; it also points to more gold, trade and Ports, but only the
cities and temples clear the noise. Nothing here argues against Q81's recommendation of hop 4.
The masters table's seat spread under hop 4 (seat 3 at 15, seat 1 at 6) needs a second block of
seeds before anyone reads it.

## Still unmeasured

- **How many foundings cross water**, at setup or in play. The batch report records no founding
  positions: colonies on the capital's island, elsewhere in its group or in another group. The
  only figure is the generator report's setup replay at hop 4 (28% / 49% / 23%).
- **Whether the first pick is worth more in wins under hop 4**, as the generator report's
  placement score expects (a lead of 7.9 against 5.1 with any shore). It needs more seeds than
  40.
- **Hunger by island:** whether seats on an island without plains starve more. The report has
  no island figures.
- **The other sea rules:** hop 3, free within the own group with a Port to cross, and the Port
  to cross water. Not run.
- **Q81's Continental and goods parts:** Continental with hop 4, and one good per group first.
  Not run; the leapfrog-off batch (#142) is the nearest Continental figure.
- **The owner's own game** on the islands.
