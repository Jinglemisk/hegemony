import { getDevCards } from "./content";
import type { GameContent } from "./content";
import { PLAYER_IDS } from "./data";
import { formatPopName, formatRuleNumber, formatTileLabel } from "./core/format";
import { totalPops } from "./core/pops";
import { addLog, getOwnedSettlement, getPlayerName, realmPops } from "./core/query";
import { applyResourceDelta, canAfford, createResourceDelta, payCost } from "./core/resources";
import { MOVE_OK, invalid } from "./core/results";
import type { ActionStatus, MoveResult } from "./core/results";
import { mulberry32, shuffleWithSeed } from "./core/rng";
import { applyUnrestTokenChange, standingHappiness } from "./happiness";
import { settlementRoom } from "./settlement";
import { pendingDecisionReasons } from "./status";
import type { DevCard, DevCardEffect, HegemonyState, PlayerId, Resource } from "./types";

/**
 * The development deck (docs/plans/development-deck.md). Gold buys one card a turn,
 * after the event card. A yield resolves on the draw and goes to the discards; a held
 * card goes to the hand, face down, and is played one a turn, never on the turn it came
 * in. A rival card is a held card aimed at a rival when it is played. The discards
 * reshuffle when the pile runs out, so pile, discards and hands always hold the deck.
 *
 * Happiness pays into the deck: a standing level of +3 or higher draws a free card at the
 * end of the seat's turn (turn.ts), and a riot may take a held card in place of a pop
 * (riot.ts).
 */

/** Each card's copies by stable instance id, `caravan#1` to `caravan#4`, in content order. */
export function devDeckInstances(content: GameContent): string[] {
  return getDevCards(content).flatMap((card) =>
    Array.from({ length: card.count }, (_, copy) => `${card.id}#${copy + 1}`),
  );
}

/** The card an instance id names; none for a hidden card in a projection. */
export function devCardOf(G: HegemonyState, instanceId: string): DevCard | undefined {
  const id = instanceId.slice(0, instanceId.lastIndexOf("#"));
  return getDevCards(G.definition.content).find((card) => card.id === id);
}

/** What a gain gives the seat now: its amount once, or for each settlement or pop.
 *  Settlements are the capital, cities and colonies; pops are every class, those on the
 *  move included. */
export function devCardGain(
  G: HegemonyState,
  playerID: PlayerId,
  effect: Extract<DevCardEffect, { type: "gain" }>,
): number {
  const times =
    effect.per === "settlement"
      ? G.players[playerID].settlements.length
      : effect.per === "pop"
        ? totalPops(realmPops(G, playerID))
        : 1;
  return effect.amount * times;
}

/** What Raiders takes: up to its amount, never more than the rival holds. */
export function raidAmount(
  G: HegemonyState,
  target: PlayerId,
  resource: Resource,
  amount: number,
): number {
  const floor = G.ruleset.economy.stockpileFloors[resource] ?? 0;
  return Math.min(amount, Math.max(0, G.players[target].resources[resource] - floor));
}

export function getBuyDevCardStatus(G: HegemonyState, playerID: PlayerId): ActionStatus {
  const cost = G.ruleset.devCards.cost;
  const reasons: string[] = [];

  if (G.phase !== "gameplay") reasons.push("Cards are bought during gameplay.");
  reasons.push(...pendingDecisionReasons(G));
  if (G.players[playerID].devCardBoughtThisTurn) reasons.push("One card a turn.");
  if (G.devDrawPile.length + G.devDiscardPile.length === 0)
    reasons.push("Every card is in a hand.");
  if (!canAfford(G.players[playerID].resources, cost)) reasons.push("Can't pay for a card.");

  return { can: reasons.length === 0, reasons, cost };
}

/** Pay, draw the top card, and resolve a yield at once; a held card goes to the hand. */
export function buyDevCard(G: HegemonyState, playerID: PlayerId): MoveResult {
  const status = getBuyDevCardStatus(G, playerID);
  if (!status.can) return invalid(...status.reasons);

  const player = G.players[playerID];
  payCost(player.resources, status.cost ?? {});
  player.devCardBoughtThisTurn = true;

  const { card, outcome } = drawFor(G, playerID);
  const name = getPlayerName(G, playerID);
  if (outcome === null) {
    // Which card it is stays the seat's own: the line says only that one was kept.
    addLog(G, `${name} bought a development card and kept it.`, playerID);
    return MOVE_OK;
  }

  addLog(G, `${name} bought a development card: ${card.name}, ${outcome}.`, playerID, {
    kind: "devCard",
    cardId: card.id,
    played: false,
    outcome,
  });
  return MOVE_OK;
}

/** Whether the seat's standing level, calm left out, is at the free card's line. */
export function atFreeCardLevel(G: HegemonyState, playerID: PlayerId): boolean {
  return standingHappiness(G, playerID) >= G.ruleset.devCards.freeCardLevel;
}

/** Whether ending the turn now draws the free card: the rule is on, a card is left to
 *  draw, and the standing level is at its line. Read with the riot check, after hunger;
 *  there is no food condition. */
export function freeCardDue(G: HegemonyState, playerID: PlayerId): boolean {
  return (
    G.ruleset.devCards.freeCard &&
    G.devDrawPile.length + G.devDiscardPile.length > 0 &&
    atFreeCardLevel(G, playerID)
  );
}

/** The free card at the end of the seat's own turn, already found due: a yield lands at
 *  once, a held card goes to the hand and is playable from the seat's next turn. */
export function drawFreeCard(G: HegemonyState, playerID: PlayerId) {
  const level = standingHappiness(G, playerID);
  const { card, outcome } = drawFor(G, playerID);
  const content = `${getPlayerName(G, playerID)}'s realm is content at ${formatRuleNumber(level, true)}: a free development card`;
  if (outcome === null) {
    addLog(G, `${content}, kept.`, playerID, { kind: "freeCard", level });
    return;
  }
  addLog(G, `${content}, ${card.name}, ${outcome}.`, playerID, {
    kind: "freeCard",
    level,
    card: card.id,
    outcome,
  });
}

/** Draw the top card for the seat. A yield resolves at once and goes to the discards,
 *  with what it did; a held card goes to the hand, playable from the seat's next turn. */
function drawFor(G: HegemonyState, playerID: PlayerId): { card: DevCard; outcome: string | null } {
  const id = drawDevCard(G);
  const card = devCardOf(G, id)!;
  if (card.kind !== "yield") {
    G.devHands[playerID].push({ id, turn: G.turn });
    return { card, outcome: null };
  }
  G.devDiscardPile.push(id);
  return { card, outcome: applyDevEffect(G, playerID, card, { card: id }) };
}

/** Discard one of the seat's held cards, drawn at random through the game's rng: an
 *  Informer's, or a riot's in place of a pop. */
export function discardAtRandom(G: HegemonyState, playerID: PlayerId): DevCard | undefined {
  const hand = G.devHands[playerID];
  if (hand.length === 0) return undefined;
  const step = mulberry32(G.rng);
  G.rng = step.state;
  const [lost] = hand.splice(Math.floor(step.value * hand.length), 1);
  G.devDiscardPile.push(lost.id);
  return devCardOf(G, lost.id);
}

function drawDevCard(G: HegemonyState): string {
  if (G.devDrawPile.length === 0) {
    const reshuffled = shuffleWithSeed(G.devDiscardPile, G.rng);
    G.devDrawPile = reshuffled.cards;
    G.rng = reshuffled.state;
    G.devDiscardPile = [];
    addLog(G, "The development discards are shuffled into a new draw pile.");
  }
  return G.devDrawPile.shift()!;
}

/** One play of a held card: the card by instance id, and the choice it asks for. */
export type DevCardPlay = {
  card: string;
  /** Caravan's kind, the kind Master Builder takes off, or the resource Raiders takes. */
  resource?: Resource;
  /** The settlement Settlers or Captives land in. */
  tileId?: string;
  /** The rival a rival card is played on. */
  target?: PlayerId;
};

export function getPlayDevCardStatus(
  G: HegemonyState,
  playerID: PlayerId,
  play: DevCardPlay,
): ActionStatus {
  const reasons: string[] = [];

  if (G.phase !== "gameplay") reasons.push("Cards are played during gameplay.");
  reasons.push(...pendingDecisionReasons(G));
  if (G.players[playerID].devCardPlayedThisTurn) reasons.push("One card a turn.");
  const held = G.devHands[playerID].find((entry) => entry.id === play.card);
  const card = held && devCardOf(G, held.id);
  if (!held || !card || card.kind === "yield") {
    return { can: false, reasons: [...reasons, "That card is not in your hand."] };
  }
  if (held.turn >= G.turn) reasons.push("A card is never played on the turn it came in.");
  reasons.push(...choiceReasons(G, playerID, card, play));

  return { can: reasons.length === 0, reasons };
}

/** What the card's own choice still needs: a rival, a kind, a settlement with room, or
 *  something for the card to act on. */
function choiceReasons(
  G: HegemonyState,
  playerID: PlayerId,
  card: DevCard,
  play: DevCardPlay,
): string[] {
  const { target } = play;
  if (card.kind === "rival" && !(target && target !== playerID && PLAYER_IDS.includes(target)))
    return ["Pick a rival."];

  const { effect } = card;
  switch (effect.type) {
    case "gain":
      return play.resource && effect.resources.includes(play.resource)
        ? []
        : ["Pick what it gives."];
    case "addPop": {
      const settlement = play.tileId ? getOwnedSettlement(G, play.tileId, playerID) : undefined;
      return settlement && settlementRoom(G, settlement) > 0
        ? []
        : ["Needs a settlement of yours with room."];
    }
    case "buildDiscount":
      return play.resource && effect.resources.includes(play.resource)
        ? []
        : ["Pick what it takes off."];
    case "unrestTokens":
      return card.kind !== "rival" && G.players[playerID].unrestTokens === 0
        ? ["You have no Unrest token to clear."]
        : [];
    case "raid":
      return play.resource &&
        effect.resources.includes(play.resource) &&
        raidAmount(G, target!, play.resource, effect.amount) > 0
        ? []
        : ["Needs a rival holding that resource."];
    case "discardHeld":
      return G.devHands[target!].length > 0 ? [] : ["Needs a rival who holds a card."];
  }
}

/** Play a held card: it resolves at once and goes to the discards, where the table sees it. */
export function playDevCard(G: HegemonyState, playerID: PlayerId, play: DevCardPlay): MoveResult {
  const status = getPlayDevCardStatus(G, playerID, play);
  if (!status.can) return invalid(...status.reasons);

  const hand = G.devHands[playerID];
  const card = devCardOf(G, play.card)!;
  hand.splice(
    hand.findIndex((entry) => entry.id === play.card),
    1,
  );
  G.devDiscardPile.push(play.card);
  G.players[playerID].devCardPlayedThisTurn = true;

  const outcome = applyDevEffect(G, playerID, card, play);
  const on = play.target ? ` on ${getPlayerName(G, play.target)}` : "";
  addLog(G, `${getPlayerName(G, playerID)} played ${card.name}${on}: ${outcome}.`, playerID, {
    kind: "devCard",
    cardId: card.id,
    played: true,
    ...(play.target ? { target: play.target } : {}),
    outcome,
  });
  return MOVE_OK;
}

/** Apply a card's effect, already checked legal, and say what it did. */
function applyDevEffect(
  G: HegemonyState,
  playerID: PlayerId,
  card: DevCard,
  play: DevCardPlay,
): string {
  const player = G.players[playerID];
  const { effect } = card;

  switch (effect.type) {
    case "gain": {
      const resource = effect.resources.length === 1 ? effect.resources[0] : play.resource!;
      const amount = devCardGain(G, playerID, effect);
      applyResourceDelta(player.resources, createResourceDelta(resource, amount));
      return `+${amount} ${resource}`;
    }
    case "addPop": {
      getOwnedSettlement(G, play.tileId!, playerID)!.pops[effect.pop] += 1;
      player.popsGainedFromEvents += 1;
      return `a ${formatPopName(effect.pop, 1)} in ${formatTileLabel(G, play.tileId!)}`;
    }
    case "buildDiscount":
      player.buildDiscount = { [play.resource!]: effect.amount };
      return `the next building or colony upgrade this turn costs ${effect.amount} less ${play.resource}`;
    case "unrestTokens": {
      const seat = card.kind === "rival" ? play.target! : playerID;
      applyUnrestTokenChange(G, seat, effect.change);
      return effect.change === "placeOne"
        ? `${getPlayerName(G, seat)} places an Unrest token`
        : "an Unrest token cleared";
    }
    case "raid": {
      const taken = raidAmount(G, play.target!, play.resource!, effect.amount);
      applyResourceDelta(
        G.players[play.target!].resources,
        createResourceDelta(play.resource!, -taken),
      );
      applyResourceDelta(player.resources, createResourceDelta(play.resource!, taken));
      return `took ${taken} ${play.resource}`;
    }
    case "discardHeld": {
      const lost = discardAtRandom(G, play.target!);
      return `${getPlayerName(G, play.target!)} discarded ${lost?.name ?? "a card"}`;
    }
  }
}

/** The plays of one held card a choice could make, legal or not: each rival for a rival
 *  card, each kind for a choice, each settlement for a pop. */
function playChoices(G: HegemonyState, playerID: PlayerId, card: DevCard, id: string) {
  const targets =
    card.kind === "rival" ? PLAYER_IDS.filter((seat) => seat !== playerID) : [undefined];
  const { effect } = card;
  return targets.flatMap((target): DevCardPlay[] => {
    const play = { card: id, ...(target ? { target } : {}) };
    switch (effect.type) {
      case "gain":
      case "buildDiscount":
      case "raid":
        return effect.resources.map((resource) => ({ ...play, resource }));
      case "addPop":
        return G.players[playerID].settlements.map((tileId) => ({ ...play, tileId }));
      default:
        return [play];
    }
  });
}

/**
 * The legal plays of the seat's held cards, the same derivation for the legal commands
 * and the hand. Asked of one card, every play of it; asked of the hand, one copy of each
 * card, so two Caravans are one set of choices.
 */
export function devCardPlays(
  G: HegemonyState,
  playerID: PlayerId,
  instanceId?: string,
): DevCardPlay[] {
  const seen = new Set<string>();
  return G.devHands[playerID].flatMap((held) => {
    const card = devCardOf(G, held.id);
    if (!card || seen.has(card.id) || (instanceId && held.id !== instanceId)) return [];
    const plays = playChoices(G, playerID, card, held.id).filter(
      (play) => getPlayDevCardStatus(G, playerID, play).can,
    );
    if (plays.length) seen.add(card.id);
    return plays;
  });
}

/** Why a held card cannot be played now, or null when it can. */
export function devCardBlocked(
  G: HegemonyState,
  playerID: PlayerId,
  instanceId: string,
): string | null {
  if (devCardPlays(G, playerID, instanceId).length) return null;
  const card = devCardOf(G, instanceId);
  const [first] = card ? playChoices(G, playerID, card, instanceId) : [];
  return (
    getPlayDevCardStatus(G, playerID, first ?? { card: instanceId }).reasons[0] ??
    "This card can't be played now."
  );
}
