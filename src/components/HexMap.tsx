import type { CSSProperties } from "react";
import type { HegemonyState } from "../game/types";
import { PLAYER_COLORS } from "../game/data";
import { settlementBuildingSlots } from "../game/rules";
import { resourceCssVars } from "../ui/resourceVisuals";
import { TerrainSprite } from "./Sprites";

export function HexMap({
  G,
  selectedTileId,
  onTileAction
}: {
  G: HegemonyState;
  selectedTileId: string | null;
  onTileAction: (tileId: string) => void;
}) {
  const size = 45;
  const tileArtSize = 88;
  const colonyPositions = [-14, 14];
  const centers = G.board.tiles.map((tile) => ({
    tile,
    x: size * Math.sqrt(3) * (tile.q + tile.r / 2),
    y: size * 1.5 * tile.r
  }));

  return (
    <svg className="hexMap" viewBox="-310 -270 620 540" role="img" aria-label="Hegemony hex map">
      {centers.map(({ tile, x, y }) => {
        const city = tile.settlements.find((settlement) => settlement.kind !== "colony");
        const colonies = tile.settlements.filter((settlement) => settlement.kind === "colony");
        const shownColonies = colonies.slice(0, 2);
        const overflowColonies = Math.max(0, colonies.length - shownColonies.length);
        const isSelected = selectedTileId === tile.id;
        const usedBuildingSlots = city?.buildings.length ?? 0;
        const totalBuildingSlots = city ? settlementBuildingSlots(tile, city) : tile.buildingSlots;
        return (
          <g key={tile.id} style={resourceCssVars(tile.resource.type)} transform={`translate(${x} ${y})`}>
            <foreignObject
              className="terrainObject"
              height={tileArtSize}
              width={tileArtSize}
              x={-tileArtSize / 2}
              y={-tileArtSize / 2}
            >
              <TerrainSprite terrain={tile.terrain} className="mapTerrain" />
            </foreignObject>
            <g
              aria-label={`Hex ${tile.id}, ${tile.terrain} tile, ${tile.resource.amount} ${tile.resource.type}`}
              className="svgButton"
              onClick={() => onTileAction(tile.id)}
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
                className={`hexTile terrain-${tile.terrain} ${isSelected ? "selected" : ""}`}
                points={hexPoints(size - 2)}
              />
            </g>
            <g className="tileMetrics" aria-hidden="true">
              <text className="tileMetric tileMetricYield" x={0} y={34}>
                +{tile.resource.amount}
              </text>
              <text className="tileMetric tileMetricCapacity" x={0} y={-28}>
                {usedBuildingSlots}/{totalBuildingSlots}
              </text>
            </g>
            {city ? (
              <foreignObject
                className="settlementObject settlementGlyphObject cityObject"
                height={42}
                width={42}
                x={-21}
                y={-17}
              >
                <div
                  className={`settlementGlyph ${city.kind === "capital" ? "capitalGlyph" : "cityGlyph"}`}
                  style={{ "--player-color": PLAYER_COLORS[city.owner] } as CSSProperties}
                >
                  <i />
                </div>
              </foreignObject>
            ) : null}
            {shownColonies.map((colony, index) => (
              <g
                className="colonyGlyphDocked"
                transform={`translate(${colonyPositions[index]} 4)`}
                key={`${colony.owner}-${index}`}
              >
                <foreignObject className="settlementObject settlementGlyphObject colonyObject" height={32} width={32} x={-16} y={-16}>
                  <div
                    className="settlementGlyph colonyGlyph"
                    style={{ "--player-color": PLAYER_COLORS[colony.owner] } as CSSProperties}
                  >
                    <i />
                  </div>
                </foreignObject>
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
      })}
    </svg>
  );
}

function hexPoints(size: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index - 30);
    return `${Math.cos(angle) * size},${Math.sin(angle) * size}`;
  }).join(" ");
}
