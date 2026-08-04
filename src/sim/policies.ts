import { calculateIncome } from "../game/economy/income";
import { getActiveEffects } from "../game/activeEffects";
import { applyResourceDeltaWithFloors } from "../game/core/resources";
import {
  getAuthoredGameContent,
  getResolutionCard,
  getResolutionCards,
  getRiotTable,
} from "../game/content";
import type { GameContent } from "../game/content";
import { getTile } from "../game/core/query";
import { canPlaceColonyOnTile, settlementBuildingSlots } from "../game/settlement";
import {
  availableLawReplacementIds,
  currentVoteWeight,
  enactForEval,
  lawNeedsReplacement,
  nextDrawCost,
} from "../game/assembly";
import type { AssemblySession, BallotItem, ResolutionCard } from "../game/assembly";
import type { GameCommand } from "../game/legalMoves";
import { enumerateLegalCommands, transition } from "../game/legalMoves";
import { playerStandings } from "../game/score";
import { victoryCardsHeld } from "../game/victory";
import type { HegemonyState, PlayerId } from "../game/types";
import type { PlayerView } from "../game/projection";
import type { Ruleset } from "../game/ruleset";
import type { SimRng } from "./rng";

export type PolicyId = "random" | "greedy" | "smart" | "beam" | "political" | "settler" | "master";

export type Policy = {
  name: PolicyId;
  choose(view: PlayerView, commands: GameCommand[], rng: SimRng): GameCommand;
};

/**
 * Uniform-by-type, then uniform within type. Grouping first stops the biggest
 * move families (movePops, foundColony) from swamping the draw, and gives
 * endTurn roughly 1-in-k odds per action so turns always self-terminate.
 */
export const randomPolicy: Policy = {
  name: "random",
  choose(_view, moves, rng) {
    const byType = new Map<GameCommand["type"], GameCommand[]>();

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

/** Move types handled by explicit policy rules rather than generic search. Stochastic
 * moves stay out to prevent RNG peeking; unit bank moves stay out because independently
 * optimizing both sides of a multi-step exchange can create wasteful buy/sell churn. */
const RULE_DRIVEN_MOVE_TYPES: ReadonlySet<GameCommand["type"]> = new Set([
  "fundExpedition",
  "resolveRiot",
  "buyRiotInsurance",
  "bankBuy",
  "bankSell",
]);

export function policyEconomyThresholds(ruleset: Ruleset) {
  const colonyWoodCost = ruleset.actionCosts.foundColony.wood ?? 0;
  const goldVentureStake = ruleset.ventureStakes.gold.gold ?? 0;
  return {
    ventureGoldReserve: goldVentureStake * 5,
    sellSurplus: colonyWoodCost * 2,
    lowGold: goldVentureStake * 2,
    woodStarved: colonyWoodCost,
    goldRich: colonyWoodCost,
    materialScoreDivisor: Math.max(1, ruleset.victory.minimums.stockpile / 8),
  };
}

/**
 * The hard-coded rules for the stochastic move families (riot / venture / bank chains),
 * shared by the one-ply and beam searches so the anti-peek policy lives in one place.
 * Returns the move to play by rule, or null when none applies and the search proceeds.
 */
function resolveStochasticByRule(G: HegemonyState, moves: GameCommand[]): GameCommand | null {
  const playerID = G.currentPlayer;
  const thresholds = policyEconomyThresholds(G.ruleset);

  // A pending riot is a forced menu with a stochastic resolution — declare the
  // resource-priced insurances (cheap certainty), skip the concession, then roll.
  const resolveRiot = moves.find((move) => move.type === "resolveRiot");
  if (resolveRiot) {
    const insurance = moves.find(
      (move) => move.type === "buyRiotInsurance" && move.optionId !== "concession",
    );
    return insurance ?? resolveRiot;
  }

  // Ventures are stochastic too — a gold-rich bot funds one expedition a turn
  // (season-cycled so sims exercise all three tables), never peeking the roll.
  const goldVentures = moves.filter(
    (move): move is Extract<GameCommand, { type: "fundExpedition" }> =>
      move.type === "fundExpedition" && move.stake === "gold",
  );
  if (
    goldVentures.length > 0 &&
    G.players[playerID].resources.gold >= thresholds.ventureGoldReserve
  ) {
    return goldVentures[G.season % goldVentures.length];
  }

  // Bank chains (sell surplus → buy the missing colony wood) are invisible to one-ply
  // search: sell a hoard when the coffers run dry; buy wood when wood-starved, gold-rich.
  for (const material of ["stone", "wood", "food"] as const) {
    const sell = moves.find((move) => move.type === "bankSell" && move.material === material);
    if (
      sell &&
      G.players[playerID].resources[material] > thresholds.sellSurplus &&
      G.players[playerID].resources.gold < thresholds.lowGold
    ) {
      return sell;
    }
  }

  const woodBuy = moves.find((move) => move.type === "bankBuy" && move.material === "wood");
  if (
    woodBuy &&
    G.players[playerID].resources.wood < thresholds.woodStarved &&
    G.players[playerID].resources.gold >= thresholds.goldRich
  ) {
    return woodBuy;
  }

  return null;
}

/**
 * One-ply lookahead shared by the greedy and smart bots: apply each candidate to a
 * clone and keep the best score delta under `score`. Ends the turn when nothing
 * improves the position. Deterministic — ties keep the first (enumeration-ordered)
 * candidate. The two bots differ ONLY in the `score` function, so a greedy-vs-smart
 * comparison isolates the evaluation, not the search.
 */
function onePlyLookahead(
  G: HegemonyState,
  moves: GameCommand[],
  score: (g: HegemonyState, p: PlayerId) => number,
): GameCommand {
  const playerID = G.currentPlayer;

  const byRule = resolveStochasticByRule(G, moves);
  if (byRule) {
    return byRule;
  }

  const endTurn = moves.find((move) => move.type === "endTurn");
  const candidates = moves.filter(
    (move) => !RULE_DRIVEN_MOVE_TYPES.has(move.type) && move.type !== "endTurn",
  );

  if (candidates.length === 0 && endTurn) {
    return endTurn;
  }

  const before = score(G, playerID);
  let best: GameCommand | null = null;
  let bestDelta = -Infinity;

  for (const move of candidates) {
    const result = transition(G.definition, G, playerID, move);
    if (!result.ok) {
      continue;
    }

    const delta = score(result.state, playerID) - before;

    if (delta > bestDelta) {
      bestDelta = delta;
      best = move;
    }
  }

  // Forced situations (a pending event) have no endTurn — take the best resolution.
  if (!endTurn) {
    if (!best) {
      throw new Error("policy found no applicable move");
    }
    return best;
  }

  return best && bestDelta > 0 ? best : endTurn;
}

export const greedyPolicy: Policy = {
  name: "greedy",
  choose(view, moves) {
    return onePlyLookahead(view.state, moves, evaluate);
  },
};

/**
 * The slot- and promotion-aware bot (2026-07-18). Same search as greedy, but its
 * evaluation actually values Phase 2's strategic layer — so sims exercise the
 * mechanics greedy is blind to: it climbs the social ladder, builds the Villa and
 * Gymnasion, and prefers slot-rich cities. See {@link evaluateSmart}.
 */
export const smartPolicy: Policy = {
  name: "smart",
  choose(view, moves) {
    return onePlyLookahead(view.state, moves, evaluateSmart);
  },
};

/** How many turns of income the greedy score projects forward. The horizon is
 *  what lets one-ply search see delayed payoffs: a granary's +2 food/turn or a
 *  temple's +1 happiness/turn are invisible at the moment of purchase and only
 *  become worth their cost when multiplied out. */
const INCOME_HORIZON = 6;
export type PolicyUnrestExposure = {
  minimumHappiness: number;
  mildRiotEvents: number;
  severeRiotEvents: number;
  riskPenalty: number;
};
export type PolicyProjection = {
  resources: HegemonyState["players"][PlayerId]["resources"];
  expectedStarvationPopLoss: number;
  unrest: PolicyUnrestExposure;
};

/**
 * The reference policies' canonical future-state projection. Ordinary recurring
 * modifiers already flow through calculateIncome; the active-effect selector adds
 * state that income alone cannot express: skipped collections, future timed mood,
 * and accumulated starvation progress.
 */
export function projectPolicyHorizon(
  G: HegemonyState,
  playerID: PlayerId,
  horizon = INCOME_HORIZON,
): PolicyProjection {
  const projectedState = createPolicyProjectionState(G, playerID);
  const player = projectedState.players[playerID];
  let expectedStarvationPopLoss = 0;
  const unrest: PolicyUnrestExposure = {
    minimumHappiness: player.resources.happiness,
    mildRiotEvents: 0,
    severeRiotEvents: 0,
    riskPenalty: 0,
  };
  let income = calculateIncome(projectedState, playerID);
  const activeEffects = getActiveEffects(projectedState, playerID, { income });
  const mechanics = activeEffects.flatMap((descriptor) => descriptor.mechanics);
  let suppressedCollections = mechanics.reduce(
    (total, mechanic) => total + (mechanic.type === "suppressIncome" ? mechanic.turns : 0),
    0,
  );
  let deficit = mechanics.find((mechanic) => mechanic.type === "foodDeficitProgress");

  for (let step = 0; step < horizon; step += 1) {
    for (const mechanic of mechanics) {
      if (mechanic.type === "timedHappiness" && step < mechanic.turns) {
        player.resources.happiness += mechanic.amountPerTurn;
      }
    }

    // The engine checks unrest at every start-of-turn upkeep, before income.
    // Record every exposure rather than judging only the terminal happiness.
    unrest.minimumHappiness = Math.min(unrest.minimumHappiness, player.resources.happiness);
    const upkeepRisk = evaluatePolicyUnrestRisk(
      projectedState.ruleset,
      player.resources.happiness,
      projectedState.definition.content,
    );
    unrest.riskPenalty += upkeepRisk.scorePenalty;

    if (upkeepRisk.tier === "revolt") {
      unrest.severeRiotEvents += 1;
      // Severe riots always rebound after resolution, independent of the roll.
      player.resources.happiness = projectedState.ruleset.economy.unrest.severeRebound;
    } else if (upkeepRisk.tier === "unrest") {
      unrest.mildRiotEvents += 1;
    }

    const graceActive =
      projectedState.ruleset.economy.firstIncomeFoodGrace && !player.hasCollectedGameplayIncome;

    if (!graceActive) {
      if (deficit) {
        player.consecutiveFoodDeficitTurns += 1;

        if (player.consecutiveFoodDeficitTurns >= deficit.threshold) {
          const removed = removeExpectedStarvationPops(projectedState, playerID, deficit.popLoss);
          expectedStarvationPopLoss += removed;
          player.consecutiveFoodDeficitTurns = 0;

          if (removed > 0) {
            income = calculateIncome(projectedState, playerID);
            deficit = getActiveEffects(projectedState, playerID, { income })
              .flatMap((descriptor) => descriptor.mechanics)
              .find((mechanic) => mechanic.type === "foodDeficitProgress");
          }
        }
      } else {
        player.consecutiveFoodDeficitTurns = 0;
      }
    }

    if (suppressedCollections > 0) {
      suppressedCollections -= 1;
      player.incomeSuppressedTurns = Math.max(0, player.incomeSuppressedTurns - 1);
    } else {
      applyResourceDeltaWithFloors(
        player.resources,
        income,
        projectedState.ruleset.economy.stockpileFloors,
      );
    }

    player.hasCollectedGameplayIncome = true;
  }

  return {
    resources: { ...player.resources },
    expectedStarvationPopLoss,
    unrest,
  };
}

/**
 * Isolate only the state the projection mutates. Policy evaluation runs for every
 * legal candidate, so cloning decks, logs, assembly state, and unrelated players
 * here would turn the six-step horizon into a simulation-wide hot path.
 */
function createPolicyProjectionState(G: HegemonyState, playerID: PlayerId): HegemonyState {
  const originalPlayer = G.players[playerID];
  const ownedTileIds = new Set(originalPlayer.settlements);

  return {
    ...G,
    board: {
      ...G.board,
      tiles: G.board.tiles.map((tile) =>
        ownedTileIds.has(tile.id)
          ? {
              ...tile,
              settlements: tile.settlements.map((settlement) =>
                settlement.owner === playerID
                  ? { ...settlement, pops: { ...settlement.pops } }
                  : settlement,
              ),
            }
          : tile,
      ),
    },
    players: {
      ...G.players,
      [playerID]: {
        ...originalPlayer,
        resources: { ...originalPlayer.resources },
        timedHappinessModifiers: originalPlayer.timedHappinessModifiers.map((modifier) => ({
          ...modifier,
        })),
      },
    },
  };
}

/**
 * Mean-state counterpart to the engine's uniform random pop bag. Scaling each
 * holding/type by its survival probability avoids peeking at future RNG while
 * letting canonical income recalculate after every projected starvation event.
 */
function removeExpectedStarvationPops(G: HegemonyState, playerID: PlayerId, count: number): number {
  const settlements = G.players[playerID].settlements
    .map((tileId) =>
      getTile(G, tileId)?.settlements.find((settlement) => settlement.owner === playerID),
    )
    .filter((settlement) => settlement !== undefined);
  const total = settlements.reduce(
    (sum, settlement) =>
      sum + settlement.pops.citizens + settlement.pops.freemen + settlement.pops.slaves,
    0,
  );

  if (total <= 0 || count <= 0) return 0;

  const removed = Math.min(count, total);
  const survivalRate = (total - removed) / total;
  for (const settlement of settlements) {
    for (const pop of ["citizens", "freemen", "slaves"] as const) {
      settlement.pops[pop] *= survivalRate;
    }
  }

  return removed;
}

/**
 * Named strategic weights for unrest exposure. These are deliberately heuristic:
 * exact riot outcomes depend on resources, buildings, insurance, and a future die
 * roll. The policy instead prices the known act of entering each tier without
 * pretending to know which conditional table effects will fire.
 */
export const POLICY_UNREST_WEIGHTS = {
  /** Maximum per-upkeep caution cost immediately above the mild threshold. */
  bufferMaxPenalty: 10,
  /** Historical evaluator charged about 50 score at the default mild threshold. */
  mildRiotPenalty: 50,
  /** A revolt always retains at least one mild-riot unit of strategic danger. */
  severeMultiplierFloor: 1,
  /** How strongly the public severe roll shift scales the revolt penalty. */
  severeRollShiftWeight: 1,
} as const;

export type PolicyUnrestRisk = {
  tier: "safe" | "buffer" | "unrest" | "revolt";
  scorePenalty: number;
};

/**
 * Classify one projected upkeep using live ruleset thresholds and severe-tier
 * consequences. This is a deterministic strategic ramp, not an expected riot-table
 * payout: conditional resources, buildings, insurance, and future RNG stay unknown.
 */
export function evaluatePolicyUnrestRisk(
  ruleset: Ruleset,
  happiness: number,
  content: GameContent = getAuthoredGameContent(),
): PolicyUnrestRisk {
  const unrest = ruleset.economy.unrest;
  const bufferWidth = Math.max(1, unrest.popLossThreshold - unrest.severeThreshold);

  if (happiness > unrest.popLossThreshold) {
    const proximity = Math.max(0, 1 - (happiness - unrest.popLossThreshold) / bufferWidth);
    return {
      tier: proximity > 0 ? "buffer" : "safe",
      scorePenalty: POLICY_UNREST_WEIGHTS.bufferMaxPenalty * proximity,
    };
  }

  if (happiness > unrest.severeThreshold) {
    return {
      tier: "unrest",
      scorePenalty: POLICY_UNREST_WEIGHTS.mildRiotPenalty,
    };
  }

  const die = getRiotTable(content).die ?? 6;
  const popLossSeverity = Math.max(
    POLICY_UNREST_WEIGHTS.severeMultiplierFloor,
    unrest.severePopLossMultiplier,
  );
  const rollShiftSeverity = Math.max(
    0.5,
    1 - (POLICY_UNREST_WEIGHTS.severeRollShiftWeight * unrest.severeRollModifier) / die,
  );

  return {
    tier: "revolt",
    scorePenalty: POLICY_UNREST_WEIGHTS.mildRiotPenalty * popLossSeverity * rollShiftSeverity,
  };
}

/**
 * Positional score for the greedy bot, evaluated on resources projected
 * INCOME_HORIZON turns ahead.
 *
 * The old provisional-VP formula lives on here as the bot's private heuristic —
 * a smooth gradient (cities, colonies, pops, banked material) the one-ply search
 * can climb — now topped with a large victory-card term so the bot actually
 * chases the race (game/victory.ts), and the shared ruleset-aware unrest risk
 * term prices the nonlinear riot and revolt thresholds.
 *
 * The projection runs through calculateIncome — the engine's own formula — so
 * the score sees food-shortage pressure, the stockpile happiness bonus,
 * building income, and seasonal modifiers without duplicating any of them.
 */
function evaluate(G: HegemonyState, playerID: PlayerId): number {
  const player = G.players[playerID];
  const projection = projectPolicyHorizon(G, playerID);
  const projected = projection.resources;

  const standings = playerStandings(G, playerID);
  const material = projected.wood + projected.stone + projected.gold + projected.food;
  const materialDivisor = policyEconomyThresholds(G.ruleset).materialScoreDivisor;
  const heuristic =
    5 * standings.cities +
    3 * standings.colonies +
    standings.pops +
    Math.floor(material / materialDivisor) -
    2 * projection.expectedStarvationPopLoss;
  // Cap the happiness reward: below the cap it prices riot avoidance and the
  // Beloved card (min +10); past it, more calm is wasted coin — an uncapped term
  // had greedy bots pumping civic calm to +95 happiness.
  const projectedHappiness = Math.min(projected.happiness, 15);

  return (
    100 * victoryCardsHeld(G, playerID) +
    10 * heuristic +
    2 * projectedHappiness +
    player.resources.influence -
    projection.unrest.riskPenalty
  );
}

// The smart bot values what greedy flattens away. Pops are weighted BY TIER (a
// citizen is worth far more than a slave — income + the Civic Elite card), so a
// promotion is score-positive and the one-ply search will climb the ladder. Materials
// are weighted by role (gold liquid, stone the scarce civic currency, food the
// consumed one) instead of greedy's flat material/10, so wood/stone boosters (the
// Villa) and stone civics register. And it prices building room + the Gymnasion's
// promotion synergy, so slot-rich cities and the ladder building get built.
const SMART_POP_WEIGHT = { citizens: 3, freemen: 2, slaves: 1.2 };
const SMART_MATERIAL_WEIGHT = { food: 0.4, wood: 0.6, stone: 0.85, gold: 1 };
const SMART_VICTORY_CARD_VALUE = 120;

function evaluateSmart(G: HegemonyState, playerID: PlayerId): number {
  const player = G.players[playerID];
  const projection = projectPolicyHorizon(G, playerID);
  const projected = projection.resources;

  let cities = 0;
  let colonies = 0;
  let weightedPops = 0;
  let citySlots = 0;
  let gymSynergy = 0;

  for (const tileId of player.settlements) {
    const tile = getTile(G, tileId);
    const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);
    if (!tile || !settlement) {
      continue;
    }

    weightedPops +=
      SMART_POP_WEIGHT.citizens * settlement.pops.citizens +
      SMART_POP_WEIGHT.freemen * settlement.pops.freemen +
      SMART_POP_WEIGHT.slaves * settlement.pops.slaves;

    if (settlement.kind === "colony") {
      colonies += 1;
    } else {
      cities += 1;
      // Latent build capacity — rewards upgrading colonies onto slot-rich tiles.
      citySlots += settlementBuildingSlots(tile, settlement, G.ruleset);
      // The Gymnasion only pays off if there are pops to promote; rewarding the
      // pairing is what makes one-ply build it (its discount is otherwise invisible).
      if (
        settlement.buildings.includes("gymnasion") &&
        settlement.pops.slaves + settlement.pops.freemen > 0
      ) {
        gymSynergy += 1;
      }
    }
  }

  const material =
    SMART_MATERIAL_WEIGHT.food * projected.food +
    SMART_MATERIAL_WEIGHT.wood * projected.wood +
    SMART_MATERIAL_WEIGHT.stone * projected.stone +
    SMART_MATERIAL_WEIGHT.gold * projected.gold;

  const heuristic =
    6 * cities +
    3 * colonies +
    weightedPops +
    material / 8 +
    0.4 * citySlots +
    3 * gymSynergy -
    2 * projection.expectedStarvationPopLoss;

  const projectedHappiness = Math.min(projected.happiness, 15);

  return (
    SMART_VICTORY_CARD_VALUE * victoryCardsHeld(G, playerID) +
    10 * heuristic +
    2 * projectedHappiness +
    2 * player.resources.influence -
    projection.unrest.riskPenalty
  );
}

/** Tunables for the within-turn beam search. Kept small so batch runtime stays sane; the
 *  top-W frontier + depth cap bound the transitions per decision. */
const BEAM_WIDTH = 3;
const BEAM_DEPTH = 4;

/**
 * Within-turn beam search over the current player's RNG-free action sequence. Expands each
 * frontier node by every branchable move, scores the resulting state with `score`, keeps the
 * best W nodes per depth, and tracks the highest-scoring state reachable within BEAM_DEPTH
 * actions. Commits the FIRST action of the best sequence (the bot re-plans next ply), or ends
 * the turn when nothing beats the current position. Deterministic: no game RNG is read — the
 * anti-peek invariant is asserted per branch — and ties break on enumeration order via a
 * stable score sort.
 */
function beamPlan(
  G: HegemonyState,
  moves: GameCommand[],
  score: (g: HegemonyState, p: PlayerId) => number,
): GameCommand {
  const playerID = G.currentPlayer;

  // Stochastic families are played by rule (shared with one-ply), never searched.
  const byRule = resolveStochasticByRule(G, moves);
  if (byRule) {
    return byRule;
  }

  const endTurn = moves.find((move) => move.type === "endTurn");

  // A forced position (a pending event: no endTurn) is a single required choice — fall back
  // to one-ply rather than beam-plan past a resolution whose effects may be stochastic.
  if (!endTurn) {
    return onePlyLookahead(G, moves, score);
  }

  const branchable = (list: GameCommand[]) =>
    list.filter((move) => !RULE_DRIVEN_MOVE_TYPES.has(move.type) && move.type !== "endTurn");

  const rootMoves = branchable(moves);
  if (rootMoves.length === 0) {
    return endTurn;
  }

  const rootScore = score(G, playerID);
  const rngBefore = G.rng;

  type Node = { state: HegemonyState; firstMove: GameCommand | null; score: number };
  let frontier: Node[] = [{ state: G, firstMove: null, score: rootScore }];
  // The best terminal reachable so far; the baseline is "end the turn now" (do nothing).
  let best: { firstMove: GameCommand | null; score: number } = {
    firstMove: null,
    score: rootScore,
  };

  for (let depth = 0; depth < BEAM_DEPTH; depth += 1) {
    const children: Node[] = [];

    for (const node of frontier) {
      const candidateMoves =
        depth === 0 ? rootMoves : branchable(enumerateLegalCommands(node.state, playerID));

      for (const move of candidateMoves) {
        const result = transition(node.state.definition, node.state, playerID, move);
        if (!result.ok) {
          continue;
        }
        const nextState = result.state;
        // Anti-peek invariant: an RNG-free branch must never advance the seeded stream.
        if (nextState.rng !== rngBefore) {
          throw new Error(
            `beam branched on an RNG-consuming move "${move.type}" — add it to RULE_DRIVEN_MOVE_TYPES`,
          );
        }

        const firstMove = node.firstMove ?? move;
        const nextScore = score(nextState, playerID);
        children.push({ state: nextState, firstMove, score: nextScore });
        if (nextScore > best.score) {
          best = { firstMove, score: nextScore };
        }
      }
    }

    if (children.length === 0) {
      break;
    }

    // Stable sort by score desc keeps enumeration order on ties → deterministic plans.
    children.sort((a, b) => b.score - a.score);
    frontier = children.slice(0, BEAM_WIDTH);
  }

  return best.firstMove && best.score > rootScore ? best.firstMove : endTurn;
}

/**
 * The turn-planning bot: a within-turn beam search over {@link evaluateSmart}, so it values
 * the within-turn sequences one-ply misses (build-then-promote and bank chains).
 * It cannot intentionally save across turns because endTurn is not a search branch.
 * Same scoring as `smart`, deeper search — so a smart-vs-beam A/B isolates search depth.
 */
export const beamPolicy: Policy = {
  name: "beam",
  choose(view, moves) {
    return beamPlan(view.state, moves, evaluateSmart);
  },
};

// ── Phase 3-C: the influence-aware "political" bot ────────────────────────────────────
//
// Every other bot reaches the Assembly and passes: its scorer values influence only as a
// small hoard weight, and a Law's payoff sits beyond any affordable search (draw now →
// propose → rivals vote across the round → reap it over many turns). `political` closes
// that with two explicit ideas — a DIFFERENTIAL lens (my gain minus the STRONGEST rival's,
// so "does this hurt me, help me, or help a rival more?") and a political-position term —
// and plays the agora by heuristic rather than blind search. Same `evaluateSmart` spine,
// so a political-vs-smart A/B isolates the political layer. See docs/archive/plans/influence-aware-ai.md.

/** How heavily the agora weighs against the ordinary economy — modest, the economy is the
 *  spine. Only shapes the bot's NON-assembly turns (valuing passed resolutions toward Voice); the
 *  Assembly decisions themselves are made by the heuristics below. Sim-tuned. */
const POLITICS_WEIGHT = 8;

function playerIds(G: HegemonyState): PlayerId[] {
  return Object.keys(G.players) as PlayerId[];
}

/**
 * A seat's permanent authored-and-passed progress toward Voice, on the smart-score scale.
 * The actual held victory card is already priced by evaluateSmart; this values the path.
 */
function politicalStanding(G: HegemonyState, me: PlayerId): number {
  const mine = G.assemblyPassedByPlayer[me];
  // Progress matters, but it is not itself a victory card. The actual threshold
  // crossing is already worth a full card in `evaluateSmart`; overpricing every
  // preliminary pass made political seats reject virtually every rival-authored
  // public good and left Voice mechanically present but strategically unreachable.
  return mine;
}

/** The political bot's positional score: the smart economy plus its agora standing. */
function scorePolitical(G: HegemonyState, playerID: PlayerId): number {
  return evaluateSmart(G, playerID) + POLITICS_WEIGHT * politicalStanding(G, playerID);
}

type Scores = Record<PlayerId, number>;

function scoreEveryone(G: HegemonyState): Scores {
  const scores = {} as Scores;
  for (const playerID of playerIds(G)) {
    scores[playerID] = scorePolitical(G, playerID);
  }
  return scores;
}

/**
 * The differential lens: my gain over a hypothetical change minus the STRONGEST rival's
 * (guard the front-runner, not the field). > 0 wants it, < 0 opposes it, ≈ 0 neutral.
 */
function competitiveDelta(before: Scores, after: HegemonyState, me: PlayerId): number {
  const rivals = playerIds(after).filter((player) => player !== me);
  const myGain = scorePolitical(after, me) - before[me];
  const bestRivalGain = Math.max(
    ...rivals.map((rival) => scorePolitical(after, rival) - before[rival]),
  );
  return myGain - bestRivalGain;
}

/** Score "what if this ballot item carried" as a competitive delta, on a full clone —
 *  reusing the engine's own enactment so the prediction can never drift from the rules. */
function deltaIfEnacted(G: HegemonyState, before: Scores, item: BallotItem, me: PlayerId): number {
  const clone = structuredClone(G);
  enactForEval(clone, item);
  return competitiveDelta(before, clone, me);
}

// Assembly heuristic tunables — sim-tuned to the smart-score scale, where a single
// income Law shifts a beneficiary's score by ~tens (10 × the projected income delta / 8).
// Bribes (10 inf) and vetoes (5 inf) are the real influence drains, so their bars sit high:
// the bot spends only when a resolution genuinely swings the race, not on every signal.
const PROPOSE_THRESHOLD = 6; // propose iff the private prize/progress covers a merely neutral Law
const REPEAL_THRESHOLD = 25; // repeal (6 inf) only a standing Law that is clearly hostile
const BRIBE_MAGNITUDE = 45; // buy votes only when the outcome genuinely swings the race
const VETO_MAGNITUDE = 180; // reserve the once-yearly veto for a collapse-scale swing
// A repeated legislature needs room for coalitions: support a measure that is only
// modestly better for its author, while still blocking material harm and Voice-clinching
// swings. This roughly covers one preliminary Voice tick plus a normal author prize.
const VOTE_COALITION_TOLERANCE = 12;
const DRAW_THRESHOLD = 2;
const MAX_DRAWS = 1; // draw once and commit — fishing (redraw-after-discard) just burns influence

/** Best legal target/replacement value for one known card. This is used only while
 * evaluating a deck's unordered public composition; it never reads the top card. */
function bestProposalDelta(
  G: HegemonyState,
  before: Scores,
  card: ResolutionCard,
  me: PlayerId,
): number {
  const items: BallotItem[] = [];

  if (card.kind === "directive") {
    for (const target of playerIds(G)) {
      if (target !== me) items.push({ kind: "enact", card, proposer: me, target });
    }
  } else if (lawNeedsReplacement(G)) {
    for (const cardId of availableLawReplacementIds(G)) {
      items.push({ kind: "enact", card, proposer: me, replaces: cardId });
    }
  } else {
    items.push({ kind: "enact", card, proposer: me });
  }

  return Math.max(...items.map((item) => deltaIfEnacted(G, before, item, me)));
}

/** Expected value of drawing from a politician without peeking at hidden deck or hand
 * identities. The pool contains every card not known to be in a public zone or this
 * player's own private zone, so a rival's held card remains uncertainty, not knowledge. */
function expectedDeckDelta(
  G: HegemonyState,
  before: Scores,
  politician: ResolutionCard["politician"],
  me: PlayerId,
): number {
  const cards = observablePoliticianPool(G, politician, me);

  if (cards.length === 0) return -Infinity;
  return (
    cards.reduce((sum, card) => sum + bestProposalDelta(G, before, card, me), 0) / cards.length
  );
}

function observablePoliticianPool(
  G: HegemonyState,
  politician: ResolutionCard["politician"],
  me: PlayerId,
): ResolutionCard[] {
  if (G.politicianDecks[politician].length === 0) {
    return G.politicianDiscards[politician]
      .map((cardId) => getResolutionCard(G.definition.content, cardId))
      .filter((card): card is ResolutionCard => card !== null);
  }

  const knownOutsideDeck = new Set<string>([
    ...G.politicianDiscards[politician],
    ...G.activeLaws.map((law) => law.cardId),
    ...G.tallyMonuments.map((monument) => monument.cardId),
  ]);
  const session = G.assembly;
  if (session?.houseItem?.kind === "enact") knownOutsideDeck.add(session.houseItem.card.id);
  for (const item of session?.ballot ?? []) {
    if (item.kind === "enact") knownOutsideDeck.add(item.card.id);
  }
  const held = session?.held[me];
  if (held) knownOutsideDeck.add(held.card.id);
  const proposal = session?.proposals[me];
  if (proposal?.kind === "enact") knownOutsideDeck.add(proposal.card.id);

  return getResolutionCards(G.definition.content).filter(
    (card) => card.politician === politician && !knownOutsideDeck.has(card.id),
  );
}

/** Play the agora by heuristic instead of blind search. `moves` is always the current
 *  seat's ({@link G.currentPlayer}) options for the live phase. */
function resolveAssemblyByHeuristic(
  G: HegemonyState,
  session: AssemblySession,
  moves: GameCommand[],
): GameCommand {
  const me = G.currentPlayer;

  if (session.phase === "closing") {
    return moves.find((move) => move.type === "assemblyClose") ?? moves[0];
  }

  if (session.phase === "voting") {
    return chooseVote(G, session, moves, me);
  }

  // Proposal (async): fish/repeal/pass while empty-handed, then propose or discard.
  const held = session.held[me];
  if (held) {
    return chooseProposeOrDiscard(G, held.card, moves, me);
  }
  return chooseDrawRepealOrPass(G, session, moves, me);
}

function chooseVote(
  G: HegemonyState,
  session: AssemblySession,
  moves: GameCommand[],
  me: PlayerId,
): GameCommand {
  const item = session.ballot[session.ballotIndex];
  const before = scoreEveryone(G);
  const assessment = assessVote(G, before, item, me);

  // A resolution that wins the race for a rival, transfers Voice away from me, or is
  // otherwise catastrophic is worth the once-yearly walkout. Merely granting a rival
  // their first Voice card is contested with votes/bribes, not veto-locked forever.
  const veto = moves.find((move) => move.type === "assemblyVeto");
  if (veto && (assessment.rivalCompletesRace || assessment.delta <= -VETO_MAGNITUDE)) {
    return veto;
  }

  // Buy only a pivotal vote. The old magnitude-only rule spent two bribes even when
  // the projected coalition already carried—or could not be rescued—which made
  // political participation lose on avoidable private cost.
  const bribe = moves.find((move) => move.type === "assemblyBribe");
  if (bribe && Math.abs(assessment.voteDelta) >= BRIBE_MAGNITUDE) {
    const tally = projectedPlainVote(G, session, item, before);
    const needed = assessment.yea
      ? Math.max(0, tally.nay - tally.yea + 1)
      : Math.max(0, tally.yea - tally.nay);
    const available = G.ruleset.assembly.briberyCap - session.bribesUsed[me];
    if (needed > 0 && needed <= available) {
      return bribe;
    }
  }

  return (
    moves.find((move) => move.type === "assemblyVote" && move.yea === assessment.yea) ??
    moves.find((move) => move.type === "assemblyVote") ??
    moves[0]
  );
}

function assessVote(
  G: HegemonyState,
  before: Scores,
  item: BallotItem,
  me: PlayerId,
): { delta: number; voteDelta: number; rivalCompletesRace: boolean; yea: boolean } {
  const delta = deltaIfEnacted(G, before, item, me);
  const clone = structuredClone(G);
  enactForEval(clone, item);
  const rivalCompletesRace = playerIds(G).some(
    (player) =>
      player !== me &&
      victoryCardsHeld(G, player) < G.ruleset.victory.cardsToWin &&
      victoryCardsHeld(clone, player) >= G.ruleset.victory.cardsToWin,
  );
  // An open Voice claim is a coalition milestone, not an automatic catastrophe. If it
  // does not complete the rival's race, remove the generic card jump from the voting
  // comparison; the proposal's Law/Directive, prize, and permanent lead still count.
  const rivalClaimsOpenVoice =
    G.voiceHolder === null && clone.voiceHolder !== null && clone.voiceHolder !== me;
  const voteDelta = delta + (rivalClaimsOpenVoice ? SMART_VICTORY_CARD_VALUE : 0);
  return {
    delta,
    voteDelta,
    rivalCompletesRace,
    yea: !rivalCompletesRace && voteDelta >= -VOTE_COALITION_TOLERANCE,
  };
}

/** Current votes plus every uncast seat's plain-vote preference and effective weight.
 * This predicts no hidden information and assumes rivals use the same public Assembly
 * logic; it exists only to distinguish pivotal bribes from wasted ones. */
function projectedPlainVote(
  G: HegemonyState,
  session: AssemblySession,
  item: BallotItem,
  before: Scores,
): { yea: number; nay: number } {
  let yea = session.votes.filter((vote) => vote.yea).reduce((sum, vote) => sum + vote.weight, 0);
  let nay = session.votes.filter((vote) => !vote.yea).reduce((sum, vote) => sum + vote.weight, 0);

  for (const player of session.voteOrder.slice(session.voteIndex)) {
    const weight = currentVoteWeight(G, player);
    if (assessVote(G, before, item, player).yea) yea += weight;
    else nay += weight;
  }

  return { yea, nay };
}

function chooseProposeOrDiscard(
  G: HegemonyState,
  card: ResolutionCard,
  moves: GameCommand[],
  me: PlayerId,
): GameCommand {
  const before = scoreEveryone(G);

  let best: GameCommand | null = null;
  let bestDelta = -Infinity;
  for (const move of moves) {
    if (move.type !== "assemblyPropose") {
      continue;
    }
    const item: BallotItem = {
      kind: "enact",
      card,
      proposer: me,
      replaces: move.replaces,
      target: move.target,
    };
    const delta = deltaIfEnacted(G, before, item, me);
    if (delta > bestDelta) {
      bestDelta = delta;
      best = move;
    }
  }

  if (best && bestDelta > PROPOSE_THRESHOLD) {
    return best;
  }
  // Not worth it (would help a rival more, or nothing to gain) — never gift the agora.
  return (
    moves.find((move) => move.type === "assemblyDiscardHeld") ??
    moves.find((move) => move.type === "assemblyPass") ??
    moves[0]
  );
}

function chooseDrawRepealOrPass(
  G: HegemonyState,
  session: AssemblySession,
  moves: GameCommand[],
  me: PlayerId,
): GameCommand {
  const before = scoreEveryone(G);
  const influence = G.players[me].resources.influence;

  // The most valuable hostile-Law repeal on offer.
  let bestRepeal: GameCommand | null = null;
  let bestRepealDelta = -Infinity;
  for (const move of moves) {
    if (move.type !== "assemblyProposeRepeal") {
      continue;
    }
    const delta = deltaIfEnacted(
      G,
      before,
      { kind: "repeal", cardId: move.cardId, proposer: me },
      me,
    );
    if (delta > bestRepealDelta) {
      bestRepealDelta = delta;
      bestRepeal = move;
    }
  }

  // Every authored pass advances the same Voice ledger. Compare each deck's full
  // unordered composition, including its prize and the best rival target/replacement,
  // so Stratokles is a real comeback line without peeking at the shuffled top card.
  let bestDraw: GameCommand | null = null;
  let bestDrawValue = -Infinity;
  let drawCost = Infinity;
  for (const move of moves) {
    if (move.type !== "assemblyDraw") {
      continue;
    }
    const cost = nextDrawCost(G, me);
    const value = expectedDeckDelta(G, before, move.politician, me) - 2 * cost;
    if (value > bestDrawValue) {
      bestDrawValue = value;
      bestDraw = move;
      drawCost = cost;
    }
  }

  const drawBuffer = G.ruleset.assembly.drawCost * 2;
  const canDraw =
    bestDraw !== null &&
    bestDrawValue > DRAW_THRESHOLD &&
    (session.draws[me] ?? 0) < MAX_DRAWS &&
    influence >= drawCost + drawBuffer;

  // A strong repeal is a concrete gain and beats a gamble; else fish if it's worth it; else pass.
  if (bestRepeal && bestRepealDelta > REPEAL_THRESHOLD) {
    return bestRepeal;
  }
  if (canDraw && bestDraw) {
    return bestDraw;
  }
  return moves.find((move) => move.type === "assemblyPass") ?? moves[0];
}

export const politicalPolicy: Policy = {
  name: "political",
  choose(view, moves) {
    const G = view.state;
    if (G.assembly) {
      return resolveAssemblyByHeuristic(G, G.assembly, moves);
    }
    return onePlyLookahead(G, moves, scorePolitical);
  },
};

// ── Map / expansion foresight — the "settler" bot ─────────────────────────────────────
//
// Every other bot is board-STATIC: it values a colony for its own count + tile yield, but
// not for the EXPANSION it unlocks ("found HERE and I can chain to that rich cluster two
// turns on"). Expansion is the heart of the game, so `settler` prices it: a term for the
// reachable, unclaimed, yielding frontier, so the one-ply search prefers placements that
// OPEN expansion, not just the fattest single tile. Same smart spine, so a settler-vs-smart
// A/B isolates map foresight from everything else. See docs/reports/simulation/2026-07-21-map-foresight.md.

/** Total yield on the player's next legally reachable settlement frontier. This is the
 * measured-low-weight signal from `settler`: it nudges WHICH direction to expand without
 * overpowering the income model into founding unsustainable extra colonies. */
function frontierValue(G: HegemonyState, playerID: PlayerId): number {
  let value = 0;

  for (const tile of G.board.tiles) {
    if (canPlaceColonyOnTile(G, playerID, tile).can) {
      value += tile.resource?.amount ?? 0;
    }
  }

  return value;
}

/** Measured-neutral setting. Larger values made the prototype over-expand. */
const FRONTIER_WEIGHT = 2;

function evaluateSettler(G: HegemonyState, playerID: PlayerId): number {
  return evaluateSmart(G, playerID) + FRONTIER_WEIGHT * frontierValue(G, playerID);
}

/**
 * The expansion-frontier bot: `smart`'s economic / population / building evaluation PLUS a
 * one-step frontier term, over the same one-ply search `smart` uses. It scores the same as
 * `smart` but adds `FRONTIER_WEIGHT × frontierValue`, so a `smart`-vs-`settler` A/B isolates
 * map foresight from everything else. See docs/reports/simulation/2026-07-21-map-foresight.md.
 */
export const settlerPolicy: Policy = {
  name: "settler",
  choose(view, moves) {
    return onePlyLookahead(view.state, moves, evaluateSettler);
  },
};

// ── The cumulative policy — every shipped specialist in one bot ──────────────────────
//
// The earlier policies are controlled experiments: `beam` isolates search depth,
// `political` isolates Assembly judgment, and `settler` isolates a one-step map signal.
// `master` is the play-strength composition rather than another isolated arm: smart
// economy + political standing + frontier value, searched with the beam during normal
// play, while the dedicated political heuristic runs the Assembly.

function scoreMaster(G: HegemonyState, playerID: PlayerId): number {
  return scorePolitical(G, playerID) + FRONTIER_WEIGHT * frontierValue(G, playerID);
}

/**
 * The strongest cumulative sim policy currently available:
 *
 * - `smart` economic / population / building evaluation;
 * - `beam` within-turn sequencing (W=3, D=4);
 * - `political` Assembly decisions and political standing;
 * - `settler` one-step expansion-frontier signal.
 *
 * This deliberately does NOT claim capabilities that no specialist has built yet:
 * cross-turn saving, general opponent replies, multi-hop route search, or chance EV.
 */
export const masterPolicy: Policy = {
  name: "master",
  choose(view, moves) {
    const G = view.state;
    if (G.assembly) {
      return resolveAssemblyByHeuristic(G, G.assembly, moves);
    }

    return beamPlan(G, moves, scoreMaster);
  },
};

export const POLICIES: Record<PolicyId, Policy> = {
  random: randomPolicy,
  greedy: greedyPolicy,
  smart: smartPolicy,
  beam: beamPolicy,
  political: politicalPolicy,
  settler: settlerPolicy,
  master: masterPolicy,
};

export function resolvePolicy(id: string): Policy {
  const policy = POLICIES[id as PolicyId];

  if (!policy) {
    throw new Error(
      `unknown policy "${id}" — expected one of: ${Object.keys(POLICIES).join(", ")}`,
    );
  }

  return policy;
}
