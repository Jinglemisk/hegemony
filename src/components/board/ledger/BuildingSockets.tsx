import type { GameContent } from "../../../game/content";
import { getBuilding } from "../../../game/rules";
import type { BuildingId } from "../../../game/types";
import { BuildingChip } from "./BuildingChip";

/**
 * The socket — the one primitive the showcase has and the app never built.
 *
 * A settlement's building slots were only ever a denominator: `1/3` in a meter,
 * which tells you a number and nothing else. The showcase treats them as places
 * on the ground, so a slot is a **thing you can see**: a filled tile bearing the
 * building that stands in it, a dashed outline where one could. Three separate
 * reported gaps (the Cities card's slot row, the Build page's heading, and its
 * target buttons naming "NO SLOT") are all the same missing idea, so the count
 * and the drawing are one idea: the count lives in `./slots`, the drawing here,
 * and every surface asks them rather than counting buildings for itself.
 */

/**
 * One socket per slot, filled first. The caption is the whole point of the row
 * — it is the sentence the old meter was trying to be.
 */
export function BuildingSockets({
  built,
  slots,
  content,
}: {
  built: readonly BuildingId[];
  slots: number;
  content: GameContent;
}) {
  // A colony cannot raise anything, so it has no ground to draw. An empty row
  // with a "0 of 0" caption would be furniture claiming to be information.
  if (slots === 0) {
    return null;
  }

  const open = Math.max(0, slots - built.length);

  return (
    <div
      aria-label={`${built.length} of ${slots} building slots filled.`}
      className="sockets"
      role="group"
    >
      {built.map((buildingId, index) => {
        const building = getBuilding(content, buildingId);

        return building ? (
          <BuildingChip building={building} key={`${buildingId}-${index}`} />
        ) : null;
      })}
      {Array.from({ length: open }, (_, index) => (
        <span aria-hidden="true" className="socket socketOpen" key={`open-${index}`} />
      ))}
      <span aria-hidden="true" className="socketCap caption">
        {built.length} of {slots} built
      </span>
    </div>
  );
}
