import type { ReactNode } from "react";
import { AtlasIcon, UiSprite } from "../../Sprites";
import type { EmpireTab } from "../types";

/**
 * The ledger's pages, in rail order. One list, read by both the rail (which draws
 * the discs) and the panel (which titles itself from the open page) — so a disc
 * and its page can never disagree about what they are called.
 */
export const LEDGER_TABS: Array<{ tab: EmpireTab; label: string; icon: ReactNode }> = [
  { tab: "cities", label: "Cities", icon: <AtlasIcon icon="city" className="railDiscIcon" /> },
  { tab: "pops", label: "Pops", icon: <AtlasIcon icon="citizens" className="railDiscIcon" /> },
  { tab: "buildings", label: "Build", icon: <AtlasIcon icon="workshop" className="railDiscIcon" /> },
  { tab: "market", label: "Market", icon: <AtlasIcon icon="marketplace" className="railDiscIcon" /> },
  { tab: "victory", label: "Victory", icon: <UiSprite item="victoryPoint" className="railDiscIcon" /> },
  { tab: "codex", label: "Codex", icon: <UiSprite item="seal" className="railDiscIcon" /> }
];

const LABELS = new Map(LEDGER_TABS.map(({ tab, label }) => [tab, label]));

export function ledgerTabLabel(tab: EmpireTab): string {
  return LABELS.get(tab) ?? "Ledger";
}
