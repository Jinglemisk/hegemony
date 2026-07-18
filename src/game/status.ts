import { getBuildings } from "./content";
import type { BuildingId, HegemonyState, PlayerId, PopType, Pops } from "./types";
import { hasPops, isPositivePopSelection, totalPops } from "./core/pops";
import { getOwnedSettlement, getGrownSettlementsThisTurn, getTile } from "./core/query";
import { canAfford } from "./core/resources";
import type { ActionStatus } from "./core/results";
import {
  canPlaceColonyOnTile,
  isAdjacentToCity,
  playerHasMovablePop,
  settlementBuildingSlots,
  settlementCapacity
} from "./settlement";
import { getAdjustedActionCost, getDiscountedGrowPopCost } from "./economy/cost";

export function getFoundColonyStatus(G: HegemonyState, playerID: PlayerId, tileId: string): ActionStatus {
  const tile = getTile(G, tileId);
  const status: ActionStatus = {
    can: false,
    reasons: [],
    cost: getAdjustedActionCost(G, playerID, "foundColony", G.ruleset.actionCosts.foundColony)
  };

  if (!tile) {
    status.reasons.push("Select a tile.");
    return status;
  }

  addPendingEventReason(G, status);

  status.reasons.push(...canPlaceColonyOnTile(G, playerID, tile).reasons);

  if (!canAfford(G.players[playerID].resources, status.cost ?? G.ruleset.actionCosts.foundColony)) {
    status.reasons.push("Not enough resources.");
  }

  if (!playerHasMovablePop(G, playerID)) {
    status.reasons.push("Move one pop from an existing settlement to found a new colony.");
  }

  status.can = status.reasons.length === 0;
  return status;
}

export function getUpgradeColonyToCityStatus(G: HegemonyState, playerID: PlayerId, tileId: string): ActionStatus {
  const tile = getTile(G, tileId);
  const status: ActionStatus = {
    can: false,
    reasons: [],
    cost: G.ruleset.actionCosts.upgradeColonyToCity
  };

  if (!tile) {
    status.reasons.push("Select a tile.");
    return status;
  }

  addPendingEventReason(G, status);

  if (!tile.settlements.some((settlement) => settlement.owner === playerID && settlement.kind === "colony")) {
    status.reasons.push("Requires your colony on this tile.");
  }

  if (tile.settlements.some((settlement) => settlement.kind !== "colony")) {
    status.reasons.push("Tile already has a city.");
  }

  if (isAdjacentToCity(G, tile)) {
    status.reasons.push("Cities cannot be adjacent.");
  }

  if (!canAfford(G.players[playerID].resources, status.cost ?? G.ruleset.actionCosts.upgradeColonyToCity)) {
    status.reasons.push("Not enough resources.");
  }

  status.can = status.reasons.length === 0;
  return status;
}

export function getBuildBuildingStatus(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
  buildingId: BuildingId
): ActionStatus {
  const tile = getTile(G, tileId);
  const building = getBuildings().find((candidate) => candidate.id === buildingId);
  const settlement = tile?.settlements.find(
    (candidate) => candidate.owner === playerID && candidate.kind !== "colony"
  );
  const status: ActionStatus = {
    can: false,
    reasons: [],
    cost: building ? getAdjustedActionCost(G, playerID, "buildBuilding", building.cost, building.id) : undefined
  };

  if (!tile) {
    status.reasons.push("Select a tile.");
    return status;
  }

  if (!building) {
    status.reasons.push("Choose a building.");
    return status;
  }

  addPendingEventReason(G, status);

  if (!settlement) {
    status.reasons.push("Requires your city on this tile.");
  } else if (settlement.buildings.length >= settlementBuildingSlots(tile, settlement, G.ruleset)) {
    status.reasons.push("No building slots available.");
  } else if (
    settlement.buildings.filter((existing) => existing === building.id).length >= building.maxLevel
  ) {
    // Every building is capped (owner ruling): a slot-rich hill must diversify, not
    // stack one flat effect. Level = copies here; the cap bites before the slot cap.
    status.reasons.push(
      building.maxLevel === 1
        ? `${building.name} is already built here.`
        : `${building.name} is at its maximum level (${building.maxLevel}).`
    );
  }

  if (!canAfford(G.players[playerID].resources, status.cost ?? building.cost)) {
    status.reasons.push("Not enough resources.");
  }

  status.can = status.reasons.length === 0;
  return status;
}

export function getGrowPopStatus(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
  pop: PopType
): ActionStatus {
  const tile = getTile(G, tileId);
  const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);
  const status: ActionStatus = {
    can: false,
    reasons: []
  };

  if (!tile) {
    status.reasons.push("Select a settlement.");
    status.cost = G.ruleset.growPopCosts[pop];
    return status;
  }

  addPendingEventReason(G, status);

  if (!settlement) {
    status.reasons.push("Requires your settlement on this tile.");
    status.cost = G.ruleset.growPopCosts[pop];
    return status;
  }

  status.cost = getDiscountedGrowPopCost(G, playerID, settlement, pop);

  if (getGrownSettlementsThisTurn(G, playerID).includes(tileId)) {
    status.reasons.push("Already grew a pop here this turn.");
  }

  if (totalPops(settlement.pops) + 1 > settlementCapacity(settlement, G.ruleset)) {
    status.reasons.push("Settlement is at population capacity.");
  }

  if (!canAfford(G.players[playerID].resources, status.cost)) {
    status.reasons.push("Not enough resources.");
  }

  status.can = status.reasons.length === 0;
  return status;
}

export function getMovePopsStatus(
  G: HegemonyState,
  playerID: PlayerId,
  sourceTileId: string,
  targetTileId: string,
  pops: Pops
): ActionStatus {
  const status: ActionStatus = {
    can: false,
    reasons: []
  };
  const sourceSettlement = getOwnedSettlement(G, sourceTileId, playerID);
  const targetSettlement = getOwnedSettlement(G, targetTileId, playerID);

  addPendingEventReason(G, status);

  if (!sourceTileId) {
    status.reasons.push("Choose a source settlement.");
  } else if (!sourceSettlement) {
    status.reasons.push("Source must be one of your settlements.");
  }

  if (!targetTileId) {
    status.reasons.push("Choose a target settlement.");
  } else if (!targetSettlement) {
    status.reasons.push("Target must be one of your settlements.");
  }

  if (sourceTileId && targetTileId && sourceTileId === targetTileId) {
    status.reasons.push("Source and target must be different.");
  }

  if (!isPositivePopSelection(pops)) {
    status.reasons.push("Move at least one pop.");
  }

  if (sourceSettlement && !hasPops(sourceSettlement.pops, pops)) {
    status.reasons.push("Source does not have those pops.");
  }

  status.can = status.reasons.length === 0;
  return status;
}

function addPendingEventReason(G: HegemonyState, status: ActionStatus) {
  if (G.pendingPlayerEvent) {
    status.reasons.push("Resolve the pending player event first.");
  }
}
