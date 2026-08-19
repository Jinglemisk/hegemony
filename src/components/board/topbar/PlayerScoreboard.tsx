import { memo } from "react";
import type { PlayerId } from "../../../game/types";
import { PLAYER_GLAZE_LIST } from "../../../ui/playerGlazes";

/**
 * The roster at the right of the top bar: four glazed discs, each with its seat's
 * Greek blazon and an ivory keyline, the acting seat underlined in clay.
 *
 * The discs were bare coloured squares before, which meant the four seats were
 * told apart by hue alone — unreadable to a colour-blind player and, on a board
 * where owner marks are also coloured, one more thing competing for the same
 * signal. The blazon does the identifying; the glaze only confirms it.
 *
 * It is still a seat switcher, not a scoreboard: clicking a disc views that
 * empire. Per-empire standing belongs in the player dossier.
 */
function PlayerScoreboardComponent({
  currentPlayerId,
  viewerId,
  onPlayerIDChange,
}: {
  currentPlayerId: PlayerId;
  viewerId: PlayerId;
  onPlayerIDChange: (playerID: PlayerId) => void;
}) {
  return (
    <section className="roster" aria-label="Switch player view">
      {PLAYER_GLAZE_LIST.map(({ id, name, color, blazon }) => {
        const isViewer = id === viewerId;
        const isActing = id === currentPlayerId;

        return (
          <button
            aria-pressed={isViewer}
            className={`seat${isActing ? " seatActing" : ""}${isViewer ? " seatViewing" : ""}`}
            key={id}
            onClick={() => onPlayerIDChange(id)}
            title={name}
            type="button"
          >
            <span className="seatGlaze verb" style={{ background: color }}>
              {blazon}
            </span>
            <span className="seatName label">{name}</span>
          </button>
        );
      })}
    </section>
  );
}

export const PlayerScoreboard = memo(PlayerScoreboardComponent);
