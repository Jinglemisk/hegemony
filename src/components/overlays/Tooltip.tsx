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
import { TIP_GRACE_MS } from "./tipTiming";
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
  /** Beside the trigger instead of above or below it (a column of controls). */
  side?: "right";
}) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpenState] = useState(false);
  const suppressedTouchPointerRef = useRef<number | null>(null);
  // A tooltip with underlined terms locks after resting (TipCard): then the pointer
  // may leave the trigger for the card, and the stack closes only after a grace.
  const lockedRef = useRef(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const cancelClose = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = undefined;
  };
  const setOpen = (next: boolean) => {
    cancelClose();
    if (!next) lockedRef.current = false;
    setOpenState(next);
  };
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), TIP_GRACE_MS);
  };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);
  const position = useAnchoredOverlay(
    open ? triggerRef : null,
    tooltipRef,
    { preferredPlacement, side, gap: 8, margin: 10 },
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
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
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
  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "touch" || !content) return;

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
        style={triggerStyle}
        onBlur={handleBlur}
        onClickCapture={handleClickCapture}
        onFocus={() => setOpen(true)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => (lockedRef.current ? closeSoon() : setOpen(false))}
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

function addDescription(children: ReactNode, describedBy?: string) {
  if (!describedBy || !isValidElement(children)) return children;

  const child = children as ReactElement<{ "aria-describedby"?: string }>;
  const ids = [child.props["aria-describedby"], describedBy].filter(Boolean).join(" ");
  return cloneElement(child, { "aria-describedby": ids });
}
