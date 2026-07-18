import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { PLAYER_COLORS } from "../../../game/data";
import { settlementBuildingSlots } from "../../../game/rules";
import type { Ruleset } from "../../../game/ruleset";
import type { HexTile } from "../../../game/types";
import { HEX_SIZE, getColonyXPositions, hexPoints } from "../../../ui/hexGeometry";
import { tileCssVars } from "../../../ui/resourceVisuals";

/**
 * One tile and everything standing on it (ladder rung R6): the hex, its glyphs,
 * the city, its colonies. Pulled out of HexMap so the board-token redesign has a
 * single component to work in — the brandbook's chits, slot sockets and numeral
 * pops all land here, not in a 632-line file that also owns a camera.
 */

/** The city block sits slightly below the hex's centre so the glyphs clear it. */
const CITY_ICON_CENTER_Y = 4;
const SLOT_GLYPH_Y = -22;
const YIELD_GLYPH_Y = 23;
/** At most two colonies are drawn; the rest collapse into a +n bubble. */
const MAX_SHOWN_COLONIES = 2;

export function TileGroup({
  tile,
  x,
  y,
  ruleset,
  isSelected,
  isPending,
  isPlacementCandidate,
  onTileAction,
  onTileClick
}: {
  tile: HexTile;
  x: number;
  y: number;
  ruleset: Ruleset;
  isSelected: boolean;
  isPending: boolean;
  isPlacementCandidate: boolean;
  onTileAction: (tileId: string) => void;
  onTileClick: (tileId: string, event: ReactMouseEvent<SVGGElement>) => void;
}) {
  const city = tile.settlements.find((settlement) => settlement.kind !== "colony");
  const colonies = tile.settlements.filter((settlement) => settlement.kind === "colony");
  const shownColonies = colonies.slice(0, MAX_SHOWN_COLONIES);
  const colonyXPositions = getColonyXPositions(shownColonies.length);
  const overflowColonies = Math.max(0, colonies.length - shownColonies.length);
  const usedBuildingSlots = city?.buildings.length ?? 0;
  const totalBuildingSlots = city ? settlementBuildingSlots(tile, city, ruleset) : tile.buildingSlots;
  // Text glyphs (user, 2026-07-13): slots read "used/available" up top, the yield
  // reads "+n" below — both white, both growing with their number so a fat plains
  // shouts and a lean hill whispers.
  const slotGlyphSize = 11 + Math.min(8, totalBuildingSlots) * 1.2;
  // Yield-less tiles (hills, oracle) show no yield numeral — the number is the yield,
  // and its absence is the tile's whole point (slot-forward hill, empty oracle).
  const yieldAmount = tile.resource?.amount ?? null;
  const yieldGlyphSize = 13 + Math.min(10, yieldAmount ?? 0) * 1.7;
  const yieldLabel = tile.resource ? `${tile.resource.amount} ${tile.resource.type}` : "no yield";

  return (
    <g style={tileCssVars(tile)} transform={`translate(${x} ${y})`}>
      <g
        aria-label={`Hex ${tile.id}, ${tile.terrain} tile, ${yieldLabel}`}
        className="svgButton"
        data-tile-id={tile.id}
        onClick={(event) => onTileClick(tile.id, event)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onTileAction(tile.id);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <polygon
          className={`hexTile terrain-${tile.terrain} ${isSelected ? "selected" : ""} ${isPending ? "pending" : ""} ${isPlacementCandidate ? "placementCandidate" : ""}`}
          points={hexPoints(HEX_SIZE - 2)}
        />
      </g>

      <g className="tileMetrics" aria-hidden="true">
        {totalBuildingSlots > 0 ? (
          <text
            className="tileSlotsGlyph"
            fontSize={slotGlyphSize}
            textAnchor="middle"
            y={SLOT_GLYPH_Y + slotGlyphSize * 0.36}
          >
            {usedBuildingSlots}/{totalBuildingSlots}
          </text>
        ) : null}
        {yieldAmount !== null ? (
          <text
            className="tileYieldGlyph"
            fontSize={yieldGlyphSize}
            textAnchor="middle"
            y={YIELD_GLYPH_Y + yieldGlyphSize * 0.36}
          >
            {yieldAmount}
          </text>
        ) : null}
        {tile.terrain === "oracle" ? (
          <g className="oracleMark" aria-hidden="true">
            <circle r={8} />
            <circle r={3.4} />
          </g>
        ) : null}
      </g>

      {city ? (
        <g
          className="settlementShape cityShape"
          style={{ "--player-color": PLAYER_COLORS[city.owner] } as CSSProperties}
          transform={`translate(0 ${CITY_ICON_CENTER_Y}) scale(0.85)`}
        >
          <rect height={20} rx={2} width={20} x={-10} y={-10} />
        </g>
      ) : null}

      {shownColonies.map((colony, index) => (
        <g
          className="colonyShapeDocked"
          transform={`translate(${colonyXPositions[index]} 4)`}
          key={`${colony.owner}-${index}`}
        >
          <g
            className="settlementShape colonyShape"
            style={{ "--player-color": PLAYER_COLORS[colony.owner] } as CSSProperties}
            transform="scale(0.85)"
          >
            <path d="M 0 -11 L 10 8 L -10 8 Z" />
          </g>
        </g>
      ))}

      {overflowColonies > 0 ? (
        <g className="colonyOverflow" transform="translate(0 4)" aria-hidden="true">
          <circle r={9} />
          <text y={3.2}>+{overflowColonies}</text>
        </g>
      ) : null}
    </g>
  );
}
