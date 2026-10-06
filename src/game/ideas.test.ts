import { buildingGround } from "./status";
import { describe, expect, it } from "vitest";
import {
  NATIONAL_IDEAS,
  ideaDraft,
  ideaDraftOrder,
  ideaHolder,
  playerNationalIdeas,
  takeNationalIdea,
} from "./ideas";
import type { NationalIdeaId, IdeaPopChoice } from "./ideaTypes";
import { owned, scenario, tile } from "./testing/scenario";
import { calculateIncome, calculateIncomeBreakdown } from "./economy/income";
import {
  playerPieces,
  settlementCapacity,
  settlementSlots,
  settlementWorkingSlaves,
} from "./settlement";
import { getDoleStatus, dole } from "./bank";
import { foundColony, upgradeColonyToCity, buildBuilding } from "./actions";
import { getBuildBuildingStatus } from "./status";
import { enumerateLegalCommands, transition } from "./legalMoves";
import { projectForPlayer, projectForSpectator } from "./projection";
import {
  openAssembly,
  assemblyBribe,
  getAssemblyBuyVoteStatus,
  currentVoteWeight,
} from "./assembly";
import { getActiveEffects } from "./activeEffects";
import { createGameDefinition } from "./definition";
import { getAuthoredGameContent } from "./content";
import { createInitialStateFromDefinition } from "./state";

const pops = { citizens: 0, freemen: 0, slaves: 0 };
function realm() {
  const G = scenario()
    .withSettlement("0", "-2,0", "city", { ...pops, slaves: 2 })
    .withSettlement("0", "0,0", "colony", { ...pops, freemen: 1 })
    .withResources("0", { wood: 50, stone: 50, gold: 50, food: 50, influence: 50 })
    .build();
  G.phase = "gameplay";
  G.players["0"].nationalIdeas = [{ id: "assembly-brokers", acquired: "setup", year: 1 }];
  return G;
}
function buy(G: ReturnType<typeof realm>, id: NationalIdeaId, target?: IdeaPopChoice) {
  expect(takeNationalIdea(G, "0", id, target).ok).toBe(true);
}

describe("twelve National Ideas", () => {
  it("Good Harvest adds flat realm food even under Drought, with a named income line", () => {
    const G = realm();
    const before = calculateIncome(G, "0").food;
    buy(G, "good-harvest");
    expect(calculateIncome(G, "0").food).toBe(before + 2);
    G.activeYearCard = G.definition.content.yearCards.find((c) => c.id === "year-drought")!;
    expect(calculateIncomeBreakdown(G, "0").find((l) => l.source === "Good Harvest")?.amount).toBe(
      2,
    );
    expect(calculateIncome(G, "1").food).toBe(0);
  });
  it("Public Dole charges its whole price in both the quote and the move", () => {
    const G = realm();
    buy(G, "public-dole");
    const before = { ...G.players["0"].resources };
    expect(getDoleStatus(G, "0").cost).toEqual({ influence: 2 });
    expect(dole(G, "0").ok).toBe(true);
    expect(G.players["0"].resources.influence).toBe(before.influence - 2);
    expect(G.players["0"].resources.food).toBe(before.food + 1);
    expect(getDoleStatus(G, "1").cost).toEqual({ influence: 3 });
  });
  it("Urban Planning adds a shared work slot to cities, including the capital, and no colony", () => {
    const G = realm();
    const city = owned(G, "-2,0", "0");
    const colony = owned(G, "0,0", "0");
    const before = settlementSlots(tile(G, city.tileId), city, G);
    buy(G, "urban-planning");
    expect(settlementSlots(tile(G, city.tileId), city, G)).toBe(before + 1);
    expect(settlementSlots(tile(G, colony.tileId), colony, G)).toBe(tile(G, colony.tileId).slots);
    city.pops.slaves = 20;
    expect(settlementWorkingSlaves(tile(G, city.tileId), city, G)).toBe(before + 1);
  });
  it("Capital Works adds a slot only to the first setup city", () => {
    const G = realm();
    buy(G, "capital-works");
    const s = owned(G, "-2,0", "0");
    expect(settlementSlots(tile(G, s.tileId), s, G)).toBe(tile(G, s.tileId).slots + 1);
    const c = owned(G, "0,0", "0");
    c.kind = "city";
    expect(settlementSlots(tile(G, c.tileId), c, G)).toBe(tile(G, c.tileId).slots);
  });
  it("Civic Tradition adds flat influence even when citizen influence is zeroed", () => {
    const G = realm();
    buy(G, "civic-tradition");
    G.activeYearCard = G.definition.content.yearCards.find((c) => c.id === "year-ostracism")!;
    expect(calculateIncome(G, "0").influence).toBe(2);
    expect(calculateIncomeBreakdown(G, "0").some((l) => l.source === "Civic Tradition")).toBe(true);
  });
  it("Frontier Charter adds a physical piece and Master Builders still cuts only the placement limit", () => {
    const G = realm();
    buy(G, "frontier-charter");
    expect(playerPieces(G, "0")).toMatchObject({
      colonySupply: 5,
      colonyLimit: 5,
      coloniesRemaining: 4,
    });
    G.activeLaws.push({ cardId: "master-builders", author: "1", enactedYear: 1, order: 0 });
    expect(playerPieces(G, "0")).toMatchObject({
      colonySupply: 5,
      colonyLimit: 4,
      coloniesRemaining: 3,
    });
    expect(playerPieces(G, "1").colonySupply).toBe(4);
  });
  it("New Settlers applies the chosen slave or freeman without consuming paid growth, and reserves transit room", () => {
    const G = realm();
    const s = owned(G, "-2,0", "0");
    expect(
      takeNationalIdea(G, "0", "new-settlers", { tileId: "0,0", pop: "citizens" as "freemen" }).ok,
    ).toBe(false);
    G.transfers.push({
      id: "reserved-room",
      owner: "0",
      fromSettlementId: owned(G, "0,0", "0").id,
      toSettlementId: s.id,
      fromTileId: "0,0",
      toTileId: s.tileId,
      pops: { citizens: 0, freemen: 0, slaves: settlementCapacity(s, G) - 2 },
    });
    expect(takeNationalIdea(G, "0", "new-settlers", { tileId: s.tileId, pop: "freemen" }).ok).toBe(
      false,
    );
    G.transfers = [];
    buy(G, "new-settlers", { tileId: s.tileId, pop: "freemen" });
    expect(s.pops.freemen).toBe(1);
    expect(G.players["0"].grownSettlementsThisTurn).toEqual([]);
    expect(takeNationalIdea(G, "0", "new-settlers", { tileId: s.tileId, pop: "slaves" }).ok).toBe(
      false,
    );
  });
  it("City Pioneers adds a freeman on upgrade and returns the colony piece", () => {
    const G = realm();
    buy(G, "city-pioneers");
    const before = playerPieces(G, "0").coloniesRemaining;
    expect(upgradeColonyToCity(G, "0", "0,0").ok).toBe(true);
    expect(owned(G, "0,0", "0").pops.freemen).toBe(2);
    expect(playerPieces(G, "0").coloniesRemaining).toBe(before + 1);
  });
  it("Slave Colonies grants existing and new colonies slaves within capacity, preserving room for the sent pop", () => {
    const G = realm();
    buy(G, "slave-colonies");
    expect(owned(G, "0,0", "0").pops.slaves).toBe(2);
    const command = enumerateLegalCommands(G, "0").find((c) => c.type === "foundColony");
    expect(command?.type).toBe("foundColony");
    if (command?.type !== "foundColony") return;
    expect(foundColony(G, "0", command.tileId, command.sourceTileId, command.pop).ok).toBe(true);
    expect(owned(G, command.tileId, "0").pops.slaves).toBe(2);
    expect(G.transfers.find((t) => t.toTileId === command.tileId)?.pops[command.pop]).toBe(1);
  });
  it("Harbour Planning leaves Port prices and claims intact while using no work slot", () => {
    const G = realm();
    buy(G, "harbour-planning");
    // Put the city at a real luxury mooring, fill all its slots with other buildings.
    const luxury = G.board.luxuries.find((a) => !tile(G, a.tileIds[0]).settlements.length)!;
    const t = tile(G, luxury.tileIds[0]);
    const s = owned(G, "-2,0", "0");
    tile(G, s.tileId).settlements = [];
    G.players["0"].settlements[0] = t.id;
    s.tileId = t.id;
    t.settlements.push(s);
    t.slots = 1;
    s.buildings = ["temple"];
    s.pops.slaves = 2;
    const status = getBuildBuildingStatus(G, "0", t.id, "port", luxury.vertexId);
    expect(status.can).toBe(true);
    expect(status.cost).toEqual({ gold: 4, stone: 2 });
    expect(buildBuilding(G, "0", t.id, "port", luxury.vertexId).ok).toBe(true);
    expect(luxury.owner).toBe("0");
    expect(settlementSlots(t, s, G)).toBe(1);
    expect(buildingGround(G, "0", t.id)).toMatchObject({ slots: 1, built: 2, open: 0 });
    expect(settlementWorkingSlaves(t, s, G)).toBe(0);
  });
  it("Treasury Grant pays once on acquisition, never at income", () => {
    const G = realm();
    const before = G.players["0"].resources.gold;
    const income = calculateIncome(G, "0").gold;
    buy(G, "treasury-grant");
    expect(G.players["0"].resources.gold).toBe(before + 4);
    expect(calculateIncome(G, "0").gold).toBe(income);
    expect(takeNationalIdea(G, "0", "treasury-grant").ok).toBe(false);
  });
  it("Assembly Brokers permits a paid third vote, but no fourth or free vote", () => {
    const G = realm();
    G.year = 2;
    openAssembly(G, "0");
    const a = G.assembly!;
    a.phase = "voting";
    a.voteIndex = 0;
    a.voteOrder = ["0", "1", "2", "3"];
    a.activePlayer = "0";
    expect(assemblyBribe(G, "0", "influence").ok).toBe(true);
    expect(assemblyBribe(G, "0", "gold").ok).toBe(true);
    expect(assemblyBribe(G, "0", "influence").ok).toBe(true);
    expect(currentVoteWeight(G, "0")).toBe(4);
    expect(getAssemblyBuyVoteStatus(G, "0", "gold").can).toBe(false);
    expect(G.players["0"].resources.influence).toBe(46);
  });
});

describe("Idea ownership and acquisition", () => {
  it("runs an open draft in snake order: each pick lands publicly and is gone for the rest", () => {
    let G = realm();
    G.players["0"].nationalIdeas = [];
    G.phase = "setupIdeas";
    G.currentPlayer = ideaDraftOrder(G)[0];
    expect(ideaDraftOrder(G)).toEqual(["0", "1", "2", "3"]);
    expect(transition(G.definition, G, "1", { type: "pickIdea", ideaId: "good-harvest" }).ok).toBe(
      false,
    );
    const gold = G.players["0"].resources.gold;
    const first = transition(G.definition, G, "0", { type: "pickIdea", ideaId: "treasury-grant" });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    G = first.state;
    // The pick and its grant land at once, and every seat sees them.
    expect(G.players["0"].resources.gold).toBe(gold + 4);
    expect(G.currentPlayer).toBe("1");
    const rival = projectForPlayer(G.definition, G, "2").state;
    expect(playerNationalIdeas(rival, "0").map((i) => i.id)).toEqual(["treasury-grant"]);
    expect(ideaDraft(G).map((seat) => seat.state)).toEqual([
      "picked",
      "choosing",
      "waiting",
      "waiting",
    ]);
    expect(
      enumerateLegalCommands(G, "1").some(
        (c) => c.type === "pickIdea" && c.ideaId === "treasury-grant",
      ),
    ).toBe(false);
    expect(
      transition(G.definition, G, "1", { type: "pickIdea", ideaId: "treasury-grant" }).ok,
    ).toBe(false);
    for (const [id, ideaId] of [
      ["1", "good-harvest"],
      ["2", "civic-tradition"],
    ] as const) {
      const result = transition(G.definition, G, id, { type: "pickIdea", ideaId });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      G = result.state;
      expect(G.activeYearCard).toBeNull();
    }
    const final = transition(G.definition, G, "3", { type: "pickIdea", ideaId: "public-dole" });
    expect(final.ok).toBe(true);
    if (!final.ok) return;
    expect(final.state.phase).toBe("gameplay");
    expect(final.state.activeYearCard).not.toBeNull();
    expect(ideaHolder(final.state, "public-dole")).toBe("3");
  });
  it("continues the snake: an odd number of placement rounds drafts from the last seat", () => {
    const G = realm();
    const odd = { ...G, ruleset: { ...G.ruleset, setup: ["capital", "colony", "colony"] } };
    expect(ideaDraftOrder(odd as typeof G)).toEqual(["3", "2", "1", "0"]);
  });
  it("offers only untaken Ideas for purchase", () => {
    const G = realm();
    G.players["1"].nationalIdeas = [{ id: "good-harvest", acquired: "setup", year: 1 }];
    expect(takeNationalIdea(G, "0", "good-harvest").ok).toBe(false);
    const buys = enumerateLegalCommands(G, "0").filter((c) => c.type === "buyIdea");
    expect(buys.some((c) => c.type === "buyIdea" && c.ideaId === "good-harvest")).toBe(false);
    expect(buys.length).toBeGreaterThan(0);
  });
  it("charges 6 influence for one distinct purchase and exposes it publicly as a permanent personal rule", () => {
    const G = realm();
    G.players["0"].resources.influence = 6;
    expect(takeNationalIdea(G, "0", "assembly-brokers").ok).toBe(false);
    const result = transition(G.definition, G, "0", { type: "buyIdea", ideaId: "good-harvest" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players["0"].resources.influence).toBe(0);
    expect(enumerateLegalCommands(result.state, "0").some((c) => c.type === "buyIdea")).toBe(false);
    const publicState = projectForSpectator(result.state.definition, result.state).state;
    expect(playerNationalIdeas(publicState, "0").map((i) => i.id)).toEqual([
      "assembly-brokers",
      "good-harvest",
    ]);
    expect(
      getActiveEffects(publicState, "0").find((e) => e.id === "idea:good-harvest"),
    ).toMatchObject({
      kind: "standingIdea",
      scope: { kind: "player", playerID: "0" },
      duration: { expiry: "permanent" },
    });
  });
  it("reads the pinned Idea rules and wording, including a content override", () => {
    const content = structuredClone(getAuthoredGameContent());
    const idea = content.nationalIdeas.find((i) => i.id === "good-harvest")!;
    idea.text = "Your realm gains 3 food at each year's income.";
    idea.effects = [{ type: "realmIncome", resource: "food", amount: 3 }];
    const G = createInitialStateFromDefinition(
      createGameDefinition({ ruleset: realm().ruleset, content }),
      1,
    );
    G.phase = "gameplay";
    G.players["0"].nationalIdeas = [{ id: "good-harvest", acquired: "setup", year: 1 }];
    expect(calculateIncome(G, "0").food).toBe(3);
    expect(playerNationalIdeas(G, "0")[0].text).toBe(idea.text);
    expect(NATIONAL_IDEAS).toHaveLength(12);
  });
});
