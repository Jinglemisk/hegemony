import type { CSSProperties } from "react";
import type { LuxuryVertex } from "../../../game/mapTopology";
import { GlyphMarks } from "../../../ui/icons/Icon";

/** The mooring disc's radius and its name's offset, in island user units. */
export const MOORING_RADIUS = 18;
export const MOORING_LABEL_X = 26;

/**
 * A luxury good's mooring off the shared vertex of two coastal tiles: an ivory
 * disc with the amphora, ringed in the holder's glaze once a Port claims it, and
 * the good's name on the sea side.
 */
export function LuxuryVertexMarker({
  vertex,
  x,
  y,
  goodName,
  ownerName,
  ownerColor,
  labelSide = "start",
}: {
  vertex: Pick<LuxuryVertex, "id" | "tileIds">;
  x: number;
  y: number;
  /** The named good moored here. */
  goodName?: string;
  /** Who holds it, once a Port has claimed it. */
  ownerName?: string;
  /** The holder's glaze. */
  ownerColor?: string;
  /** Where the name sits: beside the disc (reading away from it) or over or under it. */
  labelSide?: "start" | "end" | "above" | "below";
}) {
  const [tileA, tileB] = vertex.tileIds;
  const subject = goodName ?? "Luxury mooring";
  const holder = ownerName ? `, held by ${ownerName}` : ", unclaimed";
  const label = `${subject} between tiles ${tileA} and ${tileB}${holder}`;

  return (
    <g
      aria-label={label}
      className="moor"
      data-vertex-id={vertex.id}
      role="img"
      style={ownerColor ? ({ "--owner": ownerColor } as CSSProperties) : undefined}
      transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
    >
      <circle className={`mooring${ownerColor ? " claimed" : ""}`} r={MOORING_RADIUS} />
      <g className="popg" transform="translate(-11 -11) scale(.92)">
        <GlyphMarks glyph="luxury" />
      </g>
      {goodName ? (
        <text
          className="mooring-name"
          data-side={labelSide}
          textAnchor={labelSide === "start" || labelSide === "end" ? labelSide : "middle"}
          x={labelSide === "start" ? MOORING_LABEL_X : labelSide === "end" ? -MOORING_LABEL_X : 0}
        >
          {goodName}
        </text>
      ) : null}
    </g>
  );
}
