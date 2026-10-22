import { emptyReachCounts, moveReachIds, type ReachReport } from "./reach";
import { NATIONAL_IDEAS, playerNationalIdeas } from "../game/ideas";
import type { NationalIdeaId, NationalIdeaOwnership } from "../game/ideaTypes";
import type { OpeningKind } from "./io";
import { POP_TYPES, totalPops } from "../game/core/pops";
import { calculateIncome } from "../game/economy/income";
import {
  ACTIVE_EFFECT_KINDS,
  countActiveEffectsByKind,
  getActiveEffects,
} from "../game/activeEffects";
import type { ActiveEffectKind } from "../game/activeEffects";
import { TRADABLE_MATERIALS } from "../game/bank";
import type { GameCommand } from "../game/legalMoves";
import type { DefinitionIdentity } from "../game/definition";
import { PLAYER_IDS } from "../game/data";
import { getAddPopsEffect } from "../game/events";
import { activeClaims, ownedClaims } from "../game/luxury";
import { playerStandings } from "../game/score";
import { getOwnedSettlement, getTile } from "../game/core/query";
import { canPlaceColonyOnTile, settlementIdleSlaves } from "../game/settlement";
import { TRADE_RESOURCES } from "../game/trade";
import { unrestStatus } from "../game/unrest";
import {
  VICTORY_CARDS,
  ageEndRanking,
  titleChanges,
  titleHolders,
  victoryStandings,
  victoryMetricValue,
  voiceHolder,
} from "../game/victory";
import { GAME_COMMAND_TYPES, type GameCommandType } from "../parity/commandParity";
import {
  BUILDING_CONTENT_IDS,
  PLAYER_EVENT_CONTENT_IDS,
  YEAR_CARD_CONTENT_IDS,
  type PlayerEventContentId,
  type YearCardContentId,
} from "../parity/featureParity";
import type { UnrestTier } from "../game/unrest";
import type {
  BoardLayout,
  BuildingId,
  GameOverReason,
  HegemonyState,
  LogEntry,
  LogMoment,
  PlayerId,
  PopType,
  Resource,
  Resources,
  TradableMaterial,
  TradeAnswer,
  TradeBundle,
} from "../game/types";

/**
 * Balance instrumentation for batch runs. One TurnSnapshot per player-turn, and one
 * GameRow per game holding each seat's facts: what it did, counted once as it played,
 * and where it stood at the end. The report reads every per-seat and per-personality
 * figure off those facts through one `cut`. Event cards are counted by id at the
 * moment they surface (deck objects are shared references — never compare card
 * identity).
 */

export type PlayerSnapshot = {
  victoryCards: number;
  cities: number;
  colonies: number;
  pops: number;
  /** Tiles where this player could legally found a colony right now (geometry only,
   *  cost ignored) — 0 means contiguity has boxed them in. */
  frontierTiles: number;
  inTransit: number;
  resources: Resources;
  income: Resources;
  /** The happiness level, this year's calm included: what the riot line tests. */
  happiness: number;
  unrestTokens: number;
  unrestTier: UnrestTier;
  /** 1 when ending the player's turn at this level starts a riot or revolt. */
  riotAtRisk: number;
  slaves: number;
  freemen: number;
  citizens: number;
  /** Slaves without an open work slot: on a full tile, or on a hill. */
  idleSlaves: number;
  /** Running total of pops that left unfed at turn end. */
  popsLostToHunger: number;
  /** Persistent mechanical effects observed by the same selector used by the UI. */
  activeEffects: Record<ActiveEffectKind, number>;
  popsLostToUnrest: number;
  popsGainedFromEvents: number;
  authoredLawsStanding: number;
  voiceHeld: number;
  /** Luxury goods held and not suppressed. A Blockade year still counts them. */
  activeLuxuries: number;
};

export type TurnSnapshot = {
  game: number;
  seed: number;
  turn: number;
  year: number;
  /** The seat whose turn this is. */
  actingSeat: PlayerId;
  /** The seat holding Beloved of the People, or null. */
  belovedHolder: PlayerId | null;
  players: Record<PlayerId, PlayerSnapshot>;
};

export function snapshotTurn(G: HegemonyState, game: number, seed: number): TurnSnapshot {
  const players = {} as Record<PlayerId, PlayerSnapshot>;

  for (const playerID of PLAYER_IDS) {
    const player = G.players[playerID];
    const standings = playerStandings(G, playerID);
    const unrest = unrestStatus(G, playerID);
    const inTransit = G.transfers
      .filter((transfer) => transfer.owner === playerID)
      .reduce((total, transfer) => total + totalPops(transfer.pops), 0);
    const income = calculateIncome(G, playerID);
    const activeEffects = getActiveEffects(G, playerID, { income });
    const activeEffectCounts = countActiveEffectsByKind(activeEffects);

    players[playerID] = {
      victoryCards: standings.victoryCards,
      cities: standings.cities,
      colonies: standings.colonies,
      pops: standings.pops,
      frontierTiles: G.board.tiles.filter((tile) => canPlaceColonyOnTile(G, playerID, tile).can)
        .length,
      inTransit,
      resources: { ...player.resources },
      income,
      happiness: unrest.happiness,
      unrestTokens: unrest.outcome.tokens,
      unrestTier: unrest.tier,
      riotAtRisk: unrest.outcome.tier !== "none" ? 1 : 0,
      ...slaveCounts(G, playerID),
      freemen: classCount(G, playerID, "freemen"),
      citizens: classCount(G, playerID, "citizens"),
      popsLostToHunger: player.popsLostToHunger,
      popsLostToUnrest: player.popsLostToUnrest,
      popsGainedFromEvents: player.popsGainedFromEvents,
      authoredLawsStanding: victoryMetricValue(G, playerID, "voice"),
      voiceHeld: voiceHolder(G) === playerID ? 1 : 0,
      activeLuxuries: activeClaims(G, playerID).length,
      activeEffects: activeEffectCounts,
    };
  }

  return {
    game,
    seed,
    turn: G.turn,
    year: G.year,
    actingSeat: G.currentPlayer,
    belovedHolder:
      victoryStandings(G).find((standing) => standing.card.id === "beloved")?.holder ?? null,
    players,
  };
}

function classCount(G: HegemonyState, player: PlayerId, pop: "freemen" | "citizens") {
  return G.players[player].settlements.reduce(
    (sum, id) => sum + (getOwnedSettlement(G, id, player)?.pops[pop] ?? 0),
    0,
  );
}

export type DrawSwing = {
  game: number;
  year: number;
  player: PlayerId;
  policy: string;
  card: string;
  resources: Resources;
  pops: number;
  unrestTokens: number;
  materialMagnitude: number;
  incomeMagnitude: number;
  ratio: number | null;
  /** What the seat's stock changed by at this turn's income, under this year's card
   *  and after the floors. Null when the turn's opening was not observed. */
  collected: Resources | null;
  /** The gains in `collected`, summed. Food upkeep is not income, so a loss adds nothing. */
  collectedMagnitude: number;
  /** `materialMagnitude` over `collectedMagnitude`: the swing against the income the
   *  seat collected this turn. Null when it collected nothing. */
  collectedRatio: number | null;
};

/** The spread of a set of draws. Pop and token cards move no resource, so they are
 *  counted in their own units instead of as a ratio of zero. */
export type DrawSwingSummary = {
  /** Player cards drawn, and those of them discarded because no settlement had room. */
  draws: number;
  discarded: number;
  /** Cards that moved a resource, and the spread of their `collectedRatio`. */
  resourceCards: number;
  collectedRatio: Percentiles;
  /** Cards that moved pops, and the pops they moved. */
  popCards: number;
  popsMoved: number;
  /** Cards that placed or cleared Unrest tokens, and the tokens they moved. */
  tokenCards: number;
  tokensMoved: number;
  /** Resolved cards that changed nothing: a loss with nothing to take, or no token to clear. */
  unchanged: number;
};

/** Where influence goes. `draws` is the Assembly draw, the price of proposing;
 *  `patronage` is the riot insurance. */
export const INFLUENCE_SINKS = [
  "dole",
  "ideas",
  "calm",
  "votes",
  "patronage",
  "draws",
  "repeals",
  "demotions",
] as const;
export type InfluenceSink = (typeof INFLUENCE_SINKS)[number];

/** The sinks the Assembly's verbs pay into. */
const ASSEMBLY_SINKS: InfluenceSink[] = ["votes", "draws", "repeals"];

/** The sink a command pays into, if it can cost influence at all. */
function influenceSink(move: GameCommand): InfluenceSink | null {
  switch (move.type) {
    case "dole":
      return "dole";
    case "buyIdea":
      return "ideas";
    case "civicCalm":
      return "calm";
    case "assemblyBribe":
      return "votes";
    case "assemblyDraw":
      return "draws";
    case "assemblyProposeRepeal":
      return "repeals";
    case "demotePop":
      return "demotions";
    case "buyRiotInsurance":
      // The concession is a forced demotion; the bread dole costs food.
      return move.optionId === "concession" ? "demotions" : "patronage";
    default:
      return null;
  }
}

/** Food bought from the bank and the Dole, and what it cost. */
export type FoodBought = {
  bankBuys: number;
  doles: number;
  food: number;
  gold: number;
  influence: number;
};

/** What a trade can move, unit by unit: stocks, luxury goods, and pops by class. */
export type TradeUnit = Resource | "goods" | PopType;
const TRADE_UNITS: TradeUnit[] = [...TRADE_RESOURCES, "goods", ...POP_TYPES];

/** One seat's trade in one game. A settled trade belongs to the seat whose offer it
 *  was; the units it moved belong to both sides. */
export type TradeCounts = {
  /** Its offers that settled (an accept, or a counter it took), and those still open
   *  when the turn or the Assembly's preparation ended. Its withdrawals are the
   *  `command:tradeWithdraw` in its reach. */
  offers: { settled: number; closed: number };
  /** Its offers settled while the Assembly sat. */
  settledInSitting: number;
  /** Its answers to the other seats' offers. */
  answers: Record<TradeAnswer["kind"], number>;
  given: Record<TradeUnit, number>;
  received: Record<TradeUnit, number>;
  /** Its offers settled after which some title changed holder. */
  titleChanges: number;
  /** What one unit of a material it sold fetched, in units of the one stock it took:
   *  a sample a trade, by material and then that stock. */
  prices: Partial<Record<TradableMaterial, Partial<Record<Resource, number[]>>>>;
};

/** What one seat did in one game, counted once, as it played. */
export type SeatCounts = {
  /** Its commands, buildings, draws and passed resolutions by reach id, only the ids it
   *  used. A figure that counts one of these reads it here. */
  reach: Record<string, number>;
  /** The year of each riot the seat rolled, and of each revolt. */
  riotYears: number[];
  revoltYears: number[];
  /** Player cards it drew and discarded because no settlement had room. */
  cardsDiscarded: number;
  /** Influence paid, by sink: what the seat's stock fell by at each purchase. */
  influenceSpent: Record<InfluenceSink, number>;
  /** Gold paid for votes, read off the stock the same way. */
  voteGold: number;
  /** Food bought while the stock was below zero, and at zero or above. */
  foodBought: { coveringShortfall: FoodBought; buyingAhead: FoodBought };
  /** Times it took Voice. */
  voiceClaims: number;
  /** How the votes on the repeals it filed went. */
  repealsPassed: number;
  repealsFailed: number;
  /** Passed Directives aimed at this seat. */
  directivesAimedAt: number;
  trade: TradeCounts;
};

/** Where one seat stood when its game ended. */
export type SeatEnd = {
  finalCards: number;
  finalTitles: string[];
  nationalIdeas: NationalIdeaOwnership[];
  /** Resolutions it authored that passed, Directives included: the engine's record,
   *  which survives repeal. */
  authoredPasses: number;
  directivesPassed: number;
  /** Its Laws still standing: what Voice reads. */
  authoredLawsStanding: number;
  popsLostToHunger: number;
  popsLostToUnrest: number;
  /** Luxury goods (Phase 4): claims held / active and the standing happiness they
   *  contributed at game end — the Beloved-side of the feature's exit gate. */
  luxuries: { goodsHeld: number; goodsActive: number; luxuryHappiness: number };
  /** End-of-game banked gold — monitored, not judged (Q46: no gold sink). */
  finalGold: number;
};

export type SeatFacts = SeatCounts & SeatEnd;

function emptyFoodBought(): FoodBought {
  return { bankBuys: 0, doles: 0, food: 0, gold: 0, influence: 0 };
}

function emptyTradeCounts(): TradeCounts {
  const units = () =>
    Object.fromEntries(TRADE_UNITS.map((unit) => [unit, 0])) as Record<TradeUnit, number>;
  return {
    offers: { settled: 0, closed: 0 },
    settledInSitting: 0,
    answers: { accept: 0, counter: 0, decline: 0 },
    given: units(),
    received: units(),
    titleChanges: 0,
    prices: {},
  };
}

function emptySeatCounts(): Record<PlayerId, SeatCounts> {
  const empty = (): SeatCounts => ({
    reach: {},
    riotYears: [],
    revoltYears: [],
    cardsDiscarded: 0,
    influenceSpent: Object.fromEntries(INFLUENCE_SINKS.map((sink) => [sink, 0])) as Record<
      InfluenceSink,
      number
    >,
    voteGold: 0,
    foodBought: { coveringShortfall: emptyFoodBought(), buyingAhead: emptyFoodBought() },
    voiceClaims: 0,
    repealsPassed: 0,
    repealsFailed: 0,
    directivesAimedAt: 0,
    trade: emptyTradeCounts(),
  });
  return Object.fromEntries(PLAYER_IDS.map((id) => [id, empty()])) as Record<PlayerId, SeatCounts>;
}

/** A seat's stock after a command, less its stock before it. */
function resourceChange(before: HegemonyState, after: HegemonyState, player: PlayerId): Resources {
  const old = before.players[player].resources;
  const now = after.players[player].resources;
  return Object.fromEntries(
    Object.keys(old).map((key) => {
      const resource = key as keyof Resources;
      return [resource, now[resource] - old[resource]];
    }),
  ) as Resources;
}

/** The log lines a command wrote. A batch trims the log between turns, so they are the
 *  lines after the last one the state before held, not those past its length. */
function linesWritten(before: HegemonyState, G: HegemonyState): LogEntry[] {
  const last = before.log.at(-1);
  if (!last) return G.log;
  const at = G.log.lastIndexOf(last);
  return at < 0 ? [] : G.log.slice(at + 1);
}

/** The single stock a trade's side holds, with nothing else beside it, or null. */
function soleStock(bundle: TradeBundle): [Resource, number] | null {
  if (bundle.goods.length > 0 || totalPops(bundle.pops) > 0) return null;
  const stocks = TRADE_RESOURCES.filter((resource) => (bundle.resources[resource] ?? 0) > 0);
  return stocks.length === 1 ? [stocks[0], bundle.resources[stocks[0]]!] : null;
}

function addUnits(units: Record<TradeUnit, number>, bundle: TradeBundle) {
  for (const resource of TRADE_RESOURCES) units[resource] += bundle.resources[resource] ?? 0;
  units.goods += bundle.goods.length;
  for (const pop of POP_TYPES) units[pop] += bundle.pops[pop];
}

function slaveCounts(G: HegemonyState, playerID: PlayerId) {
  let slaves = 0;
  let idleSlaves = 0;

  for (const tileId of G.players[playerID].settlements) {
    const tile = getTile(G, tileId);
    const settlement = getOwnedSettlement(G, tileId, playerID);

    if (tile && settlement) {
      slaves += settlement.pops.slaves;
      idleSlaves += settlementIdleSlaves(tile, settlement, G);
    }
  }

  return { slaves, idleSlaves };
}

export type Percentiles = {
  mean: number;
  p10: number;
  median: number;
  p90: number;
  min: number;
  max: number;
};

/** Nearest-rank percentiles on a copy; NaN-free for empty input (all zeros). */
export function percentiles(values: number[]): Percentiles {
  if (values.length === 0) {
    return { mean: 0, p10: 0, median: 0, p90: 0, min: 0, max: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const at = (fraction: number) =>
    sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1))];

  return {
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    p10: at(0.1),
    median: at(0.5),
    p90: at(0.9),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

function ratio(part: number, whole: number) {
  return whole > 0 ? part / whole : 0;
}

function sum<T>(items: readonly T[], pick: (item: T) => number) {
  return items.reduce((total, item) => total + pick(item), 0);
}

/** A count, and the same per game played (see `cut`). */
export type Count = { count: number; perGame: number };

function perGame(count: number, games: number): Count {
  return { count, perGame: ratio(count, games) };
}

/** A seat's reach counts whose ids start with `prefix`, summed. */
function reachSum(reach: Record<string, number>, prefix: string) {
  return sum(Object.entries(reach), ([id, count]) => (id.startsWith(prefix) ? count : 0));
}

/** One seat in one game: what every cut reads. */
type SeatGame = {
  game: GameRow;
  seat: PlayerId;
  /** The personality in the seat this game. Once seats rotate it changes game to game. */
  policy: string;
  facts: SeatFacts;
  /** Every turn snapshot of the game. */
  snapshots: TurnSnapshot[];
  /** The seat's own player draws this game. */
  swings: DrawSwing[];
  land: LandRank;
};

/** A figure for the whole table, for each seat and for each personality. */
export type Cut<T> = { total: T; perSeat: Record<PlayerId, T>; perPolicy: Record<string, T> };

/**
 * Every per-seat and per-personality figure in the report: one `value` read over the
 * table's seat-games, over each seat's, and over each personality's, whichever seat it
 * sat in. `value` also gets the games the group played: the table's games for the
 * total, its seat-games for a seat or a personality.
 */
function cut<T>(seatGames: SeatGame[], value: (group: SeatGame[], games: number) => T): Cut<T> {
  const over = (keep: (seatGame: SeatGame) => boolean) => {
    const group = seatGames.filter(keep);
    return value(group, group.length);
  };
  const policies = [...new Set(seatGames.map((seatGame) => seatGame.policy))];
  return {
    total: value(seatGames, seatGames.length / PLAYER_IDS.length),
    perSeat: Object.fromEntries(
      PLAYER_IDS.map((seat) => [seat, over((seatGame) => seatGame.seat === seat)]),
    ) as Record<PlayerId, T>,
    perPolicy: Object.fromEntries(
      policies.map((name) => [name, over((seatGame) => seatGame.policy === name)]),
    ),
  };
}

function groupBy<T>(rows: Iterable<T>, key: (row: T) => number) {
  const groups = new Map<number, T[]>();
  for (const row of rows) {
    const group = groups.get(key(row)) ?? [];
    group.push(row);
    groups.set(key(row), group);
  }
  return groups;
}

type LandRank = Partial<Record<TradableMaterial, "most" | "least">>;

/** For each material, the seat whose land made the most of it over a game's snapshots
 *  and the seat whose land made the least, the first in seat order on a tie. A material
 *  every seat made the same of ranks no one. */
function landRanks(snapshots: TurnSnapshot[]): Record<PlayerId, LandRank> {
  const ranks = Object.fromEntries(PLAYER_IDS.map((seat) => [seat, {}])) as Record<
    PlayerId,
    LandRank
  >;
  for (const material of TRADABLE_MATERIALS) {
    const made = PLAYER_IDS.map((seat) =>
      sum(snapshots, (snapshot) => snapshot.players[seat].income[material]),
    );
    const most = made.indexOf(Math.max(...made));
    const least = made.indexOf(Math.min(...made));
    if (made[most] === made[least]) continue;
    ranks[PLAYER_IDS[most]][material] = "most";
    ranks[PLAYER_IDS[least]][material] = "least";
  }
  return ranks;
}

export type YearRow = {
  year: number;
  games: number;
  victoryCards: Percentiles;
  pops: Percentiles;
  food: Percentiles;
  happiness: Percentiles;
  gold: Percentiles;
  influence: Cut<Percentiles>;
  unrestTierShares: Record<UnrestTier, number>;
  activeEffectShares: Record<ActiveEffectKind, number>;
};

/** What decided a finished game: the title race, or at the deck's end the titles
 *  held or the first tiebreak that separated the top two seats. */
export type GameDecision = "race" | "titles" | "happiness" | "pops" | "seat";
const GAME_DECISIONS: GameDecision[] = ["race", "titles", "happiness", "pops", "seat"];

/** How a game ended. A real result (victoryRace/deckExhausted) names a winner; a
 *  game stopped at the turn cap has no winner — only a leaderAtCap heuristic. */
export type GameTermination = GameOverReason | "turnCap";

/** The game in progress's own counts, beside its seats'. */
type GameCounts = {
  /** Voice passing from one seat straight to another. */
  voiceTransfers: number;
  /** The prizes paid for authored passes, at the ruleset's table. */
  prizesGranted: Resources;
  /** Turns the runner force-ended at the per-turn action cap, and the pending events,
   *  hunger picks and riots it had to force-resolve first. */
  actionCapHits: number;
  forcedResolutions: number;
};

function emptyGameCounts(): GameCounts {
  return {
    voiceTransfers: 0,
    prizesGranted: { wood: 0, stone: 0, gold: 0, food: 0, influence: 0 },
    actionCapHits: 0,
    forcedResolutions: 0,
  };
}

export type GameRow = GameCounts & {
  game: number;
  seed: number;
  turnsPlayed: number;
  finalYear: number;
  termination: GameTermination;
  /** The real winner — null for turn-capped (unfinished) games. */
  winner: PlayerId | null;
  /** Heuristic leader when the game was cut off at the cap; null for finished games. */
  leaderAtCap: PlayerId | null;
  /** Which policy sat in each seat this game (mixed-policy tables); absent for uniform runs. */
  seatPolicies?: Record<PlayerId, string>;
  /** What decided a finished game; null for a turn-capped one. */
  decidedBy: GameDecision | null;
  /** The titles held by the winner at a victory-race finish; empty for other endings. */
  winningTitles: string[];
  /** The seat holding Voice when the game ended. */
  voiceHolder: PlayerId | null;
  assembliesHeld: number;
  /** The year cards in the order they turned. */
  yearCards: string[];
  seats: Record<PlayerId, SeatFacts>;
};

/** Who won, over finished seat-games: a turn-capped game has no winner, so its seats
 *  are counted apart, with the seat that led at the cap. */
export type Results = {
  finishedSeatGames: number;
  cappedSeatGames: number;
  wins: number;
  winRate: number;
  capLeads: number;
  capLeaderRate: number;
  /** The wins split by what decided the game. `happiness`, `pops` and `seat` are
   *  tiebreak wins at the deck's end. */
  winsDecidedBy: Record<GameDecision, number>;
  finalCards: Percentiles;
  finalTitles: Record<string, number>;
};

/** One National Idea: picked at setup or bought in any game, then held and won with
 *  over finished games. */
export type IdeaHolders = {
  setupPicks: number;
  purchases: number;
  holders: number;
  wins: number;
  winRate: number;
};

/** Food under work slots: turns that ended short of food (each ends in one hunger
 *  choice), the pops that left for it, and the slaves with no slot to work. */
export type Hunger = {
  hungerTurns: Count;
  popsLost: Count;
  /** Mean idle slaves over the group's turn snapshots, and their share of its slaves. */
  idleSlavesMean: number;
  idleSlaveShare: number;
};

/** Turns a seat began short of food, and the food it bought in each state. */
export type FoodPurchases = {
  /** Turns the acting seat began with food below zero, after income. */
  turnsBegunShort: number;
  /** Bought with the stock below zero. */
  coveringShortfall: FoodBought;
  /** Bought at zero or above. */
  buyingAhead: FoodBought;
};

export type RiotYearRow = { year: number; riots: number; playerTurns: number; revolts: number };

/** The riot table: riots resolved and revolts (the lower line, where the ruleset's
 *  share of the slaves leave with no roll), the share of the group's own turns that
 *  opened the table, and the same counts year by year, so a report can cut the late
 *  game. `playerTurns` are the group's own turns that year. */
export type Riots = { riots: Count; revolts: Count; turnShare: number; byYear: RiotYearRow[] };

/** Beloved against the luxury leader, over the turn snapshots in which it was held. */
export type BelovedLuxury = {
  turnsHeld: number;
  /** The holder had more active luxuries than every other seat. */
  soleLuxuryLeader: number;
  soleLuxuryLeaderShare: number;
  /** The holder had at least one, and no seat had more. */
  luxuryLeaderOrTied: number;
  luxuryLeaderOrTiedShare: number;
};

export type Classes = { slaves: Percentiles; freemen: Percentiles; citizens: Percentiles };

/** One seat's Assembly. Passes are the engine's record; Voice reads standing Laws. */
export type AssemblySeat = {
  lawsProposed: Count;
  /** Resolutions it authored that passed, and of them the Laws and the Directives. */
  authoredPasses: Count;
  lawsPassed: Count;
  directivesPassed: Count;
  authoredLawsStanding: Count;
  votesBought: Count;
  voteGold: Count;
  voiceClaims: Count;
  /** Table-turns it held Voice. */
  voiceHeldTurns: Count;
  /** Repeals it filed, and how the vote on each went. */
  repealsProposed: Count;
  repealsPassed: Count;
  repealsFailed: Count;
  /** Passed Directives aimed at it. */
  directivesAimedAt: Count;
};

/** Player trade. Offers and the trades they settled belong to the offering seat,
 *  answers to the answering seat, units to whichever side moved them. */
export type TradeFigures = {
  /** Offers by how they closed: settled (accepted, or a counter taken), withdrawn, or
   *  still open when the turn or the Assembly's preparation ended. A settled offer is a
   *  trade. */
  offers: { settled: Count; withdrawn: Count; closed: Count };
  /** Trades settled while the Assembly sat. */
  settledInSitting: Count;
  answers: Record<TradeAnswer["kind"], Count>;
  /** Units handed over and taken in. `goods` are the luxury goods that changed hands. */
  given: Record<TradeUnit, Count>;
  received: Record<TradeUnit, Count>;
  /** Trades after which a title changed holder. */
  titleChanges: Count;
  /** What one unit of a material fetched in a trade of that material alone for one other
   *  stock, by material and then that stock, priced by the seat that sold it. */
  prices: Partial<
    Record<TradableMaterial, Partial<Record<Resource, { trades: number; price: Percentiles }>>>
  >;
  /**
   * Who exports what. Per material, the games in which a seat of the group was the one
   * whose land made the most of it (or the least), and the units that seat sent out a
   * game, given less received. Trade works when the first is positive and the second
   * negative.
   */
  exports: Record<
    TradableMaterial,
    { most: { games: number; netSent: number }; least: { games: number; netSent: number } }
  >;
};

export type BatchReport = {
  meta: {
    games: number;
    turns: number;
    policy: string;
    mode: string;
    boardLayout: BoardLayout;
    /** How setup was placed: the shared placement policy, or the uniform draw. */
    opening: OpeningKind;
    baseSeed: number;
    botSeedRule: string;
    rulesetPatch: unknown;
    /** Exact rules/content provenance shared by every game in this batch. */
    definition: DefinitionIdentity;
    /** The National Ideas `--without-ideas` took out of the batch's content (null when none). */
    withoutIdeas?: string[] | null;
    /** The dev tune-panel override map applied to content/ruleset for this run (null when
     *  none), plus a stable fingerprint — so a batch's content is identifiable and A/B-able. */
    tunePatch?: unknown;
    tunePatchHash?: string | null;
    tuningPresetId?: string | null;
    resolvedContentHash?: string | null;
    /** Base seat→policy assignment for a mixed-policy batch (null for a uniform run).
     *  With --rotate the per-game assignment varies; see perGame[].seatPolicies. */
    seatPolicies?: Record<PlayerId, string> | null;
    /** Seatings played per seed: 1 without --rotate, otherwise the distinct cyclic
     *  rotations of the base seating (4 for four different seats). */
    rotations?: number;
    generatedAt: string;
  };
  perGame: GameRow[];
  /** How games terminated — the denominator context for winRate (finished games only)
   *  vs capLeaderRate (turn-capped games). */
  terminations: Record<GameTermination, number>;
  /** Wins credited to the seat and to the POLICY that held it. Over a rotated mixed
   *  batch the per-personality figures are seat-independent. */
  results: Cut<Results>;
  reach: Cut<ReachReport>;
  /** Immediate resolution changes against the draw-position projected income, not a decision counterfactual. */
  drawSwings: DrawSwing[];
  drawSwingSummary: Cut<DrawSwingSummary>;
  /** The classes over every turn snapshot of the group's seats. */
  classes: Cut<Classes>;
  nationalIdeas: Record<NationalIdeaId, Cut<IdeaHolders>>;
  perYear: YearRow[];
  hunger: Cut<Hunger>;
  foodPurchases: Cut<FoodPurchases>;
  riots: Cut<Riots>;
  /** Rule 5: how often Beloved's holder is also the luxury leader. Both readings of a
   *  tie are given. */
  beloved: Cut<BelovedLuxury>;
  influenceSpent: Cut<Record<InfluenceSink, Count>>;
  trade: Cut<TradeFigures>;
  /** Universal action telemetry. Every GameCommand type is present, including zeroes,
   *  so newly added or unexercised actions cannot disappear from a report. */
  movesByType: Record<GameCommandType, Count>;
  /** Effect prevalence over every player-turn snapshot; no status can vanish from
   *  balance interpretation merely because it has no dedicated move. */
  activeEffects: Record<
    ActiveEffectKind,
    { observations: number; perPlayerTurn: number; playerTurnShare: number }
  >;
  /** Every shipped building id is present, including zeroes. */
  buildings: Record<BuildingId, { built: number; perGame: number }>;
  /** Phase 4 luxuries: how many goods were claimed / active at game end, the standing
   *  happiness they carried, and end-of-game banked gold (monitored, not judged — Q46).
   *  Ports built already appear under `buildings.port`. */
  luxuries: {
    claimedPerGame: number;
    activePerGame: number;
    /** Mean standing luxury happiness per seat at game end — the Beloved contribution. */
    happinessPerSeatMean: number;
    endGoldDistribution: Percentiles;
  };
  events: {
    /** Every shipped player-event id is present, including zeroes. */
    player: Record<PlayerEventContentId, number>;
    /** Every year card's id is present, including zeroes. */
    year: Record<YearCardContentId, number>;
  };
  /** Phase 1 exit-gate instrument: how often each currency verb fired (total and
   *  per game) — a verb at ~0 per game is a dead currency talking. */
  currencyVerbs: Record<string, Count>;
  /** Turns the runner had to force-end at the per-turn action cap — previously
   *  invisible. forcedResolutions counts pending events, hunger picks and riots that
   *  had to be force-resolved first. */
  forced: { actionCapHits: number; forcedResolutions: number; perGame: number };
  /** Colony→city upgrades performed across the batch (total + per game) — a bot that
   *  never saves for them reads ~0/game here. */
  upgrades: Count;
  /**
   * The Assembly (Phase 3-B) — Influence's main sink, so this is the instrument for
   * the balance question the design flags as the most important A/B: is the sink
   * deep enough, and is anything actually passing?
   *
   * `verbs` counting near zero means the bots are ignoring the agora entirely, and
   * standing Laws near zero means the sink exists but nothing it buys ever reaches
   * the board.
   */
  assembly: {
    seats: Cut<AssemblySeat>;
    held: Count;
    prizesGranted: Resources;
    voiceTransfers: Count;
    /** Games that ended with Voice claimed; `perGame` is the share of all games. */
    voiceHoldersAtEnd: Count;
    /** Finished games won by their final Voice holder. */
    voiceHolderWins: { count: number; finishedGames: number; rate: number };
    /** Highest authored-pass total minus the runner-up total in each game. */
    authoredPassLeadMargin: Percentiles;
    /** The leading seat's share of all authored passes in each game (zero if none passed). */
    authoredPassLeaderShare: Percentiles;
    /** Laws that LEFT the board — repealed, replaced at the cap, or torn down by
     *  Stratokles. Derived (passed − still standing), so it needs no counter. */
    lawsRemoved: Count;
    /** Influence spent on the Assembly's sinks: votes, draws and repeals. */
    influenceSpent: Count;
    verbs: Record<string, Count>;
  };
};

/** The Assembly's verbs, in report order. */
const ASSEMBLY_VERBS = [
  "assemblyDraw",
  "assemblyPropose",
  "assemblyProposeRepeal",
  "assemblyPass",
  "assemblyBribe",
  "assemblyVote",
] as const;

/** The Phase 1 currency verbs, in report order. */
const CURRENCY_VERBS = [
  "bankSell",
  "bankBuy",
  "dole",
  "civicCalm",
  "promotePop",
  "demotePop",
  "fundExpedition",
  "buyRiotInsurance",
  "resolveRiot",
] as const;

/**
 * What a batch gathers across its games, as plain lists. Every figure in the report is
 * built from them, so a batch can be shared out: a worker process hands back the data
 * of each game it played and the parent appends them in game order
 * (`Aggregator.absorb`).
 */
export type BatchData = {
  snapshots: TurnSnapshot[];
  /** One snapshot of each game's last state, for the CSV. */
  finals: TurnSnapshot[];
  games: GameRow[];
  drawSwings: DrawSwing[];
};

// The figures. Each reads a group of seat-games, and the games it played (see `cut`).

/** Sums a seat's fact over a group, per game it played. */
function counter(group: SeatGame[], games: number) {
  return (pick: (seatGame: SeatGame) => number) => perGame(sum(group, pick), games);
}

/** Every seat sees the year's card turn, so each seat-game reaches the cards its game
 *  turned. */
function reachOf(group: SeatGame[]): ReachReport {
  const counts = emptyReachCounts();
  for (const { game, facts } of group) {
    for (const [id, count] of Object.entries(facts.reach)) counts[id] = (counts[id] ?? 0) + count;
    for (const card of game.yearCards) counts[`year:${card}`] = (counts[`year:${card}`] ?? 0) + 1;
  }
  return {
    seatGames: group.length,
    counts,
    perSeatGame: Object.fromEntries(
      Object.entries(counts).map(([id, count]) => [id, ratio(count, group.length)]),
    ),
  };
}

/** Real win rate is over FINISHED games only; a turn-capped game is not a win. */
function resultsOf(group: SeatGame[]): Results {
  const finished = group.filter(({ game }) => game.termination !== "turnCap");
  const capped = group.filter(({ game }) => game.termination === "turnCap");
  const won = finished.filter(({ game, seat }) => game.winner === seat);
  const capLeads = capped.filter(({ game, seat }) => game.leaderAtCap === seat).length;
  const winsDecidedBy = Object.fromEntries(GAME_DECISIONS.map((key) => [key, 0])) as Record<
    GameDecision,
    number
  >;
  for (const { game } of won) if (game.decidedBy) winsDecidedBy[game.decidedBy] += 1;
  const finalTitles = Object.fromEntries(VICTORY_CARDS.map((card) => [card.id, 0]));
  for (const { facts } of finished) for (const title of facts.finalTitles) finalTitles[title] += 1;
  return {
    finishedSeatGames: finished.length,
    cappedSeatGames: capped.length,
    wins: won.length,
    winRate: ratio(won.length, finished.length),
    capLeads,
    capLeaderRate: ratio(capLeads, capped.length),
    winsDecidedBy,
    finalCards: percentiles(finished.map(({ facts }) => facts.finalCards)),
    finalTitles,
  };
}

function drawSwingsOf(group: SeatGame[]): DrawSwingSummary {
  const rows = group.flatMap(({ swings }) => swings);
  const resourceCards = rows.filter((row) => row.materialMagnitude > 0);
  const popCards = rows.filter((row) => row.pops !== 0);
  const tokenCards = rows.filter((row) => row.unrestTokens !== 0);
  return {
    draws: sum(group, ({ facts }) => reachSum(facts.reach, "playerDraw:")),
    discarded: sum(group, ({ facts }) => facts.cardsDiscarded),
    resourceCards: resourceCards.length,
    collectedRatio: percentiles(resourceCards.flatMap((row) => row.collectedRatio ?? [])),
    popCards: popCards.length,
    popsMoved: sum(popCards, (row) => Math.abs(row.pops)),
    tokenCards: tokenCards.length,
    tokensMoved: sum(tokenCards, (row) => Math.abs(row.unrestTokens)),
    unchanged: rows.length - new Set([...resourceCards, ...popCards, ...tokenCards]).size,
  };
}

function classesOf(group: SeatGame[]): Classes {
  const samples = group.flatMap(({ seat, snapshots }) =>
    snapshots.map((snapshot) => snapshot.players[seat]),
  );
  return {
    slaves: percentiles(samples.map((sample) => sample.slaves)),
    freemen: percentiles(samples.map((sample) => sample.freemen)),
    citizens: percentiles(samples.map((sample) => sample.citizens)),
  };
}

/** Each personality drafts the same Idea most games, so the table's rate is mostly one
 *  personality's win rate. The cut shows which. */
function ideaHolders(idea: NationalIdeaId) {
  return (group: SeatGame[]): IdeaHolders => {
    const held = group.flatMap((seatGame) => {
      const own = seatGame.facts.nationalIdeas.find((owned) => owned.id === idea);
      return own ? [{ ...seatGame, own }] : [];
    });
    const holders = held.filter(({ game }) => game.termination !== "turnCap");
    const wins = holders.filter(({ game, seat }) => game.winner === seat).length;
    const setupPicks = held.filter(({ own }) => own.acquired === "setup").length;
    return {
      setupPicks,
      purchases: held.length - setupPicks,
      holders: holders.length,
      wins,
      winRate: ratio(wins, holders.length),
    };
  };
}

/** The influence stock at each game's last snapshot of the year (see `yearRows`). */
function influenceAt(year: number) {
  return (group: SeatGame[]) =>
    percentiles(
      group.flatMap(({ seat, snapshots }) => {
        const tail = snapshots.filter((snapshot) => snapshot.year === year).at(-1);
        return tail ? [tail.players[seat].resources.influence] : [];
      }),
    );
}

/** A hunger turn is one hunger choice: hunger strikes once, at the seat's own turn end. */
function hungerOf(group: SeatGame[], games: number): Hunger {
  const count = counter(group, games);
  let idle = 0;
  let slaves = 0;
  let samples = 0;
  for (const { seat, snapshots } of group) {
    for (const snapshot of snapshots) {
      idle += snapshot.players[seat].idleSlaves;
      slaves += snapshot.players[seat].slaves;
      samples += 1;
    }
  }
  return {
    hungerTurns: count(({ facts }) => facts.reach["command:resolveHunger"] ?? 0),
    popsLost: count(({ facts }) => facts.popsLostToHunger),
    idleSlavesMean: ratio(idle, samples),
    idleSlaveShare: ratio(idle, slaves),
  };
}

function foodPurchasesOf(group: SeatGame[]): FoodPurchases {
  const total: FoodPurchases = {
    turnsBegunShort: 0,
    coveringShortfall: emptyFoodBought(),
    buyingAhead: emptyFoodBought(),
  };
  for (const { seat, snapshots, facts } of group) {
    for (const snapshot of snapshots) {
      if (snapshot.actingSeat === seat && snapshot.players[seat].resources.food < 0)
        total.turnsBegunShort += 1;
    }
    for (const state of ["coveringShortfall", "buyingAhead"] as const) {
      for (const key of Object.keys(total[state]) as Array<keyof FoodBought>)
        total[state][key] += facts.foodBought[state][key];
    }
  }
  return total;
}

/** Every snapshot is one player-turn, so a year's snapshots are its turns. */
function riotsOf(group: SeatGame[], games: number): Riots {
  const rows = new Map<number, RiotYearRow>();
  const row = (year: number) => {
    if (!rows.has(year)) rows.set(year, { year, riots: 0, playerTurns: 0, revolts: 0 });
    return rows.get(year)!;
  };
  let turns = 0;
  for (const { seat, snapshots, facts } of group) {
    for (const snapshot of snapshots) {
      if (snapshot.actingSeat !== seat) continue;
      row(snapshot.year).playerTurns += 1;
      turns += 1;
    }
    for (const year of facts.riotYears) row(year).riots += 1;
    for (const year of facts.revoltYears) row(year).revolts += 1;
  }
  const count = counter(group, games);
  const riots = count(({ facts }) => facts.riotYears.length);
  return {
    riots,
    revolts: count(({ facts }) => facts.revoltYears.length),
    turnShare: ratio(riots.count, turns),
    byYear: [...rows.values()].sort((a, b) => a.year - b.year),
  };
}

/** A seat with no good leads nothing, so "leader or tied" needs at least one. */
function belovedOf(group: SeatGame[]): BelovedLuxury {
  let turnsHeld = 0;
  let sole = 0;
  let tied = 0;
  for (const { seat, snapshots } of group) {
    for (const snapshot of snapshots) {
      if (snapshot.belovedHolder !== seat) continue;
      const own = snapshot.players[seat].activeLuxuries;
      const rivals = Math.max(
        ...PLAYER_IDS.filter((id) => id !== seat).map((id) => snapshot.players[id].activeLuxuries),
      );
      turnsHeld += 1;
      if (own > rivals) sole += 1;
      if (own > 0 && own >= rivals) tied += 1;
    }
  }
  return {
    turnsHeld,
    soleLuxuryLeader: sole,
    soleLuxuryLeaderShare: ratio(sole, turnsHeld),
    luxuryLeaderOrTied: tied,
    luxuryLeaderOrTiedShare: ratio(tied, turnsHeld),
  };
}

function influenceSpentOf(group: SeatGame[], games: number): Record<InfluenceSink, Count> {
  const count = counter(group, games);
  return Object.fromEntries(
    INFLUENCE_SINKS.map((sink) => [sink, count(({ facts }) => facts.influenceSpent[sink])]),
  ) as Record<InfluenceSink, Count>;
}

/** A Law passed is an authored pass that was not a Directive. */
function assemblyOf(group: SeatGame[], games: number): AssemblySeat {
  const count = counter(group, games);
  return {
    lawsProposed: count(({ facts }) => reachSum(facts.reach, "lawProposed:")),
    authoredPasses: count(({ facts }) => facts.authoredPasses),
    lawsPassed: count(({ facts }) => facts.authoredPasses - facts.directivesPassed),
    directivesPassed: count(({ facts }) => facts.directivesPassed),
    authoredLawsStanding: count(({ facts }) => facts.authoredLawsStanding),
    votesBought: count(({ facts }) => facts.reach["command:assemblyBribe"] ?? 0),
    voteGold: count(({ facts }) => facts.voteGold),
    voiceClaims: count(({ facts }) => facts.voiceClaims),
    voiceHeldTurns: count(({ seat, snapshots }) =>
      sum(snapshots, (snapshot) => snapshot.players[seat].voiceHeld),
    ),
    repealsProposed: count(({ facts }) => facts.reach["command:assemblyProposeRepeal"] ?? 0),
    repealsPassed: count(({ facts }) => facts.repealsPassed),
    repealsFailed: count(({ facts }) => facts.repealsFailed),
    directivesAimedAt: count(({ facts }) => facts.directivesAimedAt),
  };
}

function tradeOf(group: SeatGame[], games: number): TradeFigures {
  const count = counter(group, games);
  const units = (side: "given" | "received") =>
    Object.fromEntries(
      TRADE_UNITS.map((unit) => [unit, count(({ facts }) => facts.trade[side][unit])]),
    ) as Record<TradeUnit, Count>;
  const prices: TradeFigures["prices"] = {};
  for (const material of TRADABLE_MATERIALS) {
    for (const stock of TRADE_RESOURCES) {
      const samples = group.flatMap(({ facts }) => facts.trade.prices[material]?.[stock] ?? []);
      if (samples.length > 0)
        (prices[material] ??= {})[stock] = { trades: samples.length, price: percentiles(samples) };
    }
  }
  const sent = (material: TradableMaterial, rank: "most" | "least") => {
    const ranked = group.filter(({ land }) => land[material] === rank);
    const net = sum(
      ranked,
      ({ facts }) => facts.trade.given[material] - facts.trade.received[material],
    );
    return { games: ranked.length, netSent: ratio(net, ranked.length) };
  };
  return {
    offers: {
      settled: count(({ facts }) => facts.trade.offers.settled),
      withdrawn: count(({ facts }) => facts.reach["command:tradeWithdraw"] ?? 0),
      closed: count(({ facts }) => facts.trade.offers.closed),
    },
    settledInSitting: count(({ facts }) => facts.trade.settledInSitting),
    answers: {
      accept: count(({ facts }) => facts.trade.answers.accept),
      counter: count(({ facts }) => facts.trade.answers.counter),
      decline: count(({ facts }) => facts.trade.answers.decline),
    },
    given: units("given"),
    received: units("received"),
    titleChanges: count(({ facts }) => facts.trade.titleChanges),
    prices,
    exports: Object.fromEntries(
      TRADABLE_MATERIALS.map((material) => [
        material,
        { most: sent(material, "most"), least: sent(material, "least") },
      ]),
    ) as TradeFigures["exports"],
  };
}

/** Year rows use only each game's LAST snapshot of that year, pooled across games and
 *  seats. That is the start of the year's last turn: its seat has collected and not yet
 *  acted. */
function yearRows(snapshots: TurnSnapshot[], seatGames: SeatGame[]): YearRow[] {
  const tails = new Map<string, TurnSnapshot>();
  for (const snapshot of snapshots) tails.set(`${snapshot.game}:${snapshot.year}`, snapshot);

  return [...groupBy(tails.values(), (snapshot) => snapshot.year).entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, rows]) => {
      const values = (select: (player: PlayerSnapshot) => number) =>
        rows.flatMap((row) => PLAYER_IDS.map((playerID) => select(row.players[playerID])));

      const tierShares: Record<UnrestTier, number> = {
        calm: 0,
        discontent: 0,
        unrest: 0,
        revolt: 0,
      };
      const seats = rows.length * PLAYER_IDS.length;
      const activeEffectShares = Object.fromEntries(
        ACTIVE_EFFECT_KINDS.map((kind) => [kind, 0]),
      ) as Record<ActiveEffectKind, number>;

      for (const row of rows) {
        for (const playerID of PLAYER_IDS) {
          tierShares[row.players[playerID].unrestTier] += 1 / seats;
          for (const kind of ACTIVE_EFFECT_KINDS) {
            if (row.players[playerID].activeEffects[kind] > 0) {
              activeEffectShares[kind] += 1 / seats;
            }
          }
        }
      }

      return {
        year,
        games: rows.length,
        victoryCards: percentiles(values((player) => player.victoryCards)),
        pops: percentiles(values((player) => player.pops + player.inTransit)),
        food: percentiles(values((player) => player.resources.food)),
        happiness: percentiles(values((player) => player.happiness)),
        gold: percentiles(values((player) => player.resources.gold)),
        influence: cut(seatGames, influenceAt(year)),
        unrestTierShares: tierShares,
        activeEffectShares,
      };
    });
}

function activeEffectsOf(snapshots: TurnSnapshot[]): BatchReport["activeEffects"] {
  const playerTurns = snapshots.length * PLAYER_IDS.length;
  return Object.fromEntries(
    ACTIVE_EFFECT_KINDS.map((kind) => {
      let observations = 0;
      let playerTurnsWithEffect = 0;
      for (const snapshot of snapshots) {
        for (const playerID of PLAYER_IDS) {
          const count = snapshot.players[playerID].activeEffects[kind];
          observations += count;
          if (count > 0) {
            playerTurnsWithEffect += 1;
          }
        }
      }
      return [
        kind,
        {
          observations,
          perPlayerTurn: ratio(observations, playerTurns),
          playerTurnShare: ratio(playerTurnsWithEffect, playerTurns),
        },
      ];
    }),
  ) as BatchReport["activeEffects"];
}

export class Aggregator {
  /** Everything gathered so far. The other fields hold the game in progress. */
  readonly data: BatchData = { snapshots: [], finals: [], games: [], drawSwings: [] };
  private setupMoves: Array<{ state: HegemonyState; player: PlayerId; move: GameCommand }> = [];
  private previousState?: HegemonyState;
  private countReach(player: PlayerId, ids: string[]) {
    const reach = this.seats[player].reach;
    for (const id of ids) reach[id] = (reach[id] ?? 0) + 1;
  }

  /** The game in progress, seat by seat and its own; endGame files both on its row. */
  private seats = emptySeatCounts();
  private gameCounts = emptyGameCounts();
  private gameYearCards: string[] = [];
  /** What the acting seat's stock changed by at this turn's income. */
  private collected: Resources | null = null;
  private lastVoiceHolder: PlayerId | null = null;
  private lastAssemblyResultKey: string | null = null;

  private game = -1;
  private seed = 0;
  private startTurn = 1;
  private lastYear = 0;
  private gameSeatPolicies: Record<PlayerId, string> | null = null;

  /** Adds games played apart, one `BatchData` a game. Whatever order they are given
   *  in, they are added in game order: workers finish out of order, and the report
   *  lists games, turns and draws as they were added. */
  absorb(games: BatchData[]) {
    const index = (data: BatchData) => data.games[0].game;
    for (const data of [...games].sort((a, b) => index(a) - index(b))) {
      for (const key of Object.keys(data) as Array<keyof BatchData>) {
        for (const item of data[key]) (this.data[key] as unknown[]).push(item);
      }
    }
  }

  beginGame(game: number, seed: number, G: HegemonyState, seatPolicies?: Record<PlayerId, string>) {
    this.game = game;
    this.seed = seed;
    this.startTurn = G.turn;
    this.lastYear = G.year;
    this.gameSeatPolicies = seatPolicies ?? null;
    this.lastVoiceHolder = voiceHolder(G);
    this.lastAssemblyResultKey = null;
    this.seats = emptySeatCounts();
    this.gameCounts = emptyGameCounts();
    this.gameYearCards = [];
    // The last setup move opened turn 1 with the opener's income. Its own maker is
    // left out: a setup Idea can pay gold in the same step.
    const [beforeOpening, opening] = this.setupMoves.slice(-2);
    this.collected =
      opening && opening.player !== G.currentPlayer
        ? resourceChange(beforeOpening.state, G, G.currentPlayer)
        : null;
    for (const { state, player, move } of this.setupMoves)
      this.countReach(player, moveReachIds(state, player, move));
    this.setupMoves = [];
    this.previousState = G;

    // The opening already revealed year 1's card and player 0's first draw.
    this.countYearCard(G);
    this.countPlayerDraw(G);
    this.data.snapshots.push(snapshotTurn(G, this.game, this.seed));
  }

  onMove(G: HegemonyState, player: PlayerId, move: GameCommand) {
    // Setup moves are counted once the game begins, into its seats.
    if (["placeCapital", "placeCity", "placeColony", "pickIdea"].includes(move.type)) {
      this.setupMoves.push({ state: G, player, move });
      return;
    }

    const before = this.previousState;
    this.countReach(player, moveReachIds(G, player, move, before));
    if (before) {
      this.countSpending(before, G, player, move);
      this.countRevolts(before, G);
      this.countTrade(before, G, player, move);
    }
    if (move.type === "resolveEvent" && before?.pendingPlayerEvent) {
      const old = before.players[player];
      const now = G.players[player];
      const resources = resourceChange(before, G, player);
      const magnitude = (r: Resources) => Object.values(r).reduce((sum, n) => sum + Math.abs(n), 0);
      const incomeMagnitude = magnitude(calculateIncome(before, player));
      const materialMagnitude = magnitude(resources);
      const collectedMagnitude = Object.values(this.collected ?? {}).reduce(
        (sum, n) => sum + Math.max(0, n),
        0,
      );
      this.data.drawSwings.push({
        game: this.game,
        year: before.year,
        player,
        policy: this.gameSeatPolicies?.[player] ?? "unassigned",
        card: before.pendingPlayerEvent!.card.id,
        resources,
        pops: playerStandings(G, player).pops - playerStandings(before, player).pops,
        unrestTokens: now.unrestTokens - old.unrestTokens,
        materialMagnitude,
        incomeMagnitude,
        ratio: incomeMagnitude ? materialMagnitude / incomeMagnitude : null,
        collected: this.collected,
        collectedMagnitude,
        collectedRatio: collectedMagnitude ? materialMagnitude / collectedMagnitude : null,
      });
    }
    // A command that opens the next turn also pays that seat its income, and
    // nothing else in the step touches its stock.
    if (before && G.turn !== before.turn && G.phase === "gameplay")
      this.collected = resourceChange(before, G, G.currentPlayer);
    this.previousState = G;

    if (move.type === "resolveRiot") {
      // Resolution can turn the year or open the next seat. The roll records
      // the original year; the next income/draw is observed by onTurnEnd.
      this.seats[player].riotYears.push(G.lastTableRoll!.year);
    }

    this.countAssemblyResult(G);

    const voice = voiceHolder(G);
    if (voice !== this.lastVoiceHolder) {
      if (voice) {
        this.seats[voice].voiceClaims += 1;
        if (this.lastVoiceHolder) this.gameCounts.voiceTransfers += 1;
      }
      this.lastVoiceHolder = voice;
    }
  }

  /** Influence paid, gold paid for votes and food bought, read off what the command did
   *  to the seat's stock, so a price an Idea or a Law changed is counted as paid. */
  private countSpending(
    before: HegemonyState,
    G: HegemonyState,
    player: PlayerId,
    move: GameCommand,
  ) {
    const seat = this.seats[player];
    const change = resourceChange(before, G, player);
    const sink = influenceSink(move);
    if (sink) seat.influenceSpent[sink] += Math.max(0, -change.influence);
    if (move.type === "assemblyBribe") seat.voteGold += Math.max(0, -change.gold);

    if (move.type === "dole" || (move.type === "bankBuy" && move.material === "food")) {
      // Below zero the seat is covering a shortfall; at zero or above it buys ahead.
      const bought =
        before.players[player].resources.food < 0
          ? seat.foodBought.coveringShortfall
          : seat.foodBought.buyingAhead;
      if (move.type === "dole") bought.doles += 1;
      else bought.bankBuys += 1;
      bought.food += change.food;
      bought.gold += Math.max(0, -change.gold);
      bought.influence += Math.max(0, -change.influence);
    }
  }

  /** A revolt has no command of its own: the turn-end check runs inside another, so it
   *  is read off the engine's counter, in the year the command started in. */
  private countRevolts(before: HegemonyState, G: HegemonyState) {
    for (const seat of PLAYER_IDS) {
      for (let revolt = before.players[seat].revolts; revolt < G.players[seat].revolts; revolt++)
        this.seats[seat].revoltYears.push(before.year);
    }
  }

  /** Answers are the commands; a settled trade is the engine's log moment; an offer that
   *  left the table some other way than settling or its withdrawal closed with its window. */
  private countTrade(before: HegemonyState, G: HegemonyState, player: PlayerId, move: GameCommand) {
    if (move.type === "tradeAnswer") this.seats[player].trade.answers[move.answer.kind] += 1;

    const own =
      move.type === "tradeAnswer" || move.type === "tradeSettle" || move.type === "tradeWithdraw"
        ? move.offerId
        : null;
    for (const offer of before.offers) {
      if (offer.id !== own && !G.offers.some((open) => open.id === offer.id))
        this.seats[offer.from].trade.offers.closed += 1;
    }

    for (const { moment } of linesWritten(before, G)) {
      if (moment?.kind === "trade") this.countSettled(before, G, moment);
    }
  }

  private countSettled(
    before: HegemonyState,
    G: HegemonyState,
    { from, partner, terms }: Extract<LogMoment, { kind: "trade" }>,
  ) {
    const offering = this.seats[from].trade;
    const answering = this.seats[partner].trade;
    offering.offers.settled += 1;
    if (before.assembly) offering.settledInSitting += 1;
    if (titleChanges(G, titleHolders(before)).length > 0) offering.titleChanges += 1;
    addUnits(offering.given, terms.give);
    addUnits(offering.received, terms.get);
    addUnits(answering.given, terms.get);
    addUnits(answering.received, terms.give);

    // Priced only where one side is a material alone and the other one stock alone.
    const price = (seller: TradeCounts, sold: TradeBundle, paid: TradeBundle) => {
      const material = soleStock(sold);
      const stock = soleStock(paid);
      if (!material || !stock || material[0] === stock[0]) return;
      if (!(TRADABLE_MATERIALS as Resource[]).includes(material[0])) return;
      const prices = (seller.prices[material[0] as TradableMaterial] ??= {});
      (prices[stock[0]] ??= []).push(stock[1] / material[1]);
    };
    price(offering, terms.give, terms.get);
    price(answering, terms.get, terms.give);
  }

  /** The Assembly's latest result, once: the list stands until the sitting closes. */
  private countAssemblyResult(G: HegemonyState) {
    const results = G.assembly?.results;
    if (!results || results.length === 0) return;
    const key = `${this.game}:${G.assembliesHeld}:${results.length}`;
    if (key === this.lastAssemblyResultKey) return;
    this.lastAssemblyResultKey = key;

    const { item, outcome } = results[results.length - 1];
    if (item.kind === "repeal") {
      const seat = this.seats[item.proposer];
      if (outcome === "carried") seat.repealsPassed += 1;
      else seat.repealsFailed += 1;
    } else if (outcome === "carried") {
      this.countReach(item.proposer, [`${item.card.kind}:${item.card.id}`]);
      const prize = G.ruleset.assembly.prizes[item.card.politician];
      for (const [resource, amount] of Object.entries(prize) as Array<
        [keyof Resources, number | undefined]
      >) {
        this.gameCounts.prizesGranted[resource] += amount ?? 0;
      }
      if (item.card.kind === "directive" && item.target)
        this.seats[item.target].directivesAimedAt += 1;
    }
  }

  /** The runner hit the per-turn action cap and force-ended the turn. Previously
   *  silent; surfaced so balance runs can see how often bots stall out. */
  onForceEndTurn(_G: HegemonyState, forcedResolutions: number) {
    this.gameCounts.actionCapHits += 1;
    this.gameCounts.forcedResolutions += forcedResolutions;
  }

  onTurnEnd(G: HegemonyState) {
    // A new year's card is public even if the opener wins before collecting.
    if (G.year !== this.lastYear) {
      this.lastYear = G.year;
      this.countYearCard(G);
    }

    // Deck exhaustion ends the game mid-endTurn WITHOUT advancing the turn or the year (see
    // startNewYear): no new player-turn happened here, so recording one would
    // duplicate the final turn, undercount turnsPlayed, and re-count the prior draw.
    if (G.phase === "gameOver") {
      return;
    }

    this.countPlayerDraw(G);

    this.data.snapshots.push(snapshotTurn(G, this.game, this.seed));
  }

  endGame(G: HegemonyState) {
    // A finished game (victory race / deck exhaustion) names a real winner. A game
    // stopped at the turn cap has NOT been won — record only a heuristic leaderAtCap
    // (cards → happiness → pops → seat) so it never inflates the real win rate.
    const finished = G.phase === "gameOver";
    const termination: GameTermination = finished
      ? (G.gameOverReason as GameOverReason)
      : "turnCap";
    // The engine's own tally: the deck's end ranks the state it stopped on, so the
    // same call names what decided the game, and the leader of a game cut short.
    const tally = ageEndRanking(G);
    const decidedBy: GameDecision | null =
      termination === "victoryRace"
        ? "race"
        : termination === "deckExhausted"
          ? tally.decidedBy
          : null;
    const standings = victoryStandings(G);
    this.data.finals.push(snapshotTurn(G, this.game, this.seed));

    const seats = {} as Record<PlayerId, SeatFacts>;
    for (const id of PLAYER_IDS) {
      const goodsActive = activeClaims(G, id).length;
      seats[id] = {
        ...this.seats[id],
        finalCards: playerStandings(G, id).victoryCards,
        finalTitles: standings.filter((s) => s.holder === id).map((s) => s.card.id),
        nationalIdeas: playerNationalIdeas(G, id).map(({ id, acquired, year }) => ({
          id,
          acquired,
          year,
        })),
        authoredPasses: G.assemblyPassedByPlayer[id],
        directivesPassed: G.tallyMonuments.filter((monument) => monument.author === id).length,
        authoredLawsStanding: victoryMetricValue(G, id, "voice"),
        popsLostToHunger: G.players[id].popsLostToHunger,
        popsLostToUnrest: G.players[id].popsLostToUnrest,
        luxuries: {
          goodsHeld: ownedClaims(G, id).length,
          goodsActive,
          // What the goods are worth in a year that counts them: a game whose last
          // card is Blockade would otherwise read 0.
          luxuryHappiness: goodsActive * G.ruleset.economy.luxury.happinessPerGood,
        },
        finalGold: G.players[id].resources.gold,
      };
    }

    this.data.games.push({
      game: this.game,
      seed: this.seed,
      turnsPlayed: G.turn - this.startTurn + (termination === "deckExhausted" ? 1 : 0),
      finalYear: G.year,
      termination,
      winner: finished ? G.winner : null,
      leaderAtCap: finished ? null : tally.rows[0].seat,
      seatPolicies: this.gameSeatPolicies ?? undefined,
      decidedBy,
      winningTitles:
        termination === "victoryRace"
          ? standings.filter((s) => s.holder === G.winner).map((s) => s.card.name)
          : [],
      voiceHolder: voiceHolder(G),
      assembliesHeld: G.assembliesHeld,
      ...this.gameCounts,
      yearCards: this.gameYearCards,
      seats,
    });
  }

  allSnapshots(): TurnSnapshot[] {
    return this.data.snapshots;
  }

  /** Each ended game's last state, one snapshot a game. */
  finalSnapshots(): TurnSnapshot[] {
    return this.data.finals;
  }

  buildReport(meta: BatchReport["meta"]): BatchReport {
    const { games, snapshots, drawSwings } = this.data;
    const snapshotsOf = groupBy(snapshots, (snapshot) => snapshot.game);
    const swingsOf = groupBy(drawSwings, (row) => row.game);
    const seatGames = games.flatMap((game): SeatGame[] => {
      const own = snapshotsOf.get(game.game) ?? [];
      const land = landRanks(own);
      return PLAYER_IDS.map((seat) => ({
        game,
        seat,
        // Once seats rotate, the personality in a seat changes from game to game.
        policy: game.seatPolicies?.[seat] ?? meta.policy,
        facts: game.seats[seat],
        snapshots: own,
        swings: (swingsOf.get(game.game) ?? []).filter((row) => row.player === seat),
        land: land[seat],
      }));
    });
    const by = <T>(value: (group: SeatGame[], games: number) => T) => cut(seatGames, value);

    // A count of commands, buildings or draws is read off the table's reach.
    const reach = by(reachOf);
    const commands = (types: readonly string[]) =>
      Object.fromEntries(
        types.map((type) => [type, perGame(reach.total.counts[`command:${type}`], games.length)]),
      );
    const tableCount = (pick: (game: GameRow) => number) => perGame(sum(games, pick), games.length);
    const influenceSpent = by(influenceSpentOf);
    const assembly = by(assemblyOf);

    const terminations: Record<GameTermination, number> = {
      victoryRace: 0,
      deckExhausted: 0,
      turnCap: 0,
    };
    for (const game of games) terminations[game.termination] += 1;
    const finishedGames = games.filter((game) => game.termination !== "turnCap");
    const voiceHolderWins = finishedGames.filter(
      (game) => game.voiceHolder !== null && game.winner === game.voiceHolder,
    ).length;
    const authoredPasses = games.map((game) =>
      PLAYER_IDS.map((id) => game.seats[id].authoredPasses).sort((a, b) => b - a),
    );
    const prizesGranted: Resources = { wood: 0, stone: 0, gold: 0, food: 0, influence: 0 };
    for (const game of games) {
      for (const resource of Object.keys(prizesGranted) as Array<keyof Resources>)
        prizesGranted[resource] += game.prizesGranted[resource];
    }
    const yearCards = games.flatMap((game) => game.yearCards);
    const actionCapHits = tableCount((game) => game.actionCapHits);

    return {
      meta,
      perGame: games,
      terminations,
      results: by(resultsOf),
      reach,
      drawSwings,
      drawSwingSummary: by(drawSwingsOf),
      classes: by(classesOf),
      nationalIdeas: Object.fromEntries(
        NATIONAL_IDEAS.map((idea) => [idea.id, by(ideaHolders(idea.id))]),
      ) as BatchReport["nationalIdeas"],
      perYear: yearRows(snapshots, seatGames),
      hunger: by(hungerOf),
      foodPurchases: by(foodPurchasesOf),
      riots: by(riotsOf),
      beloved: by(belovedOf),
      influenceSpent,
      trade: by(tradeOf),
      movesByType: commands(GAME_COMMAND_TYPES) as BatchReport["movesByType"],
      activeEffects: activeEffectsOf(snapshots),
      buildings: Object.fromEntries(
        BUILDING_CONTENT_IDS.map((buildingId) => {
          const built = reach.total.counts[`building:${buildingId}`];
          return [buildingId, { built, perGame: ratio(built, games.length) }];
        }),
      ) as BatchReport["buildings"],
      luxuries: {
        claimedPerGame: ratio(
          sum(seatGames, ({ facts }) => facts.luxuries.goodsHeld),
          games.length,
        ),
        activePerGame: ratio(
          sum(seatGames, ({ facts }) => facts.luxuries.goodsActive),
          games.length,
        ),
        happinessPerSeatMean: percentiles(
          seatGames.map(({ facts }) => facts.luxuries.luxuryHappiness),
        ).mean,
        endGoldDistribution: percentiles(seatGames.map(({ facts }) => facts.finalGold)),
      },
      events: {
        player: Object.fromEntries(
          PLAYER_EVENT_CONTENT_IDS.map((id) => [id, reach.total.counts[`playerDraw:${id}`]]),
        ) as BatchReport["events"]["player"],
        year: Object.fromEntries(
          YEAR_CARD_CONTENT_IDS.map((id) => [id, yearCards.filter((card) => card === id).length]),
        ) as BatchReport["events"]["year"],
      },
      currencyVerbs: commands(CURRENCY_VERBS),
      forced: {
        actionCapHits: actionCapHits.count,
        forcedResolutions: sum(games, (game) => game.forcedResolutions),
        perGame: actionCapHits.perGame,
      },
      upgrades: perGame(reach.total.counts["command:upgradeColonyToCity"], games.length),
      assembly: {
        seats: assembly,
        held: tableCount((game) => game.assembliesHeld),
        prizesGranted,
        voiceTransfers: tableCount((game) => game.voiceTransfers),
        voiceHoldersAtEnd: tableCount((game) => (game.voiceHolder !== null ? 1 : 0)),
        voiceHolderWins: {
          count: voiceHolderWins,
          finishedGames: finishedGames.length,
          rate: ratio(voiceHolderWins, finishedGames.length),
        },
        authoredPassLeadMargin: percentiles(authoredPasses.map((counts) => counts[0] - counts[1])),
        authoredPassLeaderShare: percentiles(
          authoredPasses.map((counts) =>
            ratio(
              counts[0],
              sum(counts, (count) => count),
            ),
          ),
        ),
        lawsRemoved: perGame(
          assembly.total.lawsPassed.count - assembly.total.authoredLawsStanding.count,
          games.length,
        ),
        influenceSpent: perGame(
          sum(ASSEMBLY_SINKS, (sink) => influenceSpent.total[sink].count),
          games.length,
        ),
        verbs: commands(ASSEMBLY_VERBS),
      },
    };
  }

  private countYearCard(G: HegemonyState) {
    const card = G.activeYearCard;
    if (card) this.gameYearCards.push(card.id);
  }

  private countPlayerDraw(G: HegemonyState) {
    if (G.pendingRiot || !G.players[G.currentPlayer].collectedThisTurn) return;
    const card = G.lastPlayerEvent;
    if (card) {
      this.countReach(G.currentPlayer, [`playerDraw:${card.id}`]);
      // A pop card with no settlement to take the pop is discarded at the draw.
      if (getAddPopsEffect(card.effects) && !G.pendingPlayerEvent)
        this.seats[G.currentPlayer].cardsDiscarded += 1;
    }
  }
}

/**
 * Flatten snapshots to CSV — one row per (game, turn, player). `games` fills each
 * seat's personality and the game's winner. `finals` adds each game's last state
 * after its turns, one row a seat, marked `final`. Columns added since the first
 * version sit at the end, so the older ones keep their places.
 */
export function snapshotsToCsv(
  snapshots: TurnSnapshot[],
  games: GameRow[] = [],
  finals: TurnSnapshot[] = [],
): string {
  const gameRows = new Map(games.map((game) => [game.game, game]));
  const lastStates = new Set(finals);
  const header = [
    "game",
    "seed",
    "turn",
    "year",
    "player",
    "victoryCards",
    "cities",
    "colonies",
    "pops",
    "frontierTiles",
    "inTransit",
    "wood",
    "stone",
    "gold",
    "food",
    "influence",
    "happiness",
    "unrestTokens",
    "authoredLawsStanding",
    "voiceHeld",
    "incomeWood",
    "incomeStone",
    "incomeGold",
    "incomeFood",
    "incomeInfluence",
    "unrestTier",
    "riotAtRisk",
    "slaves",
    "freemen",
    "citizens",
    "idleSlaves",
    "popsLostToHunger",
    "popsLostToUnrest",
    "popsGainedFromEvents",
    ...ACTIVE_EFFECT_KINDS.map((kind) => "effect:" + kind),
    "policy",
    "actingSeat",
    "winner",
    "final",
    "belovedHolder",
    "activeLuxuries",
  ];

  // The sort is stable: a game's turns stay in order and its last state follows them.
  const ordered = [...snapshots, ...finals].sort((a, b) => a.game - b.game);
  const rows = ordered.flatMap((snapshot) =>
    PLAYER_IDS.map((playerID) => {
      const player = snapshot.players[playerID];
      const game = gameRows.get(snapshot.game);
      return [
        snapshot.game,
        snapshot.seed,
        snapshot.turn,
        snapshot.year,
        playerID,
        player.victoryCards,
        player.cities,
        player.colonies,
        player.pops,
        player.frontierTiles,
        player.inTransit,
        player.resources.wood,
        player.resources.stone,
        player.resources.gold,
        player.resources.food,
        player.resources.influence,
        player.happiness,
        player.unrestTokens,
        player.authoredLawsStanding,
        player.voiceHeld,
        player.income.wood,
        player.income.stone,
        player.income.gold,
        player.income.food,
        player.income.influence,
        player.unrestTier,
        player.riotAtRisk,
        player.slaves,
        player.freemen,
        player.citizens,
        player.idleSlaves,
        player.popsLostToHunger,
        player.popsLostToUnrest,
        player.popsGainedFromEvents,
        ...ACTIVE_EFFECT_KINDS.map((kind) => player.activeEffects[kind]),
        game?.seatPolicies?.[playerID] ?? "",
        snapshot.actingSeat,
        game?.winner ?? "",
        lastStates.has(snapshot) ? 1 : 0,
        snapshot.belovedHolder ?? "",
        player.activeLuxuries,
      ].join(",");
    }),
  );

  return [header.join(","), ...rows].join("\n");
}
