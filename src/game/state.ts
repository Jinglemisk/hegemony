import { PLAYER_EVENT_CARDS, PLAYER_IDS, PLAYER_NAMES, SEASONAL_EVENT_CARDS, STARTING_RESOURCES } from "./data";
import { createInitialMap } from "./map";
import type { HegemonyState } from "./types";
import { createSeed, expandDeck, shuffleWithSeed } from "./core/rng";

export function createInitialState(seed = createSeed()): HegemonyState {
  let rng = seed >>> 0;
  const seasonal = shuffleWithSeed(expandDeck(SEASONAL_EVENT_CARDS), rng);
  rng = seasonal.state;
  const player = shuffleWithSeed(expandDeck(PLAYER_EVENT_CARDS), rng);
  rng = player.state;

  return {
    phase: "setupCapital",
    currentPlayer: "0",
    turn: 1,
    board: {
      tiles: createInitialMap()
    },
    players: PLAYER_IDS.reduce(
      (players, playerId) => ({
        ...players,
        [playerId]: {
          id: playerId,
          name: PLAYER_NAMES[playerId],
          resources: { ...STARTING_RESOURCES },
          settlements: [],
          collectedThisTurn: false,
          hasCollectedGameplayIncome: false,
          grownSettlementsThisTurn: [],
          actionCostDiscounts: []
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
    log: [{ id: "start", season: 1, message: "The first season begins." }]
  };
}
