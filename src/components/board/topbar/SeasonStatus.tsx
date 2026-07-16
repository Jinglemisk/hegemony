import { PLAYER_NAMES } from "../../../game/data";
import { memo } from "react";
import { yearOf } from "../../../game/rules";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { DeckShelf } from "../command/DeckShelf";
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

      {/* The dial is the season emblem now; the compendium moved to the Codex rail
          disc (ui-refit Step 2). The `?` shortcut still opens it. */}
      <div className="seasonDialFrame">
        <SeasonDial seasonIndex={G.season} />
      </div>

      <div
        className="turnActor"
        title={`${PLAYER_NAMES[G.seasonOpener]} opens each season this year — the opener rotates every new year.`}
      >
        <span className="turnClockLabel">{isActive ? "Your turn" : "Now acting"}</span>
        <strong>{PLAYER_NAMES[currentPlayerId]}</strong>
        <span className="turnClockSub">{PLAYER_NAMES[G.seasonOpener]} opens</span>
      </div>

      {/* Q19: the deck counts and the board chip follow the season clock here —
          the seasonal count already half-lived in this bar as "N left". */}
      <DeckShelf G={G} />
    </div>
  );
}

export const SeasonStatus = memo(SeasonStatusComponent);
