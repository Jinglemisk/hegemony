import {
  ACTION_COSTS,
  BUILDINGS,
  EMPTY_RESOURCES,
  GROW_POP_COSTS,
  PLAYER_EVENT_CARDS,
  PLAYER_IDS,
  PLAYER_NAMES,
  SEASONAL_EVENT_CARDS,
  SETTLEMENT_RULES,
  STARTING_RESOURCES
} from "./data";
import { createInitialMap, hexDistance } from "./map";
import type {
  ActionCostDiscountTarget,
  BuildingId,
  EventCard,
  EventDeckKind,
  EventEffect,
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

export type FoodShortageStatus = {
  stockpile: number;
  income: number;
  projectedStockpile: number;
  rawPressure: number;
  appliedPressure: number;
  gracePreventedPressure: number;
  firstTurnGraceActive: boolean;
};

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

export const POP_TYPES: PopType[] = ["citizens", "freemen", "slaves"];

export const EMPTY_POPS: Pops = {
  citizens: 0,
  freemen: 0,
  slaves: 0
};

export const PLACEMENT_POP_COUNTS = {
  city: 3,
  capital: 3,
  colony: 1
};

type CostedAction = ActionCostDiscountTarget | "upgradeColonyToCity";

export function createInitialState(seed = createSeed()): HegemonyState {
  let rng = seed >>> 0;
  const seasonal = shuffleWithSeed(expandDeck(SEASONAL_EVENT_CARDS), rng);
  rng = seasonal.state;
  const player = shuffleWithSeed(expandDeck(PLAYER_EVENT_CARDS), rng);
  rng = player.state;

  return {
    board: {
      tiles: createInitialMap()
    },
    players: PLAYER_IDS.reduce(
      (players, playerId) => ({
        ...players,
        [playerId]: {
          id: playerId,
          name: PLAYER_NAMES[playerId],
          resources: { ...STARTING_RESOURCES },
          settlements: [],
          collectedThisTurn: false,
          hasCollectedGameplayIncome: false,
          grownSettlementsThisTurn: [],
          actionCostDiscounts: []
        }
      }),
      {} as HegemonyState["players"]
    ),
    transfers: [],
    seasonalDrawPile: seasonal.cards,
    seasonalDiscardPile: [],
    playerDrawPile: player.cards,
    playerDiscardPile: [],
    activeSeasonEvent: null,
    lastPlayerEvent: null,
    pendingPlayerEvent: null,
    season: 1,
    rng,
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
    !isExactPopSelection(pops, PLACEMENT_POP_COUNTS.city)
  ) {
    return INVALID_MOVE;
  }

  if (isAdjacentToCity(G, tile)) {
    return INVALID_MOVE;
  }

  tile.settlements.push({
    owner: playerID,
    kind: "city",
    buildings: [],
    pops: clonePops(pops)
  });
  player.settlements.push(tile.id);
  addLog(G, `${getPlayerName(G, playerID)} founded a city on ${tile.terrain} with ${formatPops(pops)}.`);
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

  payCost(G.players[playerID].resources, status.cost ?? ACTION_COSTS.foundColony);
  consumeActionCostDiscounts(G, playerID, "foundColony");
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

  payCost(G.players[playerID].resources, status.cost ?? ACTION_COSTS.upgradeColonyToCity);
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

  if (player.collectedThisTurn || G.pendingPlayerEvent) {
    return INVALID_MOVE;
  }

  const income = calculateIncome(G, playerID);
  applyResourceDelta(player.resources, income);
  player.collectedThisTurn = true;
  player.hasCollectedGameplayIncome = true;
  addLog(
    G,
    `${getPlayerName(G, playerID)} ${mode === "automatic" ? "automatically collected" : "collected"} income (${formatRuleResourceDelta(income)}).`
  );
  drawPlayerEvent(G, playerID);
}

export function buildBuilding(G: HegemonyState, playerID: PlayerId, tileId: string, buildingId: BuildingId) {
  const tile = getTile(G, tileId);
  const building = BUILDINGS.find((candidate) => candidate.id === buildingId);
  const settlement = tile?.settlements.find(
    (candidate) => candidate.owner === playerID && candidate.kind !== "colony"
  );
  const status = getBuildBuildingStatus(G, playerID, tileId, buildingId);

  if (!tile || !building || !settlement || !status.can) {
    return INVALID_MOVE;
  }

  payCost(G.players[playerID].resources, status.cost ?? building.cost);
  consumeActionCostDiscounts(G, playerID, "buildBuilding", building.id);
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
  if (G.activeSeasonEvent) {
    G.seasonalDiscardPile.push(G.activeSeasonEvent.card);
    G.activeSeasonEvent = null;
  }

  G.season += 1;
  resetTurnFlags(G);
  addLog(G, `Season ${G.season} begins.`);
  drawSeasonalEvent(G);
}

export function expireTurnEventModifiers(G: HegemonyState, playerID: PlayerId) {
  const expired = G.players[playerID].actionCostDiscounts;

  if (expired.length === 0) {
    return;
  }

  G.players[playerID].actionCostDiscounts = [];
  addLog(G, `${getPlayerName(G, playerID)}'s unused event discounts expired.`);
}

export function drawSeasonalEvent(G: HegemonyState) {
  const card = drawFromEventDeck(G, "seasonal");

  if (!card) {
    addLog(G, "The Seasonal Event deck is empty.");
    return;
  }

  G.activeSeasonEvent = { card, season: G.season };
  addLog(G, `Seasonal Event revealed: ${card.name}. ${card.text}`);

  if (card.timing === "immediate") {
    applyEventEffects(G, card, null, card.effects);
  }
}

export function drawPlayerEvent(G: HegemonyState, playerID: PlayerId) {
  const card = drawFromEventDeck(G, "player");

  if (!card) {
    addLog(G, "The Player Event deck is empty.");
    return;
  }

  G.lastPlayerEvent = card;
  addLog(G, `${getPlayerName(G, playerID)} received Player Event card ${card.name}. ${card.text}`);

  if (!hasResolvablePendingOption(G, playerID, card)) {
    G.playerDiscardPile.push(card);
    addLog(G, `${card.name} had no legal resolution and was discarded.`);
    return;
  }

  G.pendingPlayerEvent = { card, playerID };
  addLog(G, `${getPlayerName(G, playerID)} must reveal and resolve ${card.name} before taking normal actions.`);
}

export function resolvePendingPlayerEvent(
  G: HegemonyState,
  playerID: PlayerId,
  targetTileId?: string,
  choiceIndex = 0
) {
  const pending = G.pendingPlayerEvent;

  if (!pending || pending.playerID !== playerID) {
    return INVALID_MOVE;
  }

  const choices = getEventEffectChoices(pending.card);
  const effects = choices[choiceIndex];

  if (!effects) {
    return INVALID_MOVE;
  }

  const popEffect = getAddPopsEffect(effects);

  if (popEffect) {
    if (!targetTileId || !canAddEventPopsToSettlement(G, playerID, targetTileId, popEffect)) {
      return INVALID_MOVE;
    }
  }

  applyEventEffects(G, pending.card, playerID, effects, targetTileId);
  G.playerDiscardPile.push(pending.card);
  G.pendingPlayerEvent = null;
  addLog(G, `${getPlayerName(G, playerID)} resolved ${pending.card.name}.`);
}

export function getEventEffectChoices(card: EventCard): EventEffect[][] {
  const choiceEffect = card.effects.find((effect): effect is Extract<EventEffect, { type: "choice" }> => effect.type === "choice");

  return choiceEffect ? choiceEffect.options : [card.effects];
}

export function getAddPopsEffect(effects: EventEffect[]) {
  return effects.find((effect): effect is Extract<EventEffect, { type: "addPops" }> => effect.type === "addPops");
}

export function getEventPopTargetTileIds(
  G: HegemonyState,
  playerID: PlayerId,
  effect: Extract<EventEffect, { type: "addPops" }>
) {
  return G.players[playerID].settlements.filter((tileId) => canAddEventPopsToSettlement(G, playerID, tileId, effect));
}

export function getAdjustedActionCost(
  G: HegemonyState,
  playerID: PlayerId,
  action: CostedAction,
  baseCost: Partial<Resources>,
  buildingId?: BuildingId
): Partial<Resources> {
  const adjusted = clonePartialResources(baseCost);
  const multiplier = getSeasonBuildingCostMultiplier(G, action);

  if (multiplier !== 1) {
    for (const [resource, amount] of Object.entries(adjusted) as Array<[Resource, number | undefined]>) {
      adjusted[resource] = Math.ceil((amount ?? 0) * multiplier);
    }
  }

  if (action === "buildBuilding" || action === "foundColony") {
    for (const discount of getMatchingActionCostDiscounts(G, playerID, action, buildingId)) {
      adjusted[discount.resource] = Math.max(0, (adjusted[discount.resource] ?? 0) - discount.amount);
    }
  }

  return adjusted;
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

  return Math.floor(tile.resource.amount * share);
}

/**
 * Net resource income produced by a single settlement: tile yield + pop yields +
 * building effects. Mirrors the per-settlement portion of {@link calculateIncomeBreakdown}
 * without the player-level seasonal / food-shortage adjustments. Used to render the
 * settlement summary card.
 */
export function settlementNetYield(tile: HexTile, settlement: Settlement): Resources {
  const income: Resources = { ...EMPTY_RESOURCES };

  income[tile.resource.type] += settlementTileYield(tile, settlement);
  income.influence += settlement.pops.citizens;
  income.gold += settlement.pops.citizens * 2;
  income.food -= settlement.pops.citizens * 2;
  income.gold += settlement.pops.freemen * 2;
  income.food -= settlement.pops.freemen;
  income[tile.resource.type] += settlement.pops.slaves;
  income.food -= settlement.pops.slaves;
  income.happiness -= settlement.pops.slaves * 0.5;
  income.happiness -= settlementOverCapacity(settlement);

  applyIncomeBuildingEffects([], income, settlement, settlementIncomeSource(tile, settlement), tile.resource.type);

  return income;
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
    const settlementLabel = settlementIncomeSource(tile, settlement);
    const tileAmount = settlementTileYield(tile, settlement);
    addIncomeContribution(contributions, income, {
      resource: tile.resource.type,
      amount: tileAmount,
      source: settlementLabel,
      detail: `Tile yield${share < 1 ? " shared colony" : ""}`
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

  applySeasonalIncomeEffects(G, playerID, contributions, income);

  const foodShortage = getFoodShortageStatus(G, playerID, income.food);

  if (foodShortage.appliedPressure < 0) {
    addIncomeContribution(contributions, income, {
      resource: "happiness",
      amount: foodShortage.appliedPressure,
      source: "Food shortage",
      detail: `Projected food stockpile ${formatRuleNumber(foodShortage.projectedStockpile)}`
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

export function getFoodShortageStatus(G: HegemonyState, playerID: PlayerId, foodIncome: number): FoodShortageStatus {
  const stockpile = G.players[playerID].resources.food;
  const projectedStockpile = stockpile + foodIncome;
  const rawPressure = projectedStockpile < 0 ? projectedStockpile : 0;
  const firstTurnGraceActive = !G.players[playerID].hasCollectedGameplayIncome;
  const appliedPressure = firstTurnGraceActive ? 0 : rawPressure;

  return {
    stockpile,
    income: foodIncome,
    projectedStockpile,
    rawPressure,
    appliedPressure,
    gracePreventedPressure: firstTurnGraceActive ? rawPressure : 0,
    firstTurnGraceActive
  };
}

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

export function getFoundColonyStatus(G: HegemonyState, playerID: PlayerId, tileId: string): ActionStatus {
  const tile = getTile(G, tileId);
  const status: ActionStatus = {
    can: false,
    reasons: [],
    cost: getAdjustedActionCost(G, playerID, "foundColony", ACTION_COSTS.foundColony)
  };

  if (!tile) {
    status.reasons.push("Select a tile.");
    return status;
  }

  addPendingEventReason(G, status);

  status.reasons.push(...canPlaceColonyOnTile(G, playerID, tile).reasons);

  if (!canAfford(G.players[playerID].resources, status.cost ?? ACTION_COSTS.foundColony)) {
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

  addPendingEventReason(G, status);

  if (!tile.settlements.some((settlement) => settlement.owner === playerID && settlement.kind === "colony")) {
    status.reasons.push("Requires your colony on this tile.");
  }

  if (tile.settlements.some((settlement) => settlement.kind !== "colony")) {
    status.reasons.push("Tile already has a city.");
  }

  if (isAdjacentToCity(G, tile)) {
    status.reasons.push("Cities cannot be adjacent.");
  }

  if (!canAfford(G.players[playerID].resources, status.cost ?? ACTION_COSTS.upgradeColonyToCity)) {
    status.reasons.push("Not enough resources.");
  }

  status.can = status.reasons.length === 0;
  return status;
}

export function getBuildBuildingStatus(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
  buildingId: BuildingId
): ActionStatus {
  const tile = getTile(G, tileId);
  const building = BUILDINGS.find((candidate) => candidate.id === buildingId);
  const settlement = tile?.settlements.find(
    (candidate) => candidate.owner === playerID && candidate.kind !== "colony"
  );
  const status: ActionStatus = {
    can: false,
    reasons: [],
    cost: building ? getAdjustedActionCost(G, playerID, "buildBuilding", building.cost, building.id) : undefined
  };

  if (!tile) {
    status.reasons.push("Select a tile.");
    return status;
  }

  if (!building) {
    status.reasons.push("Choose a building.");
    return status;
  }

  addPendingEventReason(G, status);

  if (!settlement) {
    status.reasons.push("Requires your city on this tile.");
  } else if (settlement.buildings.length >= settlementBuildingSlots(tile, settlement)) {
    status.reasons.push("No building slots available.");
  }

  if (!canAfford(G.players[playerID].resources, status.cost ?? building.cost)) {
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

  addPendingEventReason(G, status);

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

  addPendingEventReason(G, status);

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

function previewEconomyAction(
  G: HegemonyState,
  playerID: PlayerId,
  title: string,
  applyAction: (draft: HegemonyState) => typeof INVALID_MOVE | void
): EconomyPreview | null {
  const before = calculateEconomyProjection(G, playerID, { resolveTransfers: true });
  const draft = structuredClone(G);
  const result = applyAction(draft);

  if (result === INVALID_MOVE) {
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
        capacity: settlementPopCapacity(settlement.kind),
        overCapacity: settlementOverCapacity(settlement),
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

function expandDeck(cards: EventCard[]): EventCard[] {
  return cards.flatMap((card) => Array.from({ length: card.count }, () => card));
}

function createSeed(): number {
  return Math.floor(Math.random() * 0x1_0000_0000);
}

/**
 * Deterministic Fisher-Yates shuffle driven by a mulberry32 PRNG. Returns the
 * shuffled copy plus the advanced PRNG state so the caller can persist it on
 * {@link HegemonyState.rng} and keep later reshuffles reproducible from the
 * game's initial seed.
 */
function shuffleWithSeed<T>(cards: T[], seedState: number): { cards: T[]; state: number } {
  let state = seedState >>> 0;
  const nextUnit = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };

  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextUnit() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return { cards: shuffled, state: state >>> 0 };
}

function drawFromEventDeck(G: HegemonyState, deck: EventDeckKind) {
  const drawKey = deck === "seasonal" ? "seasonalDrawPile" : "playerDrawPile";
  const discardKey = deck === "seasonal" ? "seasonalDiscardPile" : "playerDiscardPile";

  if (G[drawKey].length === 0 && G[discardKey].length > 0) {
    const reshuffled = shuffleWithSeed(G[discardKey], G.rng);
    G[drawKey] = reshuffled.cards;
    G.rng = reshuffled.state;
    G[discardKey] = [];
    addLog(G, `${capitalize(deck)} Event discard reshuffled into the draw pile.`);
  }

  return G[drawKey].shift() ?? null;
}

function hasResolvablePendingOption(G: HegemonyState, playerID: PlayerId, card: EventCard) {
  return getEventEffectChoices(card).some((effects) => {
    const popEffect = getAddPopsEffect(effects);

    return !popEffect || getEventPopTargetTileIds(G, playerID, popEffect).length > 0;
  });
}

function canAddEventPopsToSettlement(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
  effect: Extract<EventEffect, { type: "addPops" }>
) {
  const settlement = getOwnedSettlement(G, tileId, playerID);

  return settlement ? totalPops(settlement.pops) + effect.amount <= settlementPopCapacity(settlement.kind) : false;
}

function applyEventEffects(
  G: HegemonyState,
  card: EventCard,
  activePlayerID: PlayerId | null,
  effects: EventEffect[],
  targetTileId?: string
) {
  for (const effect of effects) {
    if (effect.type === "choice") {
      continue;
    }

    if (effect.type === "resourceDelta") {
      for (const playerID of scopedPlayerIds(effect.scope, activePlayerID)) {
        applyEventResourceDelta(G, playerID, createResourceDelta(effect.resource, effect.amount), card.name);
      }
    } else if (effect.type === "scaledResourceDelta") {
      for (const playerID of scopedPlayerIds(effect.scope, activePlayerID)) {
        const amount = scaledByPops(G, playerID, effect.amountPerPops, effect.popStep, effect.minimum);
        applyEventResourceDelta(G, playerID, createResourceDelta(effect.resource, amount), card.name);
      }
    } else if (effect.type === "happinessDelta") {
      for (const playerID of scopedPlayerIds(effect.scope, activePlayerID)) {
        applyEventResourceDelta(G, playerID, createResourceDelta("happiness", effect.amount), card.name);
      }
    } else if (effect.type === "scaledHappinessDelta" && effect.duration !== "season") {
      for (const playerID of scopedPlayerIds(effect.scope, activePlayerID)) {
        const amount = scaledByPops(G, playerID, effect.amountPerPops, effect.popStep, effect.minimumMagnitude);
        applyEventResourceDelta(G, playerID, createResourceDelta("happiness", amount), card.name);
      }
    } else if (effect.type === "incomeModifier" || effect.type === "buildingCostMultiplier") {
      addLog(G, `${card.name} modifier is active: ${card.text}`);
    } else if (effect.type === "addPops") {
      if (!activePlayerID || !targetTileId) {
        continue;
      }

      const settlement = getOwnedSettlement(G, targetTileId, activePlayerID);

      if (!settlement) {
        continue;
      }

      settlement.pops[effect.pop] += effect.amount;
      addLog(
        G,
        `${getPlayerName(G, activePlayerID)} added ${effect.amount} ${formatPopName(effect.pop, effect.amount)} to ${formatTileLabel(G, targetTileId)} from ${card.name}.`
      );
    } else if (effect.type === "actionCostDiscount") {
      if (!activePlayerID) {
        continue;
      }

      G.players[activePlayerID].actionCostDiscounts.push({
        id: `${card.id}-${G.season}-${G.log.length}`,
        sourceCardId: card.id,
        label: card.name,
        action: effect.action,
        buildingId: effect.buildingId,
        resource: effect.resource,
        amount: effect.amount,
        consume: effect.consume
      });
      addLog(
        G,
        `${getPlayerName(G, activePlayerID)} gained a ${formatRuleNumber(effect.amount)} ${effect.resource} discount from ${card.name}.`
      );
    } else if (effect.type === "resourceExchange") {
      if (!activePlayerID) {
        continue;
      }

      const player = G.players[activePlayerID];
      const exchanged = Math.min(effect.maxAmount, Math.max(0, player.resources[effect.from]));
      player.resources[effect.from] -= exchanged;
      player.resources[effect.to] += exchanged * effect.ratio;
      addLog(
        G,
        `${getPlayerName(G, activePlayerID)} exchanged ${formatRuleNumber(exchanged)} ${effect.from} for ${formatRuleNumber(
          exchanged * effect.ratio
        )} ${effect.to} from ${card.name}.`
      );
    } else if (effect.type === "resourceDeltaPerPop") {
      for (const playerID of scopedPlayerIds(effect.scope, activePlayerID)) {
        const popCount = countPlayerPopType(G, playerID, effect.pop);
        const amount = Math.max(effect.minimum, popCount * effect.amountPerPop);
        applyEventResourceDelta(G, playerID, createResourceDelta(effect.resource, amount), card.name);
      }
    }
  }
}

function applyEventResourceDelta(G: HegemonyState, playerID: PlayerId, delta: Resources, source: string) {
  applyResourceDelta(G.players[playerID].resources, delta);
  addLog(G, `${getPlayerName(G, playerID)} resolved ${source}: ${formatRuleResourceDelta(delta)}.`);
}

function scopedPlayerIds(scope: "activePlayer" | "allPlayers", activePlayerID: PlayerId | null) {
  return scope === "allPlayers" ? PLAYER_IDS : activePlayerID ? [activePlayerID] : [];
}

function scaledByPops(G: HegemonyState, playerID: PlayerId, amountPerPops: number, popStep: number, minimumMagnitude: number) {
  const { pops } = playerPopulationTotals(G, playerID);
  const scaled = Math.floor(pops / popStep) * amountPerPops;
  const sign = amountPerPops < 0 ? -1 : 1;

  return Math.abs(scaled) >= minimumMagnitude ? scaled : sign * minimumMagnitude;
}

function countPlayerPopType(G: HegemonyState, playerID: PlayerId, pop: PopType) {
  return G.players[playerID].settlements.reduce((count, tileId) => {
    const settlement = getOwnedSettlement(G, tileId, playerID);

    return count + (settlement?.pops[pop] ?? 0);
  }, 0);
}

function createResourceDelta(resource: Resource, amount: number): Resources {
  return {
    ...EMPTY_RESOURCES,
    [resource]: amount
  };
}

function applySeasonalIncomeEffects(
  G: HegemonyState,
  playerID: PlayerId,
  contributions: IncomeContribution[],
  income: Resources
) {
  const card = G.activeSeasonEvent?.card;

  if (!card) {
    return;
  }

  for (const effect of card.effects) {
    if (effect.type === "incomeModifier" && effect.duration === "season" && effectAppliesToPlayer(effect.scope, playerID)) {
      addIncomeContribution(contributions, income, {
        resource: effect.resource,
        amount: effect.amount,
        source: card.name,
        detail: "Seasonal event"
      });
    } else if (
      effect.type === "scaledHappinessDelta" &&
      effect.duration === "season" &&
      effectAppliesToPlayer(effect.scope, playerID)
    ) {
      addIncomeContribution(contributions, income, {
        resource: "happiness",
        amount: scaledByPops(G, playerID, effect.amountPerPops, effect.popStep, effect.minimumMagnitude),
        source: card.name,
        detail: "Seasonal event"
      });
    }
  }
}

function effectAppliesToPlayer(scope: "activePlayer" | "allPlayers", playerID: PlayerId) {
  return scope === "allPlayers" || PLAYER_IDS.includes(playerID);
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

function cloneResources(resources: Resources): Resources {
  return { ...resources };
}

function diffResources(after: Resources, before: Resources): Resources {
  return (Object.keys(EMPTY_RESOURCES) as Resource[]).reduce(
    (delta, resource) => ({
      ...delta,
      [resource]: after[resource] - before[resource]
    }),
    { ...EMPTY_RESOURCES }
  );
}

function settlementIncomeSource(tile: HexTile, settlement: Settlement) {
  return `${capitalize(settlement.kind)} on ${tile.terrain} ${tile.id}`;
}

function canPlaceColonyOnTile(G: HegemonyState, playerID: PlayerId, tile: HexTile): ActionStatus {
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

function isAdjacentToCity(G: HegemonyState, tile: HexTile) {
  return G.board.tiles.some((candidate) => {
    if (hexDistance(candidate, tile) > 1) {
      return false;
    }

    return candidate.settlements.some((settlement) => settlement.kind !== "colony");
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

function addPendingEventReason(G: HegemonyState, status: ActionStatus) {
  if (G.pendingPlayerEvent) {
    status.reasons.push("Resolve the pending player event first.");
  }
}

function getSeasonBuildingCostMultiplier(G: HegemonyState, action: CostedAction) {
  const card = G.activeSeasonEvent?.card;

  if (!card) {
    return 1;
  }

  return card.effects.reduce((multiplier, effect) => {
    if (effect.type !== "buildingCostMultiplier" || effect.duration !== "season") {
      return multiplier;
    }

    if (action === "foundColony" && effect.excludes.includes("foundColony")) {
      return multiplier;
    }

    if (action === "upgradeColonyToCity" && effect.excludes.includes("upgradeColonyToCity")) {
      return multiplier;
    }

    return multiplier * effect.multiplier;
  }, 1);
}

function getMatchingActionCostDiscounts(
  G: HegemonyState,
  playerID: PlayerId,
  action: ActionCostDiscountTarget,
  buildingId?: BuildingId
) {
  return G.players[playerID].actionCostDiscounts.filter(
    (discount) => discount.action === action && (!discount.buildingId || discount.buildingId === buildingId)
  );
}

function consumeActionCostDiscounts(
  G: HegemonyState,
  playerID: PlayerId,
  action: ActionCostDiscountTarget,
  buildingId?: BuildingId
) {
  const matching = getMatchingActionCostDiscounts(G, playerID, action, buildingId);

  if (matching.length === 0) {
    return;
  }

  const consumedIds = new Set(matching.map((discount) => discount.id));
  G.players[playerID].actionCostDiscounts = G.players[playerID].actionCostDiscounts.filter(
    (discount) => !consumedIds.has(discount.id)
  );
  addLog(
    G,
    `${getPlayerName(G, playerID)} used ${matching.map((discount) => discount.label).join(", ")} event discount${
      matching.length === 1 ? "" : "s"
    }.`
  );
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

function clonePartialResources(resources: Partial<Resources>): Partial<Resources> {
  return { ...resources };
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
