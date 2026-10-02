import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Alarms } from "../components/frame/Alarms";
import { collectIncome } from "../game/actions";
import { enactForEval, openAssembly } from "../game/assembly";
import { consumeLawFreeAction } from "../game/assembly/laws";
import {
  ACTIVE_EFFECT_KINDS,
  EVENT_EFFECT_ACTIVE_EFFECT_HANDLING,
  countActiveEffectsByKind,
  getActiveEffects,
  type ActiveEffectDescriptor,
} from "../game/activeEffects";
import { PLAYER_EVENT_CARDS, SEASONAL_EVENT_CARDS } from "../game/data";
import { calculateIncomeBreakdown } from "../game/economy/income";
import { projectForPlayer } from "../game/projection";
import {
  drawSeasonalEvent,
  getEventEffectChoices,
  resolvePendingPlayerEvent,
} from "../game/events";
import { expireTurnEventModifiers, startNewSeason } from "../game/season";
import { materialTile, scenario } from "../game/testing/scenario";
import type {
  EventCard,
  HegemonyState,
  Pops,
  TableRollRecord,
  TimedHappinessModifier,
} from "../game/types";
import { applyUnrestUpkeep, unrestStatus } from "../game/unrest";
import { masterPolicy, projectPolicyHorizon } from "../sim/policies";
import { createSimRng } from "../sim/rng";
import { snapshotTurn } from "../sim/telemetry";
import { presentActiveEffect, presentActiveEffects } from "../ui/effects";
import { allocateEntityId } from "../game/entity";

const EMPTY_POPS: Pops = { citizens: 0, freemen: 0, slaves: 0 };

function stateWithSettlement(pops: Pops = EMPTY_POPS): HegemonyState {
  const G = scenario().build();
  const target = materialTile(G);
  target.settlements.push({
    id: allocateEntityId(G, "settlement"),
    tileId: target.id,
    owner: "0",
    kind: "capital",
    buildings: [],
    pops: { ...pops },
  });
  G.players["0"].settlements.push(target.id);
  G.phase = "gameplay";
  G.currentPlayer = "0";
  return G;
}

function seasonalCard(effects: EventCard["effects"]): EventCard {
  return {
    id: "parity-season",
    deck: "seasonal",
    name: "Parity Season",
    count: 1,
    text: "Parity Season",
    timing: "season",
    effects,
  };
}

function omenRecord(): TableRollRecord {
  return {
    tableId: "omen",
    playerID: "0",
    roll: 6,
    modified: 6,
    modifier: 0,
    rowLabel: "Abundant harvest",
    outcomes: [],
    season: 1,
  };
}

function timedModifier(
  sourceName: string,
  amountPerTurn: number,
  turnsRemaining: number,
): TimedHappinessModifier {
  return {
    amountPerTurn,
    turnsRemaining,
    sourceCardId: "test-" + sourceName.toLowerCase().replaceAll(" ", "-"),
    sourceName,
    sourceDeck: "player",
    sourceScope: "activePlayer",
  };
}

function plantLaw(G: HegemonyState, cardId: string, author: "0" | "1" = "0") {
  G.activeLaws.push({
    cardId,
    author,
    enactedSeason: G.season,
    order: G.lawOrder++,
  });
}

function renderAlarms(G: HegemonyState, activeEffects: ActiveEffectDescriptor[]): string {
  return renderToStaticMarkup(
    createElement(Alarms, {
      content: G.definition.content,
      effects: activeEffects,
      popLossThreshold: G.ruleset.economy.unrest.popLossThreshold,
      unrest: unrestStatus(G, "0"),
    }),
  );
}

function cardSeason(card: EventCard): number {
  const numbers = { spring: 1, summer: 2, autumn: 3, winter: 4 };
  return numbers[card.seasons?.[0] ?? "spring"];
}

function effectByKind(
  G: HegemonyState,
  kind: ActiveEffectDescriptor["kind"],
  playerID: "0" | "1" = "0",
) {
  return getActiveEffects(G, playerID).filter((effect) => effect.kind === kind);
}

describe("canonical active-effect selector", () => {
  it("reports source, scope, mechanics, duration, and expiry for persistent state", () => {
    const G = stateWithSettlement({ citizens: 10, freemen: 0, slaves: 0 });
    G.players["0"].incomeSuppressedTurns = 1;
    G.players["0"].timedHappinessModifiers = [timedModifier("Public Shame", -2, 2)];
    G.players["0"].actionCostDiscounts = [
      {
        id: "coupon",
        sourceCardId: "craftsmen-guild",
        label: "Craftsmen's Guild",
        action: "buildBuilding",
        buildingId: "estate",
        resource: "stone",
        amount: 2,
        consume: "nextMatchingAction",
      },
    ];
    G.activeSeasonEvent = {
      card: seasonalCard([
        {
          type: "incomeModifier",
          scope: "activePlayer",
          resource: "gold",
          amount: 3,
          duration: "season",
        },
      ]),
      season: G.season,
      playerID: "0",
    };
    G.yearOmen = {
      record: omenRecord(),
      label: "Abundant harvest",
      year: 1,
      effects: [{ type: "yearIncomeModifier", resource: "food", amount: 2 }],
    };
    G.activeLaws.push({
      cardId: "land-reform",
      author: "0",
      enactedSeason: G.season,
      order: G.lawOrder++,
    });
    G.pendingIsonomiaTarget = "0";

    // A strike eats nothing, so the hunger warning waits for it to end: read the
    // struck state and the same state once the strike is over.
    const working = structuredClone(G);
    working.players["0"].incomeSuppressedTurns = 0;
    const effects = [...getActiveEffects(G, "0"), ...getActiveEffects(working, "0")];
    const kinds = new Set(effects.map((effect) => effect.kind));
    expect(effectByKind(G, "hunger")).toHaveLength(0);

    expect(kinds).toEqual(
      new Set([
        "incomeSuppression",
        "hunger",
        "timedHappiness",
        "seasonalModifier",
        "yearlyOmen",
        "actionDiscount",
        "standingLaw",
        "nextAssembly",
      ]),
    );

    for (const effect of effects) {
      expect(effect.source.label.trim(), effect.id).not.toBe("");
      expect(effect.mechanics.length, effect.id).toBeGreaterThan(0);
      expect(effect.duration.expiry, effect.id).toBeTypeOf("string");
      expect(effect.scope.kind, effect.id).toBeTypeOf("string");
    }
  });

  it("keeps active-player seasonal descriptors and income calculations on the revealing seat", () => {
    const G = stateWithSettlement();
    G.activeSeasonEvent = {
      card: seasonalCard([
        {
          type: "incomeModifier",
          scope: "activePlayer",
          resource: "gold",
          amount: 5,
          duration: "season",
        },
      ]),
      season: G.season,
      playerID: "1",
    };

    expect(effectByKind(G, "seasonalModifier", "0")).toHaveLength(0);
    const descriptor = effectByKind(G, "seasonalModifier", "1")[0];
    expect(descriptor.scope).toEqual({ kind: "activePlayer", playerID: "1" });
    expect(descriptor.mechanics).toEqual([{ type: "resourceIncome", resource: "gold", amount: 5 }]);

    const contribution = calculateIncomeBreakdown(G, "1")
      .filter((line) => line.source === "Parity Season" && line.resource === "gold")
      .reduce((sum, line) => sum + line.amount, 0);
    expect(contribution).toBe(5);
  });

  it("expires countdown and coupon state at the same lifecycle boundaries it declares", () => {
    const G = stateWithSettlement();
    G.players["0"].resources.happiness = 20;
    G.players["0"].incomeSuppressedTurns = 1;
    G.players["0"].timedHappinessModifiers = [timedModifier("Passing Cloud", -1, 1)];
    G.players["0"].actionCostDiscounts = [
      {
        id: "expiring",
        sourceCardId: "expiring",
        label: "Expiring Coupon",
        action: "foundColony",
        resource: "wood",
        amount: 2,
        consume: "nextMatchingAction",
      },
    ];

    expect(effectByKind(G, "incomeSuppression")[0].duration.expiry).toBe("afterIncomeCollections");
    collectIncome(G, "0", "automatic");
    expect(effectByKind(G, "incomeSuppression")).toHaveLength(0);

    applyUnrestUpkeep(G, "0");
    expect(effectByKind(G, "timedHappiness")).toHaveLength(0);

    expireTurnEventModifiers(G, "0");
    expect(effectByKind(G, "actionDiscount")).toHaveLength(0);
  });

  it("keeps timed-event card identity, deck, and original scope from real resolution", () => {
    const plague = SEASONAL_EVENT_CARDS.find((card) => card.id === "season-plague")!;
    const G = stateWithSettlement();
    G.season = cardSeason(plague);
    G.activeSeasonEvent = null;
    G.seasonalDrawPile = [plague];

    drawSeasonalEvent(G);

    const descriptor = effectByKind(G, "timedHappiness")[0];
    expect(descriptor.source).toEqual({
      kind: "seasonalEvent",
      id: "season-plague",
      label: "Plague",
    });
    expect(descriptor.scope).toEqual({ kind: "allPlayers" });
    expect(effectByKind(G, "timedHappiness", "1")[0].source.id).toBe("season-plague");
  });

  it("shows an annual Law coupon only while it is unspent and refreshes it at the new year", () => {
    const G = stateWithSettlement();
    plantLaw(G, "monumental-code");

    const annual = () =>
      getActiveEffects(G, "0").find((effect) => effect.id.includes("annual:buildBuilding"));
    expect(annual()?.duration.expiry).toBe("afterMatchingLawActionOrYearEnd");
    expect(presentActiveEffect(annual()!).duration).toBe("Until used or year end");

    consumeLawFreeAction(G, "0", "buildBuilding");
    expect(annual()).toBeUndefined();
    expect(getActiveEffects(G, "0").some((effect) => effect.source.id === "monumental-code")).toBe(
      true,
    );

    G.season = 4;
    startNewSeason(G);
    expect(annual()).toBeDefined();
  });

  it("expires season, omen, Law, and Isonomia descriptors through their engine lifecycles", () => {
    const G = stateWithSettlement();
    G.activeSeasonEvent = {
      card: seasonalCard([
        {
          type: "incomeModifier",
          scope: "allPlayers",
          resource: "gold",
          amount: 2,
          duration: "season",
        },
      ]),
      season: G.season,
      playerID: "0",
    };
    G.yearOmen = {
      record: omenRecord(),
      label: "Old omen",
      year: 1,
      effects: [{ type: "yearIncomeModifier", resource: "food", amount: 2 }],
    };
    const seasonalId = effectByKind(G, "seasonalModifier")[0].id;
    const omenId = effectByKind(G, "yearlyOmen")[0].id;

    G.season = 4;
    startNewSeason(G);
    expect(getActiveEffects(G, "0").some((effect) => effect.id === seasonalId)).toBe(false);
    expect(getActiveEffects(G, "0").some((effect) => effect.id === omenId)).toBe(false);

    plantLaw(G, "land-reform");
    expect(getActiveEffects(G, "0").some((effect) => effect.source.id === "land-reform")).toBe(
      true,
    );
    enactForEval(G, { kind: "repeal", cardId: "land-reform", proposer: "0" });
    expect(getActiveEffects(G, "0").some((effect) => effect.source.id === "land-reform")).toBe(
      false,
    );

    G.pendingIsonomiaTarget = "0";
    expect(effectByKind(G, "nextAssembly")).toHaveLength(1);
    openAssembly(G, "0");
    expect(G.assembly?.isonomiaTarget).toBe("0");
    expect(effectByKind(G, "nextAssembly")).toHaveLength(0);
  });
});

describe("persistent event content inventory", () => {
  it("projects every season-standing effect in authored seasonal content", () => {
    let exercised = 0;

    for (const card of SEASONAL_EVENT_CARDS) {
      const expected = card.effects.filter((effect) => {
        const handling = EVENT_EFFECT_ACTIVE_EFFECT_HANDLING[effect.type];
        if (handling === "activeSeason") return true;
        if (handling !== "activeSeasonWhenMarked") return false;
        return (
          (effect.type === "incomeModifier" || effect.type === "scaledHappinessDelta") &&
          effect.duration === "season"
        );
      });
      if (expected.length === 0) continue;

      const G = stateWithSettlement({ citizens: 2, freemen: 1, slaves: 0 });
      G.activeSeasonEvent = { card, season: G.season, playerID: "0" };
      const descriptors = getActiveEffects(G, "0").filter(
        (effect) => effect.source.kind === "seasonalEvent" && effect.source.id === card.id,
      );

      expect(descriptors, card.id).toHaveLength(expected.length);
      exercised += expected.length;
    }

    expect(exercised).toBeGreaterThan(0);
  });

  it("materializes every authored player timed effect and discount through event resolution", () => {
    let exercised = 0;

    for (const card of PLAYER_EVENT_CARDS) {
      for (const [choiceIndex, effects] of getEventEffectChoices(card).entries()) {
        const expected = effects.filter((effect) => {
          const handling = EVENT_EFFECT_ACTIVE_EFFECT_HANDLING[effect.type];
          return (
            handling === "materializedTimedHappiness" || handling === "materializedActionDiscount"
          );
        });
        if (expected.length === 0) continue;

        const G = stateWithSettlement();
        G.pendingPlayerEvent = { card, playerID: "0" };
        expect(resolvePendingPlayerEvent(G, "0", undefined, choiceIndex).ok, card.id).toBe(true);
        const descriptors = getActiveEffects(G, "0").filter(
          (effect) => effect.source.id === card.id,
        );

        expect(descriptors, card.id + " option " + choiceIndex).toHaveLength(expected.length);
        exercised += expected.length;
      }
    }

    expect(exercised).toBeGreaterThan(0);
  });

  it("materializes every authored seasonal timed effect through the real draw path", () => {
    let exercised = 0;

    for (const card of SEASONAL_EVENT_CARDS) {
      const expected = card.effects.filter(
        (effect) =>
          EVENT_EFFECT_ACTIVE_EFFECT_HANDLING[effect.type] === "materializedTimedHappiness",
      );
      if (expected.length === 0) continue;

      const G = stateWithSettlement();
      G.season = cardSeason(card);
      G.activeSeasonEvent = null;
      G.seasonalDrawPile = [card];
      drawSeasonalEvent(G);
      const descriptors = getActiveEffects(G, "0").filter((effect) => effect.source.id === card.id);

      expect(descriptors, card.id).toHaveLength(expected.length);
      exercised += expected.length;
    }

    expect(exercised).toBeGreaterThan(0);
  });
});

describe("frontend active-effect parity", () => {
  it("renders the same canonical words through the realm's alarms", () => {
    const G = stateWithSettlement();
    G.players["0"].timedHappinessModifiers = [timedModifier("Public Shame", -2, 2)];
    const descriptors = getActiveEffects(G, "0");
    const alarms = renderAlarms(G, descriptors);

    expect(alarms).toContain('class="alarms"');
    for (const descriptor of descriptors) {
      if (descriptor.kind === "seasonalModifier" || descriptor.kind === "standingLaw") continue;
      expect(alarms).toContain(presentActiveEffect(descriptor).accessibleText);
    }
  });

  it("preserves every scoped Law qualifier in the shared frontend presentation", () => {
    const G = stateWithSettlement();
    plantLaw(G, "guild-charter");
    plantLaw(G, "master-builders");
    const presentations = presentActiveEffects(getActiveEffects(G, "0"));
    const guild = presentations.find((effect) => effect.source === "Guild Charter")!;
    const builders = presentations.find((effect) => effect.source === "Master Builders")!;

    expect(guild.text).toContain("grow pop in cities: -3 Food cost");
    expect(guild.text).toContain("grow pop in colonies: +2 Food cost");
    for (const building of ["Temple", "Forum"]) {
      expect(builders.text).toContain(building);
    }
  });
});

describe("simulation and AI active-effect parity", () => {
  it("clearly avoids skipped income by removing suppressed collections from its horizon", () => {
    const safe = stateWithSettlement({ citizens: 0, freemen: 1, slaves: 0 });
    const struck = structuredClone(safe);
    struck.players["0"].incomeSuppressedTurns = 1;

    const safeProjection = projectPolicyHorizon(safe, "0", 2);
    const struckProjection = projectPolicyHorizon(struck, "0", 2);

    expect(struckProjection.resources.gold).toBeLessThan(safeProjection.resources.gold);
  });

  it("clearly values beneficial timed mood and prices harmful timed mood", () => {
    const base = stateWithSettlement();
    const blessed = structuredClone(base);
    const harmed = structuredClone(base);
    blessed.players["0"].timedHappinessModifiers = [timedModifier("Festival", 2, 2)];
    harmed.players["0"].timedHappinessModifiers = [timedModifier("Shame", -2, 2)];

    const neutral = projectPolicyHorizon(base, "0", 2).resources.happiness;
    expect(projectPolicyHorizon(blessed, "0", 2).resources.happiness).toBe(neutral + 4);
    expect(projectPolicyHorizon(harmed, "0", 2).resources.happiness).toBe(neutral - 4);
  });

  it("makes the master policy use calm against harmful mood and avoid it against beneficial mood", () => {
    const choose = (modifier: TimedHappinessModifier) => {
      const G = scenario().build();
      G.phase = "gameplay";
      G.currentPlayer = "0";
      Object.assign(G.players["0"].resources, {
        wood: 0,
        stone: 0,
        gold: 0,
        food: 0,
        influence: 4,
        // One step above the riot line: calm lasts a single upkeep, so it is worth
        // buying only when the next one would cross.
        happiness: -4,
      });
      G.players["0"].timedHappinessModifiers = [modifier];

      return masterPolicy.choose(
        projectForPlayer(G.definition, G, "0"),
        [{ type: "civicCalm", payment: "influence" }, { type: "endTurn" }],
        createSimRng(1),
      );
    };

    expect(choose(timedModifier("Shame", -2, 3)).type).toBe("civicCalm");
    expect(choose(timedModifier("Festival", 2, 3)).type).toBe("endTurn");
  });
  it("handles the safe edge and the hunger edge deterministically", () => {
    const safe = stateWithSettlement();
    const hungry = stateWithSettlement({ citizens: 10, freemen: 0, slaves: 0 });
    // Ten mouths against eight stored food: two go unfed at the first income.
    hungry.players["0"].resources.food = 8;

    expect(projectPolicyHorizon(safe, "0", 1).expectedStarvationPopLoss).toBe(0);
    expect(projectPolicyHorizon(hungry, "0", 1).expectedStarvationPopLoss).toBe(2);
  });

  it("recalculates food after projected hunger and matches the engine on the review case", () => {
    const G = stateWithSettlement({ citizens: 0, freemen: 3, slaves: 0 });
    const engine = structuredClone(G);
    // No event cards: the review case is income alone.
    engine.playerDrawPile = [];
    engine.playerDiscardPile = [];

    for (let income = 0; income < 6; income += 1) {
      engine.players["0"].collectedThisTurn = false;
      expect(collectIncome(engine, "0").ok).toBe(true);
    }

    // Twelve food feeds three freemen for four incomes; the fifth leaves all three unfed.
    const actual = engine.players["0"].popsLostToHunger;
    expect(actual).toBe(3);
    expect(projectPolicyHorizon(G, "0", 6).expectedStarvationPopLoss).toBe(actual);
  });
  it("records the selector's exhaustive kind counts in snapshots", () => {
    const G = stateWithSettlement();
    G.players["0"].incomeSuppressedTurns = 1;
    const expected = countActiveEffectsByKind(getActiveEffects(G, "0"));
    const snapshot = snapshotTurn(G, 0, G.seed);

    expect(snapshot.players["0"].activeEffects).toEqual(expected);
    expect(Object.keys(snapshot.players["0"].activeEffects)).toEqual([...ACTIVE_EFFECT_KINDS]);
  });
});
