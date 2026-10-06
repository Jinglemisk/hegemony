import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { HegemonyState, LogEntry, LogMoment, PlayerId } from "../../game/types";
import { getOwnedSettlement } from "../../game/core/query";
import { settlementNameOf } from "../../ui/settlementNames";

/**
 * The toast lane: one card under the ticker for a moment another seat had (a bot's
 * moment never waits for a click). Moments queue in the order the engine wrote
 * them and one holds the lane at a time.
 *
 * To add a moment: give `LogMoment` a kind, pass it as `addLog`'s fourth argument
 * where the engine writes the Chronicle line, and say how it reads in
 * {@link presentMoment}. The lane (`ToastLane`) needs nothing else.
 */

const TOAST_MS = 4000;

export type Toast = {
  id: string;
  about: PlayerId;
  kicker: string;
  body: ReactNode;
  icon: string;
};

const POP_WORD = { freemen: ["freeman", "freemen"], citizens: ["citizen", "citizens"] } as const;

/** How one moment reads on its toast. */
function presentMoment(
  G: HegemonyState,
  about: PlayerId,
  moment: LogMoment,
): Omit<Toast, "id" | "about"> {
  const name = G.players[about].name;
  switch (moment.kind) {
    case "hunger": {
      const groups = new Map<string, number>();
      for (const { tileId, pop } of moment.leave)
        groups.set(`${tileId}:${pop}`, (groups.get(`${tileId}:${pop}`) ?? 0) + 1);
      const parts = [...groups].map(([k, n]) => {
        const [tileId, pop] = k.split(":") as [string, "freemen" | "citizens"];
        const settlement = getOwnedSettlement(G, tileId, about);
        const where = settlement ? settlementNameOf(G.board.tiles, settlement.id) : tileId;
        return (
          <span key={k}>
            {n === 1 ? "a" : n} {POP_WORD[pop][n === 1 ? 0 : 1]} left <b>{where}</b>
          </span>
        );
      });
      const count = moment.leave.length;
      return {
        kicker: `Hunger · ${name}`,
        icon: "pops/pop-loss",
        body: (
          <>
            Could not feed {count} {count === 1 ? "mouth" : "mouths"}:{" "}
            {parts.flatMap((part, i) => (i ? [", ", part] : [part]))}.
          </>
        ),
      };
    }
    case "ideaBought": {
      const idea = G.definition.content.nationalIdeas.find((i) => i.id === moment.ideaId);
      return {
        kicker: `${name} bought a National Idea`,
        icon: "assembly/national-idea",
        body: (
          <>
            <b>{idea?.name ?? moment.ideaId}</b>: {idea?.text}
          </>
        ),
      };
    }
  }
}

/**
 * Queue every moment written after mount about a seat other than the viewer.
 * `replayFrom` starts the queue earlier in the log (a dev shortcut for the gate).
 */
export function useMomentToasts(
  G: HegemonyState,
  viewerId: PlayerId,
  replayFrom: number | null = null,
) {
  const seen = useRef(replayFrom ?? G.log.length);
  const [queue, setQueue] = useState<Toast[]>([]);

  useEffect(() => {
    // A new game starts a shorter log: nothing in it is news.
    if (G.log.length < seen.current) seen.current = G.log.length;
    const fresh = G.log
      .slice(seen.current)
      .filter((entry): entry is LogEntry & { moment: LogMoment; about: PlayerId } =>
        Boolean(entry.moment && entry.about && entry.about !== viewerId),
      )
      .map((entry) => ({
        id: entry.id,
        about: entry.about,
        ...presentMoment(G, entry.about, entry.moment),
      }));
    seen.current = G.log.length;
    if (fresh.length) setQueue((current) => [...current, ...fresh]);
  }, [G, viewerId]);

  const toast = queue[0] ?? null;
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setQueue((current) => current.slice(1)), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return { toast, dismiss: () => setQueue((current) => current.slice(1)) };
}
