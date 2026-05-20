import type { CSSProperties } from "react";
import type { HegemonyState } from "../game/types";
import { PLAYER_COLORS } from "../game/data";
import { resourceCssVars } from "../ui/resourceVisuals";
import { AtlasIcon, TerrainSprite } from "./Sprites";

export function HexMap({
  G,
  confirmation,
  pendingTileId,
  selectedTileId,
  onTileAction
}: {
  G: HegemonyState;
  confirmation: {
    label: string;
    tileId: string;
    onCancel: () => void;
    onConfirm: () => void;
  } | null;
  pendingTileId: string | null;
  selectedTileId: string | null;
  onTileAction: (tileId: string) => void;
}) {
  const size = 45;
  const tileArtSize = 88;
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
        const isSelected = selectedTileId === tile.id;
        const isPending = pendingTileId === tile.id;
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
                className={`hexTile terrain-${tile.terrain} ${isSelected ? "selected" : ""} ${isPending ? "pending" : ""}`}
                points={hexPoints(size - 2)}
              />
            </g>
            <g className="tilePlate" aria-hidden="true">
              <rect className="tilePlateBg" x={-29} y={1.5} width={58} height={18} rx={5} />
              <line className="tilePlateDivider" x1={0} y1={4} x2={0} y2={17} />
              <text className="tilePlateStat tilePlateYield" x={-14.5} y={14.5}>
                ◆{tile.resource.amount}
              </text>
              <text className="tilePlateStat tilePlateSlots" x={14.5} y={14.5}>
                ⌂{tile.buildingSlots}
              </text>
            </g>
            {city ? (
              <foreignObject className="settlementObject cityObject" height={38} width={38} x={-19} y={-19}>
                <div
                  className={`settlementToken ${city.kind === "capital" ? "capitalToken" : "cityToken"}`}
                  style={{ "--player-color": PLAYER_COLORS[city.owner] } as CSSProperties}
                >
                  <AtlasIcon icon={city.kind} className="settlementTokenIcon" />
                  <span>{city.kind === "capital" ? "CAP" : "CITY"}</span>
                </div>
              </foreignObject>
            ) : null}
            {colonies.map((colony, index) => (
              <g
                transform={`translate(${index === 0 ? -13 : 13} 23)`}
                key={`${colony.owner}-${index}`}
              >
                <foreignObject className="settlementObject colonyObject" height={30} width={34} x={-17} y={-15}>
                  <div
                    className="settlementToken colonyToken"
                    style={{ "--player-color": PLAYER_COLORS[colony.owner] } as CSSProperties}
                  >
                    <AtlasIcon icon="colony" className="settlementTokenIcon" />
                    <span>COL</span>
                  </div>
                </foreignObject>
              </g>
            ))}
          </g>
        );
      })}
      {confirmation
        ? centers
            .filter(({ tile }) => tile.id === confirmation.tileId)
            .map(({ tile, x, y }) => (
              <g key={`confirm-${tile.id}`} transform={`translate(${x} ${y})`}>
                <foreignObject className="tileConfirmObject" height={34} width={152} x={-76} y={49}>
                  <div className="tileConfirmPrompt" onClick={(event) => event.stopPropagation()}>
                    <span>{confirmation.label}</span>
                    <button
                      aria-label={`Confirm ${confirmation.label}`}
                      className="tileConfirmButton tileConfirmAccept"
                      onClick={(event) => {
                        event.stopPropagation();
                        confirmation.onConfirm();
                      }}
                    >
                      ✓
                    </button>
                    <button
                      aria-label={`Cancel ${confirmation.label}`}
                      className="tileConfirmButton tileConfirmCancel"
                      onClick={(event) => {
                        event.stopPropagation();
                        confirmation.onCancel();
                      }}
                    >
                      ×
                    </button>
                  </div>
                </foreignObject>
              </g>
            ))
        : null}
    </svg>
  );
}

function hexPoints(size: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index - 30);
    return `${Math.cos(angle) * size},${Math.sin(angle) * size}`;
  }).join(" ");
}
