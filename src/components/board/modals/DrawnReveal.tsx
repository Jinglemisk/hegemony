import type { ReactNode } from "react";
import type { CeremonyMood } from "./ceremonyMood";
import { ModalShell } from "./ModalShell";

/**
 * The table a drawn card lands on, in one order for every deck: the card, then the deck
 * line, then the slip (anything the card asks or tells each realm), then the commit.
 * Blocking unless `onDismiss` is given, as every ModalShell.
 */
export function DrawnReveal({
  mood,
  label,
  labelledBy,
  onDismiss,
  card,
  deck,
  slip,
  caption,
  children,
}: {
  mood: CeremonyMood;
  label?: string;
  labelledBy?: string;
  onDismiss?: () => void;
  card: ReactNode;
  /** The deck line. */
  deck?: ReactNode;
  /** What the card asks or tells beyond its face, on a paper slip. */
  slip?: ReactNode;
  caption?: ReactNode;
  /** The commit. */
  children?: ReactNode;
}) {
  return (
    <ModalShell
      backdropClassName="eventModalBackdrop drawnScrim"
      ceremony={mood}
      className="drawnReveal"
      label={label}
      labelledBy={labelledBy}
      onDismiss={onDismiss}
    >
      {card}
      {deck}
      {slip || caption || children ? (
        <div className="drawn-tray">
          {slip ? <div className="drawn-slip">{slip}</div> : null}
          {caption ? <div className="drawn-caption caption">{caption}</div> : null}
          {children}
        </div>
      ) : null}
    </ModalShell>
  );
}
