import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { PlayerId } from "../../game/types";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";
import { Tooltip } from "../overlays/Tooltip";
import { Ico, Tip, TipWarn } from "./parts";

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

/** End turn: its own column at the far bottom right. While a rival acts, it names them. */
export function EndTurn({
  actingId,
  canEndTurn,
  title,
  warning,
  onEndTurn,
}: {
  actingId: PlayerId;
  /** Whether the viewer may commit right now (seat, phase and pending events). */
  canEndTurn: boolean;
  title: string;
  warning: { label: string; message: string } | null;
  onEndTurn: () => void;
}) {
  const { progress, begin, cancel } = useHoldToCommit(onEndTurn, canEndTurn);
  const acting = PLAYER_GLAZES[actingId];

  if (!canEndTurn) {
    return (
      <div
        aria-label={`${acting.name} is acting.`}
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
          {acting.name}
        </span>
      </div>
    );
  }

  return (
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
  );
}
