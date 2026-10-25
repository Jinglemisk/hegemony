import { useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import type { HegemonyState } from "../../game/types";
import { deedSeat } from "../../ui/frameSelectors";
import { ActionLogPanel } from "../board/command/ActionLogPanel";
import { MapLegend } from "./map3d/MapLegend";
import { MAP_MODES } from "./map3d/modes";
import type { MapMode } from "./map3d/modes";
import { Ico, SeatMark } from "./parts";
import { FittedLine } from "./Ticker";

/**
 * The corner dock (`?map=3d`), after the living-map prototype: one paper at the
 * bottom right. Its top row is the Chronicle's newest line, which opens the whole
 * Chronicle upward out of the dock; its bottom row is the five map modes; End turn
 * spans both rows on the right. Over them, the key to the map's mode: a row that opens
 * it upward the same way.
 */
export function CornerDock({
  G,
  mode,
  onMode,
  children,
}: {
  G: HegemonyState;
  mode: MapMode;
  onMode: (mode: MapMode) => void;
  /** End turn, housed in the dock's right column. */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const line = useRef<HTMLButtonElement>(null);
  const logId = useId();
  const latest = G.log[G.log.length - 1];
  const text = latest?.message ?? "The table is set.";
  const seat = latest ? deedSeat(G, latest) : null;
  // Escape inside the Chronicle closes it and hands focus back to its line.
  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
      line.current?.focus();
    }
  };

  return (
    <div
      className={`dock${open ? " is-open" : ""}`}
      data-c="dock"
      data-exclude
      onKeyDown={closeOnEscape}
    >
      <MapLegend G={G} mode={mode} />
      {/* The line is cut to fit; its name carries the whole of it. */}
      <button
        aria-controls={open ? logId : undefined}
        aria-expanded={open}
        aria-label={`Chronicle: ${text}`}
        className="dock-line"
        onClick={() => setOpen((value) => !value)}
        ref={line}
        title={open ? "Close the Chronicle" : "Open the Chronicle"}
        type="button"
      >
        <span aria-hidden="true" className="dock-seal">
          {seat ? <SeatMark playerID={seat} /> : null}
        </span>
        <FittedLine key={latest?.id} text={text} />
      </button>
      {open ? (
        <div className="dock-log" data-gate-skip id={logId}>
          <p className="caps dock-log-title">Chronicle</p>
          <ActionLogPanel G={G} upward />
        </div>
      ) : null}
      <div aria-label="Map mode" className="dock-modes" role="group">
        {MAP_MODES.map((m, i) => (
          <button
            aria-keyshortcuts={String(i + 1)}
            aria-pressed={m.id === mode}
            className="dock-mode"
            key={m.id}
            onClick={() => onMode(m.id)}
            title={`${m.label} (${i + 1})`}
            type="button"
          >
            <Ico path={m.icon} size="ui" />
            {m.label}
          </button>
        ))}
      </div>
      <div className="dock-end">{children}</div>
    </div>
  );
}
