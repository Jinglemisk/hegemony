import type { BuildingDefinition } from "../../../game/types";
import { presentBuildingEffect } from "../../../ui/effects";
import { BUILDING_GLYPHS } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import { MechanicsDetails } from "../../MechanicsDetails";
import { Tooltip } from "../../overlays/Tooltip";

/**
 * A raised building, drawn as the slot it fills: an ivory tile bearing the
 * building's roofline.
 *
 * It used to be a raster atlas chip in the pop×building affinity matrix, where
 * "built" and "could be built" were two modes of one component. That matrix is
 * gone — what a settlement has raised is told by its sockets now — so this is
 * one shape with one meaning, drawn as a line glyph rather than a painted cell.
 */
export function BuildingChip({ building }: { building: BuildingDefinition }) {
  return (
    <Tooltip
      content={
        <MechanicsDetails
          effects={building.effects.map(presentBuildingEffect)}
          heading={building.name}
        >
          <p className="mechanicsExplanation">Raised here.</p>
        </MechanicsDetails>
      }
      preferredPlacement="above"
      tooltipClassName="detailTooltip"
    >
      <span
        aria-label={`${building.name}, raised here.`}
        className="socket socketBuilt"
        tabIndex={0}
      >
        <Icon glyph={BUILDING_GLYPHS[building.id]} size="verb" />
      </span>
    </Tooltip>
  );
}
