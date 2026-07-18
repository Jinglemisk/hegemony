import { getBuildings } from "./content";
import { hexDistance, isCoastalTile } from "./map";
import type { HegemonyState, HexTile, PlayerId, PopType, Settlement } from "./types";
import { capitalize } from "./core/format";
import { totalPops } from "./core/pops";
import { getOwnedSettlement, getTile } from "./core/query";
import type { ActionStatus } from "./core/results";
import { DEFAULT_RULESET } from "./ruleset";
import type { Ruleset } from "./ruleset";

/** The kind's baseline capacity — use for previews of a settlement that doesn't
 *  exist yet (upgrade meters). Real settlements go through {@link settlementCapacity}
 *  so building bonuses (Aqueduct) count. */
export function settlementPopCapacity(kind: Settlement["kind"], ruleset: Ruleset = DEFAULT_RULESET) {
  return ruleset.settlements[kind].popCapacity;
}

/** A real settlement's capacity: the kind's baseline plus building bonuses. */
export function settlementCapacity(settlement: Settlement, ruleset: Ruleset = DEFAULT_RULESET) {
  const bonus = settlement.buildings.reduce((sum, buildingId) => {
    const building = getBuildings().find((candidate) => candidate.id === buildingId);

    return (
      sum +
      (building?.effects ?? []).reduce(
        (effectSum, effect) => (effect.type === "popCapacityBonus" ? effectSum + effect.amount : effectSum),
        0
      )
    );
  }, 0);

  return settlementPopCapacity(settlement.kind, ruleset) + bonus;
}

export function settlementOverCapacity(settlement: Settlement, ruleset: Ruleset = DEFAULT_RULESET) {
  return Math.max(0, totalPops(settlement.pops) - settlementCapacity(settlement, ruleset));
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
      totals.capacity += settlementCapacity(settlement, G.ruleset);
      return totals;
    },
    { pops: 0, capacity: 0 }
  );
}

export function settlementBuildingSlots(tile: HexTile, settlement: Settlement, ruleset: Ruleset = DEFAULT_RULESET) {
  const rule = ruleset.settlements[settlement.kind];

  if (!rule.canBuildBuildings) {
    return 0;
  }

  return tile.buildingSlots + rule.buildingSlotBonus;
}

export function settlementTileYield(tile: HexTile, settlement: Settlement, ruleset: Ruleset = DEFAULT_RULESET) {
  if (!tile.resource) {
    return 0;
  }

  const share =
    settlement.kind === "colony" && tile.settlements.length > 1 ? ruleset.economy.colonySharedTileYieldShare : 1;

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

/** Colony contiguity (roadmap-appendix D3): a new colony must border one of the
 *  player's settlements — colonies count as sources, so expansion chains. */
export function isContiguousForPlayer(G: HegemonyState, playerID: PlayerId, tile: HexTile) {
  return G.players[playerID].settlements.some((tileId) => {
    const owned = getTile(G, tileId);
    return owned ? hexDistance(owned, tile) === 1 : false;
  });
}

/** Whether the player holds any settlement on the island's shoreline — the gate for
 *  the coastal-leapfrog rule (sailing along the coast, roadmap-appendix Q13a). */
export function playerHoldsCoast(G: HegemonyState, playerID: PlayerId) {
  return G.players[playerID].settlements.some((tileId) => {
    const owned = getTile(G, tileId);
    return owned ? isCoastalTile(owned) : false;
  });
}

/**
 * Colony placement legality. `context` picks the geometry rule:
 * - "gameplay" (founding): border your realm, OR sail — a coastal target is legal
 *   while you hold any coastal settlement (leapfrog, Q13a).
 * - "setup" (the founding voyage, Q12): border your metropolis, OR any coastal tile —
 *   apoikiai were coastal foundations; no prior coastal holding required.
 */
export function canPlaceColonyOnTile(
  G: HegemonyState,
  playerID: PlayerId,
  tile: HexTile,
  context: "gameplay" | "setup" = "gameplay"
): ActionStatus {
  const status: ActionStatus = {
    can: false,
    reasons: []
  };

  if (tile.terrain === "oracle") {
    status.reasons.push("The oracle cannot be settled.");
  }

  if (tile.settlements.some((settlement) => settlement.kind !== "colony")) {
    status.reasons.push("Tile already has a city.");
  }

  if (tile.settlements.some((settlement) => settlement.owner === playerID)) {
    status.reasons.push("You already have a settlement here.");
  }

  if (tile.settlements.length >= 2) {
    status.reasons.push("A tile can hold at most two colonies.");
  }

  if (G.ruleset.placement.colonyContiguity && G.players[playerID].settlements.length > 0) {
    const contiguous = isContiguousForPlayer(G, playerID, tile);
    const bySea =
      context === "setup"
        ? isCoastalTile(tile)
        : G.ruleset.placement.coastalLeapfrog && isCoastalTile(tile) && playerHoldsCoast(G, playerID);

    if (!contiguous && !bySea) {
      status.reasons.push(
        context === "setup"
          ? "The founding colony must border your metropolis or lie on the coast."
          : "Must border one of your settlements — or be a coastal tile while you hold the coast."
      );
    }
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
