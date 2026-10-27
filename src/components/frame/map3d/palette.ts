import type { PlayerId, Terrain } from "../../../game/types";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";

/**
 * The living map's fired colours, as three.js takes them. The scene is art, like the
 * icons, so its values live here rather than in the token table; the sea, the ink and
 * the ochre are the tokens' own (--sea, --sea-lit, --sea-deep, --ink, --ochre).
 */

/** Each terrain's glaze; a tile is drawn half way from its glaze to bone. */
export const GLAZE: Record<Terrain, number> = {
  plains: 0xd8be73,
  forest: 0x75824a,
  hill: 0xc08243,
  mountain: 0xa8a290,
  oracle: 0xede4cd,
};
export const BONE = 0xe2d4b6;
export const INK = 0x241910;
export const OCHRE = 0xd98a35;
export const VASE_BLACK = 0x181210;
/** A ship's dashed route over the water. */
export const ROUTE = 0xfff8e7;
/** The Oracle's vapour. */
export const VAPOUR = 0xf6f1e6;
/** Smoke from a town's hearths, and from a riot. */
export const SMOKE = { hearth: 0xe6ddcc, riot: 0x3f3832 };
/** A trade ship's dotted route. */
export const TRADE_ROUTE = 0xf2d28a;

export const SEA = {
  lit: 0x2e8a9a,
  sea: 0x206e7c,
  deep: 0x17505c,
  shallow: 0x4aa3ac,
  foam: 0xf4ecd8,
  /** The dark joint between the tiles. */
  grout: 0x123b44,
};

export const LIGHT = { sky: 0xfff1d6, ground: 0x2b5d66, sun: 0xfff0d2 };

/** The Painted bronze materials at their middle stops, plus quiet ground tones for
 *  the terrain. */
export const MATERIAL = {
  marble: 0xf3e8cd,
  stone: 0xb9b09a,
  rock: 0x9c8b6e,
  crag: 0xa49b86,
  quarry: 0xd2c9b3,
  clay: 0xc08243,
  clayDark: 0x9a5a30,
  clayLight: 0xd59865,
  bronze: 0xc49245,
  timber: 0xc19a61,
  bark: 0x8f5e35,
  door: 0x3a2a1e,
  linen: 0xe3d4ad,
  /** An offering bearer's robe. */
  ochre: 0xb59a70,
  skin: 0xc38d5e,
  leaf: 0x7d8f51,
  leafSoft: 0x74844e,
  leafDark: 0x56663b,
  wheat: 0xd8be73,
  stubble: 0xc2a96f,
  earth: 0x8a6a48,
  grainBase: 0x9f7937,
  grainStem: 0xc5a34e,
  grainLeaf: 0xd4b45f,
  grainHead: 0xf0d891,
  grainGold: 0xe1c473,
  townSoil: 0xb9a37a,
  pathSoil: 0xcdbc97,
  gold: 0xd8b45e,
  /** Tinted per instance with the owner's glaze. */
  owner: 0xffffff,
};

/** What glows: a riot torch's flame, which the sun does not shade. */
export const GLOW = { flame: 0xe8ad50, flameCore: 0xfff0b0 };

export type MaterialName = keyof typeof MATERIAL | keyof typeof GLOW;

/** A seat's glaze, as a number. */
export const glazeOf = (owner: PlayerId) => parseInt(PLAYER_GLAZES[owner].color.slice(1), 16);
