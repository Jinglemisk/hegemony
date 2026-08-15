import { PLAYER_NAMES } from "../../../game/data";
import { yearOf } from "../../../game/core/calendar";
import { getResolutionCard } from "../../../game/assembly";
import type { ActiveLaw, TallyMonument } from "../../../game/assembly";
import type { GameContent } from "../../../game/content";
import type { PlayerId } from "../../../game/types";
import { presentLawEffect } from "../../../ui/effects";
import { EffectIcon } from "../../../ui/icons/EffectIcon";
import { AnnotatedText } from "../../AnnotatedText";

/**
 * A standing Law where it is read: a **slab**, in the Assembly's standing-laws
 * column and on the Agora page. One rendering serving both, so the two can never
 * come to describe the same Law differently.
 *
 * There was a second, denser `variant="stele"` — an author bead and a name, for a
 * colonnade that counted laws rather than showed them. The rebuilt scene counts
 * them with notches instead, so no caller has asked for it since; it survived as
 * a branch emitting `.stele` / `.steleName` / `.steleAuthorDot` / `.steleMonument`,
 * not one of which any sheet has ever matched. An unstyled render path no caller
 * reaches is the trap PAR-ASM-22 actually names, so it is deleted rather than
 * given a treatment nothing would ever show.
 *
 * A monument (Stratokles' resolved Directives) uses the same component: it is not
 * a law, but it stands in the same column for the same reason — and
 * `.lawslabMonument` is what keeps it from reading as an ordinary standing Law.
 */
export function StandingLaw({
  stele,
  content,
  monument = false,
}: {
  stele: ActiveLaw | TallyMonument;
  content: GameContent;
  /** A resolved Directive rather than a standing Law — permanent, not repealable. */
  monument?: boolean;
}) {
  const card = getResolutionCard(content, stele.cardId);

  if (!card) {
    return null;
  }

  return (
    <div className={monument ? "lawslab lawslabMonument" : "lawslab"}>
      <b className="title">{card.name}</b>
      <span className="lawslabText caption">
        <AnnotatedText text={card.text} />
      </span>

      {/* The effects in icon grammar, beside the sentence rather than instead of
          it: the Agora is the one place where reading the whole clause is the
          point, and the glyphs are what let you find the one you meant. */}
      {card.kind === "law" ? (
        <span className="lawslabEffects">
          {card.effects.map((effect, index) => (
            <span className="effectRow" key={index}>
              <EffectIcon effect={effect} family="law" />
              <span className="caption">{presentLawEffect(effect, content).text}</span>
            </span>
          ))}
        </span>
      ) : null}

      <span className="lawslabMeta label">
        carried by {authorName(stele.author)} · Year {yearOf(stele.enactedSeason)}
        {monument ? " · monument" : ""}
      </span>
    </div>
  );
}

/** The house resolution has no author — it stands in the agora and lends its
 *  politician power, but it is nobody's stele. */
function authorName(author: PlayerId | null): string {
  return author ? PLAYER_NAMES[author] : "the house";
}
