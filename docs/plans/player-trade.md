---
status: ready
phase: "post-v2"
updated: 2026-10-18
---

# Player trade

## Outcome

On their turn a player offers goods to the other seats, the table answers, and an agreed deal
moves both sides' goods at once. A realm that grows more food than it eats sells it for the wood
it lacks. While the Assembly prepares, the market opens to every seat. Bots trade the same way,
so the sim shows who trades what, and Step 11 measures a game that has trade in it.

## Non-goals

- Changing the bank. Its rates stay fixed and trade runs beside it.
- Bots that bargain well. They price deals with the scorer they have and model no rival.
- Networked play. The commands carry over to a server in Phase 6; no timers or reconnects here.
- Promises, loans or deals about later turns. A trade exchanges what is held now.

## Settled inputs

- Shape (Q33, owner, 2026-07-27): Catan-style. The offer goes to the table, each recipient
  accepts, declines or counters, and agreed terms execute at once.
- Luxury goods are tradable (Q49).
- The sim measures trade, for example a player with plenty of wood trading it for food (owner).
  Step 11 and Q80 wait for trade (owner, 2026-10-14), and so does number tuning (2026-10-13).
- Owner, 2026-10-18: trade ships after the v2 merge. Influence and pops trade, which ends the
  Q14 rule that influence never changes hands; votes never trade. In the Assembly any seat may
  offer, only in the opening preparation, until every seat presses Ready; citizens trade there
  too. No offer limit, and several offers can be open at once. One person can trade with bots.
  Offers are public. No gifts.

## Rules (proposed)

**What trades.** Wood, stone, food, gold, influence, claimed luxury goods and pops of every
class. Never votes, Ideas, Laws, settlements, buildings, pieces or Unrest tokens. Happiness is
a level read off the board; a good carries its +2 to its new holder, and a slave its unrest.

**Pops.** The giver names the pops and the settlement they leave; like a move, a trade may empty
a settlement. Each side names the settlement of its own that receives what it gets: a recipient
when it accepts, the offering seat when it settles. Traded pops travel like a move: they leave
at once, are on the move under their new owner, and arrive at the start of that owner's next
turn. The receiving settlement needs the room, counting pops already on the move to it, or the
trade cannot settle. From settlement on, the new owner feeds them and counts their unrest, and
a citizen votes for it. A citizen traded in the Assembly's preparation votes for its new owner
on that sitting's ballots, as any citizen on the move does; no vote trades on its own.

**When and who.** In normal play only the seat whose turn it is makes offers, once its event
card is resolved, and never while a riot or a hunger pick is pending.

The Assembly trades only in its opening preparation, the part of the sitting where each seat
draws or picks its proposal and gets ready to vote. Each seat seals as today, then presses
Ready. Until every seat is Ready, any seat may make and answer offers; a seat that is Ready
makes no new offers but still answers. When the last seat presses Ready, open offers close and
the ballots begin, and nothing trades from there to the recap. Today a sitting has no Ready
step: each seat proposes in turn order and the ballots follow.

Several offers can be open at once, made back to back by one seat or, in the Assembly, by
several. Each recipient accepts, declines or counters; then the offering seat settles with one
acceptor or counter, or withdraws. The engine rechecks both sides at settlement, so an offer
whose goods went to an earlier settlement can no longer settle. A seat's open offers close when
its turn ends, or when the Assembly's preparation ends.

**Limits.** Each side gives at least one thing, at any ratio (D6). A seat gives only what it
holds, so a seat short of food gives no food, though it can take food to cover the shortfall.
No limit on offers, and a declined offer may be made again. No Port is needed. A good moves
without its Port, which stays as a building, and every good counts +2 for whoever holds it, with
no cap.

**The bank's prices are the walls.** The bank pays 1 gold for 3 of a material and charges 2 gold
for 1, so at the bank 6 wood buy 1 food. Any barter between 6 for 1 and 1 for 6, and any price
between a third of a gold and 2 gold a unit, beats the bank for both sides. The engine enforces
none of this; it is why a deal is worth taking.

## Hotseat now, network later

Hotseat: offers and answers are public moments, like votes, with no turn notice and no passing
the screen. The offer card lists the open offers, names the seat that answers next and shows
its stocks; recipients answer on the shared screen in seat order, and a bot answers at once.
During the Assembly's preparation the sitting sheet shows each seat's Ready mark and an Offer
button: pick the seat that offers, then compose as on a turn. A seat still seals behind its own
notice, and offers wait for the shared sheet. A settled trade writes a Chronicle line and
toasts every seat. A game of bots shows no card.

Networked (later): the same commands. Each recipient answers on their own screen in any order,
the card drops the handover line, and the server adds an answer timer and a disconnect rule. The
engine takes answers from any recipient still to answer, so no rule changes.

## Bots

A bot prices a deal with the scorer it plays with: its personality's weights, the purchase its
stocks are saving toward (Step 20), and the food and calm its forecast buys ahead (Steps 19, 20).

- **Answering.** Accept when the score after the trade beats the score before by a small margin
  and the trade gives the partner no title it lacked (the engine's title changes). Else decline.
- **Offering on its turn.** Before its normal search, the bot lists what it is short of: this
  turn's food shortfall and the materials missing for its best purchases (Step 20's list),
  including ones its land makes none of. Against that it sets what it holds beyond those
  purchases, and tries 1 for 1, 2 for 1, 1 for 2, and gold at 1 a unit. It keeps the deals its
  search scores above its best turn without a trade; that search already uses the bank and the
  Dole, so a deal worse than the bank never wins. The best goes to every rival, and the bot
  settles with the acceptor holding the fewest titles, ties by seat order.
- **Offering in the Assembly.** A bot short of the influence for a proposal it wants, or of the
  gold or influence for the bank votes it plans to buy, offers for it in the preparation, then
  presses Ready. Otherwise it only answers.
- **Pacing.** No rule limits offers, so the bots limit themselves: one offer on their turn, one
  per sitting, and never a declined offer again in the same turn or sitting. A bot's turn stays
  inside the sim's 30-action stop.
- Bots offer materials, gold and influence, and answer any offer, pops and goods included. The
  `trader` personality predates player trade and gets no trade rule of its own.

## The sim

Telemetry per game, seat and personality: offers by outcome, trades settled, units given and
received by kind (materials, gold, influence, pops by class), each price against the bank's,
goods that changed hands, trades made in a sitting, and trades after which a title changed
holder.

The headline is who exports what: for each material, the net units a game sent out by the seat
whose land makes the most of it and by the seat whose land makes the least. Trade works when
the first is positive and the second negative: the plains seat sells food, the forest seat wood.

A ruleset switch turns trade off, so the same seeds run with and without it: four masters with
no Ideas on seeds 1000 to 1039 (Q80's batch), then the rotated mixed table. Compare turns begun
short of food (630 of 2,240 on Step 20's build), Dole uses (40.7 a game), bank sales and
purchases, pops lost to hunger, realms that never cut wood (55 of 160), the influence stock by
year, and wins and titles.

Then, in order: slice 2's report adds a trade column to Q80's table and the owner answers Q80;
Step 11 runs once every slice is in, by the v2 plan's decision rules, its reach audit counting
the trade commands and its build-viability rule testing whether missing trade was the gap;
number tuning follows. Step 11's rule on the influence plateau now reads a stock that can be
sold.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                                                                                       |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | Yes      | An open offer on the match state; propose, answer, counter, settle and withdraw with derived legal options; one atomic settlement that rechecks holdings and room; pops as goods; ruleset values; tests |
| Frontend         | Yes      | An Offer option on the Exchange disc, the Market page and the Assembly sheet; the public offer and answer card; counter terms beside the original; Chronicle line, toast, Codex chapter; browser test   |
| Simulation & AI  | Yes      | Bots answer and offer through legal commands on their own projection; answers and Assembly offers routed to the acting seat; telemetry and reach counts; use and avoid fixtures; paired batches         |

## Architecture impact

- Ruleset values (trade on or off), version and schema bumps; older saves are rejected, as
  today. Commands carry intent only; the engine derives holdings, room and legality.
- A trade workflow in the actor query. On a turn the offering seat settles or withdraws and each
  recipient still to answer may answer. In the Assembly's preparation any seat may open an offer
  until every seat is Ready; today the sitting only acts in seat order. The sim runner acts as
  `currentPlayer` and must route by eligible actor, as a server will. Offers are public (D5):
  nothing to redact.
- Offers get stable ids, and several may be open; settling one leaves the rest to their own
  recheck. Settlement moves materials, gold and influence; passes goods through the one-owner
  seam the Port's claim uses (`transferLuxury`); and schedules pops as a transfer owned by the
  receiver, the seam a move uses. Tests prove each resource's table total and the pops survive
  a trade.
- The answer card is a required decision in the shared decision host. The composer preview, the
  bots and settlement read one engine check of holdings; the Chronicle, toast and telemetry read
  one settled-trade event. The command parity map and `TRADE_WORKFLOW_PARITY` cover the commands.

## PR slices

All to `main`, after the v2 merge.

1. **Offer, answer, settle.** Turn trades in materials, gold, influence and goods, without
   counters, in the engine, the shell and the bots' answers, with Chronicle, toast and Codex.
   Checked by engine tests (atomic settlement, conservation, no food from a short seat, a good
   moving its +2 and Beloved, two open offers on the same goods), command parity, a browser test
   of offer to settlement, and a bot batch with no illegal moves.
2. **Bots offer; the sim reads trade.** The offer builder, partner choice, pacing, telemetry, the
   off switch, and a dated report of the paired batches. Checked by fixtures: a wood-rich seat
   short of food buys food from a food-rich seat that wants wood for a building; a bot refuses a
   deal worse than the bank and one that hands a rival Treasurer.
3. **Pops.** Pops as a good, delivered like a move. Checked by engine tests (no room, no deal; a
   slave's unrest and a citizen's food and vote go with it; a trade may empty a settlement) and a
   bot batch.
4. **The Assembly market.** The preparation's Ready step, offers from any seat until every seat
   is Ready, the Offer button and Ready marks on the sitting sheet, the bots' Assembly offers,
   and the rules guide's Assembly section. Checked by engine tests (no offer once every seat is
   Ready; open offers close as the ballots begin; a citizen traded in the preparation votes for
   its new owner), a browser test of a trade in the preparation, and a bot batch.
5. **Counters.** A counter per recipient, the offering seat's answer, the card showing both
   terms, and a bot rule: about to decline, counter once if one unit more or less makes the deal
   pay. Checked by engine tests (a counter closes with its offer), a browser test, a bot batch.
6. **Mixed table and close-out.** Human seats beside bots in the browser (D4), the rules guide
   and Codex text, and the owner's hotseat playtest. Then Q80 and Step 11.

## Acceptance and validation

- The wood-for-food fixture trades, and the batches show that flow by material.
- A settled trade moves exactly the named goods and pops; anything else changes nothing; trades
  replay.
- In a hotseat playtest the table trades without help, on turns and in a sitting, and finds the
  offer card clear.

## Owner decisions

Answered by the owner on 2026-10-18.

- **D1 · When does trade ship?** After the v2 merge; trade PRs go to `main`, and Step 11 runs
  from this plan once the v2 plan is archived.
- **D2 · What can be traded?** Materials, gold, luxury goods, influence and pops. Never votes.
- **D3 · How many offers a turn?** No limit, and several can be open at once.
- **D4 · Can one person trade with bots?** Yes: slice 6 adds human seats to the bot table.
- **D5 · Who sees an offer?** Everyone, as at a Catan table.
- **D6 · Gifts and prices.** Each side gives at least one thing, at any ratio. No gifts.
- **D7 · When does the Assembly trade?** Only in the opening preparation, while seats draw and
  seal, until every seat presses Ready.
- **D8 · Can a citizen be traded in a sitting?** Yes, in the preparation, before any ballot; it
  votes for its new owner.

## Retirement

When slice 6 merges: add a Trade section to `rules.md` and drop its bank section's "a later
phase" line; update the Codex, [AI](../reference/ai.md) and [simulation](../reference/simulation.md)
references; move this plan to `docs/archive/plans/` with its PRs and the trade report.
