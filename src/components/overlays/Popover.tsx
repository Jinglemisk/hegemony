import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { VerticalPlacement } from "../../ui/anchoring";
import { useAnchoredOverlay } from "./useAnchoredOverlay";

export function Popover({
  anchor,
  ariaLabel,
  children,
  className,
  measureKey,
  onDismiss,
  preferredPlacement = "below",
}: {
  anchor: DOMRect;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  measureKey?: unknown;
  onDismiss: () => void;
  preferredPlacement?: VerticalPlacement;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const position = useAnchoredOverlay(anchor, ref, { preferredPlacement, gap: 12 }, measureKey);
  const returnFocusRef = useRef<FocusableElement | null>(activeFocusableElement());

  useEffect(() => {
    const element = ref.current;
    const returnTarget = returnFocusRef.current;
    if (!element) return;

    element.focus({ preventScroll: true });

    return () => {
      if (returnTarget?.isConnected) {
        returnTarget.focus({ preventScroll: true });
      }
    };
  }, []);

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
