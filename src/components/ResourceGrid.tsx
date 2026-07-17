import { useEffect, useRef, useState } from "react";
import type { Resource, Resources } from "../game/types";
import type { IncomeContribution } from "../game/rules";
import { RESOURCE_LABELS, formatNumber, formatSignedNumber } from "../ui/formatters";
import { RESOURCE_ORDER, resourceCssVars } from "../ui/resourceVisuals";
import { ResourceIcon } from "./Sprites";

type FlashDirection = "increase" | "decrease";

export function ResourceGrid({
  resources,
  deltas,
  breakdown = [],
  resetKey,
  className = "",
  order = RESOURCE_ORDER
}: {
  resources: Resources;
  deltas?: Resources;
  breakdown?: IncomeContribution[];
  resetKey?: string;
  className?: string;
  /** Which resources to render, in order — lets the top bar split into two halves. */
  order?: Resource[];
}) {
  const previousResourcesByKey = useRef<Record<string, Resources>>({});
  const [flashes, setFlashes] = useState<Partial<Record<Resource, FlashDirection>>>({});

  useEffect(() => {
    const resourceKey = resetKey ?? "default";
    const previous = previousResourcesByKey.current[resourceKey];

    if (!previous) {
      previousResourcesByKey.current[resourceKey] = { ...resources };
      return;
    }

    const nextFlashes: Partial<Record<Resource, FlashDirection>> = {};

    for (const resource of RESOURCE_ORDER) {
      if (resources[resource] > previous[resource]) {
        nextFlashes[resource] = "increase";
      } else if (resources[resource] < previous[resource]) {
        nextFlashes[resource] = "decrease";
      }
    }

    previousResourcesByKey.current[resourceKey] = { ...resources };

    if (Object.keys(nextFlashes).length === 0) {
      return;
    }

    setFlashes((current) => ({ ...current, ...nextFlashes }));

    const timeout = window.setTimeout(() => {
      setFlashes((current) => {
        const updated = { ...current };

        for (const resource of Object.keys(nextFlashes) as Resource[]) {
          delete updated[resource];
        }

        return updated;
      });
    }, 2400);

    return () => window.clearTimeout(timeout);
  }, [resources, resetKey]);

  return (
    <div className={`resourceGrid ${className}`}>
      {order.map((resource) => {
        const delta = deltas?.[resource] ?? 0;
        const flash = flashes[resource];
        const deltaClass = getResourceDeltaClass(resource, delta);
        const resourceBreakdown = breakdown.filter((entry) => entry.resource === resource);

        return (
          <div
            className={`resourcePill resource-${resource}${flash ? ` resourceFlash-${flash}` : ""}`}
            key={resource}
            style={getResourcePillVars(resource, resources[resource])}
            tabIndex={0}
            aria-label={`${RESOURCE_LABELS[resource]} ${formatNumber(resources[resource])}, projected ${formatSignedNumber(delta)} per turn`}
          >
            <ResourceIcon resource={resource} value={resources[resource]} className="resourceIcon" />
            <span className="resourceValue">
              <strong>{formatNumber(resources[resource])}</strong>
              <span className={`resourceDelta ${deltaClass}`}>{formatSignedNumber(delta)}</span>
            </span>
            <ResourceBreakdownTooltip
              resource={resource}
              delta={delta}
              entries={resourceBreakdown}
            />
          </div>
        );
      })}
    </div>
  );
}

function ResourceBreakdownTooltip({
  resource,
  delta,
  entries
}: {
  resource: Resource;
  delta: number;
  entries: IncomeContribution[];
}) {
  const isCompact = entries.length >= 5;

  return (
    <div
      className={`resourceTooltip${isCompact ? " compactResourceTooltip" : ""}`}
      data-entry-count={entries.length}
      role="tooltip"
    >
      <div className="resourceTooltipHeader">
        <span>{RESOURCE_LABELS[resource]}</span>
        <strong className={getResourceDeltaClass(resource, delta)}>{formatSignedNumber(delta)}</strong>
      </div>
      {entries.length > 0 ? (
        <div className="resourceTooltipRows">
          {entries.map((entry, index) => (
            <div className="resourceTooltipRow" key={`${entry.resource}-${entry.source}-${entry.detail}-${index}`}>
              <span>
                <strong>{entry.source}</strong>
                <em>{entry.detail}</em>
              </span>
              <b className={getResourceDeltaClass(resource, entry.amount)}>{formatSignedNumber(entry.amount)}</b>
            </div>
          ))}
        </div>
      ) : (
        <p>No current income or expense.</p>
      )}
    </div>
  );
}

function getResourceDeltaClass(resource: Resource, amount: number) {
  if (amount === 0) {
    return "neutral";
  }

  return amount > 0 ? "positive" : "negative";
}

function getResourcePillVars(resource: Resource, value: number) {
  if (resource !== "happiness" || value >= 0) {
    return resourceCssVars(resource);
  }

  return {
    "--resource-color": "#b13a28",
    "--resource-tile": "#b13a28",
    "--resource-soft": "rgb(177 58 40 / 14%)",
    "--resource-line": "rgb(177 58 40 / 46%)",
    "--resource-shadow": "rgb(177 58 40 / 24%)"
  };
}
