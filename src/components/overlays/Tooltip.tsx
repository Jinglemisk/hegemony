import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { VerticalPlacement } from "../../ui/anchoring";
import { overlayRoot } from "../chrome/canvas";
import { TipCard } from "./TipCard";
import { TIP_GRACE_MS, TIP_OPEN_MS, claimTip, releaseTip } from "./tipTiming";
import { useAnchoredOverlay } from "./useAnchoredOverlay";

export function Tooltip({
  children,
  content,
  ariaLabel,
  focusable = false,
  triggerClassName,
  triggerStyle,
  triggerAs = "span",
  tooltipClassName,
  preferredPlacement = "below",
  side,
  sideOf,
  triggerRole,
}: {
  children: ReactNode;
  content: ReactNode;
  ariaLabel?: string;
  focusable?: boolean;
  triggerClassName?: string;
  triggerStyle?: CSSProperties;
  triggerAs?: "span" | "div";
  tooltipClassName?: string;
  preferredPlacement?: VerticalPlacement;
  /** Beside the trigger instead of above or below it (a column of controls, or a
   *  list whose tips open clear of it). */
  side?: "right" | "left";
  /** With `side`: beside this ancestor (a selector) rather than the trigger, so the
   *  tip never lies over the rest of that surface (the dock's other controls). */
  sideOf?: string;
  /** With `focusable`: the trigger's role, so its name is read (a span takes no name).
   *  "img" for a figure the tip explains: a stock on the bar, an alarm's disc. */
  triggerRole?: "img";
}) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpenState] = useState(false);
  const suppressedTouchPointerRef = useRef<number | null>(null);
  // Pressed: the tip closes and stays shut until the pointer leaves and comes back,
  // so it never stands over what the press opened.
  const pressedRef = useRef(false);
  // A tooltip with underlined terms locks after resting (TipCard): then the pointer
  // may leave the trigger for the card, and the stack closes only after a grace.
  const lockedRef = useRef(false);
  const closeTimer = useRef<number | undefined>(undefined);
  // A hover waits TIP_OPEN_MS before the tip opens.
  const openTimer = useRef<number | undefined>(undefined);
  const cancelOpen = () => {
    window.clearTimeout(openTimer.current);
    openTimer.current = undefined;
  };
  const cancelClose = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = undefined;
  };
  // Closes this tip at once, from anywhere: another tooltip opening calls it.
  const [shut] = useState(() => () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = undefined;
    lockedRef.current = false;
    setOpenState(false);
  });
  const setOpen = (next: boolean) => {
    cancelClose();
    if (next) claimTip(shut);
    else lockedRef.current = false;
    setOpenState(next);
  };
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), TIP_GRACE_MS);
  };
  useEffect(
    () => () => {
      window.clearTimeout(closeTimer.current);
      window.clearTimeout(openTimer.current);
    },
    [],
  );
  useEffect(() => () => releaseTip(shut), [shut]);
  const position = useAnchoredOverlay(
    open ? triggerRef : null,
    tooltipRef,
    { preferredPlacement, side, sideOf, gap: 8, margin: 10 },
    open,
  );

  useEffect(() => {
    if (!open) return;

    const dismiss = (event: globalThis.PointerEvent) => {
      const target = event.target as Element;
      // A press on a locked card (or a term's card it opened) keeps the stack.
      if (triggerRef.current?.contains(target) || target.closest?.(".sharedTooltip")) return;
      lockedRef.current = false;
      setOpenState(false);
    };
    // Escape closes the tip and only the tip: the layer under it (escapeStack) waits
    // for the next press.
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        lockedRef.current = false;
        setOpenState(false);
      }
    };

    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const wrapperIsTrigger = focusable;
  const describedChild = addDescription(
    children,
    wrapperIsTrigger || !content ? undefined : tooltipId,
  );
  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  };
  // A first tap opens the tooltip instead of clicking; with nothing to say, it clicks.
  // A mouse or pen press closes it.
  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "touch") {
      pressedRef.current = true;
      cancelOpen();
      setOpen(false);
      return;
    }
    if (!content) return;

    if (open) {
      suppressedTouchPointerRef.current = null;
      setOpen(false);
      return;
    }

    suppressedTouchPointerRef.current = event.pointerId;
    setOpen(true);
  };
  const handlePointerCancel = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "touch") return;
    if (suppressedTouchPointerRef.current !== event.pointerId) return;

    suppressedTouchPointerRef.current = null;
    setOpen(false);
  };
  const handleClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (suppressedTouchPointerRef.current === null) return;

    suppressedTouchPointerRef.current = null;
    event.preventDefault();
    event.stopPropagation();
  };

  const Trigger = triggerAs;

  return (
    <>
      <Trigger
        aria-describedby={wrapperIsTrigger ? tooltipId : undefined}
        aria-label={wrapperIsTrigger ? ariaLabel : undefined}
        className={["tooltipTrigger", triggerClassName].filter(Boolean).join(" ")}
        role={wrapperIsTrigger ? triggerRole : undefined}
        style={triggerStyle}
        onBlur={handleBlur}
        onClickCapture={handleClickCapture}
        onFocus={(event) => {
          if (!pressedRef.current && keyboardFocus(event.target)) setOpen(true);
        }}
        onMouseEnter={() => {
          if (pressedRef.current || open) return;
          cancelOpen();
          openTimer.current = window.setTimeout(() => setOpen(true), TIP_OPEN_MS);
        }}
        onMouseLeave={() => {
          cancelOpen();
          pressedRef.current = false;
          if (lockedRef.current) closeSoon();
          else setOpen(false);
        }}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        ref={(element) => {
          triggerRef.current = element;
        }}
        tabIndex={wrapperIsTrigger ? 0 : undefined}
      >
        {describedChild}
      </Trigger>
      {open && content && typeof document !== "undefined"
        ? createPortal(
            <TipCard
              cardRef={tooltipRef}
              className={[
                "sharedTooltip",
                position ? `placement-${position.placement}` : "",
                tooltipClassName,
              ]
                .filter(Boolean)
                .join(" ")}
              id={tooltipId}
              onEnter={cancelClose}
              onLeave={closeSoon}
              onLock={() => {
                lockedRef.current = true;
              }}
              style={
                position
                  ? { left: position.left, top: position.top, opacity: 1 }
                  : { left: 0, top: 0, opacity: 0 }
              }
            >
              {content}
            </TipCard>,
            overlayRoot(),
          )
        : null}
    </>
  );
}

/** Focus the keyboard put there (`:focus-visible`), not a press's or a panel's
 *  hand-back after a press: only that opens a tip on focus. */
function keyboardFocus(target: EventTarget) {
  try {
    return (target as Element).matches(":focus-visible");
  } catch {
    return true;
  }
}

function addDescription(children: ReactNode, describedBy?: string) {
  if (!describedBy || !isValidElement(children)) return children;

  const child = children as ReactElement<{ "aria-describedby"?: string }>;
  const ids = [child.props["aria-describedby"], describedBy].filter(Boolean).join(" ");
  return cloneElement(child, { "aria-describedby": ids });
}
