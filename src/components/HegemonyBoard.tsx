import { useEffect, useMemo, useState } from "react";
import type { GameEvents, GameMoves, LocalContext, Phase } from "../game/controller";
import { ACTION_COSTS, BUILDINGS, EMPTY_RESOURCES, PLAYER_COLORS, PLAYER_IDS } from "../game/data";
import type {
  BuildingDefinition,
  BuildingId,
  HegemonyState,
  HexTile,
  PlayerId,
  PopType,
  Resources,
  Settlement,
  SettlementKind
} from "../game/types";
import type { ActionStatus } from "../game/rules";
import {
  PLACEMENT_POP_COUNTS,
  POP_TYPES,
  calculateEconomyProjection,
  getBuildBuildingStatus,
  getFoundColonyStatus,
  getGrowPopStatus,
  getUpgradeColonyToCityStatus,
  playerPopulationTotals,
  previewBuildBuilding,
  previewUpgradeColonyToCity,
  settlementBuildingSlots,
  settlementOverCapacity,
  settlementPopCapacity,
  settlementTileYield,
  toPlayerId,
  totalPops
} from "../game/rules";
import {
  RESOURCE_LABELS,
  formatBuildingEffects,
  formatNumber,
  formatPopLabel,
  formatPopShort,
  formatResourceCost,
  formatResourceDelta,
  formatSignedNumber,
  phaseHint
} from "../ui/formatters";
import { RESOURCE_ORDER, resourceCssVars } from "../ui/resourceVisuals";
import { ActionLogModal } from "./ActionLogModal";
import { HexMap } from "./HexMap";
import { MapStatusOverlay } from "./MapStatusOverlay";
import { FoundColonyModal, MovePopsModal, PopulationPickerModal } from "./PopulationModals";
import { ResourceGrid } from "./ResourceGrid";
import { AtlasIcon, ResourceIcon, TerrainSprite, UiSprite } from "./Sprites";

type BoardProps = {
  G: HegemonyState;
  ctx: LocalContext;
  moves: GameMoves;
  events: GameEvents;
  playerID: PlayerId;
  onPlayerIDChange: (playerID: PlayerId) => void;
  isActive: boolean;
};

type PendingTileConfirmation = {
  action: "setupCapital" | "setupColony" | "foundColony" | "upgradeCity";
  label: string;
  tileId: string;
};

type EmpireTab = "cities" | "buildings" | "pops";

type OwnedHolding = {
  tile: HexTile;
  settlement: Settlement;
};

type PopEconomy = Record<PopType, Resources>;

const PLAYER_DISPLAY_NAMES: Record<PlayerId, string> = {
  "0": "Damon",
  "1": "Nikos",
  "2": "Theron",
  "3": "Kyros"
};

const SETTLEMENT_SORT: Record<SettlementKind, number> = {
  capital: 0,
  city: 1,
  colony: 2
};

const BUILDING_AFFINITY: Record<BuildingId, PopType> = {
  marketplace: "freemen",
  temple: "citizens",
  workshop: "slaves",
  granary: "citizens"
};

export function HegemonyBoard({
  G,
  ctx,
  moves,
  events,
  playerID = "0",
  onPlayerIDChange,
  isActive
}: BoardProps) {
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [tileConfirmation, setTileConfirmation] = useState<PendingTileConfirmation | null>(null);
  const [populationPrompt, setPopulationPrompt] = useState<{
    kind: Extract<SettlementKind, "capital" | "colony">;
    tileId: string;
  } | null>(null);
  const [foundingTileId, setFoundingTileId] = useState<string | null>(null);
  const [upgradeTileId, setUpgradeTileId] = useState<string | null>(null);
  const [isGrowPopOpen, setIsGrowPopOpen] = useState(false);
  const [isMovePopsOpen, setIsMovePopsOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [activeEmpireTab, setActiveEmpireTab] = useState<EmpireTab>("cities");
  const currentPlayerId = toPlayerId(ctx.currentPlayer);
  const viewerId = toPlayerId(playerID);
  const viewer = G.players[viewerId];
  const selectedTile = selectedTileId ? G.board.tiles.find((tile) => tile.id === selectedTileId) ?? null : null;
  const projectedEconomy = calculateEconomyProjection(G, viewerId, { resolveTransfers: true });
  const projectedIncome = projectedEconomy.income;
  const projectedIncomeBreakdown = projectedEconomy.breakdown;
  const isSetup = ctx.phase === "setupCapital" || ctx.phase === "setupColony";
  const upgradeTile = upgradeTileId ? G.board.tiles.find((tile) => tile.id === upgradeTileId) : null;
  const upgradeSettlement = upgradeTile?.settlements.find(
    (settlement) => settlement.owner === viewerId && settlement.kind === "colony"
  );
  const pendingSetupCopy =
    tileConfirmation && isSetup
      ? "Choose pops to place this settlement"
      : isSetup
        ? "Select a tile to place the setup settlement"
        : "Income and building actions";

  useEffect(() => {
    setTileConfirmation(null);
    setPopulationPrompt(null);
    setFoundingTileId(null);
    setUpgradeTileId(null);
    setIsGrowPopOpen(false);
    setIsMovePopsOpen(false);
  }, [ctx.phase, ctx.currentPlayer]);

  const handleTileAction = (tileId: string) => {
    setSelectedTileId(tileId);

    if (ctx.phase === "setupCapital") {
      setTileConfirmation(null);
      setPopulationPrompt({ kind: "capital", tileId });
      return;
    }

    if (ctx.phase === "setupColony") {
      setTileConfirmation(null);
      setPopulationPrompt({ kind: "colony", tileId });
      return;
    }

    if (!isActive) {
      return;
    }

    setTileConfirmation(null);
  };

  const confirmTileAction = () => {
    if (!tileConfirmation) {
      return;
    }

    if (tileConfirmation.action === "setupCapital") {
      setPopulationPrompt({ kind: "capital", tileId: tileConfirmation.tileId });
    } else if (tileConfirmation.action === "setupColony") {
      setPopulationPrompt({ kind: "colony", tileId: tileConfirmation.tileId });
    } else if (tileConfirmation.action === "foundColony") {
      setFoundingTileId(tileConfirmation.tileId);
    } else {
      setUpgradeTileId(tileConfirmation.tileId);
    }

    setTileConfirmation(null);
  };

  const requestFoundColony = (tileId: string) => {
    setSelectedTileId(tileId);

    if (ctx.phase === "gameplay" && isActive && getFoundColonyStatus(G, viewerId, tileId).can) {
      setFoundingTileId(tileId);
    }
  };

  const requestUpgradeCity = (tileId: string) => {
    setSelectedTileId(tileId);

    if (ctx.phase === "gameplay" && isActive && getUpgradeColonyToCityStatus(G, viewerId, tileId).can) {
      setUpgradeTileId(tileId);
    }
  };

  const requestBuildBuilding = (tileId: string, buildingId: BuildingId) => {
    setSelectedTileId(tileId);

    if (ctx.phase === "gameplay" && isActive && getBuildBuildingStatus(G, viewerId, tileId, buildingId).can) {
      moves.buildBuilding(tileId, buildingId);
    }
  };

  return (
    <main className="shell uiOverhaulShell">
      <header className="topbar strategyTopbar">
        <section className="statusPanel resourceStatusPanel" aria-label={`${viewer.name} resources`}>
          <ResourceGrid
            breakdown={projectedIncomeBreakdown}
            className="topResourceGrid compactTopResourceGrid"
            deltas={projectedIncome}
            resetKey={viewerId}
            resources={viewer.resources}
          />
        </section>

        <SeasonStatus season={G.season} />

        <PlayerScoreboard
          G={G}
          currentPlayerId={currentPlayerId}
          onPlayerIDChange={onPlayerIDChange}
          viewerId={viewerId}
        />
      </header>

      <section className="workbench strategyWorkbench">
        <aside className="panel empirePanel intelPanel">
          <EmpireIntelPanel
            G={G}
            activeTab={activeEmpireTab}
            isActive={isActive}
            phase={ctx.phase}
            playerID={viewerId}
            onBuildBuildingRequest={requestBuildBuilding}
            onFoundColonyRequest={requestFoundColony}
            onTabChange={setActiveEmpireTab}
            onUpgradeCityRequest={requestUpgradeCity}
          />
        </aside>

        <section className="mapColumn strategyMapColumn">
          <div className="mapFrame">
            <MapStatusOverlay
              G={G}
              ctx={ctx}
              currentPlayerId={currentPlayerId}
              isActive={isActive}
            />
            <HexMap
              G={G}
              confirmation={
                tileConfirmation
                  ? {
                      label: tileConfirmation.label,
                      tileId: tileConfirmation.tileId,
                      onCancel: () => setTileConfirmation(null),
                      onConfirm: confirmTileAction
                    }
                  : null
              }
              pendingTileId={tileConfirmation?.tileId ?? null}
              selectedTileId={selectedTileId}
              onTileAction={handleTileAction}
            />
          </div>
          <div className="phaseStrip">
            <span>{phaseHint(ctx.phase)}</span>
            <span>{pendingSetupCopy}</span>
          </div>
        </section>

        <aside className="panel actionPanel commandPanel">
          <ActionCommandPanel
            G={G}
            isActive={isActive}
            phase={ctx.phase}
            playerID={viewerId}
            selectedTile={selectedTile}
            canGrowPops={viewer.settlements.length > 0}
            canMovePops={viewer.settlements.length >= 2}
            onBuildBuildingRequest={requestBuildBuilding}
            onEndTurn={events.endTurn}
            onGrowPopRequest={() => setIsGrowPopOpen(true)}
            onLogOpen={() => setIsLogOpen(true)}
            onMovePopsRequest={() => setIsMovePopsOpen(true)}
          />
        </aside>
      </section>

      {isLogOpen ? <ActionLogModal G={G} onClose={() => setIsLogOpen(false)} /> : null}
      {populationPrompt ? (
        <PopulationPickerModal
          title={`Choose ${populationPrompt.kind} pops`}
          description={`Allocate exactly ${PLACEMENT_POP_COUNTS[populationPrompt.kind]} starting ${
            PLACEMENT_POP_COUNTS[populationPrompt.kind] === 1 ? "pop" : "pops"
          } before placing this ${populationPrompt.kind}.`}
          requiredTotal={PLACEMENT_POP_COUNTS[populationPrompt.kind]}
          confirmLabel={`Place ${populationPrompt.kind}`}
          onCancel={() => setPopulationPrompt(null)}
          onConfirm={(pops) => {
            if (populationPrompt.kind === "capital") {
              moves.placeCapital(populationPrompt.tileId, pops);
            } else {
              moves.placeColony(populationPrompt.tileId, pops);
            }
          }}
        />
      ) : null}
      {foundingTileId ? (
        <FoundColonyModal
          G={G}
          playerID={viewerId}
          targetTileId={foundingTileId}
          onCancel={() => setFoundingTileId(null)}
          onConfirm={(sourceTileId, pop) => {
            moves.foundColony(foundingTileId, sourceTileId, pop);
            setFoundingTileId(null);
          }}
        />
      ) : null}
      {upgradeTileId ? (
        <PopulationPickerModal
          title="Choose city pops"
          description={`Allocate exactly ${totalPops(upgradeSettlement?.pops ?? { citizens: 0, freemen: 0, slaves: 0 })} pops before upgrading this city.`}
          requiredTotal={totalPops(upgradeSettlement?.pops ?? { citizens: 0, freemen: 0, slaves: 0 })}
          initialPops={upgradeSettlement?.pops}
          confirmLabel="Upgrade City"
          onCancel={() => setUpgradeTileId(null)}
          onConfirm={(pops) => {
            moves.upgradeColonyToCity(upgradeTileId, pops);
            setUpgradeTileId(null);
          }}
        />
      ) : null}
      {isGrowPopOpen ? (
        <GrowPopModal
          G={G}
          initialTileId={selectedTileId}
          isActive={isActive}
          phase={ctx.phase}
          playerID={viewerId}
          onCancel={() => setIsGrowPopOpen(false)}
          onConfirm={(tileId, pop) => {
            moves.growPop(tileId, pop);
            setIsGrowPopOpen(false);
          }}
        />
      ) : null}
      {isMovePopsOpen ? (
        <MovePopsModal
          G={G}
          playerID={viewerId}
          onCancel={() => setIsMovePopsOpen(false)}
          onConfirm={(sourceTileId, targetTileId, pops) => {
            moves.movePops(sourceTileId, targetTileId, pops);
            setIsMovePopsOpen(false);
          }}
        />
      ) : null}
    </main>
  );
}

function SeasonStatus({ season }: { season: number }) {
  return (
    <section className="statusPanel seasonStatus" aria-label="Season and card status">
      <div className="seasonEventLabel">
        <span>Seasonal Effect</span>
        <strong>Awaiting Card</strong>
      </div>
      <div className="seasonMedallion" aria-label={`Season ${season}`}>
        <span>Season</span>
        <strong>{season}</strong>
      </div>
      <div className="seasonEventLabel alignRight">
        <span>Player Event</span>
        <strong>Awaiting Card</strong>
      </div>
    </section>
  );
}

function PlayerScoreboard({
  G,
  currentPlayerId,
  viewerId,
  onPlayerIDChange
}: {
  G: HegemonyState;
  currentPlayerId: PlayerId;
  viewerId: PlayerId;
  onPlayerIDChange: (playerID: PlayerId) => void;
}) {
  return (
    <section className="statusPanel scoreboardPanel" aria-label="Player scoreboard">
      {PLAYER_IDS.map((id) => {
        const player = G.players[id];
        const population = playerPopulationTotals(G, id);
        const projected = calculateEconomyProjection(G, id, { resolveTransfers: true });
        const isViewer = id === viewerId;
        const isCurrent = id === currentPlayerId;

        return (
          <button
            aria-pressed={isViewer}
            className={`scoreboardSeat${isViewer ? " selectedScoreSeat" : ""}${isCurrent ? " currentScoreSeat" : ""}`}
            key={id}
            onClick={() => onPlayerIDChange(id)}
            style={{ borderColor: PLAYER_COLORS[id] }}
          >
            <span className="scoreToken" style={{ backgroundColor: PLAYER_COLORS[id] }} />
            <span className="scoreIdentity">
              <strong>{PLAYER_DISPLAY_NAMES[id]}</strong>
              <em>{isCurrent ? "Acting" : "Watching"}</em>
            </span>
            <span className="scoreMetrics">
              <b>
                <UiSprite item="victoryPoint" className="scoreMiniSprite" />
                VP --
              </b>
              <b>{population.pops} Pops</b>
            </span>
            <span className="scoreTooltip" role="tooltip">
              <strong>{PLAYER_DISPLAY_NAMES[id]} Resources</strong>
              {RESOURCE_ORDER.map((resource) => (
                <span key={resource}>
                  {RESOURCE_LABELS[resource]}
                  <b>
                    {formatNumber(player.resources[resource])}{" "}
                    <em className={projected.income[resource] > 0 ? "positive" : projected.income[resource] < 0 ? "negative" : ""}>
                      {formatSignedNumber(projected.income[resource])}
                    </em>
                  </b>
                </span>
              ))}
            </span>
          </button>
        );
      })}
    </section>
  );
}

function EmpireIntelPanel({
  G,
  playerID,
  activeTab,
  phase,
  isActive,
  onTabChange,
  onFoundColonyRequest,
  onUpgradeCityRequest,
  onBuildBuildingRequest
}: {
  G: HegemonyState;
  playerID: PlayerId;
  activeTab: EmpireTab;
  phase: Phase;
  isActive: boolean;
  onTabChange: (tab: EmpireTab) => void;
  onFoundColonyRequest: (tileId: string) => void;
  onUpgradeCityRequest: (tileId: string) => void;
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
        <AtlasIcon icon="capital" className="titleIcon" />
        <div>
          <h2>{PLAYER_DISPLAY_NAMES[playerID]} Ledger</h2>
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
            onFoundColonyRequest={onFoundColonyRequest}
            onUpgradeCityRequest={onUpgradeCityRequest}
          />
        ) : null}
        {activeTab === "pops" ? (
          <PopsTab G={G} holdings={holdings} playerID={playerID} />
        ) : null}
      </div>
    </div>
  );
}

function CitiesTab({
  G,
  holdings,
  playerID,
  phase,
  isActive,
  onBuildBuildingRequest
}: {
  G: HegemonyState;
  holdings: OwnedHolding[];
  playerID: PlayerId;
  phase: Phase;
  isActive: boolean;
  onBuildBuildingRequest: (tileId: string, buildingId: BuildingId) => void;
}) {
  if (holdings.length === 0) {
    return <p className="emptyState">No settlements yet.</p>;
  }

  return (
    <div className="holdingStack">
      {holdings.map(({ tile, settlement }) => {
        const popTotal = totalPops(settlement.pops);
        const capacity = settlementPopCapacity(settlement.kind);
        const overCapacity = settlementOverCapacity(settlement);
        const slots = settlementBuildingSlots(tile, settlement);
        const tileYield = settlementTileYield(tile, settlement);

        return (
          <article
            className={`holdingMatrix settlement-${settlement.kind}${overCapacity > 0 ? " overCapacityCard" : ""}`}
            key={`${settlement.owner}-${tile.id}`}
          >
            <div className="holdingMatrixHeader">
              <span>
                <AtlasIcon icon={settlement.kind} className="miniIcon" />
                <strong>{capitalize(settlement.kind)}</strong>
                <em>{tile.id}</em>
              </span>
              <span>
                <TerrainSprite terrain={tile.terrain} className="terrainChip" />
                {capitalize(tile.terrain)}
              </span>
            </div>

            <div className="holdingCapacityLine">
              <span className={overCapacity > 0 ? "overCapacityText" : undefined}>
                Pops <strong>{popTotal}</strong>/<strong>{capacity}</strong>
              </span>
              <span>
                Slots <strong>{settlement.buildings.length}</strong>/<strong>{slots}</strong>
              </span>
            </div>

            <div className="popBuildingMatrix">
              {POP_TYPES.map((pop) => {
                const builtBuildings = settlement.buildings.filter(
                  (buildingId) => BUILDING_AFFINITY[buildingId] === pop
                );
                const unbuiltBuildings = BUILDINGS.filter(
                  (building) => !settlement.buildings.includes(building.id) && BUILDING_AFFINITY[building.id] === pop
                );

                return (
                  <div className="popBuildingColumn" key={pop}>
                    <div className="popColumnHeader">
                      <AtlasIcon icon={pop} className="miniIcon" />
                      <span>{formatPopShort(pop)}</span>
                      <strong>{settlement.pops[pop]}</strong>
                    </div>
                    <div className="buildingChipRow">
                      {builtBuildings.length > 0 ? (
                        builtBuildings.map((buildingId, index) => {
                          const building = BUILDINGS.find((candidate) => candidate.id === buildingId);

                          return building ? (
                            <BuildingChip
                              building={building}
                              key={`${buildingId}-${index}`}
                              mode="built"
                              tooltipRows={[
                                "Built in this holding.",
                                `Benefit: ${formatBuildingEffects(building.effects)}.`
                              ]}
                            />
                          ) : null;
                        })
                      ) : (
                        <span className="emptyMini">none</span>
                      )}
                    </div>
                    <div className="buildingChipRow mutedChipRow">
                      {unbuiltBuildings.length > 0 ? (
                        unbuiltBuildings.map((building) => {
                          const status = getBuildBuildingStatus(G, playerID, tile.id, building.id);
                          const benefit = getBuildingBenefitText(G, playerID, tile, settlement, building);
                          const disabled = !isActive || phase !== "gameplay" || !status.can;

                          return (
                            <BuildingChip
                              building={building}
                              disabled={disabled}
                              key={building.id}
                              mode="option"
                              tooltipRows={buildingTooltipRows(building, status, benefit, phase, isActive)}
                              onClick={() => onBuildBuildingRequest(tile.id, building.id)}
                            />
                          );
                        })
                      ) : (
                        <span className="emptyMini">built</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="holdingYieldLine" style={resourceCssVars(tile.resource.type)}>
              <ResourceIcon resource={tile.resource.type} value={tileYield} className="miniResourceIcon" />
              Extracts <strong>{formatNumber(tileYield)}</strong> {RESOURCE_LABELS[tile.resource.type]}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function BuildingsTab({
  G,
  holdings,
  playerID,
  phase,
  isActive,
  onFoundColonyRequest,
  onUpgradeCityRequest,
  onBuildBuildingRequest
}: {
  G: HegemonyState;
  holdings: OwnedHolding[];
  playerID: PlayerId;
  phase: Phase;
  isActive: boolean;
  onFoundColonyRequest: (tileId: string) => void;
  onUpgradeCityRequest: (tileId: string) => void;
  onBuildBuildingRequest: (tileId: string, buildingId: BuildingId) => void;
}) {
  const colonyCandidates = G.board.tiles
    .map((tile) => ({ tile, status: getFoundColonyStatus(G, playerID, tile.id) }))
    .sort(sortActionCandidates);
  const upgradeCandidates = holdings.filter(({ settlement }) => settlement.kind === "colony");

  return (
    <div className="buildingsLedger">
      {BUILDINGS.map((building) => (
        <section className="buildingLedgerRow" key={building.id}>
          <div className="buildingLedgerLead">
            <AtlasIcon icon={building.id} className="buildingButtonIcon" />
            <span>
              <strong>{building.name}</strong>
              <em>{formatBuildingEffects(building.effects)}</em>
            </span>
          </div>
          <div className="buildCandidateGrid">
            {holdings.map(({ tile, settlement }) => {
              const status = getBuildBuildingStatus(G, playerID, tile.id, building.id);
              const benefit = getBuildingBenefitText(G, playerID, tile, settlement, building);
              const disabled = !isActive || phase !== "gameplay" || !status.can;

              return (
                <button
                  className="candidateButton"
                  disabled={disabled}
                  key={`${building.id}-${tile.id}`}
                  onClick={() => onBuildBuildingRequest(tile.id, building.id)}
                  title={buildingTooltipRows(building, status, benefit, phase, isActive).join(" ")}
                >
                  <span>{holdingShortLabel(tile, settlement)}</span>
                  <b>{benefit}</b>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <section className="buildingLedgerRow actionLedgerRow">
        <div className="buildingLedgerLead">
          <AtlasIcon icon="colony" className="buildingButtonIcon" />
          <span>
            <strong>Found Colony</strong>
            <em>Cost: {formatResourceCost(ACTION_COSTS.foundColony)}. Choose a source pop after selecting a tile.</em>
          </span>
        </div>
        <div className="buildCandidateGrid largeCandidateGrid">
          {colonyCandidates.map(({ tile, status }) => {
            const disabled = !isActive || phase !== "gameplay" || !status.can;

            return (
              <button
                className="candidateButton"
                disabled={disabled}
                key={`found-${tile.id}`}
                onClick={() => onFoundColonyRequest(tile.id)}
                title={actionTitle("Found Colony", status, phase, isActive)}
              >
                <span>{capitalize(tile.terrain)} {tile.id}</span>
                <b>{status.can ? "Open" : status.reasons[0] ?? "Blocked"}</b>
              </button>
            );
          })}
        </div>
      </section>

      <section className="buildingLedgerRow actionLedgerRow">
        <div className="buildingLedgerLead">
          <AtlasIcon icon="city" className="buildingButtonIcon" />
          <span>
            <strong>Upgrade City</strong>
            <em>Cost: {formatResourceCost(ACTION_COSTS.upgradeColonyToCity)}. Converts a colony into a city.</em>
          </span>
        </div>
        <div className="buildCandidateGrid">
          {upgradeCandidates.length > 0 ? (
            upgradeCandidates.map(({ tile, settlement }) => {
              const status = getUpgradeColonyToCityStatus(G, playerID, tile.id);
              const preview = previewUpgradeColonyToCity(G, playerID, tile.id, settlement.pops);
              const benefit = preview ? formatResourceDelta(preview.incomeDelta) : "City capacity";
              const disabled = !isActive || phase !== "gameplay" || !status.can;

              return (
                <button
                  className="candidateButton"
                  disabled={disabled}
                  key={`upgrade-${tile.id}`}
                  onClick={() => onUpgradeCityRequest(tile.id)}
                  title={`${actionTitle("Upgrade City", status, phase, isActive)} Projected income: ${benefit}.`}
                >
                  <span>{holdingShortLabel(tile, settlement)}</span>
                  <b>{benefit}</b>
                </button>
              );
            })
          ) : (
            <span className="ledgerEmpty">No colonies to upgrade.</span>
          )}
        </div>
      </section>
    </div>
  );
}

function PopsTab({
  G,
  holdings,
  playerID
}: {
  G: HegemonyState;
  holdings: OwnedHolding[];
  playerID: PlayerId;
}) {
  const player = G.players[playerID];
  const economyByPop = calculatePopEconomy(holdings);
  const projection = calculateEconomyProjection(G, playerID, { resolveTransfers: true });
  const inTransit = G.transfers
    .filter((transfer) => transfer.owner === playerID)
    .reduce((total, transfer) => total + totalPops(transfer.pops), 0);
  const totals = POP_TYPES.reduce(
    (counts, pop) => ({
      ...counts,
      [pop]: holdings.reduce((total, { settlement }) => total + settlement.pops[pop], 0)
    }),
    { citizens: 0, freemen: 0, slaves: 0 } as Record<PopType, number>
  );

  return (
    <div className="popsLedger">
      {POP_TYPES.map((pop) => (
        <section className="popEconomyRow" key={pop}>
          <div className="popEconomyLead">
            <AtlasIcon icon={pop} className="buildingButtonIcon" />
            <span>
              <strong>{formatPopLabel(pop, totals[pop])}</strong>
              <em>{totals[pop]} total</em>
            </span>
          </div>
          <ResourceDeltaList resources={economyByPop[pop]} />
        </section>
      ))}

      <section className="netEconomyPanel">
        <strong>Projected Net Income</strong>
        <ResourceDeltaList resources={projection.income} />
      </section>

      <div className="popSummaryGrid">
        <span>
          Grown
          <strong>{player.grownSettlementsThisTurn.length}</strong>
        </span>
        <span>
          In Transit
          <strong>{inTransit}</strong>
        </span>
        <span>
          Event Cards
          <strong>0</strong>
        </span>
        <span>
          Deaths
          <strong>0</strong>
        </span>
      </div>
    </div>
  );
}

function GrowPopModal({
  G,
  playerID,
  initialTileId,
  phase,
  isActive,
  onCancel,
  onConfirm
}: {
  G: HegemonyState;
  playerID: PlayerId;
  initialTileId: string | null;
  phase: Phase;
  isActive: boolean;
  onCancel: () => void;
  onConfirm: (tileId: string, pop: PopType) => void;
}) {
  const holdings = useMemo(() => getOwnedHoldings(G, playerID), [G, playerID]);
  const initialHolding = holdings.find(({ tile }) => tile.id === initialTileId) ?? holdings[0];
  const [tileId, setTileId] = useState(initialHolding?.tile.id ?? "");
  const [pop, setPop] = useState<PopType>("citizens");
  const holding = holdings.find(({ tile }) => tile.id === tileId) ?? holdings[0];
  const status = holding ? getGrowPopStatus(G, playerID, holding.tile.id, pop) : null;
  const disabled = !holding || !isActive || phase !== "gameplay" || !status?.can;
  const benefit = holding ? estimateGrowPopIncomeDelta(holding.tile, holding.settlement, pop) : createEmptyResources();

  useEffect(() => {
    if (!holding && holdings[0]) {
      setTileId(holdings[0].tile.id);
    }
  }, [holding, holdings]);

  return (
    <div className="modalBackdrop" role="presentation">
      <section className="logModal populationModal growPopModal" role="dialog" aria-modal="true" aria-labelledby="grow-pop-title">
        <div className="modalHeader">
          <div>
            <h2 id="grow-pop-title">Grow Pop</h2>
            <p>Choose the holding and pop type, then confirm the cost and projected income change.</p>
          </div>
          <button className="iconButton" onClick={onCancel}>
            Close
          </button>
        </div>

        {holdings.length > 0 ? (
          <>
            <label className="fieldGroup">
              <span>Holding</span>
              <select value={holding?.tile.id ?? ""} onChange={(event) => setTileId(event.target.value)}>
                {holdings.map(({ tile, settlement }) => (
                  <option value={tile.id} key={tile.id}>
                    {capitalize(settlement.kind)} {tile.id} - {capitalize(tile.terrain)} - {totalPops(settlement.pops)}/{settlementPopCapacity(settlement.kind)} pops
                  </option>
                ))}
              </select>
            </label>

            <div className="popChoiceGrid growPopChoiceGrid" role="group" aria-label="Pop type to grow">
              {POP_TYPES.map((candidate) => {
                const candidateStatus = holding ? getGrowPopStatus(G, playerID, holding.tile.id, candidate) : null;

                return (
                  <button
                    className={candidate === pop ? "selectedChoice" : ""}
                    key={candidate}
                    onClick={() => setPop(candidate)}
                    title={actionTitle(`Grow ${formatPopLabel(candidate, 1)}`, candidateStatus, phase, isActive)}
                  >
                    <AtlasIcon icon={candidate} className="miniIcon" />
                    <span>{formatPopLabel(candidate, 1)}</span>
                    <strong>{formatResourceCost(candidateStatus?.cost ?? {})}</strong>
                  </button>
                );
              })}
            </div>

            <div className="growPopBenefitPanel">
              <div>
                <strong>Projected Benefit</strong>
                <ResourceDeltaList resources={benefit} />
              </div>
              <div>
                <strong>Cost</strong>
                <span>{formatResourceCost(status?.cost ?? {})}</span>
              </div>
            </div>

            {disabled ? (
              <div className="selectionSummary negative">
                <span>{actionRequirementText(status, phase, isActive)}</span>
              </div>
            ) : (
              <div className="selectionSummary positive">
                <span>
                  Ready to grow 1 {formatPopLabel(pop, 1)} in {holdingShortLabel(holding.tile, holding.settlement)}.
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="emptyState">No owned holdings can grow pops yet.</p>
        )}

        <div className="modalActions">
          <button onClick={onCancel}>Cancel</button>
          <button
            className="primaryButton"
            disabled={disabled}
            onClick={() => {
              if (holding) {
                onConfirm(holding.tile.id, pop);
              }
            }}
          >
            Grow Pop
          </button>
        </div>
      </section>
    </div>
  );
}

function ActionCommandPanel({
  G,
  playerID,
  selectedTile,
  phase,
  isActive,
  canGrowPops,
  canMovePops,
  onMovePopsRequest,
  onGrowPopRequest,
  onBuildBuildingRequest,
  onLogOpen,
  onEndTurn
}: {
  G: HegemonyState;
  playerID: PlayerId;
  selectedTile: HexTile | null;
  phase: Phase;
  isActive: boolean;
  canGrowPops: boolean;
  canMovePops: boolean;
  onMovePopsRequest: () => void;
  onGrowPopRequest: () => void;
  onBuildBuildingRequest: (tileId: string, buildingId: BuildingId) => void;
  onLogOpen: () => void;
  onEndTurn: () => void;
}) {
  const selectedSettlement = selectedTile?.settlements.find((settlement) => settlement.owner === playerID);

  return (
    <div className="commandStack">
      <div className="panelTitle compactPanelTitle">
        <UiSprite item="voteToken" className="titleIcon" />
        <div>
          <h2>Actions</h2>
          <span>{phase === "gameplay" ? "Command surface" : phaseHint(phase)}</span>
        </div>
      </div>

      <div className="commandToolbar" aria-label="Action toolbar">
        <button
          className="commandIconButton"
          disabled={!isActive || phase !== "gameplay" || !canGrowPops}
          onClick={onGrowPopRequest}
          title={canGrowPops ? "Choose a holding and pop type to grow." : "Requires an owned holding."}
        >
          <UiSprite item="growAction" className="commandIcon" />
          <span>Grow</span>
        </button>

        <button
          className="commandIconButton"
          disabled={!isActive || phase !== "gameplay" || !canMovePops}
          onClick={onMovePopsRequest}
          title={canMovePops ? "Move pops between two owned settlements." : "Requires at least two settlements."}
        >
          <UiSprite item="moveAction" className="commandIcon" />
          <span>Move</span>
        </button>

        <button className="commandIconButton" onClick={onLogOpen} title="Open action log.">
          <UiSprite item="meander" className="commandIcon" />
          <span>Log</span>
        </button>

        <button
          className="commandEndTurn"
          disabled={!isActive || phase !== "gameplay"}
          onClick={onEndTurn}
          title={isActive ? "End the current player's turn." : "Current player's turn only."}
        >
          <UiSprite item="endTurn" className="endTurnSprite" />
          <span>End Turn</span>
        </button>
      </div>

      <SelectedTilePanel
        G={G}
        isActive={isActive}
        phase={phase}
        playerID={playerID}
        selectedSettlement={selectedSettlement}
        selectedTile={selectedTile}
        onBuildBuildingRequest={onBuildBuildingRequest}
      />

      <DeckShelf />
    </div>
  );
}

function SelectedTilePanel({
  G,
  playerID,
  selectedTile,
  selectedSettlement,
  phase,
  isActive,
  onBuildBuildingRequest
}: {
  G: HegemonyState;
  playerID: PlayerId;
  selectedTile: HexTile | null;
  selectedSettlement: Settlement | undefined;
  phase: Phase;
  isActive: boolean;
  onBuildBuildingRequest: (tileId: string, buildingId: BuildingId) => void;
}) {
  if (!selectedTile) {
    return (
      <section className="selectedTilePanel emptySelectedTile">
        <h3>No Tile Selected</h3>
        <p>Select a hex to inspect local actions, build options, and settlement pressure.</p>
      </section>
    );
  }

  return (
    <section className="selectedTilePanel">
      <div className="selectedTileHeader">
        <TerrainSprite terrain={selectedTile.terrain} className="terrainPreviewSmall" />
        <span>
          <strong>{capitalize(selectedTile.terrain)} {selectedTile.id}</strong>
          <em>
            {selectedTile.resource.amount} {RESOURCE_LABELS[selectedTile.resource.type]}, {selectedTile.buildingSlots} base slots
          </em>
        </span>
      </div>

      <div className="selectedSettlementList">
        {selectedTile.settlements.length > 0 ? (
          selectedTile.settlements.map((settlement) => {
            const popTotal = totalPops(settlement.pops);
            const capacity = settlementPopCapacity(settlement.kind);

            return (
              <span key={`${settlement.owner}-${settlement.kind}`}>
                <AtlasIcon icon={settlement.kind} className="miniIcon" />
                <b>{PLAYER_DISPLAY_NAMES[settlement.owner]}</b>
                {capitalize(settlement.kind)}
                <em>{popTotal}/{capacity} pops</em>
              </span>
            );
          })
        ) : (
          <em>Empty tile</em>
        )}
      </div>

      <div className="selectedBuildGrid">
        {BUILDINGS.map((building) => {
          const status = getBuildBuildingStatus(G, playerID, selectedTile.id, building.id);
          const disabled = !isActive || phase !== "gameplay" || !status.can;
          const benefit = selectedSettlement
            ? getBuildingBenefitText(G, playerID, selectedTile, selectedSettlement, building)
            : formatBuildingEffects(building.effects);

          return (
            <button
              className="selectedBuildButton"
              disabled={disabled}
              key={building.id}
              onClick={() => onBuildBuildingRequest(selectedTile.id, building.id)}
              title={buildingTooltipRows(building, status, benefit, phase, isActive).join(" ")}
            >
              <AtlasIcon icon={building.id} className="miniIcon" />
              <span>
                <strong>{building.name}</strong>
                <em>{formatResourceCost(building.cost)}</em>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DeckShelf() {
  const decks: Array<{ label: string; count: string; item: "seasonDeck" | "eventDeck" | "resolutionDeck"; detail: string }> = [
    {
      label: "Seasonal",
      count: "--",
      item: "seasonDeck",
      detail: "Seasonal deck placeholder. Card counts wire in with the event-card mechanic."
    },
    {
      label: "Events",
      count: "--",
      item: "eventDeck",
      detail: "Player event deck placeholder. Draw and discard counts are not wired yet."
    },
    {
      label: "Resolutions",
      count: "--",
      item: "resolutionDeck",
      detail: "Resolution deck placeholder for future assembly mechanics."
    }
  ];

  return (
    <section className="deckShelf" aria-label="Future card decks">
      {decks.map((deck) => (
        <div className="deckPlaceholder" key={deck.label} tabIndex={0} title={deck.detail}>
          <UiSprite item={deck.item} className="deckSprite" />
          <span>
            <strong>{deck.label}</strong>
            <em>{deck.count} cards</em>
          </span>
        </div>
      ))}
    </section>
  );
}

function BuildingChip({
  building,
  mode,
  tooltipRows,
  disabled = false,
  onClick
}: {
  building: BuildingDefinition;
  mode: "built" | "option";
  tooltipRows: string[];
  disabled?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <AtlasIcon icon={building.id} className="miniIcon" />
      <span>{building.name}</span>
      <span className="detailTooltip" role="tooltip">
        <strong>{building.name}</strong>
        {tooltipRows.map((row) => (
          <em key={row}>{row}</em>
        ))}
      </span>
    </>
  );

  if (mode === "option") {
    return (
      <button
        className="buildingChip buildingChipOption"
        disabled={disabled}
        onClick={onClick}
        title={tooltipRows.join(" ")}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <span className="buildingChip buildingChipBuilt" tabIndex={0}>
      {content}
    </span>
  );
}

function ResourceDeltaList({ resources }: { resources: Resources }) {
  const entries = RESOURCE_ORDER.filter((resource) => resources[resource] !== 0);

  if (entries.length === 0) {
    return <span className="resourceDeltaList neutral">No direct change</span>;
  }

  return (
    <span className="resourceDeltaList">
      {entries.map((resource) => (
        <span
          className={resources[resource] > 0 ? "positive" : "negative"}
          key={resource}
          style={resourceCssVars(resource)}
        >
          <ResourceIcon resource={resource} value={resources[resource]} className="miniResourceIcon" />
          {formatSignedNumber(resources[resource])} {RESOURCE_LABELS[resource]}
        </span>
      ))}
    </span>
  );
}

function getOwnedHoldings(G: HegemonyState, playerID: PlayerId): OwnedHolding[] {
  return G.board.tiles
    .map((tile) => {
      const settlement = tile.settlements.find((candidate) => candidate.owner === playerID);

      return settlement ? { tile, settlement } : null;
    })
    .filter((entry): entry is OwnedHolding => Boolean(entry))
    .sort((left, right) => {
      const kindSort = SETTLEMENT_SORT[left.settlement.kind] - SETTLEMENT_SORT[right.settlement.kind];

      return kindSort === 0 ? left.tile.id.localeCompare(right.tile.id) : kindSort;
    });
}

function calculatePopEconomy(holdings: OwnedHolding[]): PopEconomy {
  const economy: PopEconomy = {
    citizens: createEmptyResources(),
    freemen: createEmptyResources(),
    slaves: createEmptyResources()
  };

  for (const { tile, settlement } of holdings) {
    economy.citizens.influence += settlement.pops.citizens;
    economy.citizens.gold += settlement.pops.citizens * 2;
    economy.citizens.food -= settlement.pops.citizens * 2;

    economy.freemen.gold += settlement.pops.freemen * 2;
    economy.freemen.food -= settlement.pops.freemen;

    economy.slaves[tile.resource.type] += settlement.pops.slaves;
    economy.slaves.food -= settlement.pops.slaves;
    economy.slaves.happiness -= settlement.pops.slaves * 0.5;
  }

  return economy;
}

function estimateGrowPopIncomeDelta(tile: HexTile, settlement: Settlement, pop: PopType): Resources {
  const delta = createEmptyResources();

  if (pop === "citizens") {
    delta.influence += 1;
    delta.gold += 2;
    delta.food -= 2;
    addSupportedPopBonus(delta, settlement, "citizens", "influence");
  } else if (pop === "freemen") {
    delta.gold += 2;
    delta.food -= 1;
    addSupportedPopBonus(delta, settlement, "freemen", "gold");
  } else {
    delta[tile.resource.type] += 1;
    delta.food -= 1;
    delta.happiness -= 0.5;
    addSupportedPopBonus(delta, settlement, "slaves", tile.resource.type);
  }

  return delta;
}

function addSupportedPopBonus(resources: Resources, settlement: Settlement, pop: PopType, resource: keyof Resources) {
  const support = settlement.buildings.reduce(
    (summary, buildingId) => {
      const building = BUILDINGS.find((candidate) => candidate.id === buildingId);

      for (const effect of building?.effects ?? []) {
        if (
          (pop === "citizens" && effect.type === "citizenInfluenceBonus") ||
          (pop === "freemen" && effect.type === "freemanGoldBonus") ||
          (pop === "slaves" && effect.type === "slavePrimaryResourceBonus")
        ) {
          summary.supportedPops += effect.supportedPops;
          summary.amount = effect.amount;
        }
      }

      return summary;
    },
    { supportedPops: 0, amount: 0 }
  );

  if (settlement.pops[pop] < support.supportedPops) {
    resources[resource] += support.amount;
  }
}

function getBuildingBenefitText(
  G: HegemonyState,
  playerID: PlayerId,
  tile: HexTile,
  settlement: Settlement,
  building: BuildingDefinition
) {
  const preview = previewBuildBuilding(G, playerID, tile.id, building.id);
  const projected = preview?.incomeDelta ?? estimateBuildingIncomeDelta(tile, settlement, building);
  const deltaText = formatResourceDelta(projected);

  return deltaText === "none" ? formatBuildingEffects(building.effects) : deltaText;
}

function estimateBuildingIncomeDelta(tile: HexTile, settlement: Settlement, building: BuildingDefinition): Resources {
  const delta = createEmptyResources();

  for (const effect of building.effects) {
    if (effect.type === "income") {
      delta[effect.resource] += effect.amount;
    } else if (effect.type === "happiness") {
      delta.happiness += effect.amount;
    } else if (effect.type === "freemanGoldBonus") {
      delta.gold += Math.min(settlement.pops.freemen, effect.supportedPops) * effect.amount;
    } else if (effect.type === "citizenInfluenceBonus") {
      delta.influence += Math.min(settlement.pops.citizens, effect.supportedPops) * effect.amount;
    } else if (effect.type === "slavePrimaryResourceBonus") {
      delta[tile.resource.type] += Math.min(settlement.pops.slaves, effect.supportedPops) * effect.amount;
    }
  }

  return delta;
}

function buildingTooltipRows(
  building: BuildingDefinition,
  status: ActionStatus,
  benefit: string,
  phase: Phase,
  isActive: boolean
) {
  return [
    `Cost: ${formatResourceCost(building.cost)}.`,
    `Benefit: ${benefit}.`,
    actionRequirementText(status, phase, isActive)
  ];
}

function actionTitle(label: string, status: ActionStatus | null, phase?: Phase, isActive = true) {
  return `${label}. ${actionRequirementText(status, phase, isActive)}`;
}

function actionRequirementText(status: ActionStatus | null, phase?: Phase, isActive = true) {
  if (!isActive) {
    return "Current player's turn only.";
  }

  if (phase !== "gameplay") {
    return "Gameplay only.";
  }

  return status?.reasons.length ? status.reasons.join(" ") : "Available.";
}

function sortActionCandidates(
  left: { tile: HexTile; status: ActionStatus },
  right: { tile: HexTile; status: ActionStatus }
) {
  if (left.status.can !== right.status.can) {
    return left.status.can ? -1 : 1;
  }

  return left.tile.id.localeCompare(right.tile.id);
}

function holdingShortLabel(tile: HexTile, settlement: Settlement) {
  return `${capitalize(settlement.kind)} ${tile.id}`;
}

function createEmptyResources(): Resources {
  return { ...EMPTY_RESOURCES };
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
