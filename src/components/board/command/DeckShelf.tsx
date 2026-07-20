import { PLAYER_EVENT_CARDS, SEASONAL_EVENT_CARDS } from "../../../game/data";
import { POLITICIANS, RESOLUTION_CARDS } from "../../../game/assembly";
import type { EventCard, HegemonyState } from "../../../game/types";
import { UiSprite } from "../../Sprites";

/**
 * Slim tray of the live decks and how many cards each has left. Resolutions rejoined
 * the tray when the Assembly shipped — it was dropped in the debt sweep precisely
 * because it was a 0/0 placeholder for a system that did not exist yet.
 */
export function DeckShelf({ G }: { G: HegemonyState }) {
  const undrawnResolutions = POLITICIANS.reduce(
    (total, politician) => total + G.politicianDecks[politician.id].length,
    0
  );
  const decks: Array<{
    label: string;
    remaining: number;
    total: number;
    item: "seasonDeck" | "eventDeck" | "resolutionDeck";
  }> = [
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
    },
    {
      label: "Resolutions",
      remaining: undrawnResolutions,
      total: RESOLUTION_CARDS.length,
      item: "resolutionDeck"
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
              : deck.item === "resolutionDeck"
                ? `Resolutions — the four politicians' decks: ${deck.remaining} of ${deck.total} undrawn. ${G.activeLaws.length} law${G.activeLaws.length === 1 ? "" : "s"} standing. Enacted cards leave the decks; everything else returns.`
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
        <span className="deckTrayLabel">
          {G.boardLayout === "classic" ? "Classic board" : "Shuffled board"} · #{G.seed}
        </span>
      </div>
    </section>
  );
}

function totalCardCount(cards: EventCard[]) {
  return cards.reduce((total, card) => total + card.count, 0);
}
