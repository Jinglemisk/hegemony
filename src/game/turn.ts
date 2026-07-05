import { GAME_CONFIG, TEST_OPENING_SETUP } from "./config";
import { PLAYER_IDS } from "./data";
import {
  collectIncome,
  createInitialState,
  drawSeasonalEvent,
  expireTurnEventModifiers,
  placeCapital,
  placeColony,
  resolveArrivingPops,
  startNewSeason,
} from "./rules";
import type { MoveResult } from "./rules";
import { GAME_MODES, setupCapitalCount } from "./ruleset";
import type { Ruleset } from "./ruleset";
import type { HegemonyState, Phase, PlayerId } from "./types";

/**
 * The pure turn machine. It owns phase / currentPlayer / turn transitions on
 * {@link HegemonyState} (which now carries those fields), so the whole game is a
 * single serializable value and the turn flow can be tested without React.
 */

/** Create a new game in the configured mode. When the test-opening flag is on, run the scripted 4-player setup. */
export function createGame(seed?: number, ruleset: Ruleset = GAME_MODES[GAME_CONFIG.mode].ruleset): HegemonyState {
  const G = createInitialState(seed, ruleset);

  if (GAME_CONFIG.preloadOpeningSetupForTesting) {
    preloadOpeningSetup(G);
  }

  return G;
}

export function nextPlayer(playerID: PlayerId): PlayerId {
  const index = PLAYER_IDS.indexOf(playerID);
  return PLAYER_IDS[(index + 1) % PLAYER_IDS.length];
}

/** Advance one setup placement; once every player owns `count` settlements, move to `nextPhase`. */
export function advanceSetupTurn(G: HegemonyState, count: number, nextPhase: Phase) {
  G.turn += 1;

  if (allPlayersHaveSettlementCount(G, count)) {
    G.currentPlayer = "0";
    G.phase = nextPhase;
    return;
  }

  G.currentPlayer = nextPlayer(G.currentPlayer);
}

/** Start-of-turn automation for the current gameplay player: reveal a seasonal event, auto-collect income. */
export function beginGameplayTurn(G: HegemonyState) {
  if (G.phase !== "gameplay") {
    return;
  }

  if (!G.activeSeasonEvent) {
    drawSeasonalEvent(G);
  }

  collectIncome(G, G.currentPlayer, "automatic");
}

/** End the current gameplay turn: expire discounts, roll the season on wrap to player 0, then begin the next turn. */
export function endTurn(G: HegemonyState): MoveResult {
  if (G.phase !== "gameplay" || G.pendingPlayerEvent) {
    return { ok: false, reasons: [] };
  }

  const current = G.currentPlayer;
  const next = nextPlayer(current);

  expireTurnEventModifiers(G, current);

  if (next === "0") {
    startNewSeason(G);
  }

  resolveArrivingPops(G, next);
  collectIncome(G, next, "automatic");

  G.currentPlayer = next;
  G.turn += 1;

  return { ok: true };
}

function allPlayersHaveSettlementCount(G: HegemonyState, count: number) {
  return Object.values(G.players).every((player) => player.settlements.length >= count);
}

function preloadOpeningSetup(G: HegemonyState) {
  // The scripted opening only supplies one capital + one colony per player, so it
  // fits the two-settlement "standard" setup; other modes start from the empty flow.
  for (const placement of TEST_OPENING_SETUP) {
    assertSetupTurn(G, placement.playerID, "setupCapital");
    assertValidSetupMove(
      placeCapital(G, placement.playerID, placement.city.tileId, placement.city.pops),
      placement.playerID,
      "city",
      placement.city.tileId,
    );
    advanceSetupTurn(G, setupCapitalCount(G.ruleset), "setupColony");
  }

  for (const placement of TEST_OPENING_SETUP) {
    assertSetupTurn(G, placement.playerID, "setupColony");
    assertValidSetupMove(
      placeColony(G, placement.playerID, placement.colony.tileId, placement.colony.pops),
      placement.playerID,
      "colony",
      placement.colony.tileId,
    );
    advanceSetupTurn(G, G.ruleset.setup.length, "gameplay");
  }

  beginGameplayTurn(G);
}

function assertSetupTurn(G: HegemonyState, playerID: PlayerId, phase: Phase) {
  if (G.currentPlayer !== playerID || G.phase !== phase) {
    throw new Error(`Invalid test setup order: expected ${playerID} during ${phase}.`);
  }
}

function assertValidSetupMove(
  result: MoveResult,
  playerID: PlayerId,
  kind: "city" | "colony",
  tileId: string,
) {
  if (!result.ok) {
    throw new Error(`Invalid test setup: ${playerID} cannot place ${kind} on ${tileId}.`);
  }
}
