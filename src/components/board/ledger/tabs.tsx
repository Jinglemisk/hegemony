import type { GlyphId } from "../../../ui/icons/glyphs";
import type { ConsultTab, EmpireTab, LedgerTab } from "../types";

/**
 * The two rails' pages, in disc order. The two-panel law (docs/archive/plans/two-panel.md):
 * the LEFT rail is what you *act on* (Cities/Pops/Build/Market), the RIGHT rail is
 * what you *consult* (Chronicle/Codex/Victory). Each list is read by both its rail
 * (which draws the discs) and its panel (which titles itself from the open page), so
 * a disc and its page can never disagree about what they are called.
 */
export const LEDGER_TABS: Array<{
  tab: LedgerTab;
  label: string;
  glyph: GlyphId;
  /** What the PAGE calls itself, when that is not what the tab is called. A tab
   *  is a spine label — one word, so four of them fit a 44px rail; a page has a
   *  masthead and can say what it actually is. */
  title?: string;
}> = [
  { tab: "cities", label: "Cities", glyph: "city" },
  { tab: "pops", label: "Pops", glyph: "citizens", title: "The Ladder" },
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
  //
  // The bema, not the temple front. The temple front is a pediment on columns and
  // so is the Cities tab's city — two near-identical pictures of unrelated things,
  // one on each rail. The speaker's platform is the agora as a PLACE, and a low
  // flight of steps shares its silhouette with nothing else on either spine.
  { tab: "agora", label: "Agora", glyph: "bema" },
];

const LABELS = new Map<EmpireTab, string>(
  [...LEDGER_TABS, ...CONSULT_TABS].map((entry) => [
    entry.tab,
    ("title" in entry ? entry.title : undefined) ?? entry.label,
  ]),
);

export function ledgerTabLabel(tab: EmpireTab): string {
  return LABELS.get(tab) ?? "Ledger";
}
