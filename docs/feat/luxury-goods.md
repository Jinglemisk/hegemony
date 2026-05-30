# Luxury Goods Feature Plan

## Source Context

`Hegemony.pdf` defines Luxury Goods as an unrest-management layer:

- 6 Luxury Goods are distributed across Coastal Tiles.
- 3 Luxury Goods can be obtained on land by building a Luxury Goods' Trader.
- Every Luxury Good gives the player a permanent `-2 Unrest`.
- Coastal resources are accessed by building a Port in a City.
- One National Idea allows a player to start with a Luxury Goods' Trader in their Capital.
- Resolution concepts already mention `Deny Luxury Good` and `Blockade Player Port`, so the implementation should leave room for temporary denial or deactivation.

The current prototype does not yet implement coastal tiles, ports, luxury goods, traders, national ideas, or the resolution effects that interact with them. The current prototype uses `Happiness` as the inverse pressure track for unrest.

## Core Rule Interpretation

Luxury Goods should be a standing happiness/unrest modifier, not a banked income source.

The intended rule should be:

```text
Effective Happiness = stored/base Happiness + active Luxury Goods bonus
Luxury Goods bonus = active Luxury Goods count * 2
```

Example:

```text
Base Happiness:      -7
2 active Luxuries:   +4
Effective Happiness: -3
```

The player's stored/base Happiness should not permanently increase by `+2` every turn. The bonus should remain a standing `+2`, `+4`, `+6`, etc. for as long as the owned Luxury Goods are active.

## Recommended Implementation Plan

1. Model Luxury Goods as separate owned assets.

   Add `LuxuryGoodId`, `LuxuryGoodType`, and `LuxuryGoodDefinition` in `src/game/types.ts`. Store active or claimed goods separately from normal resources so future effects like `Deny Luxury Good` and `Blockade Player Port` can disable them cleanly.

2. Add player ownership and active-state data.

   Extend `PlayerState` or add a board-level claim structure to track:

   - Which player owns each Luxury Good.
   - How the good was obtained: coastal port or land trader.
   - Whether the good is currently active.
   - Optional disabled reason or duration for future resolution/event effects.

3. Use Luxury Goods as effective happiness relief.

   Add a helper such as `getLuxuryHappinessBonus(G, playerID)` that returns `activeLuxuryGoods.length * 2`. Consequences should use effective happiness rather than raw stored happiness.

4. Add coastal access before full coastal geometry.

   The full PDF has 12 coastal tiles, but the prototype currently uses only the 37 inland hexes. First implementation should add lightweight `CoastalTile` records attached to edge hexes rather than treating coastal tiles as normal settlement tiles.

5. Add Port and Luxury Goods' Trader buildings.

   Extend `BuildingId` with:

   - `port`: unlocks adjacent coastal features and consumes a building slot.
   - `luxuryGoodsTrader`: costs `100 Gold`, has a global maximum of 3, and claims one land Luxury Good.
   - Use ChatGPT image generation tool to create its appropiate icons.

   Port cost is not specified in the PDF. A first tunable value could be `20 Wood, 5 Stone, 10 Gold`.

6. Add claim rules in `src/game/rules.ts`.

   Implement rules for:

   - Building a Port only in a City or Capital adjacent to a coastal tile.
   - A Port claiming one unclaimed adjacent coastal luxury.
   - A Luxury Goods' Trader claiming one unclaimed land luxury.
   - A physical luxury being claimable by only one player.
   - Claimed goods remaining active unless future rules disable them.

7. Expose Luxury Goods in the UI.

   Update the map, tile inspector, and player holdings views to show:

   - Coastal features on edge tiles.
   - Owned Luxury Goods per player.
   - Active versus disabled Luxury Goods.
   - Raw Happiness, Luxury Goods bonus, and effective Happiness.
   - Build actions for Port and Luxury Goods' Trader.

8. Add focused rules verification.

   Cover at least:

   - Luxury Goods do not accumulate stored Happiness every turn.
   - Active Luxury Goods affect effective Happiness.
   - Ports can claim only adjacent unclaimed coastal luxuries.
   - Traders respect the global maximum of 3.
   - Disabled Luxury Goods stop contributing their standing bonus.

## Suggested Luxury Goods

The initial set should match the PDF structure: 6 coastal goods and 3 land-trader goods.

| Source  | Specific Good |
| --- | --- | --- |
| Coastal |  Dye |
| Coastal |  Pearls |
| Coastal | Coral |
| Coastal | Glassware |
| Coastal |  Incense |
| Coastal | Fine Linen |
| Land Trader | Stone / monument luxury | Marble |
| Land Trader | Gold / metal luxury | Silverwork |
| Land Trader | Food / estate luxury | Wine & Olive Oil |


For the first implementation, keep exactly 9 named goods to match the PDF and avoid overbuilding before ports, events, and happiness consequences are complete.

## Post-Implementation Cleanup Requirement

Once these are implemented, the user must be explicitly asked whether to delete this file or not after successful and ratified implementation.
