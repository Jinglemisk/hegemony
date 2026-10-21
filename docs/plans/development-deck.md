---
status: proposed
phase: "post-v2"
updated: 2026-10-21
---

# Development deck

## Outcome

Gold buys development cards. A realm that sells its resources, or runs freemen, turns its gold
into a hand of cards it plays one a turn: small yields (foraging, a fishing creek, a
smallholding), actions, and moves against rivals. Cards are held face down and can be traded,
honestly or not. A realm at happiness +3 or higher draws one free at the end of its turn, the
mirror of the riot at −3, so happiness pays above zero. The deck replaces Ventures.

## Non-goals

- An influence deck. Influence keeps the Assembly, the Dole, calm, Ideas and votes.
- Strong cards. No card gives anything like +5 of a resource; see the power budget.
- Cards that grant votes. Votes never trade, and cards do.
- Bots that bluff or read table talk.

## Settled inputs

- Owner, 2026-10-18 and 19:
  - Ventures become the development deck, and a broader thing: small-scale enterprise, people
    foraging, small farms, a fishing creek.
  - Bought with gold only.
  - Cards are always closed: held face down, secret from the table.
  - Cards trade between players. An offer says "a card", never which; the giver picks at
    settlement, so a seat can promise one card and hand over another.
  - A card is never played on the turn it was drawn or received, and at most one card is played
    a turn.
  - Most cards give +1 of something or an effect; +2 and +3 are rare. Strong cards would make
    "hold luxuries, keep no slaves, farm free cards" the best plan.
  - At the end of your own turn, a level of +3 or higher, calm not counted, draws one free card.
  - No vote cards. No base happiness for now.
  - A riot may take a random card in place of a pop ([Q82](../questions.md), B). Revolts are
    unchanged.
- The bank is removed and every settlement makes 1 food ([player trade](player-trade.md), D9 and
  D10).

## Rules (proposed)

**Buying.** Once a turn, after the event card, pay 2 gold and draw the top card into your hand.
2 gold is today's Venture stake, a placeholder for number tuning. The discards reshuffle when the
deck runs out.

**Holding and playing.** The hand is face down, with no limit. On your turn you may play one card
you did not draw or receive this turn. It resolves at once and goes to the discards. The table
sees a card when it is played, never before.

**The free card.** At the end of your own turn, at the riot check, a level of +3 or higher without
calm draws one card, playable from your next turn. In the [rotated batch of
2026-10-19](../reports/simulation/2026-10-19-v1-vs-v2.md), 1.1% of turns sat at +3 or higher, 22 of
the 24 with a luxury. The reward bites only if realms keep fewer slaves to reach it.

**Riots.** For each pop a riot would take, you may discard a card drawn at random from your
hand instead. You choose per pop, before the draw. The slaves stay, so the riot comes back
next turn: cards buy time but do not fix the level. A revolt still costs half your slaves.

**Trading.** Cards trade under the [player trade](player-trade.md) rules. An offer names a number
of cards, not which. The giver picks at settlement; only giver and receiver see the cards.

**Power budget.** A common card is worth about one slave's output for one turn: +1 of a
resource, a pop grown, an Unrest token cleared. +2 and +3 cards are rare. Some cards act on a
rival, such as taking one of a resource from a rival of your choice. Slice 1 drafts the list for
the owner's review before it is built. The Colonists' Voyage's settler becomes a card; the three
Venture tables and the Fund an expedition verb go.

## Hotseat now, network later

Hotseat: your hand shows only on your own turn, behind your turn notice. A card you receive
appears there on your next turn, when it becomes playable. A seat giving a card off its turn
picks it behind a short handover ("Damon, choose a card; the others look away"), the one new
private moment. Networked (later): hands are private to each seat and no handover is needed.

## Bots

- A bot values an unseen card at the deck's average under its own weights, and a card in its
  hand at that card's value.
- It buys when the average card outscores 2 gold and the buy does not delay the purchase it is
  saving toward (Step 20).
- It plays its best card when that beats holding it.
- In a riot it pays a card for a pop when the average card in its hand is worth less than the
  pop.
- The scorer adds the value of a free card a turn to being at +3 or higher, so a bot weighs a
  slave against the card. This is what should end riding the riot line at −2; the batches
  measure it.
- Bots trade cards at the average value. They never bluff.

## The sim

Telemetry per seat and personality: cards bought, drawn free, played, traded and lost to riots, by
kind; gold spent on cards; turns at +3 or higher; slaves held. Paired batches on the same seeds: the
deck against Ventures, then the free card on and off, read against the [rotated batch of
2026-10-19](../reports/simulation/2026-10-19-v1-vs-v2.md) (slaves 50% of pops, median level −2).

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                                                                                       |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | Yes      | Draw pile, discards and per-seat hands on the match state; buy and play with derived legal options; the not-this-turn rule; the free-card check beside the riot check; cards in trade settlement; tests |
| Frontend         | Yes      | Buy a card in place of Venture on the Civic disc; the hand on your own turn; play and its result; the free-card toast; the giver's private pick; Chronicle line; Codex chapter; browser test            |
| Simulation & AI  | Yes      | Bots buy, hold, play and trade through legal commands on their own projection, which hides rivals' hands; card valuation; telemetry and reach counts; use and avoid fixtures; paired batches            |

## Architecture impact

- Deck content and price are ruleset data, with version and schema bumps; older saves are
  rejected, as today.
- Hands are hidden per-seat holdings. Player projections redact rivals' hands and the draw order;
  the deck is seeded, so replays hold.
- Each card instance has a stable id. Draw pile, discards and hands together always hold the
  whole deck; tests prove it.
- A card trade settles with the giver's pick, made by the giver as actor, through the trade
  workflow.

## PR slices

1. **The deck replaces Ventures.** The card list, drafted to the power budget and reviewed by the
   owner first; buy, hold, play one a turn, never on the turn drawn; hidden hands in the
   projections; Chronicle and Codex; bots buy and play. Checked by engine tests (conservation,
   the not-this-turn rule, redaction), a browser test, and a batch against Ventures.
2. **Happiness and the hand.** The free card at +3, a riot taking a card in place of a pop,
   and the bots' value of both, with a dated report on slaves and happiness by personality.
3. **Card trading.** Closed cards in the trade composer, the giver's pick, not playable the turn
   received; bots trade cards. Needs player trade's first PR.
4. **Close-out.** The rules guide, the Codex and the owner's hotseat playtest.

Both player trade PRs come first, since they remove the bank and add base food. Step 11
runs after both plans.

The [code-health plan](code-health.md) leaves the Venture code alone, so slice 1 deletes it
whole: the Colonists' Voyage (and its room bug), the bots' `ventureOutcomes`, the venture verb,
and `EventTableModal` if nothing else mounts it. Slice 2 builds on the single riot and revolt
outcome function from code-health's first PR. It replaces the bots' hand-read riot table
(`expectedRiot`) with the engine's table lookup, and the riot screen shows every effect of the
row it lands on, reads the insurance modifier and the die from data, and shows insurance reasons.

## Acceptance and validation

- The deck is conserved, hands never leak to another seat's projection, and the not-this-turn
  rule holds for cards drawn and received.
- The batches report slaves, happiness, gold spent and cards played by personality, with the
  free card on and off.
- In a hotseat playtest the table buys, plays and trades cards without help.

## Retirement

When slice 4 merges: replace the Ventures section of `rules.md` with a Development cards section;
update the Codex, [AI](../reference/ai.md) and [simulation](../reference/simulation.md)
references; move this plan to `docs/archive/plans/` with its PRs and reports.
