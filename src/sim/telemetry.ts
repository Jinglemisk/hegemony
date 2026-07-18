import { seasonName, yearOf } from "../game/core/calendar";
import { totalPops } from "../game/core/pops";
import { calculateIncome } from "../game/economy/income";
import type { LegalMove } from "../game/legalMoves";
import { PLAYER_IDS } from "../game/data";
import { playerStandings } from "../game/score";
import { canPlaceColonyOnTile } from "../game/settlement";
import { unrestStatus } from "../game/unrest";
import type { UnrestTier } from "../game/unrest";
import type { GameOverReason, HegemonyState, PlayerId, Resources } from "../game/types";

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

    players[playerID] = {
      victoryCards: standings.victoryCards,
      cities: standings.cities,
      colonies: standings.colonies,
      pops: standings.pops,
      frontierTiles: G.board.tiles.filter((tile) => canPlaceColonyOnTile(G, playerID, tile).can).length,
      inTransit,
      resources: { ...player.resources },
      income: calculateIncome(G, playerID),
      unrestTier: unrest.tier,
      riotAtRisk: unrest.riotAtRisk ? 1 : 0,
      deficitTurns: player.consecutiveFoodDeficitTurns,
      popsLostToUnrest: player.popsLostToUnrest,
      popsGainedFromEvents: player.popsGainedFromEvents,
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

export type Percentiles = { mean: number; p10: number; median: number; p90: number; min: number; max: number };

/** Nearest-rank percentiles on a copy; NaN-free for empty input (all zeros). */
export function percentiles(values: number[]): Percentiles {
  if (values.length === 0) {
    return { mean: 0, p10: 0, median: 0, p90: 0, min: 0, max: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const at = (fraction: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1))];

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
  finalCards: Record<PlayerId, number>;
  popsLostToUnrest: Record<PlayerId, number>;
};

export type BatchReport = {
  meta: {
    games: number;
    turns: number;
    policy: string;
    mode: string;
    baseSeed: number;
    botSeedRule: string;
    rulesetPatch: unknown;
    generatedAt: string;
  };
  perGame: GameRow[];
  perSeason: SeasonRow[];
  perSeat: Record<PlayerId, { winRate: number; capLeaderRate: number; meanFinalCards: number }>;
  buildings: Record<string, { built: number; perGame: number }>;
  events: {
    player: Record<string, number>;
    seasonal: Record<string, number>;
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
  forced: { actionCapHits: number; forcedResolutions: number; forcedEndTurns: number; perGame: number };
};

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
  private currencyVerbs: Record<string, number> = {};
  private actionCapHits = 0;
  private forcedResolutions = 0;
  private forcedEndTurns = 0;

  private game = -1;
  private seed = 0;
  private startTurn = 1;
  private lastSeason = 0;

  beginGame(game: number, seed: number, G: HegemonyState) {
    this.game = game;
    this.seed = seed;
    this.startTurn = G.turn;
    this.lastSeason = G.season;

    // The opening already revealed season 1's card and player 0's first draw.
    this.countSeasonal(G);
    this.countPlayerDraw(G);
  }

  onMove(G: HegemonyState, _player: PlayerId, move: LegalMove) {
    if (move.type === "buildBuilding") {
      this.buildings[move.buildingId] = (this.buildings[move.buildingId] ?? 0) + 1;
    }

    if ((CURRENCY_VERBS as readonly string[]).includes(move.type)) {
      this.currencyVerbs[move.type] = (this.currencyVerbs[move.type] ?? 0) + 1;
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

  endGame(G: HegemonyState) {
    const finalCards = {} as Record<PlayerId, number>;
    const popsLostToUnrest = {} as Record<PlayerId, number>;

    for (const playerID of PLAYER_IDS) {
      finalCards[playerID] = playerStandings(G, playerID).victoryCards;
      popsLostToUnrest[playerID] = G.players[playerID].popsLostToUnrest;
    }

    // A finished game (victory race / deck exhaustion) names a real winner. A game
    // stopped at the turn cap has NOT been won — record only a heuristic leaderAtCap
    // (cards → happiness → pops → seat) so it never inflates the real win rate.
    const finished = G.phase === "gameOver";
    const termination: GameTermination = finished ? (G.gameOverReason as GameOverReason) : "turnCap";

    this.games.push({
      game: this.game,
      seed: this.seed,
      turnsPlayed: G.turn - this.startTurn,
      finalSeason: G.season,
      termination,
      winner: finished ? G.winner : null,
      leaderAtCap: finished ? null : this.leaderByTiebreak(G, finalCards),
      finalCards,
      popsLostToUnrest,
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
          snapshots.flatMap((snapshot) => PLAYER_IDS.map((playerID) => select(snapshot.players[playerID])));

        const tierShares: Record<UnrestTier, number> = { calm: 0, discontent: 0, unrest: 0, revolt: 0 };
        const seats = snapshots.length * PLAYER_IDS.length;
        for (const snapshot of snapshots) {
          for (const playerID of PLAYER_IDS) {
            tierShares[snapshot.players[playerID].unrestTier] += 1 / seats;
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
        };
      });

    // Real win rate is over FINISHED games only; a turn-capped game is not a win.
    const finishedGames = this.games.filter((game) => game.termination !== "turnCap");
    const cappedGames = this.games.filter((game) => game.termination === "turnCap");

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

    const terminations: Record<GameTermination, number> = { victoryRace: 0, deckExhausted: 0, turnCap: 0 };
    for (const game of this.games) {
      terminations[game.termination] += 1;
    }

    const buildings: BatchReport["buildings"] = {};
    for (const [buildingId, built] of Object.entries(this.buildings)) {
      buildings[buildingId] = { built, perGame: this.games.length > 0 ? built / this.games.length : 0 };
    }

    return {
      meta,
      perGame: this.games,
      perSeason,
      perSeat,
      buildings,
      events: {
        player: this.playerEvents,
        seasonal: this.seasonalEvents,
        choicePicks: this.choicePicks,
      },
      currencyVerbs: Object.fromEntries(
        CURRENCY_VERBS.map((verb) => {
          const count = this.currencyVerbs[verb] ?? 0;
          return [verb, { count, perGame: this.games.length > 0 ? count / this.games.length : 0 }];
        })
      ),
      finalCardsDistribution: percentiles(this.games.flatMap((game) => PLAYER_IDS.map((playerID) => game.finalCards[playerID]))),
      terminations,
      forced: {
        actionCapHits: this.actionCapHits,
        forcedResolutions: this.forcedResolutions,
        forcedEndTurns: this.forcedEndTurns,
        perGame: this.games.length > 0 ? this.actionCapHits / this.games.length : 0,
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
      ].join(",");
    }),
  );

  return [header.join(","), ...rows].join("\n");
}
