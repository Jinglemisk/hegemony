import { getEventEffectChoices } from "../../../game/rules";
import { getOmenTable } from "../../../game/content";
import type { GameContent } from "../../../game/content";
import { PLAYER_NAMES } from "../../../game/data";
import type { EventCard, HegemonyState } from "../../../game/types";
import type { EffectPresentation } from "../../../ui/effects";
import {
  joinEffectPresentations,
  presentEventEffects,
  presentTableEffect,
} from "../../../ui/effects";
import { toRoman } from "../../../ui/formatters";
import { AnnotatedText } from "../../AnnotatedText";
import { EffectLine } from "../../EffectLine";
import { MechanicsDetails } from "../../MechanicsDetails";
import { eventCardArtUrl, omenArtUrl } from "../events";
import { Tooltip } from "../../overlays/Tooltip";

/** A concise mechanical summary of a card's effect (choice cards join with "·"). */
function effectSummary(card: EventCard, content: GameContent): EffectPresentation {
  const choices = getEventEffectChoices(card);

  if (choices.length > 1) {
    return joinEffectPresentations(choices.map((effects) => presentEventEffects(effects, content)));
  }

  return presentEventEffects(choices[0] ?? card.effects, content);
}

/**
 * The live event slips in the top-left corner: the year's standing omen, the
 * seasonal card (everyone, this season), and the acting player's last card.
 *
 * A slip is a bone chip with its art let into it, a clay kicker naming WHERE the
 * card came from — and, for a fate card, WHOSE it is — the card's name, and an
 * inline-icon summary of its effect. The full text is on hover.
 *
 * A slot with no card is not drawn at all. The hatched placeholders it replaces
 * spent a third of the bar's left end saying "nothing here", which is the one
 * thing the player does not need told.
 */
export function TopbarEvents({ G }: { G: HegemonyState }) {
  const omenTable = getOmenTable(G.definition.content);
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
      {omen ? (
        <TopbarEventSlip
          artUrl={omenArtUrl(omenTone)}
          duration="This year"
          kicker={`Omen · Year ${toRoman(omen.year)}`}
          name={omen.label}
          source="Omen"
          summary={joinEffectPresentations(omen.effects.map(presentTableEffect))}
          tooltip={`${omenTable.flavor} Rolled by Year ${omen.year}'s opener; a new sign comes each spring.`}
        />
      ) : null}
      {seasonal ? (
        <TopbarEventSlip
          artUrl={eventCardArtUrl(seasonal)}
          duration="This season"
          kicker="Season"
          name={seasonal.name}
          source="Season"
          summary={effectSummary(seasonal, G.definition.content)}
          tooltip={seasonal.text}
        />
      ) : null}
      {player ? (
        <TopbarEventSlip
          artUrl={eventCardArtUrl(player)}
          duration="Resolved this turn"
          kicker={`Fate · ${PLAYER_NAMES[G.currentPlayer]}`}
          kind="fate"
          name={player.name}
          source="Player"
          summary={effectSummary(player, G.definition.content)}
          tooltip={player.text}
        />
      ) : null}
    </section>
  );
}

function TopbarEventSlip({
  artUrl,
  duration,
  kicker,
  kind,
  name,
  source,
  summary,
  tooltip,
}: {
  artUrl: string;
  /** How long the card's effect stands — the tooltip's third line. */
  duration: string;
  /** The line the slip prints: the source, and for a fate card the seat too. */
  kicker: string;
  kind?: "fate";
  name: string;
  /** The source in the tooltip's own words, which never carries the seat name. */
  source: string;
  summary: EffectPresentation;
  tooltip: string | null;
}) {
  const slip = (
    <>
      <img alt="" className="topbarEventArt" src={artUrl} />
      <span className="topbarEventBody">
        <span className="topbarEventLabel">{kicker}</span>
        <strong className="topbarEventName">{name}</strong>
        <EffectLine effect={summary} className="topbarEventEffect" />
      </span>
    </>
  );
  const className = `topbarEventCard${kind ? ` topbarEventCard-${kind}` : ""}`;

  if (!tooltip) {
    return <span className={className}>{slip}</span>;
  }

  return (
    <Tooltip
      ariaLabel={`${source} event: ${name}`}
      content={
        <MechanicsDetails
          effects={[summary]}
          heading={name}
          source={`${source} event`}
          duration={duration}
        >
          <AnnotatedText text={tooltip} className="topbarEventTooltipText" links={false} />
        </MechanicsDetails>
      }
      focusable
      triggerClassName={className}
      tooltipClassName="topbarEventTooltip"
    >
      {slip}
    </Tooltip>
  );
}
