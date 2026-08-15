import { PLAYER_NAMES, PLAYER_IDS } from "../../../game/data";
import { victoryCardsHeld, victoryStandings } from "../../../game/victory";
import type { HegemonyState } from "../../../game/types";
import { ModalShell } from "./ModalShell";
import { PLAYER_GLAZES, glazeOf } from "../../../ui/playerGlazes";

/**
 * The end of the game — the age closing, either because someone opened their
 * turn holding enough victory cards or because the seasonal deck (the clock) ran
 * out and the tally resolved.
 *
 * `ceremony.css` names three moments that earn the dark table: a fate drawn, a
 * die cast, and the age ending. This was the third one, and it was rendering in
 * the plain `logModal` register with a header bar and a secondary button — the
 * flattest surface in the build, and the last thing a player sees. It is a
 * TABLET now: the age is read and laid down, in the same bone the venture is
 * cut from, at the clay `rite` weather. Not a gift and not a wound — three
 * players lost, and the dialog is not addressed to any one seat.
 *
 * Blocking with no Escape stays: the result is not something you dismiss, you
 * leave it through "Inspect the Board".
 *
 * Each seat travels with its glaze AND its blazon, because a glaze never travels
 * alone — this was a bare colour dot, the same break that was flagged and fixed
 * for the Assembly's seats, on the one screen where the four are compared.
 */
export function GameOverModal({
  G,
  onInspectBoard,
}: {
  G: HegemonyState;
  onInspectBoard: () => void;
}) {
  const winner = G.winner;

  if (!winner) {
    return null;
  }

  const standings = victoryStandings(G);
  // The seat that took it leads, even on a tie — a race can be won at the same
  // card count everyone else is on, and the winner listed third under a heading
  // that names them reads as a bug.
  const ranked = [...PLAYER_IDS].sort(
    (a, b) =>
      Number(b === winner) - Number(a === winner) ||
      victoryCardsHeld(G, b) - victoryCardsHeld(G, a),
  );
  const raced = G.gameOverReason === "victoryRace";
  const toWin = G.ruleset.victory.cardsToWin;

  return (
    <ModalShell
      backdropClassName="tabletScrim"
      ceremony="rite"
      className="ceremonyTablet ageEnd"
      labelledBy="game-over-title"
    >
      <header className="tabletHead">
        <span className="tabletKicker label">
          {raced ? "The race is won" : "The age has ended"}
        </span>
        <h2 className="display display-xl" id="game-over-title">
          {PLAYER_NAMES[winner]} rules the Hegemony
        </h2>
        <p className="tabletVoice body-em">
          {raced
            ? `${PLAYER_NAMES[winner]} opened their turn holding ${toWin} victory card${toWin === 1 ? "" : "s"}.`
            : `The seasonal deck ran out — ${PLAYER_NAMES[winner]} held the most victory cards as the age closed.`}
        </p>
      </header>

      <ol className="ageStandings">
        {ranked.map((id, index) => {
          const held = standings
            .filter((standing) => standing.holder === id)
            .map((standing) => standing.card.name);
          const cards = victoryCardsHeld(G, id);

          return (
            <li className={id === winner ? "ageSeat ageSeatCrowned" : "ageSeat"} key={id}>
              <span className="ageRank num stat">{index + 1}</span>
              <span className="seatGlaze label" style={{ background: glazeOf(id) }}>
                {PLAYER_GLAZES[id].blazon}
              </span>
              <span className="ageWho">
                <b className="title">{PLAYER_NAMES[id]}</b>
                <span className="caption">{held.join(" · ") || "no cards held"}</span>
              </span>
              <span className="ageCards num stat-lg">{cards}</span>
            </li>
          );
        })}
      </ol>

      <footer className="tabletFoot">
        <button className="ceremonyCommit verb verb-lg" onClick={onInspectBoard} type="button">
          Inspect the Board
        </button>
      </footer>
    </ModalShell>
  );
}
