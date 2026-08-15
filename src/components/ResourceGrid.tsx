import { memo, useEffect, useRef, useState } from "react";
import type { HexTile, Resource, Resources } from "../game/types";
import type { IncomeContribution } from "../game/rules";
import { RESOURCE_LABELS, formatNumber, formatSignedNumber } from "../ui/formatters";
import { RESOURCE_ORDER, resourceCssVars } from "../ui/resourceVisuals";
import { RESOURCE_GLYPHS } from "../ui/iconRegistry";
import { settlementNames } from "../ui/settlementNames";
import { Icon } from "../ui/icons/Icon";
import { Tooltip } from "./overlays/Tooltip";

type FlashDirection = "increase" | "decrease";

function ResourceGridComponent({
  tiles,
  resources,
  deltas,
  breakdown = [],
  resetKey,
  className = "",
  order = RESOURCE_ORDER,
}: {
  /** The board, so a breakdown row can name the settlement it came from. */
  tiles: readonly HexTile[];
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
          <Tooltip
            ariaLabel={`${RESOURCE_LABELS[resource]} ${formatNumber(resources[resource])}, projected ${formatSignedNumber(delta)} per turn`}
            content={
              <ResourceBreakdown
                delta={delta}
                entries={resourceBreakdown}
                resource={resource}
                tiles={tiles}
              />
            }
            focusable
            key={resource}
            triggerClassName={`resourcePill resource-${resource}${flash ? ` resourceFlash-${flash}` : ""}`}
            triggerStyle={getResourcePillVars(resource, resources[resource])}
            tooltipClassName={`resourceTooltip${resourceBreakdown.length >= 5 ? " compactResourceTooltip" : ""}`}
          >
            <Icon glyph={RESOURCE_GLYPHS[resource]} className="resourceIcon" />
            <span className="resourceValue">
              <strong className="stat-lg stat-xl">{formatNumber(resources[resource])}</strong>
              <span className={`resourceDelta stat ${deltaClass}`}>
                {formatSignedNumber(delta)}
              </span>
            </span>
          </Tooltip>
        );
      })}
    </div>
  );
}

function ResourceBreakdown({
  resource,
  delta,
  entries,
  tiles,
}: {
  resource: Resource;
  delta: number;
  entries: IncomeContribution[];
  tiles: readonly HexTile[];
}) {
  const names = settlementNames(tiles);
  return (
    <>
      <div className="resourceTooltipHeader">
        <span>{RESOURCE_LABELS[resource]}</span>
        <strong className={getResourceDeltaClass(resource, delta)}>
          {formatSignedNumber(delta)}
        </strong>
      </div>
      {entries.length > 0 ? (
        <div className="resourceTooltipRows">
          {entries.map((entry, index) => (
            <div
              className="resourceTooltipRow"
              key={`${entry.resource}-${entry.source}-${entry.detail}-${index}`}
            >
              <span>
                {/* The engine labels its own lines "City on plains -2,0"; where
                    a line names a settlement, the place's name replaces it. */}
                <strong>
                  {(entry.settlementId ? names.get(entry.settlementId) : null) ?? entry.source}
                </strong>
                <em>{entry.detail}</em>
              </span>
              <b className={getResourceDeltaClass(resource, entry.amount)}>
                {formatSignedNumber(entry.amount)}
              </b>
            </div>
          ))}
        </div>
      ) : (
        <p>No current income or expense.</p>
      )}
    </>
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
    "--resource-shadow": "rgb(177 58 40 / 24%)",
  };
}

/** Memoized (render-perf pass): the top bar's two resource grids only re-render when
 *  their own props change, not on every board state tick. */
export const ResourceGrid = memo(ResourceGridComponent);
