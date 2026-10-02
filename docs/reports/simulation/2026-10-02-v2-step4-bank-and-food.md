# v2 Step 4: does the bank still slide, and is hunger the rules or the bots?

Two questions, asked of the game as it stands after migration Step 4 (six buildings, one
price per verb, the piece supply, the paid move, the Dole). The first is the evidence for
Q77, the happiness model. The second checks the work-slot ruling's food risk.

## Setup

Every batch: 40 games, `smart` in all four seats, seeds 1000 to 1039, classic board,
280-turn cap (never reached). One round is one season: four player-turns.

| Arm                | Code                                                                    |
| ------------------ | ----------------------------------------------------------------------- |
| v1                 | `932e2a0`, the game before Step 3                                       |
| Step 3             | `005edc9`, work slots and hunger at v1's prices                         |
| Step 4             | this step as shipped ([report](2026-10-02-v2-step4-smart.json))         |
| Step 4, no stores  | Step 4 with the food-stockpile bonus off (`foodStockpileHappinessCap` 0) |
| Step 4, calm banked | Step 4 with calm added to the bank as v1 did, at Step 4's price          |
| Step 4, food rule  | Step 4 with bots buying food when the next income would starve a mouth  |

The last two arms are experiments run from a scratch checkout. Neither is in the repo. The
v1 and Step 3 arms were rerun with the riot counter this step adds to the batch report;
both reproduce the riot and hunger figures in Step 3's notes.

```bash
npm run sim -- batch --games 40 --turns 280 --policy smart --seed 1000 \
  --report docs/reports/simulation/2026-10-02-v2-step4-smart.json
```

## 1. The bank

Calm is the whole answer. Step 4 makes calm a bonus that lasts until the buyer's next turn
and is never banked, which is what the paper's fallback bank specifies. With that, the
riot table opens three times as often as in Step 3 and about half again as often as in
v1. Put calm back in the bank and riots fall to Step 3's level.

| Arm                 | Riots per game | Riot table, share of player-turns | Rounds 1–7 | Rounds 8–14 | Rounds 15+ |
| ------------------- | -------------: | --------------------------------: | ---------: | ----------: | ---------: |
| v1                  |           11.2 |                             10.0% |       0.2% |        3.7% |      17.5% |
| Step 3              |            6.0 |                              5.1% |       0.1% |        0.9% |       9.0% |
| Step 4              |           18.4 |                             15.0% |       3.1% |       14.8% |      19.7% |
| Step 4, no stores   |           22.9 |                             19.0% |       9.4% |       19.1% |      22.9% |
| Step 4, calm banked |            5.5 |                              4.7% |       0.2% |        1.0% |       8.3% |

"Riots per game" counts all four seats. v2's year is one round, so rounds 8 to 14 are
the second half of a fourteen-year game, the stretch Step 11's rule reads. Its proposed
limit is 10% of turns.

- **The paper's fallback bank fails that limit.** Step 4 with no stores is the closest
  arm to it (the clamp to ±10 is the one part not built): 19% in rounds 8 to 14.
- **The slide is the slave term.** Temples add 1 a turn and every two slaves take 1 a
  turn, both into the bank, so a realm with more than two slaves per Temple loses ground
  every turn and one bought calm does not hold it. Median stored happiness is −2 from
  round 8 on and −6 by round 32.
- **Banked calm passes, by being bought nearly every turn.** Bots buy calm 81 times a
  game in that arm against 27 as shipped: at 2 gold it is a standing tax that cancels four
  slaves a turn. It stops the riots without making happiness something a player reads off
  the board.
- **Step 3's calm was not the missing food debt alone.** Removing the debt halved v1's
  riots, but Step 3 still had v1's calm (+3, banked) and the Odeon's +2 a turn. Step 4
  took both away.

## 2. Food under work slots

| Arm               | Hunger turns per seat-game | Pops lost per seat-game | Idle slaves, share |
| ----------------- | -------------------------: | ----------------------: | -----------------: |
| Step 3            |                 3.4 to 3.9 |              5.2 to 6.9 |         22% to 41% |
| Step 4            |                 3.4 to 4.6 |              6.2 to 7.9 |         16% to 31% |
| Step 4, food rule |                 3.5 to 4.5 |              5.8 to 7.8 |         10% to 26% |

Per seat in Step 4:

| Seat | Hunger turns per game | Pops lost per game | Idle slaves, mean | Idle share |
| ---- | --------------------: | -----------------: | ----------------: | ---------: |
| P0   |                   3.8 |                7.2 |               0.7 |        16% |
| P1   |                   3.4 |                6.2 |               0.8 |        19% |
| P2   |                   4.6 |                7.9 |               1.0 |        22% |
| P3   |                   4.2 |                7.4 |               1.5 |        31% |

**Hunger here is a bot problem, with v1's cards making it worse. It is not the slots.**
A scratch hook replayed the same 40 games and recorded each seat's position at the end of
the turn before each of its 642 hunger events:

- In 97% of them the seat could have covered the shortfall: 66% held the gold to buy the
  missing food, 60% held the influence for the Dole, and 49% had a plains slot nobody
  worked and room for a slave. Seats held 42 gold on average when they starved.
- Only 8% were visible a turn ahead. In the rest, stored food plus food income was at or
  above zero when the seat ended its turn, and something took the margin before the next
  income. The hook did not record what. The candidates are the food cards and the omen,
  which still take 2 or 3 food at v1's scale against a v2 food income that averages +0.2,
  and the riot table's sacked granary and bread-dole insurance.
- Bots keep nothing in reserve. They spend the granary down on growth, so any loss
  starves someone. That is why the food rule changes nothing: there is no shortfall to
  see until the loss lands.
- Slots are not binding. A seat works 1.8 plains slaves on average and has 3.9 open
  plains slots; 7% of seat-turns hold no plains at all.

So the rules give three ways out of hunger and the bots take none of them in time. The
check on the slot table itself is still owed: it needs a bot that keeps a food reserve,
which is Step 10's work, and cards at v2's scale, which is Step 7's.

## 3. How games end

| Arm                 | Victory race | Deck ran out | Mean last round | Race wins, mean last round |
| ------------------- | -----------: | -----------: | --------------: | -------------------------: |
| v1                  |           18 |           22 |            28.4 |                       22.8 |
| Step 3              |           17 |           23 |            30.1 |                       26.3 |
| Step 4              |           10 |           30 |            31.1 |                       25.6 |
| Step 4, calm banked |           17 |           23 |            29.8 |                       25.4 |

No game hit the turn cap and no bot was force-ended in any Step 4 arm. Fewer games end by
the race in Step 4 because Beloved of the People is out of reach while the bank slides;
the minimums are still v1's (16 pops, 8 citizens, 80 stockpile, +10 happiness) and Step 6
replaces them.

## 4. Seats rotated, two policies

A uniform table has nothing to rotate, so a second batch seats `smart` and `master` two
each and runs seeds 1000 to 1009 through all four rotations (40 games). It agrees with
the uniform batch:

| Measure                                       | Value                          |
| --------------------------------------------- | ------------------------------ |
| Riots per game                                | 22.5                           |
| Riot table, share of player-turns             | 18.2%                          |
| Rounds 1–7 / 8–14 / 15+                       | 4.3% / 13.8% / 25.5%           |
| Hunger turns per seat-game, by seat           | 4.7 / 4.0 / 4.0 / 5.5          |
| Pops lost to hunger per seat-game, by seat    | 7.7 / 6.5 / 7.2 / 9.1          |
| Idle slaves, share, by seat                   | 17% / 14% / 22% / 30%          |
| Ended by the race / deck ran out              | 6 / 34                         |
| Wins per seat-game: `smart` / `master`        | 22.5% / 27.5%                  |

`master` searches deeper on the same score, and it starves and riots as much as `smart`.
The fourth seat holds the most idle slaves in every arm.

## Caveats

- One policy. `smart` does not hold a food reserve, does not plan calm more than one
  upkeep ahead, and built no Forum in any arm.
- The event decks, the riot table, venture stakes, Laws and victory minimums are still at
  v1's scale. Each is owned by a later step.
- The clamp of the bank to ±10 is not built, so "the paper's fallback" above is the
  nearest arm, not the thing itself.
