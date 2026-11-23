import { useEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import type { CivicCalmPayment } from "../../game/civic";
import type { PlayerId } from "../../game/types";
import type { Ruleset } from "../../game/ruleset";
import type { TurnEndUnrest } from "../../game/unrest";
import { presentUnrestOutcome } from "../../ui/effects";
import { formatResourceCost, formatSignedNumber } from "../../ui/formatters";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";
import { Prose } from "../AnnotatedText";
import { useGameUi } from "../board/GameUiContext";
import { useConfirm } from "../chrome/confirmContext";
import { SpendDetail } from "../chrome/confirmDetail";
import { CloseDisc } from "../chrome/controls";
import { SeatCoin } from "../chrome/SeatCoin";
import { Popover } from "../overlays/Popover";
import { Tooltip } from "../overlays/Tooltip";
import { Chips, Ico, Tip, TipBody, TipWarn } from "./parts";

const HOLD_MS = 620;

/**
 * Press-and-hold, as a fraction of the way there. Ending a turn is the one move
 * that cannot be taken back; a hold costs a deliberate half-second and needs no
 * dialog. It runs off animation frames so the ring fills at the real rate.
 */
function useHoldToCommit(onCommit: () => void, enabled: boolean) {
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);
  const held = useRef(false);

  const cancel = () => {
    held.current = false;
    if (frame.current !== null) {
      window.cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    setProgress(0);
  };

  useEffect(() => cancel, []);

  // A press held while the control is disabled under it must not commit.
  useEffect(() => {
    if (!enabled) cancel();
  }, [enabled]);

  const begin = () => {
    if (!enabled || held.current) return;
    held.current = true;
    const startedAt = performance.now();

    const step = () => {
      if (!held.current) return;
      const ratio = Math.min(1, (performance.now() - startedAt) / HOLD_MS);
      setProgress(ratio);
      if (ratio >= 1) {
        cancel();
        onCommit();
        return;
      }
      frame.current = window.requestAnimationFrame(step);
    };

    frame.current = window.requestAnimationFrame(step);
  };

  return { progress, begin, cancel };
}

/**
 * End turn: its own column at the far bottom right. While a rival acts, it names them.
 * At the riot or revolt line the hold opens a confirm instead of ending: the last
 * chance to buy calm comes before the commit.
 */
export function EndTurn({
  actingId,
  canEndTurn,
  title,
  warning,
  unrest,
  ruleset,
  confirmOpen = false,
  waitingLabel,
  onEndTurn,
  onCalm,
}: {
  actingId: PlayerId;
  /** Whether the viewer may commit right now (seat, phase and pending events). */
  canEndTurn: boolean;
  title: string;
  warning: { label: string; message: string } | null;
  /** What ending now sets off: a riot or a revolt, or null. */
  unrest: TurnEndUnrest | null;
  ruleset: Ruleset;
  /** Open the confirm at once (a dev shortcut for the gate). */
  confirmOpen?: boolean;
  /** What the waiting seal says instead of the acting seat's name. */
  waitingLabel?: string;
  onEndTurn: () => void;
  onCalm: (payment: CivicCalmPayment) => void;
}) {
  const [confirming, setConfirming] = useState(confirmOpen);
  const { progress, begin, cancel } = useHoldToCommit(
    () => (unrest ? setConfirming(true) : onEndTurn()),
    canEndTurn,
  );
  const acting = PLAYER_GLAZES[actingId];
  const button = useRef<HTMLButtonElement>(null);

  if (!canEndTurn) {
    return (
      <div
        aria-label={waitingLabel ? `${waitingLabel}. ${title}` : `${acting.name} is acting.`}
        className="endturn is-waiting"
        data-c="endturn"
        data-exclude
        role="img"
        style={{ "--owner": acting.color } as CSSProperties}
      >
        <span className="endturn-disc" data-c="disc">
          <SeatCoin aria-hidden="true" className="endturn-coin" seat={actingId} />
        </span>
        <span className="kicker endturn-label" data-c="chip">
          {waitingLabel ?? acting.name}
        </span>
      </div>
    );
  }

  return (
    <>
      <Tooltip
        content={
          <Tip title="End turn">
            <TipBody>{title}</TipBody>
            {warning ? <TipWarn>{warning.message}</TipWarn> : null}
          </Tip>
        }
        // Left of the dock: a tip above End turn would lie over the dock's modes.
        side="left"
        sideOf=".rd-dock"
        triggerClassName="endturn-anchor"
      >
        <button
          aria-label={`End turn — press and hold.${warning ? ` ${warning.message}` : ""}`}
          className={`endturn${progress > 0 ? " is-held" : ""}${warning ? " is-danger" : ""}`}
          data-c="endturn"
          data-exclude
          onBlur={cancel}
          onKeyDown={(event) => {
            // A plain Enter would click the button: the one-press commit the hold refuses.
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              begin();
            }
          }}
          onKeyUp={cancel}
          onPointerCancel={cancel}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            begin();
          }}
          onPointerUp={cancel}
          ref={button}
          style={{ "--hold": progress } as CSSProperties}
          type="button"
        >
          <span className="endturn-disc" data-c="disc">
            <Ico path="events/end-turn" size="disc" />
          </span>
          <span className="kicker endturn-label" data-c="chip">
            End turn
          </span>
          {warning ? <span className="endturn-warning">{warning.label}</span> : null}
        </button>
      </Tooltip>
      {confirming && unrest ? (
        <EndTurnConfirm
          anchor={button}
          onCalmThenEnd={(payments) => {
            setConfirming(false);
            for (const payment of payments) onCalm(payment);
            onEndTurn();
          }}
          onClose={() => setConfirming(false)}
          onEnd={() => {
            setConfirming(false);
            onEndTurn();
          }}
          ruleset={ruleset}
          unrest={unrest}
        />
      ) : null}
    </>
  );
}

/**
 * The warning over the hourglass at the riot or revolt line. Focus lands on the plain
 * choice to face it, first in the order, and Tab stays in the card. Calm spends, so it
 * asks first (the confirm bar) and ends the turn only on yes.
 */
function EndTurnConfirm({
  anchor,
  unrest,
  ruleset,
  onCalmThenEnd,
  onEnd,
  onClose,
}: {
  anchor: RefObject<HTMLButtonElement | null>;
  unrest: TurnEndUnrest;
  ruleset: Ruleset;
  onCalmThenEnd: (payments: CivicCalmPayment[]) => void;
  onEnd: () => void;
  onClose: () => void;
}) {
  const { G, viewerId } = useGameUi();
  const ask = useConfirm();
  const revolt = unrest.tier === "revolt";
  const { calm } = unrest;
  // Calm bought more than once says how many times.
  const times = calm && calm.payments.length > 1 ? ` ×${calm.payments.length}` : "";
  const { share } = presentUnrestOutcome(ruleset, unrest.tier);
  // One line in the dock's width; the dialog's name says it whole.
  const title = revolt ? "Revolt at turn end" : "Riot at turn end";

  return (
    <Popover
      anchor={anchor}
      ariaLabel={revolt ? "Ending your turn now means revolt" : "Ending your turn starts a riot"}
      className={`endturn-confirm${revolt ? " is-revolt" : ""}`}
      dismissOnOutside
      onDismiss={onClose}
      slot
    >
      <div className="confirm-card">
        <header className="confirm-head">
          <h2 className="name confirm-title">{title}</h2>
          <CloseDisc label="Close the warning" onClick={onClose} />
        </header>
        <p className="confirm-body">
          <Prose links={false}>
            {revolt ? (
              unrest.slaves ? (
                <>
                  {`${share} your slaves walk away: `}
                  <b>
                    {unrest.leaving} of {unrest.slaves}
                  </b>
                  . No roll and no insurance.
                </>
              ) : (
                "No slaves are left to walk away; only your Unrest tokens clear."
              )
            ) : (
              `Your ${unrest.tokens} Unrest ${unrest.tokens === 1 ? "token clears" : "tokens clear"}, then you roll on the riot table.`
            )}
          </Prose>
        </p>
        {calm ? (
          <p className="confirm-calm">
            <Ico path="unrest/calm" size="ui" />
            <span>
              {calm.tier === "none"
                ? `Calm${times} gives ${formatSignedNumber(calm.level - unrest.level)} and holds the line.`
                : `Calm${times} (${formatSignedNumber(calm.level - unrest.level)}) lifts you to ${formatSignedNumber(calm.level)}: a riot instead.`}
            </span>
          </p>
        ) : null}
        <div className="confirm-acts">
          {/* The plain choice first: it has the focus, and Tab goes on to Calm. */}
          <button autoFocus className="btn kicker confirm-btn" onClick={onEnd} type="button">
            {revolt ? "Revolt" : "Face the riot"}
          </button>
          {calm ? (
            <button
              className="btn kicker confirm-btn is-primary"
              onClick={() =>
                ask({
                  icon: "unrest/calm-verb",
                  question: `Are you sure you want to buy Calm${times} for ${formatResourceCost(calm.cost).toLowerCase()} and end your turn?`,
                  detail: (
                    <SpendDetail
                      command={calm.payments.map((payment) => ({
                        type: "civicCalm" as const,
                        payment,
                      }))}
                      cost={calm.cost}
                      G={G}
                      note={
                        calm.tier === "none"
                          ? "Then your turn ends."
                          : "Then your turn ends in a riot."
                      }
                      viewerId={viewerId}
                    />
                  ),
                  verb: "Calm and end",
                  onYes: () => onCalmThenEnd(calm.payments),
                })
              }
              type="button"
            >
              Calm{times}, then end <Chips amounts={calm.cost} />
            </button>
          ) : null}
        </div>
      </div>
    </Popover>
  );
}
