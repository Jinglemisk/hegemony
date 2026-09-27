import { getExpeditionTables } from "./content";
import { POP_TYPES } from "./core/pops";
import { calculateEconomyProjection } from "./economy/preview";
import { getCivicCalmStatus, getDemotePopStatus, getPromotePopStatus } from "./civic";
import { getFundExpeditionStatus } from "./ventures";
import { unrestStatus } from "./unrest";
import { victorySeatStatuses } from "./victory";
import type { HegemonyState, PlayerId, Resources } from "./types";

export type TurnAdvisoryTone = "blocker" | "warning" | "reminder" | "info";

export interface TurnAdvisoryItem {
  id: string;
  tone: TurnAdvisoryTone;
  label: string;
  detail: string;
}

export interface TurnAdvisory {
  canCommit: boolean;
  items: TurnAdvisoryItem[];
  income: Resources;
  projectedResources: Resources;
}

/**
 * The end-of-turn docket. It deliberately does not decide whether an optional
 * action is strategically correct; it reports forced blockers, economic harm,
 * and expiring opportunities that are easy to forget. Every figure comes from
 * the same engine selectors and status checks that resolve the turn.
 */
export function getTurnAdvisory(G: HegemonyState, playerID: PlayerId): TurnAdvisory {
  const projection = calculateEconomyProjection(G, playerID, { resolveTransfers: true });
  const items: TurnAdvisoryItem[] = [];
  const player = G.players[playerID];

  if (G.phase !== "gameplay") {
    items.push({
      id: "phase",
      tone: "blocker",
      label: "Turn cannot end",
      detail: "Gameplay has not started or has already ended.",
    });
  }

  if (G.currentPlayer !== playerID) {
    items.push({
      id: "seat",
      tone: "blocker",
      label: "Another ruler is acting",
      detail: "Only the active seat can end this turn.",
    });
  }

  if (G.pendingPlayerEvent) {
    items.push({
      id: "event",
      tone: "blocker",
      label: "Resolve the event",
      detail: "The pending Player Event must be settled first.",
    });
  }

  if (G.pendingRiot) {
    items.push({
      id: "riot",
      tone: "blocker",
      label: "Face the riot",
      detail: "The riot table is still waiting for a result.",
    });
  }

  if (G.assembly) {
    items.push({
      id: "assembly",
      tone: "blocker",
      label: "Assembly in session",
      detail: "The sitting must close before the turn machine resumes.",
    });
  }

  if (projection.food.projectedStockpile < 0) {
    items.push({
      id: "food",
      tone: "warning",
      label: "Food will run short",
      detail: projection.food.firstTurnGraceActive
        ? "The first-income grace prevents happiness pressure this turn."
        : `${Math.abs(projection.food.appliedPressure)} happiness pressure will be applied.`,
    });
  }

  if (projection.population.overCapacity > 0) {
    items.push({
      id: "capacity",
      tone: "warning",
      label: "Settlements are over capacity",
      detail: `${projection.population.overCapacity} pop${projection.population.overCapacity === 1 ? " is" : "s are"} outside available housing.`,
    });
  }

  const unrest = unrestStatus(G, playerID);
  if (unrest.riotAtRisk) {
    items.push({
      id: "unrest",
      tone: "warning",
      label: unrest.tier === "revolt" ? "Revolt risk at next upkeep" : "Riot risk at next upkeep",
      detail: `Happiness is ${unrest.happiness}.`,
    });
  }

  if (player.actionCostDiscounts.length > 0) {
    items.push({
      id: "discount",
      tone: "reminder",
      label: "A discount is unspent",
      detail: `${player.actionCostDiscounts.length} action discount${player.actionCostDiscounts.length === 1 ? " expires" : "s expire"} if its duration ends.`,
    });
  }

  if (
    player.resources.happiness < 0 &&
    !player.civicCalmUsedThisTurn &&
    (["influence", "gold"] as const).some((payment) => getCivicCalmStatus(G, playerID, payment).can)
  ) {
    items.push({
      id: "calm",
      tone: "reminder",
      label: "Calm remains available",
      detail: "Happiness is negative and one civic-calm action can still be taken.",
    });
  }

  if (!player.ladderUsedThisTurn && hasLadderMove(G, playerID)) {
    items.push({
      id: "ladder",
      tone: "reminder",
      label: "The Ladder is unused",
      detail: "At least one promotion or demotion is legal before the turn closes.",
    });
  }

  if (!player.ventureUsedThisTurn && hasVenture(G, playerID)) {
    items.push({
      id: "venture",
      tone: "reminder",
      label: "A venture remains available",
      detail: "A legal expedition can still sail this turn.",
    });
  }

  const arriving = G.transfers
    .filter((transfer) => transfer.owner === playerID)
    .reduce(
      (total, transfer) =>
        total + transfer.pops.citizens + transfer.pops.freemen + transfer.pops.slaves,
      0,
    );
  if (arriving > 0) {
    items.push({
      id: "transfers",
      tone: "info",
      label: "Travellers are in motion",
      detail: `${arriving} pop${arriving === 1 ? "" : "s"} will arrive through the turn cycle.`,
    });
  }

  const threat = victorySeatStatuses(G).find(
    (seat) => seat.playerID !== playerID && seat.winsAtNextTurnStart,
  );
  if (threat) {
    items.push({
      id: "victory-threat",
      tone: "warning",
      label: "A rival can win at dawn",
      detail: `${G.players[threat.playerID].name} already holds the required laurels.`,
    });
  }

  return {
    canCommit: !items.some((item) => item.tone === "blocker"),
    items,
    income: projection.income,
    projectedResources: projection.projectedResources,
  };
}

function hasLadderMove(G: HegemonyState, playerID: PlayerId): boolean {
  return G.players[playerID].settlements.some((tileId) =>
    POP_TYPES.some(
      (pop) =>
        getPromotePopStatus(G, playerID, tileId, pop).can ||
        getDemotePopStatus(G, playerID, tileId, pop).can,
    ),
  );
}

function hasVenture(G: HegemonyState, playerID: PlayerId): boolean {
  return getExpeditionTables(G.definition.content).some((table) =>
    (["gold", "wood"] as const).some(
      (stake) => getFundExpeditionStatus(G, playerID, table.id, stake).can,
    ),
  );
}
