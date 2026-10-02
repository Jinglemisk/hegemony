# Hegemony — How to Play

Hegemony is a strategy game for up to four players, each building a Greek
city-state into the dominant power of an island. You gather resources, grow your
people, found colonies, upgrade them into cities, and raise buildings to
out-produce your rivals.

> This guide covers v2 through Step 7. The Assembly keeps its remaining bridges
> until Step 8 replaces them.

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

Happiness is not a resource. It is a **level** you read off the board each turn (see
Happiness and food): Temples and luxuries raise it, slaves and Unrest tokens lower it.

You begin each game with **8 wood, 4 stone, 4 gold, 12 food**, and 0 influence.

## Your people

Every settlement is populated by three kinds of pop. One pop, one output:

- **Slave** — makes 1 of the tile's resource when it holds an open slot, and eats
  nothing. Every two slaves in your realm, working or idle, take 1 from your happiness.
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
     stage **Bread & Circuses** for 2 gold. Either way: **+2 happiness this year**, expiring when the year turns. One calm action per
     turn is the limit.
   - **The social ladder** (one move per turn) — promote a slave to freeman for
     **2 food**, or a freeman to citizen for **2 gold**. Demote one step for
     **1 influence**. (During a riot, demotion is free — the mob forces it.)
   - **Fund an expedition** (once per turn) — stake **2 gold** and roll
     on an expedition table (see Ventures).
4. **End your turn.**

A **year** is one turn for every seat. After all four have played, the next year
begins and its card is revealed. The **first player moves on one seat** each year.
The game lasts at most **fourteen years**; the next year card stays hidden.

## The bank

The bank trades materials against gold — never material for material. Its rates
never move: every material **sells 3 for 1 gold** and **costs 2 gold to buy**. Find
it in the realm's **Market** page and under the Exchange verb.

- **Sell**: hand over the sell-rate of a material, take 1 gold.
- **Buy**: pay the buy-rate in gold, take 1 of the material.
- **No limit** on trades per turn — but every round trip pays the spread, so
  trading always shrinks your total stockpile (Treasurer counts only your gold).

The bank is a corridor, not a merchant — its fixed rates are the walls that
player-to-player trade (a later phase) will negotiate inside.

**The Dole** runs through the same corridor: **3 influence buys 1 food**. It is the
one way influence reaches the granary, and it is priced worse than gold on purpose.

## Ventures — Fund an Expedition

Once per turn, stake **2 gold**, choose an expedition, and roll a d6.
The stake is spent win or lose; the low rolls simply return nothing:

- **Merchant Convoy** — 3–5: 2 gold · 6: 4 gold.
- **Grand Embassy** — 3–4: 1 influence · 5–6: 2 influence.
- **Colonists' Voyage** — 3–4: 2 food · 5: 3 food · **6: settlers arrive** (+1
  freeman in a settlement with room, +2 food).

On the settler jackpot, the destination is drawn among your settlements with room.
If all are full, gain 2 extra food instead. The Convoy returns 5/3 gold on average
against the 2-gold stake; the other tables pay in food, influence or a freeman.

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
- **Temple** (3 stone) — +1 happiness while it stands.
- **Granary** (4 wood) — +2 food each turn.
- **Port** (4 gold, 2 stone) — claims one adjacent **luxury good** (below). It needs
  the coast and an unclaimed good adjoining the tile. A colony may raise one; it is
  the only building a colony can hold.

## Luxury goods

Six named goods — Tyrian Dye, Pearls, Coral, Glassware, Incense, Fine Linen — sit
moored off the coast, each at a point shared by **two** coastal tiles. A **Port**
raised in a settlement on either tile claims the good; **the first Port wins**, and
the good stays claimed for the rest of the game. Each good is unique: one copy, one
owner.

Every good you hold adds **+2 to your happiness** for as long as you hold it, and
there is no limit on how many count. The riot and revolt lines and the **Beloved of
the People** laurel both read it.

The intended play: every two slaves take 1 from your happiness, and a luxury gives 2
back. Luxuries buy the right to expand ugly.

## Happiness and food

Happiness is a **level**. Nothing is saved up or paid in: you count it off the board,
and if the board does not change, neither does the level. A level of −3 this turn is
−3 next turn.

- **+1** for every **Temple**.
- **+2** for every **luxury good** you hold.
- **−1** for every **two slaves** in your realm; an odd slave costs nothing.
- **−1** for every **Unrest token** on your realm.
- **+2** if you bought **civic calm** this year.

**Unrest tokens** are the one part that stays from turn to turn. Cards, Laws and
Directives place them: any happiness loss a card names places one token, whatever
its size, and any gain clears one. You cannot buy a token off. A riot or a revolt
clears all of them.

Some Laws also name happiness ("every city costs 1
happiness"). Each is one more line of the level for as long as it stands.

**Hunger** is separate from happiness, and calm cannot buy it off. If income cannot
feed your freemen and citizens, **one pop leaves for each unfed mouth** and your food
stays at zero: no debt carries over. Freemen leave before citizens, each from the
settlement holding the most of them. Slaves eat nothing and never leave for hunger.
Food never goes below zero: a sacked granary or a bad card stops at empty.

At the start of your turn, before you collect income, a level of **−3 or lower is a
riot**. Your Unrest tokens clear, and your turn stops until the die is rolled:

| Roll | Outcome                                                                              |
| ---: | ------------------------------------------------------------------------------------ |
|    1 | The mob torches the works — lose 1 pop **and** a building (no building? lose 2 pops) |
|    2 | Revolt spreads — lose 2 pops                                                         |
|    3 | Blood in the streets — lose 1 pop                                                    |
|    4 | Granary sacked — lose 3 food                                                         |
|    5 | Bribe demanded — lose 3 gold (lose 1 pop if you can't pay in full)                   |
|    6 | The mob disperses — no loss                                                          |

Before rolling you may **declare insurance** — each option once per riot, each
adding **+1 to your roll**: a **bread dole** (4 food), a **concession** (demote
one citizen, free), or **patronage** (3 influence). Declare all three and a riot can
no longer cost you pops.

Pops lost to a riot are **slaves first**, then freemen, then citizens, each from the
settlement holding the most of them.

**At −6 or lower it is a revolt instead.** Nothing is rolled: **half your slaves
leave**, rounded down, and your Unrest tokens clear. Your turn then goes on.

Because a riot spends the tokens that caused it, a riot from tokens does not come
back. A level held down by slaves does: it riots every turn until you free or lose
slaves, raise Temples, or claim luxuries. Calm expires before your next turn.

## Years and events

The **year deck** is fourteen cards, shuffled once from the game seed. Reveal one
as each year opens; the next stays hidden from every player and bot. A card that
zeroes a term lasts for that year. Plague and Festival act once when revealed.

| Card         | Copies | Effect                                                       |
| ------------ | -----: | ------------------------------------------------------------ |
| Drought      |      2 | Plains slaves make no food, including the Estate's raise.    |
| Wildfire     |      2 | Forest slaves make no wood, including the Estate's raise.    |
| Silent Mines |      1 | Mountain slaves make no stone, including the Estate's raise. |
| Piracy       |      2 | Freemen make no gold, including the Marketplace's raise.     |
| Ostracism    |      2 | Citizens make no influence, including the Forum's raise.     |
| Blockade     |      1 | Luxuries give no happiness.                                  |
| Plague       |      2 | Everyone places an Unrest token.                             |
| Festival     |      2 | Everyone clears all their Unrest tokens.                     |

Free pops still eat during Piracy and Ostracism. Granaries and standing Law income
are separate terms. Income forecasts use this year's card while your income is
still owed; after collection they show printed income for the unknown next year.

**Player events** are drawn at each income and resolved before normal actions.
The deck has twelve kinds and forty copies; it reshuffles its discards when empty.
Losses stop at zero. There are no coupons, effect choices or per-pop payouts.

| Card              | Copies | Effect                                             |
| ----------------- | -----: | -------------------------------------------------- |
| Good Stores       |      4 | Gain 2 food.                                       |
| Timber            |      4 | Gain 2 wood.                                       |
| Shipment          |      4 | Gain 2 stone.                                      |
| Profit            |      4 | Gain 2 gold.                                       |
| Patronage         |      4 | Gain 2 influence.                                  |
| Free Settlers     |      3 | Gain one freeman in an owned settlement with room. |
| Captured Laborers |      3 | Gain one slave in an owned settlement with room.   |
| Rats              |      3 | Lose 2 food.                                       |
| Bandits           |      3 | Lose 2 gold.                                       |
| Fire              |      3 | Lose 2 wood.                                       |
| Local Unrest      |      3 | Place one Unrest token.                            |
| Public Calm       |      2 | Clear one Unrest token; zero stays zero.           |

Pick the settlement for a pop card. If all your settlements are full, discard it
without a reward. The card does not use the settlement's normal growth allowance;
it never grants a citizen. Twelve of the forty copies are harmful.

The top bar shows the year and its card. The **Codex** consult has the year deck,
player deck, dice tables, bank rates and base costs.

## The Assembly

At the start of every other year, beginning with Year 2, normal play pauses while the Assembly
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

Every player-authored resolution that passes grants its politician's one-time
prize: Demosthenes gives 5 food, Perdiccas 3 stone, Kleistophenes 4 wood, and
Stratokles 2 gold. House Laws, failed or vetoed proposals, and repeals pay nothing.
Monumental Code and Land Rush have retired with annual coupons. The Streets Burn
places one Unrest token on its target; the other Assembly rules await Step 8.
The record of passes remains, but **Voice** counts only the Laws you authored that
still stand. A repeal or replacement takes one off that count; Directives add none.

## Winning — the victory race

Six **victory cards** sit face-up from the first turn. Each belongs to the sole
leader who meets its minimum. A tie or a lead below the minimum holds nothing.

| Card                  | Condition                              | Minimum |
| --------------------- | -------------------------------------- | ------: |
| Polis Builder         | most cities standing                   |       3 |
| Demos                 | most total pops                        |      14 |
| Civic Elite           | most citizens                          |       5 |
| Treasurer             | largest gold stock                     |      30 |
| Beloved of the People | highest happiness level, calm excluded |       4 |
| Voice of the Assembly | most standing Laws authored            |       2 |

No card can be held at the start of the game — every minimum sits above anything
your setup and first turn can produce. Holding a card is an achievement, never a
starting condition. (With one starting city, Polis Builder takes two colony
upgrades — the race to your third city is the long game.)

**Hold any 3 cards at the start of your own turn and you win on the spot.** The
check happens at your turn start, so the table always gets one full round to see
you sitting at three and break a card off you.

The **year deck is the game's clock**. After the fourteenth year's last turn,
**most victory cards held** wins. Ties break on happiness without calm, then total
pops, then seat order. The final year card still counts. Track the race in the
**Victory** consult; the top bar shows the year and cards remaining.
