import { seasonName, yearOf } from "../game/core/calendar";
import { totalPops } from "../game/core/pops";
import { calculateIncome } from "../game/economy/income";
import type { LegalMove } from "../game/legalMoves";
import { PLAYER_IDS } from "../game/data";
import { playerStandings } from "../game/score";
import { unrestStatus } from "../game/unrest";
import type { UnrestTier } from "../game/unrest";
import type { HegemonyState, PlayerId, Resources } from "../game/types";

/**
 * Balance instrumentation for batch runs. One TurnSnapshot per player-turn;
 * the Aggregator folds snapshots + move/draw counts across games into the
 * report consumed by balance analysis. Event cards are counted by id at the
 * moment they surface (deck objects are shared references — never compare
 * card identity).
 */

export type PlayerSnapshot = {
  vp: number;
  cities: number;
  colonies: number;
  pops: number;
  inTransit: number;
  resources: Resources;
  income: Resources;
  unrestTier: UnrestTier;
  popsAtRisk: number;
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
      vp: standings.victoryPoints,
      cities: standings.cities,
      colonies: standings.colonies,
      pops: standings.pops,
      inTransit,
      resources: { ...player.resources },
      income: calculateIncome(G, playerID),
      unrestTier: unrest.tier,
      popsAtRisk: unrest.popsAtRisk,
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
  vp: Percentiles;
  pops: Percentiles;
  food: Percentiles;
  happiness: Percentiles;
  unrestTierShares: Record<UnrestTier, number>;
};

export type GameRow = {
  game: number;
  seed: number;
  turnsPlayed: number;
  finalSeason: number;
  winner: PlayerId;
  finalVP: Record<PlayerId, number>;
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
  perSeat: Record<PlayerId, { winRate: number; meanFinalVP: number }>;
  buildings: Record<string, { built: number; perGame: number }>;
  events: {
    player: Record<string, number>;
    seasonal: Record<string, number>;
    /** For choice cards: how often each option index was picked. */
    choicePicks: Record<string, number[]>;
  };
  finalVpDistribution: Percentiles;
};

export class Aggregator {
  private snapshots: TurnSnapshot[] = [];
  private games: GameRow[] = [];
  private buildings: Record<string, number> = {};
  private playerEvents: Record<string, number> = {};
  private seasonalEvents: Record<string, number> = {};
  private choicePicks: Record<string, number[]> = {};

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

    // The resolved card is still on lastPlayerEvent (nothing draws between
    // the reveal and its resolution).
    if (move.type === "resolveEvent" && G.lastPlayerEvent) {
      const picks = (this.choicePicks[G.lastPlayerEvent.id] ??= []);
      picks[move.choiceIndex] = (picks[move.choiceIndex] ?? 0) + 1;
    }
  }

  onTurnEnd(G: HegemonyState) {
    if (G.season !== this.lastSeason) {
      this.lastSeason = G.season;
      this.countSeasonal(G);
    }

    // Each gameplay turn ends by bootstrapping the next player's income + draw.
    this.countPlayerDraw(G);

    this.snapshots.push(snapshotTurn(G, this.game, this.seed));
  }

  endGame(G: HegemonyState) {
    const finalVP = {} as Record<PlayerId, number>;
    const popsLostToUnrest = {} as Record<PlayerId, number>;
    let winner: PlayerId = "0";

    for (const playerID of PLAYER_IDS) {
      finalVP[playerID] = playerStandings(G, playerID).victoryPoints;
      popsLostToUnrest[playerID] = G.players[playerID].popsLostToUnrest;

      if (finalVP[playerID] > finalVP[winner]) {
        winner = playerID;
      }
    }

    this.games.push({
      game: this.game,
      seed: this.seed,
      turnsPlayed: G.turn - this.startTurn,
      finalSeason: G.season,
      winner,
      finalVP,
      popsLostToUnrest,
    });
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
          vp: percentiles(values((player) => player.vp)),
          pops: percentiles(values((player) => player.pops + player.inTransit)),
          food: percentiles(values((player) => player.resources.food)),
          happiness: percentiles(values((player) => player.resources.happiness)),
          unrestTierShares: tierShares,
        };
      });

    const perSeat = {} as BatchReport["perSeat"];
    for (const playerID of PLAYER_IDS) {
      const wins = this.games.filter((game) => game.winner === playerID).length;
      const vps = this.games.map((game) => game.finalVP[playerID]);
      perSeat[playerID] = {
        winRate: this.games.length > 0 ? wins / this.games.length : 0,
        meanFinalVP: percentiles(vps).mean,
      };
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
      finalVpDistribution: percentiles(this.games.flatMap((game) => PLAYER_IDS.map((playerID) => game.finalVP[playerID]))),
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
    "vp",
    "cities",
    "colonies",
    "pops",
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
    "popsAtRisk",
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
        player.vp,
        player.cities,
        player.colonies,
        player.pops,
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
        player.popsAtRisk,
        player.deficitTurns,
        player.popsLostToUnrest,
        player.popsGainedFromEvents,
      ].join(",");
    }),
  );

  return [header.join(","), ...rows].join("\n");
}
