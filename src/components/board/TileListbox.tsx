import { useRef, type ReactNode } from "react";
import { AtlasIcon } from "../Sprites";
import type { IconAtlasKey } from "../Sprites";

/**
 * The one custom listbox (refit scope 4 / selection rule 2). Replaces every native
 * `<select>` in the game.
 *
 * A native select renders an OS menu — it cannot show tile art, it looks like a
 * form control in a game about a painted board, and on a Mac it opens a system
 * popup that covers the map. Its row template here is the tile-art picker card:
 * icon, terrain + yield, and a subtitle carrying pops / shared status.
 *
 * Used ONLY where a list genuinely beats the map — chiefly inside the riot modal,
 * which blocks by design (Q15) and therefore cannot let the player pick on a board
 * it is covering. Anywhere the board IS visible, the map is the picker instead
 * (selection rule 1).
 *
 * Keyboard: it is a real listbox, so arrows move the selection, Home/End jump to
 * the ends, and the active option is what a screen reader announces — none of
 * which the native select gave up for free, but all of which players expect.
 */

export type TileListboxOption<T extends string> = {
  value: T;
  icon: IconAtlasKey;
  /** The bold line — usually terrain + yield. */
  title: ReactNode;
  /** The quiet line — coordinates, pops, shared-tile warnings. */
  detail?: ReactNode;
  disabled?: boolean;
  /** Full sentence for the tooltip and the accessible name. */
  label?: string;
};

export function TileListbox<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className
}: {
  options: Array<TileListboxOption<T>>;
  value: T | null;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const move = (delta: number) => {
    const selectable = options.filter((option) => !option.disabled);

    if (selectable.length === 0) {
      return;
    }

    const current = selectable.findIndex((option) => option.value === value);
    // From nothing, step in from whichever end the player reached for.
    const next = current < 0 ? (delta > 0 ? 0 : selectable.length - 1) : current + delta;

    onChange(selectable[Math.max(0, Math.min(next, selectable.length - 1))].value);
  };

  const handleKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const selectable = options.filter((option) => !option.disabled);

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectable[0] && onChange(selectable[0].value);
    } else if (event.key === "End") {
      event.preventDefault();
      selectable[selectable.length - 1] && onChange(selectable[selectable.length - 1].value);
    }
  };

  return (
    <div
      aria-label={ariaLabel}
      className={["tileListbox", className].filter(Boolean).join(" ")}
      onKeyDown={handleKey}
      ref={ref}
      role="listbox"
      tabIndex={0}
    >
      {options.map((option) => (
        <button
          aria-selected={option.value === value}
          className={
            option.value === value ? "placementPickerChip tileListboxRow selectedChoice" : "placementPickerChip tileListboxRow"
          }
          disabled={option.disabled}
          key={option.value}
          onClick={() => onChange(option.value)}
          role="option"
          // Roving focus stays on the listbox; rows are reachable by arrow only,
          // so a six-tile picker costs one Tab stop rather than six.
          tabIndex={-1}
          title={option.label}
          type="button"
        >
          <AtlasIcon icon={option.icon} className="miniIcon" />
          <span className="placementChipText">
            <strong>{option.title}</strong>
            {option.detail ? <em>{option.detail}</em> : null}
          </span>
        </button>
      ))}
    </div>
  );
}
