import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createModeDefinition } from "../game/definition";
import { POLITICIANS, RESOLUTION_CARDS } from "../game/assembly/deck";
import { getAuthoredGameContent, getBuildings, getTerrainDeck } from "../game/content";
import { PLAYER_EVENT_CARDS, YEAR_CARDS, EXPEDITION_TABLES, RIOT_TABLE } from "../game/data";
import { settlementNetYield } from "../game/economy/income";
import { settlementBuildingHappiness } from "../game/happiness";
import { materialTile, owned, scenario } from "../game/testing/scenario";
import { Aggregator } from "../sim/telemetry";
import {
  presentBuildingEffect,
  presentDirectiveEffect,
  presentEventEffect,
  presentLawEffect,
  presentTableEffect,
  presentYearCard,
} from "../ui/effects";

import {
  ACTIVE_EFFECT_MECHANIC_PARITY,
  BUILDING_CONTENT_IDS,
  BUILDING_EFFECT_PARITY,
  CONTENT_MANIFEST,
  NATIONAL_IDEA_CONTENT_IDS,
  DIRECTIVE_CONTENT_IDS,
  DIRECTIVE_EFFECT_PARITY,
  EVENT_EFFECT_PARITY,
  EVENT_TABLE_CONTENT_IDS,
  FEATURE_PARITY,
  LAW_CONTENT_IDS,
  LAW_EFFECT_PARITY,
  PARITY_BEHAVIOR_FIXTURES,
  PLAYER_EVENT_CONTENT_IDS,
  POLITICIAN_CONTENT_IDS,
  RESOLUTION_CONTENT_IDS,
  RIOT_INSURANCE_CONTENT_IDS,
  YEAR_CARD_CONTENT_IDS,
  TABLE_EFFECT_PARITY,
  TERRAIN_CONTENT_IDS,
  VICTORY_CARD_CONTENT_IDS,
} from "./featureParity";
import { VICTORY_CARDS } from "../game/victory";

const AUTHORED_CONTENT = getAuthoredGameContent();

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

function unique(values: readonly string[]): string[] {
  return sorted([...new Set(values)]);
}

function expectPresentation(presentation: { text: string; tone: string }): void {
  expect(presentation.text.trim().length).toBeGreaterThan(0);
  expect(["positive", "negative", "muted", "neutral"]).toContain(presentation.tone);
}

describe("feature and content parity manifests", () => {
  it("keeps every declared axis and behavioral evidence pointer live", () => {
    const evidence = new Map<string, Set<string>>();
    const addEvidence = (entry: { implementation: string; evidence: string }) => {
      const values = evidence.get(entry.implementation) ?? new Set<string>();
      values.add(entry.evidence);
      evidence.set(entry.implementation, values);
    };

    for (const fixture of Object.values(PARITY_BEHAVIOR_FIXTURES)) {
      addEvidence(fixture);
    }

    for (const registry of [
      EVENT_EFFECT_PARITY,
      TABLE_EFFECT_PARITY,
      LAW_EFFECT_PARITY,
      DIRECTIVE_EFFECT_PARITY,
      BUILDING_EFFECT_PARITY,
      ACTIVE_EFFECT_MECHANIC_PARITY,
    ]) {
      for (const coverage of Object.values(registry)) {
        addEvidence(coverage.engine);
        addEvidence(coverage.frontend);
        addEvidence(coverage.simulation.observation);
        addEvidence(coverage.simulation.valuation);
        addEvidence(coverage.simulation.telemetry);
        expect(coverage.behaviorFixtures.length).toBeGreaterThan(0);
        for (const fixture of coverage.behaviorFixtures) {
          expect(PARITY_BEHAVIOR_FIXTURES).toHaveProperty(fixture);
        }
      }
    }

    for (const entry of [...Object.values(CONTENT_MANIFEST), ...Object.values(FEATURE_PARITY)]) {
      addEvidence(entry.engine);
      addEvidence(entry.frontend);
      addEvidence(entry.simulation);
      addEvidence(entry.telemetry);
      expect(entry.behaviorFixtures.length).toBeGreaterThan(0);
      for (const fixture of entry.behaviorFixtures) {
        expect(PARITY_BEHAVIOR_FIXTURES).toHaveProperty(fixture);
      }
    }

    for (const [implementation, tokens] of evidence) {
      const source = readFileSync(resolve(process.cwd(), implementation), "utf8");
      for (const token of tokens) {
        expect(source, implementation + " must contain manifest evidence: " + token).toContain(
          token,
        );
      }
    }
  });

  it("matches every shipped content id and effect to the manifests", () => {
    const tables = [RIOT_TABLE, ...EXPEDITION_TABLES];
    expect(sorted(AUTHORED_CONTENT.nationalIdeas.map((idea) => idea.id))).toEqual(
      sorted(NATIONAL_IDEA_CONTENT_IDS),
    );

    expect(sorted(getBuildings(AUTHORED_CONTENT).map((building) => building.id))).toEqual(
      sorted(BUILDING_CONTENT_IDS),
    );
    expect(unique(getTerrainDeck(AUTHORED_CONTENT).map((entry) => entry.terrain))).toEqual(
      sorted(TERRAIN_CONTENT_IDS),
    );
    expect(sorted(YEAR_CARDS.map((card) => card.id))).toEqual(sorted(YEAR_CARD_CONTENT_IDS));
    expect(sorted(PLAYER_EVENT_CARDS.map((card) => card.id))).toEqual(
      sorted(PLAYER_EVENT_CONTENT_IDS),
    );
    expect(sorted(tables.map((table) => table.id))).toEqual(sorted(EVENT_TABLE_CONTENT_IDS));
    expect(sorted(RIOT_TABLE.insurance?.map((option) => option.id) ?? [])).toEqual(
      sorted(RIOT_INSURANCE_CONTENT_IDS),
    );
    expect(sorted(POLITICIANS.map((politician) => politician.id))).toEqual(
      sorted(POLITICIAN_CONTENT_IDS),
    );
    expect(sorted(RESOLUTION_CARDS.map((card) => card.id))).toEqual(sorted(RESOLUTION_CONTENT_IDS));
    expect(sorted(VICTORY_CARDS.map((card) => card.id))).toEqual(sorted(VICTORY_CARD_CONTENT_IDS));

    for (const entry of [...Object.values(CONTENT_MANIFEST), ...Object.values(FEATURE_PARITY)]) {
      expect(entry.ids).toHaveLength(new Set(entry.ids).size);
    }

    const eventEffects = PLAYER_EVENT_CARDS.flatMap((card) => card.effects);
    expect(unique(eventEffects.map((effect) => effect.type))).toEqual(
      sorted(Object.keys(EVENT_EFFECT_PARITY)),
    );
    expect(
      unique(
        tables.flatMap((table) =>
          table.rows.flatMap((row) => row.effects.map((effect) => effect.type)),
        ),
      ),
    ).toEqual(sorted(Object.keys(TABLE_EFFECT_PARITY)));

    const laws = RESOLUTION_CARDS.filter((card) => card.kind === "law");
    const directives = RESOLUTION_CARDS.filter((card) => card.kind === "directive");
    expect(sorted(laws.map((card) => card.id))).toEqual(sorted(LAW_CONTENT_IDS));
    expect(sorted(directives.map((card) => card.id))).toEqual(sorted(DIRECTIVE_CONTENT_IDS));
    expect(
      unique(
        [...laws, ...AUTHORED_CONTENT.nationalIdeas].flatMap((card) =>
          card.effects.map((effect) => effect.type),
        ),
      ),
    ).toEqual(sorted(Object.keys(LAW_EFFECT_PARITY)));
    expect(unique(directives.flatMap((card) => card.effects.map((effect) => effect.type)))).toEqual(
      sorted(Object.keys(DIRECTIVE_EFFECT_PARITY)),
    );
    expect(
      unique(
        getBuildings(AUTHORED_CONTENT).flatMap((building) =>
          building.effects.map((effect) => effect.type),
        ),
      ),
    ).toEqual(sorted(Object.keys(BUILDING_EFFECT_PARITY)));
  });

  it("projects every authored effect through a non-empty typed frontend presentation", () => {
    const eventEffects = PLAYER_EVENT_CARDS.flatMap((card) => card.effects);
    for (const effect of eventEffects) expectPresentation(presentEventEffect(effect));
    for (const card of YEAR_CARDS) expectPresentation(presentYearCard(card));

    for (const table of [RIOT_TABLE, ...EXPEDITION_TABLES]) {
      for (const effect of table.rows.flatMap((row) => row.effects)) {
        expectPresentation(presentTableEffect(effect));
      }
    }

    for (const card of RESOLUTION_CARDS) {
      if (card.kind === "law") {
        for (const effect of card.effects) expectPresentation(presentLawEffect(effect));
      } else {
        for (const effect of card.effects) expectPresentation(presentDirectiveEffect(effect));
      }
    }

    for (const building of getBuildings(AUTHORED_CONTENT)) {
      for (const effect of building.effects) expectPresentation(presentBuildingEffect(effect));
    }
  });

  it("routes shared Step 3 surfaces through the canonical typed presenters", () => {
    const consumers = [
      {
        implementation: "src/components/board/assembly/AssemblyPresentation.tsx",
        evidence: ["presentLawEffect", "presentDirectiveEffect", "MechanicsDetails"],
      },
      {
        implementation: "src/components/frame/realm/BuildPage.tsx",
        evidence: ["presentBuildingEffects"],
      },
      {
        implementation: "src/components/frame/Alarms.tsx",
        evidence: ["presentActiveEffect"],
      },
    ];

    for (const consumer of consumers) {
      const source = readFileSync(resolve(process.cwd(), consumer.implementation), "utf8");
      for (const token of consumer.evidence) {
        expect(source, `${consumer.implementation} must consume ${token}`).toContain(token);
      }
    }
  });

  it("routes every building effect through its authoritative engine query", () => {
    const builder = scenario().withResources("0", "wealthy");
    const G = builder.build();
    const land = materialTile(G);
    builder
      // Two slaves on a three-slot tile: a building takes the third slot and both
      // slaves keep working, so each delta below is the building's own.
      .withSettlement("0", land.id, "city", { citizens: 2, freemen: 3, slaves: 2 })
      .mutate((state) => {
        state.phase = "gameplay";
        state.currentPlayer = "0";
        state.pendingPlayerEvent = null;
        state.pendingRiot = null;
      });

    const settlement = owned(G, land.id, "0");
    const incomeWith = (building: (typeof BUILDING_CONTENT_IDS)[number]) => {
      settlement.buildings = [building];
      return settlementNetYield(land, settlement, G.ruleset);
    };
    settlement.buildings = [];
    const base = settlementNetYield(land, settlement, G.ruleset);
    const primary = land.resource.type;

    // Three freemen, two citizens, two working slaves: a class building adds one each.
    expect(incomeWith("marketplace").gold - base.gold).toBe(3);
    expect(incomeWith("forum").influence - base.influence).toBe(2);
    expect(land.slots).toBe(3);
    expect(incomeWith("estate")[primary] - base[primary]).toBe(2);
    const temple = incomeWith("temple");
    expect(temple.influence - base.influence).toBe(0);
    expect(settlementBuildingHappiness(G, settlement)).toBe(1);
    expect(incomeWith("granary").food - base.food).toBe(2);
    // The Port's fact is its claim; it adds nothing to a settlement's income.
    expect(incomeWith("port")).toEqual(base);
  });

  it("zero-fills manifested building and event content in telemetry", () => {
    const report = new Aggregator().buildReport({
      games: 0,
      turns: 0,
      policy: "fixture",
      mode: "standard",
      boardLayout: "classic",
      baseSeed: 0,
      opening: "policy",
      botSeedRule: "fixture",
      rulesetPatch: null,
      definition: createModeDefinition("standard").identity,
      generatedAt: "2026-07-29T00:00:00.000Z",
    });

    expect(Object.keys(report.buildings)).toEqual([...BUILDING_CONTENT_IDS]);
    expect(Object.keys(report.events.player)).toEqual([...PLAYER_EVENT_CONTENT_IDS]);
    expect(Object.keys(report.events.year)).toEqual([...YEAR_CARD_CONTENT_IDS]);
    expect(
      Object.values(report.buildings).every((entry) => entry.built === 0 && entry.perGame === 0),
    ).toBe(true);
    expect(Object.values(report.events.player).every((count) => count === 0)).toBe(true);
    expect(Object.values(report.events.year).every((count) => count === 0)).toBe(true);
  });
});
