import { ideaForEval, ideaRoom, playerNationalIdeas } from "../game/ideas";
import { playerDole, votePurchaseLimit } from "../game/ideaRules";
import { playerPieces } from "../game/settlement";
import { calculateIncome, calculateIncomeBreakdown, getHungerStatus } from "../game/economy/income";
import { applyHunger } from "../game/hunger";
import { happinessLevel, slaveUnhappiness, standingHappiness } from "../game/happiness";
import { removePops } from "../game/tables";
import { ventureOutcomes } from "./chance";
import { getActiveEffects } from "../game/activeEffects";
import { applyResourceDeltaWithFloors } from "../game/core/resources";
import { getResolutionCard, getResolutionCards } from "../game/content";
import { getTile } from "../game/core/query";
import {
  canPlaceColonyOnTile,
  countPlayerPopType,
  settlementOpenSlots,
  settlementWorkingSlaves,
  settlementSlaveResource,
} from "../game/settlement";
import { currentVoteWeight, enactForEval, lawProposalReason, nextDrawCost } from "../game/assembly";
import type { AssemblySession, BallotItem, ResolutionCard } from "../game/assembly";
import type { GameCommand } from "../game/legalMoves";
import { enumerateLegalCommands, transition } from "../game/legalMoves";
import { activeClaims, claimableLuxuriesAt, ownedClaims } from "../game/luxury";
import { playerStandings } from "../game/score";
import { victoryCardsHeld, victoryMetricValue, voiceHolder } from "../game/victory";
import type { HegemonyState, PlayerId, Pops } from "../game/types";
import type { PlayerView } from "../game/projection";
import type { Ruleset } from "../game/ruleset";
import type { SimRng } from "./rng";

export type PersonalityId = "slaver" | "civic" | "trader";
export type PolicyId =
  "random" | "greedy" | "smart" | "beam" | "political" | "settler" | "master" | PersonalityId;
type Scorer = (g: HegemonyState, p: PlayerId) => number;

/** One shared scorer; these are initial build preferences, not balance claims. */
export type ScoreWeights = {
  pops: Pops;
  materials: { food: number; wood: number; stone: number; gold: number };
  cities: number;
  colonies: number;
  level: number;
  influence: number;
  luxury: number;
  politics: number;
  frontier: number;
};
const DEFAULT_WEIGHTS: ScoreWeights = {
  pops: { citizens: 3, freemen: 2, slaves: 1.2 },
  materials: { food: 0.4, wood: 0.6, stone: 0.85, gold: 1 },
  cities: 6,
  colonies: 3,
  level: 6,
  influence: 2,
  luxury: 36,
  politics: 8,
  frontier: 2,
};
export const PERSONALITY_WEIGHTS: Record<PersonalityId, ScoreWeights> = {
  slaver: {
    ...DEFAULT_WEIGHTS,
    pops: { citizens: 1.5, freemen: 1.5, slaves: 4.5 },
    materials: { food: 0.4, wood: 1, stone: 1, gold: 0.8 },
    cities: 8,
    colonies: 4,
    level: 4,
    politics: 4,
  },
  civic: {
    ...DEFAULT_WEIGHTS,
    pops: { citizens: 4.5, freemen: 2, slaves: 1.2 },
    materials: { food: 0.4, wood: 0.5, stone: 1.2, gold: 1 },
    level: 8,
    influence: 3,
    politics: 16,
  },
  trader: {
    ...DEFAULT_WEIGHTS,
    pops: { citizens: 1.5, freemen: 4, slaves: 1.2 },
    materials: { food: 0.4, wood: 0.5, stone: 0.7, gold: 1.8 },
    level: 6,
    influence: 1.5,
    luxury: 54,
    politics: 4,
  },
};

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

/** Forced riots remain rule-driven. Every optional economic action enters search. */
const RIOT_MOVE_TYPES: ReadonlySet<GameCommand["type"]> = new Set([
  "resolveRiot",
  "buyRiotInsurance",
]);

export function policyEconomyThresholds(ruleset: Ruleset) {
  return { materialScoreDivisor: Math.max(1, ruleset.victory.minimums.gold / 3) };
}

function resolveRiotByRule(moves: GameCommand[]): GameCommand | null {
  const riot = moves.find((move) => move.type === "resolveRiot");
  return riot
    ? (moves.find((move) => move.type === "buyRiotInsurance" && move.optionId !== "concession") ??
        riot)
    : null;
}

type SearchOutcome = { state: HegemonyState; probability: number };
function searchOutcomes(G: HegemonyState, move: GameCommand): SearchOutcome[] {
  if (move.type === "fundExpedition") return ventureOutcomes(G, G.currentPlayer, move);
  const result = transition(G.definition, G, G.currentPlayer, move);
  if (!result.ok) return [];
  if (result.state.rng !== G.rng) {
    throw new Error(`search branched on unmodelled chance move "${move.type}"`);
  }
  return [{ state: result.state, probability: 1 }];
}
/** Within one gameplay search, terrain, decks, year, Laws and definition are
 * constant. Only these fields change under the optional economic commands.
 * Keep real entity IDs and action flags; omit logs and the last die display. */
function searchPositionKey(state: HegemonyState) {
  return JSON.stringify([
    state.nextEntityId,
    state.board.tiles.flatMap((tile) => tile.settlements),
    state.board.luxuries.map((good) => [
      good.owner,
      good.suppressedTurns,
      good.claimedAtSettlementId,
    ]),
    state.players,
    state.transfers,
  ]);
}

/** Local to a decision: repeated bank paths and equivalent venture outcomes
 * share a value across depths without pruning any continuation. */
function searchEvaluation(score: Scorer, player: PlayerId) {
  const keys = new WeakMap<HegemonyState, string>();
  const values = new Map<string, number>();
  const keyOf = (state: HegemonyState) => {
    let key = keys.get(state);
    if (key === undefined) keys.set(state, (key = searchPositionKey(state)));
    return key;
  };
  const valueOf = (state: HegemonyState) => {
    const key = keyOf(state);
    let value = values.get(key);
    if (value === undefined) {
      value = score(state, player);
      values.set(key, value);
    }
    return value;
  };
  return { keyOf, valueOf };
}
function expectedScore(outcomes: SearchOutcome[], valueOf: (state: HegemonyState) => number) {
  if (outcomes.length === 1) return valueOf(outcomes[0].state);
  return outcomes.reduce((sum, outcome) => sum + outcome.probability * valueOf(outcome.state), 0);
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

  const byRule = resolveRiotByRule(moves);
  if (byRule) {
    return byRule;
  }

  const endTurn = moves.find((move) => move.type === "endTurn");
  const candidates = moves.filter(
    (move) => !RIOT_MOVE_TYPES.has(move.type) && move.type !== "endTurn",
  );

  if (candidates.length === 0 && endTurn) {
    return endTurn;
  }

  const evaluation = searchEvaluation(score, playerID);
  const before = evaluation.valueOf(G);
  let best: GameCommand | null = null;
  let bestDelta = -Infinity;

  for (const move of candidates) {
    const outcomes = searchOutcomes(G, move);
    if (!outcomes.length) continue;
    const delta = expectedScore(outcomes, evaluation.valueOf) - before;

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

  return best && bestDelta > 1e-8 ? best : endTurn;
}

export const greedyPolicy: Policy = {
  name: "greedy",
  choose(view, moves, rng) {
    if (view.state.assembly)
      return resolveAssemblyByHeuristic(view.state, view.state.assembly, moves);
    if (isSetupPhase(view.state)) {
      return choosePlacement(view.state, moves, rng);
    }
    return onePlyLookahead(view.state, moves, evaluate);
  },
};

/**
 * The slot- and promotion-aware bot (2026-07-18). Same search as greedy, but its
 * evaluation actually values Phase 2's strategic layer — so sims exercise the
 * mechanics greedy is blind to: it climbs the social ladder, builds the class
 * buildings, and keeps plains slots for the slaves that feed it. See {@link evaluateSmart}.
 */
export const smartPolicy: Policy = {
  name: "smart",
  choose(view, moves, rng) {
    if (view.state.assembly)
      return resolveAssemblyByHeuristic(view.state, view.state.assembly, moves);
    if (isSetupPhase(view.state)) {
      return choosePlacement(view.state, moves, rng);
    }
    return onePlyLookahead(view.state, moves, evaluateSmart);
  },
};

/** How many turns of income the greedy score projects forward. The horizon is
 *  what lets one-ply search see delayed payoffs: a class building's raise is
 *  invisible at the moment of purchase and only becomes worth its cost when
 *  multiplied out. */
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
 * state that income alone cannot express: skipped collections
 * and accumulated starvation progress.
 */
function incomeYearsLeft(G: HegemonyState, playerID: PlayerId) {
  return Math.max(
    0,
    Math.min(INCOME_HORIZON, 14 - G.year + (G.players[playerID].collectedThisTurn ? 0 : 1)),
  );
}

export function projectPolicyHorizon(
  G: HegemonyState,
  playerID: PlayerId,
  horizon = incomeYearsLeft(G, playerID),
): PolicyProjection {
  const projectedState = createPolicyProjectionState(G, playerID);
  const player = projectedState.players[playerID];
  let expectedStarvationPopLoss = 0;
  const unrest: PolicyUnrestExposure = {
    minimumHappiness: happinessLevel(projectedState, playerID),
    mildRiotEvents: 0,
    severeRiotEvents: 0,
    riskPenalty: 0,
  };
  // A collected income does not end the current year: calm and Blockade still
  // count at this turn's check, even when no future incomes remain.
  const checkTurnEnd = (currentTurn = false) => {
    const level = happinessLevel(projectedState, playerID);
    unrest.minimumHappiness = Math.min(unrest.minimumHappiness, level);
    const risk = evaluatePolicyUnrestRisk(projectedState.ruleset, level);
    // No more income or draw precedes the current check. A safe level here has
    // no proximity penalty; later years still price their uncertain buffer.
    if (!currentTurn || risk.tier !== "buffer") unrest.riskPenalty += risk.scorePenalty;

    if (risk.tier === "revolt") {
      // A revolt draws no dice, so the projection runs it: half the slaves leave
      // and the tokens clear.
      unrest.severeRiotEvents += 1;
      removePops(
        projectedState,
        playerID,
        Math.floor(countPlayerPopType(projectedState, playerID, "slaves") / 2),
        ["slaves"],
      );
      player.unrestTokens = 0;
      return true;
    } else if (risk.tier === "unrest") {
      // A riot spends the tokens; what the table then takes is unknown.
      unrest.mildRiotEvents += 1;
      player.unrestTokens = 0;
    }
    return false;
  };

  const expireYear = () => {
    projectedState.activeYearCard = null;
    player.calmActive = false;
    player.collectedThisTurn = false;
  };

  if (player.collectedThisTurn) {
    if (G.phase === "gameplay" && G.currentPlayer === playerID && !G.assembly && !G.pendingRiot)
      checkTurnEnd(true);
    expireYear();
  }

  let income = calculateIncome(projectedState, playerID);
  const activeEffects = getActiveEffects(projectedState, playerID, { income });
  const mechanics = activeEffects.flatMap((descriptor) => descriptor.mechanics);
  let suppressedCollections = mechanics.reduce(
    (total, mechanic) => total + (mechanic.type === "suppressIncome" ? mechanic.turns : 0),
    0,
  );

  for (let step = 0; step < horizon; step += 1) {
    let popsChanged = false;

    if (suppressedCollections > 0) {
      suppressedCollections -= 1;
      player.incomeSuppressedTurns = Math.max(0, player.incomeSuppressedTurns - 1);
    } else {
      // Hunger is the engine's own rule and draws no dice, so the projection runs it
      // for real: unfed pops leave, and later incomes are recomputed without them.
      const unfed = getHungerStatus(projectedState, playerID, income.food).unfed;
      applyResourceDeltaWithFloors(
        player.resources,
        income,
        projectedState.ruleset.economy.stockpileFloors,
      );
      player.resources.food = Math.max(0, player.resources.food);

      if (unfed > 0) {
        expectedStarvationPopLoss += applyHunger(projectedState, playerID, unfed).total;
        popsChanged = true;
      }
    }

    // Income and hunger happen first; the resulting board is checked at turn end.
    popsChanged = checkTurnEnd() || popsChanged;
    // The next projected income is in another year. Its card is still hidden.
    const yearCardExpired = projectedState.activeYearCard !== null;
    expireYear();
    // Stocks and tokens do not affect printed income. Reuse the authoritative
    // result until hunger/revolt changes pops or this year's card expires.
    if (step + 1 < horizon && (popsChanged || yearCardExpired))
      income = calculateIncome(projectedState, playerID);
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
      },
    },
  };
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
  /** A revolt takes half the slaves outright, so it is charged as two riots. */
  revoltMultiplier: 2,
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
export function evaluatePolicyUnrestRisk(ruleset: Ruleset, happiness: number): PolicyUnrestRisk {
  const unrest = ruleset.economy.unrest;
  const bufferWidth = Math.max(1, unrest.riotThreshold - unrest.revoltThreshold);

  if (happiness > unrest.riotThreshold) {
    const proximity = Math.max(0, 1 - (happiness - unrest.riotThreshold) / bufferWidth);
    return {
      tier: proximity > 0 ? "buffer" : "safe",
      scorePenalty: POLICY_UNREST_WEIGHTS.bufferMaxPenalty * proximity,
    };
  }

  if (happiness > unrest.revoltThreshold) {
    return {
      tier: "unrest",
      scorePenalty: POLICY_UNREST_WEIGHTS.mildRiotPenalty,
    };
  }

  return {
    tier: "revolt",
    scorePenalty: POLICY_UNREST_WEIGHTS.mildRiotPenalty * POLICY_UNREST_WEIGHTS.revoltMultiplier,
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
 * the score sees food-shortage pressure, building income and standing Laws
 * without duplicating any of them.
 */
/** Score per point of the standing level. The level holds every turn, so a point is
 *  worth about what +1 happiness a turn was over half the horizon. */
const LEVEL_WEIGHT = INCOME_HORIZON;

/**
 * What the standing level is worth, calm left out as Beloved leaves it out. Capped a
 * little past Beloved's minimum: below the cap it prices the card and distance from
 * the riot line, and past it more happiness buys nothing. The unrest risk term prices
 * the lines themselves.
 */
function levelValue(G: HegemonyState, playerID: PlayerId, weight = LEVEL_WEIGHT): number {
  const cap = G.ruleset.victory.minimums.happiness + 2;

  return weight * Math.min(standingHappiness(G, playerID), cap);
}

function evaluate(G: HegemonyState, playerID: PlayerId): number {
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
  return (
    100 * victoryCardsHeld(G, playerID) +
    10 * heuristic +
    levelValue(G, playerID) +
    projected.influence +
    ideaOpportunityValue(G, playerID) -
    projection.unrest.riskPenalty
  );
}

// The smart bot values what greedy flattens away. Pops are weighted BY TIER (a
// citizen is worth far more than a slave — income + the Civic Elite card), so a
// promotion is score-positive and the one-ply search will climb the ladder. Materials
// are weighted by role (gold liquid, stone the scarce civic currency, food the
// consumed one) instead of greedy's flat material/10, so the Estate and the stone
// civics register. And it prices an open work slot as the slave who could work it,
// so a building on a plains slot costs the food that slave would have grown.
const SMART_VICTORY_CARD_VALUE = 120;
/** A pop the horizon sees starve costs more than any personality's pop weight. */
const STARVED_POP_WEIGHT = 6;
/** An open slot no slave works yet is priced as the slave who could work it: a
 *  building raised there costs one of the tile's resource a turn. */
const LATENT_SLOT_SHARE = 1;

/** A buffer for one printed-income shortfall plus the player deck's 2-food loss.
 * Every unit below it has value, even when the six-year projection loses the
 * same pops later. This lets unit bank/Dole commands build a useful reserve. */
function foodReserveValue(G: HegemonyState, playerID: PlayerId): number {
  const projected = createPolicyProjectionState(G, playerID);
  const mouths = calculateIncomeBreakdown(projected, playerID).some(
    (line) => line.resource === "food" && line.amount < 0,
  );
  if (!mouths || !incomeYearsLeft(G, playerID)) return 0;
  const target = Math.max(0, -calculateIncome(projected, playerID).food) + 2;
  return -14 * Math.max(0, target - G.players[playerID].resources.food);
}

function evaluateSmart(G: HegemonyState, playerID: PlayerId, weights = DEFAULT_WEIGHTS): number {
  const player = G.players[playerID];
  const projection = projectPolicyHorizon(G, playerID);
  const projected = projection.resources;

  let cities = 0;
  let colonies = 0;
  let weightedPops = 0;
  let latentWork = 0;

  for (const tileId of player.settlements) {
    const tile = getTile(G, tileId);
    const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);
    if (!tile || !settlement) {
      continue;
    }

    weightedPops +=
      weights.pops.citizens * settlement.pops.citizens +
      weights.pops.freemen * settlement.pops.freemen +
      weights.pops.slaves * settlement.pops.slaves;

    if (settlement.kind === "colony") {
      colonies += 1;
    } else {
      cities += 1;
    }

    // Work a slave could still take up: open slots nobody works. A building spends
    // one of them. A colony cannot build, so its spare slots count only as far as
    // it has room for the slaves.
    const primary = settlementSlaveResource(tile, G);
    if (primary) {
      const unworked =
        settlementOpenSlots(tile, settlement, G) - settlementWorkingSlaves(tile, settlement, G);
      const room = ideaRoom(G, settlement);
      latentWork +=
        Math.max(0, Math.min(unworked, room)) *
        weights.materials[primary] *
        incomeYearsLeft(G, playerID) *
        LATENT_SLOT_SHARE;
    }
  }

  const material =
    weights.materials.food * projected.food +
    weights.materials.wood * projected.wood +
    weights.materials.stone * projected.stone +
    weights.materials.gold * projected.gold;

  const heuristic =
    weights.cities * cities +
    weights.colonies * colonies +
    weightedPops +
    (material + latentWork) / 8 -
    STARVED_POP_WEIGHT * projection.expectedStarvationPopLoss;

  // Claims survive the income horizon and deny a rival a Port site. Inactive
  // goods (during Blockade) keep half their permanent value.
  const active = activeClaims(G, playerID).length;
  const luxuryValue =
    weights.luxury * active + (weights.luxury / 2) * (ownedClaims(G, playerID).length - active);

  return (
    SMART_VICTORY_CARD_VALUE * victoryCardsHeld(G, playerID) +
    10 * heuristic +
    levelValue(G, playerID, weights.level) +
    weights.influence * projected.influence +
    luxuryValue +
    foodReserveValue(G, playerID) +
    ideaOpportunityValue(G, playerID, weights) -
    projection.unrest.riskPenalty
  );
}

/** Tunables for the within-turn beam search. Kept small so batch runtime stays sane; the
 *  top-W frontier + depth cap bound the transitions per decision. */
const BEAM_WIDTH = 3;
const BEAM_DEPTH = 4;

/**
 * Within-turn beam search over deterministic actions and venture chance leaves. Expands each
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

  // A forced riot keeps the shared insurance handler; optional ventures are searched.
  const byRule = resolveRiotByRule(moves);
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
    list.filter((move) => !RIOT_MOVE_TYPES.has(move.type) && move.type !== "endTurn");

  const rootMoves = branchable(moves);
  if (rootMoves.length === 0) {
    return endTurn;
  }

  const evaluation = searchEvaluation(score, playerID);
  const rootScore = evaluation.valueOf(G);
  const soleRootOutcomes = rootMoves.length === 1 ? searchOutcomes(G, rootMoves[0]) : null;
  // If the only optional first move already improves the position, deeper
  // continuations cannot change which first move wins. A costly first move
  // still gets the whole beam so it can unlock a later payoff.
  if (
    soleRootOutcomes?.length &&
    expectedScore(soleRootOutcomes, evaluation.valueOf) > rootScore + 1e-8
  )
    return rootMoves[0];
  type Node = { state: HegemonyState; firstMove: GameCommand | null; score: number };
  let frontier: Node[] = [{ state: G, firstMove: null, score: rootScore }];
  let best: { firstMove: GameCommand | null; score: number } = {
    firstMove: null,
    score: rootScore,
  };

  for (let depth = 0; depth < BEAM_DEPTH; depth += 1) {
    const children: Node[] = [];
    const seen = new Set<string>();
    for (const node of frontier) {
      const candidateMoves =
        depth === 0 ? rootMoves : branchable(enumerateLegalCommands(node.state, playerID));
      for (const move of candidateMoves) {
        const outcomes =
          depth === 0 && soleRootOutcomes ? soleRootOutcomes : searchOutcomes(node.state, move);
        if (!outcomes.length) continue;
        if (move.type !== "fundExpedition") {
          const key = evaluation.keyOf(outcomes[0].state);
          if (seen.has(key)) continue;
          seen.add(key);
        }
        const firstMove = node.firstMove ?? move;
        const nextScore = expectedScore(outcomes, evaluation.valueOf);
        // Ventures are chance leaves inside the search at every depth. Replan
        // after observing the actual roll, rather than expanding fictional rolls.
        if (move.type !== "fundExpedition")
          children.push({ state: outcomes[0].state, firstMove, score: nextScore });
        if (nextScore > best.score + 1e-8) best = { firstMove, score: nextScore };
      }
    }
    if (!children.length) break;
    children.sort((a, b) => b.score - a.score);
    frontier = children.slice(0, BEAM_WIDTH);
  }

  return best.firstMove && best.score > rootScore + 1e-8 ? best.firstMove : endTurn;
}

/**
 * The turn-planning bot: a within-turn beam search over {@link evaluateSmart}, so it values
 * the within-turn sequences one-ply misses (build-then-promote and bank chains).
 * It cannot intentionally save across turns because endTurn is not a search branch.
 * Same scoring as `smart`, deeper search — so a smart-vs-beam A/B isolates search depth.
 */
export const beamPolicy: Policy = {
  name: "beam",
  choose(view, moves, rng) {
    if (view.state.assembly)
      return resolveAssemblyByHeuristic(view.state, view.state.assembly, moves);
    if (isSetupPhase(view.state)) {
      return choosePlacement(view.state, moves, rng);
    }
    return beamPlan(view.state, moves, evaluateSmart);
  },
};

// ── Opening placement — setup is just more policy calls ──────────────────────────────
//
// Capitals and founding colonies used to be filled in by a uniform draw over the legal
// placements (the sim's "random" opening and the browser's dev auto-opening). Every search
// policy now branches here during the setup phases and scores placements with ONE shared
// evaluator. Baseline policies share its weights for gameplay A/Bs; personalities
// apply their own weights during setup too. `random` keeps its uniform pick.
// See docs/archive/plans/policy-placement.md.

export function isSetupPhase(G: HegemonyState): boolean {
  return (
    G.phase === "setupIdeas" ||
    G.phase === "setupCapital" ||
    G.phase === "setupCity" ||
    G.phase === "setupColony"
  );
}

/** How many frontier tiles a placement is credited with. Colonies are founded one at a
 *  time, so the whole coastline must not sum up once a seat holds the coast — that made
 *  a food-4 shore beat the food-10 breadbasket. The best few reachable sites are what a
 *  placement really buys. */
const PLACEMENT_FRONTIER_TOP = 3;

/** Half the frontier weight: a contested tile still counts for something. Measured by the
 *  opening A/B in docs/archive/plans/policy-placement.md. */
const CONTEST_WEIGHT = 1;

/** The bounded frontier a placement opens: the top few yields the player could found on
 *  next (gameplay geometry, so a coastal seat sees the leapfrog coast), and how much of
 *  that a rival could also settle — later seats use it to react to earlier placements
 *  beyond what the exclusion radius already forbids. */
export function placementFrontier(
  G: HegemonyState,
  playerID: PlayerId,
): { frontier: number; contested: number } {
  // A seat that has not placed yet has no contiguity rule and "reaches" every tile;
  // only rivals already on the board contest anything.
  const rivals = playerIds(G).filter(
    (player) => player !== playerID && G.players[player].settlements.length > 0,
  );
  const reachable: { amount: number; contested: boolean }[] = [];

  for (const tile of G.board.tiles) {
    // A tile is worth the slaves it can put to work: its slots, where it has a resource.
    const amount = tile.resource ? tile.slots : 0;
    if (amount === 0 || !canPlaceColonyOnTile(G, playerID, tile).can) {
      continue;
    }
    reachable.push({
      amount,
      contested: rivals.some((rival) => canPlaceColonyOnTile(G, rival, tile).can),
    });
  }

  reachable.sort((a, b) => b.amount - a.amount);

  let frontier = 0;
  let contested = 0;
  for (const site of reachable.slice(0, PLACEMENT_FRONTIER_TOP)) {
    frontier += site.amount;
    contested += site.contested ? site.amount : 0;
  }

  return { frontier, contested };
}

/** Unclaimed goods a Port could claim from the player's tiles. A colony counts: a
 *  Port is the one building it may raise. Placement is where the contested-claim
 *  race is decided, since a settlement seated on a mooring tile is a Port site for
 *  the whole game. */
function luxuryClaimReach(G: HegemonyState, playerID: PlayerId): number {
  return G.players[playerID].settlements.reduce(
    (reach, tileId) => reach + claimableLuxuriesAt(G, tileId).length,
    0,
  );
}

/** A reachable future claim is a thumb on the scale, not a mandate: at half a
 *  realized claim's value the capital abandoned the classic board's food-10
 *  breadbasket for a mooring, which trades certain income for an option. Sized
 *  like a good frontier tile instead — it breaks ties toward the coast and no
 *  more; the A/B campaigns own the fine tuning. */
const LUXURY_REACH_WEIGHT = 6;

/** The placement score: `smart`'s economy plus the bounded frontier, minus its contested
 *  part, plus the luxury claims a city on this site could reach. Once the pops sit on
 *  the tile, the income projection IS the site score, so no bespoke site heuristic is
 *  needed; coast access shows up through the leapfrog frontier. */
export function evaluatePlacement(
  G: HegemonyState,
  playerID: PlayerId,
  weights = DEFAULT_WEIGHTS,
): number {
  const { frontier, contested } = placementFrontier(G, playerID);
  return (
    evaluateSmart(G, playerID, weights) +
    weights.frontier * frontier -
    CONTEST_WEIGHT * contested +
    ((LUXURY_REACH_WEIGHT * weights.luxury) / DEFAULT_WEIGHTS.luxury) *
      luxuryClaimReach(G, playerID)
  );
}

/** How many tiles survive the tile-ranking pass before every pop split is scored. */
const PLACEMENT_TOP_TILES = 3;

type Placement = Extract<GameCommand, { tileId: string; pops: Pops }>;

/** The most even split among a tile's compositions — the stand-in used to rank tiles
 *  before the surviving tiles are scored with every split. */
function representativeSplit(placements: Placement[]): Placement {
  let best = placements[0];
  let bestSpread = Infinity;

  for (const placement of placements) {
    const counts = [placement.pops.citizens, placement.pops.freemen, placement.pops.slaves];
    const spread = Math.max(...counts) - Math.min(...counts);
    if (spread < bestSpread) {
      bestSpread = spread;
      best = placement;
    }
  }

  return best;
}

function scorePlacements(
  G: HegemonyState,
  moves: GameCommand[],
  weights: ScoreWeights,
): { move: GameCommand; score: number }[] {
  const playerID = G.currentPlayer;
  const scored: { move: GameCommand; score: number }[] = [];

  for (const move of moves) {
    const result = transition(G.definition, G, playerID, move);
    if (result.ok) {
      scored.push({ move, score: evaluatePlacement(result.state, playerID, weights) });
    }
  }

  return scored;
}

/**
 * One-ply over the legal placements, in two passes so a capital decision costs ~80
 * transitions instead of ~540: rank tiles by their most even pop split, then score every
 * split on the top few tiles. Exact ties are broken with the injected rng so symmetric
 * sites and compositions do not always resolve to the lowest tile id.
 */
export function choosePlacement(
  G: HegemonyState,
  moves: GameCommand[],
  rng: SimRng,
  weights = DEFAULT_WEIGHTS,
): GameCommand {
  if (G.phase === "setupIdeas") return chooseIdea(G, moves, rng, weights);
  const byTile = new Map<string, Placement[]>();
  for (const move of moves) {
    if ("tileId" in move && "pops" in move) {
      byTile.set(move.tileId, [...(byTile.get(move.tileId) ?? []), move]);
    }
  }

  let candidates: GameCommand[] = moves;
  if (byTile.size > PLACEMENT_TOP_TILES) {
    const ranked = scorePlacements(G, [...byTile.values()].map(representativeSplit), weights).sort(
      (a, b) => b.score - a.score,
    );
    candidates = ranked
      .slice(0, PLACEMENT_TOP_TILES)
      .flatMap(({ move }) => byTile.get((move as Placement).tileId) ?? []);
  }

  let best: GameCommand[] = [];
  let bestScore = -Infinity;

  for (const { move, score } of scorePlacements(G, candidates, weights)) {
    if (score > bestScore) {
      bestScore = score;
      best = [move];
    } else if (score === bestScore) {
      best.push(move);
    }
  }

  if (best.length === 0) {
    throw new Error("policy found no applicable placement");
  }

  return best.length === 1 ? best[0] : rng.pick(best);
}

// ── Phase 3-C: the influence-aware "political" bot ────────────────────────────────────
//
// Every other bot reaches the Assembly and passes: its scorer values influence only as a
// small hoard weight, and a Law's payoff sits beyond any affordable search (draw now →
// propose → rivals vote across the round → reap it over many turns). `political` closes
// that with two explicit ideas — a DIFFERENTIAL lens (my gain minus the STRONGEST rival's,
// so "does this hurt me, help me, or help a rival more?") and a political-position term —
// and plays the agora by heuristic rather than blind search. Same `evaluateSmart` spine,
// so a political-vs-smart A/B isolates the political layer. See docs/archive/plans/influence-aware-ai.md.

function playerIds(G: HegemonyState): PlayerId[] {
  return Object.keys(G.players) as PlayerId[];
}

/**
 * A seat's standing authored Laws, its progress toward Voice, on the smart-score scale.
 * The actual held victory card is already priced by evaluateSmart; this values the path.
 */
function politicalStanding(G: HegemonyState, me: PlayerId): number {
  const mine = victoryMetricValue(G, me, "voice");
  // Progress matters, but it is not itself a victory card. The actual threshold
  // crossing is already worth a full card in `evaluateSmart`; overpricing every
  // preliminary pass made political seats reject virtually every rival-authored
  // public good and left Voice mechanically present but strategically unreachable.
  return mine;
}

/** The political bot's positional score: the smart economy plus its agora standing. */
function scorePolitical(G: HegemonyState, playerID: PlayerId, weights = DEFAULT_WEIGHTS): number {
  return evaluateSmart(G, playerID, weights) + weights.politics * politicalStanding(G, playerID);
}

type Scores = Record<PlayerId, number>;

function scoreEveryone(G: HegemonyState, score: Scorer): Scores {
  const scores = {} as Scores;
  for (const playerID of playerIds(G)) {
    scores[playerID] = score(G, playerID);
  }
  return scores;
}

/**
 * The differential lens: my gain over a hypothetical change minus the STRONGEST rival's
 * (guard the front-runner, not the field). > 0 wants it, < 0 opposes it, ≈ 0 neutral.
 */
function competitiveDelta(
  before: Scores,
  after: HegemonyState,
  me: PlayerId,
  score: Scorer,
): number {
  const rivals = playerIds(after).filter((player) => player !== me);
  const myGain = score(after, me) - before[me];
  const gains = rivals.map((rival) => score(after, rival) - before[rival]);
  const bestRivalGain = Math.max(...gains);
  // The best rival gain alone never sees harm: a Directive that costs the leading
  // rival a winning title scored only its prize. Count the leader's loss against me.
  const leader = rivals.reduce((a, b) => (before[b] > before[a] ? b : a));
  const leaderLoss = Math.min(0, gains[rivals.indexOf(leader)] - myGain);
  return myGain - bestRivalGain - leaderLoss;
}

/** Score "what if this ballot item carried" as a competitive delta, on a full clone —
 *  reusing the engine's own enactment so the prediction can never drift from the rules. */
function deltaIfEnacted(
  G: HegemonyState,
  before: Scores,
  item: BallotItem,
  me: PlayerId,
  score: Scorer,
): number {
  const clone = structuredClone(G);
  enactForEval(clone, item);
  return competitiveDelta(before, clone, me, score);
}

// Assembly heuristic tunables — sim-tuned to the smart-score scale, where a single
// income Law shifts a beneficiary's score by ~tens (10 × the projected income delta / 8).
// Buy votes only when they can change the outcome; reserve repeals for harmful Laws.
const PROPOSE_THRESHOLD = 0; // propose iff the private prize/progress covers a merely neutral Law
const REPEAL_THRESHOLD = 12; // repeal (3 influence) only a standing Law that is clearly hostile
const BRIBE_MAGNITUDE = 8; // buy votes only when the outcome genuinely swings the race
// A repeated legislature needs room for coalitions: support a measure that is only
// modestly better for its author, while still blocking material harm and Voice-clinching
// swings. This roughly covers one preliminary Voice tick plus a normal author prize.
const VOTE_COALITION_TOLERANCE = 12;
const DRAW_THRESHOLD = 0;
const MAX_DRAWS = 1; // draw once and commit — fishing (redraw-after-discard) just burns influence

/** Best legal target value for one known card. This is used only while
 * evaluating a deck's unordered public composition; it never reads the top card. */
function bestProposalDelta(
  G: HegemonyState,
  before: Scores,
  card: ResolutionCard,
  me: PlayerId,
  score: Scorer,
): number {
  if (lawProposalReason(G, card)) return -Infinity;
  const items: BallotItem[] = [];

  if (card.kind === "directive") {
    for (const target of playerIds(G)) {
      if (target !== me) items.push({ kind: "enact", card, proposer: me, target });
    }
  } else {
    items.push({ kind: "enact", card, proposer: me });
  }

  return Math.max(...items.map((item) => deltaIfEnacted(G, before, item, me, score)));
}

/** Expected value of drawing from a politician without peeking at hidden deck or hand
 * identities. The pool contains every card not known to be in a public zone or this
 * player's own private zone, so a rival's held card remains uncertainty, not knowledge. */
function expectedDeckDelta(
  G: HegemonyState,
  before: Scores,
  politician: ResolutionCard["politician"],
  me: PlayerId,
  score: Scorer,
): number {
  const cards = observablePoliticianPool(G, politician, me);

  if (cards.length === 0) return -Infinity;
  return (
    cards.reduce((sum, card) => {
      const value = bestProposalDelta(G, before, card, me, score);
      return sum + (Number.isFinite(value) ? Math.max(0, value) : 0);
    }, 0) / cards.length
  );
}

function drawPaymentDelta(G: HegemonyState, me: PlayerId, cost: number, score: Scorer) {
  const paid = structuredClone(G);
  paid.players[me].resources.influence -= cost;
  return score(paid, me) - score(G, me);
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
  ]);
  const session = G.assembly;
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
  score: Scorer = scorePolitical,
): GameCommand {
  const me = G.currentPlayer;

  if (session.phase === "closing") {
    return moves.find((move) => move.type === "assemblyClose") ?? moves[0];
  }

  if (session.phase === "voting") {
    return chooseVote(G, session, moves, me, score);
  }

  // Proposal (async): fish/repeal/pass while empty-handed, then propose or discard.
  const held = session.held[me];
  if (held) {
    return chooseProposeOrDiscard(G, held.card, moves, me, score);
  }
  return chooseDrawRepealOrPass(G, session, moves, me, score);
}

function chooseVote(
  G: HegemonyState,
  session: AssemblySession,
  moves: GameCommand[],
  me: PlayerId,
  score: Scorer,
): GameCommand {
  const item = session.ballot[session.ballotIndex];
  const before = scoreEveryone(G, score);
  const assessment = assessVote(G, before, item, me, score);

  // Buy only a pivotal vote. The old magnitude-only rule spent two bribes even when
  // the projected coalition already carried—or could not be rescued—which made
  // political participation lose on avoidable private cost.
  const bribe =
    moves.find((move) => move.type === "assemblyBribe" && move.payment === "influence") ??
    moves.find((move) => move.type === "assemblyBribe");
  if (bribe && Math.abs(assessment.voteDelta) >= BRIBE_MAGNITUDE) {
    const tally = projectedPlainVote(G, session, item, before, score);
    const needed = assessment.yea
      ? Math.max(0, tally.nay - tally.yea + 1)
      : Math.max(0, tally.yea - tally.nay);
    const price = G.ruleset.assembly.briberyCost;
    const purse = G.players[me].resources;
    const affordable =
      price > 0
        ? Math.floor(purse.gold / price) + Math.floor(purse.influence / price)
        : votePurchaseLimit(G, me);
    const available = Math.min(affordable, votePurchaseLimit(G, me) - session.bribesUsed[me]);
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
  score: Scorer,
): { delta: number; voteDelta: number; rivalCompletesRace: boolean; yea: boolean } {
  const delta = deltaIfEnacted(G, before, item, me, score);
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
  // comparison; the proposal's Law/Directive, prize, and standing lead still count.
  const rivalClaimsOpenVoice =
    voiceHolder(G) === null && voiceHolder(clone) !== null && voiceHolder(clone) !== me;
  const voteDelta = delta + (rivalClaimsOpenVoice ? SMART_VICTORY_CARD_VALUE : 0);
  return {
    delta,
    voteDelta,
    rivalCompletesRace,
    yea:
      !rivalCompletesRace &&
      (item.proposer === me
        ? delta >= -VOTE_COALITION_TOLERANCE
        : score(clone, me) - before[me] >= -VOTE_COALITION_TOLERANCE),
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
  score: Scorer,
): { yea: number; nay: number } {
  let yea = session.votes.filter((vote) => vote.yea).reduce((sum, vote) => sum + vote.weight, 0);
  let nay = session.votes.filter((vote) => !vote.yea).reduce((sum, vote) => sum + vote.weight, 0);

  for (const player of session.voteOrder.slice(session.voteIndex)) {
    const weight = currentVoteWeight(G, player);
    if (assessVote(G, before, item, player, score).yea) yea += weight;
    else nay += weight;
  }

  return { yea, nay };
}

function chooseProposeOrDiscard(
  G: HegemonyState,
  card: ResolutionCard,
  moves: GameCommand[],
  me: PlayerId,
  score: Scorer,
): GameCommand {
  const before = scoreEveryone(G, score);

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
      target: move.target,
    };
    const delta = deltaIfEnacted(G, before, item, me, score);
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
  score: Scorer,
): GameCommand {
  const before = scoreEveryone(G, score);
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
      score,
    );
    if (delta > bestRepealDelta) {
      bestRepealDelta = delta;
      bestRepeal = move;
    }
  }

  // Only standing authored Laws advance Voice. Compare each deck's full
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
    const value =
      expectedDeckDelta(G, before, move.politician, me, score) +
      drawPaymentDelta(G, me, cost, score);
    if (value > bestDrawValue) {
      bestDrawValue = value;
      bestDraw = move;
      drawCost = cost;
    }
  }

  const drawBuffer = 0;
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
  choose(view, moves, rng) {
    if (view.state.assembly)
      return resolveAssemblyByHeuristic(view.state, view.state.assembly, moves);
    const G = view.state;
    if (isSetupPhase(G)) {
      return choosePlacement(G, moves, rng);
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
  // Unclaimed goods make their two claim tiles worth expanding toward — the
  // contested-claim race is won at settlement time, turns before a Port can go up.
  const luxuryTiles = new Set(
    G.board.luxuries.filter((asset) => asset.owner === null).flatMap((asset) => asset.tileIds),
  );
  let value = 0;

  for (const tile of G.board.tiles) {
    if (canPlaceColonyOnTile(G, playerID, tile).can) {
      value +=
        (tile.resource ? tile.slots : 0) + (luxuryTiles.has(tile.id) ? LUXURY_FRONTIER_PULL : 0);
    }
  }

  return value;
}

/** How strongly an unclaimed good pulls the frontier toward its claim tiles —
 *  sized like a good yield tile so it steers direction without minting colonies. */
const LUXURY_FRONTIER_PULL = 3;

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
  choose(view, moves, rng) {
    if (view.state.assembly)
      return resolveAssemblyByHeuristic(view.state, view.state.assembly, moves);
    if (isSetupPhase(view.state)) {
      return choosePlacement(view.state, moves, rng);
    }
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

function scoreMaster(G: HegemonyState, playerID: PlayerId, weights = DEFAULT_WEIGHTS): number {
  return scorePolitical(G, playerID, weights) + weights.frontier * frontierValue(G, playerID);
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
 * cross-turn saving, general opponent replies or multi-hop route search.
 */
export const masterPolicy: Policy = {
  name: "master",
  choose(view, moves, rng) {
    if (view.state.assembly)
      return resolveAssemblyByHeuristic(view.state, view.state.assembly, moves);
    const G = view.state;
    if (isSetupPhase(G)) {
      return choosePlacement(G, moves, rng);
    }

    return beamPlan(G, moves, scoreMaster);
  },
};

function personalityPolicy(name: PersonalityId): Policy {
  const weights = PERSONALITY_WEIGHTS[name];
  const score: Scorer = (G, player) => scoreMaster(G, player, weights);
  return {
    name,
    choose(view, moves, rng) {
      const G = view.state;
      if (G.assembly) return resolveAssemblyByHeuristic(G, G.assembly, moves, score);
      if (isSetupPhase(G)) return choosePlacement(G, moves, rng, weights);
      return beamPlan(G, moves, score);
    },
  };
}

export const POLICIES: Record<PolicyId, Policy> = {
  random: randomPolicy,
  greedy: greedyPolicy,
  smart: smartPolicy,
  beam: beamPolicy,
  political: politicalPolicy,
  settler: settlerPolicy,
  master: masterPolicy,
  slaver: personalityPolicy("slaver"),
  civic: personalityPolicy("civic"),
  trader: personalityPolicy("trader"),
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

export function chooseIdea(
  G: HegemonyState,
  moves: GameCommand[],
  rng: SimRng,
  weights = DEFAULT_WEIGHTS,
): GameCommand {
  const me = G.currentPlayer;
  let best: GameCommand[] = [];
  let value = -Infinity;
  for (const move of moves) {
    if (move.type !== "pickIdea") continue;
    const candidate = ideaForEval(G, me, move.ideaId, move.target);
    const score = scoreMaster(candidate, me, weights);
    if (score > value) {
      value = score;
      best = [move];
    } else if (score === value) best.push(move);
  }
  if (!best.length) throw new Error("No legal Idea pick.");
  return best.length === 1 ? best[0] : rng.pick(best);
}

function ideaOpportunityValue(G: HegemonyState, me: PlayerId, weights = DEFAULT_WEIGHTS): number {
  const years = Math.max(0, Math.min(INCOME_HORIZON, 14 - G.year));
  const effects = playerNationalIdeas(G, me).flatMap((idea) => idea.effects);
  if (!effects.length || !years) return 0;
  const pieces = playerPieces(G, me);
  const roomToExpand =
    effects.some((e) => e.type === "colonyPieces" || e.type === "onFoundColony") &&
    placementFrontier(G, me).frontier > 0;
  let value = 0;
  for (const e of effects) {
    if (e.type === "colonyPieces" && roomToExpand)
      value +=
        ((10 * e.amount * years) / INCOME_HORIZON) *
        (pieces.colonies >= G.ruleset.pieces.colonies - 1 ? 3 : 1);
    if (e.type === "onUpgradeCity") {
      const upgrades = G.players[me].settlements.filter((id) =>
        getTile(G, id)?.settlements.some((s) => s.owner === me && s.kind === "colony"),
      ).length;
      value +=
        12 *
        (weights.pops.freemen / DEFAULT_WEIGHTS.pops.freemen) *
        Math.min(upgrades, pieces.citiesRemaining, years);
    }
    if (e.type === "onFoundColony" && roomToExpand) {
      const pops = (e.amount ?? 1) * Math.min(pieces.coloniesRemaining, years);
      let opportunity = 6 * pops * (weights.pops[e.grantPop] / DEFAULT_WEIGHTS.pops[e.grantPop]);
      // Future grants owe the same standing-level cost as slaves already on the
      // board. Pricing only their population reward made Slave Colonies win every
      // opening even when its immediate grant lowered the ordinary score.
      if (e.grantPop === "slaves") {
        const slaves = countPlayerPopType(G, me, "slaves");
        const loss = slaveUnhappiness(G, slaves + pops) - slaveUnhappiness(G, slaves);
        const level = standingHappiness(G, me);
        const cap = G.ruleset.victory.minimums.happiness + 2;
        opportunity -= weights.level * (Math.min(level, cap) - Math.min(level - loss, cap));
      }
      value += Math.max(0, opportunity);
    }
    if (e.type === "slotExempt" && e.building === "port") {
      // At setup the Port is still prospective. Credit one saved work slot per
      // owned unclaimed Port site, and a claim only when the exemption opens a
      // site whose building slots are full. Existing Ports are already scored.
      const sites = G.players[me].settlements.flatMap((id) => {
        const tile = getTile(G, id);
        const settlement = tile?.settlements.find((s) => s.owner === me);
        return tile &&
          settlement &&
          !settlement.buildings.includes("port") &&
          claimableLuxuriesAt(G, id).length
          ? [{ tile, settlement }]
          : [];
      });
      const siteValues = sites.map(({ tile, settlement }) => {
        const primary = settlementSlaveResource(tile, G);
        const slots = settlementOpenSlots(tile, settlement, G);
        const canWork =
          settlementWorkingSlaves(tile, settlement, G) > 0 || ideaRoom(G, settlement) > 0;
        return (
          (primary && slots > 0 && canWork ? (10 * weights.materials[primary] * years) / 8 : 0) +
          (slots <= 0 ? weights.luxury / 2 : 0)
        );
      });
      const goods = new Set(
        sites.flatMap(({ tile }) => claimableLuxuriesAt(G, tile.id).map((good) => good.id)),
      );
      value += siteValues
        .sort((a, b) => b - a)
        .slice(0, goods.size)
        .reduce((sum, site) => sum + site, 0);
    }
    if (e.type === "dolePrice") {
      const food = calculateIncome(G, me).food;
      value +=
        weights.influence *
        Math.max(0, G.ruleset.dole.influenceCost - playerDole(G, me).influenceCost) *
        Math.min(Math.max(0, -food), 3) *
        years;
    }
    if (
      e.type === "votePurchaseLimit" &&
      G.players[me].resources.influence + G.players[me].resources.gold >= 6
    )
      value += (weights.politics / 2) * Math.ceil(years / 2);
  }
  return value;
}
