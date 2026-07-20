import { memo } from "react";
import { victoryCardsHeld } from "../../../game/victory";
import { useGameUi } from "../GameUiContext";
import type { ConsultTab } from "../types";
import { DiscRail } from "./DiscRail";
import { CONSULT_TABS } from "./tabs";

/**
 * The right disc rail (docs/feat/two-panel.md) — the *consult* rail, mirroring the
 * left `.ledgerRail` on the far edge with discs overhanging inward. Chronicle, Codex,
 * Victory and the Agora: pages you read, not act on. The player dossier disc joins in Phase 3.
 */
function ConsultRailComponent({
  activeTab,
  isOpen,
  onSelectTab
}: {
  activeTab: ConsultTab;
  isOpen: boolean;
  onSelectTab: (tab: ConsultTab) => void;
}) {
  const { G, viewerId } = useGameUi();
  const cardsHeld = victoryCardsHeld(G, viewerId);

  return (
    <DiscRail
      side="right"
      tabs={CONSULT_TABS}
      activeTab={activeTab}
      isOpen={isOpen}
      onSelectTab={onSelectTab}
      badges={{ victory: cardsHeld, chronicle: G.log.length, agora: G.activeLaws.length }}
      ariaLabel="Consult menu"
      discTitle={(tab) =>
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
