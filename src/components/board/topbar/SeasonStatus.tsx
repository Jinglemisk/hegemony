import { memo } from "react";
import type { HegemonyState } from "../../../game/types";
import { SeasonDial } from "./SeasonDial";

/**
 * The season medallion at the top-centre. The year/seasons-left caption reads
 * from the bottom spine now (see DockSeasonCaption) so it sits on bone rather
 * than hanging onto the sea; the dial is the emblem, not a button.
 */
function SeasonStatusComponent({ G }: { G: HegemonyState }) {
  const seasonsLeft = G.seasonalDrawPile.length;

  return (
    <div className="seasonCluster">
      <div
        className="seasonDialFrame"
        title={`The seasonal deck is the game clock: ${seasonsLeft} season${seasonsLeft === 1 ? "" : "s"} remain. When it runs out, most victory cards held wins.`}
      >
        <SeasonDial seasonIndex={G.season} />
      </div>
    </div>
  );
}

export const SeasonStatus = memo(SeasonStatusComponent);
