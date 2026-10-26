# The balance check

Date: 2026-10-26. Code: `main` at `d2a5e34`: no base income, the last-colony bot fix (#144), and
#147's seven goods on every board with Archipelago at hop 3. The three batches ran one after the
other overnight on the efficiency cores (`taskpolicy -b`), four workers: 51 minutes, 61 minutes
and 4 hours 24 minutes.

## Question

Do the v2 rules pass the balance check? It used to be called Step 11. Its rules, and the owner's
answers of 2026-10-25 (Q80) on how they are judged, are in the
[player trade plan](../../plans/player-trade.md#the-balance-check). The answers in short: the
runaway leader is judged where all four seats play the master bot, win rates are a benchmark
with a flag over 45%, and v1 is compared only on the figures both versions record.

## Data

- **Batches** (56 turns, seeds from 1000):

  | Batch                    | Table                                                     | Board       | Games                   |
  | ------------------------ | --------------------------------------------------------- | ----------- | ----------------------- |
  | `continental-masters-60` | Four masters, no Ideas                                    | Continental | 60                      |
  | `archipelago-masters-60` | Four masters, no Ideas                                    | Archipelago | 60                      |
  | `continental-mixed-160`  | Slaver, civic, trader and master rotated, all Ideas | Continental | 160 (40 seeds × 4 seatings) |

- **Files** ([folder](2026-10-26-balance-check/)): each batch's report and turn CSV; the logs
  and timings in `logs/`; the script output in `check.txt` and `open-points.txt`.

```bash
taskpolicy -b node --import tsx src/sim/cli.ts batch --turns 56 --seed 1000 --jobs 4 --board continental --games 60 --policy master --without-ideas all --report <out>.json --csv <out>.csv
taskpolicy -b node --import tsx src/sim/cli.ts batch --turns 56 --seed 1000 --jobs 4 --board archipelago --games 60 --policy master --without-ideas all --report <out>.json --csv <out>.csv
taskpolicy -b node --import tsx src/sim/cli.ts batch --turns 56 --seed 1000 --jobs 4 --board continental --games 40 --seats slaver,civic,trader,master --rotate --report <out>.json --csv <out>.csv
node docs/reports/simulation/2026-10-26-balance-check/tools/check.mjs docs/reports/simulation/2026-10-26-balance-check/{continental-masters-60,archipelago-masters-60,continental-mixed-160}
node docs/reports/simulation/2026-10-26-balance-check/tools/open-points.mjs docs/reports/simulation/2026-10-26-balance-check/{continental-masters-60,archipelago-masters-60,continental-mixed-160}
```

Intervals are 95% bootstraps over seeds. A verdict marked "within noise" has its interval across
the limit. Every game finished: no turn cap, no forced resolution.

## Summary

- **Pass:** riots and influence pass on all three tables. On Continental the year-5 income leader
  wins 37% of games, within noise of the 40% limit.
- **Fail:** the year-10 stock ratio fails on every table, at 5.0×, 7.0× and 17.1× against 2.5×.
  It measures how empty the poorest realm's stock is: the laggard holds a median of 1 to 3 units.
- **Fail, within noise:** Beloved's holder is the sole luxury leader in 62 to 68% of the turns it
  is held, against 60%. On Archipelago the year-5 income leader wins 42%.
- **Win rates:** every personality is inside 20% to 45% or within noise of it. Slaver 26%,
  civic 19%, trader 34%, master 21%. No flag.
- **Seats:** no seat stands out beyond chance.

## Every rule

| Rule                                                | Limit           | Continental, four masters (60) | Archipelago, four masters (60) | Continental, mixed (160)                       |
| --------------------------------------------------- | --------------- | ------------------------------ | ------------------------------ | ---------------------------------------------- |
| Riot turns from year 8                              | ≤ 10%           | 4% (3–5%) pass                 | 5% (4–7%) pass                 | 9% (7–10%) pass; slaver 20%                    |
| Median influence growth, year 10 to 14              | ≤ +5 a year     | +4.5 (+3.8 to +5.5) pass, within noise | +3.1 (+2.5 to +4.0) pass | +2.5 (+1.8 to +3.3) pass; civic +6.3, master +5.5 |
| Pops lost to hunger a seat-game                     | none set        | 0.48 (0.35–0.64)               | 0.55 (0.40–0.70)               | 1.79 (1.54–2.07); trader 5.36                  |
| Turns begun short of food                           | none set        | 20%                            | 22%                            | 19%                                            |
| Beloved's holder is the sole luxury leader          | ≤ 60%           | 62% of 65 turns (21–98%) fail, within noise | 63% of 174 (29–91%) fail, within noise | 68% of 487 (49–83%) fail, within noise |
| The same, counting a tie                            | –               | 100%                           | 97%                            | 88%                                            |
| Year-5 income leader wins                           | ≤ 40%           | 37%, 19 of 51 (24–50%) pass, within noise | 42%, 19 of 45 (28–57%) fail, within noise | 25%, 39 of 155: reference only |
| Year-10 stock, leader ÷ laggard, median game        | ≤ 2.5×          | 5.0× (4.0–6.7×) fail           | 7.0× (6.0–9.0×) fail           | 17.1× (15.3–18.8×) fail                        |
| Each personality wins                               | 20% to 45%      | –                              | –                              | see below; all in range or within noise        |
| Draw swings: resource cards against the turn's take | record          | median 22%, p90 50%            | median 22%, p90 50%            | median 18%, p90 50%                            |
| Games ending by the race                            | record          | 10 of 60; 52.7 turns a game    | 9 of 60; 53.6 turns            | 19 of 160; 54.0 turns                          |
| Legibility: reads per decision                      | by hand         | not recounted in this report   |                                |                                                |

Games left out: the influence rule reads games that reach year 14 (50, 51 and 141). The year-5
rule leaves out games with a tied income lead (8, 15 and 4). Small incomes tie often on
Archipelago.

The trade commands are in use: 6.4 trades settled a game on Continental's masters table, 7.3 on
Archipelago's and 9.6 on the mixed table. What the bots never use is the bank, which is off;
Capital Works, never drafted or bought; and Manumission, passed once in 160 games.

## Win rates and seats

| Personality | Wins        | 95% interval | Won on a tiebreak | Verdict                         |
| ----------- | ----------- | ------------ | ----------------- | ------------------------------- |
| Slaver      | 41 (26%)    | 18–34%       | 2                 | in range                        |
| Civic       | 30 (19%)    | 12–26%       | 15                | under 20%, within noise         |
| Trader      | 55 (34%)    | 26–43%       | 29                | in range                        |
| Master      | 34 (21%)    | 15–28%       | 13                | in range                        |

| Wins by seat, first to fourth | Continental masters | Archipelago masters | Mixed            |
| ----------------------------- | ------------------- | ------------------- | ---------------- |
| Wins                          | 20 / 10 / 11 / 19   | 12 / 14 / 21 / 13   | 36 / 36 / 54 / 34 |
| Share                         | 33 / 17 / 18 / 32%  | 20 / 23 / 35 / 22%  | 23 / 23 / 34 / 21% |
| Chance of a spread this wide  | 14%                 | 34%                 | 9%               |

- The trader wins half its games on the tiebreak, 25 of them on happiness. It holds Treasurer at
  the end of 113 of 160 games, and holds Beloved on 335 of the 487 turns it is held. It still loses
  5.36 pops a seat-game to hunger, 846 freemen in all, against 0.10 to 1.11 for the others.
- The civic wins half its games on the tiebreak too. It holds Voice at the end of 53 games and
  Civic Elite in 50.
- Seat 2 wins most on Archipelago and on the mixed table, but neither spread is beyond chance.
  On the mixed table each personality sits in each seat 40 times.

## What fails and what might explain it

**The year-10 stock ratio (all three tables).** At year 10 the leader's median stock is 16 on
Continental's masters table, against the laggard's 3. On Archipelago it is 10 against 1, and on
the mixed table 57 against 3. The laggard holds 1 or less in 16 of 55, 34 of 56 and 31 of 152
games.

v2 realms spend their stock as they earn it: end gold is a median 0 to 1. So the ratio reads the
poorest realm's empty store, not a runaway, as the
[sim parity audit](2026-10-10-v2-sim-parity-audit.md) warned. On the mixed table the slaver holds
the largest stock in 124 of 152 games, which is its build at work.

By pops, the baseline's other snowball measure, the year-10 leader holds 1.6 times the laggard on
both masters tables and 2.2 times on the mixed table. The v1 baseline's figure was 1.56 at round
10. The rule's own remedy is "report, with a proposed catch-up rule". No catch-up rule is proposed
here, since the measure based on wins passes on Continental.

**Beloved and luxuries (all three tables, within noise).** Beloved needs a level of 4. A Temple
adds 1 a settlement, a good adds 2, and every two slaves take 1. With the level near 0 (year 14
mean −0.2 and −0.1 on the masters tables, −0.6 on the mixed table), goods are the main way to
reach 4. These are the first batches with seven goods on every board (#147). The holder is a
luxury leader, sole or tied, on 88 to 100% of the turns it is held.

The rule cannot be settled here: Beloved is held at all in only 10, 13 and 43 games, so the
intervals span 21–98%, 29–91% and 49–83%. A missing feature could change it: the development
deck, not yet built, gives a level of 3 or more a free card, so a high level would pay without
goods. The rule's remedy is to raise the Port price or cap what goods add.

**The year-5 income leader on Archipelago (within noise).** 42%, 19 of 45, with 15 tied games
left out. The two earlier Archipelago blocks, at hop 4 and read at the start of each turn, gave
35% (21 of 60). One more 60-game block would settle it.

## Against v1

The figures both versions record, from the [v1-vs-v2 report](2026-10-19-v1-vs-v2.md) and its
[baseline](2026-09-05-shallow-economy-baseline.md). v1 counts riots at both tiers, since a v1
revolt-tier riot rolled the table; v2's revolts roll nothing and are not in its riot count.

|                                      | v1 smart (10)     | v1 master (3)    | Continental masters | Archipelago masters | Mixed              |
| ------------------------------------ | ----------------- | ---------------- | ------------------- | ------------------- | ------------------ |
| Wins by seat, first to fourth        | 40 / 30 / 30 / 0% | 33 / 0 / 67 / 0% | 33 / 17 / 18 / 32%  | 20 / 23 / 35 / 22%  | 23 / 23 / 34 / 21% |
| Player-turns a game                  | 103.7             | 83               | 52.7                | 53.6                | 54.0               |
| Ended by the race                    | 8 of 10           | 3 of 3           | 10 of 60            | 9 of 60             | 19 of 160          |
| Riots a game                         | 8.6               | 8.3              | 3.4                 | 3.8                 | 5.4, and 0.1 revolts |
| Riots and revolts per 100 player-turns | 8.3             | 10.0             | 6.5                 | 7.0                 | 10.1               |

v2 games stop at 56 turns, where v1 games ran on to the race at 83 to 104. Per turn, the mixed
table riots about as often as v1 did; the masters tables riot less.

## Open points for the owner

1. **Hunger has no limit in any plan.** It is recorded only. The trader's 5.36 pops a seat-game
   is the largest figure in the check. A limit, or a call that it is a bot matter, is the
   owner's.
2. **The stock-ratio rule fails on every table by how it is defined.** Options:
   - keep it as written;
   - measure pops instead (1.6× and 2.2× here);
   - drop it and keep the year-5 rule alone.
3. **When the year-5 leader is read.** The rule reads each seat after its own year-5 turn. The
   year's last seat is read after the next year card is turned, so its income already carries
   that card. Read at the start of each seat's turn instead, the leader wins 32% on Continental
   (37% after), 43% on Archipelago (42%) and 26% on the mixed table (25%). On these batches the
   timing moves no verdict. On the 40-game batch of
   [2026-10-25](2026-10-25-archipelago-batches.md) it moved Continental from 50% to 65%.
4. **The development-deck plan's wording.** It says the balance check "runs after both plans",
   while the control plane (owner, 2026-10-25) runs it before the deck. Left unchanged here.
5. **Legibility** is the one rule not checked: it needs a desk recount against the paper's
   section 5.11.

## Earlier figures: Q80's same-policy batches

Copied from Q80 (`d2a5e34:docs/questions.md`), which is now answered and removed.

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

The trade batches that followed (2026-10-22) are in [their report](2026-10-22-trade-paired.md).
