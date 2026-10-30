---
status: proposed
phase: "post-v2"
updated: 2026-10-31
---

# Agency package

## Outcome

A player sees the next shock coming and chooses more of what lands on them. Next year's card is
public a year ahead. A pop offered by an event card can be turned down. A Law that cannot pass yet
is kept, not lost. Utility actions can be bought two or three at a time. A luxury good counts only
while its holder's own Port stands beside it. Manumission softens, Forum Rites becomes Rural
Messengers, and Capital Works leaves the Ideas. The development deck goes in as its plan says. The
decks keep their counts and effects: luck stays, and the change is in what a player can see and
refuse.

The rulings come from the [agency and luck study](../reports/product/2026-10-30-agency-and-luck/README.md)
of 2026-10-30, ruled on by the owner on 2026-10-30 and 2026-10-31.

## Non-goals

Dropped by the owner (2026-10-31), though the study raised them:

- The Workshop building.
- Temple token repair. The synthesis recommended it; the owner said no.
- A Blockade that suppresses one good. The full Blockade stays.
- Different powers for each luxury good.
- Resources for a declined event pop.
- Protection or hand-defence cards.
- A separate happiness deck.
- A public contracts deck.
- The study's refund of an Assembly draw that cannot be proposed. Ruling 6 replaces it.

Kept fixed: base income 0, no bank, and the Dole at 3 influence for 1 food. Riot insurance and
bought votes keep their caps. The development deck's card list lives in [its plan](development-deck.md)
(PR #163) and is not restated here.

## Settled inputs

The owner's rulings on the study's [synthesis](../reports/product/2026-10-30-agency-and-luck/s4-synthesis.md),
2026-10-30 and 2026-10-31. "Today" is what the engine does now. "Read as" is this plan's reading
where a ruling leaves a gap; the slice that builds it confirms the reading with the owner first.

The forecast, optional pops, the Assembly order, the Port rule and the tiers are new mechanics,
ruled in after the 2026-10-27 freeze ruling ("no new features").

1. **Year forecast.** Next year's card is public, starting after setup: placement and the Idea
   draft finish, year 1's card is revealed and applied as now, and year 2's card shows. At each
   later year boundary the forecast card takes effect and the next one shows. Plague and Festival
   act only when they take effect. Nothing is forecast past the final year. The year deck's counts
   and effects are unchanged, and the full Blockade stays. Today the next card is hidden from every
   seat and bot.
2. **Optional event pops.** Free Settlers and Captured Laborers become optional: take the pop in a
   settlement with room, or decline. A declined card goes to the bottom of the player event deck,
   not the discards (owner's change to the study), and declining gives nothing. The event card
   needs an accept/decline window. Today the pop must be placed, and the card is discarded only
   when no settlement has room. Read as: that no-room case stays a discard.
3. **Manumission** counts each slave twice for unrest, not three times. Free promotion stays.
   Balance only.
4. **Capital Works** leaves the National Ideas, which become eleven. Urban Planning is unchanged.
5. **Forum Rites becomes Rural Messengers:** "Citizens in colonies make 2 influence; freemen in
   colonies make 0 gold." City and capital citizens are unchanged, and Forums still raise them
   to 2 influence. Today the Law gives every citizen 2 influence, so Forums add nothing while it
   stands.
6. **Assembly: repeals first, and a blocked Law is kept.** In every sitting the repeals are voted
   before any new Law. A seat may propose a drawn Law even if it is blocked when drawn: it would
   replace a protected Law, or the price-Law slot holds a protected Law. The Law is checked again
   at its turn on the ballot, after the repeals. If a repeal freed the room, it goes to the vote.
   If it is still blocked, the seat keeps the card and may propose it at the next sitting. Today
   the ballot runs in seat order, a blocked Law cannot be proposed, and an unproposed draw is
   discarded when voting starts. Read as:
   - Directives are voted after the repeals, with the new Laws, in seat order.
   - A Law still blocked at its turn is not voted.
   - At the next sitting the kept card is the seat's one proposal, with no new draw price. If the
     seat passes, draws or repeals instead, the card goes to its politician's discards.
   - A Law blocked by an earlier item on the same ballot is kept the same way.

   A repeal can only strike a Law past its tenure, and only a protected Law blocks a draw, so
   under today's tenure no repeal can free the room for a Law blocked when drawn: that Law is
   always kept for the next sitting.

7. **Luxury goods need their own Port, always.** A good counts only while its holder has a Port
   beside it, in a settlement on one of the good's two tiles. If that Port is destroyed for any
   reason (a riot's fire, a rival's city driving off the colony), the good's +2 happiness goes; a
   Port elsewhere does not help. The study dropped this because a riot that burns the Port also
   cuts happiness; the owner overrode that. Today a good stays its holder's for the game and counts
   with no Port, and a traded good counts at once. Read as: any Port of the holder's on either of
   the good's tiles counts. Open: [Q87](../questions.md#q87--what-happens-to-a-luxury-good-when-its-port-is-gone).
8. **Tiered utility actions.** Each utility action bought in units gets 1×, 2× and 3× options at
   a linear price; the owner's example is 2 for 1, 4 for 2, 6 for 3. Read as: one use carries 1
   to 3 units of one kind, at n times the unit price. The owner said yes to all five:

   | Action        | Today                                                                 | With tiers                     |
   | ------------- | --------------------------------------------------------------------- | ------------------------------ |
   | The Dole      | 3 influence for 1 food, as often as you can pay                       | Saves clicks only              |
   | Civic calm    | +2 this year for 2 influence or 2 gold, once a turn                   | +2, +4 or +6 for 2, 4 or 6     |
   | Social ladder | One move a turn: promote for 2 food or 2 gold, demote for 1 influence | Up to 3 pops in the one move   |
   | Grow a pop    | Once per settlement a turn                                            | Up to 3 pops in one settlement |
   | Move pops     | One move a turn, 1 food a pop                                         | See below                      |

   Tiers on calm, the ladder, growing and moving are new mechanics that loosen today's per-turn
   limits, and each needs its own sim batch before it ships. Calm most of all: +6 for 6 gold lifts
   any riot level (−3 to −5) above zero and a revolt level of −6 to −8 out of unrest, so gold buys
   out of most riots. Calm still never counts toward standing happiness, so it reaches neither
   Beloved of the People nor the free development card. Three facts go to the owner before their
   slices are built:
   - **Moving.** One move already carries any number of pops between two settlements at 1 food a
     pop. A tier adds something only if it means more than one move a turn.
   - **Ladder.** Under Manumission promotion is free, so a 3× promotion frees three slaves a turn
     for nothing.
   - **Growing.** Guild Charter sets the same per-settlement limit (the capital twice, colonies
     never), so the slice has to say how the two combine.

9. **Development deck** as in [its plan](development-deck.md) (PR #163); the owner signed off the
   card list on 2026-10-31. A riot's card stays the player's choice, pop by pop. The free card
   needs standing happiness +3, read after hunger.
10. **Dropped and fixed:** see Non-goals.

## Open owner questions

- [Q87](../questions.md#q87--what-happens-to-a-luxury-good-when-its-port-is-gone): whether a good
  stays its holder's when its Port is lost, and whether a traded good needs the receiver's Port.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                                                                                                                                   |
| ---------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | Yes      | Forecast exposed at each year boundary; decline with a return to the bottom of the deck; the content changes; ballot order, blocked proposals and kept Laws; luxury activity derived from the holder's Port; tier counts with derived prices; tests |
| Frontend         | Yes      | Next year's card beside this year's disc; Decline on the event card; a blocked Law the sheet still lets you seal, the ballot order and a kept card; an inactive good with its reason; 1×/2×/3× choices with prices; Codex and Chronicle             |
| Simulation & AI  | Yes      | Bots read the forecast from their projection, accept or decline pops, value and propose kept Laws, value goods by Port presence, and pick tiers as legal moves; telemetry and a paired batch for each change                                        |

Sibling consumers: income and happiness forecasts (ledger, alarms, the End-turn confirm, bot
evaluation) read next year's card through one selector. Every happiness surface and Beloved read
luxury activity from the one luxury selector. The Assembly sheet, recap and bots read one ballot
order. The End-turn confirm offers the smallest calm tier that changes the outcome.

## Architecture impact

- **Content and versions.** Manumission's weight, Rural Messengers (new name and id), the
  eleven-Idea roster and the tier limit are pinned content and ruleset data. State and command
  schemas bump; older saves are rejected, as today.
- **Commands.** Resolving an event pop gains a decline. Calm, the ladder, growing, moving and the
  Dole take a count of 1 to 3, and the engine derives each tier's price and legality. Proposing
  accepts a blocked Law. All of it goes through the one transition.
- **State.** Calm is a flag today; tiered calm needs a count. Each seat may hold one kept Law
  across sittings. Luxury activity stays derived, never stored: owned, unsuppressed, no Blockade,
  and a Port of the holder's on one of the good's tiles.
- **Projections.** The forecast card is public; the rest of the year pile stays hidden. A kept Law
  was read out on the ballot, so it is public. A decline is logged, so the table knows the event
  pile's last card; the pile's order stays hidden in projections.
- **Year deck.** A game longer than the deck reshuffles a year earlier, so the next card can show.
- **Port legality.** Under Q87's recommended answers a Port may also be built beside a good its
  holder owns with no Port; today a Port needs an unclaimed good beside it.
- **Invariants.** Politician decks, discards, standing Laws and kept Laws hold every card once. The
  event deck keeps its forty cards through a bottom insert.
- No feature-private workflow: the decline and the tiers are options on existing decisions, and the
  kept Law lives in the Assembly state.

## PR slices

The order comes from the synthesis. Each change is its own vertical slice with its own paired
batch, so its effect reads alone. Every batch runs only on the owner's go. The owner's hold on
balance batches until the bots play the development deck (2026-10-26) stands; steps 1 and 2 run
their batches only once the owner lifts it for them.

1. **Refresh the baseline.** Current bots and rules. Telemetry first: shortages of food, wood,
   stone, gold and influence kept apart; shortages that delay a build kept apart from those that
   cost pops; Assembly draws blocked when drawn; event pops placed; happiness lines crossed;
   recovery after named shocks (Blockade, Drought, Manumission passing); Ports lost, by cause.
2. **The narrow changes, one at a time,** each against the baseline: optional event pops,
   Manumission, Rural Messengers, Capital Works, the Assembly order with kept Laws, the Port rule
   (after Q87), then the tiers one action per slice (calm, the ladder, growing, moving). The Dole's
   tiers ride with any of them and need no batch. Judge Manumission alone, before the ladder tiers
   make freeing slaves cheaper.
3. **The year forecast, with bots that use it.** Today's bot forecast expires the active card and
   treats later cards as unknown. A forecast the bots ignore tests nothing.
4. **The development deck** in its plan's slices: the deck replaces Ventures; the free card and
   the riot's card, read apart and together; card trading; close-out.
5. **The combined check.** Everything accepted, together. The changes must not jointly erase
   scarcity, favour one build, or add too much decision time. Then the owner's hotseat game.

Each material comparison: 40 seeds × four seat rotations, 160 mixed-build games a board, on the
Archipelago and the Continental board, Ideas on, plus equal-master runs for leader persistence.
Pair seeds and seating, and record the actual card sequences, since a new draw shifts later RNG.
Keep the 45% personality win flag and the 40% equal-master year-5 leader benchmark, with
intervals; an interval across a line is neither a pass nor a fail. Commands are in the
[simulation reference](../reference/simulation.md).

| Change                          | The batch must show                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Optional pops                   | Which builds decline; whether declined slaves would have crossed an unrest line; whether accepted freemen are fed     |
| Manumission                     | Draws that can be proposed, proposal and passage rates, immediate losses and turns to recover                         |
| Rural Messengers, Capital Works | Forum value, where citizens sit, which Ideas are picked, influence spent                                              |
| Assembly order, kept Laws       | Draws blocked when drawn, kept Laws that pass later, repeals carried, influence spent on draws that went nowhere      |
| Port rule                       | Ports lost by cause, happiness lost with them, riots that follow a lost Port, goods traded and goods inactive         |
| Calm tiers                      | Riots and revolts avoided, gold and influence spent on calm, whether any riot still lands on a rich seat              |
| Ladder tiers                    | Pops moved up or down a turn, slaves held, Manumission years with and without tiers                                   |
| Growing tiers                   | Pops grown a year, hunger losses, game length, the year-5 leader                                                      |
| Moving tiers                    | Moves a turn and what they are for                                                                                    |
| Year forecast                   | Whether warning changes reserves, building or trade and cuts permanent losses; Blockade read by goods held and slaves |
| Development deck                | As its plan says; the free card's reach by build, year and size; pops a riot's card saved; rival-card targets         |
| Combined                        | Win rates by personality, the leader benchmark, scarcity kept, decision time                                          |

## Acceptance and validation

- Each slice has engine tests for its rule (forecast timing, the decline's return to the bottom,
  ballot order and kept-card conservation, luxury activity from Ports, tier prices and limits), its
  UI, bots that use it, and a dated batch report.
- The combined check meets both benchmarks, with policy limits stated.
- In the owner's hotseat game the table uses the forecast, a decline, a kept Law, the tiers and the
  card hand without help.
- `rules.md` and the Codex change in the slice that ships each rule, not before.

## Retirement

After the combined check and the hotseat game, fold the rules into `rules.md`, the Codex and the
references, and move this plan to `docs/archive/plans/` with its PRs and reports.
