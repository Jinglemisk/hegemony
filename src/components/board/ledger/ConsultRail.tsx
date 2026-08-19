import { memo } from "react";
import { useGameUi } from "../GameUiContext";
import type { ConsultTab } from "../types";
import { TabRail } from "./TabRail";
import { CONSULT_TABS } from "./tabs";

/**
 * The right disc rail (docs/archive/plans/two-panel.md) — the *consult* rail, mirroring the
 * left `.ledgerRail` on the far edge with discs overhanging inward. Chronicle, Codex,
 * Victory and the Agora: pages you read, not act on. The player dossier disc joins in Phase 3.
 *
 * No badges. A rail badge is a 15px pill, and this rail was putting a three-digit
 * Chronicle length into one while also badging Victory and the Agora — three
 * counts competing on a spine whose whole job is "which page". The design badges
 * one tab in the whole UI (Pops, on the left); the Chronicle's count moved to its
 * own panel header, which can hold it. The numbers still live in the tooltips.
 */
function ConsultRailComponent({
  activeTab,
  isOpen,
  onSelectTab,
}: {
  activeTab: ConsultTab;
  isOpen: boolean;
  onSelectTab: (tab: ConsultTab) => void;
}) {
  const { G } = useGameUi();

  return (
    <TabRail
      side="right"
      tabs={CONSULT_TABS}
      activeTab={activeTab}
      isOpen={isOpen}
      onSelectTab={onSelectTab}
      ariaLabel="Consult menu"
      tabTitle={(tab) =>
        tab === "codex"
          ? "Codex — rules & reference (?)"
          : tab === "chronicle"
            ? `Chronicle — ${G.log.length} entries`
            : tab === "agora"
              ? `Agora — ${G.activeLaws.length} standing law${G.activeLaws.length === 1 ? "" : "s"}`
              : "Victory"
      }
    />
  );
}

export const ConsultRail = memo(ConsultRailComponent);
