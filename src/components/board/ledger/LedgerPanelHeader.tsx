import type { GlyphId } from "../../../ui/icons/glyphs";
import { Icon } from "../../../ui/icons/Icon";

/**
 * The shared title row for the two docked tablets — the act-side EmpireIntel and
 * the consult-side ConsultPanel. A page glyph, the page title, and a close
 * button: both tablets are titled by the page they show, not by the furniture.
 */
export function LedgerPanelHeader({
  title,
  glyph,
  onClose,
}: {
  title: string;
  glyph: GlyphId | undefined;
  onClose: () => void;
}) {
  return (
    <div className="panelTitle ledgerCardTitle">
      {glyph ? <Icon glyph={glyph} size="rail" className="titleIcon" /> : null}
      <h2 className="title">{title}</h2>
      <button
        className="ledgerCloseButton"
        onClick={onClose}
        aria-label={`Close the ${title} page`}
        title="Close"
        type="button"
      >
        <Icon glyph="cross" />
      </button>
    </div>
  );
}
