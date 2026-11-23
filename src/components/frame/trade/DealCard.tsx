import { useId } from "react";
import {
  dealIncomeLines,
  dealsAwaitingAnswer,
  describeAmounts,
  partnerIn,
} from "../../../game/deals";
import { getDealEndStatus } from "../../../game/trade";
import type { Deal } from "../../../game/types";
import { RESOURCE_RASTERS } from "../../../ui/iconRegistry";
import { toRoman } from "../../../ui/formatters";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { ActionButton } from "../../ActionButton";
import { useGameUi } from "../../board/GameUiContext";
import { SeatCoin } from "../../chrome/SeatCoin";
import { previewSpend } from "../../../ui/confirmPreview";
import { Delta, Ico } from "../parts";
import { dealTitle, loanWords } from "./tradeView";

/**
 * A standing deal, from one of its seats (docs/plans/trade-deals.md): what each side
 * hands over every year, the goods lent, and what the seat's next income takes from it.
 * A partner's short payment asks here, keep or cancel; End runs the deal out with the
 * year. Every "can I?" is the engine's.
 */

export function DealCard({
  deal,
  onClose,
  onAnswered,
}: {
  deal: Deal;
  onClose: () => void;
  /** After Keep or Cancel: the answer's buttons are gone, so the focus moves on. */
  onAnswered?: () => void;
}) {
  const { G, moves, viewerId } = useGameUi();
  const askId = useId();
  const seat = viewerId;
  const partner = partnerIn(deal, seat);
  const name = G.players[partner].name;
  const glaze = PLAYER_GLAZES[partner];
  const asking = dealsAwaitingAnswer(G, seat).some((waiting) => waiting.id === deal.id);
  const short = deal.short[partner];
  const end = getDealEndStatus(G, seat, deal.id);
  const income = dealIncomeLines(G, seat).filter((line) => line.dealId === deal.id);
  // Keeping a short-paid deal settles it now: the engine plays it on a copy.
  const keep =
    asking && short
      ? previewSpend(G, seat, { command: { type: "dealShortfall", dealId: deal.id, keep: true } })
          .changes
      : [];
  const give = deal.yearly[seat];
  const get = deal.yearly[partner];

  return (
    <section
      aria-label={dealTitle(G, deal, seat)}
      className="trade-card is-deal deal-card"
      data-deal-card={deal.id}
    >
      <header className="trade-head">
        <SeatCoin className="trade-coin" seat={glaze.id} size={32} title={glaze.name} />
        <span className="trade-words">
          <span className="kicker">Standing deal</span>
          <span className="name trade-title">{dealTitle(G, deal, seat)}</span>
          <span className="caption trade-caption">
            {deal.endsYear !== null
              ? "Ending: it runs out with this year."
              : `Made in Year ${toRoman(deal.madeYear)}. Settles once a year, at each seat's own income.`}
          </span>
        </span>
        <button aria-label="Close" className="name trade-x" onClick={onClose} type="button">
          ×
        </button>
      </header>

      <div className="trade-body">
        <dl className="deal-terms">
          {give ? (
            <>
              <dt className="caps">You give every year</dt>
              <dd className="body body-sm">{describeAmounts(give)}</dd>
            </>
          ) : null}
          {get ? (
            <>
              <dt className="caps">You get every year</dt>
              <dd className="body body-sm">{describeAmounts(get)}</dd>
            </>
          ) : null}
          {deal.loans.length ? (
            <>
              <dt className="caps">On loan</dt>
              {deal.loans.map((loan) => (
                <dd className="body body-sm" key={loan.assetId}>
                  {loanWords(G, loan, seat)}
                </dd>
              ))}
            </>
          ) : null}
          <dt className="caps">Your next income</dt>
          <dd className="body body-sm deal-income">
            {income.length
              ? income.map((line) => (
                  <span className="trade-delta" key={`${line.resource}${line.amount}`}>
                    <Ico path={RESOURCE_RASTERS[line.resource]} size="chip" />
                    <b className={`stat num ${line.amount > 0 ? "is-up" : "is-down"}`}>
                      {line.amount > 0 ? `+${line.amount}` : `−${-line.amount}`}
                    </b>
                  </span>
                ))
              : "Nothing: this year is settled."}
          </dd>
        </dl>

        {asking && short ? (
          <div className="deal-ask" id={askId}>
            <p className="body">
              <b>
                {name} could pay only {describeAmounts(short.paid)} of {describeAmounts(short.owed)}
                .
              </b>{" "}
              Keep the deal and you take what {name} paid and pay your side in full. Cancel and it
              ends now, with nothing more moving.
            </p>
            {keep.length ? (
              <p className="body body-sm trade-after" aria-label="If you keep it, you would hold">
                <span className="caption trade-lead">If you keep it, you would hold</span>
                {keep.map((change) => (
                  <span className="trade-delta" key={change.label}>
                    {change.label}{" "}
                    <Delta format={change.format} from={change.from} to={change.to} />
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* The foot never scrolls: the short payment's answer takes End deal's place. */}
      {asking && short ? (
        <footer
          aria-describedby={askId}
          aria-label={`${name} paid short`}
          className="trade-foot deal-ask-acts"
          role="group"
        >
          <button
            className="btn kicker"
            onClick={() => {
              moves.dealShortfall(seat, deal.id, false);
              onAnswered?.();
            }}
            type="button"
          >
            Cancel deal
          </button>
          <button
            className="btn kicker is-primary"
            onClick={() => {
              moves.dealShortfall(seat, deal.id, true);
              onAnswered?.();
            }}
            type="button"
          >
            Keep deal
          </button>
        </footer>
      ) : deal.endsYear === null ? (
        <footer className="trade-foot">
          <span className="caption trade-caption">
            Ending lets this year run out: whoever has not settled still does.
          </span>
          <span className="trade-grow" />
          <ActionButton
            blockedReason={end.reasons.join(" ")}
            className="btn kicker"
            enabled={end.can}
            heading="End deal"
            onClick={() => moves.dealEnd(seat, deal.id)}
          >
            End deal
          </ActionButton>
        </footer>
      ) : null}
    </section>
  );
}
