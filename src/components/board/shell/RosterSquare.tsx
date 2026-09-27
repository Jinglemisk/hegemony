import { useMemo } from "react";
import { playerStandings, victorySeatStatuses } from "../../../game/rules";
import type { PlayerId } from "../../../game/types";
import { PLAYER_GLAZE_LIST } from "../../../ui/playerGlazes";
import { Icon } from "../../../ui/icons/Icon";
import { useGameUi } from "../GameUiContext";

export function RosterSquare({
  covered,
  onPlayerIDChange,
}: {
  covered: boolean;
  onPlayerIDChange: (playerID: PlayerId) => void;
}) {
  const { G, currentPlayerId, viewerId } = useGameUi();
  const seats = useMemo(
    () =>
      PLAYER_GLAZE_LIST.map((glaze) => ({
        glaze,
        standing: playerStandings(G, glaze.id),
      })),
    [G],
  );
  const race = useMemo(() => victorySeatStatuses(G), [G]);
  const urgent =
    race.find((seat) => seat.playerID !== viewerId && seat.winsAtNextTurnStart) ??
    race.find((seat) => seat.playerID !== viewerId && seat.oneCardFromVictory) ??
    null;

  return (
    <section
      aria-hidden={covered || undefined}
      aria-label="Rulers and victory standing"
      className="rosterSquare"
    >
      <header className="rosterSquareHead">
        <span className="label">Rulers</span>
        <span className="rosterColumns label" aria-hidden="true">
          <span title="Cities">C</span>
          <span title="Population">P</span>
          <span title="Laurels">L</span>
        </span>
      </header>

      <div className="rosterSeats">
        {seats.map(({ glaze, standing }) => {
          const viewing = glaze.id === viewerId;
          const acting = glaze.id === currentPlayerId;

          return (
            <button
              aria-label={`${glaze.name}: ${standing.cities} cities, ${standing.pops} population, ${standing.victoryCards} laurels${acting ? ", acting" : ""}`}
              aria-pressed={viewing}
              className={`rosterSeat${viewing ? " isViewing" : ""}${acting ? " isActing" : ""}`}
              key={glaze.id}
              onClick={() => onPlayerIDChange(glaze.id)}
              tabIndex={covered ? -1 : undefined}
              type="button"
            >
              <span className="rosterIdentity">
                <span className="rosterBlazon title" style={{ background: glaze.color }}>
                  {glaze.blazon}
                </span>
                <span className="rosterName">
                  <strong className="title">{glaze.name}</strong>
                  <small className="caption">
                    {acting ? "acting" : viewing ? "viewing" : glaze.glaze}
                  </small>
                </span>
              </span>
              <span className="rosterNumbers stat num" aria-hidden="true">
                <span>{standing.cities}</span>
                <span>{standing.pops}</span>
                <span>{standing.victoryCards}</span>
              </span>
            </button>
          );
        })}
      </div>

      <footer className={`rosterThreat${urgent ? " hasThreat" : ""}`}>
        <Icon glyph="laurel" size="rail" />
        <span className="caption">
          {urgent
            ? urgent.winsAtNextTurnStart
              ? `${G.players[urgent.playerID].name} can win at their next dawn.`
              : `${G.players[urgent.playerID].name} is one laurel from victory.`
            : `${G.ruleset.victory.cardsToWin} laurels at dawn wins.`}
        </span>
      </footer>
    </section>
  );
}
