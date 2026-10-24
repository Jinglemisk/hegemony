# Player trade: the paired batches

Date: 2026-10-22. Code: `df7b724`. Its rules and bots are those of trade PR 2's merge (`de569b3`);
the only engine change since then is one unused export removed.

## Question

The [trade plan](../../plans/player-trade.md) asks what removing the bank, adding trade and adding
base food each do to the problems in the [v1 against v2](2026-10-19-v1-vs-v2.md) report: food
shortfalls, hunger, the Dole, the freeman share, gold income, realms that never cut wood, the
influence stock, and wins and titles. Its test for trade itself is who exports what.

## Data

Six batches of 40 games, 56 turns each, seeds 1000 to 1039, one game at a time. Two tables:

- **Masters:** the master bot in all four seats, no National Ideas (Q80's batch).
- **Mixed:** slaver, civic, trader and master, rotated through the seats (10 seeds × 4 seatings).

Each table plays three economies, set by a ruleset patch:

- **Bank:** the game before trade. Bank on, trade off, no base food
  ([patch](2026-10-22-trade-paired/before-trade.json)).
- **Trade:** trade on, no bank, no base food
  ([patch](2026-10-22-trade-paired/trade-no-base-food.json)).
- **Trade + base food:** the default ruleset. Trade on, no bank, every settlement makes 1 food.

```bash
npm run sim -- batch --games 40 --turns 56 --seed 1000 --jobs 1 --policy master --without-ideas all --ruleset-patch docs/reports/simulation/2026-10-22-trade-paired/before-trade.json --report docs/reports/simulation/2026-10-22-trade-paired/masters-before-trade.json --csv docs/reports/simulation/2026-10-22-trade-paired/masters-before-trade.csv
npm run sim -- batch --games 10 --turns 56 --seed 1000 --jobs 1 --seats slaver,civic,trader,master --rotate --report docs/reports/simulation/2026-10-22-trade-paired/mixed-trade-base-food.json --csv docs/reports/simulation/2026-10-22-trade-paired/mixed-trade-base-food.csv
```

The other four swap the patch (none for the default ruleset) and the table's flags. Reports and
turn snapshots for all six are in [the batch folder](2026-10-22-trade-paired/), named
`<table>-<economy>`. Figures not printed by the report come from the turn snapshots:

- **Freeman share:** mean freemen at each seat's last snapshot over mean pops.
- **Gold income:** the snapshot's gold income summed over a seat's own turns. Gold received in
  trades is not income.
- **Never cut wood:** seat-games whose wood income was 0 on every own turn.

At 40 games a win rate is uncertain by about ±13 points.

**The bank arm reproduces Step 20's masters column** (Q80): 629 turns begun short against 630,
40.5 Dole uses a game against 40.7, 0.46 pops lost a seat-game, 13.4 pops at year 14 against
13.3, 5.4% riot turns from year 8, 38 games by the deck and 2 by the race, and the same wins by
seat. The switches restore the old economy, so the three arms compare like for like.

## 1. Four masters

|                                                                | Bank             | Trade            | Trade + base food |
| -------------------------------------------------------------- | ---------------- | ---------------- | ----------------- |
| Turns begun short of food                                      | 629 of 2,213     | 510 of 2,212     | 155 of 2,117      |
| Dole uses a game                                               | 40.5             | 41.8             | 19.3              |
| Bank buys a game                                               | 12.9             | –                | –                 |
| Pops lost to hunger a seat-game                                | 0.46             | 0.62             | 0.02              |
| Pops a seat at year 14                                         | 13.4             | 14.4             | 16.4              |
| End pops, citizens / freemen / slaves                          | 5.6 / 1.6 / 6.1  | 5.6 / 2.4 / 6.5  | 7.8 / 3.3 / 5.3   |
| Freeman share; slave share                                     | 12%; 46%         | 16%; 45%         | 20%; 32%          |
| Gold income a seat-game                                        | 14.8             | 16.6             | 24.1              |
| Wood income a turn                                             | 0.92             | 0.87             | 2.49              |
| Realms that never cut wood, of 160                             | 53               | 43               | 0                 |
| Median influence stock, year 10 → 14                           | 17 → 35          | 16 → 34          | 43 → 80           |
| Influence growth a year, years 10 to 14                        | +4.5             | +4.5             | +9.3              |
| Riot turns from year 8                                         | 5.4%             | 4.4%             | 3.6%              |
| Ended by the deck, by the race                                 | 38, 2            | 36, 4            | 33, 7             |
| Wins by seat, of 40                                            | 9 / 12 / 5 / 14  | 10 / 6 / 12 / 12 | 14 / 2 / 12 / 12  |
| Winner holds one, two, three titles                            | 11, 27, 2        | 17, 18, 5        | 9, 24, 7          |
| Decided by the tiebreak                                        | 13               | 15               | 9                 |
| Held at the end: Polis, Demos, Civic Elite, Treasurer, Beloved, Voice | 17, 36, 35, 1, 4, 20 | 16, 36, 29, 1, 8, 21 | 29, 36, 30, 6, 10, 19 |
| Marketplaces, Granaries a game                                 | 0.03, 1.0        | 0.1, 1.7         | 0.6, 4.6          |
| Beloved: turns held; holder the sole luxury leader             | 21; 100%         | 71; 49%          | 127; 28%          |

- **Trade alone changes little here.** Four identical bots all lack the same thing, food, so
  little food changes hands (§3). Wood and stone flow the right way. Hunger losses rise a
  little, 0.46 to 0.62, since nothing sells food for gold any more.
- **Base food fixes food.** Turns begun short fall by three quarters, Dole uses halve, and
  hunger losses all but vanish. With food coming from every settlement, slaves leave the plains:
  wood income nearly triples, every realm cuts wood, and the slave share falls from 46% to 32%.
- **The influence the Dole used to take now piles up:** +9.3 a year, against Step 11's ceiling
  of 5.
- **Seat 1 wins 2 of 40 with base food.** A given seat lands on 2 or fewer wins about once in a
  thousand 40-game batches; allowing for the twelve seat-and-economy cells here, about once in
  eighty. Base food is paid per settlement, so a start with fewer sites nearby would fall behind
  (inferred, not checked).

## 2. The mixed table

|                                                    | Bank            | Trade           | Trade + base food |
| -------------------------------------------------- | --------------- | --------------- | ----------------- |
| Wins, slaver / civic / trader / master, of 40      | 9 / 10 / 9 / 12 | 8 / 10 / 13 / 9 | 3 / 4 / 23 / 10   |
| Turns begun short of food                          | 686 of 2,225    | 383 of 2,146    | 168 of 2,177      |
| Dole uses a game                                   | 33.0            | 24.1            | 19.0              |
| Bank buys a game                                   | 32.6            | –               | –                 |
| Pops lost to hunger a seat-game (trader)           | 0.94 (2.88)     | 1.49 (4.08)     | 0.89 (3.27)       |
| Pops a seat at year 14                             | 16.2            | 17.0            | 19.4              |
| Freeman share (trader); slave share                | 26% (59%); 50%  | 26% (57%); 52%  | 32% (72%); 41%    |
| Gold income a seat-game (trader)                   | 37.1 (88.6)     | 30.3 (77.7)     | 59.3 (145.1)      |
| The trader's end gold, median                      | 2               | 30              | 100               |
| Realms that never cut wood, of 160                 | 57              | 37              | 8                 |
| Median influence stock, year 10 → 14               | 4 → 13          | 5 → 16          | 13 → 54           |
| Civic, master stock at year 14                     | 52, 29          | 57, 48          | 100, 83           |
| Riot turns from year 8 (slaver)                    | 13.4% (25.7%)   | 12.5% (32.2%)   | 9.6% (29.5%)      |
| Ended by the deck, by the race                     | 39, 1           | 33, 7           | 34, 6             |
| Winner holds one, two, three titles                | 15, 23, 2       | 12, 20, 8       | 8, 22, 10         |
| Treasurer held at the end                          | 7               | 21              | 40                |
| Beloved: turns held; holder the sole luxury leader | 16; 50%         | 69; 52%         | 399; 88%          |
| Marketplaces a game                                | 0.45            | 0.83            | 1.65              |

- **Trade alone keeps every build between 20% and 45%:** 20, 25, 33 and 23%. Turns begun short
  nearly halve, but hunger losses rise by half. The bank was how gold bought food, and trade
  does not replace it: the slaver now loses 0.90 pops a seat-game (0.15 with the bank), the
  trader 4.08 (2.88).
- **With base food the trader wins 23 of 40,** somewhere between about 42% and 72% at this
  sample size. The slaver wins 3 and the civic 4. The trader holds Treasurer at the end of 39
  games and Beloved for 351 of the 399 turns it is held. Its freemen make 145 gold a seat-game,
  and the median trader ends with 100 gold; Treasurer needs 30. With the bank gone nothing
  spends gold in bulk.
- **The trader starves with gold in hand:** 3.27 pops a seat-game, nearly all freemen. On the
  turns it lost pops it held a median 46 gold, and 10 or more in 27 of 28. It gets 2.4 food a
  seat-game by trade, and food sold for gold settled 17 times in the 40 games. Its influence
  stays at about 2, so the Dole, at 3 influence a food, is mostly out of reach.
- **Little food is for sale.** On the trader's 67 turns begun short, the best-stocked rival held
  a median 1 food, and one rival held the whole shortfall on 26. Bots turn food into pops as it
  comes; only the slaver keeps a store (about 5 from year 10). A bot asks one seat for its whole
  shortfall, makes one offer a turn, and offers gold at 1 a food only, where settled food-for-gold
  trades ran at 2.
- **Beloved follows luxuries on this table.** The trader keeps few slaves (23% of its pops) and
  holds the luxuries, so Beloved's holder is the sole luxury leader in 88% of the turns held. On
  the masters table it is 28%.
- **Riots from year 8 fall under 10%** with base food, though the slaver
  still riots on 29.5% of its turns.

## 3. Who exports what

Units sent a game, net, by the seat whose land makes the most of a material / the seat whose
land makes the least. Trade works when the first is positive and the second negative.

|       | Masters, trade | Masters, + base food | Mixed, trade | Mixed, + base food |
| ----- | -------------- | -------------------- | ------------ | ------------------ |
| Wood  | +3.2 / −3.4    | +1.0 / −1.5          | +3.5 / −3.3  | +0.1 / −2.2        |
| Stone | +4.8 / −4.2    | +2.5 / −1.1          | +0.4 / −3.3  | +1.6 / −3.1        |
| Food  | +0.2 / −0.3    | +1.1 / −0.3          | +6.4 / −3.2  | +5.8 / −4.0        |

- **Every sign is the right way round.** Food moves on the mixed table, where the slaver sends
  out 6.5 a seat-game (5.8 with base food) and the civic and master take it in. Among four
  masters, all short of food, almost none moves.
- **Volume:** 4.5 to 8.4 trades settle a game, so each seat's offers settle once or twice. 19
  to 26 offers a game are withdrawn, and answers are mostly declines: 31 to 40 a game against
  about 3 to 5 accepts. 0.5 to 1 trade a game settles in a sitting.
- **Prices (medians):** a food costs 2 wood or 2 stone; wood and stone trade about even; a
  material is worth about 1 gold or 1 influence.
- **Units given a game** on the mixed table with trade: wood 16.1, stone 9.6, food 8.8, gold
  7.2, influence 8.9. No goods or pops changed hands. A title changed holder after 2 trades in
  each mixed batch, none on the masters table.

## 4. Step 11's rules, read early

Step 11 has not run; this reads four of its rules against these batches.

| Rule                                                     | Masters: bank / trade / + base food | Mixed: bank / trade / + base food     |
| -------------------------------------------------------- | ----------------------------------- | ------------------------------------- |
| Riot turns after year 7, at most 10%                     | 5.4 / 4.4 / 3.6%: pass              | 13.4 / 12.5 / 9.6%: fail, fail, pass  |
| Influence growth years 10 to 14, at most 5 a year        | 4.5 / 4.5 / 9.3: pass, pass, fail   | 2.3 / 2.8 / 10.3: pass, pass, fail    |
| Each personality wins 20% to 45%                         | –                                   | pass, pass, fail (trader 23, civic 4, slaver 3 of 40) |
| Beloved's holder the luxury leader, at most 60% of turns | 100 / 49 / 28%: fail, pass, pass    | 50 / 52 / 88%: pass, pass, fail       |

The masters' 100% with the bank is 21 turns held.

## What it means

- Trade works as designed: materials go from the seat that makes them to the seat that lacks
  them, and food moves where one build grows it.
- Base food, not trade, fixes food: shortfalls fall by about three quarters on both tables, and
  hunger losses vanish except the trader's.
- Base food moves two problems. The influence the Dole absorbed now piles up at about 10 a year,
  and gold piles up at the trader with nothing to spend it on, which wins it Treasurer and the
  game. The [development deck](../../plans/development-deck.md) is the gold sink already planned.
- The trader bot starves while holding gold. That is the gap Step 11's build-viability rule asks
  about, and it should close before Step 11 judges the trader.
- Seat 1's 2 wins of 40 with base food on the masters table is worth checking before Step 11.
