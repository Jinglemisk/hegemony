import type { Phase } from "../../../client/controller";
import { pendingDecisionReasons } from "../../../game/rules";
import type { HegemonyState } from "../../../game/types";

/** The turn gate: whether the viewer may take a turn action now, and why not. */

/** What the turn gate ({@link turnBlocked}) reads: the seat, the phase, and what the
 *  table waits on instead of the turn ({@link turnPending}), or null. */
type TurnGate = { isActive: boolean; phase: Phase; pending: string | null };

const IN_ASSEMBLY = "The Assembly is sitting: return to it to act.";

/** What the table waits on instead of the turn: the Assembly, which the shell only
 *  reads until it rises, or the engine's pending decision (`pendingDecisionReasons`). */
export function turnPending(G: HegemonyState): string | null {
  if (G.assembly) return IN_ASSEMBLY;
  return G.phase === "gameplay" ? (pendingDecisionReasons(G)[0] ?? null) : null;
}

/** Why the viewer may not take a turn action now, or null when they may: what the
 *  table waits on first, then the seat, then the phase. */
export function turnBlocked(gate: TurnGate): string | null {
  if (gate.pending) return gate.pending;
  if (!gate.isActive) return "Current player's turn only.";
  return gate.phase === "gameplay" ? null : "Gameplay only.";
}

/** The end-turn explanation, blocked or not. */
export function turnCommitTitle(gate: TurnGate) {
  return turnBlocked(gate) ?? "Press and hold to end the turn.";
}
