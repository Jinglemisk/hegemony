# Hegemony Rules Archive

This document reorganizes the rough rules in `Hegemony.pdf` into a manual-style reference. It is intentionally archival: it preserves the current design, including unresolved or contradictory points, while adding the latest clarifications from May 16, 2026.

## Game Premise

Hegemony is a turn-based strategy board game about founding cities, extracting terrain resources, managing population, and using political institutions to push resolutions that affect all players. It combines a hex-based settlement economy with population management, events, and an assembly voting system.

## Components

- 37 terrain tiles.
- 12 coastal tiles.
- Building tokens.
- Population tokens.
- Wood, stone, gold, and food tokens.
- Unrest tables.
- Civilization tables.
- Politician table.
- City, colony, and capital pieces.
- Player event cards.
- Public event cards.
- Resolution cards.
- One six-sided die.
- One twenty-sided die.

## Players

Each player represents one country.

At game start, each player:

- Chooses a country name.
- Drafts or chooses two national ideas.
- Places one capital.
- Places one colony.

## Terrain

Terrain tiles form the main inland board. Cities and colonies are placed directly on terrain tiles, not on intersections.

Each terrain tile provides:

- A number of building slots.
- A primary resource yield.

Terrain types in the current design:

- Mountain: mainly stone.
- Hill: mixed stone and food.
- Forest: mainly wood, with some food.
- Plains: mainly food.

Terrain distribution from the PDF:

- Mountain: 6 tiles.
- Hill: 9 tiles.
- Forest: 14 tiles.
- Plains: 8 tiles.

The PDF fully specifies mountain, forest, and plains counts. Hill tile sub-counts are incomplete, so the exact hill deck remains unresolved.

## Coastal Tiles

Coastal tiles surround the terrain map and form the outer rim.

Coastal tiles may provide:

- Luxury goods.
- Fishing income.
- Improved market exchange rates.

Coastal resources are accessed by building a port in a city.

## Resources

The core resources are:

- Wood: primarily used for buildings and colonies.
- Stone: primarily used for city upgrades and unique buildings.
- Gold: primarily used for upkeep, upgrades, trade, and luxury goods.
- Food: consumed by population and used for expansion.
- Influence: spent on political actions and resolution cards.
- Unrest: a negative pressure track that can remove population.

Players collect resources at the start of their own turn unless a card or rule says otherwise.

## Settlements

### Colonies

Colonies are small settlements used to expand across the map.

- A colony may be placed on a tile within one hex of a friendly city or colony.
- A colony cannot be placed adjacent to another player's capital.
- Two players may share a terrain tile with colonies.
- If two players share a tile with colonies, their income from that tile is halved.
- A colony has no building slots.
- A colony has a population capacity of 4.
- A colony can be upgraded into a city.
- When a colony is upgraded into a city, enemy colonies on that tile are removed.

Cost to found a colony:

- 20 wood.
- 2 food.

### Cities

Cities are the main economic and population centers.

- Cities are placed on terrain tiles.
- Cities collect the benefit of their own tile only.
- Cities cannot be built adjacent to another city.
- A city has 2 base building slots plus the terrain tile's building slots.
- A city has a population capacity of 10.
- Every pop beyond capacity adds unrest.

Cost to upgrade a colony to a city:

- 30 wood.
- 10 stone.
- 5 food.

### Capital

Each player begins with one capital.

- A capital is a special city.
- A capital collects twice the terrain resources of its tile.
- A capital has double city population capacity.
- A capital has additional building slots.
- Other players cannot found colonies adjacent to a player's capital.

The PDF says the capital starts with 4 pops, but the latest design discussion allows this to be tuned.

## Population

Population is made of three pop types:

- Citizens.
- Freemen.
- Slaves.

The original PDF uses this event conversion:

- 1 citizen = 2 freemen = 4 slaves.

The latest design discussion is leaning toward:

- 1 citizen = 2 freemen = 3 slaves.

This conversion applies when an effect says "gain 1 pop" and the player may choose how to receive it. It does not necessarily mean all pop types are equally balanced in production.

### Citizen

- Provides influence.
- Consumes more food than other pop types.

Original PDF value:

- +1 influence.
- -2 food.

### Freeman

- Provides gold.
- Consumes food.

Original PDF value:

- +2 gold.
- -1 food.

### Slave

- Provides extra resource production.
- Consumes food in groups.
- Adds unrest in large numbers.

Original PDF value:

- +1 resource per 2 slaves.
- -1 food per 2 slaves.
- +1 unrest per 8 slaves.

The current prototype uses a more conservative 3-slave grouping as a balance placeholder.

## Buildings

Buildings are constructed in cities and consume building slots.

Known buildings:

- Marketplace: adds 1 freeman. Cost: 12 wood.
- Temple: adds 1 citizen. Cost: 6 stone.
- Workshop: adds 2 slaves. Cost: 12 wood.
- Forum: adds +1 influence for every 2 citizens. Cost: 4 stone, 8 wood.
- Granary: adds +2 food. Cost: 12 wood, 2 stone.
- Library: every 2 libraries grant one national idea. Cost: 20 stone, 10 wood. Upkeep: -2 food per turn.
- Embassy: each level gives +1 assembly vote. Cost: 50 stone, 50 gold.
- Luxury Goods' Trader: obtains one land luxury good. Cost: 100 gold. Maximum 3 in the game.

## Turn Structure

A season starts before player 1's turn.

For a 4-player game:

1. Season start.
2. Player 1 turn.
3. Player 2 turn.
4. Player 3 turn.
5. Player 4 turn.
6. Next season start.

On a player's turn:

1. If a new season begins, draw a public event card.
2. If the assembly is due, start the Hegemony Assembly.
3. The active player collects resources.
4. The active player draws a player event card.
5. The active player spends resources, builds, trades, draws resolution cards, or performs other available actions.

## Food and Unrest

Food shortage creates unrest.

Current clarification:

- Negative food income always creates unrest equal to the negative food pressure.
- If a player has at least -2 food income for 2 consecutive own turns, that player loses 1 pop of their choice.
- Losing 1 pop means choosing the equivalent form using the active pop conversion rule.

Original PDF unrest thresholds:

- Unrest 5 removes 2 pops.
- Unrest 10 removes 4 pops and drops unrest to 4.
- If there are no active causes, unrest drops by 1 per turn.

## Luxury Goods

Luxury goods reduce unrest.

- 6 luxury goods are distributed across coastal tiles.
- 3 luxury goods can be obtained on land by building a Luxury Goods' Trader.
- Each luxury good gives permanent -2 unrest.

## National Ideas

National ideas are persistent country modifiers.

Examples from the PDF:

- +2 food income for every 5 pops.
- Pops consume gold instead of food.
- +1 building slot in all cities.
- +2 building slots in the capital.
- Gain +2 influence every season.
- Maximum colonies increased by 1.
- Start with one additional pop.
- Always gain an additional pop when founding a city.
- Each colony begins with 2 slaves.
- Start with a Luxury Goods' Trader in the capital.
- Start the game with 20 gold.
- Gain one free veto of any resolution, then discard this idea.

National ideas should be implemented later as modifier data, not as one-off rule branches.

## Events

There are two event decks:

- Player event cards affect one player.
- Public event cards affect all players and are drawn at season start.

Examples of public events:

- Drought for one season.
- Bountiful harvest for one season.
- All players gain resources based on population.
- All players gain or lose unrest based on population.
- Building costs doubled or halved for one season.
- Flash floods remove 1 building from each city.

Examples of player events:

- Gain 1 citizen.
- Gain 1 freeman.
- Gain 2 slaves.
- Gain food, wood, gold, or stone.
- Gain unrest.
- Lose unrest.

## Hegemony Assembly

The Hegemony Assembly is the global voting system.

- It convenes at fixed season intervals.
- It cannot be skipped.
- It happens before the active player takes normal turn actions.
- Two resolution cards are drawn.
- Players may replace drawn resolutions by playing resolution cards from hand.
- Players vote yay or nay.
- Resolutions require a simple majority to pass.
- Passed resolutions become active resolutions in the center of the board.

Influence can be spent to:

- Draw a resolution card.
- Exchange a resolution card.
- Play a resolution card during assembly.
- Propose repealing an active resolution.
- Veto a resolution.

## Votes

Each player starts with one assembly vote.

Vote count can be changed by:

- Citizens.
- Event cards.
- Embassies.
- Resolutions.
- National ideas.

Original PDF rule:

- Every 10 citizens grant one additional vote.

## Politicians

Each resolution belongs to a politician.

Politicians:

- Stratokles Stratoklid, Cunning Populist.
- Demosthenes Archimenid, Agricultural Reformer.
- Perdiccas Tyrpanid, Urban Planner.
- Kleistophenes Hippaid, Rural Expansionist.

As resolutions tied to a politician pass, that politician gains power.

The design intent is:

- Controlling politicians grants buffs.
- Stratokles may have a special danger-track or endgame condition.
- Influence-heavy builds should be politically strong but economically fragile.

This system is not ready for implementation in v0.1.

## Winning

Known possible endings:

- Political victory: a player has double the sum of all other assembly votes.
- Economic victory: unresolved.
- Hard ending after public event cards are exhausted.

Special endgame public events:

- Athena Promachos: win by most assembly votes.
- Poseidon Hippios: win by most resources.
- Apollo Smithenus: win by least population.

The economic victory condition remains undefined.
