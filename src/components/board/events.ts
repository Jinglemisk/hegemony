import type { EventCard } from "../../game/types";

// NOTE: new URL(..., import.meta.url) resolves relative to THIS file. This module
// sits one directory deeper than the old HegemonyBoard.tsx, so the asset paths are
// "../../../assets/..." (project root) rather than the original "../../assets/...".
const EVENT_CARD_ART: Record<string, string> = {
  "season-drought": new URL("../../../assets/event-cards/season-drought.webp", import.meta.url)
    .href,
  "season-bountiful-harvest": new URL(
    "../../../assets/event-cards/season-bountiful-harvest.webp",
    import.meta.url,
  ).href,
  "season-timber-levies": new URL(
    "../../../assets/event-cards/season-timber-levies.webp",
    import.meta.url,
  ).href,
  "season-quarry-contracts": new URL(
    "../../../assets/event-cards/season-quarry-contracts.webp",
    import.meta.url,
  ).href,
  "season-grain-tithe": new URL(
    "../../../assets/event-cards/season-grain-tithe.webp",
    import.meta.url,
  ).href,
  "season-civic-anxiety": new URL(
    "../../../assets/event-cards/season-civic-anxiety.webp",
    import.meta.url,
  ).href,
  "season-festival-games": new URL(
    "../../../assets/event-cards/season-festival-games.webp",
    import.meta.url,
  ).href,
  "season-scarce-labor": new URL(
    "../../../assets/event-cards/season-scarce-labor.webp",
    import.meta.url,
  ).href,
  "season-skilled-artisans": new URL(
    "../../../assets/event-cards/season-skilled-artisans.webp",
    import.meta.url,
  ).href,
  "season-open-markets": new URL(
    "../../../assets/event-cards/season-open-markets.webp",
    import.meta.url,
  ).href,
  "player-new-citizen": new URL(
    "../../../assets/event-cards/player-new-citizen.webp",
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
  "player-good-stores": new URL(
    "../../../assets/event-cards/player-good-stores.webp",
    import.meta.url,
  ).href,
  "player-timber-windfall": new URL(
    "../../../assets/event-cards/player-timber-windfall.webp",
    import.meta.url,
  ).href,
  "player-merchant-profit": new URL(
    "../../../assets/event-cards/player-merchant-profit.webp",
    import.meta.url,
  ).href,
  "player-stone-shipment": new URL(
    "../../../assets/event-cards/player-stone-shipment.webp",
    import.meta.url,
  ).href,
  "player-local-unrest": new URL(
    "../../../assets/event-cards/player-local-unrest.webp",
    import.meta.url,
  ).href,
  "player-public-calm": new URL(
    "../../../assets/event-cards/player-public-calm.webp",
    import.meta.url,
  ).href,
  "player-patronage-network": new URL(
    "../../../assets/event-cards/player-patronage-network.webp",
    import.meta.url,
  ).href,
  "player-emergency-labor": new URL(
    "../../../assets/event-cards/player-emergency-labor.webp",
    import.meta.url,
  ).href,
  "player-granary-surplus": new URL(
    "../../../assets/event-cards/player-granary-surplus.webp",
    import.meta.url,
  ).href,
  "player-civic-petition": new URL(
    "../../../assets/event-cards/player-civic-petition.webp",
    import.meta.url,
  ).href,
  "player-skilled-mason": new URL(
    "../../../assets/event-cards/player-skilled-mason.webp",
    import.meta.url,
  ).href,
  "player-caravan-contacts": new URL(
    "../../../assets/event-cards/player-caravan-contacts.webp",
    import.meta.url,
  ).href,
  "player-forest-crews": new URL(
    "../../../assets/event-cards/player-forest-crews.webp",
    import.meta.url,
  ).href,
  "player-temple-donation": new URL(
    "../../../assets/event-cards/player-temple-donation.webp",
    import.meta.url,
  ).href,
  "player-market-day": new URL(
    "../../../assets/event-cards/player-market-day.webp",
    import.meta.url,
  ).href,
};

// The 2026-07-13 deck-overhaul cards borrow their nearest kin's art until they get
// their own (docs/archive/notes/OVERNIGHT.md morning questions) — better a grain jar for Granary Rats
// than everything falling back to the drought plate.
Object.assign(EVENT_CARD_ART, {
  "player-citizenship-rolls": EVENT_CARD_ART["player-new-citizen"],
  "player-willing-hands": EVENT_CARD_ART["player-free-settlers"],
  "player-slave-auction": EVENT_CARD_ART["player-captured-laborers"],
  "player-granary-rats": EVENT_CARD_ART["player-good-stores"],
  "player-banditry": EVENT_CARD_ART["player-merchant-profit"],
  "player-warehouse-fire": EVENT_CARD_ART["player-timber-windfall"],
  "player-quarry-collapse": EVENT_CARD_ART["player-stone-shipment"],
  "season-spring-floods": EVENT_CARD_ART["season-drought"],
  "season-wildfire": EVENT_CARD_ART["season-timber-levies"],
});

/** Art for the yearly omen's top-bar card: festive plate for fair signs, the
 *  anxious one for ill — placeholders until the omen gets its own art. */
export function omenArtUrl(tone: "fair" | "ill") {
  return tone === "fair"
    ? EVENT_CARD_ART["season-festival-games"]
    : EVENT_CARD_ART["season-civic-anxiety"];
}

export function eventCardArtUrl(card: EventCard) {
  return EVENT_CARD_ART[card.id] ?? EVENT_CARD_ART["season-drought"];
}
