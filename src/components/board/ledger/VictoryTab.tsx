import { PLAYER_NAMES, PLAYER_COLORS, PLAYER_IDS } from "../../../game/data";
import { stratoklesCoupStatus } from "../../../game/assembly";
import { victoryStandings } from "../../../game/victory";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { formatNumber } from "../../../ui/formatters";

/**
 * The victory race, always visible: the six public cards, who holds each, and every
 * player's current value against the minimum. Reads the same engine helper the win
 * check uses (victoryStandings), so the ledger can never disagree with the rules.
 *
 * Stratokles rides ABOVE the cards — not a card you can hold, but a shared threat that
 * ends the game (owner ruling, 2026-07-21): the coup counter that used to sit in the
 * agora now lives here, as a row of monument glyphs filling toward the coup.
 */
export function VictoryTab({ G, playerID }: { G: HegemonyState; playerID: PlayerId }) {
  const standings = victoryStandings(G);
  const cardsToWin = G.ruleset.victory.cardsToWin;
  const coup = stratoklesCoupStatus(G);

  return (
    <div className="victoryTab">
      <article className={`stratoklesThreat${coup.triggered ? " triggered" : ""}`} title="When Stratokles leads the agora with a full row of monuments, the demagogue seizes the city and his patron wins. Monuments never repeal — the only brake is voting his Directives down.">
        <header className="stratoklesThreatHead">
          <strong className="stratoklesThreatName">Stratokles</strong>
          <span className="stratoklesThreatEp">the demagogue's clock</span>
          {coup.patron ? (
            <span className="stratoklesThreatPatron" style={{ color: PLAYER_COLORS[coup.patron] }}>
              ◈ {PLAYER_NAMES[coup.patron]}
            </span>
          ) : (
            <span className="stratoklesThreatPatron stratoklesThreatUnfed">unfed</span>
          )}
        </header>
        <div className="stratoklesThreatPips" aria-label={`${coup.tallies} of ${coup.threshold} monuments`}>
          {Array.from({ length: coup.threshold }, (_, index) => (
            <i className={index < coup.tallies ? "f" : undefined} key={index} />
          ))}
          <span className="stratoklesThreatCount">
            {Math.min(coup.tallies, coup.threshold)}/{coup.threshold}
          </span>
        </div>
      </article>

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
                ◈ {PLAYER_NAMES[holder]}
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
                title={`${PLAYER_NAMES[id]}: ${formatNumber(values[id])} (needs ${minimum})`}
              >
                {PLAYER_NAMES[id].slice(0, 2)} {formatNumber(values[id])}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
