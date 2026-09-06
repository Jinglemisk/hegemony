import { memo, useMemo } from "react";
import {
  activeClaims,
  getLuxuryGood,
  luxuryHappinessBonus,
  ownedClaims,
  settlementCapacity,
  totalPops,
  unrestStatus,
} from "../../../game/rules";
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
  onBuildBuildingRequest,
  onBankSell,
  onBankBuy,
  onLadderRequest,
}: {
  activeTab: LedgerTab;
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
  // Claimed luxury goods (Phase 4): the dossier names what the player holds, which
  // of it is active, and what the standing offset is worth.
  const claims = ownedClaims(G, playerID);
  const active = activeClaims(G, playerID);
  const claimNames = claims
    .map((asset) => {
      const name = getLuxuryGood(G.definition.content, asset.goodId)?.name ?? asset.goodId;
      const suppressed = asset.suppressedTurns > 0 ? " (suppressed)" : "";
      const idle = !active.includes(asset) && asset.suppressedTurns === 0 ? " (over cap)" : "";
      return `${name}${suppressed}${idle}`;
    })
    .join(", ");

  const title = ledgerTabLabel(activeTab);
  const titleTab = LEDGER_TABS.find(({ tab }) => tab === activeTab);
  /* The empire strip, the unrest alarm and the standing effects are the CITIES
     page's own furniture (f-panels.html ~194–208), not a masthead the whole left
     tablet wears. They used to ride above every act page, which cost Pops, Build
     and Market ~200px of the little height they have — and put the alarm on four
     pages at once, when a page is allowed exactly one raised voice. */
  const showsEmpireFurniture = activeTab === "cities";

  return (
    <div className="empireIntel">
      {/* The card is titled by the page it is showing, not by the furniture. */}
      <LedgerPanelHeader title={title} glyph={titleTab?.glyph} src={titleTab?.src} />

      {showsEmpireFurniture ? (
        <>
          {/* Four counts: the shape of your position, on the page about your
              settlements. Icon + number, four times — the words "city" and
              "colony" that used to trail the first two are what their icons
              already say, and at a tablet's real width (236px of page) they were
              pushing the laurel count out through the frame. */}
          <div className="empireStrip" aria-label="Empire summary">
            <span className="est" title={`${cityCount} ${cityCount === 1 ? "city" : "cities"}`}>
              <Icon glyph="city" />
              <b className="stat-lg num">{cityCount}</b>
            </span>
            <span
              className="est"
              title={`${colonyCount} ${colonyCount === 1 ? "colony" : "colonies"}`}
            >
              <Icon glyph="colony" />
              <b className="stat-lg num">{colonyCount}</b>
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
            {claims.length > 0 ? (
              <span
                className="est"
                title={`Luxury goods: ${claimNames} (+${luxuryHappinessBonus(G, playerID)} effective happiness)`}
              >
                <Icon glyph="luxury" />
                <b className="stat-lg num">{active.length}</b>
                <span className="label num">/{claims.length}</span>
              </span>
            ) : null}
          </div>

          <UnrestAlarm
            status={unrest}
            popLossThreshold={G.ruleset.economy.unrest.popLossThreshold}
          />

          <ActiveEffectsList variant="ledger" />
        </>
      ) : null}

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
