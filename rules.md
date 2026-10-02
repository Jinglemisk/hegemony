# Hegemony — How to Play

Hegemony is a strategy game for up to four players, each building a Greek
city-state into the dominant power of an island. You gather resources, grow your
people, found colonies, upgrade them into cities, and raise buildings to
out-produce your rivals.

> This guide covers the game as it plays today. A few systems (luxury goods and
> later-phase additions) are still being designed and are noted
> where they come up.

---

## The board

The island is a grid of 37 hex tiles. A tile prints two things: its terrain and a
number of **slots**. The land makes nothing by itself. A slave working the tile makes
1 of the terrain's resource:

- **Forest** → Wood
- **Mountain** → Stone
- **Plains** → Food, the only food grown on the island
- **Hill** → _nothing._ A hill's slots hold buildings, and slaves there sit idle. Your
  freemen and citizens live on a hill fed from your shared food.
- **Oracle** → a single sacred hole. It has no slots and **can never be settled** — a
  permanent gap that colony chains must route around.

Gold is **never** made by the land. It comes only from your freemen, events, and
trade.

**Slots are one pool, shared by buildings and working slaves.** Each open slot holds
one working slave; each building takes a slot. A seven-slot plains with no buildings
puts seven slaves to work for 7 food; raise one building and six can work. Slaves
beyond the open slots sit **idle** and make nothing. Only slaves take slots: freemen
and citizens need none.

Slots run from 2 to 7. The big tiles are the landmarks: the seven-slot **breadbasket**,
the six-slot **quarry**, the five-slot old-growth forests. So the map asks who lives
where: fill a big plains with slaves and export food, or build on it and import.

## Resources

You keep track of six resources:

- **Wood, Stone, Gold, Food** — the material goods you spend to expand and build.
  Gold doubles as the **unit of account at the bank** (see The bank, below).
- **Influence** — a political currency earned by your citizens. It stabilizes the
  province (civic calm), pays for demotions on the social ladder, buys food through
  the Dole, buys riot insurance, and funds Assembly draws, repeals, bribes, and vetoes.
- **Happiness** — the mood of your people. It is lifted by temples, luxuries, stored
  food, and civic calm, and dragged down by slaves and overcrowding.

You begin each game with **8 wood, 4 stone, 4 gold, 12 food**, and 0
influence and happiness.

## Your people

Every settlement is populated by three kinds of pop. One pop, one output:

- **Slave** — makes 1 of the tile's resource when it holds an open slot, and eats
  nothing. Every two slaves in your realm, working or idle, cost 1 happiness a turn.
- **Freeman** — makes 1 gold, and eats 1 food.
- **Citizen** — makes 1 influence, holds a vote in the Assembly, and eats 1 food.

Each pop fills one unit of a settlement's population capacity. Citizens are never
grown: after setup, every citizen is a freeman promoted on the social ladder.

## Settlements

You hold three kinds of settlement:

- **Capital** — your first settlement. It holds up to 8 pops and builds on its
  tile's slots, like any city. You have exactly one.
- **City** — an upgraded colony. It holds up to 8 pops and builds on its tile's
  slots.
- **Colony** — a small outpost. It holds up to 4 pops and raises no buildings, so
  every slot on its tile is a work slot. The one exception is a **Port** on the coast,
  which takes one of those slots. Two colonies belonging to different players may
  share a single tile; they **split its slots**, and the colony founded first takes
  the odd one.

Nothing raises a settlement's capacity.

**Pieces.** You have **4 colony pieces and 3 city pieces**; the capital is its own
piece. Upgrading a colony hands its colony piece back. So once four colonies stand,
the only way to found another is to make one of them a city, and after three upgrades
your cities are all placed.

## Setting up

Players place a **metropolis** and a **founding colony**, in **snake order** —
metropolises go around the table one way (first player to last), founding colonies
come back the other way, so whoever picked last picks first in the second round:

1. Each player places their **metropolis** — their mother city — on an empty tile,
   never adjacent to another city, with **4 starting pops**: exactly **1 citizen**,
   and 3 more split between freemen and slaves as you choose.
2. In reverse order, each player places their **founding colony** (2 pops, freemen
   or slaves) — on **any coastal tile** (the great colonization: your settlers
   sail), or on a tile beside your metropolis.

Then the game begins. Your metropolis is your only city at the start — your seat of
building and population; it carries no special bonuses, only its head start. The
founding colony is your second pole, waiting to be grown or upgraded into your
first daughter city. (Some modes change the opening — _deathmatch_ places three
colonies.)

By default the island uses the classic authored layout; start the game with
`?board=shuffled` in the address bar for a randomized (seeded) island.

## Taking a turn

Play passes around the table. On your turn:

1. **Income is collected automatically.** Every settlement adds what its pops make,
   and your freemen and citizens eat 1 food each. If the food runs short, **hunger**
   strikes (see Happiness and food).
2. **Resolve your event card**, if one was drawn for you (see Events below) — you
   must do this before anything else.
3. **Take actions**, in any order you can afford:
   - **Found a colony** — 4 wood, 1 food and a colony piece. Sends one pop out to
     settle a new tile; that pop moves free. The tile must **border one of your
     settlements** (colonies count, so your frontier chains outward tile by tile) —
     **or lie on the coast, if you already hold any coastal settlement**: the sea
     connects every shore, so a coastal power may sail to found colonies anywhere
     along the rim.
   - **Upgrade a colony into a city** — 3 wood, 3 stone and a city piece. The city
     keeps the colony's pops and buildings, drives off any enemy colony sharing
     that tile, and hands the colony piece back.
   - **Grow a pop** — add one pop to a settlement that still has room: a slave
     costs 2 food and a freeman 3 food. Citizens cannot be grown. Each settlement
     can grow once per turn.
   - **Move pops** (one move per turn) — shift pops between your own settlements
     for **1 food a pop**. The target must have room, and they arrive at the start
     of your next turn.
   - **Build** — raise a building in a city or capital that has a free slot.
   - **Trade at the bank** — sell materials for gold or buy them with gold, as
     often as you like (see The bank).
   - **The Dole** — **3 influence buys 1 food**, as often as you can pay.
   - **Civic calm** (once per turn) — **Stabilize Province** for 2 influence, or
     stage **Bread & Circuses** for 2 gold. Either way: **+2 happiness until your
     next turn starts**. Calm is never stored, and one calm action per turn is the
     limit.
   - **The social ladder** (one move per turn) — promote a slave to freeman for
     **2 food**, or a freeman to citizen for **2 gold**. Demote one step for
     **1 influence**. (During a riot, demotion is free — the mob forces it.)
   - **Fund an expedition** (once per turn) — stake **5 gold or 8 wood** and roll
     on an expedition table (see Ventures).
4. **End your turn.**

Once all four players have taken a turn, a new **season** begins and a fresh
seasonal event is revealed. Play runs through the year in order — **Spring,
Summer, Autumn, Winter** — and then a new year opens on Spring again, with the
**first player rotating one seat** (the year turns, the order turns). Each season
has its own mood: Spring and Summer tend to be kind (growth, building, trade),
Autumn is the mixed harvest, and Winter leans harsh. That is a _tendency_, not a
rule — Winter simply deals more hard-luck cards, so a mild Winter is still
possible, and no season is ever guaranteed good or bad.

## The bank

The bank trades materials against gold — never material for material. Its rates
never move: every material **sells 3 for 1 gold** and **costs 2 gold to buy**. Find
it in the realm's **Market** page and under the Exchange verb.

- **Sell**: hand over the sell-rate of a material, take 1 gold.
- **Buy**: pay the buy-rate in gold, take 1 of the material.
- **No limit** on trades per turn — but every round trip pays the spread, so
  trading always shrinks your total stockpile (the Treasurer card counts gold
  too; the bank never inflates it).

The bank is a corridor, not a merchant — its fixed rates are the walls that
player-to-player trade (a later phase) will negotiate inside.

**The Dole** runs through the same corridor: **3 influence buys 1 food**. It is the
one way influence reaches the granary, and it is priced worse than gold on purpose.

## Ventures — Fund an Expedition

Once per turn, stake **5 gold or 8 wood**, choose an expedition, and roll a d6.
The stake is spent win or lose; the low rolls simply return nothing:

- **Merchant Convoy** — 3–4: 5 gold · 5–6: 9 gold.
- **Grand Embassy** — 3–4: 3 influence · 5–6: 6 influence.
- **Colonists' Voyage** — 3–4: 5 food · 5: 8 food · **6: settlers arrive** (+1
  freeman in a settlement with room, +2 food).

Every table pays out slightly less than it costs on average — the expedition is
a gamble, and it is _meant_ for whoever is behind and needs the swing.

## Buildings

Buildings are raised in a city or capital. **One of each per settlement**: the way
to more gold is more freemen, not a second Marketplace. Every building takes one of
its tile's slots, and so one place where a slave could have worked.

Three buildings raise a class: every pop of that class in the settlement makes 2
instead of 1. The other three state one fact.

- **Marketplace** (3 wood, 2 gold) — freemen here make 2 gold.
- **Estate** (4 wood) — working slaves here make 2 of the tile's resource. It
  cannot stand on a hill. It takes a slot itself, so it pays only where at least
  two slaves still have slots to work.
- **Forum** (3 stone) — citizens here make 2 influence.
- **Temple** (3 stone) — +1 happiness each turn.
- **Granary** (4 wood) — +2 food each turn.
- **Port** (4 gold, 2 stone) — claims one adjacent **luxury good** (below). It needs
  the coast, an unclaimed good adjoining the tile, and room under your active cap. A
  colony may raise one; it is the only building a colony can hold.

## Luxury goods

Six named goods — Tyrian Dye, Pearls, Coral, Glassware, Incense, Fine Linen — sit
moored off the coast, each at a point shared by **two** coastal tiles. A **Port**
raised in a settlement on either tile claims the good; **the first Port wins**, and
the good stays claimed for the rest of the game. Each good is unique: one copy, one
owner.

Every **active** good raises your **effective happiness** by +2 — a standing floor,
never banked. The riot and revolt thresholds and the **Beloved of the People**
laurel all test the effective number, so wherever happiness is shown you see the
stored figure, the luxury offset, and the effective total. At most **3** goods are
active at once; goods past the cap stay owned but inactive.

The intended play: every two slaves cost 1 happiness a turn, and a luxury lifts the
line that loss is measured against. Luxuries buy the right to expand ugly, not calm
itself.

## Happiness and food

Happiness is your civilization's stability. It moves each turn:

- Every **two slaves** in your realm lower it by 1; an odd slave costs nothing.
- Each **Temple** raises it by 1, and stored **food** helps — for every 5 food you
  are holding, you gain +1 happiness when income is collected, **up to +2** (full
  granaries calm the city; hoarding beyond that does not).
- **Overcrowding** costs you: every pop over a settlement's capacity is -1
  happiness per turn.

**Hunger** is separate from happiness, and calm cannot buy it off. If income cannot
feed your freemen and citizens, **one pop leaves for each unfed mouth** and your food
stays at zero: no debt carries over. Freemen leave before citizens, each from the
settlement holding the most of them. Slaves eat nothing and never leave for hunger.
Food never goes below zero: a sacked granary or a bad card stops at empty.

When happiness turns **negative** it reads as unrest, and unrest has teeth. At the
start of your turn — before you collect income — **effective happiness (stored, plus
your luxury offset, plus calm bought last turn) at −5 or lower puts you on the riot
table**. Your turn stops until the die is rolled:

| Roll | Outcome                                                                              |
| ---: | ------------------------------------------------------------------------------------ |
|    1 | The mob torches the works — lose 1 pop **and** a building (no building? lose 2 pops) |
|    2 | Revolt spreads — lose 2 pops                                                         |
|    3 | Blood in the streets — lose 1 pop                                                    |
|    4 | Granary sacked — lose 6 food                                                         |
|    5 | Bribe demanded — lose 6 gold (lose 1 pop if you can't pay in full)                   |
|    6 | The mob disperses — no loss                                                          |

Before rolling you may **declare insurance** — each option once per riot, each
adding **+1 to your roll**: a **bread dole** (4 food), a **concession** (demote
one pop, free), or **patronage** (3 influence). Declare all three and a plain
riot can no longer cost you pops — you have converted catastrophe into taxation.

**At −10 or lower the riot is a revolt:** the roll takes a **−2** penalty, all pop
losses are **doubled**, and after the dust settles happiness rebounds to **−4**.
A plain riot never rebounds — it will fire again next turn unless you fix the
cause. Civic calm holds the line for one turn; it does not raise what is stored.

Pops lost to a riot are chosen at random across your settlements — the mob decides,
not you. Some events also sow **lingering unrest** — a penalty like "−2 happiness per
turn for 3 turns" that bites at the start of each of your next few turns before
fading.

Happiness never drifts back up on its own — you climb out of unrest by fixing its
causes (free or move slaves, ease overcrowding, build Temples, buy calm). Losing pops
does at least shrink those causes, so a collapse tends to bottom out rather than
spiral.

## Events

Two decks of event cards bring swings of fortune:

- **Seasonal events** are revealed at the start of each season and affect
  everyone — for example, "all players gain 2 food this season." The season
  shapes which of these come up: a good harvest is far likelier in Autumn than a
  drought is, while Winter tips the odds the other way. No season is ever
  entirely safe — spring can flood, summer can burn.
- **Player events** are drawn for the active player and must be resolved before
  you take your normal actions. Roughly three draws in four are good news —
  windfalls, a choice like "gain 6 wood and lose 1 happiness, or gain 2 wood with
  no penalty," or a **grow coupon** that makes your next pop of a given type
  cheap **this turn only**. The fourth is a bite: rats in the granary, bandits on
  the roads, a warehouse fire. A loss can never take more than you have.

Each spring the year's opener also rolls the **yearly omen** in public: one d6
sign — kind rains, silent mines, a golden age — that adds or takes **1 of one
resource from every player's income** until the year turns. It sits in the
top-left event row beside the season and player cards all year; everyone plays
under the same sky.

Nothing here is secret except the shuffle: press the **Codex** disc on the left
rail (or press `?`) to open the **Compendium** — victory standings, every dice table (the
omen included), this board's bank rates, both decks' full composition, and a
costs cheat-sheet.

## The Assembly

At the start of each spring from Year 2 onward, normal play pauses while the Assembly
convenes. The house places one random **Law** on the ballot. Each player then decides in
secret whether to pass, pay 3 influence to draw from a chosen politician, propose the
drawn resolution, or pay 6 influence to propose repealing a standing Law. A redraw costs
another 3 influence.

The Assembly then reveals every proposal and votes on each item in order. Your base vote
equals your citizens. During your vote you may buy up to two extra votes for 10 influence
each, or spend 5 influence on your once-per-Assembly veto. A simple majority passes and a
tie fails. No more than six Laws can stand; a new Law proposed at the cap must name the Law
it will replace.

Demosthenes, Perdiccas, and Kleistophenes offer standing table-wide Laws. Stratokles offers
one-time **Directives**; their author must name one rival before sealing the proposal, and
the target is revealed before voting. The house never draws a Directive. Politician power
and patron labels describe the visible stelae only and grant no bonus.

Every player-authored resolution that passes permanently adds one to that player's Voice
record and immediately grants its politician's one-time prize: Demosthenes gives 5 food,
Perdiccas 3 stone, Kleistophenes 4 wood, and Stratokles 2 happiness. House Laws, failed or
vetoed proposals, and repeals grant no prize or Voice progress. Repealing or replacing a
Law never removes progress already earned.

## Winning — the victory race

Six **victory cards** sit face-up from the first turn. Five read **"Most X,
minimum Y"** and belong to the _sole leader_ in that category who also meets the
minimum — ties, or leading below the minimum, leave those cards unheld:

| Card                  | Condition                         | Minimum |
| --------------------- | --------------------------------- | ------: |
| Polis Builder         | most cities standing              |       3 |
| Demos                 | most total pops                   |      16 |
| Civic Elite           | most citizens                     |       8 |
| Treasurer             | largest banked material stockpile |      80 |
| Beloved of the People | highest happiness                 |     +10 |

Beloved of the People reads stored happiness plus your luxuries. Calm bought for the
turn does not count.

The sixth card, **Voice of the Assembly**, uses the permanent Assembly record. The first
player to pass 3 authored resolutions claims it. A tie does not dislodge the holder; a
rival takes Voice only by strictly exceeding the holder's count.

No card can be held at the start of the game — every minimum sits above anything
your setup and first turn can produce. Holding a card is an achievement, never a
starting condition. (With one starting city, Polis Builder takes two colony
upgrades — the race to your third city is the long game.)

**Hold any 3 cards at the start of your own turn and you win on the spot.** The
check happens at your turn start, so the table always gets one full round to see
you sitting at three and break a card off you.

The **seasonal deck is the game's clock**: it never reshuffles, and one card
leaves it every season. If it runs out before anyone wins the race, the age ends
and **most victory cards held** takes the game (ties break on happiness, then
population). Track the race in the ledger's **Victory** tab; the top bar shows how
many seasons remain.
