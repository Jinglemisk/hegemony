import { PLAYER_IDS } from "./data";
import type { GameCommand } from "./legalMoves";
import type { HegemonyState, PlayerId } from "./types";

export type WorkflowKind =
  | "setup"
  | "turn"
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

const ASSEMBLY_PROPOSAL_COMMANDS: ReadonlySet<GameCommand["type"]> = new Set([
  "assemblyDraw",
  "assemblyDiscardHeld",
  "assemblyPropose",
  "assemblyProposeRepeal",
  "assemblyPass",
]);

const ASSEMBLY_VOTE_COMMANDS: ReadonlySet<GameCommand["type"]> = new Set([
  "assemblyBribe",
  "assemblyVote",
  "assemblyVeto",
]);

/** The current workflow, independent of which seat happens to be parked in currentPlayer. */
export function currentWorkflow(G: HegemonyState): WorkflowKind {
  if (G.phase === "gameOver") return "gameOver";
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
    case "eventDecision":
      return G.pendingPlayerEvent ? [G.pendingPlayerEvent.playerID] : [];
    case "riotDecision":
      return G.pendingRiot ? [G.pendingRiot.playerID] : [];
    case "assemblyProposal":
      return PLAYER_IDS.filter((playerID) => !G.assembly?.proposalDone[playerID]);
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
    return { eligible: false, workflow, reasons: ["This player is not an eligible actor."] };
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
        (G.phase === "setupCapital" && type === "placeCapital") ||
        (G.phase === "setupCity" && type === "placeCity") ||
        (G.phase === "setupColony" && type === "placeColony")
      );
    case "turn":
      return (
        !type.startsWith("assembly") &&
        type !== "resolveEvent" &&
        type !== "buyRiotInsurance" &&
        type !== "resolveRiot" &&
        type !== "placeCapital" &&
        type !== "placeCity" &&
        type !== "placeColony"
      );
  }
}
