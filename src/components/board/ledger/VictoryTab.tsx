import { PLAYER_COLORS, PLAYER_IDS } from "../../../game/data";
import { victoryStandings } from "../../../game/victory";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { formatNumber } from "../../../ui/formatters";
import { PLAYER_DISPLAY_NAMES } from "../constants";

/**
 * The victory race, always visible: the five public cards, who holds each, and every
 * player's current value against the minimum. Reads the same engine helper the win
 * check uses (victoryStandings), so the ledger can never disagree with the rules.
 */
export function VictoryTab({ G, playerID }: { G: HegemonyState; playerID: PlayerId }) {
  const standings = victoryStandings(G);
  const cardsToWin = G.ruleset.victory.cardsToWin;

  return (
    <div className="victoryTab">
      <p className="victoryRule">
        Each card belongs to the <strong>sole leader</strong> at or above its minimum — ties hold nothing. Hold
        any <strong>{cardsToWin}</strong> at the start of your turn to win. If the seasonal deck runs out first,
        most cards held wins.
      </p>

      {standings.map(({ card, holder, minimum, values }) => (
        <article className="victoryCardRow" key={card.id}>
          <header className="victoryCardHead">
            <strong className="victoryCardName">{card.name}</strong>
            {holder ? (
              <span className="victoryHolder" style={{ color: PLAYER_COLORS[holder] }}>
                ◈ {PLAYER_DISPLAY_NAMES[holder]}
              </span>
            ) : (
              <span className="victoryHolder victoryUnheld">unheld</span>
            )}
          </header>
          <p className="victoryCardCondition">
            {card.description} · minimum {minimum}
          </p>
          <div className="victoryValues">
            {PLAYER_IDS.map((id) => (
              <span
                className={`victoryValue${holder === id ? " victoryLeader" : ""}${id === playerID ? " victoryViewer" : ""}`}
                key={id}
                style={{ borderBottomColor: PLAYER_COLORS[id] }}
                title={`${PLAYER_DISPLAY_NAMES[id]}: ${formatNumber(values[id])} (needs ${minimum})`}
              >
                {PLAYER_DISPLAY_NAMES[id].slice(0, 2)} {formatNumber(values[id])}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
