import { useEffect, useRef, type ReactNode } from "react";
import { ESCAPE, useEscapeLayer } from "../../overlays/escapeStack";
import { trapTab } from "../../overlays/focus";

type ModalShellProps = {
  children: ReactNode;
  /** Classes on the dialog surface: each dialog brings its own card. */
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
   * The Imperator frame: parchment in the cast bronze rule, a bronze corner on each
   * corner, settling into place (moments.css). Off for a surface that is not a box —
   * a drawn card standing on the table, a takeover that fills the screen.
   */
  framed?: boolean;
};

const CORNERS = ["tl", "tr", "bl", "br"] as const;

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
  framed = true,
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

    // The dialog itself, not its first button. A screen reader then announces
    // the whole dialog on entry, and the commit does not arrive already wearing
    // a focus ring the player did not ask for.
    surface.focus();
    const untrap = trapTab(surface);

    return () => {
      untrap();

      if (opener instanceof HTMLElement && surface.ownerDocument.contains(opener)) {
        opener.focus();
      }
    };
  }, []);

  // Escape closes it (escapeStack); a blocking dialog takes the key and does nothing,
  // so nothing under it closes either.
  useEscapeLayer(ESCAPE.dialog, () => onDismiss?.());

  return (
    <div
      className={["modalBackdrop", ceremony ? "ceremonyScrim" : null, backdropClassName]
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
        // No shared plate under the card: the old `logModal` one was undone by
        // every ceremony, the sitting, the Idea draft and the turn notice.
        className={[
          ceremony && `ceremony ceremony-${ceremony}`,
          framed && "ch-moment ch-settle",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        ref={surfaceRef}
        role="dialog"
        tabIndex={-1}
      >
        {children}
        {framed
          ? CORNERS.map((at) => (
              <span aria-hidden="true" className="ch-corner" data-at={at} key={at} />
            ))
          : null}
      </section>
    </div>
  );
}
