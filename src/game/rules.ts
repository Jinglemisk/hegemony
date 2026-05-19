import { ACTION_COSTS, BUILDINGS, EMPTY_RESOURCES, PLAYER_IDS, SETTLEMENT_RULES, STARTING_RESOURCES } from "./data";
import { createInitialMap, hexDistance } from "./map";
import type {
  BuildingId,
  HegemonyState,
  HexTile,
  PlayerId,
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

const STARTING_CAPITAL_POPS: Pops = {
  citizens: 1,
  freemen: 2,
  slaves: 3
};

const STARTING_COLONY_POPS: Pops = {
  citizens: 0,
  freemen: 0,
  slaves: 3
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
          collectedThisTurn: false
        }
      }),
      {} as HegemonyState["players"]
    ),
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

export function placeCapital(G: HegemonyState, playerID: PlayerId, tileId: string) {
  const tile = getTile(G, tileId);
  const player = G.players[playerID];

  if (!tile || player.settlements.length > 0 || tile.settlements.length > 0) {
    return INVALID_MOVE;
  }

  if (isAdjacentToCity(G, tile)) {
    return INVALID_MOVE;
  }

  tile.settlements.push({
    owner: playerID,
    kind: "capital",
    buildings: [],
    pops: { ...STARTING_CAPITAL_POPS }
  });
  player.settlements.push(tile.id);
  addLog(G, `${getPlayerName(G, playerID)} founded a capital on ${tile.terrain}.`);
}

export function placeColony(G: HegemonyState, playerID: PlayerId, tileId: string) {
  const tile = getTile(G, tileId);
  const player = G.players[playerID];

  if (!tile || player.settlements.length !== 1 || !canPlaceColonyOnTile(G, playerID, tile).can) {
    return INVALID_MOVE;
  }

  addColony(G, playerID, tile);
}

export function foundColony(G: HegemonyState, playerID: PlayerId, tileId: string) {
  const status = getFoundColonyStatus(G, playerID, tileId);
  const tile = getTile(G, tileId);

  if (!tile || !status.can) {
    return INVALID_MOVE;
  }

  payCost(G.players[playerID].resources, ACTION_COSTS.foundColony);
  addColony(G, playerID, tile);
}

export function upgradeColonyToCity(G: HegemonyState, playerID: PlayerId, tileId: string) {
  const status = getUpgradeColonyToCityStatus(G, playerID, tileId);
  const tile = getTile(G, tileId);
  const settlement = tile?.settlements.find(
    (candidate) => candidate.owner === playerID && candidate.kind === "colony"
  );

  if (!tile || !settlement || !status.can) {
    return INVALID_MOVE;
  }

  payCost(G.players[playerID].resources, ACTION_COSTS.upgradeColonyToCity);
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
}

function addColony(G: HegemonyState, playerID: PlayerId, tile: HexTile) {
  tile.settlements.push({
    owner: playerID,
    kind: "colony",
    buildings: [],
    pops: { ...STARTING_COLONY_POPS }
  });
  G.players[playerID].settlements.push(tile.id);
  addLog(G, `${getPlayerName(G, playerID)} founded a colony on ${tile.terrain}.`);
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
  applyBuildingEffect(settlement, building.id);
  addLog(G, `${getPlayerName(G, playerID)} built ${building.name}.`);
}

export function resetTurnFlags(G: HegemonyState) {
  for (const player of Object.values(G.players)) {
    player.collectedThisTurn = false;
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

    const share = settlement.kind === "colony" && tile.settlements.length > 1 ? 0.5 : 1;
    const multiplier = settlement.kind === "capital" ? 2 : 1;
    const settlementLabel = `${capitalize(settlement.kind)} on ${tile.terrain} ${tile.id}`;
    const tileAmount = Math.floor(tile.resource.amount * share * multiplier);
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
      amount: settlement.pops.freemen * 4,
      source: settlementLabel,
      detail: `${settlement.pops.freemen} freeman pops`
    });
    addIncomeContribution(contributions, income, {
      resource: "food",
      amount: settlement.pops.citizens * -2,
      source: settlementLabel,
      detail: `${settlement.pops.citizens} citizens upkeep`
    });
    addIncomeContribution(contributions, income, {
      resource: "food",
      amount: settlement.pops.freemen * -2,
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
      resource: "unrest",
      amount: settlement.pops.slaves / 3,
      source: settlementLabel,
      detail: `${settlement.pops.slaves} slave pops unrest`
    });
    addIncomeContribution(contributions, income, {
      resource: "unrest",
      amount: settlementOverCapacity(settlement),
      source: settlementLabel,
      detail: "Over capacity"
    });

    applyIncomeBuildingEffects(contributions, income, settlement, settlementLabel);
  }

  if (income.food < 0) {
    addIncomeContribution(contributions, income, {
      resource: "unrest",
      amount: Math.abs(income.food),
      source: "Food shortage",
      detail: "Negative food income"
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

function applyBuildingEffect(settlement: Settlement, buildingId: BuildingId) {
  const building = BUILDINGS.find((candidate) => candidate.id === buildingId);

  for (const effect of building?.effects ?? []) {
    if (effect.type === "addPop") {
      settlement.pops[effect.pop] += effect.amount;
    }
  }
}

function applyIncomeBuildingEffects(
  contributions: IncomeContribution[],
  income: Resources,
  settlement: Settlement,
  settlementLabel: string
) {
  for (const buildingId of settlement.buildings) {
    const building = BUILDINGS.find((candidate) => candidate.id === buildingId);

    for (const effect of building?.effects ?? []) {
      if (effect.type === "income") {
        addIncomeContribution(contributions, income, {
          resource: effect.resource,
          amount: effect.amount,
          source: building?.name ?? buildingId,
          detail: settlementLabel
        });
      }
    }
  }
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

function hasFriendlyAdjacentSettlement(G: HegemonyState, playerID: PlayerId, tile: HexTile) {
  return G.board.tiles.some((candidate) => {
    if (hexDistance(candidate, tile) !== 1) {
      return false;
    }

    return candidate.settlements.some((settlement) => settlement.owner === playerID);
  });
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

  if (!hasFriendlyAdjacentSettlement(G, playerID, tile)) {
    status.reasons.push("Requires an adjacent friendly settlement.");
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
