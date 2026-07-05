import { memo } from "react";
import type { LocalContext } from "../../../game/controller";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { phaseLabel, seasonLabel, yearLabel } from "../../../ui/formatters";
import { PLAYER_DISPLAY_NAMES } from "../constants";

function SeasonStatusComponent({
  G,
  ctx,
  isActive,
  currentPlayerId
}: {
  G: HegemonyState;
  ctx: LocalContext;
  isActive: boolean;
  currentPlayerId: PlayerId;
}) {
  return (
    <div className="turnClock" aria-label={`${seasonLabel(G.season)}, ${yearLabel(G.season)}`}>
      <span className="seasonPill">
        <span className="seasonPillYear">{yearLabel(G.season)}</span>
        <b>{seasonLabel(G.season)}</b>
      </span>
      <span className="turnHeadline">
        <span className="turnMeta">
          Turn {ctx.turn} · {phaseLabel(ctx.phase)}
        </span>
        <strong className="turnWhose">
          {isActive ? "Your turn" : `${PLAYER_DISPLAY_NAMES[currentPlayerId]} acting`}
        </strong>
      </span>
    </div>
  );
}

export const SeasonStatus = memo(SeasonStatusComponent);
