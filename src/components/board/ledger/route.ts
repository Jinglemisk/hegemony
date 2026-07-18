import type { ConsultTab, LedgerTab } from "../types";

/**
 * A panel's current page as a ROUTE, not a bare tab enum (docs/feat/two-panel.md).
 * Modelled from day one even while the stack is only ever one deep: retrofitting a
 * route onto an enum is painful, widening a shallow route is not. The two extra
 * fields are placeholders for the pieces that land with Phase 3:
 *
 * - `entry` — a deep-link target within the page (a data id), set when an
 *   `AnnotatedText` term is clicked. Unused until deep-links land.
 * - `scroll` — this frame's scroll offset, restored on history "back" once the
 *   per-panel history stack exists. Unused until the stack lands.
 *
 * Until then a route is effectively just `{ view }`, so this is behaviour-neutral.
 */
export type PanelRoute<View extends string> = {
  view: View;
  entry?: string;
  scroll?: number;
};

export type LedgerRoute = PanelRoute<LedgerTab>;
export type ConsultRoute = PanelRoute<ConsultTab>;

/** Build a fresh single-frame route for `view` (optionally deep-linked to `entry`). */
export function routeTo<View extends string>(view: View, entry?: string): PanelRoute<View> {
  return entry === undefined ? { view } : { view, entry };
}
