import type { ActiveEffectMechanic } from "../game/activeEffects";
import type { DirectiveEffect, LawEffect, PoliticianId } from "../game/assembly/types";
import type { NationalIdeaId } from "../game/ideaTypes";
import type {
  BuildingEffect,
  BuildingId,
  EventEffect,
  EventTableId,
  LuxuryGoodId,
  PopType,
  Stat,
  SettlementKind,
  TableEffect,
  Terrain,
  YearCard,
  YearTerm,
} from "../game/types";
import type { UnrestStatus } from "../game/unrest";
import type { ageEndRanking } from "../game/victory";
import type { VerbId } from "../components/board/command/verbs";
import type { GlyphId } from "./icons/glyphs";

/**
 * Meaning → glyph. One projection over the same discriminated unions the engine
 * and the presenters already speak, sitting beside `ui/effects.ts` (which turns
 * an effect into a sentence) and doing the other half of the job.
 *
 * **Every map here is total.** They are typed `satisfies Record<Union, GlyphId>`,
 * so adding a case to `LawEffect` and forgetting its icon is a compile error, not
 * a question mark rendered at runtime. `iconRegistry.test.ts` additionally asserts
 * that no two members of the SAME family share a glyph — that is what "a dedicated
 * icon per effect" means in practice, and a totality check alone would happily
 * accept eleven law effects all pointing at one shrug. Since ICON-1 that assertion
 * covers the noun families too — they were exempt only because a sprite atlas, not
 * this registry, was drawing them.
 *
 * Sharing ACROSS families is intended and load-bearing: `forest` terrain and the
 * `wood` resource are one tree because they are one thing. When two entries in
 * different maps point at the same glyph, that is a claim about the game, not a
 * shortcut.
 */

/* ── Nouns ─────────────────────────────────────────────────────────────────── */

export const RESOURCE_GLYPHS = {
  wood: "wood",
  stone: "stone",
  gold: "gold",
  food: "food",
  influence: "influence",
  happiness: "happiness",
} as const satisfies Record<Stat, GlyphId>;

export const POP_GLYPHS = {
  citizens: "citizens",
  freemen: "freemen",
  slaves: "slaves",
} as const satisfies Record<PopType, GlyphId>;

export const SETTLEMENT_GLYPHS = {
  capital: "capital",
  city: "city",
  colony: "colony",
} as const satisfies Record<SettlementKind, GlyphId>;

/** Forest is the wood tree and the mountain is the stone ridge on purpose: a tile
 *  and the thing it yields should not be two different pictures. */
export const TERRAIN_GLYPHS = {
  plains: "plains",
  hill: "hill",
  forest: "wood",
  mountain: "mountain",
  oracle: "oracle",
} as const satisfies Record<Terrain, GlyphId>;

export const VERB_GLYPHS = {
  grow: "grow",
  move: "move",
  found: "found",
  upgrade: "upgrade",
  build: "build",
  calm: "calm",
  venture: "venture",
} as const satisfies Record<VerbId, GlyphId>;

/** Six buildings, six drawings: no two share a picture. */
export const BUILDING_GLYPHS = {
  marketplace: "marketplace",
  estate: "estate",
  forum: "forum",
  temple: "temple",
  granary: "granary",
  port: "port",
} as const satisfies Record<BuildingId, GlyphId>;

export const POLITICIAN_GLYPHS = {
  demosthenes: "demosthenes",
  perdiccas: "perdiccas",
  kleistophenes: "kleistophenes",
  stratokles: "stratokles",
} as const satisfies Record<PoliticianId, GlyphId>;

export const EVENT_TABLE_GLYPHS = {
  riot: "riot",
  merchantConvoy: "convoy",
  grandEmbassy: "embassy",
  colonistsVoyage: "venture",
} as const satisfies Record<EventTableId, GlyphId>;

/* ── The effect grammar ─────────────────────────────────────────────────────
   Five closed effect vocabularies plus the active-effect mechanics. Each entry
   answers "what KIND of change is this", never "is it good" — judgment is the
   signed coloured numeral's job, and an icon that carried it would be saying the
   same thing twice in a way colour-blind players cannot read. */

export const EVENT_EFFECT_GLYPHS = {
  resourceDelta: "stockpile",
  unrestTokens: "happiness",
  addPops: "popGain",
} as const satisfies Record<EventEffect["type"], GlyphId>;

export const TABLE_EFFECT_GLYPHS = {
  none: "minus",
  losePops: "popLoss",
  loseResource: "loss",
  destroyBuilding: "ruin",
  gainResource: "gain",
  gainPop: "popGain",
} as const satisfies Record<TableEffect["type"], GlyphId>;

export const LAW_EFFECT_GLYPHS = {
  actionCost: "costDown",
  calmPayment: "calm",
  colonyCapacity: "colony",
  buildingFood: "food",
  happiness: "happiness",
  settlementIncome: "cityIncome",
  onFoundColony: "found",
  realmIncome: "income",
  extraSlots: "build",
  colonyPieces: "plus",
  acquirePop: "popGain",
  acquireResource: "gold",
  onUpgradeCity: "upgrade",
  dolePrice: "treasury",
  slotExempt: "port",
  votePurchaseLimit: "bribe",
  popIncome: "crowd",
  slaveResource: "slaves",
  slaveUnrestWeight: "unhappiness",
  buildingForbidden: "cross",
  buildingIdle: "suppress",
  colonyBuildings: "city",
  colonyLimit: "minus",
  growLimit: "grow",
  settlementVotes: "ostrakon",
} as const satisfies Record<LawEffect["type"], GlyphId>;

export const DIRECTIVE_EFFECT_GLYPHS = {
  unrestTokens: "happiness",
  resourceDelta: "stockpile",
  losePopFromLargest: "popLoss",
  suppressIncome: "suppress",
  repealNewestTargetLaw: "repeal",
  equalVotesNextAssembly: "equalVotes",
} as const satisfies Record<DirectiveEffect["type"], GlyphId>;

/** A class building's effect is its class's output, so it wears the yield mark. */
export const BUILDING_EFFECT_GLYPHS = {
  classOutput: "tileYield",
  income: "income",
  happiness: "happiness",
} as const satisfies Record<BuildingEffect["type"], GlyphId>;

export const ACTIVE_EFFECT_MECHANIC_GLYPHS = {
  suppressIncome: "suppress",
  /** The grain, struck through. The one effect the player must never misread. */
  hunger: "starvation",
  /** The year's card strikes a whole term out. */
  zeroTerm: "cross",
  standingLaw: "law",
  equalVotesNextAssembly: "equalVotes",
} as const satisfies Record<ActiveEffectMechanic["type"], GlyphId>;

/**
 * Every family, by name, so the totality test can walk them without a hand-kept
 * list going stale the moment someone adds a seventh vocabulary.
 */
export const ICON_REGISTRY_FAMILIES = {
  resource: RESOURCE_GLYPHS,
  pop: POP_GLYPHS,
  settlement: SETTLEMENT_GLYPHS,
  terrain: TERRAIN_GLYPHS,
  verb: VERB_GLYPHS,
  building: BUILDING_GLYPHS,
  politician: POLITICIAN_GLYPHS,
  eventTable: EVENT_TABLE_GLYPHS,
  eventEffect: EVENT_EFFECT_GLYPHS,
  tableEffect: TABLE_EFFECT_GLYPHS,
  lawEffect: LAW_EFFECT_GLYPHS,
  directiveEffect: DIRECTIVE_EFFECT_GLYPHS,
  buildingEffect: BUILDING_EFFECT_GLYPHS,
  activeEffectMechanic: ACTIVE_EFFECT_MECHANIC_GLYPHS,
} as const satisfies Record<string, Readonly<Record<string, GlyphId>>>;

/** The families whose keys are effect discriminants — the ones the plan requires
 *  a dedicated glyph for, and the ones the parity suite gates on. */
export const EFFECT_REGISTRY_FAMILIES = [
  "eventEffect",
  "tableEffect",
  "lawEffect",
  "directiveEffect",
  "buildingEffect",
  "activeEffectMechanic",
] as const satisfies readonly (keyof typeof ICON_REGISTRY_FAMILIES)[];

/* ── Lookup ────────────────────────────────────────────────────────────────── */

/** An effect plus which vocabulary it came from — the two facts needed to pick a
 *  glyph. Callers pass the effect they already hold rather than a glyph name, so
 *  assignment stays in this file and the unions are narrowed in exactly one place. */
export type EffectIconTarget =
  | { family: "event"; effect: EventEffect }
  | { family: "table"; effect: TableEffect }
  | { family: "law"; effect: LawEffect }
  | { family: "directive"; effect: DirectiveEffect }
  | { family: "building"; effect: BuildingEffect }
  | { family: "activeMechanic"; effect: ActiveEffectMechanic };

/**
 * The glyph a card's blow band leads with.
 *
 * `EVENT_EFFECT_GLYPHS` says what KIND of change an effect is, which is the right
 * answer in a ledger row where the kind is the distinguishing fact. On the card
 * the player has one effect in front of them, the subject word sits right beside
 * the figure, and the crate beside "+1 Stone" read as a stray building. When the
 * effect is about one resource, the resource's own glyph leads — the same one the
 * topbar, the chronicle and every annotated sentence draw for it. Effects with no
 * single resource (a pop gain, a cost discount, an exchange, a choice) keep the
 * kind glyph.
 */
export function eventBlowGlyph(effect: EventEffect): GlyphId {
  switch (effect.type) {
    case "resourceDelta":
      return RESOURCE_GLYPHS[effect.resource];
    case "unrestTokens":
      return RESOURCE_GLYPHS.happiness;
    default:
      return EVENT_EFFECT_GLYPHS[effect.type];
  }
}

export function effectGlyph(target: EffectIconTarget): GlyphId {
  switch (target.family) {
    case "event":
      return EVENT_EFFECT_GLYPHS[target.effect.type];
    case "table":
      return TABLE_EFFECT_GLYPHS[target.effect.type];
    case "law":
      return LAW_EFFECT_GLYPHS[target.effect.type];
    case "directive":
      return DIRECTIVE_EFFECT_GLYPHS[target.effect.type];
    case "building":
      return BUILDING_EFFECT_GLYPHS[target.effect.type];
    case "activeMechanic":
      return ACTIVE_EFFECT_MECHANIC_GLYPHS[target.effect.type];
  }
}

/* ── The frame's rasters ─────────────────────────────────────────────────────
   The v2 frame names its icons by `family/name` raster path (`rasterIcon`, the
   mock's vocabulary) rather than by glyph. Its per-ID families live here, total
   over the same unions, so a building or an Idea without a picture fails to
   compile instead of falling back to a stand-in. `iconRegistry.test.ts` holds
   them to the glyph families' rules: one picture per member, and a file behind
   every path. */

export const RESOURCE_RASTERS = {
  wood: "resources/wood",
  stone: "resources/stone",
  food: "resources/food",
  gold: "resources/gold",
  influence: "resources/influence",
  happiness: "resources/happiness",
} as const satisfies Record<Stat, string>;

/** Luxury goods as a kind wear the one picture. */
export const LUXURY_RASTER = "resources/luxury";

/** Each good's own picture, on the map's Trade mode and its key. Hand-drawn placeholder
 *  glyphs until the bronze set draws them at these paths. */
export const LUXURY_GOOD_RASTERS = {
  "tyrian-dye": "resources/luxury/tyrian-dye",
  pearls: "resources/luxury/pearls",
  coral: "resources/luxury/coral",
  glassware: "resources/luxury/glassware",
  incense: "resources/luxury/incense",
  "fine-linen": "resources/luxury/fine-linen",
  silphium: "resources/luxury/silphium",
} as const satisfies Record<LuxuryGoodId, string>;

/** The unrest disc's tier; a calm realm shows none. */
export const UNREST_TIER_RASTERS = {
  discontent: "unrest/discontent",
  unrest: "unrest/unrest",
  revolt: "unrest/revolt",
} as const satisfies Record<Exclude<UnrestStatus["tier"], "calm">, string>;

export const POP_RASTERS = {
  slaves: "pops/slaves",
  freemen: "pops/freemen",
  citizens: "pops/citizens",
} as const satisfies Record<PopType, string>;

export const BUILDING_RASTERS = {
  marketplace: "buildings/marketplace",
  temple: "buildings/temple",
  granary: "buildings/granary",
  forum: "buildings/forum",
  estate: "buildings/estate",
  port: "buildings/port",
} as const satisfies Record<BuildingId, string>;

/** Each National Idea's raster: the thing it gives. */
export const IDEA_RASTERS = {
  "good-harvest": "resources/food",
  "public-dole": "unrest/bread-dole",
  "urban-planning": "settlements/city",
  "capital-works": "settlements/capital",
  "civic-tradition": "resources/influence",
  "frontier-charter": "settlements/colony",
  "new-settlers": "pops/freemen",
  "city-pioneers": "settlements/upgrade",
  "slave-colonies": "pops/slaves",
  "harbour-planning": "resources/luxury",
  "treasury-grant": "resources/gold",
  "assembly-brokers": "assembly/bribe",
} as const satisfies Record<NationalIdeaId, string>;

/** The term a year card strikes out: the land or the class that yields it. */
export const YEAR_TERM_RASTERS = {
  plainsFood: "terrain/plains",
  forestWood: "terrain/forest",
  mountainStone: "terrain/mountain",
  freemenGold: "pops/freemen",
  citizenInfluence: "pops/citizens",
  luxuryHappiness: "resources/luxury",
} as const satisfies Record<YearTerm, string>;

/** What broke an age-end tie; a win on titles needs no tiebreak line. */
export const TIEBREAK_RASTERS = {
  happiness: "resources/happiness",
  pops: "pops/crowd",
  seat: "victory/laurel",
} as const satisfies Record<
  Exclude<ReturnType<typeof ageEndRanking>["decidedBy"], "titles">,
  string
>;

/** An active effect's alarm disc: what the mechanic moves. */
export const ACTIVE_EFFECT_MECHANIC_RASTERS = {
  suppressIncome: "market/income-suppressed",
  hunger: "resources/food",
  zeroTerm: "events/year",
  standingLaw: "assembly/law",
  equalVotesNextAssembly: "assembly/vote",
} as const satisfies Record<ActiveEffectMechanic["type"], string>;

export const RASTER_REGISTRY_FAMILIES = {
  resource: RESOURCE_RASTERS,
  luxury: { good: LUXURY_RASTER },
  luxuryGood: LUXURY_GOOD_RASTERS,
  unrestTier: UNREST_TIER_RASTERS,
  pop: POP_RASTERS,
  building: BUILDING_RASTERS,
  idea: IDEA_RASTERS,
  yearTerm: YEAR_TERM_RASTERS,
  tiebreak: TIEBREAK_RASTERS,
  activeEffectMechanic: ACTIVE_EFFECT_MECHANIC_RASTERS,
} as const satisfies Record<string, Readonly<Record<string, string>>>;

/** What a year card strikes, as the badge on its alarm disc and its blow's icon. */
export function yearCardIcon(card: YearCard): string {
  if (card.effect.type === "zeroTerm") return YEAR_TERM_RASTERS[card.effect.term];
  return card.effect.change === "placeOne" ? "unrest/unrest" : "unrest/calm";
}
