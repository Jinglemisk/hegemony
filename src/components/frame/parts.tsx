import type { CSSProperties, ReactNode } from "react";
import type { PlayerId, Resources } from "../../game/types";
import { RESOURCE_ICON, sign, tone } from "../../ui/frameFormat";
import { RESOURCE_LABELS, formatNumber, formatSignedNumber } from "../../ui/formatters";
import { RESOURCE_ORDER } from "../../ui/resourceVisuals";
import { rasterIcon } from "../../ui/icons/placeholders";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";

/**
 * The frame's atoms, after the Hybrid arc mock: a raster icon at one of the four
 * declared sizes, a signed number, a price as number-and-icon pairs, and the
 * tooltip body (title, caption, ledger rows).
 */

export type IcoSize = "chip" | "ui" | "tile" | "disc";

export function Ico({
  path,
  size,
  className,
}: {
  path: string;
  size: IcoSize;
  className?: string;
}) {
  return (
    <img
      alt=""
      className={`ico ico-${size}${className ? ` ${className}` : ""}`}
      src={rasterIcon(path)}
    />
  );
}

/** A seat's glaze disc with its blazon. A bought Idea's mark carries the year. */
export function SeatMark({ playerID, year }: { playerID: PlayerId; year?: number }) {
  const glaze = PLAYER_GLAZES[playerID];
  return (
    <span
      className="idea-seat"
      data-year={year === undefined ? undefined : `Y${year}`}
      style={{ "--owner": glaze.color } as CSSProperties}
      title={glaze.name}
    >
      {glaze.blazon}
    </span>
  );
}

/**
 * Resource amounts as number-and-icon chips in `RESOURCE_ORDER`, each read aloud in
 * words ("4 Wood"). A price shows what is paid, and `short` marks one the store cannot
 * pay; `signed` shows what moves instead, signed and toned. `empty` stands in when
 * there is nothing to show.
 */
export function Chips({
  amounts,
  signed = false,
  short = false,
  empty = null,
}: {
  amounts: Partial<Resources>;
  signed?: boolean;
  short?: boolean;
  empty?: ReactNode;
}) {
  const shown = RESOURCE_ORDER.filter((resource) =>
    signed ? (amounts[resource] ?? 0) !== 0 : (amounts[resource] ?? 0) > 0,
  );
  if (shown.length === 0) return <>{empty}</>;
  return (
    <span className={signed ? "chips" : `price${short ? " is-short" : ""}`}>
      {shown.map((resource) => {
        const n = amounts[resource] ?? 0;
        return (
          <span className={signed ? `chip ${tone(n)}` : "price-part"} key={resource}>
            <span aria-hidden="true">{signed ? sign(n) : n}</span>
            <Ico path={RESOURCE_ICON[resource]} size="chip" />
            <span className="visuallyHidden">
              {`${signed ? formatSignedNumber(n) : formatNumber(n)} ${RESOURCE_LABELS[resource]}`}
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function Tip({
  title,
  sub,
  children,
}: {
  title: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <div className="tip-title">
        {title}
        {sub ? <span className="tip-sub">{sub}</span> : null}
      </div>
      {children}
    </>
  );
}

export type LedgerRow = {
  key: string;
  label: ReactNode;
  value: ReactNode;
  icon?: string;
  total?: boolean;
};

export function TipLedger({ rows }: { rows: readonly LedgerRow[] }) {
  return (
    <div className="tip-ledger">
      {rows.map((row) => (
        <span className={`tip-row${row.total ? " is-total" : ""}`} key={row.key}>
          <span className="tip-k">
            {row.icon ? <Ico path={row.icon} size="chip" /> : null}
            {row.label}
          </span>
          <b>{row.value}</b>
        </span>
      ))}
    </div>
  );
}

export function TipWarn({ children }: { children: ReactNode }) {
  return (
    <div className="tip-warn">
      <Ico path="unrest/alarm" size="chip" />
      {children}
    </div>
  );
}
