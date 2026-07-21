import { applyMove, enumerateLegalMoves } from "../game/legalMoves";
import type { LegalMove } from "../game/legalMoves";
import type { GameModeId } from "../game/ruleset";
import type { BoardLayout, HegemonyState, PlayerId } from "../game/types";
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

/**
 * An Assembly runs entirely inside the season opener's turn (turn.ts): `endTurn` opens it
 * and returns *before* `G.turn` advances, and `closeAssembly` does the increment — so all
 * four seats fish, propose and vote at one constant `G.turn`, inside a single {@link playTurn}.
 * A fully-engaged agora (draws, bribes, a vote on every ballot item × four seats) far
 * exceeds a lone gameplay turn's budget, and force-ending mid-assembly is illegal anyway
 * (`endTurn` is rejected while `G.assembly` stands). This is the loop guard used while the
 * agora is open — high enough for any real assembly, low enough to still catch a stuck bot.
 */
export const MAX_ACTIONS_PER_ASSEMBLY = 500;

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
  /** Fires once when a turn hits the action cap and is force-ended; forcedResolutions
   *  = pending events/riots that had to be force-resolved first. */
  onForceEndTurn?: (G: HegemonyState, forcedResolutions: number) => void;
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

  // While the agora is open the turn is really a bounded multi-seat sub-process, not one
  // seat's gameplay turn — give it room rather than force-ending (which is illegal mid-assembly).
  for (let action = 0; action < (G.assembly ? MAX_ACTIONS_PER_ASSEMBLY : maxActions); action += 1) {
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
  let forcedResolutions = 0;

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

    forcedResolutions += 1;
    hooks.onMove?.(G, player, forced);
  }

  const player = G.currentPlayer;
  const endTurn: LegalMove = { type: "endTurn" };

  if (!applyMove(G, player, endTurn).ok) {
    throw new SimEnumerationError(`forced endTurn failed on turn ${G.turn} (phase ${G.phase})`);
  }

  hooks.onForceEndTurn?.(G, forcedResolutions);
  hooks.onMove?.(G, player, endTurn);
  hooks.onTurnEnd?.(G);
}

export type RunTurnsOptions = PlayTurnOptions & {
  /** Keep only the last N log entries after each turn (batch mode); omit to keep everything. */
  trimLogTo?: number;
  /** Per-seat policy override for mixed-policy tables; the uniform `policy` arg is the
   *  fallback for any seat not named here. */
  seatPolicies?: Partial<Record<PlayerId, Policy>>;
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
    // A single playTurn is one seat's turn, so pick that seat's policy (mixed tables).
    const active = options.seatPolicies?.[G.currentPlayer] ?? policy;
    playTurn(G, active, rng, hooks, options);

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
  boardLayout?: BoardLayout;
  policy: Policy;
  /** Per-seat policy override for mixed-policy tables; `policy` is the fallback. */
  seatPolicies?: Partial<Record<PlayerId, Policy>>;
  botSeed?: number;
  /** Player-turns to play after setup (4 players → 4 turns per round). */
  turns: number;
  hooks?: SimHooks;
  trimLogTo?: number;
};

/** One self-contained bot game: build (setup counts as turns played too), then run to the cap. */
export function runGame({ seed, mode, patch, opening = "random", boardLayout, policy, seatPolicies, botSeed, turns, hooks = {}, trimLogTo }: RunGameOptions): HegemonyState {
  const rng = createSimRng(botSeed ?? deriveBotSeed(seed));
  const G = buildNewGame({ seed, mode, patch, opening, boardLayout, simRng: rng, onMove: hooks.onMove });

  hooks.onGameStart?.(G);
  runTurns(G, policy, rng, turns, hooks, { trimLogTo, seatPolicies });
  return G;
}

function deadlockMessage(G: HegemonyState, player: PlayerId): string {
  return (
    `no legal moves for player ${player} on turn ${G.turn} (phase ${G.phase}, ` +
    `pending ${G.pendingPlayerEvent ? G.pendingPlayerEvent.card.id : "none"})`
  );
}
