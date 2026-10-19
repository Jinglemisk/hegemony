import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { HegemonyState } from "../../game/types";
import { AnnotatedText } from "../AnnotatedText";
import { ActionLogPanel } from "../board/command/ActionLogPanel";

/**
 * The Chronicle: its newest line on a tab hanging from the bar's left end. Pressing the
 * tab drops the whole log out of it, filterable and scrolling, until it is pressed again.
 */
export function Ticker({ G }: { G: HegemonyState }) {
  const [open, setOpen] = useState(false);
  const latest = G.log[G.log.length - 1];
  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <aside
      aria-label="Chronicle"
      className={`ticker${open ? " is-open" : ""}`}
      data-c="ticker"
      data-exclude
      onKeyDown={closeOnEscape}
    >
      <button
        aria-expanded={open}
        className="ticker-head"
        onClick={() => setOpen((value) => !value)}
        title={open ? "Close the Chronicle" : "Open the Chronicle"}
        type="button"
      >
        <FittedLine key={latest?.id} text={latest?.message ?? "The table is set."} />
      </button>
      {open ? (
        <div className="ticker-more" data-gate-skip>
          <ActionLogPanel G={G} />
        </div>
      ) : null}
    </aside>
  );
}

/**
 * One line, cut at a word with an ellipsis when it would not fit the tab. The cut is
 * made in the text rather than by `text-overflow`, so nothing runs on past the tab
 * under whatever lies beside it. The Chronicle page keeps every line whole.
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
    <span className="ticker-line" data-truncates="summary" ref={ref}>
      <AnnotatedText links={false} text={shown} />
    </span>
  );
}
