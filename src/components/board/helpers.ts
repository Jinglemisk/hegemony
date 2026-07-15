import { BUILDINGS, EMPTY_RESOURCES } from "../../game/data";
import type { Phase } from "../../game/controller";
import type { ActionStatus } from "../../game/rules";
import { POP_TYPES, popIncome, previewBuildBuilding } from "../../game/rules";
import type {
  BuildingDefinition,
  HegemonyState,
  HexTile,
  PlayerId,
  PopType,
  Pops,
  Resources,
  Settlement,
  SettlementKind
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

export function calculatePopEconomy(holdings: OwnedHolding[]): PopEconomy {
  const economy: PopEconomy = {
    citizens: createEmptyResources(),
    freemen: createEmptyResources(),
    slaves: createEmptyResources()
  };

  for (const { tile, settlement } of holdings) {
    for (const pop of POP_TYPES) {
      addResources(economy[pop], popIncome(pop, settlement.pops[pop], tile.resource.type));
    }
  }

  return economy;
}

function addResources(target: Resources, delta: Resources) {
  for (const resource of RESOURCE_ORDER) {
    target[resource] += delta[resource];
  }
}

export function estimateGrowPopIncomeDelta(tile: HexTile, settlement: Settlement, pop: PopType): Resources {
  const delta = popIncome(pop, 1, tile.resource.type);
  const bonusResource: keyof Resources =
    pop === "citizens" ? "influence" : pop === "freemen" ? "gold" : tile.resource.type;
  addSupportedPopBonus(delta, settlement, pop, bonusResource);

  return delta;
}

function addSupportedPopBonus(resources: Resources, settlement: Settlement, pop: PopType, resource: keyof Resources) {
  const support = settlement.buildings.reduce(
    (summary, buildingId) => {
      const building = BUILDINGS.find((candidate) => candidate.id === buildingId);

      for (const effect of building?.effects ?? []) {
        if (
          (pop === "citizens" && effect.type === "citizenInfluenceBonus") ||
          (pop === "freemen" && effect.type === "freemanGoldBonus") ||
          (pop === "slaves" && effect.type === "slavePrimaryResourceBonus")
        ) {
          summary.supportedPops += effect.supportedPops;
          summary.amount = effect.amount;
        }
      }

      return summary;
    },
    { supportedPops: 0, amount: 0 }
  );

  if (settlement.pops[pop] < support.supportedPops) {
    resources[resource] += support.amount;
  }
}

export function getBuildingBenefitText(
  G: HegemonyState,
  playerID: PlayerId,
  tile: HexTile,
  settlement: Settlement,
  building: BuildingDefinition
) {
  const preview = previewBuildBuilding(G, playerID, tile.id, building.id);
  const projected = preview?.incomeDelta ?? estimateBuildingIncomeDelta(tile, settlement, building);
  const deltaText = formatResourceDelta(projected);

  return deltaText === "none" ? formatBuildingEffects(building.effects) : deltaText;
}

function estimateBuildingIncomeDelta(tile: HexTile, settlement: Settlement, building: BuildingDefinition): Resources {
  const delta = createEmptyResources();

  for (const effect of building.effects) {
    if (effect.type === "income") {
      delta[effect.resource] += effect.amount;
    } else if (effect.type === "happiness") {
      delta.happiness += effect.amount;
    } else if (effect.type === "freemanGoldBonus") {
      delta.gold += Math.min(settlement.pops.freemen, effect.supportedPops) * effect.amount;
    } else if (effect.type === "citizenInfluenceBonus") {
      delta.influence += Math.min(settlement.pops.citizens, effect.supportedPops) * effect.amount;
    } else if (effect.type === "slavePrimaryResourceBonus") {
      delta[tile.resource.type] += Math.min(settlement.pops.slaves, effect.supportedPops) * effect.amount;
    }
  }

  return delta;
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

export function actionTitle(label: string, status: ActionStatus | null, phase?: Phase, isActive = true) {
  return `${label}. ${actionRequirementText(status, phase, isActive)}`;
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

  return `${kind} ${tile.id} · ${capitalize(tile.terrain)} +${tile.resource.amount} ${tile.resource.type}${shared}`;
}

export function placementKindLabel(kind: Extract<SettlementKind, "city" | "colony">) {
  return kind === "city" ? "city" : "colony";
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

export function formatTileName(G: HegemonyState, tileId: string) {
  const tile = G.board.tiles.find((candidate) => candidate.id === tileId);

  return tile ? `${tile.terrain} ${tile.id}` : tileId;
}
