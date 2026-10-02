import type { EventCard } from "../../game/types";

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
