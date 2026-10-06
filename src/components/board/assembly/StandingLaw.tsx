import { PLAYER_NAMES } from "../../../game/data";
import { getResolutionCard } from "../../../game/assembly";
import type { ActiveLaw } from "../../../game/assembly";
import type { GameContent } from "../../../game/content";
import { AnnotatedText } from "../../AnnotatedText";

/** A standing Law as the Agora page reads it: a slab with its text and its author. */
export function StandingLaw({ stele, content }: { stele: ActiveLaw; content: GameContent }) {
  const card = getResolutionCard(content, stele.cardId);

  if (!card) {
    return null;
  }

  return (
    <div className="lawslab">
      <b className="title">{card.name}</b>
      <span className="lawslabText caption">
        <AnnotatedText linkContext={card.name} text={card.text} />
      </span>
      <span className="lawslabMeta label">
        carried by {PLAYER_NAMES[stele.author]} · Year {stele.enactedYear}
      </span>
    </div>
  );
}
