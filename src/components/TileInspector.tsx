import type { HegemonyState, PlayerId } from "../game/types";
import type { GameMoves, Phase } from "../game/controller";
import { BUILDINGS } from "../game/data";
import { RESOURCE_LABELS, formatBuildingEffects, formatResourceCost } from "../ui/formatters";
import { AtlasIcon, TerrainSprite } from "./Sprites";

export function TileInspector({
  G,
  selectedTileId,
  playerID,
  isActive,
  phase,
  moves
}: {
  G: HegemonyState;
  selectedTileId: string | null;
  playerID: PlayerId;
  isActive: boolean;
  phase?: Phase;
  moves: GameMoves;
}) {
  const selectedTile = G.board.tiles.find((tile) => tile.id === selectedTileId);
  const playerSettlement = selectedTile?.settlements.find((settlement) => settlement.owner === playerID);
  const canUseCityActions =
    isActive &&
    phase === "gameplay" &&
    selectedTile &&
    playerSettlement &&
    playerSettlement.kind !== "colony";

  if (!selectedTile) {
    return (
      <div className="inspector empty">
        <h3>No tile selected</h3>
        <p>Select a hex to inspect terrain, settlements, and legal early actions.</p>
      </div>
    );
  }

  return (
    <div className="inspector">
      <div className="inspectorTerrainHeader">
        <TerrainSprite terrain={selectedTile.terrain} className="terrainPreview" />
        <div>
          <h3>{selectedTile.terrain}</h3>
          <p>
            {selectedTile.resource.amount} {RESOURCE_LABELS[selectedTile.resource.type]} income,{" "}
            {selectedTile.buildingSlots} terrain slots.
          </p>
        </div>
      </div>
      <div className="settlementList">
        {selectedTile.settlements.length === 0 ? (
          <span>Empty tile</span>
        ) : (
          selectedTile.settlements.map((settlement) => (
            <span key={`${settlement.owner}-${settlement.kind}`}>
              <AtlasIcon icon={settlement.kind} className="miniIcon" />
              <b>{G.players[settlement.owner].name}</b>: {settlement.kind}
            </span>
          ))
        )}
      </div>

      <div className="buildingButtons">
        {BUILDINGS.map((building) => (
          <button
            className="buildingButton"
            disabled={!canUseCityActions}
            key={building.id}
            onClick={() => moves.buildBuilding(selectedTile.id, building.id)}
            title={`Cost: ${formatResourceCost(building.cost)}. Benefit: ${formatBuildingEffects(building.effects)}.`}
          >
            <AtlasIcon icon={building.id} className="buildingButtonIcon" />
            <span className="buildingButtonCopy">
              <strong>{building.name}</strong>
              <span>Cost: {formatResourceCost(building.cost)}</span>
              <span>Benefit: {formatBuildingEffects(building.effects)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
