import { PLAYER_NAMES, PLAYER_IDS } from "../../../game/data";
import { victoryStandings } from "../../../game/victory";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { formatNumber } from "../../../ui/formatters";
import { glazeOf } from "../../../ui/playerGlazes";

/**
 * The victory race, always visible: the six public cards, who holds each, and every
 * player's current value against the minimum. Reads the same engine helper the win
 * check uses (victoryStandings), so the ledger can never disagree with the rules.
 *
 */
export function VictoryTab({ G, playerID }: { G: HegemonyState; playerID: PlayerId }) {
  const standings = victoryStandings(G);
  const cardsToWin = G.ruleset.victory.cardsToWin;
  const held = standings.filter(({ holder }) => holder === playerID).length;

  return (
    <div className="victoryTab">
      {/* What the deleted scoring lecture was really carrying: how close you are.
          A count is a fact the player can act on; the rule behind it lives in the
          Codex, one hover away, where it belongs. */}
      <p className="victoryHeldline label">
        <b className="stat-lg num">
          {held}/{cardsToWin}
        </b>{" "}
        laurels held
      </p>

      {standings.map(({ card, holder, minimum, values }) => (
        <article className="victoryCardRow" key={card.id}>
          <header className="victoryCardHead">
            <strong className="victoryCardName">{card.name}</strong>
            {holder ? (
              <span className="victoryHolder" style={{ color: glazeOf(holder) }}>
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
                style={{ borderBottomColor: glazeOf(id) }}
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
