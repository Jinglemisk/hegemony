import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode, Ref } from "react";
import { canAfford, getBuyDevCardStatus, getDoleStatus, usesLeft } from "../../../game/rules";
import { playerDole } from "../../../game/ideaRules";
import { offerWindowReason } from "../../../game/trade";
import { deedSeat } from "../../../ui/frameSelectors";
import { namePlaces } from "../../../ui/settlementNames";
import { AnnotatedText } from "../../AnnotatedText";
import { ActionLogPanel } from "../../board/command/ActionLogPanel";
import { useGameUi } from "../../board/GameUiContext";
import { useConfirm } from "../../chrome/confirmContext";
import { SpendDetail } from "../../chrome/confirmDetail";
import { Panel, PanelHead } from "../../chrome/Panel";
import { SeatCoin } from "../../chrome/SeatCoin";
import { ESCAPE, useEscapeLayer } from "../../overlays/escapeStack";
import { Tooltip } from "../../overlays/Tooltip";
import { useReturnFocus } from "../../overlays/focus";
import { MAP_MODES } from "../map3d/modes";
import type { MapMode } from "../map3d/modes";
import { Chips, Ico, Tip, TipBody, TipWarn } from "../parts";

/**
 * The dock, flush in the bottom-right corner, three rows: the Chronicle's newest line
 * across the whole dock, which opens the full log upward out of it; the four map modes
 * as square framed buttons; then Trade, Buy a card and the Dole with their costs. End
 * turn stands right of the modes and the buttons. The dock never changes size: the log
 * opens over the outliner above it, and the legend floats to its left.
 */
export function Dock({
  mode,
  onMode,
  onTrade,
  onBuyCard,
  children,
}: {
  mode: MapMode;
  onMode: (mode: MapMode) => void;
  /** Open the offer composer, anchored to the Trade button. */
  onTrade: (anchor: DOMRect) => void;
  /** Buy a development card (asked first): the board opens the drawn card. */
  onBuyCard: () => void;
  /** End turn, in the dock's right column. */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const line = useRef<HTMLButtonElement>(null);
  const logId = useId();
  // Escape closes the log; focus goes back to its line (ChronicleLog).
  useEscapeLayer(ESCAPE.chronicle, () => setOpen(false), open);

  return (
    <div className="rd-dock" data-c="dock" data-exclude>
      <MapLegend mode={mode} />
      <Panel className="rd-dk">
        <div className="rd-line-row">
          <ChronicleLine
            controls={open ? logId : undefined}
            onToggle={() => setOpen((value) => !value)}
            open={open}
            ref={line}
          />
          {/* Right after its line, so Tab reaches it from there; drawn above the dock. */}
          {open ? <ChronicleLog id={logId} onClose={() => setOpen(false)} /> : null}
        </div>
        <div aria-label="Map mode" className="rd-modes" role="group">
          {MAP_MODES.map((m, i) => (
            <Tooltip
              content={
                <Tip title={`${m.label} map`}>
                  <TipBody>{`Key ${i + 1}.`}</TipBody>
                </Tip>
              }
              key={m.id}
              preferredPlacement="above"
            >
              <button
                aria-keyshortcuts={String(i + 1)}
                aria-label={`${m.label} map`}
                aria-pressed={m.id === mode}
                className="rd-mode"
                onClick={() => onMode(m.id)}
                type="button"
              >
                <Ico path={m.icon} size="tile" />
              </button>
            </Tooltip>
          ))}
        </div>
        <DockActions onBuyCard={onBuyCard} onTrade={onTrade} />
        <div className="rd-end">{children}</div>
      </Panel>
    </div>
  );
}

/** The full log, opened upward out of the dock: it takes the focus, and gives it back
 *  to the line when it closes. */
function ChronicleLog({ id, onClose }: { id: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useReturnFocus(ref, ".rd-log-body button");
  return (
    <Panel className="rd-log" corners={["tl"]} id={id} ref={ref}>
      <PanelHead closeLabel="Close the Chronicle" onClose={onClose} title="Chronicle" />
      <div className="rd-log-body" data-gate-skip>
        <LogBody />
      </div>
    </Panel>
  );
}

/** The log's foot stays in view: ActionLogPanel keeps it there as deeds land. */
function LogBody() {
  const { G } = useGameUi();
  return <ActionLogPanel G={G} />;
}

/** The Chronicle's newest line, its actor's coin first; the line is cut to fit and its
 *  name carries the whole of it. */
function ChronicleLine({
  open,
  onToggle,
  controls,
  ref,
}: {
  open: boolean;
  onToggle: () => void;
  controls: string | undefined;
  ref: Ref<HTMLButtonElement>;
}) {
  const { G } = useGameUi();
  const latest = G.log[G.log.length - 1];
  const text = latest
    ? namePlaces(G.board.tiles, latest.message, latest.about)
    : "The table is set.";
  const seat = latest ? deedSeat(G, latest) : null;
  return (
    <Tooltip
      content={open ? null : <Tip title="Open the Chronicle" />}
      preferredPlacement="above"
      triggerClassName="rd-line-tip"
    >
      <button
        aria-controls={controls}
        aria-expanded={open}
        aria-label={`Chronicle: ${text}`}
        className="rd-line"
        onClick={onToggle}
        ref={ref}
        type="button"
      >
        {seat ? (
          <SeatCoin aria-hidden="true" className="rd-line-coin" seat={seat} />
        ) : (
          <span aria-hidden="true" className="rd-line-coin is-empty" />
        )}
        <FittedLine key={latest?.id} text={text} />
        <span aria-hidden="true" className="rd-caret" />
      </button>
    </Tooltip>
  );
}

/** Trade, Buy a card and the Dole: each its name over its cost, read off the engine's
 *  status for the command. Buy a card and the Dole ask once before they spend. */
function DockActions({
  onTrade,
  onBuyCard,
}: {
  onTrade: (anchor: DOMRect) => void;
  onBuyCard: () => void;
}) {
  const { G, viewerId, viewer, turnBlocked, moves } = useGameUi();
  const ask = useConfirm();
  const held = viewer.resources;

  const tradeWhy = turnBlocked ?? offerWindowReason(G, viewerId);
  const buy = getBuyDevCardStatus(G, viewerId);
  const buyWhy = turnBlocked ?? (buy.can ? null : (buy.reasons[0] ?? null));
  const dole = getDoleStatus(G, viewerId);
  const doleWhy = turnBlocked ?? (dole.can ? null : (dole.reasons[0] ?? null));
  const doleGets = { food: playerDole(G, viewerId).food };
  const doleLeft = usesLeft(G, viewerId, "dole");

  return (
    <div className="rd-acts">
      <DockAct
        blocked={tradeWhy}
        hint="Offer goods to the other seats, or to one of them."
        icon="market/handshake"
        label="Trade"
        onPress={(event) => onTrade(event.currentTarget.getBoundingClientRect())}
        sub={<span className="rd-act-sub">Offer ▸</span>}
      />
      <DockAct
        blocked={buyWhy}
        hint="Draw a development card, once a turn. A yield pays at once; any other card goes to your hand."
        icon="events/convoy"
        label="Buy a card"
        onPress={() =>
          ask({
            icon: "events/convoy",
            question: "Are you sure you want to buy a development card?",
            detail: <SpendDetail cost={buy.cost ?? {}} G={G} viewerId={viewerId} />,
            verb: "Buy a card",
            onYes: onBuyCard,
          })
        }
        sub={<Chips amounts={buy.cost ?? {}} short={!canAfford(held, buy.cost ?? {})} />}
      />
      <DockAct
        blocked={doleWhy}
        hint={`Influence buys food.${doleLeft === null ? "" : ` ${doleLeft} of ${G.ruleset.turnCaps.dole} left this turn.`}`}
        icon="unrest/bread-dole"
        label="The Dole"
        onPress={() =>
          ask({
            icon: "unrest/bread-dole",
            question: `Are you sure you want to buy ${doleGets.food} food with the Dole?`,
            detail: (
              <SpendDetail
                command={{ type: "dole" }}
                cost={dole.cost ?? {}}
                G={G}
                viewerId={viewerId}
              />
            ),
            verb: "Buy food",
            onYes: () => moves.dole(),
          })
        }
        sub={
          <span className="rd-exchange">
            <Chips amounts={dole.cost ?? {}} short={!canAfford(held, dole.cost ?? {})} />
            <span aria-hidden="true">→</span>
            <span className="visuallyHidden">for</span>
            <Chips amounts={doleGets} />
          </span>
        }
      />
    </div>
  );
}

/** One of the dock's three buttons. Blocked, it keeps its focus and its tooltip (the
 *  engine's reason) and its press does nothing. */
function DockAct({
  label,
  icon,
  sub,
  hint,
  blocked,
  onPress,
}: {
  label: string;
  icon: string;
  sub: ReactNode;
  hint: string;
  blocked: string | null;
  onPress: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <Tooltip
      content={
        <Tip title={label}>
          <TipBody>{hint}</TipBody>
          {blocked ? <TipWarn>{blocked}</TipWarn> : null}
        </Tip>
      }
      preferredPlacement="above"
      triggerClassName="rd-act-tip"
    >
      <button
        aria-disabled={blocked ? true : undefined}
        className="rd-act"
        onClick={(event) => {
          if (!blocked) onPress(event);
        }}
        type="button"
      >
        <Ico path={icon} size="ui" />
        <b className="rd-act-name">{label}</b>
        {sub}
      </button>
    </Tooltip>
  );
}

/**
 * What the map mode shows, said in a short panel left of the dock above the hand row,
 * in every mode but Terrain. One size in every mode; at a larger Text size the words
 * scroll inside it.
 */
function MapLegend({ mode }: { mode: MapMode }) {
  const shown = MAP_MODES.find((m) => m.id === mode);
  if (!shown?.legend) return null;
  return (
    <Panel aria-label={`${shown.label} legend`} className="rd-legend" role="note" tone="glaze">
      <p className="rd-legend-title">{shown.label}</p>
      <p className="rd-legend-text">
        <AnnotatedText links={false} text={shown.legend} />
      </p>
    </Panel>
  );
}

/**
 * One line, cut at a word with an ellipsis when it would not fit the dock's line. The
 * cut is made in the text rather than by `text-overflow`, so nothing runs on past the
 * line under whatever lies beside it. The Chronicle page keeps every line whole.
 */
export function FittedLine({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const words = text.split(" ");
  // A search for the most words that fit: `lo` fits (one word always does), `hi` is
  // the most still possible, `n` is on screen now.
  const [fit, setFit] = useState({ lo: 1, hi: words.length, n: words.length });

  // The face's width changes once the web font arrives: search again then.
  useEffect(() => {
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) setFit({ lo: 1, hi: words.length, n: words.length });
    });
    return () => {
      live = false;
    };
  }, [words.length]);

  useLayoutEffect(() => {
    const line = ref.current;
    if (!line || fit.lo === fit.hi) return;
    const fits = line.scrollWidth <= line.clientWidth;
    const lo = fits ? fit.n : fit.lo;
    const hi = fits ? fit.hi : fit.n - 1;
    setFit({ lo, hi, n: lo === hi ? lo : Math.ceil((lo + hi) / 2) });
  }, [fit]);

  const shown = fit.n < words.length ? `${words.slice(0, fit.n).join(" ")}…` : text;

  return (
    <span className="dock-line-text" data-truncates="summary" ref={ref}>
      <AnnotatedText links={false} text={shown} />
    </span>
  );
}
