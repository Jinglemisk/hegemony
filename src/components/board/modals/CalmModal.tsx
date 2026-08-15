import { getCivicCalmStatus } from "../../../game/rules";
import type { CivicCalmPayment } from "../../../game/rules";
import { AnnotatedText } from "../../AnnotatedText";
import { formatResourceCost, formatSignedNumber } from "../../../ui/formatters";
import { Icon } from "../../../ui/icons/Icon";
import { ModalShell } from "./ModalShell";
import { useGameUi } from "../GameUiContext";

/**
 * Civic calm (D7): one action per turn, two prices, SAME +happiness.
 *
 * That last word is the whole design of this dialog and it was the one thing the
 * dialog never said. It printed two differently-worded options with two
 * different prices and no outcome at all, which reads as a choice between two
 * effects — when the only question on the table is which currency you would
 * rather spend. So the gain is stated ONCE, above both prices, with what you
 * hold beside it: +3 means one thing at −4 happiness and something else at +6.
 *
 * It is a PICK, not a ceremony — no mood, no ring, no rite — but it belongs to
 * the same family, so it is set on the same bone and its prices are the
 * full-bleed hairlined rows a ceremony's choices wear. And the table behind it
 * goes DARK: it used to wash the board out in light, the one direction that
 * reads as "this app is disabled" rather than "something is happening".
 */
export function CalmModal({ onClose }: { onClose: () => void }) {
  const { G, viewerId: playerID, isActive, moves } = useGameUi();
  const gain = G.ruleset.civicCalm.happiness;
  const held = G.players[playerID].resources.happiness;
  const options: Array<{ payment: CivicCalmPayment; name: string; blurb: string }> = [
    {
      payment: "influence",
      name: "Stabilize Province",
      blurb: "Magistrates and envoys settle the districts.",
    },
    {
      payment: "gold",
      name: "Bread & Circuses",
      blurb: "Games, grain doles, and a very good day.",
    },
  ];

  return (
    <ModalShell
      backdropClassName="calmScrim"
      className="calmSlate"
      labelledBy="calm-title"
      onDismiss={onClose}
    >
      <header className="calmHead">
        <span className="calmKicker label">One calm per turn</span>
        <h2 className="display" id="calm-title">
          Civic Calm
        </h2>
      </header>

      <div className="calmGain">
        <Icon glyph="happiness" size="rail" />
        <span className="calmFigure num stat-lg stat-hero pos">{formatSignedNumber(gain)}</span>
        <span className="calmWhat">
          <b className="title">Happiness</b>
          <span className="caption">
            either price · you hold {held}, so {formatSignedNumber(held + gain)} after
          </span>
        </span>
      </div>

      <div className="calmPrices" role="group" aria-label="Pay with">
        {options.map((option) => {
          const status = getCivicCalmStatus(G, playerID, option.payment);

          return (
            <button
              className="calmPrice"
              disabled={!isActive || !status.can}
              key={option.payment}
              title={status.reasons.join(" ") || undefined}
              onClick={() => {
                moves.civicCalm(option.payment);
                onClose();
              }}
            >
              <strong className="calmPriceCost title">
                <AnnotatedText links={false} text={formatResourceCost(status.cost ?? {})} />
              </strong>
              <span className="calmPriceName label">{option.name}</span>
              <span className="calmPriceVoice caption">{option.blurb}</span>
            </button>
          );
        })}
      </div>

      <footer className="calmFoot">
        <button className="calmCancel verb" onClick={onClose}>
          Cancel
        </button>
      </footer>
    </ModalShell>
  );
}
