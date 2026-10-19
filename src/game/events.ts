import type { EventCard, EventEffect, HegemonyState, PlayerId, Resource, Resources } from "./types";
import { formatPopName, formatRuleResourceDelta, formatTileLabel } from "./core/format";
import { totalPops } from "./core/pops";
import { addLog, getOwnedSettlement, getPlayerName } from "./core/query";
import { applyResourceDeltaWithFloors, createResourceDelta } from "./core/resources";
import { applyUnrestTokenChange, describeUnrestTokenChange } from "./happiness";
import { MOVE_OK, invalid } from "./core/results";
import type { MoveResult } from "./core/results";
import { shuffleWithSeed } from "./core/rng";
import { settlementCapacity } from "./settlement";

export function drawPlayerEvent(G: HegemonyState, playerID: PlayerId) {
  if (G.playerDrawPile.length === 0 && G.playerDiscardPile.length > 0) {
    const reshuffled = shuffleWithSeed(G.playerDiscardPile, G.rng);
    G.playerDrawPile = reshuffled.cards;
    G.rng = reshuffled.state;
    G.playerDiscardPile = [];
    addLog(G, "Player Event discard reshuffled into the draw pile.");
  }
  const card = G.playerDrawPile.shift();
  if (!card) return;
  G.lastPlayerEvent = card;
  addLog(
    G,
    `${getPlayerName(G, playerID)} received Player Event card ${card.name}. ${card.text}`,
    playerID,
  );
  const popEffect = getAddPopsEffect(card.effects);
  if (popEffect && getEventPopTargetTileIds(G, playerID, popEffect).length === 0) {
    G.playerDiscardPile.push(card);
    addLog(G, `${card.name} had no settlement with room and was discarded.`, playerID);
    return;
  }
  G.pendingPlayerEvent = { card, playerID };
}

export function resolvePendingPlayerEvent(
  G: HegemonyState,
  playerID: PlayerId,
  targetTileId?: string,
): MoveResult {
  const pending = G.pendingPlayerEvent;
  if (!pending || pending.playerID !== playerID) return invalid();
  const popEffect = getAddPopsEffect(pending.card.effects);
  if (
    popEffect &&
    (!targetTileId || !getEventPopTargetTileIds(G, playerID, popEffect).includes(targetTileId))
  )
    return invalid();
  applyEventEffects(G, pending.card, playerID, targetTileId);
  G.playerDiscardPile.push(pending.card);
  G.pendingPlayerEvent = null;
  return MOVE_OK;
}

export function getAddPopsEffect(effects: readonly EventEffect[]) {
  return effects.find(
    (effect): effect is Extract<EventEffect, { type: "addPops" }> => effect.type === "addPops",
  );
}

/** The same capacity projection feeds the picker and legal commands. */
export function getEventPopTargets(
  G: HegemonyState,
  playerID: PlayerId,
  effect: Extract<EventEffect, { type: "addPops" }>,
) {
  return G.players[playerID].settlements.flatMap((tileId) => {
    const settlement = getOwnedSettlement(G, tileId, playerID);
    if (!settlement) return [];
    const capacity = settlementCapacity(settlement, G);
    const filled = totalPops(settlement.pops);
    const room = Math.max(0, capacity - filled);
    return room >= effect.amount ? [{ tileId, capacity, filled, room }] : [];
  });
}

export function getEventPopTargetTileIds(
  G: HegemonyState,
  playerID: PlayerId,
  effect: Extract<EventEffect, { type: "addPops" }>,
) {
  return getEventPopTargets(G, playerID, effect).map((target) => target.tileId);
}

function applyEventEffects(
  G: HegemonyState,
  card: EventCard,
  playerID: PlayerId,
  targetTileId?: string,
) {
  for (const effect of card.effects) {
    switch (effect.type) {
      case "resourceDelta":
        applyEventResourceDelta(
          G,
          playerID,
          createResourceDelta(effect.resource, effect.amount),
          card.name,
        );
        break;
      case "unrestTokens": {
        const change = applyUnrestTokenChange(G, playerID, effect.change);
        addLog(
          G,
          `${getPlayerName(G, playerID)} resolved ${card.name}: ${describeUnrestTokenChange(change)}.`,
          playerID,
        );
        break;
      }
      case "addPops": {
        const settlement = targetTileId && getOwnedSettlement(G, targetTileId, playerID);
        if (!settlement) break;
        settlement.pops[effect.pop] += effect.amount;
        G.players[playerID].popsGainedFromEvents += effect.amount;
        addLog(
          G,
          `${getPlayerName(G, playerID)} added ${effect.amount} ${formatPopName(effect.pop, effect.amount)} to ${formatTileLabel(G, targetTileId!)} from ${card.name}.`,
          playerID,
        );
        break;
      }
    }
  }
}

function applyEventResourceDelta(
  G: HegemonyState,
  playerID: PlayerId,
  delta: Resources,
  source: string,
) {
  const resources = G.players[playerID].resources;
  for (const [resource, amount] of Object.entries(delta) as Array<[Resource, number]>) {
    if (amount < 0) {
      const floor = G.ruleset.economy.stockpileFloors[resource] ?? 0;
      delta[resource] = -Math.min(-amount, Math.max(0, resources[resource] - floor));
    }
  }
  applyResourceDeltaWithFloors(resources, delta, G.ruleset.economy.stockpileFloors);
  addLog(
    G,
    `${getPlayerName(G, playerID)} resolved ${source}: ${formatRuleResourceDelta(delta)}.`,
    playerID,
  );
}
