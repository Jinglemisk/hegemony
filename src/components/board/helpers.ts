import { EMPTY_RESOURCES } from "../../game/data";
import type { Phase } from "../../game/controller";
import type { ActionStatus } from "../../game/rules";
import type { Ruleset } from "../../game/ruleset";
import { POP_TYPES, popIncome, previewBuildBuilding, previewBuildingIncomeDelta } from "../../game/rules";
import type {
  BuildingDefinition,
  HegemonyState,
  HexTile,
  PlayerId,
  PopType,
  Pops,
  Resources,
  Settlement
} from "../../game/types";
import { formatBuildingEffects, formatResourceCost, formatResourceDelta } from "../../ui/formatters";
import { RESOURCE_ORDER } from "../../ui/resourceVisuals";
import { SETTLEMENT_SORT } from "./constants";
import type { OwnedHolding, PopEconomy, SettlementEntry } from "./types";

export function getOwnedHoldings(G: HegemonyState, playerID: PlayerId): OwnedHolding[] {
  return G.board.tiles
    .map((tile) => {
      const settlement = tile.settlements.find((candidate) => candidate.owner === playerID);

      return settlement ? { tile, settlement } : null;
    })
    .filter((entry): entry is OwnedHolding => Boolean(entry))
    .sort((left, right) => {
      const kindSort = SETTLEMENT_SORT[left.settlement.kind] - SETTLEMENT_SORT[right.settlement.kind];

      return kindSort === 0 ? left.tile.id.localeCompare(right.tile.id) : kindSort;
    });
}

/**
 * Income split by pop class, for the ledger's Pops tab.
 *
 * Takes the ruleset explicitly. It previously omitted it, and `popIncome`'s
 * default parameter quietly substituted DEFAULT_RULESET — so under a patched
 * ruleset this tab reported numbers the engine never paid (R7).
 */
export function calculatePopEconomy(holdings: OwnedHolding[], ruleset: Ruleset): PopEconomy {
  const economy: PopEconomy = {
    citizens: createEmptyResources(),
    freemen: createEmptyResources(),
    slaves: createEmptyResources()
  };

  for (const { tile, settlement } of holdings) {
    for (const pop of POP_TYPES) {
      addResources(economy[pop], popIncome(pop, settlement.pops[pop], tile.resource?.type ?? null, ruleset));
    }
  }

  return economy;
}

function addResources(target: Resources, delta: Resources) {
  for (const resource of RESOURCE_ORDER) {
    target[resource] += delta[resource];
  }
}

/**
 * What a building would add, as text. Prefers the real preview (which refuses
 * illegal builds) and falls back to the engine's unaffordable-case preview, so a
 * disabled Build button still explains itself. Neither path is UI maths: R7
 * deleted the two hand-rolled estimators that used to live here, one of which
 * silently read DEFAULT_RULESET.
 */
export function getBuildingBenefitText(
  G: HegemonyState,
  playerID: PlayerId,
  tile: HexTile,
  building: BuildingDefinition
) {
  const preview = previewBuildBuilding(G, playerID, tile.id, building.id);
  const projected = preview?.incomeDelta ?? previewBuildingIncomeDelta(G, playerID, tile.id, building.id);
  const deltaText = formatResourceDelta(projected);

  return deltaText === "none" ? formatBuildingEffects(building.effects) : deltaText;
}

export function buildingTooltipRows(
  building: BuildingDefinition,
  status: ActionStatus,
  benefit: string,
  phase: Phase,
  isActive: boolean
) {
  return [
    `Cost: ${formatResourceCost(status.cost ?? building.cost)}.`,
    `Benefit: ${benefit}.`,
    actionRequirementText(status, phase, isActive)
  ];
}

export function actionRequirementText(status: ActionStatus | null, phase?: Phase, isActive = true) {
  if (!isActive) {
    return "Current player's turn only.";
  }

  if (phase !== "gameplay") {
    return "Gameplay only.";
  }

  return status?.reasons.length ? status.reasons.join(" ") : "Available.";
}

export function holdingShortLabel(tile: HexTile, settlement: Settlement) {
  return `${capitalize(settlement.kind)} ${tile.id}`;
}

/** One consistent line for every settlement picker (user request 2026-07-13): names
 *  the tile the settlement stands on — kind, coords, terrain + yield — and whether
 *  the tile is shared with another player's colony (shared yields are halved, and an
 *  upgrade would evict the rival). */
export function settlementPickerLabel(G: HegemonyState, tile: HexTile, ownerID: PlayerId): string {
  const own = tile.settlements.find((candidate) => candidate.owner === ownerID);
  const kind = own ? capitalize(own.kind) : "Settlement";
  const rivals = tile.settlements.filter((candidate) => candidate.owner !== ownerID);
  const shared = rivals.length
    ? ` · shares tile with ${rivals.map((candidate) => G.players[candidate.owner].name).join(", ")}`
    : "";

  const yieldText = tile.resource ? `+${tile.resource.amount} ${tile.resource.type}` : "no yield";

  return `${kind} ${tile.id} · ${capitalize(tile.terrain)} ${yieldText}${shared}`;
}

export function createEmptyResources(): Resources {
  return { ...EMPTY_RESOURCES };
}

export function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

/** Every tile this player has a settlement on, with that settlement's pops. The
 *  shared source for the source/target pickers (found colony, move pops). */
export function getSettlementEntries(G: HegemonyState, playerID: PlayerId): SettlementEntry[] {
  return G.board.tiles
    .map((tile) => {
      const settlement = tile.settlements.find((candidate) => candidate.owner === playerID);

      return settlement ? { tile, pops: settlement.pops } : null;
    })
    .filter((entry): entry is SettlementEntry => Boolean(entry));
}

/** First pop type with a body to spare — the default selection for pop pickers. */
export function firstAvailablePop(pops?: Pops): PopType {
  if (!pops) {
    return "citizens";
  }

  return POP_TYPES.find((candidate) => pops[candidate] > 0) ?? "citizens";
}
