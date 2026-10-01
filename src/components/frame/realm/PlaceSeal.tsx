import type { CSSProperties } from "react";
import type { PlayerId, SettlementKind } from "../../../game/types";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";

/** A place's seal at chip size, in its owner's glaze: the blazon for a city, a dot for a colony. */
export function PlaceSeal({ kind, owner }: { kind: SettlementKind; owner: PlayerId }) {
  const glaze = PLAYER_GLAZES[owner];
  return (
    <span
      aria-hidden="true"
      className="seal is-small"
      style={{ "--owner": glaze.color } as CSSProperties}
    >
      {kind === "colony" ? "·" : glaze.blazon}
    </span>
  );
}
