import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { GameEvents, GameMoves, LocalContext, Phase } from "../game/controller";
import {
  BUILDINGS,
  EMPTY_RESOURCES,
  PLAYER_COLORS,
  PLAYER_EVENT_CARDS,
  PLAYER_IDS,
  PLAYER_NAMES,
  SEASONAL_EVENT_CARDS
} from "../game/data";
import type {
  BuildingDefinition,
  BuildingId,
  EventCard,
  EventEffect,
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
  getAddPopsEffect,
  getBuildBuildingStatus,
  getEventEffectChoices,
  getEventPopTargetTileIds,
  getFoundColonyStatus,
  getGrowPopStatus,
  getUpgradeColonyToCityStatus,
  playerPopulationTotals,
  previewBuildBuilding,
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
  formatResourceCost,
  formatResourceDelta,
  formatSignedNumber,
  phaseHint,
  phaseLabel
} from "../ui/formatters";
import { RESOURCE_ORDER, resourceCssVars } from "../ui/resourceVisuals";
import { HexMap } from "./HexMap";
import { FoundColonyPopover, MovePopsModal, PopulationPickerModal, UpgradeCityModal } from "./PopulationModals";
import { ResourceGrid } from "./ResourceGrid";
import { SettlementSummaryCard } from "./SettlementCard";
import { AtlasIcon, ResourceIcon, UiSprite } from "./Sprites";

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

const PLAYER_DISPLAY_NAMES = PLAYER_NAMES;

const SETTLEMENT_SORT: Record<SettlementKind, number> = {
  capital: 1,
  city: 1,
  colony: 2
};

const BUILDING_AFFINITY: Record<BuildingId, PopType> = {
  marketplace: "freemen",
  temple: "citizens",
  workshop: "slaves",
  granary: "citizens"
};

const DETAIL_TOOLTIP_WIDTH = 260;

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
    kind: Extract<SettlementKind, "city" | "colony">;
    tileId: string;
  } | null>(null);
  const [foundColonyMode, setFoundColonyMode] = useState(false);
  const [foundColonyTarget, setFoundColonyTarget] = useState<{ tileId: string; anchor: DOMRect } | null>(null);
  const [isUpgradeCityOpen, setIsUpgradeCityOpen] = useState(false);
  const [isGrowPopOpen, setIsGrowPopOpen] = useState(false);
  const [isMovePopsOpen, setIsMovePopsOpen] = useState(false);
  const [activeEmpireTab, setActiveEmpireTab] = useState<EmpireTab>("cities");
  const currentPlayerId = toPlayerId(ctx.currentPlayer);
  const viewerId = toPlayerId(playerID);
  const viewer = G.players[viewerId];
  const hasPendingPlayerEvent = Boolean(G.pendingPlayerEvent);
  const projectedEconomy = calculateEconomyProjection(G, viewerId, { resolveTransfers: true });
  const projectedIncome = projectedEconomy.income;
  const projectedIncomeBreakdown = projectedEconomy.breakdown;
  const isSetup = ctx.phase === "setupCapital" || ctx.phase === "setupColony";
  const canFoundColony = G.board.tiles.some((tile) => getFoundColonyStatus(G, viewerId, tile.id).can);
  const canUpgradeCity = G.board.tiles.some((tile) => getUpgradeColonyToCityStatus(G, viewerId, tile.id).can);
  const foundColonyValidTileIds = useMemo(
    () =>
      foundColonyMode
        ? G.board.tiles.filter((tile) => getFoundColonyStatus(G, viewerId, tile.id).can).map((tile) => tile.id)
        : [],
    [foundColonyMode, G, viewerId]
  );
  const pendingSetupCopy =
    tileConfirmation && isSetup
      ? "Choose pops to place this settlement"
      : isSetup
        ? "Select a tile to place the setup settlement"
        : "Income and building actions";

  const exitFoundColonyMode = () => {
    setFoundColonyMode(false);
    setFoundColonyTarget(null);
  };

  useEffect(() => {
    setTileConfirmation(null);
    setPopulationPrompt(null);
    exitFoundColonyMode();
    setIsUpgradeCityOpen(false);
    setIsGrowPopOpen(false);
    setIsMovePopsOpen(false);
  }, [ctx.phase, ctx.currentPlayer]);

  useEffect(() => {
    if (!G.pendingPlayerEvent) {
      return;
    }

    setTileConfirmation(null);
    exitFoundColonyMode();
    setIsUpgradeCityOpen(false);
    setIsGrowPopOpen(false);
    setIsMovePopsOpen(false);
  }, [G.pendingPlayerEvent]);

  useEffect(() => {
    if (!foundColonyMode) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        exitFoundColonyMode();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [foundColonyMode]);

  const handleTileAction = (tileId: string) => {
    setSelectedTileId(tileId);

    if (foundColonyMode) {
      if (getFoundColonyStatus(G, viewerId, tileId).can) {
        const element = typeof document !== "undefined" ? document.querySelector(`[data-tile-id="${tileId}"]`) : null;

        if (element) {
          setFoundColonyTarget({ tileId, anchor: element.getBoundingClientRect() });
        }
      }
      return;
    }

    if (ctx.phase === "setupCapital") {
      setTileConfirmation(null);
      setPopulationPrompt({ kind: "city", tileId });
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
      setPopulationPrompt({ kind: "city", tileId: tileConfirmation.tileId });
    } else if (tileConfirmation.action === "setupColony") {
      setPopulationPrompt({ kind: "colony", tileId: tileConfirmation.tileId });
    } else if (tileConfirmation.action === "foundColony") {
      setFoundColonyMode(true);
    } else {
      setIsUpgradeCityOpen(true);
    }

    setTileConfirmation(null);
  };

  const requestBuildBuilding = (tileId: string, buildingId: BuildingId) => {
    setSelectedTileId(tileId);

    if (ctx.phase === "gameplay" && isActive && !hasPendingPlayerEvent && getBuildBuildingStatus(G, viewerId, tileId, buildingId).can) {
      moves.buildBuilding(tileId, buildingId);
    }
  };

  return (
    <main className="shell uiOverhaulShell">
      <header className="topbar strategyTopbar">
        <SeasonStatus
          G={G}
          ctx={ctx}
          isActive={isActive}
          currentPlayerId={currentPlayerId}
        />

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
            onTabChange={setActiveEmpireTab}
          />
        </aside>

        <section className="mapColumn strategyMapColumn">
          <div className="mapFrame">
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
              highlightTileIds={foundColonyValidTileIds}
              placementActive={foundColonyMode}
              onTileAction={handleTileAction}
            />
            {isSetup ? (
              <div className="mapSetupCaption" role="status">
                {pendingSetupCopy}
              </div>
            ) : null}
            {foundColonyMode ? (
              <div className="mapSetupCaption placementCaption" role="status">
                {foundColonyValidTileIds.length > 0
                  ? "Select a glowing tile to found your colony · Esc to cancel"
                  : "No open tile can host a colony right now · Esc to cancel"}
              </div>
            ) : null}
          </div>
          <div className="resourceBand" aria-label={`${viewer.name} resources`}>
            <ResourceGrid
              breakdown={projectedIncomeBreakdown}
              className="topResourceGrid bandResourceGrid"
              deltas={projectedIncome}
              resetKey={viewerId}
              resources={viewer.resources}
            />
          </div>
        </section>

        <aside className="panel actionPanel commandPanel">
          <ActionCommandPanel
            G={G}
            isActive={isActive}
            phase={ctx.phase}
            canGrowPops={viewer.settlements.length > 0}
            canMovePops={viewer.settlements.length >= 2}
            canFoundColony={canFoundColony}
            canUpgradeCity={canUpgradeCity}
            isFoundColonyActive={foundColonyMode}
            hasPendingPlayerEvent={hasPendingPlayerEvent}
            onEndTurn={events.endTurn}
            onGrowPopRequest={() => setIsGrowPopOpen(true)}
            onMovePopsRequest={() => setIsMovePopsOpen(true)}
            onFoundColonyRequest={() => {
              setIsUpgradeCityOpen(false);
              setFoundColonyTarget(null);
              setFoundColonyMode((active) => !active);
            }}
            onUpgradeCityRequest={() => setIsUpgradeCityOpen(true)}
          />
        </aside>
      </section>

      {populationPrompt ? (
        <PopulationPickerModal
          title={`Choose ${placementKindLabel(populationPrompt.kind)} pops`}
          description={`Allocate exactly ${PLACEMENT_POP_COUNTS[populationPrompt.kind]} starting ${
            PLACEMENT_POP_COUNTS[populationPrompt.kind] === 1 ? "pop" : "pops"
          } before placing this ${placementKindLabel(populationPrompt.kind)}.`}
          requiredTotal={PLACEMENT_POP_COUNTS[populationPrompt.kind]}
          confirmLabel={`Place ${placementKindLabel(populationPrompt.kind)}`}
          onCancel={() => setPopulationPrompt(null)}
          onConfirm={(pops) => {
            if (populationPrompt.kind === "city") {
              moves.placeCapital(populationPrompt.tileId, pops);
            } else {
              moves.placeColony(populationPrompt.tileId, pops);
            }
          }}
        />
      ) : null}
      {foundColonyMode && foundColonyTarget ? (
        <FoundColonyPopover
          G={G}
          playerID={viewerId}
          tileId={foundColonyTarget.tileId}
          anchor={foundColonyTarget.anchor}
          onCancel={exitFoundColonyMode}
          onConfirm={(sourceTileId, pop) => {
            moves.foundColony(foundColonyTarget.tileId, sourceTileId, pop);
            exitFoundColonyMode();
          }}
        />
      ) : null}
      {isUpgradeCityOpen ? (
        <UpgradeCityModal
          G={G}
          playerID={viewerId}
          onCancel={() => setIsUpgradeCityOpen(false)}
          onConfirm={(tileId, pops) => {
            moves.upgradeColonyToCity(tileId, pops);
            setIsUpgradeCityOpen(false);
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
      {G.pendingPlayerEvent ? (
        <PendingPlayerEventModal
          G={G}
          isActive={isActive && G.pendingPlayerEvent.playerID === currentPlayerId}
          moves={moves}
          playerID={G.pendingPlayerEvent.playerID}
        />
      ) : null}
    </main>
  );
}

function SeasonStatus({
  G,
  ctx,
  isActive,
  currentPlayerId
}: {
  G: HegemonyState;
  ctx: LocalContext;
  isActive: boolean;
  currentPlayerId: PlayerId;
}) {
  const seasonalCard = G.activeSeasonEvent?.card ?? null;
  const playerCard = G.lastPlayerEvent;

  return (
    <>
      <section className="statusPanel effectsCluster" aria-label="Seasonal and player events">
        <EventStatusCard card={seasonalCard} fallback="Awaiting Card" label="Seasonal Event" />
        <EventStatusCard card={playerCard} fallback="Awaiting Card" label="Player Event" />
      </section>

      <div className="seasonCenter">
        <div className="seasonMedallion" aria-label={`Season ${G.season}`}>
          <span>Season</span>
          <strong>{G.season}</strong>
        </div>
        <div className="seasonTurnCaption" aria-label="Turn status">
          <span>Turn {ctx.turn} · {phaseLabel(ctx.phase)}</span>
          <strong>{isActive ? "Your turn" : `${PLAYER_DISPLAY_NAMES[currentPlayerId]} acting`}</strong>
        </div>
      </div>
    </>
  );
}

function EventStatusCard({
  card,
  fallback,
  label
}: {
  card: EventCard | null;
  fallback: string;
  label: string;
}) {
  return (
    <div className={`seasonEventLabel${card ? " activeEventLabel" : ""}`} title={card ? card.text : fallback}>
      {card ? <img alt="" className="eventStatusArt" src={eventCardArtUrl(card)} /> : null}
      <div>
        <span>{label}</span>
        <strong>{card?.name ?? fallback}</strong>
        {card ? <em>{card.text}</em> : null}
      </div>
    </div>
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
  const holdingIds = useMemo(
    () => holdings.map(({ tile, settlement }) => `${settlement.owner}-${tile.id}`),
    [holdings]
  );
  const [expandedHoldingIds, setExpandedHoldingIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setExpandedHoldingIds((current) => {
      const visibleHoldings = new Set(holdingIds);
      const next = new Set([...current].filter((holdingId) => visibleHoldings.has(holdingId)));

      return next.size === current.size ? current : next;
    });
  }, [holdingIds]);

  const toggleHolding = (holdingId: string) => {
    setExpandedHoldingIds((current) => {
      const next = new Set(current);

      if (next.has(holdingId)) {
        next.delete(holdingId);
      } else {
        next.add(holdingId);
      }

      return next;
    });
  };

  if (holdings.length === 0) {
    return <p className="emptyState">No settlements yet.</p>;
  }

  return (
    <div className="holdingStack">
      {holdings.map(({ tile, settlement }) => {
        const holdingId = `${settlement.owner}-${tile.id}`;
        const isExpanded = expandedHoldingIds.has(holdingId);
        const popTotal = totalPops(settlement.pops);
        const capacity = settlementPopCapacity(settlement.kind);
        const overCapacity = settlementOverCapacity(settlement);
        const slots = settlementBuildingSlots(tile, settlement);
        const tileYield = settlementTileYield(tile, settlement);
        const supplementalYield = calculateSettlementSupplementalYield(tile, settlement);
        const netYield = settlementNetYield(tile, tileYield, supplementalYield);
        const detailId = `holding-${settlement.owner}-${tile.q}-${tile.r}-details`;

        return (
          <article
            className={`holdingMatrix settlement-${settlement.kind}${overCapacity > 0 ? " overCapacityCard" : ""}${isExpanded ? " expandedHolding" : ""}`}
            key={holdingId}
          >
            <button
              aria-controls={detailId}
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? "Collapse" : "Expand"} ${capitalize(settlement.kind)} ${tile.id}: ${popTotal} of ${capacity} pops, ${settlement.buildings.length} of ${slots} building slots, ${formatNumber(tileYield)} ${RESOURCE_LABELS[tile.resource.type]} tile yield.`}
              className="holdingSummaryButton"
              onClick={() => toggleHolding(holdingId)}
              type="button"
            >
              <SettlementSummaryCard netYield={netYield} settlement={settlement} tile={tile} />
              <span className="collapseChevron" aria-hidden="true" />
            </button>

            <div className="holdingDetail" hidden={!isExpanded} id={detailId}>
              {overCapacity > 0 ? (
                <div className="holdingPenaltyLine overCapacityText">
                  <AtlasIcon icon="happiness" className="miniIcon" />
                  <strong>-{overCapacity}</strong>
                  <span>Happiness over capacity</span>
                </div>
              ) : null}

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
                      <div
                        className="popColumnHeader"
                        title={`${capitalize(formatPopLabel(pop, settlement.pops[pop]))}: ${settlement.pops[pop]}`}
                      >
                        <AtlasIcon icon={pop} className="miniIcon" />
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
                          <span className="emptyMini" title="No buildings of this type">—</span>
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
                          <span className="emptyMini" title="All available buildings built">✓</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function settlementNetYield(tile: HexTile, tileYield: number, supplementalYield: Resources): Resources {
  const net: Resources = { ...supplementalYield };
  net[tile.resource.type] += tileYield;
  return net;
}

function calculateSettlementSupplementalYield(tile: HexTile, settlement: Settlement): Resources {
  const resources = createEmptyResources();

  resources.influence += settlement.pops.citizens;
  resources.gold += settlement.pops.citizens * 2;
  resources.food -= settlement.pops.citizens * 2;

  resources.gold += settlement.pops.freemen * 2;
  resources.food -= settlement.pops.freemen;

  resources[tile.resource.type] += settlement.pops.slaves;
  resources.food -= settlement.pops.slaves;
  resources.happiness -= settlement.pops.slaves * 0.5;
  resources.happiness -= settlementOverCapacity(settlement);

  for (const buildingId of settlement.buildings) {
    const building = BUILDINGS.find((candidate) => candidate.id === buildingId);

    if (building) {
      addResources(resources, estimateBuildingIncomeDelta(tile, settlement, building));
    }
  }

  return resources;
}

function addResources(target: Resources, delta: Resources) {
  for (const resource of RESOURCE_ORDER) {
    target[resource] += delta[resource];
  }
}

function BuildingsTab({
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
  return (
    <div className="buildingsLedger">
      {BUILDINGS.map((building) => (
        <section className="buildingLedgerRow" key={building.id}>
          <div className="buildingLedgerLead">
            <AtlasIcon icon={building.id} className="buildingButtonIcon" />
            <span>
              <strong>{building.name}</strong>
              <em>{formatBuildingEffects(building.effects)}</em>
              <span className="buildingLedgerCost">
                Cost <b>{formatResourceCost(building.cost)}</b>
              </span>
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
          <strong>{G.playerDrawPile.length}</strong>
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
  phase,
  isActive,
  canGrowPops,
  canMovePops,
  canFoundColony,
  canUpgradeCity,
  isFoundColonyActive,
  hasPendingPlayerEvent,
  onMovePopsRequest,
  onGrowPopRequest,
  onFoundColonyRequest,
  onUpgradeCityRequest,
  onEndTurn
}: {
  G: HegemonyState;
  phase: Phase;
  isActive: boolean;
  canGrowPops: boolean;
  canMovePops: boolean;
  canFoundColony: boolean;
  canUpgradeCity: boolean;
  isFoundColonyActive: boolean;
  hasPendingPlayerEvent: boolean;
  onMovePopsRequest: () => void;
  onGrowPopRequest: () => void;
  onFoundColonyRequest: () => void;
  onUpgradeCityRequest: () => void;
  onEndTurn: () => void;
}) {
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
          disabled={!isActive || phase !== "gameplay" || hasPendingPlayerEvent || !canGrowPops}
          onClick={onGrowPopRequest}
          title={
            hasPendingPlayerEvent
              ? "Resolve the pending player event first."
              : canGrowPops
                ? "Choose a holding and pop type to grow."
                : "Requires an owned holding."
          }
        >
          <UiSprite item="growAction" className="commandIcon" />
          <span>Grow</span>
        </button>

        <button
          className="commandIconButton"
          disabled={!isActive || phase !== "gameplay" || hasPendingPlayerEvent || !canMovePops}
          onClick={onMovePopsRequest}
          title={
            hasPendingPlayerEvent
              ? "Resolve the pending player event first."
              : canMovePops
                ? "Move pops between two owned settlements."
                : "Requires at least two settlements."
          }
        >
          <UiSprite item="moveAction" className="commandIcon" />
          <span>Move</span>
        </button>

        <button
          aria-pressed={isFoundColonyActive}
          className={isFoundColonyActive ? "commandIconButton commandIconActive" : "commandIconButton"}
          disabled={!isActive || phase !== "gameplay" || hasPendingPlayerEvent || (!canFoundColony && !isFoundColonyActive)}
          onClick={onFoundColonyRequest}
          title={
            hasPendingPlayerEvent
              ? "Resolve the pending player event first."
              : isFoundColonyActive
                ? "Pick a glowing tile on the map, or click again to cancel."
                : canFoundColony
                  ? "Send a pop from an existing settlement to found a new colony."
                  : "Requires an open tile, a spare pop, and enough resources."
          }
        >
          <AtlasIcon icon="colony" className="commandIcon commandAtlasIcon" />
          <span>Found</span>
        </button>

        <button
          className="commandIconButton"
          disabled={!isActive || phase !== "gameplay" || hasPendingPlayerEvent || !canUpgradeCity}
          onClick={onUpgradeCityRequest}
          title={
            hasPendingPlayerEvent
              ? "Resolve the pending player event first."
              : canUpgradeCity
                ? "Upgrade one of your colonies into a city."
                : "Requires an upgradeable colony and enough resources."
          }
        >
          <AtlasIcon icon="city" className="commandIcon commandAtlasIcon" />
          <span>Upgrade</span>
        </button>

        <button
          className="commandEndTurn"
          disabled={!isActive || phase !== "gameplay" || hasPendingPlayerEvent}
          onClick={onEndTurn}
          title={
            hasPendingPlayerEvent
              ? "Resolve the pending player event first."
              : isActive
                ? "End the current player's turn."
                : "Current player's turn only."
          }
        >
          <UiSprite item="endTurn" className="endTurnSprite" />
          <span>End Turn</span>
        </button>
      </div>

      <DeckShelf G={G} />

      <ActionLogPanel G={G} />
    </div>
  );
}

function ActionLogPanel({ G }: { G: HegemonyState }) {
  const entries = G.log.slice().reverse();

  return (
    <section className="turnLogPanel" aria-label="Action log">
      <div className="turnLogHeader">
        <UiSprite item="seal" className="titleIcon" />
        <div>
          <h3>Chronicle</h3>
          <em>{entries.length} entries</em>
        </div>
      </div>
      <div className="turnLogList" tabIndex={0}>
        {entries.map((entry) => (
          <p key={entry.id}>
            <span>S{entry.season}</span>
            <b>{entry.message}</b>
          </p>
        ))}
      </div>
    </section>
  );
}

function PendingPlayerEventModal({
  G,
  playerID,
  isActive,
  moves
}: {
  G: HegemonyState;
  playerID: PlayerId;
  isActive: boolean;
  moves: GameMoves;
}) {
  const pending = G.pendingPlayerEvent;
  const card = pending?.card;
  const choices = card ? getEventEffectChoices(card) : [];
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState(0);
  const selectedEffects = choices[selectedChoiceIndex] ?? choices[0] ?? [];
  const popEffect = getAddPopsEffect(selectedEffects);
  const targetTileIds = popEffect ? getEventPopTargetTileIds(G, playerID, popEffect) : [];
  const [targetTileId, setTargetTileId] = useState(targetTileIds[0] ?? "");

  useEffect(() => {
    setSelectedChoiceIndex(0);
    setTargetTileId("");
  }, [card?.id]);

  useEffect(() => {
    if (!popEffect) {
      setTargetTileId("");
      return;
    }

    if (!targetTileIds.includes(targetTileId)) {
      setTargetTileId(targetTileIds[0] ?? "");
    }
  }, [popEffect, targetTileId, targetTileIds]);

  if (!pending || !card) {
    return null;
  }

  const canConfirm = isActive && (!popEffect || targetTileIds.length > 0);
  const actionLabel = choices.length > 1 ? "Resolve Choice" : popEffect ? "Place Pops" : "Claim Event";

  return (
    <div className="modalBackdrop eventModalBackdrop" role="presentation">
      <section className="eventCardReveal" role="dialog" aria-modal="true" aria-labelledby="pending-event-title">
        <div className="eventCardSurface">
          <div className="eventCardCrest">
            <span>Player Event</span>
            <b>{G.players[playerID].name}</b>
          </div>

          <div className="eventCardArtFrame">
            <img alt={`${card.name} card art`} src={eventCardArtUrl(card)} />
          </div>

          <div className="eventCardBody">
            <span className="eventCardDeckLabel">Hegemony Event</span>
            <h2 id="pending-event-title">{card.name}</h2>
            <p>{card.text}</p>

            {choices.length > 1 ? (
              <div className="eventChoiceStack" role="group" aria-label="Event choices">
                {choices.map((effects, index) => {
                  const optionPopEffect = getAddPopsEffect(effects);
                  const disabled = Boolean(optionPopEffect && getEventPopTargetTileIds(G, playerID, optionPopEffect).length === 0);

                  return (
                    <button
                      className={index === selectedChoiceIndex ? "selectedChoice eventChoiceButton" : "eventChoiceButton"}
                      disabled={disabled}
                      key={`${card.id}-${index}`}
                      onClick={() => setSelectedChoiceIndex(index)}
                    >
                      <strong>Option {index + 1}</strong>
                      <span>{formatEventEffects(effects)}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="eventSingleEffect">
                <strong>Effect</strong>
                <span>{formatEventEffects(selectedEffects)}</span>
              </div>
            )}

            {popEffect ? (
              <label className="fieldGroup eventTargetField">
                <span>Settlement target</span>
                <select value={targetTileId} onChange={(event) => setTargetTileId(event.target.value)}>
                  {targetTileIds.map((tileId) => {
                    const tile = G.board.tiles.find((candidate) => candidate.id === tileId);
                    const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);

                    return (
                      <option value={tileId} key={tileId}>
                        {tile ? `${capitalize(settlement?.kind ?? "settlement")} ${tile.id} - ${capitalize(tile.terrain)}` : tileId}
                      </option>
                    );
                  })}
                </select>
                {targetTileIds.length === 0 ? <em>No owned settlement has enough capacity for this option.</em> : null}
              </label>
            ) : null}

            {!isActive ? (
              <div className="selectionSummary negative">
                <span>Only the active player can resolve this event.</span>
              </div>
            ) : null}
          </div>

          <div className="eventCardFooter">
            <button
              className="primaryButton eventResolveButton"
              disabled={!canConfirm}
              onClick={() => moves.resolvePendingPlayerEvent(popEffect ? targetTileId : undefined, selectedChoiceIndex)}
            >
              {actionLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function DeckShelf({ G }: { G: HegemonyState }) {
  const seasonalTotal = totalCardCount(SEASONAL_EVENT_CARDS);
  const playerTotal = totalCardCount(PLAYER_EVENT_CARDS);
  const decks: Array<{ label: string; count: string; item: "seasonDeck" | "eventDeck" | "resolutionDeck"; detail: string }> = [
    {
      label: "Seasonal",
      count: `${G.seasonalDrawPile.length}/${seasonalTotal}`,
      item: "seasonDeck",
      detail: "Seasonal cards remaining."
    },
    {
      label: "Events",
      count: `${G.playerDrawPile.length}/${playerTotal}`,
      item: "eventDeck",
      detail: "Player event cards remaining."
    },
    {
      label: "Resolutions",
      count: "0/0",
      item: "resolutionDeck",
      detail: "Resolution deck placeholder for future assembly mechanics."
    }
  ];

  return (
    <section className="deckShelf" aria-label="Future card decks">
      {decks.map((deck) => (
        <div className="deckPlaceholder" key={deck.label} tabIndex={0} title={deck.detail}>
          <span className="deckCardFace">
            <UiSprite item={deck.item} className="deckSprite" />
          </span>
          <span className="deckCopy">
            <strong>{deck.label}</strong>
            <em>{deck.count}</em>
          </span>
        </div>
      ))}
    </section>
  );
}

function totalCardCount(cards: EventCard[]) {
  return cards.reduce((total, card) => total + card.count, 0);
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
  const tooltipId = useId();
  const tooltipLabel = [building.name, ...tooltipRows].join(". ");
  const [tooltipPosition, setTooltipPosition] = useState<{
    left: number;
    top: number;
    placement: "above" | "below";
  } | null>(null);

  const showTooltip = (target: HTMLElement) => {
    if (typeof window === "undefined") {
      return;
    }

    const rect = target.getBoundingClientRect();
    const gutter = 10;
    const tooltipWidth = Math.min(DETAIL_TOOLTIP_WIDTH, window.innerWidth - gutter * 2);
    const centeredLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const left = Math.min(
      Math.max(gutter, centeredLeft),
      Math.max(gutter, window.innerWidth - tooltipWidth - gutter)
    );
    const placement = rect.top < 150 ? "below" : "above";

    setTooltipPosition({
      left,
      top: placement === "below" ? rect.bottom : rect.top,
      placement
    });
  };

  const hideTooltip = () => setTooltipPosition(null);

  const content = (
    <>
      <AtlasIcon icon={building.id} className="miniIcon" />
    </>
  );

  const tooltip =
    tooltipPosition && typeof document !== "undefined"
      ? createPortal(
          <span
            className={`detailTooltip floatingDetailTooltip${
              tooltipPosition.placement === "below" ? " detailTooltipBelow" : ""
            }`}
            id={tooltipId}
            role="tooltip"
            style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
          >
            <strong>{building.name}</strong>
            {tooltipRows.map((row) => (
              <em key={row}>{row}</em>
            ))}
          </span>,
          document.body
        )
      : null;

  if (mode === "option") {
    return (
      <>
        <button
          aria-describedby={tooltipPosition ? tooltipId : undefined}
          aria-disabled={disabled}
          aria-label={tooltipLabel}
          className="buildingChip buildingChipOption"
          onBlur={hideTooltip}
          onClick={disabled ? undefined : onClick}
          onFocus={(event) => showTooltip(event.currentTarget)}
          onMouseEnter={(event) => showTooltip(event.currentTarget)}
          onMouseLeave={hideTooltip}
          type="button"
        >
          {content}
        </button>
        {tooltip}
      </>
    );
  }

  return (
    <>
      <span
        aria-describedby={tooltipPosition ? tooltipId : undefined}
        aria-label={tooltipLabel}
        className="buildingChip buildingChipBuilt"
        onBlur={hideTooltip}
        onFocus={(event) => showTooltip(event.currentTarget)}
        onMouseEnter={(event) => showTooltip(event.currentTarget)}
        onMouseLeave={hideTooltip}
        tabIndex={0}
      >
        {content}
      </span>
      {tooltip}
    </>
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
    `Cost: ${formatResourceCost(status.cost ?? building.cost)}.`,
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

function holdingShortLabel(tile: HexTile, settlement: Settlement) {
  return `${capitalize(settlement.kind)} ${tile.id}`;
}

function placementKindLabel(kind: Extract<SettlementKind, "city" | "colony">) {
  return kind === "city" ? "city" : "colony";
}

const EVENT_CARD_ART: Record<string, string> = {
  "season-drought": new URL("../../assets/event-cards/season-drought.png", import.meta.url).href,
  "season-bountiful-harvest": new URL("../../assets/event-cards/season-bountiful-harvest.png", import.meta.url).href,
  "season-timber-levies": new URL("../../assets/event-cards/season-timber-levies.png", import.meta.url).href,
  "season-quarry-contracts": new URL("../../assets/event-cards/season-quarry-contracts.png", import.meta.url).href,
  "season-grain-tithe": new URL("../../assets/event-cards/season-grain-tithe.png", import.meta.url).href,
  "season-civic-anxiety": new URL("../../assets/event-cards/season-civic-anxiety.png", import.meta.url).href,
  "season-festival-games": new URL("../../assets/event-cards/season-festival-games.png", import.meta.url).href,
  "season-scarce-labor": new URL("../../assets/event-cards/season-scarce-labor.png", import.meta.url).href,
  "season-skilled-artisans": new URL("../../assets/event-cards/season-skilled-artisans.png", import.meta.url).href,
  "season-open-markets": new URL("../../assets/event-cards/season-open-markets.png", import.meta.url).href,
  "player-new-citizen": new URL("../../assets/event-cards/player-new-citizen.png", import.meta.url).href,
  "player-free-settlers": new URL("../../assets/event-cards/player-free-settlers.png", import.meta.url).href,
  "player-captured-laborers": new URL("../../assets/event-cards/player-captured-laborers.png", import.meta.url).href,
  "player-good-stores": new URL("../../assets/event-cards/player-good-stores.png", import.meta.url).href,
  "player-timber-windfall": new URL("../../assets/event-cards/player-timber-windfall.png", import.meta.url).href,
  "player-merchant-profit": new URL("../../assets/event-cards/player-merchant-profit.png", import.meta.url).href,
  "player-stone-shipment": new URL("../../assets/event-cards/player-stone-shipment.png", import.meta.url).href,
  "player-local-unrest": new URL("../../assets/event-cards/player-local-unrest.png", import.meta.url).href,
  "player-public-calm": new URL("../../assets/event-cards/player-public-calm.png", import.meta.url).href,
  "player-patronage-network": new URL("../../assets/event-cards/player-patronage-network.png", import.meta.url).href,
  "player-emergency-labor": new URL("../../assets/event-cards/player-emergency-labor.png", import.meta.url).href,
  "player-granary-surplus": new URL("../../assets/event-cards/player-granary-surplus.png", import.meta.url).href,
  "player-civic-petition": new URL("../../assets/event-cards/player-civic-petition.png", import.meta.url).href,
  "player-skilled-mason": new URL("../../assets/event-cards/player-skilled-mason.png", import.meta.url).href,
  "player-caravan-contacts": new URL("../../assets/event-cards/player-caravan-contacts.png", import.meta.url).href,
  "player-forest-crews": new URL("../../assets/event-cards/player-forest-crews.png", import.meta.url).href,
  "player-temple-donation": new URL("../../assets/event-cards/player-temple-donation.png", import.meta.url).href,
  "player-market-day": new URL("../../assets/event-cards/player-market-day.png", import.meta.url).href
};

function eventCardArtUrl(card: EventCard) {
  return EVENT_CARD_ART[card.id] ?? EVENT_CARD_ART["season-drought"];
}

function formatEventEffects(effects: EventEffect[]) {
  return effects.map(formatEventEffect).join(" / ");
}

function formatEventEffect(effect: EventEffect): string {
  if (effect.type === "resourceDelta") {
    return `${formatSignedNumber(effect.amount)} ${RESOURCE_LABELS[effect.resource]}`;
  }

  if (effect.type === "scaledResourceDelta") {
    return `${formatSignedNumber(effect.amountPerPops)} ${RESOURCE_LABELS[effect.resource]} per ${effect.popStep} pops`;
  }

  if (effect.type === "happinessDelta") {
    return `${formatSignedNumber(effect.amount)} ${RESOURCE_LABELS.happiness}`;
  }

  if (effect.type === "scaledHappinessDelta") {
    return `${formatSignedNumber(effect.amountPerPops)} ${RESOURCE_LABELS.happiness} per ${effect.popStep} pops`;
  }

  if (effect.type === "incomeModifier") {
    return `${formatSignedNumber(effect.amount)} ${RESOURCE_LABELS[effect.resource]} income`;
  }

  if (effect.type === "buildingCostMultiplier") {
    return effect.multiplier > 1 ? "Double building costs this season" : "Halve building costs this season";
  }

  if (effect.type === "addPops") {
    return `Add ${effect.amount} ${formatPopLabel(effect.pop, effect.amount)}`;
  }

  if (effect.type === "actionCostDiscount") {
    const target = effect.buildingId ? buildingNameForEvent(effect.buildingId) : effect.action === "foundColony" ? "colony" : "building";

    return `Next ${target}: -${formatNumber(effect.amount)} ${RESOURCE_LABELS[effect.resource]}`;
  }

  if (effect.type === "resourceExchange") {
    return `Exchange up to ${effect.maxAmount} ${RESOURCE_LABELS[effect.from]} for ${RESOURCE_LABELS[effect.to]}`;
  }

  if (effect.type === "resourceDeltaPerPop") {
    return `${formatSignedNumber(effect.amountPerPop)} ${RESOURCE_LABELS[effect.resource]} per ${formatPopLabel(
      effect.pop,
      1
    )}, minimum ${effect.minimum}`;
  }

  return "Choose one option";
}

function buildingNameForEvent(buildingId: BuildingId) {
  return BUILDINGS.find((building) => building.id === buildingId)?.name ?? buildingId;
}

function createEmptyResources(): Resources {
  return { ...EMPTY_RESOURCES };
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
