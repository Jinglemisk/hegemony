# Initial Round Food and Happiness Balance

This note uses the implemented rules as of `src/game/rules.ts`.

## Current Opening Rules Used

- Each player starts with 12 food.
- Capital placement chooses exactly 3 pops.
- Colony placement chooses exactly 1 pop on a legal tile.
- The first gameplay turn immediately auto-collects income.
- Capital tile yield is doubled.
- Colony tile yield is normal unless shared with another colony.
- Citizens cost 2 food each.
- Freemen cost 1 food each.
- Slaves cost 1 food each and add -0.5 happiness each.
- Every 5 stored food gives +1 happiness before income is applied.
- Food-shortage happiness pressure uses projected stockpile, not negative food income alone.
- Each player's first gameplay income collection after setup ignores only food-shortage happiness pressure.

## Formula

Let:

- `T` = opening tile food from capital and colony after settlement modifiers.
- `C` = total citizens across the capital and colony.
- `S` = total slaves across the capital and colony.

Then the first income collection is:

```text
foodIncome = T - 4 - C
foodAfterFirstIncome = 12 + foodIncome
shortagePressure = 0 on each player's first gameplay income collection
happinessDelta = floor(12 / 5) - (0.5 * S) + shortagePressure
negativeHappinessPressure = max(0, -happinessDelta)
```

On later income collections:

```text
projectedFoodStockpile = currentFood + foodIncome
shortagePressure = min(0, projectedFoodStockpile)
```

There is no opening overcapacity pressure because capitals hold 20 pops and colonies hold 4 pops.

## Tile Placement Levels

These are the legal capital plus adjacent colony tile-food levels on the current 37-tile map before
enemy placement restrictions. Counts are directed placements: capital tile -> adjacent colony tile.

| Tile food level `T` | Placement count | Typical placement pattern |
| ---: | ---: | --- |
| 0 | 104 | Neither capital nor colony is on food |
| 4 | 24 | Food-4 colony, or food-4 capital with no food colony |
| 6 | 6 | Food-6 colony near a non-food capital |
| 8 | 28 | Food-4 capital, or food-8 colony near a non-food capital |
| 10 | 4 | Food-10 colony near a non-food capital |
| 12 | 6 | Food-6 capital |
| 16 | 4 | Food-8 capital |
| 20 | 4 | Food-10 capital |

If the opening colony shares a tile with another player's colony, only the colony tile yield is halved.
That creates extra food levels not shown in the unshared chart: `T = 2`, `3`, and `5` for shared
food-4, food-6, and food-10 colonies next to non-food capitals.

## Opening Food and Happiness Chart

This chart ranges across all 30 possible pop allocations: 10 capital allocations times 3 colony
allocations. First-income grace means opening food shortage does not add happiness pressure, but
slave pressure and food stockpile happiness still apply normally.

| Tile food level `T` | Food after first income | Negative happiness pressure range | Reading |
| ---: | ---: | ---: | --- |
| 0 | 4-8 | 0 | Food trend is weak, but first-income grace prevents immediate shortage pressure. |
| 4 | 8-12 | 0 | Stable on the first collection. |
| 6 | 10-14 | 0 | Stable and close to the next food-stockpile happiness step. |
| 8 | 12-16 | 0 | Stable and supports immediate growth. |
| 10 | 14-18 | 0 | Strong food opening. |
| 12 | 16-20 | 0 | Very strong food capital opening. |
| 16 | 20-24 | 0 | Extremely strong food capital opening. |
| 20 | 24-28 | 0 | Dominant food capital opening. |

## Pop Choice Pressure

Citizen count controls food burn. Slave count controls direct happiness pressure.

| Total citizens | Food upkeep from 4 opening pops |
| ---: | ---: |
| 0 | -4 |
| 1 | -5 |
| 2 | -6 |
| 3 | -7 |
| 4 | -8 |

| Total slaves | Direct happiness pressure |
| ---: | ---: |
| 0 | 0 |
| 1 | -0.5 |
| 2 | -1 |
| 3 | -1.5 |
| 4 | -2 |

The first collection's +2 happiness from the 12-food stockpile offsets even the heaviest opening
slave pressure. Food tile choice still matters because it controls the stockpile available for growth
and later shortage checks.

## Balance Findings

1. Zero-food openings are no longer punished before the player can act.
   First-income grace removes the previous immediate happiness hit from a legal non-food opening.

2. Negative food income is now a warning while the stockpile remains positive.
   Happiness pressure starts only when the projected food stockpile falls below 0.

3. Food capitals are still highly rewarding.
   Capital doubling turns plains into 8, 12, 16, or 20 food before pop upkeep. The food-10 capital
   starts with 24-28 food after first income, which is far above the rest of the map.

4. Setup docs now match the implementation.
   Players allocate exactly 3 capital pops and 1 colony pop during setup.
