import { describe, expect, it } from "vitest";
import { enumerateLegalCommands } from "../../game/legalMoves";
import type { GameCommand } from "../../game/legalMoves";
import { scenario } from "../../game/testing/scenario";
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
    case "bankBuy":
      return `buy-${command.material}`;
    case "bankSell":
      return `sell-${command.material}`;
    case "dole":
      return "dole";
    case "civicCalm":
      return `calm-${command.payment}`;
    case "promotePop":
      return `promote-${command.from}`;
    case "demotePop":
      return `demote-${command.from}`;
    case "fundExpedition":
      return "venture";
    default:
      return null;
  }
}

const leaves = (options: DiscOption[]): DiscOption[] =>
  options.flatMap((option) => (option.options ? leaves(option.options) : [option]));

describe("verb fans", () => {
  it("offer every legal gameplay move, and nothing the engine refuses", () => {
    const G = scenario().opening().withResources("0", "wealthy").build();
    // "Wealthy" holds no influence; the Dole and the influence calm need some.
    G.players["0"].resources.influence = 20;
    G.pendingPlayerEvent = null;
    const legal = enumerateLegalCommands(G, "0");
    const has = (type: GameCommand["type"]) => legal.some((command) => command.type === type);
    const context: VerbContext = {
      G,
      playerID: "0",
      phase: "gameplay",
      isActive: true,
      hasPendingPlayerEvent: false,
      canGrowPops: has("growPop"),
      canMovePops: has("movePops"),
      canFoundColony: has("foundColony"),
      canUpgradeCity: has("upgradeColonyToCity"),
      canBuild: has("buildBuilding"),
      armedVerb: null,
      calmUsed: G.players["0"].civicCalmUsedThisTurn,
      ventureUsed: G.players["0"].ventureUsedThisTurn,
    };
    const noop = () => {};
    const groups = discGroups(
      context,
      {
        onArm: noop,
        onMovePopsRequest: noop,
        onFoundColonyRequest: noop,
        onUpgradeCityRequest: noop,
        onVentureRequest: noop,
        onCalm: noop,
        onDole: noop,
        onBankBuy: noop,
        onBankSell: noop,
      },
      null,
    );
    const options = leaves(groups.flatMap((group) => group.options));
    // A one-building class keeps its building's id, so it is found here too.
    const byId = new Map(options.map((option) => [option.id, option]));

    const reachable = new Set(legal.map(optionFor).filter((id): id is string => id !== null));
    expect(reachable.size).toBeGreaterThan(8);
    for (const id of reachable) {
      expect(byId.get(id)?.enabled, id).toBe(true);
    }
    for (const option of options.filter((candidate) => candidate.enabled)) {
      expect(reachable.has(option.id), option.id).toBe(true);
    }
  });
});
