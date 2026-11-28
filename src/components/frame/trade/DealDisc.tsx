import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { isClosedDeal, partnerIn } from "../../../game/deals";
import type { Deal } from "../../../game/types";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { useGameUi } from "../../board/GameUiContext";
import { SeatCoin } from "../../chrome/SeatCoin";
import { focusSoon } from "../../overlays/focus";
import { Popover } from "../../overlays/Popover";
import { Tooltip } from "../../overlays/Tooltip";
import { Ico, Tip, TipBody } from "../parts";
import { DealCard } from "./DealCard";
import { dealTitle, dealWords } from "./tradeView";

/** The focus fell to the page: what had it was taken away. */
const isLost = () => !document.activeElement || document.activeElement === document.body;

/**
 * One of the viewer's standing deals on the alarms row: a full ring in the partner's
 * glaze, its badge on the rim. Loud while the partner's short payment waits on the
 * viewer's answer; then it opens on its own, and again each time End turn is pressed.
 */
export function DealDisc({ deal, asking, ask }: { deal: Deal; asking: boolean; ask: number }) {
  const { G, viewerId } = useGameUi();
  const [open, setOpen] = useState(asking);
  const disc = useRef<HTMLButtonElement>(null);
  const partner = partnerIn(deal, viewerId);
  const glaze = PLAYER_GLAZES[partner];
  const title = dealTitle(G, deal, viewerId);
  const words = dealWords(G, deal, viewerId);

  useEffect(() => {
    if (asking && ask > 0) setOpen(true);
  }, [asking, ask]);

  // Opened on its own, the card had no control to hand the focus back to: its disc takes it.
  const close = () => {
    setOpen(false);
    focusSoon(() => (isLost() ? disc.current : null));
  };
  // Keep or Cancel took their buttons away: the card's next control, else its disc, else
  // (the deal cancelled, its disc gone) the alarms row's first disc.
  const answered = () =>
    focusSoon(() => {
      const card = `[data-deal-card="${deal.id}"]`;
      return (
        document.querySelector<HTMLElement>(`${card} .trade-foot button`) ??
        document.querySelector<HTMLElement>(`${card} .trade-x`) ??
        disc.current ??
        document.querySelector<HTMLElement>(".alarm-disc")
      );
    });

  return (
    <li className="offer-alarm">
      <Tooltip
        content={
          <Tip title={title}>
            <TipBody>{words}.</TipBody>
            {deal.endsYear !== null && !isClosedDeal(deal) ? (
              <TipBody>Runs out with this year.</TipBody>
            ) : null}
            <p className="tip-act">
              {asking ? "Click to answer a short payment" : "Click to see or end it"}
            </p>
          </Tip>
        }
      >
        <button
          aria-expanded={open}
          aria-label={`${title}. ${words}.${asking ? " A short payment waits on your answer." : ""}`}
          className={`alarm-disc deal-disc${asking ? " is-loud" : ""}${deal.endsYear !== null ? " is-ending" : ""}`}
          data-c="deal-disc"
          data-deal={deal.id}
          onClick={() => setOpen((value) => !value)}
          ref={disc}
          style={{ "--owner": glaze.color } as CSSProperties}
          type="button"
        >
          <span aria-hidden="true" className="deal-ring" />
          <Ico path="market/handshake" size="tile" />
          <SeatCoin aria-hidden="true" className="offer-badge" seat={partner} />
          {asking ? (
            <span aria-hidden="true" className="name offer-mark">
              !
            </span>
          ) : null}
        </button>
      </Tooltip>
      {open ? (
        <Popover
          anchor={disc}
          ariaLabel={title}
          className="trade-pop alarm-card"
          dismissOnOutside
          onDismiss={close}
          slot
        >
          <DealCard deal={deal} onAnswered={answered} onClose={close} />
        </Popover>
      ) : null}
    </li>
  );
}
