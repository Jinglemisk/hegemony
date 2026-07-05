import { useId, useState } from "react";
import { createPortal } from "react-dom";
import type { BuildingDefinition } from "../../../game/types";
import { AtlasIcon } from "../../Sprites";
import { DETAIL_TOOLTIP_WIDTH } from "../constants";

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
    const gutter = 10;
    const tooltipWidth = Math.min(DETAIL_TOOLTIP_WIDTH, window.innerWidth - gutter * 2);
    const centeredLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const left = Math.min(
      Math.max(gutter, centeredLeft),
      Math.max(gutter, window.innerWidth - tooltipWidth - gutter)
    );
    const placement = rect.top < 150 ? "below" : "above";

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
