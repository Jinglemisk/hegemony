import type { HegemonyState, PlayerId, PopType } from "../game/types";
import { settlementBuildingSlots, settlementOverCapacity, settlementPopCapacity, totalPops } from "../game/rules";
import { buildingName, formatPopShort } from "../ui/formatters";
import { AtlasIcon, TerrainSprite } from "./Sprites";

export function SettlementRoster({ G, playerID }: { G: HegemonyState; playerID: PlayerId }) {
  const holdings = G.board.tiles
    .map((tile) => ({
      tile,
      settlement: tile.settlements.find((candidate) => candidate.owner === playerID)
    }))
    .filter((entry) => entry.settlement);

  if (holdings.length === 0) {
    return <p className="emptyState">No settlements yet.</p>;
  }

  return (
    <div className="settlementRoster">
      {holdings.map(({ tile, settlement }) => {
        if (!settlement) {
          return null;
        }

        const popTotal = totalPops(settlement.pops);
        const capacity = settlementPopCapacity(settlement.kind);
        const overCapacity = settlementOverCapacity(settlement);
        const slots = settlementBuildingSlots(tile, settlement);

        return (
          <article
            className={`settlementCard settlement-${settlement.kind}${overCapacity > 0 ? " overCapacityCard" : ""}`}
            key={`${settlement.owner}-${tile.id}`}
          >
            <div className="settlementHeader">
              <span className="settlementName">
                <AtlasIcon icon={settlement.kind} className="miniIcon" />
                <strong>{settlement.kind}</strong>
              </span>
              <span className="settlementTerrain">
                <TerrainSprite terrain={tile.terrain} className="terrainChip" />
                {tile.terrain}
              </span>
            </div>
            <div className="settlementStats">
              <span className={overCapacity > 0 ? "overCapacityText" : undefined}>
                Pops <strong>{popTotal}</strong>/<strong>{capacity}</strong>
                {overCapacity > 0 ? <em>-{overCapacity} happiness</em> : null}
              </span>
              <span>
                {settlement.kind === "colony" ? (
                  <>No building slots</>
                ) : (
                  <>
                    Slots <strong>{settlement.buildings.length}</strong>/<strong>{slots}</strong>
                  </>
                )}
              </span>
              <span>
                Yield <strong>{tile.resource.amount}</strong> {tile.resource.type}
              </span>
            </div>
            <div className="popGrid">
              {(Object.entries(settlement.pops) as Array<[PopType, number]>).map(([pop, amount]) => (
                <span key={pop}>
                  <AtlasIcon icon={pop} className="miniIcon" />
                  {formatPopShort(pop)} {amount}
                </span>
              ))}
            </div>
            <div className="buildingList">
              {settlement.buildings.length > 0 ? (
                settlement.buildings.map((buildingId, index) => (
                  <span key={`${buildingId}-${index}`}>
                    <AtlasIcon icon={buildingId} className="miniIcon" />
                    {buildingName(buildingId)}
                  </span>
                ))
              ) : (
                <em>No buildings</em>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
