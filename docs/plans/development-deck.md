---
status: proposed
phase: "post-v2"
updated: 2026-10-29
---

# Development deck

## Outcome

Gold buys development cards. A realm that sells its resources, or runs freemen, turns its gold
into yields that land the moment they are drawn and grow with the realm (foraging in every
settlement, a harvest for every pop, now and then a timber raft of 5), and into a hand of cards
it plays one a turn: settlers, calm, and moves against rivals. Held cards are face down and can be traded, honestly or not. A realm at happiness +3 or higher
draws one free at the end of its turn, the mirror of the riot at −3, so happiness pays above
zero. The deck replaces Ventures, and with no bank it is the one way gold becomes materials
without a trading partner.

## Non-goals

- An influence deck. Influence keeps the Assembly, the Dole, calm, Ideas and votes.
- Small flat yields. No card gives +1 of food, wood or stone (owner, 2026-10-29).
- Cards that grant votes. Votes never trade, and cards do.
- Victory-point cards (owner, 2026-10-26). No card gives or takes a title.
- Cards that give gold or influence. Gold buys the deck, and influence has its own uses.
- Bots that bluff or read table talk.
- Split decks, by kind and each at its own price (owner, 2026-10-26). The table would see which
  deck a seat bought from, so hand counts and card trades would give away what a hand holds, and
  a resource deck at a fixed price would bring back the bank.

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
    "hold luxuries, keep no slaves, farm free cards" the best plan. (The +1 cards were replaced
    on 2026-10-29, below; the fear stands and is checked under the card list.)
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
  - One deck at one price.
  - Food, wood and stone each have the same ladder of yields: +1 cards, one +2, one +3. (The
    rungs changed on 2026-10-29, below; the same-ladder rule stands.)
- Owner, 2026-10-29, answering Q86 ("the development cards feel lackluster"; the owner, the day
  before: "i pay 2 gold to buy a devcard and it gives me 1 wood?"):
  - "Yes let us add more cards like +1 food per settlement or even per pop, food per pop should
    be a very neat draw. reduce the number of +1 wood etc. significantly, make them rarer and
    make them +5 wood stone etc. lets not waste time with +1 resources"
  - Read as: most yields count the realm, per settlement or per pop; flat yields are rare and
    give 5; no card gives +1 of a resource. Q86's other option, more held cards played at a
    chosen moment, was not taken up, so the held cards stay as drafted.
  - The problem Q86 put: the common card cost 2 gold, two turns of a freeman who eats a food
    each turn, and gave +1 of a material, one turn of a slave. The old yields averaged 0.73 a
    draw.
- The bank is removed ([player trade](player-trade.md), D9). Base food was set to 0 on
  2026-10-24, so food comes from the land, trade, the Dole and these cards.

## Rules (proposed)

**Buying.** Once a turn, after the event card, pay 2 gold and draw the top card. 2 gold is the
Venture stake today; number tuning may move it. One deck of 40 serves the table, and the discards
reshuffle when it runs out. The [value check](#what-a-draw-is-worth) under the card list
recommends keeping 2 gold.

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

Reworked on 2026-10-29 from Q86's answer (settled inputs, above). A yield counts the realm: +1
of a resource for each of your settlements, or for each pop. Flat yields are rare and give 5. No
card gives +1 of a resource. Food, wood and stone have the same ladder: per-settlement cards, one
per-pop card and one +5. Food has the most per-settlement cards, since base food is 0. No card
gives gold or influence. Names and counts are a draft for the owner's sign-off; number tuning may
change the counts, not the kinds.

Settlements are your capital, cities and colonies. Pops are every slave, freeman and citizen in
your realm, those on the move included (an open point, below).

| Card              | Kind  | Count | Effect                                                                                 | Engine effect today                   |
| ----------------- | ----- | ----- | -------------------------------------------------------------------------------------- | ------------------------------------- |
| Foraging          | Yield | 6     | +1 food for each of your settlements                                                   | new: a yield that counts settlements  |
| Woodcutters       | Yield | 4     | +1 wood for each of your settlements                                                   | new: a yield that counts settlements  |
| Quarry gang       | Yield | 4     | +1 stone for each of your settlements                                                  | new: a yield that counts settlements  |
| Bountiful harvest | Yield | 1     | +1 food for each pop in your realm                                                     | new: a yield that counts pops         |
| Felled grove      | Yield | 1     | +1 wood for each pop in your realm                                                     | new: a yield that counts pops         |
| Rich seam         | Yield | 1     | +1 stone for each pop in your realm                                                    | new: a yield that counts pops         |
| Tunny run         | Yield | 1     | +5 food                                                                                | `resourceDelta`                       |
| Timber raft       | Yield | 1     | +5 wood                                                                                | `resourceDelta`                       |
| Marble block      | Yield | 1     | +5 stone                                                                               | `resourceDelta`                       |
| Caravan           | Held  | 4     | +1 wood, stone or food for each of your settlements, one kind, your choice when played | new: a choice that counts settlements |
| Settlers          | Held  | 3     | A freeman in one of your settlements with room (the Colonists' Voyage)                 | `addPops`                             |
| Captives          | Held  | 2     | A slave in one of your settlements with room                                           | `addPops`                             |
| Festival day      | Held  | 3     | Clear one of your Unrest tokens                                                        | `unrestTokens` clearOne               |
| Raiders           | Rival | 4     | Take up to 3 of one resource a rival of your choice holds: wood, stone, food or gold   | new: a transfer between seats         |
| Agitators         | Rival | 2     | A rival of your choice places an Unrest token                                          | `unrestTokens` placeOne, retargeted   |
| Informer          | Rival | 2     | A rival of your choice discards one held card, drawn at random                         | new: a discard from a hand            |

**What changed.** Flat yields go from 20 cards (fourteen +1s, three +2s, three +3s) to 3, all
+5. Scaling yields go from none to 17: 14 per settlement, 3 per pop. Caravan and Raiders were +1
cards too, so the same rule moved them: Caravan counts settlements, Raiders takes up to 3. The
held cards and the split (20 yields, 12 own held, 8 rival) are unchanged, so the deck keeps its
40 cards. The three Venture tables and the Fund an expedition verb go; the Colonists' Voyage
lives on as Settlers.

### What a draw is worth

Counted in materials: food, wood and stone at 1 each; a pop card at its grow price (a freeman 3
food, a slave 2); Festival day at 1; Raiders at the 3 it takes; Agitators and Informer at 0,
since they cost a rival and pay you nothing. Settlements and pops are the mean seat at the end of
years 2, 7 and 12 across the [balance check](../reports/simulation/2026-10-26-balance-check.md)'s
three batches (280 games, 1,120 seats).

| Stage         | Settlements | Pops | Yields alone, a draw | Whole deck, a draw | Old list, a draw |
| ------------- | ----------: | ---: | -------------------: | -----------------: | ---------------: |
| Early, year 2 |         3.8 |  9.4 |                  2.4 |                3.5 |              1.3 |
| Mid, year 7   |         4.4 | 11.7 |                  2.8 |                3.9 |              1.3 |
| Late, year 12 |         5.0 | 14.5 |                  3.2 |                4.4 |              1.3 |

A pass through the deck lands 14 × settlements, plus 3 × pops, plus 15 from the yields, and 4 ×
settlements, plus 28, from the held and rival cards. The old list's yields were 0.73 a draw at
every stage.

- **Against 2 gold.** At the table's trade prices (the
  [trade batches](../reports/simulation/2026-10-22-trade-paired.md): a material about 1 gold,
  food sold for gold at 2), 2 gold buys about 2 wood or stone, or 1 food. The old list paid less
  than that; the new one pays about twice it.
- **Against the freeman chain.** Two freemen make 2 gold a turn and eat 2 food. On the old list
  a draw returned 1.3 for the 2 food eaten, a loss. On the new list it nets 1.5 early and 2.4
  late, about one material a freeman-turn: a slave's output without the slave's happiness cost.
  One buy a turn caps this at the first two freemen.
- **Single draws, mid-game.** Foraging 4.4 food, Bountiful harvest 11.7 food, a +5 card 5.
- **Leader and laggard, late.** In the median game at year 12 the largest realm has 6
  settlements and 19 pops, the smallest 4 and 10: a draw is worth 5.2 against 3.6. The +5 cards
  are worth the most to the small realm.

**The price.** Keep 2 gold. At 3 gold an early draw (3.5) is barely more than 3 gold buys at the
table, which is the lackluster card again. The one-buy-a-turn rule caps the deck more than the
price does. If slice 1's batch shows every seat buying every turn and trade volume falling under
the 2026-10-22 batches, raise the price to 3 first, then cut Caravan.

**The two fears.**

- _A deck that beats player trade brings the bank back._ By value it does beat trade: a draw is
  worth about twice what its gold buys at the table. It does not work like the bank. A seat buys
  once a turn, so a store of 40 gold still goes in 2 at a time. The kind is drawn, not chosen:
  only Caravan (4 of 40) picks one, so a seat short of wood gets wood on about a quarter of its
  draws and trades the rest. Gold only goes in: the bank bought and sold every material for gold,
  which fixed a price for each; the deck puts a floor under gold's worth and prices no material.
  Slice 1's batch compares trade volume with the 2026-10-22 batches.
- _Strong free cards at +3 make "hold luxuries, keep no slaves, farm cards" the best plan._ A
  free card is worth 3.5 to 4.4 a turn. Reaching +3 from a level of L costs 2 × (3 − L) working
  slaves, one material each a turn. From +2 it pays (2 slaves for about 4); from +1 it is about
  even (4 for 4); from 0, where realms sit today, it loses (6 for 4). So the free card rewards a
  realm already near +3 and does not pay a realm to empty its slave stack. Under the old list it
  never paid for even two slaves. Late, for the largest realm (5.2 a card), the gap from 0 nearly
  closes; slice 2's batches read slaves held and turns at +3 by personality.

### Open points for the owner

1. **Per pop counts every pop**, slaves included, as the owner's words read. Counting only
   freemen and citizens would make Bountiful harvest exactly one turn's food bill (4.8 food at
   year 7 instead of 11.7) and stop it paying for slave stacks.
2. **Wood and stone have a per-pop card too**, by the same-ladder rule. If food per pop should
   be the only one, Felled grove and Rich seam become a Woodcutters and a Quarry gang.
3. **Caravan and Raiders changed** under "no +1 resources". If the rule was meant for yields
   only, both go back to +1.
4. **Scaling cards feed the leader**: late, the largest realm's draw is worth about 1.4 times
   the smallest's. Rival cards aim at the leader and the +5 cards help the small realm; the
   batches read the year-5 income leader rule with the deck in.

### Suggestions, not in the list

Q86's option B, more held cards played at a chosen moment, was not taken up. If the owner wants
one later, this one adds a choice of when to build and needs one new engine effect, a discount:

- **Master builder** (held): your next building or colony upgrade this turn costs 2 less wood or
  stone. It would replace a Captives, which feeds the slaver's riot habit.

## Hotseat now, network later

Hotseat: your hand shows only on your own turn, behind your turn notice; every seat's count of
held cards shows to all. A yield shows to the table as it lands. A card you receive appears in
your hand on your next turn, when it becomes playable. A seat giving a card off its turn
picks it behind a short handover ("Damon, choose a card; the others look away"), the one new
private moment. Networked (later): hands are private to each seat and no handover is needed.

## Bots

- A bot values an unseen card at the deck's average under its own weights, yields included, and
  a card in its hand at that card's value. The average counts its own settlements and pops, so it
  rises as the realm grows.
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

1. **The deck replaces Ventures.** The card list above, once the owner signs it off; buy,
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
