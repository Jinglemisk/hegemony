---
status: proposed
phase: "post-v2"
updated: 2026-10-24
---

# Recurring trade deals

## Outcome

Two players can agree a standing deal: a fixed exchange that repeats every year, with no end
date, until either side cancels it. Each player sees the deals they hold on the alarms row, and
each deal reads as one line: what leaves, what arrives, and with whom. A seat with good farmland
can grow food to sell every year without haggling each turn, and a seat that grows none can
count on being fed.

## Why

- **Nobody grows food for others today.** In the
  [2026-10-24 balance batches](../reports/simulation/2026-10-24-balance-lines.md):
  - no bot ever stocks food to sell;
  - a bot asks one rival for its whole shortfall, and rivals rarely hold it.
- **The trader starves with gold in hand.** With base income at 0 (owner, 2026-10-24), the
  trader bot lost 5.2 pops a game to hunger, and 428 turns began short of food against 132.
- **A deal that repeats makes food a crop someone grows to sell**, and gives food a price
  players set.

## Non-goals

- Loans, credit, or deals about later turns other than the fixed yearly exchange.
  - This lifts the trade plan's non-goal "promises, loans or deals about later turns" for this
    one shape only.
- A duration or end date (owner: no duration).
- Deals with the bank.
- **Proposed, for the owner to confirm:** pops and luxury goods stay out of standing deals.
  - Pops travel and need room.
  - A good is owned once, not yielded each year.

## Settled inputs

- **Owner, 2026-10-24:**
  - A deal has no duration. It stands until cancelled.
  - Deals show as radial icon notifications: the viewer has deals with these players, and each
    deal reads as a line, in the owner's words "-3 food from Zakynthos -> +1 stone from X".
    - Stocks belong to the realm, not to a settlement, so the line names the partner seat.
    - For example: "−3 food to Theron · +1 stone from Theron", in the tooltip grammar of names
      and icons.
  - **The owner's draft timing:**
    - A deal settles in the turn of whichever of its two seats plays first that year.
    - If seats 1 and 3 hold a deal, it runs automatically in seat 1's turn, and by seat 3's turn
      it has already happened.
    - The owner doubts this is fair. **The builder proposes alternatives before building**; see
      Timing below.
- **From the [trade plan](player-trade.md):**
  - D2: what can trade.
  - D5: everyone sees every offer.
  - D6: each side gives something.
  - D11: only the named seats answer.
  - D12: offers are discs on the alarms row with a compact card.
  - D14: no hotseat clock.
- **Turn order.** The seat that opens the year moves on one place each year. So for any pair of
  seats, which plays first changes over a game. For seats 1 and 3, seat 1 plays first in two
  years out of four and seat 3 in the other two.

## What exists today

**The offer model and its timing**

- An offer holds who made it, its recipients or the table, the terms (what each side gives),
  the settlements named for traded pops, and the answers so far.
- Commands: offer, answer (accept, decline or counter), take a counter, and withdraw.
- **Who can offer.** On a normal turn, only the seat whose turn it is. In the Assembly's
  preparation, any seat not yet Ready.
- **Who answers.** Recipients answer outside their own turn.
- **Closing.** Offers close at the offering seat's turn end.
- **Accepting.** An accept settles at once and atomically: it rechecks both sides' holdings,
  then moves everything.

**What can trade, and the rules on it**

- Wood, stone, food, gold, influence, claimed luxury goods and pops.
- Each side gives at least one thing.
- No side may give more than it holds. Food below zero counts as none.

**The turn**

- **At its start:** arriving pops land, the victory check runs, the luxury countdown ticks,
  income is collected and an event is drawn.
- **At its end:** offers close, then hunger is settled, then unrest.
- **Automatic steps** must happen inside the engine's single command transition and be derived
  from the state. Otherwise a replayed game drifts from the original.

**The UI**

- Every open offer is a disc on the alarms row:
  - a ring in the offering seat's colour, split into one segment per recipient, each filling
    as that seat answers;
  - a handshake in the centre and the offering seat's blazon in the corner.
- A click opens the offer card.
- A settled trade shows a toast to every seat.

**Bots**

- **Answering.** A bot accepts when the deal raises its own score by about one food's worth,
  and no title passes to the seat offering it.
- **Offering.** At most one offer a turn, for the bot's current shortfall.
- **Values.**
  - A food is worth about 0.5 points and a gold about 1.25.
  - A slave is worth about 12, and growing one costs 2 food.
- **Food stock.** Food is never held ahead of need: "Food is bought as it is needed."

## The design to build

- **Making one.**
  - The offer card gains an "every year" switch.
  - Accepting a recurring offer creates a standing deal between the two seats. An offer to the
    table forms the deal with the first seat that accepts.
  - **Proposed:** the first exchange settles at once, like a trade, and the deal then repeats
    from next year.
- **On the state.** Each standing deal has an id, its two seats, what each side gives, the year
  it was agreed, and the year it last settled.
- **Settling.** Once a year, at the timing the owner picks. It is atomic like an accepted trade,
  logged as a trade, and shown as a toast to both seats.
- **When a side cannot pay.** The builder proposes; the owner picks. Options:
  - neither side pays that year and both are told;
  - the deal lapses after a missed year;
  - the deal lapses after two missed years.
- **Cancelling.** Either side, on its own turn, without the other's consent, taking effect
  before the next settlement.
  - **Proposed:** no penalty.
  - The builder says whether cancelling is also open in the Assembly's preparation.
- **Limits.** None by rule, as with offers (D3), unless the UI needs one.
- **Visibility.** Public, as offers are (D5): every seat sees who has deals with whom. The
  builder confirms this with the owner.
- **Notifications.**
  - One disc on the alarms row per partner the viewer holds deals with: the partner's colour
    ring, the handshake, and a mark that says "every year".
  - The tooltip lists each deal as one line.
  - A click opens the deal card, which has Cancel.
  - A toast when a deal settles, misses a payment or is cancelled.

## Timing: the builder proposes

The owner's draft settles a deal in the turn of whichever of its two seats plays first that
year. The builder must weigh at least these points:

- **Which stock pays.** If the deal runs during seat 1's turn after its income, seat 1 pays out
  of fresh income. Seat 3 pays out of what it kept since its last turn.
- **No chance to react.** A seat must hold its side when the deal runs. The later seat cannot
  react in between.
- **The rotating opener.** The seat that plays first in a pair changes over the years. Does
  that even out over a game, or only in long games?
- **Hunger.** Hunger is settled at each seat's own turn end. Food leaving a seat during another
  seat's turn changes who goes hungry, and when.
- **Assembly years.** Whether a deal runs before or after the sitting.
- **Replay.** Settlement is derived from the state inside the command transition, so replays
  stay exact.

**Deliverable.** Two or three options, each with a worked example: seats 1 and 3, food for
stone, over four years. The builder files them as an owner question in
[questions.md](../questions.md) and waits for the pick before building the settlement.

## Bots

Without bots that make and keep deals, the sim cannot measure the feature, and the food problem
stays. The bots need to do two things:

- **Use deals.** Offer, answer and cancel standing deals, valuing a deal over the years left in
  the game. The forecast already projects income over a horizon.
- **Grow food to sell.** A bot with plains and spare slaves can grow food for sale under a
  standing deal. The food it commits counts as income sold, not stock parked.
  - This changes how bots value food, which makes it bot tuning, and bot tuning needs the
    owner's OK.
  - This plan asks for that OK.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                                                                                                                                             |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | Yes      | Standing deals on the match state; the recurring flag on an offer and a cancel command, with derived legal options; the yearly settlement inside the transition, with the missed-payment rule; log moments; invariants; state and command schema bumps; tests |
| Frontend         | Yes      | The "every year" switch on the offer card; partner discs on the alarms row; the deal card with Cancel; toasts; Chronicle line; rulebook chapter and `rules.md`; browser test                                                                                  |
| Simulation & AI  | Yes      | Command parity entries; bots offer, answer and cancel standing deals on their own projection; telemetry for deals made, settled, missed and cancelled, and goods moved by deals; use and avoid fixtures; batches                                              |

## Architecture impact

- **Per-match setting.** A ruleset switch, as `trade.enabled` is for offers, so batches can play
  the game with and without deals.
- **Commands.** The recurring flag rides on the existing offer command. Cancel is new.
- **Who may act.** The settlement acts for both seats and is never a command, so it needs no
  actor rule. Only cancel needs one.
- **Projections.** Deals are public. No private state.
- **Ids and replay.** Ids come from the state's id counter. The settlement is derived from the
  state, so recorded commands replay it.

## PR slices

1. **Engine and UI** (after the owner picks the timing). Standing deals between human seats in
   hotseat: make, settle, miss and cancel.
2. **Bots, telemetry and batches**, with base income at 0. Compare with the 2026-10-24
   no-base-food arm: the trader's 5.2 pops lost a game, and 428 turns begun short.
3. **The Dole** (owner, 2026-10-24: remove it to push trade).
   - Measured on the 2026-10-24 no-base-food arm. The Dole turns 3 influence into 1 food.
     Masters bought 13 a game and civics 9.3; the trader bought 2.5.
   - Removing it would starve masters and civics before the trader. It would also remove an
     influence drain of about 30 to 40 a game per seat, against the influence plateau rule. The
     Public Dole Idea would lose its subject.
   - So the question waits until standing deals give a seat somewhere else to buy food. Then a
     batch tries the Dole at a higher price, and without it.

## Acceptance and validation

- Two human seats make, run, miss and cancel a deal in hotseat. A replay reproduces it.
- Batches with and without deals compare:
  - hunger;
  - food traded;
  - wins by personality;
  - influence growth.

## Retirement

After validation, fold the shipped rules into the trade chapter of `rules.md` and the rulebook.
Then move this plan to `docs/archive/plans/` with its PRs and the batch report.
