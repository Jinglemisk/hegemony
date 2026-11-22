import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { partnerIn } from "../../../game/deals";
import type { Deal } from "../../../game/types";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { useGameUi } from "../../board/GameUiContext";
import { Popover } from "../../overlays/Popover";
import { Tooltip } from "../../overlays/Tooltip";
import { Ico, Tip, TipBody } from "../parts";
import { DealCard } from "./DealCard";
import { dealTitle, dealWords } from "./tradeView";

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

  return (
    <li className="offer-alarm">
      <Tooltip
        content={
          <Tip title={title}>
            <TipBody>{words}.</TipBody>
            {deal.endsYear !== null ? <TipBody>Runs out with this year.</TipBody> : null}
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
          onClick={() => setOpen((value) => !value)}
          ref={disc}
          style={{ "--owner": glaze.color } as CSSProperties}
          type="button"
        >
          <span aria-hidden="true" className="deal-ring" />
          <Ico path="market/handshake" size="ui" />
          <span aria-hidden="true" className="name offer-badge">
            {glaze.blazon}
          </span>
          {asking ? (
            <span aria-hidden="true" className="name offer-mark">
              !
            </span>
          ) : null}
        </button>
      </Tooltip>
      {open ? (
        <Popover
          align="start"
          anchor={disc}
          ariaLabel={title}
          className="trade-pop"
          dismissOnOutside
          measureKey={deal}
          onDismiss={() => setOpen(false)}
        >
          <DealCard deal={deal} onClose={() => setOpen(false)} />
        </Popover>
      ) : null}
    </li>
  );
}
