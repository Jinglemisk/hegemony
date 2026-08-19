import { POP_TYPES } from "../../../game/rules";
import type { Pops } from "../../../game/types";

/**
 * The people of one place, one bead each, with the room they have left drawn
 * after them.
 *
 * **Shape is the rank.** A citizen is a disc, a freeman a square, a slave a
 * point-down triangle, and empty room is a dash — not a mark at all. Every one
 * of those was a circle before: a freeman was a 2px ring and an empty slot a 1px
 * ring, which is the same mark at two weights, so at NAXOS 3/10 you could not
 * count your own people. The board's rule is shape = kind and colour = owner;
 * pops have no owner to spend hue on, so kind has to be the silhouette, and the
 * ranks may not be told apart by stroke width.
 *
 * The board still draws all three as circles (`.popBead-*`, board.css) — see the
 * report: it needs the same three silhouettes before the two surfaces agree.
 */
export function PopBeads({ pops, capacity }: { pops: Pops; capacity: number }) {
  const beads = POP_TYPES.flatMap((pop) => Array.from({ length: pops[pop] }, () => pop));
  const room = Math.max(0, capacity - beads.length);

  return (
    <span aria-hidden="true" className="beads">
      {beads.map((pop, index) => (
        <i className={`bead bead-${pop}`} key={`${pop}-${index}`} />
      ))}
      {Array.from({ length: room }, (_, index) => (
        <i className="bead bead-empty" key={`empty-${index}`} />
      ))}
    </span>
  );
}
