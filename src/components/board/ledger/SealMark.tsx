import type { CSSProperties } from "react";
import type { PlayerId, SettlementKind } from "../../../game/types";
import { SETTLEMENT_SEALS } from "../../../ui/boardEmblems";
import { glazeOf } from "../../../ui/playerGlazes";

/**
 * The settlement's mark, exactly as the board draws it: the owner's glaze under
 * the seal glyph for its rank, inside an ivory keyline.
 *
 * The ledger used to identify a settlement with a bare monochrome icon, so the
 * card and the token on the map were two different pictures of one place and you
 * could not carry a name from one to the other. Same glaze, same silhouette,
 * same keyline — `.sealDisc`/`.sealGlyph` are the board's own rules (board.css),
 * used here rather than restated.
 *
 * Geometry: the seals are authored around the disc's centre with their mass
 * riding high (the board hangs a name plate under them), so the glyph is dropped
 * by half its bounding box and scaled to fill the disc the way the showcase's
 * seal does.
 */
export function SealMark({
  owner,
  kind,
  className,
}: {
  owner: PlayerId;
  kind: SettlementKind;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={["sealMark", className].filter(Boolean).join(" ")}
      focusable="false"
      style={{ "--glaze": glazeOf(owner) } as CSSProperties}
      viewBox="-22 -22 44 44"
    >
      <circle className="sealDisc" r="20" />
      <g transform="scale(1.5) translate(0 6.5)">
        <path className="sealGlyph" d={SETTLEMENT_SEALS[kind]} />
      </g>
    </svg>
  );
}
