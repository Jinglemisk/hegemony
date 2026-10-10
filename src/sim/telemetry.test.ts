import { defaultHungerLeave, resolveHunger } from "../game/hunger";
import { describe, expect, it } from "vitest";

import { ACTIVE_EFFECT_KINDS } from "../game/activeEffects";
import { openAssembly } from "../game/assembly";
import { createModeDefinition } from "../game/definition";
import { PLAYER_IDS } from "../game/data";
import { transition, type GameCommand } from "../game/legalMoves";
import { resolveRiot } from "../game/riot";
import { beginTurnFor, endTurn } from "../game/turn";
import { owned, scenario } from "../game/testing/scenario";
import type { HegemonyState, PlayerId } from "../game/types";
import { randomPolicy } from "./policies";
import { runGame } from "./runner";
import { Aggregator, percentiles, snapshotTurn, snapshotsToCsv } from "./telemetry";
import type { BatchReport } from "./telemetry";

const TEST_DEFINITION = createModeDefinition("standard").identity;

const META: BatchReport["meta"] = {
  games: 1,
  turns: 56,
  policy: "mixed",
  mode: "standard",
  boardLayout: "classic",
  opening: "policy",
  baseSeed: 42,
  botSeedRule: "test",
  rulesetPatch: null,
  definition: TEST_DEFINITION,
  generatedAt: "test",
};
const SEATS: Record<PlayerId, string> = {
  "0": "civic",
  "1": "slaver",
  "2": "trader",
  "3": "master",
};

/** One observed game driven through the real transition, so every command leaves a
 *  new state for the aggregator to compare with the last. */
function drive(start: HegemonyState) {
  const aggregator = new Aggregator();
  aggregator.beginGame(0, 42, start, { ...SEATS });
  const game = {
    G: start,
    aggregator,
    take(player: PlayerId, command: GameCommand) {
      const result = transition(game.G.definition, game.G, player, command);
      if (!result.ok) throw new Error(`${JSON.stringify(command)}: ${result.reasons.join("; ")}`);
      const turn = game.G.turn;
      game.G = result.state;
      aggregator.onMove(game.G, player, command);
      if (game.G.turn !== turn || game.G.phase === "gameOver") aggregator.onTurnEnd(game.G);
    },
    report() {
      aggregator.endGame(game.G);
      return aggregator.buildReport(META);
    },
  };
  return game;
}

function runAggregated(games: number, turns: number) {
  const aggregator = new Aggregator();
  let deferredDraws = 0;

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
    if (!G.players[G.currentPlayer].collectedThisTurn) deferredDraws += 1;
    aggregator.endGame(G);
  }

  const meta: BatchReport["meta"] = {
    games,
    turns,
    policy: "random",
    mode: "standard",
    boardLayout: "classic",
    baseSeed: 500,
    opening: "policy",
    botSeedRule: "seed ^ 0x9e3779b9",
    rulesetPatch: null,
    definition: TEST_DEFINITION,
    generatedAt: "test",
  };

  return { aggregator, report: aggregator.buildReport(meta), deferredDraws };
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
      expect(Object.keys(player.activeEffects)).toEqual([...ACTIVE_EFFECT_KINDS]);
    }
  });
});

describe("Aggregator", () => {
  it("keeps turn-end hunger and the draw when the final turn ends in a riot", () => {
    const G = scenario()
      .withResources("0", { food: 0 })
      .stackYearCard("year-drought")
      .opening()
      .withHappiness("0", -3)
      .mutate((state) => {
        state.year = 14;
        state.yearOpener = "1";
        state.yearDrawPile = [];
        state.pendingPlayerEvent = null;
      })
      .build();
    const aggregator = new Aggregator();
    aggregator.beginGame(0, 42, G);
    expect(endTurn(G).ok).toBe(true);
    aggregator.onMove(G, "0", { type: "endTurn" });
    // The seat ended short: its choice comes before the riot check.
    const leave = defaultHungerLeave(G, "0", G.pendingHunger!.unfed);
    expect(resolveHunger(G, "0", leave).ok).toBe(true);
    aggregator.onMove(G, "0", { type: "resolveHunger", leave });
    expect(resolveRiot(G, "0").ok).toBe(true);
    expect(G.players["0"].popsLostToHunger).toBeGreaterThan(0);
    aggregator.onMove(G, "0", { type: "resolveRiot" });
    expect(G.gameOverReason).toBe("deckExhausted");
    aggregator.onTurnEnd(G);
    aggregator.endGame(G);
    const report = aggregator.buildReport({
      games: 1,
      turns: 56,
      policy: "random",
      mode: "standard",
      boardLayout: "classic",
      opening: "policy",
      baseSeed: 42,
      botSeedRule: "test",
      rulesetPatch: null,
      definition: TEST_DEFINITION,
      generatedAt: "test",
    });
    expect(aggregator.allSnapshots()).toHaveLength(1);
    expect(report.hunger["0"].hungerTurnsPerGame).toBe(1);
    expect(Object.values(report.events.player).reduce((sum, count) => sum + count, 0)).toBe(1);
    expect(report.riots.byYear).toEqual([{ year: 14, riots: 1, playerTurns: 1, revolts: 0 }]);
  });

  it("attributes a last-seat riot to the old year and counts the next draw once", () => {
    const G = scenario({ patch: { assembly: { firstYear: 0 } } })
      .opening()
      .build();
    G.pendingPlayerEvent = null;
    beginTurnFor(G, "3");
    G.pendingPlayerEvent = null;
    G.players["3"].unrestTokens += 3;
    const aggregator = new Aggregator();
    aggregator.beginGame(0, 42, G);
    expect(endTurn(G).ok).toBe(true);
    expect(resolveRiot(G, "3").ok).toBe(true);
    expect(G.year).toBe(2);
    aggregator.onMove(G, "3", { type: "resolveRiot" });
    aggregator.onTurnEnd(G);
    aggregator.endGame(G);
    const report = aggregator.buildReport({
      games: 1,
      turns: 2,
      policy: "random",
      mode: "standard",
      boardLayout: "classic",
      opening: "fixed",
      baseSeed: 42,
      botSeedRule: "test",
      rulesetPatch: null,
      definition: G.definition.identity,
      generatedAt: "test",
    });
    expect(report.riots.byYear).toEqual([
      { year: 1, riots: 1, playerTurns: 1, revolts: 0 },
      { year: 2, riots: 0, playerTurns: 1, revolts: 0 },
    ]);
    expect(Object.values(report.events.player).reduce((sum, count) => sum + count, 0)).toBe(2);
  });

  it("aggregates games, snapshots, seats, and event counts", () => {
    const turns = 12;
    const { aggregator, report, deferredDraws } = runAggregated(2, turns);

    expect(report.perGame).toHaveLength(2);
    expect(report.perGame[0].turnsPlayed).toBe(turns);
    // The opening turn and each newly opened turn are observed, including at a cap.
    expect(aggregator.allSnapshots()).toHaveLength(2 * (turns + 1));

    // Each collected income draws; an Assembly at the cap can delay the final draw.
    const playerEventCount = Object.values(report.events.player).reduce(
      (sum, count) => sum + count,
      0,
    );
    expect(playerEventCount).toBe(2 * (turns + 1) - deferredDraws);

    // These short games all hit the turn cap — not wins. Real win rate is 0; the
    // cap-leader rate carries the distribution instead.
    expect(report.terminations.turnCap).toBe(2);
    expect(report.perGame[0].termination).toBe("turnCap");
    expect(report.perGame[0].winner).toBeNull();
    expect(PLAYER_IDS).toContain(report.perGame[0].leaderAtCap);
    const totalWinRate = Object.values(report.perSeat).reduce((sum, seat) => sum + seat.winRate, 0);
    expect(totalWinRate).toBe(0);
    const totalCapLeaderRate = Object.values(report.perSeat).reduce(
      (sum, seat) => sum + seat.capLeaderRate,
      0,
    );
    expect(totalCapLeaderRate).toBeCloseTo(1);

    // Year rows pool both games once a year completed in both.
    expect(report.perYear.length).toBeGreaterThan(0);
    expect(report.perYear[0].games).toBe(2);

    // Unrest tier shares are a distribution.
    const shares = report.perYear[0].unrestTierShares;
    expect(shares.calm + shares.discontent + shares.unrest + shares.revolt).toBeCloseTo(1);

    expect(Object.keys(report.activeEffects)).toEqual([...ACTIVE_EFFECT_KINDS]);
    for (const kind of ACTIVE_EFFECT_KINDS) {
      expect(report.activeEffects[kind].observations).toBeGreaterThanOrEqual(0);
      expect(report.activeEffects[kind].playerTurnShare).toBeGreaterThanOrEqual(0);
      expect(report.activeEffects[kind].playerTurnShare).toBeLessThanOrEqual(1);
    }

    expect(report.assembly.authoredPassed.count).toBeGreaterThanOrEqual(0);
    expect(report.assembly.voiceClaims.count).toBeGreaterThanOrEqual(0);
    expect(report.assembly.voiceTransfers.count).toBeGreaterThanOrEqual(0);
    expect(report.assembly.voiceHoldersAtEnd.perGame).toBeGreaterThanOrEqual(0);
    expect(report.assembly.voiceHoldersAtEnd.perGame).toBeLessThanOrEqual(1);
    expect(report.assembly.authoredPassLeaderShare.mean).toBeGreaterThanOrEqual(0);
    expect(report.assembly.authoredPassLeaderShare.mean).toBeLessThanOrEqual(1);
    expect(Object.keys(report.assembly.directiveTargets)).toEqual(PLAYER_IDS);
    expect(report.assembly.prizesGranted).toEqual(
      expect.objectContaining({
        wood: expect.any(Number),
        stone: expect.any(Number),
        food: expect.any(Number),
        gold: expect.any(Number),
      }),
    );
  });

  it("counts a finished game as a real win, never as a cap leader", () => {
    const aggregator = new Aggregator();
    const seed = 700;
    const played = runGame({ seed, mode: "standard", policy: randomPolicy, turns: 6 });
    aggregator.beginGame(0, seed, played);
    const G = structuredClone(played);

    // Force a real victory-race finish on the post-run state.
    G.phase = "gameOver";
    G.gameOverReason = "victoryRace";
    G.winner = "0";
    // The opener won after a year-card reveal but before income or a player draw.
    G.year += 1;
    G.activeYearCard = G.yearDrawPile.shift()!;
    aggregator.onTurnEnd(G);
    G.assemblyPassedByPlayer = { "0": 4, "1": 2, "2": 1, "3": 0 };
    G.activeLaws = ["land-reform", "public-works"].map((cardId, order) => ({
      cardId,
      author: "0",
      enactedYear: G.year,
      order,
    }));
    aggregator.endGame(G);

    const report = aggregator.buildReport({
      games: 1,
      turns: 6,
      policy: "random",
      mode: "standard",
      boardLayout: "classic",
      baseSeed: seed,
      opening: "policy",
      botSeedRule: "seed ^ 0x9e3779b9",
      rulesetPatch: null,
      definition: TEST_DEFINITION,
      generatedAt: "test",
    });

    expect(report.perGame[0].termination).toBe("victoryRace");
    expect(report.perGame[0].winner).toBe("0");
    expect(report.perGame[0].decidedBy).toBe("race");
    expect(report.perPolicy.random.winsDecidedBy).toMatchObject({ race: 1, titles: 0 });
    expect(report.perGame[0].leaderAtCap).toBeNull();
    expect(aggregator.allSnapshots()).toHaveLength(1);
    expect(Object.values(report.events.year).reduce((sum, count) => sum + count, 0)).toBe(2);
    expect(report.perGame[0].yearCards).toEqual([played.activeYearCard!.id, G.activeYearCard.id]);
    expect(report.perGame[0].voiceHolder).toBe("0");
    expect(report.perGame[0].finalAuthoredPasses).toEqual({ "0": 4, "1": 2, "2": 1, "3": 0 });
    expect(report.terminations).toEqual({ victoryRace: 1, deckExhausted: 0, turnCap: 0 });
    expect(report.perSeat["0"].winRate).toBe(1);
    expect(report.perSeat["1"].winRate).toBe(0);
    expect(report.perSeat["0"].capLeaderRate).toBe(0);
    expect(report.assembly.voiceHoldersAtEnd).toEqual({ count: 1, perGame: 1 });
    expect(report.assembly.voiceHolderWins).toEqual({ count: 1, finishedGames: 1, rate: 1 });
    expect(report.assembly.authoredPassLeadMargin.mean).toBe(2);
    expect(report.assembly.authoredPassLeaderShare.mean).toBeCloseTo(4 / 7);
  });

  it("credits a finished game's win to the winning seat's policy (winsByPolicy)", () => {
    const aggregator = new Aggregator();
    const seed = 900;
    const played = runGame({ seed, mode: "standard", policy: randomPolicy, turns: 6 });
    const seatPolicies = { "0": "greedy", "1": "smart", "2": "smart", "3": "smart" } as const;
    aggregator.beginGame(0, seed, played, { ...seatPolicies });
    const G = structuredClone(played);

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
      opening: "policy",
      botSeedRule: "seed ^ 0x9e3779b9",
      rulesetPatch: null,
      definition: TEST_DEFINITION,
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
      opening: "policy",
      botSeedRule: "seed ^ 0x9e3779b9",
      rulesetPatch: null,
      definition: TEST_DEFINITION,
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

    // The opening turn plus eight newly opened turns are observed at a turn cap.
    expect(lines).toHaveLength(1 + 9 * PLAYER_IDS.length);
    expect(lines[0].startsWith("game,seed,turn,")).toBe(true);
    // Every row has the same column count as the header.
    const columns = lines[0].split(",").length;
    for (const line of lines) {
      expect(line.split(",")).toHaveLength(columns);
    }
  });
});

describe("the Step 11 report fields", () => {
  const opened = () => {
    const G = scenario().opening().build();
    G.pendingPlayerEvent = null;
    return G;
  };

  /** The scripted opening with every seat level on titles and happiness, and two of
   *  seat 0's freemen on the road: six pops standing and eight in its realm, against
   *  seat 3's seven. */
  function tiedOnHappiness() {
    const G = opened();
    G.players["3"].unrestTokens += 1;
    const [from, to] = G.players["0"].settlements;
    G.transfers.push({
      id: "transfer-test",
      owner: "0",
      fromSettlementId: owned(G, from, "0").id,
      toSettlementId: owned(G, to, "0").id,
      fromTileId: from,
      toTileId: to,
      pops: { citizens: 0, freemen: 2, slaves: 0 },
    });
    return G;
  }

  it("names what decided a game, and leads a cut-off one by the engine's tally", () => {
    const aggregator = new Aggregator();
    const capped = tiedOnHappiness();
    aggregator.beginGame(0, 42, capped, { ...SEATS });
    aggregator.endGame(capped);
    const ended = tiedOnHappiness();
    ended.phase = "gameOver";
    ended.gameOverReason = "deckExhausted";
    ended.winner = "0";
    aggregator.beginGame(1, 43, ended, { ...SEATS });
    aggregator.endGame(ended);
    const report = aggregator.buildReport({ ...META, games: 2 });

    // Counting only pops in settlements, seat 3's seven led the capped game.
    expect(report.perGame[0]).toMatchObject({ leaderAtCap: "0", decidedBy: null });
    expect(report.perGame[1]).toMatchObject({ winner: "0", decidedBy: "pops" });
    expect(report.perPolicy.civic.winsDecidedBy).toEqual({
      race: 0,
      titles: 0,
      happiness: 0,
      pops: 1,
      seat: 0,
    });
  });

  it("reports the luxuries' happiness at game end in a Blockade year", () => {
    const G = scenario().stackYearCard("year-blockade").opening().build();
    G.board.luxuries[0].owner = "0";
    const aggregator = new Aggregator();
    aggregator.beginGame(0, 42, G);
    aggregator.endGame(G);

    expect(G.activeYearCard?.id).toBe("year-blockade");
    expect(aggregator.buildReport(META).perGame[0].luxuries["0"]).toEqual({
      goodsHeld: 1,
      goodsActive: 1,
      luxuryHappiness: G.ruleset.economy.luxury.happinessPerGood,
    });
  });

  it("sets Beloved's holder against the luxury leader, both ways of counting a tie", () => {
    const G = opened();
    // Two goods each for seats 0 and 3. Seat 3 starts a level higher, so it alone
    // reaches Beloved's minimum: the holder is tied for the luxury lead.
    const claim = (index: number, seat: PlayerId) => (G.board.luxuries[index].owner = seat);
    [0, 1].forEach((index) => claim(index, "0"));
    [2, 3].forEach((index) => claim(index, "3"));
    const aggregator = new Aggregator();
    aggregator.beginGame(0, 42, G, { ...SEATS });
    // A third good makes it the sole leader for the second snapshot.
    claim(4, "3");
    aggregator.onTurnEnd(G);
    aggregator.endGame(G);
    const report = aggregator.buildReport(META);

    expect(aggregator.allSnapshots()[0]).toMatchObject({ belovedHolder: "3", actingSeat: "0" });
    const expected = {
      turnsHeld: 2,
      soleLuxuryLeader: 1,
      soleLuxuryLeaderShare: 0.5,
      luxuryLeaderOrTied: 2,
      luxuryLeaderOrTiedShare: 1,
    };
    expect(report.beloved.total).toEqual(expected);
    expect(report.beloved.perPolicy.master).toEqual(expected);
    expect(report.beloved.perPolicy.civic.turnsHeld).toBe(0);

    // The CSV carries the same facts, with one last-state row a seat after the turns.
    const lines = snapshotsToCsv(
      aggregator.allSnapshots(),
      report.perGame,
      aggregator.finalSnapshots(),
    ).split("\n");
    expect(lines).toHaveLength(1 + 3 * PLAYER_IDS.length);
    expect(lines[0].endsWith(",policy,actingSeat,winner,final,belovedHolder,activeLuxuries")).toBe(
      true,
    );
    expect(lines[1].endsWith(",civic,0,,0,3,2")).toBe(true);
    expect(lines[lines.length - 1].endsWith(",master,0,,1,3,3")).toBe(true);
  });

  it("splits influence and food bought by sink, by the stock's state and by personality", () => {
    const game = drive(
      scenario()
        .opening()
        .withResources("0", { food: -2, gold: 10, influence: 9 })
        .mutate((G) => {
          G.pendingPlayerEvent = null;
        })
        .build(),
    );
    // Two short: the bank and one Dole cover the shortfall, a second Dole buys ahead.
    game.take("0", { type: "bankBuy", material: "food" });
    game.take("0", { type: "dole" });
    game.take("0", { type: "dole" });
    const report = game.report();

    expect(report.foodPurchases.total).toEqual({
      turnsBegunShort: 1,
      coveringShortfall: { bankBuys: 1, doles: 1, food: 2, gold: 2, influence: 3 },
      buyingAhead: { bankBuys: 0, doles: 1, food: 1, gold: 0, influence: 3 },
    });
    expect(report.foodPurchases.perPolicy.civic).toEqual(report.foodPurchases.total);
    expect(report.foodPurchases.perPolicy.slaver.turnsBegunShort).toBe(0);
    expect(report.influenceSpent.total.dole).toEqual({ count: 6, perGame: 6 });
    expect(report.influenceSpent.perPolicy.civic.dole).toEqual({ count: 6, perSeatGame: 6 });
    expect(report.influenceSpent.perPolicy.slaver.dole.count).toBe(0);
    // The year row is the snapshot taken before any of it was spent.
    expect(report.perYear[0].influence.max).toBe(9);
    expect(report.perYear[0].influenceByPolicy.civic.median).toBe(9);
  });

  it("counts a revolt in its year, to the personality that had it", () => {
    const game = drive(
      scenario()
        .opening()
        .withHappiness("0", -6)
        .mutate((G) => {
          G.pendingPlayerEvent = null;
        })
        .build(),
    );
    game.take("0", { type: "endTurn" });
    const report = game.report();

    expect(game.G.players["0"].revolts).toBe(1);
    expect(report.riots.byYear).toEqual([{ year: 1, riots: 0, playerTurns: 2, revolts: 1 }]);
    expect(report.riots.perPolicy.civic).toEqual({
      riotsPerSeatGame: 0,
      revoltsPerSeatGame: 1,
      byYear: [{ year: 1, riots: 0, playerTurns: 1, revolts: 1 }],
    });
    expect(report.riots.perPolicy.slaver.byYear).toEqual([
      { year: 1, riots: 0, playerTurns: 1, revolts: 0 },
    ]);
  });

  it("counts hunger turns per personality, and the class that left", () => {
    const game = drive(
      scenario()
        .opening()
        .withResources("0", { food: -1, gold: 0, influence: 0 })
        .mutate((G) => {
          G.pendingPlayerEvent = null;
        })
        .build(),
    );
    game.take("0", { type: "endTurn" });
    game.take("0", { type: "resolveHunger", leave: defaultHungerLeave(game.G, "0", 1) });
    const report = game.report();

    expect(report.hungerPerPolicy.civic).toMatchObject({
      hungerTurnsPerSeatGame: 1,
      popsLostPerSeatGame: 1,
    });
    expect(report.hungerPerPolicy.slaver.hungerTurnsPerSeatGame).toBe(0);
    expect(report.reach.perPolicy.civic.counts["hunger:freemen"]).toBe(1);
    expect(report.reach.total["hunger:citizens"]).toBe(0);
  });

  it("measures a draw against the income the seat collected, and counts a pop card", () => {
    // Seat 0 opens on Captured Laborers; seat 1 then draws Profit.
    const game = drive(
      scenario()
        .stackPlayerEvent("player-profit")
        .stackPlayerEvent("player-captured-laborers")
        .opening()
        .build(),
    );
    const tileId = game.G.players["0"].settlements[0];
    game.take("0", { type: "resolveEvent", targetTileId: tileId });
    const before = game.G.players["1"].resources;
    game.take("0", { type: "endTurn" });
    const after = game.G.players["1"].resources;
    // What came in at seat 1's income. Its food upkeep is a loss, not income.
    const gains = (Object.keys(after) as Array<keyof typeof after>).reduce(
      (sum, resource) => sum + Math.max(0, after[resource] - before[resource]),
      0,
    );
    game.take("1", { type: "resolveEvent" });
    const report = game.report();

    expect(gains).toBeGreaterThan(0);
    expect(report.drawSwings.map((row) => row.card)).toEqual([
      "player-captured-laborers",
      "player-profit",
    ]);
    // The opening turn was not seen to collect, so its draw has no ratio.
    expect(report.drawSwings[0]).toMatchObject({ pops: 1, collected: null, collectedRatio: null });
    expect(report.drawSwings[1]).toMatchObject({
      materialMagnitude: 2,
      collectedMagnitude: gains,
      collectedRatio: 2 / gains,
    });
    expect(report.drawSwingSummary.total).toMatchObject({
      draws: 2,
      discarded: 0,
      resourceCards: 1,
      popCards: 1,
      popsMoved: 1,
      tokenCards: 0,
      unchanged: 0,
    });
    expect(report.drawSwingSummary.total.collectedRatio.median).toBe(2 / gains);
    expect(report.drawSwingSummary.perPolicy.civic).toMatchObject({
      popCards: 1,
      resourceCards: 0,
    });
    expect(report.drawSwingSummary.perPolicy.slaver).toMatchObject({
      popCards: 0,
      resourceCards: 1,
    });
  });

  it("counts repeals filed, passed and failed, per personality", () => {
    const G = scenario().opening().withResources("0", { influence: 3 }).build();
    G.pendingPlayerEvent = null;
    G.year = 6;
    G.yearOpener = "1";
    G.activeLaws = [{ cardId: "guild-charter", author: "1", enactedYear: 2, order: G.lawOrder++ }];
    G.politicianDecks.perdiccas = G.politicianDecks.perdiccas.filter(
      (id) => id !== "guild-charter",
    );
    openAssembly(G, "0");
    const game = drive(G);
    game.take("0", { type: "assemblyProposeRepeal", cardId: "guild-charter" });
    for (const id of ["1", "2", "3"] as const) game.take(id, { type: "assemblyPass" });
    // Only its mover votes for the repeal.
    while (game.G.assembly?.phase === "voting") {
      const voter = game.G.assembly.activePlayer;
      game.take(voter, { type: "assemblyVote", yea: voter === "0" });
    }
    const report = game.report();

    expect(report.assembly.repeals).toEqual({
      proposed: { count: 1, perGame: 1 },
      passed: { count: 0, perGame: 0 },
      failed: { count: 1, perGame: 1 },
    });
    expect(report.assembly.perPolicy.civic.count).toMatchObject({
      repealsProposed: 1,
      repealsPassed: 0,
      repealsFailed: 1,
    });
    expect(report.assembly.perPolicy.slaver.perSeatGame.repealsProposed).toBe(0);
    expect(report.influenceSpent.total.repeals).toEqual({ count: 3, perGame: 3 });
  });
});
