import type { Resources } from "../game/types";
import { RESOURCE_LABELS, formatResourceDelta, formatSignedNumber } from "../ui/formatters";
import { RESOURCE_ORDER } from "../ui/resourceVisuals";
import { ResourceIcon } from "./Sprites";

/** Every resource always shown so the columns read as a fixed set — a zero dims to
 *  an icon + dash rather than vanishing. A table row, so not the frame's chips. */
export function HoldingNetYields({ resources }: { resources: Resources }) {
  const hasYield = RESOURCE_ORDER.some((resource) => resources[resource] !== 0);

  return (
    <span
      className="holdingNetYields"
      title={
        hasYield
          ? `Net income: ${formatResourceDelta(resources)}`
          : "No net income from this settlement"
      }
    >
      {RESOURCE_ORDER.map((resource) => {
        const value = resources[resource];
        const said = `${RESOURCE_LABELS[resource]}: ${value === 0 ? "no change" : formatSignedNumber(value)}`;

        return (
          <span
            className={`holdingNetYield${value === 0 ? " emptyNetYield" : ""}`}
            key={resource}
            title={said}
          >
            <ResourceIcon resource={resource} className="miniResourceIcon" />
            <strong aria-hidden="true">{value === 0 ? "–" : formatSignedNumber(value)}</strong>
            <span className="visuallyHidden">{said}</span>
          </span>
        );
      })}
    </span>
  );
}
