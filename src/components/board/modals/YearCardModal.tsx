import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { PLAYER_IDS } from "../../../game/data";
import { assemblySittings, nextAssemblyYear } from "../../../game/assembly";
import { yearDeckSize } from "../../../game/year";
import type { LogMoment, PlayerId, Resource, YearCard, YearTerm } from "../../../game/types";
import { presentYearCard } from "../../../ui/effects";
import type { EffectPresentation } from "../../../ui/effects";
import { ordinal, toRoman } from "../../../ui/formatters";
import { sign, yearCardIcon } from "../../../ui/frameFormat";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { Chips, Ico } from "../../frame/parts";
import { yearCardArtUrl } from "../events";
import { useGameUi } from "../GameUiContext";
import { CeremonyBlow } from "./CeremonyBlow";
import { ceremonyMood } from "./ceremonyMood";
import { ModalShell } from "./ModalShell";

const FLIP_MS = 1000;

const TERM_NOUN: Record<YearTerm, string> = {
  plainsFood: "Plains food",
  forestWood: "Forest wood",
  mountainStone: "Mountain stone",
  freemenGold: "Freemen gold",
  citizenInfluence: "Citizen influence",
  luxuryHappiness: "Luxury happiness",
};

/** The card's rule in the fate card's three ranks: what it strikes, the figure, where. */
function blowOf(card: YearCard): EffectPresentation {
  const { text, tone } = presentYearCard(card);
  if (card.effect.type === "zeroTerm")
    return {
      text,
      tone,
      magnitude: "0",
      subject: TERM_NOUN[card.effect.term],
      condition: "for the whole year",
    };
  return card.effect.change === "placeOne"
    ? { text, tone, magnitude: "+1", subject: "Unrest token", condition: "on every realm, now" }
    : {
        text,
        tone,
        magnitude: "0",
        subject: "Unrest tokens",
        condition: "every realm clears them",
      };
}

/** Whether the card moves the happiness level (tokens, Blockade) rather than income. */
const movesLevel = (card: YearCard) =>
  card.effect.type === "unrestTokens" || card.effect.term === "luxuryHappiness";

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

  const years = yearDeckSize(G);
  const yearName = `Year ${toRoman(G.year)} of ${toRoman(years)}`;

  if (!face) {
    return (
      <ModalShell
        backdropClassName="eventModalBackdrop"
        ceremony="rite"
        className="yearBack"
        label="The year turns"
        scrimNote={
          <p className="deckEcho label">
            {yearName} · the deck turns its top card · {G.yearDrawPile.length} remain after it
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
  const blow = blowOf(card);
  const { riotThreshold, revoltThreshold } = G.ruleset.economy.unrest;
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
          presentation={blow}
        />

        {impact ? (
          <ol aria-label="What it does to each realm" className="yearImpact">
            {PLAYER_IDS.map((seat) => {
              const { before, after, loss } = impact[seat];
              const line = movesLevel(card) ? (
                <span className="yearImpact-lv num">
                  {sign(before)} → {sign(after)}
                </span>
              ) : (
                <Chips
                  amounts={Object.fromEntries(
                    (Object.entries(loss) as Array<[Resource, number]>).map(([r, n]) => [r, -n]),
                  )}
                  empty={<span className="yearImpact-lv num">0</span>}
                />
              );
              const warn =
                movesLevel(card) && after <= revoltThreshold
                  ? "at the revolt line"
                  : movesLevel(card) && after <= riotThreshold
                    ? "at the riot line"
                    : null;
              return (
                <li className={seat === viewerId ? "is-you" : undefined} key={seat}>
                  <Seat seat={seat} />
                  {line}
                  <span className={warn ? "yearImpact-warn caption" : "caption"}>
                    {warn ?? (seat === viewerId ? "you" : G.players[seat].name)}
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
              "The titles are tallied after it"
            ) : sits ? (
              <>
                The Assembly sits:{" "}
                <b>
                  {ordinal(G.assembliesHeld)} of {assemblySittings(G)}
                </b>
              </>
            ) : next ? (
              <>
                Next Assembly: <b>Year {toRoman(next)}</b>
              </>
            ) : (
              "No Assembly sits again"
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

function Seat({ seat }: { seat: PlayerId }) {
  const glaze = PLAYER_GLAZES[seat];
  return (
    <span className="idea-seat" style={{ "--owner": glaze.color } as CSSProperties}>
      {glaze.blazon}
    </span>
  );
}
