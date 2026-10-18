import { describe, expect, it } from "vitest";
import { produce } from "immer";
import { scenario, owned, tile } from "../testing/scenario";
import { foundColony, growPop } from "../actions";
import {
  calculateIncome,
  calculateIncomeBreakdown,
  settlementNextClassColumn,
  settlementNextYield,
  tileSlaveColumn,
} from "../economy/income";
import {
  getBuildBuildingStatus,
  getFoundColonyStatus,
  getGrowPopStatus,
  getUpgradeColonyToCityStatus,
} from "../status";
import { getCivicCalmStatus, getPromotePopStatus } from "../civic";
import { happinessLevel } from "../happiness";
import { buildingGround } from "../status";
import { playerPieces, settlementCapacity, settlementSlots } from "../settlement";
import { applyHunger } from "../hunger";
import { calculateEconomyProjection, previewFoundedSettlement } from "../economy/preview";
import { baseVoteWeight } from "./assembly";
import { getLawHappinessContributions, getStandingEffects, getStandingEffectSources } from "./laws";
import type { HegemonyState } from "../types";
function opening() {
  return scenario()
    .opening()
    .withResources("0", { wood: 100, stone: 100, food: 100, gold: 100, influence: 100 })
    .mutate((G) => {
      G.pendingPlayerEvent = null;
    })
    .build();
}
function law(G: HegemonyState, cardId: string) {
  G.activeLaws.push({ cardId, author: "0", enactedYear: G.year, order: G.lawOrder++ });
}
const cap = "-2,0",
  colony = "3,0";

describe("standing Laws", () => {
  it("keeps cached Laws and Ideas seat-specific, caller-owned and current inside drafts", () => {
    const G = produce(opening(), (draft) => {
      law(draft, "grain-levy");
      draft.players["1"].nationalIdeas.push({ id: "civic-tradition", acquired: "setup", year: 1 });
    });
    expect(getStandingEffects(G, "0")).toContainEqual({ type: "rule", rule: "grainLevy" });
    expect(getStandingEffects(G, "1")).toContainEqual({
      type: "realmIncome",
      resource: "influence",
      amount: 2,
    });
    expect(getStandingEffects(G, "0")).not.toContainEqual({
      type: "realmIncome",
      resource: "influence",
      amount: 2,
    });
    getStandingEffects(G, "0").length = 0;
    getStandingEffectSources(G, "0")[0].label = "changed by caller";
    expect(getStandingEffectSources(G, "0")[0].label).toBe("Grain Levy");
    produce(G, (draft) => {
      draft.activeLaws[0].cardId = "forum-rites";
      draft.players["1"].nationalIdeas = [];
      expect(getStandingEffects(draft, "0")).toContainEqual({ type: "rule", rule: "forumRites" });
      expect(getStandingEffects(draft, "1")).toEqual(getStandingEffects(draft, "0"));
    });
    expect(getStandingEffects(G, "0")).toContainEqual({ type: "rule", rule: "grainLevy" });
  });
  it("rule Laws change columns before the year card without stacking Forums or Marketplaces", () => {
    const G = opening();
    const city = owned(G, cap, "0"),
      farm = owned(G, colony, "0");
    city.pops = { citizens: 2, freemen: 1, slaves: 1 };
    city.buildings = ["forum", "marketplace"];
    farm.pops = { citizens: 1, freemen: 2, slaves: 1 };
    farm.buildings = ["marketplace"];
    law(G, "forum-rites");
    expect(settlementNextClassColumn(G, tile(G, colony), farm, "freemen").perPop).toBe(0);
    expect(settlementNextClassColumn(G, tile(G, cap), city, "citizens").perPop).toBe(2);
    expect(settlementNextClassColumn(G, tile(G, colony), farm, "freemen").perPop).toBe(0);
    law(G, "grain-levy");
    expect(settlementNextClassColumn(G, tile(G, cap), city, "freemen")).toMatchObject({
      perPop: 1,
      income: { food: 0, gold: 1 },
    });
    G.players["0"].collectedThisTurn = false;
    G.activeYearCard = {
      id: "test",
      name: "Ostracism",
      count: 1,
      text: "",
      effect: { type: "zeroTerm", term: "citizenInfluence" },
    };
    expect(calculateIncome(G, "0").influence).toBe(0);
  });
  it("Land Reform changes working slaves to food on hills too and preserves existing Estates", () => {
    const G = opening();
    const city = owned(G, cap, "0");
    city.pops = { citizens: 0, freemen: 0, slaves: 2 };
    city.buildings = ["estate"];
    law(G, "land-reform");
    expect(settlementNextYield(G, tile(G, cap), city).food).toBe(4);
    expect(getBuildBuildingStatus(G, "0", cap, "estate").reasons.join(" ")).toContain(
      "Land Reform",
    );
    const ground = tile(G, cap);
    ground.terrain = "hill";
    ground.resource = null;
    city.buildings = [];
    expect(settlementNextYield(G, ground, city).food).toBe(2);
    expect(tileSlaveColumn(G, ground)).toEqual({ resource: "food", perPop: 1 });
  });
  it("Land Reform food survives Wildfire in both the class head and income forecast", () => {
    const G = opening();
    const ground = tile(G, cap),
      city = owned(G, cap, "0");
    ground.terrain = "forest";
    ground.resource = { type: "wood" };
    city.pops = { citizens: 0, freemen: 0, slaves: 2 };
    G.players["0"].collectedThisTurn = false;
    law(G, "land-reform");
    G.activeYearCard = {
      id: "test",
      name: "Wildfire",
      count: 1,
      text: "",
      effect: { type: "zeroTerm", term: "forestWood" },
    };
    expect(settlementNextClassColumn(G, ground, city, "slaves")).toMatchObject({
      perPop: 1,
      income: { food: 2, wood: 0 },
    });
    expect(settlementNextYield(G, ground, city).food).toBe(2);
  });
  it("Sacred Fields pays Temple food and states the whole building price", () => {
    const G = opening();
    law(G, "sacred-fields");
    expect(getBuildBuildingStatus(G, "0", cap, "temple").cost).toEqual({ stone: 6 });
    const city = owned(G, cap, "0");
    city.buildings = ["temple"];
    expect(
      calculateIncomeBreakdown(G, "0").find((e) => e.detail.includes("Temple food"))?.amount,
    ).toBe(2);
  });
  it("price Laws state growth, calm, founding, upgrading and building prices", () => {
    const G = opening();
    law(G, "tenant-rights");
    expect(getGrowPopStatus(G, "0", cap, "slaves").cost).toEqual({ gold: 2 });
    expect(getGrowPopStatus(G, "0", cap, "freemen").cost).toEqual({ gold: 3 });
    G.activeLaws = [];
    law(G, "festival-calendar");
    expect(getCivicCalmStatus(G, "0", "gold").cost).toEqual({ food: 2 });
    expect(getCivicCalmStatus(G, "0", "influence").cost).toEqual({ influence: 2 });
    G.activeLaws = [];
    law(G, "colonial-charter");
    expect(getFoundColonyStatus(G, "0", "-1,0").cost).toEqual({ food: 1 });
    expect(getUpgradeColonyToCityStatus(G, "0", colony).cost).toEqual({ stone: 6 });
    G.activeLaws = [];
    law(G, "public-works");
    expect(getBuildBuildingStatus(G, "0", cap, "estate").cost).toEqual({ wood: 3 });
    expect(getBuildBuildingStatus(G, "0", cap, "marketplace").cost).toEqual({ wood: 2, gold: 2 });
    G.activeLaws = [];
    law(G, "harbour-dues");
    expect(getBuildBuildingStatus(G, "0", colony, "port").cost).toEqual({ stone: 2 });
    expect(getBuildBuildingStatus(G, "0", cap, "marketplace").cost).toEqual({ wood: 3, gold: 4 });
  });
  it("Civic Pride pays one flat happiness line and city upkeep; Manumission changes counted slaves", () => {
    const G = opening();
    const before = happinessLevel(G, "0");
    law(G, "civic-pride");
    expect(happinessLevel(G, "0")).toBe(before + 1);
    expect(getLawHappinessContributions(G, "0")).toEqual([{ label: "Civic Pride", amount: 1 }]);
    expect(calculateIncomeBreakdown(G, "0").find((e) => e.source === "Civic Pride")).toMatchObject({
      resource: "gold",
      amount: -1,
    });
    G.activeLaws = [];
    owned(G, cap, "0").pops.slaves = 3;
    owned(G, colony, "0").pops.slaves = 0;
    law(G, "manumission");
    expect(getPromotePopStatus(G, "0", cap, "slaves").cost).toEqual({});
    expect(getLawHappinessContributions(G, "0")).toEqual([{ label: "Manumission", amount: -3 }]);
  });
  it("city upkeep reaches settlement projections and Grain Levy exempts freemen from hunger", () => {
    const G = opening();
    law(G, "civic-pride");
    const projection = calculateEconomyProjection(G, "0", { resolveTransfers: true });
    expect(projection.settlements.reduce((sum, place) => sum + place.income.gold, 0)).toBe(
      projection.income.gold,
    );
    G.activeLaws = [];
    law(G, "grain-levy");
    const city = owned(G, cap, "0");
    city.pops = { citizens: 1, freemen: 4, slaves: 0 };
    owned(G, colony, "0").pops = { citizens: 0, freemen: 2, slaves: 0 };
    applyHunger(G, "0", 1);
    expect(city.pops).toEqual({ citizens: 0, freemen: 4, slaves: 0 });
  });
  it("capacity, slots and piece cuts block new additions while keeping everything standing", () => {
    const G = opening();
    const farm = owned(G, colony, "0");
    farm.pops.slaves = 4;
    farm.pops.freemen = farm.pops.citizens = 0;
    law(G, "public-works");
    expect(settlementCapacity(farm, G)).toBe(3);
    expect(getGrowPopStatus(G, "0", colony, "slaves").can).toBe(false);
    expect(farm.pops.slaves).toBe(4);
    const projection = calculateEconomyProjection(G, "0");
    expect(projection.population.overCapacity).toBe(0);
    expect(projection.settlements.every((place) => place.overCapacity === 0)).toBe(true);
    G.activeLaws = [];
    law(G, "homestead-act");
    const city = owned(G, cap, "0");
    city.buildings = ["temple", "forum", "granary", "estate"];
    expect(settlementSlots(tile(G, cap), city, G)).toBeGreaterThanOrEqual(city.buildings.length);
    expect(getBuildBuildingStatus(G, "0", colony, "temple").can).toBe(true);
    expect(buildingGround(G, "0", colony).slots).toBe(1);
    farm.buildings = ["temple"];
    expect(getBuildBuildingStatus(G, "0", colony, "forum").can).toBe(false);
    G.activeLaws = [];
    law(G, "master-builders");
    expect(playerPieces(G, "0")).toMatchObject({ colonySupply: 4, colonyLimit: 3 });
    expect(settlementSlots(tile(G, cap), city, G)).toBe(tile(G, cap).slots + 1);
  });
  it("Guild Charter grants a second capital growth and forbids colony growth", () => {
    const G = opening();
    law(G, "guild-charter");
    expect(growPop(G, "0", cap, "slaves").ok).toBe(true);
    expect(growPop(G, "0", cap, "slaves").ok).toBe(true);
    expect(growPop(G, "0", cap, "slaves").ok).toBe(false);
    expect(getGrowPopStatus(G, "0", colony, "slaves").can).toBe(false);
  });
  it("Frontier Spirit grants a slave on the real founding path without a token", () => {
    const G = opening();
    law(G, "frontier-spirit");
    const tokens = G.players["0"].unrestTokens;
    expect(previewFoundedSettlement(G, "0", "-1,0", cap, "freemen")?.settlement.pops).toMatchObject(
      { freemen: 1, slaves: 1 },
    );
    expect(foundColony(G, "0", "-1,0", cap, "freemen").ok).toBe(true);
    expect(owned(G, "-1,0", "0").pops.slaves).toBe(1);
    expect(G.players["0"].unrestTokens).toBe(tokens);
  });
  it("Rural Bloc adds colony votes and subtracts city votes with a floor of one", () => {
    const G = opening();
    const before = baseVoteWeight(G, "0");
    law(G, "rural-bloc");
    expect(baseVoteWeight(G, "0")).toBe(before);
    owned(G, colony, "0").kind = "city";
    owned(G, cap, "0").pops.citizens = 0;
    expect(baseVoteWeight(G, "0")).toBe(1);
  });
});
