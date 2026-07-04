import { memo, useMemo } from "react";
import type { Phase } from "../../../game/controller";
import type { BuildingId, HegemonyState, PlayerId } from "../../../game/types";
import { AtlasIcon } from "../../Sprites";
import { getOwnedHoldings } from "../helpers";
import type { EmpireTab } from "../types";
import { BuildingsTab } from "./BuildingsTab";
import { CitiesTab } from "./CitiesTab";
import { PopsTab } from "./PopsTab";

function EmpireIntelPanelComponent({
  G,
  playerID,
  activeTab,
  phase,
  isActive,
  onTabChange,
  onBuildBuildingRequest
}: {
  G: HegemonyState;
  playerID: PlayerId;
  activeTab: EmpireTab;
  phase: Phase;
  isActive: boolean;
  onTabChange: (tab: EmpireTab) => void;
  onBuildBuildingRequest: (tileId: string, buildingId: BuildingId) => void;
}) {
  const holdings = useMemo(() => getOwnedHoldings(G, playerID), [G, playerID]);
  const tabs: Array<{ id: EmpireTab; label: string }> = [
    { id: "cities", label: "Cities" },
    { id: "buildings", label: "Buildings" },
    { id: "pops", label: "Pops" }
  ];

  return (
    <div className="empireIntel">
      <div className="panelTitle compactPanelTitle">
        <AtlasIcon icon="city" className="titleIcon" />
        <div>
          <h2>Ledger</h2>
          <span>{holdings.length} holdings</span>
        </div>
      </div>

      <div className="intelTabs" role="tablist" aria-label="Empire information">
        {tabs.map((tab) => (
          <button
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? "activeIntelTab" : ""}
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="intelBody">
        {activeTab === "cities" ? (
          <CitiesTab
            G={G}
            holdings={holdings}
            isActive={isActive}
            phase={phase}
            playerID={playerID}
            onBuildBuildingRequest={onBuildBuildingRequest}
          />
        ) : null}
        {activeTab === "buildings" ? (
          <BuildingsTab
            G={G}
            holdings={holdings}
            isActive={isActive}
            phase={phase}
            playerID={playerID}
            onBuildBuildingRequest={onBuildBuildingRequest}
          />
        ) : null}
        {activeTab === "pops" ? (
          <PopsTab G={G} holdings={holdings} playerID={playerID} />
        ) : null}
      </div>
    </div>
  );
}

export const EmpireIntelPanel = memo(EmpireIntelPanelComponent);
