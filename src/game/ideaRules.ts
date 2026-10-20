import { getStandingEffects } from "./assembly/laws";
import { isCapital } from "./core/query";
import type { BuildingId, HegemonyState, PlayerId, Settlement } from "./types";

/** A city's slots gained or lost to standing Laws and its owner's Ideas. */
export function standingSlotBonus(G: HegemonyState, settlement: Settlement) {
  if (settlement.kind === "colony") return 0;
  const capital = isCapital(G, settlement.owner, settlement.tileId);
  return getStandingEffects(G, settlement.owner).reduce(
    (n, e) => n + (e.type === "extraSlots" && (e.scope === "city" || capital) ? e.amount : 0),
    0,
  );
}
export function buildingSlotCost(G: HegemonyState, owner: PlayerId, building: BuildingId) {
  return getStandingEffects(G, owner).some(
    (e) => e.type === "slotExempt" && e.building === building,
  )
    ? 0
    : 1;
}
export function occupiedBuildingSlots(G: HegemonyState, settlement: Settlement) {
  return settlement.buildings.reduce((n, b) => n + buildingSlotCost(G, settlement.owner, b), 0);
}
export function colonyPieceBonus(G: HegemonyState, playerID: PlayerId) {
  return getStandingEffects(G, playerID).reduce(
    (n, e) => n + (e.type === "colonyPieces" ? e.amount : 0),
    0,
  );
}
export function playerDole(G: HegemonyState, playerID: PlayerId) {
  const price = getStandingEffects(G, playerID).find((e) => e.type === "dolePrice");
  return { ...G.ruleset.dole, influenceCost: price?.amount ?? G.ruleset.dole.influenceCost };
}
export function votePurchaseLimit(G: HegemonyState, playerID: PlayerId) {
  const limit = getStandingEffects(G, playerID).find((e) => e.type === "votePurchaseLimit");
  return limit?.amount ?? G.ruleset.assembly.briberyCap;
}
