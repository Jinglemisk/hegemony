import { useEffect, useState } from "react";
import { deckLine, yearCardFace } from "../../../ui/cardFace";
import { presentYearCard } from "../../../ui/effects";
import { toRoman } from "../../../ui/formatters";
import { DeckLine } from "../../cards/DeckLine";
import { GameCard } from "../../cards/GameCard";
import { Ico } from "../../frame/parts";
import { yearCardArtUrl } from "../events";
import { useGameUi } from "../GameUiContext";
import { ceremonyMood } from "./ceremonyMood";
import { DrawnReveal } from "./DrawnReveal";

const FLIP_MS = 1000;

/**
 * The year card at the turn of the year: dealt on its back with the year's numeral,
 * then turned over in place, with the year deck's line under it (what is left, by
 * kind) and its commit. The commit is laid out from the first frame and shows once the
 * card is face up, so nothing moves. Odd years begin play; in a sitting year the commit
 * convenes the Assembly. Reopened from its alarm disc it shows the face and only closes.
 */
export function YearCardModal({
  reveal,
  holdBack = false,
  onClose,
}: {
  /** Turn the card over first; without it, the face opens at once and only closes. */
  reveal: boolean;
  /** Keep the back up until clicked (a dev shortcut for the gate). */
  holdBack?: boolean;
  onClose: () => void;
}) {
  const { G } = useGameUi();
  // With reduced motion the card is face up on the first frame, unless the dev gate
  // holds its back.
  const [face, setFace] = useState(
    () =>
      !reveal ||
      (!holdBack && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true),
  );

  useEffect(() => {
    if (face || holdBack) return;
    const timer = window.setTimeout(() => setFace(true), FLIP_MS);
    return () => window.clearTimeout(timer);
  }, [face, holdBack]);

  const card = G.activeYearCard;
  if (!card) return null;

  const sits = G.assembly && G.assembly.year === G.year;
  const convene = reveal && sits;

  return (
    <DrawnReveal
      card={
        <GameCard
          arrive="deal"
          back={reveal ? <span className="display">{toRoman(G.year)}</span> : undefined}
          face={yearCardFace(card, G.year, yearCardArtUrl(card))}
          faceUp={face}
          onTurn={() => setFace(true)}
          titleId="year-title"
        />
      }
      deck={<DeckLine kinds="line" line={deckLine(G, { kind: "year" })} />}
      label={face ? undefined : "The year turns"}
      labelledBy={face ? "year-title" : undefined}
      mood={face ? ceremonyMood(presentYearCard(card).tone) : "rite"}
      onDismiss={face ? onClose : undefined}
      waiting={!face}
    >
      <button
        className={`ceremonyCommit verb verb-lg${convene ? " is-dark" : ""}`}
        onClick={onClose}
        type="button"
      >
        {convene ? <Ico path="assembly/agora" size="ui" /> : null}
        {!reveal ? "Close" : sits ? "Convene the Assembly" : `Begin Year ${toRoman(G.year)}`}
      </button>
    </DrawnReveal>
  );
}
