import { useEffect, useState } from "react";
import { PLAYER_IDS } from "../../../game/data";
import { assemblySittings, nextAssemblyYear } from "../../../game/assembly";
import { YEAR_TERM_COLUMNS } from "../../../game/economy/income";
import { unrestOutcome } from "../../../game/unrest";
import { lastYear } from "../../../game/year";
import type { LogMoment, Resource, YearCard } from "../../../game/types";
import { presentUnrestOutcome, presentYearCard } from "../../../ui/effects";
import { ordinal, seatName, toRoman } from "../../../ui/formatters";
import { sign } from "../../../ui/frameFormat";
import { turnsUntilYear } from "../../../ui/frameSelectors";
import { yearCardIcon } from "../../../ui/iconRegistry";
import { Prose } from "../../AnnotatedText";
import { Chips, Delta, Ico, SeatMark, Turns } from "../../frame/parts";
import { yearCardArtUrl } from "../events";
import { useGameUi } from "../GameUiContext";
import { CeremonyBlow } from "./CeremonyBlow";
import { ceremonyMood } from "./ceremonyMood";
import { ModalShell } from "./ModalShell";

const FLIP_MS = 1000;

/** Whether the card moves the happiness level (tokens, or a term with no income column,
 *  such as Blockade's) rather than income. */
const movesLevel = (card: YearCard) =>
  card.effect.type === "unrestTokens" || !(card.effect.term in YEAR_TERM_COLUMNS);

/**
 * The year card at the turn of the year: its back with the year's numeral, then its
 * face on the fate card's frame. The face answers "what does it do to each of us"
 * from what the engine recorded as the card turned. Odd years begin play; in a
 * sitting year the commit convenes the Assembly. Reopened from its alarm disc it
 * shows the face at once and only closes.
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
  const { G, viewerId } = useGameUi();
  const [face, setFace] = useState(!reveal);

  useEffect(() => {
    if (face || holdBack) return;
    const timer = window.setTimeout(() => setFace(true), FLIP_MS);
    return () => window.clearTimeout(timer);
  }, [face, holdBack]);

  const card = G.activeYearCard;
  if (!card) return null;

  const years = lastYear(G);
  const yearName = `Year ${toRoman(G.year)}`;

  if (!face) {
    return (
      <ModalShell
        backdropClassName="eventModalBackdrop"
        ceremony="rite"
        className="yearBack"
        label="The year turns"
        scrimNote={
          <p className="deckEcho label">
            {yearName} · the deck turns its top card · {years - G.year} years remain after it
          </p>
        }
      >
        <button className="yearBack-face" onClick={() => setFace(true)} type="button">
          <span className="yearBack-n">{toRoman(G.year)}</span>
        </button>
      </ModalShell>
    );
  }

  const impact = [...G.log]
    .reverse()
    .find(
      (entry): entry is typeof entry & { moment: Extract<LogMoment, { kind: "yearCard" }> } =>
        entry.moment?.kind === "yearCard" && entry.moment.cardId === card.id,
    )?.moment.impact;
  const blow = presentYearCard(card);
  const final = G.year >= years;
  const opener = G.yearOpener === viewerId ? "You open" : `${G.players[G.yearOpener].name} opens`;
  const sits = G.assembly && G.assembly.year === G.year;
  const next = nextAssemblyYear(G);

  return (
    <ModalShell
      backdropClassName="eventModalBackdrop"
      ceremony={ceremonyMood(blow.tone)}
      className="fateCard yearCard"
      labelledBy="year-title"
      onDismiss={onClose}
    >
      <div className="yearArt" style={{ backgroundImage: `url(${yearCardArtUrl(card)})` }}>
        <span className="fateSeat">
          <Ico path="events/year" size="chip" />
          <b className="label">{yearName}</b>
        </span>
      </div>

      <div className="fateBody">
        <span className="fateKicker label">{final ? "The final year" : "The year's card"}</span>
        <h2 className="display display-xl" id="year-title">
          {card.name}
        </h2>
        {card.flavor ? <p className="fateVoice body-em">“{card.flavor}”</p> : null}

        <CeremonyBlow
          className="blowBand"
          icon={<Ico path={yearCardIcon(card)} size="disc" />}
          iconSubject={card.effect.type === "zeroTerm"}
          presentation={blow}
        />

        {impact ? (
          <ol aria-label="What it does to each realm" className="yearImpact">
            {PLAYER_IDS.map((seat) => {
              const { before, after, loss } = impact[seat];
              const line = movesLevel(card) ? (
                <span className="yearImpact-lv">
                  <Delta format={sign} from={before} to={after} />
                </span>
              ) : (
                <Chips
                  amounts={Object.fromEntries(
                    (Object.entries(loss) as Array<[Resource, number]>).map(([r, n]) => [r, -n]),
                  )}
                  signed
                  empty={<span className="yearImpact-lv num">0</span>}
                />
              );
              const unrestLine = movesLevel(card)
                ? presentUnrestOutcome(G.ruleset, unrestOutcome(G, seat, after).tier).line
                : null;
              const warn = unrestLine ? `at ${unrestLine}` : null;
              return (
                <li className={seat === viewerId ? "is-you" : undefined} key={seat}>
                  <SeatMark playerID={seat} />
                  {line}
                  <span className={warn ? "yearImpact-warn caption" : "caption"}>
                    {warn ? <Prose>{warn}</Prose> : seatName(G, seat, viewerId)}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : null}

        <p className="yearFoot caption">
          <span>
            <b>{opener}</b> Year {toRoman(G.year)}
          </span>
          <span>
            {final ? (
              <Prose>The titles are tallied after it</Prose>
            ) : sits ? (
              <Prose>
                The Assembly sits:{" "}
                <b>
                  {ordinal(G.assembliesHeld)} of {assemblySittings(G)}
                </b>
              </Prose>
            ) : next ? (
              <>
                <Prose>Next Assembly</Prose> <Turns n={turnsUntilYear(G, viewerId, next)} />
              </>
            ) : (
              <Prose>No Assembly sits again</Prose>
            )}
          </span>
        </p>

        <button
          className={`ceremonyCommit verb verb-lg${reveal && sits ? " is-dark" : ""}`}
          onClick={onClose}
          type="button"
        >
          {reveal && sits ? <Ico path="assembly/agora" size="ui" /> : null}
          {!reveal ? "Close" : sits ? "Convene the Assembly" : `Begin Year ${toRoman(G.year)}`}
        </button>
      </div>
    </ModalShell>
  );
}
