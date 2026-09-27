import { useEffect, useMemo, useState } from "react";
import {
  POP_TYPES,
  calculateEconomyProjection,
  getBuildBuildingOptions,
  getGrowPopStatus,
  getUpgradeColonyToCityStatus,
  settlementNetYield,
  victorySeatStatuses,
} from "../../../game/rules";
import type { BuildingId, HexTile, PlayerId, PopType, TradableMaterial } from "../../../game/types";
import { RESOURCE_GLYPHS, TERRAIN_GLYPHS } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { settlementNameOf } from "../../../ui/settlementNames";
import { SettlementSummaryCard } from "../../SettlementCard";
import { ResourceDeltaList } from "../ResourceDeltaList";
import { useGameUi } from "../GameUiContext";
import { getOwnedHoldings } from "../helpers";
import { EmpireIntelPanel } from "../ledger/EmpireIntelPanel";
import { LEDGER_TABS } from "../ledger/tabs";
import type { LedgerTab } from "../types";

export type OperationsWorkspace = "realm" | "subject";

export function OperationsBlock({
  activeTab,
  onBankBuy,
  onBankSell,
  onBuildBuildingRequest,
  onLadderRequest,
  onSelectTab,
  onTargetAction,
  onUpgradeRequest,
  selectedTileId,
  workspace,
  onWorkspaceChange,
}: {
  activeTab: LedgerTab;
  onBankBuy: (material: TradableMaterial) => void;
  onBankSell: (material: TradableMaterial) => void;
  onBuildBuildingRequest: (tileId: string, buildingId: BuildingId) => void;
  onLadderRequest: (request: { kind: "promote" | "demote"; from: PopType }) => void;
  onSelectTab: (tab: LedgerTab) => void;
  onTargetAction: (kind: "growPop" | "build", tileId: string) => void;
  onUpgradeRequest: (tileId: string) => void;
  selectedTileId: string | null;
  workspace: OperationsWorkspace;
  onWorkspaceChange: (workspace: OperationsWorkspace) => void;
}) {
  const { G, viewerId } = useGameUi();
  const selectedTile = selectedTileId
    ? (G.board.tiles.find((tile) => tile.id === selectedTileId) ?? null)
    : null;
  const subjectLabel = selectedTile
    ? tileSubjectLabel(G.board.tiles, selectedTile, viewerId)
    : null;

  return (
    <aside className="operationsBlock" aria-label="Realm operations">
      <header className="operationsHead">
        <span
          aria-hidden="true"
          className="operationsBlazon title"
          style={{ background: PLAYER_GLAZES[viewerId].color }}
        >
          {PLAYER_GLAZES[viewerId].blazon}
        </span>
        <div className="operationsWorkspaceTabs" role="tablist" aria-label="Operations workspace">
          <button
            aria-selected={workspace === "realm"}
            className="operationsWorkspaceTab verb"
            onClick={() => onWorkspaceChange("realm")}
            role="tab"
            type="button"
          >
            Realm
          </button>
          {selectedTile && subjectLabel ? (
            <button
              aria-selected={workspace === "subject"}
              className="operationsWorkspaceTab verb"
              onClick={() => onWorkspaceChange("subject")}
              role="tab"
              type="button"
            >
              {subjectLabel}
            </button>
          ) : null}
        </div>
        <span className="operationsOwner caption">{G.players[viewerId].name}</span>
      </header>

      {workspace === "realm" || !selectedTile ? (
        <RealmWorkspace
          activeTab={activeTab}
          onBankBuy={onBankBuy}
          onBankSell={onBankSell}
          onBuildBuildingRequest={onBuildBuildingRequest}
          onLadderRequest={onLadderRequest}
          onSelectTab={onSelectTab}
        />
      ) : (
        <SubjectWorkspace
          onTargetAction={onTargetAction}
          onUpgradeRequest={onUpgradeRequest}
          tile={selectedTile}
        />
      )}
    </aside>
  );
}

function RealmWorkspace({
  activeTab,
  onBankBuy,
  onBankSell,
  onBuildBuildingRequest,
  onLadderRequest,
  onSelectTab,
}: {
  activeTab: LedgerTab;
  onBankBuy: (material: TradableMaterial) => void;
  onBankSell: (material: TradableMaterial) => void;
  onBuildBuildingRequest: (tileId: string, buildingId: BuildingId) => void;
  onLadderRequest: (request: { kind: "promote" | "demote"; from: PopType }) => void;
  onSelectTab: (tab: LedgerTab) => void;
}) {
  const [comparisonOpen, setComparisonOpen] = useState(false);

  return (
    <>
      <nav className="realmTabs" aria-label="Realm pages" role="tablist">
        {LEDGER_TABS.map(({ tab, label, glyph }) => (
          <button
            aria-selected={activeTab === tab}
            className="realmTab"
            key={tab}
            onClick={() => onSelectTab(tab)}
            role="tab"
            type="button"
          >
            <Icon glyph={glyph} size="rail" />
            <span className="label">{label}</span>
          </button>
        ))}
        {activeTab === "cities" ? (
          <button
            aria-expanded={comparisonOpen}
            className="realmCompareToggle"
            onClick={() => setComparisonOpen((open) => !open)}
            type="button"
          >
            <Icon glyph="pin" size="rail" />
            <span className="label">Compare</span>
          </button>
        ) : null}
      </nav>

      {activeTab === "cities" && comparisonOpen ? <SettlementComparison /> : null}

      <div className="operationsBody" role="tabpanel">
        <EmpireIntelPanel
          activeTab={activeTab}
          onBankBuy={onBankBuy}
          onBankSell={onBankSell}
          onBuildBuildingRequest={onBuildBuildingRequest}
          onLadderRequest={onLadderRequest}
        />
      </div>
    </>
  );
}

function SettlementComparison() {
  const { G, viewerId } = useGameUi();
  const holdings = useMemo(() => getOwnedHoldings(G, viewerId), [G, viewerId]);
  const projection = useMemo(
    () => calculateEconomyProjection(G, viewerId, { resolveTransfers: true }),
    [G, viewerId],
  );
  const [pinned, setPinned] = useState<string[]>(() =>
    holdings.slice(0, 2).map(({ tile }) => tile.id),
  );

  useEffect(() => {
    const valid = new Set(holdings.map(({ tile }) => tile.id));
    setPinned((current) => {
      const next = current.filter((tileId) => valid.has(tileId));
      return next.length > 0 ? next : holdings.slice(0, 2).map(({ tile }) => tile.id);
    });
  }, [holdings]);

  const toggle = (tileId: string) => {
    setPinned((current) =>
      current.includes(tileId)
        ? current.filter((candidate) => candidate !== tileId)
        : [...current.slice(-1), tileId],
    );
  };

  return (
    <section className="settlementComparison" aria-label="Pinned settlement comparison">
      <div className="comparisonPins" aria-label="Choose up to two settlements">
        {holdings.map(({ tile, settlement }) => {
          const name = settlementNameOf(G.board.tiles, settlement.id);
          return (
            <button
              aria-pressed={pinned.includes(tile.id)}
              className="comparisonPin caption"
              key={tile.id}
              onClick={() => toggle(tile.id)}
              type="button"
            >
              {name}
            </button>
          );
        })}
      </div>
      <div className="comparisonRows">
        {pinned.map((tileId) => {
          const settlement = projection.settlements.find((entry) => entry.tileId === tileId);
          const holding = holdings.find(({ tile }) => tile.id === tileId);
          if (!settlement) return null;
          return (
            <article className="comparisonRow" key={tileId}>
              <strong className="title">
                {holding
                  ? settlementNameOf(G.board.tiles, holding.settlement.id)
                  : settlement.label}
              </strong>
              <span className="comparisonPopulation stat num">
                {settlement.pops}/{settlement.capacity}
              </span>
              <ResourceDeltaList resources={settlement.income} />
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SubjectWorkspace({
  onTargetAction,
  onUpgradeRequest,
  tile,
}: {
  onTargetAction: (kind: "growPop" | "build", tileId: string) => void;
  onUpgradeRequest: (tileId: string) => void;
  tile: HexTile;
}) {
  const { G, viewerId, isActive, phase } = useGameUi();
  const own = tile.settlements.find((settlement) => settlement.owner === viewerId) ?? null;
  const rivals = tile.settlements.filter((settlement) => settlement.owner !== viewerId);
  const ownName = own ? settlementNameOf(G.board.tiles, own.id) : null;
  const canGrow = own
    ? POP_TYPES.some((pop) => getGrowPopStatus(G, viewerId, tile.id, pop).can)
    : false;
  const canBuild = own
    ? getBuildBuildingOptions(G, viewerId, tile.id).some(({ status }) => status.can)
    : false;
  const canUpgrade = own ? getUpgradeColonyToCityStatus(G, viewerId, tile.id).can : false;

  return (
    <div className="operationsBody subjectBody">
      <header className="subjectHead">
        <span className="subjectTerrain" aria-hidden="true">
          <Icon glyph={TERRAIN_GLYPHS[tile.terrain]} size="rail" />
        </span>
        <span>
          <span className="label">Selected hex · {tile.id}</span>
          <h2 className="title">
            {ownName ?? (rivals.length > 0 ? "Rival ground" : "Open ground")}
          </h2>
        </span>
        {tile.resource ? (
          <span className="subjectYield stat num">
            <Icon glyph={RESOURCE_GLYPHS[tile.resource.type]} size="rail" />+{tile.resource.amount}
          </span>
        ) : null}
      </header>

      {own ? (
        <section className="subjectSettlement">
          <SettlementSummaryCard
            content={G.definition.content}
            name={ownName ?? tile.id}
            netYield={settlementNetYield(tile, own, G.ruleset, G.definition.content)}
            ruleset={G.ruleset}
            settlement={own}
            tile={tile}
          />
          <div className="subjectActions" aria-label={`Actions for ${ownName}`}>
            <SubjectAction
              disabled={!canGrow || !isActive || phase !== "gameplay"}
              glyph="grow"
              label="Grow"
              onClick={() => onTargetAction("growPop", tile.id)}
              target={ownName ?? tile.id}
            />
            <SubjectAction
              disabled={!canBuild || !isActive || phase !== "gameplay"}
              glyph="build"
              label="Build"
              onClick={() => onTargetAction("build", tile.id)}
              target={ownName ?? tile.id}
            />
            {own.kind === "colony" ? (
              <SubjectAction
                disabled={!canUpgrade || !isActive || phase !== "gameplay"}
                glyph="upgrade"
                label="Upgrade"
                onClick={() => onUpgradeRequest(tile.id)}
                target={ownName ?? tile.id}
              />
            ) : null}
          </div>
        </section>
      ) : (
        <p className="subjectEmpty body">
          This hex has no settlement of yours. Realm pages remain available above.
        </p>
      )}

      {rivals.map((settlement) => {
        const name = settlementNameOf(G.board.tiles, settlement.id);
        const glaze = PLAYER_GLAZES[settlement.owner];
        const race = victorySeatStatuses(G).find((seat) => seat.playerID === settlement.owner);

        return (
          <section className="rivalSettlement" key={settlement.id}>
            <header>
              <span className="rivalBlazon title" style={{ background: glaze.color }}>
                {glaze.blazon}
              </span>
              <span>
                <span className="label">{G.players[settlement.owner].name}</span>
                <strong className="title">{name}</strong>
              </span>
              <span className="rivalLaurels caption">
                <Icon glyph="laurel" size="rail" /> {race?.held ?? 0}/{G.ruleset.victory.cardsToWin}
              </span>
            </header>
            <SettlementSummaryCard
              content={G.definition.content}
              name={name}
              netYield={settlementNetYield(tile, settlement, G.ruleset, G.definition.content)}
              ruleset={G.ruleset}
              settlement={settlement}
              tile={tile}
            />
          </section>
        );
      })}
    </div>
  );
}

function SubjectAction({
  disabled,
  glyph,
  label,
  onClick,
  target,
}: {
  disabled: boolean;
  glyph: "grow" | "build" | "upgrade";
  label: string;
  onClick: () => void;
  target: string;
}) {
  return (
    <button
      aria-disabled={disabled}
      className={`subjectAction${disabled ? " isDisabled" : ""}`}
      onClick={disabled ? undefined : onClick}
      type="button"
    >
      <Icon glyph={glyph} size="rail" />
      <span>
        <strong className="verb">{label}</strong>
        <small className="caption">{target}</small>
      </span>
    </button>
  );
}

function tileSubjectLabel(tiles: HexTile[], tile: HexTile, viewerId: PlayerId): string {
  const own = tile.settlements.find((settlement) => settlement.owner === viewerId);
  if (own) return settlementNameOf(tiles, own.id);

  const rival = tile.settlements[0];
  if (rival) return settlementNameOf(tiles, rival.id);

  return `Hex ${tile.id}`;
}
