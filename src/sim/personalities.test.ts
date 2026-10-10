import { describe, expect, it } from "vitest";
import { happinessLevel } from "../game/happiness";
import { enumerateLegalCommands, transition, type GameCommand } from "../game/legalMoves";
import { projectForPlayer } from "../game/projection";
import { owned, scenario } from "../game/testing/scenario";
import type { HegemonyState } from "../game/types";
import { ventureOutcomes } from "./chance";
import { POLICIES, type PersonalityId } from "./policies";
import { createSimRng } from "./rng";
import { playTurn, runGame } from "./runner";
import { buildNewGame } from "./setup";
import { Aggregator } from "./telemetry";

const names: PersonalityId[] = ["slaver", "civic", "trader"];
function realm(pops = { citizens: 1, freemen: 2, slaves: 2 }) {
  const G = scenario()
    .withSettlement("0", "-2,0", "city", pops)
    .withResources("0", { food: 50, wood: 12, stone: 12, gold: 12, influence: 12 })
    .build();
  G.phase = "gameplay";
  G.players["0"].collectedThisTurn = true;
  G.activeYearCard = null;
  return G;
}
function choose(name: PersonalityId, G: HegemonyState, keep: (move: GameCommand) => boolean) {
  const moves = enumerateLegalCommands(G, "0").filter(keep);
  return POLICIES[name].choose(projectForPlayer(G.definition, G, "0"), moves, createSimRng(1));
}

describe("shared personality search", () => {
  it("prefers slave growth, citizen promotion and freeman growth on the same fed board", () => {
    const G = realm();
    owned(G, "-2,0", "0").buildings.push("temple");
    Object.assign(G.players["0"].resources, { wood: 0, stone: 0, influence: 0, gold: 2 });
    const keep = (m: GameCommand) =>
      m.type === "endTurn" || m.type === "growPop" || m.type === "promotePop";
    expect(choose("slaver", G, keep)).toMatchObject({ type: "growPop", pop: "slaves" });
    const civicFirst = choose("civic", G, keep);
    const civicNext = transition(G.definition, G, "0", civicFirst);
    expect(civicNext.ok).toBe(true);
    if (!civicNext.ok) return;
    const civicSecond = choose("civic", civicNext.state, keep);
    expect([civicFirst, civicSecond]).toContainEqual({
      type: "promotePop",
      tileId: "-2,0",
      from: "freemen",
    });
    expect(choose("trader", G, keep)).toMatchObject({ type: "growPop", pop: "freemen" });
  });

  it.each([
    ["slaver", "estate", { citizens: 0, freemen: 0, slaves: 4 }],
    ["civic", "forum", { citizens: 3, freemen: 1, slaves: 1 }],
    ["trader", "marketplace", { citizens: 1, freemen: 3, slaves: 1 }],
  ] as const)("%s builds its class building for the real income", (name, buildingId, pops) => {
    const G = realm({ ...pops });
    const move = choose(
      name,
      G,
      (m) => m.type === "endTurn" || (m.type === "buildBuilding" && m.buildingId === buildingId),
    );
    expect(move).toMatchObject({ type: "buildBuilding", buildingId });
    expect(transition(G.definition, G, "0", move).ok).toBe(true);
  });

  it("the trader keeps its only citizen from the standard opening", () => {
    // It weights a freeman above a citizen, so on points alone it would pay the one
    // influence to demote the citizen setup gave it, and lose its vote and influence.
    const G = scenario().opening().build();
    G.pendingPlayerEvent = null;
    G.players["0"].resources.influence = 3;
    const keep = (m: GameCommand) =>
      m.type === "endTurn" || (m.type === "demotePop" && m.from === "citizens");
    expect(enumerateLegalCommands(G, "0").filter(keep)).toHaveLength(2);
    expect(choose("trader", G, keep)).toEqual({ type: "endTurn" });

    // Short one food, it lets a freeman go before the citizen.
    const hungry = structuredClone(G);
    hungry.players["0"].resources.food = -1;
    const short = transition(hungry.definition, hungry, "0", { type: "endTurn" });
    if (!short.ok) throw new Error(short.reasons.join("; "));
    expect(choose("trader", short.state, () => true)).toMatchObject({
      type: "resolveHunger",
      leave: [{ pop: "freemen" }],
    });
  });

  it.each(names)("%s covers a coming shortfall with the bank or the Dole", (name) => {
    for (const payment of ["gold", "influence"] as const) {
      let G = realm({ citizens: 1, freemen: 1, slaves: 0 });
      Object.assign(G.players["0"].resources, { food: 0, gold: 0, influence: 0, [payment]: 30 });
      const keep = (m: GameCommand) =>
        m.type === "endTurn" ||
        (m.type === "bankBuy" && m.material === "food") ||
        m.type === "dole";
      let buys = 0;
      for (; buys < 20; buys++) {
        const move = choose(name, G, keep);
        if (move.type === "endTurn") break;
        expect(move.type).toBe(payment === "gold" ? "bankBuy" : "dole");
        const result = transition(G.definition, G, "0", move);
        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error(result.reasons.join("; "));
        G = result.state;
      }
      expect(G.players["0"].resources.food).toBeGreaterThanOrEqual(4);
      expect(buys).toBeLessThan(20);
    }
  });

  it.each([...names, "master"] as const)(
    "%s buys the food it is short of now and holds none ahead",
    (name) => {
      for (const payment of ["gold", "influence"] as const) {
        // A full city of eight mouths, eight food short after income. The same
        // shortfall comes every year, and nothing is bought against it.
        let G = realm({ citizens: 1, freemen: 7, slaves: 0 });
        G.year = 5;
        Object.assign(G.players["0"].resources, {
          food: -8,
          wood: 0,
          stone: 0,
          gold: 0,
          influence: 0,
          [payment]: 100,
        });
        let fed = 0;
        for (let action = 0; action < 30; action++) {
          const move = POLICIES[name].choose(
            projectForPlayer(G.definition, G, "0"),
            enumerateLegalCommands(G, "0"),
            createSimRng(1),
          );
          if (move.type === "endTurn") break;
          if (move.type === "dole" || (move.type === "bankBuy" && move.material === "food")) fed++;
          const result = transition(G.definition, G, "0", move);
          if (!result.ok) throw new Error(result.reasons.join("; "));
          G = result.state;
        }
        expect(fed).toBe(8);
        expect(G.players["0"].resources.food).toBeGreaterThanOrEqual(0);
      }
    },
    30000,
  );

  it("sequences selling wood into a Port for the trader", () => {
    // Four slaves hold the level at −2, so the Port's +2 is worth its price.
    const G = realm({ citizens: 0, freemen: 0, slaves: 4 });
    const asset = G.board.luxuries.find((good) => good.owner === null)!;
    const tile = G.board.tiles.find((tile) => tile.id === asset.tileIds[0])!;
    const home = owned(G, "-2,0", "0");
    G.board.tiles.find((t) => t.id === "-2,0")!.settlements = [];
    home.tileId = tile.id;
    tile.settlements.push(home);
    G.players["0"].settlements = [tile.id];
    Object.assign(G.players["0"].resources, { food: 0, wood: 3, gold: 3, stone: 2, influence: 0 });
    const move = choose("trader", G, (m) => m.type === "endTurn" || m.type === "bankSell");
    expect(move).toEqual({ type: "bankSell", material: "wood" });
    const sale = transition(G.definition, G, "0", move);
    expect(sale.ok).toBe(true);
    if (!sale.ok) return;
    expect(
      choose(
        "trader",
        sale.state,
        (m) => m.type === "endTurn" || (m.type === "buildBuilding" && m.buildingId === "port"),
      ),
    ).toMatchObject({ type: "buildBuilding", buildingId: "port" });
  });

  it("searches past a sole costly Forum to find its promotion payoff", () => {
    const G = realm({ citizens: 0, freemen: 1, slaves: 2 });
    owned(G, "-2,0", "0").buildings.push("temple");
    Object.assign(G.players["0"].resources, { wood: 0, stone: 3, gold: 2, influence: 0 });
    expect(
      choose(
        "civic",
        G,
        (m) => m.type === "endTurn" || (m.type === "buildBuilding" && m.buildingId === "forum"),
      ),
    ).toMatchObject({ type: "buildBuilding", buildingId: "forum" });
  });

  it("scores a venture to reach Treasurer but refuses its negative gold expectation away from the title", () => {
    const G = realm({ citizens: 0, freemen: 0, slaves: 0 });
    G.year = 14;
    G.players["0"].resources.gold = G.ruleset.victory.minimums.gold - 1;
    const keep = (m: GameCommand) =>
      m.type === "endTurn" || (m.type === "fundExpedition" && m.expeditionId === "merchantConvoy");
    expect(choose("trader", G, keep)).toEqual({
      type: "fundExpedition",
      expeditionId: "merchantConvoy",
    });
    const poor = structuredClone(G);
    poor.players["0"].resources.gold = 10;
    expect(choose("trader", poor, keep)).toEqual({ type: "endTurn" });
  });

  it("exhausts public venture outcomes, including every uniform Voyage destination, without mutation", () => {
    const G = realm({ citizens: 0, freemen: 0, slaves: 0 });
    const other = G.board.tiles.find((tile) => tile.id !== "-2,0" && tile.resource)!;
    const second = structuredClone(owned(G, "-2,0", "0"));
    second.id = `settlement-${G.nextEntityId++}`;
    second.tileId = other.id;
    other.settlements.push(second);
    G.players["0"].settlements.push(other.id);
    const before = JSON.stringify(G);
    const command = { type: "fundExpedition", expeditionId: "colonistsVoyage" } as const;
    const outcomes = ventureOutcomes(G, "0", command);
    expect(outcomes).toHaveLength(7);
    expect(outcomes.reduce((sum, o) => sum + o.probability, 0)).toBeCloseTo(1);
    const jackpots = outcomes.filter((o) => o.state.lastTableRoll?.roll === 6);
    expect(jackpots.map((o) => o.probability)).toEqual([1 / 12, 1 / 12]);
    expect(jackpots.map((o) => owned(o.state, "-2,0", "0").pops.freemen).sort()).toEqual([0, 1]);
    for (const o of outcomes) expect(o.state.rng).toBe(G.rng);
    expect(JSON.stringify(G)).toBe(before);
  });

  it.each(names)("%s makes the same legal choice when hidden rolls and decks differ", (name) => {
    const G = realm();
    const altered = structuredClone(G);
    altered.rng ^= 0xfffffff;
    altered.yearDrawPile.reverse();
    altered.playerDrawPile.reverse();
    const keep = (m: GameCommand) => m.type === "endTurn" || m.type === "fundExpedition";
    const move = choose(name, G, keep);
    expect(choose(name, altered, keep)).toEqual(move);
    expect(enumerateLegalCommands(G, "0")).toContainEqual(move);
  });

  it.each(names)(
    "%s scores Ideas in policy and fixed openings and buys a useful second Idea",
    (name) => {
      const policy = POLICIES[name];
      const G = buildNewGame({
        seed: 17,
        mode: "standard",
        opening: "fixed",
        policy,
        simRng: createSimRng(1),
      });
      expect(Object.values(G.players).every((p) => p.nationalIdeas.length === 1)).toBe(true);
      const buying = realm();
      buying.players["0"].nationalIdeas = [{ id: "assembly-brokers", acquired: "setup", year: 1 }];
      const move = choose(name, buying, (m) => m.type === "endTurn" || m.type === "buyIdea");
      expect(move.type).toBe("buyIdea");
      expect(transition(buying.definition, buying, "0", move).ok).toBe(true);
    },
  );

  it.each([...names, "master"] as const)(
    "%s buys legal calm to avoid the visible turn-end riot",
    (name) => {
      const G = realm({ citizens: 0, freemen: 0, slaves: 6 });
      Object.assign(G.players["0"].resources, {
        food: 0,
        wood: 0,
        stone: 0,
        influence: 0,
        gold: 2,
      });
      const moves = enumerateLegalCommands(G, "0").filter(
        (m) => m.type === "endTurn" || m.type === "civicCalm",
      );
      const move = POLICIES[name].choose(
        projectForPlayer(G.definition, G, "0"),
        moves,
        createSimRng(1),
      );
      expect(move).toEqual({ type: "civicCalm", payment: "gold" });
      const result = transition(G.definition, G, "0", move);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const end = transition(G.definition, result.state, "0", { type: "endTurn" });
      expect(end.ok).toBe(true);
      if (end.ok) expect(end.state.pendingRiot).toBeNull();
    },
  );

  it.each([...names, "master"] as const)(
    "%s at the riot line raises a legal, affordable Port",
    (name) => {
      // Six slaves hold the level at −3. The Port's good is the cheapest lasting +2:
      // 4 gold and 2 stone, where two Temples would take 6 stone and two settlements.
      const G = scenario()
        .withSettlement("0", "-2,-1", "city", { citizens: 1, freemen: 0, slaves: 6 })
        .withResources("0", { food: 20, wood: 0, stone: 2, gold: 4, influence: 0 })
        .build();
      G.phase = "gameplay";
      G.players["0"].collectedThisTurn = true;
      G.activeYearCard = null;
      expect(happinessLevel(G, "0")).toBe(G.ruleset.economy.unrest.riotThreshold);
      const next = playTurn(G, POLICIES[name], createSimRng(1));
      expect(owned(next, "-2,-1", "0").buildings).toContain("port");
      expect(next.turn).toBeGreaterThan(G.turn);
    },
    30000,
  );

  it.each(names)("%s declines calm when no turn-end riot needs it", (name) => {
    const G = realm({ citizens: 0, freemen: 0, slaves: 4 });
    Object.assign(G.players["0"].resources, { food: 0, wood: 0, stone: 0, influence: 0, gold: 2 });
    expect(choose(name, G, (m) => m.type === "endTurn" || m.type === "civicCalm")).toEqual({
      type: "endTurn",
    });
  });

  it.each(names)(
    "%s ends a normal turn without a forced action cap",
    (name) => {
      let forced = 0;
      const G = realm();
      const next = playTurn(G, POLICIES[name], createSimRng(1), { onForceEndTurn: () => forced++ });
      expect(next.turn).toBeGreaterThan(G.turn);
      expect(forced).toBe(0);
    },
    30000,
  );

  it("finishes a mixed personality game without illegal moves or action caps", () => {
    let caps = 0;
    const G = runGame({
      seed: 1000,
      mode: "standard",
      policy: POLICIES.master,
      seatPolicies: {
        "0": POLICIES.slaver,
        "1": POLICIES.civic,
        "2": POLICIES.trader,
        "3": POLICIES.master,
      },
      turns: 56,
      hooks: { onForceEndTurn: () => caps++ },
    });
    expect(G.phase).toBe("gameOver");
    expect(caps).toBe(0);
    if (G.gameOverReason === "deckExhausted") expect(G.year).toBe(14);
    else expect(G.gameOverReason).toBe("victoryRace");
  }, 300000);

  it("reports personality titles and final cards with finished-seat denominators", () => {
    const agg = new Aggregator();
    const G = realm({ citizens: 5, freemen: 0, slaves: 0 });
    G.players["0"].resources.gold = 35;
    G.phase = "gameOver";
    G.gameOverReason = "deckExhausted";
    G.winner = "0";
    const seats = { "0": "civic", "1": "slaver", "2": "trader", "3": "trader" };
    agg.beginGame(0, 1, G, seats);
    agg.endGame(G);
    const capped = structuredClone(G);
    capped.phase = "gameplay";
    agg.beginGame(1, 2, capped, seats);
    agg.endGame(capped);
    const report = agg.buildReport({
      games: 2,
      turns: 56,
      policy: "mixed",
      mode: "standard",
      boardLayout: "classic",
      opening: "policy",
      baseSeed: 1,
      botSeedRule: "test",
      rulesetPatch: null,
      definition: G.definition.identity,
      generatedAt: "test",
    });
    expect(report.perPolicy.civic).toMatchObject({
      finishedSeatGames: 1,
      cappedSeatGames: 1,
      wins: 1,
      winRate: 1,
      finalTitles: { "civic-elite": 1, treasurer: 1 },
    });
    expect(report.perPolicy.trader).toMatchObject({
      finishedSeatGames: 2,
      cappedSeatGames: 2,
      wins: 0,
    });
    expect(report.perPolicy.civic.finalCards.mean).toBe(report.perGame[0].finalCards["0"]);
  });
});
