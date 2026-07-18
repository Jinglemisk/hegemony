import { BUILDINGS } from "../../../game/data";
import type { Phase } from "../../../game/controller";
import { getBuildBuildingStatus } from "../../../game/rules";
import type { BuildingId, HegemonyState, PlayerId } from "../../../game/types";
import { formatBuildingEffects, formatResourceCost } from "../../../ui/formatters";
import { AnnotatedText } from "../../AnnotatedText";
import { AtlasIcon } from "../../Sprites";
import { buildingTooltipRows, getBuildingBenefitText, holdingShortLabel } from "../helpers";
import type { OwnedHolding } from "../types";
import { useGameUi } from "../GameUiContext";

export function BuildingsTab({
  holdings,
  onBuildBuildingRequest
}: {
  holdings: OwnedHolding[];
  onBuildBuildingRequest: (tileId: string, buildingId: BuildingId) => void;
}) {
  const { G, viewerId: playerID, phase, isActive } = useGameUi();
  return (
    <div className="buildingsLedger">
      {BUILDINGS.map((building) => (
        <section className="buildingLedgerRow" key={building.id}>
          <div className="buildingLedgerLead">
            <AtlasIcon icon={building.id} className="buildingButtonIcon" />
            <span>
              <strong>{building.name}</strong>
              <em>
                <AnnotatedText text={formatBuildingEffects(building.effects)} />
              </em>
              <span className="buildingLedgerCost">
                Cost{" "}
                <b>
                  <AnnotatedText text={formatResourceCost(building.cost)} />
                </b>
              </span>
            </span>
          </div>
          <div className="buildCandidateGrid">
            {holdings.map(({ tile, settlement }) => {
              const status = getBuildBuildingStatus(G, playerID, tile.id, building.id);
              const benefit = getBuildingBenefitText(G, playerID, tile, building);
              const disabled = !isActive || phase !== "gameplay" || !status.can;

              return (
                <button
                  className="candidateButton"
                  disabled={disabled}
                  key={`${building.id}-${tile.id}`}
                  onClick={() => onBuildBuildingRequest(tile.id, building.id)}
                  title={buildingTooltipRows(building, status, benefit, phase, isActive).join(" ")}
                >
                  <span>{holdingShortLabel(tile, settlement)}</span>
                  <b>
                    <AnnotatedText text={benefit} />
                  </b>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
