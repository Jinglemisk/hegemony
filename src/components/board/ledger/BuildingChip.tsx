import { useId, useState } from "react";
import { createPortal } from "react-dom";
import type { BuildingDefinition } from "../../../game/types";
import { AtlasIcon } from "../../Sprites";
import { DETAIL_TOOLTIP_WIDTH } from "../constants";
import { clampAnchoredLeft } from "../../../ui/anchoring";

/** Gap kept between the tooltip and the viewport edge. */
const TOOLTIP_GUTTER = 10;
/** Anchors nearer the top than this open downward, clear of the top bar. */
const TOOLTIP_FLIP_BELOW_Y = 150;

export function BuildingChip({
  building,
  mode,
  tooltipRows,
  disabled = false,
  onClick
}: {
  building: BuildingDefinition;
  mode: "built" | "option";
  tooltipRows: string[];
  disabled?: boolean;
  onClick?: () => void;
}) {
  const tooltipId = useId();
  const tooltipLabel = [building.name, ...tooltipRows].join(". ");
  const [tooltipPosition, setTooltipPosition] = useState<{
    left: number;
    top: number;
    placement: "above" | "below";
  } | null>(null);

  const showTooltip = (target: HTMLElement) => {
    if (typeof window === "undefined") {
      return;
    }

    const rect = target.getBoundingClientRect();
    const tooltipWidth = Math.min(DETAIL_TOOLTIP_WIDTH, window.innerWidth - TOOLTIP_GUTTER * 2);
    const left = clampAnchoredLeft(rect.left + rect.width / 2, tooltipWidth, TOOLTIP_GUTTER);
    // Unlike the found-colony popover, the tooltip does not measure itself — it
    // just avoids opening upward into the top bar.
    const placement = rect.top < TOOLTIP_FLIP_BELOW_Y ? "below" : "above";

    setTooltipPosition({
      left,
      top: placement === "below" ? rect.bottom : rect.top,
      placement
    });
  };

  const hideTooltip = () => setTooltipPosition(null);

  const content = (
    <>
      <AtlasIcon icon={building.id} className="miniIcon" />
    </>
  );

  const tooltip =
    tooltipPosition && typeof document !== "undefined"
      ? createPortal(
          <span
            className={`detailTooltip floatingDetailTooltip${
              tooltipPosition.placement === "below" ? " detailTooltipBelow" : ""
            }`}
            id={tooltipId}
            role="tooltip"
            style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
          >
            <strong>{building.name}</strong>
            {tooltipRows.map((row) => (
              <em key={row}>{row}</em>
            ))}
          </span>,
          document.body
        )
      : null;

  if (mode === "option") {
    return (
      <>
        <button
          aria-describedby={tooltipPosition ? tooltipId : undefined}
          aria-disabled={disabled}
          aria-label={tooltipLabel}
          className="buildingChip buildingChipOption"
          onBlur={hideTooltip}
          onClick={disabled ? undefined : onClick}
          onFocus={(event) => showTooltip(event.currentTarget)}
          onMouseEnter={(event) => showTooltip(event.currentTarget)}
          onMouseLeave={hideTooltip}
          type="button"
        >
          {content}
        </button>
        {tooltip}
      </>
    );
  }

  return (
    <>
      <span
        aria-describedby={tooltipPosition ? tooltipId : undefined}
        aria-label={tooltipLabel}
        className="buildingChip buildingChipBuilt"
        onBlur={hideTooltip}
        onFocus={(event) => showTooltip(event.currentTarget)}
        onMouseEnter={(event) => showTooltip(event.currentTarget)}
        onMouseLeave={hideTooltip}
        tabIndex={0}
      >
        {content}
      </span>
      {tooltip}
    </>
  );
}
