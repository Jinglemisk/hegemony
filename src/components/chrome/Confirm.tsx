import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Ico } from "../frame/parts";
import { ESCAPE, useEscapeLayer } from "../overlays/escapeStack";
import { inertAround, trapTab } from "../overlays/focus";
import { ConfirmContext, useConfirmState, type ConfirmAsk } from "./confirmContext";
import { Lacquer, Plaque } from "./controls";
import { Panel } from "./Panel";

/** Holds the one open confirm question for everything under it (`useConfirm`). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmAsk | null>(null);
  // What had the focus when the question was asked, before the bar takes it.
  const opener = useRef<Element | null>(null);
  const ask = useCallback((question: ConfirmAsk) => {
    opener.current = document.activeElement;
    setPending(question);
  }, []);
  const value = useMemo(
    () => ({ pending, opener, ask, close: () => setPending(null) }),
    [pending, ask],
  );
  return <ConfirmContext.Provider value={value}>{children}</ConfirmContext.Provider>;
}

/**
 * The confirm bar, mounted once in the HUD canvas: one wide quiet bar over the
 * board's centre, the board dimmed only slightly. Focus lands on the verb and Tab
 * stays in the bar, the rest of the frame inert; Enter is yes, Escape or a press
 * outside the bar is no, and focus goes back to the control that asked (or, when a
 * pop asked and closed, to what opened the pop).
 */
export function ConfirmHost() {
  const { pending, close, opener } = useConfirmState();
  const id = useId();
  const bar = useRef<HTMLDivElement>(null);
  const verb = useRef<HTMLButtonElement>(null);

  const answer = (yes: boolean) => {
    const onYes = pending?.onYes;
    close();
    if (yes) onYes?.();
  };
  const answerKey = useEffectEvent(answer);
  useEscapeLayer(ESCAPE.confirm, () => answer(false), Boolean(pending));

  // Before paint: note where the focus is now (a closing pop has handed it back to
  // what opened it), take it to the verb, trap Tab and make the rest inert.
  useLayoutEffect(() => {
    const surface = bar.current;
    if (!pending || !surface) return;
    const asked = opener.current;
    const before = document.activeElement;
    verb.current?.focus({ preventScroll: true });
    const untrap = trapTab(surface);
    const unInert = inertAround(surface);
    return () => {
      untrap();
      unInert();
      const back = [asked, before].find(
        (element): element is HTMLElement =>
          element instanceof HTMLElement &&
          element.isConnected &&
          element !== document.body &&
          !surface.contains(element),
      );
      back?.focus({ preventScroll: true });
    };
  }, [pending, opener]);

  useEffect(() => {
    if (!pending) return;
    const onKey = (event: KeyboardEvent) => {
      const onControl = (event.target as Element | null)?.closest?.(
        "button, a, input, select, textarea",
      );
      if (event.key === "Enter" && !onControl) {
        event.preventDefault();
        answerKey(true);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
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
        ref={bar}
        role="alertdialog"
        tabIndex={-1}
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
          <Lacquer onClick={() => answer(true)} ref={verb}>
            {pending.verb}
          </Lacquer>
        </div>
      </Panel>
    </div>
  );
}
