import type { Phase } from "../../../game/controller";
import { TRADABLE_MATERIALS, getBankBuyStatus, getBankSellStatus } from "../../../game/rules";
import type { HegemonyState, PlayerId, TradableMaterial } from "../../../game/types";
import { resourceCssVars } from "../../../ui/resourceVisuals";
import { ResourceIcon } from "../../Sprites";
import { capitalize } from "../helpers";
import { useGameUi } from "../GameUiContext";

/**
 * The bank exchange (D6/Q14): sell a material for 1 gold, buy one for gold, rates
 * always on display so the corridor teaches itself. Rates were derived from THIS
 * board at game creation and never move; no cap on trades per turn.
 */
export function MarketTab({
  onBankSell,
  onBankBuy
}: {
  onBankSell: (material: TradableMaterial) => void;
  onBankBuy: (material: TradableMaterial) => void;
}) {
  const { G, viewerId: playerID, phase, isActive } = useGameUi();
  const gold = G.players[playerID].resources.gold;
  const tradingOpen = isActive && phase === "gameplay";

  return (
    <div className="marketLedger">
      <p className="marketIntro">
        Gold is the unit of account — the bank never barters. Rates follow this board's supply and hold all game.
      </p>

      {TRADABLE_MATERIALS.map((material) => {
        const rate = G.bank[material];
        const held = G.players[playerID].resources[material];
        const sell = getBankSellStatus(G, playerID, material);
        const buy = getBankBuyStatus(G, playerID, material);

        return (
          <section className="marketRow" key={material} style={resourceCssVars(material)}>
            <div className="marketRowLead">
              <ResourceIcon resource={material} className="marketRowIcon" />
              <span>
                <strong>{capitalize(material)}</strong>
                <em>{held} held</em>
              </span>
            </div>

            <div className="marketRowActions">
              <button
                className="marketTradeButton"
                disabled={!tradingOpen || !sell.can}
                title={sell.reasons.join(" ") || `Sell ${rate.sell} ${material} for 1 gold.`}
                onClick={() => onBankSell(material)}
              >
                Sell {rate.sell} <span className="marketArrow">→</span> 1g
              </button>
              <button
                className="marketTradeButton"
                disabled={!tradingOpen || !buy.can}
                title={buy.reasons.join(" ") || `Buy 1 ${material} for ${rate.buy} gold.`}
                onClick={() => onBankBuy(material)}
              >
                {rate.buy}g <span className="marketArrow">→</span> buy 1
              </button>
            </div>
          </section>
        );
      })}

      <div className="marketFooter">
        <span>
          Treasury <strong>{gold} gold</strong>
        </span>
        <em>Every round trip pays the spread — trading always shrinks a stockpile.</em>
      </div>
    </div>
  );
}
