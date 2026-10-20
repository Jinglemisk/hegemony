import { buildingSlotCost, occupiedBuildingSlots } from "./ideaRules";
import { buildingForbiddenBy, colonyBuildingLimit, growLimit } from "./assembly/laws";
import { currentWorkflow } from "./actors";
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
} from "./types";
import {
  hasPops,
  isGrowablePop,
  isPositivePopSelection,
  isValidPopSelection,
  totalPops,
} from "./core/pops";
import { getOwnedSettlement, getGrownSettlementsThisTurn, getTile } from "./core/query";
import { pluralName } from "./core/format";
import { canAfford } from "./core/resources";
import type { ActionStatus } from "./core/results";
import {
  canPlaceColonyOnTile,
  isAdjacentToCity,
  playerHasMovablePop,
  playerPieces,
  settlementRoom,
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

  status.reasons.push(...pendingDecisionReasons(G));

  status.reasons.push(...canPlaceColonyOnTile(G, playerID, tile).reasons);

  if (!canAfford(G.players[playerID].resources, status.cost ?? G.ruleset.actionCosts.foundColony)) {
    status.reasons.push("Not enough resources.");
  }

  if (!playerHasMovablePop(G, playerID)) {
    status.reasons.push("Move one pop from an existing settlement to found a new colony.");
  }

  const pieces = playerPieces(G, playerID);
  if (pieces.colonies >= pieces.colonyLimit) {
    status.reasons.push(
      `All ${pieces.colonyLimit} colony pieces are placed. Upgrade a colony to free one.`,
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
    // Colonial Charter must show in the preview the player reads.
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

  status.reasons.push(...pendingDecisionReasons(G));
  status.reasons.push(...upgradeSiteReasons(G, playerID, tile));

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

/**
 * Why this colony cannot become a city at all, whatever the player holds, how many
 * pieces are left or what they are in the middle of: the site's own reasons.
 */
export function upgradeSiteReasons(G: HegemonyState, playerID: PlayerId, tile: HexTile): string[] {
  const reasons: string[] = [];

  if (
    !tile.settlements.some(
      (settlement) => settlement.owner === playerID && settlement.kind === "colony",
    )
  ) {
    reasons.push("Requires your colony on this tile.");
  }

  if (tile.settlements.some((settlement) => settlement.kind !== "colony")) {
    reasons.push("Tile already has a city.");
  }

  if (isAdjacentToCity(G, tile)) {
    reasons.push("Cities cannot be adjacent.");
  }

  return reasons;
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

  status.reasons.push(...pendingDecisionReasons(G));
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
  const colonyBuildings = colonyBuildingLimit(G, playerID);

  // Every building takes one of the settlement's slots. A colony raises nothing but
  // a Port, which takes one of its work slots.
  if (!settlement) {
    reasons.push("Requires your settlement on this tile.");
  } else if (
    !G.ruleset.settlements[settlement.kind].canBuildBuildings &&
    !colonyBuildings &&
    !building.colony
  ) {
    reasons.push("A colony raises nothing but a Port.");
  } else if (settlement.buildings.includes(building.id)) {
    reasons.push(`${building.name} is already built here.`);
  } else if (
    occupiedBuildingSlots(G, settlement) + buildingSlotCost(G, playerID, building.id) >
    settlementSlots(tile, settlement, G)
  ) {
    reasons.push("No slots available.");
  }

  for (const label of buildingForbiddenBy(G, playerID, building.id))
    reasons.push(`${label} forbids new ${pluralName(building.name)}.`);
  if (
    colonyBuildings &&
    settlement?.kind === "colony" &&
    settlement.buildings.length >= colonyBuildings.amount
  )
    reasons.push(
      `${colonyBuildings.label} permits ${colonyBuildings.amount} building${colonyBuildings.amount === 1 ? "" : "s"} per colony.`,
    );

  if (building.needsYield && !tile.resource) {
    reasons.push(`${building.name} cannot stand on ${tile.terrain}: it yields nothing.`);
  }

  // The Port is the coastal-gated exception (Q47): its effect is the claim, so it
  // is refused — with the authoritative why-not the UI renders — wherever there is
  // no sea or nothing left to claim.
  if (building.claimsLuxury) {
    if (!isCoastalTile(tile, G.board.tiles)) {
      reasons.push(`A ${building.name} needs the coast — this settlement is inland.`);
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
 * The player's settlements whose site would take a Port that claims a free luxury,
 * whatever the player holds, and whether the player can pay for one now.
 */
export function portClaimSites(G: HegemonyState, playerID: PlayerId) {
  const port = getBuildings(G.definition.content).find((building) => building.claimsLuxury);
  if (!port) return [];
  const cost = getAdjustedActionCost(G, playerID, "buildBuilding", port.cost, port.id);
  return G.players[playerID].settlements.flatMap((tileId) => {
    const tile = getTile(G, tileId);
    if (!tile || buildSiteReasons(G, playerID, tile, port).length > 0) return [];
    const settlement = tile.settlements.find((candidate) => candidate.owner === playerID)!;
    return [
      {
        tileId,
        settlementId: settlement.id,
        luxuries: claimableLuxuriesAt(G, tileId),
        cost,
        affordable: canAfford(G.players[playerID].resources, cost),
      },
    ];
  });
}

/**
 * A settlement's ground for buildings: what stands, how many more the site would
 * take, and the two together. A city's is its tile's slots. A colony has ground only
 * for colony buildings (the Port): those it holds, and those its site would let it raise.
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
  );
  const colonyBuildings = colonyBuildingLimit(G, playerID);
  const open =
    G.ruleset.settlements[settlement.kind].canBuildBuildings || colonyBuildings
      ? Math.max(
          0,
          (settlement.kind === "colony" && colonyBuildings
            ? Math.min(colonyBuildings.amount, settlementSlots(tile, settlement, G))
            : settlementSlots(tile, settlement, G)) - occupiedBuildingSlots(G, settlement),
        )
      : raisable
          .filter((building) => building.colony)
          .reduce((sum, building) => sum + buildingSlotCost(G, playerID, building.id), 0);

  return {
    slots: occupiedBuildingSlots(G, settlement) + open,
    built,
    open,
    raisable: raisable.length,
  };
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

  status.reasons.push(...pendingDecisionReasons(G));

  if (!settlement) {
    status.reasons.push("Requires your settlement on this tile.");
    status.cost = G.ruleset.growPopCosts[pop];
    return status;
  }

  status.cost = getGrowPopCost(G, playerID, pop);

  const grown = getGrownSettlementsThisTurn(G, playerID).filter((id) => id === tileId).length;
  const limit = growLimit(G, settlement);
  if (grown >= limit.amount)
    status.reasons.push(
      limit.amount === 0
        ? `${limit.label} forbids growth ${settlement.kind === "colony" ? "in colonies" : "in your capital"}.`
        : limit.amount === 1
          ? "Already grew a pop here this turn."
          : `At most ${limit.amount} growths here per turn.`,
    );

  if (settlementRoom(G, settlement) < 1) {
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

  status.reasons.push(...pendingDecisionReasons(G));

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

  if (targetSettlement && count > 0 && settlementRoom(G, targetSettlement) < count) {
    status.reasons.push("The target has no room for them.");
  }

  if (!canAfford(G.players[playerID].resources, status.cost ?? {})) {
    status.reasons.push("Not enough resources.");
  }

  status.can = status.reasons.length === 0;
  return status;
}

function scaleCost(cost: Partial<Resources>, times: number): Partial<Resources> {
  return Object.fromEntries(
    Object.entries(cost).map(([resource, amount]) => [resource, (amount ?? 0) * times]),
  );
}

/**
 * Why a turn action must wait: the table is in some workflow other than the turn
 * itself, such as a pending event, hunger pick or riot, or a sitting Assembly. Every
 * action status and the turn's own transitions read this one gate.
 */
export function pendingDecisionReasons(G: HegemonyState): string[] {
  return currentWorkflow(G) === "turn" ? [] : ["Finish the pending decision first."];
}
