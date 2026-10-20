import { useEffect, useEffectEvent, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { AnchoringOptions, VerticalPlacement } from "../../ui/anchoring";
import { isElementRef, useAnchoredOverlay } from "./useAnchoredOverlay";

export function Popover({
  align,
  anchor,
  ariaLabel,
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
    anchor,
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
      if (!ref.current?.contains(target) && !control?.contains(target)) dismiss();
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [anchor, dismissOnOutside]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-label={ariaLabel}
      aria-modal="false"
      className={["sharedPopover", position ? `placement-${position.placement}` : "", className]
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
        position
          ? { left: position.left, top: position.top, opacity: 1 }
          : isElementRef(anchor)
            ? { opacity: 0 }
            : {
                left: anchor.left,
                top: preferredPlacement === "below" ? anchor.bottom + 12 : anchor.top - 12,
                opacity: 0,
              }
      }
      tabIndex={-1}
    >
      <span
        aria-hidden="true"
        className="foundColonyArrow sharedPopoverArrow"
        style={{ left: position ? position.arrowLeft : "50%" }}
      />
      {children}
    </div>,
    document.body,
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
