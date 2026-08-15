import type { GlyphId } from "../../../ui/icons/glyphs";
import type { ConsultTab, EmpireTab, LedgerTab } from "../types";

/**
 * The two rails' pages, in disc order. The two-panel law (docs/archive/plans/two-panel.md):
 * the LEFT rail is what you *act on* (Cities/Pops/Build/Market), the RIGHT rail is
 * what you *consult* (Chronicle/Codex/Victory). Each list is read by both its rail
 * (which draws the discs) and its panel (which titles itself from the open page), so
 * a disc and its page can never disagree about what they are called.
 */
export const LEDGER_TABS: Array<{ tab: LedgerTab; label: string; glyph: GlyphId }> = [
  { tab: "cities", label: "Cities", glyph: "city" },
  { tab: "pops", label: "Pops", glyph: "citizens" },
  { tab: "buildings", label: "Build", glyph: "workshop" },
  // The market's glyph is the forum's scales: the bank is where things are
  // weighed, and drawing that twice with two pictures would be a lie.
  { tab: "market", label: "Market", glyph: "forum" },
];

export const CONSULT_TABS: Array<{ tab: ConsultTab; label: string; glyph: GlyphId }> = [
  { tab: "chronicle", label: "Chronicle", glyph: "chronicle" },
  { tab: "codex", label: "Codex", glyph: "codex" },
  { tab: "victory", label: "Victory", glyph: "laurel" },
  // The Agora is a consult page, not an act page: the Assembly panel is where you
  // act on politics, this is where you read what it left standing.
  { tab: "agora", label: "Agora", glyph: "temple" },
];

const LABELS = new Map<EmpireTab, string>(
  [...LEDGER_TABS, ...CONSULT_TABS].map(({ tab, label }) => [tab, label]),
);

export function ledgerTabLabel(tab: EmpireTab): string {
  return LABELS.get(tab) ?? "Ledger";
}
