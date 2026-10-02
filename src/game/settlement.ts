import { hexDistance, isCoastalTile } from "./map";
import type { HegemonyState, HexTile, PlayerId, PopType, Settlement } from "./types";
import { capitalize } from "./core/format";
import { totalPops } from "./core/pops";
import { getOwnedSettlement, getTile } from "./core/query";
import type { ActionStatus } from "./core/results";
import type { Ruleset } from "./ruleset";

/** The kind's capacity, for previews of a settlement that does not exist yet. */
export function settlementPopCapacity(kind: Settlement["kind"], ruleset: Ruleset) {
  return ruleset.settlements[kind].popCapacity;
}

/** A settlement's pop capacity: its kind's, and nothing raises it. */
export function settlementCapacity(settlement: Settlement, ruleset: Ruleset) {
  return settlementPopCapacity(settlement.kind, ruleset);
}

export function settlementOverCapacity(settlement: Settlement, ruleset: Ruleset) {
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
    { pops: 0, capacity: 0 },
  );
}

/**
 * The tile slots this settlement holds. A settlement alone on its tile holds them all;
 * colonies sharing a tile split them, and the colony founded first takes the odd one.
 */
export function settlementSlots(tile: HexTile, settlement: Settlement) {
  const sharers = tile.settlements.length;

  if (sharers <= 1) {
    return tile.slots;
  }

  const index = tile.settlements.findIndex((candidate) => candidate.id === settlement.id);
  const share = Math.floor(tile.slots / sharers);

  return index >= 0 && index < tile.slots % sharers ? share + 1 : share;
}

/** Slots left for slaves to work: every building takes one. */
export function settlementOpenSlots(tile: HexTile, settlement: Settlement) {
  return Math.max(0, settlementSlots(tile, settlement) - settlement.buildings.length);
}

/**
 * Slaves holding an open slot, each making 1 of the tile's resource. The rest sit
 * idle. The engine assigns them; nobody picks which slave works. On terrain with no
 * resource (hills) no slave works.
 */
export function settlementWorkingSlaves(tile: HexTile, settlement: Settlement) {
  return tile.resource
    ? Math.min(settlement.pops.slaves, settlementOpenSlots(tile, settlement))
    : 0;
}

export function settlementIdleSlaves(tile: HexTile, settlement: Settlement) {
  return settlement.pops.slaves - settlementWorkingSlaves(tile, settlement);
}

export function settlementIncomeSource(tile: HexTile, settlement: Settlement) {
  return `${capitalize(settlement.kind)} on ${tile.terrain} ${tile.id}`;
}

/**
 * The pieces a player has standing against their supply. Setup's colonies use colony
 * pieces. The capital is its own piece, so the cities setup places are not counted.
 */
export function playerPieces(G: HegemonyState, playerID: PlayerId) {
  const kinds = G.players[playerID].settlements.flatMap(
    (tileId) => getOwnedSettlement(G, tileId, playerID)?.kind ?? [],
  );
  const colonies = kinds.filter((kind) => kind === "colony").length;
  const setupCities = G.ruleset.setup.filter((kind) => kind !== "colony").length;

  return {
    colonies,
    cities: Math.max(0, kinds.length - colonies - setupCities),
    colonySupply: G.ruleset.pieces.colonies,
    citySupply: G.ruleset.pieces.cities,
  };
}

/** Pops on their way to a settlement: they hold room there until they arrive. */
export function popsInTransitTo(G: HegemonyState, settlementId: string) {
  return G.transfers
    .filter((transfer) => transfer.toSettlementId === settlementId)
    .reduce((sum, transfer) => sum + totalPops(transfer.pops), 0);
}

export function isAdjacentToCity(G: HegemonyState, tile: HexTile) {
  return G.board.tiles.some((candidate) => {
    if (hexDistance(candidate, tile) > G.ruleset.placement.cityExclusionRadius) {
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
    return owned ? isCoastalTile(owned, G.board.tiles) : false;
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
  context: "gameplay" | "setup" = "gameplay",
): ActionStatus {
  const status: ActionStatus = {
    can: false,
    reasons: [],
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

  if (tile.settlements.length >= G.ruleset.placement.maxColoniesPerTile) {
    status.reasons.push("A tile can hold at most two colonies.");
  }

  if (G.ruleset.placement.colonyContiguity && G.players[playerID].settlements.length > 0) {
    const contiguous = isContiguousForPlayer(G, playerID, tile);
    const bySea =
      context === "setup"
        ? isCoastalTile(tile, G.board.tiles)
        : G.ruleset.placement.coastalLeapfrog &&
          isCoastalTile(tile, G.board.tiles) &&
          playerHoldsCoast(G, playerID);

    if (!contiguous && !bySea) {
      status.reasons.push(
        context === "setup"
          ? "The founding colony must border your metropolis or lie on the coast."
          : "Must border one of your settlements — or be a coastal tile while you hold the coast.",
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

