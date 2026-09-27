import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameEvents, GameMoves, LocalContext } from "../client/controller";
import {
  POP_TYPES,
  calculateEconomyProjection,
  canPlaceColonyOnTile,
  getBuildBuildingOptions,
  getBuildBuildingStatus,
  getActiveEffects,
  getFoundColonyStatus,
  getGrowPopStatus,
  getUpgradeColonyToCityStatus,
  previewBuildBuilding,
  previewFoundColony,
  previewGrowPop,
  previewMovePops,
  previewUpgradeColonyToCity,
  toPlayerId,
  totalPops,
} from "../game/rules";
import type { EconomyPreview } from "../game/rules";
import type { BuildingId, HegemonyState, PlayerId, Pops, PopType, Resource } from "../game/types";
import { PLAYER_NAMES } from "../game/data";
import { getOmenTable } from "../game/content";
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
import { armedVerbOf, isTurnOpen } from "./board/command/verbs";
import { CalmModal } from "./board/modals/CalmModal";
import { EventTableModal } from "./board/modals/EventTableModal";
import { GameOverModal } from "./board/modals/GameOverModal";
import { routeTo, type ConsultRoute, type LedgerRoute } from "./board/ledger/route";
import { PendingPlayerEventModal } from "./board/modals/PendingPlayerEventModal";
import { RiotModal } from "./board/modals/RiotModal";
import { VentureModal } from "./board/modals/VentureModal";
import { TopbarEvents } from "./board/topbar/TopbarEvents";
import { AssemblyPanel } from "./board/assembly/AssemblyPanel";
import { GameUiProvider } from "./board/GameUiProvider";
import type { GameUi } from "./board/GameUiContext";
import { CodexLinkProvider } from "./codexLink";
import { getOwnedHoldings } from "./board/helpers";
import { ActiveEffectsList } from "./ActiveEffectsList";
import { settlementNameOf } from "../ui/settlementNames";
import { OperationsBlock, type OperationsWorkspace } from "./board/shell/OperationsBlock";
import { RosterSquare } from "./board/shell/RosterSquare";
import { ConsultDrawer } from "./board/shell/ConsultDrawer";
import { TurnDocket } from "./board/shell/TurnDocket";
import { ReadabilityControl } from "./board/shell/ReadabilityControl";
import { SeatHandoff } from "./board/shell/SeatHandoff";
import { EconomyActionPreviewModal } from "./board/shell/EconomyActionPreviewModal";

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
  colony: "founding colony",
};

// One spine, dead centre of the top bar. The resources used to be split in two
// halves flanking the season medallion; that arrangement made the bar's centre a
// picture rather than the numbers, and the numbers are what a player reads
// forty times a turn. The medallion became the season clock on the bottom rail.
/* The spine reads out from the dial in the middle of it: what the land gives on
   the left, what the city makes of it on the right. Split rather than run as one
   row of six because the middle of that row is where the turn dial now sits, and
   an odd number of numerals either side of a large object reads as a scale that
   balances. */
const MATERIAL_RESOURCES: Resource[] = ["wood", "stone", "food"];
const CIVIC_RESOURCES: Resource[] = ["gold", "influence", "happiness"];

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
  | { kind: "upgradeCity"; tileId?: string }
  | { kind: "economyPreview"; action: EconomyPreviewAction }
  | { kind: "calm" }
  | { kind: "venture" };

type EconomyPreviewAction =
  | { kind: "build"; tileId: string; buildingId: BuildingId }
  | { kind: "grow"; tileId: string; pop: PopType }
  | { kind: "found"; tileId: string; sourceTileId: string; pop: PopType }
  | { kind: "move"; sourceTileId: string; targetTileId: string; pops: Pops }
  | { kind: "upgrade"; tileId: string };

export function HegemonyBoard({
  G,
  ctx,
  moves,
  events,
  playerID = "0",
  onPlayerIDChange,
  isActive,
}: BoardProps) {
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [operationsWorkspace, setOperationsWorkspace] = useState<OperationsWorkspace>("realm");
  const [tileConfirmation, setTileConfirmation] = useState<PendingTileConfirmation | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
  const [gameOverDismissed, setGameOverDismissed] = useState(false);
  // Keeps the riot modal mounted one beat past resolution so the outcome can be read.
  const [riotResultOpen, setRiotResultOpen] = useState(false);
  // Initialized to the omen standing at mount so a reload never re-announces it.
  const [seenOmenYear, setSeenOmenYear] = useState<number | null>(() => G.yearOmen?.year ?? null);
  // Realm pages remain explicit even while a selected hex adds a subject workspace.
  // The route shape leaves room for later deep links without making selection own it.
  const [ledgerRoute, setLedgerRoute] = useState<LedgerRoute>({ view: "cities" });
  // Consult material stays independent of operations and boots closed; the ticker
  // keeps the newest Chronicle line visible without occupying the board.
  const [consultRoute, setConsultRoute] = useState<ConsultRoute>({ view: "chronicle" });
  const [isConsultOpen, setConsultOpen] = useState(false);
  // Deep-links (two-panel.md piece 4): a Codex-term click opens the consult panel's
  // rulebook at a chapter. The nonce lets the same term re-navigate the codex even if
  // the target chapter is unchanged (you clicked away and clicked the link again).
  const [codexTarget, setCodexTarget] = useState<{ chapter: string; nonce: number } | null>(null);
  const openCodexTo = useCallback((chapter: string) => {
    setCodexTarget((current) => ({ chapter, nonce: (current?.nonce ?? 0) + 1 }));
    setConsultRoute(routeTo("codex"));
    setConsultOpen(true);
  }, []);
  const codexLink = useMemo(() => ({ openCodexTo }), [openCodexTo]);
  const currentPlayerId = toPlayerId(ctx.currentPlayer);
  const viewerId = toPlayerId(playerID);
  const viewer = G.players[viewerId];
  const hasPendingPlayerEvent = Boolean(G.pendingPlayerEvent);
  // The one gate shared by the turn controls and every verb.
  const turnGate = { isActive, phase: ctx.phase, hasPendingPlayerEvent };
  const turnOpen = isTurnOpen(turnGate);
  const activeEffects = useMemo(() => getActiveEffects(G, viewerId), [G, viewerId]);
  const gameUi = useMemo<GameUi>(
    () => ({
      G,
      viewerId,
      viewer,
      activeEffects,
      currentPlayerId,
      phase: ctx.phase,
      isActive,
      hasPendingPlayerEvent,
      moves,
      events,
    }),
    [
      G,
      viewerId,
      viewer,
      activeEffects,
      currentPlayerId,
      ctx.phase,
      isActive,
      hasPendingPlayerEvent,
      moves,
      events,
    ],
  );
  const projectedEconomy = useMemo(
    () => calculateEconomyProjection(G, viewerId, { resolveTransfers: true }),
    [G, viewerId],
  );
  const projectedIncome = projectedEconomy.income;
  const projectedIncomeBreakdown = projectedEconomy.breakdown;
  const isSetup =
    ctx.phase === "setupCapital" || ctx.phase === "setupCity" || ctx.phase === "setupColony";
  const canFoundColony = G.board.tiles.some(
    (tile) => getFoundColonyStatus(G, viewerId, tile.id).can,
  );
  const canUpgradeCity = G.board.tiles.some(
    (tile) => getUpgradeColonyToCityStatus(G, viewerId, tile.id).can,
  );
  // A verb must never offer a mode the board can't answer. These ask the engine the
  // same question the glow does, so "Grow" is live exactly when some settlement can
  // actually grow — not merely when the player owns one.
  const canGrowPops = useMemo(
    () =>
      getOwnedHoldings(G, viewerId).some(({ tile }) =>
        POP_TYPES.some((pop) => getGrowPopStatus(G, viewerId, tile.id, pop).can),
      ),
    [G, viewerId],
  );
  const canMovePops = useMemo(() => {
    const holdings = getOwnedHoldings(G, viewerId);

    return (
      holdings.length >= 2 && holdings.some(({ settlement }) => totalPops(settlement.pops) > 0)
    );
  }, [G, viewerId]);
  // Build is live when some settlement could raise some building — the same engine
  // check the glow and the popover use, so the verb never offers an empty map.
  const canBuild = useMemo(
    () =>
      getOwnedHoldings(G, viewerId).some(({ tile }) =>
        getBuildBuildingOptions(G, viewerId, tile.id).some(({ status }) => status.can),
      ),
    [G, viewerId],
  );
  // The map is the picker (refit scope 3): every "which settlement?" flow arms a
  // mode here, the board glows its legal tiles, and a popover confirms on the
  // spot — no dialog is laid over the answer.
  const mapSelection = useMapSelection({ G, playerID: viewerId, isActive });
  const {
    arm: armMapSelection,
    startAt: startMapSelectionAt,
    clear: clearMapSelection,
    setTarget: setMapSelectionTarget,
  } = mapSelection;
  // During the founding-colony round, glow every legal tile (coast or beside the metropolis).
  const setupColonyValidTileIds = useMemo(
    () =>
      ctx.phase === "setupColony"
        ? G.board.tiles
            .filter((tile) => canPlaceColonyOnTile(G, currentPlayerId, tile, "setup").can)
            .map((tile) => tile.id)
        : [],
    [ctx.phase, G, currentPlayerId],
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
      armMapSelection(mode);
    },
    [armMapSelection],
  );

  /** A selected settlement can answer a targetable verb immediately. The same
   * map popover opens on that tile, so the player keeps the board context and can
   * still cancel back to the stable Realm workspace. */
  const startSelectionAt = useCallback(
    (mode: Extract<MapSelectionMode, { kind: "growPop" | "build" }>, tileId: string) => {
      const element = document.querySelector(`[data-tile-id="${tileId}"]`);
      if (!element) return;

      setActiveModal(null);
      setTileConfirmation(null);
      setSelectedTileId(tileId);
      setOperationsWorkspace("subject");
      startMapSelectionAt(mode, { tileId, anchor: element.getBoundingClientRect() });
    },
    [startMapSelectionAt],
  );
  // The chronicle is a right-rail consult page now (two-panel.md); its newest line
  // still rides the command bar so the narration is never fully hidden.
  const latestChronicleLine = G.log.length > 0 ? G.log[G.log.length - 1].message : null;

  // Handing the turn over closes everything the previous seat had open.
  useEffect(() => {
    setTileConfirmation(null);
    setActiveModal(null);
    clearMapSelection();
    setRiotResultOpen(false);
    setSelectedTileId(null);
    setOperationsWorkspace("realm");
  }, [ctx.phase, ctx.currentPlayer, clearMapSelection]);

  // A drawn event takes the screen: dismiss the player's own dialogs behind it.
  // The ledger is left alone — the codex lives there now, and reading a rule
  // mid-event is exactly when a player needs it.
  useEffect(() => {
    if (!G.pendingPlayerEvent) {
      return;
    }

    setTileConfirmation(null);
    clearMapSelection();
    setActiveModal(null);
  }, [G.pendingPlayerEvent, clearMapSelection]);

  // `?` toggles the codex from anywhere — it is a consult page now (right panel), so
  // this is the same act as pressing its rail disc.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")
      ) {
        return;
      }

      if (event.key === "?") {
        setConsultOpen((open) => !(open && consultRoute.view === "codex"));
        setConsultRoute(routeTo("codex"));
      }
      if (event.key.toLowerCase() === "l" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        setConsultOpen((open) => !(open && consultRoute.view === "chronicle"));
        setConsultRoute(routeTo("chronicle"));
      }
      // Escape is ModalShell's job — every dialog gets it from the one place.
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [consultRoute.view]);

  const handleTileAction = useCallback(
    (tileId: string) => {
      setSelectedTileId(tileId);
      setOperationsWorkspace("subject");

      // A mode is armed: the click IS the answer (refit scope 3).
      if (mapSelection.selection) {
        if (!mapSelection.candidateTileIds.includes(tileId)) {
          // Clicking a tile the rules would refuse does nothing — the glow is the
          // contract, and it comes from the engine's own status checks.
          return;
        }

        const element =
          typeof document !== "undefined"
            ? document.querySelector(`[data-tile-id="${tileId}"]`)
            : null;

        if (!element) {
          return;
        }

        setMapSelectionTarget({ tileId, anchor: element.getBoundingClientRect() });
        return;
      }

      if (
        ctx.phase === "setupCapital" ||
        ctx.phase === "setupCity" ||
        ctx.phase === "setupColony"
      ) {
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
    [mapSelection, setMapSelectionTarget, ctx.phase, isActive],
  );

  const confirmTileAction = useCallback(() => {
    if (!tileConfirmation) {
      return;
    }

    if (tileConfirmation.action === "foundColony") {
      armMapSelection({ kind: "foundColony" });
    } else {
      setActiveModal({ kind: "upgradeCity", tileId: tileConfirmation.tileId });
    }

    setTileConfirmation(null);
  }, [tileConfirmation, armMapSelection]);

  const requestBuildBuilding = useCallback(
    (tileId: string, buildingId: BuildingId) => {
      setSelectedTileId(tileId);

      if (
        ctx.phase === "gameplay" &&
        isActive &&
        !hasPendingPlayerEvent &&
        getBuildBuildingStatus(G, viewerId, tileId, buildingId).can
      ) {
        setOperationsWorkspace("subject");
        setActiveModal({ kind: "economyPreview", action: { kind: "build", tileId, buildingId } });
      }
    },
    [ctx.phase, isActive, hasPendingPlayerEvent, G, viewerId],
  );

  const economyPreview = useMemo<EconomyPreview | null>(() => {
    if (activeModal?.kind !== "economyPreview") return null;

    const action = activeModal.action;
    switch (action.kind) {
      case "build":
        return previewBuildBuilding(G, viewerId, action.tileId, action.buildingId);
      case "grow":
        return previewGrowPop(G, viewerId, action.tileId, action.pop);
      case "found":
        return previewFoundColony(G, viewerId, action.tileId, action.sourceTileId, action.pop);
      case "move":
        return previewMovePops(G, viewerId, action.sourceTileId, action.targetTileId, action.pops);
      case "upgrade":
        return previewUpgradeColonyToCity(G, viewerId, action.tileId);
    }
  }, [G, activeModal, viewerId]);

  const economyPreviewTarget = useMemo(() => {
    if (activeModal?.kind !== "economyPreview") return "";

    const labelTile = (tileId: string) => {
      const tile = G.board.tiles.find((candidate) => candidate.id === tileId);
      const settlement = tile?.settlements.find((candidate) => candidate.owner === viewerId);
      return settlement ? settlementNameOf(G.board.tiles, settlement.id) : `Hex ${tileId}`;
    };
    const action = activeModal.action;

    if (action.kind === "move") {
      return `${labelTile(action.sourceTileId)} → ${labelTile(action.targetTileId)}`;
    }
    if (action.kind === "found") {
      return `${labelTile(action.sourceTileId)} → ${labelTile(action.tileId)}`;
    }
    return labelTile(action.tileId);
  }, [G.board.tiles, activeModal, viewerId]);

  const confirmEconomyPreview = useCallback(() => {
    if (activeModal?.kind !== "economyPreview") return;

    const action = activeModal.action;
    switch (action.kind) {
      case "build":
        moves.buildBuilding(action.tileId, action.buildingId);
        break;
      case "grow":
        moves.growPop(action.tileId, action.pop);
        break;
      case "found":
        moves.foundColony(action.tileId, action.sourceTileId, action.pop);
        break;
      case "move":
        moves.movePops(action.sourceTileId, action.targetTileId, action.pops);
        break;
      case "upgrade":
        moves.upgradeColonyToCity(action.tileId);
        break;
    }
    setActiveModal(null);
  }, [activeModal, moves]);

  const selectedTargetLabel = useMemo(() => {
    if (!selectedTileId) return undefined;
    const tile = G.board.tiles.find((candidate) => candidate.id === selectedTileId);
    const settlement = tile?.settlements.find((candidate) => candidate.owner === viewerId);
    return settlement ? settlementNameOf(G.board.tiles, settlement.id) : undefined;
  }, [G.board.tiles, selectedTileId, viewerId]);

  const confirmation = useMemo(
    () =>
      tileConfirmation
        ? {
            label: tileConfirmation.label,
            tileId: tileConfirmation.tileId,
            onCancel: () => setTileConfirmation(null),
            onConfirm: confirmTileAction,
          }
        : null,
    [tileConfirmation, confirmTileAction],
  );

  return (
    <GameUiProvider value={gameUi}>
      <CodexLinkProvider value={codexLink}>
        <main className="shell uiOverhaulShell asymmetricShell">
          <header className="topbar asymmetricTopStrip">
            <div className="topStripEvents">
              <TopbarEvents G={G} />
            </div>

            <div className="resourceSpine">
              <ResourceGrid
                order={MATERIAL_RESOURCES}
                tiles={G.board.tiles}
                resources={viewer.resources}
                deltas={projectedIncome}
                breakdown={projectedIncomeBreakdown}
                resetKey={`res-${viewerId}`}
              />

              <TurnDocket
                G={G}
                actingPlayerId={currentPlayerId}
                canEndTurn={turnOpen && !G.pendingRiot && !G.assembly}
                onEndTurn={events.endTurn}
              />

              <ResourceGrid
                order={CIVIC_RESOURCES}
                tiles={G.board.tiles}
                resources={viewer.resources}
                deltas={projectedIncome}
                breakdown={projectedIncomeBreakdown}
                resetKey={`res-${viewerId}`}
              />
            </div>

            <div className="topbarUtilities">
              <ActiveEffectsList variant="board" />
              <ReadabilityControl />
            </div>
          </header>

          <OperationsBlock
            activeTab={ledgerRoute.view}
            onBankBuy={moves.bankBuy}
            onBankSell={moves.bankSell}
            onBuildBuildingRequest={requestBuildBuilding}
            onLadderRequest={(request) => armSelection({ kind: "ladder", request })}
            onSelectTab={(tab) => {
              setLedgerRoute(routeTo(tab));
              setOperationsWorkspace("realm");
            }}
            onTargetAction={(kind, tileId) => startSelectionAt({ kind }, tileId)}
            onUpgradeRequest={(tileId) => setActiveModal({ kind: "upgradeCity", tileId })}
            onWorkspaceChange={setOperationsWorkspace}
            selectedTileId={selectedTileId}
            workspace={operationsWorkspace}
          />

          {/* The stage remains a fixed frame. Its DOM position follows the primary
              planning surface so keyboard order reads top strip → operations → board. */}
          <div className="mapStage">
            <HexMap
              G={G}
              confirmation={confirmation}
              pendingTileId={tileConfirmation?.tileId ?? null}
              selectedTileId={selectedTileId}
              highlightTileIds={
                mapSelection.selection ? mapSelection.candidateTileIds : setupColonyValidTileIds
              }
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
                {selectionCaption(
                  mapSelection.selection.mode,
                  mapSelection.candidateTileIds.length,
                )}
              </div>
            ) : null}
          </div>

          <RosterSquare covered={isConsultOpen} onPlayerIDChange={onPlayerIDChange} />

          <ConsultDrawer
            activeTab={consultRoute.view}
            codexTarget={codexTarget}
            isOpen={isConsultOpen}
            onClose={() => setConsultOpen(false)}
            onSelectTab={(tab) => {
              setConsultOpen((open) => !(open && tab === consultRoute.view));
              setConsultRoute(routeTo(tab));
            }}
          />

          <CommandDock
            canGrowPops={canGrowPops}
            canMovePops={canMovePops}
            canFoundColony={canFoundColony}
            canUpgradeCity={canUpgradeCity}
            canBuild={canBuild}
            armedVerb={armedVerbOf(mapSelection.selection?.mode)}
            chronicleTicker={latestChronicleLine}
            targetLabel={selectedTargetLabel}
            // Grow / Move / Found / Build are map modes, not dialogs (refit scope 3):
            // each arms the board and clears any open dialog, so nothing covers the answer.
            onGrowPopRequest={() => armSelection({ kind: "growPop" })}
            onMovePopsRequest={() => armSelection({ kind: "movePops" })}
            onFoundColonyRequest={() => armSelection({ kind: "foundColony" })}
            onBuildRequest={() => armSelection({ kind: "build" })}
            // Calm and Venture ask no "which tile?" question — they stay dialogs.
            onCalmRequest={() => setActiveModal({ kind: "calm" })}
            onVentureRequest={() => setActiveModal({ kind: "venture" })}
            onUpgradeCityRequest={() =>
              setActiveModal({ kind: "upgradeCity", tileId: selectedTileId ?? undefined })
            }
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
                        setActiveModal({
                          kind: "economyPreview",
                          action: { kind: "found", tileId, sourceTileId, pop },
                        });
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
                        setActiveModal({
                          kind: "economyPreview",
                          action: { kind: "grow", tileId: target, pop },
                        });
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
                        setActiveModal({
                          kind: "economyPreview",
                          action: {
                            kind: "move",
                            sourceTileId: source,
                            targetTileId: target,
                            pops,
                          },
                        });
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
              initialTileId={activeModal.tileId}
              onCancel={closeModal}
              onConfirm={(tileId) => {
                setActiveModal({
                  kind: "economyPreview",
                  action: { kind: "upgrade", tileId },
                });
              }}
            />
          ) : null}
          {activeModal?.kind === "economyPreview" && economyPreview ? (
            <EconomyActionPreviewModal
              confirmLabel={`Confirm ${economyPreview.title}`}
              onCancel={closeModal}
              onConfirm={confirmEconomyPreview}
              preview={economyPreview}
              targetLabel={economyPreviewTarget}
            />
          ) : null}
          {activeModal?.kind === "calm" ? <CalmModal onClose={closeModal} /> : null}
          {activeModal?.kind === "venture" ? <VentureModal onClose={closeModal} /> : null}
          {G.pendingRiot || riotResultOpen ? (
            <RiotModal
              onRolled={() => setRiotResultOpen(true)}
              onDismissResult={() => setRiotResultOpen(false)}
            />
          ) : null}
          {ctx.phase === "gameOver" && !gameOverDismissed ? (
            <GameOverModal G={G} onInspectBoard={() => setGameOverDismissed(true)} />
          ) : null}
          {G.pendingPlayerEvent ? <PendingPlayerEventModal /> : null}
          {/* The Assembly TAKES OVER the table from spring of Year 2
          (assembly-politicians.md §1.2; owner ruling 2026-08-15). It mounts off
          engine state like the omen, and it covers the whole viewport — bars,
          rails and dock included. It therefore takes the seat switcher with it:
          the roster it covers is the only way a hotseat changes hands, and each
          of the scene's seat plaques performs that same act. */}
          {G.assembly ? <AssemblyPanel onTakeSeat={onPlayerIDChange} /> : null}
          <SeatHandoff G={G} onTakeSeat={onPlayerIDChange} />
          {G.yearOmen &&
          G.yearOmen.year !== seenOmenYear &&
          !G.pendingRiot &&
          !G.pendingPlayerEvent &&
          !G.assembly ? (
            <EventTableModal
              table={getOmenTable(G.definition.content)}
              modifier={0}
              result={G.yearOmen.record}
              subtitle={`${PLAYER_NAMES[G.seasonOpener]} takes the auspices for Year ${G.yearOmen.year} — the sign stands over every polis until spring.`}
              onDismiss={() => setSeenOmenYear(G.yearOmen?.year ?? null)}
              footer={
                <button
                  className="primaryButton eventResolveButton"
                  onClick={() => setSeenOmenYear(G.yearOmen?.year ?? null)}
                >
                  So Be It
                </button>
              }
            />
          ) : null}
        </main>
      </CodexLinkProvider>
    </GameUiProvider>
  );
}
