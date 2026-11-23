import type { PlayerId } from "../../../game/types";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { SeatCoin } from "../../chrome/SeatCoin";
import { Tooltip } from "../../overlays/Tooltip";
import { Tip, TipBody } from "../parts";

/**
 * The seal: the viewer's coin at the top-left corner, over the bar's end. It opens
 * the Realm drawer.
 */
export function Seal({
  seat,
  open,
  onOpen,
}: {
  seat: PlayerId;
  /** The Realm drawer is open. */
  open: boolean;
  onOpen: () => void;
}) {
  const name = PLAYER_GLAZES[seat].name;
  return (
    <Tooltip
      content={
        <Tip title={`Realm of ${name}`}>
          <TipBody>Opens the Realm drawer: its overview, cities and people.</TipBody>
        </Tip>
      }
    >
      <button
        aria-label={`Realm of ${name}: open the Realm drawer`}
        aria-pressed={open}
        className="top-seal"
        data-c="top-seal"
        data-exclude
        onClick={onOpen}
        type="button"
      >
        <SeatCoin aria-hidden="true" seat={seat} size={72} />
      </button>
    </Tooltip>
  );
}
