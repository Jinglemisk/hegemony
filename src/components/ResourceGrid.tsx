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
            triggerClassName={`resourcePill resource-${resource}${resources[resource] < 0 ? " resourceAlert" : ""}${flash ? ` resourceFlash-${flash}` : ""}`}
            triggerStyle={resourceCssVars(resource)}
            tooltipClassName={`resourceTooltip${resourceBreakdown.length >= 5 ? " compactResourceTooltip" : ""}`}
          >
            {/* One atomic group: icon, numeral and delta are siblings on a single
                baseline, so an icon can never drift away from the number it names. */}
            <Icon glyph={RESOURCE_GLYPHS[resource]} className="resourceIcon" />
            <strong className="stat-lg stat-xl">{formatNumber(resources[resource])}</strong>
            <span className={`resourceDelta stat ${deltaClass}`}>
              {/* Nothing moved is said quietly: six printed zeros in a row read as
                  six facts, when they are the absence of one. */}
              {delta === 0 ? "·" : formatSignedNumber(delta)}
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

/** Memoized (render-perf pass): the top bar's two resource grids only re-render when
 *  their own props change, not on every board state tick. */
export const ResourceGrid = memo(ResourceGridComponent);
