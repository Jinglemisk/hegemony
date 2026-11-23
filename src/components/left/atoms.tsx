import type { MouseEvent, ReactNode } from "react";
import { Tooltip } from "../overlays/Tooltip";
import { Ico, Tip, TipBody } from "../frame/parts";
import { usePoint, type FootLine } from "./words";

/**
 * The left window's shared parts: the drawer's icon tile and row, whose sentence is
 * their tooltip and, once pointed at, the drawer's foot line.
 */

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
          data-row={tip.key}
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
        data-row={tip.key}
        data-tone={tone}
        onClick={onClick}
        type="button"
      >
        {children}
      </button>
    </Tooltip>
  );
}
