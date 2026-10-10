import { describe, expect, it } from "vitest";
import { scenario } from "../game/testing/scenario";
import { enumerateLegalCommands } from "../game/legalMoves";
import { projectForPlayer } from "../game/projection";
import type { NationalIdeaId } from "../game/ideaTypes";
import { chooseIdea, evaluatePlacement, masterPolicy, PERSONALITY_WEIGHTS } from "./policies";
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
  it("triples that cost under Manumission", () => {
    // Four goods put the level two above the cap, so six future slaves cost one
    // counted point: 36 − 6 beats Civic's 24. Tripled they cost seven, and lose.
    const build = () => {
      const G = scenario()
        .withSettlement("0", "-2,0", "city", { citizens: 1, slaves: 0, freemen: 0 })
        .withSettlement("0", "-1,0", "colony", { citizens: 0, slaves: 0, freemen: 4 })
        .withResources("0", { food: 80, influence: 6 })
        .build();
      G.phase = "setupIdeas";
      for (const good of G.board.luxuries.slice(0, 4)) good.owner = "0";
      return G;
    };
    const choices = [
      { type: "pickIdea" as const, ideaId: "slave-colonies" as const },
      { type: "pickIdea" as const, ideaId: "civic-tradition" as const },
    ];
    expect(chooseIdea(build(), choices, createSimRng(1))).toEqual(choices[0]);
    const manumission = build();
    manumission.activeLaws.push({ cardId: "manumission", author: "1", enactedYear: 1, order: 0 });
    expect(chooseIdea(manumission, choices, createSimRng(1))).toEqual(choices[1]);
  });
  it("prices Frontier Charter against the colony limit Master Builders leaves", () => {
    // Two colonies stand. Master Builders cuts the limit to three, so the extra piece
    // is already one colony from mattering: 30 beats Civic's 24.
    const build = () => {
      const G = scenario()
        .withSettlement("0", "-2,0", "city", { citizens: 1, slaves: 0, freemen: 0 })
        .withSettlement("0", "-1,0", "colony", { citizens: 0, slaves: 1, freemen: 0 })
        .withSettlement("0", "-2,1", "colony", { citizens: 0, slaves: 1, freemen: 0 })
        .withResources("0", { food: 80, influence: 6 })
        .build();
      G.phase = "setupIdeas";
      return G;
    };
    const choices = [
      { type: "pickIdea" as const, ideaId: "frontier-charter" as const },
      { type: "pickIdea" as const, ideaId: "civic-tradition" as const },
    ];
    expect(chooseIdea(build(), choices, createSimRng(1))).toEqual(choices[1]);
    const cut = build();
    cut.activeLaws.push({ cardId: "master-builders", author: "1", enactedYear: 1, order: 0 });
    expect(chooseIdea(cut, choices, createSimRng(1))).toEqual(choices[0]);
  });
  it("credits City Pioneers only for a colony the engine would let upgrade", () => {
    // The trader's 24 for one upgrade beats Civic Tradition's 18. A colony beside
    // the capital can never be upgraded, so there the Idea is worth nothing.
    const pick = (colonyTile: string) => {
      const G = scenario()
        .withSettlement("0", "-2,0", "capital", { citizens: 1, slaves: 0, freemen: 0 })
        .withSettlement("0", colonyTile, "colony", { citizens: 0, slaves: 2, freemen: 0 })
        .withResources("0", { food: 80, influence: 6 })
        .build();
      G.phase = "setupIdeas";
      const choices = [
        { type: "pickIdea" as const, ideaId: "city-pioneers" as const },
        { type: "pickIdea" as const, ideaId: "civic-tradition" as const },
      ];
      return chooseIdea(G, choices, createSimRng(1), PERSONALITY_WEIGHTS.trader);
    };
    expect(pick("0,-3")).toMatchObject({ ideaId: "city-pioneers" });
    expect(pick("-2,1")).toMatchObject({ ideaId: "civic-tradition" });
  });
  it("does not pay a Public Dole holder for a food deficit", () => {
    // Three mouths and no food grown, with food banked past the horizon. Good
    // Harvest's two food a year must be worth as much to the Dole's holder as to
    // a seat without it.
    const score = (held: NationalIdeaId[]) => {
      const G = scenario()
        .withSettlement("0", "-2,0", "city", { citizens: 1, slaves: 0, freemen: 2 })
        .withResources("0", { food: 80, influence: 6 })
        .build();
      G.phase = "gameplay";
      G.players["0"].collectedThisTurn = true;
      G.activeYearCard = null;
      G.players["0"].nationalIdeas = held.map((id) => ({ id, acquired: "setup", year: 1 }));
      return evaluatePlacement(G, "0");
    };
    const toHolder = score(["public-dole", "good-harvest"]) - score(["public-dole"]);
    const toOther = score(["good-harvest"]) - score([]);
    expect(toOther).toBeGreaterThan(0);
    expect(toHolder).toBeCloseTo(toOther);
    // The Idea still has a value of its own: two Doles a year, one influence saved each.
    expect(score(["public-dole"]) - score([])).toBe(24);
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
    // After the final collection no income or food rescue remains. Before that
    // collection the Grant can now fund bank food and save this citizen.
    poor.players["0"].collectedThisTurn = true;
    Object.assign(poor.players["0"].resources, { gold: 0, wood: 0, stone: 0, food: 0 });
    expect(
      masterPolicy.choose(projectForPlayer(poor.definition, poor, "0"), moves, createSimRng(1)),
    ).toEqual({ type: "endTurn" });
  });
  it("does not consult the hidden year order and scores only the Ideas left", () => {
    const G = board(30, 3, 0);
    const altered = structuredClone(G);
    altered.yearDrawPile.reverse();
    altered.rng = 99;
    const choices = enumerateLegalCommands(G, "0");
    const view = projectForPlayer(G.definition, G, "0");
    const other = projectForPlayer(altered.definition, altered, "0");
    const pick = masterPolicy.choose(view, choices, createSimRng(2));
    expect(pick).toEqual(masterPolicy.choose(other, choices, createSimRng(2)));
    if (pick.type !== "pickIdea") throw new Error("expected an Idea pick");
    // A rival took the favourite earlier in the draft: the bot picks among the rest.
    const taken = structuredClone(G);
    taken.players["1"].nationalIdeas = [{ id: pick.ideaId, acquired: "setup", year: 1 }];
    const left = enumerateLegalCommands(taken, "0");
    const second = masterPolicy.choose(
      projectForPlayer(taken.definition, taken, "0"),
      left,
      createSimRng(2),
    );
    expect(second.type).toBe("pickIdea");
    expect(second.type === "pickIdea" && second.ideaId).not.toBe(pick.ideaId);
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
