import type { LogEntry } from "../../game/types";
import { yearOf } from "../../game/core/calendar";
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
      <span className="ticker-line" data-truncates="summary">
        {latest ? <AnnotatedText links={false} text={latest.message} /> : "The table is set."}
      </span>
      {rest.length > 0 ? (
        <ol className="ticker-more" data-gate-skip>
          {rest.map((entry) => (
            <li key={entry.id}>
              <span className="ticker-year">Year {toRoman(yearOf(entry.season))}</span>
              <AnnotatedText links={false} text={entry.message} />
            </li>
          ))}
        </ol>
      ) : null}
    </aside>
  );
}
