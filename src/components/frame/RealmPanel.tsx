import { useState } from "react";
import type { CSSProperties } from "react";
import {
  activeClaims,
  getLuxuryGood,
  luxuryHappinessBonus,
  ownedClaims,
  settlementCapacity,
  totalPops,
} from "../../game/rules";
import type {
  BuildingId,
  HegemonyState,
  HexTile,
  LuxuryAsset,
  PlayerId,
  PopType,
  Resources,
  Settlement,
  TradableMaterial,
} from "../../game/types";
import { victoryCardsHeld } from "../../game/victory";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";
import { settlementNames } from "../../ui/settlementNames";
import { useGameUi } from "../board/GameUiContext";
import { capitalize, getOwnedHoldings } from "../board/helpers";
import type { LedgerTab } from "../board/types";
import type { DiscGroup } from "./discs";
import { Ico } from "./parts";
import { BuildPage } from "./realm/BuildPage";
import { CitiesPage } from "./realm/CitiesPage";
import { LadderPage } from "./realm/LadderPage";
import { MarketPage } from "./realm/MarketPage";
import { LuxuryPage, OraclePage, TilePage } from "./realm/PlacePages";
import { SummaryPage } from "./realm/SummaryPage";
import { SettlementPage } from "./SettlementPage";
import { VerbDiscs } from "./VerbDiscs";

/** What the map last picked: the empty sea (the realm), a tile, or a mooring. */
export type RealmSubject =
  { kind: "realm" } | { kind: "tile"; tileId: string } | { kind: "mooring"; vertexId: string };

type SubjectView =
  | { kind: "realm" }
  | { kind: "own"; tile: HexTile; settlement: Settlement }
  | { kind: "rival"; tile: HexTile; settlement: Settlement }
  | { kind: "oracle"; tile: HexTile }
  | { kind: "land"; tile: HexTile }
  | { kind: "luxury"; asset: LuxuryAsset };

/** A pick, read against the board: your settlement there first, then a rival's, then the ground. */
function viewOf(G: HegemonyState, viewerId: PlayerId, subject: RealmSubject): SubjectView {
  if (subject.kind === "mooring") {
    const asset = G.board.luxuries.find((candidate) => candidate.vertexId === subject.vertexId);
    return asset ? { kind: "luxury", asset } : { kind: "realm" };
  }
  if (subject.kind === "realm") return { kind: "realm" };
  const tile = G.board.tiles.find((candidate) => candidate.id === subject.tileId);
  if (!tile) return { kind: "realm" };
  const own = tile.settlements.find((settlement) => settlement.owner === viewerId);
  if (own) return { kind: "own", tile, settlement: own };
  if (tile.settlements[0]) return { kind: "rival", tile, settlement: tile.settlements[0] };
  return tile.terrain === "oracle" ? { kind: "oracle", tile } : { kind: "land", tile };
}

export type RealmTab = LedgerTab | "subject";

const TABS: Array<{ tab: LedgerTab; label: string }> = [
  { tab: "cities", label: "Cities" },
  { tab: "pops", label: "Ladder" },
  { tab: "buildings", label: "Build" },
  { tab: "market", label: "Market" },
];

/**
 * The realm sheet, bottom left: the verb discs ride its curved edge; its body is
 * the ledger — the ruler's head, four pages, and the page of whatever the map
 * last picked: the realm itself (the sea), a settlement, a tile, the oracle or
 * a luxury good. Nothing on any page scrolls.
 */
export function RealmPanel({
  tab,
  onTab,
  subject,
  onSubject,
  groups,
  locked = false,
  income,
  onBuildBuildingRequest,
  onBankSell,
  onBankBuy,
  onLadderRequest,
  onFound,
}: {
  tab: RealmTab;
  onTab: (tab: RealmTab) => void;
  subject: RealmSubject;
  onSubject: (subject: RealmSubject) => void;
  groups: DiscGroup[];
  /** Every verb is locked: the Assembly sits. */
  locked?: boolean;
  /** The viewer's projected net income per turn. */
  income: Resources;
  onBuildBuildingRequest: (tileId: string, buildingId: BuildingId) => void;
  onBankSell: (material: TradableMaterial) => void;
  onBankBuy: (material: TradableMaterial) => void;
  onLadderRequest: (request: { kind: "promote" | "demote"; from: PopType }) => void;
  onFound: (tileId: string) => void;
}) {
  const { G, viewerId } = useGameUi();
  // Build's place, as picked on its page; a new pick on the map lets it follow again.
  const [picked, setPicked] = useState<{ subject: RealmSubject; tileId: string } | null>(null);
  const buildTarget = picked?.subject === subject ? picked.tileId : null;
  const setBuildTarget = (tileId: string) => setPicked({ subject, tileId });
  const glaze = PLAYER_GLAZES[viewerId];
  const holdings = getOwnedHoldings(G, viewerId);
  const cities = holdings.filter(({ settlement }) => settlement.kind !== "colony").length;
  const pops = holdings.reduce((sum, { settlement }) => sum + totalPops(settlement.pops), 0);
  const capacity = holdings.reduce(
    (sum, { settlement }) => sum + settlementCapacity(settlement, G),
    0,
  );
  const laurels = victoryCardsHeld(G, viewerId);
  // Claimed luxury goods: how many are held, and how many are active right now.
  const claims = ownedClaims(G, viewerId);
  const active = activeClaims(G, viewerId);
  const names = settlementNames(G.board.tiles);
  const view = viewOf(G, viewerId, subject);
  const openTileId = view.kind === "own" ? view.tile.id : null;
  const open = (tileId: string) => {
    onSubject({ kind: "tile", tileId });
    onTab("subject");
  };
  const raise = (tileId: string) => {
    setBuildTarget(tileId);
    onTab("buildings");
  };
  const subjectTab =
    view.kind === "realm"
      ? { icon: "chrome/dossier", label: "Overview" }
      : view.kind === "own" || view.kind === "rival"
        ? {
            icon: `settlements/${view.settlement.kind}`,
            label: names.get(view.settlement.id) ?? "POLIS",
          }
        : view.kind === "oracle"
          ? { icon: "terrain/oracle", label: "Oracle" }
          : view.kind === "land"
            ? { icon: `terrain/${view.tile.terrain}`, label: capitalize(view.tile.terrain) }
            : {
                icon: "events/voyage",
                label: getLuxuryGood(G.definition.content, view.asset.goodId)?.name ?? "Good",
              };

  return (
    <section aria-label="Realm" className="realm" data-c="realm" data-exclude>
      <VerbDiscs groups={groups} locked={locked} store={G.players[viewerId].resources} />
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
              aria-selected={tab === id}
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
          <button
            aria-controls="realm-page"
            aria-selected={tab === "subject"}
            className="realm-tab is-subject"
            data-c="tab"
            onClick={() => onTab("subject")}
            role="tab"
            type="button"
          >
            <Ico path={subjectTab.icon} size="ui" />
            <span className="realm-tab-name">{subjectTab.label}</span>
          </button>
        </nav>
        <section className="realm-page" data-c="realm-page" id="realm-page" role="tabpanel">
          {tab === "subject" ? (
            view.kind === "realm" ? (
              <SummaryPage holdings={holdings} income={income} onOpen={open} />
            ) : view.kind === "own" ? (
              <SettlementPage G={G} onRaise={raise} settlement={view.settlement} tile={view.tile} />
            ) : view.kind === "rival" ? (
              <SettlementPage G={G} settlement={view.settlement} tile={view.tile} />
            ) : view.kind === "oracle" ? (
              <OraclePage />
            ) : view.kind === "land" ? (
              <TilePage onFound={onFound} tile={view.tile} />
            ) : (
              <LuxuryPage asset={view.asset} />
            )
          ) : null}
          {tab === "cities" ? (
            <CitiesPage holdings={holdings} onOpen={open} onRaise={raise} openTileId={openTileId} />
          ) : null}
          {tab === "pops" ? (
            <LadderPage holdings={holdings} income={income} onLadderRequest={onLadderRequest} />
          ) : null}
          {tab === "buildings" ? (
            <BuildPage
              holdings={holdings}
              onBuildBuildingRequest={onBuildBuildingRequest}
              onTarget={setBuildTarget}
              targetTileId={buildTarget ?? openTileId}
            />
          ) : null}
          {tab === "market" ? <MarketPage onBankBuy={onBankBuy} onBankSell={onBankSell} /> : null}
        </section>
      </div>
    </section>
  );
}
