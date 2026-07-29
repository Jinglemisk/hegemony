import { useMemo, useState } from "react";
import { getBuildBuildingOptions } from "../../../game/rules";
import type { BuildingId } from "../../../game/types";
import { formatResourceCost } from "../../../ui/formatters";
import { AnnotatedText } from "../../AnnotatedText";
import { AtlasIcon } from "../../Sprites";
import { useGameUi } from "../GameUiContext";
import {
  actionRequirementText,
  buildingTooltipRows,
  gameplayActionDisabled,
  getBuildingBenefitText,
  settlementPickerLabel
} from "../helpers";
import { PopoverActions } from "../PopoverActions";
import { TilePopover } from "./TilePopover";

/**
 * Build, map-first (ui-refit Step 3). The settlement is already chosen — the
 * player clicked it — so this only asks which building, shows its cost and what
 * it earns, and confirms. It mirrors {@link GrowPopPopover}; the affinity and
 * benefit numbers come from the same engine helpers the Cities/Build tabs use, so
 * the map door and the ledger door agree.
 */
export function BuildPopover({
  tileId,
  anchor,
  onCancel,
  onConfirm
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
    () => options.find(({ status }) => status.can)?.building.id ?? options[0].building.id
  );

  const selected = options.find(({ building }) => building.id === buildingId) ?? options[0];
  const { building, status } = selected;
  const benefit = useMemo(
    () => (tile ? getBuildingBenefitText(G, playerID, tile, building) : ""),
    [G, playerID, tile, building]
  );

  if (!tile) {
    return null;
  }

  return (
    <TilePopover anchor={anchor} label="Build" measureKey={buildingId} onCancel={onCancel} title="Build">
      <p className="placementSectionLabel placementTargetName">{settlementPickerLabel(G, tile, playerID)}</p>

      <div className="popChoiceGrid growPopChoiceGrid popoverChoiceStack" role="group" aria-label="Building to raise">
        {options.map(({ building: candidate, status: candidateStatus }) => (
          <button
            className={candidate.id === buildingId ? "selectedChoice" : ""}
            disabled={!candidateStatus.can}
            key={candidate.id}
            onClick={() => setBuildingId(candidate.id)}
            title={buildingTooltipRows(candidate, candidateStatus, getBuildingBenefitText(G, playerID, tile, candidate), phase, isActive).join(" ")}
            type="button"
          >
            <AtlasIcon icon={candidate.id} className="miniIcon" />
            <span>{candidate.name}</span>
            <strong>{formatResourceCost(candidateStatus.cost ?? candidate.cost)}</strong>
          </button>
        ))}
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
