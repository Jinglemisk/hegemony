import type { Ruleset } from "../../../game/ruleset";
import { settlementBuildingSlots } from "../../../game/rules";
import type { OwnedHolding } from "../types";

/**
 * How much ground a settlement has, and how much of it still stands open.
 *
 * The count and the drawing of a slot are one idea (see `BuildingSockets`), but
 * the Build page needs the count without the drawing — for its heading and for a
 * target that has to say "no slot" — so the arithmetic sits here on its own and
 * both surfaces read the engine's `settlementBuildingSlots`, never a restatement
 * of the rule.
 */
export function slotsOf({ tile, settlement }: OwnedHolding, ruleset: Ruleset) {
  const slots = settlementBuildingSlots(tile, settlement, ruleset);

  return { slots, built: settlement.buildings.length, open: slots - settlement.buildings.length };
}
