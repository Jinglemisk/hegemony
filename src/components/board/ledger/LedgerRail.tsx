import { memo, useMemo } from "react";
import { totalPops } from "../../../game/rules";
import { getOwnedHoldings } from "../helpers";
import { useGameUi } from "../GameUiContext";
import type { LedgerTab } from "../types";
import { TabRail } from "./TabRail";
import { LEDGER_TABS } from "./tabs";

/**
 * The left disc rail (ui-refit Step 2) — KYKLOS's menu spine, now the *act* rail
 * only (docs/archive/plans/two-panel.md): Cities, Pops, Build, Market. Codex + Victory moved
 * to the right consult rail.
 */
function LedgerRailComponent({
  activeTab,
  isOpen,
  onSelectTab,
}: {
  activeTab: LedgerTab;
  isOpen: boolean;
  onSelectTab: (tab: LedgerTab) => void;
}) {
  const { G, viewerId } = useGameUi();
  const holdings = useMemo(() => getOwnedHoldings(G, viewerId), [G, viewerId]);
  const popsUsed = holdings.reduce((sum, { settlement }) => sum + totalPops(settlement.pops), 0);

  return (
    <TabRail
      side="left"
      tabs={LEDGER_TABS}
      activeTab={activeTab}
      isOpen={isOpen}
      onSelectTab={onSelectTab}
      badges={{ pops: popsUsed }}
      ariaLabel="Ledger menu"
    />
  );
}

export const LedgerRail = memo(LedgerRailComponent);
