import type { ReactNode } from "react";
import type { HegemonyState, LogEntry, PlayerId, PopLeave } from "../../../game/types";
import { formatPopLabel, toRoman } from "../../../ui/formatters";
import { sign } from "../../../ui/frameFormat";
import { leaveParts } from "../../frame/moments";

/** The lines a loss card lists (LossCard.tsx), one thing each. */
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

/** "Unrest tokens 3 → 0. Happiness now −2." */
export function tokensLine(tokens: number, level: number): LossLine {
  return {
    key: "tokens",
    icon: "unrest/unrest",
    muted: true,
    text: `Unrest tokens ${tokens} → 0. Happiness now ${sign(level)}.`,
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
