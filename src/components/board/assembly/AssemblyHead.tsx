import { PLAYER_NAMES } from "../../../game/data";
import type { AssemblyPhase, AssemblySession } from "../../../game/assembly";
import type { HegemonyState } from "../../../game/types";
import { toRoman } from "../../../ui/formatters";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { victoryStandings } from "../../../game/victory";
import { MechanicsDetails } from "../../MechanicsDetails";
import { Tooltip } from "../../overlays/Tooltip";

/**
 * The scene's head — three centred rows, not a label bar.
 *
 * `ΕΚΚΛΗΣΙΑ` over the title over the sitting's own sub-line. The Greek kicker is
 * the one word that says where you are before you have read anything, and it is
 * why the title beneath it can be four letters wide instead of a sentence.
 *
 * The stations are the second row: three numbered discs joined by the ivory
 * meander. A station you have FINISHED turns olive and its numeral becomes a
 * check — without that, a phase you have left reads identically to one you have
 * not reached, which is the whole point of drawing a progress track at all.
 *
 * The two corners are fixed furniture: the ballot counter top-left (only once
 * there is a ballot to count) and the Voice plaque top-right.
 */

const STATIONS = [
  { phase: "proposal", numeral: "I", label: "Proposal" },
  { phase: "voting", numeral: "II", label: "Voting" },
  { phase: "closing", numeral: "III", label: "Standing law" },
] as const;

const PHASE_ORDER: AssemblyPhase[] = ["proposal", "voting", "closing"];

export function AssemblyHead({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  const reached = PHASE_ORDER.indexOf(session.phase);
  const { title, sub } = headline(G, session);

  return (
    <div className="asmHead">
      {session.phase === "voting" && session.ballot.length > 0 ? (
        <div className="asmBallotCount">
          <span className="asmBallotKey label">The ballot</span>
          <b className="asmBallotValue title num">
            Card {toRoman(session.ballotIndex + 1)} of {toRoman(session.ballot.length)}
          </b>
        </div>
      ) : null}

      <VoicePlaque G={G} />

      <div className="asmHeadBlock">
        <span className="asmKicker label" lang="el">
          ΕΚΚΛΗΣΙΑ
        </span>
        <h1 className="asmTitle display display-xl" id="assembly-title">
          {title}
        </h1>
        <span className="asmSub body-em">{sub}</span>
      </div>

      <ol aria-label="The Assembly's three stations" className="asmStations">
        {STATIONS.map((station, index) => {
          const state = index < reached ? "done" : index === reached ? "now" : "ahead";

          return (
            <li className={`asmStation is-${state}`} key={station.phase}>
              {index > 0 ? <span aria-hidden="true" className="asmStationLink" /> : null}
              <span className="asmStationNum stat" aria-hidden={state === "done"}>
                {state === "done" ? "✓" : station.numeral}
              </span>
              <span className="asmStationLabel label">{station.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The title retitles for the phase: what the house is doing right now IS the scene. */
function headline(G: HegemonyState, session: AssemblySession): { title: string; sub: string } {
  if (session.phase === "voting") {
    const left = session.ballot.length;

    return {
      title: "The vote",
      sub: `the Assembly turns to the ballot — ${left} resolution${left === 1 ? "" : "s"} stand${left === 1 ? "s" : ""}`,
    };
  }

  if (session.phase === "closing") {
    return {
      title: "The house rises",
      sub: `play returns to ${PLAYER_NAMES[session.resumePlayer]}`,
    };
  }

  return {
    title: "The Assembly",
    sub: `${ordinal(G.assembliesHeld)} of the game · spring of Year ${toRoman(session.year)}`,
  };
}

/** Voice is a permanent standing, so it sits in the corner and never moves. */
function VoicePlaque({ G }: { G: HegemonyState }) {
  const voice = victoryStandings(G).find((standing) => standing.card.metric === "voice");
  const holder = voice?.holder ?? null;
  const glaze = holder ? PLAYER_GLAZES[holder] : null;

  return (
    <Tooltip
      ariaLabel={`Voice of the Assembly: ${glaze ? glaze.name : "unheld"}`}
      content={
        <MechanicsDetails
          duration="Permanent until strictly exceeded"
          heading="Voice of the Assembly"
          source="Victory standing"
        >
          <p className="mechanicsExplanation">
            The first player to pass {voice?.minimum ?? G.ruleset.victory.minimums.voice} authored
            resolutions claims Voice. Ties do not dislodge its holder.
          </p>
        </MechanicsDetails>
      }
      focusable
      preferredPlacement="below"
      triggerAs="div"
      triggerClassName="asmVoiceTrigger"
    >
      <div className="asmVoice">
        <span className="asmVoiceKey label">Voice</span>
        {glaze ? (
          <>
            {/* A glaze never travels alone — the disc carries the seat's blazon. */}
            <span className="asmGlaze title" style={{ background: glaze.color }}>
              {glaze.blazon}
            </span>
            <b className="asmVoiceName verb">{glaze.name}</b>
          </>
        ) : (
          <b className="asmVoiceName verb asmVoiceNone">Unheld</b>
        )}
      </div>
    </Tooltip>
  );
}

function ordinal(count: number): string {
  const suffix =
    count % 100 >= 11 && count % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][count % 10] ?? "th");
  return `${count}${suffix}`;
}
