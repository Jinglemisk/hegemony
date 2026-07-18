import type { ReactNode } from "react";
import type { Resource, Resources } from "../../game/types";
import { RESOURCE_LABELS, formatSignedNumber } from "../../ui/formatters";
import { RESOURCE_ORDER, resourceCssVars } from "../../ui/resourceVisuals";
import { ResourceIcon } from "../Sprites";

/**
 * The one resource-chip render path (ladder rung R2). Every cost, delta and yield
 * in the game is icon + number keyed to a resource colour; this replaces the four
 * hand-rolled copies that drifted apart (ActionCommandPanel's ResourceCost,
 * PopulationModals' CostRow, ResourceDeltaList, SettlementCard's HoldingNetYields).
 *
 * Three variants, which is the whole difference the copies encoded:
 * - `cost`  — the non-zero entries, bare numbers. "12 wood."
 * - `delta` — the non-zero entries, signed and labelled, toned. "+3 Food."
 * - `yield` — EVERY resource, signed, zeros dimmed to a dash so the columns read
 *             as a fixed set you can scan down.
 *
 * `className` / `chipClassName` / `iconClassName` carry each site's existing
 * classes so the reskin can move them one at a time; every chip also gets the
 * shared `resourceChip` class, which is the hook that lets the brandbook restyle
 * all of them from one rule.
 */

export type ResourceChipsVariant = "cost" | "delta" | "yield";

export function ResourceChips({
  resources,
  variant,
  className,
  chipClassName,
  iconClassName = "miniResourceIcon",
  empty,
  title
}: {
  resources: Partial<Resources>;
  variant: ResourceChipsVariant;
  className?: string;
  chipClassName?: string;
  iconClassName?: string;
  /** Rendered instead of the chips when nothing qualifies — "Free", "No direct change". */
  empty?: ReactNode;
  /** Summary tooltip on the whole set, for sites that describe the row as a unit. */
  title?: string;
}) {
  // `yield` keeps zeros (as dashes); the others drop them.
  const entries = RESOURCE_ORDER.filter(
    (resource) => variant === "yield" || (resources[resource] ?? 0) !== 0
  );

  if (entries.length === 0) {
    return empty !== undefined ? <>{empty}</> : null;
  }

  return (
    <span className={joinClasses("resourceChips", className)} title={title}>
      {entries.map((resource) => {
        const value = resources[resource] ?? 0;

        return (
          <span
            className={joinClasses(
              "resourceChip",
              chipClassName,
              variant === "yield" && value === 0 ? "emptyNetYield" : undefined,
              variant !== "cost" ? toneClass(value) : undefined
            )}
            key={resource}
            style={resourceCssVars(resource as Resource)}
            title={chipTitle(variant, resource as Resource, value)}
          >
            <ResourceIcon
              resource={resource as Resource}
              value={variant === "cost" ? undefined : value}
              className={iconClassName}
            />
            {renderValue(variant, resource as Resource, value)}
          </span>
        );
      })}
    </span>
  );
}

function renderValue(variant: ResourceChipsVariant, resource: Resource, value: number) {
  if (variant === "cost") {
    return <strong>{value}</strong>;
  }

  if (variant === "yield") {
    return <strong>{value === 0 ? "–" : formatSignedNumber(value)}</strong>;
  }

  return (
    <>
      {formatSignedNumber(value)} {RESOURCE_LABELS[resource]}
    </>
  );
}

function chipTitle(variant: ResourceChipsVariant, resource: Resource, value: number) {
  if (variant !== "yield") {
    return undefined;
  }

  return `${RESOURCE_LABELS[resource]}: ${value === 0 ? "no change" : formatSignedNumber(value)}`;
}

function toneClass(value: number) {
  if (value === 0) {
    return "neutral";
  }

  return value > 0 ? "positive" : "negative";
}

function joinClasses(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}
