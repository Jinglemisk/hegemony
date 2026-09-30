import type { Resources } from "../../game/types";
import { VERBS, isVerbEnabled, verbTitle } from "../board/command/verbs";
import type { VerbContext, VerbHandlers, VerbId, VerbPriceClause } from "../board/command/verbs";

/**
 * The six verb discs on the realm sheet's edge, as data: a disc is a group of
 * options, in the order the owner picked (Grow, People, Expand, Build, Civic,
 * Exchange). The count is not fixed anywhere else — the sheet lays out however
 * many groups this returns.
 *
 * Every option's price and availability come from the same VERBS rows the engine
 * queries back, so a disc never quotes a price the press does not charge.
 */
export type DiscOption = {
  id: string;
  label: string;
  icon: string;
  /** Alternatives: any one of them pays. Empty when the option costs nothing. */
  prices: Array<Partial<Resources>>;
  /** Words standing in for a price (a range, a stake, "free"). */
  text?: string;
  enabled: boolean;
  hint: string;
  /** Which map mode this option holds, when it holds one. */
  arms?: VerbId;
  run: () => void;
};

export type DiscGroup = {
  id: "grow" | "people" | "expand" | "build" | "civic" | "exchange";
  label: string;
  icon: string;
  options: DiscOption[];
};

export type DiscHandlers = VerbHandlers & {
  onLadder: () => void;
  onMarket: () => void;
};

const VERB_ICON: Record<VerbId, string> = {
  grow: "pops/pop-gain",
  move: "pops/move",
  found: "settlements/found",
  upgrade: "settlements/upgrade",
  build: "buildings/build",
  calm: "unrest/calm-verb",
  venture: "events/venture",
};

function clauseText(clause: VerbPriceClause) {
  if (clause.span) {
    const { min, max, resource } = clause.span;
    return min === max ? `${min} ${resource}` : `${min}–${max} ${resource}`;
  }
  return clause.lead;
}

function verbOption(id: VerbId, context: VerbContext, handlers: DiscHandlers): DiscOption {
  const verb = VERBS.find((candidate) => candidate.id === id)!;
  const clauses = verb.cost?.(context) ?? [];
  const priced = clauses.every((clause) => clause.amounts && !clause.lead);

  return {
    id,
    label: verb.label,
    icon: VERB_ICON[id],
    prices: priced ? clauses.map((clause) => clause.amounts ?? {}) : [],
    text: priced ? undefined : clauses.map(clauseText).filter(Boolean).join(" · ") || undefined,
    enabled: isVerbEnabled(verb, context),
    hint: verbTitle(verb, context),
    arms: verb.arms ? id : undefined,
    run: () => verb.select(handlers),
  };
}

export function discGroups(context: VerbContext, handlers: DiscHandlers): DiscGroup[] {
  const turnOpen =
    context.isActive && context.phase === "gameplay" && !context.hasPendingPlayerEvent;
  const page = (id: string, label: string, icon: string, hint: string, run: () => void) => ({
    id,
    label,
    icon,
    prices: [],
    enabled: turnOpen,
    hint,
    run,
  });

  return [
    {
      id: "grow",
      label: "Grow",
      icon: "pops/pop-gain",
      options: [verbOption("grow", context, handlers)],
    },
    {
      id: "people",
      label: "People",
      icon: "pops/crowd",
      options: [
        page(
          "promote",
          "Promote",
          "pops/promote",
          "Choose a rung on the Ladder.",
          handlers.onLadder,
        ),
        page("demote", "Demote", "pops/demote", "Choose a rung on the Ladder.", handlers.onLadder),
        verbOption("move", context, handlers),
      ],
    },
    {
      id: "expand",
      label: "Expand",
      icon: "settlements/found",
      options: [verbOption("found", context, handlers), verbOption("upgrade", context, handlers)],
    },
    {
      id: "build",
      label: "Build",
      icon: "buildings/build",
      options: [verbOption("build", context, handlers)],
    },
    {
      id: "civic",
      label: "Civic",
      icon: "unrest/calm-verb",
      options: [verbOption("calm", context, handlers), verbOption("venture", context, handlers)],
    },
    {
      id: "exchange",
      label: "Exchange",
      icon: "market/bank",
      options: [
        page("market", "Bank", "market/bank", "Buy or sell at the bank.", handlers.onMarket),
      ],
    },
  ];
}
