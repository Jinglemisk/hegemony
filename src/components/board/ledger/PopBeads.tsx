import { POP_TYPES } from "../../../game/rules";
import type { Pops } from "../../../game/types";
import { POP_GLYPHS } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";

/**
 * The people of one place, one figure each, with the room they have left drawn
 * after them.
 *
 * Each pop is the rank's own icon — the same citizen, freeman and slave the
 * rest of the UI draws, so the census speaks the app's one vocabulary instead
 * of a private disc/square/triangle cipher that needed a legend to read. Empty
 * room stays a dash: it is not a rank, so it is not a figure, and it cannot be
 * miscounted as anybody.
 *
 * The board still draws all three as circles (`.popBead-*`, board.css) — see the
 * report: it needs the same three figures before the two surfaces agree.
 */
export function PopBeads({ pops, capacity }: { pops: Pops; capacity: number }) {
  const beads = POP_TYPES.flatMap((pop) => Array.from({ length: pops[pop] }, () => pop));
  const room = Math.max(0, capacity - beads.length);

  return (
    <span aria-hidden="true" className="beads">
      {beads.map((pop, index) => (
        <Icon className="beadFigure" glyph={POP_GLYPHS[pop]} key={`${pop}-${index}`} />
      ))}
      {Array.from({ length: room }, (_, index) => (
        <i className="bead bead-empty" key={`empty-${index}`} />
      ))}
    </span>
  );
}
