import { describe, expect, it } from "vitest";

import {
  BUILDINGS,
  EXPEDITION_TABLES,
  OMEN_TABLE,
  PLAYER_EVENT_CARDS,
  RIOT_TABLE,
  SEASONAL_EVENT_CARDS,
} from "../game/data";
import { getCivicCalmStatus } from "../game/civic";
import { POP_TYPES } from "../game/core/pops";
import { getDiscountedGrowPopCost } from "../game/economy/cost";
import { calculateIncome, calculateIncomeBreakdown } from "../game/economy/income";
import { drawSeasonalEvent, getEventEffectChoices } from "../game/events";
import { owned, scenario } from "../game/testing/scenario";
import type {
  BuildingDefinition,
  EventCard,
  HegemonyState,
  PlayerId,
  Resources,
} from "../game/types";
import { getFundExpeditionStatus } from "../game/ventures";
import { presentEventEffects, presentTableEffect } from "../ui/effects";
import { getAuthoredGameContent } from "../game/content";
import { createGameDefinition } from "../game/definition";
import { enumerateLegalOptions, transition } from "../game/legalMoves";
import type { GameCommand } from "../game/legalMoves";
import { projectForPlayer } from "../game/projection";
import {
  getBuildBuildingOptions,
  getFoundColonyStatus,
  getUpgradeColonyToCityStatus,
} from "../game/rules";
import { VERBS } from "../components/board/command/verbs";
import type { VerbContext } from "../components/board/command/verbs";
import { buildingName } from "../ui/formatters";
import { smartPolicy } from "../sim/policies";
import { createSimRng } from "../sim/rng";

function customSeasonalCard(
  id: string,
  timing: EventCard["timing"],
  effects: EventCard["effects"],
): EventCard {
  return {
    id,
    deck: "seasonal",
    name: id,
    count: 1,
    text: id,
    timing,
    effects,
  };
}

function seasonalContribution(
  G: HegemonyState,
  playerID: PlayerId,
  source: string,
  resource: "gold" | "happiness",
) {
  return calculateIncomeBreakdown(G, playerID)
    .filter((line) => line.source === source && line.resource === resource)
    .reduce((total, line) => total + line.amount, 0);
}

describe("backend-to-backend parity", () => {
  it("binds immediate active-player seasonal effects to the seat that revealed them", () => {
    const G = scenario().build();
    const card = customSeasonalCard("Active Windfall", "immediate", [
      { type: "resourceDelta", scope: "activePlayer", resource: "gold", amount: 3 },
    ]);
    G.currentPlayer = "2";
    G.seasonalDrawPile = [card];
    const before = Object.fromEntries(
      Object.entries(G.players).map(([playerID, player]) => [playerID, player.resources.gold]),
    );

    drawSeasonalEvent(G);

    expect(G.activeSeasonEvent?.playerID).toBe("2");
    expect(G.players["2"].resources.gold).toBe(before["2"] + 3);
    expect(G.players["0"].resources.gold).toBe(before["0"]);
    expect(G.players["1"].resources.gold).toBe(before["1"]);
    expect(G.players["3"].resources.gold).toBe(before["3"]);
  });

  it("keeps season-long active-player income scoped to the revealing seat", () => {
    const G = scenario().build();
    const card = customSeasonalCard("Active Markets", "season", [
      {
        type: "incomeModifier",
        scope: "activePlayer",
        resource: "gold",
        amount: 5,
        duration: "season",
      },
    ]);
    G.currentPlayer = "1";
    G.seasonalDrawPile = [card];

    drawSeasonalEvent(G);

    expect(seasonalContribution(G, "1", card.name, "gold")).toBe(5);
    expect(seasonalContribution(G, "0", card.name, "gold")).toBe(0);
    expect(seasonalContribution(G, "2", card.name, "gold")).toBe(0);
    expect(seasonalContribution(G, "3", card.name, "gold")).toBe(0);
  });
});

describe("frontend-to-frontend parity", () => {
  it("presents every event-card option through one non-empty effect vocabulary", () => {
    for (const card of [...SEASONAL_EVENT_CARDS, ...PLAYER_EVENT_CARDS]) {
      for (const effects of getEventEffectChoices(card)) {
        const presentation = presentEventEffects(effects);
        expect(presentation.text.trim(), card.id).not.toBe("");
        expect(["positive", "negative", "muted", "neutral"], card.id).toContain(presentation.tone);
      }
    }
  });

  it("presents every table effect through the same text-and-tone contract", () => {
    const tables = [RIOT_TABLE, ...EXPEDITION_TABLES, OMEN_TABLE];

    for (const table of tables) {
      for (const row of table.rows) {
        for (const effect of row.effects) {
          const presentation = presentTableEffect(effect);
          expect(presentation.text.trim(), `${table.id} roll ${row.roll}`).not.toBe("");
          expect(
            ["positive", "negative", "muted", "neutral"],
            `${table.id} roll ${row.roll}`,
          ).toContain(presentation.tone);
        }
      }
    }
  });
});

function tunedBuildings(
  buildingId: BuildingDefinition["id"],
  patch: Partial<BuildingDefinition>,
): BuildingDefinition[] {
  return BUILDINGS.map((building) =>
    building.id === buildingId ? { ...building, ...patch } : building,
  );
}

function gameplayCity(): HegemonyState {
  return scenario()
    .withSettlement("0", "0,0", "city", { citizens: 0, freemen: 0, slaves: 0 })
    .withResources("0", "wealthy")
    .mutate((G) => {
      G.phase = "gameplay";
      G.currentPlayer = "0";
    })
    .build();
}

function pinBuildings(G: HegemonyState, buildings: BuildingDefinition[]) {
  const definition = createGameDefinition({
    ruleset: G.ruleset,
    content: { ...getAuthoredGameContent(), buildings },
  });
  G.definition = definition;
  G.definitionId = definition.identity.id;
  G.ruleset = definition.ruleset;
}

function commandContext(G: HegemonyState): VerbContext {
  return {
    G,
    playerID: "0",
    phase: "gameplay",
    isActive: true,
    hasPendingPlayerEvent: false,
    canGrowPops: true,
    canMovePops: true,
    canFoundColony: true,
    canUpgradeCity: true,
    canBuild: true,
    armedVerb: null,
    calmUsed: false,
    ventureUsed: false,
  };
}

describe("effective content and cost parity", () => {
  it("shares a tuned building's effective definition, cost, execution, label, and income", () => {
    const tuned = tunedBuildings("marketplace", {
      name: "Agora Market",
      cost: { wood: 7, stone: 2 },
      effects: [{ type: "income", resource: "gold", amount: 9 }],
    });
    const G = gameplayCity();
    pinBuildings(G, tuned);
    G.activeSeasonEvent = {
      card: {
        id: "double-build-cost",
        deck: "seasonal",
        name: "Double Build Cost",
        count: 1,
        text: "Building costs double.",
        timing: "season",
        effects: [
          {
            type: "buildingCostMultiplier",
            multiplier: 2,
            duration: "season",
            excludes: [],
          },
        ],
      },
      season: G.season,
      playerID: "0",
    };
    G.players["0"].actionCostDiscounts.push({
      id: "market-coupon",
      sourceCardId: "market-coupon",
      label: "Market coupon",
      action: "buildBuilding",
      buildingId: "marketplace",
      resource: "wood",
      amount: 3,
      consume: "nextMatchingAction",
    });

    const option = getBuildBuildingOptions(G, "0", "0,0").find(
      ({ building }) => building.id === "marketplace",
    );
    expect(option?.building.name).toBe("Agora Market");
    expect(option?.status.cost).toEqual({ wood: 11, stone: 4 });
    expect(buildingName("marketplace", G.definition.content)).toBe("Agora Market");

    const legalOption = enumerateLegalOptions(G, "0").find(
      ({ command }) => command.type === "buildBuilding" && command.buildingId === "marketplace",
    );
    expect(legalOption).toMatchObject({
      command: { type: "buildBuilding", buildingId: "marketplace" },
      cost: { wood: 11, stone: 4 },
    });

    const beforeResources = { ...G.players["0"].resources };
    const beforeIncome = calculateIncome(G, "0").gold;
    const result = legalOption
      ? transition(G.definition, G, "0", legalOption.command)
      : { ok: false as const, reasons: ["missing option"] };
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players["0"].resources.wood).toBe(beforeResources.wood - 11);
    expect(result.state.players["0"].resources.stone).toBe(beforeResources.stone - 4);
    expect(owned(result.state, "0,0", "0").buildings).toContain("marketplace");
    expect(calculateIncome(result.state, "0").gold - beforeIncome).toBe(9);
  });

  it("quotes every dock price off the engine, targets-dependent ones included", () => {
    const G = gameplayCity();
    G.players["0"].actionCostDiscounts.push({
      id: "found-coupon",
      sourceCardId: "found-coupon",
      label: "Found coupon",
      action: "foundColony",
      resource: "wood",
      amount: 2,
      consume: "nextMatchingAction",
    });
    const context = commandContext(G);
    const found = VERBS.find((verb) => verb.id === "found");
    const upgrade = VERBS.find((verb) => verb.id === "upgrade");

    const priceOf = (id: string) => VERBS.find((verb) => verb.id === id)?.cost?.(context) ?? [];
    const units = (cost: Partial<Resources> | undefined) =>
      Object.values(cost ?? {}).reduce((sum, amount) => sum + amount, 0);

    expect(found?.cost?.(context)).toEqual([{ amounts: getFoundColonyStatus(G, "0", "").cost }]);
    expect(upgrade?.cost?.(context)).toEqual([
      { amounts: getUpgradeColonyToCityStatus(G, "0", "").cost },
    ]);

    // The four verbs that used to print "varies" / "options" / "stakes". A dock
    // price has to be a figure the press would really charge, so each is checked
    // against the engine query that charges it rather than against a literal.
    const growFood = POP_TYPES.map(
      (pop) => getDiscountedGrowPopCost(G, "0", owned(G, "0,0", "0"), pop).food ?? 0,
    );
    expect(priceOf("grow")).toEqual([
      { span: { resource: "food", min: Math.min(...growFood), max: Math.max(...growFood) } },
    ]);

    const [floor] = priceOf("build");
    const cheapest = Math.min(
      ...getBuildBuildingOptions(G, "0", "0,0").map((option) => units(option.status.cost)),
    );
    expect(floor.lead).toBe("from");
    expect(units(floor.amounts)).toBe(cheapest);

    expect(priceOf("calm")).toEqual([
      { amounts: getCivicCalmStatus(G, "0", "influence").cost },
      { amounts: getCivicCalmStatus(G, "0", "gold").cost },
    ]);
    expect(priceOf("venture")).toEqual([
      {
        lead: "stake",
        amounts: getFundExpeditionStatus(G, "0", EXPEDITION_TABLES[0].id, "gold").cost,
      },
    ]);
  });

  it("makes smart policy reverse its build choice when effective economics reverse", () => {
    const choose = (cost: number, income: number) => {
      const buildings = tunedBuildings("granary", {
        cost: { wood: cost },
        effects: income ? [{ type: "income", resource: "food", amount: income }] : [],
      });
      const G = gameplayCity();
      pinBuildings(G, buildings);
      const moves: GameCommand[] = [
        {
          type: "buildBuilding",
          tileId: "0,0",
          buildingId: "granary",
        },
        { type: "endTurn" },
      ];

      return smartPolicy.choose(projectForPlayer(G.definition, G, "0"), moves, createSimRng(1))
        .type;
    };

    expect(choose(150, 0)).toBe("endTurn");
    expect(choose(1, 50)).toBe("buildBuilding");
  });
});
