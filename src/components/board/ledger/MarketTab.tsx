import { TRADABLE_MATERIALS, getBankBuyStatus, getBankSellStatus } from "../../../game/rules";
import type { TradableMaterial } from "../../../game/types";
import { RESOURCE_GLYPHS } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import type { GlyphId } from "../../../ui/icons/glyphs";
import { MechanicsDetails } from "../../MechanicsDetails";
import { Tooltip } from "../../overlays/Tooltip";
import { useGameUi } from "../GameUiContext";

/**
 * The bank. Rates were fixed from this board at game creation and never move, so
 * the page is a price list you act on rather than a market you watch.
 *
 * **Every trade is printed give → get, in that order, on both sides.** The two
 * buttons used to print a bare numeral each — `4 🌲 SELL` beside `2 🪙 BUY` —
 * which is one number in wood and one in gold, side by side, in the exact shape
 * of a bid/ask pair. It made an 8× round-trip loss look like a two-point spread
 * with the buy side cheaper, and neither button said what you would receive. A
 * rate is a sentence with two halves and both belong on the face of the button.
 *
 * The two trades stack rather than sit side by side: `4 🌲 → 1 🪙` does not fit
 * beside `2 🪙 → 1 🌲` in a 236px page, and stacking also puts the two arrows in
 * a column where the direction reads at a glance. SELL stays a filled lacquer
 * block and BUY an outline — two identically-shaped buttons a thumb apart is how
 * you sell the thing you meant to buy, and this page is pressed dozens of times
 * a game.
 *
 * A shortfall — you do not hold enough to sell — mutes SELL and turns the count
 * red. Nothing is hidden; what is unaffordable simply stops inviting the press.
 */
/** One exchange, in one direction: what leaves your stores, then what arrives. */
function Rate({
  give,
  giveGlyph,
  get,
  getGlyph,
}: {
  give: number;
  giveGlyph: GlyphId;
  get: number;
  getGlyph: GlyphId;
}) {
  return (
    <b className="marketRate num">
      <span className="marketGive">
        {give}
        <Icon glyph={giveGlyph} />
      </span>
      <Icon className="marketArrow" glyph="chevronRight" />
      <span className="marketGet">
        {get}
        <Icon glyph={getGlyph} />
      </span>
    </b>
  );
}

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
                  /* The row's glyph says WHICH material to the eye; to a reader it
                     says nothing, and the rows all announced "3 sell" alike. The
                     label carries the whole exchange in the same order the face
                     prints it, so the two channels cannot drift apart. */
                  aria-label={`Sell ${sellAmount} ${material} for 1 gold.`}
                  className="marketSell"
                  onClick={canSell ? () => onBankSell(material) : undefined}
                  type="button"
                >
                  <small className="label">sell</small>
                  <Rate
                    give={sellAmount}
                    giveGlyph={RESOURCE_GLYPHS[material]}
                    get={1}
                    getGlyph="gold"
                  />
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
                  aria-label={`Buy 1 ${material} for ${buyAmount} gold.`}
                  className="marketBuy"
                  onClick={canBuy ? () => onBankBuy(material) : undefined}
                  type="button"
                >
                  <small className="label">buy</small>
                  <Rate
                    give={buyAmount}
                    giveGlyph="gold"
                    get={1}
                    getGlyph={RESOURCE_GLYPHS[material]}
                  />
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
