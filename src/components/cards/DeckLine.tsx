import type { ReactNode } from "react";
import type { DeckLine as DeckLineFacts } from "../../ui/cardFace";
import { Ico, Tip, TipLedger } from "../frame/parts";
import { Tooltip } from "../overlays/Tooltip";

/**
 * The deck a card came out of, on the table between the card and its slip: how many
 * are left, and only what the table can know (`deckLine`). The year deck shows what
 * is left of each kind on the line, since players and bots forecast from it; the
 * fates keep theirs on hover, being forty cards in twelve kinds. `children` ends the
 * line: who drew it, what the draw cost.
 */
export function DeckLine({
  line,
  kinds = "none",
  noun = "left",
  children,
}: {
  line: DeckLineFacts;
  kinds?: "line" | "hover" | "none";
  /** What the count is: "left", "fates left". */
  noun?: string;
  children?: ReactNode;
}) {
  const count = (
    <span>
      <b className="num">{line.left}</b> of {line.total} {noun}
    </span>
  );
  return (
    <div aria-label={line.name} className="deck-line caption" role="group">
      <span aria-hidden="true" className="deck-stack">
        <i />
        <i />
        <i />
      </span>
      {kinds === "hover" ? (
        <Tooltip
          content={
            <Tip title={`${line.name} left`}>
              <TipLedger
                rows={line.kinds.map((kind) => ({
                  key: kind.id,
                  icon: kind.icon,
                  label: kind.name,
                  value: kind.left,
                }))}
              />
            </Tip>
          }
          focusable
          preferredPlacement="above"
          triggerClassName="deck-hover"
        >
          {count}
        </Tooltip>
      ) : (
        count
      )}
      {kinds === "line" ? (
        <>
          <i aria-hidden="true" className="deck-sep" />
          <ul aria-label="Left by kind" className="deck-kinds">
            {line.kinds.map((kind) => (
              <li className={kind.left ? undefined : "is-out"} key={kind.id} title={kind.name}>
                <Ico path={kind.icon} size="chip" />
                <span className="visuallyHidden">{kind.name}</span>
                <span className="num">{kind.left}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {children ? (
        <>
          <i aria-hidden="true" className="deck-sep" />
          {children}
        </>
      ) : null}
    </div>
  );
}
