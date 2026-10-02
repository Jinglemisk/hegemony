import { buildingGround } from "../../../game/rules";
import type { HegemonyState } from "../../../game/types";
import type { OwnedHolding } from "../types";

/**
 * How much ground a settlement has for buildings, and how much of it still stands
 * open. The count and the drawing of a slot are one idea, but the Build and Cities
 * pages need the count without the drawing, so both read the engine's
 * `buildingGround` here, never a restatement of the rule.
 */
export function slotsOf({ tile, settlement }: OwnedHolding, G: HegemonyState) {
  return buildingGround(G, settlement.owner, tile.id);
}
