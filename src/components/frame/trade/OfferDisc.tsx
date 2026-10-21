import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { TradeOffer } from "../../../game/types";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { useGameUi } from "../../board/GameUiContext";
import { Popover } from "../../overlays/Popover";
import { Tooltip } from "../../overlays/Tooltip";
import { Ico, Tip } from "../parts";
import { OfferCard } from "./OfferCard";
import { MARK_GLYPH, answerMark, bundleWords, offerTitle } from "./tradeView";

/** Degrees left blank between two seats' segments of the ring. */
const SEGMENT_GAP = 8;

/**
 * An open offer on the alarms row: a ring in the offering seat's glaze with one
 * segment per seat that may answer, filled as each answers. Hotseat has no clock, so
 * nothing drains and nothing shakes. The badge is the offering seat's; the mark, top
 * left, is how the viewer answered. Hover reads the offer; a click opens its card.
 */
export function OfferDisc({ offer }: { offer: TradeOffer }) {
  const { G, viewerId } = useGameUi();
  const [open, setOpen] = useState(false);
  const disc = useRef<HTMLButtonElement>(null);
  const glaze = PLAYER_GLAZES[offer.from];
  const answered = offer.to.filter((seat) => offer.answers[seat]).length;
  const segment = 360 / offer.to.length;
  const gap = offer.to.length > 1 ? SEGMENT_GAP / 2 : 0;
  const ring = `conic-gradient(${offer.to
    .map((seat, i) => {
      const a = i * segment;
      const b = (i + 1) * segment;
      const fill = offer.answers[seat] ? glaze.color : "var(--ink-12)";
      return `transparent ${a}deg ${a + gap}deg, ${fill} ${a + gap}deg ${b - gap}deg, transparent ${b - gap}deg ${b}deg`;
    })
    .join(", ")})`;
  const mine = offer.to.includes(viewerId) && offer.answers[viewerId];
  const title = offerTitle(G, offer);
  const owner = G.players[offer.from].name;
  const terms = `${owner} gives ${bundleWords(G, offer.terms.give)} and gets ${bundleWords(G, offer.terms.get)}.`;
  const sub = `${answered} of ${offer.to.length} answered`;

  return (
    <li className="offer-alarm">
      <Tooltip
        content={
          <Tip sub={sub} title={title}>
            <p className="tip-body">{terms}</p>
            <p className="tip-act">
              {answered < offer.to.length ? "Click to answer" : "Click to settle or withdraw"}
            </p>
          </Tip>
        }
      >
        <button
          aria-expanded={open}
          aria-label={`${title}, ${sub}. ${terms}`}
          className="alarm-disc offer-disc"
          data-c="offer-disc"
          onClick={() => setOpen((value) => !value)}
          ref={disc}
          style={{ "--owner": glaze.color, "--ring": ring } as CSSProperties}
          type="button"
        >
          <span aria-hidden="true" className="offer-ring" />
          <Ico path="market/handshake" size="ui" />
          <span
            aria-hidden="true"
            className={`name offer-badge${glaze.inkDark ? " ink-dark" : ""}`}
          >
            {glaze.blazon}
          </span>
          {mine ? (
            <span aria-hidden="true" className="name offer-mark">
              {MARK_GLYPH[answerMark(G, offer, viewerId)]}
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
          measureKey={offer}
          onDismiss={() => setOpen(false)}
        >
          <OfferCard offer={offer} onClose={() => setOpen(false)} />
        </Popover>
      ) : null}
    </li>
  );
}
