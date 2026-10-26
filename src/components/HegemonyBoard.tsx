import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ComponentProps } from "react";
import { privateMoment } from "../client/controller";
import { PLAYER_IDS } from "../game/data";
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
  turnEndUnrest,
  victoryThreats,
} from "../game/rules";
import { requiredDecision } from "../game/actors";
import { realmAlarms } from "../game/alarms";
import type { BuildingId, HegemonyState, PlayerId, TradePlaces } from "../game/types";
import type { DevShell } from "../dev/scenes";
import { BuildPopover } from "./board/map/BuildPopover";
import { IdeasModal } from "./board/modals/IdeasModal";
import { HungerModal } from "./board/modals/HungerModal";
import { PopulationPickerModal } from "./board/modals/PopulationPickerModal";
import { UpgradeCityModal } from "./board/modals/UpgradeCityModal";
import { FoundColonyPopover } from "./board/modals/FoundColonyPopover";
import { GrowPopPopover } from "./board/map/GrowPopPopover";
import { LadderPopover } from "./board/map/LadderPopover";
import { MovePopsSourcePopover, MovePopsTargetPopover } from "./board/map/MovePopsPopover";
import { selectionCaption, type MapSelectionMode } from "./board/map/mapSelection";
import { useMapSelection } from "./board/map/useMapSelection";
import { armedVerbOf, turnBlocked, turnCommitTitle, turnPending } from "./board/command/verbs";
import type { VerbContext } from "./board/command/verbs";
import { GameOverModal } from "./board/modals/GameOverModal";
import { ConsultPanel } from "./board/ledger/ConsultPanel";
import type { ConsultTab } from "./board/types";
import { PendingPlayerEventModal } from "./board/modals/PendingPlayerEventModal";
import { RiotModal } from "./board/modals/RiotModal";
import { RevoltModal } from "./board/modals/RevoltModal";
import { YearCardModal } from "./board/modals/YearCardModal";
import { VentureModal } from "./board/modals/VentureModal";
import { AssemblyDock, AssemblySitting } from "./board/assembly/AssemblySitting";
import { useSitting, type Sitting } from "./board/assembly/sitting";
import { GameUiProvider } from "./board/GameUiProvider";
import type { GameUi } from "./board/GameUiContext";
import { CodexLinkProvider } from "./codexLink";
import { getOwnedHoldings } from "./board/helpers";
import { endTurnWarning, happinessDisplay, hungerShortfall } from "../ui/frameSelectors";
import { isTyping } from "../ui/keys";
import { TopBar } from "./frame/TopBar";
import { ConsultStrip } from "./frame/ConsultStrip";
import { ToastLane } from "./frame/Toasts";
import { useMomentToasts, useOwnMoment } from "./frame/moments";
import { TurnNotice } from "./frame/TurnNotice";
import { RealmPanel, type RealmSubject, type RealmTab } from "./frame/RealmPanel";
import { Alarms } from "./frame/Alarms";
import { EndTurn } from "./frame/EndTurn";
import { discGroups } from "./frame/discs";
import { ComposeCard } from "./frame/trade/OfferCard";
import { TradePickContext, nextTradePick, usedPlaces } from "./frame/trade/tradePick";
import type { PickTradePlaces, TradePickRequest } from "./frame/trade/tradePick";
import { TradePopsPopover } from "./board/map/TradePopsPopover";
import { Popover } from "./overlays/Popover";
import { CornerDock } from "./frame/CornerDock";
import { MAP_MODES } from "./frame/map3d/modes";
import type { MapMode } from "./frame/map3d/modes";

/** The map loads on its own, so three.js stays out of the main bundle. */
const LivingMap = lazy(() => import("./frame/map3d/LivingMap"));

type BoardProps = {
  G: HegemonyState;
  ctx: LocalContext;
  moves: GameMoves;
  events: GameEvents;
  playerID: PlayerId;
  onPlayerIDChange: (playerID: PlayerId) => void;
  isActive: boolean;
  /** People share this screen, seat by seat; false only when bots play alone. */
  hotseat: boolean;
  /** The seats people play. Bots act on their own, so their seats offer no buttons. */
  humans?: readonly PlayerId[];
  /** What a `?dev=` scene shows on the first render (the dev server only). */
  dev?: DevShell;
};

type SetupPlacement = "capital" | "city" | "colony";

const PLACEMENT_LABELS: Record<SetupPlacement, string> = {
  capital: "metropolis",
  city: "second city",
  colony: "founding colony",
};

/**
 * Exactly one dialog owns the screen at a time — the union makes that a type
 * invariant instead of a rule six independent booleans could break. The forced
 * moments are deliberately NOT here: they mount off engine state through
 * {@link Moment}, so they must not be modelled as UI intent.
 */
type ActiveModal =
  | { kind: "populationPrompt"; placement: SetupPlacement; tileId: string }
  | { kind: "upgradeCity" }
  | { kind: "venture" }
  | { kind: "ideas" };

/**
 * The decision host: the one forced moment that owns the screen, picked in the
 * engine's order and mounted through one switch. Most come from engine state; the
 * rest the screen holds itself (see {@link Held}).
 */
type Moment =
  | { kind: "draft"; done: boolean }
  | { kind: "riot" }
  | { kind: "revolt"; entry: ComponentProps<typeof RevoltModal>["entry"] }
  /** `reveal`: the card turning at the year; without it, the face from its alarm. */
  | { kind: "yearCard"; reveal: boolean }
  | { kind: "gameOver" }
  | { kind: "turnNotice"; begins: string }
  /** `asked`: from End turn, before the turn is committed. */
  | { kind: "hunger"; unfed: number; asked: boolean }
  | { kind: "event" }
  | { kind: "assembly"; sitting: Sitting };

/** A moment the screen keeps open by itself: the riot's result past its roll, the
 *  draft read back, the year card's face from its alarm, the hunger card from End turn. */
type Held = "riotResult" | "draftRead" | "yearFace" | "hungerAsk";

export function HegemonyBoard({
  G,
  ctx,
  moves,
  events,
  playerID = "0",
  onPlayerIDChange,
  isActive: seatActive,
  hotseat,
  humans = PLAYER_IDS,
  dev = {},
}: BoardProps) {
  // What the map shows: the shell's view state, never the game's.
  const [mapMode, setMapMode] = useState<MapMode>("terrain");
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  // `?dev=ideas` opens on the purchase list.
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(
    dev.ideasOpen ? { kind: "ideas" } : null,
  );
  const [held, setHeld] = useState<Held | null>(
    dev.riotResult
      ? "riotResult"
      : dev.draftSummary
        ? "draftRead"
        : dev.hungerAsk
          ? "hungerAsk"
          : null,
  );
  // What the screen has already taken in. `year`: the last year whose card has been
  // read; a later year shows its card first. Bots never wait for it, and a game opened
  // mid-year starts on it read. `moment`: the private moment last begun (see
  // `privateMoment`); a new one waits behind the turn notice, and a game opened
  // mid-turn starts begun. `gameOver`: the end was put aside to inspect the board.
  const [seen, setSeen] = useState(() => ({
    year:
      (G.phase !== "gameplay" && G.phase !== "gameOver") || dev.draftSummary
        ? 0
        : dev.yearReveal
          ? G.year - 1
          : G.year,
    moment: dev.turnNotice || dev.viewer ? null : privateMoment(G, humans),
    gameOver: false,
  }));
  // The draft is read back once its last pick lands, until the opener turns the year.
  const [seenPhase, setSeenPhase] = useState(ctx.phase);
  if (seenPhase !== ctx.phase) {
    setSeenPhase(ctx.phase);
    if (seenPhase === "setupIdeas") setHeld("draftRead");
  }
  // The realm sheet's page, and the consult page open on the right (null: none).
  // The realm boots on its overview; picking a place on the map opens its page.
  const [realmTab, setRealmTab] = useState<RealmTab>("subject");
  // What the map last picked, which the realm's last tab shows: the sea (the
  // realm itself), a tile, or a luxury good's mooring.
  const [subject, setSubject] = useState<RealmSubject>({ kind: "realm" });
  const [consultTab, setConsultTab] = useState<ConsultTab | null>(null);
  // The offer card, composing from the Trade disc: it floats by the disc and holds up
  // no one, so it is not a dialog.
  const [composing, setComposing] = useState<{ seat: PlayerId; anchor: DOMRect } | null>(null);
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
  // While the Assembly sits the shell only reads: the sitting owns every action.
  const sitting = useSitting(G, viewerId);
  const inAssembly = Boolean(G.assembly);
  const isActive = seatActive && !inAssembly;
  // Food short now: End turn opens the hunger card first, with a way back to buy food.
  const shortfall = hungerShortfall(G, viewerId);
  // The one turn gate: the seat, the phase, and any decision the engine waits on (a
  // fate card, hunger, a riot, the Assembly). The verbs, the turn dial and every realm
  // page read it (verbs.tsx), asked without a board fact in sight.
  const turnGate = { isActive, phase: ctx.phase, pending: turnPending(G) };
  const blocked = turnBlocked(turnGate);
  const turnOpen = blocked === null;
  const activeEffects = useMemo(() => getActiveEffects(G, viewerId), [G, viewerId]);
  const toasts = useMomentToasts(G, viewerId, dev.toastReplayFrom, dev.titlesFrom);
  // A revolt is the seat's own card in hotseat; against bots it is only a toast.
  const revolt = useOwnMoment(G, viewerId, "revolt", hotseat, dev.momentsFrom);
  const threats = useMemo(() => victoryThreats(G), [G]);
  const alarms = useMemo(() => realmAlarms(G, viewerId), [G, viewerId]);

  const decision = requiredDecision(G, viewerId);
  // One moment owns the screen at a time, in the order the engine ran them: the Idea
  // draft and its read-back; the last seat's riot or revolt, the year card, the game's
  // end; then the turn notice before a private moment; behind it the seat's hunger and
  // fate card, the Assembly, and last the year card reopened from its alarm.
  const moment = ((): Moment | null => {
    if (G.phase === "setupIdeas") return { kind: "draft", done: false };
    if (held === "draftRead") return { kind: "draft", done: true };
    if (decision?.source === "riotDecision" || held === "riotResult") return { kind: "riot" };
    if (revolt.entry) return { kind: "revolt", entry: revolt.entry };
    if (hotseat && G.activeYearCard && G.year > seen.year)
      return { kind: "yearCard", reveal: true };
    if (ctx.phase === "gameOver" && !seen.gameOver) return { kind: "gameOver" };
    const begins = privateMoment(G, humans);
    if (hotseat && begins !== null && begins !== seen.moment) return { kind: "turnNotice", begins };
    if (decision?.source === "hungerDecision")
      return { kind: "hunger", unfed: decision.unfed, asked: false };
    if (held === "hungerAsk" && turnOpen && shortfall)
      return { kind: "hunger", unfed: shortfall.unfed, asked: true };
    if (decision?.source === "eventDecision") return { kind: "event" };
    if (sitting && !sitting.minimised) return { kind: "assembly", sitting };
    if (held === "yearFace") return { kind: "yearCard", reveal: false };
    return null;
  })();
  const drafting = moment?.kind === "draft";
  const gameUi = useMemo<GameUi>(
    () => ({
      G,
      viewerId,
      viewer,
      activeEffects,
      currentPlayerId,
      phase: ctx.phase,
      isActive,
      turnBlocked: blocked,
      humans,
      moves,
      events,
    }),
    [
      humans,
      G,
      viewerId,
      viewer,
      activeEffects,
      currentPlayerId,
      ctx.phase,
      isActive,
      blocked,
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
  // A trade's pops are placed on the map, one pick at a time, before its command goes.
  // A sitting folds away for the picks and comes back after.
  const [tradePick, setTradePick] = useState<{
    request: TradePickRequest;
    places: TradePlaces;
    send: (places: TradePlaces) => void;
    folded: boolean;
  } | null>(null);
  const pickTradePlaces = useCallback<PickTradePlaces>(
    (request, send) => {
      const places = request.places ?? {};
      const mode = nextTradePick(G, request, places);
      if (!mode) return send(usedPlaces(request, places));
      const folded = Boolean(sitting && !sitting.minimised);
      if (folded) sitting?.setMinimised(true);
      setTradePick({ request, places, send, folded });
      armSelection(mode);
    },
    [G, sitting, armSelection],
  );
  const endTradePick = () => {
    if (tradePick?.folded) sitting?.setMinimised(false);
    setTradePick(null);
  };
  const cancelTradePick = useEffectEvent(endTradePick);
  const placeTradePops = (tileId: string, direction: "send" | "receive") => {
    if (!tradePick) return;
    const places = { ...tradePick.places, [direction === "send" ? "from" : "to"]: tileId };
    const mode = nextTradePick(G, tradePick.request, places);
    if (mode) {
      setTradePick({ ...tradePick, places });
      armSelection(mode);
      return;
    }
    clearMapSelection();
    tradePick.send(usedPlaces(tradePick.request, places));
    endTradePick();
  };
  // Escape, or any other mode taking the map, cancels the pick.
  useEffect(() => {
    if (tradePick && mapSelection.selection?.mode.kind !== "tradePops") cancelTradePick();
  }, [tradePick, mapSelection.selection]);

  // The handoff closes the previous seat's choices. A riot result stays open
  // until dismissed, even though its roll has already passed the turn.
  const handoff = useRef({ phase: ctx.phase, player: ctx.currentPlayer });
  useEffect(() => {
    if (handoff.current.phase === ctx.phase && handoff.current.player === ctx.currentPlayer) return;
    handoff.current = { phase: ctx.phase, player: ctx.currentPlayer };
    setActiveModal(null);
    setComposing(null);
    clearMapSelection();
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

  // Escape is ModalShell's job — every dialog gets it from the one place. With no
  // dialog up, it returns a folded sitting.
  const restoreSitting = useEffectEvent(() => {
    if (sitting?.minimised && !moment && !activeModal) sitting.setMinimised(false);
  });

  // `?` toggles the codex from anywhere: the same act as pressing its consult icon. 1 to
  // 4 switch the map's mode.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") restoreSitting();
      if (isTyping(event.target)) return;

      if (event.key === "?") {
        setCodexTarget(null);
        setConsultTab((open) => (open === "codex" ? null : "codex"));
      }
      // Never behind a dialog, never on a held key.
      const mode = MAP_MODES[Number(event.key) - 1];
      if (
        mode &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.repeat &&
        !document.querySelector('[aria-modal="true"]')
      )
        setMapMode(mode.id);
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

      if (turnOpen && getBuildBuildingStatus(G, viewerId, tileId, buildingId, claimVertexId).can) {
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
    [turnOpen, G, viewerId, moves],
  );

  const verbContext: VerbContext = {
    G,
    playerID: viewerId,
    phase: ctx.phase,
    isActive,
    pending: turnGate.pending,
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
      <TradePickContext.Provider value={pickTradePlaces}>
        <CodexLinkProvider value={codexLink}>
          <main className={`frame${moment?.kind === "assembly" ? " is-sitting" : ""}`}>
            {!drafting ? (
              <>
                <Suspense fallback={null}>
                  <LivingMap
                    G={G}
                    highlightTileIds={
                      mapSelection.selection
                        ? mapSelection.candidateTileIds
                        : setupColonyValidTileIds
                    }
                    mode={mapMode}
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
                </Suspense>

                <div className="hud hud-top">
                  <TopBar
                    G={G}
                    actingId={currentPlayerId}
                    breakdown={projectedIncomeBreakdown}
                    happiness={happinessDisplay(G, viewerId)}
                    income={projectedIncome}
                    onSeat={onPlayerIDChange}
                    threats={threats.map((threat) => threat.seat)}
                    viewerId={viewerId}
                  />
                  <ConsultStrip
                    onClose={() => setConsultTab(null)}
                    onConsult={(tab) => {
                      // Only a term link opens the Codex at a chapter; the strip opens its contents.
                      setCodexTarget(null);
                      setConsultTab((open) => (open === tab ? null : tab));
                    }}
                    open={consultTab}
                  />
                  {sitting?.minimised ? (
                    <AssemblyDock sitting={sitting} />
                  ) : (
                    <ToastLane onDismiss={toasts.dismiss} toast={toasts.toast} />
                  )}
                  <Alarms
                    alarms={alarms}
                    G={G}
                    hunger={shortfall}
                    onOpenYear={() => setHeld("yearFace")}
                    threatOpen={Boolean(dev.titlesFrom)}
                    viewerId={viewerId}
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
                    locked={inAssembly}
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
                        onIdeasRequest: () => setActiveModal({ kind: "ideas" }),
                        onTrade: () => {
                          const disc = document.querySelector('[data-group="trade"] .verb-disc');
                          if (disc)
                            setComposing({ seat: viewerId, anchor: disc.getBoundingClientRect() });
                        },
                      },
                      mapSelection.selection?.mode ?? null,
                    )}
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
                </div>

                {/* The corner dock: the right column under the consult strip, where a
                    dropped page stops above the dock. */}
                <div className={`dock-col${consultTab ? " has-sheet" : ""}`}>
                  {consultTab ? (
                    <aside
                      aria-label="Consult"
                      className="consult-sheet"
                      data-c="consult-sheet"
                      data-tab={consultTab}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.stopPropagation();
                          setConsultTab(null);
                        }
                      }}
                    >
                      <ConsultPanel activeTab={consultTab} codexTarget={codexTarget} />
                    </aside>
                  ) : null}
                  <CornerDock G={G} mode={mapMode} onMode={setMapMode}>
                    <EndTurn
                      actingId={currentPlayerId}
                      canEndTurn={turnOpen}
                      confirmOpen={dev.endTurnConfirm}
                      onCalm={moves.civicCalm}
                      onEndTurn={() => (shortfall ? setHeld("hungerAsk") : events.endTurn())}
                      ruleset={G.ruleset}
                      title={turnCommitTitle(turnGate)}
                      waitingLabel={inAssembly ? "In Assembly" : undefined}
                      unrest={turnOpen ? turnEndUnrest(G, currentPlayerId) : null}
                      warning={endTurnWarning(G, currentPlayerId)}
                    />
                  </CornerDock>
                </div>
              </>
            ) : null}

            {composing ? (
              <Popover
                anchor={composing.anchor}
                ariaLabel="Offer a trade"
                className="trade-pop"
                dismissOnOutside
                onDismiss={() => setComposing(null)}
                preferredPlacement="above"
              >
                <ComposeCard onClose={() => setComposing(null)} seat={composing.seat} />
              </Popover>
            ) : null}
            {activeModal?.kind === "ideas" && !drafting ? (
              <IdeasModal onClose={closeModal} />
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

                  if (mode.kind === "tradePops") {
                    return (
                      <TradePopsPopover
                        anchor={anchor}
                        mode={mode}
                        onCancel={mapSelection.clear}
                        onConfirm={() => placeTradePops(tileId, mode.direction)}
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
            {(() => {
              switch (moment?.kind) {
                case "draft":
                  return moment.done ? (
                    <IdeasModal draftDone onClose={() => setHeld(null)} />
                  ) : (
                    <IdeasModal key={viewerId} />
                  );
                case "riot":
                  return (
                    <RiotModal
                      onRolled={() => setHeld("riotResult")}
                      onDismissResult={() => setHeld(null)}
                    />
                  );
                case "revolt":
                  return <RevoltModal entry={moment.entry} onClose={revolt.dismiss} />;
                case "yearCard":
                  return moment.reveal ? (
                    <YearCardModal
                      holdBack={dev.yearBack}
                      onClose={() => setSeen((current) => ({ ...current, year: G.year }))}
                      reveal
                    />
                  ) : (
                    <YearCardModal onClose={() => setHeld(null)} reveal={false} />
                  );
                case "gameOver":
                  return (
                    <GameOverModal
                      G={G}
                      onInspectBoard={() => setSeen((current) => ({ ...current, gameOver: true }))}
                      viewerId={viewerId}
                    />
                  );
                case "turnNotice":
                  return (
                    <TurnNotice
                      onBegin={() => {
                        setSeen((current) => ({ ...current, moment: moment.begins }));
                        onPlayerIDChange(currentPlayerId);
                      }}
                      proposal={G.assembly?.phase === "proposal"}
                      seat={currentPlayerId}
                    />
                  );
                // Asked from End turn, the card ends the turn and names who leaves in one
                // go. A turn already committed (a restored game) only waits for the names.
                case "hunger":
                  return (
                    <HungerModal
                      key={moment.asked ? `ask-${ctx.turn}-${moment.unfed}` : `pending-${ctx.turn}`}
                      onBack={moment.asked ? () => setHeld(null) : undefined}
                      onCommit={(leave) => {
                        if (moment.asked) {
                          setHeld(null);
                          events.endTurn();
                        }
                        moves.resolveHunger(leave);
                      }}
                      unfed={moment.unfed}
                    />
                  );
                case "event":
                  return <PendingPlayerEventModal />;
                // The Assembly sits in a modal over the shell. It mounts off engine state;
                // minimised, it is the dock under the compass. A proposal is private, and
                // its seat begins it at the turn notice.
                case "assembly":
                  return <AssemblySitting sitting={moment.sitting} />;
                default:
                  return null;
              }
            })()}
          </main>
        </CodexLinkProvider>
      </TradePickContext.Provider>
    </GameUiProvider>
  );
}
