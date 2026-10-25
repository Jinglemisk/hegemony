import { defaultHungerLeave, resolveHunger } from "../game/hunger";
import { describe, expect, it } from "vitest";

import { ACTIVE_EFFECT_KINDS } from "../game/activeEffects";
import { openAssembly } from "../game/assembly";
import { TEST_OPENING_SETUP } from "../game/config";
import { createModeDefinition } from "../game/definition";
import { PLAYER_IDS } from "../game/data";
import { transition, type GameCommand } from "../game/legalMoves";
import { resolveRiot } from "../game/riot";
import { beginTurnFor, endTurn } from "../game/turn";
import { yearDeckSize } from "../game/year";
import { BEFORE_TRADE, owned, scenario } from "../game/testing/scenario";
import type { HegemonyState, PlayerId, TradeBundle } from "../game/types";
import { renderBatchReport } from "./format";
import { randomPolicy } from "./policies";
import { runGame } from "./runner";
import { Aggregator, percentiles, snapshotTurn, snapshotsToCsv } from "./telemetry";
import type { BatchData, BatchReport } from "./telemetry";

const TEST_DEFINITION = createModeDefinition("standard").identity;

const META: BatchReport["meta"] = {
  games: 1,
  turns: 56,
  policy: "mixed",
  mode: "standard",
  boardLayout: "scenario",
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
    boardLayout: "scenario",
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
        state.year = yearDeckSize(state);
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
      boardLayout: "scenario",
      opening: "policy",
      baseSeed: 42,
      botSeedRule: "test",
      rulesetPatch: null,
      definition: TEST_DEFINITION,
      generatedAt: "test",
    });
    expect(aggregator.allSnapshots()).toHaveLength(1);
    expect(report.hunger.perSeat["0"].hungerTurns.perGame).toBe(1);
    expect(Object.values(report.events.player).reduce((sum, count) => sum + count, 0)).toBe(1);
    expect(report.riots.total.byYear).toEqual([
      { year: yearDeckSize(G), riots: 1, playerTurns: 1, revolts: 0 },
    ]);
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
      boardLayout: "scenario",
      opening: "fixed",
      baseSeed: 42,
      botSeedRule: "test",
      rulesetPatch: null,
      definition: G.definition.identity,
      generatedAt: "test",
    });
    expect(report.riots.total.byYear).toEqual([
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
    const seats = Object.values(report.results.perSeat);
    const totalWinRate = seats.reduce((sum, seat) => sum + seat.winRate, 0);
    expect(totalWinRate).toBe(0);
    const totalCapLeaderRate = seats.reduce((sum, seat) => sum + seat.capLeaderRate, 0);
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

    expect(report.assembly.seats.total.authoredPasses.count).toBeGreaterThanOrEqual(0);
    expect(report.assembly.seats.total.voiceClaims.count).toBeGreaterThanOrEqual(0);
    expect(report.assembly.voiceTransfers.count).toBeGreaterThanOrEqual(0);
    expect(report.assembly.voiceHoldersAtEnd.perGame).toBeGreaterThanOrEqual(0);
    expect(report.assembly.voiceHoldersAtEnd.perGame).toBeLessThanOrEqual(1);
    expect(report.assembly.authoredPassLeaderShare.mean).toBeGreaterThanOrEqual(0);
    expect(report.assembly.authoredPassLeaderShare.mean).toBeLessThanOrEqual(1);
    expect(Object.keys(report.assembly.seats.perSeat)).toEqual(PLAYER_IDS);
    expect(report.assembly.prizesGranted).toEqual(
      expect.objectContaining({
        wood: expect.any(Number),
        stone: expect.any(Number),
        food: expect.any(Number),
        gold: expect.any(Number),
      }),
    );
    // No seat offered, so the printed report has no trade section.
    expect(renderBatchReport(report, 14)).not.toContain("Trade");
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
      boardLayout: "scenario",
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
    expect(report.results.perPolicy.random.winsDecidedBy).toMatchObject({ race: 1, titles: 0 });
    expect(report.perGame[0].leaderAtCap).toBeNull();
    expect(aggregator.allSnapshots()).toHaveLength(1);
    expect(Object.values(report.events.year).reduce((sum, count) => sum + count, 0)).toBe(2);
    expect(report.perGame[0].yearCards).toEqual([played.activeYearCard!.id, G.activeYearCard.id]);
    expect(report.perGame[0].voiceHolder).toBe("0");
    expect(PLAYER_IDS.map((id) => report.perGame[0].seats[id].authoredPasses)).toEqual([
      4, 2, 1, 0,
    ]);
    expect(report.terminations).toEqual({ victoryRace: 1, deckExhausted: 0, turnCap: 0 });
    expect(report.results.perSeat["0"].winRate).toBe(1);
    expect(report.results.perSeat["1"].winRate).toBe(0);
    expect(report.results.perSeat["0"].capLeaderRate).toBe(0);
    expect(report.assembly.voiceHoldersAtEnd).toEqual({ count: 1, perGame: 1 });
    expect(report.assembly.voiceHolderWins).toEqual({ count: 1, finishedGames: 1, rate: 1 });
    expect(report.assembly.authoredPassLeadMargin.mean).toBe(2);
    expect(report.assembly.authoredPassLeaderShare.mean).toBeCloseTo(4 / 7);
  });

  it("credits a finished game's win to the winning seat's policy", () => {
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
      boardLayout: "scenario",
      seatPolicies: { ...seatPolicies },
      baseSeed: seed,
      opening: "policy",
      botSeedRule: "seed ^ 0x9e3779b9",
      rulesetPatch: null,
      definition: TEST_DEFINITION,
      generatedAt: "test",
    });

    // greedy held one seat and won it; smart held three seats and won none.
    expect(report.results.perPolicy.greedy).toMatchObject({
      finishedSeatGames: 1,
      wins: 1,
      winRate: 1,
    });
    expect(report.results.perPolicy.smart).toMatchObject({
      finishedSeatGames: 3,
      wins: 0,
      winRate: 0,
    });
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
      boardLayout: "scenario",
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

  it("builds the same report and CSV from games gathered apart, in whatever order they come", () => {
    // Three full games. The seat names shift each game, as a rotated batch shifts them.
    const names = Object.values(SEATS);
    const observe = (aggregator: Aggregator, game: number) => {
      const seed = 700 + game;
      const seats = Object.fromEntries(
        PLAYER_IDS.map((id, seat) => [id, names[(seat + game) % names.length]]),
      ) as Record<PlayerId, string>;
      const G = runGame({
        seed,
        mode: "standard",
        policy: randomPolicy,
        turns: 56,
        hooks: {
          onGameStart: (state) => aggregator.beginGame(game, seed, state, seats),
          onMove: (state, player, move) => aggregator.onMove(state, player, move),
          onTurnEnd: (state) => aggregator.onTurnEnd(state),
          onForceEndTurn: (state, resolutions) => aggregator.onForceEndTurn(state, resolutions),
        },
      });
      aggregator.endGame(G);
    };
    const csv = (aggregator: Aggregator, report: BatchReport) =>
      snapshotsToCsv(aggregator.allSnapshots(), report.perGame, aggregator.finalSnapshots());

    const together = new Aggregator();
    const apart: BatchData[] = [];
    for (const game of [0, 1, 2]) {
      observe(together, game);
      // One Aggregator a game, as a worker process plays it. The clone stands for the
      // trip back to the parent, and the last game comes back first.
      const own = new Aggregator();
      observe(own, game);
      apart.unshift(structuredClone(own.data));
    }
    const merged = new Aggregator();
    merged.absorb(apart);

    const meta = { ...META, games: 3 };
    const report = together.buildReport(meta);
    const mergedReport = merged.buildReport(meta);

    expect(report.perGame.map((row) => row.game)).toEqual([0, 1, 2]);
    expect(mergedReport).toEqual(report);
    // toEqual does not look at key order; the written file does.
    expect(JSON.stringify(mergedReport)).toBe(JSON.stringify(report));
    expect(csv(merged, mergedReport)).toBe(csv(together, report));
    // Three whole games; with trade a game takes about twice as long, past the 5s default.
  }, 60_000);
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
    expect(report.results.perPolicy.civic.winsDecidedBy).toEqual({
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
    expect(aggregator.buildReport(META).perGame[0].seats["0"].luxuries).toEqual({
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
      // The economy before trade, where the bank sold food.
      scenario({ patch: BEFORE_TRADE })
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
    expect(report.influenceSpent.perPolicy.civic.dole).toEqual({ count: 6, perGame: 6 });
    expect(report.influenceSpent.perPolicy.slaver.dole.count).toBe(0);
    // The year row is the snapshot taken before any of it was spent.
    expect(report.perYear[0].influence.total.max).toBe(9);
    expect(report.perYear[0].influence.perPolicy.civic.median).toBe(9);
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
    expect(report.riots.total.byYear).toEqual([{ year: 1, riots: 0, playerTurns: 2, revolts: 1 }]);
    expect(report.riots.perPolicy.civic).toEqual({
      riots: { count: 0, perGame: 0 },
      revolts: { count: 1, perGame: 1 },
      turnShare: 0,
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

    expect(report.hunger.perPolicy.civic).toMatchObject({
      hungerTurns: { count: 1, perGame: 1 },
      popsLost: { count: 1, perGame: 1 },
    });
    expect(report.hunger.perPolicy.slaver.hungerTurns.perGame).toBe(0);
    expect(report.reach.perPolicy.civic.counts["hunger:freemen"]).toBe(1);
    expect(report.reach.total.counts["hunger:citizens"]).toBe(0);
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
    for (const id of ["0", "1", "2", "3"] as const) game.take(id, { type: "assemblyReady" });
    // Only its mover votes for the repeal.
    while (game.G.assembly?.phase === "voting") {
      const voter = game.G.assembly.activePlayer;
      game.take(voter, { type: "assemblyVote", yea: voter === "0" });
    }
    const report = game.report();

    expect(report.assembly.seats.total).toMatchObject({
      repealsProposed: { count: 1, perGame: 1 },
      repealsPassed: { count: 0, perGame: 0 },
      repealsFailed: { count: 1, perGame: 1 },
    });
    expect(report.assembly.seats.perPolicy.civic).toMatchObject({
      repealsProposed: { count: 1 },
      repealsPassed: { count: 0 },
      repealsFailed: { count: 1 },
    });
    expect(report.assembly.seats.perPolicy.slaver.repealsProposed.perGame).toBe(0);
    expect(report.influenceSpent.total.repeals).toEqual({ count: 3, perGame: 3 });
  });
});

describe("trade telemetry", () => {
  const side = (resources: TradeBundle["resources"], goods: string[] = []): TradeBundle => ({
    resources,
    goods,
    pops: { citizens: 0, freemen: 0, slaves: 0 },
  });
  function offer(
    game: ReturnType<typeof drive>,
    seat: PlayerId,
    give: TradeBundle,
    get: TradeBundle,
    to: PlayerId[] = [],
  ) {
    game.take(seat, { type: "tradeOffer", to, terms: { give, get }, places: {} });
    return game.G.offers.at(-1)!.id;
  }
  const accept = (offerId: string): GameCommand => ({
    type: "tradeAnswer",
    offerId,
    answer: { kind: "accept", places: {} },
  });

  it("counts how each offer ended, the answers, the units, the prices and who exported", () => {
    // In the scripted opening only seat 2's land cuts wood, and seats 0 and 3 quarry stone.
    const game = drive(
      scenario()
        .opening()
        .withResources("2", { wood: 4 })
        .mutate((G) => {
          G.pendingPlayerEvent = null;
        })
        .build(),
    );
    const sold = offer(game, "0", side({ wood: 2 }), side({ gold: 1 }));
    game.take("1", accept(sold));
    // Seat 2 wants two wood for the stone, not one; seat 0 takes the counter.
    const countered = offer(game, "0", side({ stone: 1 }), side({ wood: 1 }), ["2", "3"]);
    game.take("2", {
      type: "tradeAnswer",
      offerId: countered,
      answer: {
        kind: "counter",
        terms: { give: side({ stone: 1 }), get: side({ wood: 2 }) },
        places: {},
      },
    });
    game.take("3", { type: "tradeAnswer", offerId: countered, answer: { kind: "decline" } });
    game.take("0", { type: "tradeSettle", offerId: countered, partner: "2", places: {} });
    const withdrawn = offer(game, "0", side({ food: 1 }), side({ influence: 1 }), ["3"]);
    game.take("0", { type: "tradeWithdraw", offerId: withdrawn });
    offer(game, "0", side({ food: 1 }), side({ gold: 1 }));
    game.take("0", { type: "endTurn" });
    const { trade } = game.report();

    expect(trade.total.offers).toEqual({
      settled: { count: 2, perGame: 2 },
      withdrawn: { count: 1, perGame: 1 },
      closed: { count: 1, perGame: 1 },
    });
    expect(trade.perPolicy.civic.offers.settled.count).toBe(2);
    expect(trade.perPolicy.slaver.offers.settled.count).toBe(0);
    expect(trade.total.settledInSitting.count).toBe(0);
    expect(trade.total.titleChanges.count).toBe(0);
    expect(trade.perSeat["1"].answers.accept.count).toBe(1);
    expect(trade.perSeat["2"].answers.counter.count).toBe(1);
    expect(trade.perSeat["3"].answers.decline.count).toBe(1);
    expect(trade.perSeat["0"].given).toMatchObject({ wood: { count: 2 }, stone: { count: 1 } });
    expect(trade.perSeat["0"].received).toMatchObject({ gold: { count: 1 }, wood: { count: 2 } });
    expect(trade.total.given).toMatchObject({
      wood: { count: 4 },
      stone: { count: 1 },
      gold: { count: 1 },
    });

    // Each price is set by the seat that sold the material.
    const once = (price: number) => ({ trades: 1, price: percentiles([price]) });
    expect(trade.total.prices).toEqual({
      wood: { gold: once(0.5), stone: once(0.5) },
      stone: { wood: once(2) },
    });
    expect(trade.perPolicy.trader.prices).toEqual({ wood: { stone: once(0.5) } });

    // Seat 2 alone cuts wood and sold two; seat 0, the first that cuts none, sold two
    // and bought two. Seat 0 out-quarries seat 1 and sold its stone.
    expect(trade.total.exports.wood).toEqual({
      most: { games: 1, netSent: 2 },
      least: { games: 1, netSent: 0 },
    });
    expect(trade.total.exports.stone).toEqual({
      most: { games: 1, netSent: 1 },
      least: { games: 1, netSent: 0 },
    });
    expect(trade.perPolicy.trader.exports.wood.most).toEqual({ games: 1, netSent: 2 });
    expect(trade.perPolicy.civic.exports.wood.most.games).toBe(0);
  });

  it("counts a trade in the Assembly's sitting that moves a title, and offers closed with it", () => {
    const G = scenario()
      .opening()
      .withResources("1", { gold: 5 })
      .mutate((draft) => {
        draft.pendingPlayerEvent = null;
        draft.year = 2;
      })
      .build();
    // Three goods make seat 0 Beloved.
    const goods = G.board.luxuries.slice(0, 3);
    for (const good of goods) {
      good.owner = "0";
      good.claimedAtSettlementId = owned(G, TEST_OPENING_SETUP[0].capital.tileId, "0").id;
    }
    openAssembly(G, "0");
    const game = drive(G);
    const sold = offer(
      game,
      "0",
      side(
        {},
        goods.map((good) => good.id),
      ),
      side({ gold: 5 }),
      ["1"],
    );
    game.take("1", accept(sold));
    offer(game, "2", side({ wood: 1 }), side({ stone: 1 }));
    for (const seat of PLAYER_IDS) game.take(seat, { type: "assemblyPass" });
    for (const seat of PLAYER_IDS) game.take(seat, { type: "assemblyReady" });
    const report = game.report();
    const { trade } = report;

    expect(game.G.assembly?.phase).not.toBe("proposal");
    expect(trade.total.offers).toMatchObject({
      settled: { count: 1 },
      withdrawn: { count: 0 },
      closed: { count: 1 },
    });
    expect(trade.perSeat["0"].settledInSitting.count).toBe(1);
    expect(trade.perSeat["0"].titleChanges.count).toBe(1);
    expect(trade.perSeat["2"].offers.closed.count).toBe(1);
    expect(trade.perSeat["0"].given.goods.count).toBe(3);
    expect(trade.perSeat["1"].received.goods.count).toBe(3);
    expect(trade.perSeat["1"].given.gold.count).toBe(5);
    // Goods are not a stock, so the trade sets no price.
    expect(trade.total.prices).toEqual({});
    expect(renderBatchReport(report, 14)).toContain("Trade (per game): 1 settled (1 in a sitting)");
  });
});
