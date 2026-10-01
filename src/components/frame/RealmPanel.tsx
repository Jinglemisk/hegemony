import type { CSSProperties } from "react";
import {
  activeClaims,
  luxuryHappinessBonus,
  ownedClaims,
  settlementCapacity,
  totalPops,
  unrestStatus,
} from "../../game/rules";
import type { BuildingId, HexTile, PopType, Settlement, TradableMaterial } from "../../game/types";
import { victoryCardsHeld } from "../../game/victory";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";
import { settlementNames } from "../../ui/settlementNames";
import { ActiveEffectsList } from "../ActiveEffectsList";
import { useGameUi } from "../board/GameUiContext";
import { getOwnedHoldings } from "../board/helpers";
import { BuildingsTab } from "../board/ledger/BuildingsTab";
import { CitiesTab } from "../board/ledger/CitiesTab";
import { MarketTab } from "../board/ledger/MarketTab";
import { PopsTab } from "../board/ledger/PopsTab";
import { UnrestAlarm } from "../board/ledger/UnrestAlarm";
import type { LedgerTab } from "../board/types";
import type { DiscGroup } from "./discs";
import { Ico } from "./parts";
import { SettlementPage } from "./SettlementPage";
import { VerbDiscs } from "./VerbDiscs";

export type RealmTab = LedgerTab | "subject";

const TABS: Array<{ tab: LedgerTab; label: string }> = [
  { tab: "cities", label: "Cities" },
  { tab: "pops", label: "Ladder" },
  { tab: "buildings", label: "Build" },
  { tab: "market", label: "Market" },
];

/**
 * The realm sheet, bottom left: the verb discs ride its curved edge; its body is
 * the ledger — the ruler's head, four pages and the subject settlement's page.
 */
export function RealmPanel({
  tab,
  onTab,
  subject,
  groups,
  onBuildBuildingRequest,
  onBankSell,
  onBankBuy,
  onLadderRequest,
}: {
  tab: RealmTab;
  onTab: (tab: RealmTab) => void;
  /** The settlement the subject tab is open on, when the viewer holds one. */
  subject: { tile: HexTile; settlement: Settlement } | null;
  groups: DiscGroup[];
  onBuildBuildingRequest: (tileId: string, buildingId: BuildingId) => void;
  onBankSell: (material: TradableMaterial) => void;
  onBankBuy: (material: TradableMaterial) => void;
  onLadderRequest: (request: { kind: "promote" | "demote"; from: PopType }) => void;
}) {
  const { G, viewerId } = useGameUi();
  const glaze = PLAYER_GLAZES[viewerId];
  const holdings = getOwnedHoldings(G, viewerId);
  const cities = holdings.filter(({ settlement }) => settlement.kind !== "colony").length;
  const pops = holdings.reduce((sum, { settlement }) => sum + totalPops(settlement.pops), 0);
  const capacity = holdings.reduce(
    (sum, { settlement }) => sum + settlementCapacity(settlement, G.ruleset, G.definition.content),
    0,
  );
  const laurels = victoryCardsHeld(G, viewerId);
  // Claimed luxury goods: how many are held, and how many are active right now.
  const claims = ownedClaims(G, viewerId);
  const active = activeClaims(G, viewerId);
  const subjectName = subject ? settlementNames(G.board.tiles).get(subject.settlement.id) : null;
  const shown: RealmTab = tab === "subject" && !subject ? "cities" : tab;

  return (
    <section aria-label="Realm" className="realm" data-c="realm" data-exclude>
      <VerbDiscs groups={groups} store={G.players[viewerId].resources} />
      <div className="realm-body">
        <header className="realm-head" data-c="realm-head">
          <span
            aria-hidden="true"
            className="seal"
            data-c="seal"
            style={{ "--owner": glaze.color } as CSSProperties}
          >
            {glaze.blazon}
          </span>
          <h1 className="realm-title" data-c="realm-title">
            <span className="caps">Realm of</span>
            <b>{glaze.name}</b>
          </h1>
          <p className="realm-counts" data-c="realm-counts">
            <span className="meta-i" title={`${cities} cities`}>
              <Ico path="settlements/city" size="chip" />
              <b className="num">{cities}</b>
            </span>
            <span className="meta-i" title={`${holdings.length - cities} colonies`}>
              <Ico path="settlements/colony" size="chip" />
              <b className="num">{holdings.length - cities}</b>
            </span>
            <span className="meta-i" title={`${pops} of ${capacity} pops`}>
              <Ico path="pops/capacity" size="chip" />
              <b className="num">{pops}</b>/{capacity}
            </span>
            <span
              className="meta-i"
              title={`${laurels} of ${G.ruleset.victory.cardsToWin} victory cards`}
            >
              <Ico path="victory/laurel" size="chip" />
              <b className="num">{laurels}</b>/{G.ruleset.victory.cardsToWin}
            </span>
            {claims.length > 0 ? (
              <span
                className="meta-i"
                title={`${active.length} of ${claims.length} luxury goods active, +${luxuryHappinessBonus(G, viewerId)} happiness`}
              >
                <Ico path="events/voyage" size="chip" />
                <b className="num">{active.length}</b>/{claims.length}
              </span>
            ) : null}
          </p>
        </header>
        <nav aria-label="Realm pages" className="realm-tabs" data-c="realm-tabs" role="tablist">
          {TABS.map(({ tab: id, label }) => (
            <button
              aria-controls="realm-page"
              aria-selected={shown === id}
              className="realm-tab"
              data-c="tab"
              key={id}
              onClick={() => onTab(id)}
              role="tab"
              type="button"
            >
              {label}
            </button>
          ))}
          {subject ? (
            <button
              aria-controls="realm-page"
              aria-selected={shown === "subject"}
              className="realm-tab is-subject"
              data-c="tab"
              onClick={() => onTab("subject")}
              role="tab"
              type="button"
            >
              <Ico path={`settlements/${subject.settlement.kind}`} size="ui" />
              <span className="realm-tab-name">{subjectName}</span>
            </button>
          ) : null}
        </nav>
        <section className="realm-page" data-c="realm-page" id="realm-page" role="tabpanel">
          {shown === "subject" && subject ? (
            <SettlementPage G={G} settlement={subject.settlement} tile={subject.tile} />
          ) : null}
          {shown === "cities" ? (
            <>
              <UnrestAlarm
                popLossThreshold={G.ruleset.economy.unrest.popLossThreshold}
                status={unrestStatus(G, viewerId)}
              />
              <ActiveEffectsList variant="ledger" />
              <CitiesTab holdings={holdings} onBuildBuildingRequest={onBuildBuildingRequest} />
            </>
          ) : null}
          {shown === "pops" ? (
            <PopsTab holdings={holdings} onLadderRequest={onLadderRequest} />
          ) : null}
          {shown === "buildings" ? (
            <BuildingsTab holdings={holdings} onBuildBuildingRequest={onBuildBuildingRequest} />
          ) : null}
          {shown === "market" ? <MarketTab onBankBuy={onBankBuy} onBankSell={onBankSell} /> : null}
        </section>
      </div>
    </section>
  );
}
