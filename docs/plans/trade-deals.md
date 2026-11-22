---
status: active
phase: "post-v2"
updated: 2026-11-05
---

# Trade deals: goods, leases and recurring deals

## Where this stands

Built 2026-11-05: the rules and the interface. The owner answered the timing question on
2026-11-05, so the planned study was skipped. Left: the bots, which decline every deal for now.

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
  3. On A's next turn the deal settles again. A's income shows it as lines (−2 food, +5 wood),
     and B's income shows the reverse. On 2026-11-05 the owner took each seat settling at its
     own income over both at once on A's turn (Rules as built).
- **Any party can end a deal.**
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
  building". Not built: End is the way out (owner, 2026-11-05).

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

## Rules as built (owner, 2026-11-05)

- **One deal, three rows.** An offer card has Now, Every year and On loan rows on each side. A
  trade with a yearly line or a lent good leaves a standing deal between its two seats.
- **Timing.** The trade is this year's exchange for both seats, the yearly lines included. From
  the next year each seat settles once a year at its own income: it pays its own line and takes
  its partner's, and both show in its income. No stock moves on another seat's turn. A deal made
  in the Assembly's preparation counts as that year's exchange too.
- **What repeats:** wood, stone, food, gold and influence. Pops and cards trade once only.
- **Short payment.** A seat that cannot cover its line pays what it holds. At its partner's next
  income the partner answers: keep (take what was paid, pay its own line in full) or cancel (the
  deal ends at once, nothing more moves). The partner's turn cannot end until it answers.
- **Ending.** Either seat ends a deal on its own turn or in the Assembly's preparation. The year
  runs out: a seat that has not settled this year still does. Then the deal closes, and its lent
  goods go back.
- **Leases.** A lent good stays its owner's for the Port rule and for trade; the borrower needs
  no Port and counts its happiness. One borrower at a time; it is not sold, traded or lent on
  while lent. A one-turn loan goes back at the end of the borrower's next turn, or of this one
  when the borrower made the deal on its own turn. A standing loan lasts until the deal ends.
  When the owner's last Port beside it falls, the good goes back to the board and the deal ends
  at once. A Blockade year zeroes the good for whoever holds it.
- **Seeing deals.** Each of a seat's deals is a disc on its alarms row, in the partner's glaze,
  loud while a short payment waits. Its card shows the yearly lines, the loans and the seat's
  next income from the deal, with End, and the keep-or-cancel question.
- **No demolish action.** The way out of a deal is End.
- **Bots** decline any offer with yearly lines or a loan, so no bot holds a deal.

## What is left

- **Bots** (with the bot work, roadmap step 5): value a deal over the years it runs, offer and
  accept deals, end loans, and answer short payments. Until then a human cannot milk a bot,
  because bots take no deals.
- **Telemetry** of deals made, settled, ended and paid short, once bots make them.

## Non-goals

- Loans of resources, credit and interest.
- Deals with the bank (D9: there is no bank).
- Networked play's timers and disconnect rules.
- Any change to how one-off trades behave.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                      |
| ---------------- | -------- | -------------------------------------------------------------------------------------- |
| Engine / backend | Yes      | Built: deals on the state (v30), settlement at income, ending, leases; `deals.test.ts` |
| Frontend         | Yes      | Built: the card's three rows and lease pick, deal discs and card, income lines         |
| Simulation & AI  | Yes      | Bots decline deal terms now; valuing, offering and ending deals with the bot work      |

## Retirement

The rules are in `rules.md` and the rulebook. When bots make deals, move this plan to
`docs/archive/plans/`.
