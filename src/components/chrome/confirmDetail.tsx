import type { ReactNode } from "react";
import type { GameCommand } from "../../game/legalMoves";
import type { HegemonyState, PlayerId, Resources } from "../../game/types";
import { previewSpend, type ConfirmChange } from "../../ui/confirmPreview";
import { formatResourceCost } from "../../ui/formatters";
import { RESOURCE_ORDER } from "../../ui/resourceVisuals";
import { Delta } from "../frame/parts";

/** A capitalised sentence with its own stop: "then pick a pop" → "Then pick a pop." */
function sentence(words: string) {
  const text = words.trim();
  if (!text) return "";
  const capital = `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
  return /[.!?…]$/.test(capital) ? capital : `${capital}.`;
}

/**
 * The one format of every confirm's detail line:
 * "This will cost 2 food: Food 10 → 8, Happiness −2 → −3. A Riot starts at turn end. Then …"
 * — the price in words, each changed store and level capitalised with its after value a
 * `Delta`, then the line warning, then the caller's note. No caller builds this by hand.
 */
export function ConfirmDetail({
  cost,
  changes,
  warn,
  note,
}: {
  cost?: Partial<Resources>;
  changes: readonly ConfirmChange[];
  warn?: string | null;
  note?: string | null;
}) {
  const paid = cost && RESOURCE_ORDER.some((resource) => (cost[resource] ?? 0) > 0);
  const head = paid ? `This will cost ${formatResourceCost(cost).toLowerCase()}` : "";
  const parts: ReactNode[] = [];
  if (head || changes.length) {
    parts.push(
      <span key="cost">
        {head}
        {head && changes.length ? ": " : null}
        {changes.map((change, index) => (
          <span key={change.label}>
            {index > 0 ? ", " : null}
            {`${change.label} `}
            <Delta
              format={change.format}
              from={change.from}
              higherIsBetter={change.higherIsBetter}
              to={change.to}
            />
          </span>
        ))}
        .
      </span>,
    );
  }
  for (const [key, words] of [
    ["warn", warn],
    ["note", note],
  ] as const) {
    if (!words) continue;
    parts.push(
      <span className={key === "warn" ? "ch-confirm-warn" : undefined} key={key}>
        {parts.length ? " " : null}
        {sentence(words)}
      </span>,
    );
  }
  return parts.length ? <>{parts}</> : null;
}

/** `previewSpend` read straight into the confirm's detail line. */
export function SpendDetail({
  G,
  viewerId,
  command,
  cost,
  gets,
  extra = [],
  note,
}: {
  G: HegemonyState;
  viewerId: PlayerId;
  command?: GameCommand | readonly GameCommand[];
  cost?: Partial<Resources>;
  gets?: Partial<Resources>;
  /** Changes beyond the store and the level: a place's room and yield. */
  extra?: readonly ConfirmChange[];
  note?: string | null;
}) {
  const { changes, warn } = previewSpend(G, viewerId, { command, cost, gets });
  return <ConfirmDetail changes={[...changes, ...extra]} cost={cost} note={note} warn={warn} />;
}
