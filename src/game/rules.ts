import { ACTION_COSTS, BUILDINGS, EMPTY_RESOURCES, GROW_POP_COSTS, PLAYER_IDS, SETTLEMENT_RULES, STARTING_RESOURCES } from "./data";
import { createInitialMap, hexDistance } from "./map";
import type {
  BuildingId,
  HegemonyState,
  HexTile,
  PlayerId,
  PopType,
  Pops,
  Resource,
  Resources,
  Settlement
} from "./types";

export const INVALID_MOVE = "INVALID_MOVE";

export type ActionStatus = {
  can: boolean;
  reasons: string[];
  cost?: Partial<Resources>;
};

export type IncomeContribution = {
  resource: Resource;
  amount: number;
  source: string;
  detail: string;
};

export const POP_TYPES: PopType[] = ["citizens", "freemen", "slaves"];

export const EMPTY_POPS: Pops = {
  citizens: 0,
  freemen: 0,
  slaves: 0
};

export const PLACEMENT_POP_COUNTS = {
  capital: 3,
  colony: 1
};

export function createInitialState(): HegemonyState {
  return {
    board: {
      tiles: createInitialMap()
    },
    players: PLAYER_IDS.reduce(
      (players, playerId) => ({
        ...players,
        [playerId]: {
          id: playerId,
          name: `Player ${Number(playerId) + 1}`,
          resources: { ...STARTING_RESOURCES },
          settlements: [],
          collectedThisTurn: false,
          grownSettlementsThisTurn: []
        }
      }),
      {} as HegemonyState["players"]
    ),
    transfers: [],
    season: 1,
    log: [{ id: "start", season: 1, message: "The first season begins." }]
  };
}

export function getPlayerName(G: HegemonyState, playerID: PlayerId) {
  return G.players[playerID]?.name ?? `Player ${Number(playerID) + 1}`;
}

export function toPlayerId(value: string | null | undefined): PlayerId {
  return PLAYER_IDS.includes(value as PlayerId) ? (value as PlayerId) : "0";
}

export function placeCapital(G: HegemonyState, playerID: PlayerId, tileId: string, pops: Pops) {
  const tile = getTile(G, tileId);
  const player = G.players[playerID];

  if (
    !tile ||
    player.settlements.length > 0 ||
    tile.settlements.length > 0 ||
    !isExactPopSelection(pops, PLACEMENT_POP_COUNTS.capital)
  ) {
    return INVALID_MOVE;
  }

  if (isAdjacentToCity(G, tile)) {
    return INVALID_MOVE;
  }

  tile.settlements.push({
    owner: playerID,
    kind: "capital",
    buildings: [],
    pops: clonePops(pops)
  });
  player.settlements.push(tile.id);
  addLog(G, `${getPlayerName(G, playerID)} founded a capital on ${tile.terrain} with ${formatPops(pops)}.`);
}

export function placeColony(G: HegemonyState, playerID: PlayerId, tileId: string, pops: Pops) {
  const tile = getTile(G, tileId);
  const player = G.players[playerID];

  if (
    !tile ||
    player.settlements.length !== 1 ||
    !canPlaceColonyOnTile(G, playerID, tile).can ||
    !isExactPopSelection(pops, PLACEMENT_POP_COUNTS.colony)
  ) {
    return INVALID_MOVE;
  }

  addColony(G, playerID, tile, pops);
}

export function foundColony(G: HegemonyState, playerID: PlayerId, tileId: string, sourceTileId: string, pop: PopType) {
  const status = getFoundColonyStatus(G, playerID, tileId);
  const tile = getTile(G, tileId);
  const foundingPops = { ...EMPTY_POPS, [pop]: 1 };

  if (!tile || !status.can || schedulePopulationTransfer(G, playerID, sourceTileId, tileId, foundingPops, false) === INVALID_MOVE) {
    return INVALID_MOVE;
  }

  payCost(G.players[playerID].resources, ACTION_COSTS.foundColony);
  addColony(G, playerID, tile, EMPTY_POPS);
  addLog(
    G,
    `${getPlayerName(G, playerID)} sent ${formatPops(foundingPops)} to seed the new colony on ${tile.terrain}.`
  );
}

export function upgradeColonyToCity(G: HegemonyState, playerID: PlayerId, tileId: string, pops?: Pops) {
  const status = getUpgradeColonyToCityStatus(G, playerID, tileId);
  const tile = getTile(G, tileId);
  const settlement = tile?.settlements.find(
    (candidate) => candidate.owner === playerID && candidate.kind === "colony"
  );

  if (!tile || !settlement || !status.can) {
    return INVALID_MOVE;
  }

  if (pops && !isExactPopSelection(pops, totalPops(settlement.pops))) {
    return INVALID_MOVE;
  }

  payCost(G.players[playerID].resources, ACTION_COSTS.upgradeColonyToCity);
  const displacedPlayers = tile.settlements
    .filter((candidate) => candidate.owner !== playerID && candidate.kind === "colony")
    .map((candidate) => candidate.owner);
  tile.settlements = tile.settlements.filter((candidate) => candidate.owner === playerID);
  settlement.kind = "city";
  settlement.pops = pops ? clonePops(pops) : settlement.pops;

  for (const displacedPlayer of displacedPlayers) {
    G.players[displacedPlayer].settlements = G.players[displacedPlayer].settlements.filter((id) => id !== tile.id);
  }

  const displacementText =
    displacedPlayers.length > 0
      ? ` ${displacedPlayers.map((id) => getPlayerName(G, id)).join(", ")} lost a shared colony.`
      : "";
  addLog(G, `${getPlayerName(G, playerID)} upgraded a colony to a city on ${tile.terrain}.${displacementText}`);
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

export function collectIncome(G: HegemonyState, playerID: PlayerId, mode: "manual" | "automatic" = "manual") {
  const player = G.players[playerID];

  if (player.collectedThisTurn) {
    return INVALID_MOVE;
  }

  const income = calculateIncome(G, playerID);
  applyResourceDelta(player.resources, income);
  player.collectedThisTurn = true;
  addLog(
    G,
    `${getPlayerName(G, playerID)} ${mode === "automatic" ? "automatically collected" : "collected"} income (${formatRuleResourceDelta(income)}).`
  );
}

export function buildBuilding(G: HegemonyState, playerID: PlayerId, tileId: string, buildingId: BuildingId) {
  const tile = getTile(G, tileId);
  const building = BUILDINGS.find((candidate) => candidate.id === buildingId);
  const settlement = tile?.settlements.find(
    (candidate) => candidate.owner === playerID && candidate.kind !== "colony"
  );

  if (!tile || !building || !settlement) {
    return INVALID_MOVE;
  }

  if (settlement.buildings.length >= settlementBuildingSlots(tile, settlement)) {
    return INVALID_MOVE;
  }

  if (!canAfford(G.players[playerID].resources, building.cost)) {
    return INVALID_MOVE;
  }

  payCost(G.players[playerID].resources, building.cost);
  settlement.buildings.push(building.id);
  addLog(G, `${getPlayerName(G, playerID)} built ${building.name}.`);
}

export function growPop(G: HegemonyState, playerID: PlayerId, tileId: string, pop: PopType) {
  const status = getGrowPopStatus(G, playerID, tileId, pop);
  const tile = getTile(G, tileId);
  const settlement = getOwnedSettlement(G, tileId, playerID);

  if (!tile || !settlement || !status.can || !status.cost) {
    return INVALID_MOVE;
  }

  payCost(G.players[playerID].resources, status.cost);
  settlement.pops[pop] += 1;
  markSettlementGrown(G, playerID, tileId);
  addLog(G, `${getPlayerName(G, playerID)} grew 1 ${formatPopName(pop, 1)} in ${settlement.kind} on ${tile.terrain}.`);
}

export function movePops(G: HegemonyState, playerID: PlayerId, sourceTileId: string, targetTileId: string, pops: Pops) {
  const status = getMovePopsStatus(G, playerID, sourceTileId, targetTileId, pops);

  if (!status.can) {
    return INVALID_MOVE;
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

export function resetTurnFlags(G: HegemonyState) {
  for (const player of Object.values(G.players)) {
    player.collectedThisTurn = false;
    player.grownSettlementsThisTurn = [];
  }
}

export function startNewSeason(G: HegemonyState) {
  G.season += 1;
  resetTurnFlags(G);
  addLog(G, `Season ${G.season} begins.`);
}

export function totalPops(pops: Pops) {
  return pops.citizens + pops.freemen + pops.slaves;
}

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
  const multiplier = settlement.kind === "capital" ? 2 : 1;

  return Math.floor(tile.resource.amount * share * multiplier);
}

export function calculateIncome(G: HegemonyState, playerID: PlayerId): Resources {
  return summarizeIncome(calculateIncomeBreakdown(G, playerID));
}

export function calculateIncomeBreakdown(G: HegemonyState, playerID: PlayerId): IncomeContribution[] {
  const contributions: IncomeContribution[] = [];
  const income = { ...EMPTY_RESOURCES };

  for (const tileId of G.players[playerID].settlements) {
    const tile = getTile(G, tileId);
    const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);

    if (!tile || !settlement) {
      continue;
    }

    const multiplier = settlement.kind === "capital" ? 2 : 1;
    const share = settlement.kind === "colony" && tile.settlements.length > 1 ? 0.5 : 1;
    const settlementLabel = `${capitalize(settlement.kind)} on ${tile.terrain} ${tile.id}`;
    const tileAmount = settlementTileYield(tile, settlement);
    addIncomeContribution(contributions, income, {
      resource: tile.resource.type,
      amount: tileAmount,
      source: settlementLabel,
      detail: `Tile yield${multiplier > 1 ? " x2 capital" : ""}${share < 1 ? " shared colony" : ""}`
    });

    addIncomeContribution(contributions, income, {
      resource: "influence",
      amount: settlement.pops.citizens,
      source: settlementLabel,
      detail: `${settlement.pops.citizens} citizens`
    });
    addIncomeContribution(contributions, income, {
      resource: "gold",
      amount: settlement.pops.citizens * 2,
      source: settlementLabel,
      detail: `${settlement.pops.citizens} citizens`
    });
    addIncomeContribution(contributions, income, {
      resource: "food",
      amount: settlement.pops.citizens * -2,
      source: settlementLabel,
      detail: `${settlement.pops.citizens} citizens upkeep`
    });
    addIncomeContribution(contributions, income, {
      resource: "gold",
      amount: settlement.pops.freemen * 2,
      source: settlementLabel,
      detail: `${settlement.pops.freemen} freeman pops`
    });
    addIncomeContribution(contributions, income, {
      resource: "food",
      amount: settlement.pops.freemen * -1,
      source: settlementLabel,
      detail: `${settlement.pops.freemen} freeman pops upkeep`
    });
    addIncomeContribution(contributions, income, {
      resource: tile.resource.type,
      amount: settlement.pops.slaves,
      source: settlementLabel,
      detail: `${settlement.pops.slaves} slave pops production`
    });
    addIncomeContribution(contributions, income, {
      resource: "food",
      amount: settlement.pops.slaves * -1,
      source: settlementLabel,
      detail: `${settlement.pops.slaves} slave pops upkeep`
    });
    addIncomeContribution(contributions, income, {
      resource: "happiness",
      amount: settlement.pops.slaves * -0.5,
      source: settlementLabel,
      detail: `${settlement.pops.slaves} slave pops pressure`
    });
    addIncomeContribution(contributions, income, {
      resource: "happiness",
      amount: settlementOverCapacity(settlement) * -1,
      source: settlementLabel,
      detail: "Over capacity pressure"
    });

    applyIncomeBuildingEffects(contributions, income, settlement, settlementLabel, tile.resource.type);
  }

  if (income.food < 0) {
    addIncomeContribution(contributions, income, {
      resource: "happiness",
      amount: income.food,
      source: "Food shortage",
      detail: "Negative food income pressure"
    });
  }

  const foodStockpileHappiness = Math.floor(G.players[playerID].resources.food / 5);

  if (foodStockpileHappiness > 0) {
    addIncomeContribution(contributions, income, {
      resource: "happiness",
      amount: foodStockpileHappiness,
      source: "Food stockpile",
      detail: "Every 5 stored food improves happiness"
    });
  }

  return contributions;
}

export function getFoundColonyStatus(G: HegemonyState, playerID: PlayerId, tileId: string): ActionStatus {
  const tile = getTile(G, tileId);
  const status: ActionStatus = {
    can: false,
    reasons: [],
    cost: ACTION_COSTS.foundColony
  };

  if (!tile) {
    status.reasons.push("Select a tile.");
    return status;
  }

  status.reasons.push(...canPlaceColonyOnTile(G, playerID, tile).reasons);

  if (!canAfford(G.players[playerID].resources, ACTION_COSTS.foundColony)) {
    status.reasons.push("Not enough resources.");
  }

  if (!playerHasMovablePop(G, playerID)) {
    status.reasons.push("Move one pop from an existing settlement to found a new colony.");
  }

  status.can = status.reasons.length === 0;
  return status;
}

export function getUpgradeColonyToCityStatus(G: HegemonyState, playerID: PlayerId, tileId: string): ActionStatus {
  const tile = getTile(G, tileId);
  const status: ActionStatus = {
    can: false,
    reasons: [],
    cost: ACTION_COSTS.upgradeColonyToCity
  };

  if (!tile) {
    status.reasons.push("Select a tile.");
    return status;
  }

  if (!tile.settlements.some((settlement) => settlement.owner === playerID && settlement.kind === "colony")) {
    status.reasons.push("Requires your colony on this tile.");
  }

  if (tile.settlements.some((settlement) => settlement.kind !== "colony")) {
    status.reasons.push("Tile already has a city or capital.");
  }

  if (isAdjacentToCity(G, tile)) {
    status.reasons.push("Cities and capitals cannot be adjacent.");
  }

  if (!canAfford(G.players[playerID].resources, ACTION_COSTS.upgradeColonyToCity)) {
    status.reasons.push("Not enough resources.");
  }

  status.can = status.reasons.length === 0;
  return status;
}

export function getGrowPopStatus(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
  pop: PopType
): ActionStatus {
  const tile = getTile(G, tileId);
  const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);
  const status: ActionStatus = {
    can: false,
    reasons: []
  };

  if (!tile) {
    status.reasons.push("Select a settlement.");
    status.cost = GROW_POP_COSTS[pop];
    return status;
  }

  if (!settlement) {
    status.reasons.push("Requires your settlement on this tile.");
    status.cost = GROW_POP_COSTS[pop];
    return status;
  }

  status.cost = getGrowPopCost(settlement, pop);

  if (getGrownSettlementsThisTurn(G, playerID).includes(tileId)) {
    status.reasons.push("Already grew a pop here this turn.");
  }

  if (totalPops(settlement.pops) + 1 > settlementPopCapacity(settlement.kind)) {
    status.reasons.push("Settlement is at population capacity.");
  }

  if (!canAfford(G.players[playerID].resources, status.cost)) {
    status.reasons.push("Not enough resources.");
  }

  status.can = status.reasons.length === 0;
  return status;
}

export function getMovePopsStatus(
  G: HegemonyState,
  playerID: PlayerId,
  sourceTileId: string,
  targetTileId: string,
  pops: Pops
): ActionStatus {
  const status: ActionStatus = {
    can: false,
    reasons: []
  };
  const sourceSettlement = getOwnedSettlement(G, sourceTileId, playerID);
  const targetSettlement = getOwnedSettlement(G, targetTileId, playerID);

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

  status.can = status.reasons.length === 0;
  return status;
}

function applyIncomeBuildingEffects(
  contributions: IncomeContribution[],
  income: Resources,
  settlement: Settlement,
  settlementLabel: string,
  primaryResource: Resource
) {
  const popBonusSupport = {
    freemen: { supportedPops: 0, amount: 0 },
    citizens: { supportedPops: 0, amount: 0 },
    slaves: { supportedPops: 0, amount: 0 }
  };

  for (const buildingId of settlement.buildings) {
    const building = BUILDINGS.find((candidate) => candidate.id === buildingId);

    for (const effect of building?.effects ?? []) {
      if (effect.type === "income") {
        addIncomeContribution(contributions, income, {
          resource: effect.resource,
          amount: effect.amount,
          source: settlementLabel,
          detail: building?.name ?? buildingId
        });
      } else if (effect.type === "happiness") {
        addIncomeContribution(contributions, income, {
          resource: "happiness",
          amount: effect.amount,
          source: settlementLabel,
          detail: building?.name ?? buildingId
        });
      } else if (effect.type === "freemanGoldBonus") {
        popBonusSupport.freemen.supportedPops += effect.supportedPops;
        popBonusSupport.freemen.amount = effect.amount;
      } else if (effect.type === "citizenInfluenceBonus") {
        popBonusSupport.citizens.supportedPops += effect.supportedPops;
        popBonusSupport.citizens.amount = effect.amount;
      } else if (effect.type === "slavePrimaryResourceBonus") {
        popBonusSupport.slaves.supportedPops += effect.supportedPops;
        popBonusSupport.slaves.amount = effect.amount;
      }
    }
  }

  const supportedFreemen = Math.min(settlement.pops.freemen, popBonusSupport.freemen.supportedPops);
  addIncomeContribution(contributions, income, {
    resource: "gold",
    amount: supportedFreemen * popBonusSupport.freemen.amount,
    source: settlementLabel,
    detail: `Marketplace supports ${supportedFreemen} ${formatPopName("freemen", supportedFreemen)}`
  });

  const supportedCitizens = Math.min(settlement.pops.citizens, popBonusSupport.citizens.supportedPops);
  addIncomeContribution(contributions, income, {
    resource: "influence",
    amount: supportedCitizens * popBonusSupport.citizens.amount,
    source: settlementLabel,
    detail: `Temple supports ${supportedCitizens} ${formatPopName("citizens", supportedCitizens)}`
  });

  const supportedSlaves = Math.min(settlement.pops.slaves, popBonusSupport.slaves.supportedPops);
  addIncomeContribution(contributions, income, {
    resource: primaryResource,
    amount: supportedSlaves * popBonusSupport.slaves.amount,
    source: settlementLabel,
    detail: `Workshop supports ${supportedSlaves} ${formatPopName("slaves", supportedSlaves)}`
  });
}

function addIncomeContribution(contributions: IncomeContribution[], income: Resources, contribution: IncomeContribution) {
  if (contribution.amount === 0) {
    return;
  }

  contributions.push(contribution);
  income[contribution.resource] += contribution.amount;
}

function summarizeIncome(contributions: IncomeContribution[]): Resources {
  const income = { ...EMPTY_RESOURCES };

  for (const contribution of contributions) {
    income[contribution.resource] += contribution.amount;
  }

  return income;
}

function canPlaceColonyOnTile(G: HegemonyState, playerID: PlayerId, tile: HexTile): ActionStatus {
  const status: ActionStatus = {
    can: false,
    reasons: []
  };

  if (tile.settlements.some((settlement) => settlement.kind !== "colony")) {
    status.reasons.push("Tile already has a city or capital.");
  }

  if (tile.settlements.some((settlement) => settlement.owner === playerID)) {
    status.reasons.push("You already have a settlement here.");
  }

  if (tile.settlements.length >= 2) {
    status.reasons.push("A tile can hold at most two colonies.");
  }

  if (isAdjacentToEnemyCapital(G, playerID, tile)) {
    status.reasons.push("Cannot found next to an enemy capital.");
  }

  status.can = status.reasons.length === 0;
  return status;
}

function isAdjacentToCity(G: HegemonyState, tile: HexTile) {
  return G.board.tiles.some((candidate) => {
    if (hexDistance(candidate, tile) > 1) {
      return false;
    }

    return candidate.settlements.some((settlement) => settlement.kind !== "colony");
  });
}

function isAdjacentToEnemyCapital(G: HegemonyState, playerID: PlayerId, tile: HexTile) {
  return G.board.tiles.some((candidate) => {
    if (hexDistance(candidate, tile) !== 1) {
      return false;
    }

    return candidate.settlements.some(
      (settlement) => settlement.kind === "capital" && settlement.owner !== playerID
    );
  });
}

export function getGrowPopCost(settlement: Settlement, pop: PopType): Partial<Resources> {
  const baseCost = GROW_POP_COSTS[pop];
  const discountedFood = Math.max(0, (baseCost.food ?? 0) - getGrowPopFoodDiscount(settlement));

  return {
    ...baseCost,
    food: discountedFood
  };
}

function getGrowPopFoodDiscount(settlement: Settlement) {
  return settlement.buildings.reduce((discount, buildingId) => {
    const building = BUILDINGS.find((candidate) => candidate.id === buildingId);

    return (
      discount +
      (building?.effects ?? []).reduce(
        (effectDiscount, effect) =>
          effect.type === "growPopFoodDiscount" ? effectDiscount + effect.amount : effectDiscount,
        0
      )
    );
  }, 0);
}

function getGrownSettlementsThisTurn(G: HegemonyState, playerID: PlayerId) {
  return G.players[playerID].grownSettlementsThisTurn ?? [];
}

function markSettlementGrown(G: HegemonyState, playerID: PlayerId, tileId: string) {
  const player = G.players[playerID];

  player.grownSettlementsThisTurn = [...(player.grownSettlementsThisTurn ?? []), tileId];
}

function canAfford(resources: Resources, cost: Partial<Resources>) {
  return Object.entries(cost).every(([resource, amount]) => resources[resource as Resource] >= (amount ?? 0));
}

function payCost(resources: Resources, cost: Partial<Resources>) {
  for (const [resource, amount] of Object.entries(cost)) {
    resources[resource as Resource] -= amount ?? 0;
  }
}

function applyResourceDelta(resources: Resources, delta: Resources) {
  for (const [resource, amount] of Object.entries(delta)) {
    resources[resource as Resource] += amount;
  }
}

function schedulePopulationTransfer(
  G: HegemonyState,
  playerID: PlayerId,
  sourceTileId: string,
  targetTileId: string,
  pops: Pops,
  requireTarget = true
) {
  const sourceSettlement = getOwnedSettlement(G, sourceTileId, playerID);
  const targetSettlement = getOwnedSettlement(G, targetTileId, playerID);

  if (!sourceSettlement || (requireTarget && !targetSettlement) || !isPositivePopSelection(pops)) {
    return INVALID_MOVE;
  }

  if (!hasPops(sourceSettlement.pops, pops)) {
    return INVALID_MOVE;
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
}

function getOwnedSettlement(G: HegemonyState, tileId: string, playerID: PlayerId) {
  const tile = getTile(G, tileId);

  return tile?.settlements.find((settlement) => settlement.owner === playerID);
}

function playerHasMovablePop(G: HegemonyState, playerID: PlayerId) {
  return G.players[playerID].settlements.some((tileId) => {
    const settlement = getOwnedSettlement(G, tileId, playerID);

    return settlement ? totalPops(settlement.pops) > 0 : false;
  });
}

function isExactPopSelection(pops: Pops, requiredTotal: number) {
  return isValidPopSelection(pops) && totalPops(pops) === requiredTotal;
}

function isPositivePopSelection(pops: Pops) {
  return isValidPopSelection(pops) && totalPops(pops) > 0;
}

function isValidPopSelection(pops: Pops) {
  return POP_TYPES.every((pop) => Number.isInteger(pops[pop]) && pops[pop] >= 0);
}

function hasPops(source: Pops, requested: Pops) {
  return POP_TYPES.every((pop) => source[pop] >= requested[pop]);
}

function addPops(target: Pops, pops: Pops) {
  for (const pop of POP_TYPES) {
    target[pop] += pops[pop];
  }
}

function subtractPops(target: Pops, pops: Pops) {
  for (const pop of POP_TYPES) {
    target[pop] -= pops[pop];
  }
}

export function clonePops(pops: Pops): Pops {
  return { citizens: pops.citizens, freemen: pops.freemen, slaves: pops.slaves };
}

export function formatPops(pops: Pops) {
  const entries = POP_TYPES.filter((pop) => pops[pop] > 0);

  if (entries.length === 0) {
    return "no pops";
  }

  return entries.map((pop) => `${pops[pop]} ${formatPopName(pop, pops[pop])}`).join(", ");
}

function formatPopName(pop: PopType, amount: number) {
  if (pop === "citizens") {
    return amount === 1 ? "citizen" : "citizens";
  }

  if (pop === "freemen") {
    return amount === 1 ? "freeman" : "freemen";
  }

  return amount === 1 ? "slave" : "slaves";
}

function formatTileLabel(G: HegemonyState, tileId: string) {
  const tile = getTile(G, tileId);

  return tile ? `${tile.terrain} ${tile.id}` : tileId;
}

function formatRuleResourceDelta(resources: Resources) {
  const entries = (Object.entries(resources) as Array<[Resource, number]>).filter(([, amount]) => amount !== 0);

  if (entries.length === 0) {
    return "no change";
  }

  return entries.map(([resource, amount]) => `${formatRuleNumber(amount, true)} ${resource}`).join(", ");
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function formatRuleNumber(amount: number, signed = false) {
  const rounded = Math.round(amount * 100) / 100;
  const value = Number.isInteger(rounded) ? `${rounded}` : `${rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}`;
  return signed && rounded > 0 ? `+${value}` : value;
}

function getTile(G: HegemonyState, tileId: string) {
  return G.board.tiles.find((tile) => tile.id === tileId);
}

function addLog(G: HegemonyState, message: string) {
  G.log.push({
    id: `${G.season}-${G.log.length}-${message}`,
    season: G.season,
    message
  });
}
