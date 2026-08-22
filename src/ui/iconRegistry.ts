import type { ActiveEffectMechanic } from "../game/activeEffects";
import type { DirectiveEffect, LawEffect, PoliticianId } from "../game/assembly/types";
import type {
  BuildingEffect,
  BuildingId,
  EventEffect,
  EventTableId,
  PopType,
  Resource,
  SeasonName,
  SettlementKind,
  TableEffect,
  Terrain,
} from "../game/types";
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
} as const satisfies Record<Resource, GlyphId>;

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

export const SEASON_GLYPHS = {
  spring: "spring",
  summer: "summer",
  autumn: "autumn",
  winter: "winter",
} as const satisfies Record<SeasonName, GlyphId>;

export const VERB_GLYPHS = {
  grow: "grow",
  move: "move",
  found: "found",
  upgrade: "upgrade",
  build: "build",
  calm: "calm",
  venture: "venture",
} as const satisfies Record<VerbId, GlyphId>;

/** Nine rooflines, nine drawings. The sprite atlas these replaced had four painted
 *  building cells and aliased five buildings onto them (forum→marketplace,
 *  aqueduct/villa→granary, odeon/gymnasion→temple) — which is what a family sitting
 *  outside the no-duplicate test looks like from the player's side of the screen. */
export const BUILDING_GLYPHS = {
  marketplace: "marketplace",
  temple: "temple",
  workshop: "workshop",
  granary: "granary",
  forum: "forum",
  aqueduct: "aqueduct",
  odeon: "odeon",
  villa: "villa",
  gymnasion: "gymnasion",
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
  omen: "omen",
} as const satisfies Record<EventTableId, GlyphId>;

/* ── The effect grammar ─────────────────────────────────────────────────────
   Five closed effect vocabularies plus the active-effect mechanics. Each entry
   answers "what KIND of change is this", never "is it good" — judgment is the
   signed coloured numeral's job, and an icon that carried it would be saying the
   same thing twice in a way colour-blind players cannot read. */

export const EVENT_EFFECT_GLYPHS = {
  /** Your stores change, now. */
  resourceDelta: "stockpile",
  /** Scaled by how many people you have — a crowd, not a person. */
  scaledResourceDelta: "crowd",
  happinessDelta: "happiness",
  scaledHappinessDelta: "moodCrowd",
  /** The distinguishing feature is that it ticks: the hourglass, not the mask. */
  timedHappinessDelta: "hourglass",
  incomeModifier: "income",
  buildingCostMultiplier: "cross",
  addPops: "popGain",
  actionCostDiscount: "costDown",
  resourceExchange: "exchange",
  /** Per single pop, with a floor — one figure and its share. */
  resourceDeltaPerPop: "perPop",
  choice: "choice",
} as const satisfies Record<EventEffect["type"], GlyphId>;

export const TABLE_EFFECT_GLYPHS = {
  none: "minus",
  losePops: "popLoss",
  loseResource: "loss",
  destroyBuilding: "ruin",
  gainResource: "gain",
  gainPop: "popGain",
  /** A whole year of it — the year dial, not the plain income cycle. */
  yearIncomeModifier: "yearCycle",
} as const satisfies Record<TableEffect["type"], GlyphId>;

export const LAW_EFFECT_GLYPHS = {
  settlementIncome: "cityIncome",
  popIncome: "popIncome",
  /** What the ground itself gives, per pop working it. */
  popPrimaryIncome: "tileYield",
  flatIncome: "income",
  thresholdHappiness: "threshold",
  surplusConversion: "convert",
  actionCostDelta: "costDown",
  actionCostMultiplier: "cross",
  /** The bank's scales, which are the forum's scales — one idea. */
  bankRateStep: "forum",
  yearlyFreeAction: "freeGrant",
  onFoundColony: "found",
} as const satisfies Record<LawEffect["type"], GlyphId>;

export const DIRECTIVE_EFFECT_GLYPHS = {
  resourceDelta: "stockpile",
  resourceFraction: "fraction",
  losePopFromLargest: "popLoss",
  suppressIncome: "suppress",
  repealNewestTargetLaw: "repeal",
  equalVotesNextAssembly: "equalVotes",
} as const satisfies Record<DirectiveEffect["type"], GlyphId>;

/** The three class bonuses are the three figures: a building that pays for
 *  freemen shows a freeman, not a coin. Who benefits is the point. */
export const BUILDING_EFFECT_GLYPHS = {
  freemanGoldBonus: "freemen",
  citizenInfluenceBonus: "citizens",
  slavePrimaryResourceBonus: "slaves",
  income: "income",
  happiness: "happiness",
  growPopFoodDiscount: "costDown",
  popCapacityBonus: "capacity",
  tilePrimaryResourceBonus: "tileYield",
  promoteCostReduction: "promote",
} as const satisfies Record<BuildingEffect["type"], GlyphId>;

export const ACTIVE_EFFECT_MECHANIC_GLYPHS = {
  suppressIncome: "suppress",
  /** The grain, struck through. The one effect the player must never misread. */
  foodDeficitProgress: "starvation",
  timedHappiness: "happiness",
  resourceIncome: "income",
  buildingCostMultiplier: "cross",
  actionCostDiscount: "costDown",
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
  season: SEASON_GLYPHS,
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
    case "scaledResourceDelta":
    case "resourceDeltaPerPop":
    case "incomeModifier":
      return RESOURCE_GLYPHS[effect.resource];
    case "happinessDelta":
    case "scaledHappinessDelta":
    case "timedHappinessDelta":
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
