import { useEffect, useRef, type ReactNode } from "react";

type ModalShellProps = {
  children: ReactNode;
  /** Extra classes on the dialog surface. `logModal` is the default width/padding. */
  className?: string;
  /** Extra classes on the backdrop — e.g. `eventModalBackdrop` for the ceremony register. */
  backdropClassName?: string;
  /** Wire to the id of the dialog's heading. */
  labelledBy?: string;
  /** Accessible name when the dialog has no visible heading to point at. */
  label?: string;
  /**
   * How the player gets out. Omit entirely for a *blocking* dialog (riot, pending
   * event, game over) — those resolve through their own buttons and must not be
   * dismissable by Escape or a stray backdrop click.
   */
  onDismiss?: () => void;
  /** Default true when `onDismiss` is set; pass false for dialogs mid-transaction. */
  dismissOnBackdrop?: boolean;
  /**
   * Raises the dialog into the CEREMONY register: the table goes dark, the scrim
   * closes to a vignette, and the surface takes a mood frame.
   *
   * The three moods are the only thing that changes between ceremonies, and they
   * are about how the moment FEELS, not what it does: a `gift` is olive, a
   * `wound` oxblood, a `rite` clay. Routine picks — choosing a target, picking a
   * payment — stay plain, because if every dialog is a rite then none of them is.
   */
  ceremony?: "gift" | "wound" | "rite";
  /**
   * A line pinned to the foot of the SCRIM, outside the surface — the deck a
   * fate was dealt from, and nothing else so far. It belongs to the table, not
   * to the card, which is why it cannot simply be the last child of the dialog.
   */
  scrimNote?: ReactNode;
};

/** Everything the browser will let a player reach with Tab. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The one modal grammar. Every dialog renders through this: backdrop, dialog
 * semantics, Escape-to-close and backdrop-to-close all live here so they behave
 * identically everywhere and can be restyled in one file.
 *
 * Dismissability is the dial: pass `onDismiss` and the dialog is escapable;
 * omit it and the dialog blocks until its own buttons resolve it.
 */
export function ModalShell({
  children,
  className,
  backdropClassName,
  labelledBy,
  label,
  onDismiss,
  dismissOnBackdrop = true,
  ceremony,
  scrimNote,
}: ModalShellProps) {
  const surfaceRef = useRef<HTMLElement>(null);

  /**
   * Focus moves in, and stays in. A blocking ceremony cannot be escaped by
   * design, so leaving focus behind on the board would strand a keyboard player
   * tabbing through a chart they are not allowed to touch. On unmount the focus
   * goes back where it came from, so a dialog opened from a verb returns you to
   * that verb.
   */
  useEffect(() => {
    const surface = surfaceRef.current;

    if (!surface) {
      return;
    }

    const opener = surface.ownerDocument.activeElement;
    const reachable = () =>
      [...surface.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null || element === surface,
      );

    // The dialog itself, not its first button. A screen reader then announces
    // the whole dialog on entry, and the commit does not arrive already wearing
    // a focus ring the player did not ask for.
    surface.focus();

    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") {
        return;
      }

      const items = reachable();
      const active = surface.ownerDocument.activeElement;
      const inside = active instanceof Node && surface.contains(active);

      if (items.length === 0) {
        event.preventDefault();
        surface.focus();
        return;
      }

      const edge = event.shiftKey ? items[0] : items[items.length - 1];

      if (!inside || active === edge) {
        event.preventDefault();
        (event.shiftKey ? items[items.length - 1] : items[0]).focus();
      }
    };

    const document_ = surface.ownerDocument;
    document_.addEventListener("keydown", trap, true);

    return () => {
      document_.removeEventListener("keydown", trap, true);

      if (opener instanceof HTMLElement && document_.contains(opener)) {
        opener.focus();
      }
    };
  }, []);

  useEffect(() => {
    if (!onDismiss) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onDismiss();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onDismiss]);

  return (
    <div
      className={[
        "modalBackdrop",
        ceremony ? "ceremonyScrim" : null,
        // The note is a real sibling of the dialog, so the scrim has to STACK the
        // two. It used to be pinned to the chrome independently of the card,
        // which put it behind any card tall enough to reach that line.
        scrimNote ? "scrimNoted" : null,
        backdropClassName,
      ]
        .filter(Boolean)
        .join(" ")}
      role="presentation"
      onMouseDown={
        onDismiss && dismissOnBackdrop
          ? (event) => {
              // Only a press that starts *and* lands on the backdrop closes — a drag
              // that began inside the dialog must never dismiss it.
              if (event.target === event.currentTarget) {
                onDismiss();
              }
            }
          : undefined
      }
    >
      <section
        aria-label={label}
        aria-labelledby={labelledBy}
        aria-modal="true"
        // A ceremony is NOT a log modal. It used to wear both, and every rule in
        // `ceremony.css` then opened by undoing the plate, the blur and the
        // border it had just inherited — the seam this overhaul removes.
        className={[ceremony ? `ceremony ceremony-${ceremony}` : "logModal", className]
          .filter(Boolean)
          .join(" ")}
        ref={surfaceRef}
        role="dialog"
        tabIndex={-1}
      >
        {children}
      </section>

      {scrimNote}
    </div>
  );
}
