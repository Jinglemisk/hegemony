import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameEvents, GameMoves, LocalContext } from "../game/controller";
import {
  calculateEconomyProjection,
  canPlaceColonyOnTile,
  getBuildBuildingStatus,
  getFoundColonyStatus,
  getUpgradeColonyToCityStatus,
  toPlayerId
} from "../game/rules";
import type { BuildingId, HegemonyState, PlayerId } from "../game/types";
import { HexMap } from "./HexMap";
import { FoundColonyPopover, MovePopsModal, PopulationPickerModal, UpgradeCityModal } from "./PopulationModals";
import { ResourceGrid } from "./ResourceGrid";
import { ActionCommandPanel } from "./board/command/ActionCommandPanel";
import { CalmModal } from "./board/modals/CalmModal";
import { GameOverModal } from "./board/modals/GameOverModal";
import { EmpireIntelPanel } from "./board/ledger/EmpireIntelPanel";
import { GrowPopModal } from "./board/modals/GrowPopModal";
import { PendingPlayerEventModal } from "./board/modals/PendingPlayerEventModal";
import { LadderModal } from "./board/modals/LadderModal";
import type { LadderRequest } from "./board/modals/LadderModal";
import { RiotModal } from "./board/modals/RiotModal";
import { VentureModal } from "./board/modals/VentureModal";
import { PlayerScoreboard } from "./board/topbar/PlayerScoreboard";
import { SeasonStatus } from "./board/topbar/SeasonStatus";
import { TopbarEvents } from "./board/topbar/TopbarEvents";
import type { EmpireTab } from "./board/types";

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
  action: "foundColony" | "upgradeCity";
  label: string;
  tileId: string;
};

type SetupPlacement = "capital" | "city" | "colony";

const PLACEMENT_LABELS: Record<SetupPlacement, string> = {
  capital: "metropolis",
  city: "second city",
  colony: "founding colony"
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
    placement: SetupPlacement;
    tileId: string;
  } | null>(null);
  const [gameOverDismissed, setGameOverDismissed] = useState(false);
  const [foundColonyMode, setFoundColonyMode] = useState(false);
  const [foundColonyTarget, setFoundColonyTarget] = useState<{ tileId: string; anchor: DOMRect } | null>(null);
  const [isUpgradeCityOpen, setIsUpgradeCityOpen] = useState(false);
  const [isGrowPopOpen, setIsGrowPopOpen] = useState(false);
  const [isMovePopsOpen, setIsMovePopsOpen] = useState(false);
  const [isCalmOpen, setIsCalmOpen] = useState(false);
  const [isVentureOpen, setIsVentureOpen] = useState(false);
  const [ladderRequest, setLadderRequest] = useState<LadderRequest | null>(null);
  // Keeps the riot modal mounted one beat past resolution so the outcome can be read.
  const [riotResultOpen, setRiotResultOpen] = useState(false);
  const [activeEmpireTab, setActiveEmpireTab] = useState<EmpireTab>("cities");
  const currentPlayerId = toPlayerId(ctx.currentPlayer);
  const viewerId = toPlayerId(playerID);
  const viewer = G.players[viewerId];
  const hasPendingPlayerEvent = Boolean(G.pendingPlayerEvent);
  const projectedEconomy = useMemo(
    () => calculateEconomyProjection(G, viewerId, { resolveTransfers: true }),
    [G, viewerId]
  );
  const projectedIncome = projectedEconomy.income;
  const projectedIncomeBreakdown = projectedEconomy.breakdown;
  const isSetup = ctx.phase === "setupCapital" || ctx.phase === "setupCity" || ctx.phase === "setupColony";
  const canFoundColony = G.board.tiles.some((tile) => getFoundColonyStatus(G, viewerId, tile.id).can);
  const canUpgradeCity = G.board.tiles.some((tile) => getUpgradeColonyToCityStatus(G, viewerId, tile.id).can);
  const foundColonyValidTileIds = useMemo(
    () =>
      foundColonyMode
        ? G.board.tiles.filter((tile) => getFoundColonyStatus(G, viewerId, tile.id).can).map((tile) => tile.id)
        : [],
    [foundColonyMode, G, viewerId]
  );
  // During the founding-colony round, glow every legal tile (coast or beside the metropolis).
  const setupColonyValidTileIds = useMemo(
    () =>
      ctx.phase === "setupColony"
        ? G.board.tiles.filter((tile) => canPlaceColonyOnTile(G, currentPlayerId, tile, "setup").can).map((tile) => tile.id)
        : [],
    [ctx.phase, G, currentPlayerId]
  );
  const pendingSetupCopy =
    ctx.phase === "setupCapital"
      ? "Select a tile for your metropolis — never adjacent to another city"
      : ctx.phase === "setupCity"
        ? "Select a tile for your second city — never adjacent to another city"
        : ctx.phase === "setupColony"
          ? "Select a glowing tile for your founding colony — any coast, or beside your metropolis"
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
    setIsCalmOpen(false);
    setIsVentureOpen(false);
    setLadderRequest(null);
    setRiotResultOpen(false);
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

  const handleTileAction = useCallback(
    (tileId: string) => {
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

      if (ctx.phase === "setupCapital" || ctx.phase === "setupCity" || ctx.phase === "setupColony") {
        const placement: SetupPlacement =
          ctx.phase === "setupCapital" ? "capital" : ctx.phase === "setupCity" ? "city" : "colony";
        setTileConfirmation(null);
        setPopulationPrompt({ placement, tileId });
        return;
      }

      if (!isActive) {
        return;
      }

      setTileConfirmation(null);
    },
    [foundColonyMode, G, viewerId, ctx.phase, isActive]
  );

  const confirmTileAction = useCallback(() => {
    if (!tileConfirmation) {
      return;
    }

    if (tileConfirmation.action === "foundColony") {
      setFoundColonyMode(true);
    } else {
      setIsUpgradeCityOpen(true);
    }

    setTileConfirmation(null);
  }, [tileConfirmation]);

  const requestBuildBuilding = useCallback(
    (tileId: string, buildingId: BuildingId) => {
      setSelectedTileId(tileId);

      if (ctx.phase === "gameplay" && isActive && !hasPendingPlayerEvent && getBuildBuildingStatus(G, viewerId, tileId, buildingId).can) {
        moves.buildBuilding(tileId, buildingId);
      }
    },
    [ctx.phase, isActive, hasPendingPlayerEvent, G, viewerId, moves]
  );

  const confirmation = useMemo(
    () =>
      tileConfirmation
        ? {
            label: tileConfirmation.label,
            tileId: tileConfirmation.tileId,
            onCancel: () => setTileConfirmation(null),
            onConfirm: confirmTileAction
          }
        : null,
    [tileConfirmation, confirmTileAction]
  );

  return (
    <main className="shell uiOverhaulShell">
      <header className="topbar strategyTopbar">
        <TopbarEvents G={G} />

        <SeasonStatus G={G} isActive={isActive} currentPlayerId={currentPlayerId} />

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
            onBankSell={moves.bankSell}
            onBankBuy={moves.bankBuy}
            onLadderRequest={setLadderRequest}
          />
        </aside>

        <section className="mapColumn strategyMapColumn">
          <div className="mapFrame">
            <HexMap
              G={G}
              confirmation={confirmation}
              pendingTileId={tileConfirmation?.tileId ?? null}
              selectedTileId={selectedTileId}
              highlightTileIds={foundColonyMode ? foundColonyValidTileIds : setupColonyValidTileIds}
              placementActive={foundColonyMode || ctx.phase === "setupColony"}
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
            calmUsed={viewer.civicCalmUsedThisTurn}
            ventureUsed={viewer.ventureUsedThisTurn}
            onEndTurn={events.endTurn}
            onGrowPopRequest={() => setIsGrowPopOpen(true)}
            onMovePopsRequest={() => setIsMovePopsOpen(true)}
            onCalmRequest={() => setIsCalmOpen(true)}
            onVentureRequest={() => setIsVentureOpen(true)}
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
          title={`Choose ${PLACEMENT_LABELS[populationPrompt.placement]} pops`}
          description={`Allocate exactly ${G.ruleset.placementPopCounts[populationPrompt.placement]} starting ${
            G.ruleset.placementPopCounts[populationPrompt.placement] === 1 ? "pop" : "pops"
          } before placing this ${PLACEMENT_LABELS[populationPrompt.placement]}.`}
          requiredTotal={G.ruleset.placementPopCounts[populationPrompt.placement]}
          confirmLabel={`Place ${PLACEMENT_LABELS[populationPrompt.placement]}`}
          onCancel={() => setPopulationPrompt(null)}
          onConfirm={(pops) => {
            if (populationPrompt.placement === "capital") {
              moves.placeCapital(populationPrompt.tileId, pops);
            } else if (populationPrompt.placement === "city") {
              moves.placeCity(populationPrompt.tileId, pops);
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
      {isCalmOpen ? (
        <CalmModal G={G} playerID={viewerId} isActive={isActive} moves={moves} onClose={() => setIsCalmOpen(false)} />
      ) : null}
      {ladderRequest ? (
        <LadderModal
          G={G}
          playerID={viewerId}
          request={ladderRequest}
          phase={ctx.phase}
          isActive={isActive}
          onCancel={() => setLadderRequest(null)}
          onConfirm={(tileId, from, kind) => {
            if (kind === "promote") {
              moves.promotePop(tileId, from);
            } else {
              moves.demotePop(tileId, from);
            }
            setLadderRequest(null);
          }}
        />
      ) : null}
      {isVentureOpen ? (
        <VentureModal
          G={G}
          playerID={viewerId}
          isActive={isActive}
          moves={moves}
          onClose={() => setIsVentureOpen(false)}
        />
      ) : null}
      {G.pendingRiot || riotResultOpen ? (
        <RiotModal
          G={G}
          playerID={G.pendingRiot?.playerID ?? currentPlayerId}
          isActive={isActive && (G.pendingRiot?.playerID ?? currentPlayerId) === currentPlayerId}
          moves={moves}
          onRolled={() => setRiotResultOpen(true)}
          onDismissResult={() => setRiotResultOpen(false)}
        />
      ) : null}
      {ctx.phase === "gameOver" && !gameOverDismissed ? (
        <GameOverModal G={G} onInspectBoard={() => setGameOverDismissed(true)} />
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
