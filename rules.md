# Hegemony — How to Play

Hegemony is a strategy game for up to four players, each building a Greek
city-state into the dominant power of an island. You gather resources, grow your
people, found colonies, upgrade them into cities, and raise buildings to
out-produce your rivals.

> This guide covers the game as it plays today. A few systems (final victory
> scoring, the Assembly, luxury goods) are still being designed and are noted
> where they come up.

---

## The board

The island is a grid of 37 hex tiles. Every tile has a terrain that produces one
resource, and the amount is printed on the tile:

- **Forest** → Wood
- **Hill** → Gold
- **Mountain** → Stone
- **Plains** → Food

Tiles also have a number of **building slots**, which limit how many buildings a
settlement on that tile can hold.

## Resources

You keep track of six resources:

- **Wood, Stone, Gold, Food** — the material goods you spend to expand and build.
  Gold doubles as the **unit of account at the bank** (see The bank, below).
- **Influence** — a political currency earned by your citizens. It stabilizes the
  province (civic calm), pays for demotions on the social ladder, and buys riot
  insurance — with the Assembly still to come.
- **Happiness** — the mood of your people. It is lifted by temples, stored food,
  and civic calm, and dragged down by overcrowding and hunger.

You begin each game with **20 wood, 10 stone, 10 gold, 12 food**, and 0
influence and happiness.

## Your people

Every settlement is populated by three kinds of pop. Each one produces and
consumes resources every turn:

- **Citizen** — earns +2 gold and +1 influence, and eats 2 food.
- **Freeman** — earns +2 gold, and eats 1 food.
- **Slave** — produces +1 of the settlement tile's own resource, eats 1 food,
  and nudges happiness down (they are worked hard).

Each pop fills one unit of a settlement's population capacity.

## Settlements

You hold three kinds of settlement:

- **Capital** — your first and strongest settlement. It holds up to 10 pops and
  can build (its tile's slots, plus 2). You have exactly one.
- **City** — an upgraded colony. It holds up to 10 pops and can build (its tile's
  slots, plus 2).
- **Colony** — a small outpost. It holds up to 4 pops and cannot hold buildings.
  Two colonies belonging to different players may share a single tile, but then
  each of them collects only **half** that tile's resource.

Every turn, a settlement collects its tile's printed resource on top of whatever
its pops produce.

## Setting up

Players place a **metropolis** and a **founding colony**, in **snake order** —
metropolises go around the table one way (first player to last), founding colonies
come back the other way, so whoever picked last picks first in the second round:

1. Each player places their **metropolis** — their mother city — on an empty tile,
   never adjacent to another city, and splits **4 starting pops** across citizens,
   freemen, and slaves.
2. In reverse order, each player places their **founding colony** (2 pops) — on
   **any coastal tile** (the great colonization: your settlers sail), or on a tile
   beside your metropolis.

Then the game begins. Your metropolis is your only city at the start — your seat of
building and population; it carries no special bonuses, only its head start. The
founding colony is your second pole, waiting to be grown or upgraded into your
first daughter city. (Some modes change the opening — *deathmatch* places three
colonies.)

By default the island uses the classic authored layout; start the game with
`?board=shuffled` in the address bar for a randomized (seeded) island.

## Taking a turn

Play passes around the table. On your turn:

1. **Income is collected automatically.** Every settlement adds its tile resource
   plus its pops' production, minus their food upkeep.
2. **Resolve your event card**, if one was drawn for you (see Events below) — you
   must do this before anything else.
3. **Take actions**, in any order you can afford:
   - **Found a colony** — 20 wood and 2 food. Sends one pop out to settle a new
     tile, which must **border one of your settlements** (colonies count, so your
     frontier chains outward tile by tile) — **or lie on the coast, if you already
     hold any coastal settlement**: the sea connects every shore, so a coastal
     power may sail to found colonies anywhere along the rim.
   - **Upgrade a colony into a city** — 30 wood, 10 stone, and 5 food. The city
     keeps the colony's pops and buildings, and drives off any enemy colony
     sharing that tile.
   - **Grow a pop** — add one pop to a settlement that still has room: a slave
     costs 5 food, a freeman 7 food, and a citizen 9 food and 2 gold. Each
     settlement can grow once per turn.
   - **Move pops** — shift pops between your own settlements.
   - **Build** — raise a building in a city or capital that has a free slot.
   - **Trade at the bank** — sell materials for gold or buy them with gold, as
     often as you like (see The bank).
   - **Civic calm** (once per turn) — **Stabilize Province** for 4 influence, or
     stage **Bread & Circuses** for 6 gold. Either way: **+3 happiness**. One calm
     action per turn — contentment cannot be stacked by decree.
   - **The social ladder** (one move per turn) — promote a slave to freeman for
     **4 food**, or a freeman to citizen for **4 gold**. Demote a citizen to
     freeman for **2 influence**, or a freeman to slave for **3 influence and −1
     happiness**. (During a riot, demotion is free — the mob forces it.)
   - **Fund an expedition** (once per turn) — stake **5 gold or 8 wood** and roll
     on an expedition table (see Ventures).
4. **End your turn.**

Once all four players have taken a turn, a new **season** begins and a fresh
seasonal event is revealed. Play runs through the year in order — **Spring,
Summer, Autumn, Winter** — and then a new year opens on Spring again, with the
**first player rotating one seat** (the year turns, the order turns). Each season
has its own mood: Spring and Summer tend to be kind (growth, building, trade),
Autumn is the mixed harvest, and Winter leans harsh. That is a *tendency*, not a
rule — Winter simply deals more hard-luck cards, so a mild Winter is still
possible, and no season is ever guaranteed good or bad.

## The bank

The bank trades materials against gold — never material for material. Its rates
are set by **this board's supply** when the game begins and never move: on the
classic island, plentiful wood sells 4-for-1-gold, scarce stone sells 2-for-1 and
costs 3 gold to buy, and food sits at the baseline 3-for-1 / 2 gold. (A shuffled
board prices itself.) Find it in the ledger's **Market** tab.

- **Sell**: hand over the sell-rate of a material, take 1 gold.
- **Buy**: pay the buy-rate in gold, take 1 of the material.
- **No limit** on trades per turn — but every round trip pays the spread, so
  trading always shrinks your total stockpile (the Treasurer card counts gold
  too; the bank never inflates it).

The bank is a corridor, not a merchant — its fixed rates are the walls that
player-to-player trade (a later phase) will negotiate inside.

## Ventures — Fund an Expedition

Once per turn, stake **5 gold or 8 wood**, choose an expedition, and roll a d6.
The stake is spent win or lose; the low rolls simply return nothing:

- **Merchant Convoy** — 3–4: 5 gold · 5–6: 9 gold.
- **Grand Embassy** — 3–4: 3 influence · 5–6: 6 influence.
- **Colonists' Voyage** — 3–4: 5 food · 5: 8 food · **6: settlers arrive** (+1
  freeman in a settlement with room, +2 food).

Every table pays out slightly less than it costs on average — the expedition is
a gamble, and it is *meant* for whoever is behind and needs the swing.

## Buildings

Buildings are raised in a city or capital (colonies cannot hold them). If you
build more than one of a kind, their bonuses stack:

- **Marketplace** (12 wood) — +2 gold per freeman, supporting up to 3 freemen.
- **Temple** (6 stone) — +1 happiness, and +1 influence per citizen, supporting
  up to 2 citizens.
- **Workshop** (12 wood) — +1 of the tile's resource per slave, supporting up to
  3 slaves.
- **Granary** (12 wood, 2 stone) — +2 food each turn, and makes growing pops in
  that settlement cost 2 less food.

## Happiness and food

Happiness is your civilization's stability. It moves each turn:

- Every **slave** lowers it a little.
- **Temples** raise it, and stored **food** helps — for every 5 food you are
  holding, you gain +1 happiness when income is collected, **up to +2** (full
  granaries calm the city; hoarding beyond that does not).
- **Overcrowding** costs you: every pop over a settlement's capacity is -1
  happiness per turn.
- **Hunger** costs you: if your food would fall below zero, the shortfall is
  taken straight out of happiness. (Your very first income after setup is
  forgiven this.)

When happiness turns **negative** it reads as unrest, and unrest has teeth. At the
start of your turn — before you collect income — **happiness at −5 or lower puts
you on the riot table**. Your turn stops until the die is rolled:

| Roll | Outcome |
| ---: | --- |
| 1 | The mob torches the works — lose 1 pop **and** a building (no building? lose 2 pops) |
| 2 | Revolt spreads — lose 2 pops |
| 3 | Blood in the streets — lose 1 pop |
| 4 | Granary sacked — lose 6 food |
| 5 | Bribe demanded — lose 6 gold (lose 1 pop if you can't pay in full) |
| 6 | The mob disperses — no loss |

Before rolling you may **declare insurance** — each option once per riot, each
adding **+1 to your roll**: a **bread dole** (4 food), a **concession** (demote
one pop, free), or **patronage** (3 influence). Declare all three and a plain
riot can no longer cost you pops — you have converted catastrophe into taxation.

**At −10 or lower the riot is a revolt:** the roll takes a **−2** penalty, all pop
losses are **doubled**, and after the dust settles happiness rebounds to **−4**.
A plain riot never rebounds — it will fire again next turn unless you fix the
cause (civic calm exists for exactly this).

Lost pops are always chosen at random across your settlements — the mob decides,
not you. Two other pressures round out the misery:

- **Starvation:** if your food income is −2 or worse for **two turns running**, you
  lose **1 pop**.
- Some events sow **lingering unrest** — a penalty like "−2 happiness per turn for
  3 turns" that bites at the start of each of your next few turns before fading.

Happiness never drifts back up on its own — you climb out of unrest by fixing its
causes (feed your people, ease overcrowding, build Temples, buy calm). Losing pops
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

Nothing here is secret except the shuffle: click the **season dial** (or press
`?`) to open the **Compendium** — victory standings, every dice table, this
board's bank rates, both decks' full composition, and a costs cheat-sheet.

## Winning — the victory race

Five **victory cards** sit face-up from the first turn. Each reads **"Most X,
minimum Y"** and belongs to the *sole leader* in that category who also meets the
minimum — ties, or leading below the minimum, leave the card unheld:

| Card | Condition | Minimum |
| --- | --- | ---: |
| Polis Builder | most cities standing | 3 |
| Demos | most total pops | 16 |
| Civic Elite | most citizens | 8 |
| Treasurer | largest banked material stockpile | 80 |
| Beloved of the People | highest happiness | +10 |

No card can be held at the start of the game — every minimum sits above anything
your setup and first turn can produce. Holding a card is an achievement, never a
starting condition. (With one starting city, Polis Builder now takes two colony
upgrades — the race to your third city is the long game.)

**Hold any 3 cards at the start of your own turn and you win on the spot.** The
check happens at your turn start, so the table always gets one full round to see
you sitting at three and break a card off you.

The **seasonal deck is the game's clock**: it never reshuffles, and one card
leaves it every season. If it runs out before anyone wins the race, the age ends
and **most victory cards held** takes the game (ties break on happiness, then
population). Track the race in the ledger's **Victory** tab; the top bar shows how
many seasons remain.
