import { describe, expect, it } from "vitest";
import { civicCalm } from "../../game/civic";
import { enumerateLegalCommands } from "../../game/legalMoves";
import type { GameCommand } from "../../game/legalMoves";
import type { RulesetPatch } from "../../game/ruleset";
import { scenario } from "../../game/testing/scenario";
import { offerWindowReason } from "../../game/trade";
import type { HegemonyState } from "../../game/types";
import type { VerbContext } from "../board/command/verbs";
import { discGroups } from "./discs";
import type { DiscOption } from "./discs";

/** The fan option a legal command is taken from. */
function optionFor(command: GameCommand): string | null {
  switch (command.type) {
    case "growPop":
      return `grow-${command.pop}`;
    case "movePops":
      return "move";
    case "foundColony":
      return "found";
    case "upgradeColonyToCity":
      return "upgrade";
    case "buildBuilding":
      return `build-${command.buildingId}`;
    case "dole":
      return "dole";
    case "civicCalm":
      return `calm-${command.payment}`;
    case "promotePop":
      return `promote-${command.from}`;
    case "demotePop":
      return `demote-${command.from}`;
    case "buyDevCard":
      return "buy-card";
    case "playDevCard":
      return "hand";
    default:
      return null;
  }
}

const leaves = (options: DiscOption[]): DiscOption[] =>
  options.flatMap((option) => (option.options ? leaves(option.options) : [option]));

/** Seat 0's fans at its first turn, rich enough for every verb. */
function fans(patch?: RulesetPatch, before: (G: HegemonyState) => void = () => {}) {
  const G = scenario({ patch }).opening().withResources("0", "wealthy").build();
  // "Wealthy" holds no influence; the Dole and the influence calm need some.
  G.players["0"].resources.influence = 20;
  G.pendingPlayerEvent = null;
  before(G);
  const legal = enumerateLegalCommands(G, "0");
  const has = (type: GameCommand["type"]) => legal.some((command) => command.type === type);
  const context: VerbContext = {
    G,
    playerID: "0",
    phase: "gameplay",
    isActive: true,
    pending: null,
    canGrowPops: has("growPop"),
    canMovePops: has("movePops"),
    canFoundColony: has("foundColony"),
    canUpgradeCity: has("upgradeColonyToCity"),
    canBuild: has("buildBuilding"),
    armedVerb: null,
  };
  const noop = () => {};
  const groups = discGroups(
    context,
    {
      onArm: noop,
      onMovePopsRequest: noop,
      onFoundColonyRequest: noop,
      onUpgradeCityRequest: noop,
      onCardsRequest: noop,
      onCalm: noop,
      onDole: noop,
      onTrade: noop,
    },
    null,
  );
  return { G, legal, groups };
}

describe("verb fans", () => {
  it("offer every legal gameplay move, and nothing the engine refuses", () => {
    const { G, legal, groups } = fans();
    const options = leaves(groups.flatMap((group) => group.options));
    // A one-building class keeps its building's id, so it is found here too.
    const byId = new Map(options.map((option) => [option.id, option]));

    // An offer is composed, never listed: Trade is open exactly when the engine's
    // offer window is.
    const reachable = new Set(legal.map(optionFor).filter((id): id is string => id !== null));
    if (offerWindowReason(G, "0") === null) reachable.add("offer");
    expect(reachable.size).toBeGreaterThan(8);
    for (const id of reachable) {
      expect(byId.get(id)?.enabled, id).toBe(true);
    }
    for (const option of options.filter((candidate) => candidate.enabled)) {
      expect(reachable.has(option.id), option.id).toBe(true);
    }
  });

  it("count each capped action's uses left this turn, and none where the ruleset sets no cap", () => {
    const left = ({ groups }: ReturnType<typeof fans>, id: string) =>
      groups.flatMap((group) => [group, ...group.options]).find((option) => option.id === id)?.left;
    const calmed = fans(undefined, (G) => void civicCalm(G, "0", "gold"));

    expect(["civic", "calm-gold", "calm-influence"].map((id) => left(calmed, id))).toEqual([
      2, 2, 2,
    ]);
    expect(["dole", "promote", "demote"].map((id) => left(calmed, id))).toEqual([3, 3, 3]);
    expect(left(fans({ turnCaps: { dole: null } }), "dole")).toBeUndefined();
  });
});
