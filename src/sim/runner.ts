import { applyMove, enumerateLegalMoves } from "../game/legalMoves";
import type { LegalMove } from "../game/legalMoves";
import type { GameModeId } from "../game/ruleset";
import type { HegemonyState, PlayerId } from "../game/types";
import type { OpeningKind, RulesetPatch } from "./io";
import type { Policy } from "./policies";
import { createSimRng, deriveBotSeed } from "./rng";
import type { SimRng } from "./rng";
import { buildNewGame } from "./setup";

/**
 * The bot turn loop. One `playTurn` call advances the game by exactly one turn
 * (a gameplay player-turn, or one setup placement — both bump `G.turn`), so
 * `runTurns(G, ..., n)` is always "n turns forward" regardless of phase.
 *
 * Games end for real now (victory race / deck exhaustion → phase "gameOver");
 * the turn cap remains as a ceiling for truncated experiments.
 */

export const MAX_ACTIONS_PER_TURN = 30;

/** Enumeration returned nothing — a rules invariant broke; the state is in the message. */
export class SimDeadlockError extends Error {}

/** An enumerated/chosen move failed to apply — enumeration and mutators disagree. */
export class SimEnumerationError extends Error {}

export type SimHooks = {
  /** Fires right after the game is built, before the first turn — the telemetry baseline point. */
  onGameStart?: (G: HegemonyState) => void;
  /** Fires after each applied move. NOTE: the move has already mutated G. */
  onMove?: (G: HegemonyState, player: PlayerId, move: LegalMove) => void;
  /** Fires after each completed turn — the telemetry snapshot point. */
  onTurnEnd?: (G: HegemonyState) => void;
};

export type PlayTurnOptions = {
  /** Safety cap before the turn is force-ended (tests shrink this). */
  maxActions?: number;
};

export function playTurn(G: HegemonyState, policy: Policy, rng: SimRng, hooks: SimHooks = {}, options: PlayTurnOptions = {}) {
  const maxActions = options.maxActions ?? MAX_ACTIONS_PER_TURN;
  const startTurn = G.turn;

  if (G.phase === "gameOver") {
    return;
  }

  for (let action = 0; action < maxActions; action += 1) {
    const player = G.currentPlayer;
    const moves = enumerateLegalMoves(G, player);

    if (moves.length === 0) {
      throw new SimDeadlockError(deadlockMessage(G, player));
    }

    const move = policy.choose(G, moves, rng);
    const result = applyMove(G, player, move);

    if (!result.ok) {
      throw new SimEnumerationError(
        `policy chose a move that failed to apply: ${JSON.stringify(move)} — ${result.reasons.join("; ") || "(no reason)"}`,
      );
    }

    hooks.onMove?.(G, player, move);

    // applyMove may have ended the game (victory race / deck exhaustion) — TS can't
    // see the mutation through the narrowed union, hence the widening read.
    if ((G.phase as HegemonyState["phase"]) === "gameOver" || G.turn !== startTurn) {
      hooks.onTurnEnd?.(G);
      return;
    }
  }

  forceEndTurn(G, hooks);
}

/** Action cap hit: resolve any pending event (first option) or pending riot (roll,
 *  no more insurance), then end the turn. */
function forceEndTurn(G: HegemonyState, hooks: SimHooks) {
  for (let guard = 0; (G.pendingPlayerEvent || G.pendingRiot) && guard < 4; guard += 1) {
    const player = G.currentPlayer;
    const resolutions = enumerateLegalMoves(G, player);

    if (resolutions.length === 0) {
      throw new SimDeadlockError(deadlockMessage(G, player));
    }

    // Riot enumeration lists insurance first and the roll last — forced turns roll.
    const forced = resolutions.find((move) => move.type === "resolveRiot") ?? resolutions[0];

    if (!applyMove(G, player, forced).ok) {
      throw new SimEnumerationError(`forced resolution failed: ${JSON.stringify(forced)}`);
    }

    hooks.onMove?.(G, player, forced);
  }

  const player = G.currentPlayer;
  const endTurn: LegalMove = { type: "endTurn" };

  if (!applyMove(G, player, endTurn).ok) {
    throw new SimEnumerationError(`forced endTurn failed on turn ${G.turn} (phase ${G.phase})`);
  }

  hooks.onMove?.(G, player, endTurn);
  hooks.onTurnEnd?.(G);
}

export type RunTurnsOptions = PlayTurnOptions & {
  /** Keep only the last N log entries after each turn (batch mode); omit to keep everything. */
  trimLogTo?: number;
};

export function runTurns(
  G: HegemonyState,
  policy: Policy,
  rng: SimRng,
  turns: number,
  hooks: SimHooks = {},
  options: RunTurnsOptions = {},
) {
  const stopAt = G.turn + turns;

  while (G.turn < stopAt && G.phase !== "gameOver") {
    playTurn(G, policy, rng, hooks, options);

    if (options.trimLogTo !== undefined && G.log.length > options.trimLogTo) {
      G.log.splice(0, G.log.length - options.trimLogTo);
    }
  }
}

export type RunGameOptions = {
  seed: number;
  mode: GameModeId;
  patch?: RulesetPatch | null;
  opening?: OpeningKind;
  policy: Policy;
  botSeed?: number;
  /** Player-turns to play after setup (4 players → 4 turns per round). */
  turns: number;
  hooks?: SimHooks;
  trimLogTo?: number;
};

/** One self-contained bot game: build (setup counts as turns played too), then run to the cap. */
export function runGame({ seed, mode, patch, opening = "random", policy, botSeed, turns, hooks = {}, trimLogTo }: RunGameOptions): HegemonyState {
  const rng = createSimRng(botSeed ?? deriveBotSeed(seed));
  const G = buildNewGame({ seed, mode, patch, opening, simRng: rng, onMove: hooks.onMove });

  hooks.onGameStart?.(G);
  runTurns(G, policy, rng, turns, hooks, { trimLogTo });
  return G;
}

function deadlockMessage(G: HegemonyState, player: PlayerId): string {
  return (
    `no legal moves for player ${player} on turn ${G.turn} (phase ${G.phase}, ` +
    `pending ${G.pendingPlayerEvent ? G.pendingPlayerEvent.card.id : "none"})`
  );
}
