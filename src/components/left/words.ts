import { createContext, useContext } from "react";
import type { ActionStatus } from "../../game/rules";
import type { Resources } from "../../game/types";
import { formatNumber } from "../../ui/formatters";
import { RESOURCE_ORDER } from "../../ui/resourceVisuals";
import { overlayScale } from "../chrome/canvas";

/**
 * The left window's wording, read off the engine's statuses: the shortfall ("1 stone
 * short") and an act's refusal; and the drawer's foot line, which the tile last
 * pointed at writes.
 */

/** A place's name in a sentence: "Rhodos". */
export const titleCase = (name: string) => name.charAt(0) + name.slice(1).toLowerCase();

/** What a store lacks for a price, "1 stone short", or null when it can pay. */
export function shortWords(store: Resources, cost: Partial<Resources>): string | null {
  const gaps = RESOURCE_ORDER.flatMap((resource) => {
    const gap = (cost[resource] ?? 0) - store[resource];
    return gap > 0 ? [`${formatNumber(gap)} ${resource}`] : [];
  });
  if (gaps.length === 0) return null;
  const listed = gaps.length > 1 ? `${gaps.slice(0, -1).join(", ")} and ${gaps.at(-1)}` : gaps[0];
  return `${listed} short`;
}

/** The engine's "not enough" lines, which the shortfall says better. */
const priceLine = (reason: string) =>
  reason === "Not enough resources." || /\bcosts? \d/.test(reason);

/**
 * Why an act cannot be taken, in the button's words: the turn gate first, then the
 * engine's own reason, with "Not enough resources." said as the shortfall
 * ("1 stone short"). Null when the act is open.
 */
export function refusal(
  status: ActionStatus,
  turnBlocked: string | null,
  store: Resources,
): string | null {
  if (turnBlocked) return turnBlocked;
  if (status.can) return null;
  const rule = status.reasons.find((reason) => !priceLine(reason));
  return rule ?? shortWords(store, status.cost ?? {}) ?? status.reasons[0] ?? "Not now.";
}

/** Where the offer composer opens from the left window: the hand's row, at its centre
 *  (x 624 + 480 / 2, y 900 − 72 in design px), so it rises clear of the drawer and the
 *  place panel. In screen px, as a popover's anchor is. */
export function composeAnchor(): DOMRect {
  const k = overlayScale();
  return new DOMRect(864 * k - 1, 828 * k, 2, 1);
}

/** The sentence a drawer's tile writes in its foot line: a bold title, then the rest. */
export type FootLine = { key: string; title: string; line: string };

export const FootContext = createContext<{
  lit: string | null;
  point: (line: FootLine) => void;
}>({ lit: null, point: () => {} });

/** A tile's pointer and focus handlers: the tile last pointed at writes the foot line. */
export function usePoint(line: FootLine) {
  const { lit, point } = useContext(FootContext);
  const on = () => point(line);
  return { lit: lit === line.key, on: { onPointerEnter: on, onFocus: on } };
}
