# Event Cards Feature Plan

This document defines the first implementation pass for Seasonal Event cards and Player Event cards in the browser prototype.

The goal is to add a real event layer without pulling in the full Assembly, politician, luxury good, or final victory systems yet.

## Design Targets

- Seasonal Events affect all players and should mostly create temporary tempo changes.
- Player Events affect only the active player and should be smaller because they happen every player turn.
- The first pass should be data-driven so future cards can be added without special-case UI code.
- PDF "Unrest" maps to the prototype's current `happiness` model:
  - `+2 Unrest` becomes `-2 happiness`.
  - `-2 Unrest` becomes `+2 happiness`.
- Cards that need player choice should become pending events and block normal actions until resolved.
- Cards that only grant resources or apply global modifiers can resolve immediately.

## Implementation Plan

1. Add event card types in `src/game/types.ts`.
   - `EventCard`
   - `EventDeck`
   - `ActiveSeasonEvent`
   - `PendingPlayerEvent`
   - effect primitives for resource deltas, pop additions, income modifiers, building-cost modifiers, and happiness shifts.

2. Add event card data in `src/game/data.ts`.
   - `SEASONAL_EVENT_CARDS`
   - `PLAYER_EVENT_CARDS`
   - Include card counts directly in the definitions and expand them when creating the deck.

3. Extend `HegemonyState`.
   - Seasonal draw pile and discard pile.
   - Player draw pile and discard pile.
   - Current active seasonal event.
   - Last drawn player event.
   - Optional pending player event.

4. Add deck helpers in the rules layer.
   - Initialize shuffled decks in `createInitialState`.
   - Draw from a deck.
   - Discard resolved cards.
   - Reshuffle discard into draw pile if the draw pile is empty.

5. Add event timing.
   - Draw a Seasonal Event in `startNewSeason(G)`.
   - Apply immediate seasonal effects when drawn.
   - Store temporary seasonal modifiers until the next season.
   - Draw a Player Event after the active player collects income.
   - Resolve immediate player events automatically.
   - Store choice-based player events as `pendingPlayerEvent`.

6. Add pending-event resolution moves.
   - `resolvePendingPlayerEvent(targetTileId)`
   - Needed first for pop-gain cards.
   - Normal gameplay actions should be disabled while a pending event exists.

7. Wire event modifiers into existing rules.
   - Food, gold, and other income modifiers go through `calculateIncomeBreakdown`.
   - Building cost multipliers go through a shared adjusted-cost helper used by both `getBuildBuildingStatus` and `buildBuilding`.
   - Pop additions use existing pop capacity checks.

8. Add UI surfaces.
   - Show the current Seasonal Event in the top-center card slot.
   - Show the last drawn Player Event in the top-center card slot.
   - Show deck and discard counts in the right-side deck shelf.
   - Add a small modal for pending Player Events that need a settlement target.
   - Log every event draw and resolved effect.

9. Verification.
   - Run `npm run check`.
   - Manually verify: season rollover draw, player turn draw, pending pop placement, deck count changes, discard changes, seasonal expiry, and building-cost modifier behavior.

## Seasonal Event Deck

First-pass deck size: 27 cards.

Removed from the earlier draft:

- Flash Floods
- Border Raids
- Omens in the Assembly

These are intentionally excluded because their effects were either too arbitrary, too punitive, or too close to future Assembly systems.

| Count | Name | Type | Suggested Effect |
| ---: | --- | --- | --- |
| 4 | Drought | Food pressure | All players get `-2 food income` this season. |
| 4 | Bountiful Harvest | Food boost | All players get `+2 food income` this season. |
| 3 | Timber Levies | Resource grant | Each player gains `2 wood per 6 pops`, minimum `4 wood`. |
| 3 | Quarry Contracts | Resource grant | Each player gains `2 stone per 6 pops`, minimum `4 stone`. |
| 3 | Grain Tithe | Resource grant | Each player gains `2 food per 6 pops`, minimum `4 food`. |
| 2 | Civic Anxiety | Happiness pressure | Each player suffers `-2 happiness per 10 pops`, minimum `-2`, during this season's income collection. |
| 2 | Festival Games | Happiness recovery | Each player gains `+2 happiness per 10 pops`, minimum `+2`, immediately. |
| 2 | Scarce Labor | Cost pressure | Building costs, excluding colony founding and city upgrades, are doubled this season. |
| 2 | Skilled Artisans | Cost relief | Building costs, excluding colony founding and city upgrades, are halved this season, rounded up. |
| 2 | Open Markets | Economy boost | All players get `+2 gold income` this season. |

### Seasonal Balance Notes

- `Drought` and `Bountiful Harvest` remain the most common cards because food pressure is core to the design.
- Resource grants scale with population, but the minimum keeps small players from falling too far behind.
- Building-cost cards create timing pressure without damaging existing board state.
- `Civic Anxiety` should apply during income rather than immediately so the event is felt by each player on their own turn.
- `Festival Games` can resolve immediately because it is restorative and does not require player choice.

## Player Event Deck

First-pass deck size: 72 cards.

The previous 36-card proposal is doubled. The second half adds more choice, mitigation, and small tactical swings instead of simply duplicating every original card. This keeps the player deck from feeling repetitive while preserving the same power band.

### Immediate And Targeted Cards

| Count | Name | Type | Suggested Effect |
| ---: | --- | --- | --- |
| 8 | New Citizen | Pop gain | Add `1 citizen` to one owned settlement with available capacity. |
| 8 | Free Settlers | Pop gain | Add `1 freeman` to one owned settlement with available capacity. |
| 6 | Captured Laborers | Pop gain | Add `2 slaves` to one owned settlement with available capacity. |
| 6 | Good Stores | Resource gain | Gain `3 food`. |
| 6 | Timber Windfall | Resource gain | Gain `5 wood`. |
| 5 | Merchant Profit | Resource gain | Gain `5 gold`. |
| 5 | Stone Shipment | Resource gain | Gain `5 stone`. |
| 4 | Local Unrest | Negative happiness | Lose `2 happiness`. |
| 4 | Public Calm | Positive happiness | Gain `2 happiness`. |
| 3 | Patronage Network | Influence | Gain `3 influence`. |
| 3 | Emergency Labor | Choice | Gain `6 wood` and lose `1 happiness`, or gain `2 wood` with no penalty. |

Subtotal: 58 cards.

### Second-Batch Choice Cards

| Count | Name | Type | Suggested Effect |
| ---: | --- | --- | --- |
| 3 | Granary Surplus | Choice | Gain `4 food`, or add `1 freeman` to a settlement with available capacity. |
| 3 | Civic Petition | Choice | Gain `2 influence`, or gain `2 happiness`. |
| 2 | Skilled Mason | Choice | Gain `4 stone`, or the next building built this turn costs `-3 stone`, minimum `0 stone`. |
| 2 | Caravan Contacts | Choice | Gain `4 gold`, or exchange up to `4 wood` for `4 gold`. |
| 2 | Forest Crews | Choice | Gain `4 wood`, or the next colony founded this turn costs `-4 wood`, minimum `0 wood`. |
| 1 | Temple Donation | Choice | Gain `3 happiness`, or the next Temple built this turn costs `-3 stone`, minimum `0 stone`. |
| 1 | Market Day | Choice | Gain `3 gold`, or gain `1 gold per freeman`, minimum `2 gold`. |

Subtotal: 14 cards.

Total: 72 cards.

### Player Deck Balance Notes

- Pop gains are common because they make the board state change and force settlement-capacity decisions.
- Slave cards stay fewer than citizen/freeman cards because slaves already create stronger production acceleration.
- Resource cards are intentionally small; they should help unlock actions, not replace the production engine.
- Happiness cards keep the current prototype pressure system relevant before full unrest rules exist.
- Choice cards should mostly be optional-value cards, not large swing cards.
- Cost-discount choice cards should expire at end of the active player's turn.

## Suggested Effect Schema

The exact TypeScript can change during implementation, but the data should be shaped like this.

```ts
type EventDeckKind = "seasonal" | "player";

type EventTiming = "immediate" | "season" | "pendingChoice" | "turn";

type EventCard = {
  id: string;
  deck: EventDeckKind;
  name: string;
  count: number;
  text: string;
  timing: EventTiming;
  effects: EventEffect[];
};

type EventEffect =
  | {
      type: "resourceDelta";
      scope: "activePlayer" | "allPlayers";
      resource: Resource;
      amount: number;
    }
  | {
      type: "scaledResourceDelta";
      scope: "activePlayer" | "allPlayers";
      resource: Resource;
      amountPerPops: number;
      popStep: number;
      minimum: number;
    }
  | {
      type: "happinessDelta";
      scope: "activePlayer" | "allPlayers";
      amount: number;
    }
  | {
      type: "scaledHappinessDelta";
      scope: "activePlayer" | "allPlayers";
      amountPerPops: number;
      popStep: number;
      minimumMagnitude: number;
    }
  | {
      type: "incomeModifier";
      scope: "activePlayer" | "allPlayers";
      resource: Resource;
      amount: number;
      duration: "season" | "turn";
    }
  | {
      type: "buildingCostMultiplier";
      multiplier: number;
      duration: "season";
      excludes: Array<"foundColony" | "upgradeColonyToCity">;
    }
  | {
      type: "addPops";
      pop: PopType;
      amount: number;
      target: "ownedSettlementWithCapacity";
    }
  | {
      type: "choice";
      options: EventEffect[][];
    };
```

## Open Implementation Questions

- Should Player Event cards be discarded immediately after a pending choice resolves, or only after the full turn ends?
- Should choice cards be held in hand later, or should all first-pass Player Events resolve immediately on draw?
- Should cost discounts be tracked as active turn modifiers or consumed by the next matching action?

For the first implementation, use immediate resolution and consumed next-action discounts. Held cards can wait until the hand-management system exists.
