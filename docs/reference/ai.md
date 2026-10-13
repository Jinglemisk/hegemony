# Bot players

The bots are simulation policies for balance batches and browser development.
Step 10 adds `slaver`, `civic` and `trader` as weight vectors over the shared
political scorer and master search. They are not separate implementations.
The [outcome-driven AI plan](../plans/outcome-driven-ai.md) remains future work.

## Contract

`Policy.choose(view, commands, rng)` receives the acting seat's `PlayerView` and
engine-enumerated commands. Costs, yields, capacity, happiness, Ideas, Laws and
victory titles come from engine selectors. Each hypothetical action uses the
canonical transition; execution uses that same transition in the browser and sim.

The view hides the seed, game RNG, draw order, next year card and rival private
Assembly cards. Setup Idea picks are public as they land. Choices are pure functions of the view,
commands and injected bot RNG. Placement and Idea ties use that bot stream;
ordinary search ties keep enumeration order. Bot randomness never changes the
game's card or die stream. `?dev=bots` still uses `master` for every browser seat.

## Policies

- `random`: choose a move type uniformly, then a command within that type.
- `greedy`: one-ply search over the simpler population/material score.
- `smart`: one-ply search with class, material, work-slot and luxury values.
- `beam`: smart score with width 3, depth 4 search within the current turn.
- `political`: smart score plus standing authored Laws, using one-ply search.
- `settler`: smart score plus the one-step expansion frontier, using one-ply search.
- `master`: political score plus the frontier, using the beam.
- `slaver`, `civic`, `trader`: master with the following initial weights.

These are starting preferences. Step 11 measures whether each build can win.

| Weight                | Master | Slaver | Civic | Trader |
| --------------------- | -----: | -----: | ----: | -----: |
| Slave                 |    1.2 |    4.5 |   1.2 |    1.2 |
| Freeman               |      2 |    1.5 |     2 |      4 |
| Citizen               |      3 |    1.5 |   4.5 |    1.5 |
| Food                  |    0.4 |    0.4 |   0.4 |    0.4 |
| Wood                  |    0.6 |      1 |   0.5 |    0.5 |
| Stone                 |   0.85 |      1 |   1.2 |    0.7 |
| Gold                  |      1 |    0.8 |     1 |    1.8 |
| City                  |      6 |      8 |     6 |      6 |
| Colony                |      3 |      4 |     3 |      3 |
| Standing happiness    |      6 |      4 |     8 |      6 |
| Influence             |      2 |      2 |     3 |    1.5 |
| Claimed luxury        |      6 |      6 |     6 |      9 |
| Standing authored Law |      8 |      4 |    16 |      4 |
| Frontier              |      2 |      2 |     2 |      2 |

Population, city and colony weights are multiplied by 10. Projected materials
and latent work are multiplied by 10/8. Influence, happiness, luxury and Law
weights apply directly; every held victory card is worth 120 for all personalities.
Pops on the move count in the population sum. The standing-level cap is the
Beloved minimum plus two. A starved pop costs every build the same; a riot and a
revolt are charged at the build's own weights.

A slave with no slot to work carries half the slave weight. It is still a head for
Demos and the tiebreak and can be moved or promoted, but it makes nothing and
costs the level like any other. At the full weight an idle slave was worth as much
as a working one, so filling an open slot with it paid nothing: with the move's 1
food it scored below leaving both as they were. A slave on the move is read where
it is going: it works there if a slot is open.

A claimed good's +2 is priced by the level weight, point for point with a Temple.
The luxury weight is what comes on top: 6 a good, so a good is worth 18 where two
Temples are worth 12. It pays for what the level term cannot see: a good keeps
its worth past the level cap, where Beloved is decided, and a good claimed is one
no rival can claim. The weight was 36 until Step 18, sized against v1's Port price.

The slaver values slaves, Estates' real production, yielding slots and expansion.
The civic values citizens, Forums' influence, Temples and standing Laws toward
Voice. The trader values freemen, Marketplaces' gold, Ports and luxuries. Buildings
have no personality bonus: their changes to income, slots and happiness carry
the value. Each build can convert through the bank and choose ventures in search.

## Search and forecasts

All optional economic actions enter search, including unit bank buys and sells,
the Dole, calm, Ideas and ventures. A bank sale can unlock a building or promotion
later in the same four-action search. A seat has one move a turn, so the engine
offers a few bundles for each pair of settlements: one pop of a class, all of a
class, everyone, and as many slaves as the target has slots open. The last is the
one that puts two of four idle slaves to work. A riot on the table has its own
handler, below; search never evaluates the live riot roll.

Ventures are chance leaves at every search depth. Score every public die face,
and every uniform settlement destination for the Voyage jackpot, with its actual
probability. Synthetic RNG seeds reproduce those outcomes through canonical
transitions independently of the game's RNG. Compare the expected score with the
other branches; after execution, observe the real roll and replan. This supports
bank-to-venture sequences without expanding subsequent turns or a chance tree.
A negative mean gold payout can still be useful near a title threshold. Equal
positions at the same depth are expanded once. Scores are shared across depths
and venture outcomes within one decision, keyed by the economic fields that can
change during that search. Logs and the last roll display do not distinguish
positions. When the only optional first move already improves the score, return
it immediately: deeper search cannot change that first move. A costly first move
still gets the full search to find a later payoff. Width, depth, odds and tie order
stay unchanged.

Forecast at most six incomes, bounded by the years remaining. This year's card
applies only to a seat that has not collected; later incomes use printed values.
The projection checks the current turn end, with calm and the current year card
still active, even when no future incomes remain. Every projected turn end, the current
one included, settles engine hunger first (one pop per missing food, freemen first), so a
bot sees a shortfall in its own turn and can buy food. Pops on the move arrive before
the first forecast income. Until then the current check reads them as the engine does:
their slaves count for the level and hunger cannot take them. It runs deterministic
revolts, runs a riot at its table's expected loss, and recalculates income after pop
losses or the year's card expires. Otherwise it reuses income through the horizon;
stocks and tokens do not change printed yields. It assumes no future card or token
changes.

On a later forecast turn the seat buys the food it is short of before anyone
leaves: bank food for gold or the Dole for influence, at the prices the engine
charges that seat, the cheaper first by its own weights. Only what it cannot pay
for starves. The gold and influence leave the forecast stocks, so a realm fed from
the bank is seen to hold less. Before this every eater beyond what the land grew
starved in the forecast whatever the seat held, and no build grew past its food
line. Two turns are left out. The current turn is not bought for: that food the
seat has to buy itself, now. And setup does not count on the bank: it picks land
for fourteen years and the forecast sees six, so a starting store and six years of
gold would make any site look fed.

On a later forecast turn the seat also buys calm when its level stands at the riot
or the revolt line and calm moves it off: once a year, at the price the engine
charges that seat, the cheaper payment first by its own weights, from the forecast
stocks and after the food. Before this a slave past the standing level read as a
riot in every year of the forecast whatever the seat held, so no realm kept more
slaves than its Temples and goods covered: four masters bought calm 0.35 times a
seat-game with 2 influence in hand on 80% of their turns. The same two turns are
left out: this turn's calm is the seat's to buy, and setup buys none.

The master and the three personalities also count what a seat is saving toward. At
each choice the seat lists every building, upgrade and colony a full store could buy,
with what each would add to its score where it holds the price and no more. A state
is then worth the best of those still open, for the share of the forecast left once
its stocks and their income reach the price: the next year at the soonest, so buying
is always worth more than holding the price, and never where the realm is short of a
material it makes none of. Before this a stock was worth its flat weight whatever it
could buy, and the search plans inside one turn, so nothing made wood worth cutting
toward a Granary four years off. Four masters cut 0.2 wood a turn, sold two fifths of
their stone to the bank and stood at four settlements from year 2. The other policies
are left as they were, so the earlier comparisons between them still hold.

Past the six-year horizon the forecast follows only the food and what pays for it, to
the game's last year: the closing income each year, the shortfall bought the same way,
and a pop gone for each food the stocks cannot pay for. It reports them as
`starvedAfterHorizon`, each counted by the share of its remaining incomes that the pop
misses, and the score charges them at the starved-pop weight. So a seat does not grow
an eater its gold feeds for six years and loses in the seventh, and it still feeds the
pops it has for as long as it can pay.

A realm that buys its food each year also keeps one year's purchases in hand
(`leanYearValue`). Drought stops the plains' food and Piracy the freemen's gold; in
such a year the income that pays for the shortfall does not come. Each food of the
standing shortfall that the seat's food, gold and influence could not cover is charged
as a pop lost, weighted by the share of those cards in the year deck. A realm its own
land feeds is charged nothing.
Influence uses projected income too, so a Forum pays back
through its actual citizen column; Civic Tradition needs no duplicate future bonus.

Engine queries reuse immutable Law/Idea effects and tile indexes. Changed drafts
and mutable fixtures still read their current inputs. Definition checks unwrap
unchanged draft aliases before hashing. These caches remove repeated work from
candidate transitions and Assembly forecasts without changing rules or saved state.

A projected lost pop costs 60, above every personality's population weight.
There is no food reserve. Hunger is settled at turn end, so a seat that income
leaves short buys food on that turn at the same price: food held ahead of the
shortfall buys no safety, and the forecast buys the same food in the year it is
needed, so buying it early scores nothing. Each food a seat is short of now also
costs 74, on top of the pop the forecast sees leave. The forecast counts pops lost
and not when. So a seat whose gold could not feed everyone through the forecast
let pops go while it could still pay. At the old charge of 14, with 20 gold and
six short, it bought four food and kept 12 gold for the others; with no charge,
with 4 gold and three short, it bought wood. The charge outweighs one more pop
lost in a later year, 60, and the dearest food a build can buy, the civic's Dole
at 9, so a seat that can pay feeds its pops first. From zero food its search can
reach the slave that would feed them; from six short it cannot. A short seat also
funds the Colonists' Voyage: its 2 gold bring 1.5 food on average against the
bank's one. There is no hard-coded trade order.
Latent slave slots count only where population room remains, including transfers
already committed to that settlement.

Calm enters search at its engine price. The owner ruling of 2026-10-03 puts riots
and revolts at turn end, so calm bought after income protects the current check.
It expires at the year boundary and never counts for Beloved. Bots weigh calm,
Temples and ladder changes against the visible turn-end risk.

A riot is charged what the riot table is expected to take, read from the engine's
table: every face at equal odds. The pops are charged at the weight of the class
the table takes next (slaves first), a burned building at what the seat would pay
to raise it again, and the food and gold at what the realm could hand over. With
no building to burn or under 3 gold the table takes a pop more often, and the
charge follows. For the default weights a riot that takes slaves costs about 10,
and 30 or more for the slaver; it was a flat 50. The pops also leave the forecast
board once the expected losses add up to a whole one, so a level that six slaves
hold at −3, in a realm that cannot pay for calm, riots twice and then stands at −2
with five. Before, it rioted at
every check to the horizon: 350. A revolt is run as the engine runs it and charged
the slaves it sends away. A level one step above the riot line is charged a fifth
of a riot at each later turn end, a level two steps above half that: the chance
that a token card or a lost good pushes it over. The current check charges only
an actual riot or revolt.

So calm is bought where it avoids a riot inside the forecast: in the last year, in
a Blockade year, and in any year by a seat that can go on paying for it, which then
grows the slaves calm makes room for. A realm with nothing to buy calm again faces
the riot that six slaves bring every year, unless it weighs a slave heavily: calm
would only move it a year.

At the riot table a bot buys the insurance that leaves it best off and rolls when
none pays, the concession included. The forecast charges the pending riot at the
insurance bought so far, so an option is worth the loss it saves at the seat's
weights, less its price. The rule used to buy the bread dole and patronage
whenever it could pay and never the concession. No bot concedes its last citizen.
Resolving the riot passes the committed turn.

## Hunger

When it ends a turn short of food, a bot weighs each legal split of the loss
between freemen and citizens (each pop from the settlement holding the most) with
its scorer. Ties keep the freemen-first default, which enumeration lists first.

## The last citizen

No bot gives up its last citizen while it has another choice. Search does not
weigh the demotion of a realm's only citizen, nor a hunger split that takes every
citizen, and the riot handler does not weigh the concession that would demote it.
The scorer prices a citizen by its pop weight and influence income and
not by its vote, so the trader, which weights a freeman higher, demoted its setup
citizen in 39 of 40 games and then played without influence, a second Idea or a
second vote. A value for the vote is Step 19's.

## Setup, Ideas and the Assembly

Policy openings use each seat's own personality for placements and its pick in
the open Idea draft, scoring only the Ideas still untaken; purchases likewise
search only untaken Ideas. Fixed openings fix placement only; Ideas still use the seat's scorer.
Random openings choose uniformly. New games without a named policy retain the
neutral placement/Idea scorer. Ordinary purchases enter the seat's normal search.
Immediate grants and permanent income use real transitions/projections. Future
pieces, founding grants, upgrade grants, Dole savings and extra votes use the
Step 9 opportunity estimates, scaled by the relevant personality weights. Future
slave grants also pay their standing-level cost, tripled under Manumission.
Frontier Charter reads the colony limit Master Builders leaves. City Pioneers
counts only colonies the engine would let upgrade: none beside a city. Public
Dole's saving is one Dole a year for each of the realm's first two mouths,
whatever its food income, so a holder is never paid for being short.

Placement adds 6 for a colony that could still be upgraded, scaled by the city
weight. A founding colony beside a city can never become one, so between
comparable sites the open coast wins. A capital is chosen from the three tiles
that rank best on their most even pop split. The founding colony is scored on
every split of every tile: ranked on the even split alone, a tile worth two
slaves fell out of the top three, and the colony went beside a city on a worse
score.

The frontier term is nothing for a seat with no colony piece left. An upgrade
frees a piece and brings it back.

All non-random policies use one Assembly handler. It scores real enactments and
repeals, draws against unordered public composition, supports modest private
costs to form coalitions, blocks a rival's winning title, and buys only affordable
pivotal votes. The acting personality weights both its own and rival score changes;
coalition prediction assumes that same public scoring lens for uncast votes.
A ballot item is worth the seat's own gain minus the best rival gain, plus what
the leading rival loses. Without that last term a Directive was worth only its
prize, since an untouched rival's zero gain hid the target's loss, and no bot drew
from Stratokles even to stop a winning Voice. An untouched leader adds nothing, so
the seat's own gain counts once.
Mixed tables route every Assembly action to its actual seat, including when a
sitting spans one opener's player-turn.

Capital Works adds no benefit that Urban Planning lacks when both are available:
Urban Planning covers the capital and later cities at the same price. Harbour
Planning credits a saved slot at the ordinary projected material value for an
owned unclaimed Port site; if the site has no building slot left, use half a
luxury's weight for opening that claim instead. Count at most one prospective
site per distinct claimable good, keeping the most valuable sites. Existing Ports
use their real slot value. Treasury Grant matters when gold can fund a move or
take Treasurer; Assembly Brokers values future third-vote opportunities at the
personality's politics weight. No Idea receives a fixed selection quota. Step 11
should distinguish missing opportunity from weak or dominated content when reading
unused Ideas.

## Limits and validation

Search cannot plan a sequence across turns, model general rival replies, or plan
multi-hop routes. Saving is a value on the stocks and not a plan: a seat that makes
none of a material does not save gold to buy it at the bank, and does not found a
forest colony in order to cut wood later. The forecast buys food and calm and loses pops to riots, and
nothing else: it does not grow slaves or raise a building in a later year. The
risk of standing near the riot line and future Idea opportunities are heuristics.
Venture expectation is exact for the shipped public tables; it does not implement
the outcome-driven AI program. Focused tests cover build preferences, food rescue,
bank-to-Port sequences, venture odds and title decisions, Idea picks/purchases,
private-information invariance, seat routing and telemetry denominators.

Use the rotated [simulation commands](simulation.md) for full-game evidence.
Record seeds, definitions, policies and opening type before interpreting balance.
