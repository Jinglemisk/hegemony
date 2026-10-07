import type { CSSProperties } from "react";
import type { PlayerId } from "../../game/types";
import { toRoman } from "../../ui/formatters";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";
import { ModalShell } from "../board/modals/ModalShell";

/**
 * The turn notice: a small card over the table naming whose turn, or whose Assembly
 * proposal, comes next. The screen stays with the last seat until Begin, so what is
 * meant for the next seat alone (its fate card, its Assembly draw) waits behind the
 * card. It can be turned off in Settings; the screen then follows the turn at once.
 */
export function TurnNotice({
  seat,
  year,
  totalYears,
  proposal,
  onBegin,
}: {
  seat: PlayerId;
  year: number;
  totalYears: number;
  /** The Assembly proposal rather than a turn. */
  proposal: boolean;
  onBegin: () => void;
}) {
  const glaze = PLAYER_GLAZES[seat];

  return (
    <ModalShell
      backdropClassName="turn-scrim"
      className="turn-notice"
      labelledBy="turn-notice-title"
      onDismiss={onBegin}
    >
      <span
        className={`turn-disc${seat === "1" ? " ink-dark" : ""}`}
        style={{ "--owner": glaze.color } as CSSProperties}
      >
        {glaze.blazon}
      </span>
      <span className="turn-kicker">
        {proposal ? "The Assembly · " : ""}Year {toRoman(year)} of {toRoman(totalYears)}
      </span>
      <h2 className="turn-title" id="turn-notice-title">
        {glaze.name}’s {proposal ? "proposal" : "turn"}
      </h2>
      <button className="confirm-btn is-primary" onClick={onBegin} type="button">
        Begin
      </button>
    </ModalShell>
  );
}
