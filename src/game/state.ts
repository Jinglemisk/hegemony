import { PLAYER_IDS, PLAYER_NAMES } from "./data";
import {
  getAuthoredGameContent,
  getPlayerEventCards,
  getSeasonalEventCards,
  getTerrainDeck,
} from "./content";
import { createGameDefinition } from "./definition";
import type { GameDefinition } from "./definition";
import { deriveBankRates } from "./bank";
import { createLuxuryAssets } from "./luxury";
import { createInitialMap } from "./map";
import type { BoardLayout, HegemonyState } from "./types";
import { expandDeck, shuffleWithSeed } from "./core/rng";
import { DEFAULT_RULESET } from "./ruleset";
import type { Ruleset } from "./ruleset";
import { createPoliticianDecks } from "./assembly/assembly";
import { CURRENT_RECIPE_VERSIONS } from "./version";

export function createInitialState(
  seed: number,
  ruleset: Ruleset = DEFAULT_RULESET,
  boardLayout: BoardLayout = "classic",
): HegemonyState {
  return createInitialStateFromDefinition(
    createGameDefinition({
      ruleset,
      content: getAuthoredGameContent(),
    }),
    seed,
    boardLayout,
  );
}

/** Create a match pinned to one immutable definition. Browser, sim and replay use this path. */
export function createInitialStateFromDefinition(
  definition: GameDefinition,
  seed: number,
  boardLayout: BoardLayout = "classic",
): HegemonyState {
  const { content, ruleset } = definition;
  let rng = seed >>> 0;
  const seasonal = shuffleWithSeed(expandDeck(getSeasonalEventCards(content)), rng);
  rng = seasonal.state;
  const player = shuffleWithSeed(expandDeck(getPlayerEventCards(content)), rng);
  rng = player.state;

  const baseTerrainDeck = getTerrainDeck(content);
  let terrainDeck = baseTerrainDeck;
  if (boardLayout === "shuffled") {
    const shuffled = shuffleWithSeed(baseTerrainDeck, rng);
    terrainDeck = shuffled.cards;
    rng = shuffled.state;
  }

  const tiles = createInitialMap(terrainDeck);

  // Each politician's deck is shuffled from the same seed chain as the event decks, so
  // an assembly four years away is still reproducible from the game's seed alone.
  const politicians = createPoliticianDecks(rng, content);
  rng = politicians.rng;

  // Seat the luxury goods (Phase 4). Uses the initial seed, not the rng chain: the
  // moorings are a fact of the board like the bank rates, not a draw in the deck
  // sequence, so adding them cannot shift any existing shuffle.
  const identity = { nextEntityId: 1 };
  const luxuries = createLuxuryAssets(identity, tiles, ruleset, content, seed >>> 0);

  return {
    ...CURRENT_RECIPE_VERSIONS,
    nextEntityId: identity.nextEntityId,
    phase: "setupCapital",
    currentPlayer: "0",
    turn: 1,
    seed: seed >>> 0,
    seasonOpener: "0",
    winner: null,
    gameOverReason: null,
    boardLayout,
    ruleset,
    definition,
    definitionId: definition.identity.id,
    board: { tiles, luxuries },
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
          ventureUsedThisTurn: false,
          lawFreeActionsUsedThisYear: [],
          incomeSuppressedTurns: 0,
        },
      }),
      {} as HegemonyState["players"],
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
    log: [{ id: "start", season: 1, message: "Spring of Year 1 begins." }],
    assembly: null,
    activeLaws: [],
    tallyMonuments: [],
    politicianDecks: politicians.decks,
    politicianDiscards: politicians.discards,
    lawOrder: 0,
    assemblyPassedByPlayer: { "0": 0, "1": 0, "2": 0, "3": 0 },
    voiceHolder: null,
    pendingIsonomiaTarget: null,
    assembliesHeld: 0,
  };
}
