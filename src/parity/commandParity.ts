import type { GameCommand } from "../game/legalMoves";

export type GameCommandType = GameCommand["type"];

type NonEmptyList<T> = readonly [T, ...T[]];

export type FrontendMoveCoverage = {
  kind: "interactive";
  /** Concrete React surfaces that expose or resolve this move. */
  surfaces: NonEmptyList<string>;
};

export type SimulationPolicyPath =
  | "setup-driver"
  | "master-search"
  | "master-rule"
  | "master-forced-choice"
  | "master-assembly"
  | "turn-control";

export type SimulationMoveCoverage = {
  /** The code path responsible for choosing this move in a headless game. */
  policyPath: SimulationPolicyPath;
  /** Existing file that implements this policy route. */
  implementation: "src/sim/setup.ts" | "src/sim/policies.ts" | "src/sim/runner.ts";
  /** Concrete implementation seam; strategic quality still needs behavior tests. */
  evidence: string;
};

export type CommandParityCoverage = {
  frontend: FrontendMoveCoverage;
  simulation: SimulationMoveCoverage;
};

function interactive(...surfaces: NonEmptyList<string>): FrontendMoveCoverage {
  return { kind: "interactive", surfaces };
}

function simulated(policyPath: SimulationPolicyPath, evidence: string): SimulationMoveCoverage {
  const implementation =
    policyPath === "setup-driver"
      ? "src/sim/setup.ts"
      : policyPath === "turn-control"
        ? "src/sim/runner.ts"
        : "src/sim/policies.ts";

  return { policyPath, implementation, evidence };
}

/**
 * Cross-system exhaustiveness gate for player actions.
 *
 * Adding a member to GameCommand without classifying both its frontend path and its
 * simulation/AI path fails `npm run check`. Every command is also counted by the
 * universal `movesByType` telemetry in src/sim/telemetry.ts.
 *
 * This registry proves that a route has been deliberately accounted for; it does
 * not prove that the bot uses it intelligently. Consequential features still need
 * the targeted clearly-use, clearly-avoid, and edge-case tests required by the
 * roadmap's three-axis parity contract and the PR template.
 */
export const COMMAND_PARITY = {
  placeCapital: {
    frontend: interactive(
      "src/components/HegemonyBoard.tsx",
      "src/components/board/modals/PopulationPickerModal.tsx",
    ),
    simulation: simulated("setup-driver", "buildNewGame → enumerateLegalCommands"),
  },
  placeCity: {
    frontend: interactive(
      "src/components/HegemonyBoard.tsx",
      "src/components/board/modals/PopulationPickerModal.tsx",
    ),
    simulation: simulated("setup-driver", "buildNewGame → enumerateLegalCommands"),
  },
  placeColony: {
    frontend: interactive(
      "src/components/HegemonyBoard.tsx",
      "src/components/board/modals/PopulationPickerModal.tsx",
    ),
    simulation: simulated("setup-driver", "buildNewGame → enumerateLegalCommands"),
  },
  foundColony: {
    frontend: interactive(
      "src/components/board/command/CommandDock.tsx",
      "src/components/board/modals/FoundColonyPopover.tsx",
    ),
    simulation: simulated("master-search", "masterPolicy → beamPlan(scoreMaster)"),
  },
  upgradeColonyToCity: {
    frontend: interactive(
      "src/components/board/command/CommandDock.tsx",
      "src/components/board/modals/UpgradeCityModal.tsx",
    ),
    simulation: simulated("master-search", "masterPolicy → beamPlan(scoreMaster)"),
  },
  buildBuilding: {
    frontend: interactive(
      "src/components/board/command/CommandDock.tsx",
      "src/components/board/map/BuildPopover.tsx",
    ),
    simulation: simulated("master-search", "masterPolicy → beamPlan(scoreMaster)"),
  },
  growPop: {
    frontend: interactive(
      "src/components/board/command/CommandDock.tsx",
      "src/components/board/map/GrowPopPopover.tsx",
    ),
    simulation: simulated("master-search", "masterPolicy → beamPlan(scoreMaster)"),
  },
  movePops: {
    frontend: interactive(
      "src/components/board/command/CommandDock.tsx",
      "src/components/board/map/MovePopsPopover.tsx",
    ),
    simulation: simulated("master-search", "masterPolicy → beamPlan(scoreMaster)"),
  },
  resolveEvent: {
    frontend: interactive("src/components/board/modals/PendingPlayerEventModal.tsx"),
    simulation: simulated("master-forced-choice", "beamPlan → onePlyLookahead(scoreMaster)"),
  },
  bankSell: {
    frontend: interactive("src/components/board/ledger/MarketTab.tsx"),
    simulation: simulated("master-rule", "resolveStochasticByRule bank heuristic"),
  },
  bankBuy: {
    frontend: interactive("src/components/board/ledger/MarketTab.tsx"),
    simulation: simulated("master-rule", "resolveStochasticByRule bank heuristic"),
  },
  civicCalm: {
    frontend: interactive(
      "src/components/board/command/CommandDock.tsx",
      "src/components/board/modals/CalmModal.tsx",
    ),
    simulation: simulated("master-search", "masterPolicy → beamPlan(scoreMaster)"),
  },
  promotePop: {
    frontend: interactive(
      "src/components/board/command/CommandDock.tsx",
      "src/components/board/map/LadderPopover.tsx",
    ),
    simulation: simulated("master-search", "masterPolicy → beamPlan(scoreMaster)"),
  },
  demotePop: {
    frontend: interactive(
      "src/components/board/command/CommandDock.tsx",
      "src/components/board/map/LadderPopover.tsx",
    ),
    simulation: simulated("master-search", "masterPolicy → beamPlan(scoreMaster)"),
  },
  fundExpedition: {
    frontend: interactive(
      "src/components/board/command/CommandDock.tsx",
      "src/components/board/modals/VentureModal.tsx",
    ),
    simulation: simulated("master-rule", "resolveStochasticByRule venture heuristic"),
  },
  buyRiotInsurance: {
    frontend: interactive("src/components/board/modals/RiotModal.tsx"),
    simulation: simulated("master-rule", "resolveStochasticByRule riot-insurance heuristic"),
  },
  resolveRiot: {
    frontend: interactive("src/components/board/modals/RiotModal.tsx"),
    simulation: simulated("master-rule", "resolveStochasticByRule riot fallback"),
  },
  assemblyDraw: {
    frontend: interactive("src/components/board/assembly/AssemblyColonnade.tsx"),
    simulation: simulated("master-assembly", "masterPolicy → resolveAssemblyByHeuristic"),
  },
  assemblyDiscardHeld: {
    frontend: interactive("src/components/board/assembly/AssemblyFloor.tsx"),
    simulation: simulated("master-assembly", "masterPolicy → resolveAssemblyByHeuristic"),
  },
  assemblyPropose: {
    frontend: interactive("src/components/board/assembly/AssemblyFloor.tsx"),
    simulation: simulated("master-assembly", "masterPolicy → resolveAssemblyByHeuristic"),
  },
  assemblyProposeRepeal: {
    frontend: interactive("src/components/board/assembly/AssemblyFoot.tsx"),
    simulation: simulated("master-assembly", "masterPolicy → resolveAssemblyByHeuristic"),
  },
  assemblyPass: {
    frontend: interactive("src/components/board/assembly/AssemblyFoot.tsx"),
    simulation: simulated("master-assembly", "masterPolicy → resolveAssemblyByHeuristic"),
  },
  assemblyBribe: {
    frontend: interactive("src/components/board/assembly/AssemblySeats.tsx"),
    simulation: simulated("master-assembly", "masterPolicy → resolveAssemblyByHeuristic"),
  },
  assemblyVote: {
    frontend: interactive("src/components/board/assembly/AssemblySeats.tsx"),
    simulation: simulated("master-assembly", "masterPolicy → resolveAssemblyByHeuristic"),
  },
  assemblyVeto: {
    frontend: interactive("src/components/board/assembly/AssemblySeats.tsx"),
    simulation: simulated("master-assembly", "masterPolicy → resolveAssemblyByHeuristic"),
  },
  assemblyClose: {
    frontend: interactive("src/components/board/assembly/AssemblyFoot.tsx"),
    simulation: simulated("master-assembly", "masterPolicy → resolveAssemblyByHeuristic"),
  },
  endTurn: {
    frontend: interactive("src/components/board/command/CommandDock.tsx"),
    simulation: simulated("turn-control", "beamPlan fallback and forceEndTurn"),
  },
} satisfies Record<GameCommandType, CommandParityCoverage>;

/** Stable report order and the runtime vocabulary used to zero-fill telemetry. */
export const GAME_COMMAND_TYPES = Object.freeze(
  Object.keys(COMMAND_PARITY) as GameCommandType[],
) as readonly GameCommandType[];
