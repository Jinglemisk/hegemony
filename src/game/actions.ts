import { getBuildings } from "./content";
import type { BuildingId, HegemonyState, HexTile, PlayerId, PopType, Pops } from "./types";
import { formatPopName, formatPops, formatRuleResourceDelta, formatTileLabel } from "./core/format";
import {
  EMPTY_POPS,
  addPops,
  clonePops,
  hasPops,
  isExactPopSelection,
  isPositivePopSelection,
  subtractPops
} from "./core/pops";
import { addLog, getOwnedSettlement, getPlayerName, getTile, markSettlementGrown } from "./core/query";
import { applyResourceDelta, payCost } from "./core/resources";
import { MOVE_OK, invalid } from "./core/results";
import type { MoveResult } from "./core/results";
import { canPlaceColonyOnTile, isAdjacentToCity } from "./settlement";
import { setupCapitalCount } from "./ruleset";
import { calculateIncome } from "./economy/income";
import { consumeActionCostDiscounts } from "./economy/cost";
import {
  getBuildBuildingStatus,
  getFoundColonyStatus,
  getGrowPopStatus,
  getMovePopsStatus,
  getUpgradeColonyToCityStatus
} from "./status";
import { drawPlayerEvent } from "./events";
import { consumeLawFreeAction, getFoundColonyRiders } from "./assembly/laws";

export function placeCapital(G: HegemonyState, playerID: PlayerId, tileId: string, pops: Pops): MoveResult {
  const tile = getTile(G, tileId);
  const player = G.players[playerID];

  if (
    !tile ||
    player.settlements.length > 0 ||
    tile.settlements.length > 0 ||
    !isExactPopSelection(pops, G.ruleset.placementPopCounts.capital)
  ) {
    return invalid();
  }

  if (tile.terrain === "oracle") {
    return invalid("The oracle cannot be settled.");
  }

  if (isAdjacentToCity(G, tile)) {
    return invalid("The metropolis cannot be adjacent to another city.");
  }

  tile.settlements.push({
    owner: playerID,
    kind: "city",
    buildings: [],
    pops: clonePops(pops)
  });
  player.settlements.push(tile.id);
  addLog(G, `${getPlayerName(G, playerID)} founded their metropolis on ${tile.terrain} with ${formatPops(pops)}.`);
  return MOVE_OK;
}

/** Setup placement of the second city (standard mode's snake round two). Same rules
 *  as the capital — empty tile, never adjacent to any city — placed freely anywhere,
 *  Catan-style: the two starting cities are the player's expansion poles. */
export function placeCity(G: HegemonyState, playerID: PlayerId, tileId: string, pops: Pops): MoveResult {
  const tile = getTile(G, tileId);
  const player = G.players[playerID];
  const owesCity = G.ruleset.setup[player.settlements.length] === "city";

  if (
    !tile ||
    !owesCity ||
    tile.settlements.length > 0 ||
    !isExactPopSelection(pops, G.ruleset.placementPopCounts.city)
  ) {
    return invalid();
  }

  if (tile.terrain === "oracle") {
    return invalid("The oracle cannot be settled.");
  }

  if (isAdjacentToCity(G, tile)) {
    return invalid("Cities cannot be adjacent to another city.");
  }

  tile.settlements.push({
    owner: playerID,
    kind: "city",
    buildings: [],
    pops: clonePops(pops)
  });
  player.settlements.push(tile.id);
  addLog(G, `${getPlayerName(G, playerID)} founded their second city on ${tile.terrain} with ${formatPops(pops)}.`);
  return MOVE_OK;
}

export function placeColony(G: HegemonyState, playerID: PlayerId, tileId: string, pops: Pops): MoveResult {
  const tile = getTile(G, tileId);
  const player = G.players[playerID];

  // Valid during setup once the capital is down and while the player still owes
  // colonies (setup = one capital + N colonies, so N can exceed 1 in e.g. deathmatch).
  const placed = player.settlements.length;
  const owesColony =
    placed >= setupCapitalCount(G.ruleset) && placed < G.ruleset.setup.length && G.ruleset.setup[placed] === "colony";

  if (
    !tile ||
    !owesColony ||
    !canPlaceColonyOnTile(G, playerID, tile, "setup").can ||
    !isExactPopSelection(pops, G.ruleset.placementPopCounts.colony)
  ) {
    return invalid();
  }

  addColony(G, playerID, tile, pops);
  return MOVE_OK;
}

export function foundColony(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
  sourceTileId: string,
  pop: PopType
): MoveResult {
  const status = getFoundColonyStatus(G, playerID, tileId);
  const tile = getTile(G, tileId);
  const foundingPops = { ...EMPTY_POPS, [pop]: 1 };

  if (!tile || !status.can) {
    return invalid(...status.reasons);
  }

  const transfer = schedulePopulationTransfer(G, playerID, sourceTileId, tileId, foundingPops, false);

  if (!transfer.ok) {
    return transfer;
  }

  payCost(G.players[playerID].resources, status.cost ?? G.ruleset.actionCosts.foundColony);
  consumeActionCostDiscounts(G, playerID, "foundColony");
  // Spend the year's free-colony coupon (Land Rush) only now the move has committed —
  // a refused founding must never burn it.
  consumeLawFreeAction(G, playerID, "foundColony");
  addColony(G, playerID, tile, EMPTY_POPS);
  applyFoundColonyRiders(G, playerID, tile);
  addLog(
    G,
    `${getPlayerName(G, playerID)} sent ${formatPops(foundingPops)} to seed the new colony on ${tile.terrain}.`
  );
  return MOVE_OK;
}

/** Standing Laws that hang a rider on founding (Frontier Spirit: a freeman comes with
 *  the charter, and the city pays for it in happiness). */
function applyFoundColonyRiders(G: HegemonyState, playerID: PlayerId, tile: HexTile) {
  for (const rider of getFoundColonyRiders(G, playerID)) {
    if (rider.grantPop) {
      const settlement = getOwnedSettlement(G, tile.id, playerID);

      if (settlement) {
        settlement.pops[rider.grantPop] += 1;
        addLog(
          G,
          `${rider.label}: a ${formatPopName(rider.grantPop, 1)} sails with the colonists.`
        );
      }
    }

    if (rider.happiness) {
      G.players[playerID].resources.happiness += rider.happiness;
      addLog(G, `${rider.label}: the parting costs ${Math.abs(rider.happiness)} happiness.`);
    }
  }
}

export function upgradeColonyToCity(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string
): MoveResult {
  const status = getUpgradeColonyToCityStatus(G, playerID, tileId);
  const tile = getTile(G, tileId);
  const settlement = tile?.settlements.find(
    (candidate) => candidate.owner === playerID && candidate.kind === "colony"
  );

  if (!tile || !settlement || !status.can) {
    return invalid(...status.reasons);
  }

  payCost(G.players[playerID].resources, status.cost ?? G.ruleset.actionCosts.upgradeColonyToCity);
  const displacedPlayers = tile.settlements
    .filter((candidate) => candidate.owner !== playerID && candidate.kind === "colony")
    .map((candidate) => candidate.owner);
  tile.settlements = tile.settlements.filter((candidate) => candidate.owner === playerID);
  settlement.kind = "city";

  for (const displacedPlayer of displacedPlayers) {
    G.players[displacedPlayer].settlements = G.players[displacedPlayer].settlements.filter((id) => id !== tile.id);
  }

  const displacementText =
    displacedPlayers.length > 0
      ? ` ${displacedPlayers.map((id) => getPlayerName(G, id)).join(", ")} lost a shared colony.`
      : "";
  addLog(G, `${getPlayerName(G, playerID)} upgraded a colony to a city on ${tile.terrain}.${displacementText}`);
  return MOVE_OK;
}

function addColony(G: HegemonyState, playerID: PlayerId, tile: HexTile, pops: Pops) {
  tile.settlements.push({
    owner: playerID,
    kind: "colony",
    buildings: [],
    pops: clonePops(pops)
  });
  G.players[playerID].settlements.push(tile.id);
  addLog(G, `${getPlayerName(G, playerID)} founded a colony on ${tile.terrain} with ${formatPops(pops)}.`);
}

export function collectIncome(
  G: HegemonyState,
  playerID: PlayerId,
  mode: "manual" | "automatic" = "manual"
): MoveResult {
  const player = G.players[playerID];

  // A pending riot defers income (the rulebook removes pops before collection) —
  // resolveRiot calls back in here once the table has spoken.
  if (player.collectedThisTurn || G.pendingPlayerEvent || G.pendingRiot) {
    return invalid();
  }

  // Stratokles's General Strike: the work stops. The turn still passes — the strike
  // costs exactly the income, not the tempo — and the counter burns down here rather
  // than in the upkeep so a deferred (riot-blocked) collection still loses its turn.
  if (player.incomeSuppressedTurns > 0) {
    player.incomeSuppressedTurns -= 1;
    player.collectedThisTurn = true;
    player.hasCollectedGameplayIncome = true;
    addLog(G, `${getPlayerName(G, playerID)} collects nothing — the city is on strike.`);
    drawPlayerEvent(G, playerID);
    return MOVE_OK;
  }

  const income = calculateIncome(G, playerID);
  applyResourceDelta(player.resources, income);
  player.collectedThisTurn = true;
  player.hasCollectedGameplayIncome = true;
  addLog(
    G,
    `${getPlayerName(G, playerID)} ${mode === "automatic" ? "automatically collected" : "collected"} income (${formatRuleResourceDelta(income)}).`
  );
  drawPlayerEvent(G, playerID);
  return MOVE_OK;
}

export function buildBuilding(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
  buildingId: BuildingId
): MoveResult {
  const tile = getTile(G, tileId);
  const building = getBuildings().find((candidate) => candidate.id === buildingId);
  const settlement = tile?.settlements.find(
    (candidate) => candidate.owner === playerID && candidate.kind !== "colony"
  );
  const status = getBuildBuildingStatus(G, playerID, tileId, buildingId);

  if (!tile || !building || !settlement || !status.can) {
    return invalid(...status.reasons);
  }

  payCost(G.players[playerID].resources, status.cost ?? building.cost);
  consumeActionCostDiscounts(G, playerID, "buildBuilding", building.id);
  consumeLawFreeAction(G, playerID, "buildBuilding");
  settlement.buildings.push(building.id);
  addLog(G, `${getPlayerName(G, playerID)} built ${building.name}.`);
  return MOVE_OK;
}

export function growPop(G: HegemonyState, playerID: PlayerId, tileId: string, pop: PopType): MoveResult {
  const status = getGrowPopStatus(G, playerID, tileId, pop);
  const tile = getTile(G, tileId);
  const settlement = getOwnedSettlement(G, tileId, playerID);

  if (!tile || !settlement || !status.can || !status.cost) {
    return invalid(...status.reasons);
  }

  payCost(G.players[playerID].resources, status.cost);
  consumeActionCostDiscounts(G, playerID, "growPop", undefined, pop);
  settlement.pops[pop] += 1;
  markSettlementGrown(G, playerID, tileId);
  addLog(G, `${getPlayerName(G, playerID)} grew 1 ${formatPopName(pop, 1)} in ${settlement.kind} on ${tile.terrain}.`);
  return MOVE_OK;
}

export function movePops(
  G: HegemonyState,
  playerID: PlayerId,
  sourceTileId: string,
  targetTileId: string,
  pops: Pops
): MoveResult {
  const status = getMovePopsStatus(G, playerID, sourceTileId, targetTileId, pops);

  if (!status.can) {
    return invalid(...status.reasons);
  }

  return schedulePopulationTransfer(G, playerID, sourceTileId, targetTileId, pops);
}

export function resolveArrivingPops(G: HegemonyState, playerID: PlayerId) {
  const arrivals = G.transfers.filter((transfer) => transfer.owner === playerID);

  if (arrivals.length === 0) {
    return;
  }

  G.transfers = G.transfers.filter((transfer) => transfer.owner !== playerID);

  for (const transfer of arrivals) {
    const target = getOwnedSettlement(G, transfer.toTileId, playerID);

    if (target) {
      addPops(target.pops, transfer.pops);
      addLog(
        G,
        `${getPlayerName(G, playerID)}'s ${formatPops(transfer.pops)} arrived at ${formatTileLabel(G, transfer.toTileId)}.`
      );
      continue;
    }

    const source = getOwnedSettlement(G, transfer.fromTileId, playerID);

    if (source) {
      addPops(source.pops, transfer.pops);
      addLog(
        G,
        `${getPlayerName(G, playerID)}'s ${formatPops(transfer.pops)} returned to ${formatTileLabel(G, transfer.fromTileId)}.`
      );
    }
  }
}

function schedulePopulationTransfer(
  G: HegemonyState,
  playerID: PlayerId,
  sourceTileId: string,
  targetTileId: string,
  pops: Pops,
  requireTarget = true
): MoveResult {
  const sourceSettlement = getOwnedSettlement(G, sourceTileId, playerID);
  const targetSettlement = getOwnedSettlement(G, targetTileId, playerID);

  if (!sourceSettlement || (requireTarget && !targetSettlement) || !isPositivePopSelection(pops)) {
    return invalid();
  }

  if (!hasPops(sourceSettlement.pops, pops)) {
    return invalid();
  }

  subtractPops(sourceSettlement.pops, pops);
  G.transfers.push({
    id: `${G.season}-${G.log.length}-${sourceTileId}-${targetTileId}-${formatPops(pops)}`,
    owner: playerID,
    fromTileId: sourceTileId,
    toTileId: targetTileId,
    pops: clonePops(pops)
  });

  if (requireTarget) {
    addLog(
      G,
      `${getPlayerName(G, playerID)} moved ${formatPops(pops)} from ${formatTileLabel(G, sourceTileId)} to ${formatTileLabel(G, targetTileId)}.`
    );
  }

  return MOVE_OK;
}
