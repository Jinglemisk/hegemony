import { describe, expect, it } from "vitest";

import {
  ACTIVE_EFFECT_KINDS,
  countActiveEffectsByKind,
  getActiveEffects,
  type ActiveEffectDescriptor,
} from "../game/activeEffects";
import { collectIncome } from "../game/actions";
import { RESOLUTION_CARDS } from "../game/assembly/deck";
import { calculateIncomeBreakdown } from "../game/economy/income";
import { expireTurnEventModifiers } from "../game/season";
import { materialTile, scenario } from "../game/testing/scenario";
import type { EventCard, HegemonyState, Pops, TableRollRecord } from "../game/types";
import { applyUnrestUpkeep } from "../game/unrest";
import { projectPolicyHorizon } from "../sim/policies";
import { snapshotTurn } from "../sim/telemetry";
import { presentActiveEffect, presentActiveEffects } from "../ui/effects";

const EMPTY_POPS: Pops = { citizens: 0, freemen: 0, slaves: 0 };

function stateWithSettlement(pops: Pops = EMPTY_POPS): HegemonyState {
  const G = scenario().build();
  const target = materialTile(G);
  target.settlements.push({
    owner: "0",
    kind: "capital",
    buildings: [],
    pops: { ...pops },
  });
  G.players["0"].settlements.push(target.id);
  G.phase = "gameplay";
  G.currentPlayer = "0";
  G.players["0"].hasCollectedGameplayIncome = true;
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
    G.players["0"].consecutiveFoodDeficitTurns = 1;
    G.players["0"].timedHappinessModifiers = [
      { source: "Public Shame", amountPerTurn: -2, turnsRemaining: 2 },
    ];
    G.players["0"].actionCostDiscounts = [
      {
        id: "coupon",
        sourceCardId: "craftsmen-guild",
        label: "Craftsmen's Guild",
        action: "buildBuilding",
        buildingId: "workshop",
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
    G.pendingIsonomia = true;

    const effects = getActiveEffects(G, "0");
    const kinds = new Set(effects.map((effect) => effect.kind));

    expect(kinds).toEqual(
      new Set([
        "incomeSuppression",
        "foodDeficit",
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

  it("derives patron effects from the same source-aware Law layer", () => {
    const G = stateWithSettlement();
    const regularLaws = RESOLUTION_CARDS.filter(
      (card) => card.kind === "law" && card.politician === "demosthenes",
    ).slice(0, G.ruleset.assembly.dominanceThreshold);

    for (const card of regularLaws) {
      G.activeLaws.push({
        cardId: card.id,
        author: "0",
        enactedSeason: G.season,
        order: G.lawOrder++,
      });
    }

    const patronage = effectByKind(G, "patronage");
    expect(patronage).toHaveLength(1);
    expect(patronage[0].source.label).toContain("patronage");
    expect(patronage[0].duration.expiry).toBe("whenPatronageChanges");
  });

  it("expires countdown and coupon state at the same lifecycle boundaries it declares", () => {
    const G = stateWithSettlement();
    G.players["0"].resources.happiness = 20;
    G.players["0"].hasCollectedGameplayIncome = false;
    G.players["0"].incomeSuppressedTurns = 1;
    G.players["0"].timedHappinessModifiers = [
      { source: "Passing Cloud", amountPerTurn: -1, turnsRemaining: 1 },
    ];
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
});

describe("frontend active-effect parity", () => {
  it("projects the same source, mechanics, duration, and accessible words for every sibling surface", () => {
    const G = stateWithSettlement();
    G.players["0"].timedHappinessModifiers = [
      { source: "Public Shame", amountPerTurn: -2, turnsRemaining: 2 },
    ];

    const descriptors = getActiveEffects(G, "0");
    const boardPresentation = presentActiveEffects(descriptors);
    const ledgerPresentation = descriptors.map(presentActiveEffect);

    expect(boardPresentation).toEqual(ledgerPresentation);
    expect(boardPresentation[0].accessibleText).toContain(boardPresentation[0].source);
    expect(boardPresentation[0].accessibleText).toContain(boardPresentation[0].duration);
  });
});

describe("simulation and AI active-effect parity", () => {
  it("clearly avoids skipped income by removing suppressed collections from its horizon", () => {
    const safe = stateWithSettlement({ citizens: 1, freemen: 0, slaves: 0 });
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
    blessed.players["0"].timedHappinessModifiers = [
      { source: "Festival", amountPerTurn: 2, turnsRemaining: 2 },
    ];
    harmed.players["0"].timedHappinessModifiers = [
      { source: "Shame", amountPerTurn: -2, turnsRemaining: 2 },
    ];

    const neutral = projectPolicyHorizon(base, "0", 2).resources.happiness;
    expect(projectPolicyHorizon(blessed, "0", 2).resources.happiness).toBe(neutral + 4);
    expect(projectPolicyHorizon(harmed, "0", 2).resources.happiness).toBe(neutral - 4);
  });

  it("handles the safe edge and the starvation edge deterministically", () => {
    const safe = stateWithSettlement();
    const deficit = stateWithSettlement({ citizens: 10, freemen: 0, slaves: 0 });
    deficit.players["0"].consecutiveFoodDeficitTurns =
      deficit.ruleset.economy.unrest.foodDeficitTurnsToStarve - 1;

    expect(projectPolicyHorizon(safe, "0", 1).expectedStarvationPopLoss).toBe(0);
    expect(projectPolicyHorizon(deficit, "0", 1).expectedStarvationPopLoss).toBe(
      deficit.ruleset.economy.unrest.foodDeficitStarvePopLoss,
    );
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
