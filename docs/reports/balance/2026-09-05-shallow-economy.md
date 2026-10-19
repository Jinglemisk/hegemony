# Making the deep lake shallower — economy and cards direction paper

Date: 2026-09-05 (v0.2: v0.1 was revised after an eight-lens adversarial critique; v0.2 folds in the owner's review)
Owner amendments (v0.2): buildings are per-pop again, raising a class column's printed value (5.5); the influence cap is withdrawn in favour of sinks, including the Dole (5.6); the population term is dropped from the level (5.7); the rising colony price is replaced by a piece supply (5.4); citizens by promotion only (5.1) and the bank and Treasurer rulings (5.6, 5.10) are confirmed. Tiles print no yield: terrain plus slots, slaves are the yield, slaves do not eat (5.2–5.3, owner, third round).
Status: direction paper for owner decision; not a change to the live rules
Evidence: [engine census](2026-09-05-engine-census.md) · [deck audit](2026-09-05-deck-audit.md) · [comparables](2026-09-05-comparables.md) · [sim baseline](../simulation/2026-09-05-shallow-economy-baseline.md)
Owner decisions: all answered 2026-09-06 and folded into section 8 and the affected plans; [questions.md](../../questions.md) is empty

## 1. The decision in one paragraph

Hegemony's difficulty is not that its numbers are large. It is that a player must read a
seven-term income sum with nested caps, a price that can carry five modifiers, a happiness
bank fed by thirty-two sources, and a hundred card faces, to predict what one action does.
The Lower Numbers preset divided every term by two or three and kept every term. The
simulation shows what that buys: two-digit incomes fell from 97% of turns to 14%, while
the relative snowball, build convergence, and happiness instability all got worse. The
recommendation is a structural change, not a scale change: **every income becomes a count
of pops standing on printed numbers, every price becomes one stable number, happiness
becomes a small ledger the board shows instead of a bank that drifts, and every card is one
of four verbs.** The first draft of that spec was attacked by eight independent critics; four
structural holes were found and closed. What remains open is listed as owner decisions.

## 2. What the evidence says

### 2.1 Where the depth is

The census counted 390 numeric constants, 68% of them decision-side (a player compares
against them when choosing). One player's income statement has 17 terms and needs 32
distinct numbers to read in full. The deepest term is not in the base economy but in the
Law layer: Agrarian Tariff is computed on the sum of every other food line. There are three
separate cost pipelines for one concept (build, grow, promote), and prices can reach zero
through stacked Laws with the overshoot silently discarded. Two fractions live in the base
rules: the colony half-share, floored per settlement so units vanish, and the slave half
happiness, never rounded, so a half-integer bank is tested against integer thresholds.

Happiness has 32 sources and sinks, 15 of them recurring flows, and only five under the
player's control. Food can go negative under income but not under events, and the shortage
penalty reads the whole negative balance every turn, so a food debt compounds.

### 2.2 What the cards cost to learn

107 faces (13 seasonal, 26 player, 24 Laws, 7 Directives, 30 table rows, insurance,
tendencies) expressed through 36 effect type names for about five ideas. 40 of 70 cards
score legibility 3 or worse; 22 of 24 Laws fail. Five seasonal cards scale per pop with
thresholds at 18 and 20 pops that the game never reaches, so 13 copies print three numbers
to deliver one. Of eight choice cards, one is a real decision, at par; five are disguised
conditionals fixed by a board count or by whether a specific action happens this turn.
Coupons are 19% of draws and their stated purpose, re-coupling free pops to food, is served
by a flat card. Three Laws have a half that does not do what the text says.

### 2.3 What the simulation shows

Standard rules, `smart` policy, ten games: a game runs about 26 rounds, eight in ten end by
the race, and the winning hand is nearly always Demos plus Civic Elite plus Treasurer or
Beloved. Gold income median is 23 per turn; median gold stock is 155 by round 20 and 373 by
round 30. Happiness decays from a median of 8 to 0, a quarter of late turns sit on the riot
table, and about 19 pops per game are lost to unrest. Bots converge on freemen plus
Marketplace plus Temple. Slaves are 6 to 8% of the population, so Workshop and Villa are
near-dead, and Forum and Aqueduct were never built in 26 games. Colony to city upgrades
happen about once per game. Event draws are small: the median swing is 3 against a turn
income of 33, and no draw in 1,039 reached half a turn's income. Bots buy at the bank about
once a turn and never sell.

Lower Numbers preset, same seeds: two-digit income terms fall to 14%. But happiness now runs
away (median 16 to 18, civic calm bought every third turn), the relative stockpile gap
between leader and laggard balloons from 2.1x to 6.3x by round 25, the round-10 income leader
wins 60 to 70% of games, pops converge to 75 to 91% citizens, and influence is untouched
(median 192 by round 30, higher than standard). Scaling changed magnitudes; the dynamics
worsened on three axes.

Bots are not humans; the limits are stated in the baseline report. The direction of these
results is robust to that caveat, the exact percentages are not.

## 3. Principles

1. **Decision-side small, state-side free.** The game is digital. Prices, thresholds, and
   rates must be small, few, and stable. Stockpiles and totals can be whatever the computer
   sums, as long as projection shows them. Lower Numbers compressed both sides.
2. **Counts, not sums.** Income is read by counting tokens on printed numbers, never by
   adding rates. Eclipse, Brass, and Ark Nova express income as a position, not a total.
3. **Builds are verbs, not coefficients.** Each pop class is the key to one subsystem:
   slaves to the land, freemen to gold and the market, citizens to influence and the vote.
   Every class must also have a seat in the Senate and a card it can chase.
4. **Specialization needs an exhaust.** A specialized player must be able to convert. The
   bank corridor exists; player trade is the exhaust and is load-bearing for builds.
5. **Clock first.** Forty-five to ninety minutes at four players is 12 to 16 rounds. Every
   payback period and minimum is priced against the clock, not the other way round.
6. **Four verbs.** Gain or lose N now; add or remove a pop; place or clear a token; change
   a rule. Nothing scales per pop, nothing is a coupon, nothing lingers except tokens.
7. **Four or fewer.** People subitize up to about four objects. Any quantity a player must
   hold in mind while deciding stays at four or fewer.
8. **Every build has a year it fears and a brake it feels.** A term that only ever hurts one
   build is a tax, not a mechanic.

## 4. What is actually being chosen

The first draft framed three directions. The critique showed that most of the value is in a
bundle that is independent of the tile question, so the choice decomposes:

| Layer | Decision | Options |
| --- | --- | --- |
| K · Class keying | Adopt | One pop one output; buildings raise a class column's printed value; citizens by promotion only; gold-mediated bank; gold and influence each with sinks |
| T · What the tile prints | ▲▲ Decided | **Nothing but terrain and slots.** Slaves are the tile's yield, one each, typed by terrain; free pops are the mouths; slaves do not eat. The fields idea and the yield-number idea are both withdrawn |
| P · Prices | Adopt | One printed price per verb, no modifiers; wide play braked by a piece supply, not a price |
| H · Happiness | Choose | **Level and tokens** (recommended) · clamped integer bank (fallback, buildable first) |
| C · Clock and Senate | Adopt | Years not seasons, a year deck as the clock, victory checked at year end, Assembly every other year, rule Laws |

A is the owner's stated leaning and restores the map decision the first draft lost: a plains
city feeds five free pops, a hill city one, so rich-but-cramped versus poor-but-roomy is back
as one printed number. B keeps landmark tiles at the cost of typed yields on every tile.
Everything else in this paper assumes A; B changes only section 5.2.

## 5. The recommended game: v0.1 spec

Every number is a placeholder to be tuned by simulation. The structure is the proposal.
Changes from v0 forced by the critique are marked ▲.

### 5.1 The settlement is three columns

| Pop | Produces | Eats | Also |
| --- | --- | --- | --- |
| Slave | 1 of the tile's terrain resource | ▲▲ nothing: fed by the land it works | counts toward unrest |
| Freeman | 1 gold | 1 food | |
| Citizen | 1 influence | 1 food | 1 vote |

One pop, one output. ▲▲ (v0.2, owner) Slaves do not eat. That single asymmetry removes the
food wall the first critique found (a plains slave is net plus one, not net zero) and gives
the two economies different brakes: the slave economy has no food problem and pays in unrest,
the free economy has no unrest problem and must be fed. ▲ Citizens are never grown; a freeman is promoted to a citizen for 2
gold, one ladder move per turn. Every citizen passes through gold and through the ladder,
so Civic Elite is a throttled ladder race and the fixed promote/demote ladder has a job.

### 5.2 Tiles print nothing but terrain and slots

▲▲ (v0.2, owner) A tile is a terrain and a building-slot count. It has no yield of its own
and no subsistence term. A slave is the tile's yield: one pop, one output, typed by the
terrain. No tile produces two things.

| Terrain | Slaves make | Slots | Reading |
| --- | --- | --- | --- |
| Plains | food | 1 to 4 | the granary of the island; the only place food is grown |
| Forest | wood | 1 to 4 | timber, the expansion currency |
| Mountain | stone | 1 to 4 | stone, the civic currency |
| Hill | nothing | 2 to 3 | a bad tile taken to connect: a chain link or a coastal step; a hill city is free pops and buildings fed from elsewhere |

Slots vary per tile as today, so a four-slot plains is a city site and a one-slot plains is a
farm colony; the landmarks are the big-slot tiles. ▲ One settlement per tile; the half-share
and co-tenancy go. The oracle stays unsettleable. Coastal tiles carry the luxury moorings.

Food arithmetic a player reads: free pops eat one each; food comes from plains slaves,
Granaries, the bank, the Dole, or trade. A citizen city of eight with one slave needs seven
food a turn, which a plains colony of four slaves with an Estate grows. A forest city of eight
slaves eats nothing and makes sixteen wood with an Estate, but sits at minus four before
Temples, calm, or a Port. The tension the fields idea promised, settling plains and building
at the cost of food, becomes a choice about who lives there: fill the plains city with slaves
and export food, or with citizens and import it.

### 5.3 Hunger

▲ If you cannot feed your free pops at income, one pop of your choice leaves and food stays
at zero. No debt, no compounding, no token. The penalty is a count, so it cannot be bought off
with calm.

### 5.4 Settlements

| Kind | Capacity | Slots | Cost |
| --- | --- | --- | --- |
| Colony | 4 | none (▲ a Port may stand in a coastal colony) | 4 wood + 1 food + one pop, ▲▲ four pieces per player |
| City | 8 | tile slots | upgrade: 3 wood, 3 stone, ▲▲ three pieces per player |
| Capital | 8 | ▲ 4 flat | |

▲▲ (v0.2, owner) Prices are flat; the brake on wide play is a **piece supply**, Catan's device.
Each player has four colony pieces and three city pieces. Upgrading a colony to a city returns
the colony piece, so once four colonies stand the only way to expand again is to make one of
them a city: the wide-to-tall conversion is built into the pieces, and a player understands it
the moment they see them. Idea 6 becomes one more colony piece. The rising price strip of v0.1
is withdrawn; a price that climbs with your own count reads as a penalty for playing.

### 5.5 Buildings raise a column's printed value

▲▲ (v0.2, owner) A building is per-pop again, without the support cap that was the nested
term. A building either **raises the printed value of one class column** in its settlement,
so every pop of that class here produces 2 instead of 1, or states one flat fact. One of
each per settlement, no stacking: the way to more gold is more freemen, not a second
Marketplace. In the three-column view the column header changes from 1 to 2 with the
building's name under it, which is the whole reading.

| Building | Cost | Effect | Max |
| --- | --- | --- | --- |
| Marketplace | 3 wood, 2 gold | freemen here produce 2 gold | 1 |
| Estate | 4 wood | slaves here produce 2 of the terrain resource (not on a hill) | 1 |
| Forum | 3 stone | citizens here produce 2 influence | 1 |
| Temple | 3 stone | +1 happiness | 2 |
| Granary | 4 wood | +2 food | 2 |
| Port | 4 gold, 2 stone | claims one adjacent luxury | 1 |

Workshop and Villa merge into the Estate. Odeon, Aqueduct, and Gymnasion are cut: calm and
luxuries are the non-citizen happiness sources, capacity never binds in a 14-year game, and
the Gymnasion's only effect was a price modifier. The Forum returns because influence is no
longer capped; its value depends on the influence sinks under discussion. A class-column
building is worthless with no pops in that column and twice as good with six, so the count of
each class is the decision, and the brakes on stacking one class are the ones already in the
spec: capacity, one food per free mouth, and the slave term in the unrest ledger.

### 5.6 Prices are single numbers

| Verb | Cost |
| --- | --- |
| Grow slave / freeman | 2 food / 3 food, once per settlement per turn |
| Promote slave→freeman / freeman→citizen | 2 food / 2 gold, one ladder move per turn |
| Demote one step | 1 influence (free during your own riot) |
| Move a pop between your settlements | ▲▲ 1 food per pop, one move per turn; the pop sent to found a colony moves free |
| Civic calm | ▲▲ 2 gold or 2 influence: +2 to your level until your next turn start |
| Venture | ▲ 2 gold, one stake only |
| Bank | ▲ as shipped, re-denominated: sell 3 of a material for 1 gold, buy 1 for 2 gold |
| Extra vote | ▲▲ 2 gold or 2 influence each, at most two |
| The Dole | ▲▲ 3 influence buys 1 food |
| Propose / repeal | 2 / 3 influence |

▲▲ (v0.2, owner) The influence cap proposed in v0.1 is withdrawn; no single resource is
capped. Influence gets sinks instead: calm and extra votes payable in influence (no arbitrage,
since gold and influence never exchange at the bank); the "lose N influence" verb on cards (a
Tribute year card, a harm card in the player deck, a Demagogue Directive); the sitting prices;
and **the Dole**, 3 influence for 1 food through the bank corridor, influence's only economic
exhaust, priced worse than gold's so it is a pressure valve and not an engine. Law upkeep was
considered and rejected: a Law is the table's act, not the author's. The sim check is that
median influence stock plateaus by year; if it does not, the sitting prices rise first. Gold is the civic and commercial
currency: it buys citizens, votes, calm, Ports, and Marketplaces, and it is what the bank
pays. No Granary discount, no coupons, no seasonal multipliers, no Law adjusts a price by a
delta.

### 5.7 Happiness is a level with one token type

```
level = temples + 2 × luxuries − slaves ÷ 2 − unrest tokens   (+2 if calm this year)
```

Nothing accumulates. ▲ Unrest tokens are placed by year cards, player cards, and
Directives, and are not bought off; they clear when a riot fires or a Festival is drawn.
▲▲ (v0.2, owner) The population term of v0.1 (pops ÷ 4) is dropped: capacity already caps
density and hunger now costs a pop, so food is the brake on size. Non-slave builds keep an
unrest frontier through tokens, which cannot be bought off and accumulate until a riot or a
Festival clears them; three tokens with no Temple is a riot. At the start of your turn, level at or below −3 sends you to the riot
table; at or below −6 it is a revolt. ▲ A riot first clears your Unrest tokens, then rolls;
pop losses take slaves first. ▲ A revolt is determinate: half your slaves leave, rounded
down, tokens clear, no roll. So unrest self-corrects by construction. The riot table and its
three insurance options stay; the concession may only demote a citizen. Losses are
re-denominated (3 food, 3 gold).

Beloved of the People reads the level without the calm bonus. This generalizes what the
luxury plan already designed: luxuries were always a standing offset that is never banked.

**Fallback, buildable first:** the current bank clamped to −10..+10 with integers only, the
food-stockpile bonus removed, hunger as in 5.3, and calm as a this-year bonus. Section 9
explains why this ships before the level model.

### 5.8 Years, not seasons

A round is a year. At the start of each year the top card of the **year deck** is revealed;
▲▲ the next card stays hidden (owner, Q65). The deck is the clock: 14 cards, dealt
once, seeded so the order varies but the mix does not. ▲ Every year card names a class or a
terrain and zeros one term for the year, so each year one kind of player is exposed;
symmetric gains are left to the player deck. ▲ Victory is checked at the end of each year,
after the last player's turn: hold three cards then and you win. The table always gets the
year to break a card off you.

### 5.9 The Assembly every other year

▲ Year cards are the house's rule changes; the Assembly votes only on player proposals, so a
sitting has zero to four items. Each player secretly chooses: pass, pay 2 influence to draw
from a politician and propose the card, or pay 3 influence to propose a repeal. ▲ Votes are
one per player plus one per citizen; extra votes cost 2 gold each, at most two; there is no
veto. A tie fails. At most four Laws stand; ▲ a new Law at the cap replaces the oldest, and a
Law cannot be repealed at the sitting right after it passed. Prizes are small one-shot gains.
▲ Voice of the Assembly is a level: most standing Laws you authored, minimum two, so repeals
and The Stele Is Broken are attacks on it.

Laws change a rule; they do not adjust a term. ▲ Three global rules: a Law never adds a
per-thing happiness term; a Law never removes what stands (a capacity or slot cut blocks new
growth, never counts existing pops as over capacity); at most one price Law stands and it
states the resulting price. Appendix B holds the rewrite, with at least one Law per
politician whose downside lands on the freeman build.

### 5.10 Victory

Six cards, checked at year end, three to win, most cards when the year deck runs out.

| Card | Condition | Minimum |
| --- | --- | --- |
| Polis Builder | most cities | 3 |
| Demos | most pops | 14 (▲▲ raised, since the piece supply now bounds population) |
| Civic Elite | most citizens | 5 |
| Beloved of the People | highest level, calm excluded | 4 |
| Voice of the Assembly | most standing authored Laws | 2 |
| Treasurer | ▲ largest gold stock | 30 |

▲ The first draft replaced Treasurer with a luxury-count card. The critique showed that card
is unbreakable (claims are permanent) and inverts the trade plan, which makes luxuries the
deal currency. Treasurer stays, gold-only, as the freeman's card. Cards fall roughly two per
class: slaves Demos and Polis Builder, freemen Treasurer and Beloved through Ports, citizens
Civic Elite and Voice.

### 5.11 What a player reads now

| Decision | Today | v0.1 |
| --- | --- | --- |
| Build a Marketplace | 8 to 13 | 4: two price numbers, stock, free slot; its worth is the freeman count already on screen |
| Grow a slave | 4 | 3: price, stock, room |
| Found a colony | 7 to 12 | 4: price, stock, a piece and a pop to send, a legal tile |
| One settlement's income | about 20 | 3 counts on printed values plus up to 2 flat building lines |
| Full income statement | 32 | about 7 per settlement, plus the year card and standing Laws |
| Happiness | 32 sources | 6 lines, all visible on the board |

## 6. Cards: from 107 faces to about 40

### 6.1 Grammar

Four verbs, printed with one number each:

1. **Gain or lose N X.** X is wood, stone, gold, food, or influence.
2. **Gain a pop.** A slave or a freeman, in a settlement with room.
3. **Place or clear an Unrest token.**
4. **Change a rule for this year.** Year cards only: one sentence, zero or one number.

No choices, no coupons, no timed effects, no per-pop scaling, no cost multipliers. The one
allowed choice shape is two sizes of the same verb where the bigger one pays, and v0.1 does
not use it.

### 6.2 Year deck (replaces seasonal deck and omen)

Fourteen cards, seeded order, next card hidden. Every card exposes one kind of player.

| Card | Text | Who fears it |
| --- | --- | --- |
| Drought ×2 | Plains grow no food this year. | plains cities and slaves |
| Wildfire ×2 | Forests yield no wood this year. | timber slaves |
| Silent Mines ×1 | Mountains yield no stone this year. | quarry slaves |
| Piracy ×2 | Freemen yield no gold this year. | the trader |
| Ostracism ×2 | Citizens yield no influence this year. | the citizen build |
| Blockade ×1 | Luxuries give no happiness this year. | the coast |
| Plague ×2 | Everyone places an Unrest token. | whoever is near the line |
| Festival ×2 | Everyone clears their Unrest tokens. | nobody; a kind year |

A Drought removes a whole term, like Catan's robber, instead of shaving one off a rate.

### 6.3 Player deck (one draw per turn)

Twelve kinds, forty copies, one harmful copy in four:

| Card | Text | Copies |
| --- | --- | --- |
| Good Stores / Timber / Shipment / Profit / Patronage | Gain 2 of X | 4 each |
| Free Settlers | Gain a freeman. | 3 |
| Captured Laborers | Gain a slave. | 3 |
| Rats / Bandits / Fire | Lose 2 of X | 3 each |
| Local Unrest | Place an Unrest token. | 3 |
| Public Calm | Clear one Unrest token. | 2 |

The sim found today's draws too small to change a decision. In an economy where income is
six to ten per turn, a gain of two is felt. Cutting the player deck entirely remains a
legitimate option; the year deck, ventures, and the riot table keep enough luck in the game.

### 6.4 Ventures

Keep all three tables; they are the most legible luck in the game and the only opt-in luck.
▲ One stake, 2 gold; the wood stake was a bank arbitrage today and would be again. Payouts 2
or 4 gold, 1 or 2 influence, 2 or 3 food with the settler jackpot, priced to a slightly
negative expectation.

## 7. What the critique found and what changed

Eight independent agents attacked the first draft: three per direction, then five lenses on
the recommended spec (degenerate strategies, a hand-walked six-year game with four builds,
the Law rewrite, engine feasibility, roadmap fit). All eight returned "flawed"; none "fatal".

| Hole in v0 | Found by | Change in v0.1 |
| --- | --- | --- |
| No pop produced net food; home fields on every settlement made the 4-wood colony both the food engine and the grow engine, so wide dominated Granary and Estate and was the snowball | A, degenerate, walkthrough | v0.1 tried fields grown by cities only; v0.2 (owner) settles it: no tile yield at all, slaves are the yield and do not eat, free pops are the mouths, and a piece supply replaces the price strip |
| Hunger as one token and calm as a 2-gold token made food upkeep a 2-gold tax, then free after three tokens | A, C, degenerate, walkthrough | Hunger costs a pop; calm is a this-year bonus; Unrest tokens are not bought off |
| Riots were unreachable for non-slave builds, and "a riot removes a slave" was false under the random table | C | Population term in the level (v0.2: dropped by the owner; tokens carry the frontier); riots clear tokens then take slaves first; revolt is determinate |
| Votes, influence, Temples, and Voice all keyed off citizens: three seats were Senate spectators and the citizen hill build won at year four unopposed | C, laws, degenerate, walkthrough | One vote per seat plus citizens; votes bought with gold; Voice is standing authored Laws; Beloved excludes calm; citizens only by promotion |
| Assembly every year with a five-item ballot cost a third of the session and turned Laws into weather | C, laws, roadmap | Every other year, player items only, oldest Law replaced at cap, minimum tenure |
| Thalassocrat was unbreakable and inverted the trade plan; the barter bank reversed the shipped bank decision | roadmap, degenerate | Treasurer stays gold-only; bank stays gold-mediated |
| Wood priced everything and the freeman was the dead class | degenerate, walkthrough | Sinks priced in each column's product; gold buys citizens, votes, Ports, Marketplaces |
| The year deck's asymmetric cards all hit the land build; its harsh-late arc punished the laggard | C | Every card exposes one class or terrain; flat arc |
| "Overlay, no engine change" was false; the level model is XL and untestable until built; the bots cannot measure build viability | feasibility | Section 9 rewritten as tiers; personality bots; clamped bank ships first |

Findings not adopted, with the reason: votes as influence spent (TI4) was rejected because it
makes influence a fourth price on every ballot; the speaker tie-break was rejected because a
tie failing is the right default for standing law and avoids a seat advantage; a size term of
one per settlement was rejected in favour of pops ÷ 4, which the owner then dropped as well
(v0.2): capacity and hunger already bound size.

Adopted after owner review (v0.2): the per-pop shape for buildings, raising a class column's
printed value, which two critics had proposed and the owner confirmed; and the withdrawal
of the influence cap in favour of sinks.

## 8. Owner decisions

Decided in the owner rounds of 2026-09-05 and 2026-09-06:

| Decision | Ruling |
| --- | --- |
| The tile | terrain and slots only; slaves are the yield and do not eat; free pops eat 1; hunger costs a pop |
| Buildings | per-pop, raising a class column's printed value; one per settlement |
| Influence | no cap; sinks are calm and votes in influence, the Dole, influence harm cards, sitting prices |
| Unrest | no population term; level = temples + 2 × luxuries − slaves ÷ 2 − tokens, +2 calm this year |
| Wide play | piece supply, four colonies and three cities, flat prices |
| Citizens | by promotion only |
| Bank, Treasurer | gold-mediated bank as shipped; Treasurer gold-only |
| Happiness build order (Q56) | clamped integer bank first as the cheap probe; the level model as its own slice if the bank still decays |
| Assembly (Q58) | every other year, player proposals only, no veto; votes one per seat plus citizens |
| Sixth card (Q59) | Treasurer gold-only until luxury suppression exists |
| Player deck (Q60) | kept at twelve kinds for the first sim tier |
| Clock (Q61) | fourteen years |
| Voice (Q62) | a level: most standing authored Laws, minimum two |
| Moving pops (Q63) | one pop moves free when founding; otherwise one paid move per turn (placeholder 1 food per pop) |
| Coastal leapfrog (Q64) | as today: any coastal settlement unlocks the coast; a Port is not required |
| Year card (Q65) | next year's card stays hidden |
| Luxuries (Q53) | coastal only, claimed by a Port, and the Port is never free; National Idea 10 is dropped |
| National Ideas (Q54, Q66) | not mutually exclusive: one picked at game start with immediate effect, one bought later with influence at a flat price |

The tile decision reverses two recorded decisions (landmark tiles, anti-proportional
yield) and is
filed as such.

## 9. What to build and simulate, in order

The first draft said "build it as an overlay". The feasibility lens showed that is true for
the economy and false for the happiness and Senate changes. Three tiers:

**Tier 0, overlay, no engine change.** A preset like `low-number-core-v1`: uniform pop
income, tile amounts zero, flat buildings expressed with a support cap of one, single prices,
a 14-card clock with existing verbs, victory minimums, a Law cap of four, no coupons. Run it
against the same seeds. Slaves not eating and tile yields of zero are both plain ruleset
and content patches, so the whole tile decision is testable in this tier.

**Tier 1, engine S each, needed to make Tier 0 honest.** Column-raising building effects
(a per-pop rate with no cap); one season per year in the calendar; hunger as a pop loss;
calm as a this-year bonus; the clamped integer happiness bank behind one `adjustHappiness`
seam; one settlement per tile; the colony and city piece supply; Treasurer as gold-only; and three
personality policies (`slaver`, `civic`, `trader`) as weight vectors over the existing
evaluator, because today's bots value citizens by constant and will report convergence under
any ruleset. Win rate by personality is the only sim measure of whether builds are viable.

**Tier 2, engine M to L, decided on evidence.** The level model with Unrest tokens, year
cards that zero a term, victory at year end, and the rule Laws as one typed union shared with
National Ideas (a Law as a ruleset patch read through an effective-ruleset selector: the
comparables' "Laws as track positions"). Fund the level model only if the clamped bank still
decays to riots in Tier 1.

Measure, against the same seeds: reads per decision; two-digit income share; rounds and
share ending by race; leader-to-laggard ratios by round; win rate by personality policy;
riots per game; share of draws whose swing exceeds half a turn's income; and Assembly minutes.
Then one four-player human session, the only measurement of feel.

## 10. What this does to the roadmap

- **Luxury goods** fit without change; the level model is the luxury model applied
  everywhere. The Port's job survives because calm expires and Temples need citizens.
  The happiness decision should be taken before the luxury slice 2 PR closes; its Port, claim,
  and transfer seams survive either way.
- **Player trade** becomes load-bearing for builds. The gold corridor is the bridge until it
  ships, and trade slices should precede the human session on the new economy.
- **National Ideas** are authored in the same grammar and in the same typed union as the
  Laws. Nine fit as written; Idea 6 becomes one more colony piece; Idea 4 grants one capital
  slot; Ideas 1 and 2 depend on the food decision; Idea 12 becomes a one-shot "cancel a
  proposal" token; Idea 10 is dropped. Ideas are no longer drafted: one is picked at game
  start with immediate effect and the second is bought later with influence, which is also the
  largest influence sink. The National Ideas plan carries the new shape.
- **The sim bots** get the new verbs and the personality policies in the same slice.
- **The UI** already has projected income with a per-settlement breakdown and effective
  costs at the action. The three-column settlement with its printed values and building lines
  is the new surface, and the level ledger replaces the happiness pill's three numbers.

## Appendix A — Manoeuvres, each removing a term or nesting level

| # | Manoeuvre | Removes |
| --- | --- | --- |
| M1 | Tile prints nothing; slaves are the yield, typed by terrain | tile-yield term, colony half-share, hill exception, fields |
| M2 | Free pops eat 1, slaves eat nothing; hunger costs a pop | class upkeep, food-shortage spiral, stockpile calm, starvation counter |
| M3 | One pop, one output; citizens by promotion | two-output citizen, citizen grow price |
| M4 | Building raises a class column's printed value, or states one flat fact | support caps, stacking, "level 2" ambiguity |
| M5 | Happiness as a level with one token type | drift, fractions, timed effects, 26 of 32 sources |
| M6 | Four card verbs | choices, coupons, scaling, multipliers, 30 effect types |
| M7 | Laws change a rule under three global limits | 22 derivative Laws, depth-4 term, retroactive riots |
| M8 | Year deck as clock, victory at year end, Assembly every other year | seasons, omen, 33-round horizon, tie on two clocks |
| M9 | Minimums re-denominated; Treasurer gold-only; Voice a level | hoarding of materials, the Voice ratchet |
| M10 | Colony and city piece supply, flat prices | frictionless wide play, and the dead colony-to-city path |
| M11 | One price per verb | three cost pipelines, zero-price stacks |
| M12 | Ladder one price each; influence capped | happiness side effect on demotion, influence pile |

## Appendix B — Law rewrite (16 Laws, 6 Directives)

Each Law changes a standing rule with a trade-off, zero or one number, and obeys the three
global limits in 5.9. Downsides are spread across all three builds.

**Demosthenes, the agrarian order**

| Law | Text |
| --- | --- |
| Land Reform | Slaves grow food on any terrain, but Estates may not be built. |
| Sacred Fields | Temples also grow 2 food, but cost 6 stone. |
| Manumission | Promoting a slave is free, but slaves count three times for unrest. |
| Tenant Rights | Growing a pop costs gold instead of food. |
| Grain Levy | Freemen eat no food, but Marketplaces do nothing. |
| Festival Calendar | Civic calm costs food instead of gold. |

**Perdiccas, the urban order**

| Law | Text |
| --- | --- |
| Public Works | Buildings cost 1 less wood, but colonies hold 3 pops. |
| Guild Charter | Your capital may grow twice per turn, but colonies may not grow. |
| Forum Rites | Citizens produce 2 influence everywhere, but freemen produce nothing in colonies. |
| Civic Pride | Each city gives +1 happiness, but each city pays 1 gold a year. |
| Master Builders | Cities gain one building slot, but you have one fewer colony piece. |

**Kleistophenes, the frontier order**

| Law | Text |
| --- | --- |
| Homestead Act | Colonies may hold one building, but cities lose one slot. |
| Colonial Charter | Founding a colony costs food only, but upgrading one costs 6 stone. |
| Frontier Spirit | Founding a colony grants a free slave, but colonies hold 3 pops. |
| Harbour Dues | Ports need no gold, but Marketplaces cost 4 gold. |
| Rural Bloc | Each colony casts one vote, but each city casts one fewer. |

**Stratokles, Directives (choose a rival)**

| Directive | Text |
| --- | --- |
| Grain Riot | They lose 3 food. |
| The Streets Burn | They place an Unrest token. |
| General Strike | They collect no income next turn. |
| The Mob Rises | They lose a pop from their largest settlement. |
| The Stele Is Broken | The newest Law they authored is repealed. |
| Isonomia | They have one vote at the next Assembly. |

Bread and Circuses is cut: it paid the target a calm cheaper than the calm action and shared
its name with that action. Cult of Demeter is cut: it read a stockpile the base game no
longer rewards.

## Appendix C — Method

Four parallel audits on 2026-09-05: an engine census of every constant and formula term, a
per-card grammar and legibility audit of all three decks and tables, a comparables and design
literature survey, and a matched simulation baseline (standard vs Lower Numbers preset,
`smart` ten games and `master` three games per condition, seeds 91000+). The synthesis and
the v0 spec were the author's; the v0 spec was then attacked by eight independent critique
agents whose findings are summarised in section 7. The four reports are linked at the top.
