import type { CSSProperties } from "react";
import type { HegemonyState } from "../game/types";
import { PLAYER_COLORS } from "../game/data";
import { resourceCssVars } from "../ui/resourceVisuals";
import { AtlasIcon, TerrainSprite } from "./Sprites";

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
  const colonyDockPositions = [-21, 21];
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
        const cityTokenSize = city?.kind === "capital" ? 40 : 36;
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
            <g className="tilePlate" aria-hidden="true">
              <rect className="tilePlateBg" x={-35} y={-40} width={70} height={21} rx={5} />
              <circle className="tilePlateResourceDot" cx={-24} cy={-29.5} r={7} />
              <text className="tilePlateResourceGlyph" x={-24} y={-26.8}>
                {tile.resource.type.slice(0, 1).toUpperCase()}
              </text>
              <text className="tilePlateStat tilePlateYield" x={-8.5} y={-25.8}>
                {tile.resource.amount}
              </text>
              <line className="tilePlateDivider" x1={1.5} y1={-36} x2={1.5} y2={-23} />
              {Array.from({ length: 4 }, (_, index) => (
                <rect
                  className={`tilePlateSlot ${index < tile.buildingSlots ? "filled" : ""}`}
                  height={11}
                  key={index}
                  rx={1.2}
                  width={4}
                  x={8 + index * 5.3}
                  y={-35}
                />
              ))}
            </g>
            <g className="colonyDockLayer" aria-hidden="true">
              {colonyDockPositions.map((dockX, index) => {
                const colony = shownColonies[index];
                if (!colony) {
                  return null;
                }

                return (
                  <g
                    className="colonyDock occupied"
                    key={dockX}
                    style={{ "--player-color": PLAYER_COLORS[colony.owner] } as CSSProperties}
                    transform={`translate(${dockX} 31)`}
                  >
                    <path className="colonyDockShadow" d="M-15,4 C-10,15 10,15 15,4" />
                    <rect className="colonyDockSocket" x={-13} y={-10} width={26} height={23} rx={5} />
                  </g>
                );
              })}
            </g>
            {city ? (
              <foreignObject
                className="settlementObject cityObject"
                height={cityTokenSize}
                width={cityTokenSize}
                x={-cityTokenSize / 2}
                y={7 - cityTokenSize / 2}
              >
                <div
                  className={`settlementToken ${city.kind === "capital" ? "capitalToken" : "cityToken"}`}
                  style={{ "--player-color": PLAYER_COLORS[city.owner] } as CSSProperties}
                >
                  <AtlasIcon icon={city.kind} className="settlementTokenIcon" />
                  <span>{city.kind === "capital" ? "CAP" : "CITY"}</span>
                </div>
              </foreignObject>
            ) : null}
            {shownColonies.map((colony, index) => (
              <g
                className="colonyTokenDocked"
                transform={`translate(${colonyDockPositions[index]} 31)`}
                key={`${colony.owner}-${index}`}
              >
                <foreignObject className="settlementObject colonyObject" height={26} width={26} x={-13} y={-13}>
                  <div
                    className="settlementToken colonyToken"
                    style={{ "--player-color": PLAYER_COLORS[colony.owner] } as CSSProperties}
                  >
                    <AtlasIcon icon="colony" className="settlementTokenIcon" />
                    <span>{playerLabel(colony.owner)}</span>
                  </div>
                </foreignObject>
              </g>
            ))}
            {overflowColonies > 0 ? (
              <g className="colonyOverflow" transform="translate(0 31)" aria-hidden="true">
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

function playerLabel(owner: string) {
  return `P${Number(owner) + 1}`;
}

function hexPoints(size: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index - 30);
    return `${Math.cos(angle) * size},${Math.sin(angle) * size}`;
  }).join(" ");
}
