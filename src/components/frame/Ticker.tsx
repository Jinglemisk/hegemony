import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LogEntry } from "../../game/types";
import { toRoman } from "../../ui/formatters";
import { AnnotatedText } from "../AnnotatedText";

const HISTORY = 5;

/** The Chronicle's newest line, a tab hanging from the bar; the lines before it open below. */
export function Ticker({ log }: { log: readonly LogEntry[] }) {
  const [latest, ...rest] = log.slice(-(HISTORY + 1)).reverse();

  return (
    <aside
      aria-label="Latest in the Chronicle"
      className="ticker"
      data-c="ticker"
      data-exclude
      tabIndex={0}
    >
      <FittedLine key={latest?.id} text={latest?.message ?? "The table is set."} />
      {rest.length > 0 ? (
        <ol className="ticker-more" data-gate-skip>
          {rest.map((entry) => (
            <li key={entry.id}>
              <span className="ticker-year">Year {toRoman(entry.year)}</span>
              <AnnotatedText links={false} text={entry.message} />
            </li>
          ))}
        </ol>
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
