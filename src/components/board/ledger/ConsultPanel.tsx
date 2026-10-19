import { memo } from "react";
import type { ConsultTab } from "../types";
import { useGameUi } from "../GameUiContext";
import { AgoraTab } from "./AgoraTab";
import { CodexTab } from "./CodexTab";
import { VictoryTab } from "./VictoryTab";

/**
 * The consult page dropped from the right strip: the Codex (rules reference), Victory
 * (the race table) or the Agora (the Assembly's standing record). The strip names the
 * open page, so the page carries no title of its own. The Chronicle is the ticker's.
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

  return (
    <div className="empireIntel">
      <div className="intelBody">
        {activeTab === "codex" ? <CodexTab G={G} target={codexTarget} /> : null}
        {activeTab === "victory" ? <VictoryTab G={G} playerID={viewerId} /> : null}
        {activeTab === "agora" ? <AgoraTab G={G} playerID={viewerId} /> : null}
      </div>
    </div>
  );
}

export const ConsultPanel = memo(ConsultPanelComponent);
