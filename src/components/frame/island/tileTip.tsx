import { occupiedBuildingSlots } from "../../../game/ideaRules";
import { tileSlaveColumn } from "../../../game/economy/income";
import {
  settlementSlaveResource,
  settlementSlots,
  settlementWorkingSlaves,
} from "../../../game/settlement";
import type { HegemonyState, HexTile, PopType, Settlement } from "../../../game/types";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { RESOURCE_LABELS } from "../../../ui/formatters";
import { POP_RASTERS } from "../../../ui/iconRegistry";
import { Chips } from "../parts";
import type { LedgerRow } from "../parts";

/**
 * What every board says about a tile, whichever board draws it: its accessible
 * name, its hover tip, and how the arrow keys walk from it. The SVG island and the
 * living map share these, so the two boards cannot drift apart.
 */

export const POP_ORDER: readonly PopType[] = ["slaves", "freemen", "citizens"];

/** The leading settlement of a tile: a city before a colony. */
export function orderSettlements(settlements: readonly Settlement[]) {
  return [...settlements].sort((a, b) => Number(a.kind === "colony") - Number(b.kind === "colony"));
}

/** The tile itself, named: "Hex q,r, terrain tile, slots". */
export function tileName(G: HegemonyState, tile: HexTile) {
  const primary = settlementSlaveResource(tile, G);
  const slotLabel =
    `${tile.slots} ${tile.slots === 1 ? "slot" : "slots"}` +
    (primary ? ` for ${RESOURCE_LABELS[primary].toLowerCase()}` : "");
  return `Hex ${tile.id}, ${tile.terrain} tile, ${slotLabel}`;
}

/** The tile's accessible name on the SVG board: its name, then its lead settlement's. */
export function tileLabel(G: HegemonyState, tile: HexTile, names: Map<string, string>) {
  const [lead] = orderSettlements(tile.settlements);
  const leadName = lead ? names.get(lead.id) : undefined;
  return `${tileName(G, tile)}${leadName ? `, ${leadName}` : ""}`;
}

export type TileCenter = { tile: HexTile; x: number; y: number };

/**
 * Arrow keys walk the board by where the hexes are drawn: the nearest tile inside
 * a 120° cone, divided by how squarely it lies in the pressed direction (the east
 * and south-east neighbours are the same distance away).
 */
export const ARROWS: Record<string, readonly [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

export function nextTileInDirection(
  centers: readonly { tile: { id: string }; x: number; y: number }[],
  fromId: string,
  key: string,
) {
  const direction = ARROWS[key];
  const origin = centers.find(({ tile }) => tile.id === fromId);

  if (!direction || !origin) {
    return null;
  }

  let best: { id: string; cost: number } | null = null;

  for (const candidate of centers) {
    if (candidate.tile.id === fromId) {
      continue;
    }

    const dx = candidate.x - origin.x;
    const dy = candidate.y - origin.y;
    const distance = Math.hypot(dx, dy);
    const alignment = (dx * direction[0] + dy * direction[1]) / distance;

    if (alignment < 0.5) {
      continue;
    }

    const cost = distance / alignment;

    if (!best || cost < best.cost) {
      best = { id: candidate.tile.id, cost };
    }
  }

  return best?.id ?? null;
}

export function tileTip(
  G: HegemonyState,
  tile: HexTile,
  names: Map<string, string>,
): { title: string; rows: LedgerRow[] } {
  const settlements = orderSettlements(tile.settlements);

  if (settlements.length === 0) {
    const column = tileSlaveColumn(G, tile);
    return {
      title: `${tile.terrain[0].toUpperCase()}${tile.terrain.slice(1)}`,
      rows: [
        { key: "slots", label: "Slots", value: tile.slots, icon: "settlements/slot" },
        {
          key: "slave",
          label: "Each slave makes",
          value: column.resource ? (
            <Chips amounts={{ [column.resource]: column.perPop }} />
          ) : (
            "nothing"
          ),
          icon: POP_RASTERS.slaves,
        },
      ],
    };
  }

  const [lead] = settlements;
  return {
    title: names.get(lead.id) ?? "Polis",
    rows: [
      ...POP_ORDER.map((pop) => ({
        key: pop,
        label: `${pop[0].toUpperCase()}${pop.slice(1)}`,
        value: lead.pops[pop],
        icon: POP_RASTERS[pop],
      })),
      ...settlements.slice(1).map((other) => ({
        key: other.id,
        label: `Also ${PLAYER_GLAZES[other.owner].name}'s ${other.kind}`,
        value: names.get(other.id) ?? "",
      })),
      {
        key: "slots",
        label: "Slots",
        value: `${occupiedBuildingSlots(G, lead)} built, ${settlementWorkingSlaves(tile, lead, G)} worked of ${settlementSlots(tile, lead, G)}`,
        icon: "settlements/slot",
      },
    ],
  };
}
