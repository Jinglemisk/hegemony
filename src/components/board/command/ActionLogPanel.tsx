import { useMemo, useState, type CSSProperties } from "react";
import type { HegemonyState, LogEntry, PlayerId } from "../../../game/types";
import { seasonLabel, yearLabel } from "../../../ui/formatters";
import { PLAYER_GLAZE_LIST, glazeOf } from "../../../ui/playerGlazes";
import { AnnotatedText } from "../../AnnotatedText";

type Filter = PlayerId | "all";
type TaggedEntry = { entry: LogEntry; player: PlayerId | null };

/**
 * The chronicle — what happened, newest first, in the game's own voice.
 *
 * Three things were wrong with it and all three are fixed here:
 *
 * · **A doubled header.** The tablet already titles itself "Chronicle"; the page
 *   printed its own heading and icon underneath. One title per page.
 * · **Named filter pills.** Four buttons wide enough to wrap, in a page whose
 *   whole job is density. They are glaze discs with blazons now — the same mark
 *   the roster and the board use, so the filter is read, not decoded.
 * · **Duplicate entries.** One player event used to produce four lines. Two of
 *   them were deleted at the source (`src/game/events.ts`) because they said
 *   nothing the lines beside them did not; what remains here is a guard against
 *   any *consecutive identical* message, which is a rendering concern.
 *
 * Filtering reads `entry.about`, the engine's own answer. The old prefix
 * heuristic survives only as a fallback for saves written before that field
 * existed.
 */
export function ActionLogPanel({ G }: { G: HegemonyState }) {
  const [filter, setFilter] = useState<Filter>("all");

  // Longest name first, so no player's name can be a prefix of another's.
  const nameToId = useMemo(
    () =>
      (
        Object.values(G.players).map((player) => [player.name, player.id]) as Array<
          [string, PlayerId]
        >
      ).sort((a, b) => b[0].length - a[0].length),
    [G.players],
  );

  const tagged = useMemo<TaggedEntry[]>(() => {
    const rows: TaggedEntry[] = [];
    let previousMessage: string | null = null;

    for (const entry of G.log) {
      if (entry.message === previousMessage) {
        continue;
      }

      previousMessage = entry.message;
      rows.push({
        entry,
        player:
          entry.about ?? nameToId.find(([name]) => entry.message.startsWith(name))?.[1] ?? null,
      });
    }

    return rows.reverse();
  }, [G.log, nameToId]);

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

  return (
    <section className="chroniclePage" aria-label="Action log">
      <div className="chronicleFilters" role="group" aria-label="Filter the chronicle by player">
        {/* The all-filter is a disc like the four beside it, bearing Π for pantes
            — all of them. A text pill among four glaze discs read as a different
            kind of control, when it is the same control set to everyone. */}
        <button
          aria-label="Every deed"
          aria-pressed={filter === "all"}
          className={
            filter === "all" ? "chronFilter chronFilterAll on" : "chronFilter chronFilterAll"
          }
          onClick={() => setFilter("all")}
          title="Every deed"
          type="button"
        >
          <span className="label">Π</span>
        </button>
        {PLAYER_GLAZE_LIST.map(({ id, name, color, blazon }) => (
          <button
            aria-label={`Only ${name}'s deeds`}
            aria-pressed={filter === id}
            className={filter === id ? "chronFilter on" : "chronFilter"}
            key={id}
            onClick={() => setFilter((current) => (current === id ? "all" : id))}
            style={{ background: color } as CSSProperties}
            title={name}
            type="button"
          >
            <span className="label">{blazon}</span>
          </button>
        ))}
      </div>

      <div className="chronicleList" tabIndex={0}>
        {groups.length === 0 ? (
          <p className="chronicleEmpty body-em">No deeds recorded here yet.</p>
        ) : null}
        {groups.map((group) => (
          <div key={`${group.season}-${group.rows[0].entry.id}`}>
            <div className="chronSeason label">
              {seasonLabel(group.season)} · {yearLabel(group.season)}
            </div>
            {group.rows.map(({ entry, player }) => (
              <p
                className={player ? "entry entryOwned body" : "entry body"}
                key={entry.id}
                style={player ? ({ "--line-color": glazeOf(player) } as CSSProperties) : undefined}
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
