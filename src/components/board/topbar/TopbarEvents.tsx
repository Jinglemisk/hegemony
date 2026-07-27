import { getEventEffectChoices } from "../../../game/rules";
import { OMEN_TABLE } from "../../../game/data";
import type { EventCard, HegemonyState } from "../../../game/types";
import type { EffectPresentation } from "../../../ui/effects";
import {
  joinEffectPresentations,
  presentEventEffects,
  presentTableEffect,
} from "../../../ui/effects";
import { AnnotatedText } from "../../AnnotatedText";
import { EffectLine } from "../../EffectLine";
import { MechanicsDetails } from "../../MechanicsDetails";
import { eventCardArtUrl, omenArtUrl } from "../events";
import { Tooltip } from "../../overlays/Tooltip";

/** A concise mechanical summary of a card's effect (choice cards join with "·"). */
function effectSummary(card: EventCard): EffectPresentation {
  const choices = getEventEffectChoices(card);

  if (choices.length > 1) {
    return joinEffectPresentations(choices.map(presentEventEffects));
  }

  return presentEventEffects(choices[0] ?? card.effects);
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
  const omenTone = omen?.effects.some((effect) => presentTableEffect(effect).tone === "negative")
    ? "ill"
    : "fair";

  // Longest-standing first: the omen rules the year, the season card the season,
  // the player card just this turn.
  return (
    <section className="topbarEvents" aria-label="Current event cards">
      <TopbarEventSlot
        label="Omen"
        name={omen?.label ?? null}
        summary={omen ? joinEffectPresentations(omen.effects.map(presentTableEffect)) : null}
        tooltip={
          omen
            ? `${OMEN_TABLE.flavor} Rolled by Year ${omen.year}'s opener; a new sign comes each spring.`
            : null
        }
        artUrl={omen ? omenArtUrl(omenTone) : null}
        fallback="No omen yet"
      />
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
    </section>
  );
}

function TopbarEventSlot({
  label,
  name,
  summary,
  tooltip,
  artUrl,
  fallback,
}: {
  label: string;
  name: string | null;
  summary: EffectPresentation | null;
  tooltip: string | null;
  artUrl: string | null;
  fallback: string;
}) {
  const active = name !== null;
  const card = (
    <>
      {artUrl ? (
        <img alt="" className="topbarEventArt" src={artUrl} />
      ) : (
        <span className="topbarEventArt topbarEventArtEmpty" aria-hidden="true" />
      )}
      <span className="topbarEventBody">
        <span className="topbarEventLabel">{label}</span>
        <strong className="topbarEventName">{name ?? fallback}</strong>
        {summary ? <EffectLine effect={summary} className="topbarEventEffect" /> : null}
      </span>
    </>
  );

  if (!active || !tooltip) {
    return <span className="topbarEventCard">{card}</span>;
  }

  return (
    <Tooltip
      ariaLabel={`${label} event: ${name}`}
      content={
        <MechanicsDetails
          effects={summary ? [summary] : []}
          heading={name}
          source={`${label} event`}
          duration={
            label === "Omen"
              ? "This year"
              : label === "Season"
                ? "This season"
                : "Resolved this turn"
          }
        >
          <AnnotatedText text={tooltip} className="topbarEventTooltipText" links={false} />
        </MechanicsDetails>
      }
      focusable
      triggerClassName="topbarEventCard topbarEventActive"
      tooltipClassName="topbarEventTooltip"
    >
      {card}
    </Tooltip>
  );
}
