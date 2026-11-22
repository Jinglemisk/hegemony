import type { MouseEvent, ReactNode } from "react";
import type { Resources } from "../../game/types";
import { formatNumber } from "../../ui/formatters";
import { RESOURCE_ORDER } from "../../ui/resourceVisuals";
import { Tooltip } from "../overlays/Tooltip";
import { Delta, Ico, Tip, TipBody } from "../frame/parts";
import { usePoint, type FootLine } from "./words";

/**
 * The left window's shared parts: the confirm bar's cost line, and the drawer's icon
 * tile and row, whose sentence is their tooltip and, once pointed at, the drawer's
 * foot line.
 */

/** "This will cost 2 gold: gold 2 → 0." for the confirm bar, the after value a Delta. */
export function CostDetail({
  store,
  cost,
  more,
}: {
  store: Resources;
  cost: Partial<Resources>;
  more?: string;
}) {
  const paid = RESOURCE_ORDER.filter((resource) => (cost[resource] ?? 0) > 0);
  if (paid.length === 0) return more ? <>{more}</> : null;
  return (
    <>
      {`This will cost ${paid.map((r) => `${formatNumber(cost[r] ?? 0)} ${r}`).join(", ")}: `}
      {paid.map((resource, i) => (
        <span key={resource}>
          {i > 0 ? ", " : null}
          {`${resource} `}
          <Delta from={store[resource]} to={store[resource] - (cost[resource] ?? 0)} />
        </span>
      ))}
      .{more ? ` ${more}` : null}
    </>
  );
}

/**
 * A drawer's figure tile: an icon, a number and its label. With `onClick` it is a
 * button. Its sentence is its tooltip and, pointed at, the drawer's foot line.
 */
export function Tile({
  tip,
  icon,
  value,
  label,
  onClick,
  disabled = false,
  ariaLabel,
  className,
  children,
}: {
  tip: FootLine;
  icon: string;
  value?: ReactNode;
  label?: ReactNode;
  onClick?: () => void;
  /** A press that cannot be taken: hatched, focusable, its click swallowed. */
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  children?: ReactNode;
}) {
  const { lit, on } = usePoint(tip);
  const classes = `lw-tile${lit ? " is-lit" : ""}${className ? ` ${className}` : ""}`;
  const body = (
    <>
      <Ico path={icon} size="tile" />
      {value === undefined ? null : <b className="lw-tile-v">{value}</b>}
      {label === undefined ? null : <span className="lw-tile-k">{label}</span>}
      {children}
    </>
  );
  return (
    <Tooltip
      content={
        <Tip title={tip.title}>
          <TipBody>{tip.line}</TipBody>
        </Tip>
      }
      triggerClassName="lw-tip"
    >
      {onClick ? (
        <button
          {...on}
          aria-disabled={disabled || undefined}
          aria-label={ariaLabel}
          className={`${classes} is-press`}
          onClick={disabled ? undefined : onClick}
          type="button"
        >
          {body}
        </button>
      ) : (
        <div {...on} className={classes}>
          {body}
        </div>
      )}
    </Tooltip>
  );
}

/** A row that points like a tile: a whole-width button with a tooltip. */
export function Row({
  tip,
  onClick,
  ariaLabel,
  tone,
  children,
}: {
  tip: FootLine;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  ariaLabel: string;
  tone?: "warn" | "good";
  children: ReactNode;
}) {
  const { lit, on } = usePoint(tip);
  return (
    <Tooltip
      content={
        <Tip title={tip.title}>
          <TipBody>{tip.line}</TipBody>
        </Tip>
      }
      triggerAs="div"
      triggerClassName="lw-tip"
    >
      <button
        {...on}
        aria-label={ariaLabel}
        className={`lw-row${lit ? " is-lit" : ""}`}
        data-tone={tone}
        onClick={onClick}
        type="button"
      >
        {children}
      </button>
    </Tooltip>
  );
}
