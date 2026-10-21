import { PLAYER_IDS } from "./data";
import type { GameCommand } from "./legalMoves";
import type { HegemonyState, PlayerId } from "./types";

export type WorkflowKind =
  | "setup"
  | "turn"
  | "hungerDecision"
  | "eventDecision"
  | "riotDecision"
  | "assemblyProposal"
  | "assemblyVote"
  | "assemblyClosing"
  | "gameOver";

export type ActorEligibility = {
  eligible: boolean;
  workflow: WorkflowKind;
  reasons: string[];
};

/** Trade's commands. Offering is the turn's, or the preparation's; the rest also go
 *  out of turn. */
const TRADE_COMMANDS = ["tradeOffer", "tradeAnswer", "tradeSettle", "tradeWithdraw"] as const;

const ASSEMBLY_PROPOSAL_COMMANDS: ReadonlySet<GameCommand["type"]> = new Set([
  "assemblyDraw",
  "assemblyDiscardHeld",
  "assemblyPropose",
  "assemblyProposeRepeal",
  "assemblyPass",
  "assemblyReady",
  ...TRADE_COMMANDS,
]);

const ASSEMBLY_VOTE_COMMANDS: ReadonlySet<GameCommand["type"]> = new Set([
  "assemblyBribe",
  "assemblyVote",
]);

/** The current workflow, independent of which seat happens to be parked in currentPlayer. */
export function currentWorkflow(G: HegemonyState): WorkflowKind {
  if (G.phase === "gameOver") return "gameOver";
  if (G.pendingHunger) return "hungerDecision";
  if (G.pendingPlayerEvent) return "eventDecision";
  if (G.pendingRiot) return "riotDecision";
  if (G.assembly?.phase === "proposal") return "assemblyProposal";
  if (G.assembly?.phase === "voting") return "assemblyVote";
  if (G.assembly?.phase === "closing") return "assemblyClosing";
  if (G.phase === "gameplay") return "turn";
  return "setup";
}

/** Every seat that may submit some command in the current workflow. */
export function eligibleActors(G: HegemonyState): PlayerId[] {
  switch (currentWorkflow(G)) {
    case "gameOver":
      return [];
    case "hungerDecision":
      return G.pendingHunger ? [G.pendingHunger.playerID] : [];
    case "eventDecision":
      return G.pendingPlayerEvent ? [G.pendingPlayerEvent.playerID] : [];
    case "riotDecision":
      return G.pendingRiot ? [G.pendingRiot.playerID] : [];
    case "assemblyProposal":
      return PLAYER_IDS.filter((playerID) => !G.assembly?.ready[playerID]);
    case "assemblyVote": {
      const actor = G.assembly?.voteOrder[G.assembly.voteIndex];
      return actor ? [actor] : [];
    }
    case "assemblyClosing":
      return G.assembly ? [G.assembly.activePlayer] : [];
    case "setup":
    case "turn":
      return [G.currentPlayer];
  }
}

/** A seat outside the workflow's actors that may still send some commands, and which. */
export type OutOfTurnActor = { seat: PlayerId; commands: GameCommand["type"][] };

/**
 * The seats that may act out of turn, in seat order. A workflow names them and the
 * commands each may send. Trade is the first: on a turn, the seats an open offer names
 * answer it; in the Assembly's preparation, a Ready seat still answers, and settles or
 * withdraws its own offers.
 */
export function outOfTurnActors(G: HegemonyState): OutOfTurnActor[] {
  const workflow = currentWorkflow(G);
  if (workflow !== "turn" && workflow !== "assemblyProposal") return [];
  const actors = eligibleActors(G);
  const commands = new Map<PlayerId, Set<GameCommand["type"]>>();
  const allow = (seat: PlayerId, ...types: GameCommand["type"][]) => {
    if (actors.includes(seat)) return;
    const set = commands.get(seat) ?? new Set();
    for (const type of types) set.add(type);
    commands.set(seat, set);
  };

  for (const offer of G.offers) {
    for (const seat of offer.to) if (!offer.answers[seat]) allow(seat, "tradeAnswer");
    allow(offer.from, "tradeSettle", "tradeWithdraw");
  }
  return PLAYER_IDS.filter((seat) => commands.has(seat)).map((seat) => ({
    seat,
    commands: [...commands.get(seat)!],
  }));
}

/**
 * The decision the table waits on, as one seat's decision host reads it: the workflow
 * that asks, the seat that answers, and what the pending state holds for the answer.
 * Hunger and the fate card are the answering seat's alone; a riot is the table's to
 * watch. The Assembly keeps its own sitting.
 */
export type RequiredDecision =
  | { source: "hungerDecision"; actor: PlayerId; unfed: number }
  | { source: "eventDecision"; actor: PlayerId }
  | { source: "riotDecision"; actor: PlayerId };

export function requiredDecision(G: HegemonyState, seat: PlayerId): RequiredDecision | null {
  const workflow = currentWorkflow(G);
  const [actor] = eligibleActors(G);
  switch (workflow) {
    case "hungerDecision":
      return actor === seat && G.pendingHunger
        ? { source: workflow, actor, unfed: G.pendingHunger.unfed }
        : null;
    case "eventDecision":
      return actor === seat ? { source: workflow, actor } : null;
    case "riotDecision":
      return { source: workflow, actor };
    default:
      return null;
  }
}

/**
 * Authoritative actor/workflow gate for one command. Individual domain validators still
 * own affordability and payload legality; this query owns who may speak, and which command
 * family the current workflow accepts.
 */
export function commandActorEligibility(
  G: HegemonyState,
  actor: PlayerId,
  command: GameCommand,
): ActorEligibility {
  const workflow = currentWorkflow(G);
  if (!eligibleActors(G).includes(actor)) {
    const outOfTurn = outOfTurnActors(G).find((entry) => entry.seat === actor);
    return outOfTurn?.commands.includes(command.type)
      ? { eligible: true, workflow, reasons: [] }
      : { eligible: false, workflow, reasons: ["This player is not an eligible actor."] };
  }

  const allowed = commandMatchesWorkflow(G, workflow, command.type);
  return allowed
    ? { eligible: true, workflow, reasons: [] }
    : { eligible: false, workflow, reasons: ["That command does not belong to this workflow."] };
}

function commandMatchesWorkflow(
  G: HegemonyState,
  workflow: WorkflowKind,
  type: GameCommand["type"],
): boolean {
  switch (workflow) {
    case "gameOver":
      return false;
    case "hungerDecision":
      return type === "resolveHunger";
    case "eventDecision":
      return type === "resolveEvent";
    case "riotDecision":
      return type === "buyRiotInsurance" || type === "resolveRiot";
    case "assemblyProposal":
      return ASSEMBLY_PROPOSAL_COMMANDS.has(type);
    case "assemblyVote":
      return ASSEMBLY_VOTE_COMMANDS.has(type);
    case "assemblyClosing":
      return type === "assemblyClose";
    case "setup":
      return (
        (G.phase === "setupIdeas" && type === "pickIdea") ||
        (G.phase === "setupCapital" && type === "placeCapital") ||
        (G.phase === "setupCity" && type === "placeCity") ||
        (G.phase === "setupColony" && type === "placeColony")
      );
    case "turn":
      return (
        !type.startsWith("assembly") &&
        type !== "tradeAnswer" &&
        type !== "resolveEvent" &&
        type !== "resolveHunger" &&
        type !== "buyRiotInsurance" &&
        type !== "resolveRiot" &&
        type !== "pickIdea" &&
        type !== "placeCapital" &&
        type !== "placeCity" &&
        type !== "placeColony"
      );
  }
}
