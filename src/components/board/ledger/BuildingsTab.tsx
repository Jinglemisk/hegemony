import { getBuildBuildingStatus, getBuildings } from "../../../game/rules";
import type { BuildingId } from "../../../game/types";
import { formatBuildingEffects, formatResourceCost } from "../../../ui/formatters";
import { AnnotatedText } from "../../AnnotatedText";
import { MechanicsDetails } from "../../MechanicsDetails";
import { AtlasIcon } from "../../Sprites";
import { CodexTermLink } from "../../codexLink";
import { Tooltip } from "../../overlays/Tooltip";
import { useGameUi } from "../GameUiContext";
import { actionRequirementText, getBuildingBenefitText, holdingShortLabel } from "../helpers";
import type { OwnedHolding } from "../types";

export function BuildingsTab({
  holdings,
  onBuildBuildingRequest,
}: {
  holdings: OwnedHolding[];
  onBuildBuildingRequest: (tileId: string, buildingId: BuildingId) => void;
}) {
  const { G, viewerId: playerID, phase, isActive } = useGameUi();
  return (
    <div className="buildingsLedger">
      {getBuildings().map((building) => (
        <section className="buildingLedgerRow" key={building.id}>
          <div className="buildingLedgerLead">
            <AtlasIcon icon={building.id} className="buildingButtonIcon" />
            <span>
              <strong>
                <CodexTermLink chapter="buildings">{building.name}</CodexTermLink>
              </strong>
              <em>
                <AnnotatedText text={formatBuildingEffects(building.effects)} />
              </em>
              <span className="buildingLedgerCost">
                Base cost{" "}
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
              const reason = actionRequirementText(status, phase, isActive);
              const holding = holdingShortLabel(tile, settlement);

              return (
                <Tooltip
                  content={
                    <MechanicsDetails
                      blockedReason={disabled ? reason : undefined}
                      effectiveCost={status.cost ?? building.cost}
                      heading={`${building.name} — ${holding}`}
                    >
                      <p className="mechanicsExplanation">
                        <AnnotatedText links={false} text={benefit} />
                      </p>
                    </MechanicsDetails>
                  }
                  key={`${building.id}-${tile.id}`}
                  triggerClassName="candidateTooltipTrigger"
                >
                  <button
                    aria-disabled={disabled}
                    className="candidateButton"
                    onClick={
                      disabled ? undefined : () => onBuildBuildingRequest(tile.id, building.id)
                    }
                    type="button"
                  >
                    <span>{holding}</span>
                    <b>
                      <AnnotatedText text={benefit} />
                    </b>
                    <span>Effective cost {formatResourceCost(status.cost ?? building.cost)}</span>
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
