import type { CSSProperties, ReactNode } from "react";
import type { PlayerId, Resources } from "../../game/types";
import { sign, tone } from "../../ui/frameFormat";
import { RESOURCE_RASTERS } from "../../ui/iconRegistry";
import { RESOURCE_LABELS, formatNumber, formatSignedNumber } from "../../ui/formatters";
import { RESOURCE_ORDER } from "../../ui/resourceVisuals";
import { rasterIcon } from "../../ui/icons/placeholders";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";
import { Prose } from "../AnnotatedText";

/**
 * The frame's atoms, after the Hybrid arc mock: a raster icon at one of the four
 * declared sizes, a signed number, a price as number-and-icon pairs, a countdown, a
 * change, and the tooltip body (title, paragraphs, ledger rows).
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
            <Ico path={RESOURCE_RASTERS[resource]} size="chip" />
            <span className="visuallyHidden">
              {`${signed ? formatSignedNumber(n) : formatNumber(n)} ${RESOURCE_LABELS[resource]}`}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * A tooltip: its title, and nothing else on the title's line but a countdown when
 * the thing runs out. A number the chip already shows, or a state the disc already
 * shows, is not repeated here; what the tip adds goes in its body.
 */
export function Tip({
  title,
  turns,
  children,
}: {
  title: ReactNode;
  /** The seat's turns left, for something that lasts or arrives (`Turns`). */
  turns?: number | null;
  children?: ReactNode;
}) {
  return (
    <>
      <div className="tip-title">
        {title}
        {turns === undefined || turns === null ? null : <Turns n={turns} />}
      </div>
      {children}
    </>
  );
}

/** A tooltip paragraph. Its words take their icons (`Prose`). */
export function TipBody({ children }: { children: ReactNode }) {
  return (
    <p className="tip-body">
      <Prose links={false}>{children}</Prose>
    </p>
  );
}

/**
 * A countdown: the hourglass and how many of the seat's own turns are left. A turn,
 * an income and a seat's year are the same tick, so every duration counts in it —
 * "food lasts 5 more incomes", "until year end" and "the Assembly sits next year"
 * all read as one token.
 */
export function Turns({ n }: { n: number }) {
  return (
    <span className="turns">
      <Ico path="events/end-turn" size="chip" />
      <span aria-hidden="true" className="num">
        {n}
      </span>
      <span className="visuallyHidden">{n === 1 ? "1 turn" : `${n} turns`}</span>
    </span>
  );
}

/**
 * A change, "x → y": y green when it helps, red when it hurts. Whether higher helps
 * is the caller's to say (more unrest hurts, more food helps).
 */
export function Delta({
  from,
  to,
  higherIsBetter = true,
  format = String,
}: {
  from: number;
  to: number;
  higherIsBetter?: boolean;
  format?: (n: number) => string;
}) {
  const helps = higherIsBetter ? to > from : to < from;
  return (
    <span className="delta num">
      {format(from)}
      <span className="delta-arr">→</span>
      <b className={to === from ? undefined : helps ? "pos" : "neg"}>{format(to)}</b>
    </span>
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
            {/* A row with its own icon names its term already; the rest take theirs. */}
            {row.icon ? (
              row.label
            ) : (
              <span>
                <Prose links={false}>{row.label}</Prose>
              </span>
            )}
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
      <span>
        <Prose links={false}>{children}</Prose>
      </span>
    </div>
  );
}
