import type { ReactNode, Ref } from "react";
import type { CardFace } from "../../../ui/cardFace";
import { GameCard } from "../../cards/GameCard";
import { Lacquer } from "../../chrome/controls";
import { Delta, Ico, Tip, TipBody } from "../../frame/parts";
import { Tooltip } from "../../overlays/Tooltip";
import type { LossLine } from "./lossLines";
import { ModalShell } from "./ModalShell";

/** The head's title, which names the sheet until a card names it instead. */
const SHEET_TITLE_ID = "loss-sheet-title";

/**
 * The sheet a riot and a revolt are read on: the glaze head, a body of one fixed size
 * whatever stage it shows, and the foot with its note and the one act. It keeps its size
 * from the first stage to the last and at every text size; what does not fit scrolls in
 * the body. Blocking: the seat leaves through its own act.
 */
export function LossSheet({
  kicker,
  title,
  voice,
  icon,
  labelledBy = SHEET_TITLE_ID,
  note,
  act,
  children,
}: {
  kicker: string;
  title: string;
  voice?: ReactNode;
  icon: string;
  /** The heading that names the dialog: the head's, or the result card's name. */
  labelledBy?: string;
  note?: ReactNode;
  act?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ModalShell
      backdropClassName="eventModalBackdrop"
      ceremony="wound"
      className="riotSheet"
      labelledBy={labelledBy}
    >
      <header className="sheetHead">
        <Ico path={icon} size="disc" />
        <div className="sheetTitle">
          <span className="label">{kicker}</span>
          <h2 className="display" id={SHEET_TITLE_ID}>
            {title}
          </h2>
          {voice ? <p className="body-em">{voice}</p> : null}
        </div>
      </header>
      <div className="sheetBody">{children}</div>
      <footer className="sheetFoot">
        <span className="sheetNote caption">{note}</span>
        {act}
      </footer>
    </ModalShell>
  );
}

/**
 * What a loss cost, as a drawn card is read: the card in the shared format, and beside
 * it one line for each thing it took, before and after. A choice the loss still asks
 * (`children`) sits under the lines.
 */
export function LossSpread({
  face,
  titleId,
  lines,
  children,
}: {
  face: CardFace;
  titleId: string;
  lines: LossLine[];
  children?: ReactNode;
}) {
  return (
    <div className="lossSpread">
      <GameCard arrive="deal" face={face} size="ceremony" titleId={titleId} />
      <div className="lossSlip">
        <span className="sheetSec label">What it took</span>
        <LossList lines={lines} />
        {children}
      </div>
    </div>
  );
}

/** The commit that closes a loss: as wide as its words. */
export function SoBeIt({
  onClick,
  next,
  ref,
}: {
  onClick: () => void;
  /** Where play goes once it closes, for the tooltip. */
  next: string;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <Tooltip
      content={
        <Tip title="So be it">
          <TipBody>{`Close the card. ${next}.`}</TipBody>
        </Tip>
      }
      preferredPlacement="above"
    >
      <Lacquer className="sheetAct" onClick={onClick} ref={ref}>
        So be it
      </Lacquer>
    </Tooltip>
  );
}

/** The lines, one thing each, the change at the end of its line. */
function LossList({ lines }: { lines: readonly LossLine[] }) {
  return (
    <ul className="lossLines">
      {lines.map((line) => (
        <li className={line.muted ? "body is-muted" : "body"} key={line.key}>
          <Ico path={line.icon} size="ui" />
          <span className="lossWords">{line.text}</span>
          {line.change ? (
            <Delta
              from={line.change.from}
              higherIsBetter={line.change.higherIsBetter}
              to={line.change.to}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
