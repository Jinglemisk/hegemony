import type { Phase } from "../../../game/controller";
import { POP_TYPES } from "../../../game/rules";
import type { HegemonyState, Resources } from "../../../game/types";
import { AtlasIcon, UiSprite, type IconAtlasKey, type UiAtlasKey } from "../../Sprites";
import { ResourceChips } from "../ResourceChips";

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
  phase: Phase;
  isActive: boolean;
  hasPendingPlayerEvent: boolean;
  canGrowPops: boolean;
  canMovePops: boolean;
  canFoundColony: boolean;
  canUpgradeCity: boolean;
  canBuild: boolean;
  isFoundColonyActive: boolean;
  isBuildActive: boolean;
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
  onEndTurn: () => void;
};

export type VerbId = "grow" | "move" | "found" | "upgrade" | "build" | "calm" | "venture" | "endTurn";

type VerbIcon =
  | { kind: "ui"; item: UiAtlasKey }
  | { kind: "atlas"; icon: IconAtlasKey };

/** `{ lead, cost }` renders "from 🌾5"; `{ lead }` alone renders a bare word ("free"). */
type VerbCost = { lead?: string; cost?: (context: VerbContext) => Partial<Resources> };

export type VerbSpec = {
  id: VerbId;
  label: string;
  icon: VerbIcon;
  /** Extra classes on the icon — the atlas icons need their own sizing hook. */
  iconClassName?: string;
  cost?: VerbCost;
  /** Availability *beyond* the shared gate (active seat, gameplay phase, no pending event). */
  available: (context: VerbContext) => boolean;
  /** A toggle verb reflects its own state — only Found has one (it arms a map mode). */
  pressed?: (context: VerbContext) => boolean;
  /** Shown when the verb is usable. */
  hint: string | ((context: VerbContext) => string);
  /** Shown when `available` is false — always says which precondition is missing. */
  blockedHint: string;
  select: (handlers: VerbHandlers) => void;
};

export const VERBS: VerbSpec[] = [
  {
    id: "grow",
    label: "Grow",
    icon: { kind: "ui", item: "growAction" },
    cost: {
      lead: "from",
      cost: ({ G }) => ({
        food: Math.min(...POP_TYPES.map((pop) => G.ruleset.growPopCosts[pop].food ?? Number.POSITIVE_INFINITY))
      })
    },
    available: ({ canGrowPops }) => canGrowPops,
    hint: "Choose a holding and pop type to grow.",
    blockedHint: "Requires an owned holding.",
    select: (handlers) => handlers.onGrowPopRequest()
  },
  {
    id: "move",
    label: "Move",
    icon: { kind: "ui", item: "moveAction" },
    cost: { lead: "free" },
    available: ({ canMovePops }) => canMovePops,
    hint: "Move pops between two owned settlements.",
    blockedHint: "Requires at least two settlements.",
    select: (handlers) => handlers.onMovePopsRequest()
  },
  {
    id: "found",
    label: "Found",
    icon: { kind: "atlas", icon: "colony" },
    iconClassName: "commandAtlasIcon",
    cost: { cost: ({ G }) => G.ruleset.actionCosts.foundColony },
    // Stays clickable while armed so the same button cancels the map mode.
    available: ({ canFoundColony, isFoundColonyActive }) => canFoundColony || isFoundColonyActive,
    pressed: ({ isFoundColonyActive }) => isFoundColonyActive,
    hint: ({ isFoundColonyActive }) =>
      isFoundColonyActive
        ? "Pick a glowing tile on the map, or click again to cancel."
        : "Send a pop from an existing settlement to found a new colony.",
    blockedHint: "Requires an open tile, a spare pop, and enough resources.",
    select: (handlers) => handlers.onFoundColonyRequest()
  },
  {
    id: "upgrade",
    label: "Upgrade",
    icon: { kind: "atlas", icon: "city" },
    iconClassName: "commandAtlasIcon",
    cost: { cost: ({ G }) => G.ruleset.actionCosts.upgradeColonyToCity },
    available: ({ canUpgradeCity }) => canUpgradeCity,
    hint: "Upgrade one of your colonies into a city.",
    blockedHint: "Requires an upgradeable colony and enough resources.",
    select: (handlers) => handlers.onUpgradeCityRequest()
  },
  {
    id: "build",
    label: "Build",
    icon: { kind: "atlas", icon: "workshop" },
    iconClassName: "commandAtlasIcon",
    // The cost varies by building; the popover shows each. Stays clickable while
    // armed so the same button cancels the map mode (like Found).
    available: ({ canBuild, isBuildActive }) => canBuild || isBuildActive,
    pressed: ({ isBuildActive }) => isBuildActive,
    hint: ({ isBuildActive }) =>
      isBuildActive
        ? "Pick a glowing settlement on the map, or click again to cancel."
        : "Raise a building in one of your settlements.",
    blockedHint: "Requires a settlement with an open slot and enough resources.",
    select: (handlers) => handlers.onBuildRequest()
  },
  {
    id: "calm",
    label: "Calm",
    icon: { kind: "ui", item: "voteToken" },
    cost: { lead: "from", cost: ({ G }) => ({ influence: G.ruleset.civicCalm.influenceCost }) },
    available: ({ calmUsed }) => !calmUsed,
    hint: "Buy happiness: influence or gold, once per turn.",
    blockedHint: "One civic-calm action per turn — already used.",
    select: (handlers) => handlers.onCalmRequest()
  },
  {
    id: "venture",
    label: "Venture",
    icon: { kind: "ui", item: "seal" },
    cost: { lead: "stake", cost: ({ G }) => ({ gold: G.ruleset.ventureStakes.gold.gold }) },
    available: ({ ventureUsed }) => !ventureUsed,
    hint: "Fund an expedition: stake gold or wood, roll the table.",
    blockedHint: "One venture per turn — the ships are already out.",
    select: (handlers) => handlers.onVentureRequest()
  }
];

/** End Turn is a verb too, but it is the turn's terminator: own styling, always
 *  last, no cost. Kept out of VERBS so a map over the array can't accidentally
 *  place it mid-row. */
export const END_TURN_VERB: VerbSpec = {
  id: "endTurn",
  label: "End Turn",
  icon: { kind: "ui", item: "endTurn" },
  available: () => true,
  hint: ({ isActive }) => (isActive ? "End the current player's turn." : "Current player's turn only."),
  blockedHint: "Current player's turn only.",
  select: (handlers) => handlers.onEndTurn()
};

/** The shared gate every verb sits behind, in one place. */
export function isVerbEnabled(verb: VerbSpec, context: VerbContext) {
  return (
    context.isActive &&
    context.phase === "gameplay" &&
    !context.hasPendingPlayerEvent &&
    verb.available(context)
  );
}

export function verbTitle(verb: VerbSpec, context: VerbContext) {
  if (context.hasPendingPlayerEvent) {
    return "Resolve the pending player event first.";
  }

  if (!verb.available(context)) {
    return verb.blockedHint;
  }

  return typeof verb.hint === "function" ? verb.hint(context) : verb.hint;
}

export function VerbIconGlyph({ icon, className }: { icon: VerbIcon; className: string }) {
  return icon.kind === "ui" ? (
    <UiSprite item={icon.item} className={className} />
  ) : (
    <AtlasIcon icon={icon.icon} className={className} />
  );
}

/** One verb button. The bar is `VERBS.map(...)` over this. */
export function CommandVerb({
  verb,
  context,
  handlers
}: {
  verb: VerbSpec;
  context: VerbContext;
  handlers: VerbHandlers;
}) {
  const pressed = verb.pressed?.(context) ?? false;

  return (
    <button
      aria-pressed={verb.pressed ? pressed : undefined}
      className={pressed ? "commandVerb commandIconActive" : "commandVerb"}
      disabled={!isVerbEnabled(verb, context)}
      onClick={() => verb.select(handlers)}
      title={verbTitle(verb, context)}
    >
      <VerbIconGlyph icon={verb.icon} className={`commandIcon ${verb.iconClassName ?? ""}`.trim()} />
      <span className="commandVerbBody">
        <strong>{verb.label}</strong>
        {verb.cost ? <VerbCostSlot cost={verb.cost} context={context} /> : null}
      </span>
    </button>
  );
}

function VerbCostSlot({ cost, context }: { cost: VerbCost; context: VerbContext }) {
  return (
    <span className="commandVerbCost">
      {cost.lead ? <em>{cost.lead}</em> : null}
      {cost.cost ? (
        <ResourceChips
          resources={cost.cost(context)}
          variant="cost"
          chipClassName="commandVerbCostItem"
          iconClassName="commandVerbCostIcon"
        />
      ) : null}
    </span>
  );
}
