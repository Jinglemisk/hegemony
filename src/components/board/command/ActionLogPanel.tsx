import type { HegemonyState, LogEntry } from "../../../game/types";
import { seasonLabel, yearLabel } from "../../../ui/formatters";
import { AnnotatedText } from "../../AnnotatedText";
import { UiSprite } from "../../Sprites";

export function ActionLogPanel({ G }: { G: HegemonyState }) {
  const entries = G.log.slice().reverse();

  // Fold consecutive entries from the same season under one heading.
  const groups: Array<{ season: number; entries: LogEntry[] }> = [];
  for (const entry of entries) {
    const current = groups[groups.length - 1];

    if (current && current.season === entry.season) {
      current.entries.push(entry);
    } else {
      groups.push({ season: entry.season, entries: [entry] });
    }
  }

  return (
    <section className="turnLogPanel" aria-label="Action log">
      <div className="turnLogHeader">
        <UiSprite item="seal" className="titleIcon" />
        <div>
          <h3>Chronicle</h3>
          <em>{entries.length} entries</em>
        </div>
      </div>
      <div className="turnLogList" tabIndex={0}>
        {groups.map((group) => (
          <div className="turnLogGroup" key={group.entries[0].id}>
            <div className="turnLogGroupHeading">
              {seasonLabel(group.season)} · {yearLabel(group.season)}
            </div>
            {group.entries.map((entry) => (
              <p key={entry.id}>
                <AnnotatedText text={entry.message} />
              </p>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
