import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameEvents, GameMoves, LocalContext } from "../game/controller";
import {
  POP_TYPES,
  calculateEconomyProjection,
  canPlaceColonyOnTile,
  getBuildBuildingStatus,
  getFoundColonyStatus,
  getGrowPopStatus,
  getUpgradeColonyToCityStatus,
  toPlayerId,
  totalPops
} from "../game/rules";
import type { BuildingId, HegemonyState, PlayerId, Resource } from "../game/types";
import { PLAYER_NAMES, OMEN_TABLE, BUILDINGS } from "../game/data";
import { HexMap } from "./HexMap";
import { ResourceGrid } from "./ResourceGrid";
import { BuildPopover } from "./board/map/BuildPopover";
import { PopulationPickerModal } from "./board/modals/PopulationPickerModal";
import { UpgradeCityModal } from "./board/modals/UpgradeCityModal";
import { FoundColonyPopover } from "./board/modals/FoundColonyPopover";
import { GrowPopPopover } from "./board/map/GrowPopPopover";
import { LadderPopover } from "./board/map/LadderPopover";
import { MovePopsSourcePopover, MovePopsTargetPopover } from "./board/map/MovePopsPopover";
import { selectionCaption, type MapSelectionMode } from "./board/map/mapSelection";
import { useMapSelection } from "./board/map/useMapSelection";
import { CommandDock } from "./board/command/CommandDock";
import { CalmModal } from "./board/modals/CalmModal";
import { EventTableModal } from "./board/modals/EventTableModal";
import { GameOverModal } from "./board/modals/GameOverModal";
import { EmpireIntelPanel } from "./board/ledger/EmpireIntelPanel";
import { LedgerRail } from "./board/ledger/LedgerRail";
import { ConsultRail } from "./board/ledger/ConsultRail";
import { ConsultPanel } from "./board/ledger/ConsultPanel";
import { routeTo, type ConsultRoute, type LedgerRoute } from "./board/ledger/route";
import { PendingPlayerEventModal } from "./board/modals/PendingPlayerEventModal";
import type { LadderRequest } from "./board/map/LadderPopover";
import { RiotModal } from "./board/modals/RiotModal";
import { VentureModal } from "./board/modals/VentureModal";
import { PlayerScoreboard } from "./board/topbar/PlayerScoreboard";
import { SeasonStatus } from "./board/topbar/SeasonStatus";
import { TopbarEvents } from "./board/topbar/TopbarEvents";
import { GameUiProvider, type GameUi } from "./board/GameUiContext";
import { getOwnedHoldings } from "./board/helpers";

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

// Resources ride the top bar now (ui-refit Step 3 / Q17), split around the season
// medallion: raw materials on the left, the softer economy on the right.
const TOP_RESOURCES_LEFT: Resource[] = ["wood", "stone", "food"];
const TOP_RESOURCES_RIGHT: Resource[] = ["gold", "influence", "happiness"];

/**
 * Exactly one dialog owns the screen at a time — the union makes that a type
 * invariant instead of a rule six independent booleans could break. The
 * self-mounting dialogs are deliberately NOT here: riot, pending event, game
 * over and the omen mount off engine state (G.pendingRiot, G.pendingPlayerEvent,
 * ctx.phase), so they cannot be opened or closed by a click and must not be
 * modelled as UI intent.
 */
type ActiveModal =
  | { kind: "populationPrompt"; placement: SetupPlacement; tileId: string }
  | { kind: "upgradeCity" }
  | { kind: "calm" }
  | { kind: "venture" }

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
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
  const [gameOverDismissed, setGameOverDismissed] = useState(false);
  // Keeps the riot modal mounted one beat past resolution so the outcome can be read.
  const [riotResultOpen, setRiotResultOpen] = useState(false);
  // Initialized to the omen standing at mount so a reload never re-announces it.
  const [seenOmenYear, setSeenOmenYear] = useState<number | null>(() => G.yearOmen?.year ?? null);
  // Each panel's page is a ROUTE ({view, entry?, scroll?}), not a bare tab enum
  // (two-panel.md) — one frame deep for now, so Phase 3's deep-links/history widen it
  // rather than retrofit an enum. The ledger boots open on Cities (ui-refit Step 2); a
  // rail disc toggles it, its own × closes it, so the sea can be read whole.
  const [ledgerRoute, setLedgerRoute] = useState<LedgerRoute>({ view: "cities" });
  const [isLedgerOpen, setLedgerOpen] = useState(true);
  // The right consult rail (two-panel.md): Chronicle/Codex/Victory. Independent of the
  // left ledger — both can be open at once (owner, 2026-07-18). Boots closed; the sea
  // outranks reference, and the dock ticker keeps the latest chronicle line visible.
  const [consultRoute, setConsultRoute] = useState<ConsultRoute>({ view: "chronicle" });
  const [isConsultOpen, setConsultOpen] = useState(false);
  const currentPlayerId = toPlayerId(ctx.currentPlayer);
  const viewerId = toPlayerId(playerID);
  const viewer = G.players[viewerId];
  const hasPendingPlayerEvent = Boolean(G.pendingPlayerEvent);
  const gameUi = useMemo<GameUi>(
    () => ({
      G,
      viewerId,
      viewer,
      currentPlayerId,
      phase: ctx.phase,
      isActive,
      hasPendingPlayerEvent,
      moves,
      events
    }),
    [G, viewerId, viewer, currentPlayerId, ctx.phase, isActive, hasPendingPlayerEvent, moves, events]
  );
  const projectedEconomy = useMemo(
    () => calculateEconomyProjection(G, viewerId, { resolveTransfers: true }),
    [G, viewerId]
  );
  const projectedIncome = projectedEconomy.income;
  const projectedIncomeBreakdown = projectedEconomy.breakdown;
  const isSetup = ctx.phase === "setupCapital" || ctx.phase === "setupCity" || ctx.phase === "setupColony";
  const canFoundColony = G.board.tiles.some((tile) => getFoundColonyStatus(G, viewerId, tile.id).can);
  const canUpgradeCity = G.board.tiles.some((tile) => getUpgradeColonyToCityStatus(G, viewerId, tile.id).can);
  // A verb must never offer a mode the board can't answer. These ask the engine the
  // same question the glow does, so "Grow" is live exactly when some settlement can
  // actually grow — not merely when the player owns one.
  const canGrowPops = useMemo(
    () =>
      getOwnedHoldings(G, viewerId).some(({ tile }) =>
        POP_TYPES.some((pop) => getGrowPopStatus(G, viewerId, tile.id, pop).can)
      ),
    [G, viewerId]
  );
  const canMovePops = useMemo(() => {
    const holdings = getOwnedHoldings(G, viewerId);

    return holdings.length >= 2 && holdings.some(({ settlement }) => totalPops(settlement.pops) > 0);
  }, [G, viewerId]);
  // Build is live when some settlement could raise some building — the same engine
  // check the glow and the popover use, so the verb never offers an empty map.
  const canBuild = useMemo(
    () =>
      getOwnedHoldings(G, viewerId).some(({ tile }) =>
        BUILDINGS.some((building) => getBuildBuildingStatus(G, viewerId, tile.id, building.id).can)
      ),
    [G, viewerId]
  );
  // The map is the picker (refit scope 3): every "which settlement?" flow arms a
  // mode here, the board glows its legal tiles, and a popover confirms on the
  // spot — no dialog is laid over the answer.
  const mapSelection = useMapSelection({ G, playerID: viewerId, isActive });
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

  const closeModal = useCallback(() => setActiveModal(null), []);

  /** Arming a map mode always clears dialogs: the board must never be covered
   *  while it is being asked a question (refit scope 3, selection rule 1). */
  const armSelection = useCallback(
    (mode: MapSelectionMode) => {
      setActiveModal(null);
      setTileConfirmation(null);
      mapSelection.arm(mode);
    },
    [mapSelection]
  );
  // The chronicle is a right-rail consult page now (two-panel.md); its newest line
  // still rides the command bar so the narration is never fully hidden.
  const latestChronicleLine = G.log.length > 0 ? G.log[G.log.length - 1].message : null;

  // Handing the turn over closes everything the previous seat had open.
  useEffect(() => {
    setTileConfirmation(null);
    setActiveModal(null);
    mapSelection.clear();
    setRiotResultOpen(false);
  }, [ctx.phase, ctx.currentPlayer]);

  // A drawn event takes the screen: dismiss the player's own dialogs behind it.
  // The ledger is left alone — the codex lives there now, and reading a rule
  // mid-event is exactly when a player needs it.
  useEffect(() => {
    if (!G.pendingPlayerEvent) {
      return;
    }

    setTileConfirmation(null);
    mapSelection.clear();
    setActiveModal(null);
  }, [G.pendingPlayerEvent]);

  // `?` toggles the codex from anywhere — it is a consult page now (right panel), so
  // this is the same act as pressing its rail disc.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
        return;
      }

      if (event.key === "?") {
        setConsultOpen((open) => !(open && consultRoute.view === "codex"));
        setConsultRoute(routeTo("codex"));
      }
      // Escape is ModalShell's job — every dialog gets it from the one place.
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [consultRoute.view]);

  const handleTileAction = useCallback(
    (tileId: string) => {
      setSelectedTileId(tileId);

      // A mode is armed: the click IS the answer (refit scope 3).
      if (mapSelection.selection) {
        if (!mapSelection.candidateTileIds.includes(tileId)) {
          // Clicking a tile the rules would refuse does nothing — the glow is the
          // contract, and it comes from the engine's own status checks.
          return;
        }

        const element = typeof document !== "undefined" ? document.querySelector(`[data-tile-id="${tileId}"]`) : null;

        if (!element) {
          return;
        }

        mapSelection.setTarget({ tileId, anchor: element.getBoundingClientRect() });
        return;
      }

      if (ctx.phase === "setupCapital" || ctx.phase === "setupCity" || ctx.phase === "setupColony") {
        const placement: SetupPlacement =
          ctx.phase === "setupCapital" ? "capital" : ctx.phase === "setupCity" ? "city" : "colony";
        setTileConfirmation(null);
        setActiveModal({ kind: "populationPrompt", placement, tileId });
        return;
      }

      if (!isActive) {
        return;
      }

      setTileConfirmation(null);
    },
    [mapSelection, ctx.phase, isActive]
  );

  const confirmTileAction = useCallback(() => {
    if (!tileConfirmation) {
      return;
    }

    if (tileConfirmation.action === "foundColony") {
      mapSelection.arm({ kind: "foundColony" });
    } else {
      setActiveModal({ kind: "upgradeCity" });
    }

    setTileConfirmation(null);
  }, [tileConfirmation, mapSelection]);

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
    <GameUiProvider value={gameUi}>
    <main className="shell uiOverhaulShell">
      {/* The map is the stage now, not a grid cell: a full-bleed sea the chrome
          floats over (ui-refit Step 1). The captions ride the stage so they stay
          pinned to the sea, not to a docked frame. */}
      <div className="mapStage">
        <HexMap
          G={G}
          confirmation={confirmation}
          pendingTileId={tileConfirmation?.tileId ?? null}
          selectedTileId={selectedTileId}
          highlightTileIds={mapSelection.selection ? mapSelection.candidateTileIds : setupColonyValidTileIds}
          placementActive={Boolean(mapSelection.selection) || ctx.phase === "setupColony"}
          onTileAction={handleTileAction}
        />
        {isSetup ? (
          <div className="mapSetupCaption" role="status">
            {pendingSetupCopy}
          </div>
        ) : null}
        {mapSelection.selection ? (
          <div className="mapSetupCaption placementCaption" role="status">
            {selectionCaption(mapSelection.selection.mode, mapSelection.candidateTileIds.length)}
          </div>
        ) : null}
      </div>

      <header className="topbar strategyTopbar">
        <TopbarEvents G={G} />

        {/* Resources split around the season medallion (Q17 · KYKLOS arrangement). */}
        <div className="seasonBanner">
          <ResourceGrid
            className="topResourceHalf topResourceLeft"
            order={TOP_RESOURCES_LEFT}
            resources={viewer.resources}
            deltas={projectedIncome}
            breakdown={projectedIncomeBreakdown}
            resetKey={`resL-${viewerId}`}
          />

          <SeasonStatus G={G} />

          <ResourceGrid
            className="topResourceHalf topResourceRight"
            order={TOP_RESOURCES_RIGHT}
            resources={viewer.resources}
            deltas={projectedIncome}
            breakdown={projectedIncomeBreakdown}
            resetKey={`resR-${viewerId}`}
          />
        </div>

        <PlayerScoreboard
          currentPlayerId={currentPlayerId}
          onPlayerIDChange={onPlayerIDChange}
          viewerId={viewerId}
        />
      </header>

      {/* The KYKLOS ledger (ui-refit Step 2): a disc rail threaded on the left
          spine, and the tab contents in a floating ivory card the rail opens. */}
      <section className="workbench strategyWorkbench">
        <LedgerRail
          activeTab={ledgerRoute.view}
          isOpen={isLedgerOpen}
          onSelectTab={(tab) => {
            // A disc opens the ledger to its tab; pressing the tab already showing
            // closes it. So the same disc both reveals and dismisses.
            setLedgerOpen((open) => !(open && tab === ledgerRoute.view));
            setLedgerRoute(routeTo(tab));
          }}
        />

        {isLedgerOpen ? (
          <aside className="panel empirePanel intelPanel">
            <EmpireIntelPanel
              activeTab={ledgerRoute.view}
              onBuildBuildingRequest={requestBuildBuilding}
              onClose={() => setLedgerOpen(false)}
              onBankSell={moves.bankSell}
              onBankBuy={moves.bankBuy}
              onLadderRequest={(request) => armSelection({ kind: "ladder", request })}
            />
          </aside>
        ) : null}

        {/* The right consult rail + its floating card, mirroring the left ledger on the
            far edge (two-panel.md). Independent of the ledger — both may be open. */}
        <ConsultRail
          activeTab={consultRoute.view}
          isOpen={isConsultOpen}
          onSelectTab={(tab) => {
            setConsultOpen((open) => !(open && tab === consultRoute.view));
            setConsultRoute(routeTo(tab));
          }}
        />

        {isConsultOpen ? (
          <aside className="panel consultPanel">
            <ConsultPanel activeTab={consultRoute.view} onClose={() => setConsultOpen(false)} />
          </aside>
        ) : null}
      </section>

      <CommandDock
        canGrowPops={canGrowPops}
        canMovePops={canMovePops}
        canFoundColony={canFoundColony}
        canUpgradeCity={canUpgradeCity}
        canBuild={canBuild}
        isFoundColonyActive={mapSelection.selection?.mode.kind === "foundColony"}
        isBuildActive={mapSelection.selection?.mode.kind === "build"}
        chronicleTicker={latestChronicleLine}
        onEndTurn={events.endTurn}
        // Grow / Move / Found / Build are map modes, not dialogs (refit scope 3):
        // each arms the board and clears any open dialog, so nothing covers the answer.
        onGrowPopRequest={() => armSelection({ kind: "growPop" })}
        onMovePopsRequest={() => armSelection({ kind: "movePops" })}
        onFoundColonyRequest={() => armSelection({ kind: "foundColony" })}
        onBuildRequest={() => armSelection({ kind: "build" })}
        // Calm and Venture ask no "which tile?" question — they stay dialogs.
        onCalmRequest={() => setActiveModal({ kind: "calm" })}
        onVentureRequest={() => setActiveModal({ kind: "venture" })}
        onUpgradeCityRequest={() => setActiveModal({ kind: "upgradeCity" })}
      />

      {activeModal?.kind === "populationPrompt" ? (
        <PopulationPickerModal
          title={`Choose ${PLACEMENT_LABELS[activeModal.placement]} pops`}
          description={`Allocate exactly ${G.ruleset.placementPopCounts[activeModal.placement]} starting ${
            G.ruleset.placementPopCounts[activeModal.placement] === 1 ? "pop" : "pops"
          } before placing this ${PLACEMENT_LABELS[activeModal.placement]}.`}
          requiredTotal={G.ruleset.placementPopCounts[activeModal.placement]}
          confirmLabel={`Place ${PLACEMENT_LABELS[activeModal.placement]}`}
          onCancel={() => setActiveModal(null)}
          onConfirm={(pops) => {
            if (activeModal.placement === "capital") {
              moves.placeCapital(activeModal.tileId, pops);
            } else if (activeModal.placement === "city") {
              moves.placeCity(activeModal.tileId, pops);
            } else {
              moves.placeColony(activeModal.tileId, pops);
            }
          }}
        />
      ) : null}
      {/* Map-first selection (refit scope 3): the mode is armed, the board has
          answered, and the popover pins to the tile the player clicked. One
          router — every flow shares the anchoring and the Escape route. */}
      {mapSelection.selection?.target
        ? (() => {
            const { mode } = mapSelection.selection!;
            const { tileId, anchor } = mapSelection.selection!.target!;

            if (mode.kind === "foundColony") {
              return (
                <FoundColonyPopover
                  anchor={anchor}
                  onCancel={mapSelection.clear}
                  onConfirm={(sourceTileId, pop) => {
                    moves.foundColony(tileId, sourceTileId, pop);
                    mapSelection.clear();
                  }}
                  tileId={tileId}
                />
              );
            }

            if (mode.kind === "growPop") {
              return (
                <GrowPopPopover
                  anchor={anchor}
                  onCancel={mapSelection.clear}
                  onConfirm={(target, pop) => {
                    moves.growPop(target, pop);
                    mapSelection.clear();
                  }}
                  tileId={tileId}
                />
              );
            }

            if (mode.kind === "build") {
              return (
                <BuildPopover
                  anchor={anchor}
                  onCancel={mapSelection.clear}
                  onConfirm={(target, buildingId) => {
                    requestBuildBuilding(target, buildingId);
                    mapSelection.clear();
                  }}
                  tileId={tileId}
                />
              );
            }

            if (mode.kind === "ladder") {
              return (
                <LadderPopover
                  anchor={anchor}
                  onCancel={mapSelection.clear}
                  onConfirm={(target, from, kind) => {
                    if (kind === "promote") {
                      moves.promotePop(target, from);
                    } else {
                      moves.demotePop(target, from);
                    }
                    mapSelection.clear();
                  }}
                  request={mode.request}
                  tileId={tileId}
                />
              );
            }

            // Move is the two-step flow: the source click re-arms for the target.
            if (mode.kind === "movePops" && !mode.sourceTileId) {
              return (
                <MovePopsSourcePopover
                  anchor={anchor}
                  onCancel={mapSelection.clear}
                  onConfirm={mapSelection.advanceToTarget}
                  tileId={tileId}
                />
              );
            }

            if (mode.kind === "movePops" && mode.sourceTileId) {
              return (
                <MovePopsTargetPopover
                  anchor={anchor}
                  onCancel={mapSelection.clear}
                  onConfirm={(source, target, pops) => {
                    moves.movePops(source, target, pops);
                    mapSelection.clear();
                  }}
                  sourceTileId={mode.sourceTileId}
                  tileId={tileId}
                />
              );
            }

            return null;
          })()
        : null}
      {activeModal?.kind === "upgradeCity" ? (
        <UpgradeCityModal
          onCancel={closeModal}
          onConfirm={(tileId) => {
            moves.upgradeColonyToCity(tileId);
            closeModal();
          }}
        />
      ) : null}
      {activeModal?.kind === "calm" ? (
        <CalmModal onClose={closeModal} />
      ) : null}
      {activeModal?.kind === "venture" ? (
        <VentureModal onClose={closeModal} />
      ) : null}
      {G.pendingRiot || riotResultOpen ? (
        <RiotModal
          onRolled={() => setRiotResultOpen(true)}
          onDismissResult={() => setRiotResultOpen(false)}
        />
      ) : null}
      {ctx.phase === "gameOver" && !gameOverDismissed ? (
        <GameOverModal G={G} onInspectBoard={() => setGameOverDismissed(true)} />
      ) : null}
      {G.pendingPlayerEvent ? (
        <PendingPlayerEventModal />
      ) : null}
      {G.yearOmen && G.yearOmen.year !== seenOmenYear && !G.pendingRiot && !G.pendingPlayerEvent ? (
        <EventTableModal
          table={OMEN_TABLE}
          modifier={0}
          result={G.yearOmen.record}
          subtitle={`${PLAYER_NAMES[G.seasonOpener]} takes the auspices for Year ${G.yearOmen.year} — the sign stands over every polis until spring.`}
          onDismiss={() => setSeenOmenYear(G.yearOmen?.year ?? null)}
          footer={
            <button className="primaryButton eventResolveButton" onClick={() => setSeenOmenYear(G.yearOmen?.year ?? null)}>
              So Be It
            </button>
          }
        />
      ) : null}
    </main>
    </GameUiProvider>
  );
}
