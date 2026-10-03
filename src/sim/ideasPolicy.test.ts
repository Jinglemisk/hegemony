import { describe, expect, it } from "vitest";
import { scenario } from "../game/testing/scenario";
import { enumerateLegalCommands } from "../game/legalMoves";
import { projectForPlayer } from "../game/projection";
import { chooseIdea, masterPolicy } from "./policies";
import { createSimRng } from "./rng";
import { Aggregator } from "./telemetry";

function board(food: number, slaves: number, freemen: number) {
  const G = scenario()
    .withSettlement("0", "-2,0", "city", { citizens: 1, slaves, freemen })
    .withResources("0", { food, gold: 0, influence: 6 })
    .build();
  G.phase = "setupIdeas";
  return G;
}

describe("scores setup Ideas and in-play purchases", () => {
  it("charges future colony slaves their standing-level cost", () => {
    const G = scenario()
      .withSettlement("0", "-2,0", "city", { citizens: 1, slaves: 3, freemen: 0 })
      .withSettlement("0", "-1,0", "colony", { citizens: 0, slaves: 4, freemen: 0 })
      .withResources("0", { food: 50, influence: 6 })
      .build();
    G.phase = "setupIdeas";
    const choices = [
      { type: "pickIdea" as const, ideaId: "slave-colonies" as const },
      { type: "pickIdea" as const, ideaId: "civic-tradition" as const },
    ];
    // The full colony receives no immediate grant. Six future slaves were worth
    // 36 gross points, but lose three levels (18 points); Civic is worth 24.
    expect(chooseIdea(G, choices, createSimRng(1))).toEqual(choices[1]);
  });
  it("still picks colony slaves when their immediate food prevents starvation", () => {
    const G = scenario()
      .withSettlement("0", "0,-3", "colony", { citizens: 0, slaves: 0, freemen: 2 })
      .withResources("0", { food: 0, influence: 6 })
      .build();
    G.phase = "setupIdeas";
    const choices = [
      { type: "pickIdea" as const, ideaId: "slave-colonies" as const },
      { type: "pickIdea" as const, ideaId: "civic-tradition" as const },
    ];
    expect(chooseIdea(G, choices, createSimRng(1))).toEqual(choices[0]);
  });
  it("picks food for an unfed civic realm and influence for one that already feeds itself", () => {
    const starving = board(0, 0, 2);
    const fed = board(30, 3, 0);
    const choices = [
      { type: "pickIdea" as const, ideaId: "good-harvest" as const },
      { type: "pickIdea" as const, ideaId: "civic-tradition" as const },
    ];
    expect(
      chooseIdea(
        projectForPlayer(starving.definition, starving, "0").state,
        choices,
        createSimRng(1),
      ).type,
    ).toBe("pickIdea");
    expect(chooseIdea(starving, choices, createSimRng(1))).toEqual(choices[0]);
    expect(chooseIdea(fed, choices, createSimRng(1))).toEqual(choices[1]);
  });
  it("buys a Treasury Grant to cross the gold title, and saves influence when it cannot help", () => {
    const G = board(30, 0, 0);
    G.phase = "gameplay";
    G.year = 14;
    G.players["0"].nationalIdeas = [{ id: "urban-planning", acquired: "setup", year: 1 }];
    G.players["0"].resources.gold = G.ruleset.victory.minimums.gold - 4;
    const moves = enumerateLegalCommands(G, "0").filter(
      (c) => c.type === "endTurn" || (c.type === "buyIdea" && c.ideaId === "treasury-grant"),
    );
    expect(
      masterPolicy.choose(projectForPlayer(G.definition, G, "0"), moves, createSimRng(1)),
    ).toEqual({ type: "buyIdea", ideaId: "treasury-grant" });
    const poor = structuredClone(G);
    Object.assign(poor.players["0"].resources, { gold: 0, wood: 0, stone: 0, food: 0 });
    expect(
      masterPolicy.choose(projectForPlayer(poor.definition, poor, "0"), moves, createSimRng(1)),
    ).toEqual({ type: "endTurn" });
  });
  it("does not consult the hidden year order or the other seats' setup picks", () => {
    const G = board(30, 3, 0);
    const altered = structuredClone(G);
    altered.yearDrawPile.reverse();
    altered.rng = 99;
    altered.setupIdeaPicks["2"] = { ideaId: "treasury-grant" };
    const choices = enumerateLegalCommands(G, "0");
    const view = projectForPlayer(G.definition, G, "0");
    const other = projectForPlayer(altered.definition, altered, "0");
    expect(masterPolicy.choose(view, choices, createSimRng(2))).toEqual(
      masterPolicy.choose(other, choices, createSimRng(2)),
    );
  });
  it("zero-fills every Idea and counts holder wins only in finished games", () => {
    const G = board(30, 1, 0);
    G.phase = "gameOver";
    G.gameOverReason = "deckExhausted";
    G.winner = "0";
    G.players["0"].nationalIdeas = [
      { id: "good-harvest", acquired: "setup", year: 1 },
      { id: "treasury-grant", acquired: "purchase", year: 1 },
    ];
    G.players["1"].nationalIdeas = [{ id: "good-harvest", acquired: "setup", year: 1 }];
    const agg = new Aggregator();
    agg.beginGame(0, 1, G);
    agg.endGame(G);
    const report = agg.buildReport({
      games: 1,
      turns: 56,
      policy: "master",
      mode: "standard",
      boardLayout: "classic",
      opening: "policy",
      baseSeed: 1,
      botSeedRule: "test",
      rulesetPatch: null,
      definition: G.definition.identity,
      generatedAt: "test",
    });
    expect(Object.keys(report.nationalIdeas)).toHaveLength(12);
    expect(report.nationalIdeas["good-harvest"]).toEqual({
      setupPicks: 2,
      purchases: 0,
      holders: 2,
      wins: 1,
      winRate: 0.5,
    });
    expect(report.nationalIdeas["treasury-grant"]).toEqual({
      setupPicks: 0,
      purchases: 1,
      holders: 1,
      wins: 1,
      winRate: 1,
    });
    expect(report.nationalIdeas["capital-works"].winRate).toBe(0);
  });
});
