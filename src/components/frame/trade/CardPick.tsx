import { useState } from "react";
import type { CSSProperties } from "react";
import { devCardOf } from "../../../game/devCards";
import type { PlayerId } from "../../../game/types";
import { devCardFace } from "../../../ui/cardFace";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { GameCard } from "../../cards/GameCard";
import { useGameUi } from "../../board/GameUiContext";
import { ModalShell } from "../../board/modals/ModalShell";

/**
 * The giver's pick of the held cards a trade hands over (docs/plans/development-deck.md):
 * an offer names how many, never which. Only the giver sees its hand. In hotseat a seat
 * that is not the one looking picks behind a handover, the turn notice's "pass the
 * screen", and the screen comes back to the seat that was looking once it has picked.
 */
export function CardPick({
  seat,
  count,
  partner,
  onReveal,
  onPick,
  onCancel,
}: {
  seat: PlayerId;
  count: number;
  partner: PlayerId | null;
  /** Hand the screen to `seat`, so its hand shows. */
  onReveal: () => void;
  onPick: (cards: string[]) => void;
  onCancel: () => void;
}) {
  const { G, viewerId } = useGameUi();
  const [picked, setPicked] = useState<string[]>([]);
  const glaze = PLAYER_GLAZES[seat];
  const name = G.players[seat].name;
  const what = count === 1 ? "a card" : `${count} cards`;
  const to = partner ? ` to ${G.players[partner].name}` : "";

  if (viewerId !== seat) {
    return (
      <ModalShell
        backdropClassName="modal-scrim turn-scrim"
        className="modal-card turn-notice"
        labelledBy="card-pick-title"
        onDismiss={onCancel}
      >
        <span className="turn-disc" style={{ "--owner": glaze.color } as CSSProperties}>
          {glaze.blazon}
        </span>
        <span className="kicker">Pass the screen</span>
        <h2 className="name turn-title" id="card-pick-title">
          {name} chooses {what}
        </h2>
        <p className="body">The others look away.</p>
        <button className="btn kicker confirm-btn is-primary" onClick={onReveal} type="button">
          Show the hand
        </button>
      </ModalShell>
    );
  }

  const hand = G.devHands[seat];
  const toggle = (id: string) =>
    setPicked((current) =>
      current.includes(id)
        ? current.filter((other) => other !== id)
        : current.length < count
          ? [...current, id]
          : current,
    );

  return (
    <ModalShell
      backdropClassName="eventModalBackdrop drawnScrim"
      ceremony="rite"
      className="drawnReveal handReveal"
      label={`Choose ${what} to give`}
      onDismiss={onCancel}
    >
      <div className="hand-row" role="group" aria-label="Your cards">
        {hand.map((entry) => {
          const face = devCardOf(G, entry.id);
          if (!face) return null;
          const on = picked.includes(entry.id);
          return (
            <button
              aria-pressed={on}
              className="hand-card"
              key={entry.id}
              onClick={() => toggle(entry.id)}
              title={face.text}
              type="button"
            >
              <GameCard
                className={on ? "is-picked" : undefined}
                face={devCardFace(face)}
                size="hand"
              />
            </button>
          );
        })}
      </div>
      <div className="drawn-tray">
        <div className="drawn-slip">
          <p className="body">
            Choose {what} to give{to}. Only you and{" "}
            {partner ? G.players[partner].name : "the seat you trade with"} see which.
          </p>
        </div>
        <button
          className="ceremonyCommit verb verb-lg"
          disabled={picked.length !== count}
          onClick={() => onPick(picked)}
          type="button"
        >
          Give {picked.length === count ? what : `${picked.length} of ${count}`}
        </button>
      </div>
    </ModalShell>
  );
}
