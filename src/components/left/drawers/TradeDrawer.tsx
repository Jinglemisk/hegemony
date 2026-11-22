import { useState } from "react";
import { dealsAwaitingAnswer, dealsOf, partnerIn } from "../../../game/deals";
import { luxuryName } from "../../../game/rules";
import { offerWindowReason } from "../../../game/trade";
import type { LuxuryGoodId } from "../../../game/types";
import { LUXURY_GOOD_RASTERS } from "../../../ui/iconRegistry";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { settlementNames } from "../../../ui/settlementNames";
import { useGameUi } from "../../board/GameUiContext";
import { Band } from "../../chrome/Panel";
import { Plaque } from "../../chrome/controls";
import { SeatCoin } from "../../chrome/SeatCoin";
import { Ico } from "../../frame/parts";
import { DealCard } from "../../frame/trade/DealCard";
import { OfferCard } from "../../frame/trade/OfferCard";
import { bundleWords, dealTitle, dealWords, offerTitle } from "../../frame/trade/tradeView";
import { Popover } from "../../overlays/Popover";
import { Tooltip } from "../../overlays/Tooltip";
import { Tip, TipBody } from "../../frame/parts";
import { Row, Tile } from "../atoms";
import type { DrawerProps } from "../Drawer";
import { composeAnchor, titleCase } from "../words";

/**
 * Trade: the open offers first (each opens its card), the way to offer one, the
 * luxury goods and who holds each (a good picks its mooring), and the standing
 * deals (each opens its deal card).
 */
export function TradeDrawer({ onPick, actions }: DrawerProps) {
  const { G, viewerId, turnBlocked } = useGameUi();
  const [card, setCard] = useState<{ kind: "offer" | "deal"; id: string; at: DOMRect } | null>(
    null,
  );
  const names = settlementNames(G.board.tiles);
  // An offer still waiting on the viewer's answer comes first.
  const waiting = (offer: (typeof G.offers)[number]) =>
    offer.to.includes(viewerId) && !offer.answers[viewerId] ? 0 : 1;
  const offers = [...G.offers].sort((a, b) => waiting(a) - waiting(b));
  const deals = dealsOf(G, viewerId);
  const asking = dealsAwaitingAnswer(G, viewerId);
  const closed = turnBlocked ?? offerWindowReason(G, viewerId);
  const openOffer = card?.kind === "offer" ? G.offers.find((o) => o.id === card.id) : undefined;
  const openDeal = card?.kind === "deal" ? deals.find((d) => d.id === card.id) : undefined;

  return (
    <>
      <Band end={offers.length || "none"} label="Offers" />
      {offers.length === 0 ? (
        <p className="lw-none">
          <Ico path="market/handshake" size="ui" />
          No offers open
        </p>
      ) : (
        <div className="lw-rows">
          {offers.map((offer) => {
            const title = offerTitle(G, offer);
            const terms = `${G.players[offer.from].name} gives ${bundleWords(G, offer.terms.give)} and gets ${bundleWords(G, offer.terms.get)}.`;
            return (
              <Row
                ariaLabel={`${title}. ${terms}`}
                key={offer.id}
                onClick={(event) =>
                  setCard({
                    kind: "offer",
                    id: offer.id,
                    at: event.currentTarget.getBoundingClientRect(),
                  })
                }
                tip={{ key: `o-${offer.id}`, title, line: terms }}
                tone={waiting(offer) === 0 ? "warn" : undefined}
              >
                <SeatCoin seat={offer.from} size={32} />
                <span className="lw-row-a">
                  <b className="lw-row-name">{title}</b>
                </span>
                <span className="lw-row-b">
                  <span className="lw-row-next">{terms}</span>
                </span>
              </Row>
            );
          })}
        </div>
      )}
      <div className="lw-center">
        <Tooltip
          content={
            <Tip title="Offer a trade">
              <TipBody>{closed ?? "Offer goods to the table or to chosen seats."}</TipBody>
            </Tip>
          }
        >
          <Plaque
            disabled={closed !== null}
            onClick={() => actions.onCompose(null, composeAnchor())}
          >
            <Ico path="market/handshake" size="ui" />
            Offer a trade
          </Plaque>
        </Tooltip>
      </div>
      <Band end={G.board.luxuries.length} label="Luxury goods" />
      <div className="lw-tiles">
        {G.board.luxuries.map((asset) => {
          const name = luxuryName(G, asset);
          const shore = asset.tileIds
            .map((id) => G.board.tiles.find((tile) => tile.id === id)?.settlements[0])
            .flatMap((settlement) =>
              settlement ? [titleCase(names.get(settlement.id) ?? "")] : [],
            );
          const where = shore.length ? ` by ${shore.join(" or ")}` : "";
          return (
            <Tile
              ariaLabel={`${name}, ${asset.owner ? `held by ${PLAYER_GLAZES[asset.owner].name}` : "free"}`}
              icon={LUXURY_GOOD_RASTERS[asset.goodId as LuxuryGoodId] ?? "resources/luxury"}
              key={asset.id}
              label={name}
              onClick={() => onPick({ kind: "mooring", vertexId: asset.vertexId })}
              tip={{
                key: `g-${asset.id}`,
                title: name,
                line: asset.owner
                  ? `${PLAYER_GLAZES[asset.owner].name}'s, moored${where}.`
                  : `Free: a Port beside it claims it${where ? `, moored${where}` : ""}.`,
              }}
            >
              {asset.owner ? (
                <SeatCoin className="lw-tile-coin" seat={asset.owner} size={20} />
              ) : (
                <span className="lw-tile-k is-free">Free</span>
              )}
            </Tile>
          );
        })}
      </div>
      <Band end={deals.length || "none"} label="Standing deals" />
      {deals.length === 0 ? (
        <p className="lw-none">
          <Ico path="events/year" size="ui" />
          None standing
        </p>
      ) : (
        <div className="lw-rows">
          {deals.map((deal) => {
            const title = dealTitle(G, deal, viewerId);
            const words = dealWords(G, deal, viewerId);
            const short = asking.includes(deal);
            return (
              <Row
                ariaLabel={`${title}. ${words}.${short ? " A short payment waits on your answer." : ""}`}
                key={deal.id}
                onClick={(event) =>
                  setCard({
                    kind: "deal",
                    id: deal.id,
                    at: event.currentTarget.getBoundingClientRect(),
                  })
                }
                tip={{ key: `d-${deal.id}`, title, line: `${words}.` }}
                tone={short ? "warn" : undefined}
              >
                <SeatCoin seat={partnerIn(deal, viewerId)} size={32} />
                <span className="lw-row-a">
                  <b className="lw-row-name">{title}</b>
                  <span className="lw-row-n">
                    {short ? "Answer" : deal.endsYear !== null ? "Ending" : "Open"}
                  </span>
                </span>
                <span className="lw-row-b">
                  <span className="lw-row-next">{words}</span>
                </span>
              </Row>
            );
          })}
        </div>
      )}
      {card && (openOffer || openDeal) ? (
        <Popover
          align="start"
          anchor={card.at}
          ariaLabel={openOffer ? offerTitle(G, openOffer) : dealTitle(G, openDeal!, viewerId)}
          className="trade-pop"
          dismissOnOutside
          measureKey={openOffer ?? openDeal}
          onDismiss={() => setCard(null)}
        >
          {openOffer ? (
            <OfferCard offer={openOffer} onClose={() => setCard(null)} />
          ) : (
            <DealCard deal={openDeal!} onClose={() => setCard(null)} />
          )}
        </Popover>
      ) : null}
    </>
  );
}
