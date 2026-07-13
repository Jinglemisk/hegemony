import { BUILDINGS } from "../../game/data";
import type { BuildingId, EventCard, EventEffect, TableEffect } from "../../game/types";
import { RESOURCE_LABELS, formatNumber, formatPopLabel, formatSignedNumber } from "../../ui/formatters";

// NOTE: new URL(..., import.meta.url) resolves relative to THIS file. This module
// sits one directory deeper than the old HegemonyBoard.tsx, so the asset paths are
// "../../../assets/..." (project root) rather than the original "../../assets/...".
const EVENT_CARD_ART: Record<string, string> = {
  "season-drought": new URL("../../../assets/event-cards/season-drought.webp", import.meta.url).href,
  "season-bountiful-harvest": new URL("../../../assets/event-cards/season-bountiful-harvest.webp", import.meta.url).href,
  "season-timber-levies": new URL("../../../assets/event-cards/season-timber-levies.webp", import.meta.url).href,
  "season-quarry-contracts": new URL("../../../assets/event-cards/season-quarry-contracts.webp", import.meta.url).href,
  "season-grain-tithe": new URL("../../../assets/event-cards/season-grain-tithe.webp", import.meta.url).href,
  "season-civic-anxiety": new URL("../../../assets/event-cards/season-civic-anxiety.webp", import.meta.url).href,
  "season-festival-games": new URL("../../../assets/event-cards/season-festival-games.webp", import.meta.url).href,
  "season-scarce-labor": new URL("../../../assets/event-cards/season-scarce-labor.webp", import.meta.url).href,
  "season-skilled-artisans": new URL("../../../assets/event-cards/season-skilled-artisans.webp", import.meta.url).href,
  "season-open-markets": new URL("../../../assets/event-cards/season-open-markets.webp", import.meta.url).href,
  "player-new-citizen": new URL("../../../assets/event-cards/player-new-citizen.webp", import.meta.url).href,
  "player-free-settlers": new URL("../../../assets/event-cards/player-free-settlers.webp", import.meta.url).href,
  "player-captured-laborers": new URL("../../../assets/event-cards/player-captured-laborers.webp", import.meta.url).href,
  "player-good-stores": new URL("../../../assets/event-cards/player-good-stores.webp", import.meta.url).href,
  "player-timber-windfall": new URL("../../../assets/event-cards/player-timber-windfall.webp", import.meta.url).href,
  "player-merchant-profit": new URL("../../../assets/event-cards/player-merchant-profit.webp", import.meta.url).href,
  "player-stone-shipment": new URL("../../../assets/event-cards/player-stone-shipment.webp", import.meta.url).href,
  "player-local-unrest": new URL("../../../assets/event-cards/player-local-unrest.webp", import.meta.url).href,
  "player-public-calm": new URL("../../../assets/event-cards/player-public-calm.webp", import.meta.url).href,
  "player-patronage-network": new URL("../../../assets/event-cards/player-patronage-network.webp", import.meta.url).href,
  "player-emergency-labor": new URL("../../../assets/event-cards/player-emergency-labor.webp", import.meta.url).href,
  "player-granary-surplus": new URL("../../../assets/event-cards/player-granary-surplus.webp", import.meta.url).href,
  "player-civic-petition": new URL("../../../assets/event-cards/player-civic-petition.webp", import.meta.url).href,
  "player-skilled-mason": new URL("../../../assets/event-cards/player-skilled-mason.webp", import.meta.url).href,
  "player-caravan-contacts": new URL("../../../assets/event-cards/player-caravan-contacts.webp", import.meta.url).href,
  "player-forest-crews": new URL("../../../assets/event-cards/player-forest-crews.webp", import.meta.url).href,
  "player-temple-donation": new URL("../../../assets/event-cards/player-temple-donation.webp", import.meta.url).href,
  "player-market-day": new URL("../../../assets/event-cards/player-market-day.webp", import.meta.url).href
};

export function eventCardArtUrl(card: EventCard) {
  return EVENT_CARD_ART[card.id] ?? EVENT_CARD_ART["season-drought"];
}

export function formatEventEffects(effects: EventEffect[]) {
  return effects.map(formatEventEffect).join(" / ");
}

/** One card-style chip per table-row effect (docs/feat/event-tables.md): signed
 *  number + token word that AnnotatedText turns into an icon, plus a tone so the
 *  UI can color-signal gain vs loss at a glance. */
export function formatTableEffect(effect: TableEffect): { text: string; tone: "positive" | "negative" | "muted" } {
  switch (effect.type) {
    case "none":
      return { text: "—", tone: "muted" };
    case "losePops":
      return { text: `-${formatNumber(effect.count)} ${effect.count === 1 ? "pop" : "pops"}`, tone: "negative" };
    case "loseResource":
      return {
        text:
          `-${formatNumber(effect.amount)} ${RESOURCE_LABELS[effect.resource]}` +
          (effect.popLossIfShort ? ` (short: -${formatNumber(effect.popLossIfShort)} pop)` : ""),
        tone: "negative"
      };
    case "destroyBuilding":
      return { text: "-1 building", tone: "negative" };
    case "gainResource":
      return { text: `+${formatNumber(effect.amount)} ${RESOURCE_LABELS[effect.resource]}`, tone: "positive" };
    case "gainPop":
      return { text: `+1 ${formatPopLabel(effect.pop, 1)}`, tone: "positive" };
    case "yearIncomeModifier":
      return {
        text: `${formatSignedNumber(effect.amount)} ${RESOURCE_LABELS[effect.resource]} income, all year`,
        tone: effect.amount >= 0 ? "positive" : "negative"
      };
  }
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

  if (effect.type === "timedHappinessDelta") {
    return `${formatSignedNumber(effect.amountPerTurn)} ${RESOURCE_LABELS.happiness} per turn for ${effect.turns} turns`;
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
