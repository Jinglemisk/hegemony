import { useEffect, useEffectEvent, useId, useMemo, useState, type ReactNode } from "react";
import { Ico } from "../frame/parts";
import { ConfirmContext, useConfirmState, type ConfirmAsk } from "./confirmContext";
import { Lacquer, Plaque } from "./controls";
import { Panel } from "./Panel";

/** Holds the one open confirm question for everything under it (`useConfirm`). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmAsk | null>(null);
  const value = useMemo(
    () => ({ pending, ask: setPending, close: () => setPending(null) }),
    [pending],
  );
  return <ConfirmContext.Provider value={value}>{children}</ConfirmContext.Provider>;
}

/**
 * The confirm bar, mounted once in the HUD canvas: one wide quiet bar over the
 * board's centre, the board dimmed only slightly. Focus lands on the verb; Enter
 * is yes, Escape or a press outside the bar is no, and focus goes back to where
 * it was.
 */
export function ConfirmHost() {
  const { pending, close } = useConfirmState();
  const id = useId();

  const answer = (yes: boolean) => {
    const onYes = pending?.onYes;
    close();
    if (yes) onYes?.();
  };
  const answerKey = useEffectEvent(answer);

  useEffect(() => {
    if (!pending) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      const onControl = (event.target as Element | null)?.closest?.(
        "button, a, input, select, textarea",
      );
      if (event.key === "Escape") {
        event.stopPropagation();
        answerKey(false);
      } else if (event.key === "Enter" && !onControl) {
        event.preventDefault();
        answerKey(true);
      }
    };
    // Capture, so an Escape here does not also close the panel under the bar.
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [pending]);

  if (!pending) return null;
  return (
    <div
      className="ch-confirm-scrim"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) answer(false);
      }}
    >
      <Panel
        aria-describedby={pending.detail ? `${id}-d` : undefined}
        aria-labelledby={`${id}-q`}
        aria-modal="true"
        className="ch-confirm ch-settle"
        corners={["tl", "tr", "bl", "br"]}
        role="alertdialog"
      >
        <Ico path={pending.icon} size="tile" />
        <div className="ch-confirm-words">
          <p className="ch-confirm-q" id={`${id}-q`}>
            {pending.question}
          </p>
          {pending.detail ? (
            <p className="ch-confirm-d" id={`${id}-d`}>
              {pending.detail}
            </p>
          ) : null}
        </div>
        <div className="ch-confirm-acts">
          <Plaque onClick={() => answer(false)}>Cancel</Plaque>
          <Lacquer autoFocus onClick={() => answer(true)}>
            {pending.verb}
          </Lacquer>
        </div>
      </Panel>
    </div>
  );
}
