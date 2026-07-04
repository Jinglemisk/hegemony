import { PLAYER_EVENT_CARDS, SEASONAL_EVENT_CARDS } from "../../../game/data";
import type { EventCard, HegemonyState } from "../../../game/types";
import { UiSprite } from "../../Sprites";

export function DeckShelf({ G }: { G: HegemonyState }) {
  const seasonalTotal = totalCardCount(SEASONAL_EVENT_CARDS);
  const playerTotal = totalCardCount(PLAYER_EVENT_CARDS);
  const decks: Array<{ label: string; count: string; item: "seasonDeck" | "eventDeck" | "resolutionDeck"; detail: string }> = [
    {
      label: "Seasonal",
      count: `${G.seasonalDrawPile.length}/${seasonalTotal}`,
      item: "seasonDeck",
      detail: "Seasonal cards remaining."
    },
    {
      label: "Events",
      count: `${G.playerDrawPile.length}/${playerTotal}`,
      item: "eventDeck",
      detail: "Player event cards remaining."
    },
    {
      label: "Resolutions",
      count: "0/0",
      item: "resolutionDeck",
      detail: "Resolution deck placeholder for future assembly mechanics."
    }
  ];

  return (
    <section className="deckShelf" aria-label="Future card decks">
      {decks.map((deck) => (
        <div className="deckPlaceholder" key={deck.label} tabIndex={0} title={deck.detail}>
          <span className="deckCardFace">
            <UiSprite item={deck.item} className="deckSprite" />
          </span>
          <span className="deckCopy">
            <strong>{deck.label}</strong>
            <em>{deck.count}</em>
          </span>
        </div>
      ))}
    </section>
  );
}

function totalCardCount(cards: EventCard[]) {
  return cards.reduce((total, card) => total + card.count, 0);
}
