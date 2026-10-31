import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import type { HegemonyState } from "../../game/types";
import { deedSeat } from "../../ui/frameSelectors";
import { AnnotatedText } from "../AnnotatedText";
import { ActionLogPanel } from "../board/command/ActionLogPanel";
import { Popover } from "../overlays/Popover";
import { MAP_MODES } from "./map3d/modes";
import type { MapMode } from "./map3d/modes";
import { PLATE_CHOICES } from "./map3d/plates";
import type { Plates } from "./map3d/plates";
import { Ico, SeatMark } from "./parts";

/**
 * The corner dock, after the living-map prototype: one paper at the bottom right. Its
 * top row is the Chronicle's newest line across the dock, which opens the whole
 * Chronicle upward out of it; under it, the four map modes, the Plates menu, and End
 * turn at the right.
 */
export function CornerDock({
  G,
  mode,
  onMode,
  plates,
  onPlates,
  children,
}: {
  G: HegemonyState;
  mode: MapMode;
  onMode: (mode: MapMode) => void;
  plates: Plates;
  onPlates: (plates: Plates) => void;
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
          <ActionLogPanel G={G} />
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
        <PlatesMenu onPlates={onPlates} plates={plates} />
      </div>
      <div className="dock-end">{children}</div>
    </div>
  );
}

/** How the map draws each tile's resource badge: its look, its size, and whether it
 *  fades close in. A display choice, not a map mode, so it sits after the modes. */
function PlatesMenu({ plates, onPlates }: { plates: Plates; onPlates: (plates: Plates) => void }) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className="dock-mode dock-plates"
        onClick={() => setOpen((value) => !value)}
        ref={opener}
        title="How the map draws each tile's slots and resource"
        type="button"
      >
        <Ico path="settlements/slot" size="ui" />
        Plates
      </button>
      {open ? (
        <Popover
          anchor={opener}
          ariaLabel="Resource plates"
          className="plates-pop"
          dismissOnOutside
          onDismiss={() => setOpen(false)}
          preferredPlacement="above"
        >
          <p className="caps plates-title">Resource plates</p>
          {PLATE_CHOICES.map((choice) => (
            <div aria-label={choice.label} className="plates-row" key={choice.key} role="group">
              <span className="caps">{choice.label}</span>
              {choice.options.map((option) => (
                <button
                  aria-pressed={plates[choice.key] === option.value}
                  key={option.value}
                  onClick={() => onPlates({ ...plates, [choice.key]: option.value } as Plates)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          ))}
          <p className="plates-note">Hold Alt to show every plate.</p>
        </Popover>
      ) : null}
    </>
  );
}

/**
 * One line, cut at a word with an ellipsis when it would not fit the dock's line. The
 * cut is made in the text rather than by `text-overflow`, so nothing runs on past the
 * line under whatever lies beside it. The Chronicle page keeps every line whole.
 */
function FittedLine({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const words = text.split(" ");
  // A search for the most words that fit: `lo` fits (one word always does), `hi` is
  // the most still possible, `n` is on screen now.
  const [fit, setFit] = useState({ lo: 1, hi: words.length, n: words.length });

  // The face's width changes once the web font arrives: search again then.
  useEffect(() => {
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) setFit({ lo: 1, hi: words.length, n: words.length });
    });
    return () => {
      live = false;
    };
  }, [words.length]);

  useLayoutEffect(() => {
    const line = ref.current;
    if (!line || fit.lo === fit.hi) return;
    const fits = line.scrollWidth <= line.clientWidth;
    const lo = fits ? fit.n : fit.lo;
    const hi = fits ? fit.hi : fit.n - 1;
    setFit({ lo, hi, n: lo === hi ? lo : Math.ceil((lo + hi) / 2) });
  }, [fit]);

  const shown = fit.n < words.length ? `${words.slice(0, fit.n).join(" ")}…` : text;

  return (
    <span className="dock-line-text" data-truncates="summary" ref={ref}>
      <AnnotatedText links={false} text={shown} />
    </span>
  );
}
