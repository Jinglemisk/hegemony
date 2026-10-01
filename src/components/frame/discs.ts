import {
  PROMOTE_FROM,
  DEMOTE_FROM,
  TRADABLE_MATERIALS,
  getAdjustedActionCost,
  getBankBuyStatus,
  getBankSellStatus,
  getBuildBuildingStatus,
  getBuildings,
  getCivicCalmStatus,
  getDemotePopStatus,
  getDiscountedGrowPopCost,
  getGrowPopStatus,
  getPromotePopStatus,
  POP_TYPES,
  demotionTarget,
  promotionTarget,
} from "../../game/rules";
import type { CivicCalmPayment } from "../../game/rules";
import type { BuildingId, PopType, Resources, TradableMaterial } from "../../game/types";
import { BUILDING_ICON, RESOURCE_ICON } from "../../ui/frameFormat";
import { formatPopLabel } from "../../ui/formatters";
import { VERBS, isTurnOpen, isVerbEnabled, verbTitle } from "../board/command/verbs";
import type { VerbContext, VerbHandlers, VerbId } from "../board/command/verbs";
import type { MapSelectionMode } from "../board/map/mapSelection";
import { getOwnedHoldings } from "../board/helpers";

/**
 * The verb discs on the realm sheet's edge, as data: a disc is a group of
 * options, in the order the owner picked (Grow, People, Expand, Build, Civic,
 * Exchange). The count is not fixed anywhere else — the sheet lays out however
 * many groups this returns, and the hotkeys follow the order.
 *
 * An option either runs (a command, or arming the map for one) or holds a
 * second fan of its own (Build's classes, Exchange's goods, the ladder's rungs).
 * Every price and every "can I?" is the engine's own status for that command,
 * so a fan never quotes a price the press does not charge.
 */
export type DiscOption = {
  id: string;
  label: string;
  icon: string;
  /** Alternatives: any one of them pays. Empty when the option costs nothing. */
  prices: Array<Partial<Resources>>;
  /** The price is the cheapest of several (it depends on the settlement). */
  from?: boolean;
  /** What the exchange hands back, printed after the price. */
  gets?: Partial<Resources>;
  /** Words standing in for a price (free, a stake, what a class holds). */
  text?: string;
  enabled: boolean;
  hint: string;
  /** This option holds the map right now. */
  armed?: boolean;
  run?: () => void;
  /** A second fan, opened from this option. */
  options?: DiscOption[];
};

export type DiscGroup = {
  id: "grow" | "people" | "expand" | "build" | "civic" | "exchange";
  label: string;
  icon: string;
  /** What the open disc's name tab reads when a click has no option of its own. */
  hint: string;
  /** The option a click on the disc runs; without one, a click opens the fan. */
  primary?: string;
  options: DiscOption[];
};

export type DiscHandlers = Pick<
  VerbHandlers,
  "onMovePopsRequest" | "onFoundColonyRequest" | "onUpgradeCityRequest" | "onVentureRequest"
> & {
  onArm: (mode: MapSelectionMode) => void;
  onCalm: (payment: CivicCalmPayment) => void;
  onBankBuy: (material: TradableMaterial) => void;
  onBankSell: (material: TradableMaterial) => void;
};

const VERB_ICON: Partial<Record<VerbId, string>> = {
  move: "pops/move",
  found: "settlements/found",
  upgrade: "settlements/upgrade",
  venture: "events/venture",
};

const POP_ICON: Record<PopType, string> = {
  slaves: "pops/slaves",
  freemen: "pops/freemen",
  citizens: "pops/citizens",
};

/**
 * Build's classes, after the pop each building serves; Civic holds the rest.
 * v1's roster has no class field, so the sheet names them here until the v2
 * roster lands with one.
 */
const BUILD_CLASSES: Array<{ id: string; label: string; icon: string; buildings: BuildingId[] }> = [
  { id: "slaves", label: "Slaves", icon: POP_ICON.slaves, buildings: ["workshop", "villa"] },
  { id: "freemen", label: "Freemen", icon: POP_ICON.freemen, buildings: ["marketplace"] },
  { id: "citizens", label: "Citizens", icon: POP_ICON.citizens, buildings: ["forum", "gymnasion"] },
  {
    id: "civic",
    label: "Civic",
    icon: "settlements/capital",
    buildings: ["temple", "granary", "aqueduct", "odeon", "port"],
  },
];

const cap = (text: string) => text[0].toUpperCase() + text.slice(1);
const units = (cost: Partial<Resources>) =>
  Object.values(cost).reduce((sum: number, n) => sum + (n ?? 0), 0);
const same = (a: Partial<Resources>, b: Partial<Resources>) =>
  JSON.stringify(a) === JSON.stringify(b);

/** One quote for a price that varies by settlement: exact, or the cheapest "from". */
function quote(costs: Array<Partial<Resources>>): Pick<DiscOption, "prices" | "from"> {
  if (costs.length === 0) return { prices: [] };
  const cheapest = costs.reduce((best, cost) => (units(cost) < units(best) ? cost : best));
  return { prices: [cheapest], from: costs.some((cost) => !same(cost, cheapest)) };
}

const sameMode = (a: MapSelectionMode | null, b: MapSelectionMode) =>
  a !== null && JSON.stringify(a) === JSON.stringify(b);

/** A VERBS row as an option: its label, price, gate and handler. */
function verbOption(id: VerbId, context: VerbContext, handlers: DiscHandlers): DiscOption {
  const verb = VERBS.find((candidate) => candidate.id === id)!;
  const clauses = verb.cost?.(context) ?? [];
  const lead = clauses.find((clause) => clause.lead)?.lead;
  const select: Partial<Record<VerbId, () => void>> = {
    move: handlers.onMovePopsRequest,
    found: handlers.onFoundColonyRequest,
    upgrade: handlers.onUpgradeCityRequest,
    venture: handlers.onVentureRequest,
  };

  return {
    id,
    label: verb.label,
    icon: VERB_ICON[id] ?? "buildings/build",
    prices: clauses.flatMap((clause) => (clause.amounts ? [clause.amounts] : [])),
    text: lead && lead !== "from" ? lead : undefined,
    enabled: isVerbEnabled(verb, context) || context.armedVerb === id,
    hint: verbTitle(verb, context),
    armed: context.armedVerb === id,
    run: select[id],
  };
}

/** A second fan's holder: live while any of its options is. */
function holder(option: Omit<DiscOption, "enabled" | "prices">): DiscOption {
  const options = option.options ?? [];
  return {
    ...option,
    prices: [],
    enabled: options.some((child) => child.enabled),
    armed: options.some((child) => child.armed),
  };
}

export function discGroups(
  context: VerbContext,
  handlers: DiscHandlers,
  armedMode: MapSelectionMode | null,
): DiscGroup[] {
  const { G, playerID } = context;
  const open = isTurnOpen(context);
  const holdings = getOwnedHoldings(G, playerID);
  const store = G.players[playerID].resources;

  /** An option that arms the map for one exact command. */
  const arming = (
    option: Omit<DiscOption, "enabled" | "run" | "armed">,
    mode: MapSelectionMode,
    can: boolean,
  ): DiscOption => {
    const armed = sameMode(armedMode, mode);
    return {
      ...option,
      enabled: (open && can) || armed,
      armed,
      run: () => handlers.onArm(mode),
    };
  };

  // Up the ladder, so the click's own option (a slave) comes first.
  const grow = [...POP_TYPES].reverse().map((pop) =>
    arming(
      {
        id: `grow-${pop}`,
        label: cap(formatPopLabel(pop, 1)),
        icon: POP_ICON[pop],
        ...quote(
          holdings.length > 0
            ? holdings.map(({ settlement }) =>
                getDiscountedGrowPopCost(G, playerID, settlement, pop),
              )
            : [G.ruleset.growPopCosts[pop]],
        ),
        hint: `Choose a settlement to grow a ${formatPopLabel(pop, 1)}.`,
      },
      { kind: "growPop", pop },
      holdings.some(({ tile }) => getGrowPopStatus(G, playerID, tile.id, pop).can),
    ),
  );

  const rung = (kind: "promote" | "demote", from: PopType) => {
    const status = kind === "promote" ? getPromotePopStatus : getDemotePopStatus;
    const to = kind === "promote" ? promotionTarget(from) : demotionTarget(from);
    const statuses = holdings.map(({ tile }) => status(G, playerID, tile.id, from));
    return arming(
      {
        id: `${kind}-${from}`,
        label: `${cap(formatPopLabel(from, 1))} to ${formatPopLabel(to, 1)}`,
        icon: POP_ICON[from],
        ...quote(statuses.map((s) => s.cost ?? {})),
        hint: `Choose a settlement to ${kind} a ${formatPopLabel(from, 1)}.`,
      },
      { kind: "ladder", request: { kind, from } },
      statuses.some((s) => s.can),
    );
  };

  const building = (id: BuildingId): DiscOption | null => {
    const definition = getBuildings(G.definition.content).find((b) => b.id === id);
    if (!definition) return null;
    return arming(
      {
        id: `build-${id}`,
        label: definition.name,
        icon: BUILDING_ICON[id] ?? "buildings/build",
        prices: [getAdjustedActionCost(G, playerID, "buildBuilding", definition.cost, id)],
        hint: `Choose a settlement to raise a ${definition.name}.`,
      },
      { kind: "build", buildingId: id },
      holdings.some(({ tile }) => getBuildBuildingStatus(G, playerID, tile.id, id).can),
    );
  };

  // A class with one building skips its second fan: the class is that building.
  const build = BUILD_CLASSES.flatMap((buildClass) => {
    const buildings = buildClass.buildings.flatMap((id) => building(id) ?? []);
    if (buildings.length === 0) return [];
    if (buildings.length === 1) {
      const [only] = buildings;
      return [{ ...only, label: buildClass.label, icon: buildClass.icon, text: only.label }];
    }
    return [
      holder({
        id: `build-${buildClass.id}`,
        label: buildClass.label,
        icon: buildClass.icon,
        text: `${buildings.length} buildings`,
        hint: `The ${buildClass.label.toLowerCase()}' buildings.`,
        options: buildings,
      }),
    ];
  });

  const calm = (payment: CivicCalmPayment): DiscOption => {
    const status = getCivicCalmStatus(G, playerID, payment);
    return {
      id: `calm-${payment}`,
      label: "Calm",
      icon: payment === "gold" ? "unrest/calm-verb" : "unrest/patronage",
      prices: [status.cost ?? {}],
      enabled: open && status.can,
      hint: `+${G.ruleset.civicCalm.happiness} happiness, once a turn.`,
      run: () => handlers.onCalm(payment),
    };
  };

  const exchange = TRADABLE_MATERIALS.map((material) => {
    const buy = getBankBuyStatus(G, playerID, material);
    const sell = getBankSellStatus(G, playerID, material);
    return holder({
      id: `exchange-${material}`,
      label: cap(material),
      icon: RESOURCE_ICON[material],
      text: `${store[material]} in store`,
      hint: `Trade ${material} at the bank.`,
      options: [
        {
          id: `buy-${material}`,
          label: "Buy 1",
          icon: `market/buy-${material}`,
          prices: [buy.cost ?? {}],
          gets: { [material]: 1 },
          enabled: open && buy.can,
          hint: `Buy 1 ${material}.`,
          run: () => handlers.onBankBuy(material),
        },
        {
          id: `sell-${material}`,
          label: `Sell ${sell.cost?.[material] ?? ""}`.trim(),
          icon: `market/sell-${material}`,
          prices: [sell.cost ?? {}],
          gets: { gold: 1 },
          enabled: open && sell.can,
          hint: `Sell ${material} for 1 gold.`,
          run: () => handlers.onBankSell(material),
        },
      ],
    });
  });

  return [
    {
      id: "grow",
      label: "Grow",
      icon: "pops/pop-gain",
      hint: "Pick one",
      primary: grow[0]?.id,
      options: grow,
    },
    {
      id: "people",
      label: "People",
      icon: "pops/crowd",
      hint: "Pick one",
      options: [
        holder({
          id: "promote",
          label: "Promote",
          icon: "pops/promote",
          hint: "Raise a pop one rung.",
          options: PROMOTE_FROM.map((from) => rung("promote", from)),
        }),
        holder({
          id: "demote",
          label: "Demote",
          icon: "pops/demote",
          hint: "Lower a pop one rung.",
          options: DEMOTE_FROM.map((from) => rung("demote", from)),
        }),
        verbOption("move", context, handlers),
      ],
    },
    {
      id: "expand",
      label: "Expand",
      icon: "settlements/found",
      hint: "Pick one",
      primary: "found",
      options: [verbOption("found", context, handlers), verbOption("upgrade", context, handlers)],
    },
    { id: "build", label: "Build", icon: "buildings/build", hint: "Pick a class", options: build },
    {
      id: "civic",
      label: "Civic",
      icon: "unrest/calm-verb",
      hint: "Pick one",
      primary: "calm-gold",
      options: [calm("gold"), calm("influence"), verbOption("venture", context, handlers)],
    },
    {
      id: "exchange",
      label: "Exchange",
      icon: "market/bank",
      hint: "Pick a good",
      options: exchange,
    },
  ];
}
