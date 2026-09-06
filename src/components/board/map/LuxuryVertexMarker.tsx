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
  ownerColor,
  ownerBlazon,
}: {
  vertex: Pick<LuxuryVertex, "id" | "tileIds">;
  x: number;
  y: number;
  /** The named good moored here. */
  goodName?: string;
  /** Who holds it, once a Port has claimed it. */
  ownerName?: string;
  /** The holder's glaze — identity only, and never alone: the blazon rides with it. */
  ownerColor?: string;
  ownerBlazon?: string;
}) {
  const [tileA, tileB] = vertex.tileIds;
  const subject = goodName ?? "Luxury mooring";
  const holder = ownerName ? `, held by ${ownerName}` : ", unclaimed";
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
      {ownerColor ? (
        <>
          <circle className="luxuryMarkerSeal" r={4.6} fill={ownerColor} />
          {/* World-unit type, like the name plates: an SVG attribute, not a CSS size. */}
          <text className="luxuryMarkerBlazon" fontSize={6} textAnchor="middle" y={2.1}>
            {ownerBlazon}
          </text>
        </>
      ) : (
        <circle className="luxuryMarkerCore" r={2.4} />
      )}
    </g>
  );
}
