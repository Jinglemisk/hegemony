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
import type { CSSProperties, ComponentProps } from "react";
import { privateMoment } from "../client/controller";
import { PLAYER_IDS } from "../game/data";
import type { GameEvents, GameMoves, LocalContext } from "../client/controller";
import {
  calculateEconomyProjection,
  canPlaceColonyOnTile,
  claimableLuxuriesAt,
  getBuildBuildingStatus,
  getActiveEffects,
  toPlayerId,
  turnEndUnrest,
} from "../game/rules";
import { requiredDecision } from "../game/actors";
import { realmAlarms } from "../game/alarms";
import type { BuildingId, HegemonyState, PlayerId, TradePlaces } from "../game/types";
import type { DevShell } from "../dev/scenes";
import { IdeasModal } from "./board/modals/IdeasModal";
import { HungerModal } from "./board/modals/HungerModal";
import { PopulationPickerModal } from "./board/modals/PopulationPickerModal";
import { FoundColonyPopover } from "./board/modals/FoundColonyPopover";
import { MovePopsTargetPopover } from "./board/map/MovePopsPopover";
import { selectionCaption, type MapSelectionMode } from "./board/map/mapSelection";
import { useMapSelection } from "./board/map/useMapSelection";
import { turnBlocked, turnCommitTitle, turnPending } from "./board/command/verbs";
import { GameOverModal } from "./board/modals/GameOverModal";
import { PendingPlayerEventModal } from "./board/modals/PendingPlayerEventModal";
import { RiotModal } from "./board/modals/RiotModal";
import { RevoltModal } from "./board/modals/RevoltModal";
import { YearCardModal } from "./board/modals/YearCardModal";
import { DrawnCardModal, HandModal } from "./board/modals/DevCardModal";
import { AssemblyDock, AssemblySitting } from "./board/assembly/AssemblySitting";
import { useSitting, type Sitting } from "./board/assembly/sitting";
import { GameUiProvider } from "./board/GameUiProvider";
import type { GameUi } from "./board/GameUiContext";
import { CodexLinkProvider } from "./codexLink";
import { deckMark } from "./board/helpers";
import type { DeckMark } from "./board/helpers";
import { endTurnWarning, happinessDisplay, hungerShortfall } from "../ui/frameSelectors";
import { isTyping } from "../ui/keys";
import { TopBar } from "./frame/TopBar";
import { Menu } from "./frame/top/Menu";
import { MenuWindows } from "./frame/top/MenuWindows";
import { useMenuWindows } from "./frame/top/windowState";
import { Seal } from "./frame/top/Seal";
import { HudCanvas } from "./chrome/HudCanvas";
import { useFitScale } from "./chrome/canvas";
import { ConfirmHost, ConfirmProvider } from "./chrome/Confirm";
import { ToastLane } from "./frame/Toasts";
import { useMomentToasts, useOwnMoment } from "./frame/moments";
import { TurnNotice } from "./frame/TurnNotice";
import { Alarms } from "./frame/Alarms";
import { dealEndTurnReason } from "../game/deals";
import { EndTurn } from "./frame/EndTurn";
import { CardPick } from "./frame/trade/CardPick";
import { HandTray } from "./frame/hand/HandTray";
import { ComposeCard } from "./frame/trade/OfferCard";
import { TradePickContext, nextTradePick, usedPlaces } from "./frame/trade/tradePick";
import type { PickTradePlaces, TradePickRequest } from "./frame/trade/tradePick";
import { TradePopsPopover } from "./board/map/TradePopsPopover";
import { ESCAPE, useEscapeLayer } from "./overlays/escapeStack";
import { Popover } from "./overlays/Popover";
import { Dock } from "./frame/dock/Dock";
import { Outliner } from "./frame/outliner/Outliner";
import { LeftShell } from "./left/LeftShell";
import { isRealmDrawer, useLeftDrawer } from "./left/drawerState";
import type { PlaceSubject } from "./left/PlacePanel";
import { MAP_MODES } from "./frame/map3d/modes";
import type { MapMode } from "./frame/map3d/modes";
import { loadPlates, savePlates } from "./frame/map3d/plates";
import type { Plates } from "./frame/map3d/plates";

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
  /** The card a buy drew, found from where the seat stood before it. */
  | { kind: "drawnCard"; mark: DeckMark }
  | { kind: "hand" }
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
  // The HUD canvas's scale: the 1440×900 design drawn to fit the screen.
  const fitScale = useFitScale();
  // What the map shows: the shell's view state, never the game's.
  const [mapMode, setMapMode] = useState<MapMode>("terrain");
  // How the map draws the resource badges: the player's choice, kept in the browser.
  const [plates, setPlates] = useState(loadPlates);
  const changePlates = (next: Plates) => {
    setPlates(next);
    savePlates(next);
  };
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  // `?dev=ideas` opens on the purchase list.
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(
    dev.ideasOpen ? { kind: "ideas" } : null,
  );
  // Bumped when End turn waits on a partner's short payment: its deal card opens.
  const [dealAsk, setDealAsk] = useState(0);
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
  // What the map last picked, which the place panel shows: the sea (nothing), a tile,
  // or a luxury good's mooring.
  const [subject, setSubject] = useState<PlaceSubject>({ kind: "realm" });
  // A pick from a drawer, the outliner or the map: the subject and its lit tile.
  const pick = useCallback((next: PlaceSubject) => {
    setSubject(next);
    setSelectedTileId(next.kind === "tile" ? next.tileId : null);
  }, []);
  // The sidebar's open drawer; the seal and the outliner open drawers too.
  const drawer = useLeftDrawer(subject, pick);
  // The offer card, composing from the Trade disc: it floats by the disc and holds up
  // no one, so it is not a dialog.
  // `partner`: the seat it starts addressed to (a rival picked on the map, or a rival's
  // place panel), else the table.
  const [composing, setComposing] = useState<{
    seat: PlayerId;
    anchor: DOMRect;
    partner?: PlayerId | null;
  } | null>(null);
  // Deep-links (two-panel.md piece 4): a Codex-term click opens the Codex window at a
  // chapter. The nonce lets the same term re-navigate the codex even if
  // the target chapter is unchanged (you clicked away and clicked the link again).
  const [codexTarget, setCodexTarget] = useState<{ chapter: string; nonce: number } | null>(null);
  // The menu's movable windows: Codex, Costs, Plates. A term link opens the Codex's.
  const windows = useMenuWindows();
  const { show: showWindow, toggle: toggleWindow } = windows;
  const openCodexTo = useCallback(
    (chapter: string) => {
      setCodexTarget((current) => ({ chapter, nonce: (current?.nonce ?? 0) + 1 }));
      showWindow("codex");
    },
    [showWindow],
  );
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
  // Then the held cards it gives, picked in private: in hotseat the screen passes to the
  // giving seat for the pick and comes back to the seat that was looking.
  const [cardPick, setCardPick] = useState<{
    request: TradePickRequest;
    places: TradePlaces;
    send: (places: TradePlaces) => void;
    viewer: PlayerId;
  } | null>(null);
  const finishTradePick = useCallback(
    (request: TradePickRequest, places: TradePlaces, send: (places: TradePlaces) => void) => {
      const used = usedPlaces(request, places);
      if (request.cards > 0) setCardPick({ request, places: used, send, viewer: viewerId });
      else send(used);
    },
    [viewerId],
  );
  const endCardPick = () => {
    if (cardPick && cardPick.viewer !== viewerId) onPlayerIDChange(cardPick.viewer);
    setCardPick(null);
  };
  const pickTradePlaces = useCallback<PickTradePlaces>(
    (request, send) => {
      const places = request.places ?? {};
      const mode = nextTradePick(G, request, places);
      if (!mode) return finishTradePick(request, places, send);
      const folded = Boolean(sitting && !sitting.minimised);
      if (folded) sitting?.setMinimised(true);
      setTradePick({ request, places, send, folded });
      armSelection(mode);
    },
    [G, sitting, armSelection, finishTradePick],
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
    finishTradePick(tradePick.request, places, tradePick.send);
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
  // dialog up, and nothing else open above it, it returns a folded sitting.
  useEscapeLayer(
    ESCAPE.sitting,
    () => sitting?.setMinimised(false),
    Boolean(sitting?.minimised && !moment && !activeModal),
  );

  // `?` toggles the codex from anywhere: the same act as pressing its consult icon. 1 to
  // 4 switch the map's mode.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;

      if (event.key === "?") {
        setCodexTarget(null);
        toggleWindow("codex");
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
  }, [toggleWindow]);

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

      // Otherwise the pick opens its place panel; an armed mode keeps the window it
      // was armed from.
      setSubject({ kind: "tile", tileId });

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

  // A luxury good's mooring picked, from its raft or the outliner: its page opens.
  const pickMooring = (vertexId: string) => pick({ kind: "mooring", vertexId });
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
          <ConfirmProvider>
            <main
              className={`frame${moment?.kind === "assembly" ? " is-sitting" : ""}`}
              style={{ "--k": fitScale } as CSSProperties}
            >
              {/* Two HUD canvases with the map between, so the DOM (and Tab) reads as the
                screen does: top bar, seal, alarms, sidebar, drawer or place panel, then
                the map, the hand, the outliner, the dock. The map draws at the screen's
                own resolution under both; the second canvas paints over the first. */}
              <HudCanvas overlays={false}>
                {!drafting ? (
                  <>
                    <div className="hud hud-top">
                      <TopBar
                        G={G}
                        breakdown={projectedIncomeBreakdown}
                        happiness={happinessDisplay(G, viewerId)}
                        income={projectedIncome}
                        viewerId={viewerId}
                      >
                        <Menu onViewAs={onPlayerIDChange} windows={windows} />
                      </TopBar>
                      {/* The seal opens the Realm drawer, and is pressed while a Realm tab is. */}
                      <Seal
                        onOpen={() => drawer.toggle("overview")}
                        open={isRealmDrawer(drawer.open)}
                        seat={viewerId}
                      />
                      {sitting?.minimised ? <AssemblyDock sitting={sitting} /> : null}
                      <ToastLane onDismiss={toasts.dismiss} toast={toasts.toast} />
                      <Alarms
                        alarms={alarms}
                        dealAsk={dealAsk}
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

                    {/* The left window: the sidebar's drawers and the place panel. */}
                    <LeftShell
                      actions={{
                        onFound: foundHere,
                        onMoveOut: (tileId) =>
                          armSelection({ kind: "movePops", sourceTileId: tileId }),
                        onBuild: requestBuildBuilding,
                        onOpenHand: () => setActiveModal({ kind: "hand" }),
                        onBuyCard: () => {
                          setActiveModal({ kind: "drawnCard", mark: deckMark(G, viewerId) });
                          moves.buyDevCard();
                        },
                        onCompose: (partner, anchor) =>
                          setComposing({ seat: viewerId, anchor, partner }),
                        onIdeasModal: () => setActiveModal({ kind: "ideas" }),
                      }}
                      income={projectedIncome}
                      drawer={drawer}
                      onPick={pick}
                      placeable={!isSetup}
                      subject={subject}
                    />
                  </>
                ) : null}
              </HudCanvas>
              {!drafting ? (
                <Suspense fallback={null}>
                  <LivingMap
                    G={G}
                    highlightTileIds={
                      mapSelection.selection
                        ? mapSelection.candidateTileIds
                        : setupColonyValidTileIds
                    }
                    mode={mapMode}
                    onBackgroundAction={() => pick({ kind: "realm" })}
                    onMooringAction={pickMooring}
                    onTileAction={handleTileAction}
                    plates={plates}
                    // A popover pinned to a tile's old spot closes when the map moves;
                    // the mode stays armed, so the next click re-opens it in place.
                    onViewChange={() => setMapSelectionTarget(null)}
                    placementActive={Boolean(mapSelection.selection) || ctx.phase === "setupColony"}
                    selectedTileId={selectedTileId}
                  />
                </Suspense>
              ) : null}
              <HudCanvas>
                {!drafting ? (
                  <>
                    {G.phase === "gameplay" ? (
                      <HandTray onOpen={() => setActiveModal({ kind: "hand" })} />
                    ) : null}

                    {/* The right side: the outliner down the edge, the dock in the corner. */}
                    <Outliner
                      onOpenDrawer={drawer.show}
                      onPickMooring={pickMooring}
                      onPickTile={handleTileAction}
                      selectedTileId={selectedTileId}
                    />
                    <Dock
                      mode={mapMode}
                      onBuyCard={() => {
                        setActiveModal({ kind: "drawnCard", mark: deckMark(G, viewerId) });
                        moves.buyDevCard();
                      }}
                      onMode={setMapMode}
                      onTrade={(anchor) => {
                        // A rival's place picked: the offer starts addressed to them.
                        const picked = G.board.tiles.find((tile) => tile.id === selectedTileId);
                        const rival = picked?.settlements.find((s) => s.owner !== viewerId)?.owner;
                        setComposing({ seat: viewerId, anchor, partner: rival ?? null });
                      }}
                    >
                      <EndTurn
                        actingId={currentPlayerId}
                        canEndTurn={turnOpen}
                        confirmOpen={dev.endTurnConfirm}
                        onCalm={moves.civicCalm}
                        onEndTurn={() =>
                          // A partner's short payment is answered first, on its deal's card.
                          dealEndTurnReason(G)
                            ? setDealAsk((n) => n + 1)
                            : shortfall
                              ? setHeld("hungerAsk")
                              : events.endTurn()
                        }
                        ruleset={G.ruleset}
                        title={turnCommitTitle(turnGate)}
                        waitingLabel={inAssembly ? "In Assembly" : undefined}
                        unrest={turnOpen ? turnEndUnrest(G, currentPlayerId) : null}
                        warning={endTurnWarning(G, currentPlayerId)}
                      />
                    </Dock>

                    <MenuWindows
                      codexTarget={codexTarget}
                      onPlates={changePlates}
                      plates={plates}
                      windows={windows}
                    />
                  </>
                ) : null}

                {composing ? (
                  <Popover
                    anchor={composing.anchor}
                    ariaLabel="Offer a trade"
                    centre
                    className="trade-pop"
                    dismissOnOutside
                    onDismiss={() => setComposing(null)}
                  >
                    <ComposeCard
                      key={composing.partner ?? "table"}
                      onClose={() => setComposing(null)}
                      partner={composing.partner}
                      seat={composing.seat}
                    />
                  </Popover>
                ) : null}
                {cardPick ? (
                  <CardPick
                    count={cardPick.request.cards}
                    onCancel={endCardPick}
                    onPick={(cards) => {
                      cardPick.send({ ...cardPick.places, cards });
                      endCardPick();
                    }}
                    onReveal={() => onPlayerIDChange(cardPick.request.seat)}
                    partner={cardPick.request.partner}
                    seat={cardPick.request.seat}
                  />
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

                      if (mode.kind === "movePops") {
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
                {activeModal?.kind === "drawnCard" ? (
                  <DrawnCardModal mark={activeModal.mark} onClose={closeModal} />
                ) : null}
                {activeModal?.kind === "hand" ? (
                  <HandModal
                    onBuy={() => {
                      setActiveModal({ kind: "drawnCard", mark: deckMark(G, viewerId) });
                      moves.buyDevCard();
                    }}
                    onClose={closeModal}
                  />
                ) : null}
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
                          onInspectBoard={() =>
                            setSeen((current) => ({ ...current, gameOver: true }))
                          }
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
                          key={
                            moment.asked ? `ask-${ctx.turn}-${moment.unfed}` : `pending-${ctx.turn}`
                          }
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
                <ConfirmHost />
              </HudCanvas>
            </main>
          </ConfirmProvider>
        </CodexLinkProvider>
      </TradePickContext.Provider>
    </GameUiProvider>
  );
}
