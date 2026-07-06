import { memo } from "react";
import { PLAYER_COLORS, PLAYER_IDS } from "../../../game/data";
import { calculateEconomyProjection, playerStandings } from "../../../game/rules";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { RESOURCE_LABELS, formatNumber, formatSignedNumber } from "../../../ui/formatters";
import { RESOURCE_ORDER } from "../../../ui/resourceVisuals";
import { AtlasIcon, UiSprite } from "../../Sprites";
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
        const standings = playerStandings(G, id);
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
            <span className="rosterHead">
              <span className="rosterDot" style={{ backgroundColor: PLAYER_COLORS[id] }} />
              <strong className="rosterName">{PLAYER_DISPLAY_NAMES[id]}</strong>
              {isCurrent ? <span className="rosterActingTag">Acting</span> : null}
            </span>
            <span className="rosterStats">
              <span className="rosterStat" title={`${standings.cities} cities`}>
                <AtlasIcon icon="city" className="rosterStatIcon" />
                {standings.cities}
              </span>
              <span className="rosterStat" title={`${standings.colonies} colonies`}>
                <AtlasIcon icon="colony" className="rosterStatIcon" />
                {standings.colonies}
              </span>
              <span className="rosterStat" title={`${standings.pops} population`}>
                <AtlasIcon icon="citizens" className="rosterStatIcon" />
                {standings.pops}
              </span>
              <span className="rosterStat rosterVp" title="Victory points (provisional)">
                <UiSprite item="victoryPoint" className="rosterStatIcon" />
                {standings.victoryPoints}
              </span>
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
