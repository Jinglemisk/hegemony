import { BUILDINGS, EMPTY_RESOURCES, PLAYER_IDS, STARTING_RESOURCES } from "./data";
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

  if (!tile || player.settlements.length !== 1) {
    return INVALID_MOVE;
  }

  if (tile.settlements.some((settlement) => settlement.kind !== "colony")) {
    return INVALID_MOVE;
  }

  if (tile.settlements.some((settlement) => settlement.owner === playerID) || tile.settlements.length >= 2) {
    return INVALID_MOVE;
  }

  if (!hasFriendlyAdjacentSettlement(G, playerID, tile)) {
    return INVALID_MOVE;
  }

  if (isAdjacentToEnemyCapital(G, playerID, tile)) {
    return INVALID_MOVE;
  }

  tile.settlements.push({
    owner: playerID,
    kind: "colony",
    buildings: [],
    pops: { ...STARTING_COLONY_POPS }
  });
  player.settlements.push(tile.id);
  addLog(G, `${getPlayerName(G, playerID)} founded a colony on ${tile.terrain}.`);
}

export function collectIncome(G: HegemonyState, playerID: PlayerId) {
  const player = G.players[playerID];

  if (player.collectedThisTurn) {
    return INVALID_MOVE;
  }

  const income = calculateIncome(G, playerID);
  applyResourceDelta(player.resources, income);
  player.collectedThisTurn = true;
  addLog(G, `${getPlayerName(G, playerID)} collected income.`);
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

  if (settlement.buildings.length >= buildingSlotCapacity(tile, settlement)) {
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

function calculateIncome(G: HegemonyState, playerID: PlayerId): Resources {
  const income = { ...EMPTY_RESOURCES };

  for (const tileId of G.players[playerID].settlements) {
    const tile = getTile(G, tileId);
    const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);

    if (!tile || !settlement) {
      continue;
    }

    const share = settlement.kind === "colony" && tile.settlements.length > 1 ? 0.5 : 1;
    const multiplier = settlement.kind === "capital" ? 2 : 1;
    income[tile.resource.type] += Math.floor(tile.resource.amount * share * multiplier);

    income.influence += settlement.pops.citizens;
    income.gold += settlement.pops.freemen * 2;
    income.food -= settlement.pops.citizens * 2;
    income.food -= settlement.pops.freemen;
    income[tile.resource.type] += Math.floor(settlement.pops.slaves / 3);
    income.food -= Math.floor(settlement.pops.slaves / 3);
    income.unrest += Math.floor(settlement.pops.slaves / 9);

    for (const buildingId of settlement.buildings) {
      if (buildingId === "granary") {
        income.food += 2;
      }
    }
  }

  if (income.food < 0) {
    income.unrest += Math.abs(income.food);
  }

  return income;
}

function applyBuildingEffect(settlement: Settlement, buildingId: BuildingId) {
  if (buildingId === "marketplace") {
    settlement.pops.freemen += 1;
  }

  if (buildingId === "temple") {
    settlement.pops.citizens += 1;
  }

  if (buildingId === "workshop") {
    settlement.pops.slaves += 2;
  }
}

function buildingSlotCapacity(tile: HexTile, settlement: Settlement) {
  return tile.buildingSlots + (settlement.kind === "capital" ? 4 : 2);
}

function hasFriendlyAdjacentSettlement(G: HegemonyState, playerID: PlayerId, tile: HexTile) {
  return G.board.tiles.some((candidate) => {
    if (hexDistance(candidate, tile) !== 1) {
      return false;
    }

    return candidate.settlements.some((settlement) => settlement.owner === playerID);
  });
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
