import type { BuildingDefinition } from "../../../game/types";
import { presentBuildingEffect } from "../../../ui/effects";
import { MechanicsDetails } from "../../MechanicsDetails";
import { AtlasIcon } from "../../Sprites";
import { Tooltip } from "../../overlays/Tooltip";

export function BuildingChip({
  building,
  mode,
  tooltipRows,
  disabled = false,
  onClick,
}: {
  building: BuildingDefinition;
  mode: "built" | "option";
  tooltipRows: string[];
  disabled?: boolean;
  onClick?: () => void;
}) {
  const tooltipLabel = [building.name, ...tooltipRows].join(". ");
  const content = <AtlasIcon icon={building.id} className="miniIcon" />;
  const tooltip = (
    <MechanicsDetails effects={building.effects.map(presentBuildingEffect)} heading={building.name}>
      <div className="detailTooltipRows">
        {tooltipRows.map((row) => (
          <em key={row}>{row}</em>
        ))}
      </div>
    </MechanicsDetails>
  );

  if (mode === "option") {
    return (
      <Tooltip content={tooltip} tooltipClassName="detailTooltip">
        <button
          aria-disabled={disabled}
          aria-label={tooltipLabel}
          className="buildingChip buildingChipOption"
          onClick={disabled ? undefined : onClick}
          type="button"
        >
          {content}
        </button>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={tooltip} preferredPlacement="above" tooltipClassName="detailTooltip">
      <span aria-label={tooltipLabel} className="buildingChip buildingChipBuilt" tabIndex={0}>
        {content}
      </span>
    </Tooltip>
  );
}
