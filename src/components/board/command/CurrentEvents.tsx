import type { EventCard, HegemonyState } from "../../../game/types";
import { eventCardArtUrl } from "../events";

/**
 * The two live event cards — seasonal (affects everyone this season) and the
 * acting player's last event — shown in full at the top of the command rail,
 * where the player is already looking to act. Replaces the truncated top-bar
 * labels.
 */
export function CurrentEvents({ G }: { G: HegemonyState }) {
  const seasonal = G.activeSeasonEvent?.card ?? null;
  const player = G.lastPlayerEvent;

  return (
    <section className="eventRail" aria-label="Current events">
      <EventRailCard card={seasonal} label="Season event" fallback="No seasonal event in play" />
      <EventRailCard card={player} label="Player event" fallback="No player event drawn yet" />
    </section>
  );
}

function EventRailCard({
  card,
  label,
  fallback
}: {
  card: EventCard | null;
  label: string;
  fallback: string;
}) {
  return (
    <article className={`eventRailCard${card ? " eventRailActive" : ""}`}>
      {card ? (
        <img alt="" className="eventRailArt" src={eventCardArtUrl(card)} />
      ) : (
        <span className="eventRailArt eventRailArtEmpty" aria-hidden="true" />
      )}
      <div className="eventRailBody">
        <span className="eventRailLabel">{label}</span>
        <strong className="eventRailName">{card?.name ?? fallback}</strong>
        {card ? <p className="eventRailText">{card.text}</p> : null}
      </div>
    </article>
  );
}
