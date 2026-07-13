import { memo } from "react";
import { yearOf } from "../../../game/rules";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { PLAYER_DISPLAY_NAMES } from "../constants";
import { SeasonDial } from "./SeasonDial";

function SeasonStatusComponent({
  G,
  isActive,
  currentPlayerId,
  onOpenCompendium
}: {
  G: HegemonyState;
  isActive: boolean;
  currentPlayerId: PlayerId;
  onOpenCompendium: () => void;
}) {
  const seasonsLeft = G.seasonalDrawPile.length;

  return (
    <div className="turnClock">
      <div
        className="turnYear"
        title={`The seasonal deck is the game clock: ${seasonsLeft} season${seasonsLeft === 1 ? "" : "s"} remain. When it runs out, most victory cards held wins.`}
      >
        <span className="turnClockLabel">Year</span>
        <strong>{yearOf(G.season)}</strong>
        <span className="turnClockSub">{seasonsLeft} left</span>
      </div>

      <button
        className="seasonDialButton"
        title="Open the compendium (?)"
        aria-label="Open the compendium"
        onClick={onOpenCompendium}
      >
        <SeasonDial seasonIndex={G.season} />
      </button>

      <div
        className="turnActor"
        title={`${PLAYER_DISPLAY_NAMES[G.seasonOpener]} opens each season this year — the opener rotates every new year.`}
      >
        <span className="turnClockLabel">{isActive ? "Your turn" : "Now acting"}</span>
        <strong>{PLAYER_DISPLAY_NAMES[currentPlayerId]}</strong>
        <span className="turnClockSub">{PLAYER_DISPLAY_NAMES[G.seasonOpener]} opens</span>
      </div>
    </div>
  );
}

export const SeasonStatus = memo(SeasonStatusComponent);
