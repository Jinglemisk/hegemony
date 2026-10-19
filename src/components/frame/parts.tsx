import type { CSSProperties, ReactNode } from "react";
import type { PlayerId, Resource, Resources } from "../../game/types";
import { RESOURCE_ICON, sign, tone } from "../../ui/frameFormat";
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

/** A price: number-and-icon pairs, no words. `short` marks one the store cannot pay. */
export function Price({
  amounts,
  short = false,
}: {
  amounts: Partial<Resources>;
  short?: boolean;
}) {
  const parts = (Object.entries(amounts) as Array<[Resource, number]>).filter(([, n]) => n > 0);

  return (
    <span className={`price${short ? " is-short" : ""}`}>
      {parts.map(([resource, n]) => (
        <span className="price-part" key={resource}>
          <span>{n}</span>
          <Ico path={RESOURCE_ICON[resource]} size="chip" />
        </span>
      ))}
    </span>
  );
}

/** What moves: one signed, toned number-and-icon per resource that is not zero. */
export function Chips({
  amounts,
  empty = null,
}: {
  amounts: Partial<Resources>;
  empty?: ReactNode;
}) {
  const moved = RESOURCE_ORDER.filter((resource) => (amounts[resource] ?? 0) !== 0);
  if (moved.length === 0) return <>{empty}</>;
  return (
    <span className="chips">
      {moved.map((resource) => (
        <span className={`chip ${tone(amounts[resource] ?? 0)}`} key={resource}>
          {sign(amounts[resource] ?? 0)}
          <Ico path={RESOURCE_ICON[resource]} size="chip" />
        </span>
      ))}
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
