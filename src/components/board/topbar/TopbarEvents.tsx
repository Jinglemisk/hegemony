import { getEventEffectChoices } from "../../../game/rules";
import type { EventCard, HegemonyState } from "../../../game/types";
import { AnnotatedText } from "../../AnnotatedText";
import { eventCardArtUrl, formatEventEffects } from "../events";

/** A concise mechanical summary of a card's effect (choice cards join with "·"). */
function effectSummary(card: EventCard): string {
  const choices = getEventEffectChoices(card);

  if (choices.length > 1) {
    return choices.map((effects) => formatEventEffects(effects)).join("  ·  ");
  }

  return formatEventEffects(choices[0] ?? card.effects);
}

/**
 * The live event cards in the top-left corner: the seasonal card (everyone, this
 * season) and the acting player's last card. Each shows its art, name, and an
 * inline-icon summary of its effect, with the full description on hover. Yearly
 * cards will slot in here once they exist.
 */
export function TopbarEvents({ G }: { G: HegemonyState }) {
  const seasonal = G.activeSeasonEvent?.card ?? null;
  const player = G.lastPlayerEvent;

  return (
    <section className="topbarEvents" aria-label="Current event cards">
      <TopbarEventCard card={seasonal} label="Season" fallback="No seasonal event" />
      <TopbarEventCard card={player} label="Player" fallback="No player event" />
    </section>
  );
}

function TopbarEventCard({
  card,
  label,
  fallback
}: {
  card: EventCard | null;
  label: string;
  fallback: string;
}) {
  return (
    <div className={`topbarEventCard${card ? " topbarEventActive" : ""}`} tabIndex={card ? 0 : undefined}>
      {card ? (
        <img alt="" className="topbarEventArt" src={eventCardArtUrl(card)} />
      ) : (
        <span className="topbarEventArt topbarEventArtEmpty" aria-hidden="true" />
      )}
      <div className="topbarEventBody">
        <span className="topbarEventLabel">{label}</span>
        <strong className="topbarEventName">{card?.name ?? fallback}</strong>
        {card ? <AnnotatedText text={effectSummary(card)} className="topbarEventEffect" /> : null}
      </div>
      {card ? (
        <div className="topbarEventTooltip" role="tooltip">
          <span className="topbarEventTooltipLabel">{label} event</span>
          <strong>{card.name}</strong>
          <AnnotatedText text={card.text} className="topbarEventTooltipText" />
        </div>
      ) : null}
    </div>
  );
}
