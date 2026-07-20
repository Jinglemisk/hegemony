import {
  buildBuilding,
  foundColony,
  growPop,
  movePops,
  placeCapital,
  placeCity,
  placeColony,
  upgradeColonyToCity,
} from "./actions";
import { TRADABLE_MATERIALS, bankBuy, bankSell, getBankBuyStatus, getBankSellStatus } from "./bank";
import {
  DEMOTE_FROM,
  PROMOTE_FROM,
  civicCalm,
  demotePop,
  getCivicCalmStatus,
  getDemotePopStatus,
  getPromotePopStatus,
  promotePop,
} from "./civic";
import type { CivicCalmPayment } from "./civic";
import { buyRiotInsurance, getBuyRiotInsuranceStatus, resolveRiot } from "./riot";
import { fundExpedition, getFundExpeditionStatus } from "./ventures";
import type { VentureStake } from "./ventures";
import { EXPEDITION_TABLES, RIOT_TABLE } from "./data";
import { getBuildings } from "./content";
import { EMPTY_POPS, POP_TYPES, totalPops } from "./core/pops";
import { formatPopName, formatPops } from "./core/format";
import { getOwnedSettlement } from "./core/query";
import { MOVE_OK, invalid } from "./core/results";
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
import { advanceSetupTurn, beginGameplayTurn, closeAssembly, endTurn } from "./turn";
import {
  activeLawIds,
  assemblyBribe,
  assemblyDiscardHeld,
  assemblyDraw,
  assemblyPass,
  assemblyPropose,
  assemblyProposeRepeal,
  assemblyVeto,
  assemblyVote,
  getResolutionCard,
  isAtLawCap,
  nextDrawCost,
  POLITICIANS,
} from "./assembly";
import type { PoliticianId } from "./assembly";
import type {
  BuildingId,
  EventTableId,
  HegemonyState,
  PlayerId,
  PopType,
  Pops,
  Resources,
  RiotInsuranceId,
  TradableMaterial,
} from "./types";

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
 * themselves re-check — so an enumerated move always applies cleanly. movePops is
 * enumerated as a bounded set of strategically meaningful bundles per source→target
 * pair (a single pop of each type, the whole stack of each type, and the entire
 * settlement — deduplicated), so a bot can relocate a garrison or seed a colony in
 * one action instead of several. collectIncome is never enumerated (it happens
 * automatically at the start of every gameplay turn).
 */

export type LegalMove =
  | { type: "placeCapital"; tileId: string; pops: Pops }
  | { type: "placeCity"; tileId: string; pops: Pops }
  | { type: "placeColony"; tileId: string; pops: Pops }
  | { type: "foundColony"; tileId: string; sourceTileId: string; pop: PopType; cost: Partial<Resources> }
  | { type: "upgradeColonyToCity"; tileId: string; cost: Partial<Resources> }
  | { type: "buildBuilding"; tileId: string; buildingId: BuildingId; cost: Partial<Resources> }
  | { type: "growPop"; tileId: string; pop: PopType; cost: Partial<Resources> }
  | { type: "movePops"; sourceTileId: string; targetTileId: string; pops: Pops }
  | { type: "resolveEvent"; choiceIndex: number; targetTileId?: string }
  | { type: "bankSell"; material: TradableMaterial; cost: Partial<Resources> }
  | { type: "bankBuy"; material: TradableMaterial; cost: Partial<Resources> }
  | { type: "civicCalm"; payment: CivicCalmPayment; cost: Partial<Resources> }
  | { type: "promotePop"; tileId: string; from: PopType; cost: Partial<Resources> }
  | { type: "demotePop"; tileId: string; from: PopType; cost: Partial<Resources> }
  | { type: "fundExpedition"; expeditionId: EventTableId; stake: VentureStake; cost: Partial<Resources> }
  | { type: "buyRiotInsurance"; optionId: RiotInsuranceId; demoteTarget?: { tileId: string; from: PopType } }
  | { type: "resolveRiot" }
  // ── The Assembly (Phase 3-B). While a session is open these are the ONLY legal
  //    moves: the agora suspends the turn machine, so every gameplay verb is shut
  //    off until the house rises.
  | { type: "assemblyDraw"; politician: PoliticianId; cost: Partial<Resources> }
  | { type: "assemblyDiscardHeld" }
  | { type: "assemblyPropose"; replaces?: string }
  | { type: "assemblyProposeRepeal"; cardId: string; cost: Partial<Resources> }
  | { type: "assemblyPass" }
  | { type: "assemblyBribe"; cost: Partial<Resources> }
  | { type: "assemblyVote"; yea: boolean }
  | { type: "assemblyVeto"; cost: Partial<Resources> }
  | { type: "assemblyClose" }
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

  // A pending riot blocks the turn on the table: declare insurance or roll.
  if (G.pendingRiot) {
    return G.pendingRiot.playerID === playerID ? enumerateRiotMoves(G, playerID) : [];
  }

  // The Assembly outranks everything: while it sits, the only moves are its own.
  if (G.assembly) {
    return enumerateAssemblyMoves(G, playerID);
  }

  switch (G.phase) {
    case "setupCapital":
      return enumerateCapitalPlacements(G, playerID);
    case "setupCity":
      return enumerateCityPlacements(G, playerID);
    case "setupColony":
      return enumerateColonyPlacements(G, playerID);
    case "gameplay":
      return enumerateGameplayMoves(G, playerID);
    case "gameOver":
      return [];
  }
}

type MoveCategory = "setup" | "riotResolution" | "eventResolution" | "assembly" | "gameplay";

const SETUP_PHASES: ReadonlySet<HegemonyState["phase"]> = new Set(["setupCapital", "setupCity", "setupColony"]);

function categorizeMove(type: LegalMove["type"]): MoveCategory {
  switch (type) {
    case "placeCapital":
    case "placeCity":
    case "placeColony":
      return "setup";
    case "buyRiotInsurance":
    case "resolveRiot":
      return "riotResolution";
    case "resolveEvent":
      return "eventResolution";
    case "assemblyDraw":
    case "assemblyDiscardHeld":
    case "assemblyPropose":
    case "assemblyProposeRepeal":
    case "assemblyPass":
    case "assemblyBribe":
    case "assemblyVote":
    case "assemblyVeto":
    case "assemblyClose":
      return "assembly";
    default:
      return "gameplay";
  }
}

/**
 * The authoritative turn/phase/pending gate for {@link applyMove}. Enumeration
 * already refuses to LIST an illegal move, but applyMove is the engine's public
 * dispatcher — a driver (or a future off-turn caller) could hand it any move — so
 * the boundary is re-checked here rather than trusted. Mirrors the same
 * currentPlayer / phase / pending conditions {@link enumerateLegalMoves} gates on,
 * so it never rejects a legitimately enumerated move.
 */
function checkMoveAllowed(G: HegemonyState, playerID: PlayerId, move: LegalMove): MoveResult {
  if (G.currentPlayer !== playerID) {
    return invalid("It is not this player's turn.");
  }

  switch (categorizeMove(move.type)) {
    case "riotResolution":
      return G.pendingRiot?.playerID === playerID ? MOVE_OK : invalid("No riot is pending resolution.");
    case "eventResolution":
      return G.pendingPlayerEvent?.playerID === playerID ? MOVE_OK : invalid("No pending event to resolve.");
    case "setup":
      return SETUP_PHASES.has(G.phase) && !G.pendingPlayerEvent && !G.pendingRiot
        ? MOVE_OK
        : invalid("Setup placements are only legal during setup.");
    case "assembly":
      return G.assembly ? MOVE_OK : invalid("The Assembly is not in session.");
    case "gameplay":
      return G.phase === "gameplay" && !G.pendingPlayerEvent && !G.pendingRiot && !G.assembly
        ? MOVE_OK
        : invalid("That move is not available right now.");
  }
}

/**
 * Apply an enumerated move through the engine's own mutators. Setup placements
 * also advance the setup turn machine (and bootstrap gameplay on the final
 * placement), so a driver can run the whole game through this one entry point.
 * The boundary guard runs first, so an off-turn move or a move made during the
 * wrong phase / a pending event or riot is rejected authoritatively — not left
 * to the individual mutators' partial checks.
 */
export function applyMove(G: HegemonyState, playerID: PlayerId, move: LegalMove): MoveResult {
  const allowed = checkMoveAllowed(G, playerID, move);
  if (!allowed.ok) {
    return allowed;
  }

  switch (move.type) {
    case "placeCapital":
    case "placeCity":
    case "placeColony": {
      const place = move.type === "placeCapital" ? placeCapital : move.type === "placeCity" ? placeCity : placeColony;
      const result = place(G, playerID, move.tileId, move.pops);
      if (result.ok) {
        advanceSetupTurn(G);
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
    case "bankSell":
      return bankSell(G, playerID, move.material);
    case "bankBuy":
      return bankBuy(G, playerID, move.material);
    case "civicCalm":
      return civicCalm(G, playerID, move.payment);
    case "promotePop":
      return promotePop(G, playerID, move.tileId, move.from);
    case "demotePop":
      return demotePop(G, playerID, move.tileId, move.from);
    case "fundExpedition":
      return fundExpedition(G, playerID, move.expeditionId, move.stake);
    case "buyRiotInsurance":
      return buyRiotInsurance(G, playerID, move.optionId, move.demoteTarget);
    case "resolveRiot":
      return resolveRiot(G, playerID);
    case "assemblyDraw":
      return assemblyDraw(G, playerID, move.politician);
    case "assemblyDiscardHeld":
      return assemblyDiscardHeld(G, playerID);
    case "assemblyPropose":
      return assemblyPropose(G, playerID, move.replaces);
    case "assemblyProposeRepeal":
      return assemblyProposeRepeal(G, playerID, move.cardId);
    case "assemblyPass":
      return assemblyPass(G, playerID);
    case "assemblyBribe":
      return assemblyBribe(G, playerID);
    case "assemblyVote":
      return assemblyVote(G, playerID, move.yea);
    case "assemblyVeto":
      return assemblyVeto(G, playerID);
    case "assemblyClose":
      return closeAssembly(G);
    case "endTurn":
      return endTurn(G);
  }
}

/**
 * The Assembly's moves for whoever the house is waiting on. Every branch is
 * guaranteed to return at least one move for the acting seat — pass in the proposal
 * round, a vote in the ballot, close at the end — so a headless driver can always
 * make progress and the agora can never deadlock a game.
 */
function enumerateAssemblyMoves(G: HegemonyState, playerID: PlayerId): LegalMove[] {
  const session = G.assembly;

  if (!session || session.activePlayer !== playerID) {
    return [];
  }

  const moves: LegalMove[] = [];
  const rules = G.ruleset.assembly;
  const influence = G.players[playerID].resources.influence;

  if (session.phase === "closing") {
    return [{ type: "assemblyClose" }];
  }

  if (session.phase === "voting") {
    if (session.bribesUsed[playerID] < rules.briberyCap && influence >= rules.briberyCost) {
      moves.push({ type: "assemblyBribe", cost: { influence: rules.briberyCost } });
    }

    moves.push({ type: "assemblyVote", yea: true });
    moves.push({ type: "assemblyVote", yea: false });

    if (session.vetoUsed[playerID] < rules.vetoesPerAssembly && influence >= rules.vetoCost) {
      moves.push({ type: "assemblyVeto", cost: { influence: rules.vetoCost } });
    }

    return moves;
  }

  if (session.heldCard) {
    const card = session.heldCard.card;
    const standing = activeLawIds(G);

    if (card.kind === "directive" || !standing.includes(card.id)) {
      if (card.kind === "law" && isAtLawCap(G)) {
        // At the cap a proposal must name its casualty — one move per candidate, so
        // the choice of what to tear down is itself an enumerated decision.
        for (const cardId of standing) {
          moves.push({ type: "assemblyPropose", replaces: cardId });
        }
      } else {
        moves.push({ type: "assemblyPropose" });
      }
    }

    moves.push({ type: "assemblyDiscardHeld" });
  } else {
    const drawCost = nextDrawCost(G);

    if (influence >= drawCost) {
      for (const politician of POLITICIANS) {
        if (G.politicianDecks[politician.id].length > 0 || G.politicianDiscards[politician.id].length > 0) {
          moves.push({ type: "assemblyDraw", politician: politician.id, cost: { influence: drawCost } });
        }
      }
    }

    if (influence >= rules.repealCost) {
      for (const cardId of activeLawIds(G)) {
        if (!session.ballot.some((item) => item.kind === "repeal" && item.cardId === cardId)) {
          moves.push({ type: "assemblyProposeRepeal", cardId, cost: { influence: rules.repealCost } });
        }
      }
    }
  }

  moves.push({ type: "assemblyPass" });
  return moves;
}

export function describeMove(move: LegalMove): string {
  switch (move.type) {
    case "placeCapital":
      return `place capital on ${move.tileId} (${formatPops(move.pops)})`;
    case "placeCity":
      return `place second city on ${move.tileId} (${formatPops(move.pops)})`;
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
    case "bankSell":
      return `sell ${Object.values(move.cost)[0]} ${move.material} to the bank for 1 gold`;
    case "bankBuy":
      return `buy 1 ${move.material} from the bank${formatCost(move.cost)}`;
    case "civicCalm":
      return `${move.payment === "influence" ? "stabilize province" : "bread & circuses"}${formatCost(move.cost)}`;
    case "promotePop":
      return `promote a ${formatPopName(move.from, 1)} on ${move.tileId}${formatCost(move.cost)}`;
    case "demotePop":
      return `demote a ${formatPopName(move.from, 1)} on ${move.tileId}${formatCost(move.cost)}`;
    case "fundExpedition":
      return `fund the ${move.expeditionId} staking ${move.stake}${formatCost(move.cost)}`;
    case "buyRiotInsurance":
      return `declare riot insurance: ${move.optionId}${move.demoteTarget ? ` (demoting a ${formatPopName(move.demoteTarget.from, 1)} on ${move.demoteTarget.tileId})` : ""}`;
    case "resolveRiot":
      return "face the riot table";
    case "assemblyDraw":
      return `sound out ${move.politician}${formatCost(move.cost)}`;
    case "assemblyDiscardHeld":
      return "set the drawn resolution aside";
    case "assemblyPropose":
      return `propose the drawn resolution${move.replaces ? ` in place of ${move.replaces}` : ""}`;
    case "assemblyProposeRepeal":
      return `move to repeal ${getResolutionCard(move.cardId)?.name ?? move.cardId}${formatCost(move.cost)}`;
    case "assemblyPass":
      return "hold your peace";
    case "assemblyBribe":
      return `buy a vote${formatCost(move.cost)}`;
    case "assemblyVote":
      return `vote ${move.yea ? "yea" : "nay"}`;
    case "assemblyVeto":
      return `veto the resolution${formatCost(move.cost)}`;
    case "assemblyClose":
      return "rise from the Assembly";
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

/** The riot's forced menu: each unbought, affordable insurance (the concession once
 *  per legal demote target), and always the roll itself. */
function enumerateRiotMoves(G: HegemonyState, playerID: PlayerId): LegalMove[] {
  const moves: LegalMove[] = [];

  for (const option of RIOT_TABLE.insurance ?? []) {
    if (!getBuyRiotInsuranceStatus(G, playerID, option.id).can) {
      continue;
    }

    if (!option.demotesPop) {
      moves.push({ type: "buyRiotInsurance", optionId: option.id });
      continue;
    }

    for (const tileId of G.players[playerID].settlements) {
      for (const from of DEMOTE_FROM) {
        if (getDemotePopStatus(G, playerID, tileId, from).can) {
          moves.push({ type: "buyRiotInsurance", optionId: option.id, demoteTarget: { tileId, from } });
        }
      }
    }
  }

  moves.push({ type: "resolveRiot" });
  return moves;
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

  const compositions = popCompositions(G.ruleset.placementPopCounts.capital);
  const moves: LegalMove[] = [];

  for (const tile of G.board.tiles) {
    if (tile.terrain === "oracle" || tile.settlements.length > 0 || isAdjacentToCity(G, tile)) {
      continue;
    }

    for (const pops of compositions) {
      moves.push({ type: "placeCapital", tileId: tile.id, pops });
    }
  }

  return moves;
}

function enumerateCityPlacements(G: HegemonyState, playerID: PlayerId): LegalMove[] {
  if (G.ruleset.setup[G.players[playerID].settlements.length] !== "city") {
    return [];
  }

  const compositions = popCompositions(G.ruleset.placementPopCounts.city);
  const moves: LegalMove[] = [];

  for (const tile of G.board.tiles) {
    if (tile.terrain === "oracle" || tile.settlements.length > 0 || isAdjacentToCity(G, tile)) {
      continue;
    }

    for (const pops of compositions) {
      moves.push({ type: "placeCity", tileId: tile.id, pops });
    }
  }

  return moves;
}

function enumerateColonyPlacements(G: HegemonyState, playerID: PlayerId): LegalMove[] {
  const placed = G.players[playerID].settlements.length;
  const owesColony =
    placed >= setupCapitalCount(G.ruleset) && placed < G.ruleset.setup.length && G.ruleset.setup[placed] === "colony";

  if (!owesColony) {
    return [];
  }

  const compositions = popCompositions(G.ruleset.placementPopCounts.colony);
  const moves: LegalMove[] = [];

  for (const tile of G.board.tiles) {
    if (!canPlaceColonyOnTile(G, playerID, tile, "setup").can) {
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
    for (const building of getBuildings()) {
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
    const source = getOwnedSettlement(G, sourceTileId, playerID);
    if (!source) {
      continue;
    }

    for (const targetTileId of ownedTileIds) {
      if (sourceTileId === targetTileId) {
        continue;
      }

      for (const pops of movePopsBundles(source.pops)) {
        if (getMovePopsStatus(G, playerID, sourceTileId, targetTileId, pops).can) {
          moves.push({ type: "movePops", sourceTileId, targetTileId, pops });
        }
      }
    }
  }

  // Bank trades are enumerated one unit at a time — a driver repeats the move to
  // trade in bulk (there is no per-turn cap).
  for (const material of TRADABLE_MATERIALS) {
    const sell = getBankSellStatus(G, playerID, material);
    if (sell.can) {
      moves.push({ type: "bankSell", material, cost: sell.cost ?? {} });
    }

    const buy = getBankBuyStatus(G, playerID, material);
    if (buy.can) {
      moves.push({ type: "bankBuy", material, cost: buy.cost ?? {} });
    }
  }

  for (const payment of ["influence", "gold"] as const) {
    const status = getCivicCalmStatus(G, playerID, payment);
    if (status.can) {
      moves.push({ type: "civicCalm", payment, cost: status.cost ?? {} });
    }
  }

  for (const tileId of ownedTileIds) {
    for (const from of PROMOTE_FROM) {
      const status = getPromotePopStatus(G, playerID, tileId, from);
      if (status.can) {
        moves.push({ type: "promotePop", tileId, from, cost: status.cost ?? {} });
      }
    }

    for (const from of DEMOTE_FROM) {
      const status = getDemotePopStatus(G, playerID, tileId, from);
      if (status.can) {
        moves.push({ type: "demotePop", tileId, from, cost: status.cost ?? {} });
      }
    }
  }

  for (const table of EXPEDITION_TABLES) {
    for (const stake of ["gold", "wood"] as const) {
      const status = getFundExpeditionStatus(G, playerID, table.id, stake);
      if (status.can) {
        moves.push({ type: "fundExpedition", expeditionId: table.id, stake, cost: status.cost ?? {} });
      }
    }
  }

  moves.push({ type: "endTurn" });
  return moves;
}

/**
 * The bounded set of movePops selections offered from a source settlement: a single pop
 * of each present type (fine control), the whole stack of each type (relocate one class),
 * and the entire population (seed a colony / abandon). Deduplicated, so a source holding a
 * single pop yields exactly one move. getMovePopsStatus still gates each selection on
 * target capacity, so overflowing bundles are dropped by the caller.
 */
function movePopsBundles(sourcePops: Pops): Pops[] {
  const bundles: Pops[] = [];
  const seen = new Set<string>();

  const add = (pops: Pops) => {
    if (totalPops(pops) === 0) {
      return;
    }
    const key = `${pops.citizens},${pops.freemen},${pops.slaves}`;
    if (!seen.has(key)) {
      seen.add(key);
      bundles.push(pops);
    }
  };

  // A single pop of each present type — the old single-pop behaviour, kept for fine control.
  for (const pop of POP_TYPES) {
    if (sourcePops[pop] > 0) add({ ...EMPTY_POPS, [pop]: 1 });
  }
  // The whole stack of each type — relocate a class in one action.
  for (const pop of POP_TYPES) {
    if (sourcePops[pop] > 0) add({ ...EMPTY_POPS, [pop]: sourcePops[pop] });
  }
  // The entire settlement — seed a colony or abandon in one action.
  add({ ...sourcePops });

  return bundles;
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
