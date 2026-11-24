import type { ReactNode } from "react";
import type { HegemonyState, LogEntry, PlayerId, TableLoss } from "../../../game/types";
import { capitalize, formatPopName } from "../../../game/core/format";
import { RESOURCE_LABELS, buildingName, toRoman, formatSignedNumber } from "../../../ui/formatters";
import { RESOURCE_RASTERS } from "../../../ui/iconRegistry";
import { placeName } from "../../frame/moments";

/**
 * The lines a loss sheet lists (LossSheet.tsx), one thing each: its icon, its words, and
 * its count before and after (`change`), the after green when it helps and red when it
 * hurts.
 */
export type LossLine = {
  key: string;
  icon: string;
  text: ReactNode;
  change?: { from: number; to: number; higherIsBetter?: boolean };
  muted?: boolean;
};

/** One line for each thing the engine noted a riot or a revolt took. */
export function takenLines(
  G: HegemonyState,
  owner: PlayerId,
  taken: readonly TableLoss[],
): LossLine[] {
  return taken.map((loss, index): LossLine => {
    const change = { from: loss.from, to: loss.to };
    const key = `${loss.kind}-${index}`;
    switch (loss.kind) {
      case "stock":
        return {
          key,
          icon: RESOURCE_RASTERS[loss.resource],
          text: RESOURCE_LABELS[loss.resource],
          change,
        };
      case "building":
        return {
          key,
          icon: "buildings/ruin",
          text: (
            <>
              Buildings in <b>{placeName(G, owner, loss.tileId)}</b>:{" "}
              {buildingName(loss.building, G.definition.content)} burned
            </>
          ),
          change,
        };
      case "pops":
        return {
          key,
          icon: `pops/${loss.pop}`,
          text: (
            <>
              {capitalize(formatPopName(loss.pop, 2))} in <b>{placeName(G, owner, loss.tileId)}</b>
            </>
          ),
          change,
        };
      case "cards":
        return { key, icon: "events/convoy", text: "Held cards, given up for pops", change };
    }
  });
}

/** "Unrest tokens · happiness now −2", 3 → 0. Fewer tokens helps. */
export function tokensLine(tokens: number, level: number): LossLine {
  return {
    key: "tokens",
    icon: "unrest/unrest",
    text: `Unrest tokens · happiness now ${formatSignedNumber(level)}`,
    change: { from: tokens, to: 0, higherIsBetter: false },
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
