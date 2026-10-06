import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { CivicCalmPayment } from "../../game/civic";
import type { PlayerId } from "../../game/types";
import type { TurnEndUnrest } from "../../game/unrest";
import { sign } from "../../ui/frameFormat";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";
import { Tooltip } from "../overlays/Tooltip";
import { Ico, Price, Tip, TipWarn } from "./parts";

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
          <span className="endturn-blazon">{acting.blazon}</span>
        </span>
        <span className="endturn-label" data-c="chip">
          {waitingLabel ?? acting.name}
        </span>
      </div>
    );
  }

  return (
    <>
      {confirming && unrest ? (
        <EndTurnConfirm
          onCalmThenEnd={(payment) => {
            setConfirming(false);
            onCalm(payment);
            onEndTurn();
          }}
          onClose={() => setConfirming(false)}
          onEnd={() => {
            setConfirming(false);
            onEndTurn();
          }}
          unrest={unrest}
        />
      ) : null}
      <Tooltip
        content={
          <Tip title="End turn">
            <p className="tip-body">{title}</p>
            {warning ? <TipWarn>{warning.message}</TipWarn> : null}
          </Tip>
        }
        preferredPlacement="above"
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
          style={{ "--hold": progress } as CSSProperties}
          type="button"
        >
          <span className="endturn-disc" data-c="disc">
            <Ico path="events/end-turn" size="disc" />
          </span>
          <span className="endturn-label" data-c="chip">
            End turn
          </span>
          {warning ? <span className="endturn-warning">{warning.label}</span> : null}
        </button>
      </Tooltip>
    </>
  );
}

/** The confirm over the hourglass at the riot or revolt line. */
function EndTurnConfirm({
  unrest,
  onCalmThenEnd,
  onEnd,
  onClose,
}: {
  unrest: TurnEndUnrest;
  onCalmThenEnd: (payment: CivicCalmPayment) => void;
  onEnd: () => void;
  onClose: () => void;
}) {
  const revolt = unrest.outcome === "revolt";
  const { calm } = unrest;
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const away = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [onClose]);

  return (
    <section
      aria-labelledby="endturn-confirm-title"
      className={`endturn-confirm${revolt ? " is-revolt" : ""}`}
      ref={ref}
      role="dialog"
    >
      <span className="confirm-kicker">
        Happiness {sign(unrest.level)} · the {revolt ? "revolt" : "riot"} line
      </span>
      <h2 className="confirm-title" id="endturn-confirm-title">
        {revolt ? "Ending your turn now means revolt" : "Ending your turn starts a riot"}
      </h2>
      <p className="confirm-body">
        {revolt ? (
          unrest.slaves ? (
            <>
              Half your slaves walk away:{" "}
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
      </p>
      {calm ? (
        <p className="confirm-calm">
          <Ico path="unrest/calm" size="ui" />
          <span>
            {calm.outcome === "none"
              ? `Calm gives ${sign(calm.level - unrest.level)} for this year and holds the line.`
              : `Calm (${sign(calm.level - unrest.level)}) lifts you to ${sign(calm.level)}: a riot instead.`}
          </span>
        </p>
      ) : null}
      <div className="confirm-acts">
        {calm ? (
          <button
            className="confirm-btn is-primary"
            onClick={() => onCalmThenEnd(calm.payment)}
            type="button"
          >
            Calm, then end <Price amounts={calm.cost} />
          </button>
        ) : null}
        <button autoFocus className="confirm-btn" onClick={onEnd} type="button">
          {revolt ? "Revolt" : "Face the riot"}
        </button>
      </div>
    </section>
  );
}
