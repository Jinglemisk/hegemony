import type { TerrainDeck } from "./content";
import { mulberry32 } from "./core/rng";
import { AXIAL_DIRECTIONS, hexDistance } from "./map";
import { axialToPlane } from "./mapTopology";
import type { AxialCell } from "./mapTopology";
import type { HexTile } from "./types";

/**
 * The Archipelago board generator (docs/plans/board-modes.md, slice 0).
 *
 * A pure function of the seed and the terrain deck. It lays the whole deck as islands in
 * groups around the board's centre, where the oracle stands alone on its islet. Every draw
 * is checked against the limits below and redrawn when it breaks one; after
 * `ARCHIPELAGO_LIMITS.draws` failures a fixed board that passes them is dealt instead, so
 * setup can never hang. Nothing in setup calls it yet: the owner approves it first.
 *
 * Distances are plain hex distances. A gap is the sea cells between two pieces of land:
 * islands one cell apart have tiles two hexes apart.
 */

export interface Range {
  min: number;
  max: number;
}

export interface ArchipelagoLimits {
  /** Settleable islands on a board. The oracle's islet is not one. */
  islands: Range;
  /** Tiles in a settleable island. */
  islandSize: Range;
  /** Whether a settleable island may be a single tile. */
  islet: boolean;
  /** Island groups on a board. */
  groups: Range;
  /** Islands in a group. */
  islandsPerGroup: Range;
  /** Sea cells between neighbouring islands of a group: islands whose gap is at most `max`
   *  belong to one group. */
  groupGap: Range;
  /** Sea cells between two groups: never fewer than `min`, and each group has a neighbour
   *  within `max`. */
  channelGap: Range;
  /** Every tile of a group lies within this many hexes of the group's middle. With the
   *  islands compact, no group can be a chain. */
  groupRadius: number;
  /** Every tile lies within this many hexes of the board's centre. */
  mapRadius: number;
  /** Width over height of the drawn board, so it fits the screen. */
  aspect: Range;
  /** The widest angle between neighbouring groups, seen from the centre, in degrees.
   *  Below 180 the groups surround the centre instead of standing in a row. */
  maxGroupAngle: number;
  /** Draws before the fallback board. */
  draws: number;
}

export const ARCHIPELAGO_LIMITS: ArchipelagoLimits = {
  islands: { min: 6, max: 9 },
  islandSize: { min: 3, max: 7 },
  islet: false,
  groups: { min: 3, max: 4 },
  islandsPerGroup: { min: 2, max: 3 },
  groupGap: { min: 1, max: 1 },
  channelGap: { min: 2, max: 3 },
  groupRadius: 4,
  mapRadius: 6,
  aspect: { min: 0.8, max: 1.35 },
  maxGroupAngle: 150,
  draws: 40,
};

export interface ArchipelagoBoard {
  tiles: HexTile[];
  layout: ArchipelagoLayout;
  /** The rng state after the board, for the next draw in the seed chain. */
  rng: number;
  /** Draws made, the accepted one included; `limits.draws` when the fallback was dealt. */
  draws: number;
  fallback: boolean;
}

export interface ArchipelagoLayout {
  /** Tile ids of each settleable island, in board order. */
  islands: string[][];
  /** Island indices of each group. */
  groups: number[][];
}

/** The smallest hex disc that holds `tiles` tiles: 1 for up to 7, 2 for up to 19. An
 *  island must fit the disc of that radius around one of its own tiles. */
function islandRadius(tiles: number) {
  let radius = 0;
  while (3 * radius * (radius + 1) + 1 < tiles) radius += 1;
  return radius;
}

export function generateArchipelago(
  seed: number,
  deck: TerrainDeck,
  limits: ArchipelagoLimits = ARCHIPELAGO_LIMITS,
): ArchipelagoBoard {
  const rng = seededDraw(seed);
  const hasOracle = deck.some((card) => card.terrain === "oracle");
  const land = deck.filter((card) => card.terrain !== "oracle").length;

  for (let draw = 1; draw <= limits.draws; draw += 1) {
    const islands = drawIslands(rng, land, limits, hasOracle);
    if (!islands) continue;
    const tiles = dealTerrain(rng, islands, deck, limits);
    if (checkArchipelago(tiles, limits).length === 0) {
      return board(tiles, limits, rng.state(), draw, false);
    }
  }

  if (FALLBACK_LAND.length !== land) {
    throw new Error(
      `the fallback archipelago holds ${FALLBACK_LAND.length} land tiles, not ${land}`,
    );
  }

  const tiles = dealTerrain(rng, FALLBACK_ISLANDS, deck, limits);
  return board(tiles, limits, rng.state(), limits.draws, true);
}

function board(
  tiles: HexTile[],
  limits: ArchipelagoLimits,
  rng: number,
  draws: number,
  fallback: boolean,
): ArchipelagoBoard {
  return { tiles, layout: describeArchipelago(tiles, limits), rng, draws, fallback };
}

// ── Reading a board ──────────────────────────────────────────────────────────────────

/** Islands and groups as the land lies: an island is a run of touching tiles, the oracle's
 *  lone islet excepted, and a group is islands chained by gaps of at most `groupGap.max`. */
function describeArchipelago(
  tiles: readonly HexTile[],
  limits: Pick<ArchipelagoLimits, "groupGap">,
): ArchipelagoLayout {
  const byKey = new Map(tiles.map((tile) => [tile.id, tile]));
  const seen = new Set<string>();
  const islands: string[][] = [];

  for (const tile of tiles) {
    if (seen.has(tile.id)) continue;
    const island = [tile.id];
    seen.add(tile.id);
    for (let index = 0; index < island.length; index += 1) {
      const { q, r } = byKey.get(island[index])!;
      for (const step of AXIAL_DIRECTIONS) {
        const key = `${q + step.q},${r + step.r}`;
        if (byKey.has(key) && !seen.has(key)) {
          seen.add(key);
          island.push(key);
        }
      }
    }
    if (!island.every((id) => byKey.get(id)!.terrain === "oracle")) islands.push(island);
  }

  const cells = islands.map((island) => island.map((id) => byKey.get(id)!));
  return { islands, groups: groupIslands(cells, limits) };
}

/** Islands chained by gaps of at most `groupGap.max`, as lists of island indices. */
function groupIslands(
  islands: readonly AxialCell[][],
  limits: Pick<ArchipelagoLimits, "groupGap">,
): number[][] {
  const groupOf = islands.map((_, index) => index);
  const root = (index: number): number =>
    groupOf[index] === index ? index : (groupOf[index] = root(groupOf[index]));
  for (let a = 0; a < islands.length; a += 1) {
    for (let b = a + 1; b < islands.length; b += 1) {
      if (gapBetween(islands[a], islands[b]) <= limits.groupGap.max) groupOf[root(b)] = root(a);
    }
  }
  const groups = new Map<number, number[]>();
  islands.forEach((_, index) =>
    groups.set(root(index), [...(groups.get(root(index)) ?? []), index]),
  );
  return [...groups.values()];
}

/** Sea cells between two pieces of land. */
function gapBetween(a: readonly AxialCell[], b: readonly AxialCell[]) {
  let nearest = Infinity;
  for (const x of a) for (const y of b) nearest = Math.min(nearest, hexDistance(x, y));
  return nearest - 1;
}

/** Each limit the board breaks, in words; an empty list is a board that passes. */
export function checkArchipelago(tiles: readonly HexTile[], limits: ArchipelagoLimits): string[] {
  const broken: string[] = [];
  const within = (value: number, range: Range) => value >= range.min && value <= range.max;
  const { islands, groups } = describeArchipelago(tiles, limits);
  const byKey = new Map(tiles.map((tile) => [tile.id, tile]));
  const land = islands.map((island) => island.map((id) => byKey.get(id)!));
  const origin = { q: 0, r: 0 };

  if (!within(islands.length, limits.islands)) broken.push(`${islands.length} islands`);
  for (const island of land) {
    if (!within(island.length, limits.islandSize) || (!limits.islet && island.length === 1)) {
      broken.push(`an island of ${island.length} tiles`);
    }
    const radius = islandRadius(island.length);
    if (!island.some((centre) => island.every((tile) => hexDistance(centre, tile) <= radius))) {
      broken.push(`an island of ${island.length} tiles that is not compact`);
    }
  }

  if (!within(groups.length, limits.groups)) broken.push(`${groups.length} groups`);
  const groupTiles = groups.map((group) => group.flatMap((index) => land[index]));
  for (const [index, group] of groups.entries()) {
    if (!within(group.length, limits.islandsPerGroup)) {
      broken.push(`a group of ${group.length} islands`);
    }
    for (const a of group) {
      for (const b of group) {
        if (a < b && gapBetween(land[a], land[b]) < limits.groupGap.min) {
          broken.push("two islands of a group too close");
        }
      }
    }
    const middle = planeToAxial(centroid(groupTiles[index]));
    if (groupTiles[index].some((tile) => hexDistance(tile, middle) > limits.groupRadius)) {
      broken.push("a group wider than its radius");
    }
    const gaps = groupTiles.flatMap((other, at) =>
      at === index ? [] : [gapBetween(groupTiles[index], other)],
    );
    if (gaps.some((gap) => gap < limits.channelGap.min)) broken.push("two groups too close");
    if (gaps.length > 0 && Math.min(...gaps) > limits.channelGap.max) {
      broken.push("a group too far from the others");
    }
  }

  const oracle = tiles.filter((tile) => tile.terrain === "oracle");
  if (
    oracle.some((tile) => land.some((island) => gapBetween([tile], island) < limits.groupGap.min))
  ) {
    broken.push("the oracle's islet touching an island");
  }
  if (tiles.some((tile) => hexDistance(tile, origin) > limits.mapRadius)) {
    broken.push("land beyond the map radius");
  }
  const aspect = boardAspect(tiles);
  if (!within(aspect, limits.aspect)) broken.push(`a board ${aspect.toFixed(2)} wide to high`);
  if (groups.length > 1 && widestGroupAngle(groupTiles) > limits.maxGroupAngle) {
    broken.push("groups in a row");
  }

  for (const [index, tiles] of groupTiles.entries()) {
    for (const resource of yieldedResources(byKey.values())) {
      if (!tiles.some((tile) => tile.resource?.type === resource)) {
        broken.push(`group ${index} without ${resource}`);
      }
    }
  }
  if (land.some((island) => island.filter((tile) => isLandmark(tile, tiles)).length > 1)) {
    broken.push("two landmarks on one island");
  }

  return broken;
}

/** Width over height of the drawn board, at the renderer's pointy-top hex. */
export function boardAspect(tiles: readonly AxialCell[]) {
  const points = tiles.map(({ q, r }) => axialToPlane(q, r));
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return (
    (Math.max(...xs) - Math.min(...xs) + Math.sqrt(3)) / (Math.max(...ys) - Math.min(...ys) + 2)
  );
}

/** The widest angle between neighbouring groups' middles, seen from the board's centre. */
function widestGroupAngle(groupTiles: readonly AxialCell[][]) {
  const angles = groupTiles
    .map((tiles) => {
      const { x, y } = centroid(tiles);
      return (Math.atan2(y, x) * 180) / Math.PI;
    })
    .sort((a, b) => a - b);
  return Math.max(
    ...angles.map((angle, index) =>
      index === 0 ? angle + 360 - angles[angles.length - 1] : angle - angles[index - 1],
    ),
  );
}

type Card = Pick<HexTile, "slots" | "resource">;

/** A landmark is a tile with the most slots of the terrain it yields from: the breadbasket,
 *  the quarry and the two old-growth forests on today's deck. */
function isLandmark(tile: Card, tiles: readonly Card[]) {
  const kind = tile.resource?.type;
  return (
    kind !== undefined &&
    tile.slots ===
      Math.max(
        ...tiles.filter((other) => other.resource?.type === kind).map((other) => other.slots),
      )
  );
}

function yieldedResources(tiles: Iterable<Card>) {
  return [...new Set([...tiles].flatMap((tile) => (tile.resource ? [tile.resource.type] : [])))];
}

function centroid(tiles: readonly AxialCell[]) {
  const points = tiles.map(({ q, r }) => axialToPlane(q, r));
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

/** The hex cell holding a point of the plane (cube rounding). */
function planeToAxial({ x, y }: { x: number; y: number }): AxialCell {
  const fq = (x * Math.sqrt(3)) / 3 - y / 3;
  const fr = (2 * y) / 3;
  const fs = -fq - fr;
  let q = Math.round(fq);
  let r = Math.round(fr);
  const s = Math.round(fs);
  const dq = Math.abs(q - fq);
  const dr = Math.abs(r - fr);
  const ds = Math.abs(s - fs);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return { q: q + 0, r: r + 0 };
}

// ── Drawing the islands ──────────────────────────────────────────────────────────────

/** How many hexes from the centre a group's first island is centred. */
const FIRST_ISLAND_DISTANCE = 3;
/** How far a group's heading may stray from even spacing, as a share of its sector. */
const HEADING_JITTER = 0.2;
/** Island centres tried before a draw is given up. */
const CENTRES_TRIED = 30;

type Draw = ReturnType<typeof seededDraw>;

function drawIslands(
  rng: Draw,
  land: number,
  limits: ArchipelagoLimits,
  hasOracle: boolean,
): AxialCell[][] | null {
  const groupCount = rng.between(limits.groups);
  const total = rng.between({
    min: Math.max(limits.islands.min, groupCount * limits.islandsPerGroup.min),
    max: Math.min(limits.islands.max, groupCount * limits.islandsPerGroup.max),
  });
  const counts = share(rng, total, groupCount, limits.islandsPerGroup);
  const smallest = limits.islet ? limits.islandSize.min : Math.max(2, limits.islandSize.min);
  const sizes = share(rng, land, total, { min: smallest, max: limits.islandSize.max });
  if (!counts || !sizes) return null;
  let next = 0;
  const plan = counts.map((count) => sizes.slice(next, (next += count)).sort((a, b) => b - a));

  const sector = (2 * Math.PI) / groupCount;
  const turn = rng.next() * 2 * Math.PI;
  const headings = plan.map(
    (_, group) => turn + group * sector + (rng.next() - 0.5) * sector * HEADING_JITTER,
  );
  const placed: { cells: AxialCell[]; group: number }[] = [];
  const reserved = hasOracle ? [{ q: 0, r: 0 }] : [];

  for (let order = 0; order < Math.max(...counts); order += 1) {
    for (const [group, groupSizes] of plan.entries()) {
      if (order >= groupSizes.length) continue;
      const cells = placeIsland(
        rng,
        groupSizes[order],
        group,
        headings[group],
        sector,
        placed,
        reserved,
        limits,
      );
      if (!cells) return null;
      placed.push({ cells, group });
    }
  }

  return placed.map(({ cells }) => cells);
}

/** Split `total` into `parts` numbers, each within `range`, or null when it cannot be. */
function share(rng: Draw, total: number, parts: number, range: Range) {
  if (parts * range.min > total || parts * range.max < total) return null;
  const shares = Array.from({ length: parts }, () => range.min);
  for (let left = total - parts * range.min; left > 0; left -= 1) {
    const open = shares.flatMap((size, index) => (size < range.max ? [index] : []));
    shares[open[rng.int(open.length)]] += 1;
  }
  return shares;
}

function placeIsland(
  rng: Draw,
  size: number,
  group: number,
  heading: number,
  sector: number,
  placed: readonly { cells: AxialCell[]; group: number }[],
  reserved: readonly AxialCell[],
  limits: ArchipelagoLimits,
): AxialCell[] | null {
  const radius = islandRadius(size);
  const kin = placed.filter((island) => island.group === group).flatMap(({ cells }) => cells);
  const origin = { q: 0, r: 0 };

  const open = (cell: AxialCell) => {
    if (hexDistance(cell, origin) > limits.mapRadius) return false;
    if (Math.abs(angleBetween(angleOf(cell), heading)) > sector / 2) return false;
    if (reserved.some((other) => hexDistance(cell, other) <= limits.groupGap.min)) return false;
    return placed.every(({ cells, group: other }) => {
      const nearest = Math.min(...cells.map((tile) => hexDistance(cell, tile)));
      return nearest > (other === group ? limits.groupGap.min : limits.channelGap.min);
    });
  };

  const aim =
    kin.length === 0
      ? planeToAxial({
          x: FIRST_ISLAND_DISTANCE * Math.sqrt(3) * Math.cos(heading),
          y: FIRST_ISLAND_DISTANCE * Math.sqrt(3) * Math.sin(heading),
        })
      : planeToAxial(centroid(kin));
  const reach = kin.length === 0 ? 1 : radius + limits.groupGap.max + 1;
  const centres = cellsAround(aim, kin.length === 0 ? 1 : limits.groupRadius)
    .filter(
      (cell) =>
        open(cell) && (kin.length === 0 || kin.some((tile) => hexDistance(cell, tile) <= reach)),
    )
    .map((cell) => ({
      cell,
      order: hexDistance(cell, aim) + hexDistance(cell, origin) + rng.next() * 2,
    }))
    .sort((a, b) => a.order - b.order)
    .slice(0, CENTRES_TRIED);

  for (const { cell: centre } of centres) {
    const cells = growIsland(rng, centre, size, radius, open);
    if (cells && (kin.length === 0 || gapBetween(cells, kin) <= limits.groupGap.max)) return cells;
  }
  return null;
}

/** Grow an island tile by tile from its centre, inside the centre's disc, preferring the
 *  cells that touch the most of it so it grows round. */
function growIsland(
  rng: Draw,
  centre: AxialCell,
  size: number,
  radius: number,
  open: (cell: AxialCell) => boolean,
): AxialCell[] | null {
  const cells = [centre];
  const key = ({ q, r }: AxialCell) => `${q},${r}`;
  const taken = new Set([key(centre)]);

  while (cells.length < size) {
    const options = new Map<string, { cell: AxialCell; weight: number }>();
    for (const tile of cells) {
      for (const step of AXIAL_DIRECTIONS) {
        const cell = { q: tile.q + step.q, r: tile.r + step.r };
        const id = key(cell);
        if (taken.has(id) || hexDistance(cell, centre) > radius || !open(cell)) continue;
        const option = options.get(id) ?? { cell, weight: 0 };
        option.weight += 1;
        options.set(id, option);
      }
    }
    if (options.size === 0) return null;
    const weighted = [...options.values()];
    let pick = rng.next() * weighted.reduce((sum, option) => sum + option.weight ** 2, 0);
    const chosen = weighted.find((option) => (pick -= option.weight ** 2) < 0) ?? weighted[0];
    cells.push(chosen.cell);
    taken.add(key(chosen.cell));
  }
  return cells;
}

function cellsAround(centre: AxialCell, radius: number): AxialCell[] {
  const cells: AxialCell[] = [];
  for (let q = -radius; q <= radius; q += 1) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r += 1) {
      cells.push({ q: centre.q + q, r: centre.r + r });
    }
  }
  return cells;
}

function angleOf({ q, r }: AxialCell) {
  const { x, y } = axialToPlane(q, r);
  return Math.atan2(y, x);
}

function angleBetween(a: number, b: number) {
  return ((((a - b) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
}

// ── Dealing the terrain ──────────────────────────────────────────────────────────────

/**
 * Lay the deck on the islands. The oracle takes the centre. Each landmark goes to its own
 * island; each group is then given one tile of every resource it lacks, so a seat can feed
 * and build inside its group; the rest of the deck is shuffled onto the rest of the land.
 */
function dealTerrain(
  rng: Draw,
  islands: readonly AxialCell[][],
  deck: TerrainDeck,
  limits: ArchipelagoLimits,
): HexTile[] {
  const tiles = deck
    .filter((card) => card.terrain === "oracle")
    .map((card) => layCard({ q: 0, r: 0 }, card));
  const cards = rng.shuffle(deck.filter((card) => card.terrain !== "oracle"));
  const used = cards.map(() => false);
  const free = islands.map((island) => rng.shuffle([...island]));
  const laid = islands.map(() => [] as HexTile[]);
  const deal = (card: number, island: number) => {
    const tile = layCard(free[island].pop()!, cards[card]);
    laid[island].push(tile);
    tiles.push(tile);
    used[card] = true;
  };

  const islandOrder = rng.shuffle(islands.map((_, index) => index));
  cards
    .flatMap((card, index) => (isLandmark(card, cards) ? [index] : []))
    .forEach((card, index) => deal(card, islandOrder[index % islandOrder.length]));

  for (const group of groupIslands(islands, limits)) {
    for (const resource of yieldedResources(cards)) {
      const held = group.some((island) =>
        laid[island].some((tile) => tile.resource?.type === resource),
      );
      const card = cards.findIndex(
        (candidate, index) => !used[index] && candidate.resource?.type === resource,
      );
      const room = group.filter((island) => free[island].length > 0);
      if (!held && card >= 0 && room.length > 0) deal(card, room[rng.int(room.length)]);
    }
  }

  const rest = rng.shuffle(free.flatMap((cells, island) => cells.map(() => island)));
  cards.forEach((_, card) => {
    if (!used[card]) deal(card, rest.pop()!);
  });

  return tiles.sort((a, b) => a.q - b.q || a.r - b.r);
}

function layCard(cell: AxialCell, card: TerrainDeck[number]): HexTile {
  return {
    id: `${cell.q},${cell.r}`,
    q: cell.q,
    r: cell.r,
    terrain: card.terrain,
    slots: card.slots,
    resource: card.resource,
    settlements: [],
  };
}

function seededDraw(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    const step = mulberry32(state);
    state = step.state;
    return step.value;
  };
  const int = (maxExclusive: number) => Math.floor(next() * maxExclusive);
  return {
    next,
    int,
    between: ({ min, max }: Range) => min + int(max - min + 1),
    shuffle<T>(items: T[]): T[] {
      for (let index = items.length - 1; index > 0; index -= 1) {
        const swap = int(index + 1);
        [items[index], items[swap]] = [items[swap], items[index]];
      }
      return items;
    },
    state: () => state,
  };
}

/** The board dealt when every draw fails: one the generator drew (seed 8), three groups of
 *  three islands around the oracle. The deal still comes from the seed. */
const FALLBACK_ISLANDS: AxialCell[][] = [
  "-4,5 -3,5 -4,6",
  "-3,2 -2,2 -3,3 -2,3",
  "-1,4 0,4 0,3 0,2",
  "-3,-2 -2,-2 -3,-1 -2,-1",
  "-2,-4 -1,-4 -1,-5 0,-5",
  "0,-3 1,-3 0,-2 1,-2",
  "3,-1 4,-1 4,-2 5,-2 5,-3",
  "3,1 4,1 3,2 5,1 4,2",
  "4,-5 5,-5 4,-4",
].map((island) =>
  island.split(" ").map((cell) => {
    const [q, r] = cell.split(",").map(Number);
    return { q, r };
  }),
);
const FALLBACK_LAND = FALLBACK_ISLANDS.flat();
