import { produce } from "immer";
import { ideaForEval, playerNationalIdeas } from "../game/ideas";
import { playerDole, votePurchaseLimit } from "../game/ideaRules";
import { PLAYER_IDS } from "../game/data";
import { bankBuy, dole, getBankBuyStatus, getDoleStatus } from "../game/bank";
import { playerPieces } from "../game/settlement";
import { YEAR_TERM_COLUMNS, calculateIncome, unfedAtTurnEnd } from "../game/economy/income";
import { applyHunger, hungerForEval, hungerMouths } from "../game/hunger";
import { happinessLevel, slaveUnhappiness, standingHappiness } from "../game/happiness";
import { TABLE_LOSS_ORDER, removePops } from "../game/tables";
import { insuranceRollBonus } from "../game/riot";
import { getAdjustedActionCost } from "../game/economy/cost";
import { ventureOutcomes } from "./chance";
import { getActiveEffects } from "../game/activeEffects";
import { applyIncome } from "../game/core/resources";
import type { MoveResult } from "../game/core/results";
import { CIVIC_CALM_PAYMENTS, civicCalm, getCivicCalmStatus } from "../game/civic";
import type { CivicCalmPayment } from "../game/civic";
import { getBuilding, getResolutionCard, getResolutionCards, getRiotTable } from "../game/content";
import { totalPops } from "../game/core/pops";
import { getOwnedSettlement, getTile, popsInTransit, realmPops } from "../game/core/query";
import { placeCapital, placeCity, placeColony, resolveArrivingPops } from "../game/actions";
import { lastYear, yearDeckSize } from "../game/year";
import { unrestOutcome } from "../game/unrest";
import type { UnrestOutcome } from "../game/unrest";
import {
  canPlaceColonyOnTile,
  countPlayerPopType,
  popsInTransitTo,
  settlementOpenSlots,
  settlementRoom,
  settlementWorkingSlaves,
  settlementSlaveResource,
} from "../game/settlement";
import {
  baseVoteWeight,
  currentVoteWeight,
  enactForEval,
  lawProposalReason,
  nextAssemblyYear,
  nextDrawCost,
  repealableLawIds,
  slaveUnrestCount,
  voteOutlook,
  votesLeftToBuy,
  wouldPass,
} from "../game/assembly";
import type { AssemblySession, BallotItem, LawEffect, ResolutionCard } from "../game/assembly";
import type { GameCommand } from "../game/legalMoves";
import { enumerateLegalCommands, enumerateLegalOptions, transition } from "../game/legalMoves";
import { claimableLuxuriesAt, ownedClaims } from "../game/luxury";
import { playerStandings } from "../game/score";
import {
  getBuildBuildingStatus,
  getFoundColonyStatus,
  getUpgradeColonyToCityStatus,
  upgradeSiteReasons,
} from "../game/status";
import {
  TRADE_RESOURCES,
  counterOf,
  emptyBundle,
  getOffer,
  getTradeAnswerStatus,
  getTradeOfferStatus,
  isEmptyBundle,
  offerWindowReason,
  tradeForEval,
  tradePlaceChoices,
  tradeShortfalls,
} from "../game/trade";
import {
  titleChanges,
  titleHolders,
  victoryCardsHeld,
  victoryMetricValue,
  voiceHolder,
} from "../game/victory";
import type { TitleHolders } from "../game/victory";
import type {
  BuildingId,
  HegemonyState,
  PlayerId,
  Pops,
  PopType,
  Resource,
  Resources,
  TradeBundle,
  TradeOffer,
  TradePlaces,
  TradeTerms,
} from "../game/types";
import type { PlayerView } from "../game/projection";
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
  // A claimed good, on top of the +2 it adds through the level weight.
  luxury: 6,
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
    luxury: 9,
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

/**
 * A riot on the table: buy the insurance that leaves the seat best off, the concession
 * included, and roll when none pays. The forecast charges the pending riot what its
 * table is expected to take at the insurance bought so far, so an option is worth what
 * it saves at the seat's weights, less its price.
 */
function resolveRiotByRule(
  G: HegemonyState,
  moves: GameCommand[],
  score: Scorer,
): GameCommand | null {
  const riot = moves.find((move) => move.type === "resolveRiot");
  if (!riot) return null;
  const playerID = G.currentPlayer;
  let best: GameCommand = riot;
  let bestScore = score(G, playerID);

  for (const move of moves) {
    if (move.type !== "buyRiotInsurance" || shedsLastCitizen(G, move)) continue;
    const result = transition(G.definition, G, playerID, move);
    if (!result.ok) continue;
    const value = score(result.state, playerID);
    if (value > bestScore + 1e-8) {
      bestScore = value;
      best = move;
    }
  }
  return best;
}

/**
 * No bot gives up its last citizen for points alone. The scorer prices a citizen by its
 * pop weight and its influence, and not yet by its vote or the Ideas and draws that
 * influence buys, so a build that weights freemen higher would demote it at once.
 */
function shedsLastCitizen(G: HegemonyState, move: GameCommand): boolean {
  const { citizens } = realmPops(G, G.currentPlayer);
  if (move.type === "demotePop") return move.from === "citizens" && citizens === 1;
  if (move.type === "buyRiotInsurance") return move.demoteTarget !== undefined && citizens === 1;
  if (move.type === "resolveHunger")
    return citizens > 0 && move.leave.filter((left) => left.pop === "citizens").length >= citizens;
  return false;
}

/** Trade is played by rule (see the Trade section): the search never weighs an offer's
 *  answers, and an offer is composed, never listed. */
const TRADE_MOVE_TYPES: ReadonlySet<GameCommand["type"]> = new Set([
  "tradeOffer",
  "tradeAnswer",
  "tradeSettle",
  "tradeWithdraw",
]);

/** The moves search may weigh: no riot or trade moves, no endTurn, and none that sheds
 *  the last citizen while another choice remains. */
function searchable(G: HegemonyState, moves: GameCommand[]): GameCommand[] {
  const optional = moves.filter(
    (move) =>
      !RIOT_MOVE_TYPES.has(move.type) &&
      !TRADE_MOVE_TYPES.has(move.type) &&
      move.type !== "endTurn",
  );
  const kept = optional.filter((move) => !shedsLastCitizen(G, move));
  return kept.length || moves.some((move) => move.type === "endTurn") ? kept : optional;
}

type SearchOutcome = { state: HegemonyState; probability: number };
function searchOutcomes(G: HegemonyState, move: GameCommand): SearchOutcome[] {
  if (move.type === "fundExpedition") return ventureOutcomes(G, G.currentPlayer, move);
  // The riot check and hand-off after hunger are the projection's: score the loss alone.
  if (move.type === "resolveHunger")
    return [{ state: hungerForEval(G, G.currentPlayer, move.leave), probability: 1 }];
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

  const byRule = resolveRiotByRule(G, moves, score);
  if (byRule) {
    return byRule;
  }

  const endTurn = moves.find((move) => move.type === "endTurn");
  const candidates = searchable(G, moves);

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

/**
 * A search policy: an offer naming the seat answered first, by rule; the Assembly by
 * heuristic under `assemblyScore`; setup by the shared placement evaluator under
 * `weights`; and its own `turn` otherwise. Left out, the two fall back to the political
 * score and the default weights.
 */
function searchPolicy(
  name: PolicyId,
  turn: (G: HegemonyState, moves: GameCommand[]) => GameCommand,
  weights = DEFAULT_WEIGHTS,
  assemblyScore?: Scorer,
): Policy {
  return {
    name,
    choose(view, moves, rng) {
      const G = view.state;
      const me = view.viewer;
      const offer = G.offers.find(
        (open) =>
          open.to.includes(me) &&
          moves.some((move) => move.type === "tradeAnswer" && move.offerId === open.id),
      );
      if (offer) return answerOffer(G, offer, moves, me, weights);
      if (G.assembly)
        return resolveAssemblyByHeuristic(G, G.assembly, moves, me, weights, assemblyScore);
      if (isSetupPhase(G)) return choosePlacement(G, moves, rng, weights);
      return turn(G, moves);
    },
  };
}

export const greedyPolicy = searchPolicy("greedy", (G, moves) =>
  onePlyLookahead(G, moves, evaluate),
);

/**
 * The slot- and promotion-aware bot (2026-07-18). Same search as greedy, but its
 * evaluation actually values Phase 2's strategic layer — so sims exercise the
 * mechanics greedy is blind to: it climbs the social ladder, builds the class
 * buildings, and keeps plains slots for the slaves that feed it. See {@link evaluateSmart}.
 */
export const smartPolicy = searchPolicy("smart", (G, moves) =>
  onePlyLookahead(
    G,
    moves,
    facingRepeals(G, (state, player, risks) =>
      evaluateSmart(state, player, DEFAULT_WEIGHTS, NO_WANTS, risks),
    ),
  ),
);

/** How many turns of income the greedy score projects forward. The horizon is
 *  what lets one-ply search see delayed payoffs: a class building's raise is
 *  invisible at the moment of purchase and only becomes worth its cost when
 *  multiplied out. */
const INCOME_HORIZON = 6;
export type PolicyUnrestExposure = {
  minimumHappiness: number;
  riotEvents: number;
  revoltEvents: number;
  riskPenalty: number;
};
export type PolicyProjection = {
  /** The stocks as the horizon closes. */
  resources: HegemonyState["players"][PlayerId]["resources"];
  /** The seat's next income as printed, before any year card it has not seen. */
  income: Pick<Resources, "food" | "gold">;
  expectedStarvationPopLoss: number;
  /** Pops the seat cannot feed between the horizon and the game's last year, each
   *  counted by the share of its remaining incomes that the pop misses. */
  starvedAfterHorizon: number;
  unrest: PolicyUnrestExposure;
};

/** The smart score counts each point of its heuristic this many times. */
const HEURISTIC_SCALE = 10;
/** Weighted materials enter the smart heuristic divided by this. */
const MATERIAL_DIVISOR = 8;

/** What one unit of a stock adds to the smart score: materials are weighted, divided
 *  and scaled with the rest of the heuristic; influence counts as is. */
function stockValue(weights: ScoreWeights, resource: Resource): number {
  return resource === "influence"
    ? weights.influence
    : (HEURISTIC_SCALE / MATERIAL_DIVISOR) * weights.materials[resource];
}

/** What one pop adds to the smart score: its class weight, scaled with the rest of the
 *  heuristic. */
function popValue(weights: ScoreWeights, pop: PopType): number {
  return HEURISTIC_SCALE * weights.pops[pop];
}

/** What a bundle of stocks is worth at the seat's weights. */
function worth(weights: ScoreWeights, stocks: Partial<Resources>): number {
  return (Object.keys(stocks) as Resource[]).reduce(
    (sum, resource) => sum + (stocks[resource] ?? 0) * stockValue(weights, resource),
    0,
  );
}

type FoodSource = {
  /** Buy once through the engine, on the state given. */
  buy: (G: HegemonyState) => MoveResult;
  cost: Partial<Resources>;
  food: number;
};

/** The food a seat can buy, the cheaper first at its weights: the Dole, and the bank
 *  where a ruleset keeps one. Prices are the engine's statuses. */
function foodSources(G: HegemonyState, playerID: PlayerId, weights: ScoreWeights): FoodSource[] {
  const sources: FoodSource[] = [
    {
      buy: (state) => dole(state, playerID),
      cost: getDoleStatus(G, playerID).cost ?? {},
      food: playerDole(G, playerID).food,
    },
  ];
  if (G.ruleset.economy.bank.enabled)
    sources.push({
      buy: (state) => bankBuy(state, playerID, "food"),
      cost: getBankBuyStatus(G, playerID, "food").cost ?? {},
      food: 1,
    });
  return sources
    .filter((source) => source.food > 0)
    .sort((a, b) => worth(weights, a.cost) / a.food - worth(weights, b.cost) / b.food);
}

/** Food the seat's stocks would buy, each source paid from its own stock. */
function foodCover(G: HegemonyState, playerID: PlayerId, weights: ScoreWeights): number {
  const held = G.players[playerID].resources;
  return foodSources(G, playerID, weights).reduce((sum, { cost, food }) => {
    const units = Math.min(
      ...(Object.keys(cost) as Resource[]).map((resource) =>
        Math.floor(held[resource] / (cost[resource] || 1)),
      ),
    );
    return sum + Math.max(0, units) * food;
  }, 0);
}

/** Incomes the seat still collects in the game, this year's included if it has not
 *  collected yet. */
function incomesLeftInGame(G: HegemonyState, playerID: PlayerId) {
  return Math.max(0, lastYear(G) - G.year + (G.players[playerID].collectedThisTurn ? 0 : 1));
}

/** The incomes inside the horizon. */
function incomeYearsLeft(G: HegemonyState, playerID: PlayerId) {
  return Math.min(INCOME_HORIZON, incomesLeftInGame(G, playerID));
}

/**
 * The reference policies' canonical future-state projection. Ordinary recurring
 * modifiers already flow through calculateIncome; the active-effect selector adds
 * what income alone cannot express: a skipped collection. Each projected turn end
 * settles hunger and then checks the riot and revolt lines, as the engine does. On a
 * later turn the seat is taken to buy the food it is short of and the calm that keeps
 * it off those lines. The seat's weights decide what the forecast has to price: which
 * food and which calm is cheaper to buy, and what a riot or a revolt takes.
 */
export function projectPolicyHorizon(
  G: HegemonyState,
  playerID: PlayerId,
  horizon = incomeYearsLeft(G, playerID),
  weights = DEFAULT_WEIGHTS,
  fall: LawFall | null = null,
): PolicyProjection {
  const projectedState = createPolicyProjectionState(G, playerID);
  const player = projectedState.players[playerID];
  let expectedStarvationPopLoss = 0;
  const unrest: PolicyUnrestExposure = {
    minimumHappiness: happinessLevel(projectedState, playerID),
    riotEvents: 0,
    revoltEvents: 0,
    riskPenalty: 0,
  };
  // On a later turn the seat would buy the food it is short of before anyone leaves:
  // by the Dole, or from the bank where a ruleset keeps one, the cheaper first by its
  // weights, through the engine's own commands. The stocks pay, so a realm fed by the
  // Dole is seen to hold less influence, and only what it cannot pay for starves. The
  // current turn is left alone: that food the seat has to buy itself, and a forecast
  // that bought it would spend stocks the seat still counts as held. Setup is left
  // alone too. It picks land for fourteen years and the forecast sees six, so a
  // starting store and six years of income would make any site look fed.
  const buysLater = G.phase === "gameplay";
  const buyFood = () => {
    for (const source of foodSources(projectedState, playerID, weights))
      while (player.resources.food < 0 && source.buy(projectedState).ok);
  };
  // Hunger is the engine's own rule and draws no dice, so the projection runs it
  // for real: a turn that ends short loses a pop per missing food, and later incomes
  // are recomputed without them.
  const settleHunger = (canBuy = buysLater) => {
    if (player.resources.food >= 0) return false;
    if (canBuy && unfedAtTurnEnd(projectedState, playerID) > 0) buyFood();
    const unfed = unfedAtTurnEnd(projectedState, playerID);
    player.resources.food = Math.max(0, player.resources.food);
    if (unfed === 0) return false;
    expectedStarvationPopLoss += applyHunger(projectedState, playerID, unfed);
    return true;
  };
  // A riot spends the tokens and is charged what its table is expected to take. The
  // pops also leave the projected board, slaves first, once the expected losses add up
  // to a whole one: a level the slaves hold down recovers when enough of them are gone.
  let riotPopsOwed = 0;
  const faceRiot = (modifier = 0) => {
    const riot = expectedRiot(projectedState, playerID, weights, modifier);
    unrest.riotEvents += 1;
    unrest.riskPenalty += riot.cost;
    player.unrestTokens = 0;
    riotPopsOwed += riot.pops;
    // The small allowance keeps three riots of two thirds from rounding to one pop.
    const leaving = Math.floor(riotPopsOwed + 1e-9);
    riotPopsOwed -= leaving;
    return leaving > 0 && removePops(projectedState, playerID, leaving).total > 0;
  };
  // A collected income does not end the current year: calm and Blockade still
  // count at this turn's check, even when no future incomes remain.
  const checkTurnEnd = (outcome: UnrestOutcome, currentTurn = false) => {
    unrest.minimumHappiness = Math.min(unrest.minimumHappiness, outcome.level);
    const risk = evaluatePolicyUnrestRisk(projectedState, outcome);

    if (risk.tier === "revolt") {
      // A revolt draws no dice, so the projection runs it: the engine's outcome names
      // the slaves who leave, and the tokens clear. It is charged the slaves it takes,
      // at the seat's weight for a slave.
      unrest.revoltEvents += 1;
      const left = removePops(projectedState, playerID, outcome.leaving, ["slaves"]);
      unrest.riskPenalty += left.total * popValue(weights, "slaves");
      player.unrestTokens = 0;
      return true;
    }
    if (risk.tier === "unrest") return faceRiot();
    // No more income or draw precedes the current check. A safe level here has
    // no proximity penalty; later years still price their uncertain buffer.
    if (risk.tier === "buffer" && !currentTurn)
      unrest.riskPenalty +=
        POLICY_UNREST_WEIGHTS.bufferRiotShare *
        risk.proximity *
        expectedRiot(projectedState, playerID, weights).cost;
    return false;
  };

  // On a later turn the seat would also buy calm when its level stands at a line and
  // calm moves it off: once a year, the cheaper payment first by its weights, through
  // the engine's own action. Without this a slave past the standing level read as a
  // riot in every year of the forecast, whatever the seat held, so no realm kept more
  // slaves than its Temples and goods covered. Like the food, this turn's calm is the
  // seat's to buy. Returns the outcome the turn ends at.
  let calmOrder: CivicCalmPayment[] | null = null;
  const buyCalm = (outcome: UnrestOutcome) => {
    if (!buysLater || outcome.tier === "none") return outcome;
    calmOrder ??= [...CIVIC_CALM_PAYMENTS].sort(
      (a, b) =>
        worth(weights, getCivicCalmStatus(projectedState, playerID, a).cost ?? {}) -
        worth(weights, getCivicCalmStatus(projectedState, playerID, b).cost ?? {}),
    );
    const payment = calmOrder.find(
      (candidate) => getCivicCalmStatus(projectedState, playerID, candidate).can,
    );
    if (!payment) return outcome;
    // Tried on a copy of the seat first: calm bought that moves the realm off no line is
    // not bought.
    const trial = {
      ...projectedState,
      players: {
        ...projectedState.players,
        [playerID]: { ...player, resources: { ...player.resources } },
      },
      log: [],
    };
    civicCalm(trial, playerID, payment);
    const calmed = unrestOutcome(trial, playerID);
    if (calmed.tier === outcome.tier) return outcome;
    civicCalm(projectedState, playerID, payment);
    return calmed;
  };

  const expireYear = () => {
    projectedState.activeYearCard = null;
    player.calmActive = false;
    player.civicCalmUsedThisTurn = false;
    player.collectedThisTurn = false;
  };

  if (player.collectedThisTurn) {
    // Food short now is what this turn's end takes, unless the seat buys it back first.
    settleHunger(false);
    if (G.phase === "gameplay" && G.currentPlayer === playerID && !G.assembly) {
      // A riot already on the table is this turn's check, at the insurance bought so far.
      if (G.pendingRiot)
        faceRiot(insuranceRollBonus(G.pendingRiot.boughtInsurance, G.definition.content));
      else checkTurnEnd(unrestOutcome(projectedState, playerID), true);
    }
    expireYear();
  }

  // Pops on the move arrive before the seat's next income. Until then the checks above
  // read them as the engine does: counted for the level, out of hunger's reach.
  resolveArrivingPops(projectedState, playerID);

  // A Law a sitting strikes is gone from that year's income on: the sitting opens the
  // year, before anyone collects.
  const firstIncomeYear = G.year + (G.players[playerID].collectedThisTurn ? 1 : 0);
  let lawStands = fall !== null;
  const strike = (step: number) => {
    if (!lawStands || firstIncomeYear + step < fall!.year) return false;
    projectedState.activeLaws = projectedState.activeLaws.filter(
      (law) => law.cardId !== fall!.cardId,
    );
    lawStands = false;
    return true;
  };
  strike(0);

  let income = calculateIncome(projectedState, playerID);
  const nextIncome = { food: income.food, gold: income.gold };
  const activeEffects = getActiveEffects(projectedState, playerID, { income });
  const mechanics = activeEffects.flatMap((descriptor) => descriptor.mechanics);
  let suppressedCollections = mechanics.reduce(
    (total, mechanic) => total + (mechanic.type === "suppressIncome" ? mechanic.turns : 0),
    0,
  );

  let incomeStale = false;
  for (let step = 0; step < horizon; step += 1) {
    let popsChanged: boolean;

    if (suppressedCollections > 0) {
      suppressedCollections -= 1;
      player.incomeSuppressedTurns = Math.max(0, player.incomeSuppressedTurns - 1);
    } else {
      applyIncome(player.resources, income, projectedState.ruleset.economy.stockpileFloors);
    }

    // Income first; the turn then ends with hunger and the unrest check, in that order.
    popsChanged = settleHunger();
    popsChanged = checkTurnEnd(buyCalm(unrestOutcome(projectedState, playerID))) || popsChanged;
    // The next projected income is in another year. Its card is still hidden.
    const yearCardExpired = projectedState.activeYearCard !== null;
    expireYear();
    // Stocks and tokens do not affect printed income. Reuse the authoritative
    // result until hunger/revolt changes pops or this year's card expires.
    incomeStale = popsChanged || yearCardExpired;
    if (step + 1 < horizon && (strike(step + 1) || incomeStale)) {
      income = calculateIncome(projectedState, playerID);
      incomeStale = false;
    }
  }

  const resources = { ...player.resources };

  // Past the horizon only the food and what pays for it are followed, to the game's
  // last year: the closing income each year, the shortfall bought as above, and a pop
  // gone for each food the stocks cannot pay for. A pop that leaves stops eating; what
  // it made stays in the sum. Without this a seat grows an eater its gold feeds for
  // six years and loses him in the seventh. A pop lost that late is charged for the
  // incomes it misses and not as one lost today, so the seat still feeds the pops it
  // has for as long as it can pay.
  let starvedAfterHorizon = 0;
  const incomesLeft = incomesLeftInGame(G, playerID);
  const yearsBeyond = buysLater ? incomesLeft - horizon : 0;
  if (yearsBeyond > 0) {
    if (strike(horizon) || incomeStale) income = calculateIncome(projectedState, playerID);
    let mouths = hungerMouths(projectedState).reduce(
      (sum, pop) => sum + countPlayerPopType(projectedState, playerID, pop),
      0,
    );
    const carried = { ...income };
    for (let year = 0; year < yearsBeyond && carried.food < 0 && mouths > 0; year += 1) {
      applyIncome(player.resources, carried, projectedState.ruleset.economy.stockpileFloors);
      buyFood();
      const unfed = Math.min(mouths, Math.max(0, -player.resources.food));
      player.resources.food = Math.max(0, player.resources.food);
      starvedAfterHorizon += (unfed * (yearsBeyond - year)) / incomesLeft;
      mouths -= unfed;
      carried.food += unfed;
    }
  }

  return {
    resources,
    income: nextIncome,
    expectedStarvationPopLoss,
    starvedAfterHorizon,
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
    // Arrivals and the engine's purchases write log lines; keep them off the real log.
    log: [],
    // Later turns have nothing pending, so the engine's purchases are open in them.
    assembly: null,
    pendingPlayerEvent: null,
    pendingRiot: null,
    pendingHunger: null,
  };
}

/**
 * What one riot is expected to take from a realm, read off the engine's riot table:
 * every face of its die at equal odds, shifted by the insurance bought. `pops` is the
 * expected number lost. `cost` is the whole loss at the seat's weights: those pops at
 * the weight of the class the table takes next, a burned building at what the seat
 * would pay to raise one again, and the stocks at what the realm could hand over.
 */
function expectedRiot(
  G: HegemonyState,
  playerID: PlayerId,
  weights: ScoreWeights,
  modifier = 0,
): { pops: number; cost: number } {
  const table = getRiotTable(G.definition.content);
  const die = table.die ?? 6;
  const held = G.players[playerID].resources;
  const settlements = G.players[playerID].settlements.flatMap(
    (tileId) => getOwnedSettlement(G, tileId, playerID) ?? [],
  );
  const buildings = settlements.flatMap((settlement) => settlement.buildings);
  let pops = 0;
  let cost = 0;

  for (let roll = 1; roll <= die; roll += 1) {
    const modified = Math.min(die, Math.max(1, roll + modifier));
    const row = table.rows.find((candidate) => candidate.roll === modified) ?? table.rows.at(-1)!;
    for (const effect of row.effects) {
      if (effect.type === "losePops") pops += effect.count / die;
      if (effect.type === "destroyBuilding") {
        // The table burns one building at random: the mean price of those standing.
        if (buildings.length === 0) pops += effect.popLossFallback / die;
        else
          cost +=
            buildings.reduce((sum, id) => sum + buildingPrice(G, playerID, weights, id), 0) /
            buildings.length /
            die;
      }
      if (effect.type === "loseResource") {
        const floor = G.ruleset.economy.stockpileFloors[effect.resource] ?? 0;
        const paid = Math.min(effect.amount, Math.max(0, held[effect.resource] - floor));
        cost += (paid * stockValue(weights, effect.resource)) / die;
        if (paid < effect.amount) pops += (effect.popLossIfShort ?? 0) / die;
      }
    }
  }

  const taken = TABLE_LOSS_ORDER.find((pop) =>
    settlements.some((settlement) => settlement.pops[pop] > 0),
  );
  return { pops, cost: cost + (taken ? pops * popValue(weights, taken) : 0) };
}

/** What the seat would pay to raise a building again, at its weights. */
function buildingPrice(
  G: HegemonyState,
  playerID: PlayerId,
  weights: ScoreWeights,
  buildingId: BuildingId,
): number {
  const price = getAdjustedActionCost(
    G,
    playerID,
    "buildBuilding",
    getBuilding(G.definition.content, buildingId)?.cost ?? {},
    buildingId,
  );
  return (Object.keys(price) as Resource[]).reduce(
    (sum, resource) => sum + (price[resource] ?? 0) * stockValue(weights, resource),
    0,
  );
}

/**
 * Named strategic weights for unrest exposure. A riot and a revolt are charged what
 * they take ({@link expectedRiot}, and the slaves a revolt sends away). What stays a
 * heuristic is the risk of standing near the riot line.
 */
export const POLICY_UNREST_WEIGHTS = {
  /**
   * A level one step above the riot line is charged this share of a riot at each
   * projected turn end, and less with each step further off. It stands for the chance
   * that a token card or a lost good pushes the level over the line: the projection
   * deals no cards. A fifth is the share the old flat numbers gave it, 10 against 50.
   */
  bufferRiotShare: 0.2,
} as const;

export type PolicyUnrestRisk = {
  tier: "safe" | "buffer" | "unrest" | "revolt";
  /** How near a level above the riot line stands to it: 1 at the line, 0 a buffer's
   *  width (the gap between the two lines) away. */
  proximity: number;
};

/**
 * Classify one projected turn end from the engine's outcome there: the riot and the
 * revolt are its tier, and above them the buffer reads the live ruleset lines. The
 * projection prices the tier: a riot at its table's expected loss, a revolt at the
 * slaves it takes, and the buffer as a share of a riot.
 */
export function evaluatePolicyUnrestRisk(
  G: HegemonyState,
  { tier, level }: UnrestOutcome,
): PolicyUnrestRisk {
  if (tier !== "none") return { tier: tier === "riot" ? "unrest" : "revolt", proximity: 1 };

  const unrest = G.ruleset.economy.unrest;
  const bufferWidth = Math.max(1, unrest.riotThreshold - unrest.revoltThreshold);
  const proximity = Math.max(0, 1 - (level - unrest.riotThreshold) / bufferWidth);
  return { tier: proximity > 0 ? "buffer" : "safe", proximity };
}

/** Score per point of the standing level: one for each year of the horizon the
 *  point holds. */
const LEVEL_WEIGHT = INCOME_HORIZON;
/** How far past Beloved's minimum the standing level is still worth something. */
const LEVEL_CAP_MARGIN = 2;

/** The standing level past which more happiness buys nothing. */
function levelCap(G: HegemonyState): number {
  return G.ruleset.victory.minimums.happiness + LEVEL_CAP_MARGIN;
}

/**
 * What the standing level is worth, calm left out as Beloved leaves it out. Capped a
 * little past Beloved's minimum: below the cap it prices the card and distance from
 * the riot line, and past it more happiness buys nothing. The unrest risk term prices
 * the lines themselves.
 */
function levelValue(G: HegemonyState, playerID: PlayerId, weight = LEVEL_WEIGHT): number {
  return weight * Math.min(standingHappiness(G, playerID), levelCap(G));
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
function evaluate(G: HegemonyState, playerID: PlayerId): number {
  const projection = projectPolicyHorizon(G, playerID);
  const projected = projection.resources;

  const standings = playerStandings(G, playerID);
  const material = projected.wood + projected.stone + projected.gold + projected.food;
  const materialDivisor = Math.max(1, G.ruleset.victory.minimums.gold / 3);
  const heuristic =
    5 * standings.cities +
    3 * standings.colonies +
    standings.pops +
    totalPops(popsInTransit(G, playerID)) +
    Math.floor(material / materialDivisor) -
    2 * (projection.expectedStarvationPopLoss + projection.starvedAfterHorizon);
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
/** A slave with no slot to work carries this share of the slave weight. It is still a
 *  head for Demos and the tiebreak, and can be moved or promoted, but it makes nothing
 *  and costs the level like any other. At the full weight an idle slave was worth as
 *  much as a working one, so nothing paid for moving it to an open slot. */
const IDLE_SLAVE_SHARE = 0.5;

/**
 * Each food the seat is short of right now costs this much, on top of the pop the
 * forecast sees leave. The forecast counts pops lost and not when. So a seat whose gold
 * cannot feed everyone through the forecast would let a pop go now and keep the gold
 * for the others, and a pop that leaves in a later year anyway would not be fed today.
 * A seat that can pay feeds its pops first: from zero food the search can reach the
 * slave that would feed them, and from six short it cannot. The charge has to outweigh
 * one more pop lost later and the dearest food a build can buy, the civic's Dole at 9.
 * Nothing is held ahead of need: food is below zero only on the seat's own turn, after
 * income, and that is when it buys.
 */
const FOOD_SHORT_WEIGHT = HEURISTIC_SCALE * STARVED_POP_WEIGHT + 14;

/** What a lean year stops: the food, or the gold that buys it. */
const LEAN_RESOURCES: Resource[] = ["food", "gold"];

/** The share of the year deck that brings a lean year: Drought stops the plains' food
 *  and Piracy the freemen's gold. The deck's order is hidden; its make-up is not. */
function leanYearChance(G: HegemonyState): number {
  const cards = G.definition.content.yearCards;
  const lean = cards.reduce((count, card) => {
    const { effect } = card;
    const column =
      effect.type === "zeroTerm" && effect.term !== "luxuryHappiness"
        ? YEAR_TERM_COLUMNS[effect.term]
        : null;
    return column && LEAN_RESOURCES.includes(column.resource) ? count + card.count : count;
  }, 0);
  return lean / Math.max(1, yearDeckSize(G));
}

/**
 * What a lean year is expected to cost a realm that buys its food and holds nothing
 * back. Such a realm pays for its standing shortfall out of each year's income, and in
 * a lean year the harvest or the gold does not come. It needs one year's purchases in
 * hand: each food of the shortfall its stocks could not cover is a pop gone, weighted
 * by the chance of such a year. The cover is whatever would pay, food in store or the
 * gold and influence that buy it, so nothing is parked in food. A realm its own land
 * feeds is charged nothing.
 *
 * Without this a build that imports spends its last gold every turn: in the batch
 * that showed it, the trader lost pops on 44 turns and could pay on none of them.
 */
function leanYearValue(
  G: HegemonyState,
  playerID: PlayerId,
  income: PolicyProjection["income"],
  weights: ScoreWeights,
): number {
  const shortfall = -income.food;
  if (shortfall <= 0 || G.phase !== "gameplay" || incomesLeftInGame(G, playerID) === 0) return 0;
  const eaters = hungerMouths(G);
  const mouths = eaters.reduce((sum, pop) => sum + countPlayerPopType(G, playerID, pop), 0);

  const cover = Math.max(0, G.players[playerID].resources.food) + foodCover(G, playerID, weights);
  const uncovered = Math.min(mouths, shortfall - cover);
  if (uncovered <= 0) return 0;

  return (
    -leanYearChance(G) *
    uncovered *
    (HEURISTIC_SCALE * STARVED_POP_WEIGHT + popValue(weights, eaters[0]))
  );
}

function foodShortfallValue(G: HegemonyState, playerID: PlayerId): number {
  return -FOOD_SHORT_WEIGHT * Math.max(0, -G.players[playerID].resources.food);
}

function evaluateSmart(
  G: HegemonyState,
  playerID: PlayerId,
  weights = DEFAULT_WEIGHTS,
  wants: Want[] = NO_WANTS,
  risks: LawRisk[] = NO_RISKS,
): number {
  const player = G.players[playerID];

  // Pops on the move are still the realm's. Left out, a move reads as a pop lost.
  // A slave on the move is counted below, where it is going: it works there or sits idle.
  const moving = popsInTransit(G, playerID);
  let cities = 0;
  let colonies = 0;
  let weightedPops =
    weights.pops.citizens * moving.citizens + weights.pops.freemen * moving.freemen;
  let latentWork = 0;

  for (const tileId of player.settlements) {
    const tile = getTile(G, tileId);
    const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);
    if (!tile || !settlement) {
      continue;
    }

    // Slaves fill the open slots of land that yields; the rest are idle.
    const primary = settlementSlaveResource(tile, G);
    const slots = primary ? settlementOpenSlots(tile, settlement, G) : 0;
    const slaves = settlement.pops.slaves + popsInTransitTo(G, settlement.id).slaves;
    const working = Math.min(slaves, slots);

    weightedPops +=
      weights.pops.citizens * settlement.pops.citizens +
      weights.pops.freemen * settlement.pops.freemen +
      weights.pops.slaves * (working + IDLE_SLAVE_SHARE * (slaves - working));

    if (settlement.kind === "colony") {
      colonies += 1;
    } else {
      cities += 1;
    }

    // Work a slave could still take up: open slots nobody works, each priced as the
    // slave who could work it. A building spends one of them, so it costs one of the
    // tile's resource a turn. A colony cannot build, so its spare slots count only as
    // far as it has room for the slaves.
    if (primary) {
      const room = settlementRoom(G, settlement);
      latentWork +=
        Math.max(0, Math.min(slots - working, room)) *
        weights.materials[primary] *
        incomeYearsLeft(G, playerID);
    }
  }

  const victory = SMART_VICTORY_CARD_VALUE * victoryCardsHeld(G, playerID);
  const level = levelValue(G, playerID, weights.level);
  // A good's +2 is already priced by the level term, point for point with a Temple.
  // This adds what that term cannot see: a good keeps its worth past the level cap,
  // where Beloved is decided, and a good claimed is one no rival can claim.
  const luxuryValue = weights.luxury * ownedClaims(G, playerID).length;
  const shortfall = foodShortfallValue(G, playerID);
  const opportunity = ideaOpportunityValue(G, playerID, weights);

  // The score where the forecast keeps the standing Laws, or strikes the one `fall` names.
  const scoreWith = (fall: LawFall | null) => {
    const projection = projectPolicyHorizon(G, playerID, undefined, weights, fall);
    const projected = projection.resources;
    const material =
      weights.materials.food * projected.food +
      weights.materials.wood * projected.wood +
      weights.materials.stone * projected.stone +
      weights.materials.gold * projected.gold;

    const heuristic =
      weights.cities * cities +
      weights.colonies * colonies +
      weightedPops +
      (material + latentWork) / MATERIAL_DIVISOR -
      STARVED_POP_WEIGHT * (projection.expectedStarvationPopLoss + projection.starvedAfterHorizon);

    return (
      victory +
      HEURISTIC_SCALE * heuristic +
      level +
      weights.influence * projected.influence +
      luxuryValue +
      shortfall +
      leanYearValue(G, playerID, projection.income, weights) +
      opportunity +
      savingValue(G, playerID, wants, projected) -
      projection.unrest.riskPenalty
    );
  };

  // Each Law the next sitting may strike moves the score toward the future without it,
  // by the chance it falls.
  const standing = scoreWith(null);
  return risks.reduce(
    (sum, { fall, chance }) => sum + chance * (scoreWith(fall) - standing),
    standing,
  );
}

// ── Saving toward a purchase ─────────────────────────────────────────────────────────
//
// The search plans inside one turn and the score counts a stock at a flat weight, so
// nothing told a seat that wood it cannot spend today is a Granary in four years. Four
// masters cut 0.2 wood a turn, sold two fifths of their stone to the bank, built 0.8
// Granaries a game and stood at four settlements from year 2. A want is a purchase
// the seat could make if it held the materials. A state is worth the best want its
// stocks and their income are on course to pay for, for the share of the forecast the
// purchase would then stand.

/** A purchase open to the seat, paid for or not. */
type Want = {
  command: Extract<GameCommand, { type: "buildBuilding" | "upgradeColonyToCity" | "foundColony" }>;
  cost: Partial<Resources>;
  /** What buying it adds to the seat's score, its price at the flat weights taken off. */
  gain: number;
};
const NO_WANTS: Want[] = [];

/** The materials a seat saves. Food is bought as it is needed. */
const SAVED: Resource[] = ["wood", "stone", "gold"];
/** More of each material than any purchase costs, to list what a full store could buy. */
const FULL_STORE = 99;

function withStocks(G: HegemonyState, playerID: PlayerId, add: Partial<Resources>): HegemonyState {
  const player = G.players[playerID];
  const resources = { ...player.resources };
  for (const resource of Object.keys(add) as Resource[]) resources[resource] += add[resource] ?? 0;
  return { ...G, players: { ...G.players, [playerID]: { ...player, resources } } };
}

/** The seat with a full store: what it could buy, the price set apart. */
function withFullStore(G: HegemonyState, playerID: PlayerId): HegemonyState {
  return withStocks(G, playerID, {
    wood: FULL_STORE,
    stone: FULL_STORE,
    gold: FULL_STORE,
    food: FULL_STORE,
  });
}

/**
 * The buildings, upgrades and colonies the seat could buy with a full store, each with
 * what it would add to `score`, the largest gain first. What it can pay for now is
 * listed too: the wood a second colony spends is the wood a Granary was waiting for,
 * and where that colony stands decides whether more comes. The gain is measured where
 * the seat holds the price and no more: with a full store a Granary would feed pops the
 * spare food already fed. One colony is weighed per tile, sent the pop the seat weighs
 * least.
 */
function purchaseWants(G: HegemonyState, me: PlayerId, score: Scorer, weights: ScoreWeights) {
  const held = G.players[me].resources;
  const full = withFullStore(G, me);
  const colonies = new Map<string, Omit<Want, "gain">>();
  const purchases: Array<Omit<Want, "gain">> = [];
  for (const { command, cost = {} } of enumerateLegalOptions(full, me)) {
    if (command.type === "buildBuilding" || command.type === "upgradeColonyToCity")
      purchases.push({ command, cost });
    if (command.type === "foundColony") {
      const sent = colonies.get(command.tileId)?.command;
      if (
        sent?.type !== "foundColony" ||
        popValue(weights, command.pop) < popValue(weights, sent.pop)
      )
        colonies.set(command.tileId, { command, cost });
    }
  }

  const wants: Want[] = [];
  let unspent: number | null = null;
  for (const { command, cost } of [...purchases, ...colonies.values()]) {
    const short: Partial<Resources> = {};
    let paid = true;
    for (const resource of Object.keys(cost) as Resource[]) {
      short[resource] = Math.max(0, (cost[resource] ?? 0) - held[resource]);
      if (short[resource]) paid = false;
    }
    const before = paid ? G : withStocks(G, me, short);
    const bought = transition(G.definition, before, me, command);
    if (!bought.ok) continue;
    const gain = score(bought.state, me) - (paid ? (unspent ??= score(G, me)) : score(before, me));
    if (gain > 0) wants.push({ command, cost, gain });
  }
  return wants.sort((a, b) => b.gain - a.gain);
}

/**
 * What the seat is saving toward: the best want still open, counted for the years of
 * the forecast left once its price is in hand. A want bought this turn is in the score
 * itself, so one still open waits a year at least, and buying is always worth more
 * than holding the price. A material the realm is short of and makes none of puts the
 * want out of reach.
 */
function savingValue(
  G: HegemonyState,
  playerID: PlayerId,
  wants: Want[],
  projected: Resources,
): number {
  if (wants.length === 0) return 0;
  const years = incomeYearsLeft(G, playerID);
  const held = G.players[playerID].resources;
  let full: HegemonyState | null = null;
  let best = 0;

  for (const { command, cost, gain } of wants) {
    // The gains fall from here: a year off, none of the rest beats the best so far.
    if (gain * (years - 1) <= best * years) break;
    // Still open here, by the engine's own check with the price set apart. A pending
    // decision closes every want, as it closes the actions.
    full ??= withFullStore(G, playerID);
    const open =
      command.type === "buildBuilding"
        ? getBuildBuildingStatus(
            full,
            playerID,
            command.tileId,
            command.buildingId,
            command.claimVertexId,
          ).can
        : command.type === "upgradeColonyToCity"
          ? getUpgradeColonyToCityStatus(full, playerID, command.tileId).can
          : getFoundColonyStatus(full, playerID, command.tileId).can;
    if (!open) continue;

    let wait = 1;
    for (const resource of SAVED) {
      const short = (cost[resource] ?? 0) - held[resource];
      if (short <= 0) continue;
      const yearly = (projected[resource] - held[resource]) / years;
      wait = yearly > 0 ? Math.max(wait, Math.ceil(short / yearly)) : Infinity;
    }
    if (wait < years) best = Math.max(best, (gain * (years - wait)) / years);
  }
  return best;
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
  const byRule = resolveRiotByRule(G, moves, score);
  if (byRule) {
    return byRule;
  }

  const endTurn = moves.find((move) => move.type === "endTurn");

  // A forced position (a pending event: no endTurn) is a single required choice — fall back
  // to one-ply rather than beam-plan past a resolution whose effects may be stochastic.
  if (!endTurn) {
    return onePlyLookahead(G, moves, score);
  }

  const rootMoves = searchable(G, moves);
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
  const best = beamSearch(G, rootMoves, evaluation, soleRootOutcomes);
  return best.firstMove ?? endTurn;
}

type SearchEvaluation = ReturnType<typeof searchEvaluation>;

/** The best the beam reaches from `G`, `rootMoves` first: the first move of its line
 *  (null when nothing beats `G` itself) and the score it ends at. */
function beamSearch(
  G: HegemonyState,
  rootMoves: GameCommand[],
  evaluation: SearchEvaluation,
  soleRootOutcomes: SearchOutcome[] | null = null,
): { firstMove: GameCommand | null; score: number } {
  const playerID = G.currentPlayer;
  type Node = { state: HegemonyState; firstMove: GameCommand | null; score: number };
  const rootScore = evaluation.valueOf(G);
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
        depth === 0
          ? rootMoves
          : searchable(node.state, enumerateLegalCommands(node.state, playerID));
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

  return best;
}

/**
 * The turn-planning bot: a within-turn beam search over {@link evaluateSmart}, so it values
 * the within-turn sequences one-ply misses (build-then-promote and bank chains).
 * It cannot intentionally save across turns because endTurn is not a search branch.
 * Same scoring as `smart`, deeper search — so a smart-vs-beam A/B isolates search depth.
 */
export const beamPolicy = searchPolicy("beam", (G, moves) =>
  beamPlan(
    G,
    moves,
    facingRepeals(G, (state, player, risks) =>
      evaluateSmart(state, player, DEFAULT_WEIGHTS, NO_WANTS, risks),
    ),
  ),
);

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
    // A tile is worth the slaves it can put to work: its slots, where a slave makes
    // something under the standing Laws (a hill does under Land Reform).
    const amount = settlementSlaveResource(tile, G) ? tile.slots : 0;
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
 *  realized claim's value the capital abandoned the scenario board's food-10
 *  breadbasket for a mooring, which trades certain income for an option. Sized
 *  like a good frontier tile instead — it breaks ties toward the coast and no
 *  more; the A/B campaigns own the fine tuning. */
const LUXURY_REACH_WEIGHT = 6;

/** A founding colony beside a city can never become one: the engine forbids adjacent
 *  cities. A site that keeps the upgrade open is worth a little. Sized like a good
 *  frontier tile, it decides between comparable sites and no more. */
const UPGRADE_SITE_WEIGHT = 6;

/** The placement score: `smart`'s economy plus the bounded frontier, minus one for each
 *  contested tile (half the default frontier weight, so a contested tile still counts for
 *  something; measured by the opening A/B in docs/archive/plans/policy-placement.md),
 *  plus the luxury claims a city on this site could reach and the colonies that
 *  could still be upgraded. Once the pops sit on the tile, the income projection IS the
 *  site score, so no bespoke site heuristic is needed; coast access shows up through the
 *  leapfrog frontier. */
export function evaluatePlacement(
  G: HegemonyState,
  playerID: PlayerId,
  weights = DEFAULT_WEIGHTS,
): number {
  const { frontier, contested } = placementFrontier(G, playerID);
  return (
    evaluateSmart(G, playerID, weights) +
    weights.frontier * frontier -
    contested +
    ((LUXURY_REACH_WEIGHT * weights.luxury) / DEFAULT_WEIGHTS.luxury) *
      luxuryClaimReach(G, playerID) +
    ((UPGRADE_SITE_WEIGHT * weights.cities) / DEFAULT_WEIGHTS.cities) *
      upgradableColonies(G, playerID)
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

const PLACE: Record<Placement["type"], typeof placeColony> = {
  placeCapital,
  placeCity,
  placeColony,
};

/**
 * A placement scored where it lands, before the setup turn moves on. Without an Idea
 * draft the last placement's transition also opens year 1: the year's card, the seat's
 * first income, and the gameplay forecast, which buys food and follows hunger to the
 * game's last year. Setup's forecast does neither. Scored there, seat 0's colony saw a
 * stone site starve in year 7 that no other seat's forecast reached, and seat 0 took a
 * second plains in 37 of 40 games while the other seats took stone or wood.
 */
function placementForEval(
  G: HegemonyState,
  playerID: PlayerId,
  move: Placement,
): HegemonyState | null {
  const placed = { ok: false };
  const state = produce(G, (draft) => {
    placed.ok = PLACE[move.type](draft, playerID, move.tileId, move.pops).ok;
  });
  return placed.ok ? state : null;
}

function scorePlacements(
  G: HegemonyState,
  moves: GameCommand[],
  weights: ScoreWeights,
): { move: GameCommand; score: number }[] {
  const playerID = G.currentPlayer;
  const scored: { move: GameCommand; score: number }[] = [];

  for (const move of moves) {
    if (!(move.type in PLACE)) continue;
    const state = placementForEval(G, playerID, move as Placement);
    if (state) scored.push({ move, score: evaluatePlacement(state, playerID, weights) });
  }

  return scored;
}

/**
 * One-ply over the legal placements. A capital is chosen in two passes: rank tiles by
 * their most even pop split, then score every split on the top few tiles. A founding
 * colony is scored on every split of every tile. Exact ties are broken with the injected
 * rng so symmetric sites and compositions do not always resolve to the lowest tile id.
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

  // The founding colony skips the shortlist. Ranked on the even split alone, a tile
  // worth two slaves fell out of the top three, and with it most of the open sites the
  // upgrade term favours: the colony then went beside a city on a worse score.
  let candidates: GameCommand[] = moves;
  if (G.phase !== "setupColony" && byTile.size > PLACEMENT_TOP_TILES) {
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
// A Law's payoff sits beyond any affordable search (draw now → propose → rivals vote
// across the round → reap it over many turns), so every non-random bot plays the agora
// by the heuristic below rather than blind search. It rests on a DIFFERENTIAL lens (my
// gain minus the STRONGEST rival's, so "does this hurt me, help me, or help a rival
// more?"). `political` adds a political-position term to its score outside a sitting.
// Same `evaluateSmart` spine, so a political-vs-smart A/B isolates that term. See
// docs/archive/plans/influence-aware-ai.md.

function playerIds(G: HegemonyState): PlayerId[] {
  return Object.keys(G.players) as PlayerId[];
}

/**
 * The political bot's positional score: the smart economy plus its agora standing, its
 * standing authored Laws (its progress toward Voice). Progress matters, but it is not
 * itself a victory card. The actual threshold crossing is already worth a full card in
 * `evaluateSmart`; overpricing every preliminary pass made political seats reject
 * virtually every rival-authored public good and left Voice mechanically present but
 * strategically unreachable.
 */
function scorePolitical(
  G: HegemonyState,
  playerID: PlayerId,
  weights = DEFAULT_WEIGHTS,
  wants = NO_WANTS,
  risks = NO_RISKS,
): number {
  return (
    evaluateSmart(G, playerID, weights, wants, risks) +
    weights.politics * victoryMetricValue(G, playerID, "voice")
  );
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
 * (guard the front-runner, not the field), plus what the leading rival loses.
 * > 0 wants it, < 0 opposes it, ≈ 0 neutral.
 */
export function competitiveDelta(
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
  // rival a winning title scored only its prize. Count the leader's loss for me. An
  // untouched leader adds nothing, so my own gain is counted once.
  const leader = rivals.reduce((a, b) => (before[b] > before[a] ? b : a));
  const leaderLoss = Math.min(0, gains[rivals.indexOf(leader)]);
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
const REPEAL_THRESHOLD = 12; // repeal (3 influence) only a standing Law that is clearly hostile
const BRIBE_MAGNITUDE = 8; // buy votes only when the outcome genuinely swings the race
// A repeated legislature needs room for coalitions: support a measure that is only
// modestly better for its author, while still blocking material harm and Voice-clinching
// swings. This roughly covers one preliminary Voice tick plus a normal author prize.
const VOTE_COALITION_TOLERANCE = 12;
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
  const setAside = session?.setAside[me];
  if (setAside) knownOutsideDeck.add(setAside);
  const proposal = session?.proposals[me];
  if (proposal?.kind === "enact") knownOutsideDeck.add(proposal.card.id);

  return getResolutionCards(G.definition.content).filter(
    (card) => card.politician === politician && !knownOutsideDeck.has(card.id),
  );
}

/** Play the agora by heuristic instead of blind search. `moves` are the acting seat's
 *  (`me`) options for the live phase. */
function resolveAssemblyByHeuristic(
  G: HegemonyState,
  session: AssemblySession,
  moves: GameCommand[],
  me: PlayerId,
  weights: ScoreWeights,
  score: Scorer = scorePolitical,
): GameCommand {
  if (session.phase === "closing") {
    return moves.find((move) => move.type === "assemblyClose") ?? moves[0];
  }

  if (session.phase === "voting") {
    return chooseVote(G, session, moves, me, score);
  }

  // Proposal (async): take a counter that pays, then fish/repeal/pass while
  // empty-handed, then propose or discard, then Ready. Short of the influence for the
  // speech it wants, or of the price of the votes it plans to buy, the seat offers for
  // it first, once a sitting.
  const counter = moves.some((move) => move.type === "tradeSettle")
    ? takeCounter(G, moves, me, tradeScorer(G, me, weights).score)
    : null;
  const answered = counter ?? withdrawAnswered(G, moves, me);
  if (answered) return answered;
  if (session.proposalDone[me]) {
    return (
      voteOffer(G, session, me, score, weights) ??
      moves.find((move) => move.type === "assemblyReady") ??
      moves[0]
    );
  }
  const held = session.held[me];
  if (held) {
    return chooseProposeOrDiscard(G, held.card, moves, me, score);
  }
  return (
    speechOffer(G, session, me, score, weights) ??
    chooseDrawRepealOrPass(G, session, moves, me, score)
  );
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
    const { yea, nay } = projectedPlainVote(G, item, before, score);
    // Whether the vote goes this seat's way with `bought` more votes on its side.
    const goesMyWay = (bought: number) =>
      assessment.yea ? wouldPass(G, yea + bought, nay) : !wouldPass(G, yea, nay + bought);
    if (!goesMyWay(0) && goesMyWay(votesLeftToBuy(G, me))) {
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
  item: BallotItem,
  before: Scores,
  score: Scorer,
): { yea: number; nay: number } {
  const outlook = voteOutlook(G)!;
  let { yea, nay } = outlook;

  for (const { playerID, weight } of [outlook.caster, ...outlook.rest]) {
    if (assessVote(G, before, item, playerID, score).yea) yea += weight;
    else nay += weight;
  }

  return { yea, nay };
}

// ── The next sitting ─────────────────────────────────────────────────────────────────
//
// A Law can be repealed at any sitting after the one that follows its own, and a realm
// a Law feeds has to be ready before that sitting, not after it. The trader grew
// freemen Grain Levy fed, kept its income in gold, which buys no food without a bank,
// and starved when the Law fell: about 370 of the 857 pops it lost to hunger on the
// 2026-10-26 balance check's mixed table. So a seat reads, for each Law the next sitting
// may strike, whether a seat would file its repeal and whether it would carry, as this
// handler would play both, and scores its turn in both futures (see evaluateSmart).
// What a Law's fall costs is the engine's to say: no Law is named here.

/** A standing Law the forecast strikes from the incomes of a sitting's year on. */
export type LawFall = { cardId: string; year: number };
/** A Law the next sitting may strike, and the chance it does. */
type LawRisk = { fall: LawFall; chance: number };
const NO_RISKS: LawRisk[] = [];
/** The chance of a repeal the bought votes decide. They are bought in the open, in
 *  vote order, so who buys enough cannot be read off the board. */
const CONTESTED_REPEAL = 0.5;
type RiskScorer = (state: HegemonyState, player: PlayerId, risks: LawRisk[]) => number;

/** `score` for the acting seat, with the Laws the next sitting may strike. */
function facingRepeals(G: HegemonyState, score: RiskScorer): Scorer {
  const me = G.currentPlayer;
  const risks = lawRisks(G, me);
  return (state, player) => score(state, player, player === me ? risks : NO_RISKS);
}

/**
 * The standing Laws the next sitting may strike, each with its chance, as `me` reads
 * them. A seat, `me` included, files the repeal it values most, past
 * {@link REPEAL_THRESHOLD}, when it will hold the influence for the speech: what it
 * holds and a year's influence income for each year until the sitting. That counts this
 * year's income for a seat that has already collected it, so the forecast leans toward
 * the repeal. A seat that will move a repeal readies for it too: in the 2026-10-27 run
 * of seed 1000 the civic was four food short the year Grain Levy fell. Every seat then votes
 * by this handler's rule, and the seats other than `me` buy votes where the outcome
 * moves them by {@link BRIBE_MAGNITUDE}. The seat's own bought votes are left out:
 * they are its answer at the sitting, and a forecast that counted them would let it
 * spend that gold now. A repeal that carries, or falls, whatever is bought is certain;
 * one the bought votes decide is {@link CONTESTED_REPEAL}. Every seat is read by the
 * public political score, as personalities are hidden.
 */
function lawRisks(G: HegemonyState, me: PlayerId): LawRisk[] {
  const year = nextAssemblyYear(G);
  if (year === null || G.assembly || G.phase !== "gameplay") return NO_RISKS;
  const exposed = repealableLawIds({ ...G, year });
  if (exposed.length === 0) return NO_RISKS;

  const seats = playerIds(G);
  const toWin = G.ruleset.victory.cardsToWin;
  const before = scoreEveryone(G, scorePolitical);
  const struck = exposed.map((cardId) => {
    const state = { ...G, activeLaws: G.activeLaws.filter((law) => law.cardId !== cardId) };
    const scores = scoreEveryone(state, scorePolitical);
    const known: Scorer = (scored, player) =>
      scored === state ? scores[player] : scorePolitical(scored, player);
    return {
      cardId,
      scores,
      // What the repeal is worth to each seat, by this handler's lens.
      worth: Object.fromEntries(
        seats.map((seat) => [seat, competitiveDelta(before, state, seat, known)]),
      ) as Scores,
      winners: seats.filter(
        (seat) => victoryCardsHeld(G, seat) < toWin && victoryCardsHeld(state, seat) >= toWin,
      ),
    };
  });

  const filers = new Map<string, PlayerId>();
  for (const seat of seats) {
    const influence =
      G.players[seat].resources.influence +
      Math.max(0, calculateIncome(G, seat).influence) * (year - G.year);
    if (influence < G.ruleset.assembly.repealCost) continue;
    const filed = bestOf(struck, (law) => law.worth[seat] - REPEAL_THRESHOLD);
    if (filed) filers.set(filed.cardId, seat);
  }

  return struck.flatMap((law) => {
    const filer = filers.get(law.cardId);
    if (!filer) return [];
    let yea = 0;
    let nay = 0;
    let yeaBought = 0;
    let nayBought = 0;
    for (const seat of seats) {
      const gain = seat === filer ? law.worth[seat] : law.scores[seat] - before[seat];
      const votes = baseVoteWeight(G, seat);
      const bought =
        seat !== me && Math.abs(law.worth[seat]) >= BRIBE_MAGNITUDE ? votesLeftToBuy(G, seat) : 0;
      if (!law.winners.some((winner) => winner !== seat) && gain >= -VOTE_COALITION_TOLERANCE) {
        yea += votes;
        yeaBought += bought;
      } else {
        nay += votes;
        nayBought += bought;
      }
    }
    const plain = wouldPass(G, yea, nay);
    const chance =
      plain === wouldPass(G, yea + yeaBought, nay + nayBought) ? Number(plain) : CONTESTED_REPEAL;
    return chance > 0 ? [{ fall: { cardId: law.cardId, year }, chance }] : [];
  });
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

  // Propose only when the private prize or progress beats a merely neutral Law.
  if (best && bestDelta > 0) {
    return best;
  }
  // Not worth it (would help a rival more, or nothing to gain) — never gift the agora.
  return (
    moves.find((move) => move.type === "assemblyDiscardHeld") ??
    moves.find((move) => move.type === "assemblyPass") ??
    moves[0]
  );
}

/** A repeal or a draw, with what it is worth to the seat and its price in influence. */
type Speech = { move: GameCommand; value: number; cost: number };

/**
 * The speech the seat wants among `moves`: a strong repeal is a concrete gain and
 * beats a gamble; else a draw worth making; else none. Its price is not checked, so a
 * seat can also ask what it would say with the influence for it.
 */
function wantedSpeech(
  G: HegemonyState,
  session: AssemblySession,
  moves: GameCommand[],
  me: PlayerId,
  score: Scorer,
): Speech | null {
  const before = scoreEveryone(G, score);

  // The most valuable hostile-Law repeal on offer.
  let repeal: Speech | null = null;
  for (const move of moves) {
    if (move.type !== "assemblyProposeRepeal") {
      continue;
    }
    const value = deltaIfEnacted(
      G,
      before,
      { kind: "repeal", cardId: move.cardId, proposer: me },
      me,
      score,
    );
    if (!repeal || value > repeal.value)
      repeal = { move, value, cost: G.ruleset.assembly.repealCost };
  }
  if (repeal && repeal.value > REPEAL_THRESHOLD) return repeal;

  // Only standing authored Laws advance Voice. Compare each deck's full
  // unordered composition, including its prize and the best rival target/replacement,
  // so Stratokles is a real comeback line without peeking at the shuffled top card.
  let draw: Speech | null = null;
  for (const move of moves) {
    if (move.type !== "assemblyDraw") {
      continue;
    }
    const cost = nextDrawCost(G);
    const value =
      expectedDeckDelta(G, before, move.politician, me, score) +
      drawPaymentDelta(G, me, cost, score);
    if (!draw || value > draw.value) draw = { move, value, cost };
  }
  return draw && draw.value > 0 && (session.draws[me] ?? 0) < MAX_DRAWS ? draw : null;
}

function chooseDrawRepealOrPass(
  G: HegemonyState,
  session: AssemblySession,
  moves: GameCommand[],
  me: PlayerId,
  score: Scorer,
): GameCommand {
  const speech = wantedSpeech(G, session, moves, me, score);
  if (speech && G.players[me].resources.influence >= speech.cost) return speech.move;
  return moves.find((move) => move.type === "assemblyPass") ?? moves[0];
}

export const politicalPolicy = searchPolicy("political", (G, moves) =>
  onePlyLookahead(
    G,
    moves,
    facingRepeals(G, (state, player, risks) =>
      scorePolitical(state, player, DEFAULT_WEIGHTS, NO_WANTS, risks),
    ),
  ),
);

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
export function frontierValue(G: HegemonyState, playerID: PlayerId): number {
  // No colony piece left, no frontier to settle: the engine refuses the founding. An
  // upgrade frees a piece and brings the frontier back.
  if (playerPieces(G, playerID).coloniesRemaining === 0) return 0;
  // Unclaimed goods make their two claim tiles worth expanding toward — the
  // contested-claim race is won at settlement time, turns before a Port can go up.
  const luxuryTiles = new Set(
    G.board.luxuries.filter((asset) => asset.owner === null).flatMap((asset) => asset.tileIds),
  );
  let value = 0;

  for (const tile of G.board.tiles) {
    if (canPlaceColonyOnTile(G, playerID, tile).can) {
      value +=
        (settlementSlaveResource(tile, G) ? tile.slots : 0) +
        (luxuryTiles.has(tile.id) ? LUXURY_FRONTIER_PULL : 0);
    }
  }

  return value;
}

/** How strongly an unclaimed good pulls the frontier toward its claim tiles —
 *  sized like a good yield tile so it steers direction without minting colonies. */
const LUXURY_FRONTIER_PULL = 3;

/** The default frontier weight is the measured-neutral setting. Larger values made the
 *  prototype over-expand. */
function evaluateSettler(G: HegemonyState, playerID: PlayerId, risks = NO_RISKS): number {
  return (
    evaluateSmart(G, playerID, DEFAULT_WEIGHTS, NO_WANTS, risks) +
    DEFAULT_WEIGHTS.frontier * frontierValue(G, playerID)
  );
}

/**
 * The expansion-frontier bot: `smart`'s economic / population / building evaluation PLUS a
 * one-step frontier term, over the same one-ply search `smart` uses. It scores the same as
 * `smart` but adds `frontier weight × frontierValue`, so a `smart`-vs-`settler` A/B isolates
 * map foresight from everything else. See docs/reports/simulation/2026-07-21-map-foresight.md.
 */
export const settlerPolicy = searchPolicy("settler", (G, moves) =>
  onePlyLookahead(G, moves, facingRepeals(G, evaluateSettler)),
);

// ── The cumulative policy — every shipped specialist in one bot ──────────────────────
//
// The earlier policies are controlled experiments: `beam` isolates search depth,
// `political` isolates Assembly judgment, and `settler` isolates a one-step map signal.
// `master` is the play-strength composition rather than another isolated arm: smart
// economy + political standing + frontier value, searched with the beam during normal
// play, while the dedicated political heuristic runs the Assembly.

function scoreMaster(
  G: HegemonyState,
  playerID: PlayerId,
  weights = DEFAULT_WEIGHTS,
  wants = NO_WANTS,
  risks = NO_RISKS,
): number {
  return (
    scorePolitical(G, playerID, weights, wants, risks) +
    weights.frontier * frontierValue(G, playerID)
  );
}

/** The master family's turn: the beam over the master score, with what the seat is
 *  saving toward counted in. Wants are listed where the seat is free to act, and there
 *  the seat first takes a counter that pays, then makes its turn's offer. */
function planTurn(G: HegemonyState, moves: GameCommand[], weights: ScoreWeights): GameCommand {
  const me = G.currentPlayer;
  const risks = lawRisks(G, me);
  const scoreFor =
    (wants: Want[]): Scorer =>
    (state, player) =>
      player === me
        ? scoreMaster(state, player, weights, wants, risks)
        : scoreMaster(state, player, weights);
  const plain = scoreFor(NO_WANTS);
  const free = moves.some((move) => move.type === "endTurn");
  const wants = free ? purchaseWants(G, me, plain, weights) : NO_WANTS;
  const score = wants.length === 0 ? plain : scoreFor(wants);
  if (!free) return beamPlan(G, moves, score);

  const answered =
    takeCounter(G, moves, me, (state) => score(state, me)) ?? withdrawAnswered(G, moves, me);
  if (answered) return answered;
  // The turn's own search is also the best turn without a deal.
  const evaluation = searchEvaluation(score, me);
  const plan = beamSearch(G, searchable(G, moves), evaluation);
  return (
    turnOffer(G, me, wants, evaluation, plan.score) ??
    plan.firstMove ??
    moves.find((move) => move.type === "endTurn")!
  );
}

// ── Trade ────────────────────────────────────────────────────────────────────────────
//
// Bots answer, counter and offer by the score they play with: their weights, what they
// save toward, and the food and calm the forecast buys (docs/plans/player-trade.md,
// Bots). A deal is weighed on the match as it would stand after the trade, which the
// engine builds; a bot takes one worth the margin to it that hands its partner no
// title. Pacing: one offer a turn and one a sitting, read off the engine's count.

/** What a deal must be worth to a bot over no deal: about a unit of food, so a bot does
 *  not trade for rounding. */
const TRADE_MARGIN = 1;
/** The turn's best deals, by the plain score, that it weighs with the whole beam. */
const TRADE_BEAMS = 2;
/** The purchases, best first, whose missing materials a bot asks for. */
const WANTS_ASKED = 2;
/** The ratios a bot offers a stock at, given for got. Gold goes at 1 a unit only. */
const DEAL_RATIOS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [2, 1],
  [1, 2],
];

type TradeAnswerMove = Extract<GameCommand, { type: "tradeAnswer" }>;
type TradeSettleMove = Extract<GameCommand, { type: "tradeSettle" }>;

/** The match with no sitting and nothing pending, where a seat's purchases are open, so
 *  what it saves toward counts in its score wherever it trades. */
function marketView(G: HegemonyState): HegemonyState {
  return G.assembly || G.pendingPlayerEvent || G.pendingRiot || G.pendingHunger
    ? { ...G, assembly: null, pendingPlayerEvent: null, pendingRiot: null, pendingHunger: null }
    : G;
}

/** The match as on the seat's own turn, where its purchases are legal: no sitting,
 *  nothing pending, no offers, and no other seat short of food, which only that seat's
 *  own turn may be. */
function ownTurnView(G: HegemonyState, me: PlayerId): HegemonyState {
  const players = { ...G.players };
  for (const id of PLAYER_IDS) {
    const player = players[id];
    if (id !== me && player.resources.food < 0)
      players[id] = { ...player, resources: { ...player.resources, food: 0 } };
  }
  return { ...marketView(G), currentPlayer: me, offers: [], players };
}

/** A seat's score for a match it may trade in, and what it saves toward, listed from its
 *  own purchases as on its turn: out of turn it has no legal purchases. */
function tradeScorer(G: HegemonyState, me: PlayerId, weights: ScoreWeights) {
  const risks = lawRisks(G, me);
  const wants = purchaseWants(
    ownTurnView(G, me),
    me,
    (state, player) => scoreMaster(state, player, weights, NO_WANTS, risks),
    weights,
  );
  return {
    wants,
    score: (state: HegemonyState) => scoreMaster(marketView(state), me, weights, wants, risks),
  };
}

/** Whether a trade leaves `partner` holding a title it lacked. */
function handsTitle(after: HegemonyState, before: TitleHolders, partner: PlayerId): boolean {
  return titleChanges(after, before).some((change) => change.to === partner);
}

/** The item worth the most, when one is worth more than nothing. */
function bestOf<T>(items: readonly T[], value: (item: T) => number): T | null {
  let best: T | null = null;
  let bestValue = 0;
  for (const item of items) {
    const itemValue = value(item);
    if (itemValue > bestValue) {
      best = item;
      bestValue = itemValue;
    }
  }
  return best;
}

/** `bundle` with `delta` more of `resource`, a line of zero dropped. */
function adjusted(bundle: TradeBundle, resource: Resource, delta: number): TradeBundle {
  const resources = { ...bundle.resources, [resource]: (bundle.resources[resource] ?? 0) + delta };
  if (resources[resource] === 0) delete resources[resource];
  return { ...bundle, resources };
}

/** What a counter may change: one unit more to the answering seat, or one less from it,
 *  on one stock line of the offer. The offering seat must still hold its side. */
function counterTerms(G: HegemonyState, offer: TradeOffer): TradeTerms[] {
  const { give, get } = offer.terms;
  const terms: TradeTerms[] = [];
  for (const resource of TRADE_RESOURCES) {
    if ((give.resources[resource] ?? 0) > 0) {
      const more = adjusted(give, resource, 1);
      if (tradeShortfalls(G, offer.from, more, offer.places.from).length === 0)
        terms.push({ give: more, get });
    }
    if ((get.resources[resource] ?? 0) > 0) {
      const less = adjusted(get, resource, -1);
      if (!isEmptyBundle(less)) terms.push({ give, get: less });
    }
  }
  return terms;
}

/**
 * A bot's answer to an offer naming it: accept when the trade is worth the margin to it
 * and hands the offering seat no title; else counter once, with the one-unit change
 * that would make it so; else decline. The first accept trades, so a bot answers at
 * once.
 */
function answerOffer(
  G: HegemonyState,
  offer: TradeOffer,
  moves: GameCommand[],
  me: PlayerId,
  weights: ScoreWeights,
): GameCommand {
  const { score } = tradeScorer(G, me, weights);
  const floor = score(G) + TRADE_MARGIN;
  const holders = titleHolders(G);
  const gain = (terms: TradeTerms, places: TradePlaces) => {
    const after = tradeForEval(G, offer.from, me, terms, offer.places, places);
    return handsTitle(after, holders, offer.from) ? -Infinity : score(after) - floor;
  };

  const accepts = moves.filter(
    (move): move is TradeAnswerMove =>
      move.type === "tradeAnswer" && move.offerId === offer.id && move.answer.kind === "accept",
  );
  const accept = bestOf(accepts, (move) =>
    move.answer.kind === "accept" ? gain(offer.terms, move.answer.places) : -Infinity,
  );
  if (accept) return accept;

  // A counter changes stocks only, so its pops go where an accept's would.
  const places = tradePlaceChoices(G, me, offer.terms.get, offer.terms.give)[0];
  if (places) {
    const counters = counterTerms(G, offer).filter(
      (terms) => getTradeAnswerStatus(G, me, offer.id, { kind: "counter", terms, places }).can,
    );
    const terms = bestOf(counters, (candidate) => gain(candidate, places));
    if (terms)
      return { type: "tradeAnswer", offerId: offer.id, answer: { kind: "counter", terms, places } };
  }
  return { type: "tradeAnswer", offerId: offer.id, answer: { kind: "decline" } };
}

/** Of the counters on the seat's own offers, the one worth the margin to it that hands
 *  its partner no title, as the command that takes it; null when none is. */
function takeCounter(
  G: HegemonyState,
  moves: GameCommand[],
  me: PlayerId,
  score: (state: HegemonyState) => number,
): GameCommand | null {
  const settles = moves.filter((move): move is TradeSettleMove => move.type === "tradeSettle");
  if (settles.length === 0) return null;
  const floor = score(G) + TRADE_MARGIN;
  const holders = titleHolders(G);
  return bestOf(settles, (move) => {
    const counter = counterOf(getOffer(G, move.offerId)!, move.partner)!;
    const after = tradeForEval(G, me, move.partner, counter.terms, move.places, counter.places);
    return handsTitle(after, holders, move.partner) ? -Infinity : score(after) - floor;
  });
}

/** The seat's own offer every named seat has answered, with no counter on it worth
 *  taking: withdrawn, so its disc leaves the table's alarms row. */
function withdrawAnswered(
  G: HegemonyState,
  moves: GameCommand[],
  me: PlayerId,
): GameCommand | null {
  const spent = G.offers.find(
    (offer) => offer.from === me && offer.to.every((seat) => offer.answers[seat]),
  );
  return (
    (spent && moves.find((move) => move.type === "tradeWithdraw" && move.offerId === spent.id)) ??
    null
  );
}

/** What a seat lacks: the food it is short of now, and what its best purchases still
 *  need, materials its land makes none of included. */
function tradeNeeds(G: HegemonyState, me: PlayerId, wants: Want[]): Partial<Resources> {
  const held = G.players[me].resources;
  const needs: Partial<Resources> = {};
  if (held.food < 0) needs.food = -held.food;
  for (const { cost } of wants.slice(0, WANTS_ASKED))
    for (const resource of Object.keys(cost) as Resource[]) {
      const short = (cost[resource] ?? 0) - held[resource];
      if (short > 0) needs[resource] = Math.max(needs[resource] ?? 0, short);
    }
  return needs;
}

/** What a seat holds beyond the purchase it saves toward, of each stock it does not
 *  lack. */
function tradeSpare(
  G: HegemonyState,
  me: PlayerId,
  wants: Want[],
  needs: Partial<Resources>,
): Partial<Resources> {
  const held = G.players[me].resources;
  const saving = wants[0]?.cost ?? {};
  const spare: Partial<Resources> = {};
  for (const resource of TRADE_RESOURCES) {
    const amount = held[resource] - (saving[resource] ?? 0);
    if (!needs[resource] && amount > 0) spare[resource] = amount;
  }
  return spare;
}

/** The deals for what a seat lacks against what it can spare: each spare stock at 1 for
 *  1, 2 for 1 and 1 for 2, and gold at 1 a unit. */
function candidateDeals(needs: Partial<Resources>, spare: Partial<Resources>): TradeTerms[] {
  const deals: TradeTerms[] = [];
  for (const need of Object.keys(needs) as Resource[]) {
    const units = needs[need] ?? 0;
    for (const given of Object.keys(spare) as Resource[]) {
      if (given === need || units === 0) continue;
      for (const [give, get] of given === "gold" ? DEAL_RATIOS.slice(0, 1) : DEAL_RATIOS) {
        if (give * units > (spare[given] ?? 0)) continue;
        deals.push({
          give: { ...emptyBundle(), resources: { [given]: give * units } },
          get: { ...emptyBundle(), resources: { [need]: get * units } },
        });
      }
    }
  }
  return deals;
}

/** The rivals holding what a deal asks of them: only they could accept it. */
function dealPayers(G: HegemonyState, me: PlayerId, terms: TradeTerms): PlayerId[] {
  return PLAYER_IDS.filter((id) => id !== me && tradeShortfalls(G, id, terms.get).length === 0);
}

/** The rivals a deal goes to: those who could pay that it hands no title. All three
 *  are the table; none, null. */
function dealRecipients(
  G: HegemonyState,
  me: PlayerId,
  terms: TradeTerms,
  holders: TitleHolders,
): PlayerId[] | null {
  const to = dealPayers(G, me, terms).filter(
    (rival) => !handsTitle(tradeForEval(G, me, rival, terms), holders, rival),
  );
  return to.length === 0 ? null : to.length === PLAYER_IDS.length - 1 ? [] : to;
}

/** The offer command for a deal, when the engine takes it. */
function offerCommand(
  G: HegemonyState,
  me: PlayerId,
  to: PlayerId[],
  terms: TradeTerms,
): GameCommand | null {
  return getTradeOfferStatus(G, me, to, terms, {}).can
    ? { type: "tradeOffer", to, terms, places: {} }
    : null;
}

/** Whether a seat may still make its one offer of this turn or sitting. */
function mayOffer(G: HegemonyState, me: PlayerId): boolean {
  return (G.offersMade[me] ?? 0) === 0 && offerWindowReason(G, me) === null;
}

/**
 * A bot's offer on its turn, weighed with its search: of the deals for what it lacks,
 * the one whose best turn beats the best turn without a deal (`without`) by the margin.
 * That search takes the Dole too, so a deal worse than the Dole's food never wins. Only
 * a deal worth something by itself is searched. The deal goes to every rival who could
 * pay that it hands no title, and the first to accept trades.
 */
function turnOffer(
  G: HegemonyState,
  me: PlayerId,
  wants: Want[],
  evaluation: SearchEvaluation,
  without: number,
): GameCommand | null {
  if (!mayOffer(G, me)) return null;
  const needs = tradeNeeds(G, me, wants);
  const deals = candidateDeals(needs, tradeSpare(G, me, wants, needs));
  if (deals.length === 0) return null;

  // Which payer accepts does not move the seat's own score.
  const now = evaluation.valueOf(G);
  const ranked = deals
    .flatMap((terms) => {
      const [payer] = dealPayers(G, me, terms);
      if (!payer) return [];
      const after = tradeForEval(G, me, payer, terms);
      const value = evaluation.valueOf(after);
      return value > now ? [{ terms, after, value }] : [];
    })
    .sort((a, b) => b.value - a.value);
  const holders = titleHolders(G);

  let best: { offer: GameCommand; score: number } | null = null;
  let weighed = 0;
  for (const { terms, after } of ranked) {
    if (weighed === TRADE_BEAMS) break;
    const to = dealRecipients(G, me, terms, holders);
    const offer = to && offerCommand(G, me, to, terms);
    if (!offer) continue;
    weighed += 1;
    const withDeal = beamSearch(
      after,
      searchable(after, enumerateLegalCommands(after, me)),
      evaluation,
    ).score;
    if (withDeal > without + TRADE_MARGIN && (!best || withDeal > best.score))
      best = { offer, score: withDeal };
  }
  return best?.offer ?? null;
}

/**
 * An offer in the preparation for one of `needs`, worth the margin once what it pays
 * for (`unlocks`) is counted, to the rivals it hands no title; null when none is.
 */
function assemblyOffer(
  G: HegemonyState,
  me: PlayerId,
  needs: Array<Partial<Resources>>,
  unlocks: number,
  weights: ScoreWeights,
): GameCommand | null {
  const { score, wants } = tradeScorer(G, me, weights);
  const floor = score(G) + TRADE_MARGIN - unlocks;
  const holders = titleHolders(G);
  const ranked = needs
    .flatMap((need) => candidateDeals(need, tradeSpare(G, me, wants, need)))
    .flatMap((terms) => {
      const [payer] = dealPayers(G, me, terms);
      return payer ? [{ terms, value: score(tradeForEval(G, me, payer, terms)) - floor }] : [];
    })
    .filter((deal) => deal.value > 0)
    .sort((a, b) => b.value - a.value);
  for (const { terms } of ranked) {
    const to = dealRecipients(G, me, terms, holders);
    const offer = to && offerCommand(G, me, to, terms);
    if (offer) return offer;
  }
  return null;
}

/** Still deciding what to say: a seat short of the influence for the speech it wants
 *  offers for it. */
function speechOffer(
  G: HegemonyState,
  session: AssemblySession,
  me: PlayerId,
  score: Scorer,
  weights: ScoreWeights,
): GameCommand | null {
  if (!mayOffer(G, me)) return null;
  const influence = G.players[me].resources.influence;
  // What it would say with the influence: the moves a full purse makes legal.
  const purse = withStocks(G, me, { influence: FULL_STORE });
  const speech = wantedSpeech(G, session, enumerateLegalCommands(purse, me), me, score);
  if (!speech || speech.cost <= influence) return null;
  return assemblyOffer(G, me, [{ influence: speech.cost - influence }], speech.value, weights);
}

/**
 * Sealed, before Ready: the votes the seat would buy for its own proposal, as the vote
 * stands now (every seat casting as it would, at its votes now), when it cannot pay for
 * them. It offers for the gold or the influence they cost.
 */
function voteOffer(
  G: HegemonyState,
  session: AssemblySession,
  me: PlayerId,
  score: Scorer,
  weights: ScoreWeights,
): GameCommand | null {
  const item = session.proposals[me];
  if (!item || !mayOffer(G, me)) return null;
  const before = scoreEveryone(G, score);
  const mine = assessVote(G, before, item, me, score);
  if (Math.abs(mine.voteDelta) < BRIBE_MAGNITUDE) return null;

  let yea = 0;
  let nay = 0;
  for (const seat of session.voteOrder) {
    const weight = currentVoteWeight(G, seat);
    if ((seat === me ? mine : assessVote(G, before, item, seat, score)).yea) yea += weight;
    else nay += weight;
  }
  const goesMyWay = (bought: number) =>
    mine.yea ? wouldPass(G, yea + bought, nay) : !wouldPass(G, yea, nay + bought);
  const cap = votePurchaseLimit(G, me) - session.bribesUsed[me];
  let needed = 0;
  while (needed <= cap && !goesMyWay(needed)) needed += 1;
  if (needed === 0 || needed > cap || needed <= votesLeftToBuy(G, me)) return null;

  // The votes the other stock pays for stay bought; the asked stock covers the rest.
  const price = G.ruleset.assembly.briberyCost;
  const { gold, influence } = G.players[me].resources;
  const short = (stock: number, other: number) =>
    Math.max(0, (needed - Math.floor(other / price)) * price - stock);
  return assemblyOffer(
    G,
    me,
    [{ gold: short(gold, influence) }, { influence: short(influence, gold) }],
    Math.abs(mine.voteDelta),
    weights,
  );
}

/**
 * The strongest cumulative sim policy currently available:
 *
 * - `smart` economic / population / building evaluation;
 * - `beam` within-turn sequencing (W=3, D=4);
 * - `political` Assembly decisions and political standing;
 * - `settler` one-step expansion-frontier signal;
 * - a value on what the seat is saving toward ({@link savingValue}), which no
 *   specialist has.
 *
 * This deliberately does NOT claim capabilities that nobody has built yet: a plan
 * across turns, general opponent replies or multi-hop route search.
 */
export const masterPolicy = searchPolicy("master", (G, moves) =>
  planTurn(G, moves, DEFAULT_WEIGHTS),
);

function personalityPolicy(name: PersonalityId): Policy {
  const weights = PERSONALITY_WEIGHTS[name];
  return searchPolicy(
    name,
    (G, moves) => planTurn(G, moves, weights),
    weights,
    (G, player) => scoreMaster(G, player, weights),
  );
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

/** Doles a year Public Dole's saving is priced at. Two is what the opening's food
 *  deficit gave the old term at the draft, so the Idea drafts as it did. */
const DOLE_USES_A_YEAR = 2;
/** An extra colony piece, over a whole horizon. */
const COLONY_PIECE_VALUE = 10;
/** Extra pieces count this many times once the seat is within PIECES_NEAR_LIMIT
 *  colonies of the limit it would have without them. */
const SCARCE_PIECE_FACTOR = 3;
const PIECES_NEAR_LIMIT = 1;
/** A pop an upgrade grants, at its class's default weight. */
const UPGRADE_GRANT_VALUE = 12;
/** A pop a founding grants, at its class's default weight. */
const FOUNDING_GRANT_VALUE = 6;
/** The share of the luxury weight a claim is worth where the exemption opens a full site. */
const EXEMPT_CLAIM_SHARE = 1 / 2;
/** The share of the politics weight a higher vote-buying limit is worth each sitting. */
const VOTE_LIMIT_SHARE = 1 / 2;

/** The player's colonies whose site the engine would let upgrade, the price, the pieces
 *  and any pending decision apart. */
function upgradableColonies(G: HegemonyState, me: PlayerId): number {
  return G.players[me].settlements.filter((id) => {
    const tile = getTile(G, id);
    return tile !== undefined && upgradeSiteReasons(G, me, tile).length === 0;
  }).length;
}

/** What the seat's Ideas are worth beyond what the forecast and the position show: the
 *  lasting effects that pay only once the seat acts on them. */
function ideaOpportunityValue(G: HegemonyState, me: PlayerId, weights = DEFAULT_WEIGHTS): number {
  const years = Math.max(0, Math.min(INCOME_HORIZON, lastYear(G) - G.year));
  const effects = playerNationalIdeas(G, me).flatMap((idea) => idea.effects);
  if (!effects.length || !years) return 0;
  let room: boolean | undefined;
  const roomToExpand = () => (room ??= placementFrontier(G, me).frontier > 0);
  let value = 0;
  for (const effect of effects)
    value += ideaEffectValue(G, me, effect, years, weights, roomToExpand);
  return value;
}

function ideaEffectValue(
  G: HegemonyState,
  me: PlayerId,
  effect: LawEffect,
  years: number,
  weights: ScoreWeights,
  roomToExpand: () => boolean,
): number {
  switch (effect.type) {
    case "colonyPieces":
      return roomToExpand() ? colonyPiecesValue(G, me, effect, years) : 0;
    case "onUpgradeCity":
      return upgradeGrantValue(G, me, effect, years, weights);
    case "onFoundColony":
      return roomToExpand() ? foundingGrantValue(G, me, effect, years, weights) : 0;
    case "slotExempt":
      return slotExemptValue(G, me, effect, years, weights);
    case "dolePrice":
      return dolePriceValue(G, me, years, weights);
    case "votePurchaseLimit":
      return voteLimitValue(G, me, effect, years, weights);
    // The forecast and the position after the pick already carry these.
    case "realmIncome":
    case "extraSlots":
    case "acquirePop":
    case "acquireResource":
      return 0;
    // Law effects no Idea carries.
    case "actionCost":
    case "calmPayment":
    case "colonyCapacity":
    case "buildingFood":
    case "happiness":
    case "settlementIncome":
    case "popIncome":
    case "slaveResource":
    case "slaveUnrestWeight":
    case "buildingForbidden":
    case "buildingIdle":
    case "colonyBuildings":
    case "colonyLimit":
    case "growLimit":
    case "settlementVotes":
      return 0;
  }
}

/** Worth more once the seat is near the limit it would have without the extra pieces.
 *  The limit is the effective one: Master Builders lowers it. */
function colonyPiecesValue(
  G: HegemonyState,
  me: PlayerId,
  effect: Extract<LawEffect, { type: "colonyPieces" }>,
  years: number,
): number {
  const pieces = playerPieces(G, me);
  return (
    ((COLONY_PIECE_VALUE * effect.amount * years) / INCOME_HORIZON) *
    (pieces.colonies >= pieces.colonyLimit - effect.amount - PIECES_NEAR_LIMIT
      ? SCARCE_PIECE_FACTOR
      : 1)
  );
}

function upgradeGrantValue(
  G: HegemonyState,
  me: PlayerId,
  effect: Extract<LawEffect, { type: "onUpgradeCity" }>,
  years: number,
  weights: ScoreWeights,
): number {
  const pieces = playerPieces(G, me);
  return (
    UPGRADE_GRANT_VALUE *
    (weights.pops[effect.grantPop] / DEFAULT_WEIGHTS.pops[effect.grantPop]) *
    Math.min(upgradableColonies(G, me), pieces.citiesRemaining, years)
  );
}

function foundingGrantValue(
  G: HegemonyState,
  me: PlayerId,
  effect: Extract<LawEffect, { type: "onFoundColony" }>,
  years: number,
  weights: ScoreWeights,
): number {
  const pops = (effect.amount ?? 1) * Math.min(playerPieces(G, me).coloniesRemaining, years);
  let opportunity =
    FOUNDING_GRANT_VALUE *
    pops *
    (weights.pops[effect.grantPop] / DEFAULT_WEIGHTS.pops[effect.grantPop]);
  // Future grants owe the same standing-level cost as slaves already on the
  // board. Pricing only their population reward once made Slave Colonies win
  // every opening.
  if (effect.grantPop === "slaves") {
    // The realm's count under the standing Laws: Manumission counts each slave
    // three times, and a slave on the move counts.
    const times = slaveUnrestCount(G, me);
    const slaves = realmPops(G, me).slaves;
    const loss = slaveUnhappiness(G, times * (slaves + pops)) - slaveUnhappiness(G, times * slaves);
    const level = standingHappiness(G, me);
    const cap = levelCap(G);
    opportunity -= weights.level * (Math.min(level, cap) - Math.min(level - loss, cap));
  }
  return Math.max(0, opportunity);
}

/**
 * At setup the exempted building is still prospective. Credit one saved work slot per
 * owned site that would claim a good with it, and the claim only where the exemption
 * opens a site whose building slots are full. Buildings already standing are scored.
 * Only a building that claims a good has such sites; no Idea exempts another.
 */
function slotExemptValue(
  G: HegemonyState,
  me: PlayerId,
  effect: Extract<LawEffect, { type: "slotExempt" }>,
  years: number,
  weights: ScoreWeights,
): number {
  if (!getBuilding(G.definition.content, effect.building)?.claimsLuxury) return 0;
  const sites = G.players[me].settlements.flatMap((id) => {
    const tile = getTile(G, id);
    const settlement = tile?.settlements.find((s) => s.owner === me);
    return tile &&
      settlement &&
      !settlement.buildings.includes(effect.building) &&
      claimableLuxuriesAt(G, id).length
      ? [{ tile, settlement }]
      : [];
  });
  const siteValues = sites.map(({ tile, settlement }) => {
    const primary = settlementSlaveResource(tile, G);
    const slots = settlementOpenSlots(tile, settlement, G);
    const canWork =
      settlementWorkingSlaves(tile, settlement, G) > 0 || settlementRoom(G, settlement) > 0;
    return (
      (primary && slots > 0 && canWork ? stockValue(weights, primary) * years : 0) +
      (slots <= 0 ? weights.luxury * EXEMPT_CLAIM_SHARE : 0)
    );
  });
  const goods = new Set(
    sites.flatMap(({ tile }) => claimableLuxuriesAt(G, tile.id).map((good) => good.id)),
  );
  return siteValues
    .sort((a, b) => b - a)
    .slice(0, goods.size)
    .reduce((sum, site) => sum + site, 0);
}

/** The saving is priced at one Dole a year for each of the realm's first two mouths,
 *  whatever its food income. Priced by the food deficit, it paid a holder to stay
 *  short: one more food a year scored worse than for anyone else. */
function dolePriceValue(
  G: HegemonyState,
  me: PlayerId,
  years: number,
  weights: ScoreWeights,
): number {
  const pops = realmPops(G, me);
  const mouths = hungerMouths(G).reduce((sum, pop) => sum + pops[pop], 0);
  return (
    stockValue(weights, "influence") *
    Math.max(0, G.ruleset.dole.influenceCost - playerDole(G, me).influenceCost) *
    Math.min(mouths, DOLE_USES_A_YEAR) *
    years
  );
}

/** Worth something only to a seat that could pay for the votes the limit allows. */
function voteLimitValue(
  G: HegemonyState,
  me: PlayerId,
  effect: Extract<LawEffect, { type: "votePurchaseLimit" }>,
  years: number,
  weights: ScoreWeights,
): number {
  const { influence, gold } = G.players[me].resources;
  const assembly = G.ruleset.assembly;
  return influence + gold >= assembly.briberyCost * effect.amount
    ? weights.politics * VOTE_LIMIT_SHARE * Math.ceil(years / Math.max(1, assembly.everyYears))
    : 0;
}
