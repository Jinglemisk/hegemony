import { useState } from "react";
import type { GameContent } from "../../../game/content";
import { getBuilding } from "../../../game/rules";
import type { BuildingId } from "../../../game/types";
import { Icon } from "../../../ui/icons/Icon";
import type { OwnedHolding } from "../types";
import { BuildingChip } from "./BuildingChip";
import { SocketPicker } from "./SocketPicker";

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
 *
 * And an open socket is a **control**, not a picture of one. It carried a gap
 * and nothing else: you could see the room, and then had to leave the page to
 * learn what would fill it, from a list that did not know which settlement you
 * had been looking at. Pressing the gap answers it in place — `SocketPicker`
 * has the shape and the reasons.
 */

/**
 * One socket per slot, filled first. The caption is the whole point of the row
 * — it is the sentence the old meter was trying to be.
 */
export function BuildingSockets({
  content,
  holding,
  name,
  onBuildBuildingRequest,
  open,
  slots,
}: {
  content: GameContent;
  holding: OwnedHolding;
  /** The place's name — the picker's head, and every socket's own voice. */
  name: string;
  onBuildBuildingRequest: (tileId: string, buildingId: BuildingId) => void;
  /** Both counts come from `./slots` and neither is re-derived here. Subtracting
   *  the built from the total is a one-line sum that looks too small to be worth
   *  a module, which is how the Build page and this one came to disagree about
   *  it once already. */
  open: number;
  slots: number;
}) {
  const { settlement, tile } = holding;
  // Which gap is holding the picker open. The element, not an index: the picker
  // anchors to it, hands focus back to it on close, and has to know that a press
  // landing on it is a toggle rather than a dismissal.
  const [openSocket, setOpenSocket] = useState<{ element: HTMLElement; slot: number } | null>(null);
  const built = settlement.buildings;

  // A colony has no ground to draw — but drawing NOTHING made "this place has
  // zero slots" and "the row failed to render" the same picture, and the only
  // confirmation anywhere was the Build page's `SIKYON · NO SLOT`. Zero is a
  // fact about the settlement, so the band says it in words instead of standing
  // empty. (A "0 of 0" meter would be the furniture this avoids: a denominator
  // saying nothing, which is what the sockets replaced.)
  if (slots === 0) {
    return <p className="socketNone caption">no ground to build on</p>;
  }

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

      {Array.from({ length: Math.max(0, open) }, (_, index) => (
        <button
          // Every gap is the same door, so every gap opens it — but they still
          // have to announce themselves apart, or the card offers three controls
          // under one name and identifies none of them.
          aria-expanded={openSocket?.slot === index}
          aria-label={`Raise a building in ${name} — open slot ${built.length + index + 1} of ${slots}.`}
          className="socket socketOpen socketAdd"
          key={`open-${index}`}
          onClick={(event) => {
            const element = event.currentTarget;

            setOpenSocket((current) => (current?.slot === index ? null : { element, slot: index }));
          }}
          type="button"
        >
          <Icon glyph="plus" size="verb" />
        </button>
      ))}

      <span aria-hidden="true" className="socketCap caption">
        {built.length} of {slots} built
      </span>

      {openSocket ? (
        <SocketPicker
          anchorElement={openSocket.element}
          // Remount per socket, so the focus `Popover` gives back on close is
          // the gap the player actually pressed.
          key={openSocket.slot}
          name={name}
          onDismiss={() => setOpenSocket(null)}
          onRaise={(tileId, buildingId) => {
            setOpenSocket(null);
            onBuildBuildingRequest(tileId, buildingId);
          }}
          open={open}
          settlement={settlement}
          tile={tile}
        />
      ) : null}
    </div>
  );
}
