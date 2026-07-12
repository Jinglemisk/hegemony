import type { GameMoves } from "../../../game/controller";
import { getCivicCalmStatus } from "../../../game/rules";
import type { CivicCalmPayment } from "../../../game/rules";
import type { HegemonyState, PlayerId } from "../../../game/types";

/**
 * Civic calm (D7): one action per turn, two prices, same +happiness. A single
 * `civicCalm` seam in the engine — this modal is just the payment picker.
 */
export function CalmModal({
  G,
  playerID,
  isActive,
  moves,
  onClose
}: {
  G: HegemonyState;
  playerID: PlayerId;
  isActive: boolean;
  moves: GameMoves;
  onClose: () => void;
}) {
  const rules = G.ruleset.civicCalm;
  const options: Array<{ payment: CivicCalmPayment; name: string; price: string; blurb: string }> = [
    {
      payment: "influence",
      name: "Stabilize Province",
      price: `${rules.influenceCost} influence`,
      blurb: "Magistrates and envoys settle the districts."
    },
    {
      payment: "gold",
      name: "Bread & Circuses",
      price: `${rules.goldCost} gold`,
      blurb: "Games, grain doles, and a very good day."
    }
  ];

  return (
    <div className="modalBackdrop eventModalBackdrop" role="presentation">
      <section className="eventTableModal calmModal" role="dialog" aria-modal="true" aria-labelledby="calm-title">
        <header className="eventTableHeader">
          <h2 id="calm-title">Civic Calm</h2>
          <p>+{rules.happiness} happiness, once per turn — calm never stacks.</p>
        </header>

        <div className="eventChoiceStack" role="group" aria-label="Payment">
          {options.map((option) => {
            const status = getCivicCalmStatus(G, playerID, option.payment);

            return (
              <button
                className="eventChoiceButton"
                disabled={!isActive || !status.can}
                key={option.payment}
                title={status.reasons.join(" ") || undefined}
                onClick={() => {
                  moves.civicCalm(option.payment);
                  onClose();
                }}
              >
                <strong>
                  {option.name} — {option.price}
                </strong>
                <span>{option.blurb}</span>
              </button>
            );
          })}
        </div>

        <footer className="eventTableFooter">
          <button className="ghostButton" onClick={onClose}>
            Cancel
          </button>
        </footer>
      </section>
    </div>
  );
}
