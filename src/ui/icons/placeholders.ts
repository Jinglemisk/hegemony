import type { EmpireTab } from "../../components/board/types";
import type { UnrestStatus } from "../../game/rules";
import type { Terrain, TradableMaterial, VictoryMetric } from "../../game/types";
import type { GlyphId } from "./glyphs";

/**
 * Raster stand-ins for the glyph set: Imperator: Rome icons the owner shortlisted
 * (`icon-preview/shortlist.json`), exported to `assets/icons/placeholder/` by
 * family and concept. They are temporary — they leave when Hegemony has its own
 * art — and nothing downstream knows they exist: `Icon` asks for one by glyph and
 * draws the vector when the answer is undefined. Deleting a file here is safe.
 *
 * Two kinds of entry. `GLYPH_PLACEHOLDERS` is keyed by glyph id, so every
 * `<Icon glyph>` in the app picks its raster up for free. The concept maps below
 * it cover what the glyph set folds together on purpose (forest is the wood
 * tree; the Victory tab is the laurel; one mask for every unrest tier) and the
 * owner chose to tell apart; their call sites pass the result as `src`.
 */
const FILES = import.meta.glob("../../../assets/icons/placeholder/**/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

function placeholder(path: string): string | undefined {
  return FILES[`../../../assets/icons/placeholder/${path}.png`];
}

const GLYPH_PLACEHOLDERS: Partial<Record<GlyphId, string | undefined>> = {
  wood: placeholder("resources/wood"),
  stone: placeholder("resources/stone"),
  gold: placeholder("resources/gold"),
  food: placeholder("resources/food"),
  influence: placeholder("resources/influence"),
  happiness: placeholder("resources/happiness"),
  unhappiness: placeholder("resources/unhappiness"),
  stockpile: placeholder("resources/stockpile"),

  citizens: placeholder("pops/citizens"),
  freemen: placeholder("pops/freemen"),
  slaves: placeholder("pops/slaves"),
  promote: placeholder("pops/promote"),
  demote: placeholder("pops/demote"),
  crowd: placeholder("pops/crowd"),
  popGain: placeholder("pops/pop-gain"),
  popLoss: placeholder("pops/pop-loss"),
  capacity: placeholder("pops/capacity"),
  // Grow adds a pop; the owner approved the one picture for both.
  grow: placeholder("pops/pop-gain"),
  move: placeholder("pops/move"),

  capital: placeholder("settlements/capital"),
  city: placeholder("settlements/city"),
  colony: placeholder("settlements/colony"),
  found: placeholder("settlements/found"),
  upgrade: placeholder("settlements/upgrade"),

  marketplace: placeholder("buildings/marketplace"),
  temple: placeholder("buildings/temple"),
  workshop: placeholder("buildings/workshop"),
  granary: placeholder("buildings/granary"),
  forum: placeholder("buildings/forum"),
  aqueduct: placeholder("buildings/aqueduct"),
  odeon: placeholder("buildings/odeon"),
  villa: placeholder("buildings/villa"),
  gymnasion: placeholder("buildings/gymnasion"),
  build: placeholder("buildings/build"),
  ruin: placeholder("buildings/ruin"),

  plains: placeholder("terrain/plains"),
  hill: placeholder("terrain/hill"),
  mountain: placeholder("terrain/mountain"),
  oracle: placeholder("terrain/oracle"),

  income: placeholder("market/income"),
  suppress: placeholder("market/income-suppressed"),
  costUp: placeholder("market/cost-up"),
  costDown: placeholder("market/cost-down"),

  calm: placeholder("unrest/calm-verb"),
  starvation: placeholder("unrest/starvation"),
  riot: placeholder("unrest/riot"),

  law: placeholder("assembly/law"),
  repeal: placeholder("assembly/repeal"),
  veto: placeholder("assembly/veto"),
  bribe: placeholder("assembly/bribe"),
  voice: placeholder("assembly/voice"),
  bema: placeholder("assembly/agora"),

  die: placeholder("events/die"),
  venture: placeholder("events/venture"),
  convoy: placeholder("events/convoy"),
  embassy: placeholder("events/embassy"),

  laurel: placeholder("victory/laurel"),
  chronicle: placeholder("chrome/chronicle"),
  codex: placeholder("chrome/codex"),
};

export function glyphPlaceholder(glyph: GlyphId): string | undefined {
  return GLYPH_PLACEHOLDERS[glyph];
}

/** Forest gets its own picture here; the registry gives it the wood tree. */
export const TERRAIN_PLACEHOLDERS: Record<Terrain, string | undefined> = {
  plains: placeholder("terrain/plains"),
  forest: placeholder("terrain/forest"),
  mountain: placeholder("terrain/mountain"),
  hill: placeholder("terrain/hill"),
  oracle: placeholder("terrain/oracle"),
};

/** One picture per victory card, not the metric's own resource glyph. */
export const VICTORY_PLACEHOLDERS: Record<VictoryMetric, string | undefined> = {
  cities: placeholder("victory/polis-builder"),
  pops: placeholder("victory/demos"),
  citizens: placeholder("victory/civic-elite"),
  stockpile: placeholder("victory/treasurer"),
  happiness: placeholder("victory/beloved"),
  voice: placeholder("victory/voice"),
};

/** The alarm's mask, per tier. Discontent has no icon of its own yet and wears
 *  the alarm's warning. */
export const UNREST_TIER_PLACEHOLDERS: Record<UnrestStatus["tier"], string | undefined> = {
  calm: placeholder("unrest/calm"),
  discontent: placeholder("unrest/alarm"),
  unrest: placeholder("unrest/unrest"),
  revolt: placeholder("unrest/revolt"),
};

/** The bank's buttons: the material's own icon with a plus (buy) or minus (sell). */
export const TRADE_PLACEHOLDERS: Record<
  "buy" | "sell",
  Record<TradableMaterial, string | undefined>
> = {
  buy: {
    wood: placeholder("market/buy-wood"),
    stone: placeholder("market/buy-stone"),
    food: placeholder("market/buy-food"),
  },
  sell: {
    wood: placeholder("market/sell-wood"),
    stone: placeholder("market/sell-stone"),
    food: placeholder("market/sell-food"),
  },
};

/** Tabs whose raster is not the raster of the glyph they share with a noun. */
export const TAB_PLACEHOLDERS: Partial<Record<EmpireTab, string | undefined>> = {
  pops: placeholder("pops/crowd"),
  buildings: placeholder("chrome/tab-build"),
  market: placeholder("chrome/tab-market"),
  victory: placeholder("chrome/tab-victory"),
};

export const ASSEMBLY_PLACEHOLDERS = {
  propose: placeholder("assembly/propose"),
  pass: placeholder("assembly/pass"),
} as const;

export const CHROME_PLACEHOLDERS = {
  settings: placeholder("chrome/settings"),
} as const;
