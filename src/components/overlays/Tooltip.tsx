import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
  type ReactElement,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { VerticalPlacement } from "../../ui/anchoring";
import { useAnchoredOverlay } from "./useAnchoredOverlay";

export function Tooltip({
  children,
  content,
  disabled = false,
  ariaLabel,
  focusable = false,
  triggerClassName,
  triggerStyle,
  tooltipClassName,
  preferredPlacement = "below",
}: {
  children: ReactNode;
  content: ReactNode;
  /** Disabled native controls cannot receive focus; their wrapper becomes the trigger. */
  disabled?: boolean;
  ariaLabel?: string;
  focusable?: boolean;
  triggerClassName?: string;
  triggerStyle?: CSSProperties;
  tooltipClassName?: string;
  preferredPlacement?: VerticalPlacement;
}) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const position = useAnchoredOverlay(
    open ? triggerRef : null,
    tooltipRef,
    { preferredPlacement, gap: 8, margin: 10 },
    open,
  );

  useEffect(() => {
    if (!open) return;

    const dismiss = (event: globalThis.PointerEvent) => {
      if (!triggerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const wrapperIsTrigger = disabled || focusable;
  const describedChild = addDescription(children, wrapperIsTrigger ? undefined : tooltipId);
  const handleBlur = (event: FocusEvent<HTMLSpanElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  };
  const handlePointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType === "touch") setOpen((current) => !current);
  };

  return (
    <>
      <span
        aria-describedby={wrapperIsTrigger ? tooltipId : undefined}
        aria-label={wrapperIsTrigger ? ariaLabel : undefined}
        className={["tooltipTrigger", triggerClassName].filter(Boolean).join(" ")}
        data-disabled={disabled || undefined}
        style={triggerStyle}
        onBlur={handleBlur}
        onFocus={() => setOpen(true)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onPointerDown={handlePointerDown}
        ref={triggerRef}
        tabIndex={wrapperIsTrigger ? 0 : undefined}
      >
        {describedChild}
      </span>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className={[
                "sharedTooltip",
                position ? `placement-${position.placement}` : "",
                tooltipClassName,
              ]
                .filter(Boolean)
                .join(" ")}
              id={tooltipId}
              ref={tooltipRef}
              role="tooltip"
              style={
                position
                  ? { left: position.left, top: position.top, opacity: 1 }
                  : { left: 0, top: 0, opacity: 0 }
              }
            >
              {content}
            </div>,
            document.body,
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
