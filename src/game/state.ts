import { PLAYER_EVENT_CARDS, PLAYER_IDS, PLAYER_NAMES, SEASONAL_EVENT_CARDS } from "./data";
import { createInitialMap } from "./map";
import type { HegemonyState } from "./types";
import { createSeed, expandDeck, shuffleWithSeed } from "./core/rng";
import { DEFAULT_RULESET } from "./ruleset";
import type { Ruleset } from "./ruleset";

export function createInitialState(seed = createSeed(), ruleset: Ruleset = DEFAULT_RULESET): HegemonyState {
  let rng = seed >>> 0;
  const seasonal = shuffleWithSeed(expandDeck(SEASONAL_EVENT_CARDS), rng);
  rng = seasonal.state;
  const player = shuffleWithSeed(expandDeck(PLAYER_EVENT_CARDS), rng);
  rng = player.state;

  return {
    phase: "setupCapital",
    currentPlayer: "0",
    turn: 1,
    ruleset,
    board: {
      tiles: createInitialMap()
    },
    players: PLAYER_IDS.reduce(
      (players, playerId) => ({
        ...players,
        [playerId]: {
          id: playerId,
          name: PLAYER_NAMES[playerId],
          resources: { ...ruleset.startingResources },
          settlements: [],
          collectedThisTurn: false,
          hasCollectedGameplayIncome: false,
          grownSettlementsThisTurn: [],
          actionCostDiscounts: [],
          consecutiveFoodDeficitTurns: 0,
          timedHappinessModifiers: [],
          popsLostToUnrest: 0
        }
      }),
      {} as HegemonyState["players"]
    ),
    transfers: [],
    seasonalDrawPile: seasonal.cards,
    seasonalDiscardPile: [],
    playerDrawPile: player.cards,
    playerDiscardPile: [],
    activeSeasonEvent: null,
    lastPlayerEvent: null,
    pendingPlayerEvent: null,
    season: 1,
    rng,
    log: [{ id: "start", season: 1, message: "Spring of Year 1 begins." }]
  };
}
