import { describe, expect, it } from "vitest";

import {
  BUILDINGS,
  EXPEDITION_TABLES,
  PLAYER_EVENT_CARDS,
  RIOT_TABLE,
  YEAR_CARDS,
} from "../game/data";
import { getCivicCalmStatus } from "../game/civic";
import { GROWABLE_POPS } from "../game/core/pops";
import { getGrowPopCost } from "../game/economy/cost";
import { calculateIncome, calculateIncomeBreakdown } from "../game/economy/income";
import { revealYearCard } from "../game/year";
import { owned, scenario } from "../game/testing/scenario";
import type { BuildingDefinition, HegemonyState, Resources } from "../game/types";
import { getFundExpeditionStatus } from "../game/ventures";
import { presentEventEffects, presentTableEffect, presentYearCard } from "../ui/effects";
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

describe("backend-to-backend parity", () => {
  it("applies a year card that acts once to every seat when it is revealed", () => {
    const G = scenario().build();
    G.players["2"].unrestTokens = 2;
    G.yearDrawPile = YEAR_CARDS.filter((card) => card.id === "year-plague");

    revealYearCard(G);

    expect(G.activeYearCard?.id).toBe("year-plague");
    expect(Object.values(G.players).map((player) => player.unrestTokens)).toEqual([1, 1, 3, 1]);
  });

  it("takes a zeroed term from every seat that has yet to collect, and from no seat that has", () => {
    const G = scenario().opening().build();
    G.activeYearCard = null;
    for (const player of Object.values(G.players)) player.collectedThisTurn = false;
    for (const tile of G.board.tiles) {
      for (const settlement of tile.settlements) {
        settlement.pops = { citizens: 0, freemen: 2, slaves: 0 };
      }
    }
    const printed = Object.keys(G.players).map((id) => calculateIncome(G, id as "0").gold);
    expect(printed).toEqual([4, 4, 4, 4]);

    G.yearDrawPile = YEAR_CARDS.filter((card) => card.id === "year-piracy");
    revealYearCard(G);
    G.players["3"].collectedThisTurn = true;

    const taken = Object.keys(G.players).map((id) =>
      calculateIncomeBreakdown(G, id as "0")
        .filter((line) => line.detail.startsWith("Piracy"))
        .reduce((total, line) => total + line.amount, 0),
    );
    expect(taken).toEqual([-4, -4, -4, 0]);
  });
});

describe("frontend-to-frontend parity", () => {
  it("presents every event card through one non-empty effect vocabulary", () => {
    for (const card of YEAR_CARDS) {
      const presentation = presentYearCard(card);
      expect(presentation.text.trim(), card.id).not.toBe("");
      expect(["positive", "negative"], card.id).toContain(presentation.tone);
    }
    for (const card of PLAYER_EVENT_CARDS) {
      const presentation = presentEventEffects(card.effects);
      expect(presentation.text.trim(), card.id).not.toBe("");
      expect(["positive", "negative", "muted", "neutral"], card.id).toContain(presentation.tone);
    }
  });

  it("presents every table effect through the same text-and-tone contract", () => {
    const tables = [RIOT_TABLE, ...EXPEDITION_TABLES];

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

    const option = getBuildBuildingOptions(G, "0", "0,0").find(
      ({ building }) => building.id === "marketplace",
    );
    expect(option?.building.name).toBe("Agora Market");
    expect(option?.status.cost).toEqual({ wood: 7, stone: 2 });
    expect(buildingName("marketplace", G.definition.content)).toBe("Agora Market");

    const legalOption = enumerateLegalOptions(G, "0").find(
      ({ command }) => command.type === "buildBuilding" && command.buildingId === "marketplace",
    );
    expect(legalOption).toMatchObject({
      command: { type: "buildBuilding", buildingId: "marketplace" },
      cost: { wood: 7, stone: 2 },
    });

    const beforeResources = { ...G.players["0"].resources };
    const beforeIncome = calculateIncome(G, "0").gold;
    const result = legalOption
      ? transition(G.definition, G, "0", legalOption.command)
      : { ok: false as const, reasons: ["missing option"] };
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players["0"].resources.wood).toBe(beforeResources.wood - 7);
    expect(result.state.players["0"].resources.stone).toBe(beforeResources.stone - 2);
    expect(owned(result.state, "0,0", "0").buildings).toContain("marketplace");
    expect(calculateIncome(result.state, "0").gold - beforeIncome).toBe(9);
  });

  it("quotes every dock price off the engine, targets-dependent ones included", () => {
    const G = gameplayCity();
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
    const growFood = GROWABLE_POPS.map((pop) => getGrowPopCost(G, "0", pop).food ?? 0);
    expect(priceOf("grow")).toEqual([
      { span: { resource: "food", min: Math.min(...growFood), max: Math.max(...growFood) } },
    ]);

    G.activeLaws.push({ cardId: "tenant-rights", author: "0", enactedYear: G.year, order: 0 });
    expect(priceOf("grow")).toEqual([{ span: { resource: "gold", min: 2, max: 3 } }]);
    G.activeLaws = [];

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
        amounts: getFundExpeditionStatus(G, "0", EXPEDITION_TABLES[0].id).cost,
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
