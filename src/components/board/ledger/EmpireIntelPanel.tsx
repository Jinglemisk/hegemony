import { memo, useMemo } from "react";
import type { Phase } from "../../../game/controller";
import { settlementPopCapacity, totalPops, unrestStatus } from "../../../game/rules";
import type { UnrestStatus } from "../../../game/rules";
import type { BuildingId, HegemonyState, PlayerId } from "../../../game/types";
import { formatNumber } from "../../../ui/formatters";
import { AnnotatedText } from "../../AnnotatedText";
import { AtlasIcon } from "../../Sprites";
import { getOwnedHoldings } from "../helpers";
import type { EmpireTab } from "../types";
import { BuildingsTab } from "./BuildingsTab";
import { CitiesTab } from "./CitiesTab";
import { PopsTab } from "./PopsTab";

const UNREST_TITLES: Record<Exclude<UnrestStatus["tier"], "calm">, string> = {
  discontent: "Discontent",
  unrest: "Unrest",
  revolt: "Revolt"
};

/** Player-facing sentence for the ledger's unrest banner. Uses the status numbers +
 *  the ruleset threshold so the warning never disagrees with the engine. */
function unrestMessage(status: UnrestStatus, popLossThreshold: number): string {
  const happiness = formatNumber(status.happiness);

  if (status.tier === "revolt" || status.tier === "unrest") {
    return `Happiness ${happiness} — losing ${status.popsAtRisk} pops every turn until it recovers.`;
  }

  // discontent
  return `Happiness ${happiness} — pops start dying at ${popLossThreshold} happiness.`;
}

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
  const cityCount = holdings.filter(({ settlement }) => settlement.kind !== "colony").length;
  const colonyCount = holdings.length - cityCount;
  const popsUsed = holdings.reduce((sum, { settlement }) => sum + totalPops(settlement.pops), 0);
  const popsCapacity = holdings.reduce(
    (sum, { settlement }) => sum + settlementPopCapacity(settlement.kind, G.ruleset),
    0
  );
  const unrest = unrestStatus(G, playerID);
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
        </div>
      </div>

      <div className="empireSummary" aria-label="Empire summary">
        <span className="empireStat" title={`${cityCount} ${cityCount === 1 ? "city" : "cities"}`}>
          <AtlasIcon icon="city" className="empireStatIcon" />
          <strong>{cityCount}</strong>
        </span>
        <span className="empireStat" title={`${colonyCount} ${colonyCount === 1 ? "colony" : "colonies"}`}>
          <AtlasIcon icon="colony" className="empireStatIcon" />
          <strong>{colonyCount}</strong>
        </span>
        <span className="empireStat" title={`${popsUsed} of ${popsCapacity} population`}>
          <AtlasIcon icon="citizens" className="empireStatIcon" />
          <strong>
            {popsUsed}
            <span className="empireStatCap">/{popsCapacity}</span>
          </strong>
        </span>
      </div>

      {unrest.tier !== "calm" ? (
        <div
          className={`unrestBanner unrestBanner-${unrest.tier}`}
          role="status"
          title={
            [
              unrest.deficitTurns > 0 ? `${unrest.deficitTurns} turn(s) of food deficit` : null,
              unrest.timedModifiers > 0 ? `${unrest.timedModifiers} lingering unrest effect(s)` : null,
              unrest.totalDeaths > 0 ? `${unrest.totalDeaths} pops lost so far` : null
            ]
              .filter(Boolean)
              .join(" · ") || undefined
          }
        >
          <span className="unrestBannerTag">{UNREST_TITLES[unrest.tier]}</span>
          <AnnotatedText text={unrestMessage(unrest, G.ruleset.economy.unrest.popLossThreshold)} />
        </div>
      ) : null}

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
