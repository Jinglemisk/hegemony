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

/**
 * Positional score for the greedy bot. VP is the spine (it already counts
 * cities, colonies, free pops, banked material, and negative happiness);
 * the extra terms reward material income (future VP) and happiness headroom
 * so the bot doesn't strip-mine its own mood.
 */
function evaluate(G: HegemonyState, playerID: PlayerId): number {
  const standings = playerStandings(G, playerID);
  const resources = G.players[playerID].resources;
  const income = calculateIncome(G, playerID);
  const materialIncome = income.wood + income.stone + income.gold + income.food;

  return 10 * standings.victoryPoints + 0.5 * materialIncome + 2 * resources.happiness + resources.influence;
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
