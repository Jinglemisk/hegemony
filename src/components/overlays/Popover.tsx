import { useEffect, useEffectEvent, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { AnchoringOptions, VerticalPlacement } from "../../ui/anchoring";
import { overlayRoot, overlayScale } from "../chrome/canvas";
import { isElementRef, useAnchoredOverlay } from "./useAnchoredOverlay";

export function Popover({
  align,
  anchor,
  ariaLabel,
  centre = false,
  children,
  className,
  dismissOnOutside = false,
  measureKey,
  onDismiss,
  preferredPlacement = "below",
}: {
  align?: AnchoringOptions["align"];
  /** A spot on the map, or the control that opens the popover. */
  anchor: DOMRect | RefObject<HTMLElement | null>;
  ariaLabel: string;
  /** Centre it on the board instead of beside the anchor (a card that holds up no one,
   *  like the trade composer); the anchor only takes focus back. */
  centre?: boolean;
  children: ReactNode;
  className?: string;
  /** A press outside the popover and its control closes it. */
  dismissOnOutside?: boolean;
  measureKey?: unknown;
  onDismiss: () => void;
  preferredPlacement?: VerticalPlacement;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const position = useAnchoredOverlay(
    centre ? null : anchor,
    ref,
    { align, preferredPlacement, gap: 12 },
    measureKey,
  );
  const returnFocusRef = useRef<FocusableElement | null>(activeFocusableElement());

  useEffect(() => {
    const element = ref.current;
    const returnTarget = returnFocusRef.current;
    if (!element) return;

    // A child that took focus on mount (`autoFocus`) keeps it.
    if (!element.contains(document.activeElement)) element.focus({ preventScroll: true });

    return () => {
      if (returnTarget?.isConnected) {
        returnTarget.focus({ preventScroll: true });
      }
    };
  }, []);

  const dismiss = useEffectEvent(onDismiss);
  useEffect(() => {
    if (!dismissOnOutside) return;
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      const control = isElementRef(anchor) ? anchor.current : null;
      // The confirm bar asks over the popover that opened it: answering it is no press away.
      if ((target as Element).closest?.(".ch-confirm-scrim")) return;
      if (!ref.current?.contains(target) && !control?.contains(target)) dismiss();
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [anchor, dismissOnOutside]);

  if (typeof document === "undefined") return null;
  const root = overlayRoot();
  const k = overlayScale(root);

  return createPortal(
    <div
      aria-label={ariaLabel}
      aria-modal="false"
      className={[
        "sharedPopover",
        centre ? "is-centre" : position ? `placement-${position.placement}` : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onDismiss();
        }
      }}
      ref={ref}
      role="dialog"
      style={
        centre
          ? undefined
          : position
            ? { left: position.left, top: position.top, opacity: 1 }
            : isElementRef(anchor)
              ? { opacity: 0 }
              : {
                  left: anchor.left / k,
                  top:
                    (preferredPlacement === "below" ? anchor.bottom : anchor.top) / k +
                    (preferredPlacement === "below" ? 12 : -12),
                  opacity: 0,
                }
      }
      tabIndex={-1}
    >
      {centre ? null : (
        <span
          aria-hidden="true"
          className="foundColonyArrow sharedPopoverArrow"
          style={{ left: position ? position.arrowLeft : "50%" }}
        />
      )}
      {children}
    </div>,
    root,
  );
}

type FocusableElement = Element & {
  focus: (options?: FocusOptions) => void;
};

function activeFocusableElement(): FocusableElement | null {
  if (typeof document === "undefined" || document.activeElement === document.body) return null;

  const element = document.activeElement;
  return element && "focus" in element ? (element as FocusableElement) : null;
}
