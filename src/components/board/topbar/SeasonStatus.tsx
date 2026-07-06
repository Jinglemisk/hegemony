import { memo } from "react";
import { yearOf } from "../../../game/rules";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { PLAYER_DISPLAY_NAMES } from "../constants";
import { SeasonDial } from "./SeasonDial";

function SeasonStatusComponent({
  G,
  isActive,
  currentPlayerId
}: {
  G: HegemonyState;
  isActive: boolean;
  currentPlayerId: PlayerId;
}) {
  return (
    <div className="turnClock">
      <div className="turnYear">
        <span className="turnClockLabel">Year</span>
        <strong>{yearOf(G.season)}</strong>
      </div>

      <SeasonDial seasonIndex={G.season} />

      <div className="turnActor">
        <span className="turnClockLabel">{isActive ? "Your turn" : "Now acting"}</span>
        <strong>{PLAYER_DISPLAY_NAMES[currentPlayerId]}</strong>
      </div>
    </div>
  );
}

export const SeasonStatus = memo(SeasonStatusComponent);
