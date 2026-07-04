import { BUILDINGS } from "../../game/data";
import type { BuildingId, EventCard, EventEffect } from "../../game/types";
import { RESOURCE_LABELS, formatNumber, formatPopLabel, formatSignedNumber } from "../../ui/formatters";

// NOTE: new URL(..., import.meta.url) resolves relative to THIS file. This module
// sits one directory deeper than the old HegemonyBoard.tsx, so the asset paths are
// "../../../assets/..." (project root) rather than the original "../../assets/...".
const EVENT_CARD_ART: Record<string, string> = {
  "season-drought": new URL("../../../assets/event-cards/season-drought.png", import.meta.url).href,
  "season-bountiful-harvest": new URL("../../../assets/event-cards/season-bountiful-harvest.png", import.meta.url).href,
  "season-timber-levies": new URL("../../../assets/event-cards/season-timber-levies.png", import.meta.url).href,
  "season-quarry-contracts": new URL("../../../assets/event-cards/season-quarry-contracts.png", import.meta.url).href,
  "season-grain-tithe": new URL("../../../assets/event-cards/season-grain-tithe.png", import.meta.url).href,
  "season-civic-anxiety": new URL("../../../assets/event-cards/season-civic-anxiety.png", import.meta.url).href,
  "season-festival-games": new URL("../../../assets/event-cards/season-festival-games.png", import.meta.url).href,
  "season-scarce-labor": new URL("../../../assets/event-cards/season-scarce-labor.png", import.meta.url).href,
  "season-skilled-artisans": new URL("../../../assets/event-cards/season-skilled-artisans.png", import.meta.url).href,
  "season-open-markets": new URL("../../../assets/event-cards/season-open-markets.png", import.meta.url).href,
  "player-new-citizen": new URL("../../../assets/event-cards/player-new-citizen.png", import.meta.url).href,
  "player-free-settlers": new URL("../../../assets/event-cards/player-free-settlers.png", import.meta.url).href,
  "player-captured-laborers": new URL("../../../assets/event-cards/player-captured-laborers.png", import.meta.url).href,
  "player-good-stores": new URL("../../../assets/event-cards/player-good-stores.png", import.meta.url).href,
  "player-timber-windfall": new URL("../../../assets/event-cards/player-timber-windfall.png", import.meta.url).href,
  "player-merchant-profit": new URL("../../../assets/event-cards/player-merchant-profit.png", import.meta.url).href,
  "player-stone-shipment": new URL("../../../assets/event-cards/player-stone-shipment.png", import.meta.url).href,
  "player-local-unrest": new URL("../../../assets/event-cards/player-local-unrest.png", import.meta.url).href,
  "player-public-calm": new URL("../../../assets/event-cards/player-public-calm.png", import.meta.url).href,
  "player-patronage-network": new URL("../../../assets/event-cards/player-patronage-network.png", import.meta.url).href,
  "player-emergency-labor": new URL("../../../assets/event-cards/player-emergency-labor.png", import.meta.url).href,
  "player-granary-surplus": new URL("../../../assets/event-cards/player-granary-surplus.png", import.meta.url).href,
  "player-civic-petition": new URL("../../../assets/event-cards/player-civic-petition.png", import.meta.url).href,
  "player-skilled-mason": new URL("../../../assets/event-cards/player-skilled-mason.png", import.meta.url).href,
  "player-caravan-contacts": new URL("../../../assets/event-cards/player-caravan-contacts.png", import.meta.url).href,
  "player-forest-crews": new URL("../../../assets/event-cards/player-forest-crews.png", import.meta.url).href,
  "player-temple-donation": new URL("../../../assets/event-cards/player-temple-donation.png", import.meta.url).href,
  "player-market-day": new URL("../../../assets/event-cards/player-market-day.png", import.meta.url).href
};

export function eventCardArtUrl(card: EventCard) {
  return EVENT_CARD_ART[card.id] ?? EVENT_CARD_ART["season-drought"];
}

export function formatEventEffects(effects: EventEffect[]) {
  return effects.map(formatEventEffect).join(" / ");
}

function formatEventEffect(effect: EventEffect): string {
  if (effect.type === "resourceDelta") {
    return `${formatSignedNumber(effect.amount)} ${RESOURCE_LABELS[effect.resource]}`;
  }

  if (effect.type === "scaledResourceDelta") {
    return `${formatSignedNumber(effect.amountPerPops)} ${RESOURCE_LABELS[effect.resource]} per ${effect.popStep} pops`;
  }

  if (effect.type === "happinessDelta") {
    return `${formatSignedNumber(effect.amount)} ${RESOURCE_LABELS.happiness}`;
  }

  if (effect.type === "scaledHappinessDelta") {
    return `${formatSignedNumber(effect.amountPerPops)} ${RESOURCE_LABELS.happiness} per ${effect.popStep} pops`;
  }

  if (effect.type === "incomeModifier") {
    return `${formatSignedNumber(effect.amount)} ${RESOURCE_LABELS[effect.resource]} income`;
  }

  if (effect.type === "buildingCostMultiplier") {
    return effect.multiplier > 1 ? "Double building costs this season" : "Halve building costs this season";
  }

  if (effect.type === "addPops") {
    return `Add ${effect.amount} ${formatPopLabel(effect.pop, effect.amount)}`;
  }

  if (effect.type === "actionCostDiscount") {
    const target = effect.buildingId ? buildingNameForEvent(effect.buildingId) : effect.action === "foundColony" ? "colony" : "building";

    return `Next ${target}: -${formatNumber(effect.amount)} ${RESOURCE_LABELS[effect.resource]}`;
  }

  if (effect.type === "resourceExchange") {
    return `Exchange up to ${effect.maxAmount} ${RESOURCE_LABELS[effect.from]} for ${RESOURCE_LABELS[effect.to]}`;
  }

  if (effect.type === "resourceDeltaPerPop") {
    return `${formatSignedNumber(effect.amountPerPop)} ${RESOURCE_LABELS[effect.resource]} per ${formatPopLabel(
      effect.pop,
      1
    )}, minimum ${effect.minimum}`;
  }

  return "Choose one option";
}

function buildingNameForEvent(buildingId: BuildingId) {
  return BUILDINGS.find((building) => building.id === buildingId)?.name ?? buildingId;
}
