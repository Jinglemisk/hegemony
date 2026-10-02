import { getBuildings } from "./content";
import type {
  BuildingDefinition,
  BuildingId,
  HegemonyState,
  HexTile,
  PlayerId,
  PopType,
  Pops,
  Resources,
  Settlement,
} from "./types";
import {
  hasPops,
  isGrowablePop,
  isPositivePopSelection,
  isValidPopSelection,
  totalPops,
} from "./core/pops";
import { getOwnedSettlement, getGrownSettlementsThisTurn, getTile } from "./core/query";
import { canAfford } from "./core/resources";
import type { ActionStatus } from "./core/results";
import {
  canPlaceColonyOnTile,
  isAdjacentToCity,
  playerHasMovablePop,
  playerPieces,
  popsInTransitTo,
  settlementCapacity,
  settlementSlots,
} from "./settlement";
import { claimableLuxuriesAt } from "./luxury";
import { isCoastalTile } from "./map";
import { getAdjustedActionCost, getGrowPopCost } from "./economy/cost";

export function getFoundColonyStatus(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
): ActionStatus {
  const tile = getTile(G, tileId);
  const status: ActionStatus = {
    can: false,
    reasons: [],
    cost: getAdjustedActionCost(G, playerID, "foundColony", G.ruleset.actionCosts.foundColony),
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

  const pieces = playerPieces(G, playerID);
  if (pieces.colonies >= pieces.colonySupply) {
    status.reasons.push(
      `All ${pieces.colonySupply} colony pieces are placed. Upgrade a colony to free one.`,
    );
  }

  status.can = status.reasons.length === 0;
  return status;
}

export function getUpgradeColonyToCityStatus(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
): ActionStatus {
  const tile = getTile(G, tileId);
  const status: ActionStatus = {
    can: false,
    reasons: [],
    // Routed through the cost pipeline like every other action so the Assembly's
    // Laws can reach it — Colonial Charter taxes the upgrade and Enfranchise the
    // Colonies halves it, and both must show in the preview the player reads.
    cost: getAdjustedActionCost(
      G,
      playerID,
      "upgradeColonyToCity",
      G.ruleset.actionCosts.upgradeColonyToCity,
    ),
  };

  if (!tile) {
    status.reasons.push("Select a tile.");
    return status;
  }

  addPendingEventReason(G, status);

  if (
    !tile.settlements.some(
      (settlement) => settlement.owner === playerID && settlement.kind === "colony",
    )
  ) {
    status.reasons.push("Requires your colony on this tile.");
  }

  if (tile.settlements.some((settlement) => settlement.kind !== "colony")) {
    status.reasons.push("Tile already has a city.");
  }

  if (isAdjacentToCity(G, tile)) {
    status.reasons.push("Cities cannot be adjacent.");
  }

  const pieces = playerPieces(G, playerID);
  if (pieces.cities >= pieces.citySupply) {
    status.reasons.push(`All ${pieces.citySupply} city pieces are placed.`);
  }

  if (
    !canAfford(
      G.players[playerID].resources,
      status.cost ?? G.ruleset.actionCosts.upgradeColonyToCity,
    )
  ) {
    status.reasons.push("Not enough resources.");
  }

  status.can = status.reasons.length === 0;
  return status;
}

export function getBuildBuildingStatus(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
  buildingId: BuildingId,
  claimVertexId?: string,
): ActionStatus {
  const tile = getTile(G, tileId);
  const building = getBuildings(G.definition.content).find(
    (candidate) => candidate.id === buildingId,
  );
  const status: ActionStatus = {
    can: false,
    reasons: [],
    cost: building
      ? getAdjustedActionCost(G, playerID, "buildBuilding", building.cost, building.id)
      : undefined,
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
  status.reasons.push(...buildSiteReasons(G, playerID, tile, building, claimVertexId));

  if (!canAfford(G.players[playerID].resources, status.cost ?? building.cost)) {
    status.reasons.push("Not enough resources.");
  }

  status.can = status.reasons.length === 0;
  return status;
}

/**
 * Why this building cannot stand on this tile at all, whatever the player holds or
 * is in the middle of: the site's own reasons. The price and a pending event are not
 * among them.
 */
function buildSiteReasons(
  G: HegemonyState,
  playerID: PlayerId,
  tile: HexTile,
  building: BuildingDefinition,
  claimVertexId?: string,
): string[] {
  const reasons: string[] = [];
  const settlement = tile.settlements.find((candidate) => candidate.owner === playerID);

  // Every building takes one of the settlement's slots. A colony raises nothing but
  // a Port, which takes one of its work slots.
  if (!settlement) {
    reasons.push("Requires your settlement on this tile.");
  } else if (!G.ruleset.settlements[settlement.kind].canBuildBuildings && !building.colony) {
    reasons.push("A colony raises nothing but a Port.");
  } else if (settlement.buildings.includes(building.id)) {
    reasons.push(`${building.name} is already built here.`);
  } else if (settlement.buildings.length >= settlementSlots(tile, settlement)) {
    reasons.push("No slots available.");
  }

  if (building.needsYield && !tile.resource) {
    reasons.push(`${building.name} cannot stand on ${tile.terrain}: it yields nothing.`);
  }

  // The Port is the coastal-gated exception (Q47): its effect is the claim, so it
  // is refused — with the authoritative why-not the UI renders — wherever there is
  // no sea, nothing left to claim, or no room under the active cap.
  if (building.id === "port") {
    if (!isCoastalTile(tile, G.board.tiles)) {
      reasons.push("A Port needs the coast — this settlement is inland.");
    } else if (claimableLuxuriesAt(G, tile.id).length === 0) {
      reasons.push("No unclaimed luxury good adjoins this tile.");
    }

    if (
      claimVertexId !== undefined &&
      !claimableLuxuriesAt(G, tile.id).some((asset) => asset.vertexId === claimVertexId)
    ) {
      reasons.push("That good is not claimable from this tile.");
    }
  }

  return reasons;
}

/**
 * A settlement's ground for buildings: what stands, how many more the site would
 * take, and the two together. A city's is its tile's slots. A colony has ground only
 * for a Port: the one it holds, or the one its site would let it raise.
 */
export function buildingGround(G: HegemonyState, playerID: PlayerId, tileId: string) {
  const tile = getTile(G, tileId);
  const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);

  if (!tile || !settlement) {
    return { slots: 0, built: 0, open: 0, raisable: 0 };
  }

  const built = settlement.buildings.length;
  const raisable = getBuildings(G.definition.content).filter(
    (building) => buildSiteReasons(G, playerID, tile, building).length === 0,
  ).length;
  const open = G.ruleset.settlements[settlement.kind].canBuildBuildings
    ? Math.max(0, settlementSlots(tile, settlement) - built)
    : raisable;

  return { slots: built + open, built, open, raisable };
}

export type BuildBuildingOption = {
  building: BuildingDefinition;
  status: ActionStatus;
};

/**
 * The effective building roster paired with each option's authoritative status
 * and cost. Engine enumeration and every frontend picker consume this query.
 */
export function getBuildBuildingOptions(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
): BuildBuildingOption[] {
  return getBuildings(G.definition.content).map((building) => ({
    building,
    status: getBuildBuildingStatus(G, playerID, tileId, building.id),
  }));
}

export function getGrowPopStatus(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
  pop: PopType,
): ActionStatus {
  const tile = getTile(G, tileId);
  const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);
  const status: ActionStatus = {
    can: false,
    reasons: [],
  };

  if (!isGrowablePop(pop)) {
    status.reasons.push("Citizens come only by promotion.");
    return status;
  }

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

  status.cost = getGrowPopCost(G, playerID, settlement, pop);

  if (getGrownSettlementsThisTurn(G, playerID).includes(tileId)) {
    status.reasons.push("Already grew a pop here this turn.");
  }

  if (!settlementHasRoom(G, settlement, 1)) {
    status.reasons.push("Settlement is at population capacity.");
  }

  if (!canAfford(G.players[playerID].resources, status.cost)) {
    status.reasons.push("Not enough resources.");
  }

  status.can = status.reasons.length === 0;
  return status;
}

/** The paid pop move: 1 food a pop, one move a turn, into a settlement with room. */
export function getMovePopsStatus(
  G: HegemonyState,
  playerID: PlayerId,
  sourceTileId: string,
  targetTileId: string,
  pops: Pops,
): ActionStatus {
  const count = isValidPopSelection(pops) ? totalPops(pops) : 0;
  const status: ActionStatus = {
    can: false,
    reasons: [],
    cost: scaleCost(G.ruleset.movePopCost, Math.max(1, count)),
  };
  const sourceSettlement = getOwnedSettlement(G, sourceTileId, playerID);
  const targetSettlement = getOwnedSettlement(G, targetTileId, playerID);

  addPendingEventReason(G, status);

  if (G.players[playerID].moveUsedThisTurn) {
    status.reasons.push("One move per turn.");
  }

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

  if (targetSettlement && count > 0 && !settlementHasRoom(G, targetSettlement, count)) {
    status.reasons.push("The target has no room for them.");
  }

  if (!canAfford(G.players[playerID].resources, status.cost ?? {})) {
    status.reasons.push("Not enough resources.");
  }

  status.can = status.reasons.length === 0;
  return status;
}

/** Room for `count` more pops, counting those already on their way there. */
function settlementHasRoom(G: HegemonyState, settlement: Settlement, count: number) {
  return (
    totalPops(settlement.pops) + popsInTransitTo(G, settlement.id) + count <=
    settlementCapacity(settlement, G.ruleset)
  );
}

function scaleCost(cost: Partial<Resources>, times: number): Partial<Resources> {
  return Object.fromEntries(
    Object.entries(cost).map(([resource, amount]) => [resource, (amount ?? 0) * times]),
  );
}

function addPendingEventReason(G: HegemonyState, status: ActionStatus) {
  if (G.pendingPlayerEvent) {
    status.reasons.push("Resolve the pending player event first.");
  }
}
