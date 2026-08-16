import type { BuildingDefinition, Resources, Settlement } from "../../../game/types";
import { formatNumber } from "../../../ui/formatters";
import { RESOURCE_ORDER } from "../../../ui/resourceVisuals";

/**
 * Why a place says no, in words short enough to wear on a control.
 *
 * Two surfaces now ask the same question about the same building in the same
 * settlement — the Build page, one card per building with its places under it,
 * and the Cities page's socket picker, one settlement with its buildings under
 * it. They are the same decision read from opposite ends, so a player who sees
 * `SIKYON · NO SLOT` on one and something else on the other would be entitled to
 * believe the game disagrees with itself.
 *
 * The phrasings were fought for once (`PAR-BUILD-2`) and they live here so there
 * is exactly one of each. The facts come from state — the engine's own
 * `ActionStatus` decides *whether* a thing is refused; this decides only how to
 * say it in the space a button has.
 */

/**
 * The WHOLE part of a price you cannot pay: "short by 1 wood + 11 stone".
 *
 * This used to return on the first short resource in `RESOURCE_ORDER` and word
 * it as a complete requirement — "needs 1 more wood" — so a Gymnasion at 4 wood
 * and 12 stone told a player holding 3 wood and 1 stone to buy one plank, and
 * then refused the press anyway. Five of nine cards named wood and hid stone.
 * "Short by" is deliberate: "needs N" can be read as the price itself, and the
 * phrase has to survive being stamped on a button in caps.
 *
 * It names only what the price actually charges, because that is the test the
 * engine applies (`canAfford` walks the cost's own keys, not all six). Treating
 * an uncharged resource as costing zero made every building in the game read
 * "short by … + 1 happiness" the moment a player went one point into
 * discontent — a debt the engine was not collecting, on nine cards at once.
 */
export function shortfallOf(cost: Resources | Partial<Resources>, held: Resources): string | null {
  const gaps = RESOURCE_ORDER.filter(
    (resource) => cost[resource] !== undefined && held[resource] < (cost[resource] ?? 0),
  ).map((resource) => `${formatNumber((cost[resource] ?? 0) - held[resource])} ${resource}`);

  return gaps.length === 0 ? null : `short by ${gaps.join(" + ")}`;
}

/**
 * The one refusal a settlement gives a building, in the order the reasons bite.
 *
 * `shortfall` is passed in rather than computed because the two callers price
 * the same building from honestly different places: the Build card prints one
 * cost for the whole row (the first willing settlement's), the socket picker
 * prices the settlement you actually opened it on. Each hands in the shortfall
 * that matches the number it printed, so neither can name a gap against a price
 * the player cannot see.
 *
 * The level cap is counted the way the engine counts it — copies against
 * `maxLevel` — because "this settlement already has one" and "this settlement
 * cannot have another" stopped being the same sentence when buildings gained
 * levels, and a Marketplace at 1 of 2 was being refused as "already raised"
 * while the engine was perfectly willing to raise the second.
 */
export function buildRefusal(
  settlement: Settlement,
  building: BuildingDefinition,
  open: number,
  shortfall: string | null,
): string {
  if (open <= 0) {
    return "no slot";
  }

  const copies = settlement.buildings.filter((existing) => existing === building.id).length;

  if (copies >= building.maxLevel) {
    return building.maxLevel === 1 ? "already raised" : "at max level";
  }

  return shortfall ?? "cannot raise here";
}
