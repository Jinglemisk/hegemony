# Comparables: legible economies, brakes, senates, luck, clocks

Scope: 60–120 min games with pops/workers producing resources. Hegemony today (per rules.md): per-pop income (+2 gold citizen/freeman, +1 tile resource per slave), per-pop building bonuses with support caps, stacked cost modifiers, ±1 omen on formula terms, "x or y" event cards. Findings below are sourced; where a source only gave a rule's shape and not its numbers, the number is omitted rather than guessed.

## 1. Comparison table

| Game | Core mechanism | How income is expressed | How the snowball is throttled | Numbers per decision | Length / clock |
|---|---|---|---|---|---|
| Eclipse: Second Dawn | Population cubes leave a track and land on planets | "The highest value empty square on each Population Track shows how many Resources … you will Produce" — one read per resource, never summed ([dized](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/OMyq3IckSRyz10S7CCdLlA/population-cubes)) | Influence discs spent on hexes/actions uncover a rising upkeep number; can't pay → remove discs, i.e. shrink ([UBG](https://www.ultraboardgames.com/eclipse/game-rules.php)) | 1 track value vs 1 upkeep value | 8 rounds ([Meeple Mountain](https://www.meeplemountain.com/reviews/eclipse-second-dawn-for-the-galaxy-review/)) |
| Terra Mystica | Buildings on a faction board; removing one uncovers its income icon | Dwellings→workers, trading houses→coins+power, temples→priests; you read the uncovered icons ([UBG](https://www.ultraboardgames.com/terra-mystica/game-rules.php)) | Fixed costs (Dwelling 1W+2C, Trading House 2W+6C, or 3C next to a rival); upgrades consume the lower building; power cycles through 3 bowls | 2 costs, 1 icon row | 6 rounds |
| Through the Ages | Workers taken from a "yellow bank" and placed on tech cards | Card says what one worker yields; food/happiness are card-level | Population price rises as bank sections empty (2, 2, 3 food…), emptied sections reveal consumption, and an over-full blue bank pays corruption at −2/−4/−6 ([UBG](https://www.ultraboardgames.com/through-the-ages/the-second-round.php), [Stately Play](https://statelyplay.com/2017/09/26/strategy-101-through-the-ages-corruption-edition/)) | 1 cost, 1 consumption, 1 corruption | Card decks per age; 3+ h |
| Concordia | Colonists + cities; cards are both actions and scoring | Production is one city = one good; almost no numbers | Personality-card prices climb on the display; 15-house cap | 0–2 | Ends when last card bought or 15th house ([officialgamerules](https://officialgamerules.org/game-rules/concordia-rules/)) |
| Scythe | Workers on hexes | Produce action: pick 2 hexes, each worker there yields 1 of that hex's good ([dized](https://rules.dized.com/game/qjEyV--bTu-DXKGZWToM1A/7HMmm33pTUucndX1x0njfQ/producing-workers)) | Each new worker uncovers a cost on the mat that the next Produce must pay ([Stonemaier FAQ](https://stonemaiergames.com/games/scythe/faq-scythe/)) | 1 revealed cost | Ends at 6th star ([TheGamer](https://www.thegamer.com/scythe-board-game-rules-how-to-play/)) |
| Clans of Caledonia | Units on hexes; market board | Each unit yields a fixed amount (woodcutter £4, miner £6, sheep 1 wool) ([BGA](https://en.doc.boardgamearena.com/Gamehelpclansofcaledonia)) | Market price marker moves one step per good bought/sold, so gluts self-price | 1 price | 5 rounds |
| Brass: Birmingham | Industry tiles flip to advance an income marker | "Your income level is the number … beside your Income Marker" ([officialgamerules](https://officialgamerules.org/game-rules/brass-birmingham/)) | Loans cost 3 income levels; income can go negative and must be paid | 1 level | 2 eras of fixed rounds |
| Civ: A New Dawn | Five-slot focus row | Card in slot N acts at strength N, then returns to slot 1 ([playeraid](https://playeraid.net/modules/civ_a_new_dawn/en)) | Using a strong card resets it; strength is time-since-used | 1 | Victory-card agendas |
| Ark Nova | Appeal track + conservation track | Money = position on appeal track; kiosks add per adjacency ([BGA](https://en.doc.boardgamearena.com/Gamehelparknova)) | Break token: when it fills, everyone gets income and hand limits bite | 1 | Ends when appeal and conservation markers cross ([Wikipedia](https://en.wikipedia.org/wiki/Ark_Nova)) |
| Kemet | Prayer points | Night: 2 PP flat + 2–3 per held temple (Delta 5); cap 11 ([UBG](https://www.ultraboardgames.com/kemet/game-rules.php)) | Hard cap on PP; 5 actions/day | 1 | 8 or 10 VP |
| Inis | Drafted action cards, no resources | None — cards are the economy ([UBG](https://www.ultraboardgames.com/inis/game-rules.php)) | Cards expire each season; Brenn breaks ties | 0 | Victory checked only in Assembly |
| Tapestry | Income mat with 4 tracks of 6 spaces | Income = whatever the uncovered spaces show ([UBG](https://www.ultraboardgames.com/tapestry/game-rules.php)) | Income turns are rare and end the game | 1 per track | 5 income turns |
| Imperium: Classics | Deck-builder with unrest cards | Only specific cards give materials/population ([Meeple Mountain](https://www.meeplemountain.com/reviews/imperium-classics/)) | Unrest cards clog the hand, −2 VP each | 1 | Deck/unrest pile |
| Imperator: Rome (PC) | 5 pop classes, promotion to a desired ratio | Output = base × (100% + modifiers) × happiness%, per pop, per class ([wiki](https://imperator.paradoxwikis.com/Population)) | Capacity 10/territory + growth penalty per pop over | dozens, computed | n/a |
| Catan | Dice hit numbered hexes | 1 card per adjacent settlement, 2 per city | Roll 7: over 7 cards → discard half; robber blocks a hex ([UBG](https://www.ultraboardgames.com/catan/game-rules.php)) | 0–1 | First to 10 VP |
| Agricola | Family members act, then eat | Food from cards/animals | Harvest after rounds 4,7,9,11,13,14: 2 food per member or −3 VP per missing food ([UBG](https://ultraboardgames.com/agricola/game-rules.php)) | 1 | 14 rounds |

## 2A. Population as producers without arithmetic

Sources per game are in the table; the moves:

1. **Income is read off a track position, never summed.** Eclipse ("highest value empty square"), Brass (number beside the marker), Ark Nova (appeal position = money). Adding a pop moves a marker; the player never adds.
2. **Placing a pop is the multiplication.** Scythe and Clans: one unit on one hex yields one thing. The "formula" is visible as geometry, so a 6-worker economy is six meeples you can count.
3. **Uncovering, not stacking.** Terra Mystica and Tapestry: a building that leaves the board uncovers its income icon. Building bonuses are pre-printed slots, not multipliers on pops.
4. **Buildings state a per-turn fact, not a per-pop rate.** Terra Mystica's "trading house = coins + power" and Kemet's "temple = 2 PP" are flat. Hegemony's "+2 gold per freeman supporting up to 3" is Imperator-style; the computer can do it, but the player can't predict it in-head.
5. **Slot number as strength.** Civ: A New Dawn: a card's power is its slot (1–5). Recency, not accumulated bonuses, sets output.
6. **Rising price-to-grow lives on the bank, not on the pop.** Through the Ages' yellow bank prints the next worker's food cost under the section; consumption appears as a revealed icon.
7. **Let the map hold the number.** Catan tiles print a value; Concordia cities print a good. Income per site is a fixed printed property; ownership is the only variable.
8. **Zero-number economies are viable at this weight.** Inis and Concordia run 60–120 min games with essentially no arithmetic; Gerdts: "if it is still interesting enough with one less, then you can also play with one less" ([interview](https://talkingshelfspace.com/origin-stories-concordia-an-interview-with-designer-mac-gerdts/)).
9. **Cap the resource, not the formula.** Kemet's prayer points "can NEVER" exceed 11; Catan's 7-card hand. A ceiling replaces diminishing-return math.
10. **Class = one verb.** Imperator's classes each produce one headline thing (nobles research, freemen manpower, slaves goods/tax). What only works on a computer is the *scaling* — happiness as a percentage multiplier, promotion toward a computed "optimal ratio," output modifiers layered per province. Keep the class identities; drop the percentages.
11. **Pops as cost, not income.** Agricola's family eats 2 each; TtA's consumption icons. The pop is legible as a mouth first.
12. **One-way flow for the gateway.** Engelstein: "each feedback loop that you add builds complexity"; for gateway games, "Create a game 'loop' that is a straight path from actions to victory points" ([GameTek](https://gametek.substack.com/p/grand-unified-gateway-theory)). Hegemony has pop→gold→pop, pop→food→happiness→pop, and buildings→pop all looping; each loop should be visible on the board, not in a sum.

## 2B. Upkeep and population brakes

- **Rising marginal price without multiplication.** TtA prints 2, 2, 3… food under the bank; Scythe reveals a power/popularity/coin cost as workers deploy; Concordia's card prices climb along the display. Terra Mystica prices upgrades in discrete tiers and gives a discount for rival adjacency (6C→3C), which also pulls players toward each other.
- **Upkeep as a second track that races income.** Eclipse's influence track: every disc spent uncovers a higher upkeep number; if income < upkeep you give discs back ([UBG](https://www.ultraboardgames.com/eclipse/game-rules.php)). The brake is a comparison of two read numbers.
- **Feeding at fixed checkpoints.** Agricola harvests only after rounds 4, 7, 9, 11, 13, 14; shortfall = a −3 VP begging card per missing food. The penalty is a token, not a stat drain.
- **Stockpile brakes.** TtA corruption −2/−4/−6 for hoarding; Catan's discard-half on a 7. Both punish the hand size, not the income.
- **Hard caps.** Kemet 11 PP; Concordia 15 houses; Imperator's capacity 10 per territory.
- **Turn-order catch-up.** Power Grid: most cities goes first, but resource buying and city building run in reverse order, so the leader pays most and gets boxed out ([UBG](https://www.ultraboardgames.com/power-grid/game-rules.php)). The Thoughtful Gamer's taxonomy calls this "ball and chain," and notes it becomes "a fundamental strategic consideration" — the brake gets gamed ([Thoughtful Gamer](https://thethoughtfulgamer.com/2017/03/28/catch-up-mechanisms/)).
- **Leader as target.** TI4's custodians token: pay 6 influence, land on Mecatol Rex, take 1 VP — and the agenda phase switches on for everyone ([tirules](https://tirules2.com/R_custodians_token)). Dune: Imperium's conflict cards pay 2nd and 3rd place, so losing the fight still pays ([GeekDad](https://geekdad.com/2020/12/control-the-spice-and-control-the-universe-in-dune-imperium/)).
- **Theory.** Elias/Garfield/Gutschera treat snowball and catch-up as measurable characteristics, note randomness is itself a catch-up mechanic, and warn that heavy catch-up produces "self-deception where the leader might feel like she's farther ahead than she really is" ([summary](https://onlinedungeonmaster.com/tag/characteristics-of-games/), [MIT Press](https://mitpress.mit.edu/9780262542692/characteristics-of-games/)). Adams & Dormans model economies as sources, drains, converters, traders and use Monopoly as the canonical positive loop: "investing in production facilities consumes stored resources but increases production of new ones" ([Machinations article](https://www.gamedeveloper.com/design/the-designer-s-notebook-machinations-a-new-way-to-design-game-mechanics)); their pattern library names Static/Dynamic Friction, Stopping Mechanism and Attrition as the brakes ([Pearson](https://m.pearson.com.au/products/detail?isbn=9780321820273)). Sirlin: the worst complexity is "complexity that makes the game harder to learn yet no more interesting to play" ([Sirlin](https://www.sirlin.net/articles/balancing-multiplayer-games-part-1-definitions)). Lantz on elegance: "how much stuff can you carve away and still have something that lights up" ([Lantz](https://gomagic.org/frank-lantz-why-go-is-more-than-a-game/)). Cook: a game is loops (model→action→system→feedback) and arcs (a loop you exit once); designers should "understand what is filler" ([Lostgarden](https://lostgarden.com/2012/04/30/loops-and-arcs/)). On number size I found no GameTek segment; the cognitive-science number is that enumeration "of four or fewer objects uses a process separate from enumerating larger collections," and it degrades under attentional load ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC2533400/)) — i.e. keep per-decision quantities ≤4 wherever a player must hold them in mind.

## 2C. Senate and agenda systems

- **TI4.** Two agendas per phase; speaker reads the card aloud "including all of its possible outcomes"; votes = influence of exhausted planets; abstain allowed; speaker breaks ties; "For"/"Elect" laws stay in play, directives and "Against" go to discard ([tirules](https://tirules2.com/R_agenda_phase)). Legibility comes from: one currency (influence), one card text, binary or elect outcomes, and the agenda phase existing only after Mecatol is taken.
- **Republic of Rome** is the counter-example: 12 phases, senate elects consuls, censor, dictator, runs prosecutions, and "If there is not enough cooperation … all players lose"; 3 hours to days ([Wikipedia](https://en.wikipedia.org/wiki/Republic_of_Rome_(game))). Heavy because every office, vote, and prosecution is its own sub-procedure with its own numbers.
- **John Company 2e.** Offices make decisions; the Prime Minister "shifts the policy track to a new position, which informs the table of the law's more abstract consequences" — laws are a *track position* ([Space-Biff](https://spacebiff.com/2021/03/29/john-company-2/)).
- **Pax Pamir 2e.** Politics is loyalty; four Dominance Check cards in the deck are the referendum moments; scoring flips between coalition and personal network ([BGG](https://boardgamegeek.com/boardgame/256960/pax-pamir-second-edition)).
- **Inis.** Victory is checked "only during the Assembly phase"; Brenn wins ties; players draft cards, so politics is who holds which card ([UBG](https://www.ultraboardgames.com/inis/game-rules.php)).
- **Root (Eyrie).** The Decree is a public, growing list of mandatory verbs; fail it and you fall into turmoil ([TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/TabletopGame/Root)) — a "law you bind yourself to."
- **Diplomacy.** Negotiation timed (30 then 15 min), orders written and revealed simultaneously, "no dice or cards" ([Wikipedia](https://en.wikipedia.org/wiki/Diplomacy_(game))).
- **Catan: Cities & Knights** adds politics as a commodity: coin advances the politics track, which pays progress cards like Diplomat, Constitution, Spy, Warlord ([UBG](https://www.ultraboardgames.com/catan/cities-and-knights-politics-cards.php)). Political power is a track plus one-verb cards, not a vote.

Design moves:
1. **One vote currency, spent not multiplied** (TI4 influence = votes; Hegemony's "citizens + bought votes + veto" is three).
2. **Two outcomes or one election** — For/Against or Elect a player. No amendments.
3. **Read the card aloud with its outcomes; law text is the whole rule.**
4. **Laws persist, directives fire once** and the card physically stays or leaves.
5. **A law is a track position** (John Company's policy track) — the table sees what changed without a text lookup.
6. **Fixed referendum moments** (Pax Pamir's four Dominance Checks; Inis's Assembly) so voting is an event, not a phase every round.
7. **Speaker breaks ties** — no tie-fails rule, no runoff.
8. **Cap the law count** (TI4 keeps laws in play; Hegemony's 6 is fine, but "name the law you replace" is a second decision).

## 2D. Luck and draw

- **Costikyan's taxonomy** (per [Liz England's review](https://lizengland.com/blog/2016/10/review-uncertainty-in-games-by-greg-costikyan/)): performative, solver's, player unpredictability, analytic complexity, randomness, hidden information, perception, narrative anticipation, schedule, development anticipation. Hegemony's income sum is *analytic complexity* masquerading as economy; the omen and events are *randomness*. Costikyan argues good games "temper that randomness with strategic choices."
- **Pandemic.** Epidemic cards are seeded one per pile (4/5/6 piles by difficulty); each epidemic does three fixed verbs (increase, infect, intensify) and the intensify reshuffles only the discard onto the top, so known cities recur ([UBG](https://www.ultraboardgames.com/pandemic/game-rules.php)). The magnitudes never change; the *order* does.
- **Spirit Island.** 12-card invader deck, 3/4/5 by stage; the Explore card becomes next turn's Build, then Ravage ([UBG](https://www.ultraboardgames.com/spirit-island/game-rules.php)). Players see two turns ahead; the deck is the clock and the loss condition.
- **Through the Ages events.** Players choose which event to bury in the future deck, earning culture equal to its age; the deck reshuffles from what players seeded ([UBG](https://www.ultraboardgames.com/through-the-ages/subsequent-rounds.php)). Luck is authored by the table.
- **Dominion.** The grammar is four vanilla bonuses (+Cards, +Actions, +Buy, +Coin); Vaccarino avoids a card that is only "+1 Card +1 Action +Coin" because it would constrain the design space ([Dominion Strategy wiki](https://wiki.dominionstrategy.com/index.php/Vanilla)); card text runs top to bottom, one instruction per line, a rule line divides timing windows ([UBG](https://www.ultraboardgames.com/dominion/game-rules.php)).
- **Mage Knight.** "Choose one" is a *pay-more-for-more* split: basic effect free, stronger effect for one mana of the card's colour ([UBG](https://www.ultraboardgames.com/mage-knight/action-cards.php)). Good because both halves do the same verb at two sizes. Hegemony's "gain 6 wood and lose 1 happiness, or 2 wood" is the same shape, so it's fine; a card that says "if you hold a Port, X, else Y" is a disguised conditional.
- **Race for the Galaxy.** Icons replace text but "It will take at least half a dozen games… before you are familiar with all the iconography" ([Dao of Board Gaming](https://daoofboardgaming.home.blog/2021/08/12/race-for-the-galaxy/)); icons trade reading load for learning load.
- **Ark Nova break.** Card draws advance the break token; the break itself is fixed (income, hand limit, refresh), only its timing is uncertain ([BGA](https://en.doc.boardgamearena.com/Gamehelparknova)).

Design moves:
1. **Fix the magnitude, randomize the order** (Pandemic seeding, Spirit Island stages).
2. **Show the next card** (Spirit Island's explore→build→ravage) so luck is anticipation, not surprise.
3. **Let players seed the deck** (TtA future events).
4. **One verb per line; a shared vocabulary of four bonuses** (Dominion).
5. **"Choose one" = same verb, two sizes, one pays** (Mage Knight); never two different verbs behind a condition.
6. **Random tempo, deterministic effect** (Ark Nova break).
7. **Modifiers change a whole term, not ±1 on a rate** — Catan's robber removes a hex from production; it does not shave 1 off a formula.

## 2E. Session length and clocks

Fixed round counts dominate the 60–90 min 4-player band: Terra Mystica 6, Clans of Caledonia 5, Eclipse 8, 7 Wonders 3 ages × 6 turns ([UBG](https://www.ultraboardgames.com/7wonders/game-rules.php)), Agricola 14 with six harvests, Kemet to 8 VP with 5 actions per day, Dune: Imperium to 10 VP or the last conflict card ([Wikipedia](https://en.wikipedia.org/wiki/Dune:_Imperium)). Deck-as-clock: Spirit Island's 12 invader cards, Pandemic's player deck (empty = loss), Pandemic Legacy's 12 months with two attempts each ([Geeks Under Grace](https://www.geeksundergrace.com/tabletop/review-pandemic-legacy-season-1/)). Threshold clocks: Catan 10 VP, Concordia's last personality card or 15th house, Ark Nova's crossing markers. Hegemony's non-reshuffling seasonal deck is already a deck-as-clock; with 4 seasons/year and a 4-player round per season, a 16-card deck is 4 years ≈ 64 player turns, which is on the long side next to Eclipse's 8 rounds or Terra Mystica's 6 (24 player turns).

## 3. What Hegemony can borrow (ranked by fit)

1. **Read income off tracks** — each pop class moves a marker on a gold/influence/tile-resource track; buildings are steps on the same track (Eclipse, Brass, Ark Nova).
2. **Building = flat per-turn fact** ("Marketplace: +2 gold") or a track bump, never "+N per pop up to M" (Terra Mystica, Kemet).
3. **Grow cost printed on a bank strip** — the next slave/freeman/citizen costs what the uncovered slot says; consumption icons appear as it empties (TtA, Scythe).
4. **Happiness as a checkpoint, not a drift** — test it at season end like Agricola's harvest; unrest = a token with a fixed price.
5. **Omen replaces a term, doesn't shave it** — "silent mines: mountains yield nothing this year" (Catan robber), not "−1 stone".
6. **Assembly: one currency, two outcomes, speaker tie-break** — votes = citizens exhausted, For/Against or Elect, first player decides ties (TI4).
7. **Laws as track positions** — bank rate, grow cost, riot threshold each on a dial the law moves one step (John Company).
8. **Seasonal deck: fixed magnitudes, seeded order** — Winter's harsh cards go in the Winter pile; show the next season's card (Pandemic seeding, Spirit Island).
9. **Event grammar of four bonuses** — every card is +Resource, +Pop, +Happiness, or "move a marker"; "choose one" only as two sizes of one verb (Dominion, Mage Knight).
10. **Hard caps over diminishing returns** — food-happiness bonus ("+2 max") and influence stockpile capped like Kemet's 11 PP; drop the per-5 conversion.

Builds fall out of 1–3: a slave economy is a tile-resource track, a citizen economy an influence track, a trade specialist a bank/luxury track; each is one marker the table can read.
