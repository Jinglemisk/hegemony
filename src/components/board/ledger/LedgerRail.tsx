import { memo, useMemo } from "react";
import { totalPops } from "../../../game/rules";
import { victoryCardsHeld } from "../../../game/victory";
import { getOwnedHoldings } from "../helpers";
import { useGameUi } from "../GameUiContext";
import type { EmpireTab } from "../types";
import { LEDGER_TABS } from "./tabs";

/**
 * The left disc rail (ui-refit Step 2) — KYKLOS's menu spine. Six discs thread on
 * a thin glass spine and overhang the sea; each switches the floating ledger to
 * one of its pages, the Codex included. It replaces the horizontal `.intelTabs`
 * row; the page *contents* are untouched, only the way you reach them.
 *
 * The circle law: these are discs because you press them repeatedly. The one
 * square in the UI stays reserved for End Turn (Step 3).
 */

function LedgerRailComponent({
  activeTab,
  isOpen,
  onSelectTab
}: {
  activeTab: EmpireTab;
  isOpen: boolean;
  onSelectTab: (tab: EmpireTab) => void;
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
        {LEDGER_TABS.map(({ tab, label, icon }) => {
          const active = isOpen && activeTab === tab;
          const badge = badges[tab];

          return (
            <button
              aria-label={label}
              aria-pressed={active}
              className={active ? "railDisc railDiscActive" : "railDisc"}
              key={tab}
              onClick={() => onSelectTab(tab)}
              title={tab === "codex" ? "Codex — rules & reference (?)" : label}
              type="button"
            >
              {icon}
              {badge && badge > 0 ? <span className="railDiscBadge">{badge}</span> : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export const LedgerRail = memo(LedgerRailComponent);
