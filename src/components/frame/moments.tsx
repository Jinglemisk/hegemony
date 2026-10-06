import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type {
  HegemonyState,
  LogEntry,
  LogMoment,
  PlayerId,
  PopLeave,
  PopType,
} from "../../game/types";
import { getOwnedSettlement } from "../../game/core/query";
import { titleChanges, titleHolders } from "../../game/victory";
import type { TitleChange, TitleHolders } from "../../game/victory";
import { settlementNameOf } from "../../ui/settlementNames";
import { titleValue } from "../../ui/frameFormat";

/**
 * The toast lane: one card under the ticker for a moment another seat had (a bot's
 * moment never waits for a click). Moments queue in the order the engine wrote
 * them and one holds the lane at a time.
 *
 * To add a moment: give `LogMoment` a kind, pass it as `addLog`'s fourth argument
 * where the engine writes the Chronicle line, and say how it reads in
 * {@link presentMoment}. The lane (`ToastLane`) needs nothing else.
 *
 * Each seat keeps its own place in the log, so in hotseat a seat taking the screen
 * reads what the others did since its last look. Title changes toast every seat,
 * its own included, read off the public standings.
 */

const TOAST_MS = 4000;

export type Toast = {
  id: string;
  about: PlayerId;
  kicker: string;
  body: ReactNode;
  icon: string;
};

const POP_WORD: Record<PopType, [string, string]> = {
  slaves: ["slave", "slaves"],
  freemen: ["freeman", "freemen"],
  citizens: ["citizen", "citizens"],
};

/** "a freeman left Argos, 2 slaves left Korone": one part per settlement and class. */
export function leaveParts(G: HegemonyState, owner: PlayerId, leave: readonly PopLeave[]) {
  const groups = new Map<string, number>();
  for (const { tileId, pop } of leave)
    groups.set(`${tileId}:${pop}`, (groups.get(`${tileId}:${pop}`) ?? 0) + 1);
  return [...groups].map(([key, n]) => {
    const [tileId, pop] = key.split(":") as [string, PopType];
    return { key, n, pop, where: placeName(G, owner, tileId) };
  });
}

export function placeName(G: HegemonyState, owner: PlayerId, tileId: string) {
  const settlement = getOwnedSettlement(G, tileId, owner);
  return settlement ? settlementNameOf(G.board.tiles, settlement.id) : tileId;
}

const joined = (parts: ReactNode[]) => parts.flatMap((part, i) => (i ? [", ", part] : [part]));

function leaveSentence(
  G: HegemonyState,
  owner: PlayerId,
  leave: readonly PopLeave[],
  opens = false,
) {
  return joined(
    leaveParts(G, owner, leave).map(({ key, n, pop, where }, i) => (
      <span key={key}>
        {n === 1 ? (opens && i === 0 ? "A" : "a") : n} {POP_WORD[pop][n === 1 ? 0 : 1]} left{" "}
        <b>{where}</b>
      </span>
    )),
  );
}

/** How one moment reads on its toast; null for a moment no seat is toasted. */
function presentMoment(
  G: HegemonyState,
  about: PlayerId,
  moment: LogMoment,
): Omit<Toast, "id" | "about"> | null {
  const name = G.players[about].name;
  switch (moment.kind) {
    case "hunger": {
      const count = moment.leave.length;
      return {
        kicker: `Hunger · ${name}`,
        icon: "pops/pop-loss",
        body: (
          <>
            Could not feed {count} {count === 1 ? "mouth" : "mouths"}:{" "}
            {leaveSentence(G, about, moment.leave)}.
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
    case "riot": {
      const rolled = moment.modifier ? `${moment.roll} + ${moment.modifier}` : String(moment.roll);
      return {
        kicker: `Riot · ${name}`,
        icon: "unrest/riot",
        body: (
          <>
            Rolled {rolled}: <b>{moment.rowLabel}</b>.{" "}
            {moment.left.length ? (
              <>{leaveSentence(G, about, moment.left, true)}.</>
            ) : (
              moment.outcomes.join(" ")
            )}
          </>
        ),
      };
    }
    case "revolt": {
      const gone = moment.left.length;
      const places = [...new Set(moment.left.map(({ tileId }) => placeName(G, about, tileId)))];
      return {
        kicker: `Revolt · ${name}`,
        icon: "unrest/revolt",
        body: gone ? (
          <>
            Half his slaves walked away:{" "}
            <b>
              {gone} of {moment.slaves}
            </b>
            , from {places.join(" and ")}.
          </>
        ) : (
          <>No slaves were left to walk away. His Unrest tokens cleared.</>
        ),
      };
    }
    case "yearCard":
      return null;
  }
}

/** A title changing hands, worded for the viewer: "You hold" for theirs. */
function presentTitle(G: HegemonyState, viewerId: PlayerId, change: TitleChange): Toast {
  const who = (seat: PlayerId) => (seat === viewerId ? "you" : G.players[seat].name);
  const id = `title-${change.card.id}-${change.to ?? "none"}-${G.log.length}`;
  if (!change.to) {
    return {
      id,
      about: change.from!,
      kicker: change.from === viewerId ? "You lost a title" : `${who(change.from!)} lost a title`,
      icon: `victory/${change.card.id}`,
      body: (
        <>
          Nobody holds <b>{change.card.name}</b> now.
        </>
      ),
    };
  }
  const holder = change.to === viewerId ? "You hold" : `${G.players[change.to].name} holds`;
  const runner = change.runnerUp;
  return {
    id,
    about: change.to,
    kicker: change.from ? `Title taken from ${who(change.from)}` : "Title taken",
    icon: `victory/${change.card.id}`,
    body: (
      <>
        {holder} <b>{change.card.name}</b>: {titleValue(change.card.metric, change.value)}
        {runner
          ? ` to ${runner.seat === viewerId ? "your" : `${G.players[runner.seat].name}'s`} ${runner.value}`
          : ""}
        .
      </>
    ),
  };
}

/**
 * Queue, for whoever holds the screen, every moment about another seat written since
 * that seat last looked, and every title that changed hands since then. `replayFrom`
 * and `titlesFrom` start the queue earlier (dev shortcuts for the gate).
 */
export function useMomentToasts(
  G: HegemonyState,
  viewerId: PlayerId,
  replayFrom: number | null = null,
  titlesFrom: HegemonyState | null = null,
) {
  const start = useRef(replayFrom ?? G.log.length);
  const cursors = useRef<Partial<Record<PlayerId, number>>>({});
  const firstTitles = useRef<TitleHolders>(titleHolders(titlesFrom ?? G));
  const titlesSeen = useRef<Partial<Record<PlayerId, TitleHolders>>>({});
  const queuedFor = useRef(viewerId);
  const [queue, setQueue] = useState<Toast[]>([]);

  useEffect(() => {
    const from = cursors.current[viewerId] ?? start.current;
    const moments = G.log
      .slice(from)
      .filter((entry): entry is LogEntry & { moment: LogMoment; about: PlayerId } =>
        Boolean(entry.moment && entry.about && entry.about !== viewerId),
      )
      .flatMap((entry) => {
        const toast = presentMoment(G, entry.about, entry.moment);
        return toast ? [{ id: entry.id, about: entry.about, ...toast }] : [];
      });
    const titles = titleChanges(G, titlesSeen.current[viewerId] ?? firstTitles.current).map(
      (change) => presentTitle(G, viewerId, change),
    );
    cursors.current[viewerId] = G.log.length;
    titlesSeen.current[viewerId] = titleHolders(G);
    const fresh = [...moments, ...titles];
    // A new viewer drops the last one's queue: it was worded for them.
    const sameViewer = queuedFor.current === viewerId;
    queuedFor.current = viewerId;
    if (fresh.length || !sameViewer)
      setQueue((current) => (sameViewer ? [...current, ...fresh] : fresh));
  }, [G, viewerId]);

  const toast = queue[0] ?? null;
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setQueue((current) => current.slice(1)), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return { toast, dismiss: () => setQueue((current) => current.slice(1)) };
}

/**
 * The newest moment of `kind` about the viewer written since this mounted (or since
 * `from`): the seat's own card for it, in hotseat. `dismiss` puts it away.
 */
export function useOwnMoment<K extends LogMoment["kind"]>(
  G: HegemonyState,
  viewerId: PlayerId,
  kind: K,
  enabled: boolean,
  from: number | null = null,
) {
  const seen = useRef(from ?? G.log.length);
  const [entry, setEntry] = useState<
    (LogEntry & { moment: Extract<LogMoment, { kind: K }> }) | null
  >(null);
  useEffect(() => {
    const fresh = G.log
      .slice(seen.current)
      .filter(
        (line): line is LogEntry & { moment: Extract<LogMoment, { kind: K }> } =>
          line.moment?.kind === kind && line.about === viewerId,
      )
      .at(-1);
    seen.current = G.log.length;
    if (enabled && fresh) setEntry(fresh);
  }, [G, viewerId, kind, enabled]);
  return { entry, dismiss: () => setEntry(null) };
}
