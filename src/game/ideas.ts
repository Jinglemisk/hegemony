import { produce } from "immer";
import type { HegemonyState, PlayerId, Settlement } from "./types";
import type { IdeaPopChoice, NationalIdeaId, NationalIdeaOwnership } from "./ideaTypes";
import { PLAYER_IDS } from "./data";
import { addLog, getOwnedSettlement, getPlayerName } from "./core/query";
import { totalPops } from "./core/pops";
import { canAfford, payCost } from "./core/resources";
import { MOVE_OK, invalid } from "./core/results";
import { settlementCapacity, popsInTransitTo } from "./settlement";

export { NATIONAL_IDEAS } from "./nationalIdeas";

export const IDEA_PURCHASE_COST = { influence: 6 };
export function getNationalIdeas(G: HegemonyState) {
  return G.definition.content.nationalIdeas;
}
export function playerNationalIdeas(G: HegemonyState, playerID: PlayerId) {
  return G.players[playerID].nationalIdeas.flatMap((owned) => {
    const idea = getNationalIdeas(G).find((idea) => idea.id === owned.id);
    return idea ? [{ ...idea, acquired: owned.acquired, year: owned.year }] : [];
  });
}
export function ideaPopTargets(G: HegemonyState, playerID: PlayerId): IdeaPopChoice[] {
  return G.players[playerID].settlements.flatMap((tileId) => {
    const s = getOwnedSettlement(G, tileId, playerID);
    return s && ideaRoom(G, s) > 0
      ? (["slaves", "freemen"] as const).map((pop) => ({ tileId, pop }))
      : [];
  });
}
/**
 * The setup draft's seat order. Placement runs a snake, one round per setup
 * placement (0→3, then 3→0, ...); the draft is the next round of that snake.
 */
export function ideaDraftOrder(G: HegemonyState): PlayerId[] {
  return G.ruleset.setup.length % 2 === 0 ? [...PLAYER_IDS] : [...PLAYER_IDS].reverse();
}

/** The seat holding an Idea, if any. An Idea is held by one seat only. */
export function ideaHolder(G: HegemonyState, ideaId: NationalIdeaId): PlayerId | null {
  return PLAYER_IDS.find((id) => G.players[id].nationalIdeas.some((o) => o.id === ideaId)) ?? null;
}

/** Every held Idea with its holder and how it was taken, for the picker and the rival tooltip. */
export function ideaHolders(G: HegemonyState) {
  const holders = new Map<NationalIdeaId, NationalIdeaOwnership & { playerID: PlayerId }>();
  for (const playerID of PLAYER_IDS)
    for (const owned of G.players[playerID].nationalIdeas)
      holders.set(owned.id, { ...owned, playerID });
  return holders;
}

export type IdeaDraftSeat = {
  playerID: PlayerId;
  /** The seat's setup pick, once made. */
  ideaId: NationalIdeaId | null;
  state: "picked" | "choosing" | "waiting";
};

/** The draft as everyone sees it: the seats in order, what each took, who is choosing. */
export function ideaDraft(G: HegemonyState): IdeaDraftSeat[] {
  return ideaDraftOrder(G).map((playerID) => {
    const ideaId =
      G.players[playerID].nationalIdeas.find((o) => o.acquired === "setup")?.id ?? null;
    return {
      playerID,
      ideaId,
      state: ideaId
        ? "picked"
        : G.phase === "setupIdeas" && G.currentPlayer === playerID
          ? "choosing"
          : "waiting",
    };
  });
}

export function getTakeIdeaStatus(
  G: HegemonyState,
  playerID: PlayerId,
  ideaId?: NationalIdeaId,
  target?: IdeaPopChoice,
) {
  const setup = G.phase === "setupIdeas";
  const reasons: string[] = [];
  const cost = setup ? {} : IDEA_PURCHASE_COST;
  const owns = G.players[playerID].nationalIdeas;
  if (setup ? owns.length > 0 || G.currentPlayer !== playerID : G.phase !== "gameplay")
    reasons.push("Take one Idea in your turn of the draft, then buy one in play.");
  if (!setup && (owns.length !== 1 || owns[0].acquired !== "setup"))
    reasons.push("You may buy one Idea after your setup pick.");
  if (G.assembly || G.pendingPlayerEvent || G.pendingRiot || G.pendingHunger)
    reasons.push("Finish the pending decision first.");
  if (!canAfford(G.players[playerID].resources, cost)) reasons.push("An Idea costs 6 influence.");
  const idea = getNationalIdeas(G).find((idea) => idea.id === ideaId);
  if (ideaId !== undefined && !idea) reasons.push("Choose an Idea.");
  const holder = ideaId === undefined ? null : ideaHolder(G, ideaId);
  if (holder)
    reasons.push(
      holder === playerID
        ? "You already hold this Idea."
        : `${getPlayerName(G, holder)} holds this Idea.`,
    );
  if (idea?.effects.some((e) => e.type === "acquirePop")) {
    const targets = ideaPopTargets(G, playerID);
    if (!target || !targets.some((t) => t.tileId === target.tileId && t.pop === target.pop))
      reasons.push("Choose a slave or freeman and a settlement with room.");
  } else if (target) reasons.push("This Idea needs no pop choice.");
  return { can: reasons.length === 0, reasons, cost };
}
export function takeNationalIdea(
  G: HegemonyState,
  playerID: PlayerId,
  ideaId: NationalIdeaId,
  target?: IdeaPopChoice,
) {
  const status = getTakeIdeaStatus(G, playerID, ideaId, target);
  if (!status.can) return invalid(...status.reasons);
  if (G.phase === "setupIdeas") {
    // An open draft: the pick lands at once, in public, and the next seat chooses.
    acquireIdea(G, playerID, ideaId, "setup", target);
    const waiting = ideaDraftOrder(G).find((id) => G.players[id].nationalIdeas.length === 0);
    if (waiting) G.currentPlayer = waiting;
    else {
      G.phase = "gameplay";
      G.currentPlayer = G.yearOpener;
    }
  } else {
    payCost(G.players[playerID].resources, status.cost);
    acquireIdea(G, playerID, ideaId, "purchase", target);
  }
  return MOVE_OK;
}
function acquireIdea(
  G: HegemonyState,
  playerID: PlayerId,
  ideaId: NationalIdeaId,
  acquired: "setup" | "purchase",
  target?: IdeaPopChoice,
) {
  const idea = getNationalIdeas(G).find((i) => i.id === ideaId)!;
  G.players[playerID].nationalIdeas.push({ id: ideaId, acquired, year: G.year });
  for (const effect of idea.effects) {
    if (effect.type === "acquireResource")
      G.players[playerID].resources[effect.resource] += effect.amount;
    if (effect.type === "acquirePop" && target)
      getOwnedSettlement(G, target.tileId, playerID)!.pops[target.pop] += 1;
    if (effect.type === "onFoundColony") {
      for (const tileId of G.players[playerID].settlements) {
        const s = getOwnedSettlement(G, tileId, playerID)!;
        if (s.kind === "colony")
          s.pops[effect.grantPop] += Math.min(effect.amount ?? 1, ideaRoom(G, s));
      }
    }
  }
  addLog(
    G,
    `${getPlayerName(G, playerID)} ${acquired === "setup" ? "chose" : "bought"} ${idea.name}: ${idea.text}`,
    playerID,
    acquired === "purchase" ? { kind: "ideaBought", ideaId } : undefined,
  );
}
export function ideaRoom(G: HegemonyState, settlement: Settlement) {
  return Math.max(
    0,
    settlementCapacity(settlement, G) -
      totalPops(settlement.pops) -
      popsInTransitTo(G, settlement.id),
  );
}

/** Score a legal setup choice without drawing a card. */
export function ideaForEval(
  G: HegemonyState,
  playerID: PlayerId,
  ideaId: NationalIdeaId,
  target?: IdeaPopChoice,
) {
  return produce(G, (draft) => {
    acquireIdea(draft, playerID, ideaId, "setup", target);
  });
}
