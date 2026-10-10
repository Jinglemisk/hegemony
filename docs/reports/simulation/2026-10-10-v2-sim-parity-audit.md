# v2 sim parity audit

Date: 2026-10-10. Code: `feat/v2` at `52ed7af` (Steps 1 to 10, 13, 14 and 17).

## Question

Step 11 judges the v2 rules by bot games. Before it runs, the owner asked for the simulator
(the bots and the batch report) to be checked against everything merged into v2, because
rules were added after the bots were last looked at. The 2026-10-04
[reach audit](2026-10-04-v2-ai-reach-audit.md) counted how often bots use each action. It
did not check whether the bots value each rule as it is written, it predates the open Idea
draft (#95) and hunger at turn end (#99), and nobody had checked that the report can
produce the numbers Step 11's eight rules ask for.

## Method

Four read-only auditors, one per area, each matched against the PRs that built it. Three
asked the same questions of every rule and content item: can a bot do everything the engine
allows, does it value the rule as written today, and does the batch report count it. The
fourth checked the report against Step 11's rules. Evidence is code reading, the Step 17
batch (40 games, seeds 1000 to 1009 × 4 rotations; summary in
[step17-batch.txt](2026-10-10-v2-sim-parity-audit/step17-batch.txt)), and single-turn probe
scripts that were not kept. No batch was run for the audit.

| Area                                         | PRs                          | Bug | Gap | Stale | OK  | Findings                                                                         |
| -------------------------------------------- | ---------------------------- | --- | --- | ----- | --- | -------------------------------------------------------------------------------- |
| Economy and unrest                           | #82, #83, #84, #92, #99      | 2   | 15  | 6     | 15  | [detail](2026-10-10-v2-sim-parity-audit/economy-unrest.md)                       |
| Cards, ventures and the Assembly             | #85, #86, #87, #93, luxuries | 7   | 23  | 5     | 15  | [detail](2026-10-10-v2-sim-parity-audit/cards-assembly.md)                       |
| Ideas, setup, victory and the personalities  | #88, #89, #90, #91, #95      | 3   | 20  | 6     | 23  | [detail](2026-10-10-v2-sim-parity-audit/ideas-setup-personalities.md)            |
| Measurement                                  | Step 11's rules              | 1   | 30  | 8     | 17  | [detail](2026-10-10-v2-sim-parity-audit/measurement.md)                          |

Some rows repeat across areas (the food reserve, the luxury weight, the Beloved rule). A
bug means the sim contradicts the engine. A gap means the rule is fine and the bot cannot do
it, does not model it, or the report cannot see it.

## Answer

Step 11 as it stood would mostly have measured the bots. Two results that looked like
balance findings are largely the bots' doing:

- **The trader's 15%.** The bot demotes its only citizen in 39 of 40 games, so it has no
  influence, no second Idea and one vote. Its drafted Idea, City Pioneers, does nothing in
  28 of 32 games. It buys food a year ahead and so holds gold under Treasurer's minimum.
  On titles alone it won 1 game in 40; 5 of its 6 wins were tiebreaks.
- **Games ending by the deck.** A third title scores the same as the first and no plan
  spans turns. Two titles are reached in 36 of 40 games, three in 6.

## Findings

### Bugs in the bots

| Bug                                                                              | What it distorts                                                                   |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Assembly ballot value counts the seat's own gain twice (from #93)                | Repeals filed went from 58 to 125; votes are bought at half the intended margin    |
| The food reserve still assumes hunger at income                                  | Gold and influence sit parked in food, under Treasurer's minimum                   |
| Pops in transit are scored as gone for good                                      | Bots will not move idle slaves to open slots; 15 to 23% of slaves sit idle         |
| Public Dole's holder is rewarded for a food deficit                              | Civic and master, who hold it most                                                 |
| City Pioneers counts upgrades the engine forbids beside a city                   | The trader's setup Idea does nothing in 28 of 32 games                             |
| The luxury weight is still sized against v1's Port price                         | Bots raise a Port wherever one is legal, which feeds the Beloved rule              |
| Land Reform, Manumission and Master Builders each read a base number             | Small                                                                              |
| The 30-action limit also counts the hunger pick and riot that follow End turn    | Small                                                                              |
| Draw swings read zero for pop and token cards, 27% of draws                      | Rule 7's spread is understated                                                     |

### Things the bots cannot see

| Gap                                                                                  | Size                             |
| ------------------------------------------------------------------------------------ | -------------------------------- |
| The projection never buys food, so every projected shortfall starves a pop           | Medium                           |
| A riot costs a flat 50, about four times what the riot table takes for three of four | Medium                           |
| The trader sheds its citizen; a vote has no value outside a sitting                  | Small and medium                 |
| The setup colony lands beside a city in 76 of 160 cases and can never be upgraded    | Small                            |
| The draft is a fixed ranking per personality: five Ideas take 158 of 160 picks       | Medium                           |
| Rival harm in the Assembly is priced with the bot's own planning penalties           | Medium                           |
| Ten of sixteen Laws are scored with their price or rule change worth zero            | Medium (rough) or large (proper) |
| No extra value for a third title or for winning                                      | Large                            |

### What the report cannot answer

- Rule 5 (Beloved against the luxury leader): no per-turn record of either.
- Rule 3 (win rates): tiebreak wins are not recorded; 17 of 37 deck games were tiebreaks.
- Rule 2 (influence): no influence per year. Hunger, riots and Assembly figures are per
  seat, which mixes personalities under rotation.
- Rule 4 (runaway leader): worded in v1 rounds, with "stock" undefined.
- Sample size: at 60 games a measured 20% spans 12% to 32%. Separating the trader's 15% from
  the 20% floor needs about 470 games, 3.3 hours on one core. There is no parallel run and
  no way to merge reports.
- The v1 baseline's tables cannot be regenerated: the scripts that made them are gone, and
  v1 has no personalities and no class, draw or riot-by-year telemetry.

## Owner rulings, 2026-10-10

- **Pops on the move count.** A slave in transit was off the happiness count, so moving one
  slave for 1 food dodged the riot check every turn. The rules say "every two slaves in your
  realm". Pops in transit now count.
- **No stock goes below zero** except food during its owner's turn. Only food had a floor,
  so Civic Pride's 1 gold a city took gold below zero: 22 of 160 seats ended a game with
  negative gold, the lowest at −6.

Still open, as Q80 in [questions](../../questions.md): the runaway-leader rule's wording,
how many games Step 11 runs, and whether the v1 comparison stays.

## What follows

- **Step 18** fixes the bugs, applies the two rulings and adds the missing report fields.
- **Step 19** closes the medium gaps: the projection buys food, riots are priced from the
  table, a vote has value, the draft follows the personality, Laws get a rough value, and
  batches run in parallel.
- Left for later: planning toward a third title, a proper value per Law, and the v1
  baseline.

## Confidence

The lead confirmed five bugs in the code: the Assembly double count, the food reserve,
Public Dole, City Pioneers and pops in transit. It also recounted the negative gold from
the batch. Other counts are the auditors' readings of the Step 17 batch and of one-game
probes. Rows the auditors could not confirm are marked "unverified" in the detail files.

To regenerate the batch at `52ed7af`:
`npm run sim -- batch --games 10 --turns 56 --seats slaver,civic,trader,master --rotate --seed 1000`.
