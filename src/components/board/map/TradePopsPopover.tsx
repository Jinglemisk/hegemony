import { formatPops } from "../../../game/rules";
import type { PlayerId } from "../../../game/types";
import { useGameUi } from "../GameUiContext";
import { Ico, SeatMark } from "../../frame/parts";
import { PopoverActions } from "../PopoverActions";
import { TileSubject } from "../TileSubject";
import type { MapSelectionMode } from "./mapSelection";
import { TilePopover } from "./TilePopover";

/**
 * Traded pops, placed like a move: the clicked settlement is where they leave or where
 * they go, and the other end is the trade partner, fixed, with a handshake to say why.
 */
export function TradePopsPopover({
  tileId,
  anchor,
  mode,
  onCancel,
  onConfirm,
}: {
  tileId: string;
  anchor: DOMRect;
  mode: Extract<MapSelectionMode, { kind: "tradePops" }>;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { G } = useGameUi();
  const tile = G.board.tiles.find((candidate) => candidate.id === tileId);
  if (!tile) return null;
  const send = mode.direction === "send";

  return (
    <TilePopover
      anchor={anchor}
      label={send ? "Traded pops leave from" : "Traded pops go to"}
      onCancel={onCancel}
      title={send ? "Trade · Send" : "Trade · Take in"}
    >
      <TileSubject G={G} playerID={mode.seat} tile={tile} />
      <p className="placementCostNote trade-partner">
        {send ? "Sends" : "Takes in"} {formatPops(mode.pops)} {send ? "to" : "from"}{" "}
        <Partner partner={mode.partner} />
      </p>
      {send ? null : (
        <p className="placementCostNote">
          They arrive at the start of {G.players[mode.seat].name}&rsquo;s next turn.
        </p>
      )}
      <PopoverActions
        confirmLabel={send ? "Send From Here" : "Place Here"}
        disabled={false}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </TilePopover>
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
