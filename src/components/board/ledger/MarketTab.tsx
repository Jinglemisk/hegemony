import { TRADABLE_MATERIALS, getBankBuyStatus, getBankSellStatus } from "../../../game/rules";
import type { TradableMaterial } from "../../../game/types";
import { RESOURCE_GLYPHS } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import { MechanicsDetails } from "../../MechanicsDetails";
import { Tooltip } from "../../overlays/Tooltip";
import { useGameUi } from "../GameUiContext";

/**
 * The bank. Rates were fixed from this board at game creation and never move, so
 * the page is a price list you act on rather than a market you watch.
 *
 * The row is `[glyph] [HELD] [SELL] [BUY]`, and the two trade buttons are
 * deliberately unlike each other: SELL is a filled lacquer block, BUY an outline.
 * Two identically-shaped buttons a thumb apart is how you sell the thing you
 * meant to buy, and this page is pressed dozens of times a game.
 *
 * A shortfall — you do not hold enough to sell — mutes SELL and turns the count
 * red. Nothing is hidden; what is unaffordable simply stops inviting the press.
 */
export function MarketTab({
  onBankSell,
  onBankBuy,
}: {
  onBankSell: (material: TradableMaterial) => void;
  onBankBuy: (material: TradableMaterial) => void;
}) {
  const { G, viewerId: playerID, phase, isActive } = useGameUi();
  const gold = G.players[playerID].resources.gold;
  const tradingOpen = isActive && phase === "gameplay";

  return (
    <div className="marketPage">
      <h3 className="pageSection label">The bank&rsquo;s standing rates</h3>

      {TRADABLE_MATERIALS.map((material) => {
        const rate = G.bank[material];
        const held = G.players[playerID].resources[material];
        const sell = getBankSellStatus(G, playerID, material);
        const buy = getBankBuyStatus(G, playerID, material);
        const sellAmount = sell.cost?.[material] ?? rate.sell;
        const buyAmount = buy.cost?.gold ?? rate.buy;
        const canSell = tradingOpen && sell.can;
        const canBuy = tradingOpen && buy.can;
        const short = held < sellAmount;
        // A negative store is not a small store: the row stops saying HELD and
        // says DEFICIT, and BUY — the only move that answers it — is outlined in
        // clay so the page names its own way out.
        const deficit = held < 0;

        return (
          <section
            className={`marketRow${short ? " marketRowShort" : ""}${deficit ? " marketRowDeficit" : ""}`}
            key={material}
          >
            <Icon glyph={RESOURCE_GLYPHS[material]} size="rail" className="marketGlyph" />

            <span className="marketHeld">
              <b className="stat-lg num">{held}</b>
              <small className="label">{deficit ? "deficit" : "held"}</small>
            </span>

            <span className="marketTrade">
              <Tooltip
                content={
                  <MechanicsDetails
                    blockedReason={canSell ? undefined : sell.reasons.join(" ")}
                    heading={`Sell ${material}`}
                  >
                    <p className="mechanicsExplanation">
                      The bank pays 1 gold for {sellAmount} {material}.
                    </p>
                  </MechanicsDetails>
                }
                triggerClassName="marketTradeTrigger"
              >
                <button
                  aria-disabled={!canSell}
                  className="marketSell"
                  onClick={canSell ? () => onBankSell(material) : undefined}
                  type="button"
                >
                  <b className="num">
                    {sellAmount}
                    <Icon glyph={RESOURCE_GLYPHS[material]} />
                  </b>
                  <small className="label">sell</small>
                </button>
              </Tooltip>

              <Tooltip
                content={
                  <MechanicsDetails
                    blockedReason={canBuy ? undefined : buy.reasons.join(" ")}
                    heading={`Buy ${material}`}
                  >
                    <p className="mechanicsExplanation">
                      The bank asks {buyAmount} gold for 1 {material}.
                    </p>
                  </MechanicsDetails>
                }
                triggerClassName="marketTradeTrigger"
              >
                <button
                  aria-disabled={!canBuy}
                  className="marketBuy"
                  onClick={canBuy ? () => onBankBuy(material) : undefined}
                  type="button"
                >
                  <b className="num">
                    {buyAmount}
                    <Icon glyph="gold" />
                  </b>
                  <small className="label">buy</small>
                </button>
              </Tooltip>
            </span>
          </section>
        );
      })}

      <div className="anchorRow">
        <span className="anchorKey label">Treasury</span>
        <span className="treasuryValue stat-lg stat-xl num">
          <Icon glyph="gold" size="rail" />
          {gold}
        </span>
      </div>
    </div>
  );
}
