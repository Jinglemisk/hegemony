import { memo } from "react";
import { PLAYER_COLORS, PLAYER_IDS } from "../../../game/data";
import { calculateEconomyProjection, playerPopulationTotals } from "../../../game/rules";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { RESOURCE_LABELS, formatNumber, formatSignedNumber } from "../../../ui/formatters";
import { RESOURCE_ORDER } from "../../../ui/resourceVisuals";
import { PLAYER_DISPLAY_NAMES } from "../constants";

function PlayerScoreboardComponent({
  G,
  currentPlayerId,
  viewerId,
  onPlayerIDChange
}: {
  G: HegemonyState;
  currentPlayerId: PlayerId;
  viewerId: PlayerId;
  onPlayerIDChange: (playerID: PlayerId) => void;
}) {
  return (
    <section className="scoreboardPanel" aria-label="Player roster">
      {PLAYER_IDS.map((id) => {
        const player = G.players[id];
        const population = playerPopulationTotals(G, id);
        const projected = calculateEconomyProjection(G, id, { resolveTransfers: true });
        const isViewer = id === viewerId;
        const isCurrent = id === currentPlayerId;

        return (
          <button
            aria-pressed={isViewer}
            className={`rosterSeat${isCurrent ? " actingSeat" : ""}${isViewer ? " viewingSeat" : ""}`}
            key={id}
            onClick={() => onPlayerIDChange(id)}
            title={`View ${PLAYER_DISPLAY_NAMES[id]}'s empire`}
          >
            <span className="rosterDot" style={{ backgroundColor: PLAYER_COLORS[id] }} />
            <span className="rosterWho">
              <strong>{PLAYER_DISPLAY_NAMES[id]}</strong>
              <em>{isCurrent ? "Acting" : "Idle"}</em>
            </span>
            <span className="rosterPops">
              {population.pops}
              <span className="rosterPopsUnit">pop</span>
            </span>
            <span className="scoreTooltip" role="tooltip">
              <strong>{PLAYER_DISPLAY_NAMES[id]} Resources</strong>
              {RESOURCE_ORDER.map((resource) => (
                <span key={resource}>
                  {RESOURCE_LABELS[resource]}
                  <b>
                    {formatNumber(player.resources[resource])}{" "}
                    <em className={projected.income[resource] > 0 ? "positive" : projected.income[resource] < 0 ? "negative" : ""}>
                      {formatSignedNumber(projected.income[resource])}
                    </em>
                  </b>
                </span>
              ))}
            </span>
          </button>
        );
      })}
    </section>
  );
}

export const PlayerScoreboard = memo(PlayerScoreboardComponent);
