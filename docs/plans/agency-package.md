---
status: proposed
phase: "post-v2"
updated: 2026-10-31
---

# Agency package

## Outcome

A player sees the next shock coming and chooses more of what lands on them. Next year's card is
public a year ahead. A pop offered by an event card can be turned down. A Law that cannot pass yet
is kept, not lost. Utility actions can be bought two or three at a time. A luxury good is held
through its Port: lose the Port and the good goes back to the board. Manumission softens, Forum
Rites becomes Rural Messengers, and Capital Works leaves the Ideas. The development deck goes in as
its plan says. The decks keep their counts and effects: luck stays, and the change is in what a
player can see and refuse.

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
- Tiers on moving pops (owner, 2026-10-31): one move already carries any number of pops.

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
   beside it, in a settlement on one of the good's two tiles. The study dropped this because a
   riot that burns the Port also cuts happiness; the owner overrode that. Today a good stays its
   holder's for the game and counts with no Port, and a traded good counts at once.
   - **A lost Port releases its good** (owner, 2026-10-31, Q87 option B). If the Port that claimed
     a good is destroyed for any reason (a riot's fire, a rival's city driving off the colony), the
     good goes back to the board unclaimed. The first Port built beside it claims it, and that can
     be the former holder rebuilding first. A Port elsewhere does not help.
   - **No change to Port building for this.** Today a Port may be built in a coastal settlement
     beside an unclaimed good, which is exactly what a released good is. A settlement holds one
     Port, and a destroyed one leaves room for another, so the former holder can rebuild there if
     the settlement still stands. Read as: only a newly built Port claims; a Port already standing
     beside a released good does not take it.
   - **Traded goods are open:** [Q87](../questions.md#q87--does-a-traded-luxury-good-need-the-receivers-own-port).
     If the answer is that a traded good counts once the receiver has a Port beside it, that is the
     one place the Port-building rule widens: a Port beside a good its holder owns.
8. **Tiered utility actions.** One action buys 1, 2 or 3 units at a linear price; the owner's
   example is 2 for 1, 4 for 2, 6 for 3 (confirmed 2026-10-31). Four actions get tiers:

   | Action        | Today                                                                 | With tiers                     |
   | ------------- | --------------------------------------------------------------------- | ------------------------------ |
   | The Dole      | 3 influence for 1 food, as often as you can pay                       | Saves clicks only              |
   | Civic calm    | +2 this year for 2 influence or 2 gold, once a turn                   | +2, +4 or +6 for 2, 4 or 6     |
   | Social ladder | One move a turn: promote for 2 food or 2 gold, demote for 1 influence | Up to 3 pops in the one move   |
   | Grow a pop    | Once per settlement a turn                                            | Up to 3 pops in one settlement |

   Tiers on calm, the ladder and growing are new mechanics that loosen today's per-turn limits,
   and each needs its own sim comparison. Calm most of all: +6 for 6 gold lifts any riot level
   (−3 to −5) above zero and a revolt level of −6 to −8 out of unrest, so gold buys out of most
   riots. Calm still never counts toward standing happiness, so it reaches neither Beloved of the
   People nor the free development card.
   - **Ladder.** Manumission's free promotion stays free under tiers, so three free promotions a
     turn is accepted (owner, 2026-10-31).
   - **Moving** gets no tiers (owner, 2026-10-31): one move already carries any number of pops
     between two settlements at 1 food a pop.
   - **Growing.** Guild Charter sets the same per-settlement limit (the capital twice, colonies
     never), so the growing slice has to say how the two combine before it is built.

9. **Development deck** as in [its plan](development-deck.md) (PR #163); the owner signed off the
   card list on 2026-10-31. A riot's card stays the player's choice, pop by pop. The free card
   needs standing happiness +3, read after hunger.
10. **Dropped and fixed:** see Non-goals.

## Open owner questions

- [Q87](../questions.md#q87--does-a-traded-luxury-good-need-the-receivers-own-port): whether a
  traded good counts only once the receiver has their own Port beside it, or goods stop trading.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                                                                                                                        |
| ---------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | Yes      | Forecast exposed at each year boundary; decline with a return to the bottom of the deck; the content changes; ballot order, blocked proposals and kept Laws; a lost Port releasing its good; tier counts with derived prices; tests      |
| Frontend         | Yes      | Next year's card beside this year's disc; Decline on the event card; a blocked Law the sheet still lets you seal, the ballot order and a kept card; a released good back on the board; 1×/2×/3× choices with prices; Codex and Chronicle |
| Simulation & AI  | Yes      | Bots read the forecast from their projection, accept or decline pops, value and propose kept Laws, value a Port as the hold on its good, and pick tiers as legal moves; telemetry and a paired batch for each change                     |

Sibling consumers: income and happiness forecasts (ledger, alarms, the End-turn confirm, bot
evaluation) read next year's card through one selector. Every happiness surface and Beloved read
luxury holdings from the one luxury selector. The Assembly sheet, recap and bots read one ballot
order. The End-turn confirm offers the smallest calm tier that changes the outcome.

## Architecture impact

- **Content and versions.** Manumission's weight, Rural Messengers (new name and id), the
  eleven-Idea roster and the tier limit are pinned content and ruleset data. State and command
  schemas bump; older saves are rejected, as today.
- **Commands.** Resolving an event pop gains a decline. Calm, the ladder, growing and the Dole
  take a count of 1 to 3, and the engine derives each tier's price and legality. Proposing
  accepts a blocked Law. All of it goes through the one transition.
- **State.** Calm is a flag today; tiered calm needs a count. Each seat may hold one kept Law
  across sittings. Destroying a Port clears its good's owner and claim origin in the same
  transition, through the one ownership seam; activity stays derived, never stored.
- **Projections.** The forecast card is public; the rest of the year pile stays hidden. A kept Law
  was read out on the ballot, so it is public. A decline is logged, so the table knows the event
  pile's last card; the pile's order stays hidden in projections.
- **Year deck.** A game longer than the deck reshuffles a year earlier, so the next card can show.
- **Port legality.** Unchanged for a released good. It widens only if Q87 makes a traded good
  need the receiver's Port.
- **Comparison switches.** Each change keeps a sim-only way to turn it off until its comparison is
  read, since the comparisons run with everything in.
- **Invariants.** Politician decks, discards, standing Laws and kept Laws hold every card once. The
  event deck keeps its forty cards through a bottom insert.
- No feature-private workflow: the decline and the tiers are options on existing decisions, and the
  kept Law lives in the Assembly state.

## PR slices

The owner's hold stands (2026-10-26, restated 2026-10-31): no balance or comparison batches until
everything in this package and the development deck is in the engine and the bots play it. So the
slices build first, each with its engine tests, UI, bots and telemetry, and the comparisons all
run at the end. Every batch then runs on the owner's go.

1. **Measurement.** Telemetry first: shortages of food, wood, stone, gold and influence kept apart;
   shortages that delay a build kept apart from those that cost pops; Assembly draws blocked when
   drawn; event pops placed and declined; happiness lines crossed; recovery after named shocks
   (Blockade, Drought, Manumission passing); Ports lost, by cause, and goods released.
2. **The narrow changes, one slice each:** optional event pops, Manumission, Rural Messengers,
   Capital Works, the Assembly order with kept Laws, the Port rule, then the tiers one action per
   slice (the Dole, calm, the ladder, growing).
3. **The year forecast, with bots that use it.** Today's bot forecast expires the active card and
   treats later cards as unknown. A forecast the bots ignore tests nothing.
4. **The development deck** in its plan's slices: the deck replaces Ventures; the free card and
   the riot's card; card trading; close-out.
5. **The comparisons.** The full package against a pinned `main` commit from before slice 1, on
   the same seeds. Then each change switched off against the full package, one at a time: the
   free card and the riot's card apart and together, Manumission with the ladder tiers on and off.
   The development deck plan's batch against Ventures is the first of these: Ventures survives
   only at the pinned commit.
6. **The combined check.** The changes must not jointly erase scarcity, favour one build, or add
   too much decision time. Then the owner's hotseat game.

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
| Port rule                       | Ports lost by cause, happiness lost with them, riots that follow a lost Port, who claims a released good next         |
| Calm tiers                      | Riots and revolts avoided, gold and influence spent on calm, whether any riot still lands on a rich seat              |
| Ladder tiers                    | Pops moved up or down a turn, slaves held, Manumission years with and without tiers                                   |
| Growing tiers                   | Pops grown a year, hunger losses, game length, the year-5 leader                                                      |
| Year forecast                   | Whether warning changes reserves, building or trade and cuts permanent losses; Blockade read by goods held and slaves |
| Development deck                | As its plan says; the free card's reach by build, year and size; pops a riot's card saved; rival-card targets         |
| Combined                        | Win rates by personality, the leader benchmark, scarcity kept, decision time                                          |

## Acceptance and validation

- Each slice has engine tests for its rule (forecast timing, the decline's return to the bottom,
  ballot order and kept-card conservation, a lost Port releasing its good, tier prices and
  limits), its UI, bots that use it, telemetry, and its switch for the comparisons.
- Each comparison has a dated batch report. The combined check meets both benchmarks, with policy
  limits stated.
- In the owner's hotseat game the table uses the forecast, a decline, a kept Law, the tiers and the
  card hand without help.
- `rules.md` and the Codex change in the slice that ships each rule, not before.

## Retirement

After the combined check and the hotseat game, fold the rules into `rules.md`, the Codex and the
references, and move this plan to `docs/archive/plans/` with its PRs and reports.
