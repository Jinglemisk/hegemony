import type { CSSProperties } from "react";
import type { PlayerId } from "../../game/types";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";

/**
 * Passing the seat: one full-screen cover in the next seat's glaze, between two
 * people at one screen. It stands in for the whole frame, so nothing of the last
 * seat shows behind it. Shown before a seat's turn and before its Assembly proposal,
 * never before a public moment and never against bots.
 */
export function PassSeat({
  seat,
  previous,
  proposal,
  onReady,
}: {
  seat: PlayerId;
  previous: PlayerId;
  /** The Assembly proposal rather than a turn. */
  proposal: boolean;
  onReady: () => void;
}) {
  const glaze = PLAYER_GLAZES[seat];
  const last = previous === seat ? "the last seat" : `${PLAYER_GLAZES[previous].name}'s seat`;

  return (
    <section
      aria-labelledby="pass-title"
      aria-modal="true"
      className="pass-seat"
      data-c="pass-seat"
      role="dialog"
      style={{ "--owner": glaze.color } as CSSProperties}
    >
      <span className={`pass-disc${seat === "1" ? " ink-dark" : ""}`}>{glaze.blazon}</span>
      <h1 className="pass-name" id="pass-title">
        {glaze.name}’s seat
      </h1>
      <p className="pass-body">
        Hand the screen to {glaze.name}.{" "}
        {proposal ? "The Assembly proposal is secret" : `${glaze.name}’s turn is next`}: nothing of{" "}
        {last} shows until {glaze.name} is ready.
      </p>
      <button autoFocus className="pass-ready" onClick={onReady} type="button">
        I am {glaze.name} · show my seat
      </button>
    </section>
  );
}
