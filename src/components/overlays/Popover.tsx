import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAnchoredOverlay } from "./useAnchoredOverlay";

export function Popover({
  anchor,
  ariaLabel,
  children,
  className,
  measureKey,
  onDismiss,
}: {
  anchor: DOMRect;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  measureKey?: unknown;
  onDismiss: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const position = useAnchoredOverlay(
    anchor,
    ref,
    { preferredPlacement: "below", gap: 12 },
    measureKey,
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.focus({ preventScroll: true });
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
          : { left: anchor.left, top: anchor.bottom + 12, opacity: 0 }
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
