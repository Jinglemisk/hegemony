import type { HegemonyState, PlayerId } from "../game/types";
import type { GameMoves, Phase } from "../game/controller";
import { BUILDINGS } from "../game/data";
import {
  POP_TYPES,
  type ActionStatus,
  getFoundColonyStatus,
  getGrowPopStatus,
  getUpgradeColonyToCityStatus,
  settlementOverCapacity,
  settlementPopCapacity,
  totalPops
} from "../game/rules";
import { RESOURCE_LABELS, formatBuildingEffects, formatPopLabel, formatResourceCost } from "../ui/formatters";
import { AtlasIcon, TerrainSprite } from "./Sprites";

export function TileInspector({
  G,
  selectedTileId,
  playerID,
  isActive,
  phase,
  moves,
  onFoundColonyRequest,
  onUpgradeCityRequest
}: {
  G: HegemonyState;
  selectedTileId: string | null;
  playerID: PlayerId;
  isActive: boolean;
  phase?: Phase;
  moves: GameMoves;
  onFoundColonyRequest: (tileId: string) => void;
  onUpgradeCityRequest: (tileId: string) => void;
}) {
  const selectedTile = G.board.tiles.find((tile) => tile.id === selectedTileId);
  const playerSettlement = selectedTile?.settlements.find((settlement) => settlement.owner === playerID);
  const foundColonyStatus = selectedTile ? getFoundColonyStatus(G, playerID, selectedTile.id) : null;
  const upgradeCityStatus = selectedTile ? getUpgradeColonyToCityStatus(G, playerID, selectedTile.id) : null;
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
          selectedTile.settlements.map((settlement) => {
            const popTotal = totalPops(settlement.pops);
            const capacity = settlementPopCapacity(settlement.kind);
            const overCapacity = settlementOverCapacity(settlement);

            return (
              <span
                className={overCapacity > 0 ? "overCapacityTile" : undefined}
                key={`${settlement.owner}-${settlement.kind}`}
              >
                <AtlasIcon icon={settlement.kind} className="miniIcon" />
                <b>{G.players[settlement.owner].name}</b>: {settlement.kind}
                <em>
                  {popTotal}/{capacity} pops{overCapacity > 0 ? `, -${overCapacity} happiness` : ""}
                </em>
              </span>
            );
          })
        )}
      </div>

      <div className="tileActionButtons">
        <button
          disabled={!isActive || phase !== "gameplay" || !foundColonyStatus?.can}
          onClick={() => onFoundColonyRequest(selectedTile.id)}
          title={actionTitle("Found Colony", foundColonyStatus, phase, isActive)}
        >
          <AtlasIcon icon="colony" className="buildingButtonIcon" />
          <span>
            <strong>Found Colony</strong>
            <span>Cost: {formatResourceCost(foundColonyStatus?.cost ?? {})}</span>
          </span>
        </button>
        <button
          disabled={!isActive || phase !== "gameplay" || !upgradeCityStatus?.can}
          onClick={() => onUpgradeCityRequest(selectedTile.id)}
          title={actionTitle("Upgrade Colony to City", upgradeCityStatus, phase, isActive)}
        >
          <AtlasIcon icon="city" className="buildingButtonIcon" />
          <span>
            <strong>Upgrade City</strong>
            <span>Cost: {formatResourceCost(upgradeCityStatus?.cost ?? {})}</span>
          </span>
        </button>
      </div>

      <div className="growPopPanel">
        <div className="growPopHeader">
          <strong>Grow Pop</strong>
          <span>
            {playerSettlement
              ? `${totalPops(playerSettlement.pops)}/${settlementPopCapacity(playerSettlement.kind)} capacity`
              : "Requires your settlement"}
          </span>
        </div>
        <div className="growPopButtons">
          {POP_TYPES.map((pop) => {
            const status = getGrowPopStatus(G, playerID, selectedTile.id, pop);

            return (
              <button
                disabled={!isActive || phase !== "gameplay" || !status.can}
                key={pop}
                onClick={() => moves.growPop(selectedTile.id, pop)}
                title={actionTitle(`Grow ${formatPopLabel(pop, 1)}`, status, phase, isActive)}
              >
                <AtlasIcon icon={pop} className="miniIcon" />
                <span>
                  <strong>{formatPopLabel(pop, 1)}</strong>
                  <span>{formatResourceCost(status.cost ?? {})}</span>
                </span>
              </button>
            );
          })}
        </div>
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

function actionTitle(label: string, status: ActionStatus | null, phase?: Phase, isActive = true) {
  const requirements = status?.reasons.length ? status.reasons.join(" ") : "Available.";
  const phaseRequirement = phase === "gameplay" ? "" : " Gameplay only.";
  const activeRequirement = isActive ? "" : " Current player's turn only.";
  return `${label}. Cost: ${formatResourceCost(status?.cost ?? {})}. ${requirements}${phaseRequirement}${activeRequirement}`;
}
