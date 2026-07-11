import { PLAYER_EVENT_CARDS, SEASONAL_EVENT_CARDS } from "../../../game/data";
import type { EventCard, HegemonyState } from "../../../game/types";
import { UiSprite } from "../../Sprites";

/**
 * Slim tray of the two live decks and how many cards each has left. (The old
 * "Resolutions" card was a 0/0 placeholder for an unbuilt system — dropped until
 * that system exists.)
 */
export function DeckShelf({ G }: { G: HegemonyState }) {
  const decks: Array<{ label: string; remaining: number; total: number; item: "seasonDeck" | "eventDeck" }> = [
    {
      label: "Seasonal",
      remaining: G.seasonalDrawPile.length,
      total: totalCardCount(SEASONAL_EVENT_CARDS),
      item: "seasonDeck"
    },
    {
      label: "Events",
      remaining: G.playerDrawPile.length,
      total: totalCardCount(PLAYER_EVENT_CARDS),
      item: "eventDeck"
    }
  ];

  return (
    <section className="deckTray" aria-label="Card decks remaining">
      {decks.map((deck) => (
        <div
          className="deckTrayItem"
          key={deck.label}
          tabIndex={0}
          title={
            deck.item === "seasonDeck"
              ? `Seasonal deck — the game clock: ${deck.remaining} of ${deck.total} seasons remain; it never reshuffles, and the age ends when it runs out.`
              : `${deck.label} deck: ${deck.remaining} of ${deck.total} cards remaining (reshuffles when empty)`
          }
        >
          <UiSprite item={deck.item} className="deckTrayIcon" />
          <span className="deckTrayLabel">{deck.label}</span>
          <span className="deckTrayCount">
            {deck.remaining}
            <span className="deckTrayTotal">/{deck.total}</span>
          </span>
        </div>
      ))}
      <div
        className="deckTrayItem deckTrayBoard"
        tabIndex={0}
        title={
          G.boardLayout === "classic"
            ? "Classic board — the fixed authored layout. Start with ?board=shuffled for a randomized island."
            : "Shuffled board — seeded random layout. Start with ?board=classic for the authored island."
        }
      >
        <span className="deckTrayLabel">{G.boardLayout === "classic" ? "Classic board" : "Shuffled board"}</span>
      </div>
    </section>
  );
}

function totalCardCount(cards: EventCard[]) {
  return cards.reduce((total, card) => total + card.count, 0);
}
