import { getBuilding, getLuxuryGood } from "../../../game/content";
import { totalPops } from "../../../game/core/pops";
import { isCapital } from "../../../game/core/query";
import {
  settlementClassColumn,
  settlementNetYield,
  tileSlaveColumn,
} from "../../../game/economy/income";
import { occupiedBuildingSlots } from "../../../game/ideaRules";
import { claimableLuxuriesAt } from "../../../game/luxury";
import { axialToPlane, luxuryEligibleVertices, openSeaSides } from "../../../game/mapTopology";
import {
  settlementOpenSlots,
  settlementSlaveResource,
  settlementSlots,
  settlementUnworkedSlots,
  settlementWorkingSlaves,
} from "../../../game/settlement";
import type {
  BuildingId,
  HegemonyState,
  HexTile,
  LuxuryGoodId,
  MaterialResource,
  PlayerId,
  Pops,
  Resources,
  SettlementKind,
  Terrain,
} from "../../../game/types";
import { RESOURCE_LABELS, formatSignedNumber } from "../../../ui/formatters";
import { luxuryMarkerPosition, vertexCenter } from "../../../ui/hexGeometry";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { RESOURCE_ORDER } from "../../../ui/resourceVisuals";
import { orderSettlements, tileName } from "../island/tileTip";
import { mapRealms } from "./modes";
import type { MapMode, MapRealm } from "./modes";

/**
 * What the living map draws, as a pure projection of engine state: it reads the
 * board and the engine's own selectors and nothing else, so the map cannot disagree
 * with the rules. Positions are world units with the island's centre at the origin
 * (see camera.ts).
 */

/** The board's shape: fixed for a match, so the scene builds it once. */
export type BoardShape = {
  cells: { id: string; x: number; y: number; terrain: Terrain; seaSides: number[] }[];
  /** The farthest tile centre from the origin: the camera's target stays inside it. */
  reach: number;
  /** Half the side of a square about the origin that holds the island and its surf. */
  half: number;
  /** The island's centre on the engine's plane: the world origin. */
  origin: { x: number; y: number };
};

/** A key that changes only when the board's shape does, never when a piece moves. */
export const shapeKey = (tiles: readonly HexTile[]) =>
  tiles.map((tile) => `${tile.q},${tile.r},${tile.terrain}`).join(";");

/** The shape, from its key, so a memo on the key rebuilds it only when it changes. */
export function boardShape(key: string): BoardShape {
  const tiles = key.split(";").map((cell) => {
    const [q, r, terrain] = cell.split(",");
    return { id: `${q},${r}`, q: Number(q), r: Number(r), terrain: terrain as Terrain };
  });
  const plane = tiles.map((tile) => axialToPlane(tile.q, tile.r));
  const xs = plane.map((p) => p.x);
  const ys = plane.map((p) => p.y);
  const ox = (Math.min(...xs) + Math.max(...xs)) / 2;
  const oy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const cells = tiles.map((tile, i) => ({
    id: tile.id,
    x: plane[i].x - ox,
    y: plane[i].y - oy,
    terrain: tile.terrain,
    seaSides: openSeaSides(tile, tiles),
  }));
  const extent = Math.max(...cells.map((c) => Math.max(Math.abs(c.x), Math.abs(c.y)))) + 1;
  return {
    cells,
    reach: Math.max(...cells.map((c) => Math.hypot(c.x, c.y))),
    // Three units of open water past the island carry the surf and its waves.
    half: extent + 3,
    origin: { x: ox, y: oy },
  };
}

export type MapSettlement = {
  id: string;
  name: string;
  kind: SettlementKind;
  /** The realm's first city, drawn as its acropolis. */
  capital: boolean;
  owner: PlayerId;
  buildings: BuildingId[];
  pops: number;
  /** The pops by class: the map draws one figure for each. */
  classes: Pops;
  slots: number;
  built: number;
  worked: number;
  /** Slots not built on: what the town's resources stand for. */
  openSlots: number;
  /** Slots neither built on nor worked. */
  open: number;
  /** What it makes and eats a turn, as its ledger prints it (`settlementNetYield`). */
  net: Resources;
  /** What its slots make: the slave column (`settlementClassColumn`). */
  worksFor: number;
};

export type MapTile = {
  id: string;
  /** The tile's axial cell. */
  q: number;
  r: number;
  x: number;
  y: number;
  terrain: Terrain;
  slots: number;
  /** The sides open to the sea (see `openSeaSides`). */
  seaSides: number[];
  /** What a slave makes here, or null where slaves make nothing. */
  resource: MaterialResource | null;
  /** How much of it one slave makes on an open slot (`tileSlaveColumn`). */
  perSlave: number;
  /** The tile's accessible name in each mode: what the map shows, said. */
  labels: Record<MapMode, string>;
  /** The leading settlement first: a city before a colony. */
  settlements: MapSettlement[];
};

export type MapMooring = {
  vertexId: string;
  /** Where the good floats, and the shared vertex it is moored off. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** The open-sea cell's centre: a Port that claims the good faces it. */
  sx: number;
  sy: number;
  name: string;
  owner: PlayerId | null;
  /** The settlement whose Port claimed it. */
  claimedBy: string | null;
  label: string;
};

/** Pops on their way between two settlements (`G.transfers`): a ship carries them. */
export type MapTransfer = {
  id: string;
  owner: PlayerId;
  from: string;
  to: string;
  pops: Pops;
  /** The ship's chip: how many, and where to. */
  label: string;
};

export type MapModel = {
  tiles: MapTile[];
  moorings: MapMooring[];
  transfers: MapTransfer[];
  realms: MapRealm[];
};

/** A good floats this far off its vertex, toward the open sea. */
const MOORING_OFFSET = 0.62;

export function mapModel(
  G: HegemonyState,
  shape: BoardShape,
  names: Map<string, string>,
): MapModel {
  const cells = new Map(shape.cells.map((cell) => [cell.id, cell]));
  const { x: ox, y: oy } = shape.origin;
  const goodName = (goodId: LuxuryGoodId) =>
    getLuxuryGood(G.definition.content, goodId)?.name ?? "Luxury mooring";
  // The good each Port claimed, by the settlement that claimed it.
  const held = new Map(
    G.board.luxuries.flatMap((asset) =>
      asset.claimedAtSettlementId ? [[asset.claimedAtSettlementId, goodName(asset.goodId)]] : [],
    ),
  );

  const titled = (id: string) => {
    const name = names.get(id) ?? "POLIS";
    return name.charAt(0) + name.slice(1).toLowerCase();
  };
  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const popsOf = (pops: Pops) => count(totalPops(pops), "pop", "pops");
  /** "8 pops (5 citizens, 1 freeman, 2 slaves)", naming only the classes there are. */
  const classesOf = (pops: Pops) => {
    const classes = [
      pops.citizens && count(pops.citizens, "citizen", "citizens"),
      pops.freemen && count(pops.freemen, "freeman", "freemen"),
      pops.slaves && count(pops.slaves, "slave", "slaves"),
    ].filter(Boolean);
    return popsOf(pops) + (classes.length ? ` (${classes.join(", ")})` : "");
  };

  const realms = mapRealms(G);
  /** Signed amounts in words, in the ledger's order: "+2 wood, −1 food". */
  const amounts = (r: Resources) =>
    RESOURCE_ORDER.filter((k) => r[k])
      .map((k) => `${formatSignedNumber(r[k])} ${RESOURCE_LABELS[k].toLowerCase()}`)
      .join(", ");

  const tiles = G.board.tiles.map((tile) => {
    const cell = cells.get(tile.id)!;
    const resource = settlementSlaveResource(tile, G);
    const settlements = orderSettlements(tile.settlements).map((s) => ({
      id: s.id,
      name: names.get(s.id) ?? "POLIS",
      kind: s.kind,
      capital: s.kind === "capital" || isCapital(G, s.owner, tile.id),
      owner: s.owner,
      buildings: s.buildings,
      pops: totalPops(s.pops),
      classes: s.pops,
      slots: settlementSlots(tile, s, G),
      built: occupiedBuildingSlots(G, s),
      worked: settlementWorkingSlaves(tile, s, G),
      openSlots: settlementOpenSlots(tile, s, G),
      open: settlementUnworkedSlots(tile, s, G),
      net: settlementNetYield(tile, s, G),
      worksFor: resource ? settlementClassColumn(tile, s, "slaves", G).income[resource] : 0,
    }));
    // What the map shows of each settlement, said: its plate, its pips and its buildings.
    const said = settlements.map((s) => {
      const buildings = s.buildings.map((b) => {
        const name = getBuilding(G.definition.content, b)?.name ?? b;
        const good = b === "port" ? held.get(s.id) : undefined;
        return good ? `${name} holding ${good}` : name;
      });
      return (
        `${s.name}, ${PLAYER_GLAZES[s.owner].name}'s ${s.kind}: ${classesOf(s.classes)}, ` +
        `${s.built} built, ${s.worked} worked, ${s.open} open` +
        (buildings.length ? `; ${buildings.join(", ")}` : "")
      );
    });
    // Pops at sea are said on the tile they sail to.
    const arriving = G.transfers
      .filter((t) => t.toTileId === tile.id)
      .map((t) => `${popsOf(t.pops)} on the way from ${titled(t.fromSettlementId)}`);
    const label = [tileName(G, tile), ...said, ...arriving].join("; ");
    const { perPop } = tileSlaveColumn(G, tile);
    const claimable = claimableLuxuriesAt(G, tile.id).map((asset) => goodName(asset.goodId));

    // Each mode adds its number: what the tile makes, its realm's level, the goods a
    // Port here would take.
    const economy = settlements.length
      ? settlements.map((s) => `${s.name} makes ${amounts(s.net) || "nothing"}`)
      : tile.terrain === "oracle"
        ? []
        : [
            resource && perPop
              ? `a slave here makes ${perPop} ${RESOURCE_LABELS[resource].toLowerCase()}`
              : "slaves make nothing here",
          ];
    const unrest = [...new Set(settlements.map((s) => s.owner))].map((owner) => {
      const realm = realms.find((r) => r.owner === owner)!;
      const tokens = realm.tokens
        ? `, ${count(realm.tokens, "Unrest token", "Unrest tokens")}`
        : "";
      return `${PLAYER_GLAZES[owner].name}'s realm at happiness ${formatSignedNumber(realm.happiness)}, ${realm.tier}${tokens}`;
    });
    const trade = claimable.length ? [`a Port here would claim ${claimable.join(" or ")}`] : [];
    const say = (extra: string[]) => [label, ...extra].join("; ");

    return {
      id: tile.id,
      q: tile.q,
      r: tile.r,
      x: cell.x,
      y: cell.y,
      terrain: tile.terrain,
      slots: tile.slots,
      seaSides: cell.seaSides,
      resource,
      perSlave: perPop,
      labels: {
        terrain: label,
        political: label,
        economy: say(economy),
        unrest: say(unrest),
        trade: say(trade),
      },
      settlements,
    };
  });

  const vertices = new Map(luxuryEligibleVertices(G.board.tiles).map((v) => [v.id, v]));
  const moorings = G.board.luxuries.flatMap((asset) => {
    const vertex = vertices.get(asset.vertexId);
    if (!vertex) return [];
    const at = luxuryMarkerPosition(vertex, 1, MOORING_OFFSET);
    const v = vertexCenter(vertex.cells, 1);
    const sea = axialToPlane(vertex.seaCell.q, vertex.seaCell.r);
    const name = goodName(asset.goodId);
    const holder = asset.owner ? `, held by ${PLAYER_GLAZES[asset.owner].name}` : ", unclaimed";
    const [a, b] = vertex.tileIds;
    return [
      {
        vertexId: vertex.id,
        x: at.x - ox,
        y: at.y - oy,
        vx: v.x - ox,
        vy: v.y - oy,
        sx: sea.x - ox,
        sy: sea.y - oy,
        name,
        owner: asset.owner,
        claimedBy: asset.claimedAtSettlementId,
        label: `${name} between tiles ${a} and ${b}${holder}`,
      },
    ];
  });

  const transfers = G.transfers.map((t) => ({
    id: t.id,
    owner: t.owner,
    from: t.fromTileId,
    to: t.toTileId,
    pops: t.pops,
    label: `${popsOf(t.pops)} → ${titled(t.toSettlementId)}`,
  }));

  return { tiles, moorings, transfers, realms };
}
