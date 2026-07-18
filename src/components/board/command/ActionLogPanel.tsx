import { useMemo, useState, type CSSProperties } from "react";
import { PLAYER_COLORS } from "../../../game/data";
import type { HegemonyState, LogEntry, PlayerId } from "../../../game/types";
import { seasonLabel, yearLabel } from "../../../ui/formatters";
import { AnnotatedText } from "../../AnnotatedText";
import { UiSprite } from "../../Sprites";

type Filter = PlayerId | "all";
type TaggedEntry = { entry: LogEntry; player: PlayerId | null };

/**
 * The chronicle (right consult panel). Filters by the player who acted: log lines are
 * written "<Name> did X", so the leading name identifies the actor. `LogEntry` carries
 * no playerID (an engine concern), so this is a deliberately UI-side heuristic — lines
 * with no leading player (the season openers, the age ending) are neutral and show only
 * under "All". Each line also takes a thin accent in its actor's colour so the log is
 * scannable at a glance.
 */
export function ActionLogPanel({ G }: { G: HegemonyState }) {
  const [filter, setFilter] = useState<Filter>("all");

  // Longest name first, so no player's name can be a prefix of another's.
  const nameToId = useMemo(
    () =>
      (Object.values(G.players).map((player) => [player.name, player.id]) as Array<[string, PlayerId]>).sort(
        (a, b) => b[0].length - a[0].length
      ),
    [G.players]
  );

  const tagged = useMemo<TaggedEntry[]>(
    () =>
      G.log
        .slice()
        .reverse()
        .map((entry) => ({
          entry,
          player: nameToId.find(([name]) => entry.message.startsWith(name))?.[1] ?? null
        })),
    [G.log, nameToId]
  );

  const visible = filter === "all" ? tagged : tagged.filter((row) => row.player === filter);

  // Fold consecutive entries from the same season under one heading.
  const groups: Array<{ season: number; rows: TaggedEntry[] }> = [];
  for (const row of visible) {
    const current = groups[groups.length - 1];

    if (current && current.season === row.entry.season) {
      current.rows.push(row);
    } else {
      groups.push({ season: row.entry.season, rows: [row] });
    }
  }

  const players = Object.values(G.players);

  return (
    <section className="turnLogPanel" aria-label="Action log">
      <div className="turnLogHeader">
        <UiSprite item="seal" className="titleIcon" />
        <div>
          <h3>Chronicle</h3>
          <em>
            {visible.length}
            {filter === "all" ? "" : ` of ${G.log.length}`} entries
          </em>
        </div>
      </div>

      <div className="chronicleFilters" role="group" aria-label="Filter the chronicle by player">
        <button
          className={filter === "all" ? "chronicleFilter chronicleFilterActive" : "chronicleFilter"}
          onClick={() => setFilter("all")}
          type="button"
        >
          All
        </button>
        {players.map((player) => (
          <button
            aria-pressed={filter === player.id}
            className={filter === player.id ? "chronicleFilter chronicleFilterActive" : "chronicleFilter"}
            key={player.id}
            onClick={() => setFilter((current) => (current === player.id ? "all" : player.id))}
            style={{ "--filter-color": PLAYER_COLORS[player.id] } as CSSProperties}
            title={`Only ${player.name}'s deeds`}
            type="button"
          >
            <span className="chronicleFilterSwatch" aria-hidden="true" />
            {player.name}
          </button>
        ))}
      </div>

      <div className="turnLogList" tabIndex={0}>
        {groups.length === 0 ? <p className="chronicleEmpty">No deeds recorded here yet.</p> : null}
        {groups.map((group) => (
          <div className="turnLogGroup" key={`${group.season}-${group.rows[0].entry.id}`}>
            <div className="turnLogGroupHeading">
              {seasonLabel(group.season)} · {yearLabel(group.season)}
            </div>
            {group.rows.map(({ entry, player }) => (
              <p
                className={player ? "chronicleLine chronicleLinePlayer" : "chronicleLine"}
                key={entry.id}
                style={player ? ({ "--line-color": PLAYER_COLORS[player] } as CSSProperties) : undefined}
              >
                <AnnotatedText text={entry.message} />
              </p>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
