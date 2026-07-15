import { BUILDINGS, EMPTY_RESOURCES } from "../data";
import type { BuildingId, HegemonyState, PlayerId, PopType, Pops, Resources, Settlement } from "../types";
import { totalPops } from "../core/pops";
import { getOwnedSettlement, getTile } from "../core/query";
import { applyResourceDelta, cloneResources, diffResources } from "../core/resources";
import type { MoveResult } from "../core/results";
import {
  playerPopulationTotals,
  settlementIncomeSource,
  settlementOverCapacity,
  settlementCapacity
} from "../settlement";
import {
  calculateIncomeBreakdown,
  getFoodShortageStatus,
  summarizeIncome
} from "./income";
import type { FoodShortageStatus, IncomeContribution } from "./income";
import {
  buildBuilding,
  foundColony,
  movePops,
  placeCapital,
  placeColony,
  resolveArrivingPops,
  upgradeColonyToCity
} from "../actions";

export type SettlementEconomyProjection = {
  tileId: string;
  label: string;
  kind: Settlement["kind"];
  income: Resources;
  pops: number;
  capacity: number;
  overCapacity: number;
  inTransitIn: number;
  inTransitOut: number;
};

export type SettlementEconomyPreview = SettlementEconomyProjection & {
  incomeDelta: Resources;
  popsDelta: number;
  capacityDelta: number;
  overCapacityDelta: number;
  inTransitInDelta: number;
  inTransitOutDelta: number;
};

export type EconomyProjection = {
  resources: Resources;
  income: Resources;
  breakdown: IncomeContribution[];
  projectedResources: Resources;
  food: FoodShortageStatus;
  population: {
    pops: number;
    capacity: number;
    overCapacity: number;
    inTransit: number;
  };
  settlements: SettlementEconomyProjection[];
};

export type EconomyPreview = {
  title: string;
  before: EconomyProjection;
  after: EconomyProjection;
  immediateResourceDelta: Resources;
  incomeDelta: Resources;
  projectedResourceDelta: Resources;
  populationDelta: {
    pops: number;
    capacity: number;
    overCapacity: number;
    inTransit: number;
  };
  settlements: SettlementEconomyPreview[];
};

export function calculateEconomyProjection(
  G: HegemonyState,
  playerID: PlayerId,
  options: { resolveTransfers?: boolean } = {}
): EconomyProjection {
  const incomeState = structuredClone(G);

  if (options.resolveTransfers) {
    resolveArrivingPops(incomeState, playerID);
  }

  const breakdown = calculateIncomeBreakdown(incomeState, playerID);
  const income = summarizeIncome(breakdown);
  const projectedResources = cloneResources(incomeState.players[playerID].resources);
  applyResourceDelta(projectedResources, income);
  const population = playerPopulationTotals(incomeState, playerID);
  const transfers = G.transfers.filter((transfer) => transfer.owner === playerID);
  const inTransit = transfers.reduce((total, transfer) => total + totalPops(transfer.pops), 0);

  return {
    resources: cloneResources(incomeState.players[playerID].resources),
    income,
    breakdown,
    projectedResources,
    food: getFoodShortageStatus(incomeState, playerID, income.food),
    population: {
      ...population,
      overCapacity: Math.max(0, population.pops - population.capacity),
      inTransit
    },
    settlements: createSettlementEconomyProjections(incomeState, G, playerID, breakdown)
  };
}

export function previewPlaceSettlement(
  G: HegemonyState,
  playerID: PlayerId,
  kind: Extract<Settlement["kind"], "city" | "capital" | "colony">,
  tileId: string,
  pops: Pops
): EconomyPreview | null {
  const placementKind = kind === "capital" ? "city" : kind;

  return previewEconomyAction(G, playerID, `Place ${placementKind}`, (draft) =>
    placementKind === "city" ? placeCapital(draft, playerID, tileId, pops) : placeColony(draft, playerID, tileId, pops)
  );
}

export function previewFoundColony(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
  sourceTileId: string,
  pop: PopType
): EconomyPreview | null {
  return previewEconomyAction(G, playerID, "Found Colony", (draft) =>
    foundColony(draft, playerID, tileId, sourceTileId, pop)
  );
}

export function previewUpgradeColonyToCity(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
  pops?: Pops
): EconomyPreview | null {
  return previewEconomyAction(G, playerID, "Upgrade City", (draft) =>
    upgradeColonyToCity(draft, playerID, tileId, pops)
  );
}

export function previewBuildBuilding(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
  buildingId: BuildingId
): EconomyPreview | null {
  const buildingName = BUILDINGS.find((building) => building.id === buildingId)?.name ?? "Building";

  return previewEconomyAction(G, playerID, `Build ${buildingName}`, (draft) =>
    buildBuilding(draft, playerID, tileId, buildingId)
  );
}

export function previewMovePops(
  G: HegemonyState,
  playerID: PlayerId,
  sourceTileId: string,
  targetTileId: string,
  pops: Pops
): EconomyPreview | null {
  return previewEconomyAction(G, playerID, "Move Pops", (draft) =>
    movePops(draft, playerID, sourceTileId, targetTileId, pops)
  );
}

function previewEconomyAction(
  G: HegemonyState,
  playerID: PlayerId,
  title: string,
  applyAction: (draft: HegemonyState) => MoveResult
): EconomyPreview | null {
  const before = calculateEconomyProjection(G, playerID, { resolveTransfers: true });
  const draft = structuredClone(G);
  const result = applyAction(draft);

  if (!result.ok) {
    return null;
  }

  const after = calculateEconomyProjection(draft, playerID, { resolveTransfers: true });

  return {
    title,
    before,
    after,
    immediateResourceDelta: diffResources(after.resources, before.resources),
    incomeDelta: diffResources(after.income, before.income),
    projectedResourceDelta: diffResources(after.projectedResources, before.projectedResources),
    populationDelta: {
      pops: after.population.pops - before.population.pops,
      capacity: after.population.capacity - before.population.capacity,
      overCapacity: after.population.overCapacity - before.population.overCapacity,
      inTransit: after.population.inTransit - before.population.inTransit
    },
    settlements: createSettlementEconomyPreview(before.settlements, after.settlements)
  };
}

function createSettlementEconomyProjections(
  incomeState: HegemonyState,
  transferState: HegemonyState,
  playerID: PlayerId,
  breakdown: IncomeContribution[]
): SettlementEconomyProjection[] {
  const transfers = transferState.transfers.filter((transfer) => transfer.owner === playerID);

  return incomeState.players[playerID].settlements
    .map((tileId) => {
      const tile = getTile(incomeState, tileId);
      const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);

      if (!tile || !settlement) {
        return null;
      }

      const source = settlementIncomeSource(tile, settlement);
      const settlementBreakdown = breakdown.filter((entry) => entry.source === source);
      const inTransitIn = transfers
        .filter((transfer) => transfer.toTileId === tileId)
        .reduce((total, transfer) => total + totalPops(transfer.pops), 0);
      const inTransitOut = transfers
        .filter((transfer) => transfer.fromTileId === tileId)
        .reduce((total, transfer) => total + totalPops(transfer.pops), 0);

      return {
        tileId,
        label: source,
        kind: settlement.kind,
        income: summarizeIncome(settlementBreakdown),
        pops: totalPops(settlement.pops),
        capacity: settlementCapacity(settlement, incomeState.ruleset),
        overCapacity: settlementOverCapacity(settlement, incomeState.ruleset),
        inTransitIn,
        inTransitOut
      };
    })
    .filter((projection): projection is SettlementEconomyProjection => Boolean(projection));
}

function createSettlementEconomyPreview(
  before: SettlementEconomyProjection[],
  after: SettlementEconomyProjection[]
): SettlementEconomyPreview[] {
  const tileIds = [...new Set([...before.map((settlement) => settlement.tileId), ...after.map((settlement) => settlement.tileId)])];

  return tileIds.map((tileId) => {
    const previous = before.find((settlement) => settlement.tileId === tileId);
    const next = after.find((settlement) => settlement.tileId === tileId);
    const projection = next ?? previous;

    return {
      tileId,
      label: projection?.label ?? tileId,
      kind: projection?.kind ?? "colony",
      income: next?.income ?? { ...EMPTY_RESOURCES },
      pops: next?.pops ?? 0,
      capacity: next?.capacity ?? 0,
      overCapacity: next?.overCapacity ?? 0,
      inTransitIn: next?.inTransitIn ?? 0,
      inTransitOut: next?.inTransitOut ?? 0,
      incomeDelta: diffResources(next?.income ?? EMPTY_RESOURCES, previous?.income ?? EMPTY_RESOURCES),
      popsDelta: (next?.pops ?? 0) - (previous?.pops ?? 0),
      capacityDelta: (next?.capacity ?? 0) - (previous?.capacity ?? 0),
      overCapacityDelta: (next?.overCapacity ?? 0) - (previous?.overCapacity ?? 0),
      inTransitInDelta: (next?.inTransitIn ?? 0) - (previous?.inTransitIn ?? 0),
      inTransitOutDelta: (next?.inTransitOut ?? 0) - (previous?.inTransitOut ?? 0)
    };
  });
}

/**
 * What this pop WOULD add to income, whether or not the player can afford it
 * (ladder rung R7).
 *
 * The UI needs to answer "what does a freeman get me here?" on a button the
 * player cannot yet press — and `previewGrowPop` cannot, because the real move
 * refuses when the cost is unmet, returning null. That gap is why the UI grew its
 * own copy of the income maths, which then drifted: it called `popIncome` without
 * a ruleset, so it silently read DEFAULT_RULESET while the engine paid out
 * `G.ruleset` (see `deriveRuleset` — sim campaigns run patched rulesets).
 *
 * So: drop the pop onto a draft directly, skipping the cost gate, and diff income
 * through the engine's own path. The answer can never disagree with what income
 * actually pays, because it IS what income pays.
 */
export function previewGrowPopIncomeDelta(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
  pop: PopType
): Resources {
  const draft = structuredClone(G);
  const settlement = getOwnedSettlement(draft, tileId, playerID);

  if (!settlement) {
    return { ...EMPTY_RESOURCES };
  }

  const before = calculateEconomyProjection(G, playerID, { resolveTransfers: true });
  settlement.pops[pop] += 1;
  const after = calculateEconomyProjection(draft, playerID, { resolveTransfers: true });

  return diffResources(after.income, before.income);
}

/**
 * What this building WOULD add to income, ignoring cost and slot limits — the
 * same "show me the benefit on a button I can't press yet" case as above.
 * Prefer `previewBuildBuilding` when the action is actually legal; this exists
 * for the disabled state.
 */
export function previewBuildingIncomeDelta(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
  buildingId: BuildingId
): Resources {
  const draft = structuredClone(G);
  const settlement = getOwnedSettlement(draft, tileId, playerID);

  if (!settlement) {
    return { ...EMPTY_RESOURCES };
  }

  const before = calculateEconomyProjection(G, playerID, { resolveTransfers: true });
  settlement.buildings.push(buildingId);
  const after = calculateEconomyProjection(draft, playerID, { resolveTransfers: true });

  return diffResources(after.income, before.income);
}
