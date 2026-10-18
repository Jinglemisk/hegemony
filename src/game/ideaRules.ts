import { getStandingEffects, type RulesSource } from "./assembly/laws";
import type { BuildingId, HegemonyState, PlayerId, Settlement } from "./types";

export function ideaSlotBonus(source: RulesSource | undefined, settlement: Settlement) {
  if (!source || !("players" in source) || settlement.kind === "colony") return 0;
  const capital =
    source.ruleset.setup[0] !== "colony" &&
    source.players[settlement.owner].settlements[0] === settlement.tileId;
  return getStandingEffects(source, settlement.owner).reduce(
    (n, e) => n + (e.type === "extraSlots" && (e.scope === "city" || capital) ? e.amount : 0),
    0,
  );
}
export function buildingSlotCost(
  source: RulesSource | undefined,
  owner: PlayerId,
  building: BuildingId,
) {
  return source &&
    "players" in source &&
    getStandingEffects(source, owner).some(
      (e) => e.type === "slotExempt" && e.building === building,
    )
    ? 0
    : 1;
}
export function occupiedBuildingSlots(source: RulesSource | undefined, settlement: Settlement) {
  return settlement.buildings.reduce(
    (n, b) => n + buildingSlotCost(source, settlement.owner, b),
    0,
  );
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
