import type {
  BuildingId,
  GrowablePop,
  HegemonyState,
  PlayerId,
  Resources,
  Settlement,
} from "../types";
import { applyLawActionCost } from "../assembly/laws";

export type CostedAction = "buildBuilding" | "foundColony" | "upgradeColonyToCity";

export function getAdjustedActionCost(
  G: HegemonyState,
  playerID: PlayerId,
  action: CostedAction,
  baseCost: Partial<Resources>,
  buildingId?: BuildingId,
): Partial<Resources> {
  return applyLawActionCost(G, playerID, action, { ...baseCost }, { buildingId });
}

export function getGrowPopCost(
  G: HegemonyState,
  playerID: PlayerId,
  settlement: Settlement,
  pop: GrowablePop,
): Partial<Resources> {
  return applyLawActionCost(
    G,
    playerID,
    "growPop",
    { ...G.ruleset.growPopCosts[pop] },
    {
      scope: settlement.kind === "colony" ? "colony" : "city",
      pop,
    },
  );
}
