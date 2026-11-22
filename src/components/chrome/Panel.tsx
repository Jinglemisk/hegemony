import type { HTMLAttributes, ReactNode } from "react";
import type { PlayerId } from "../../game/types";
import { Ico } from "../frame/parts";
import { CloseDisc } from "./controls";
import { SeatCoin } from "./SeatCoin";

/** A panel corner: top-left, top-right, bottom-left, bottom-right. */
type Corner = "tl" | "tr" | "bl" | "br";

/**
 * A panel: parchment (or black glaze) in a cast bronze rule, with a bronze meander
 * corner on each corner listed in `corners` (a free corner, not one against the
 * screen's edge), standing 9px proud. The caller fixes its size and place; a
 * panel never resizes with its contents, so a scrolling body goes inside it.
 */
export function Panel({
  tone = "light",
  corners = [],
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { tone?: "light" | "glaze"; corners?: readonly Corner[] }) {
  return (
    <div {...rest} className={`ch-panel${className ? ` ${className}` : ""}`} data-tone={tone}>
      {children}
      {corners.map((at) => (
        <span aria-hidden="true" className="ch-corner" data-at={at} key={at} />
      ))}
    </div>
  );
}

/**
 * A panel's head: a glaze band with a gilt edge and the meander under it. It leads
 * with an icon (an `Ico` path) or a seat's coin, then the Cinzel title and a sub
 * line; a back plaque ("‹ Cities") when `back` names where it returns, and the
 * close disc when `onClose` is given.
 */
export function PanelHead({
  icon,
  coin,
  title,
  sub,
  back,
  onBack,
  onClose,
  closeLabel = "Close",
  onCoin,
  coinLabel,
}: {
  icon?: string;
  coin?: PlayerId;
  /** The coin is a button (a rival's coin opens their card); `coinLabel` names it. */
  onCoin?: () => void;
  coinLabel?: string;
  title: ReactNode;
  sub?: ReactNode;
  /** Where the back plaque returns to, shown as "‹ {back}". */
  back?: string;
  onBack?: () => void;
  onClose?: () => void;
  /** The close disc's accessible name, e.g. "Close Samos". */
  closeLabel?: string;
}) {
  return (
    <header className="ch-head">
      {coin !== undefined && onCoin ? (
        <button aria-label={coinLabel} className="ch-head-coinbtn" onClick={onCoin} type="button">
          <SeatCoin className="ch-head-coin" seat={coin} />
        </button>
      ) : coin !== undefined ? (
        <SeatCoin className="ch-head-coin" seat={coin} />
      ) : icon ? (
        <span className="ch-head-icon">
          <Ico path={icon} size="ui" />
        </span>
      ) : null}
      <div className="ch-head-words">
        <h2 className="ch-head-title">{title}</h2>
        {sub ? <p className="ch-head-sub">{sub}</p> : null}
      </div>
      {back && onBack ? (
        <button
          aria-label={`Back to ${back}`}
          className="ch-ctl ch-back"
          onClick={onBack}
          type="button"
        >
          <span aria-hidden="true">‹ {back}</span>
        </button>
      ) : null}
      {onClose ? <CloseDisc label={closeLabel} onClick={onClose} /> : null}
    </header>
  );
}

/** A dark section band with the meander under it: a small-caps label, and `end` at its far end (a count, "In 2 turns"). */
export function Band({ label, end }: { label: ReactNode; end?: ReactNode }) {
  return (
    <div className="ch-band">
      <h3 className="ch-band-label">{label}</h3>
      {end === undefined ? null : <span className="ch-band-end">{end}</span>}
    </div>
  );
}
