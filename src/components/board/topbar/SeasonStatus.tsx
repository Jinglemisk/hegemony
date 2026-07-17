import { memo } from "react";
import { yearOf } from "../../../game/rules";
import type { HegemonyState } from "../../../game/types";
import { SeasonDial } from "./SeasonDial";

/**
 * The season cluster at the top-centre (ui-refit Step 3): the medallion, the year
 * and seasons-left, and a compact deck caption beside the dial (Q19). Whose-turn
 * left this cluster for the bottom-right turnbox; the compendium moved to the
 * Codex rail disc, so the dial is now the season emblem, not a button.
 */
function SeasonStatusComponent({ G }: { G: HegemonyState }) {
  const seasonsLeft = G.seasonalDrawPile.length;
  const boardLabel = G.boardLayout === "classic" ? "Classic" : "Shuffled";

  return (
    <div className="seasonCluster">
      <div
        className="seasonDialFrame"
        title={`The seasonal deck is the game clock: ${seasonsLeft} season${seasonsLeft === 1 ? "" : "s"} remain. When it runs out, most victory cards held wins.`}
      >
        <SeasonDial seasonIndex={G.season} />
      </div>

      <div className="seasonClusterText">
        <span className="seasonClusterYear">Year {yearOf(G.season)}</span>
        <span className="seasonClusterSub">{seasonsLeft} seasons remain</span>
        <span className="seasonClusterDecks">
          Seasonal {seasonsLeft} · Events {G.playerDrawPile.length} · {boardLabel} #{G.seed}
        </span>
      </div>
    </div>
  );
}

export const SeasonStatus = memo(SeasonStatusComponent);
