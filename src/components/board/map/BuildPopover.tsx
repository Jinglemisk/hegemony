import { useMemo, useState } from "react";
import { getBuildBuildingOptions } from "../../../game/rules";
import type { BuildingId } from "../../../game/types";
import { AnnotatedText } from "../../AnnotatedText";
import { MechanicsDetails } from "../../MechanicsDetails";
import { AtlasIcon } from "../../Sprites";
import { Tooltip } from "../../overlays/Tooltip";
import { useGameUi } from "../GameUiContext";
import { PopoverActions } from "../PopoverActions";
import { ResourceChips } from "../ResourceChips";
import {
  actionRequirementText,
  gameplayActionDisabled,
  getBuildingBenefitText,
  settlementPickerLabel,
} from "../helpers";
import { TilePopover } from "./TilePopover";

/** Build at the selected settlement through the shared map popover grammar. */
export function BuildPopover({
  tileId,
  anchor,
  onCancel,
  onConfirm,
}: {
  tileId: string;
  anchor: DOMRect;
  onCancel: () => void;
  onConfirm: (tileId: string, buildingId: BuildingId) => void;
}) {
  const { G, viewerId: playerID, phase, isActive } = useGameUi();
  const tile = G.board.tiles.find((candidate) => candidate.id === tileId);
  const options = getBuildBuildingOptions(G, playerID, tileId);
  const [buildingId, setBuildingId] = useState<BuildingId>(
    () => options.find(({ status }) => status.can)?.building.id ?? options[0].building.id,
  );

  const selected = options.find(({ building }) => building.id === buildingId) ?? options[0];
  const { building, status } = selected;
  const benefit = useMemo(
    () => (tile ? getBuildingBenefitText(G, playerID, tile, building) : ""),
    [G, playerID, tile, building],
  );

  if (!tile) return null;

  return (
    <TilePopover
      anchor={anchor}
      label="Build"
      measureKey={buildingId}
      onCancel={onCancel}
      title="Build"
    >
      <p className="placementSectionLabel placementTargetName">
        {settlementPickerLabel(G, tile, playerID)}
      </p>

      <div
        className="popChoiceGrid growPopChoiceGrid popoverChoiceStack"
        role="group"
        aria-label="Building to raise"
      >
        {options.map(({ building: candidate, status: candidateStatus }) => {
          const candidateBenefit = getBuildingBenefitText(G, playerID, tile, candidate);
          const reason = actionRequirementText(candidateStatus, phase, isActive);
          const disabled = !candidateStatus.can || !isActive || phase !== "gameplay";
          const effectiveCost = candidateStatus.cost ?? candidate.cost;

          return (
            <Tooltip
              ariaLabel={`${candidate.name}. ${reason}`}
              content={
                <MechanicsDetails
                  blockedReason={disabled ? reason : undefined}
                  effectiveCost={effectiveCost}
                  heading={candidate.name}
                >
                  <p className="mechanicsExplanation">
                    <AnnotatedText links={false} text={candidateBenefit} />
                  </p>
                </MechanicsDetails>
              }
              disabled={disabled}
              key={candidate.id}
              triggerClassName="popoverChoiceTooltipTrigger"
            >
              <button
                className={candidate.id === buildingId ? "selectedChoice" : ""}
                disabled={disabled}
                onClick={() => setBuildingId(candidate.id)}
                type="button"
              >
                <AtlasIcon icon={candidate.id} className="miniIcon" />
                <span>{candidate.name}</span>
                <strong>
                  <ResourceChips resources={effectiveCost} variant="cost" empty="Free" />
                </strong>
              </button>
            </Tooltip>
          );
        })}
      </div>

      <div className="growPopBenefitPanel">
        <div>
          <strong>Projected Benefit</strong>
          <AnnotatedText text={benefit} />
        </div>
      </div>

      <PopoverActions
        confirmLabel={`Build ${building.name}`}
        disabled={gameplayActionDisabled(status, phase, isActive)}
        title={actionRequirementText(status, phase, isActive)}
        onCancel={onCancel}
        onConfirm={() => onConfirm(tileId, buildingId)}
      />
    </TilePopover>
  );
}
