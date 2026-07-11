import { calculateIncome } from "../game/economy/income";
import type { LegalMove } from "../game/legalMoves";
import { applyMove } from "../game/legalMoves";
import { playerStandings } from "../game/score";
import type { HegemonyState, PlayerId } from "../game/types";
import type { SimRng } from "./rng";

export type PolicyId = "random" | "greedy";

export type Policy = {
  name: PolicyId;
  choose(G: HegemonyState, moves: LegalMove[], rng: SimRng): LegalMove;
};

/**
 * Uniform-by-type, then uniform within type. Grouping first stops the biggest
 * move families (movePops, foundColony) from swamping the draw, and gives
 * endTurn roughly 1-in-k odds per action so turns always self-terminate.
 */
export const randomPolicy: Policy = {
  name: "random",
  choose(G, moves, rng) {
    const byType = new Map<LegalMove["type"], LegalMove[]>();

    for (const move of moves) {
      const group = byType.get(move.type) ?? [];
      group.push(move);
      byType.set(move.type, group);
    }

    const types = [...byType.keys()];
    const group = byType.get(rng.pick(types));

    return rng.pick(group ?? moves);
  },
};

/**
 * One-ply lookahead: apply each candidate to a clone and keep the best score
 * delta. Ends the turn when nothing improves the position. Deterministic —
 * ties keep the first (enumeration-ordered) candidate.
 */
export const greedyPolicy: Policy = {
  name: "greedy",
  choose(G, moves) {
    const playerID = G.currentPlayer;
    const endTurn = moves.find((move) => move.type === "endTurn");
    const candidates = moves.filter((move) => move.type !== "endTurn");

    if (candidates.length === 0 && endTurn) {
      return endTurn;
    }

    const before = evaluate(G, playerID);
    let best: LegalMove | null = null;
    let bestDelta = -Infinity;

    for (const move of candidates) {
      const draft = structuredClone(G);

      if (!applyMove(draft, playerID, move).ok) {
        continue;
      }

      const delta = evaluate(draft, playerID) - before;

      if (delta > bestDelta) {
        bestDelta = delta;
        best = move;
      }
    }

    // Forced situations (a pending event) have no endTurn — take the best resolution.
    if (!endTurn) {
      if (!best) {
        throw new Error("greedy policy found no applicable move");
      }
      return best;
    }

    return best && bestDelta > 0 ? best : endTurn;
  },
};

/** How many turns of income the greedy score projects forward. The horizon is
 *  what lets one-ply search see delayed payoffs: a granary's +2 food/turn or a
 *  temple's +1 happiness/turn are invisible at the moment of purchase and only
 *  become worth their cost when multiplied out. */
const INCOME_HORIZON = 6;

/**
 * Positional score for the greedy bot: VP evaluated on resources projected
 * INCOME_HORIZON turns ahead, plus a happiness term.
 *
 * The projection runs through calculateIncome — the engine's own formula — so
 * the score sees food-shortage pressure, the stockpile happiness bonus,
 * building income, and seasonal modifiers without duplicating any of them.
 * Happiness gets extra weight beyond VP's own penalty because the unrest
 * thresholds (-5/-10) delete pops nonlinearly, which VP cannot see.
 */
function evaluate(G: HegemonyState, playerID: PlayerId): number {
  const player = G.players[playerID];
  const income = calculateIncome(G, playerID);
  const saved = { ...player.resources };

  for (const resource of Object.keys(income) as (keyof typeof income)[]) {
    player.resources[resource] += income[resource] * INCOME_HORIZON;
  }

  const vp = playerStandings(G, playerID).victoryPoints;
  const projectedHappiness = player.resources.happiness;
  player.resources = saved;

  return 10 * vp + 2 * projectedHappiness + player.resources.influence;
}

export const POLICIES: Record<PolicyId, Policy> = {
  random: randomPolicy,
  greedy: greedyPolicy,
};

export function resolvePolicy(id: string): Policy {
  const policy = POLICIES[id as PolicyId];

  if (!policy) {
    throw new Error(`unknown policy "${id}" — expected one of: ${Object.keys(POLICIES).join(", ")}`);
  }

  return policy;
}
