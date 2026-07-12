import { calculateIncome } from "../game/economy/income";
import type { LegalMove } from "../game/legalMoves";
import { applyMove } from "../game/legalMoves";
import { playerStandings } from "../game/score";
import { victoryCardsHeld } from "../game/victory";
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

    // A pending riot is a forced menu with a stochastic resolution — one-ply
    // lookahead would "peek" the seeded die through the clone, so play it by rule
    // instead: declare the resource-priced insurances (cheap certainty), skip the
    // concession (bots shouldn't reason about which pop to sacrifice), then roll.
    const resolveRiot = moves.find((move) => move.type === "resolveRiot");
    if (resolveRiot) {
      const insurance = moves.find(
        (move) => move.type === "buyRiotInsurance" && move.optionId !== "concession"
      );
      return insurance ?? resolveRiot;
    }

    // Ventures are stochastic too — the same peek problem — so gamble by rule: a
    // gold-rich bot funds one expedition a turn (season-cycled so sims exercise all
    // three tables), and never lets the lookahead see the roll.
    const goldVentures = moves.filter(
      (move): move is Extract<LegalMove, { type: "fundExpedition" }> =>
        move.type === "fundExpedition" && move.stake === "gold"
    );
    if (goldVentures.length > 0 && G.players[playerID].resources.gold >= 15) {
      return goldVentures[G.season % goldVentures.length];
    }

    // Bank chains (sell surplus → buy the missing colony wood) are invisible to
    // one-ply search, so trade by rule: hoarded food beyond the happiness cap gets
    // sold; a wood-starved, gold-rich empire buys wood.
    const foodSell = moves.find((move) => move.type === "bankSell" && move.material === "food");
    if (foodSell && G.players[playerID].resources.food > 60) {
      return foodSell;
    }

    const woodBuy = moves.find((move) => move.type === "bankBuy" && move.material === "wood");
    if (woodBuy && G.players[playerID].resources.wood < 20 && G.players[playerID].resources.gold >= 20) {
      return woodBuy;
    }

    const endTurn = moves.find((move) => move.type === "endTurn");
    const candidates = moves.filter(
      (move) => move.type !== "endTurn" && move.type !== "fundExpedition"
    );

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
 * Positional score for the greedy bot, evaluated on resources projected
 * INCOME_HORIZON turns ahead.
 *
 * The old provisional-VP formula lives on here as the bot's private heuristic —
 * a smooth gradient (cities, colonies, pops, banked material) the one-ply search
 * can climb — now topped with a large victory-card term so the bot actually
 * chases the race (game/victory.ts), and a happiness term because the unrest
 * thresholds (-5/-10) delete pops nonlinearly.
 *
 * The projection runs through calculateIncome — the engine's own formula — so
 * the score sees food-shortage pressure, the stockpile happiness bonus,
 * building income, and seasonal modifiers without duplicating any of them.
 */
function evaluate(G: HegemonyState, playerID: PlayerId): number {
  const player = G.players[playerID];
  const income = calculateIncome(G, playerID);
  const saved = { ...player.resources };

  for (const resource of Object.keys(income) as (keyof typeof income)[]) {
    player.resources[resource] += income[resource] * INCOME_HORIZON;
  }

  const standings = playerStandings(G, playerID);
  const material =
    player.resources.wood + player.resources.stone + player.resources.gold + player.resources.food;
  const heuristic =
    5 * standings.cities +
    3 * standings.colonies +
    standings.pops +
    Math.floor(material / 10) -
    Math.max(0, -player.resources.happiness);
  const projectedHappiness = player.resources.happiness;
  player.resources = saved;

  return 100 * victoryCardsHeld(G, playerID) + 10 * heuristic + 2 * projectedHappiness + player.resources.influence;
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
