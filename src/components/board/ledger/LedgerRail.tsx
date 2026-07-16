import { memo, useMemo, type ReactNode } from "react";
import { totalPops } from "../../../game/rules";
import { victoryCardsHeld } from "../../../game/victory";
import { AtlasIcon, UiSprite } from "../../Sprites";
import { getOwnedHoldings } from "../helpers";
import { useGameUi } from "../GameUiContext";
import type { EmpireTab } from "../types";

/**
 * The left disc rail (ui-refit Step 2) — KYKLOS's menu spine. Six discs thread on
 * a thin glass spine and overhang the sea; five switch the floating ledger to a
 * tab, the sixth (Codex) opens the compendium. It replaces the horizontal
 * `.intelTabs` row; the tab *contents* are untouched, only the way you reach them.
 *
 * The circle law: these are discs because you press them repeatedly. The one
 * square in the UI stays reserved for End Turn (Step 3).
 */

const RAIL_TABS: Array<{ tab: EmpireTab; label: string; icon: ReactNode }> = [
  { tab: "cities", label: "Cities", icon: <AtlasIcon icon="city" className="railDiscIcon" /> },
  { tab: "pops", label: "Pops", icon: <AtlasIcon icon="citizens" className="railDiscIcon" /> },
  { tab: "buildings", label: "Build", icon: <AtlasIcon icon="workshop" className="railDiscIcon" /> },
  { tab: "market", label: "Market", icon: <AtlasIcon icon="marketplace" className="railDiscIcon" /> },
  { tab: "victory", label: "Victory", icon: <UiSprite item="victoryPoint" className="railDiscIcon" /> }
];

function LedgerRailComponent({
  activeTab,
  isOpen,
  onSelectTab,
  onOpenCodex
}: {
  activeTab: EmpireTab;
  isOpen: boolean;
  onSelectTab: (tab: EmpireTab) => void;
  onOpenCodex: () => void;
}) {
  const { G, viewerId } = useGameUi();
  const holdings = useMemo(() => getOwnedHoldings(G, viewerId), [G, viewerId]);
  const popsUsed = holdings.reduce((sum, { settlement }) => sum + totalPops(settlement.pops), 0);
  const cardsHeld = victoryCardsHeld(G, viewerId);
  const badges: Partial<Record<EmpireTab, number>> = { pops: popsUsed, victory: cardsHeld };

  return (
    <nav className="ledgerRail" aria-label="Ledger menu">
      <div className="ledgerRailSpine" aria-hidden="true" />
      <div className="ledgerRailDiscs">
        {RAIL_TABS.map(({ tab, label, icon }) => {
          const active = isOpen && activeTab === tab;
          const badge = badges[tab];

          return (
            <button
              aria-label={label}
              aria-pressed={active}
              className={active ? "railDisc railDiscActive" : "railDisc"}
              key={tab}
              onClick={() => onSelectTab(tab)}
              title={label}
              type="button"
            >
              {icon}
              {badge && badge > 0 ? <span className="railDiscBadge">{badge}</span> : null}
            </button>
          );
        })}

        <button
          aria-label="Open the compendium"
          className="railDisc railDiscCodex"
          onClick={onOpenCodex}
          title="Codex — rules & reference (?)"
          type="button"
        >
          <UiSprite item="seal" className="railDiscIcon" />
        </button>
      </div>
    </nav>
  );
}

export const LedgerRail = memo(LedgerRailComponent);
