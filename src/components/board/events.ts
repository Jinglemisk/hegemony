import type { EventCard, YearCard } from "../../game/types";

// Existing art stays until Step 14.
const EVENT_CARD_ART: Record<string, string> = {
  "player-good-stores": new URL(
    "../../../assets/event-cards/player-good-stores.webp",
    import.meta.url,
  ).href,
  "player-timber": new URL(
    "../../../assets/event-cards/player-timber-windfall.webp",
    import.meta.url,
  ).href,
  "player-shipment": new URL(
    "../../../assets/event-cards/player-stone-shipment.webp",
    import.meta.url,
  ).href,
  "player-profit": new URL(
    "../../../assets/event-cards/player-merchant-profit.webp",
    import.meta.url,
  ).href,
  "player-patronage": new URL(
    "../../../assets/event-cards/player-patronage-network.webp",
    import.meta.url,
  ).href,
  "player-free-settlers": new URL(
    "../../../assets/event-cards/player-free-settlers.webp",
    import.meta.url,
  ).href,
  "player-captured-laborers": new URL(
    "../../../assets/event-cards/player-captured-laborers.webp",
    import.meta.url,
  ).href,
  "player-rats": new URL("../../../assets/event-cards/player-good-stores.webp", import.meta.url)
    .href,
  "player-bandits": new URL(
    "../../../assets/event-cards/player-merchant-profit.webp",
    import.meta.url,
  ).href,
  "player-fire": new URL("../../../assets/event-cards/player-timber-windfall.webp", import.meta.url)
    .href,
  "player-local-unrest": new URL(
    "../../../assets/event-cards/player-local-unrest.webp",
    import.meta.url,
  ).href,
  "player-public-calm": new URL(
    "../../../assets/event-cards/player-public-calm.webp",
    import.meta.url,
  ).href,
};

export function eventCardArtUrl(card: EventCard): string {
  return EVENT_CARD_ART[card.id] ?? EVENT_CARD_ART["player-good-stores"];
}

// The year deck reuses the retired season paintings.
const YEAR_CARD_ART: Record<string, string> = {
  "year-drought": new URL("../../../assets/event-cards/season-drought.webp", import.meta.url).href,
  "year-wildfire": new URL("../../../assets/event-cards/season-timber-levies.webp", import.meta.url)
    .href,
  "year-silent-mines": new URL(
    "../../../assets/event-cards/season-quarry-contracts.webp",
    import.meta.url,
  ).href,
  "year-piracy": new URL("../../../assets/event-cards/season-open-markets.webp", import.meta.url)
    .href,
  "year-ostracism": new URL(
    "../../../assets/event-cards/season-skilled-artisans.webp",
    import.meta.url,
  ).href,
  "year-blockade": new URL("../../../assets/event-cards/season-scarce-labor.webp", import.meta.url)
    .href,
  "year-plague": new URL("../../../assets/event-cards/season-civic-anxiety.webp", import.meta.url)
    .href,
  "year-festival": new URL(
    "../../../assets/event-cards/season-festival-games.webp",
    import.meta.url,
  ).href,
};

export function yearCardArtUrl(card: YearCard): string {
  return YEAR_CARD_ART[card.id] ?? YEAR_CARD_ART["year-drought"];
}
