---
status: ready
phase: "post-v2"
updated: 2026-11-25
---

# The development deck and the card system: second pass

## Outcome

The development deck, the player event cards and the year cards are balanced against each
other and against trade, and the bots play every card well. The deck's rules as they ship
today are in the player guide, [`rules.md`](../../rules.md) "Development cards"; this page
holds only what is decided for the second pass and what is still open.

## Decided

**Standing rules for the deck** (owner rulings; number tuning may change counts, not kinds):

- One deck, one price, bought with gold only, one buy a turn. No split decks by kind: hand
  counts and card trades would give away what a hand holds, and a resource deck at a fixed
  price would bring the bank back.
- Held cards are closed. The count each seat holds is public; the cards are not. A card offer
  names a count, and the giver picks which at settlement.
- Yields count the realm: per settlement, or per pop with every pop counted, slaves included.
  Flat yields are rare and give 5. No card gives +1 of a resource.
- Food per pop is the only per-pop card among the materials. Civic Feast is the one influence
  card.
- A fifth of the deck acts on rivals.
- The scaling stays, though a late draw is worth about 1.4 times as much to the largest realm
  as to the smallest. Rival cards find the leader and the +5 cards help the small realm.
- Not in the deck: an influence deck, cards that give gold, cards that grant votes, cards that
  give or take a title.

**The price.** Keep 2 gold. If the batches show every seat buying every turn and trade
volume falling, raise the price to 3 first, then cut Caravan.

**What a draw is worth**, for reading the batches. Counted in materials (food, wood, stone
at 1; influence at 1/3, the Dole's rate; a pop at its grow price), the whole deck averages
about 3.2 a draw in year 2, 3.6 in year 7 and 3.9 in year 12, against about 2 materials that
2 gold buys at the table. Reaching the free card's +3 costs two working slaves for each level
short: from +2 it pays, from +1 it is about even, from 0 it loses. So it rewards a realm
already near +3 and should not pay a realm to empty its slave stack. The figures come from the
[balance check](../reports/simulation/2026-10-26-balance-check.md)'s mean seats.

## Open

**Close-out of the first pass.**

- The owner's hotseat game: the table buys, plays and trades cards, and uses the year
  forecast, a declined pop card, a kept Law and the turn caps, without help.

**Balance batches** (on the owner's go, after the bots' first work in the
[bots plan](outcome-driven-ai.md)):

- The deck against Ventures, at the pinned pre-deck commit `d6ebecd`.
- The free card and the riot's card switched off, apart and together (ruleset switches
  `devCards.freeCard` and `devCards.riotCard`).
- Read by personality: cards bought, drawn free, played, traded and lost to riots; gold spent
  on cards; turns at +3 or higher; slaves held; happiness.
- Trade volume against the batches before the deck, to check the deck does not replace
  trade.
- The balance check's influence-growth rule (median at most +5 a year from year 10) with
  Civic Feast in; one late draw is about 14 influence.
- The year-5 income leader rule with the scaling cards in.

**Bots.**

- Card trading: bots put no card in a trade, decline an offer that asks them for one, and
  count a card they would receive as worth nothing.
- The forecast charges a riot's pops at the pop's weight and does not yet price a held card
  standing in for one.
- A card's value is its flat material value at the seat's weights, not a forecast of when it
  is best played.

**The rest of the card system.** Player event cards and year cards get the same pass: their
balance against the deck and against each other. Scope and order are for the owner when the
pass starts.

## Three-axis parity

- **Engine / backend:** the deck, hands, free card, riot's card and card trades are built;
  the second pass changes counts and prices as ruleset data, with version bumps.
- **Frontend:** any change to a card's text or count shows on the card faces, the hand and
  the Codex chapter; `rules.md` follows.
- **Simulation & AI:** bots trade cards and price a card as riot cover; telemetry above;
  paired, seat-rotated batches.
