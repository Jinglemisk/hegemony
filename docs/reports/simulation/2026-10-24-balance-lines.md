# Balance lines: fifteen batches on the shuffled board

Date: 2026-10-24. Code: `df7b724`, whose engine and bots are those of `main` at `591ac77`. The
batches ran unattended, one at a time on two workers at the lowest CPU priority, over about
five hours.

## Question

The owner asked which lines the balance check should test, drawn from past conversations,
under four headings:

1. **Recent mechanics:** player trade, no bank, and 1 base food a settlement.
2. **Problems that keep coming back:**
   - one build winning most games;
   - influence piling up;
   - Beloved going to the seat with the most luxuries;
   - a seat edge;
   - hunger.
3. **Food:** how food income, food trade and food's barter value balance.
4. **Gold:** what gold is worth while its planned bulk sink, the development deck, is not
   built.

An audit of 324 owner messages since 2026-09-23, every simulation report and the tunable
values chose the lines. Each batch below tests one of them.

## Data

- **Tables:**
  - **Mixed:** slaver, civic, trader and master, rotated through the seats. Seeds 1000 to 1009,
    × 4 seatings = 40 games.
  - **Masters:** the master bot in all four seats, seeds 1000 to 1039, no National Ideas unless
    stated.
  - Every game is 56 turns.
- **Board:** shuffled, the live game's default, for every batch here. The
  [trade batches](2026-10-22-trade-paired.md) used the classic board, so this report's own
  default-rules batches, `mixed-shuffled` and `masters-shuffled`, are the controls.
- **One change per batch, set by:**
  - a ruleset patch;
  - a tune patch (the Port price);
  - a load hook that rewrites one constant in the trade bot (the food price).
- **Files:** the patches are in [`patches/`](2026-10-24-balance-lines/patches/). The runner,
  queue, hook and summary script are in [`tools/`](2026-10-24-balance-lines/tools/). Reports,
  turn snapshots and logs are in [the batch folder](2026-10-24-balance-lines/).

```bash
npm run sim -- batch --games 10 --turns 56 --seed 1000 --jobs 2 --seats slaver,civic,trader,master --rotate --board shuffled --ruleset-patch docs/reports/simulation/2026-10-24-balance-lines/patches/mixed-treasurer-100.ruleset.json --report <out>.json --csv <out>.csv
npm run sim -- batch --games 40 --turns 56 --seed 1000 --jobs 2 --policy master --without-ideas all --board shuffled --report <out>.json --csv <out>.csv
```

**How sure the numbers are:**
- At 40 games a win rate is uncertain by about ±13 points.
- **Pairing with the control depends on the change.**
  - Seeds match, so a change that only matters late stays paired with its control: the two
    Treasurer batches end with the control's winner in 33 and 34 of 40 games.
  - A change to food, the economy or the bots moves most games off the control's path: 5 to 25
    games of 40 keep the same winner. Those compare like fresh samples.
- The mixed table plays only ten boards, the same ten in every batch.

**Two figures not printed by the batch report**, both readings of the balance check's rule on
a runaway leader (Q80, the open question on how to run the check, asks how to word it):
- **Year-5 income leader wins:** the seat with the most food, wood, stone and gold income on
  its own year-5 turn; ties are skipped.
- **Stock ratio:** wood, stone, gold and food held at year 10, by the leader against the
  laggard (the laggard's stock counted as at least 1).

## Summary

- **The board changes the answer.**
  - On the shuffled board the trader's hunger losses fall from 3.3 to 1.1 pops a game.
  - Beloved goes to the luxury leader in 52% of the turns it is held, not 88%.
  - Seat 1's slump disappears.
  - The classic board's fixed starts produced much of what the trade batches blamed on the
    rules.
- **Base food is the setting behind most of the recurring problems.** From 0 to 1 to 2 base
  food:
  - the trader wins 10, then 16, then 28 games of 40;
  - influence grows 2.5, then 5.3, then 11.5 a year;
  - hunger falls.
  - The classic-board batches agree: 13, then 23.
- **Food's price is not what is missing; supply is.** Bots that pay 2 gold a food instead of 1
  buy less food. No rival keeps a store to sell, because a bot turns every food into a pop.
- **Treasurer is a title the trader collects, not what makes it win.**
  - The trader held it in 112 of its 116 wins in five base-food-1 batches.
  - At a 60- or 100-gold minimum it wins 14 of 40 against the control's 16, mostly in the same
    games: it takes them on the happiness tiebreak and its other titles instead.
- **A gold sink makes the gold build stronger.** With gold buying materials it wins 25. The
  development deck, as a sink that buys the economy, would likely do the same.
- **Seat 0's edge on the shuffled board comes from its first pick of a capital:** 17 of 40
  wins among four masters, 7 with random openings.
- **Influence:**
  - The masters table grows 9.3 a year on either board.
  - The balance check's own remedy, dearer Assembly draws and repeals, takes it only to 7.3.
- **Two batches put every build at 17.5% or more:** no base food, with or without gold buying
  food at 2. Each starves the trader: 5.2 and 3.4 pops a game.

## 1. The board: classic against shuffled

Default rules. The classic columns are the trade batches' default-rules arms.

|                                            | Mixed, classic   | Mixed, shuffled  | Masters, classic | Masters, shuffled |
| ------------------------------------------ | ---------------- | ---------------- | ---------------- | ----------------- |
| Wins by seat                               | 11 / 9 / 9 / 11  | 14 / 12 / 11 / 3 | 14 / 2 / 12 / 12 | 17 / 7 / 8 / 8    |
| Wins, slaver / civic / trader / master     | 3 / 4 / 23 / 10  | 7 / 6 / 16 / 11  | –                | –                 |
| Treasurer held at the end; winners holding | 40; 24           | 39; 16           | 6; 6             | 4; 3              |
| The trader's end gold, median              | 100              | 75               | –                | –                 |
| Pops lost to hunger a seat-game (trader)   | 0.89 (3.28)      | 0.33 (1.13)      | 0.02             | 0.01              |
| Influence median, year 10 → 14 (a year)    | 13 → 54 (10.3)   | 11 → 32 (5.3)    | 43 → 80 (9.3)    | 41 → 78 (9.3)     |
| Riot turns from year 8 (slaver)            | 10% (30%)        | 8% (25%)         | 4%               | 3%                |
| Beloved: turns held; holder the sole luxury leader | 399; 88% | 297; 52%         | 127; 28%         | 227; 68%          |
| Year-5 income leader wins                  | 4 of 38          | 7 of 40          | 9 of 34          | 13 of 27          |
| Ended by the race, by the deck             | 6, 34            | 11, 29           | 7, 33            | 4, 36             |

- **The trader's 16 is probably a low draw.** Four batches moved most games off the
  control's path: the food price, a gold sink, the slave's price and the Port's price. They
  gave the trader 24 to 26 wins each, although two of those changes should hurt it.
  - Pooled over all five: the trader 116 of 200 (58%), the master 36, the slaver 26, the
    civic 22.
  - The classic board's 23 of 40 stands; its hunger and Beloved figures do not.
- **Masters still grow influence 9.3 a year** on the shuffled board; the mixed table's 10.3
  halves.

## 2. Seats

| Four masters, shuffled board | Wins by seat   |
| ---------------------------- | -------------- |
| Bots pick their sites        | 17 / 7 / 8 / 8 |
| Random openings              | 7 / 8 / 14 / 11 |
| National Ideas on            | 8 / 6 / 12 / 14 |

- **Seat 0 places the first capital and takes the best site.**
  - With random placements its edge goes.
  - With National Ideas on it goes too; not checked why.
- **On the mixed table the last seat is short instead.** Over the eleven mixed batches, wins
  by seat were 125 / 118 / 116 / 81 of 440 (seat 3, 18%). This is weaker evidence than the
  masters table's: the same ten boards are played each time, and several batches share most
  of their games.

## 3. Food: income, trade and barter value

The mixed table. "BF" is base food a settlement.

|                                            | BF 0                    | BF 1 (control)       | BF 2                | BF 0, gold buys food at 2 | BF 1, bots pay 2 gold a food | BF 1, a slave costs 3 food |
| ------------------------------------------ | ----------------------- | -------------------- | ------------------- | ------------------------- | ---------------------------- | -------------------------- |
| Wins, slaver / civic / trader / master     | 13 / 10 / 10 / 7        | 7 / 6 / 16 / 11      | 6 / 2 / 28 / 4      | 10 / 11 / 12 / 7          | 6 / 3 / 25 / 6               | 2 / 4 / 26 / 8             |
| Pops lost to hunger a seat-game, same order | 1.4 / 0.05 / 5.23 / 0.8 | 0.2 / 0 / 1.13 / 0 | 0 / 0 / 0.28 / 0    | 0.88 / 0.18 / 3.38 / 0.43 | 0.3 / 0 / 1.2 / 0            | 0 / 0 / 0.25 / 0.08        |
| Turns begun short of food                  | 428                     | 132                  | 99                  | 534                       | 158                          | 128                        |
| Dole uses a game                           | 27.3                    | 14.9                 | 15.3                | 22.8                      | 16.6                         | 17.5                       |
| Food traded a game                         | 6.8                     | 8.7                  | 7.9                 | 11.0                      | 7.6                          | 9.0                        |
| Food sold for gold: trades, median price   | 18, 1.3                 | 27, 1                | 21, 1.5             | 25, 1                     | 15, 1                        | 21, 1                      |
| Pops a seat at year 14                     | 16.8                    | 19.7                 | 22.3                | 16.9                      | 19.1                         | 17.4                       |
| Gold income a seat-game, same order        | 28 / 9 / 84 / 14        | 33 / 15 / 139 / 21   | 74 / 43 / 160 / 56  | 25 / 10 / 100 / 12        | 29 / 14 / 142 / 21           | 22 / 13 / 136 / 25         |
| Influence median, year 10 → 14 (a year)    | 4 → 14 (2.5)            | 11 → 32 (5.3)        | 28 → 74 (11.5)      | 5 → 10 (1.3)              | 9 → 36 (6.8)                 | 8 → 23 (3.8)               |
| Treasurer held at the end                  | 22                      | 39                   | 38                  | 12                        | 38                           | 40                         |
| Beloved: turns held; sole luxury leader    | 67; 52%                 | 297; 52%             | 876; 70%            | 28; 75%                   | 396; 67%                     | 512; 73%                   |

**Income.** Base food feeds the trader's freemen, so they make gold and citizens, and citizens
make influence:
- each step of base food raises gold income, end pops, influence and Beloved's turns;
- it cuts hunger.
- At 1 the table has little hunger (the trader loses 1.1 pops a game), but the trader wins 16
  to 26 of 40.
- At 0 the builds even out (10 to 13 wins each, the master 7), and the trader loses 5.2 pops a
  game.

**Trade.**
- Food moves, 7 to 11 units a game, most of it the slaver's: 150 to 220 units over 40 games.
- Paying 2 gold a food instead of 1 did not buy more food:
  - the trader received 140 units against 179;
  - it lost as many pops (1.2);
  - it won 25.
- A bot asks one rival for its whole shortfall, and rivals rarely hold it.

**Barter value.**
- To a bot, 2 food grow a slave worth about 12 points, against about 2.5 for 2 gold. Food is
  never stocked to sell.
- A slave at 3 food keeps the trader fed (0.25 pops lost), but the slaver pays for it: 2 wins.
- Gold buying food at 2 with no base food halves the trader's hunger loss of 5.2. It keeps the
  builds even (10 / 11 / 12 / 7) and holds influence to 1.3 a year.

## 4. Gold

The mixed table, base food 1.

|                                            | Control            | Treasurer 100      | Treasurer 60 | Gold buys materials at 2 | Port 8 gold        | Treasurer 100, 3 slaves an unhappiness |
| ------------------------------------------ | ------------------ | ------------------ | ------------ | ------------------------ | ------------------ | -------------------------------------- |
| Wins, slaver / civic / trader / master     | 7 / 6 / 16 / 11    | 6 / 7 / 14 / 13    | 6 / 7 / 14 / 13 | 4 / 6 / 25 / 5           | 7 / 3 / 24 / 6     | 6 / 6 / 16 / 12                        |
| Treasurer held at the end; winners holding | 39; 16             | 17; 6              | 31; 11       | 28; 21                   | 40; 24             | 10; 6                                  |
| The trader's end gold, median              | 75                 | 90                 | 85           | 32.5                     | 82                 | 74                                     |
| Gold income a seat-game, same order        | 33 / 15 / 139 / 21 | 36 / 17 / 151 / 24 | 35 / 17 / 145 / 23 | 32 / 19 / 184 / 30       | 25 / 14 / 141 / 17 | 15 / 15 / 137 / 25                     |
| Material bought with gold a game (trader)  | –                  | –                  | –            | 40.5 (33.4)              | –                  | –                                      |
| Ports a game                               | 4.5                | 4.6                | 4.6          | 4.0                      | 2.8                | 4.4                                    |
| Beloved: turns held; sole luxury leader    | 297; 52%           | 283; 53%           | 273; 53%     | 529; 76%                 | 195; 73%           | 669; 77%                               |
| Riot turns from year 8 (slaver)            | 8% (25%)           | 7% (23%)           | 7% (23%)     | 8% (26%)                 | 10% (29%)          | 4% (14%)                               |
| Influence a year, years 10 to 14           | 5.3                | 5.8                | 6.8          | 4.5                      | 4.5                | 3.3                                    |

- **Gold is the trader's.**
  - The trader makes 137 to 184 gold a game; the other builds 15 to 36.
  - It funds a venture on about two turns in three (8.4 to 9.1 a seat-game) and still ends
    with 75 to 90.
- **Treasurer is a title the trader collects, not what makes it win.**
  - At 60 and 100 the games mostly play out as in the control: 34 and 33 of 40 end with the
    same winner.
  - Treasurer is held in 31 and 17 games instead of 39, and the winners holding it fall from
    16 to 11 and 6.
  - The trader still wins 14, two fewer, mostly the same games. At 100 its race wins fall
    from 7 to 2, and its wins on the happiness tiebreak and on title count rise from 4 to 6
    each.
  - Over the five base-food-1 batches, its 116 wins came by title count in 48, the happiness
    tiebreak in 31, the race in 29 and the pops tiebreak in 8.
- **A bulk sink feeds the gold build.** With gold buying materials at 2:
  - the trader spent about 67 gold a game;
  - it ended with 33;
  - it cut its slaves to 14% of its pops;
  - it held Beloved on 529 turns;
  - it won 25.
- **The development deck as planned:**
  - One 2-gold card a turn, worth about +1 of something.
  - It is a smaller sink of the same kind. The trader has at most four or five turns a game
    left without a venture, so the deck can absorb about 10 gold a game.
- **A Port at 8 gold** cuts Port building from 4.5 to 2.8 a game, but the trader still wins 24.
- **Treasurer at 100 with one unhappiness per 3 slaves** (9 of 40 games keep the control's
  winner):
  - The trader stays at 16.
  - The master wins 12.
  - Late riots fall to 4% (the slaver's to 14%).
  - The slaver and civic still win only 6 each, and Beloved follows luxuries in 77% of turns.

## 5. Influence

Four masters, shuffled board.

|                                         | Control       | Draws 4, repeals 6 | National Ideas on |
| --------------------------------------- | ------------- | ------------------ | ----------------- |
| Influence median, year 10 → 14 (a year) | 41 → 78 (9.3) | 36 → 65 (7.3)      | 42 → 85 (10.8)    |
| Spent a game: Dole; draws and repeals; Ideas | 69; 53; 0 | 64; 98; 0         | 78; 53; 23        |
| Pops a seat at year 14                  | 16.4          | 16.4               | 18.4              |

- **The bots pay the dearer Assembly prices:** draws and repeals take 98 influence a game
  instead of 53. Growth still runs 7.3 a year, over the rule's 5.
- **The second Idea purchase in the same patch did nothing,** since this table plays without
  Ideas.
- **Ideas add a 23-influence sink and more income;** growth rises to 10.8.
- **On the mixed table influence follows base food:** 2.5, 5.3 and 11.5 a year at 0, 1 and 2.

## 6. The balance check, read on the shuffled board

Thresholds are proposals until the owner sets them (Q80).

| Rule                                                       | Masters control | Mixed control    | Mixed, BF 0      | Mixed, BF 0 + gold buys food | Mixed, Treasurer 100 |
| ---------------------------------------------------------- | --------------- | ---------------- | ---------------- | ---------------------------- | -------------------- |
| Riots: riot table reached on ≤10% of turns after year 7    | 3% ✓            | 8% ✓             | 11% ✗            | 11% ✗                        | 7% ✓                 |
| Influence: median stock grows ≤5 a year, years 10–14       | 9.3 ✗           | 5.3 ✗            | 2.5 ✓            | 1.3 ✓                        | 5.8 ✗                |
| Builds: each personality wins 20–45%                       | –               | 15–40% ✗         | 17.5–32.5% ✗     | 17.5–30% ✗                   | 15–35% ✗             |
| Leader: year-5 income leader wins ≤40%                     | 48% ✗           | 18% ✓            | 34% ✓            | 26% ✓                        | 15% ✓                |
| Leader: year-10 stock ≤2.5× the laggard's                  | 6 of 38 games   | 0 of 36          | 0 of 40          | 0 of 39                      | 0 of 37              |
| Beloved: holder the luxury leader in ≤60% of turns held    | 68% ✗           | 52% ✓            | 52% ✓            | 75% ✗                        | 53% ✓                |

- **The stock half of the leader rule fails everywhere.** At year 10 the median leader holds
  113 against the laggard's 13.5 on the mixed table (the trader's gold), and 36.5 against 10
  among masters. As worded it reads who saves, not who runs away.
- **The master is the build below 20% in the two no-base-food batches** (7 of 40), by one or two
  wins.

## What it implies

1. **Run the balance check on the shuffled board.** The classic board's fixed starts made seat
   1's slump, half the trader's hunger and the Beloved–luxury link. The CLI still defaults to
   classic.
2. **Base food is the decision.**
   - At 1 a settlement it overshoots: the trader wins 40% to 65%, and influence and Beloved pile
     up.
   - At 0 the builds even out, but the trader starves.
   - A middle dose cannot be patched: base food for cities only, for the capital only, or every
     other year. Each needs a small engine change. Best tested on the shuffled mixed table with
     this report's figures.
3. **Food's barter value is set by what food grows, not by its price.**
   - As long as 2 food make a pop, no bot keeps food to sell.
   - A rule that lets food wait (a store that pays, or a costlier pop) would make the food
     market; a price will not.
   - Gold buying food was the one food-trade arm that kept the builds even.
4. **Neither Treasurer's minimum nor a gold sink holds the trader back.**
   - Raising the minimum costs it about two wins in forty; it wins on the happiness tiebreak,
     Beloved and its other titles instead.
   - A sink that turns gold into materials made it stronger.
   - The development deck should be judged as a source of economy for the gold build, not as
     a drain on it.
5. **Seat 0's first capital pick is worth about 17 wins in 40 among equal bots.** The setup
   order is the owner's call; the board stays unfair by ruling.
6. **Influence on the masters table needs more than Assembly prices.** It follows food and
   citizens. A base-food change will move it more than any sink tried here.

## Next

- Owner decisions:
  - make shuffled the batch default;
  - pick a base-food direction to build: per city, capital only, or none plus a food purchase;
  - whether standing happiness should break deck-end ties (31 of the trader's 116 wins);
  - Q80, how to run the balance check, now with readings for every rule.
- Then one confirming batch of the chosen package on both tables at the balance check's game
  count.
