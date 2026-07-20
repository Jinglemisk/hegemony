import { describe, expect, it } from "vitest";

import { PLAYER_IDS } from "../game/data";
import { randomPolicy } from "./policies";
import { runGame } from "./runner";
import { Aggregator, percentiles, snapshotTurn, snapshotsToCsv } from "./telemetry";
import type { BatchReport } from "./telemetry";

function runAggregated(games: number, turns: number) {
  const aggregator = new Aggregator();

  for (let game = 0; game < games; game += 1) {
    const seed = 500 + game;
    const G = runGame({
      seed,
      mode: "standard",
      policy: randomPolicy,
      turns,
      hooks: {
        onGameStart: (state) => aggregator.beginGame(game, seed, state),
        onMove: (state, player, move) => aggregator.onMove(state, player, move),
        onTurnEnd: (state) => aggregator.onTurnEnd(state),
      },
    });
    aggregator.endGame(G);
  }

  const meta: BatchReport["meta"] = {
    games,
    turns,
    policy: "random",
    mode: "standard",
    boardLayout: "classic",
    baseSeed: 500,
    botSeedRule: "seed ^ 0x9e3779b9",
    rulesetPatch: null,
    generatedAt: "test",
  };

  return { aggregator, report: aggregator.buildReport(meta) };
}

describe("percentiles", () => {
  it("computes nearest-rank stats on a known array", () => {
    const stats = percentiles([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    expect(stats.mean).toBe(5.5);
    expect(stats.p10).toBe(1);
    expect(stats.median).toBe(5);
    expect(stats.p90).toBe(9);
    expect(stats.min).toBe(1);
    expect(stats.max).toBe(10);
  });

  it("is safe on empty input", () => {
    expect(percentiles([]).mean).toBe(0);
  });
});

describe("snapshotTurn", () => {
  it("captures every player with resources, income, and unrest fields", () => {
    const G = runGame({ seed: 3, mode: "standard", policy: randomPolicy, turns: 8 });
    const snapshot = snapshotTurn(G, 0, 3);

    expect(snapshot.turn).toBe(G.turn);
    for (const playerID of PLAYER_IDS) {
      const player = snapshot.players[playerID];
      expect(player.resources.wood).toBeTypeOf("number");
      expect(player.income.food).toBeTypeOf("number");
      expect(["calm", "discontent", "unrest", "revolt"]).toContain(player.unrestTier);
      expect(player.pops).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("Aggregator", () => {
  it("aggregates games, snapshots, seats, and event counts", () => {
    const turns = 12;
    const { aggregator, report } = runAggregated(2, turns);

    expect(report.perGame).toHaveLength(2);
    expect(report.perGame[0].turnsPlayed).toBe(turns);
    // One snapshot per player-turn per game.
    expect(aggregator.allSnapshots()).toHaveLength(2 * turns);

    // Every turn draws a player event, plus the bootstrap draw per game.
    const playerEventCount = Object.values(report.events.player).reduce((sum, count) => sum + count, 0);
    expect(playerEventCount).toBe(2 * (turns + 1));

    // These short games all hit the turn cap — not wins. Real win rate is 0; the
    // cap-leader rate carries the distribution instead.
    expect(report.terminations.turnCap).toBe(2);
    expect(report.perGame[0].termination).toBe("turnCap");
    expect(report.perGame[0].winner).toBeNull();
    expect(PLAYER_IDS).toContain(report.perGame[0].leaderAtCap);
    const totalWinRate = Object.values(report.perSeat).reduce((sum, seat) => sum + seat.winRate, 0);
    expect(totalWinRate).toBe(0);
    const totalCapLeaderRate = Object.values(report.perSeat).reduce((sum, seat) => sum + seat.capLeaderRate, 0);
    expect(totalCapLeaderRate).toBeCloseTo(1);

    // Season rows exist and pool both games once a season completed in both.
    expect(report.perSeason.length).toBeGreaterThan(0);
    expect(report.perSeason[0].games).toBe(2);

    // Unrest tier shares are a distribution.
    const shares = report.perSeason[0].unrestTierShares;
    expect(shares.calm + shares.discontent + shares.unrest + shares.revolt).toBeCloseTo(1);
  });

  it("counts a finished game as a real win, never as a cap leader", () => {
    const aggregator = new Aggregator();
    const seed = 700;
    const G = runGame({ seed, mode: "standard", policy: randomPolicy, turns: 6 });
    aggregator.beginGame(0, seed, G);

    // Force a real victory-race finish on the post-run state.
    G.phase = "gameOver";
    G.gameOverReason = "victoryRace";
    G.winner = "0";
    aggregator.endGame(G);

    const report = aggregator.buildReport({
      games: 1,
      turns: 6,
      policy: "random",
      mode: "standard",
      boardLayout: "classic",
      baseSeed: seed,
      botSeedRule: "seed ^ 0x9e3779b9",
      rulesetPatch: null,
      generatedAt: "test",
    });

    expect(report.perGame[0].termination).toBe("victoryRace");
    expect(report.perGame[0].winner).toBe("0");
    expect(report.perGame[0].leaderAtCap).toBeNull();
    expect(report.terminations).toEqual({ victoryRace: 1, deckExhausted: 0, stratoklesCoup: 0, turnCap: 0 });
    expect(report.perSeat["0"].winRate).toBe(1);
    expect(report.perSeat["1"].winRate).toBe(0);
    expect(report.perSeat["0"].capLeaderRate).toBe(0);
  });

  it("credits a finished game's win to the winning seat's policy (winsByPolicy)", () => {
    const aggregator = new Aggregator();
    const seed = 900;
    const G = runGame({ seed, mode: "standard", policy: randomPolicy, turns: 6 });
    const seatPolicies = { "0": "greedy", "1": "smart", "2": "smart", "3": "smart" } as const;
    aggregator.beginGame(0, seed, G, { ...seatPolicies });

    G.phase = "gameOver";
    G.gameOverReason = "victoryRace";
    G.winner = "0";
    aggregator.endGame(G);

    const report = aggregator.buildReport({
      games: 1,
      turns: 6,
      policy: "mixed",
      mode: "standard",
      boardLayout: "classic",
      seatPolicies: { ...seatPolicies },
      baseSeed: seed,
      botSeedRule: "seed ^ 0x9e3779b9",
      rulesetPatch: null,
      generatedAt: "test",
    });

    // greedy held one seat and won it; smart held three seats and won none.
    expect(report.winsByPolicy.greedy).toEqual({ games: 1, wins: 1, winRate: 1 });
    expect(report.winsByPolicy.smart).toEqual({ games: 3, wins: 0, winRate: 0 });
  });

  it("keeps turnsPlayed equal to the snapshot count through a natural end (no duplicate turns)", () => {
    const aggregator = new Aggregator();
    const seed = 42;
    const G = runGame({
      seed,
      mode: "standard",
      policy: randomPolicy,
      turns: 400,
      hooks: {
        onGameStart: (state) => aggregator.beginGame(0, seed, state),
        onMove: (state, player, move) => aggregator.onMove(state, player, move),
        onTurnEnd: (state) => aggregator.onTurnEnd(state),
      },
    });
    aggregator.endGame(G);

    const report = aggregator.buildReport({
      games: 1,
      turns: 400,
      policy: "random",
      mode: "standard",
      boardLayout: "classic",
      baseSeed: seed,
      botSeedRule: "seed ^ 0x9e3779b9",
      rulesetPatch: null,
      generatedAt: "test",
    });

    const snaps = aggregator.allSnapshots();
    // No phantom duplicate turn at deck exhaustion: every snapshot is a distinct turn.
    const turnNumbers = snaps.map((snapshot) => snapshot.turn);
    expect(new Set(turnNumbers).size).toBe(turnNumbers.length);
    // turnsPlayed matches the number of recorded player-turns exactly.
    expect(report.perGame[0].turnsPlayed).toBe(snaps.length);
  });

  it("emits one CSV row per game-turn-player plus a header", () => {
    const { aggregator } = runAggregated(1, 8);
    const csv = snapshotsToCsv(aggregator.allSnapshots());
    const lines = csv.split("\n");

    expect(lines).toHaveLength(1 + 8 * PLAYER_IDS.length);
    expect(lines[0].startsWith("game,seed,turn,")).toBe(true);
    // Every row has the same column count as the header.
    const columns = lines[0].split(",").length;
    for (const line of lines) {
      expect(line.split(",")).toHaveLength(columns);
    }
  });
});
