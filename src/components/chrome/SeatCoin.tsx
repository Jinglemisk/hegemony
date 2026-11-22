import type { CSSProperties, HTMLAttributes } from "react";
import type { PlayerId } from "../../game/types";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";

/**
 * A seat as a struck coin ringed in its glaze: Kyanos the owl, Melas the winged
 * horse, Porphyra the turtle, Kinnabari the lion (chrome.css draws the art). Read
 * aloud as the seat's name. `size` is its diameter in design px; without one, the
 * caller's class sizes it.
 */
export function SeatCoin({
  seat,
  size,
  className,
  style,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { seat: PlayerId; size?: number }) {
  const glaze = PLAYER_GLAZES[seat];
  return (
    <span
      {...rest}
      aria-label={glaze.name}
      className={`ch-coin${className ? ` ${className}` : ""}`}
      data-glaze={glaze.glaze.toLowerCase()}
      role="img"
      style={size === undefined ? style : ({ ...style, "--coin-d": `${size}px` } as CSSProperties)}
    />
  );
}
