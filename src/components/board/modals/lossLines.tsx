import type { ReactNode } from "react";
import type { HegemonyState, LogEntry, PlayerId, PopLeave } from "../../../game/types";
import { formatPopLabel, toRoman } from "../../../ui/formatters";
import { sign } from "../../../ui/frameFormat";
import { Prose } from "../../AnnotatedText";
import { leaveParts } from "../../frame/moments";
import { Delta } from "../../frame/parts";

/** The lines a loss card lists (LossCard.tsx), one thing each. The line's icon names
 *  its term; a word the icon does not draw takes its own (`Prose`). */
export type LossLine = { key: string; icon: string; text: ReactNode; muted?: boolean };

/** "A slave left Korone." — one line per settlement and class. */
export function leaveLines(
  G: HegemonyState,
  owner: PlayerId,
  leave: readonly PopLeave[],
): LossLine[] {
  return leaveParts(G, owner, leave).map(({ key, n, pop, where }) => ({
    key,
    icon: `pops/${pop}`,
    text: (
      <>
        {n === 1 ? "A" : n} {formatPopLabel(pop, n)} left <b>{where}</b>.
      </>
    ),
  }));
}

/** "Unrest tokens 3 → 0. Happiness now −2." Fewer tokens helps. */
export function tokensLine(tokens: number, level: number): LossLine {
  return {
    key: "tokens",
    icon: "unrest/unrest",
    muted: true,
    text: (
      <>
        Unrest tokens <Delta from={tokens} higherIsBetter={false} to={0} />.{" "}
        <Prose links={false}>{`Happiness now ${sign(level)}.`}</Prose>
      </>
    ),
  };
}

/** Where play went once the loss passed the turn: on to a seat, or the year turned. */
export function nextFoot(G: HegemonyState, entry: LogEntry) {
  return {
    next:
      G.phase === "gameOver"
        ? "Then: the age ends"
        : G.year > entry.year
          ? "Then: the year turns"
          : `Then: ${G.players[G.currentPlayer].name}’s turn`,
    when: `Year ${toRoman(entry.year)}`,
  };
}
