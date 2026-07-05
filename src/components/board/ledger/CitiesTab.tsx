import { useEffect, useMemo, useState } from "react";
import { BUILDINGS } from "../../../game/data";
import type { Phase } from "../../../game/controller";
import {
  POP_TYPES,
  getBuildBuildingStatus,
  settlementBuildingSlots,
  settlementNetYield,
  settlementOverCapacity,
  settlementPopCapacity,
  settlementTileYield,
  totalPops
} from "../../../game/rules";
import type { BuildingId, HegemonyState, PlayerId } from "../../../game/types";
import { RESOURCE_LABELS, formatBuildingEffects, formatNumber, formatPopLabel } from "../../../ui/formatters";
import { SettlementSummaryCard } from "../../SettlementCard";
import { AtlasIcon } from "../../Sprites";
import { BUILDING_AFFINITY } from "../constants";
import { buildingTooltipRows, capitalize, getBuildingBenefitText } from "../helpers";
import type { OwnedHolding } from "../types";
import { BuildingChip } from "./BuildingChip";

export function CitiesTab({
  G,
  holdings,
  playerID,
  phase,
  isActive,
  onBuildBuildingRequest
}: {
  G: HegemonyState;
  holdings: OwnedHolding[];
  playerID: PlayerId;
  phase: Phase;
  isActive: boolean;
  onBuildBuildingRequest: (tileId: string, buildingId: BuildingId) => void;
}) {
  const holdingIds = useMemo(
    () => holdings.map(({ tile, settlement }) => `${settlement.owner}-${tile.id}`),
    [holdings]
  );
  const [expandedHoldingIds, setExpandedHoldingIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setExpandedHoldingIds((current) => {
      const visibleHoldings = new Set(holdingIds);
      const next = new Set([...current].filter((holdingId) => visibleHoldings.has(holdingId)));

      return next.size === current.size ? current : next;
    });
  }, [holdingIds]);

  const toggleHolding = (holdingId: string) => {
    setExpandedHoldingIds((current) => {
      const next = new Set(current);

      if (next.has(holdingId)) {
        next.delete(holdingId);
      } else {
        next.add(holdingId);
      }

      return next;
    });
  };

  if (holdings.length === 0) {
    return <p className="emptyState">No settlements yet.</p>;
  }

  return (
    <div className="holdingStack">
      <div className="holdingLegend">
        <span className="holdingLegendCaption">Holding</span>
        <span className="holdingLegendCaption holdingLegendYieldCaption">Net income / turn →</span>
      </div>

      {holdings.map(({ tile, settlement }) => {
        const holdingId = `${settlement.owner}-${tile.id}`;
        const isExpanded = expandedHoldingIds.has(holdingId);
        const popTotal = totalPops(settlement.pops);
        const capacity = settlementPopCapacity(settlement.kind, G.ruleset);
        const overCapacity = settlementOverCapacity(settlement, G.ruleset);
        const slots = settlementBuildingSlots(tile, settlement, G.ruleset);
        const tileYield = settlementTileYield(tile, settlement, G.ruleset);
        const netYield = settlementNetYield(tile, settlement, G.ruleset);
        const detailId = `holding-${settlement.owner}-${tile.q}-${tile.r}-details`;

        return (
          <article
            className={`holdingMatrix settlement-${settlement.kind}${overCapacity > 0 ? " overCapacityCard" : ""}${isExpanded ? " expandedHolding" : ""}`}
            key={holdingId}
          >
            <button
              aria-controls={detailId}
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? "Collapse" : "Expand"} ${capitalize(settlement.kind)} ${tile.id}: ${popTotal} of ${capacity} pops, ${settlement.buildings.length} of ${slots} building slots, ${formatNumber(tileYield)} ${RESOURCE_LABELS[tile.resource.type]} tile yield.`}
              className="holdingSummaryButton"
              onClick={() => toggleHolding(holdingId)}
              type="button"
            >
              <SettlementSummaryCard netYield={netYield} ruleset={G.ruleset} settlement={settlement} tile={tile} />
              <span className="collapseChevron" aria-hidden="true" />
            </button>

            <div className="holdingDetail" hidden={!isExpanded} id={detailId}>
              {overCapacity > 0 ? (
                <div className="holdingPenaltyLine overCapacityText">
                  <AtlasIcon icon="happiness" className="miniIcon" />
                  <strong>-{overCapacity}</strong>
                  <span>Happiness over capacity</span>
                </div>
              ) : null}

              <div className="popBuildingMatrix">
                {POP_TYPES.map((pop) => {
                  const builtBuildings = settlement.buildings.filter(
                    (buildingId) => BUILDING_AFFINITY[buildingId] === pop
                  );
                  const unbuiltBuildings = BUILDINGS.filter(
                    (building) => !settlement.buildings.includes(building.id) && BUILDING_AFFINITY[building.id] === pop
                  );

                  return (
                    <div className="popBuildingColumn" key={pop}>
                      <div
                        className="popColumnHeader"
                        title={`${capitalize(formatPopLabel(pop, settlement.pops[pop]))}: ${settlement.pops[pop]}`}
                      >
                        <AtlasIcon icon={pop} className="miniIcon" />
                        <strong>{settlement.pops[pop]}</strong>
                      </div>
                      <div className="buildingChipRow">
                        {builtBuildings.length > 0 ? (
                          builtBuildings.map((buildingId, index) => {
                            const building = BUILDINGS.find((candidate) => candidate.id === buildingId);

                            return building ? (
                              <BuildingChip
                                building={building}
                                key={`${buildingId}-${index}`}
                                mode="built"
                                tooltipRows={[
                                  "Built in this holding.",
                                  `Benefit: ${formatBuildingEffects(building.effects)}.`
                                ]}
                              />
                            ) : null;
                          })
                        ) : (
                          <span className="emptyMini" title="No buildings of this type">—</span>
                        )}
                      </div>
                      <div className="buildingChipRow mutedChipRow">
                        {unbuiltBuildings.length > 0 ? (
                          unbuiltBuildings.map((building) => {
                            const status = getBuildBuildingStatus(G, playerID, tile.id, building.id);
                            const benefit = getBuildingBenefitText(G, playerID, tile, settlement, building);
                            const disabled = !isActive || phase !== "gameplay" || !status.can;

                            return (
                              <BuildingChip
                                building={building}
                                disabled={disabled}
                                key={building.id}
                                mode="option"
                                tooltipRows={buildingTooltipRows(building, status, benefit, phase, isActive)}
                                onClick={() => onBuildBuildingRequest(tile.id, building.id)}
                              />
                            );
                          })
                        ) : (
                          <span className="emptyMini" title="All available buildings built">✓</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
