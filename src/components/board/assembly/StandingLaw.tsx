import { PLAYER_NAMES } from "../../../game/data";
import { yearOf } from "../../../game/core/calendar";
import { getResolutionCard } from "../../../game/assembly";
import type { ActiveLaw, TallyMonument } from "../../../game/assembly";
import type { GameContent } from "../../../game/content";
import type { PlayerId } from "../../../game/types";
import { presentLawEffect } from "../../../ui/effects";
import { EffectIcon } from "../../../ui/icons/EffectIcon";
import { glazeOf } from "../../../ui/playerGlazes";
import { AnnotatedText } from "../../AnnotatedText";

/**
 * A standing Law, in the three places it lives.
 *
 * One law has three lives: a card argued at the bema, a **stele** in the
 * colonnade under the orator whose deck it came from, and a **slab** in the
 * Agora where you read what is still biting you. Those were three separate
 * renderings, which is how the Agora came to describe a Law differently from the
 * colonnade standing four inches away.
 *
 * They are one component with two densities now. The stele is a spine and a
 * name — it is being counted, not read. The slab is the full thing, because the
 * Agora is where you go to read it.
 *
 * A monument (Stratokles' resolved Directives) uses the same component: it is
 * not a law, but it stands in the same colonnade for the same reason.
 */
export function StandingLaw({
  stele,
  content,
  variant,
  monument = false,
}: {
  stele: ActiveLaw | TallyMonument;
  content: GameContent;
  variant: "stele" | "slab";
  /** A resolved Directive rather than a standing Law — permanent, not repealable. */
  monument?: boolean;
}) {
  const card = getResolutionCard(content, stele.cardId);

  if (!card) {
    return null;
  }

  if (variant === "stele") {
    return (
      <div className={monument ? "stele steleMonument" : "stele"}>
        <span className="steleAuthorDot" style={{ background: authorColor(stele.author) }} />
        <span className="steleName">{card.name}</span>
      </div>
    );
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

/** The house resolution has no author, so its bead is stone rather than a seat
 *  colour — it stands in the agora and lends its politician power, but it is
 *  nobody's stele. */
function authorColor(author: PlayerId | null): string {
  return author ? glazeOf(author) : "var(--stone)";
}

function authorName(author: PlayerId | null): string {
  return author ? PLAYER_NAMES[author] : "the house";
}
