import { POP_TYPES } from "../../../game/rules";
import type { Pops } from "../../../game/types";

/**
 * The people of one place, one bead each, with the room they have left drawn as
 * ghosts. The three bead shapes are the board's — solid is a citizen, a ring is
 * a freeman, a filled black bead is a slave — so a settlement reads the same in
 * the ledger as it does on the map, and the ladder never has to spend hue on
 * itself beside four owner glazes.
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
