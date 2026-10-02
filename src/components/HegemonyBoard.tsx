import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameEvents, GameMoves, LocalContext } from "../client/controller";
import {
  EMPTY_POPS,
  GROWABLE_POPS,
  POP_TYPES,
  calculateEconomyProjection,
  canPlaceColonyOnTile,
  getBuildBuildingOptions,
  claimableLuxuriesAt,
  getBuildBuildingStatus,
  getActiveEffects,
  getFoundColonyStatus,
  getGrowPopStatus,
  getMovePopsStatus,
  getUpgradeColonyToCityStatus,
  toPlayerId,
  unrestStatus,
} from "../game/rules";
import type { BuildingId, HegemonyState, PlayerId } from "../game/types";
import { PLAYER_NAMES } from "../game/data";
import { BuildPopover } from "./board/map/BuildPopover";
import { PopulationPickerModal } from "./board/modals/PopulationPickerModal";
import { UpgradeCityModal } from "./board/modals/UpgradeCityModal";
import { FoundColonyPopover } from "./board/modals/FoundColonyPopover";
import { GrowPopPopover } from "./board/map/GrowPopPopover";
import { LadderPopover } from "./board/map/LadderPopover";
import { MovePopsSourcePopover, MovePopsTargetPopover } from "./board/map/MovePopsPopover";
import { selectionCaption, type MapSelectionMode } from "./board/map/mapSelection";
import { useMapSelection } from "./board/map/useMapSelection";
import { armedVerbOf, isTurnOpen, turnCommitTitle } from "./board/command/verbs";
import type { VerbContext } from "./board/command/verbs";
import { EventTableModal } from "./board/modals/EventTableModal";
import { GameOverModal } from "./board/modals/GameOverModal";
import { ConsultPanel } from "./board/ledger/ConsultPanel";
import type { ConsultTab } from "./board/types";
import { PendingPlayerEventModal } from "./board/modals/PendingPlayerEventModal";
import { RiotModal } from "./board/modals/RiotModal";
import { VentureModal } from "./board/modals/VentureModal";
import { AssemblyPanel } from "./board/assembly/AssemblyPanel";
import { GameUiProvider } from "./board/GameUiProvider";
import type { GameUi } from "./board/GameUiContext";
import { CodexLinkProvider } from "./codexLink";
import { getOwnedHoldings } from "./board/helpers";
import { happinessDisplay } from "../ui/frameSelectors";
import { Island } from "./frame/island/Island";
import { TopBar } from "./frame/TopBar";
import { Ticker } from "./frame/Ticker";
import { RealmPanel, type RealmSubject, type RealmTab } from "./frame/RealmPanel";
import { Alarms } from "./frame/Alarms";
import { EndTurn } from "./frame/EndTurn";
import { discGroups } from "./frame/discs";

type BoardProps = {
  G: HegemonyState;
  ctx: LocalContext;
  moves: GameMoves;
  events: GameEvents;
  playerID: PlayerId;
  onPlayerIDChange: (playerID: PlayerId) => void;
  isActive: boolean;
};

type SetupPlacement = "capital" | "city" | "colony";

const PLACEMENT_LABELS: Record<SetupPlacement, string> = {
  capital: "metropolis",
  city: "second city",
  colony: "founding colony",
};

/**
 * Exactly one dialog owns the screen at a time — the union makes that a type
 * invariant instead of a rule six independent booleans could break. The
 * self-mounting dialogs are deliberately NOT here: riot, pending event, game
 * over mount off engine state (G.pendingRiot, G.pendingPlayerEvent,
 * ctx.phase), so they cannot be opened or closed by a click and must not be
 * modelled as UI intent.
 */
type ActiveModal =
  | { kind: "populationPrompt"; placement: SetupPlacement; tileId: string }
  | { kind: "upgradeCity" }
  | { kind: "venture" };

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
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
  const [gameOverDismissed, setGameOverDismissed] = useState(false);
  // Keeps the riot modal mounted one beat past resolution so the outcome can be read.
  const [riotResultOpen, setRiotResultOpen] = useState(false);
  // The realm sheet's page, and the consult page open on the right (null: none).
  // The realm boots on its overview; picking a place on the map opens its page.
  const [realmTab, setRealmTab] = useState<RealmTab>("subject");
  // What the map last picked, which the realm's last tab shows: the sea (the
  // realm itself), a tile, or a luxury good's mooring.
  const [subject, setSubject] = useState<RealmSubject>({ kind: "realm" });
  const [consultTab, setConsultTab] = useState<ConsultTab | null>(null);
  // Deep-links (two-panel.md piece 4): a Codex-term click opens the consult panel's
  // rulebook at a chapter. The nonce lets the same term re-navigate the codex even if
  // the target chapter is unchanged (you clicked away and clicked the link again).
  const [codexTarget, setCodexTarget] = useState<{ chapter: string; nonce: number } | null>(null);
  const openCodexTo = useCallback((chapter: string) => {
    setCodexTarget((current) => ({ chapter, nonce: (current?.nonce ?? 0) + 1 }));
    setConsultTab("codex");
  }, []);
  const codexLink = useMemo(() => ({ openCodexTo }), [openCodexTo]);
  const currentPlayerId = toPlayerId(ctx.currentPlayer);
  const viewerId = toPlayerId(playerID);
  const viewer = G.players[viewerId];
  const hasPendingPlayerEvent = Boolean(G.pendingPlayerEvent);
  // The one gate the turn dial needs. It is the same gate every verb sits behind
  // (verbs.tsx), asked without a board fact in sight.
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
        GROWABLE_POPS.some((pop) => getGrowPopStatus(G, viewerId, tile.id, pop).can),
      ),
    [G, viewerId],
  );
  // Move is live when the engine would move one pop somewhere: it knows the
  // once-a-turn limit, the price and the room at the far end.
  const canMovePops = useMemo(() => {
    const holdings = getOwnedHoldings(G, viewerId);

    return holdings.some((from) =>
      holdings.some((to) =>
        POP_TYPES.some(
          (pop) =>
            getMovePopsStatus(G, viewerId, from.tile.id, to.tile.id, { ...EMPTY_POPS, [pop]: 1 })
              .can,
        ),
      ),
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
      armMapSelection(mode);
    },
    [armMapSelection],
  );
  // Handing the turn over closes everything the previous seat had open.
  useEffect(() => {
    setActiveModal(null);
    clearMapSelection();
    setRiotResultOpen(false);
  }, [ctx.phase, ctx.currentPlayer, clearMapSelection]);

  // A drawn event takes the screen: dismiss the player's own dialogs behind it.
  // The ledger is left alone — the codex lives there now, and reading a rule
  // mid-event is exactly when a player needs it.
  useEffect(() => {
    if (!G.pendingPlayerEvent) {
      return;
    }

    clearMapSelection();
    setActiveModal(null);
  }, [G.pendingPlayerEvent, clearMapSelection]);

  // `?` toggles the codex from anywhere: the same act as pressing its consult icon.
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
        setConsultTab((open) => (open === "codex" ? null : "codex"));
      }
      // Escape is ModalShell's job — every dialog gets it from the one place.
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

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

      // Otherwise the pick becomes the realm's last page; an armed mode keeps
      // the page it was armed from.
      setSubject({ kind: "tile", tileId });
      setRealmTab("subject");

      if (
        ctx.phase === "setupCapital" ||
        ctx.phase === "setupCity" ||
        ctx.phase === "setupColony"
      ) {
        const placement: SetupPlacement =
          ctx.phase === "setupCapital" ? "capital" : ctx.phase === "setupCity" ? "city" : "colony";
        setActiveModal({ kind: "populationPrompt", placement, tileId });
        return;
      }
    },
    [mapSelection, setMapSelectionTarget, ctx.phase],
  );

  const requestBuildBuilding = useCallback(
    (tileId: string, buildingId: BuildingId, claimVertexId?: string) => {
      setSelectedTileId(tileId);

      if (
        ctx.phase === "gameplay" &&
        isActive &&
        !hasPendingPlayerEvent &&
        getBuildBuildingStatus(G, viewerId, tileId, buildingId, claimVertexId).can
      ) {
        // A Port needs to know WHICH good it claims. The map popover asks the
        // player and passes it; the ledger paths don't, so name the first
        // claimable in stable order — the only one, everywhere the shipping even
        // placement can produce.
        const resolvedClaim =
          buildingId === "port"
            ? (claimVertexId ?? claimableLuxuriesAt(G, tileId)[0]?.vertexId)
            : undefined;
        moves.buildBuilding(tileId, buildingId, resolvedClaim);
      }
    },
    [ctx.phase, isActive, hasPendingPlayerEvent, G, viewerId, moves],
  );

  const verbContext: VerbContext = {
    G,
    playerID: viewerId,
    phase: ctx.phase,
    isActive,
    hasPendingPlayerEvent,
    canGrowPops,
    canMovePops,
    canFoundColony,
    canUpgradeCity,
    canBuild,
    armedVerb: armedVerbOf(mapSelection.selection?.mode),
    calmUsed: viewer.civicCalmUsedThisTurn,
    ventureUsed: viewer.ventureUsedThisTurn,
  };
  // Found, from a tile's page: arm the mode and open its popover on that tile.
  const foundHere = (tileId: string) => {
    const element = document.querySelector(`[data-tile-id="${tileId}"]`);
    if (!element) return;
    if (mapSelection.selection?.mode.kind !== "foundColony") armSelection({ kind: "foundColony" });
    setMapSelectionTarget({ tileId, anchor: element.getBoundingClientRect() });
  };

  return (
    <GameUiProvider value={gameUi}>
      <CodexLinkProvider value={codexLink}>
        <main className="frame">
          <Island
            G={G}
            highlightTileIds={
              mapSelection.selection ? mapSelection.candidateTileIds : setupColonyValidTileIds
            }
            onBackgroundAction={() => {
              setSelectedTileId(null);
              setSubject({ kind: "realm" });
              setRealmTab("subject");
            }}
            onMooringAction={(vertexId) => {
              setSelectedTileId(null);
              setSubject({ kind: "mooring", vertexId });
              setRealmTab("subject");
            }}
            onTileAction={handleTileAction}
            // A popover pinned to a tile's old spot closes when the map moves;
            // the mode stays armed, so the next click re-opens it in place.
            onViewChange={() => setMapSelectionTarget(null)}
            placementActive={Boolean(mapSelection.selection) || ctx.phase === "setupColony"}
            selectedTileId={selectedTileId}
          />

          <div className="hud hud-top">
            <TopBar
              G={G}
              actingId={currentPlayerId}
              breakdown={projectedIncomeBreakdown}
              consultOpen={consultTab}
              happiness={happinessDisplay(G, viewerId)}
              income={projectedIncome}
              onConsult={(tab) => setConsultTab((open) => (open === tab ? null : tab))}
              onSeat={onPlayerIDChange}
              viewerId={viewerId}
            />
            <Ticker log={G.log} />
            <Alarms
              content={G.definition.content}
              effects={activeEffects}
              riotThreshold={G.ruleset.economy.unrest.riotThreshold}
              unrest={unrestStatus(G, viewerId)}
            />
          </div>

          {isSetup || mapSelection.selection ? (
            <div className="map-caption" role="status">
              {mapSelection.selection
                ? selectionCaption(
                    mapSelection.selection.mode,
                    mapSelection.candidateTileIds.length,
                  )
                : pendingSetupCopy}
            </div>
          ) : null}

          <div className="hud hud-bottom">
            <RealmPanel
              groups={discGroups(
                verbContext,
                {
                  // The fans arm the map for the exact choice; nothing covers the answer.
                  onArm: armSelection,
                  onMovePopsRequest: () => armSelection({ kind: "movePops" }),
                  onFoundColonyRequest: () => armSelection({ kind: "foundColony" }),
                  onUpgradeCityRequest: () => setActiveModal({ kind: "upgradeCity" }),
                  onVentureRequest: () => setActiveModal({ kind: "venture" }),
                  onCalm: moves.civicCalm,
                  onDole: moves.dole,
                  onBankBuy: moves.bankBuy,
                  onBankSell: moves.bankSell,
                },
                mapSelection.selection?.mode ?? null,
              )}
              onBankBuy={moves.bankBuy}
              onBankSell={moves.bankSell}
              onBuildBuildingRequest={requestBuildBuilding}
              onLadderRequest={(request) => armSelection({ kind: "ladder", request })}
              income={projectedIncome}
              onFound={foundHere}
              onSubject={(next) => {
                setSubject(next);
                setSelectedTileId(next.kind === "tile" ? next.tileId : null);
              }}
              onTab={setRealmTab}
              subject={subject}
              tab={realmTab}
            />
            <EndTurn
              actingId={currentPlayerId}
              canEndTurn={turnOpen}
              onEndTurn={events.endTurn}
              title={turnCommitTitle(turnGate)}
            />
          </div>

          {consultTab ? (
            <aside aria-label="Consult" className="consult-sheet" data-c="consult-sheet">
              <button
                aria-label="Close"
                className="consult-close"
                onClick={() => setConsultTab(null)}
                type="button"
              >
                ×
              </button>
              <ConsultPanel activeTab={consultTab} codexTarget={codexTarget} />
            </aside>
          ) : null}

          {activeModal?.kind === "populationPrompt" ? (
            <PopulationPickerModal
              title={`Choose ${PLACEMENT_LABELS[activeModal.placement]} pops`}
              description={`Allocate exactly ${G.ruleset.placementPopCounts[activeModal.placement]} starting ${
                G.ruleset.placementPopCounts[activeModal.placement] === 1 ? "pop" : "pops"
              } before placing this ${PLACEMENT_LABELS[activeModal.placement]}: ${
                G.ruleset.placementCitizens[activeModal.placement] === 0
                  ? "no citizens"
                  : `${G.ruleset.placementCitizens[activeModal.placement]} citizen`
              }, the rest slaves or freemen.`}
              requiredTotal={G.ruleset.placementPopCounts[activeModal.placement]}
              requiredCitizens={G.ruleset.placementCitizens[activeModal.placement]}
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
                      initialPop={mode.pop}
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
                      initialBuildingId={mode.buildingId}
                      onCancel={mapSelection.clear}
                      onConfirm={(target, buildingId, claimVertexId) => {
                        requestBuildBuilding(target, buildingId, claimVertexId);
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
          {/* The Assembly TAKES OVER the table in a sitting year
          (assembly-politicians.md §1.2; owner ruling 2026-08-15). It mounts off
          engine state, and it covers the whole viewport — bars,
          rails and dock included. It therefore takes the seat switcher with it:
          the roster it covers is the only way a hotseat changes hands, and each
          of the scene's seat plaques performs that same act. */}
          {G.assembly ? <AssemblyPanel onTakeSeat={onPlayerIDChange} /> : null}
        </main>
      </CodexLinkProvider>
    </GameUiProvider>
  );
}
