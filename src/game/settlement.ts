import { SETTLEMENT_RULES } from "./data";
import { hexDistance } from "./map";
import type { HegemonyState, HexTile, PlayerId, PopType, Settlement } from "./types";
import { capitalize } from "./core/format";
import { totalPops } from "./core/pops";
import { getOwnedSettlement, getTile } from "./core/query";
import type { ActionStatus } from "./core/results";

export function settlementPopCapacity(kind: Settlement["kind"]) {
  return SETTLEMENT_RULES[kind].popCapacity;
}

export function settlementOverCapacity(settlement: Settlement) {
  return Math.max(0, totalPops(settlement.pops) - settlementPopCapacity(settlement.kind));
}

export function playerPopulationTotals(G: HegemonyState, playerID: PlayerId) {
  return G.players[playerID].settlements.reduce(
    (totals, tileId) => {
      const tile = getTile(G, tileId);
      const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);

      if (!settlement) {
        return totals;
      }

      totals.pops += totalPops(settlement.pops);
      totals.capacity += settlementPopCapacity(settlement.kind);
      return totals;
    },
    { pops: 0, capacity: 0 }
  );
}

export function settlementBuildingSlots(tile: HexTile, settlement: Settlement) {
  if (!SETTLEMENT_RULES[settlement.kind].canBuildBuildings) {
    return 0;
  }

  return tile.buildingSlots + SETTLEMENT_RULES[settlement.kind].buildingSlotBonus;
}

export function settlementTileYield(tile: HexTile, settlement: Settlement) {
  const share = settlement.kind === "colony" && tile.settlements.length > 1 ? 0.5 : 1;

  return Math.floor(tile.resource.amount * share);
}

export function settlementIncomeSource(tile: HexTile, settlement: Settlement) {
  return `${capitalize(settlement.kind)} on ${tile.terrain} ${tile.id}`;
}

export function isAdjacentToCity(G: HegemonyState, tile: HexTile) {
  return G.board.tiles.some((candidate) => {
    if (hexDistance(candidate, tile) > 1) {
      return false;
    }

    return candidate.settlements.some((settlement) => settlement.kind !== "colony");
  });
}

export function canPlaceColonyOnTile(G: HegemonyState, playerID: PlayerId, tile: HexTile): ActionStatus {
  const status: ActionStatus = {
    can: false,
    reasons: []
  };

  if (tile.settlements.some((settlement) => settlement.kind !== "colony")) {
    status.reasons.push("Tile already has a city.");
  }

  if (tile.settlements.some((settlement) => settlement.owner === playerID)) {
    status.reasons.push("You already have a settlement here.");
  }

  if (tile.settlements.length >= 2) {
    status.reasons.push("A tile can hold at most two colonies.");
  }

  status.can = status.reasons.length === 0;
  return status;
}

export function playerHasMovablePop(G: HegemonyState, playerID: PlayerId) {
  return G.players[playerID].settlements.some((tileId) => {
    const settlement = getOwnedSettlement(G, tileId, playerID);

    return settlement ? totalPops(settlement.pops) > 0 : false;
  });
}

export function countPlayerPopType(G: HegemonyState, playerID: PlayerId, pop: PopType) {
  return G.players[playerID].settlements.reduce((count, tileId) => {
    const settlement = getOwnedSettlement(G, tileId, playerID);

    return count + (settlement?.pops[pop] ?? 0);
  }, 0);
}

export function scaledByPops(
  G: HegemonyState,
  playerID: PlayerId,
  amountPerPops: number,
  popStep: number,
  minimumMagnitude: number
) {
  const { pops } = playerPopulationTotals(G, playerID);
  const scaled = Math.floor(pops / popStep) * amountPerPops;
  const sign = amountPerPops < 0 ? -1 : 1;

  return Math.abs(scaled) >= minimumMagnitude ? scaled : sign * minimumMagnitude;
}
