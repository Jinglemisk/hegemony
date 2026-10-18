# v2 AI reach audit (Step 11, phase 1)

Date: 2026-10-04. Branch `v2/step-11a-reach-audit`, from `feat/v2` at `efc1614`
(Steps 1 to 10, the Idea picker fix #91 and riots at turn end #92).

## Question

Step 11 judges the v2 rules by bot games. That only works if the bots can play the
whole game. The parity tests prove every action and effect has a bot route; they do
not prove a bot ever takes it. This audit counts what the bots actually use and, for
each item they barely use, sets up a position where it is clearly the best move.

A low count then means one of three things:

- **Bot bug**: the bot passes even when the move is clearly best. Fixed here.
- **Weak**: the bot takes it when it is clearly best, and rarely is. A balance
  finding for Step 11; no rule changed here.
- **Rule hole**: the move does nothing. Reported; no rule changed here.

## Method

`npm run sim -- batch --games 10 --turns 56 --seats slaver,civic,trader,master --rotate --seed 1000`:
40 games, each personality in every seat. The batch report gained a zero-filled
`reach` table (every command, building, card, venture, Law, Directive, Idea, calm
payment, bank trade, ladder rung, bought vote, riot insurance and politician draw,
per personality), class percentiles and per-draw swings. The summary lists every
item under 0.2 a game. The fixtures are in `src/sim/reach.test.ts`.

## Findings

| Item | Before (40 games) | After | Verdict | Evidence |
| --- | --- | --- | --- | --- |
| Directives (all six) | 10 passed; Stratokles drawn 10 of 441 times | 178 passed; drawn 191 of 468 | **Bot bug, fixed** | A Directive scored only its 2-gold prize. The Assembly value was "my gain minus the best rival's gain"; the target's loss never showed, because an untouched rival's zero was always the best rival gain. Fixture: every personality now draws Stratokles to break a rival's winning Voice, and two of three passed without the fix |
| Urban Planning | never taken | never taken | Weak | Every personality buys it when the extra city slot feeds a hungry realm |
| Harbour Planning | never taken | never taken | Weak | Every personality buys it when the Port's freed slot feeds a hungry realm |
| Capital Works | never taken | never taken | Weak (dominated) | Urban Planning does the same for the capital and every later city at the same price |
| Treasury Grant | never taken | never taken | Weak | Existing fixture: bought when 4 gold takes Treasurer. A one-off 4 gold against +2 influence a year from Civic Tradition |
| Good Harvest, New Settlers, Slave Colonies | bought, never a setup pick | same | Weak at setup | Good Harvest: every personality buys it to cover a shortfall |
| Public Dole | setup only | setup only | Fine | Used |
| Assembly Brokers, Frontier Charter | 1 and 3 bought | 1 and 2 | Weak | Existing fixture for Brokers; Charter bought by the slaver and civic |
| Merchant Convoy | 1 | 2 | Weak | Existing fixture near a gold title. It returns 2/3 gold of expected value on a 2-gold stake; the Voyage returns about 3 food and a 1-in-6 freeman |
| Calm with food | never | never | Not a move | Festival Calendar makes the gold calm cost food; it has no separate payment. Every personality pays it to stop a riot (fixture). The reach ID was dropped |
| Riot concession | never | never | Excluded by the bots' riot rule | The forced-riot rule buys every affordable insurance except the concession. It is worth about a sixth of a pop and a sixth of a building per riot, and riots run 1.4 to 1.6 a game, so the rule was left as it is |
| `placeCity` | never | never | Not in this mode | Standard setup places a capital and a colony |
| Manumission | proposed 14, passed 0 | passed 3 | Contested | Proposed; rivals vote it down |

No item was a rule hole.

## Effect of the fix

| | Before | After |
| --- | --- | --- |
| Wins: slaver / civic / trader / master | 43% / 23% / 18% / 18% | 33% / 33% / 18% / 18% |
| Endings: race / year 14 | 8 / 32 | 4 / 36 |
| Directives passed a game | 0.3 | 4.5 |
| Laws enacted a game / standing at the end | 6.3 / 3.7 | 4.8 / 2.7 |
| Voice held at game end | 73% | 68% |
| Repeals proposed (total) | 58 | 144 |
| Riots / revolts a game | 1.4 / 0.5 | 1.6 / 1.0 |

The win split differs from Step 10's (33% / 35% / 13% / 20%) before the fix as well:
#92 moved the riot check to turn end in between.

## For Step 11

- Trader wins 18% in both batches, under the proposed 20% floor.
- Bots now attack the leader through Stratokles: 41% of all draws, and the Assembly
  removes or repeals more Laws. Whether 4.5 Directives a game is too many is a
  balance question for Step 11.
- Four Ideas are weak, not unseen: Urban Planning, Harbour Planning, Capital Works
  (dominated by Urban Planning) and Treasury Grant.
- The Merchant Convoy loses money on average.
- Each batch takes 16 to 18 minutes on one core.
