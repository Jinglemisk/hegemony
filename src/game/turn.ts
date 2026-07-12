import { GAME_CONFIG, TEST_OPENING_SETUP } from "./config";
import { PLAYER_IDS } from "./data";
import {
  applyUnrestUpkeep,
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
import { checkVictoryAtTurnStart } from "./victory";
import { GAME_MODES } from "./ruleset";
import type { Ruleset } from "./ruleset";
import type { BoardLayout, HegemonyState, Phase, PlayerId, SettlementKind } from "./types";

/**
 * The pure turn machine. It owns phase / currentPlayer / turn transitions on
 * {@link HegemonyState} (which now carries those fields), so the whole game is a
 * single serializable value and the turn flow can be tested without React.
 */

/** Create a new game in the configured mode. When the dev preload flag is on, run the scripted 4-player setup. */
export function createGame(
  seed?: number,
  ruleset: Ruleset = GAME_MODES[GAME_CONFIG.mode].ruleset,
  boardLayout: BoardLayout = GAME_CONFIG.boardLayout,
  preloadOpeningSetup: boolean = GAME_CONFIG.preloadOpeningSetupForTesting
): HegemonyState {
  const G = createInitialState(seed, ruleset, boardLayout);

  if (preloadOpeningSetup) {
    runPreloadOpeningSetup(G);
  }

  return G;
}

export function nextPlayer(playerID: PlayerId): PlayerId {
  const index = PLAYER_IDS.indexOf(playerID);
  return PLAYER_IDS[(index + 1) % PLAYER_IDS.length];
}

function setupPhaseFor(kind: SettlementKind): Phase {
  return kind === "capital" ? "setupCapital" : kind === "city" ? "setupCity" : "setupColony";
}

/**
 * Advance the setup machine one placement. Setup runs in SNAKE order
 * (roadmap-appendix D3c): round 0 goes 0→3, round 1 goes 3→0, and so on — the
 * player who picks last in one round picks first in the next. Once every player
 * has placed everything the ruleset's setup list owes, gameplay begins with the
 * season opener.
 */
export function advanceSetupTurn(G: HegemonyState) {
  G.turn += 1;

  const totalRounds = G.ruleset.setup.length;

  for (let round = 0; round < totalRounds; round += 1) {
    const order = round % 2 === 0 ? PLAYER_IDS : [...PLAYER_IDS].reverse();

    for (const playerID of order) {
      if (G.players[playerID].settlements.length <= round) {
        G.currentPlayer = playerID;
        G.phase = setupPhaseFor(G.ruleset.setup[round]);
        return;
      }
    }
  }

  G.phase = "gameplay";
  G.currentPlayer = G.seasonOpener;
}

/** Start-of-turn automation for the current gameplay player: reveal a seasonal event,
 *  check the victory race, then upkeep + income. When the upkeep starts a riot the
 *  income is DEFERRED — resolveRiot collects it once the table has spoken. */
export function beginGameplayTurn(G: HegemonyState) {
  if (G.phase !== "gameplay") {
    return;
  }

  if (!G.activeSeasonEvent) {
    drawSeasonalEvent(G);
  }

  checkVictoryAtTurnStart(G);

  if (G.phase !== "gameplay") {
    return;
  }

  applyUnrestUpkeep(G, G.currentPlayer);

  if (!G.pendingRiot) {
    collectIncome(G, G.currentPlayer, "automatic");
  }
}

/**
 * End the current gameplay turn: expire discounts, roll the season when play returns
 * to the season opener (rotating the opener each new year), then begin the next turn —
 * arrivals, the victory-race check, unrest upkeep, income.
 */
export function endTurn(G: HegemonyState): MoveResult {
  if (G.phase !== "gameplay" || G.pendingPlayerEvent || G.pendingRiot) {
    return { ok: false, reasons: [] };
  }

  const current = G.currentPlayer;
  let next = nextPlayer(current);

  expireTurnEventModifiers(G, current);

  if (next === G.seasonOpener) {
    startNewSeason(G);

    if (G.phase !== "gameplay") {
      // The seasonal deck (the clock) ran out — the exhaustion tally ended the game.
      return { ok: true };
    }

    // A new year rotates the opener (handled in startNewSeason); the new opener
    // leads the season, and everyone still plays exactly once per season.
    next = G.seasonOpener;
  }

  G.currentPlayer = next;
  G.turn += 1;

  resolveArrivingPops(G, next);
  checkVictoryAtTurnStart(G);

  if (G.phase !== "gameplay") {
    return { ok: true };
  }

  applyUnrestUpkeep(G, next);

  if (!G.pendingRiot) {
    collectIncome(G, next, "automatic");
  }

  return { ok: true };
}

/** Replay the scripted metropolis+colony opening through the real machine (dev preload). */
function runPreloadOpeningSetup(G: HegemonyState) {
  // The scripted opening supplies one metropolis + one founding colony per player, so
  // it fits the standard setup; other modes start from the empty flow.
  if (G.ruleset.setup.join() !== "capital,colony") {
    throw new Error("The scripted preload only fits the capital+colony standard setup.");
  }

  let guard = 0;

  while (G.phase !== "gameplay") {
    if (guard++ > 16) {
      throw new Error("Invalid test setup: setup did not converge.");
    }

    const placement = TEST_OPENING_SETUP.find((candidate) => candidate.playerID === G.currentPlayer);

    if (!placement) {
      throw new Error(`Invalid test setup: no placement for player ${G.currentPlayer}.`);
    }

    const result =
      G.phase === "setupCapital"
        ? placeCapital(G, placement.playerID, placement.capital.tileId, placement.capital.pops)
        : placeColony(G, placement.playerID, placement.colony.tileId, placement.colony.pops);

    if (!result.ok) {
      throw new Error(`Invalid test setup: ${placement.playerID} cannot place during ${G.phase}.`);
    }

    advanceSetupTurn(G);
  }

  beginGameplayTurn(G);
}
