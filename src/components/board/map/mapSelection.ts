import type { PlayerId, Pops } from "../../../game/types";

/**
 * Map-first selection (refit scope 3 / selection rule 1).
 *
 * Every "which settlement?" question used to be answered by a dropdown inside a
 * modal that covered the board — asking the player to choose a *tile* while
 * hiding the tiles. The Found Colony flow already did it properly: eligible tiles
 * glow, the clicked tile takes the active ring, and an anchored popover carries
 * the details and the confirm. This generalises that one bespoke boolean into a
 * mode every flow can arm.
 *
 * The rule the shape enforces: **no backdrop modal may cover the board during a
 * selection.** A mode is armed, the map answers, the popover confirms.
 *
 * NOT here, deliberately: the riot concession and the event pop-placement. Scope
 * 3 lists both as map-first, but scope 4 carves them back out ("a list genuinely
 * beats the map … inside the deliberately-blocking riot modal") and scope 4 wins,
 * because the contradiction resolves by force rather than taste: both dialogs
 * BLOCK by design (Q15 — the committed turn waits for its riot), so the board
 * they cover cannot be the picker. They use {@link TileListbox} instead, which is
 * exactly the case scope 4 built it for.
 */

export type MapSelectionMode =
  /** Send a pop out to a new colony: pick the destination. */
  | { kind: "foundColony" }
  /** Move pops out of a settlement (the place panel names it): pick the destination. */
  | { kind: "movePops"; sourceTileId: string }
  /** Traded pops: the settlement of `seat`'s they leave (`send`) or join (`receive`).
   *  The seat may not be the viewer: an offer is answered out of turn. */
  | {
      kind: "tradePops";
      seat: PlayerId;
      /** The other side of the trade; null for an offer to the table, before anyone accepts. */
      partner: PlayerId | null;
      pops: Pops;
      direction: "send" | "receive";
    };

export type MapSelection = {
  mode: MapSelectionMode;
  /** The tile the player clicked, with the rect its popover anchors to. */
  target: { tileId: string; anchor: DOMRect } | null;
};

/** Caption under the map while a mode is armed — always says how to get out. */
export function selectionCaption(mode: MapSelectionMode, candidateCount: number): string {
  if (candidateCount === 0) {
    return `${emptyCopy(mode)} · Esc to cancel`;
  }

  return `${promptCopy(mode)} · Esc to cancel`;
}

function promptCopy(mode: MapSelectionMode): string {
  switch (mode.kind) {
    case "foundColony":
      return "Select a glowing tile to found your colony";
    case "movePops":
      return "Select the settlement the pops travel to";
    case "tradePops":
      return mode.direction === "send"
        ? "Select the settlement the traded pops leave from"
        : "Select the settlement that takes in the traded pops";
  }
}

function emptyCopy(mode: MapSelectionMode): string {
  switch (mode.kind) {
    case "foundColony":
      return "No open tile can host a colony right now";
    case "movePops":
      return "No other settlement can receive these pops";
    case "tradePops":
      return mode.direction === "send"
        ? "No settlement holds those pops together"
        : "No settlement has room for them";
  }
}
