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
import { getAuthoredGameContent, getExpeditionTables, getRiotTable } from "./content";
import { EMPTY_POPS, POP_TYPES, totalPops } from "./core/pops";
import { formatPopName, formatPops } from "./core/format";
import { getOwnedSettlement } from "./core/query";
import { MOVE_OK, invalid } from "./core/results";
import type { MoveResult } from "./core/results";
import {
  getAddPopsEffect,
  getEventEffectChoices,
  getEventPopTargetTileIds,
  resolvePendingPlayerEvent,
} from "./events";
import { setupCapitalCount } from "./ruleset";
import { canPlaceColonyOnTile, isAdjacentToCity } from "./settlement";
import {
  getBuildBuildingOptions,
  getFoundColonyStatus,
  getGrowPopStatus,
  getMovePopsStatus,
  getUpgradeColonyToCityStatus,
} from "./status";
import { advanceSetupTurn, beginGameplayTurn, closeAssembly, endTurn } from "./turn";
import {
  activeLawIds,
  availableLawReplacementIds,
  assemblyBribe,
  assemblyDiscardHeld,
  assemblyDraw,
  assemblyPass,
  assemblyPropose,
  assemblyProposeRepeal,
  assemblyVeto,
  assemblyVote,
  getResolutionCard,
  lawNeedsReplacement,
  nextDrawCost,
  POLITICIANS,
} from "./assembly";
import type { PoliticianId } from "./assembly";
import { PLAYER_IDS } from "./data";
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
import { assertStateDefinition } from "./definition";
import type { GameDefinition } from "./definition";
import type { LogEntry } from "./types";

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

/**
 * Serializable player intent. Commands contain only choices the player is allowed
 * to make; effective costs, blocked reasons, and random outcomes stay engine-owned.
 */
export type GameCommand =
  | { type: "placeCapital"; tileId: string; pops: Pops }
  | { type: "placeCity"; tileId: string; pops: Pops }
  | { type: "placeColony"; tileId: string; pops: Pops }
  | { type: "foundColony"; tileId: string; sourceTileId: string; pop: PopType }
  | { type: "upgradeColonyToCity"; tileId: string }
  | { type: "buildBuilding"; tileId: string; buildingId: BuildingId }
  | { type: "growPop"; tileId: string; pop: PopType }
  | { type: "movePops"; sourceTileId: string; targetTileId: string; pops: Pops }
  | { type: "resolveEvent"; choiceIndex: number; targetTileId?: string }
  | { type: "bankSell"; material: TradableMaterial }
  | { type: "bankBuy"; material: TradableMaterial }
  | { type: "civicCalm"; payment: CivicCalmPayment }
  | { type: "promotePop"; tileId: string; from: PopType }
  | { type: "demotePop"; tileId: string; from: PopType }
  | { type: "fundExpedition"; expeditionId: EventTableId; stake: VentureStake }
  | {
      type: "buyRiotInsurance";
      optionId: RiotInsuranceId;
      demoteTarget?: { tileId: string; from: PopType };
    }
  | { type: "resolveRiot" }
  // ── The Assembly (Phase 3-B). While a session is open these are the ONLY legal
  //    moves: the agora suspends the turn machine, so every gameplay verb is shut
  //    off until the house rises.
  | { type: "assemblyDraw"; politician: PoliticianId }
  | { type: "assemblyDiscardHeld" }
  | { type: "assemblyPropose"; replaces?: string; target?: PlayerId }
  | { type: "assemblyProposeRepeal"; cardId: string }
  | { type: "assemblyPass" }
  | { type: "assemblyBribe" }
  | { type: "assemblyVote"; yea: boolean }
  | { type: "assemblyVeto" }
  | { type: "assemblyClose" }
  | { type: "endTurn" };

/** Engine-derived presentation for one currently legal command. */
export type LegalOption = {
  command: GameCommand;
  cost?: Partial<Resources>;
  blockedReasons: string[];
};

/** Internal enumeration shape before derived fields are split from the command. */
type DerivedCommand = GameCommand & { cost?: Partial<Resources> };

/**
 * Every move `playerID` may take right now, in deterministic order (board/index
 * order within each move type, move types in declaration order). Off-turn
 * players get an empty list. While a player event is pending, resolving it is
 * the ONLY legal move — everything else, including endTurn, is blocked.
 */
function enumerateDerivedCommands(G: HegemonyState, playerID: PlayerId): DerivedCommand[] {
  assertStateDefinition(G);
  if (G.currentPlayer !== playerID && !isAsyncAssemblyActor(G, playerID)) {
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

/** Every currently legal intent plus engine-derived presentation data. */
export function enumerateLegalOptions(G: HegemonyState, playerID: PlayerId): LegalOption[] {
  return enumerateDerivedCommands(G, playerID).map(({ cost, ...command }) => ({
    command: command as GameCommand,
    ...(cost ? { cost } : {}),
    blockedReasons: [],
  }));
}

/** Intent-only view used by clients, policies, and replay recording. */
export function enumerateLegalCommands(G: HegemonyState, playerID: PlayerId): GameCommand[] {
  return enumerateLegalOptions(G, playerID).map((option) => option.command);
}

type MoveCategory = "setup" | "riotResolution" | "eventResolution" | "assembly" | "gameplay";

function isAsyncAssemblyActor(G: HegemonyState, playerID: PlayerId): boolean {
  return G.assembly?.phase === "proposal" && !G.assembly.proposalDone[playerID];
}

const SETUP_PHASES: ReadonlySet<HegemonyState["phase"]> = new Set([
  "setupCapital",
  "setupCity",
  "setupColony",
]);

function categorizeMove(type: GameCommand["type"]): MoveCategory {
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
 * The authoritative turn/phase/pending gate for {@link transition}. Enumeration
 * already refuses to list an illegal command, but transition is the engine's public
 * dispatcher — a driver (or a future off-turn caller) could hand it any command — so
 * the boundary is re-checked here rather than trusted. Mirrors the same
 * currentPlayer / phase / pending conditions {@link enumerateLegalCommands} gates on,
 * so it never rejects a legitimately enumerated command.
 */
function checkMoveAllowed(G: HegemonyState, playerID: PlayerId, move: GameCommand): MoveResult {
  const category = categorizeMove(move.type);
  if (
    G.currentPlayer !== playerID &&
    !(category === "assembly" && isAsyncAssemblyActor(G, playerID))
  ) {
    return invalid("It is not this player's turn.");
  }

  switch (category) {
    case "riotResolution":
      return G.pendingRiot?.playerID === playerID
        ? MOVE_OK
        : invalid("No riot is pending resolution.");
    case "eventResolution":
      return G.pendingPlayerEvent?.playerID === playerID
        ? MOVE_OK
        : invalid("No pending event to resolve.");
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
 * Apply an enumerated command through the engine's own mutators. Setup placements
 * also advance the setup turn machine (and bootstrap gameplay on the final
 * placement), so a driver can run the whole game through this one entry point.
 * The boundary guard runs first, so an off-turn move or a move made during the
 * wrong phase / a pending event or riot is rejected authoritatively — not left
 * to the individual mutators' partial checks.
 */
function applyCommandMutable(
  G: HegemonyState,
  playerID: PlayerId,
  move: GameCommand,
): MoveResult {
  assertStateDefinition(G);
  const allowed = checkMoveAllowed(G, playerID, move);
  if (!allowed.ok) {
    return allowed;
  }

  switch (move.type) {
    case "placeCapital":
    case "placeCity":
    case "placeColony": {
      const place =
        move.type === "placeCapital"
          ? placeCapital
          : move.type === "placeCity"
            ? placeCity
            : placeColony;
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
      return assemblyPropose(G, playerID, move.replaces, move.target);
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

export type TransitionEvent = { type: "log"; entry: LogEntry };

export type TransitionResult =
  | { ok: true; state: HegemonyState; events: TransitionEvent[] }
  | { ok: false; reasons: string[] };

class RejectedCommand {
  constructor(readonly reasons: string[]) {}
}

/**
 * The single atomic command boundary. It executes against an Immer draft and
 * publishes a new state only when the command succeeds. Rejections abort the
 * draft, guaranteeing that even a mutator which changed data before returning an
 * error cannot leak a partial update.
 */
export function transition(
  definition: GameDefinition,
  state: HegemonyState,
  actor: PlayerId,
  command: GameCommand,
): TransitionResult {
  assertStateDefinition(state);
  if (definition.identity.id !== state.definitionId) {
    throw new Error(
      `game definition mismatch: state requires ${state.definitionId}, received ${definition.identity.id}`,
    );
  }

  try {
    const next = produce(state, (draft) => {
      const result = applyCommandMutable(draft, actor, command);
      if (!result.ok) {
        throw new RejectedCommand(result.reasons);
      }
    });

    if (next.definitionId !== state.definitionId) {
      throw new Error("game definition identity changed during transition");
    }

    return {
      ok: true,
      state: next,
      events: next.log
        .slice(state.log.length)
        .map((entry) => ({ type: "log" as const, entry })),
    };
  } catch (error) {
    if (error instanceof RejectedCommand) {
      return { ok: false, reasons: error.reasons };
    }
    throw error;
  }
}

/**
 * The Assembly's moves for whoever the house is waiting on. Every branch is
 * guaranteed to return at least one move for the acting seat — pass in the proposal
 * round, a vote in the ballot, close at the end — so a headless driver can always
 * make progress and the agora can never deadlock a game.
 */
function enumerateAssemblyMoves(G: HegemonyState, playerID: PlayerId): DerivedCommand[] {
  const session = G.assembly;

  if (!session) {
    return [];
  }

  const moves: DerivedCommand[] = [];
  const rules = G.ruleset.assembly;
  const influence = G.players[playerID].resources.influence;

  if (session.phase === "closing") {
    // Closing is single-actor: only the seat play returns to may dismiss the recap.
    return session.activePlayer === playerID ? [{ type: "assemblyClose" }] : [];
  }

  if (session.phase === "voting") {
    // Voting is sequential — only the seat whose turn it is to cast has moves.
    if (session.voteOrder[session.voteIndex] !== playerID) {
      return [];
    }

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

  // Proposal is ASYNC: any seat that has not yet finalized has moves. (A headless
  // driver only ever calls this for `currentPlayer`, which syncAssemblyActor parks on
  // the first undecided seat, so the sim still steps one seat at a time.)
  if (session.proposalDone[playerID]) {
    return [];
  }

  const held = session.held[playerID];

  if (held) {
    const card = held.card;
    const standing = activeLawIds(G);

    if (card.kind === "directive" || !standing.includes(card.id)) {
      if (card.kind === "directive") {
        for (const target of PLAYER_IDS.filter((rival) => rival !== playerID)) {
          moves.push({ type: "assemblyPropose", target });
        }
      } else if (lawNeedsReplacement(G)) {
        // At the cap a proposal must name its casualty — one move per candidate, so
        // the choice of what to tear down is itself an enumerated decision.
        for (const cardId of availableLawReplacementIds(G)) {
          moves.push({ type: "assemblyPropose", replaces: cardId });
        }
      } else {
        moves.push({ type: "assemblyPropose" });
      }
    }

    moves.push({ type: "assemblyDiscardHeld" });
  } else {
    const drawCost = nextDrawCost(G, playerID);

    if (influence >= drawCost) {
      for (const politician of POLITICIANS) {
        if (
          G.politicianDecks[politician.id].length > 0 ||
          G.politicianDiscards[politician.id].length > 0
        ) {
          moves.push({
            type: "assemblyDraw",
            politician: politician.id,
            cost: { influence: drawCost },
          });
        }
      }
    }

    if (influence >= rules.repealCost) {
      for (const cardId of activeLawIds(G)) {
        moves.push({
          type: "assemblyProposeRepeal",
          cardId,
          cost: { influence: rules.repealCost },
        });
      }
    }
  }

  moves.push({ type: "assemblyPass" });
  return moves;
}

export function describeCommand(
  move: GameCommand,
  content = getAuthoredGameContent(),
  cost: Partial<Resources> = {},
): string {
  switch (move.type) {
    case "placeCapital":
      return `place capital on ${move.tileId} (${formatPops(move.pops)})`;
    case "placeCity":
      return `place second city on ${move.tileId} (${formatPops(move.pops)})`;
    case "placeColony":
      return `place colony on ${move.tileId} (${formatPops(move.pops)})`;
    case "foundColony":
      return `found colony on ${move.tileId}, sending 1 ${formatPopName(move.pop, 1)} from ${move.sourceTileId}${formatCost(cost)}`;
    case "upgradeColonyToCity":
      return `upgrade colony to city on ${move.tileId}${formatCost(cost)}`;
    case "buildBuilding":
      return `build ${move.buildingId} on ${move.tileId}${formatCost(cost)}`;
    case "growPop":
      return `grow 1 ${formatPopName(move.pop, 1)} on ${move.tileId}${formatCost(cost)}`;
    case "movePops":
      return `move ${formatPops(move.pops)} from ${move.sourceTileId} to ${move.targetTileId}`;
    case "resolveEvent":
      return `resolve pending event (choice ${move.choiceIndex})${move.targetTileId ? ` targeting ${move.targetTileId}` : ""}`;
    case "bankSell":
      return `sell ${Object.values(cost)[0] ?? 1} ${move.material} to the bank for 1 gold`;
    case "bankBuy":
      return `buy 1 ${move.material} from the bank${formatCost(cost)}`;
    case "civicCalm":
      return `${move.payment === "influence" ? "stabilize province" : "bread & circuses"}${formatCost(cost)}`;
    case "promotePop":
      return `promote a ${formatPopName(move.from, 1)} on ${move.tileId}${formatCost(cost)}`;
    case "demotePop":
      return `demote a ${formatPopName(move.from, 1)} on ${move.tileId}${formatCost(cost)}`;
    case "fundExpedition":
      return `fund the ${move.expeditionId} staking ${move.stake}${formatCost(cost)}`;
    case "buyRiotInsurance":
      return `declare riot insurance: ${move.optionId}${move.demoteTarget ? ` (demoting a ${formatPopName(move.demoteTarget.from, 1)} on ${move.demoteTarget.tileId})` : ""}`;
    case "resolveRiot":
      return "face the riot table";
    case "assemblyDraw":
      return `sound out ${move.politician}${formatCost(cost)}`;
    case "assemblyDiscardHeld":
      return "set the drawn resolution aside";
    case "assemblyPropose":
      return `propose the drawn resolution${move.target ? ` against ${move.target}` : ""}${move.replaces ? ` in place of ${move.replaces}` : ""}`;
    case "assemblyProposeRepeal":
      return `move to repeal ${getResolutionCard(content, move.cardId)?.name ?? move.cardId}${formatCost(cost)}`;
    case "assemblyPass":
      return "hold your peace";
    case "assemblyBribe":
      return `buy a vote${formatCost(cost)}`;
    case "assemblyVote":
      return `vote ${move.yea ? "yea" : "nay"}`;
    case "assemblyVeto":
      return `veto the resolution${formatCost(cost)}`;
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
function enumerateRiotMoves(G: HegemonyState, playerID: PlayerId): DerivedCommand[] {
  const moves: DerivedCommand[] = [];

  for (const option of getRiotTable(G.definition.content).insurance ?? []) {
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
          moves.push({
            type: "buyRiotInsurance",
            optionId: option.id,
            demoteTarget: { tileId, from },
          });
        }
      }
    }
  }

  moves.push({ type: "resolveRiot" });
  return moves;
}

function enumerateEventResolutions(G: HegemonyState, playerID: PlayerId): DerivedCommand[] {
  const pending = G.pendingPlayerEvent;
  if (!pending) {
    return [];
  }

  const moves: DerivedCommand[] = [];

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

function enumerateCapitalPlacements(G: HegemonyState, playerID: PlayerId): DerivedCommand[] {
  if (G.players[playerID].settlements.length > 0) {
    return [];
  }

  const compositions = popCompositions(G.ruleset.placementPopCounts.capital);
  const moves: DerivedCommand[] = [];

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

function enumerateCityPlacements(G: HegemonyState, playerID: PlayerId): DerivedCommand[] {
  if (G.ruleset.setup[G.players[playerID].settlements.length] !== "city") {
    return [];
  }

  const compositions = popCompositions(G.ruleset.placementPopCounts.city);
  const moves: DerivedCommand[] = [];

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

function enumerateColonyPlacements(G: HegemonyState, playerID: PlayerId): DerivedCommand[] {
  const placed = G.players[playerID].settlements.length;
  const owesColony =
    placed >= setupCapitalCount(G.ruleset) &&
    placed < G.ruleset.setup.length &&
    G.ruleset.setup[placed] === "colony";

  if (!owesColony) {
    return [];
  }

  const compositions = popCompositions(G.ruleset.placementPopCounts.colony);
  const moves: DerivedCommand[] = [];

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

function enumerateGameplayMoves(G: HegemonyState, playerID: PlayerId): DerivedCommand[] {
  const ownedTileIds = G.players[playerID].settlements;
  const moves: DerivedCommand[] = [];

  for (const tile of G.board.tiles) {
    const status = getFoundColonyStatus(G, playerID, tile.id);

    if (!status.can) {
      continue;
    }

    for (const sourceTileId of ownedTileIds) {
      const source = getOwnedSettlement(G, sourceTileId, playerID);

      for (const pop of POP_TYPES) {
        if ((source?.pops[pop] ?? 0) > 0) {
          moves.push({
            type: "foundColony",
            tileId: tile.id,
            sourceTileId,
            pop,
            cost: status.cost ?? {},
          });
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
    for (const { building, status } of getBuildBuildingOptions(G, playerID, tileId)) {
      if (status.can) {
        moves.push({
          type: "buildBuilding",
          tileId,
          buildingId: building.id,
          cost: status.cost ?? {},
        });
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

  for (const table of getExpeditionTables(G.definition.content)) {
    for (const stake of ["gold", "wood"] as const) {
      const status = getFundExpeditionStatus(G, playerID, table.id, stake);
      if (status.can) {
        moves.push({
          type: "fundExpedition",
          expeditionId: table.id,
          stake,
          cost: status.cost ?? {},
        });
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
import { produce } from "immer";
