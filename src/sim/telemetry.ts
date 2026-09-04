import type { OpeningKind } from "./io";
import { seasonName, yearOf } from "../game/core/calendar";
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
import { canPlaceColonyOnTile } from "../game/settlement";
import { unrestStatus } from "../game/unrest";
import { GAME_COMMAND_TYPES, type GameCommandType } from "../parity/commandParity";
import {
  BUILDING_CONTENT_IDS,
  PLAYER_EVENT_CONTENT_IDS,
  SEASONAL_EVENT_CONTENT_IDS,
  type PlayerEventContentId,
  type SeasonalEventContentId,
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
  unrestTier: UnrestTier;
  /** 1 when the current happiness puts the player on the riot table next upkeep. */
  riotAtRisk: number;
  deficitTurns: number;
  /** Persistent mechanical effects observed by the same selector used by the UI. */
  activeEffects: Record<ActiveEffectKind, number>;
  popsLostToUnrest: number;
  popsGainedFromEvents: number;
};

export type TurnSnapshot = {
  game: number;
  seed: number;
  turn: number;
  season: number;
  seasonName: string;
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
      unrestTier: unrest.tier,
      riotAtRisk: unrest.riotAtRisk ? 1 : 0,
      deficitTurns: player.consecutiveFoodDeficitTurns,
      popsLostToUnrest: player.popsLostToUnrest,
      popsGainedFromEvents: player.popsGainedFromEvents,
      activeEffects: activeEffectCounts,
    };
  }

  return {
    game,
    seed,
    turn: G.turn,
    season: G.season,
    seasonName: seasonName(G.season),
    year: yearOf(G.season),
    players,
  };
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

export type SeasonRow = {
  season: number;
  seasonName: string;
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

export type GameRow = {
  game: number;
  seed: number;
  turnsPlayed: number;
  finalSeason: number;
  termination: GameTermination;
  /** The real winner — null for turn-capped (unfinished) games. */
  winner: PlayerId | null;
  /** Heuristic leader when the game was cut off at the cap; null for finished games. */
  leaderAtCap: PlayerId | null;
  /** Which policy sat in each seat this game (mixed-policy tables); absent for uniform runs. */
  seatPolicies?: Record<PlayerId, string>;
  finalCards: Record<PlayerId, number>;
  /** Permanent authored-and-passed Assembly progress when the game ended. */
  finalAuthoredPasses: Record<PlayerId, number>;
  /** The seat holding Voice when the game ended, if its minimum was ever reached. */
  voiceHolder: PlayerId | null;
  popsLostToUnrest: Record<PlayerId, number>;
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
  perSeason: SeasonRow[];
  perSeat: Record<PlayerId, { winRate: number; capLeaderRate: number; meanFinalCards: number }>;
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
    /** Every shipped seasonal-event id is present, including zeroes. */
    seasonal: Record<SeasonalEventContentId, number>;
    /** For choice cards: how often each option index was picked. */
    choicePicks: Record<string, number[]>;
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
  "assemblyVeto",
] as const;

/** The Phase 1 currency verbs, in report order. */
const CURRENCY_VERBS = [
  "bankSell",
  "bankBuy",
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
  private seasonalEvents: Record<string, number> = {};
  private choicePicks: Record<string, number[]> = {};
  private movesByType: Partial<Record<GameCommandType, number>> = {};
  private currencyVerbs: Record<string, number> = {};
  private assemblyVerbs: Record<string, number> = {};
  private assemblyInfluence = 0;
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
    happiness: 0,
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
  private lastSeason = 0;
  private gameSeatPolicies: Record<PlayerId, string> | null = null;

  beginGame(game: number, seed: number, G: HegemonyState, seatPolicies?: Record<PlayerId, string>) {
    this.game = game;
    this.seed = seed;
    this.startTurn = G.turn;
    this.lastSeason = G.season;
    this.gameSeatPolicies = seatPolicies ?? null;
    this.lastVoiceHolder = G.voiceHolder;
    this.lastAssemblyResultKey = null;

    // The opening already revealed season 1's card and player 0's first draw.
    this.countSeasonal(G);
    this.countPlayerDraw(G);
  }

  onMove(G: HegemonyState, player: PlayerId, move: GameCommand) {
    this.movesByType[move.type] = (this.movesByType[move.type] ?? 0) + 1;

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
        this.assemblyInfluence +=
          (G.assembly?.draws[player] ?? 0) <= 1
            ? G.ruleset.assembly.drawCost
            : G.ruleset.assembly.redrawCost;
      } else if (move.type === "assemblyProposeRepeal") {
        this.assemblyInfluence += G.ruleset.assembly.repealCost;
      } else if (move.type === "assemblyBribe") {
        this.assemblyInfluence += G.ruleset.assembly.briberyCost;
      } else if (move.type === "assemblyVeto") {
        this.assemblyInfluence += G.ruleset.assembly.vetoCost;
      }
    }

    const results = G.assembly?.results;
    if (results && results.length > 0) {
      const key = `${this.game}:${G.assembliesHeld}:${results.length}`;
      if (key !== this.lastAssemblyResultKey) {
        this.lastAssemblyResultKey = key;
        const result = results[results.length - 1];
        if (result.passed && result.item.kind === "enact" && result.item.proposer) {
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

    if (G.voiceHolder !== this.lastVoiceHolder) {
      if (G.voiceHolder) {
        this.voiceClaims += 1;
        if (this.lastVoiceHolder) this.voiceTransfers += 1;
      }
      this.lastVoiceHolder = G.voiceHolder;
    }

    // Colony→city upgrades are the sharpest one-ply blind spot (bots rarely save for
    // them); track them so a deeper search shows up in the report.
    if (move.type === "upgradeColonyToCity") {
      this.upgrades += 1;
    }

    // The resolved card is still on lastPlayerEvent (nothing draws between
    // the reveal and its resolution).
    if (move.type === "resolveEvent" && G.lastPlayerEvent) {
      const picks = (this.choicePicks[G.lastPlayerEvent.id] ??= []);
      picks[move.choiceIndex] = (picks[move.choiceIndex] ?? 0) + 1;
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
    // Deck exhaustion ends the game mid-endTurn WITHOUT advancing turn/season (see
    // startNewSeason): no new player-turn happened here, so recording one would
    // duplicate the final turn, undercount turnsPlayed, and re-count the prior draw.
    if (G.phase === "gameOver" && G.gameOverReason === "deckExhausted") {
      return;
    }

    if (G.season !== this.lastSeason) {
      this.lastSeason = G.season;
      this.countSeasonal(G);
    }

    // A terminal victory-race turn advanced the turn (a real snapshot) but ended
    // before income/draw, so there is no fresh player event to count here.
    if (G.phase !== "gameOver") {
      this.countPlayerDraw(G);
    }

    this.snapshots.push(snapshotTurn(G, this.game, this.seed));
  }

  /** total + per-finished-game, the shape every count in this report uses. */
  private perGameCount(count: number) {
    return { count, perGame: this.games.length > 0 ? count / this.games.length : 0 };
  }

  endGame(G: HegemonyState) {
    // Standing Laws remain board-derived; authored Voice progress is intentionally
    // permanent state and survives repeal/replacement.
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
    const luxuries = {} as GameRow["luxuries"];
    const finalGold = {} as Record<PlayerId, number>;

    for (const playerID of PLAYER_IDS) {
      finalCards[playerID] = playerStandings(G, playerID).victoryCards;
      finalAuthoredPasses[playerID] = G.assemblyPassedByPlayer[playerID];
      popsLostToUnrest[playerID] = G.players[playerID].popsLostToUnrest;
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

    this.games.push({
      game: this.game,
      seed: this.seed,
      turnsPlayed: G.turn - this.startTurn,
      finalSeason: G.season,
      termination,
      winner: finished ? G.winner : null,
      leaderAtCap: finished ? null : this.leaderByTiebreak(G, finalCards),
      seatPolicies: this.gameSeatPolicies ?? undefined,
      finalCards,
      finalAuthoredPasses,
      voiceHolder: G.voiceHolder,
      popsLostToUnrest,
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
      const happiness = G.players[b].resources.happiness - G.players[a].resources.happiness;
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
    // Season rows use only each game's LAST snapshot of that season
    // (end-of-season state), pooled across games and seats.
    const seasonBuckets = new Map<number, TurnSnapshot[]>();

    const tails = new Map<string, TurnSnapshot>();
    for (const snapshot of this.snapshots) {
      tails.set(`${snapshot.game}:${snapshot.season}`, snapshot);
    }
    for (const snapshot of tails.values()) {
      const bucket = seasonBuckets.get(snapshot.season) ?? [];
      bucket.push(snapshot);
      seasonBuckets.set(snapshot.season, bucket);
    }

    const perSeason: SeasonRow[] = [...seasonBuckets.entries()]
      .sort(([a], [b]) => a - b)
      .map(([season, snapshots]) => {
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
          season,
          seasonName: snapshots[0].seasonName,
          year: snapshots[0].year,
          games: snapshots.length,
          victoryCards: percentiles(values((player) => player.victoryCards)),
          pops: percentiles(values((player) => player.pops + player.inTransit)),
          food: percentiles(values((player) => player.resources.food)),
          happiness: percentiles(values((player) => player.resources.happiness)),
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
      perSeason,
      perSeat,
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
        seasonal: Object.fromEntries(
          SEASONAL_EVENT_CONTENT_IDS.map((eventId) => [eventId, this.seasonalEvents[eventId] ?? 0]),
        ) as BatchReport["events"]["seasonal"],
        choicePicks: this.choicePicks,
      },
      currencyVerbs: Object.fromEntries(
        CURRENCY_VERBS.map((verb) => {
          const count = this.currencyVerbs[verb] ?? 0;
          return [verb, { count, perGame: this.games.length > 0 ? count / this.games.length : 0 }];
        }),
      ),
      assembly: {
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

  private countSeasonal(G: HegemonyState) {
    const card = G.activeSeasonEvent?.card;
    if (card) {
      this.seasonalEvents[card.id] = (this.seasonalEvents[card.id] ?? 0) + 1;
    }
  }

  private countPlayerDraw(G: HegemonyState) {
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
    "season",
    "seasonName",
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
    "incomeWood",
    "incomeStone",
    "incomeGold",
    "incomeFood",
    "incomeInfluence",
    "incomeHappiness",
    "unrestTier",
    "riotAtRisk",
    "deficitTurns",
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
        snapshot.season,
        snapshot.seasonName,
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
        player.resources.happiness,
        player.income.wood,
        player.income.stone,
        player.income.gold,
        player.income.food,
        player.income.influence,
        player.income.happiness,
        player.unrestTier,
        player.riotAtRisk,
        player.deficitTurns,
        player.popsLostToUnrest,
        player.popsGainedFromEvents,
        ...ACTIVE_EFFECT_KINDS.map((kind) => player.activeEffects[kind]),
      ].join(",");
    }),
  );

  return [header.join(","), ...rows].join("\n");
}
