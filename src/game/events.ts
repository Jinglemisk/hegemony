import { PLAYER_IDS } from "./data";
import type { EventCard, EventDeckKind, EventEffect, HegemonyState, PlayerId, Resource, Resources, SeasonName } from "./types";
import { seasonName } from "./core/calendar";
import { capitalize, formatPopName, formatRuleNumber, formatRuleResourceDelta, formatTileLabel } from "./core/format";
import { totalPops } from "./core/pops";
import { addLog, getOwnedSettlement, getPlayerName } from "./core/query";
import { applyResourceDelta, createResourceDelta } from "./core/resources";
import { MOVE_OK, invalid } from "./core/results";
import type { MoveResult } from "./core/results";
import { shuffleWithSeed } from "./core/rng";
import { countPlayerPopType, scaledByPops, settlementCapacity } from "./settlement";

export function drawSeasonalEvent(G: HegemonyState) {
  const card = drawSeasonalCard(G, seasonName(G.season));

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
): MoveResult {
  const pending = G.pendingPlayerEvent;

  if (!pending || pending.playerID !== playerID) {
    return invalid();
  }

  const choices = getEventEffectChoices(pending.card);
  const effects = choices[choiceIndex];

  if (!effects) {
    return invalid();
  }

  const popEffect = getAddPopsEffect(effects);

  if (popEffect) {
    if (!targetTileId || !canAddEventPopsToSettlement(G, playerID, targetTileId, popEffect)) {
      return invalid();
    }
  }

  applyEventEffects(G, pending.card, playerID, effects, targetTileId);
  G.playerDiscardPile.push(pending.card);
  G.pendingPlayerEvent = null;
  addLog(G, `${getPlayerName(G, playerID)} resolved ${pending.card.name}.`);
  return MOVE_OK;
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

/**
 * Draw a seasonal card that suits the current season. The pile is pre-shuffled,
 * so taking the first suited card is a uniform random pick among suited cards —
 * season tags therefore only weight the deck, never force an outcome. The seasonal
 * deck NEVER reshuffles: it is the game's finite clock (roadmap-appendix D1) —
 * exactly one card leaves per season, and an empty pile ends the age.
 */
function drawSeasonalCard(G: HegemonyState, season: SeasonName): EventCard | null {
  const index = G.seasonalDrawPile.findIndex((card) => cardSuitsSeason(card, season));

  if (index !== -1) {
    return G.seasonalDrawPile.splice(index, 1)[0];
  }

  // Nothing left suits this season; take whatever is on top rather than stall the clock.
  return G.seasonalDrawPile.shift() ?? null;
}

function cardSuitsSeason(card: EventCard, season: SeasonName): boolean {
  return !card.seasons || card.seasons.length === 0 || card.seasons.includes(season);
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

  return settlement ? totalPops(settlement.pops) + effect.amount <= settlementCapacity(settlement, G.ruleset) : false;
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
    } else if (effect.type === "timedHappinessDelta") {
      for (const playerID of scopedPlayerIds(effect.scope, activePlayerID)) {
        G.players[playerID].timedHappinessModifiers.push({
          amountPerTurn: effect.amountPerTurn,
          turnsRemaining: effect.turns,
          source: card.name
        });
        addLog(
          G,
          `${getPlayerName(G, playerID)} will feel ${formatRuleNumber(effect.amountPerTurn)} happiness per turn from ${card.name} for ${effect.turns} turns.`
        );
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
      G.players[activePlayerID].popsGainedFromEvents += effect.amount;
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
        pop: effect.pop,
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
      // Non-integer ratios round the payout down — a short-stocked trade never mints fractions.
      const received = Math.floor(exchanged * effect.ratio);
      player.resources[effect.from] -= exchanged;
      player.resources[effect.to] += received;
      addLog(
        G,
        `${getPlayerName(G, activePlayerID)} exchanged ${formatRuleNumber(exchanged)} ${effect.from} for ${formatRuleNumber(
          received
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
  const resources = G.players[playerID].resources;

  // Harm cards can't take what isn't there: stocks clamp at zero. Happiness is the
  // exception — it is a ledger that goes negative by design (unrest).
  for (const [resource, amount] of Object.entries(delta) as Array<[Resource, number]>) {
    if (resource !== "happiness" && amount < 0) {
      delta[resource] = -Math.min(-amount, Math.max(0, resources[resource]));
    }
  }

  applyResourceDelta(resources, delta);
  addLog(G, `${getPlayerName(G, playerID)} resolved ${source}: ${formatRuleResourceDelta(delta)}.`);
}

function scopedPlayerIds(scope: "activePlayer" | "allPlayers", activePlayerID: PlayerId | null) {
  return scope === "allPlayers" ? PLAYER_IDS : activePlayerID ? [activePlayerID] : [];
}
