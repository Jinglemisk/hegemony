---
status: proposed
phase: "post-v2"
updated: 2026-11-03
---

# Trade deals: goods, leases and recurring deals

## What this spec is

This spec guides a study. It is not a build plan. An agent reads it, studies the game and the
code, and proposes the best strategy: a recommendation for each open question below, worked
examples, and the questions only the owner can settle. Nothing here is built. The game keeps
today's rules (one-off trades; goods sold only to a seat with a Port beside them) until the
owner picks.

## Outcome

Players can make three kinds of deal:

- **A one-off trade**, as today.
- **A deal that repeats every year**, such as "2 food to you, 5 wood to me, every year".
- **A lease of a luxury good.** The Port holder lends the good and keeps owning it.

A player can always see their standing deals, end them easily, and know what moves, and when.

## Why

- **Leases (owner, 2026-11-03).** The owner wants goods leased, not only sold. A Port holder
  lends its good to a seat that has no Port, keeps owning it, and can cut it off. A lease lasts,
  so it reopens recurring deals, which were dropped on 2026-10-29.
- **Food.** In the [2026-10-24 balance batches](../reports/simulation/2026-10-24-balance-lines.md)
  no bot grew food to sell, and the trader lost 5.2 pops a game to hunger with gold in hand. A
  deal that repeats makes food a crop someone can grow for others.

## Settled inputs

**Owner, 2026-11-03:**

- **One-off trades** settle at once, as today.
- **A recurring deal settles once a year.** The owner's model, for seats A and B, where B plays
  two seats after A:
  1. On A's turn the deal is made, and both sides get their first exchange at once.
  2. On B's turn, nothing moves.
  3. On A's next turn the deal settles again, both sides at once. A's income shows it as lines
     (−2 food, +5 wood), and B's income shows the reverse.
- **Any party can end a deal.** How it ends is open (D below).
- **Goods.** Outright sale stays possible. The lease is new:
  - the Port holder keeps owning the good;
  - the borrower needs no Port;
  - the borrower cannot lend it on;
  - the lease ends if the owner's Port beside the good is destroyed.
- **Happiness under a lease is passive.** Happiness is a level counted off the board, with no
  stock. While the lease stands, the borrower gets the good's +2 and the owner does not. When it
  ends, the +2 goes back to the owner.
- **Bots will be able to end deals.** The owner's words: "we will add loan ending".
- **Destroying a Port.** The owner floated that a Port holder "may then destroy (?) the
  building". No demolish action exists today (D5).
- **Spec first.** These questions get their own spec and a study before any build.

**Owner, 2026-10-24** (the dropped recurring-deals plan, `c372d36^:docs/plans/recurring-deals.md`
in git):

- A deal has no duration. It stands until cancelled.
- Deals show as discs on the alarms row, one line each, for example "−3 food to Theron · +1
  stone from Theron".

**[Player trade](player-trade.md) decisions that hold:**

- D2: what trades.
- D5: every seat sees every offer.
- D6: no gifts.
- D7: the Assembly trades only in its preparation.
- D11: only the named seats answer.
- D12: offers are discs with a compact card.
- D14: no clock.
- D15: the first accept wins.
- That plan's non-goal "promises, loans or deals about later turns" is what this spec reopens.

**[Agency package](agency-package.md) ruling 7, the Port rule:**

- A good counts only while its holder has a Port beside it.
- A trade sends a good only to a seat with a Port beside it.
- The switch `{"economy":{"luxury":{"needsPort":false}}}` restores the old rule for comparisons.

## What exists today

These are facts for the study. Check them against the code before relying on them.

- **The turn.**
  - At its start: arriving pops land, the victory check runs, the luxury countdown ticks, and
    income is collected.
  - At its end: open offers close, hunger is settled, food is floored at 0, then the free card
    and the riot check run.
- **The year.**
  - Each seat plays once a year (four seats).
  - The opener moves on one seat each year.
  - In a sitting year the Assembly sits before the opener plays.
  - The game ends when the year deck runs out.
- **Income** lands at your own turn start, once a year. The realm sheet shows your projected net
  income per turn. Income may take food below zero during your own turn, because citizens eat at
  income.
- **One-off trade.**
  - Offers are discs on the alarms row.
  - Accepting rechecks both sides and moves everything at once.
  - Offers close at the offering seat's turn end.
  - Resources, influence, claimed goods, pops and held development cards (by count) trade.
- **Goods.**
  - There are seven goods. Each has one owner, recorded on the good.
  - One function moves ownership, so "one good, one owner" is checked in one place.
  - One selector lists the goods that count for a seat. Happiness, the Beloved laurel, the realm
    sheet, telemetry and the bots' valuation all read it.
  - Each good gives +2. A Blockade year zeroes the term.
  - When a seat's last Port beside a good falls, the good goes back to the board. Only a newly
    built Port claims it again.
- **No demolish action exists** for any building.
- **Bots.**
  - A bot accepts an offer that raises its score and hands no title to the offering seat.
  - It makes at most one offer a turn, for its shortfall.
  - It values goods by the count it holds.
  - Bots do not plan across years. The trade-acceptance estimate is agency ruling 11, still to
    build.
- **Engine rules.**
  - Automatic steps happen inside the single command transition and are derived from the state,
    so a replay matches the game.
  - State schema 29, command schema 11.

## Open questions for the study

For each question below, the study gives a recommendation and the options it weighed. Prefer the
simplest rule a player can say in one sentence.

### A. One model or three

- **A1.** Can one deal cover all three kinds? A deal has two sides, and each side is a list of
  lines. Each line is one of:
  - one-off (it moves when the deal is made);
  - yearly (it moves at each settlement);
  - a lease (a good lent for as long as the deal stands).

  A one-off trade is then a deal with no yearly line and no lease. Weigh one command path and one
  offer card against three separate features.

- **A2.** May one deal mix kinds? For example: "lend Pearls; 5 gold now and 2 gold a year".

### B. When a yearly deal settles

- **B1.** The owner's model settles both sides at once, on the turn of the seat that made the
  deal (A). Confirm it or improve it. Weigh:
  - B pays out of the stock it kept since its own turn. A pays out of this turn's income.
  - The opener moves on one seat each year, so A's next turn usually comes three turns later.
    Once every four years, when A goes from playing first to playing last, it comes seven turns
    later. Does that matter?
  - Hunger: food leaving B on A's turn lowers B's stock before B's turn-end hunger. Food
    arriving at B lands before B eats.
  - In a sitting year, does the deal settle before or after the Assembly?
  - The alternative: each side's lines move at its own income. A gets the wood on A's turn and B
    gets the food on B's turn. That is fairer on stock, but the two halves happen apart.
- **B2.** On A's turn, does the deal settle before or after A's own income?
- **B3.** In the Assembly's preparation any seat may offer. Whose turn anchors a deal made there?
- **B4.** The first exchange happens when the deal is made (owner). Does a settlement in the
  final year happen? Do deals close when the game ends?
- **B5.** Both seats' income shows the deal (owner). B's lines move on A's turn, not at B's
  income. How does B's income say that without confusing B? For example: "+2 food, on Theron's
  turn".

### C. When a side cannot pay

- **C1.** If a side is short when the deal settles, which of these happens?
  - The deal ends.
  - That year is skipped, and both seats are told.
  - The deal lapses after two misses.
  - Part of it is paid.
  - A debt is recorded. (That is a loan, which is out of scope.)
- **C2.** Does the check stay atomic, as a one-off trade's is? Then if either side is short,
  neither side moves.
- **C3.** Income may take food below zero on your own turn. May a deal take food below zero on
  another seat's turn?

### D. Ending a deal

The owner asks for the logical mechanic, given that any party can end a deal.

- **D1.** When does an end take effect?
  - **(a) At once, on your own turn, free.** Both halves move at the same moment, so between
    settlements nobody is owed anything. For swaps this is fair.
  - **(b) At the next settlement.** Ending cancels the next exchange, and a lent good comes back
    then. Everything paid is delivered in full.
  - **(c) At a price:** influence, happiness, or a notice period.
  - Weigh (a) for a lease paid yearly. The borrower pays a year at the settlement. An owner who
    ends the lease right after keeps a year's pay for a turn of +2. Is that a betrayal the table
    accepts, or should a lease end at its next settlement?
- **D2.** Either side may end a deal (owner). Only on its own turn, also in the Assembly's
  preparation, or at any time?
- **D3.** Forced ends: list them all. Known so far:
  - a side cannot pay (C);
  - the owner's last Port beside a lent good falls, and the good goes back to the board;
  - a seat loses its last settlement;
  - the game ends.
- **D4.** After an end, may the same two seats make the same deal again at once? See E9.
- **D5.** The owner floated destroying the building. Is a "demolish your own Port" action
  wanted, or is an End button enough? Demolishing a Port would release the good under the Port
  rule, not only end the lease.

### E. Goods

- **E1.** Sale and lease side by side. A sale still needs the buyer to have a Port beside the
  good; a lease does not. Confirm that sale keeps today's rule.
- **E2.** Is a lease paid once, yearly, or either (A2)?
- **E3.** Can the owner sell a good that is lent out? Does the lease end first, or pass to the
  buyer? Can the borrower buy the good if it has a Port beside it?
- **E4.** One good has one borrower at a time. To lend to someone else, the owner ends the lease
  first.
- **E5.** No sub-lease (owner). A borrower cannot offer the good at all.
- **E6.** Who "holds" a lent good, for each reader:
  - happiness: the borrower (settled);
  - the Beloved laurel: it reads happiness, so the borrower;
  - each seat's goods list;
  - telemetry;
  - the bots' valuation, which today counts goods owned;
  - the good's raft on the map, in the owner's colour or with the borrower shown.
- **E7.** A Blockade year zeroes the term, so the borrower gets nothing that year. Does the
  lease's yearly price still settle?
- **E8.** Under today's rule, a rival's Port beside a lent good claims nothing. Does that hold?
- **E9.** Milking. A human lends a good to a bot and takes the first payment, ends the lease
  next turn, and lends again. The bot pays every time. Any deal whose first exchange happens at
  once can be milked this way. Options:
  - a bot won't deal again this year with a seat that ended a deal with it;
  - a rule: the same two seats may not remake an ended deal for a year;
  - accept it until the bot overhaul.

### F. Scope and limits

- **F1.** What may recur: wood, stone, food, gold and influence. Pops travel and need room;
  development cards are a hidden hand. Proposed: neither recurs.
- **F2.** Must every deal stand until ended (owner, 2026-10-24), or is a fixed term ("for 3
  years") also wanted?
- **F3.** Limits on deals per pair or per seat. Proposed: none (D3 of player trade) unless the
  UI needs one.
- **F4.** A recurring offer to the table forms the deal with the first seat to accept (D15).
- **F5.** Counters work as they do for one-off offers.
- **F6.** The per-turn caps (the Dole, calm, the ladder, growing) do not touch trade. Confirm
  that.

### G. Seeing and managing deals

- **G1.** Where standing deals live:
  - one disc per partner on the alarms row (owner, 2026-10-24);
  - a deal card with End;
  - lines in the realm sheet's income (owner, 2026-11-03).
- **G2.** On the offer card, is "every year" set per line or per offer? A lease line reads
  "lend".
- **G3.** Notices for a deal that settles, misses, ends or breaks on a Port loss. Which are
  toasts and which are Chronicle lines only?
- **G4.** Is every deal public (D5), so every seat sees who has deals with whom?
- **G5.** How a lent good shows in both seats' goods lists and on the map.

### H. Bots and the sim

- **H1.** Bots must:
  - value a yearly deal over the years left;
  - value a lease's +2 over its expected life;
  - answer, offer and end deals (owner: bots end loans).

  Is this the feature's own work, or the bot overhaul's ([roadmap](../roadmap.md) step 11)?
  Until then, bots get only legality fixes (owner, 2026-11-02).

- **H2.** Telemetry:
  - deals made, settled, missed and ended, by kind;
  - goods lent;
  - food moved by deals.
- **H3.** A ruleset switch that turns deals and leases off, for comparison batches.
- **H4.** Should a bot with plains grow food to sell under a deal? That is bot tuning, and it
  needs the owner's OK.

### I. Engine shape

The study confirms these points; they are not choices for the owner:

- Standing deals on the state, each with:
  - an id;
  - its two seats and its lines;
  - the seat whose turn anchors it;
  - the year it was made and the year it last settled.
- A lease may be a "lent to" field on the good, instead of a deal line.
- Schema bumps.
- The recurring and lease options ride on the existing offer command; End is a new command.
- Settlement is derived inside the transition, atomic and logged.
- Deals are public in every projection.

## What the study delivers

1. **A recommendation for every question above,** with the options weighed and why. The simplest
   rule wins ties.
2. **Three worked examples, turn by turn:**
   - Seats 1 and 3 trade 2 food for 5 wood every year. The deal is made on seat 1's turn in
     year 3 and runs four years, through an opener rotation, an Assembly year and a year in
     which seat 3 is short of wood.
   - Theron lends Pearls for 2 gold a year to Kyros, who has no Port. Theron ends the lease
     mid-year. In a second run, Theron's Port burns in a riot while Pearls is lent.
   - A human lends a good to a bot, ends the lease, and lends again.
3. **The questions that need the owner,** filed in [questions.md](../questions.md) with options,
   a recommendation and an empty Answer slot.
4. **PR slices,** each with its cost in engine, UI and bots.
5. **Nothing built and no sim batches** without the owner's go.

## Non-goals

- Loans of resources, credit and interest.
- Deals with the bank (D9: there is no bank).
- Networked play's timers and disconnect rules.
- Any change to how one-off trades behave.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                      |
| ---------------- | -------- | -------------------------------------------------------------------------------------- |
| Engine / backend | Yes      | Standing deals, leases, settlement, ending, forced ends, schema bumps; after the study |
| Frontend         | Yes      | The offer card's options, partner discs, the deal card with End, income lines          |
| Simulation & AI  | Yes      | Legality now; valuing, offering and ending deals with the bot work (H1); telemetry     |

## Retirement

When the owner has answered the study's questions, this spec becomes the build plan, or the
study replaces it with one. After the build ships, fold the rules into `rules.md` and the
rulebook, and move the plan to `docs/archive/plans/`.
