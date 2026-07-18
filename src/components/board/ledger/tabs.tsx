import type { ReactNode } from "react";
import { AtlasIcon, UiSprite } from "../../Sprites";
import type { ConsultTab, EmpireTab, LedgerTab } from "../types";

/**
 * The two rails' pages, in disc order. The two-panel law (docs/feat/two-panel.md):
 * the LEFT rail is what you *act on* (Cities/Pops/Build/Market), the RIGHT rail is
 * what you *consult* (Chronicle/Codex/Victory). Each list is read by both its rail
 * (which draws the discs) and its panel (which titles itself from the open page), so
 * a disc and its page can never disagree about what they are called.
 */
export const LEDGER_TABS: Array<{ tab: LedgerTab; label: string; icon: ReactNode }> = [
  { tab: "cities", label: "Cities", icon: <AtlasIcon icon="city" className="railDiscIcon" /> },
  { tab: "pops", label: "Pops", icon: <AtlasIcon icon="citizens" className="railDiscIcon" /> },
  { tab: "buildings", label: "Build", icon: <AtlasIcon icon="workshop" className="railDiscIcon" /> },
  { tab: "market", label: "Market", icon: <AtlasIcon icon="marketplace" className="railDiscIcon" /> }
];

export const CONSULT_TABS: Array<{ tab: ConsultTab; label: string; icon: ReactNode }> = [
  { tab: "chronicle", label: "Chronicle", icon: <UiSprite item="meander" className="railDiscIcon" /> },
  { tab: "codex", label: "Codex", icon: <UiSprite item="seal" className="railDiscIcon" /> },
  { tab: "victory", label: "Victory", icon: <UiSprite item="victoryPoint" className="railDiscIcon" /> }
];

const LABELS = new Map<EmpireTab, string>(
  [...LEDGER_TABS, ...CONSULT_TABS].map(({ tab, label }) => [tab, label])
);

export function ledgerTabLabel(tab: EmpireTab): string {
  return LABELS.get(tab) ?? "Ledger";
}
