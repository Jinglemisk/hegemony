import { PLAYER_EVENT_CARDS, PLAYER_IDS, PLAYER_NAMES, SEASONAL_EVENT_CARDS } from "./data";
import { getTerrainDeck } from "./content";
import { deriveBankRates } from "./bank";
import { createInitialMap } from "./map";
import type { BoardLayout, HegemonyState } from "./types";
import { createSeed, expandDeck, shuffleWithSeed } from "./core/rng";
import { DEFAULT_RULESET } from "./ruleset";
import type { Ruleset } from "./ruleset";

export function createInitialState(
  seed = createSeed(),
  ruleset: Ruleset = DEFAULT_RULESET,
  boardLayout: BoardLayout = "classic"
): HegemonyState {
  let rng = seed >>> 0;
  const seasonal = shuffleWithSeed(expandDeck(SEASONAL_EVENT_CARDS), rng);
  rng = seasonal.state;
  const player = shuffleWithSeed(expandDeck(PLAYER_EVENT_CARDS), rng);
  rng = player.state;

  const baseTerrainDeck = getTerrainDeck();
  let terrainDeck = baseTerrainDeck;
  if (boardLayout === "shuffled") {
    const shuffled = shuffleWithSeed(baseTerrainDeck, rng);
    terrainDeck = shuffled.cards;
    rng = shuffled.state;
  }

  const tiles = createInitialMap(terrainDeck);

  return {
    phase: "setupCapital",
    currentPlayer: "0",
    turn: 1,
    seed: seed >>> 0,
    seasonOpener: "0",
    winner: null,
    gameOverReason: null,
    boardLayout,
    ruleset,
    board: { tiles },
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
          popsLostToUnrest: 0,
          popsGainedFromEvents: 0,
          civicCalmUsedThisTurn: false,
          ladderUsedThisTurn: false,
          ventureUsedThisTurn: false
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
    pendingRiot: null,
    lastTableRoll: null,
    yearOmen: null,
    // The bank's per-material rates are a function of THIS board (Q14) — derived
    // once here, static for the whole game.
    bank: deriveBankRates(tiles, ruleset.economy.bank),
    season: 1,
    rng,
    log: [{ id: "start", season: 1, message: "Spring of Year 1 begins." }]
  };
}
