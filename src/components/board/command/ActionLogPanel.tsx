import type { HegemonyState } from "../../../game/types";
import { seasonLabel, seasonTag, yearLabel } from "../../../ui/formatters";
import { UiSprite } from "../../Sprites";

export function ActionLogPanel({ G }: { G: HegemonyState }) {
  const entries = G.log.slice().reverse();

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
        {entries.map((entry) => (
          <p key={entry.id}>
            <span title={`${seasonLabel(entry.season)}, ${yearLabel(entry.season)}`}>{seasonTag(entry.season)}</span>
            <b>{entry.message}</b>
          </p>
        ))}
      </div>
    </section>
  );
}
