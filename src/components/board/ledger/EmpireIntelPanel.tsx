import { memo, useMemo } from "react";
import { settlementCapacity, totalPops, unrestStatus } from "../../../game/rules";
import type { BuildingId, PopType, TradableMaterial } from "../../../game/types";
import { getOwnedHoldings } from "../helpers";
import type { LedgerTab } from "../types";
import { BuildingsTab } from "./BuildingsTab";
import { CitiesTab } from "./CitiesTab";
import { LedgerPanelHeader } from "./LedgerPanelHeader";
import { UnrestAlarm } from "./UnrestAlarm";
import { Icon } from "../../../ui/icons/Icon";
import { MarketTab } from "./MarketTab";
import { PopsTab } from "./PopsTab";
import { LEDGER_TABS, ledgerTabLabel } from "./tabs";
import { victoryCardsHeld } from "../../../game/victory";
import { useGameUi } from "../GameUiContext";
import { ActiveEffectsList } from "../../ActiveEffectsList";

function EmpireIntelPanelComponent({
  activeTab,
  onClose,
  onBuildBuildingRequest,
  onBankSell,
  onBankBuy,
  onLadderRequest,
}: {
  activeTab: LedgerTab;
  onClose: () => void;
  onBuildBuildingRequest: (tileId: string, buildingId: BuildingId) => void;
  onBankSell: (material: TradableMaterial) => void;
  onBankBuy: (material: TradableMaterial) => void;
  onLadderRequest: (request: { kind: "promote" | "demote"; from: PopType }) => void;
}) {
  const { G, viewerId: playerID } = useGameUi();
  const holdings = useMemo(() => getOwnedHoldings(G, playerID), [G, playerID]);
  const cityCount = holdings.filter(({ settlement }) => settlement.kind !== "colony").length;
  const colonyCount = holdings.length - cityCount;
  const popsUsed = holdings.reduce((sum, { settlement }) => sum + totalPops(settlement.pops), 0);
  const popsCapacity = holdings.reduce(
    (sum, { settlement }) => sum + settlementCapacity(settlement, G.ruleset, G.definition.content),
    0,
  );
  const unrest = unrestStatus(G, playerID);
  const cardsHeld = victoryCardsHeld(G, playerID);

  const title = ledgerTabLabel(activeTab);
  const titleGlyph = LEDGER_TABS.find(({ tab }) => tab === activeTab)?.glyph;

  return (
    <div className="empireIntel">
      {/* The card is titled by the page it is showing, not by the furniture. */}
      <LedgerPanelHeader title={title} glyph={titleGlyph} onClose={onClose} />

      {/* The empire strip: four counts, the same four on every act page, so the
          shape of your position is constant while the page under it changes. */}
      <div className="empireStrip" aria-label="Empire summary">
        <span className="est" title={`${cityCount} ${cityCount === 1 ? "city" : "cities"}`}>
          <Icon glyph="city" />
          <b className="stat-lg num">{cityCount}</b>
          <span className="label">{cityCount === 1 ? "city" : "cities"}</span>
        </span>
        <span className="est" title={`${colonyCount} ${colonyCount === 1 ? "colony" : "colonies"}`}>
          <Icon glyph="colony" />
          <b className="stat-lg num">{colonyCount}</b>
          <span className="label">{colonyCount === 1 ? "colony" : "colonies"}</span>
        </span>
        <span className="est" title={`${popsUsed} of ${popsCapacity} population`}>
          <Icon glyph="citizens" />
          <b className="stat-lg num">{popsUsed}</b>
          <span className="label num">/{popsCapacity}</span>
        </span>
        <span
          className="est"
          title={`${cardsHeld} of ${G.ruleset.victory.cardsToWin} laurels held`}
        >
          <Icon glyph="laurel" />
          <b className="stat-lg num">{cardsHeld}</b>
          <span className="label num">/{G.ruleset.victory.cardsToWin}</span>
        </span>
      </div>

      <UnrestAlarm status={unrest} popLossThreshold={G.ruleset.economy.unrest.popLossThreshold} />

      <ActiveEffectsList variant="ledger" />

      <div className="intelBody">
        {activeTab === "cities" ? (
          <CitiesTab holdings={holdings} onBuildBuildingRequest={onBuildBuildingRequest} />
        ) : null}
        {activeTab === "buildings" ? (
          <BuildingsTab holdings={holdings} onBuildBuildingRequest={onBuildBuildingRequest} />
        ) : null}
        {activeTab === "pops" ? (
          <PopsTab holdings={holdings} onLadderRequest={onLadderRequest} />
        ) : null}
        {activeTab === "market" ? (
          <MarketTab onBankSell={onBankSell} onBankBuy={onBankBuy} />
        ) : null}
      </div>
    </div>
  );
}

export const EmpireIntelPanel = memo(EmpireIntelPanelComponent);
