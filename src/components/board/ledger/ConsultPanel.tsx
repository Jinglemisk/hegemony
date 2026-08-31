import { memo } from "react";
import type { ConsultTab } from "../types";
import { useGameUi } from "../GameUiContext";
import { ActionLogPanel } from "../command/ActionLogPanel";
import { AgoraTab } from "./AgoraTab";
import { CodexTab } from "./CodexTab";
import { LedgerPanelHeader } from "./LedgerPanelHeader";
import { VictoryTab } from "./VictoryTab";
import { CONSULT_TABS, ledgerTabLabel } from "./tabs";

/**
 * The right consult panel (docs/archive/plans/two-panel.md): a floating card that mirrors the
 * left ledger card on the far edge, showing what you *consult* — the Chronicle (the
 * running log, formerly the edge drawer), the Codex (rules reference), Victory
 * (the race table) and the Agora (the Assembly's standing record). No empire summary or unrest banner — those are act-side, on the
 * left. Titled by the page it shows, like the ledger.
 */
function ConsultPanelComponent({
  activeTab,
  codexTarget,
}: {
  activeTab: ConsultTab;
  /** A deep-link destination for the Codex (a rulebook chapter + nonce), or null. */
  codexTarget?: { chapter: string; nonce: number } | null;
}) {
  const { G, viewerId } = useGameUi();
  const title = ledgerTabLabel(activeTab);
  const titleTab = CONSULT_TABS.find(({ tab }) => tab === activeTab);

  return (
    <div className="empireIntel">
      {/* The Chronicle's length is the one count worth printing, and the header
          is where the design puts it — a rail badge cannot hold three digits. */}
      <LedgerPanelHeader
        title={title}
        glyph={titleTab?.glyph}
        src={titleTab?.src}
        count={activeTab === "chronicle" ? G.log.length : undefined}
      />

      <div className="intelBody">
        {activeTab === "chronicle" ? <ActionLogPanel G={G} /> : null}
        {activeTab === "codex" ? <CodexTab G={G} target={codexTarget} /> : null}
        {activeTab === "victory" ? <VictoryTab G={G} playerID={viewerId} /> : null}
        {activeTab === "agora" ? <AgoraTab G={G} /> : null}
      </div>
    </div>
  );
}

export const ConsultPanel = memo(ConsultPanelComponent);
