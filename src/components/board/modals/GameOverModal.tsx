import { PLAYER_COLORS, PLAYER_IDS } from "../../../game/data";
import { victoryCardsHeld, victoryStandings } from "../../../game/victory";
import type { HegemonyState } from "../../../game/types";
import { PLAYER_DISPLAY_NAMES } from "../constants";

/**
 * The end of the game. Shown when the engine reaches phase "gameOver" — either a
 * player opened their turn holding enough victory cards, or the seasonal deck (the
 * clock) ran out and the tally resolved. Dismissible so the final board can be
 * inspected; the ledger's Victory tab keeps the standings.
 */
export function GameOverModal({ G, onInspectBoard }: { G: HegemonyState; onInspectBoard: () => void }) {
  const winner = G.winner;

  if (!winner) {
    return null;
  }

  const standings = victoryStandings(G);
  const ranked = [...PLAYER_IDS].sort((a, b) => victoryCardsHeld(G, b) - victoryCardsHeld(G, a));

  return (
    <div className="modalBackdrop" role="presentation">
      <section className="logModal gameOverModal" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
        <div className="modalHeader">
          <div>
            <span className="gameOverKicker">
              {G.gameOverReason === "victoryRace" ? "The race is won" : "The age has ended"}
            </span>
            <h2 id="game-over-title" style={{ color: PLAYER_COLORS[winner] }}>
              {PLAYER_DISPLAY_NAMES[winner]} rules the Hegemony
            </h2>
          </div>
        </div>

        <p className="gameOverReason">
          {G.gameOverReason === "victoryRace"
            ? `${PLAYER_DISPLAY_NAMES[winner]} opened their turn holding ${G.ruleset.victory.cardsToWin} victory cards.`
            : `The seasonal deck ran out — ${PLAYER_DISPLAY_NAMES[winner]} held the most victory cards as the age closed.`}
        </p>

        <div className="gameOverStandings">
          {ranked.map((id) => (
            <div className={`gameOverSeat${id === winner ? " gameOverWinner" : ""}`} key={id}>
              <span className="gameOverDot" style={{ backgroundColor: PLAYER_COLORS[id] }} />
              <strong>{PLAYER_DISPLAY_NAMES[id]}</strong>
              <span className="gameOverCards">
                {victoryCardsHeld(G, id)} card{victoryCardsHeld(G, id) === 1 ? "" : "s"}
              </span>
              <span className="gameOverHeld">
                {standings
                  .filter((standing) => standing.holder === id)
                  .map((standing) => standing.card.name)
                  .join(" · ") || "—"}
              </span>
            </div>
          ))}
        </div>

        <div className="modalActions">
          <button className="secondaryAction" onClick={onInspectBoard} type="button">
            Inspect the final board
          </button>
        </div>
      </section>
    </div>
  );
}
