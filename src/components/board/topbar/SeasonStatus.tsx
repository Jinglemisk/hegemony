import type { LocalContext } from "../../../game/controller";
import type { EventCard, HegemonyState, PlayerId } from "../../../game/types";
import { phaseLabel } from "../../../ui/formatters";
import { PLAYER_DISPLAY_NAMES } from "../constants";
import { eventCardArtUrl } from "../events";

export function SeasonStatus({
  G,
  ctx,
  isActive,
  currentPlayerId
}: {
  G: HegemonyState;
  ctx: LocalContext;
  isActive: boolean;
  currentPlayerId: PlayerId;
}) {
  const seasonalCard = G.activeSeasonEvent?.card ?? null;
  const playerCard = G.lastPlayerEvent;

  return (
    <>
      <section className="statusPanel effectsCluster" aria-label="Seasonal and player events">
        <EventStatusCard card={seasonalCard} fallback="Awaiting Card" label="Seasonal Event" />
        <EventStatusCard card={playerCard} fallback="Awaiting Card" label="Player Event" />
      </section>

      <div className="seasonCenter">
        <div className="seasonMedallion" aria-label={`Season ${G.season}`}>
          <span>Season</span>
          <strong>{G.season}</strong>
        </div>
        <div className="seasonTurnCaption" aria-label="Turn status">
          <span>Turn {ctx.turn} · {phaseLabel(ctx.phase)}</span>
          <strong>{isActive ? "Your turn" : `${PLAYER_DISPLAY_NAMES[currentPlayerId]} acting`}</strong>
        </div>
      </div>
    </>
  );
}

function EventStatusCard({
  card,
  fallback,
  label
}: {
  card: EventCard | null;
  fallback: string;
  label: string;
}) {
  return (
    <div className={`seasonEventLabel${card ? " activeEventLabel" : ""}`} title={card ? card.text : fallback}>
      {card ? <img alt="" className="eventStatusArt" src={eventCardArtUrl(card)} /> : null}
      <div>
        <span>{label}</span>
        <strong>{card?.name ?? fallback}</strong>
        {card ? <em>{card.text}</em> : null}
      </div>
    </div>
  );
}
