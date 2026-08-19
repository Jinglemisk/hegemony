import type { Phase } from "../../../client/controller";
import { getCivicCalmStatus } from "../../../game/civic";
import { getBuildings } from "../../../game/content";
import { POP_TYPES } from "../../../game/core/pops";
import { getAdjustedActionCost, getDiscountedGrowPopCost } from "../../../game/economy/cost";
import { getFoundColonyStatus, getUpgradeColonyToCityStatus } from "../../../game/rules";
import type { HegemonyState, PlayerId, Resource, Resources } from "../../../game/types";
import type { MapSelectionMode } from "../map/mapSelection";

/**
 * The action verbs as data (ladder rung R3). Every verb was a hand-written
 * <button> that repeated the same disabled expression, the same title ladder and
 * the same icon/label/cost body — so adding a verb meant copying forty lines, and
 * moving the bar meant moving all of them.
 *
 * Now: a verb is a row in VERBS, <CommandVerb> renders it, and the bar's *home* is
 * whatever component maps over the array. That is what makes the Q17 relocation
 * (side panel → bottom command bar) a layout change rather than a rewrite.
 */

/** Everything a verb needs to decide whether it is available and what it costs. */
export type VerbContext = {
  G: HegemonyState;
  playerID: PlayerId;
  phase: Phase;
  isActive: boolean;
  hasPendingPlayerEvent: boolean;
  canGrowPops: boolean;
  canMovePops: boolean;
  canFoundColony: boolean;
  canUpgradeCity: boolean;
  canBuild: boolean;
  /**
   * Which verb currently owns the map, if any.
   *
   * It used to be two booleans, `isFoundColonyActive` and `isBuildActive` — so
   * only those two verbs could show they were armed, and Grow and Move dimmed
   * the map and lit targets while the bar said nothing and told a screen reader
   * nothing (QA-DOCK-2). One field for one fact: at most one verb holds the map,
   * and every verb that can hold it reads the same field.
   */
  armedVerb: VerbId | null;
  calmUsed: boolean;
  ventureUsed: boolean;
};

export type VerbHandlers = {
  onGrowPopRequest: () => void;
  onMovePopsRequest: () => void;
  onFoundColonyRequest: () => void;
  onUpgradeCityRequest: () => void;
  onBuildRequest: () => void;
  onCalmRequest: () => void;
  onVentureRequest: () => void;
};

export type VerbId = "grow" | "move" | "found" | "upgrade" | "build" | "calm" | "venture";

/**
 * Which verb a given map mode belongs to. The board arms modes; the dock shows
 * verbs; this is the one place the two vocabularies meet, so a mode can never be
 * armed without its verb going pressed.
 */
const MODE_VERBS: Partial<Record<MapSelectionMode["kind"], VerbId>> = {
  growPop: "grow",
  movePops: "move",
  foundColony: "found",
  build: "build",
};

/** The dock verb an armed map mode belongs to — `null` for a mode no verb owns
 *  (the pop ladder arms the map from the Pops page, not from the bar). */
export function armedVerbOf(mode: MapSelectionMode | undefined): VerbId | null {
  return (mode && MODE_VERBS[mode.kind]) ?? null;
}

/**
 * What a verb prints under its name.
 *
 * The showcase's rule, and it holds across the whole app: **the number you need
 * in order to decide is printed; only the arithmetic behind it is hover-only.**
 * So a verb whose price depends on what you point it at prints the RANGE or the
 * FLOOR — `2–6 food`, `from 6 stone` — never the word "varies". A price you have
 * to hover to learn is a price you cannot plan around.
 *
 * A clause is a lead word (`free`, `from`, `stake`) and/or an amount; a `span` is
 * the min–max of one resource. Two clauses read as alternatives, which is what
 * Calm's influence-or-gold is.
 */
export type VerbPriceClause = {
  lead?: string;
  amounts?: Partial<Resources>;
  span?: { resource: Resource; min: number; max: number };
};

/** Every figure below comes back from an engine query or the ruleset field that
 *  query reads, so the dock can never quote a price the press does not charge. */
export type VerbCost = (context: VerbContext) => VerbPriceClause[];

/** The settlements a target-dependent price is a range over. */
function ownedSettlements(G: HegemonyState, playerID: PlayerId) {
  return G.board.tiles.flatMap((tile) =>
    tile.settlements.filter((settlement) => settlement.owner === playerID),
  );
}

const totalUnits = (cost: Partial<Resources>) =>
  Object.values(cost).reduce((sum: number, amount) => sum + (amount ?? 0), 0);

/** Grow's food price across every settlement × pop type the player could grow.
 *  Building discounts, event coupons and Standing Laws are already inside the
 *  engine's own number — this only takes its ends. */
function growFoodSpan(context: VerbContext): VerbPriceClause[] {
  const { G, playerID } = context;
  const settlements = ownedSettlements(G, playerID);
  const foods =
    settlements.length > 0
      ? settlements.flatMap((settlement) =>
          POP_TYPES.map((pop) => getDiscountedGrowPopCost(G, playerID, settlement, pop).food ?? 0),
        )
      : // Before the first settlement stands there is nothing to discount, so the
        // ruleset's undiscounted mouths are the honest quote.
        POP_TYPES.map((pop) => G.ruleset.growPopCosts[pop].food ?? 0);

  return [{ span: { resource: "food", min: Math.min(...foods), max: Math.max(...foods) } }];
}

/** The cheapest building on the roster, priced the way `getBuildBuildingStatus`
 *  prices it. "From" is exact: nothing on the Build page costs less than this. */
function buildFloor(context: VerbContext): VerbPriceClause[] {
  const { G, playerID } = context;
  const costs = getBuildings(G.definition.content).map((building) =>
    getAdjustedActionCost(G, playerID, "buildBuilding", building.cost, building.id),
  );
  const cheapest = costs.reduce(
    (best, cost) => (totalUnits(cost) < totalUnits(best) ? cost : best),
    costs[0] ?? {},
  );

  return [{ lead: "from", amounts: cheapest }];
}

export type VerbSpec = {
  id: VerbId;
  label: string;
  /* The verb's glyph is looked up by id in ui/iconRegistry (VERB_GLYPHS) rather
     than carried here. A verb IS its id; a second field naming its picture is a
     second thing to keep in sync, and it drifted the moment the atlas retired. */
  cost?: VerbCost;
  /** Availability *beyond* the shared gate (active seat, gameplay phase, no pending event). */
  available: (context: VerbContext) => boolean;
  /** This verb takes the map when pressed, and pressing it again gives it back.
   *  Declaring it is what earns the armed styling and `aria-pressed`; the state
   *  itself is read from `armedVerb`, so no verb can define it differently. */
  arms?: true;
  /** Shown when the verb is usable. */
  hint: string | ((context: VerbContext) => string);
  /** Shown in the tooltip ladder when `available` is false, and ONLY there — a
   *  blocked reason is never printed as chrome. Optional: a verb whose blocked
   *  state needs no explanation beyond its own hint simply omits it. */
  blockedHint?: string;
  select: (handlers: VerbHandlers) => void;
};

export const VERBS: VerbSpec[] = [
  {
    id: "grow",
    label: "Grow",
    cost: growFoodSpan,
    arms: true,
    // Stays clickable while armed so the same button cancels the map mode.
    available: ({ canGrowPops, armedVerb }) => canGrowPops || armedVerb === "grow",
    // "Settlement", not "holding". The map's own caption says settlement, and one
    // thing may not have two names thirty pixels apart (QA-DOCK-3).
    hint: "Choose a settlement and pop type to grow.",
    blockedHint: "Requires an owned settlement.",
    select: (handlers) => handlers.onGrowPopRequest(),
  },
  {
    id: "move",
    label: "Move",
    cost: () => [{ lead: "free" }],
    arms: true,
    available: ({ canMovePops, armedVerb }) => canMovePops || armedVerb === "move",
    hint: "Move pops between two owned settlements.",
    blockedHint: "Requires at least two settlements.",
    select: (handlers) => handlers.onMovePopsRequest(),
  },
  {
    id: "found",
    label: "Found",
    cost: ({ G, playerID }) => [{ amounts: getFoundColonyStatus(G, playerID, "").cost ?? {} }],
    arms: true,
    available: ({ canFoundColony, armedVerb }) => canFoundColony || armedVerb === "found",
    hint: "Send a pop from an existing settlement to found a new colony.",
    blockedHint: "Requires an open tile, a spare pop, and enough resources.",
    select: (handlers) => handlers.onFoundColonyRequest(),
  },
  {
    id: "upgrade",
    label: "Upgrade",
    cost: ({ G, playerID }) => [
      { amounts: getUpgradeColonyToCityStatus(G, playerID, "").cost ?? {} },
    ],
    available: ({ canUpgradeCity }) => canUpgradeCity,
    hint: "Upgrade one of your colonies into a city.",
    blockedHint: "Requires an upgradeable colony and enough resources.",
    select: (handlers) => handlers.onUpgradeCityRequest(),
  },
  {
    id: "build",
    label: "Build",
    // The floor, not a word: the Build page prices each building, and none of
    // them is cheaper than this.
    cost: buildFloor,
    arms: true,
    available: ({ canBuild, armedVerb }) => canBuild || armedVerb === "build",
    hint: "Raise a building in one of your settlements.",
    blockedHint: "Requires a settlement with an open slot and enough resources.",
    select: (handlers) => handlers.onBuildRequest(),
  },
  {
    id: "calm",
    label: "Calm",
    // Two payments, one seam — so the dock prints both and joins them with "or".
    cost: ({ G, playerID }) => [
      { amounts: getCivicCalmStatus(G, playerID, "influence").cost ?? {} },
      { amounts: getCivicCalmStatus(G, playerID, "gold").cost ?? {} },
    ],
    available: ({ calmUsed }) => !calmUsed,
    hint: "Buy happiness: influence or gold, once per turn.",
    blockedHint: "One civic-calm action per turn — already used.",
    select: (handlers) => handlers.onCalmRequest(),
  },
  {
    id: "venture",
    label: "Venture",
    // Every expedition posts the same stake, so it is quotable before you pick
    // one — `ruleset.ventureStakes` is the field `getFundExpeditionStatus` reads.
    cost: ({ G }) => [{ lead: "stake", amounts: G.ruleset.ventureStakes.gold }],
    available: ({ ventureUsed }) => !ventureUsed,
    hint: "Fund an expedition: stake gold or wood, roll the table.",
    blockedHint: "One venture per turn — the ships are already out.",
    select: (handlers) => handlers.onVentureRequest(),
  },
];

/**
 * Whether the viewer may act on their turn at all — the part of the gate that is
 * about the seat and the moment rather than about any one verb.
 *
 * Named separately because the turn dial lives in the top bar and needs exactly
 * this and nothing else: it has no board facts to hand, and building a whole
 * VerbContext to ask "is it my move?" was how the same three conditions came to
 * be written twice.
 */
export type TurnGate = Pick<VerbContext, "isActive" | "phase" | "hasPendingPlayerEvent">;

export function isTurnOpen(gate: TurnGate) {
  return gate.isActive && gate.phase === "gameplay" && !gate.hasPendingPlayerEvent;
}

/** The shared gate every verb sits behind, in one place. */
export function isVerbEnabled(verb: VerbSpec, context: VerbContext) {
  return isTurnOpen(context) && verb.available(context);
}

export function verbTitle(verb: VerbSpec, context: VerbContext) {
  if (context.hasPendingPlayerEvent) {
    return "Resolve the pending player event first.";
  }

  const hint = typeof verb.hint === "function" ? verb.hint(context) : verb.hint;

  return verb.available(context) ? hint : (verb.blockedHint ?? hint);
}

/** The end-turn explanation, blocked or not, without a VerbContext to build. */
export function turnCommitTitle(gate: TurnGate) {
  if (gate.hasPendingPlayerEvent) {
    return "Resolve the pending player event first.";
  }

  return gate.isActive ? "Press and hold to end the turn." : "Current player's turn only.";
}

// The verb COMPONENTS (CommandVerb, VerbCostSlot) live in CommandVerb.tsx
// so this module exports only data + types — a file that mixes data and component exports
// can't Fast Refresh, and this data is imported by the always-live command dock.
