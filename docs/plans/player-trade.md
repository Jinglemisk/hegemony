---
status: active
phase: "post-v2"
updated: 2026-10-25
---

# Player trade

## Outcome

On their turn a player offers goods to the other seats, the table answers, and an agreed deal
moves both sides' goods at once. There is no bank: apart from the Dole's food, trade is the only
way to turn one resource into another. A realm that grows more food than it eats sells it for the
wood it lacks. While the Assembly prepares, the market opens to every seat. Bots trade the same way,
so the sim shows who trades what, and the balance check measures a game that has trade in it.

## Non-goals

- The development deck. It replaces Ventures in its own [plan](development-deck.md); its cards
  trade here as closed goods once it lands.
- Bots that bargain well. They price deals with the scorer they have and model no rival.
- Networked play. The commands carry over to a server in Phase 6, which adds answer timers and a
  disconnect rule.
- Promises, loans or deals about later turns. A trade exchanges what is held now.

## Settled inputs

- Shape (Q33, owner, 2026-07-27): Catan-style. The offer goes to the table, each recipient
  accepts, declines or counters, and agreed terms execute at once.
- Luxury goods are tradable (Q49).
- The sim measures trade, for example a player with plenty of wood trading it for food (owner).
  The balance check waits for trade (owner, 2026-10-14), and so does number tuning (2026-10-13).
- Owner, 2026-10-18: trade ships after the v2 merge. Influence and pops trade, which ends the
  Q14 rule that influence never changes hands; votes never trade. In the Assembly any seat may
  offer, only in the opening preparation, until every seat presses Ready; citizens trade there
  too. No offer limit, and several offers can be open at once. One person can trade with bots.
  Offers are public. No gifts.
- Owner, 2026-10-19: the bank is removed entirely, with no material swap in its place. Every
  settlement makes 1 food on its own; nothing else gets a base yield. Development cards trade as
  closed goods.
- Owner, 2026-10-21: approved the [trade screens](../reference/design/showcases/trade-screens/README.md).
  An offer is a disc on the alarms row, not a card that takes over the screen; it may go to
  chosen seats; the compact card composes it, and a counter edits that card in place. Hotseat has
  no clock (Q81). Trade ships in two PRs; bots trade only in the second, which also lets one
  person play against bots in the browser. Answering out of turn is built for any mechanic that
  needs it, not for trade alone. Later the same day: first come, first served. The first named
  seat to accept trades, and a counter dies with the offer. Traded pops are placed on the map
  like a move's, with the partner fixed and a handshake beside it. The alarms row stays above
  the Assembly's dimming, and a new offer's disc shakes once.

## Rules (proposed)

**What trades.** Wood, stone, food, gold, influence, claimed luxury goods, pops of every class and,
once the [deck](development-deck.md) lands, development cards, offered closed. Never votes, Ideas,
Laws, settlements, buildings, pieces or Unrest tokens. Happiness is a level read off the board; a
good carries its +2 to its new holder, and a slave its unrest.

**Pops.** The giver names the pops and the settlement they leave; like a move, a trade may empty
a settlement. Each side names its own settlements for the pops it gives and gets: the offering
seat when it offers or takes a counter, a recipient when it accepts or counters. Traded pops
travel like a move: they leave
at once, are on the move under their new owner, and arrive at the start of that owner's next
turn. The receiving settlement needs the room, counting pops already on the move to it, or the
trade cannot settle. From settlement on, the new owner feeds them and counts their unrest, and
a citizen votes for it. A citizen traded in the Assembly's preparation votes for its new owner
on that sitting's ballots, as any citizen on the move does; no vote trades on its own.

**When and who.** In normal play only the seat whose turn it is makes offers, once its event
card is resolved, and never while a riot or a hunger pick is pending. An offer goes to the table
or to the seats it names. Every seat sees it; only the named seats answer.

The Assembly trades only in its opening preparation, the part of the sitting where each seat
draws or picks its proposal and gets ready to vote. Each seat seals as today, then presses
Ready. Until every seat is Ready, any seat may make and answer offers; a seat that is Ready
makes no new offers but still answers. When the last seat presses Ready, open offers close and
the ballots begin, and nothing trades from there to the recap. Today a sitting has no Ready
step: each seat proposes in turn order and the ballots follow.

Several offers can be open at once, made back to back by one seat or, in the Assembly, by
several. Each recipient accepts, declines or counters with terms of its own. First come, first
served: the first to accept trades at once, and the offer closes with every other answer on it.
A counter waits for the offering seat to take it; if another seat accepts first, it dies with
the offer. The offering seat may also withdraw. The engine rechecks both sides at settlement, so
an offer whose goods went to an earlier settlement can no longer be accepted. A seat's open
offers close when its turn ends, or when the Assembly's preparation ends.

**Limits.** Each side gives at least one thing, at any ratio (D6). A seat gives only what it
holds, so a seat short of food gives no food, though it can take food to cover the shortfall.
No limit on offers, and a declined offer may be made again. No Port is needed. A good moves
without its Port, which stays as a building, and every good counts +2 for whoever holds it, with
no cap.

**No bank.** The bank and the Exchange disc go. No seat sells a material for gold or buys one
with gold. Trade is the only conversion, apart from the Dole, which still turns influence into
food, and the deck's cards. Nothing anchors a price: it is whatever two seats agree.

**Base food.** Every settlement, colony, city or capital, makes 1 food at income on its own, before
upkeep. In the [rotated batch of 2026-10-19](../reports/simulation/2026-10-19-v1-vs-v2.md) the
median realm eats 3 food in year 1, 4 to 5 in years 2 to 8 and 7 in year 14; the base gives 2, 4 and
5, so growth and a surplus to sell still need plains.

## Hotseat now, network later

Hotseat: offers and answers are public moments, like votes, with no turn notice and no passing
the screen. Nothing takes over the screen, and play goes on while offers are open. The
[trade screens](../reference/design/showcases/trade-screens/README.md) show the look.

- **The disc.** Each open offer is a disc on the alarms row in the offering seat's glaze, with
  its seat badge and the viewer's mark once it has countered or declined. Hotseat has no clock:
  the ring has one segment per recipient and fills as they answer. The disc shakes once as the
  offer lands, and not after. The mockup's draining seconds come with the server's answer timer.
- **The card.** Hovering a disc shows the offer, and clicking it opens the compact offer card.
  The Trade disc opens the same card to compose: seat discs pick the recipients, none meaning the
  table; each side holds one chip per resource with a − n + stepper; and the footer shows the
  stocks after, in the delta colours. Pops are placed on the map as the command goes, like a
  move: the seat's settlements that can send or take them glow, and the popover names the
  partner, fixed, with a handshake.
- **Answering.** The card lists every seat the offer names at once, each with Decline, Counter
  and Accept, and what it holds of the stocks asked of it. The first Accept trades. A counter
  edits the terms on the card, where a changed line shows what it was; the offering seat can take
  it from its row, or withdraw the offer. A bot answers at once.
- **The Assembly.** During the preparation the sitting sheet shows each seat's Ready mark and an
  Offer button: pick the seat that offers, then compose as on a turn. A seat still seals behind
  its own notice, and offers wait for the shared sheet. The sheet starts below the alarms row,
  and the top bar and the alarms row stay above its dimming, so an offer is seen and answered
  there; a map pick folds the sheet away until it is made.
- A settled trade writes a Chronicle line and toasts every seat. A game of bots shows no card.

Networked (later): the same commands. Each recipient answers on their own screen, the first
accept to reach the server trades, and the server adds an answer timer and a disconnect rule.
No rule changes.

## Bots

A bot prices a deal with the scorer it plays with: its personality's weights, the purchase its
stocks are saving toward (Step 20), and the food and calm its forecast buys ahead (Steps 19, 20).

- **Answering.** Accept when the score after the trade beats the score before by a small margin
  and the trade gives the partner no title it lacked (the engine's title changes). Else, if one
  unit more or less on one line would make the deal pay, counter once with that change. Else
  decline.
- **Offering on its turn.** Before its normal search, the bot lists what it is short of: this
  turn's food shortfall and the materials missing for its best purchases (Step 20's list),
  including ones its land makes none of. Against that it sets what it holds beyond those
  purchases, and tries 1 for 1, 2 for 1, 1 for 2, and gold at 1 a unit. It keeps the deals its
  search scores above its best turn without a trade; that search already uses the Dole, so a
  deal worse than the Dole's food never wins. The best goes to every rival, and the first to
  accept trades.
- **Offering in the Assembly.** A bot short of the influence for a proposal it wants, or of the
  gold or influence for the votes it plans to buy, offers for it in the preparation, then
  presses Ready. Otherwise it only answers.
- **Pacing.** No rule limits offers, so the bots limit themselves: one offer on their turn, one
  per sitting, and never a declined offer again in the same turn or sitting. A bot's turn stays
  inside the sim's 30-action stop.
- Bots offer materials, gold and influence, and answer any offer, pops and goods included. The
  `trader` personality predates player trade and gets no trade rule of its own.
- With no bank, a bot short of food that finds no acceptor turns to the Dole, and loses pops if
  that fails too. The batches count how often.

## The sim

Telemetry per game, seat and personality: offers by outcome, trades settled, units given and
received by kind (materials, gold, influence, pops by class), each price by material,
goods that changed hands, trades made in a sitting, and trades after which a title changed
holder.

The headline is who exports what: for each material, the net units a game sent out by the seat
whose land makes the most of it and by the seat whose land makes the least. Trade works when
the first is positive and the second negative: the plains seat sells food, the forest seat wood.

Ruleset switches turn the new economy on piece by piece, so the same seeds run as today's game
(bank, no trade, no base food), with trade and no bank, and with trade, no bank and base food:
four masters with no Ideas on seeds 1000 to 1039 (the 2026-10-11 same-policy batch), then the
rotated mixed table.
Compare turns begun short of food (630 of 2,240 on Step 20's build), Dole uses (40.7 a game),
pops lost to hunger, the freeman share, gold income, realms that never cut wood (55 of 160),
the influence stock by year, and wins and titles.

Then, in order: the second PR's report adds a trade column to the same-policy table and the owner
sets the balance check's shape (done 2026-10-25); the balance check runs once both PRs are in, by
the rules below, its reach audit counting the trade commands; number tuning follows. Its rule on
the influence plateau now reads a stock that can be sold.

The batches ran on 2026-10-22 ([report](../reports/simulation/2026-10-22-trade-paired.md)).
Every material goes from the seat whose land makes the most of it to the seat that makes the
least. Base food, not trade, ends the food shortage: turns begun short fall by three quarters on
both tables. It leaves the influence stock growing about 10 a year, against the plateau rule's
5, and on the rotated table gold piles up at the trader, which wins 23 of 40 and holds Treasurer
in 39. The trader bot still starves with gold in hand.

## The balance check

Step 11 of the [v2 migration plan](../archive/plans/v2-migration.md), moved here on 2026-10-18.
The owner set its shape on 2026-10-25 (Q80). Bot games on `main` judge the rules below. One
script prints each rule's limit, the measured value, a 95% interval and a verdict, and the dated
report says what fails and what might explain it.

**Batches.** 56 turns, seeds from 1000, run by the owner:

| Table                                           | Board       | Games                       | Judges                                 |
| ----------------------------------------------- | ----------- | --------------------------- | -------------------------------------- |
| Four masters, no Ideas                          | Continental | 60                          | The runaway leader and the level rules |
| Mixed: slaver, civic, trader and master rotated | Continental | 160 (40 seeds × 4 seatings) | Win rates and the level rules          |
| Four masters, no Ideas                          | Archipelago | 60                          | The same as Continental's masters      |

On the owner's fanless MacBook Air, two workers at normal priority reached 100°C. The batches run
on the efficiency cores only, through `taskpolicy -b`, with four workers, in 6 hours 16 minutes for
all three on 2026-10-25 ([report](../reports/simulation/2026-10-26-balance-check.md)):

```bash
taskpolicy -b node --import tsx src/sim/cli.ts batch --turns 56 --seed 1000 --jobs 4 --board continental --games 60 --policy master --without-ideas all --report <out>.json --csv <out>.csv
taskpolicy -b node --import tsx src/sim/cli.ts batch --turns 56 --seed 1000 --jobs 4 --board continental --games 40 --seats slaver,civic,trader,master --rotate --report <out>.json --csv <out>.csv
taskpolicy -b node --import tsx src/sim/cli.ts batch --turns 56 --seed 1000 --jobs 4 --board archipelago --games 60 --policy master --without-ideas all --report <out>.json --csv <out>.csv
node docs/reports/simulation/2026-10-26-balance-check/tools/check.mjs <report> [<report> ...]
```

**Rules.**

| Question                        | Rule                                                                                                                                                                                                                                                                                                                                          | Table                                                                                                                     | If it fails                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Do riots stay rare?             | The riot table is reached on at most 10% of turns from year 8                                                                                                                                                                                                                                                                                 | Both                                                                                                                      | Retune the level's terms or the token cards       |
| Does influence plateau?         | The median influence stock grows by at most 5 a year from year 10 to year 14                                                                                                                                                                                                                                                                  | Both                                                                                                                      | Raise the draw and repeal prices first            |
| How often do realms go hungry?  | Pops lost to hunger a seat-game and turns begun short of food are recorded; no limit is set: hunger is a bot matter (owner, Q84)                                                                                                                                                                                                              | Both                                                                                                                      | Report only                                       |
| Do luxuries decide Beloved?     | Beloved's holder is the sole luxury leader in at most 60% of the turns it is held; the share counting a tie is printed beside it                                                                                                                                                                                                              | Both                                                                                                                      | Raise the Port price or cap what luxuries add     |
| Does the leader run away?       | The year-5 income leader wins at most 40% of games                                                                                                                                                                                                                                                                                            | Four masters, where a lead is a lead; the mixed table's slaver always leads year-5 income, so its figure is for reference | Report, with a proposed catch-up rule             |
|                                 | In the median game the leader holds at most 2.5 times the laggard's pops at year 10 (owner, Q84: pops, not stock)                                                                                                                                                                                                                             | Both                                                                                                                      | Report, with a proposed catch-up rule             |
|                                 | In the median game the leader's income is at most 2.5 times the laggard's at year 10 (owner, Q84)                                                                                                                                                                                                                                             | Both                                                                                                                      | Report, with a proposed catch-up rule             |
| Is every build viable?          | Each personality wins 20% to 45% of games. A benchmark while the bots and mechanics are unfinished; but a personality consistently over 45% (the whole interval above it) with no bug or missing feature to explain it, such as the development deck, gold uses or freemen, does not pass: the report flags it and says what could explain it | Mixed                                                                                                                     | Rework the weakest build                          |
| Is it legible?                  | Recount the paper's section 5.11 reads per decision against the built game                                                                                                                                                                                                                                                                    | –                                                                                                                         | Report only                                       |
| Do draws matter?                | The spread of draw swings against income is recorded                                                                                                                                                                                                                                                                                          | Both                                                                                                                      | Report only; cutting the deck is the owner's call |
| How long, and how do games end? | Fourteen years; the share ending by the race is recorded                                                                                                                                                                                                                                                                                      | Both                                                                                                                      | Report only                                       |
| Against v1                      | Only the figures both versions already record: win spread (wins by seat), game length and riots a game, from the [v1-vs-v2 report](../reports/simulation/2026-10-19-v1-vs-v2.md) and its [baseline](../reports/simulation/2026-09-05-shallow-economy-baseline.md); no v1 backport                                                             | –                                                                                                                         | Report only                                       |

**How the figures are read.**

- 60 games for the rules that measure a level (riots, influence, hunger, Beloved, the pops and
  income ratios), 160 for win rates. At 60 games a measured 20% could be anything from 12% to 32%. Win
  rates are a benchmark, so about ±7 points at 160 games is enough (owner, 2026-10-25); 480 games
  ran too long and too hot.
- Year-5 income and the year-10 pops and income are read after each seat's own turn that year.
  Income is the baseline's gross income: wood, stone, gold, and food when positive. The laggard
  is counted as at least 1. A game with a tied income lead is left out of the year-5 rule.
- The stock ratio (wood, stone, gold and food in store) is retired (owner, Q84): v2 realms spend
  what they earn, so the laggard held 1 to 3 units and the ratio read an empty store. On the first
  run's batches the pops ratio reads 1.60×, 1.58× and 2.20× (Continental masters, Archipelago
  masters, mixed), and the income ratio 3.5×, 4.0× and 12×, with the laggard's income a median 2,
  2 and 1.5 a turn; small incomes swell that ratio as small stocks did.
- Influence is read after each seat's own year-10 and year-14 turns, in games that reach year 14.
- Intervals are bootstraps over seeds, since the four seatings of a seed share a board. A pass or
  fail whose interval crosses the limit is marked "within noise".

The audit showed the first draft of these rules could not measure what they asked: a
linear influence pile passed, and no card could meet the draw rule.

**Still to do.** The legibility recount, which the first run did not do: count the reads per
decision in the paper's section 5.11 against the built game. The next run's check script reads the
pops and income ratios in place of the stock ratio; the mixed table on the Archipelago, the default board since
2026-10-26, has not been run.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                                                                                                                                                                                       |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | Yes      | The bank removed and base food at income; open offers to the table or named seats on the match state; propose, answer, counter, settle and withdraw with derived legal options; the Assembly's Ready step; one atomic settlement that rechecks holdings and room; pops as goods; ruleset values; tests  |
| Frontend         | Yes      | A Trade disc in place of the Exchange disc; offers as discs on the alarms row; the compact offer card that composes, answers and counters; Ready marks and an Offer button on the Assembly sheet; a dev setting that makes each seat human or a bot; Chronicle line, toast, Codex chapter; browser test |
| Simulation & AI  | Yes      | Bots answer, counter and offer through legal commands on their own projection; answers, Ready and Assembly offers routed to the acting seat; telemetry and reach counts; use and avoid fixtures; paired batches                                                                                         |

## Architecture impact

- Ruleset values (trade, the bank and base food, each on or off), version and schema bumps; older
  saves are rejected, as today. Commands carry intent only; the engine derives holdings, room and
  legality.
- A trade workflow in the actor query. On a turn the offering seat takes a counter or withdraws,
  and each named recipient still to answer may answer. In the Assembly's preparation any seat may open an
  offer until every seat is Ready; today the preparation admits every undecided seat, and the
  ballots go in seat order. The actor gate checks the seat and the command's family apart, so a
  recipient listed as a turn actor could play the turn's verbs. Out-of-turn actors become a
  general part of the actor query: a workflow names the seats that may act out of turn and the
  commands each may send, and trade's answers are its first use. Offers are public (D5): nothing
  to redact.
- The sim runner and the browser's bot table act as `currentPlayer`. They must route by eligible
  actor, as a server will, and a recipient's answer must not count toward the offering seat's
  30 actions. Bot code reads `currentPlayer` too, and its purchase list asks the engine for the
  seat's legal moves, which a seat answering out of turn does not have; the answer path scores
  from the answering seat's own view.
- No seat is human or bot today: the browser runs bots for every seat or none, a whole turn per
  tick, so a turn that opens the Assembly plays every seat's proposal and votes. The second PR's
  seat setting lives outside the match state, since the engine does not care who sends a seat's
  commands; the browser's loop plays the bot seats' moves and pauses whenever a human seat must
  act. Bot seats get no turn notice, and the screen stays on the human seat.
- Offers get stable ids, and several may be open; settling one leaves the rest to their own
  recheck. Settlement moves materials, gold and influence; passes goods through the one-owner
  seam the Port's claim uses (`transferLuxury`); and schedules pops as a transfer owned by the
  receiver, the seam a move uses. A move's transfer needs both ends owned by the mover, and an
  invariant checks it, so the transfer and the invariant learn the giver. Tests prove each
  resource's table total and the pops survive a trade.
- The offer card is not a required decision: it opens from its disc and holds up no one, so it
  does not mount in the decision host. It uses code-health's shared action button and resource
  chip. The alarms row has no ring today; the offer disc brings it. The composer preview, the
  bots and settlement read one engine check of holdings; the Chronicle, toast and telemetry read
  one settled-trade event. The command parity map covers the commands, and the first PR creates
  the `TRADE_WORKFLOW_PARITY` registry the [parity reference](../reference/parity-manifests.md)
  names.

## PRs

Two, both to `main`; the [code-health plan](code-health.md)'s five cleanup PRs are merged. The
first merged as #131 (2026-10-21), the second as #132 (2026-10-22); its paired batches are
reported under The sim.

1. **Trade.** Trade between human seats in hotseat, with the bank still in place. Offers on a
   turn and in the Assembly's preparation, to the table or named seats, in materials, gold,
   influence, goods and pops; counters; the disc, the card, and the Assembly's Ready step; a
   Trade disc beside the Exchange disc; out-of-turn actors in the actor query; the trade switch;
   the Chronicle line, toast, Codex chapter and the rules guide's Trade section. Bots only press
   Ready: no bot sees an offer yet, since the browser is all humans or all bots and bots do not
   offer. The trade screens mockup opens the PR. Checked by engine tests (atomic settlement and
   conservation; no food from a short seat; a good moving its +2 and Beloved; two open offers on
   the same goods; only named seats answer; no room, no deal; a slave's unrest and a citizen's
   food and vote go with it; no offer once every seat is Ready, and open offers close as the
   ballots begin; a citizen traded in the preparation votes for its new owner), command parity,
   one browser test of an offer countered and settled on a turn, and one bot run with no illegal
   moves. Then the owner tries the screens in hotseat.
   - As built: trade is on in the default ruleset, and `trade.enabled: false` takes it and the
     Ready step out. The offering seat names its settlements for traded pops when it offers (or
     takes a counter), a recipient when it accepts or counters, each by a map pick. In the
     preparation `currentPlayer` walks the seats still to
     seal, then the seats not yet Ready; once every seat has sealed the sheet is shared, with an
     Offer button that picks the offering seat and a Ready button per seat. The trade commands'
     simulation route in the parity maps names PR 2. `?dev=trade` and `?dev=assembly-trade` open
     the two screens.
2. **Bots trade; the bank goes.** Bots answer, counter and offer, on their turn and in the
   Assembly, with partner choice and pacing, and the sim routes each answer to its seat. A dev
   setting in the TUNE panel makes each seat human or a bot of a chosen personality (D4). The
   bank and base-food switches; the bank and the Exchange disc go and base food comes in; the
   rules guide's bank section becomes the no-bank rule. Carries code-health section 6: the
   forecast's bank code goes, and its calm and Dole run through the engine; the telemetry report
   becomes one cut function before trade's metrics are added. Checked by fixtures: a wood-rich
   seat short of food buys food from a food-rich seat that wants wood for a building; a bot
   refuses a deal worse than its best turn without it, and one that hands its partner
   Treasurer. Ends with the paired batches and a dated report; then the owner plays trade
   against bots, and the balance check follows.
   - As built: the bank stays in the engine behind `economy.bank.enabled`, off by default,
     so the batches can play the economy before trade; no screen offers it, and the
     command parity map classes its commands `batch-only`. Base food was
     `economy.baseFood`, an income line on every settlement that no year card zeroes. On
     2026-10-24 the owner removed it after the
     [balance batches](../reports/simulation/2026-10-24-balance-lines.md): it is now
     `economy.baseIncome`, one value per resource, all 0.
     The pacing reads the engine's count of each seat's offers in the trading window
     (`offersMade`), since a stateless bot cannot remember them. A bot offers only to
     rivals who hold its price, and also withdraws an offer every seat has answered, so
     the disc leaves a person's alarms row. The forecast's food and calm run the engine's
     Dole, bank and calm on its copy. The runner and the browser route by `nextActor`: an
     open offer's recipients answer first, bots before people. In the browser a bot's
     offer that names a person waits for their answer, and the sitting's recap waits for
     a person to close it. The fixtures set on the bank keep running on the economy before
     trade (`BEFORE_TRADE` in the test scenarios).

## Acceptance and validation

- The wood-for-food fixture trades, and the batches show that flow by material.
- A settled trade moves exactly the named goods and pops; anything else changes nothing; trades
  replay.
- The paired batches show what the bank's removal and base food did to food shortfalls, hunger,
  the Dole, the freeman share and gold.
- Playing against bots, the owner trades without help, on turns and in a sitting, and finds the
  offer card clear.

## Owner decisions

Answered by the owner on 2026-10-18, 19 and 21.

- **D1 · When does trade ship?** After the v2 merge; trade PRs go to `main`, and the balance
  check runs from this plan.
- **D2 · What can be traded?** Materials, gold, luxury goods, influence and pops. Never votes.
- **D3 · How many offers a turn?** No limit, and several can be open at once.
- **D4 · Can one person trade with bots?** Yes: the second PR adds a dev setting that makes each
  seat human or a bot (2026-10-21).
- **D5 · Who sees an offer?** Everyone, as at a Catan table.
- **D6 · Gifts and prices.** Each side gives at least one thing, at any ratio. No gifts.
- **D7 · When does the Assembly trade?** Only in the opening preparation, while seats draw and
  seal, until every seat presses Ready.
- **D8 · Can a citizen be traded in a sitting?** Yes, in the preparation, before any ballot; it
  votes for its new owner.
- **D9 · The bank.** Removed entirely, with no material swap in its place.
- **D10 · Base yields.** Every settlement makes 1 food. No base wood, stone or happiness for now.
- **D11 · Who answers an offer?** The seats it names, or every seat if it names none. Everyone
  still sees it.
- **D12 · How does an offer show?** As a disc on the alarms row that opens the compact card. No
  card takes over the screen, and a counter edits the card in place.
- **D13 · How many PRs?** Two: trade, then the bank's removal with the paired batches.
- **D14 · Does hotseat have a clock?** No (Q81). The ring fills with answers; seconds come with
  networked play.
- **D15 · Who gets an offer that several accept?** The first to accept: it trades at once, and a
  counter dies with the offer (2026-10-21).

## Retirement

When the second PR merges: replace the bank section of `rules.md` with the no-bank rule and base
food (the first PR adds its Trade section); update the Codex, [AI](../reference/ai.md) and
[simulation](../reference/simulation.md) references; move this plan to `docs/archive/plans/`
with its PRs and the trade report.
