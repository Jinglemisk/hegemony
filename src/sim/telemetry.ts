import { NATIONAL_IDEAS, playerNationalIdeas } from "../game/ideas";
import type { NationalIdeaId, NationalIdeaOwnership } from "../game/ideaTypes";
import type { OpeningKind } from "./io";
import { totalPops } from "../game/core/pops";
import { calculateIncome } from "../game/economy/income";
import {
  ACTIVE_EFFECT_KINDS,
  countActiveEffectsByKind,
  getActiveEffects,
} from "../game/activeEffects";
import type { ActiveEffectKind } from "../game/activeEffects";
import type { GameCommand } from "../game/legalMoves";
import type { DefinitionIdentity } from "../game/definition";
import { PLAYER_IDS } from "../game/data";
import { activeClaims, luxuryHappinessBonus, ownedClaims } from "../game/luxury";
import { playerStandings } from "../game/score";
import { getOwnedSettlement, getTile } from "../game/core/query";
import { canPlaceColonyOnTile, settlementIdleSlaves } from "../game/settlement";
import { unrestStatus } from "../game/unrest";
import { standingHappiness } from "../game/happiness";
import { victoryStandings, victoryMetricValue, voiceHolder } from "../game/victory";
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
  PlayerId,
  Resources,
} from "../game/types";

/**
 * Balance instrumentation for batch runs. One TurnSnapshot per player-turn;
 * the Aggregator folds snapshots + move/draw counts across games into the
 * report consumed by balance analysis. Event cards are counted by id at the
 * moment they surface (deck objects are shared references — never compare
 * card identity).
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
  /** 1 when the current happiness puts the player on the riot table next upkeep. */
  riotAtRisk: number;
  slaves: number;
  /** Slaves without an open work slot: on a full tile, or on a hill. */
  idleSlaves: number;
  /** Running total of pops that left unfed at income. */
  popsLostToHunger: number;
  /** Persistent mechanical effects observed by the same selector used by the UI. */
  activeEffects: Record<ActiveEffectKind, number>;
  popsLostToUnrest: number;
  popsGainedFromEvents: number;
  authoredLawsStanding: number;
  voiceHeld: number;
};

export type TurnSnapshot = {
  game: number;
  seed: number;
  turn: number;
  year: number;
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
      unrestTokens: unrest.tokens,
      unrestTier: unrest.tier,
      riotAtRisk: unrest.riotAtRisk ? 1 : 0,
      ...slaveCounts(G, playerID),
      popsLostToHunger: player.popsLostToHunger,
      popsLostToUnrest: player.popsLostToUnrest,
      popsGainedFromEvents: player.popsGainedFromEvents,
      authoredLawsStanding: victoryMetricValue(G, playerID, "voice"),
      voiceHeld: voiceHolder(G) === playerID ? 1 : 0,
      activeEffects: activeEffectCounts,
    };
  }

  return {
    game,
    seed,
    turn: G.turn,
    year: G.year,
    players,
  };
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

export type YearRow = {
  year: number;
  games: number;
  victoryCards: Percentiles;
  pops: Percentiles;
  food: Percentiles;
  happiness: Percentiles;
  unrestTierShares: Record<UnrestTier, number>;
  activeEffectShares: Record<ActiveEffectKind, number>;
};

/** How a game ended. A real result (victoryRace/deckExhausted) names a winner; a
 *  game stopped at the turn cap has no winner — only a leaderAtCap heuristic. */
export type GameTermination = GameOverReason | "turnCap";

export type AssemblySeatTelemetry = {
  lawsProposed: number;
  lawsPassed: number;
  authoredLawsStanding: number;
  directivesPlayed: number;
  votesBought: number;
  voiceClaims: number;
  voiceHeldTurns: number;
};
function emptyAssemblySeats(): Record<PlayerId, AssemblySeatTelemetry> {
  return Object.fromEntries(
    PLAYER_IDS.map((id) => [
      id,
      {
        lawsProposed: 0,
        lawsPassed: 0,
        authoredLawsStanding: 0,
        directivesPlayed: 0,
        votesBought: 0,
        voiceClaims: 0,
        voiceHeldTurns: 0,
      },
    ]),
  ) as Record<PlayerId, AssemblySeatTelemetry>;
}

export type GameRow = {
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
  nationalIdeas: Record<PlayerId, NationalIdeaOwnership[]>;
  finalCards: Record<PlayerId, number>;
  /** The titles held by the winner at a victory-race finish; empty for other endings. */
  winningTitles: string[];
  /** Permanent authored-and-passed Assembly progress when the game ended. */
  finalAuthoredPasses: Record<PlayerId, number>;
  assemblySeats: Record<PlayerId, AssemblySeatTelemetry>;
  /** The seat holding Voice when the game ended. */
  voiceHolder: PlayerId | null;
  popsLostToUnrest: Record<PlayerId, number>;
  popsLostToHunger: Record<PlayerId, number>;
  /** Luxury goods (Phase 4): claims held / active and the standing happiness they
   *  contributed at game end — the Beloved-side of the feature's exit gate. */
  luxuries: Record<PlayerId, { goodsHeld: number; goodsActive: number; luxuryHappiness: number }>;
  /** End-of-game banked gold per seat — monitored, not judged (Q46: no gold sink). */
  finalGold: Record<PlayerId, number>;
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
    /** The dev tune-panel override map applied to content/ruleset for this run (null when
     *  none), plus a stable fingerprint — so a batch's content is identifiable and A/B-able. */
    tunePatch?: unknown;
    tunePatchHash?: string | null;
    tuningPresetId?: string | null;
    resolvedContentHash?: string | null;
    /** Base seat→policy assignment for a mixed-policy batch (null for a uniform run).
     *  With --rotate the per-game assignment varies; see perGame[].seatPolicies. */
    seatPolicies?: Record<PlayerId, string> | null;
    generatedAt: string;
  };
  perGame: GameRow[];
  nationalIdeas: Record<
    NationalIdeaId,
    { setupPicks: number; purchases: number; holders: number; wins: number; winRate: number }
  >;
  perYear: YearRow[];
  perSeat: Record<PlayerId, { winRate: number; capLeaderRate: number; meanFinalCards: number }>;
  /** Food under work slots, per seat: how often income left mouths unfed, the pops
   *  that left for it, and how many slaves had no slot to work. */
  hunger: Record<
    PlayerId,
    {
      /** Incomes that left at least one mouth unfed, per game. */
      hungerTurnsPerGame: number;
      popsLostPerGame: number;
      /** Mean idle slaves over the seat's turn snapshots, and their share of its slaves. */
      idleSlavesMean: number;
      idleSlaveShare: number;
    }
  >;
  /** The riot table: riots resolved per game, the share of player-turns that opened
   *  on it, and the same counts year by year, so a report can cut the late game. */
  riots: {
    perGame: number;
    /** Revolts per game: the lower line, where half the slaves leave with no roll. */
    revoltsPerGame: number;
    turnShare: number;
    byYear: Array<{ year: number; riots: number; playerTurns: number }>;
  };
  /** Wins credited to the POLICY that held each seat, over finished games — the
   *  seat-independent measure a rotated mixed-policy batch produces. Empty for a
   *  uniform batch (no seat policies recorded). */
  winsByPolicy: Record<string, { games: number; wins: number; winRate: number }>;
  /** Universal action telemetry. Every GameCommand type is present, including zeroes,
   *  so newly added or unexercised actions cannot disappear from a report. */
  movesByType: Record<GameCommandType, { count: number; perGame: number }>;
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
  currencyVerbs: Record<string, { count: number; perGame: number }>;
  finalCardsDistribution: Percentiles;
  /** How games terminated — the denominator context for winRate (finished games only)
   *  vs capLeaderRate (turn-capped games). */
  terminations: Record<GameTermination, number>;
  /** Turns the runner had to force-end at the per-turn action cap — previously
   *  invisible. actionCapHits == forcedEndTurns; forcedResolutions counts pending
   *  events/riots that had to be force-resolved first. */
  forced: {
    actionCapHits: number;
    forcedResolutions: number;
    forcedEndTurns: number;
    perGame: number;
  };
  /** Colony→city upgrades performed across the batch (total + per game) — a bot that
   *  never saves for them reads ~0/game here. */
  upgrades: { count: number; perGame: number };
  /**
   * The Assembly (Phase 3-B) — Influence's main sink, so this is the instrument for
   * the balance question the design flags as the most important A/B: is the sink
   * deep enough, and is anything actually passing?
   *
   * `verbs` counting near zero means the bots are ignoring the agora entirely (which
   * is expected until the influence-aware AI of Phase 3-C lands), and `lawsStanding`
   * near zero means the sink exists but nothing it buys ever reaches the board.
   */
  assembly: {
    perSeat: Record<PlayerId, { count: AssemblySeatTelemetry; perGame: AssemblySeatTelemetry }>;
    votesBought: { count: number; perGame: number };
    goldSpent: { count: number; perGame: number };
    held: { count: number; perGame: number };
    lawsEnacted: { count: number; perGame: number };
    directivesPassed: { count: number; perGame: number };
    authoredPassed: { count: number; perGame: number };
    prizesGranted: Resources;
    directiveTargets: Record<PlayerId, number>;
    voiceClaims: { count: number; perGame: number };
    voiceTransfers: { count: number; perGame: number };
    /** Games that ended with Voice claimed; `perGame` is the share of all games. */
    voiceHoldersAtEnd: { count: number; perGame: number };
    /** Finished games won by their final Voice holder. */
    voiceHolderWins: { count: number; finishedGames: number; rate: number };
    /** Highest authored-pass total minus the runner-up total in each game. */
    authoredPassLeadMargin: Percentiles;
    /** The leading seat's share of all authored passes in each game (zero if none passed). */
    authoredPassLeaderShare: Percentiles;
    /** Laws that LEFT the board — repealed, replaced at the cap, or torn down by
     *  Stratokles. Derived (enacted − still standing), so it needs no counter. */
    lawsRemoved: { count: number; perGame: number };
    /** Laws still standing when each game ended — mean across the batch. */
    lawsStanding: number;
    /** Influence spent on assembly verbs across the batch. */
    influenceSpent: { count: number; perGame: number };
    verbs: Record<string, { count: number; perGame: number }>;
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

export class Aggregator {
  private snapshots: TurnSnapshot[] = [];
  private games: GameRow[] = [];
  private buildings: Record<string, number> = {};
  private playerEvents: Record<string, number> = {};
  private yearCards: Record<string, number> = {};
  private movesByType: Partial<Record<GameCommandType, number>> = {};
  private currencyVerbs: Record<string, number> = {};
  private riotsByYear = new Map<number, number>();
  private revolts = 0;
  private assemblyVerbs: Record<string, number> = {};
  private assemblyInfluence = 0;
  private assemblyGold = 0;
  private assemblySeats = emptyAssemblySeats();
  private assembliesHeld = 0;
  private lawsEnacted = 0;
  private directivesPassed = 0;
  private authoredPassed = 0;
  private prizesGranted: Resources = {
    wood: 0,
    stone: 0,
    gold: 0,
    food: 0,
    influence: 0,
  };
  private directiveTargets: Record<PlayerId, number> = { "0": 0, "1": 0, "2": 0, "3": 0 };
  private voiceClaims = 0;
  private voiceTransfers = 0;
  private lastVoiceHolder: PlayerId | null = null;
  private lastAssemblyResultKey: string | null = null;
  private lawsRemoved = 0;
  private lawsStandingAtEnd: number[] = [];
  private upgrades = 0;
  private actionCapHits = 0;
  private forcedResolutions = 0;
  private forcedEndTurns = 0;

  private game = -1;
  private seed = 0;
  private startTurn = 1;
  private lastYear = 0;
  private gameSeatPolicies: Record<PlayerId, string> | null = null;

  beginGame(game: number, seed: number, G: HegemonyState, seatPolicies?: Record<PlayerId, string>) {
    this.game = game;
    this.seed = seed;
    this.startTurn = G.turn;
    this.lastYear = G.year;
    this.gameSeatPolicies = seatPolicies ?? null;
    this.lastVoiceHolder = voiceHolder(G);
    this.lastAssemblyResultKey = null;
    this.assemblySeats = emptyAssemblySeats();

    // The opening already revealed year 1's card and player 0's first draw.
    this.countYearCard(G);
    this.countPlayerDraw(G);
    this.snapshots.push(snapshotTurn(G, this.game, this.seed));
  }

  onMove(G: HegemonyState, player: PlayerId, move: GameCommand) {
    this.movesByType[move.type] = (this.movesByType[move.type] ?? 0) + 1;

    if (move.type === "resolveRiot") {
      this.riotsByYear.set(G.year, (this.riotsByYear.get(G.year) ?? 0) + 1);
      // The opening snapshot preceded this turn's deferred income. Replace it,
      // so hunger on the final player-turn is counted without inventing a turn.
      const opening = this.snapshots.at(-1);
      if (opening?.game === this.game && opening.turn === G.turn) {
        this.snapshots[this.snapshots.length - 1] = snapshotTurn(G, this.game, this.seed);
      }
      this.countPlayerDraw(G);
    }

    if (move.type === "buildBuilding") {
      this.buildings[move.buildingId] = (this.buildings[move.buildingId] ?? 0) + 1;
    }

    if ((CURRENCY_VERBS as readonly string[]).includes(move.type)) {
      this.currencyVerbs[move.type] = (this.currencyVerbs[move.type] ?? 0) + 1;
    }

    if ((ASSEMBLY_VERBS as readonly string[]).includes(move.type)) {
      this.assemblyVerbs[move.type] = (this.assemblyVerbs[move.type] ?? 0) + 1;
      // Commands never carry prices. Measure the authoritative amount the engine
      // just charged from the live rules and post-command Assembly counters.
      if (move.type === "assemblyDraw") {
        this.assemblyInfluence += G.ruleset.assembly.drawCost;
      } else if (move.type === "assemblyProposeRepeal") {
        this.assemblyInfluence += G.ruleset.assembly.repealCost;
      } else if (move.type === "assemblyBribe") {
        if (move.payment === "influence") this.assemblyInfluence += G.ruleset.assembly.briberyCost;
        else this.assemblyGold += G.ruleset.assembly.briberyCost;
        this.assemblySeats[player].votesBought += 1;
      }
      if (
        move.type === "assemblyPropose" &&
        G.assembly?.proposals[player]?.kind === "enact" &&
        G.assembly.proposals[player].card.kind === "law"
      )
        this.assemblySeats[player].lawsProposed += 1;
    }

    const results = G.assembly?.results;
    if (results && results.length > 0) {
      const key = `${this.game}:${G.assembliesHeld}:${results.length}`;
      if (key !== this.lastAssemblyResultKey) {
        this.lastAssemblyResultKey = key;
        const result = results[results.length - 1];
        if (result.passed && result.item.kind === "enact" && result.item.proposer) {
          const seat = this.assemblySeats[result.item.proposer];
          if (result.item.card.kind === "law") seat.lawsPassed += 1;
          else seat.directivesPlayed += 1;
          const prize = G.ruleset.assembly.prizes[result.item.card.politician];
          for (const [resource, amount] of Object.entries(prize) as Array<
            [keyof Resources, number | undefined]
          >) {
            this.prizesGranted[resource] += amount ?? 0;
          }
          if (result.item.card.kind === "directive" && result.item.target) {
            this.directiveTargets[result.item.target] += 1;
          }
        }
      }
    }

    const voice = voiceHolder(G);
    if (voice !== this.lastVoiceHolder) {
      if (voice) {
        this.voiceClaims += 1;
        this.assemblySeats[voice].voiceClaims += 1;
        if (this.lastVoiceHolder) this.voiceTransfers += 1;
      }
      this.lastVoiceHolder = voice;
    }

    // Colony→city upgrades are the sharpest one-ply blind spot (bots rarely save for
    // them); track them so a deeper search shows up in the report.
    if (move.type === "upgradeColonyToCity") {
      this.upgrades += 1;
    }
  }

  /** The runner hit the per-turn action cap and force-ended the turn. Previously
   *  silent; surfaced so balance runs can see how often bots stall out. */
  onForceEndTurn(_G: HegemonyState, forcedResolutions: number) {
    this.actionCapHits += 1;
    this.forcedResolutions += forcedResolutions;
    this.forcedEndTurns += 1;
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

    this.snapshots.push(snapshotTurn(G, this.game, this.seed));
  }

  /** total + per-finished-game, the shape every count in this report uses. */
  private perGameCount(count: number) {
    return { count, perGame: this.games.length > 0 ? count / this.games.length : 0 };
  }

  endGame(G: HegemonyState) {
    // The record of passes survives repeal; Voice reads standing Laws only.
    this.assembliesHeld += G.assembliesHeld;
    this.lawsStandingAtEnd.push(G.activeLaws.length);
    this.directivesPassed += G.tallyMonuments.length;
    this.authoredPassed += Object.values(G.assemblyPassedByPlayer).reduce(
      (sum, count) => sum + count,
      0,
    );
    // `lawOrder` ticks once per enacted resolution of either kind, so the Laws are
    // simply the ones that were not monuments — and whatever is no longer standing
    // was repealed, replaced at the cap, or thrown down by Stratokles.
    const enacted = G.lawOrder - G.tallyMonuments.length;
    this.lawsEnacted += enacted;
    this.lawsRemoved += enacted - G.activeLaws.length;

    const finalCards = {} as Record<PlayerId, number>;
    const finalAuthoredPasses = {} as Record<PlayerId, number>;
    const popsLostToUnrest = {} as Record<PlayerId, number>;
    const popsLostToHunger = {} as Record<PlayerId, number>;
    const luxuries = {} as GameRow["luxuries"];
    const finalGold = {} as Record<PlayerId, number>;

    for (const playerID of PLAYER_IDS) {
      finalCards[playerID] = playerStandings(G, playerID).victoryCards;
      finalAuthoredPasses[playerID] = G.assemblyPassedByPlayer[playerID];
      popsLostToUnrest[playerID] = G.players[playerID].popsLostToUnrest;
      this.revolts += G.players[playerID].revolts;
      popsLostToHunger[playerID] = G.players[playerID].popsLostToHunger;
      luxuries[playerID] = {
        goodsHeld: ownedClaims(G, playerID).length,
        goodsActive: activeClaims(G, playerID).length,
        luxuryHappiness: luxuryHappinessBonus(G, playerID),
      };
      finalGold[playerID] = G.players[playerID].resources.gold;
    }

    // A finished game (victory race / deck exhaustion) names a real winner. A game
    // stopped at the turn cap has NOT been won — record only a heuristic leaderAtCap
    // (cards → happiness → pops → seat) so it never inflates the real win rate.
    const finished = G.phase === "gameOver";
    const termination: GameTermination = finished
      ? (G.gameOverReason as GameOverReason)
      : "turnCap";

    for (const id of PLAYER_IDS) {
      this.assemblySeats[id].authoredLawsStanding = victoryMetricValue(G, id, "voice");
      this.assemblySeats[id].voiceHeldTurns = this.snapshots
        .filter((s) => s.game === this.game)
        .reduce((sum, s) => sum + s.players[id].voiceHeld, 0);
    }
    this.games.push({
      game: this.game,
      seed: this.seed,
      turnsPlayed: G.turn - this.startTurn + (termination === "deckExhausted" ? 1 : 0),
      finalYear: G.year,
      termination,
      winner: finished ? G.winner : null,
      leaderAtCap: finished ? null : this.leaderByTiebreak(G, finalCards),
      seatPolicies: this.gameSeatPolicies ?? undefined,
      nationalIdeas: Object.fromEntries(
        PLAYER_IDS.map((id) => [
          id,
          playerNationalIdeas(G, id).map(({ id, acquired, year }) => ({ id, acquired, year })),
        ]),
      ) as GameRow["nationalIdeas"],
      finalCards,
      winningTitles:
        termination === "victoryRace"
          ? victoryStandings(G)
              .filter((standing) => standing.holder === G.winner)
              .map((standing) => standing.card.name)
          : [],
      finalAuthoredPasses,
      assemblySeats: structuredClone(this.assemblySeats),
      voiceHolder: voiceHolder(G),
      popsLostToUnrest,
      popsLostToHunger,
      luxuries,
      finalGold,
    });
  }

  /** The deck-exhaustion tiebreak (cards → happiness → pops → seat), reused to name a
   *  cut-off game's leaderAtCap without counting it as a win. */
  private leaderByTiebreak(G: HegemonyState, finalCards: Record<PlayerId, number>): PlayerId {
    return [...PLAYER_IDS].sort((a, b) => {
      const cards = finalCards[b] - finalCards[a];
      if (cards !== 0) return cards;
      const happiness = standingHappiness(G, b) - standingHappiness(G, a);
      if (happiness !== 0) return happiness;
      const pops = playerStandings(G, b).pops - playerStandings(G, a).pops;
      if (pops !== 0) return pops;
      return PLAYER_IDS.indexOf(a) - PLAYER_IDS.indexOf(b);
    })[0];
  }

  allSnapshots(): TurnSnapshot[] {
    return this.snapshots;
  }

  buildReport(meta: BatchReport["meta"]): BatchReport {
    // Year rows use only each game's LAST snapshot of that year (end-of-year
    // state), pooled across games and seats.
    const yearBuckets = new Map<number, TurnSnapshot[]>();

    const tails = new Map<string, TurnSnapshot>();
    for (const snapshot of this.snapshots) {
      tails.set(`${snapshot.game}:${snapshot.year}`, snapshot);
    }
    for (const snapshot of tails.values()) {
      const bucket = yearBuckets.get(snapshot.year) ?? [];
      bucket.push(snapshot);
      yearBuckets.set(snapshot.year, bucket);
    }

    const perYear: YearRow[] = [...yearBuckets.entries()]
      .sort(([a], [b]) => a - b)
      .map(([year, snapshots]) => {
        const values = (select: (player: PlayerSnapshot) => number) =>
          snapshots.flatMap((snapshot) =>
            PLAYER_IDS.map((playerID) => select(snapshot.players[playerID])),
          );

        const tierShares: Record<UnrestTier, number> = {
          calm: 0,
          discontent: 0,
          unrest: 0,
          revolt: 0,
        };
        const seats = snapshots.length * PLAYER_IDS.length;
        const activeEffectShares = Object.fromEntries(
          ACTIVE_EFFECT_KINDS.map((kind) => [kind, 0]),
        ) as Record<ActiveEffectKind, number>;

        for (const snapshot of snapshots) {
          for (const playerID of PLAYER_IDS) {
            tierShares[snapshot.players[playerID].unrestTier] += 1 / seats;
            for (const kind of ACTIVE_EFFECT_KINDS) {
              if (snapshot.players[playerID].activeEffects[kind] > 0) {
                activeEffectShares[kind] += 1 / seats;
              }
            }
          }
        }

        return {
          year,
          games: snapshots.length,
          victoryCards: percentiles(values((player) => player.victoryCards)),
          pops: percentiles(values((player) => player.pops + player.inTransit)),
          food: percentiles(values((player) => player.resources.food)),
          happiness: percentiles(values((player) => player.happiness)),
          unrestTierShares: tierShares,
          activeEffectShares,
        };
      });

    // Real win rate is over FINISHED games only; a turn-capped game is not a win.
    const finishedGames = this.games.filter((game) => game.termination !== "turnCap");
    const cappedGames = this.games.filter((game) => game.termination === "turnCap");
    const voiceHoldersAtEnd = this.games.filter((game) => game.voiceHolder !== null).length;
    const voiceHolderWins = finishedGames.filter(
      (game) => game.voiceHolder !== null && game.winner === game.voiceHolder,
    ).length;
    const authoredPassLeadMargins = this.games.map((game) => {
      const counts = Object.values(game.finalAuthoredPasses).sort((a, b) => b - a);
      return counts[0] - counts[1];
    });
    const authoredPassLeaderShares = this.games.map((game) => {
      const counts = Object.values(game.finalAuthoredPasses);
      const total = counts.reduce((sum, count) => sum + count, 0);
      return total > 0 ? Math.max(...counts) / total : 0;
    });

    const perSeat = {} as BatchReport["perSeat"];
    for (const playerID of PLAYER_IDS) {
      const wins = finishedGames.filter((game) => game.winner === playerID).length;
      const capLeads = cappedGames.filter((game) => game.leaderAtCap === playerID).length;
      const cards = this.games.map((game) => game.finalCards[playerID]);
      perSeat[playerID] = {
        winRate: finishedGames.length > 0 ? wins / finishedGames.length : 0,
        capLeaderRate: cappedGames.length > 0 ? capLeads / cappedGames.length : 0,
        meanFinalCards: percentiles(cards).mean,
      };
    }

    // A hunger turn is a snapshot where the seat's running hunger loss rose: hunger
    // strikes once, at the seat's own income.
    const hunger = {} as BatchReport["hunger"];
    const games = Math.max(1, this.games.length);
    for (const playerID of PLAYER_IDS) {
      let hungerTurns = 0;
      let idle = 0;
      let slaves = 0;
      let previous: TurnSnapshot | null = null;

      for (const snapshot of this.snapshots) {
        const seat = snapshot.players[playerID];
        const before = previous?.game === snapshot.game ? previous.players[playerID] : null;
        if (seat.popsLostToHunger > (before?.popsLostToHunger ?? 0)) hungerTurns += 1;
        idle += seat.idleSlaves;
        slaves += seat.slaves;
        previous = snapshot;
      }

      hunger[playerID] = {
        hungerTurnsPerGame: hungerTurns / games,
        popsLostPerGame:
          this.games.reduce((sum, game) => sum + game.popsLostToHunger[playerID], 0) / games,
        idleSlavesMean: this.snapshots.length > 0 ? idle / this.snapshots.length : 0,
        idleSlaveShare: slaves > 0 ? idle / slaves : 0,
      };
    }

    // Every snapshot is one player-turn, so a year's snapshots are its turns.
    const turnsByYear = new Map<number, number>();
    for (const snapshot of this.snapshots) {
      turnsByYear.set(snapshot.year, (turnsByYear.get(snapshot.year) ?? 0) + 1);
    }
    const riotCount = [...this.riotsByYear.values()].reduce((sum, count) => sum + count, 0);
    const riots: BatchReport["riots"] = {
      perGame: riotCount / games,
      revoltsPerGame: this.revolts / games,
      turnShare: this.snapshots.length > 0 ? riotCount / this.snapshots.length : 0,
      byYear: [...turnsByYear.entries()]
        .sort(([a], [b]) => a - b)
        .map(([year, playerTurns]) => ({
          year,
          riots: this.riotsByYear.get(year) ?? 0,
          playerTurns,
        })),
    };

    const terminations: Record<GameTermination, number> = {
      victoryRace: 0,
      deckExhausted: 0,
      turnCap: 0,
    };
    for (const game of this.games) {
      terminations[game.termination] += 1;
    }

    // Credit each finished game's win to the POLICY that held the winning seat, and
    // count every seat a policy occupied as one participation. Over rotated seats this
    // is a seat-independent win rate; empty when no seat policies were recorded.
    const winsByPolicy: BatchReport["winsByPolicy"] = {};
    for (const game of finishedGames) {
      if (!game.seatPolicies) continue;
      for (const [seat, policyName] of Object.entries(game.seatPolicies)) {
        const entry = (winsByPolicy[policyName] ??= { games: 0, wins: 0, winRate: 0 });
        entry.games += 1;
        if (game.winner === seat) entry.wins += 1;
      }
    }
    for (const entry of Object.values(winsByPolicy)) {
      entry.winRate = entry.games > 0 ? entry.wins / entry.games : 0;
    }

    const buildings = Object.fromEntries(
      BUILDING_CONTENT_IDS.map((buildingId) => {
        const built = this.buildings[buildingId] ?? 0;
        return [
          buildingId,
          { built, perGame: this.games.length > 0 ? built / this.games.length : 0 },
        ];
      }),
    ) as BatchReport["buildings"];

    const playerTurnCount = this.snapshots.length * PLAYER_IDS.length;
    const activeEffects = Object.fromEntries(
      ACTIVE_EFFECT_KINDS.map((kind) => {
        let observations = 0;
        let playerTurnsWithEffect = 0;
        for (const snapshot of this.snapshots) {
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
            perPlayerTurn: playerTurnCount > 0 ? observations / playerTurnCount : 0,
            playerTurnShare: playerTurnCount > 0 ? playerTurnsWithEffect / playerTurnCount : 0,
          },
        ];
      }),
    ) as BatchReport["activeEffects"];

    const perSeatLuxuries = this.games.flatMap((game) =>
      PLAYER_IDS.map((playerID) => game.luxuries[playerID]),
    );
    const luxuries: BatchReport["luxuries"] = {
      claimedPerGame:
        this.games.length > 0
          ? this.games.reduce(
              (sum, game) =>
                sum +
                PLAYER_IDS.reduce((held, playerID) => held + game.luxuries[playerID].goodsHeld, 0),
              0,
            ) / this.games.length
          : 0,
      activePerGame:
        this.games.length > 0
          ? this.games.reduce(
              (sum, game) =>
                sum +
                PLAYER_IDS.reduce(
                  (active, playerID) => active + game.luxuries[playerID].goodsActive,
                  0,
                ),
              0,
            ) / this.games.length
          : 0,
      happinessPerSeatMean: percentiles(perSeatLuxuries.map((entry) => entry.luxuryHappiness)).mean,
      endGoldDistribution: percentiles(
        this.games.flatMap((game) => PLAYER_IDS.map((playerID) => game.finalGold[playerID])),
      ),
    };

    return {
      meta,
      perGame: this.games,
      nationalIdeas: Object.fromEntries(
        NATIONAL_IDEAS.map((idea) => {
          let setupPicks = 0,
            purchases = 0,
            holders = 0,
            wins = 0;
          for (const game of this.games)
            for (const id of PLAYER_IDS) {
              const held = game.nationalIdeas[id].find((i) => i.id === idea.id);
              if (!held) continue;
              if (held.acquired === "setup") setupPicks++;
              else purchases++;
              if (game.termination !== "turnCap") {
                holders++;
                if (game.winner === id) wins++;
              }
            }
          return [
            idea.id,
            { setupPicks, purchases, holders, wins, winRate: holders ? wins / holders : 0 },
          ];
        }),
      ) as BatchReport["nationalIdeas"],
      perYear,
      perSeat,
      hunger,
      riots,
      buildings,
      luxuries,
      movesByType: Object.fromEntries(
        GAME_COMMAND_TYPES.map((moveType) => [
          moveType,
          this.perGameCount(this.movesByType[moveType] ?? 0),
        ]),
      ) as BatchReport["movesByType"],
      activeEffects,
      events: {
        player: Object.fromEntries(
          PLAYER_EVENT_CONTENT_IDS.map((eventId) => [eventId, this.playerEvents[eventId] ?? 0]),
        ) as BatchReport["events"]["player"],
        year: Object.fromEntries(
          YEAR_CARD_CONTENT_IDS.map((eventId) => [eventId, this.yearCards[eventId] ?? 0]),
        ) as BatchReport["events"]["year"],
      },
      currencyVerbs: Object.fromEntries(
        CURRENCY_VERBS.map((verb) => {
          const count = this.currencyVerbs[verb] ?? 0;
          return [verb, { count, perGame: this.games.length > 0 ? count / this.games.length : 0 }];
        }),
      ),
      assembly: {
        perSeat: Object.fromEntries(
          PLAYER_IDS.map((id) => {
            const count = emptyAssemblySeats()[id];
            for (const game of this.games)
              for (const key of Object.keys(count) as Array<keyof AssemblySeatTelemetry>)
                count[key] += game.assemblySeats[id][key];
            const perGame = Object.fromEntries(
              Object.entries(count).map(([key, value]) => [
                key,
                this.games.length ? value / this.games.length : 0,
              ]),
            ) as AssemblySeatTelemetry;
            return [id, { count, perGame }];
          }),
        ) as BatchReport["assembly"]["perSeat"],
        votesBought: this.perGameCount(this.assemblyVerbs.assemblyBribe ?? 0),
        goldSpent: this.perGameCount(this.assemblyGold),
        held: this.perGameCount(this.assembliesHeld),
        lawsEnacted: this.perGameCount(this.lawsEnacted),
        directivesPassed: this.perGameCount(this.directivesPassed),
        authoredPassed: this.perGameCount(this.authoredPassed),
        prizesGranted: { ...this.prizesGranted },
        directiveTargets: { ...this.directiveTargets },
        voiceClaims: this.perGameCount(this.voiceClaims),
        voiceTransfers: this.perGameCount(this.voiceTransfers),
        voiceHoldersAtEnd: this.perGameCount(voiceHoldersAtEnd),
        voiceHolderWins: {
          count: voiceHolderWins,
          finishedGames: finishedGames.length,
          rate: finishedGames.length > 0 ? voiceHolderWins / finishedGames.length : 0,
        },
        authoredPassLeadMargin: percentiles(authoredPassLeadMargins),
        authoredPassLeaderShare: percentiles(authoredPassLeaderShares),
        lawsRemoved: this.perGameCount(this.lawsRemoved),
        lawsStanding: percentiles(this.lawsStandingAtEnd).mean,
        influenceSpent: this.perGameCount(this.assemblyInfluence),
        verbs: Object.fromEntries(
          ASSEMBLY_VERBS.map((verb) => {
            const count = this.assemblyVerbs[verb] ?? 0;
            return [
              verb,
              { count, perGame: this.games.length > 0 ? count / this.games.length : 0 },
            ];
          }),
        ),
      },
      finalCardsDistribution: percentiles(
        this.games.flatMap((game) => PLAYER_IDS.map((playerID) => game.finalCards[playerID])),
      ),
      winsByPolicy,
      terminations,
      forced: {
        actionCapHits: this.actionCapHits,
        forcedResolutions: this.forcedResolutions,
        forcedEndTurns: this.forcedEndTurns,
        perGame: this.games.length > 0 ? this.actionCapHits / this.games.length : 0,
      },
      upgrades: {
        count: this.upgrades,
        perGame: this.games.length > 0 ? this.upgrades / this.games.length : 0,
      },
    };
  }

  private countYearCard(G: HegemonyState) {
    const card = G.activeYearCard;
    if (card) {
      this.yearCards[card.id] = (this.yearCards[card.id] ?? 0) + 1;
    }
  }

  private countPlayerDraw(G: HegemonyState) {
    if (G.pendingRiot || !G.players[G.currentPlayer].collectedThisTurn) return;
    const card = G.lastPlayerEvent;
    if (card) {
      this.playerEvents[card.id] = (this.playerEvents[card.id] ?? 0) + 1;
    }
  }
}

/** Flatten snapshots to CSV — one row per (game, turn, player). */
export function snapshotsToCsv(snapshots: TurnSnapshot[]): string {
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
    "idleSlaves",
    "popsLostToHunger",
    "popsLostToUnrest",
    "popsGainedFromEvents",
    ...ACTIVE_EFFECT_KINDS.map((kind) => "effect:" + kind),
  ];

  const rows = snapshots.flatMap((snapshot) =>
    PLAYER_IDS.map((playerID) => {
      const player = snapshot.players[playerID];
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
        player.idleSlaves,
        player.popsLostToHunger,
        player.popsLostToUnrest,
        player.popsGainedFromEvents,
        ...ACTIVE_EFFECT_KINDS.map((kind) => player.activeEffects[kind]),
      ].join(",");
    }),
  );

  return [header.join(","), ...rows].join("\n");
}
