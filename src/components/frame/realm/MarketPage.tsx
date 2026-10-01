import { TRADABLE_MATERIALS, getBankBuyStatus, getBankSellStatus } from "../../../game/rules";
import type { TradableMaterial } from "../../../game/types";
import { RESOURCE_ICON } from "../../../ui/frameFormat";
import { useGameUi } from "../../board/GameUiContext";
import { Tooltip } from "../../overlays/Tooltip";
import { Ico, Tip } from "../parts";

/** One exchange, give then get: "4 wood › 1 gold". */
function Rate({ give, giveIcon, getIcon }: { give: number; giveIcon: string; getIcon: string }) {
  return (
    <span className="rate">
      {give}
      <Ico path={giveIcon} size="chip" />
      <span className="rate-arr">›</span>1
      <Ico path={getIcon} size="chip" />
    </span>
  );
}

/**
 * Market: the bank's standing rates, one row per good: what you hold, then
 * Sell (filled) and Buy (outlined) side by side, each printed give then get.
 */
export function MarketPage({
  onBankSell,
  onBankBuy,
}: {
  onBankSell: (material: TradableMaterial) => void;
  onBankBuy: (material: TradableMaterial) => void;
}) {
  const { G, viewerId: playerID, phase, isActive } = useGameUi();
  const store = G.players[playerID].resources;
  const open = isActive && phase === "gameplay";

  return (
    <>
      <div className="mk-head">
        <span className="caps">The bank&rsquo;s standing rates</span>
        <span className="treasury">
          <span className="caps">Treasury</span>
          <Ico path={RESOURCE_ICON.gold} size="chip" />
          <b className="num">{store.gold}</b>
        </span>
      </div>
      <div className="mk-rows" data-c="mk-rows">
        {TRADABLE_MATERIALS.map((material) => {
          const held = store[material];
          const sell = getBankSellStatus(G, playerID, material);
          const buy = getBankBuyStatus(G, playerID, material);
          const sellAmount = sell.cost?.[material] ?? G.bank[material].sell;
          const buyAmount = buy.cost?.gold ?? G.bank[material].buy;
          const canSell = open && sell.can;
          const canBuy = open && buy.can;
          const deficit = held < 0;

          return (
            <div className={`mk-row${deficit ? " is-deficit" : ""}`} key={material}>
              <Ico path={RESOURCE_ICON[material]} size="ui" />
              <span className="held">
                <b className="num">{held}</b>
                <span className="caps">{deficit ? "deficit" : "held"}</span>
              </span>
              <Tooltip
                content={
                  <Tip title={`Sell ${material}`}>
                    <p className="tip-body">
                      The bank pays 1 gold for {sellAmount} {material}.
                    </p>
                    {canSell ? null : <p className="tip-body">{sell.reasons.join(" ")}</p>}
                  </Tip>
                }
                triggerClassName="trade-trigger"
              >
                <button
                  aria-disabled={canSell ? undefined : true}
                  aria-label={`Sell ${sellAmount} ${material} for 1 gold.`}
                  className="trade is-sell"
                  onClick={canSell ? () => onBankSell(material) : undefined}
                  type="button"
                >
                  <span className="trade-lbl">
                    <Ico path={`market/sell-${material}`} size="chip" />
                    sell
                  </span>
                  <Rate
                    getIcon={RESOURCE_ICON.gold}
                    give={sellAmount}
                    giveIcon={RESOURCE_ICON[material]}
                  />
                </button>
              </Tooltip>
              <Tooltip
                content={
                  <Tip title={`Buy ${material}`}>
                    <p className="tip-body">
                      The bank asks {buyAmount} gold for 1 {material}.
                    </p>
                    {canBuy ? null : <p className="tip-body">{buy.reasons.join(" ")}</p>}
                  </Tip>
                }
                triggerClassName="trade-trigger"
              >
                <button
                  aria-disabled={canBuy ? undefined : true}
                  aria-label={`Buy 1 ${material} for ${buyAmount} gold.`}
                  className={`trade is-buy${deficit ? " is-answer" : ""}`}
                  onClick={canBuy ? () => onBankBuy(material) : undefined}
                  type="button"
                >
                  <span className="trade-lbl">
                    <Ico path={`market/buy-${material}`} size="chip" />
                    buy
                  </span>
                  <Rate
                    getIcon={RESOURCE_ICON[material]}
                    give={buyAmount}
                    giveIcon={RESOURCE_ICON.gold}
                  />
                </button>
              </Tooltip>
            </div>
          );
        })}
      </div>
    </>
  );
}
