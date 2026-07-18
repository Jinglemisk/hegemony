import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ANCHOR_MARGIN, clampAnchoredLeft } from "../../../ui/anchoring";

/**
 * The popover half of map-first selection (refit scope 3): a panel pinned to the
 * tile the player just clicked, above or below it — whichever the viewport has
 * room for — so the board stays visible while they confirm.
 *
 * Generalised out of FoundColonyPopover, which was the only flow doing this
 * properly. Every armed mode now confirms through the same surface, which means
 * the positioning is written once and the brandbook restyles it once.
 *
 * This is NOT a modal: no backdrop, nothing covered. That is the whole point of
 * selection rule 1 — the board answers the question the panel is asking.
 */

type PopoverPosition = { top: number; left: number; arrowLeft: number; placement: "above" | "below" };

/** Breathing room between the popover and the tile it points at. */
const POPOVER_GAP = 12;
/** Keeps the arrow inside the popover's rounded corners. */
const ARROW_INSET = 18;

export function TilePopover({
  anchor,
  label,
  title,
  onCancel,
  children,
  /** Bumping this re-measures — pass anything that changes the panel's height. */
  measureKey,
  /** For panels whose content genuinely needs more than the default width. */
  className
}: {
  anchor: DOMRect;
  /** Accessible name for the panel. */
  label: string;
  /** The kicker shown in the header. */
  title: string;
  onCancel: () => void;
  children: ReactNode;
  measureKey?: unknown;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const { width, height } = element.getBoundingClientRect();
    const margin = ANCHOR_MARGIN;
    const viewportHeight = window.innerHeight;
    const centerX = anchor.left + anchor.width / 2;
    const left = clampAnchoredLeft(centerX, width, margin);
    // Measures itself and takes whichever side actually has room — a tile near the
    // bottom of the board must not open a panel off-screen.
    const spaceBelow = viewportHeight - anchor.bottom;
    const spaceAbove = anchor.top;
    const placement: "above" | "below" =
      spaceBelow >= height + POPOVER_GAP + margin
        ? "below"
        : spaceAbove >= height + POPOVER_GAP + margin
          ? "above"
          : spaceBelow >= spaceAbove
            ? "below"
            : "above";
    const rawTop = placement === "below" ? anchor.bottom + POPOVER_GAP : anchor.top - height - POPOVER_GAP;
    const top = Math.max(margin, Math.min(rawTop, viewportHeight - height - margin));
    const arrowLeft = Math.max(ARROW_INSET, Math.min(centerX - left, width - ARROW_INSET));

    setPosition({ top, left, arrowLeft, placement });
  }, [anchor, measureKey]);

  // Rendered at opacity 0 for the first paint so it can measure itself without
  // the player watching it jump into place.
  const style: CSSProperties = position
    ? { top: position.top, left: position.left, opacity: 1 }
    : { top: anchor.bottom + POPOVER_GAP, left: anchor.left, opacity: 0 };

  return (
    <div
      aria-label={label}
      className={["foundColonyPopover", position ? `placement-${position.placement}` : "", className].filter(Boolean).join(" ")}
      ref={ref}
      role="dialog"
      style={style}
    >
      <span aria-hidden="true" className="foundColonyArrow" style={{ left: position ? position.arrowLeft : "50%" }} />

      <header className="foundColonyHeader">
        <span className="placementPreviewTag">{title}</span>
        <button aria-label="Cancel" className="foundColonyClose" onClick={onCancel} type="button">
          ×
        </button>
      </header>

      {children}
    </div>
  );
}
