import { useRef } from "react";
import { formatPops } from "../../../game/rules";
import type { PlayerId } from "../../../game/types";
import { settlementNameOf } from "../../../ui/settlementNames";
import { Panel, PanelHead } from "../../chrome/Panel";
import { Lacquer } from "../../chrome/controls";
import { Ico, SeatMark, Turns } from "../../frame/parts";
import { useReturnFocus } from "../../overlays/focus";
import { titleCase } from "../../left/words";
import { useGameUi } from "../GameUiContext";
import type { MapSelectionMode } from "./mapSelection";

/**
 * Traded pops, placed like a move: the clicked settlement is where they leave or where
 * they go, and the other end is the trade partner, fixed, with a handshake to say why.
 * It opens where Move and Found do, beside the place panel above the hand's row.
 */
export function TradePopsPopover({
  tileId,
  mode,
  onCancel,
  onConfirm,
}: {
  tileId: string;
  mode: Extract<MapSelectionMode, { kind: "tradePops" }>;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { G } = useGameUi();
  // Opening moves focus in, to the verb, and closing hands it back.
  const ref = useRef<HTMLDivElement>(null);
  useReturnFocus(ref, ".ch-lacquer");

  const tile = G.board.tiles.find((candidate) => candidate.id === tileId);
  const own = tile?.settlements.find((candidate) => candidate.owner === mode.seat);
  if (!tile || !own) return null;
  const send = mode.direction === "send";
  const name = titleCase(settlementNameOf(G.board.tiles, own.id));

  return (
    <Panel
      aria-label={send ? `Traded pops leave from ${name}` : `Traded pops go to ${name}`}
      className="pp-pop is-trade ch-settle"
      corners={["tr", "br"]}
      data-exclude
      ref={ref}
      role="dialog"
    >
      <PanelHead
        closeLabel="Cancel"
        icon="market/handshake"
        onClose={onCancel}
        sub={send ? "Traded pops leave from here" : "Traded pops arrive here next turn"}
        title={name}
      />
      <div className="pp-pop-body">
        <h3 className="pp-k pp-pop-k">{send ? "Sends" : "Takes in"}</h3>
        <p className="pp-pop-line trade-partner">
          {formatPops(mode.pops)} {send ? "to" : "from"} <Partner partner={mode.partner} />
        </p>
        {send ? null : (
          <p className="pp-pop-line">
            They arrive in <Turns n={1} />.
          </p>
        )}
      </div>
      <footer className="pp-pop-foot">
        <Lacquer onClick={onConfirm}>{send ? "Send from here" : "Place here"}</Lacquer>
      </footer>
    </Panel>
  );
}

function Partner({ partner }: { partner: PlayerId | null }) {
  const { G } = useGameUi();
  return (
    <span className="trade-partner-name">
      {partner ? <SeatMark playerID={partner} /> : null}
      <b>{partner ? G.players[partner].name : "whoever accepts"}</b>
      <Ico path="market/handshake" size="chip" />
    </span>
  );
}
