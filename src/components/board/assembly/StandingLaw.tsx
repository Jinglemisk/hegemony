import { useEffect } from "react";
import { PLAYER_NAMES } from "../../../game/data";
import { yearOf } from "../../../game/core/calendar";
import { getResolutionCard } from "../../../game/assembly";
import type { ActiveLaw, TallyMonument } from "../../../game/assembly";
import type { GameContent } from "../../../game/content";
import type { PlayerId } from "../../../game/types";
import { presentLawEffect } from "../../../ui/effects";
import { EffectIcon } from "../../../ui/icons/EffectIcon";
import { AnnotatedText } from "../../AnnotatedText";
import { SteleCrack } from "./AssemblyIcons";

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
  falling = false,
}: {
  stele: ActiveLaw | TallyMonument;
  content: GameContent;
  /** A resolved Directive rather than a standing Law — permanent, not repealable. */
  monument?: boolean;
  /** Struck: the engine no longer has this law, and the stone is going down. */
  falling?: boolean;
}) {
  const card = getResolutionCard(content, stele.cardId);

  if (!card) {
    return null;
  }

  const classes = ["lawslab"];
  if (monument) classes.push("lawslabMonument");
  if (falling) classes.push("lawslabFalling");

  return (
    <div
      // A stone that has already left the record is hidden from the reader, not
      // read out as though it still stood. The repeal is announced in words a few
      // inches away — the closing recap says which Law was struck and by what
      // margin — so this is decoration with a caption, never the only telling.
      aria-hidden={falling || undefined}
      className={classes.join(" ")}
    >
      {falling ? <SteleCrack /> : null}
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

/**
 * The ceremony's clock. Kept in step with `steleFall` in `assemblyScene.css`,
 * which is the same contract `LacquerDie`'s `FLIP_MS` has with `dieTumble`:
 * 350ms of stillness so the column is read as it stood, 480ms for the crack to
 * run, 700ms for the stone to tip and go.
 */
const CEREMONY_MS = 1530;

/**
 * A law the engine has already dropped, still on its stone for as long as it
 * takes the stone to fall.
 *
 * The clock starts HERE, on mount, and not where the departure was noticed —
 * that is the whole reason `useDepartedLaws` holds a queue instead of a flag. A
 * repeal carries during the ballot, when the standing record is off screen; this
 * component does not exist yet, so nothing is ticking. When the record comes back
 * on the closing floor the struck stele comes back with it, is read for a beat,
 * cracks, and falls out of the column — and only then does the queue let go.
 *
 * The release is a plain timeout rather than `animationend` because the end state
 * must be reached whether or not the animation ever ran: a slab still queued when
 * the reader turns reduced motion on, a browser that skips animations on a
 * backgrounded tab, or a `display: none` ancestor would each strand the law on
 * screen forever if the animation were the only thing that could finish it.
 *
 * It takes an `ActiveLaw` and not the slab's wider `ActiveLaw | TallyMonument`,
 * because a monument cannot fall: `G.tallyMonuments` is append-only by rule — a
 * resolved Directive is permanent and has no repeal — so there is no departure to
 * hold. `.lawslabMonument` would still be carried correctly by the slab if one
 * ever did; nothing would ever feed it.
 */
export function FallingLaw({
  stele,
  content,
  entryKey,
  onFallen,
}: {
  stele: ActiveLaw;
  content: GameContent;
  /** The queue entry this stone belongs to, released when the fall is done. */
  entryKey: number;
  onFallen: (key: number) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onFallen(entryKey), CEREMONY_MS);
    return () => window.clearTimeout(timer);
  }, [entryKey, onFallen]);

  return <StandingLaw content={content} falling stele={stele} />;
}

/** The house resolution has no author — it stands in the agora and lends its
 *  politician power, but it is nobody's stele. */
function authorName(author: PlayerId | null): string {
  return author ? PLAYER_NAMES[author] : "the house";
}
