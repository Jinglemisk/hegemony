import { devCardBlocked, devCardOf, getBuyDevCardStatus } from "../../../game/rules";
import { capitalize } from "../../../game/core/format";
import { devCardFace } from "../../../ui/cardFace";
import { useGameUi } from "../../board/GameUiContext";
import { Band } from "../../chrome/Panel";
import { Lacquer, Plaque } from "../../chrome/controls";
import { useConfirm } from "../../chrome/confirmContext";
import { Chips, Ico, Tip, TipBody } from "../../frame/parts";
import { Tooltip } from "../../overlays/Tooltip";
import { Tile } from "../atoms";
import { SpendDetail } from "../../chrome/confirmDetail";
import { refusal } from "../words";
import type { DrawerProps } from "../Drawer";

/**
 * Cards: the held development cards (each opens the hand), the way to the hand, and
 * buying a card from the deck through the confirm bar, priced by the engine.
 */
export function CardsDrawer({ actions }: DrawerProps) {
  const { G, viewerId, turnBlocked } = useGameUi();
  const ask = useConfirm();
  const hand = G.devHands[viewerId];
  const store = G.players[viewerId].resources;
  const buy = getBuyDevCardStatus(G, viewerId);
  const why = refusal(buy, turnBlocked, store);
  const cost = buy.cost ?? {};

  return (
    <>
      <Band end={hand.length} label="Held" />
      {hand.length ? (
        <div className="lw-tiles">
          {hand.map((held) => {
            const card = devCardOf(G, held.id);
            if (!card) return null;
            const face = devCardFace(card);
            const blocked = devCardBlocked(G, viewerId, held.id);
            return (
              <Tile
                ariaLabel={`${card.name}: open the hand`}
                icon={"icon" in face.art ? face.art.icon : "events/venture"}
                key={held.id}
                label={card.name}
                onClick={actions.onOpenHand}
                tip={{
                  key: `h-${held.id}`,
                  title: card.name,
                  line: blocked ? `${card.text} ${blocked}` : card.text,
                }}
              >
                <span className="lw-tile-k">{capitalize(card.kind)}</span>
              </Tile>
            );
          })}
        </div>
      ) : (
        <p className="lw-none">
          <Ico path="events/venture" size="ui" />
          No cards held
        </p>
      )}
      {hand.length ? (
        <div className="lw-center">
          <Plaque onClick={actions.onOpenHand}>
            <Ico path="events/venture" size="ui" />
            View the hand
          </Plaque>
        </div>
      ) : null}
      <Band label="The deck" />
      <div className="lw-center">
        <Tooltip
          content={
            <Tip title="Buy a card">
              <TipBody>
                {why ?? "Once a turn. A yield pays at once; any other card goes to your hand."}
              </TipBody>
            </Tip>
          }
        >
          <Lacquer
            disabled={why !== null}
            onClick={() =>
              ask({
                icon: "events/convoy",
                question: "Are you sure you want to buy a development card?",
                detail: <SpendDetail cost={cost} G={G} note="Once a turn." viewerId={viewerId} />,
                verb: "Buy a card",
                onYes: actions.onBuyCard,
              })
            }
          >
            <Ico path="events/convoy" size="ui" />
            Buy a card
            <Chips amounts={cost} short={why !== null} />
          </Lacquer>
        </Tooltip>
      </div>
      {why ? <p className="lw-why">{why}</p> : null}
    </>
  );
}
