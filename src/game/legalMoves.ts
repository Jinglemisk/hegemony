import {
  buildBuilding,
  foundColony,
  growPop,
  movePops,
  placeCapital,
  placeColony,
  upgradeColonyToCity,
} from "./actions";
import { BUILDINGS } from "./data";
import { EMPTY_POPS, POP_TYPES } from "./core/pops";
import { formatPopName, formatPops } from "./core/format";
import { getOwnedSettlement } from "./core/query";
import type { MoveResult } from "./core/results";
import { getAddPopsEffect, getEventEffectChoices, getEventPopTargetTileIds, resolvePendingPlayerEvent } from "./events";
import { setupCapitalCount } from "./ruleset";
import { canPlaceColonyOnTile, isAdjacentToCity } from "./settlement";
import {
  getBuildBuildingStatus,
  getFoundColonyStatus,
  getGrowPopStatus,
  getMovePopsStatus,
  getUpgradeColonyToCityStatus,
} from "./status";
import { advanceSetupTurn, beginGameplayTurn, endTurn } from "./turn";
import type { BuildingId, HegemonyState, PlayerId, PopType, Pops, Resources } from "./types";

/**
 * Legal-move enumeration + a uniform dispatcher over the engine's mutators, so a
 * headless driver (sim CLI, bots, tests) can ask "what can this player do?" and
 * apply the answer without knowing per-move call shapes.
 *
 * Deliberately NOT re-exported from the ./rules barrel: this module imports
 * ./turn (which itself imports ./rules), so barreling it would close a cycle.
 * Import it directly as ./legalMoves.
 *
 * Enumeration reuses the get*Status validators — the same predicates the moves
 * themselves re-check — so an enumerated move always applies cleanly. Two
 * deliberate bounds keep the list small: movePops is enumerated as single-pop
 * transfers only, and collectIncome is never enumerated (it happens
 * automatically at the start of every gameplay turn).
 */

export type LegalMove =
  | { type: "placeCapital"; tileId: string; pops: Pops }
  | { type: "placeColony"; tileId: string; pops: Pops }
  | { type: "foundColony"; tileId: string; sourceTileId: string; pop: PopType; cost: Partial<Resources> }
  | { type: "upgradeColonyToCity"; tileId: string; cost: Partial<Resources> }
  | { type: "buildBuilding"; tileId: string; buildingId: BuildingId; cost: Partial<Resources> }
  | { type: "growPop"; tileId: string; pop: PopType; cost: Partial<Resources> }
  | { type: "movePops"; sourceTileId: string; targetTileId: string; pops: Pops }
  | { type: "resolveEvent"; choiceIndex: number; targetTileId?: string }
  | { type: "endTurn" };

/**
 * Every move `playerID` may take right now, in deterministic order (board/index
 * order within each move type, move types in declaration order). Off-turn
 * players get an empty list. While a player event is pending, resolving it is
 * the ONLY legal move — everything else, including endTurn, is blocked.
 */
export function enumerateLegalMoves(G: HegemonyState, playerID: PlayerId): LegalMove[] {
  if (G.currentPlayer !== playerID) {
    return [];
  }

  if (G.pendingPlayerEvent) {
    return G.pendingPlayerEvent.playerID === playerID ? enumerateEventResolutions(G, playerID) : [];
  }

  switch (G.phase) {
    case "setupCapital":
      return enumerateCapitalPlacements(G, playerID);
    case "setupColony":
      return enumerateColonyPlacements(G, playerID);
    case "gameplay":
      return enumerateGameplayMoves(G, playerID);
  }
}

/**
 * Apply an enumerated move through the engine's own mutators. Setup placements
 * also advance the setup turn machine (and bootstrap gameplay on the final
 * placement), so a driver can run the whole game through this one entry point.
 */
export function applyMove(G: HegemonyState, playerID: PlayerId, move: LegalMove): MoveResult {
  switch (move.type) {
    case "placeCapital": {
      const result = placeCapital(G, playerID, move.tileId, move.pops);
      if (result.ok) {
        advanceSetupTurn(G, setupCapitalCount(G.ruleset), "setupColony");
      }
      return result;
    }
    case "placeColony": {
      const result = placeColony(G, playerID, move.tileId, move.pops);
      if (result.ok) {
        advanceSetupTurn(G, G.ruleset.setup.length, "gameplay");
        if (G.phase === "gameplay") {
          beginGameplayTurn(G);
        }
      }
      return result;
    }
    case "foundColony":
      return foundColony(G, playerID, move.tileId, move.sourceTileId, move.pop);
    case "upgradeColonyToCity":
      return upgradeColonyToCity(G, playerID, move.tileId);
    case "buildBuilding":
      return buildBuilding(G, playerID, move.tileId, move.buildingId);
    case "growPop":
      return growPop(G, playerID, move.tileId, move.pop);
    case "movePops":
      return movePops(G, playerID, move.sourceTileId, move.targetTileId, move.pops);
    case "resolveEvent":
      return resolvePendingPlayerEvent(G, playerID, move.targetTileId, move.choiceIndex);
    case "endTurn":
      return endTurn(G);
  }
}

export function describeMove(move: LegalMove): string {
  switch (move.type) {
    case "placeCapital":
      return `place capital on ${move.tileId} (${formatPops(move.pops)})`;
    case "placeColony":
      return `place colony on ${move.tileId} (${formatPops(move.pops)})`;
    case "foundColony":
      return `found colony on ${move.tileId}, sending 1 ${formatPopName(move.pop, 1)} from ${move.sourceTileId}${formatCost(move.cost)}`;
    case "upgradeColonyToCity":
      return `upgrade colony to city on ${move.tileId}${formatCost(move.cost)}`;
    case "buildBuilding":
      return `build ${move.buildingId} on ${move.tileId}${formatCost(move.cost)}`;
    case "growPop":
      return `grow 1 ${formatPopName(move.pop, 1)} on ${move.tileId}${formatCost(move.cost)}`;
    case "movePops":
      return `move ${formatPops(move.pops)} from ${move.sourceTileId} to ${move.targetTileId}`;
    case "resolveEvent":
      return `resolve pending event (choice ${move.choiceIndex})${move.targetTileId ? ` targeting ${move.targetTileId}` : ""}`;
    case "endTurn":
      return "end turn";
  }
}

function formatCost(cost: Partial<Resources>): string {
  const parts = Object.entries(cost)
    .filter(([, amount]) => (amount ?? 0) !== 0)
    .map(([resource, amount]) => `${resource} ${amount}`);

  return parts.length > 0 ? ` — costs ${parts.join(", ")}` : "";
}

function enumerateEventResolutions(G: HegemonyState, playerID: PlayerId): LegalMove[] {
  const pending = G.pendingPlayerEvent;
  if (!pending) {
    return [];
  }

  const moves: LegalMove[] = [];

  getEventEffectChoices(pending.card).forEach((effects, choiceIndex) => {
    const popEffect = getAddPopsEffect(effects);

    if (!popEffect) {
      moves.push({ type: "resolveEvent", choiceIndex });
      return;
    }

    for (const targetTileId of getEventPopTargetTileIds(G, playerID, popEffect)) {
      moves.push({ type: "resolveEvent", choiceIndex, targetTileId });
    }
  });

  return moves;
}

function enumerateCapitalPlacements(G: HegemonyState, playerID: PlayerId): LegalMove[] {
  if (G.players[playerID].settlements.length > 0) {
    return [];
  }

  const compositions = popCompositions(G.ruleset.placementPopCounts.city);
  const moves: LegalMove[] = [];

  for (const tile of G.board.tiles) {
    if (tile.settlements.length > 0 || isAdjacentToCity(G, tile)) {
      continue;
    }

    for (const pops of compositions) {
      moves.push({ type: "placeCapital", tileId: tile.id, pops });
    }
  }

  return moves;
}

function enumerateColonyPlacements(G: HegemonyState, playerID: PlayerId): LegalMove[] {
  const placed = G.players[playerID].settlements.length;
  const owesColony = placed >= setupCapitalCount(G.ruleset) && placed < G.ruleset.setup.length;

  if (!owesColony) {
    return [];
  }

  const compositions = popCompositions(G.ruleset.placementPopCounts.colony);
  const moves: LegalMove[] = [];

  for (const tile of G.board.tiles) {
    if (!canPlaceColonyOnTile(G, playerID, tile).can) {
      continue;
    }

    for (const pops of compositions) {
      moves.push({ type: "placeColony", tileId: tile.id, pops });
    }
  }

  return moves;
}

function enumerateGameplayMoves(G: HegemonyState, playerID: PlayerId): LegalMove[] {
  const ownedTileIds = G.players[playerID].settlements;
  const moves: LegalMove[] = [];

  for (const tile of G.board.tiles) {
    const status = getFoundColonyStatus(G, playerID, tile.id);

    if (!status.can) {
      continue;
    }

    for (const sourceTileId of ownedTileIds) {
      const source = getOwnedSettlement(G, sourceTileId, playerID);

      for (const pop of POP_TYPES) {
        if ((source?.pops[pop] ?? 0) > 0) {
          moves.push({ type: "foundColony", tileId: tile.id, sourceTileId, pop, cost: status.cost ?? {} });
        }
      }
    }
  }

  for (const tileId of ownedTileIds) {
    const status = getUpgradeColonyToCityStatus(G, playerID, tileId);

    if (status.can) {
      moves.push({ type: "upgradeColonyToCity", tileId, cost: status.cost ?? {} });
    }
  }

  for (const tileId of ownedTileIds) {
    for (const building of BUILDINGS) {
      const status = getBuildBuildingStatus(G, playerID, tileId, building.id);

      if (status.can) {
        moves.push({ type: "buildBuilding", tileId, buildingId: building.id, cost: status.cost ?? {} });
      }
    }
  }

  for (const tileId of ownedTileIds) {
    for (const pop of POP_TYPES) {
      const status = getGrowPopStatus(G, playerID, tileId, pop);

      if (status.can) {
        moves.push({ type: "growPop", tileId, pop, cost: status.cost ?? {} });
      }
    }
  }

  for (const sourceTileId of ownedTileIds) {
    for (const targetTileId of ownedTileIds) {
      if (sourceTileId === targetTileId) {
        continue;
      }

      for (const pop of POP_TYPES) {
        const pops = { ...EMPTY_POPS, [pop]: 1 };

        if (getMovePopsStatus(G, playerID, sourceTileId, targetTileId, pops).can) {
          moves.push({ type: "movePops", sourceTileId, targetTileId, pops });
        }
      }
    }
  }

  moves.push({ type: "endTurn" });
  return moves;
}

/**
 * Every way to split `total` pops across the three pop types, in deterministic
 * order (citizens descending, then freemen descending). total=3 → 10 splits,
 * total=1 → 3.
 */
export function popCompositions(total: number): Pops[] {
  const compositions: Pops[] = [];

  for (let citizens = total; citizens >= 0; citizens -= 1) {
    for (let freemen = total - citizens; freemen >= 0; freemen -= 1) {
      compositions.push({ citizens, freemen, slaves: total - citizens - freemen });
    }
  }

  return compositions;
}
