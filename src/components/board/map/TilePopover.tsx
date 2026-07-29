import type { ReactNode } from "react";
import { Popover } from "../../overlays/Popover";

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

export function TilePopover({
  anchor,
  label,
  title,
  onCancel,
  children,
  /** Bumping this re-measures — pass anything that changes the panel's height. */
  measureKey,
  /** For panels whose content genuinely needs more than the default width. */
  className,
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
  return (
    <Popover
      anchor={anchor}
      ariaLabel={label}
      className={["foundColonyPopover", className].filter(Boolean).join(" ")}
      measureKey={measureKey}
      onDismiss={onCancel}
    >
      <header className="foundColonyHeader">
        <span className="placementPreviewTag">{title}</span>
        <button aria-label="Cancel" className="foundColonyClose" onClick={onCancel} type="button">
          ×
        </button>
      </header>

      {children}
    </Popover>
  );
}
