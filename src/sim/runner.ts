import { produce } from "immer";
import { enumerateLegalCommands, transition } from "../game/legalMoves";
import type { GameCommand } from "../game/legalMoves";
import type { TransitionResult } from "../game/legalMoves";
import type { GameModeId } from "../game/ruleset";
import type { GameDefinition } from "../game/definition";
import { projectForPlayer } from "../game/projection";
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

/** An enumerated/chosen command failed to transition — enumeration and execution disagree. */
export class SimEnumerationError extends Error {}

export type SimHooks = {
  /** Fires right after the game is built, before the first turn — the telemetry baseline point. */
  onGameStart?: (G: HegemonyState) => void;
  /** Fires after each successful command with the newly published state. */
  onMove?: (G: HegemonyState, player: PlayerId, command: GameCommand) => void;
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

/** Simulator seam for the canonical command transition; exported for parity proof. */
export function applySimCommand(
  state: HegemonyState,
  actor: PlayerId,
  command: GameCommand,
): TransitionResult {
  return transition(state.definition, state, actor, command);
}

export function playTurn(
  initial: HegemonyState,
  policy: Policy,
  rng: SimRng,
  hooks: SimHooks = {},
  options: PlayTurnOptions = {},
): HegemonyState {
  let G = initial;
  const maxActions = options.maxActions ?? MAX_ACTIONS_PER_TURN;
  const startTurn = G.turn;

  if (G.phase === "gameOver") {
    return G;
  }

  // While the agora is open the turn is really a bounded multi-seat sub-process, not one
  // seat's gameplay turn — give it room rather than force-ending (which is illegal mid-assembly).
  for (let action = 0; action < (G.assembly ? MAX_ACTIONS_PER_ASSEMBLY : maxActions); action += 1) {
    const player = G.currentPlayer;
    const commands = enumerateLegalCommands(G, player);

    if (commands.length === 0) {
      throw new SimDeadlockError(deadlockMessage(G, player));
    }

    const command = policy.choose(projectForPlayer(G.definition, G, player), commands, rng);
    const result = applySimCommand(G, player, command);

    if (!result.ok) {
      throw new SimEnumerationError(
        `policy chose a command that failed to apply: ${JSON.stringify(command)} — ${result.reasons.join("; ") || "(no reason)"}`,
      );
    }

    G = result.state;
    hooks.onMove?.(G, player, command);

    if (G.phase === "gameOver" || G.turn !== startTurn) {
      hooks.onTurnEnd?.(G);
      return G;
    }
  }

  return forceEndTurn(G, hooks);
}

/** Action cap hit: resolve any pending event (first option) or pending riot (roll,
 *  no more insurance), then end the turn. */
function forceEndTurn(initial: HegemonyState, hooks: SimHooks): HegemonyState {
  let G = initial;
  let forcedResolutions = 0;

  for (let guard = 0; (G.pendingPlayerEvent || G.pendingRiot) && guard < 4; guard += 1) {
    const player = G.currentPlayer;
    const resolutions = enumerateLegalCommands(G, player);

    if (resolutions.length === 0) {
      throw new SimDeadlockError(deadlockMessage(G, player));
    }

    // Riot enumeration lists insurance first and the roll last — forced turns roll.
    const forced = resolutions.find((move) => move.type === "resolveRiot") ?? resolutions[0];

    const result = applySimCommand(G, player, forced);
    if (!result.ok) {
      throw new SimEnumerationError(`forced resolution failed: ${JSON.stringify(forced)}`);
    }

    G = result.state;
    forcedResolutions += 1;
    hooks.onMove?.(G, player, forced);
  }

  const player = G.currentPlayer;
  const endTurn: GameCommand = { type: "endTurn" };

  const result = applySimCommand(G, player, endTurn);
  if (!result.ok) {
    throw new SimEnumerationError(`forced endTurn failed on turn ${G.turn} (phase ${G.phase})`);
  }
  G = result.state;

  hooks.onForceEndTurn?.(G, forcedResolutions);
  hooks.onMove?.(G, player, endTurn);
  hooks.onTurnEnd?.(G);
  return G;
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
): HegemonyState {
  let current = G;
  const stopAt = current.turn + turns;

  while (current.turn < stopAt && current.phase !== "gameOver") {
    // A single playTurn is one seat's turn, so pick that seat's policy (mixed tables).
    const active = options.seatPolicies?.[current.currentPlayer] ?? policy;
    current = playTurn(current, active, rng, hooks, options);

    if (options.trimLogTo !== undefined && current.log.length > options.trimLogTo) {
      current = produce(current, (draft) => {
        draft.log.splice(0, draft.log.length - options.trimLogTo!);
      });
    }
  }

  return current;
}

export type RunGameOptions = {
  seed: number;
  mode: GameModeId;
  patch?: RulesetPatch | null;
  definition?: GameDefinition;
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
export function runGame({
  seed,
  mode,
  patch,
  definition,
  opening = "policy",
  boardLayout,
  policy,
  seatPolicies,
  botSeed,
  turns,
  hooks = {},
  trimLogTo,
}: RunGameOptions): HegemonyState {
  const rng = createSimRng(botSeed ?? deriveBotSeed(seed));
  let G = buildNewGame({
    seed,
    mode,
    patch,
    definition,
    opening,
    boardLayout,
    simRng: rng,
    onMove: hooks.onMove,
  });

  hooks.onGameStart?.(G);
  G = runTurns(G, policy, rng, turns, hooks, { trimLogTo, seatPolicies });
  return G;
}

function deadlockMessage(G: HegemonyState, player: PlayerId): string {
  return (
    `no legal commands for player ${player} on turn ${G.turn} (phase ${G.phase}, ` +
    `pending ${G.pendingPlayerEvent ? G.pendingPlayerEvent.card.id : "none"})`
  );
}
