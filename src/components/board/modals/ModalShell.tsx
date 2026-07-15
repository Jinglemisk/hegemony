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
};

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
  dismissOnBackdrop = true
}: ModalShellProps) {
  const surfaceRef = useRef<HTMLElement>(null);

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
      className={["modalBackdrop", backdropClassName].filter(Boolean).join(" ")}
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
        className={["logModal", className].filter(Boolean).join(" ")}
        ref={surfaceRef}
        role="dialog"
      >
        {children}
      </section>
    </div>
  );
}
