import { getEventEffectChoices } from "../../../game/rules";
import { OMEN_TABLE } from "../../../game/data";
import type { EventCard, HegemonyState } from "../../../game/types";
import { AnnotatedText } from "../../AnnotatedText";
import { eventCardArtUrl, formatEventEffects, formatTableEffect, omenArtUrl } from "../events";

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
 * season), the acting player's last card, and the year's standing omen. Each shows
 * its art, name, and an inline-icon summary of its effect, with the full
 * description on hover.
 */
export function TopbarEvents({ G }: { G: HegemonyState }) {
  const seasonal = G.activeSeasonEvent?.card ?? null;
  const player = G.lastPlayerEvent;
  const omen = G.yearOmen;
  const omenTone = omen?.effects.some((effect) => formatTableEffect(effect).tone === "negative") ? "ill" : "fair";

  return (
    <section className="topbarEvents" aria-label="Current event cards">
      <TopbarEventSlot
        label="Season"
        name={seasonal?.name ?? null}
        summary={seasonal ? effectSummary(seasonal) : null}
        tooltip={seasonal?.text ?? null}
        artUrl={seasonal ? eventCardArtUrl(seasonal) : null}
        fallback="No seasonal event"
      />
      <TopbarEventSlot
        label="Player"
        name={player?.name ?? null}
        summary={player ? effectSummary(player) : null}
        tooltip={player?.text ?? null}
        artUrl={player ? eventCardArtUrl(player) : null}
        fallback="No player event"
      />
      <TopbarEventSlot
        label="Omen"
        name={omen?.label ?? null}
        summary={omen ? omen.effects.map((effect) => formatTableEffect(effect).text).join("  ·  ") : null}
        tooltip={
          omen
            ? `${OMEN_TABLE.flavor} Rolled by Year ${omen.year}'s opener; a new sign comes each spring.`
            : null
        }
        artUrl={omen ? omenArtUrl(omenTone) : null}
        fallback="No omen yet"
      />
    </section>
  );
}

function TopbarEventSlot({
  label,
  name,
  summary,
  tooltip,
  artUrl,
  fallback
}: {
  label: string;
  name: string | null;
  summary: string | null;
  tooltip: string | null;
  artUrl: string | null;
  fallback: string;
}) {
  const active = name !== null;

  return (
    <div className={`topbarEventCard${active ? " topbarEventActive" : ""}`} tabIndex={active ? 0 : undefined}>
      {artUrl ? (
        <img alt="" className="topbarEventArt" src={artUrl} />
      ) : (
        <span className="topbarEventArt topbarEventArtEmpty" aria-hidden="true" />
      )}
      <div className="topbarEventBody">
        <span className="topbarEventLabel">{label}</span>
        <strong className="topbarEventName">{name ?? fallback}</strong>
        {summary ? <AnnotatedText text={summary} className="topbarEventEffect" /> : null}
      </div>
      {active && tooltip ? (
        <div className="topbarEventTooltip" role="tooltip">
          <span className="topbarEventTooltipLabel">{label} event</span>
          <strong>{name}</strong>
          <AnnotatedText text={tooltip} className="topbarEventTooltipText" />
        </div>
      ) : null}
    </div>
  );
}
