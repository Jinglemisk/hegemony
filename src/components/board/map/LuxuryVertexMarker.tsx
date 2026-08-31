import type { LuxuryVertex } from "../../../game/mapTopology";

/**
 * The neutral fixture standing where a luxury good will sit (docs/plans/luxury-goods.md,
 * slice 1): a mooring buoy off the shared vertex of two coastal tiles, so its position
 * and hit target can be judged before any ownership behaviour exists. The good's name
 * and owner are slice-2 presentation — typed now so the marker's contract is settled.
 */
export function LuxuryVertexMarker({
  vertex,
  x,
  y,
  goodName,
  ownerName,
}: {
  vertex: LuxuryVertex;
  x: number;
  y: number;
  /** Slice 2: the named good moored here. */
  goodName?: string;
  /** Slice 2: who holds it, once a Port has claimed it. */
  ownerName?: string;
}) {
  const [tileA, tileB] = vertex.tileIds;
  const subject = goodName ?? "Luxury mooring";
  const holder = ownerName ? `, held by ${ownerName}` : "";
  const label = `${subject} between tiles ${tileA} and ${tileB}${holder}`;

  return (
    <g
      aria-label={label}
      className="luxuryVertexMarker"
      data-vertex-id={vertex.id}
      role="img"
      transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}
    >
      <circle className="luxuryMarkerPlate" r={6.5} />
      <circle className="luxuryMarkerCore" r={2.4} />
    </g>
  );
}
