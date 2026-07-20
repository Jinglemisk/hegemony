import { memo } from "react";
import type { ConsultTab } from "../types";
import { useGameUi } from "../GameUiContext";
import { ActionLogPanel } from "../command/ActionLogPanel";
import { AgoraTab } from "./AgoraTab";
import { CodexTab } from "./CodexTab";
import { VictoryTab } from "./VictoryTab";
import { CONSULT_TABS, ledgerTabLabel } from "./tabs";

/**
 * The right consult panel (docs/feat/two-panel.md): a floating card that mirrors the
 * left ledger card on the far edge, showing what you *consult* — the Chronicle (the
 * running log, formerly the edge drawer), the Codex (rules reference), Victory
 * (the race table) and the Agora (the Assembly's standing record). No empire summary or unrest banner — those are act-side, on the
 * left. Titled by the page it shows, like the ledger.
 */
function ConsultPanelComponent({
  activeTab,
  codexTarget,
  onClose
}: {
  activeTab: ConsultTab;
  /** A deep-link destination for the Codex (a rulebook chapter + nonce), or null. */
  codexTarget?: { chapter: string; nonce: number } | null;
  onClose: () => void;
}) {
  const { G, viewerId } = useGameUi();
  const title = ledgerTabLabel(activeTab);
  const titleIcon = CONSULT_TABS.find(({ tab }) => tab === activeTab)?.icon;

  return (
    <div className="empireIntel">
      <div className="panelTitle ledgerCardTitle">
        <span className="titleIcon" aria-hidden="true">
          {titleIcon}
        </span>
        <h2>{title}</h2>
        <button
          className="ledgerCloseButton"
          onClick={onClose}
          aria-label={`Close the ${title} page`}
          title="Close"
          type="button"
        >
          ×
        </button>
      </div>

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
