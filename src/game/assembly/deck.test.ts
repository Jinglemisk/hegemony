import { describe, expect, it } from "vitest";
import { BUILDINGS } from "../data";
import { DEFAULT_RULESET } from "../ruleset";
import type { Resource, Resources } from "../types";
import { RESOLUTION_CARDS } from "./deck";
import { GROWS_PER_TURN, SLAVE_UNREST_WEIGHT } from "./laws";
import type { LawCard, LawEffect } from "./types";

/**
 * The deck's grammar, not its balance: every magnitude in deck.ts may move with tuning,
 * so nothing here pins a number. What it pins is that every Law carries a trade-off,
 * read from its typed effects rather than its prose.
 */
const laws = RESOLUTION_CARDS.filter((card): card is LawCard => card.kind === "law");
const rules = DEFAULT_RULESET;

/** A whole price against the one it replaces, resource by resource: a swap is both. */
function priceDirections(cost: Partial<Resources>, base: Partial<Resources>): number[] {
  const resources = new Set([...Object.keys(cost), ...Object.keys(base)]) as Set<Resource>;
  return [...resources].map((resource) => Math.sign((base[resource] ?? 0) - (cost[resource] ?? 0)));
}

/**
 * Which way an effect pushes for the player under it: +1 is an upside, -1 a downside.
 * A whole value reads against the ruleset figure it replaces. The tones of
 * `presentLawEffect` (src/ui/effects.ts) read the same bases; a change to one is a
 * change to both.
 */
function directionsOf(effect: LawEffect): number[] {
  switch (effect.type) {
    case "actionCost": {
      const bases =
        effect.action === "buildBuilding"
          ? (effect.buildingIds ?? []).map((id) => BUILDINGS.find((b) => b.id === id)!.cost)
          : effect.action === "growPop"
            ? [rules.growPopCosts[effect.pop as "slaves" | "freemen"]]
            : effect.action === "promotePop"
              ? [rules.ladder.promoteCosts[effect.pop as "slaves" | "freemen"]]
              : effect.action === "demotePop"
                ? [rules.ladder.demoteCosts[effect.pop as "citizens" | "freemen"]]
                : [rules.actionCosts[effect.action]];
      return bases.flatMap((base) => priceDirections(effect.cost, base));
    }
    case "calmPayment":
      // Gold calm is paid in food instead: the gold is saved and the food spent.
      return [Math.sign(rules.civicCalm.goldCost), -Math.sign(effect.amount)];
    case "colonyCapacity":
      return [Math.sign(effect.amount - rules.settlements.colony.popCapacity)];
    case "popIncome":
      return [Math.sign(effect.amount - (rules.popIncome[effect.pop].flat[effect.resource] ?? 0))];
    case "growLimit":
      return [Math.sign(effect.amount - GROWS_PER_TURN)];
    case "slaveUnrestWeight":
      return [Math.sign(SLAVE_UNREST_WEIGHT - effect.amount)];
    case "dolePrice":
      return [Math.sign(rules.dole.influenceCost - effect.amount)];
    case "buildingForbidden":
    case "buildingIdle":
      return [-1];
    case "buildingFood":
    case "happiness":
    case "settlementIncome":
    case "realmIncome":
    case "extraSlots":
    case "colonyPieces":
    case "acquireResource":
    case "votePurchaseLimit":
    case "colonyBuildings":
    case "colonyLimit":
    case "settlementVotes":
      return [Math.sign(effect.amount)];
    case "onFoundColony":
    case "acquirePop":
    case "onUpgradeCity":
    case "slotExempt":
    case "slaveResource":
      return [1];
  }
}

describe("every Law carries a trade-off", () => {
  it("has both an upside and a downside in its typed effects", () => {
    expect(laws.length).toBeGreaterThan(0);
    for (const law of laws) {
      const directions = law.effects.flatMap(directionsOf);

      // Either two effects buy one thing with another, or one effect is two-sided.
      expect(
        law.effects.length === 1 ? directions.filter(Boolean).length : law.effects.length,
        law.id,
      ).toBeGreaterThanOrEqual(2);
      expect(directions, `${law.id} has no upside`).toContain(1);
      expect(directions, `${law.id} has no downside`).toContain(-1);
    }
  });
});
