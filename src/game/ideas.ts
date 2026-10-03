import { produce } from "immer";
import type { HegemonyState, PlayerId, Settlement } from "./types";
import type { IdeaPopChoice, NationalIdeaId } from "./ideaTypes";
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
  if (setup ? G.setupIdeaPicks[playerID] !== null : G.phase !== "gameplay")
    reasons.push("Choose one Idea at setup, then buy one in play.");
  if (!setup && (owns.length !== 1 || owns[0].acquired !== "setup"))
    reasons.push("You may buy one Idea after your setup pick.");
  if (G.assembly || G.pendingPlayerEvent || G.pendingRiot)
    reasons.push("Finish the pending decision first.");
  if (!canAfford(G.players[playerID].resources, cost)) reasons.push("An Idea costs 6 influence.");
  const idea = getNationalIdeas(G).find((idea) => idea.id === ideaId);
  if (ideaId !== undefined && !idea) reasons.push("Choose an Idea.");
  if (owns.some((owned) => owned.id === ideaId)) reasons.push("You already hold this Idea.");
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
    G.setupIdeaPicks[playerID] = { ideaId, ...(target ? { target } : {}) };
    const waiting = PLAYER_IDS.find((id) => !G.setupIdeaPicks[id]);
    if (waiting) G.currentPlayer = waiting;
    else {
      // Reveal the simultaneous choices together, before Year 1's card or income.
      G.phase = "gameplay";
      for (const id of PLAYER_IDS) {
        const pick = G.setupIdeaPicks[id]!;
        acquireIdea(G, id, pick.ideaId, "setup", pick.target);
      }
      G.setupIdeaPicks = { "0": null, "1": null, "2": null, "3": null };
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

/** Score a legal setup choice without revealing other choices or drawing a card. */
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
