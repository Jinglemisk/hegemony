import type { GlyphId } from "../../../ui/icons/glyphs";
import { Icon } from "../../../ui/icons/Icon";

/**
 * The shared title row for the two docked tablets — the act-side EmpireIntel and
 * the consult-side ConsultPanel. A page glyph, the page title, and an optional
 * count of whatever the page lists: both tablets are titled by the page they
 * show, not by the furniture.
 *
 * There is no close button. The tab spine is the only control the design gives a
 * tablet (proto.css `.tabs`), and pressing the open tab already closes its page —
 * a second dismiss in a second place is a second thing to learn for nothing.
 */
export function LedgerPanelHeader({
  title,
  glyph,
  count,
}: {
  title: string;
  glyph: GlyphId | undefined;
  /** How many entries the page below is showing, when that number is the point. */
  count?: number;
}) {
  return (
    <div className="panelTitle ledgerCardTitle">
      {glyph ? <Icon glyph={glyph} size="rail" className="titleIcon" /> : null}
      <h2 className="title">{title}</h2>
      {count === undefined ? null : <span className="panelCount caption num">{count}</span>}
    </div>
  );
}
