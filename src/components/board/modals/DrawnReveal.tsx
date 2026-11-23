import type { ReactNode } from "react";
import { Lacquer } from "../../chrome/controls";
import { Ico } from "../../frame/parts";
import type { CeremonyMood, CommitLabel } from "./ceremonyMood";
import { ModalShell } from "./ModalShell";

/**
 * The table a drawn card lands on, in one order for every deck: the card, then the deck
 * line, then the slip (anything the card asks or tells), then the commit. The whole
 * stack is laid out at its final size from the first frame; what shows later (`waiting`,
 * the tray of a card still on its back) only fades in place, so the card never moves.
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
  waiting = false,
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
  /** Hold the tray hidden, in its place, until the card is face up. */
  waiting?: boolean;
  /** The commit (a `DrawnCommit`), with any way out beside it. */
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
        <div
          aria-hidden={waiting || undefined}
          className={`drawn-tray${waiting ? " is-waiting" : ""}`}
        >
          {slip ? <div className="drawn-slip">{slip}</div> : null}
          {caption ? <div className="drawn-caption caption">{caption}</div> : null}
          {children ? <div className="drawn-acts">{children}</div> : null}
        </div>
      ) : null}
    </ModalShell>
  );
}

/**
 * The commit under a drawn card: the moment's one lacquer, as wide as its words, which
 * name what it does with the icon of what it acts on ("Clear the [unrest] Unrest").
 */
export function DrawnCommit({
  label,
  disabled,
  onClick,
}: {
  label: CommitLabel;
  disabled?: boolean;
  onClick: () => void;
}) {
  const { verb, icon, noun } = label;
  return (
    <Lacquer
      aria-label={noun ? `${verb} ${noun}` : undefined}
      className="drawn-commit"
      disabled={disabled}
      onClick={onClick}
    >
      {noun ? (
        <>
          <span>{verb}</span>
          {icon ? <Ico path={icon} size="ui" /> : null}
          <span>{noun}</span>
        </>
      ) : (
        verb
      )}
    </Lacquer>
  );
}
