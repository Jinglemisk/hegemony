import { memo } from "react";
import { PLAYER_NAMES, PLAYER_COLORS, PLAYER_IDS } from "../../../game/data";
import type { PlayerId } from "../../../game/types";

/**
 * The seat switcher — a playtest tool, not a scoreboard. Four squares in each
 * player's colour; clicking one views that empire. The acting seat gets a ring,
 * the seat you are viewing gets a filled outline. Names/standings lived here once
 * but forced the roster wide enough to shove the season medallion off-centre;
 * per-empire detail belongs in the coming player dossier (docs/feat/two-panel.md).
 */
function PlayerScoreboardComponent({
  currentPlayerId,
  viewerId,
  onPlayerIDChange
}: {
  currentPlayerId: PlayerId;
  viewerId: PlayerId;
  onPlayerIDChange: (playerID: PlayerId) => void;
}) {
  return (
    <section className="scoreboardPanel" aria-label="Switch player view">
      {PLAYER_IDS.map((id) => {
        const isViewer = id === viewerId;
        const isCurrent = id === currentPlayerId;

        return (
          <button
            aria-pressed={isViewer}
            className={`seatSwatch${isCurrent ? " seatSwatchActing" : ""}${isViewer ? " seatSwatchViewing" : ""}`}
            key={id}
            onClick={() => onPlayerIDChange(id)}
            style={{ backgroundColor: PLAYER_COLORS[id] }}
            title={`View ${PLAYER_NAMES[id]}${isCurrent ? " — acting" : ""}`}
            type="button"
          />
        );
      })}
    </section>
  );
}

export const PlayerScoreboard = memo(PlayerScoreboardComponent);
