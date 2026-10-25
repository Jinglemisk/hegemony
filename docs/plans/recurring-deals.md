---
status: proposed
phase: "post-v2"
updated: 2026-10-25
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
  years out of four and seat 3 in the other two. Between neighbours the split is three to one,
  all game (see the builder's proposal).

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
  - **Builder:** nothing moves when the deal is made; the first exchange is the next
    settlement (see the builder's proposal).
- **On the state.** Each standing deal has an id, its two seats, what each side gives, the year
  it was agreed, and the year it last settled.
- **Settling.** Once a year, at the timing the owner picks. It is atomic like an accepted trade,
  logged as a trade, and shown as a toast to both seats.
- **When a side cannot pay.** The builder proposes; the owner picks. Options:
  - neither side pays that year and both are told;
  - the deal lapses after a missed year;
  - the deal lapses after two missed years.
  - **Builder:** the deal ends at its first miss.
- **Cancelling.** Either side, on its own turn, without the other's consent, taking effect
  before the next settlement.
  - **Proposed:** no penalty.
  - **Builder:** not in the Assembly's preparation.
- **Limits.** The builder proposes resources only and one deal per pair, with no cap on amounts.
- **Visibility.** Public, as offers are (D5): every seat sees who has deals with whom. Q82
  confirms this with the owner.
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
[questions.md](../questions.md) and waits for the pick before building the settlement. Filed as
Q82 on 2026-10-25; the options follow.

## Builder's proposal

Written 2026-10-25 for the owner's pick in Q82 ([questions.md](../questions.md)). The settlement
waits for that pick.

### Two facts about the turn order

- **Neighbours never even out.** Of two neighbouring seats, the one behind plays first only in
  the year it opens: seat 1 plays before seat 0 one year in four. Only seats across the table,
  such as 1 and 3, split two and two. This holds for the whole game.
- **A seat's turns are unevenly spaced.** Each year a seat plays one place earlier. For three
  years it waits two turns between its own; after it opens a year it waits six, because it plays
  last the next year. In the long wait every other seat plays twice. In a short one, one of them
  does not play at all.

### The example

Seats are the engine's 0 to 3. Seat 0 opens year 1, and the opener moves on one seat a year.

| Year | Order   | First of seats 1 and 3 | Assembly                   |
| ---- | ------- | ---------------------- | -------------------------- |
| 1    | 0 1 2 3 | Seat 1                 |                            |
| 2    | 1 2 3 0 | Seat 1                 | Sits before the first turn |
| 3    | 2 3 0 1 | Seat 3                 |                            |
| 4    | 3 0 1 2 | Seat 3                 | Sits before the first turn |

- **The deal:** 3 food from seat 1 for 1 stone from seat 3, every year. It already stands as
  year 1 begins; the year a deal is made has its own section below.
- **Seat 1** makes 4 food more than it eats at each income, and no stone. It spends whatever the
  deal does not tie up.
- **Seat 3** eats 3 food more than it makes, and makes 2 stone. It holds no spare food: the deal
  is how it eats.
- **Keeps** is what a seat must still hold when it ends its turn, so that the deal can be paid.

### Option A: in the earlier seat's turn (the owner's draft)

The deal settles right after the income of whichever seat of the pair plays first that year.

| Year | Turn        | The deal                                                 | Seat 1                               | Seat 3                               |
| ---- | ----------- | -------------------------------------------------------- | ------------------------------------ | ------------------------------------ |
| 1    | Seat 1, 2nd | Settles: seat 1 pays from income, seat 3 from kept stone | Keeps nothing (first in year 2)      |                                      |
| 1    | Seat 3, 4th |                                                          |                                      | Fed. Keeps 1 stone                   |
| 2    | Seat 1, 1st | Settles as in year 1                                     | Pays 3, keeps 3: 6 on an income of 4 |                                      |
| 2    | Seat 3, 3rd |                                                          |                                      | Fed. Keeps nothing (first in year 3) |
| 3    | Seat 3, 2nd | Settles: seat 3 pays from income, seat 1 from kept food  |                                      | Fed. Keeps nothing (first in year 4) |
| 3    | Seat 1, 4th |                                                          | Keeps 3, through year 4's sitting    |                                      |
| 4    | Seat 3, 1st | Settles as in year 3                                     |                                      | Fed. Pays 1, keeps 1: 2 stone        |
| 4    | Seat 1, 3rd |                                                          | Keeps nothing (first in year 5)      |                                      |

- **Hunger.** Seat 3 is fed every turn. Each seat gets exactly one exchange between two of its
  own turns.
- **Which stock pays.** The first seat pays from the income it just collected, the second from
  what it kept. Seat 1 keeps food at the end of years 2 and 3, seat 3 keeps stone at the end of
  years 4 and 1.
- **The switch.** In the turn a seat loses first place it pays twice: seat 1 needs 6 food in
  year 2, and seat 3 needs 2 stone in year 4. In the turn it gains first place it pays nothing.
  A seat plans two years ahead: seat 1 must save 2 of year 4's free food for year 6, its next
  double turn.
- **What can break it.** The first seat pays right after its income, before it can act, so a
  year card it could not see, such as Drought, can make it miss. Kept stock waits through other
  seats' turns: in year 4 seat 1's food waits through the sitting, where a Grain Riot (lose 3
  food) breaks the deal.
- **Fairness.** Even for seats 1 and 3 over each four years. Between neighbours the seat behind
  keeps its side three years in four, all game.

### Option B: each side pays on its own turn

Each side hands over its part right after its own income.

| Year | Turn        | The deal            | Seat 3                                         |
| ---- | ----------- | ------------------- | ---------------------------------------------- |
| 1    | Seat 1, 2nd | Seat 1 pays 3 food  | Holds 3 food                                   |
| 1    | Seat 3, 4th | Seat 3 pays 1 stone | Fed                                            |
| 2    | Seat 1, 1st | Seat 1 pays 3 food  | Holds 3 food                                   |
| 2    | Seat 3, 3rd | Seat 3 pays 1 stone | Fed                                            |
| 3    | Seat 3, 2nd | Seat 3 pays 1 stone | Nothing since its last turn: 3 short at hunger |
| 3    | Seat 1, 4th | Seat 1 pays 3 food  | Holds 3 food                                   |
| 4    | Seat 3, 1st | Seat 3 pays 1 stone | Fed                                            |
| 4    | Seat 1, 3rd | Seat 1 pays 3 food  | Holds 3 food                                   |

- **Which stock pays.** Nobody keeps anything: each side pays from the income it just collected.
- **Hunger.** Between two of seat 3's turns seat 1 plays once, not at all, or twice, as the order
  turns. Once every four years seat 3 meets its hunger check with no delivery: in year 3 it loses
  3 pops unless it finds 3 food elsewhere, such as 9 influence at the Dole. Seat 1 pays twice
  before seat 3's turn in year 5, so the late food ends up as 3 spare. Seat 1 likewise gets no
  stone between its turns in years 4 and 5.
- **Who pays first.** Each year one side pays before it is paid. To be safe the buyer keeps one
  payment in stock, which is what option C asks of both sides anyway.
- **Fairness.** Unfair: in every pair, each side goes a turn without its delivery once every
  four years.

### Option C: as the year turns

Every deal at the table settles when the year turns, after the year card and before any sitting.

| Year | Turn           | The deal                              | Seat 1                 | Seat 3                       |
| ---- | -------------- | ------------------------------------- | ---------------------- | ---------------------------- |
| 1    | The year turns | Settles: both pay from what they kept |                        | Holds 3 food                 |
| 1    | Seat 1, 2nd    |                                       | Keeps 3 food, spends 1 |                              |
| 1    | Seat 3, 4th    |                                       |                        | Fed. Keeps 1 stone, spends 1 |
| 2    | The year turns | Settles, then the Assembly sits       |                        | Holds 3 food                 |
| 2    | Seat 1, 1st    |                                       | Keeps 3, spends 1      |                              |
| 2    | Seat 3, 3rd    |                                       |                        | Fed. Keeps 1 stone           |
| 3    | The year turns | Settles                               |                        | Holds 3 food                 |
| 3    | Seat 3, 2nd    |                                       |                        | Fed. Keeps 1 stone           |
| 3    | Seat 1, 4th    |                                       | Keeps 3, spends 1      |                              |
| 4    | The year turns | Settles, then the Assembly sits       |                        | Holds 3 food                 |
| 4    | Seat 3, 1st    |                                       |                        | Fed. Keeps 1 stone           |
| 4    | Seat 1, 3rd    |                                       | Keeps 3, spends 1      |                              |

- **Which stock pays.** Both sides pay at the same moment from what they kept. Every turn reads
  the same, whatever the order.
- **Hunger.** Both are paid before their next income. Each seat gets exactly one exchange between
  two of its own turns, in every pair.
- **The cost.** Each side keeps one payment in stock at every turn end while the deal stands.
  Seat 3 holds its food from the year turn to its income, through the sitting in years 2 and 4,
  where a Grain Riot can take it as it can any food a seat holds.
- **What can break it.** A seat misses only by ending its own turn without its side, or by
  losing it to that turn's riot roll (Granary sacked, Bribe demanded). The End-turn confirm warns
  a seat that keeps less than it owes.
- **Assembly years.** The deal settles before the sitting, so an influence deal can pay for a
  proposal or bought votes.
- **Fairness.** Fair: the seat order changes nothing.

### Side by side

|                                         | A: earlier seat's turn                      | B: each on its own turn | C: as the year turns |
| --------------------------------------- | ------------------------------------------- | ----------------------- | -------------------- |
| Who pays from kept stock                | The seat playing second                     | Nobody                  | Both                 |
| Exchanges between two of a seat's turns | One                                         | None, one or two        | One                  |
| Seat order matters                      | Yes; three years in four between neighbours | Yes                     | No                   |
| In an Assembly year                     | After the sitting                           | After the sitting       | Before the sitting   |
| Verdict                                 | Works, but uneven                           | Unfair                  | Fair                 |

**Replay.** All three settle inside the command that ends a turn or closes a sitting, from the
state alone, so replays stay exact. C runs as the year turns; A and B run with a turn's income.

### The year a deal is made

- The spec's first draft settled the first exchange at once. Under any of the three timings that
  can make a seat pay twice with no income between: a seat that accepts after its own turn pays
  now, and again at the next settlement before it collects.
- **Proposed:** making a deal checks that each side holds its side, as an offer does, and moves
  nothing. The first exchange is the next settlement, and the offer card says when ("first as
  year 3 begins"). A seat that needs the goods now makes a plain trade alongside.

### Missed payment

- A deal settles whole or not at all, like a trade. If either side does not hold all of its
  side, nothing moves.
- **Proposed: the deal then ends.** Both seats get a toast, and the Chronicle names who was short
  of what.
- **Why.** Under C a seat misses only by ending its turn without its side, or through its own
  riot roll. A deliberate miss is a cancel by another name, and cancelling is free. A deal that
  survives a miss leaves its partner guessing every year. The two seats can make it again.
- **Warning.** The End-turn confirm, which already warns of hunger and riots, tells a seat that
  keeps less than it owes that its deal ends as the year turns.
- The other answers: nothing moves and the deal stands; or the deal ends after two misses in a
  row.

### Cancelling

- Either seat, on its own turn, from the deal card. No consent and no cost.
- It takes effect at once: the deal does not settle again. Both seats get a toast and a
  Chronicle line, and the disc leaves both alarms rows.
- **No notice period.** Hunger is checked at the end of a seat's own turn, so after any cancel
  the partner has a turn to find the goods elsewhere.
- **Not in the Assembly's preparation.** Under C the year's exchange is done before the sitting,
  and each seat plays a turn before the next one, so its own turn is always soon enough.
- **Changing terms.** A new deal between the same two seats replaces their old one when it is
  accepted, so the terms change without a gap.

### What a deal can carry

- Wood, stone, food, gold and influence, at any ratio, with at least one unit on each side (D6).
- **No pops.** A yearly pop would need a settlement named on each side with room at every
  settlement, would travel every year, and would move who feeds it, its unrest and its vote each
  time. A one-off trade still moves pops.
- **No luxury goods**, and later no development cards. A good is owned once: after the first
  exchange the giver no longer holds it, so the deal could never settle again.
- **One deal per pair.** A side can carry several resources, so nothing is lost, and each partner
  keeps one disc and one line. A seat holds at most three deals.
- **No cap on amounts.** A deal must be payable when it is made, and a deal nobody can pay ends
  at its first miss.

### Visibility

- **Public**, as offers are (D5): every seat sees every deal.
- **The two seats.** One disc per partner on the alarms row, with the partner's colour ring, the
  handshake and an "every year" mark. The tooltip reads "−3 food to Kyros · +1 stone from Kyros ·
  next as year 5 begins". A click opens the deal card, which has Cancel.
- **The income line.** The realm's income forecast shows each deal as its own line, marked "as
  the year turns", and the hunger forecast counts the food a deal brings before the next income.
- **Rivals.** A seat's deals are listed on its tooltip and realm page, as its Ideas are. The
  Chronicle has a line for every seat when a deal is made, missed or cancelled, and one line at
  each year turn for the deals that settled. Toasts go only to the two seats.

### Recommendation

Option C: every deal settles as the year turns, before any sitting. With it:

- nothing moves when a deal is made, and the first exchange is at the next year turn;
- a missed payment ends the deal;
- cancelling is free, on a seat's own turn, and takes effect at once;
- resources only, and one deal per pair;
- deals are public.

C is the only timing where the seat order changes nothing, between neighbours as between seats
across the table, and every seat gets one exchange between two of its turns. Its cost is one
payment each side keeps in stock while the deal stands. The End-turn confirm can warn about it,
and a bot's forecast holds it back as a fixed amount, where under A the amount would depend on
next year's order.

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
