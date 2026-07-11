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
- **Influence** — a political currency earned by your citizens (its uses are
  growing as the game develops).
- **Happiness** — the mood of your people. It is lifted by temples and stored
  food, and dragged down by overcrowding and hunger.

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

Players place **two starting cities** each, in **snake order** — capitals go around
the table one way (first player to last), second cities come back the other way, so
whoever picked last picks first in the second round:

1. Each player places their **capital** on an empty tile — never adjacent to
   another city — and splits **3 starting pops** across citizens, freemen, and
   slaves.
2. In reverse order, each player places their **second city** the same way: any
   empty tile, never adjacent to a city, 3 starting pops.

Then the game begins. Your two cities are your expansion poles — every colony you
ever found must chain outward from them. (Some modes change the opening — for
example a *deathmatch* setup places colonies instead of a second city.)

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
     frontier chains outward tile by tile).
   - **Upgrade a colony into a city** — 30 wood, 10 stone, and 5 food. The city
     keeps the colony's pops and buildings, and drives off any enemy colony
     sharing that tile.
   - **Grow a pop** — add one pop to a settlement that still has room: a slave
     costs 5 food, a freeman 7 food, and a citizen 9 food and 2 gold. Each
     settlement can grow once per turn.
   - **Move pops** — shift pops between your own settlements.
   - **Build** — raise a building in a city or capital that has a free slot.
4. **End your turn.**

Once all four players have taken a turn, a new **season** begins and a fresh
seasonal event is revealed. Play runs through the year in order — **Spring,
Summer, Autumn, Winter** — and then a new year opens on Spring again, with the
**first player rotating one seat** (the year turns, the order turns). Each season
has its own mood: Spring and Summer tend to be kind (growth, building, trade),
Autumn is the mixed harvest, and Winter leans harsh. That is a *tendency*, not a
rule — Winter simply deals more hard-luck cards, so a mild Winter is still
possible, and no season is ever guaranteed good or bad.

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
start of your turn — before you collect income:

- **Happiness at −5 or lower:** a mob costs you **2 pops**, chosen at random from
  across your settlements. This repeats every turn until you climb back above −5.
- **Happiness at −10 or lower:** a full revolt costs you **4 pops**, and happiness
  then settles back to −4.
- **Starvation:** if your food income is −2 or worse for **two turns running**, you
  lose **1 pop**.
- Some events sow **lingering unrest** — a penalty like "−2 happiness per turn for
  3 turns" that bites at the start of each of your next few turns before fading.

Happiness never drifts back up on its own — you climb out of unrest by fixing its
causes (feed your people, ease overcrowding, build Temples). Losing pops does at
least shrink those causes, so a collapse tends to bottom out rather than spiral.

## Events

Two decks of event cards bring swings of fortune:

- **Seasonal events** are revealed at the start of each season and affect
  everyone — for example, "all players gain 2 food this season." The season
  shapes which of these come up: a good harvest is far likelier in Autumn than a
  drought is, while Winter tips the odds the other way.
- **Player events** are drawn for the active player and must be resolved before
  you take your normal actions. Some are a straight gain; others give you a
  choice — for example, "gain 6 wood and lose 1 happiness, or gain 2 wood with no
  penalty."

## Winning — the victory race

Five **victory cards** sit face-up from the first turn. Each reads **"Most X,
minimum Y"** and belongs to the *sole leader* in that category who also meets the
minimum — ties, or leading below the minimum, leave the card unheld:

| Card | Condition | Minimum |
| --- | --- | ---: |
| Polis Builder | most cities standing | 3 |
| Demos | most total pops | 16 |
| Civic Elite | most citizens | 6 |
| Treasurer | largest banked material stockpile | 40 |
| Beloved of the People | highest happiness | +5 |

**Hold any 3 cards at the start of your own turn and you win on the spot.** The
check happens at your turn start, so the table always gets one full round to see
you sitting at three and break a card off you.

The **seasonal deck is the game's clock**: it never reshuffles, and one card
leaves it every season. If it runs out before anyone wins the race, the age ends
and **most victory cards held** takes the game (ties break on happiness, then
population). Track the race in the ledger's **Victory** tab; the top bar shows how
many seasons remain.
