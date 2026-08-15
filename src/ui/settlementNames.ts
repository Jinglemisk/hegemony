import type { HexTile } from "../game/types";

/**
 * Settlements have names. The engine does not know about them, and it should not
 * have to: a name is a label on a thing the engine already identifies perfectly
 * well by `settlement.id`, and adding a field would mean a save migration to
 * carry a string the rules never read.
 *
 * What matters instead is that the mapping is **deterministic and stable**. It is
 * derived from the settlement's own id, which the engine allocates sequentially
 * and persists in the save, so ARGOS is ARGOS across a reload, a rewind, and a
 * different machine. That is the same guarantee a stored name would give, at no
 * cost to the state.
 *
 * Coordinates do not disappear — they retreat to the tooltip, where "the tile at
 * -2,0" is a debugging fact rather than the settlement's identity.
 */

/**
 * The pool. Real poleis, colonies and sanctuaries of the Greek world, chosen to be
 * distinguishable at a glance in a name plate 60 pixels wide: no two begin with
 * the same three letters, and none is longer than eight characters.
 */
const POLIS_NAMES = [
  "ARGOS",
  "THERMON",
  "PYLOS",
  "NAXOS",
  "KYDONIA",
  "EPHYRA",
  "LINDOS",
  "SIKYON",
  "MEGARA",
  "OLYNTHOS",
  "GORTYN",
  "ABDERA",
  "CHALKIS",
  "DELOS",
  "ELIS",
  "IOLKOS",
  "SAMOS",
  "TEGEA",
  "ZANKLE",
  "HALIKA",
  "KORONE",
  "BOURA",
  "PHLIOUS",
  "RHODOS",
  "NEMEA",
  "WEPSOS",
  "ULIA",
  "VOUNI",
  "AIGAI",
  "DION",
  "ERETRIA",
  "FOKIS",
] as const;

/** A small deterministic hash. Not cryptographic — it only has to spread ids so
 *  four seats founding in the same round do not get four alphabetical neighbours. */
function hash(value: string): number {
  let accumulated = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    accumulated ^= value.charCodeAt(index);
    accumulated = Math.imul(accumulated, 16777619);
  }

  return accumulated >>> 0;
}

/**
 * Every settlement on the board, named. Collisions are resolved by probing
 * forward through the pool, and settlements are visited in id order so the answer
 * never depends on which tile happened to be read first.
 *
 * Memoised on the tiles array's identity. The whole board has to be seen at once
 * to guarantee uniqueness, so this cannot be computed per settlement — and it is
 * asked for from the map, the ledger and half a dozen pickers on every render.
 * `G.board.tiles` is frozen and only replaced when the board actually changes,
 * which makes identity the correct cache key.
 */
let cached: { tiles: readonly HexTile[]; names: Map<string, string> } | null = null;

export function settlementNames(tiles: readonly HexTile[]): Map<string, string> {
  if (cached?.tiles !== tiles) {
    cached = { tiles, names: computeSettlementNames(tiles) };
  }

  return cached.names;
}

/** The name of one settlement, for the surfaces that only hold a single one. */
export function settlementNameOf(tiles: readonly HexTile[], settlementId: string): string {
  return settlementNames(tiles).get(settlementId) ?? "POLIS";
}

function computeSettlementNames(tiles: readonly HexTile[]): Map<string, string> {
  const settlements = tiles
    .flatMap((tile) => tile.settlements)
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id, "en", { numeric: true }));

  const names = new Map<string, string>();
  const taken = new Set<string>();

  for (const settlement of settlements) {
    const start = hash(settlement.id) % POLIS_NAMES.length;
    let name = POLIS_NAMES[start];

    for (let step = 1; taken.has(name) && step <= POLIS_NAMES.length; step += 1) {
      name = POLIS_NAMES[(start + step) % POLIS_NAMES.length];
    }

    // A board larger than the pool would loop forever without this; the fallback
    // is ugly on purpose, so it is obvious the pool needs more names.
    names.set(settlement.id, taken.has(name) ? `POLIS ${names.size + 1}` : name);
    taken.add(name);
  }

  return names;
}
