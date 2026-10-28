import type { CSSProperties } from "react";
import type { PlayerId } from "../../game/types";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";
import { ModalShell } from "../board/modals/ModalShell";

/**
 * The turn notice in hotseat: a small card over the table telling the players to pass
 * the screen, and to whom, before a turn or an Assembly proposal. The screen stays
 * with the last seat until Begin, so what is meant for the next seat alone (its fate
 * card, its Assembly draw) waits behind the card.
 *
 * Hotseat is the only way people play today. A networked game will give this notice
 * its own wording ("It's Nikos's turn") and never the pass-the-screen line.
 */
export function TurnNotice({
  seat,
  proposal,
  onBegin,
}: {
  seat: PlayerId;
  /** The Assembly proposal rather than a turn. */
  proposal: boolean;
  onBegin: () => void;
}) {
  const glaze = PLAYER_GLAZES[seat];

  return (
    <ModalShell
      backdropClassName="modal-scrim turn-scrim"
      className="modal-card turn-notice"
      labelledBy="turn-notice-title"
      onDismiss={onBegin}
    >
      <span className="turn-disc" style={{ "--owner": glaze.color } as CSSProperties}>
        {glaze.blazon}
      </span>
      <span className="kicker">Pass the screen</span>
      <h2 className="name turn-title" id="turn-notice-title">
        {glaze.name}’s {proposal ? "proposal" : "turn"}
      </h2>
      <button className="btn kicker confirm-btn is-primary" onClick={onBegin} type="button">
        Begin
      </button>
    </ModalShell>
  );
}
