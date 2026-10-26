---
status: proposed
phase: "post-v2"
updated: 2026-10-26
---

# Development deck

## Outcome

Gold buys development cards. A realm that sells its resources, or runs freemen, turns its gold
into small yields (foraging, a fishing creek, a smallholding) that land the moment they are
drawn, and into a hand of cards it plays one a turn: settlers, calm, and moves against rivals.
Held cards are face down and can be traded, honestly or not. A realm at happiness +3 or higher
draws one free at the end of its turn, the mirror of the riot at −3, so happiness pays above
zero. The deck replaces Ventures, and with no bank it is the one way gold becomes materials
without a trading partner.

## Non-goals

- An influence deck. Influence keeps the Assembly, the Dole, calm, Ideas and votes.
- Strong cards. No card gives anything like +5 of a resource; see the power budget.
- Cards that grant votes. Votes never trade, and cards do.
- Victory-point cards (owner, 2026-10-26). No card gives or takes a title.
- Cards that give gold or influence. Gold buys the deck, and influence has its own uses.
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
  - A riot may take a random card in place of a pop (the old Q82, answered B on 2026-10-19).
    Revolts are unchanged.
- Owner, 2026-10-26:
  - The card list is drafted here, below, for the owner's review.
  - A fifth of the deck acts on rivals.
  - A card costs 2 gold.
  - The free card comes at a level of +3.
  - The number of held cards each seat has is public; the cards are not.
  - Many cards resolve the moment they are drawn ("+1 wood", used at once) and are never held.
  - No victory-point cards.
- The bank is removed ([player trade](player-trade.md), D9). Base food was set to 0 on
  2026-10-24, so food comes from the land, trade, the Dole and these cards.

## Rules (proposed)

**Buying.** Once a turn, after the event card, pay 2 gold and draw the top card. 2 gold is the
Venture stake today; number tuning may move it. One deck of 40 serves the table, and the discards
reshuffle when it runs out.

**Two kinds of card.**

- **Yields** resolve the moment they are drawn: the table sees the card, you take what it
  gives, and it goes to the discards. A yield is never held, traded or lost to a riot, and it does
  not use the turn's play. Half the deck.
- **Held cards** go into your hand, face down. Half the deck: your own actions, and the rival
  cards.

**Holding and playing.** The hand has no limit. Everyone sees how many held cards each seat has,
never which. On your turn you may play one held card you did not draw or receive this turn. It
resolves at once and goes to the discards; the table sees it then.

**The free card.** At the end of your own turn, at the riot check, a level of +3 or higher without
calm draws one card. A yield lands at once; a held card is playable from your next turn. Levels
sit near 0 today: the [balance check](../reports/simulation/2026-10-26-balance-check.md) reads a
year-14 mean of −0.2 and −0.1 on its masters tables and −0.6 on the mixed table, so +3 is rare
until a realm keeps fewer slaves or holds goods. Slice 2 measures how often it is reached.

**Riots.** For each pop a riot would take, you may discard a held card drawn at random from your
hand instead. You choose per pop, before the draw. The slaves stay, so the riot comes back
next turn: cards buy time but do not fix the level. A revolt still costs half your slaves.

**Trading.** Held cards trade under the [player trade](player-trade.md) rules. An offer names a
number of cards, not which. The giver picks at settlement; only giver and receiver see the cards.

**Rival cards.** A fifth of the deck. You pick the rival when you play the card. A rival card
cannot take what the rival does not have: Raiders names a resource the rival holds, and an
Informer against an empty hand is not a legal play.

## The card list

A common card is worth about one slave's output for one turn: +1 of a resource, a pop grown, an
Unrest token cleared. +2 and +3 are rare (6 of 40). No card gives gold or influence. Names and
counts are a draft for the owner's review; number tuning may change the counts, not the kinds.

| Card              | Kind  | Count | Effect                                                                 | Engine effect today                 |
| ----------------- | ----- | ----- | ---------------------------------------------------------------------- | ----------------------------------- |
| Foraging          | Yield | 6     | +1 food                                                                | `resourceDelta`                     |
| Woodcutters       | Yield | 4     | +1 wood                                                                | `resourceDelta`                     |
| Quarry gang       | Yield | 4     | +1 stone                                                               | `resourceDelta`                     |
| Fishing creek     | Yield | 2     | +2 food                                                                | `resourceDelta`                     |
| Timber raft       | Yield | 1     | +2 wood                                                                | `resourceDelta`                     |
| Smallholding      | Yield | 1     | +1 food and +1 wood                                                    | `resourceDelta` twice               |
| Bountiful harvest | Yield | 1     | +3 food                                                                | `resourceDelta`                     |
| Rich seam         | Yield | 1     | +3 stone                                                               | `resourceDelta`                     |
| Caravan           | Held  | 4     | +1 wood, stone or food, your choice when played                        | new: a choice                       |
| Settlers          | Held  | 3     | A freeman in one of your settlements with room (the Colonists' Voyage) | `addPops`                           |
| Captives          | Held  | 2     | A slave in one of your settlements with room                           | `addPops`                           |
| Festival day      | Held  | 3     | Clear one of your Unrest tokens                                        | `unrestTokens` clearOne             |
| Raiders           | Rival | 4     | Take 1 wood, stone, food or gold from a rival of your choice           | new: a transfer between seats       |
| Agitators         | Rival | 2     | A rival of your choice places an Unrest token                          | `unrestTokens` placeOne, retargeted |
| Informer          | Rival | 2     | A rival of your choice discards one held card, drawn at random         | new: a discard from a hand          |

Yields are 20 cards, own held cards 12, rival cards 8. The three Venture tables and the Fund an
expedition verb go; the Colonists' Voyage lives on as Settlers.

## Hotseat now, network later

Hotseat: your hand shows only on your own turn, behind your turn notice; every seat's count of
held cards shows to all. A yield shows to the table as it lands. A card you receive appears in
your hand on your next turn, when it becomes playable. A seat giving a card off its turn
picks it behind a short handover ("Damon, choose a card; the others look away"), the one new
private moment. Networked (later): hands are private to each seat and no handover is needed.

## Bots

- A bot values an unseen card at the deck's average under its own weights, yields included, and
  a card in its hand at that card's value.
- It buys when the average card outscores 2 gold and the buy does not delay the purchase it is
  saving toward (Step 20).
- It plays its best card when that beats holding it. It aims a rival card by the same rival lens
  as its Assembly play: its own gain against the strongest rival's, counting what the leader
  loses, so rival cards tend to find the leader.
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

1. **The deck replaces Ventures.** The card list above, once the owner has reviewed it; buy,
   yields on the draw, hold, play one a turn, never on the turn drawn; the rival cards; public
   hand counts and hidden hands in the projections; Chronicle and Codex; bots buy, play and aim.
   Checked by engine tests (conservation, the not-this-turn rule, redaction), a browser test, and
   a batch against Ventures.
2. **Happiness and the hand.** The free card at +3, a riot taking a card in place of a pop,
   and the bots' value of both, with a dated report on slaves and happiness by personality.
3. **Card trading.** Closed cards in the trade composer, the giver's pick, not playable the turn
   received; bots trade cards. Needs player trade's first PR.
4. **Close-out.** The rules guide, the Codex and the owner's hotseat playtest.

Both player trade PRs are merged, and the
[balance check](player-trade.md#the-balance-check) ran after them and before this plan (owner,
2026-10-25; [report](../reports/simulation/2026-10-26-balance-check.md)).

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
