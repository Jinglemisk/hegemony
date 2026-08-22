import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { GameCommand } from "../game/legalMoves";
import { getAuthoredGameContent } from "../game/content";
import {
  createGameDefinition,
  hydrateGameDefinition,
  stableDefinitionHash,
} from "../game/definition";
import type { GameModeId, RulesetPatch } from "../game/ruleset";
import type { HegemonyState, PlayerId } from "../game/types";
import type { GameDefinition } from "../game/definition";
import { assertGameInvariants } from "../game/invariants";
import { migrateLegacyState } from "../game/migration";
import {
  CURRENT_RECIPE_VERSIONS,
  SAVE_FORMAT_VERSION,
  UnsupportedVersionError,
  assertCurrentRecipeVersions,
} from "../game/version";
import type { RecipeVersions } from "../game/version";

export const DEFAULT_SAVE_PATH = ".sim/game.json";

export type { RulesetPatch } from "../game/ruleset";

/** `policy` places the opening with the shared placement evaluator (the default);
 *  `random` is the uniform chaos baseline; `fixed` replays the scripted UI opening;
 *  `manual` stops in setup. Metadata only — replay rebuilds from history. */
export type OpeningKind = "policy" | "random" | "fixed" | "manual";

export type CommandRecord = { player: PlayerId; command: GameCommand };

type LegacyMoveRecord = { player: PlayerId; move: GameCommand & { cost?: unknown } };

/**
 * A save is the full recipe for the game, not just its current state: seed +
 * mode + patch rebuild the initial state, `history` is every command applied
 * since (setup placements included), and `botRngState` is where the bot's
 * decision stream is parked. Replaying the recipe reproduces `state` exactly —
 * which is what makes saves shareable as bug reports and balance scenarios.
 */
export type SaveFile = {
  version: typeof SAVE_FORMAT_VERSION;
  engineVersion: string;
  stateSchemaVersion: number;
  commandSchemaVersion: number;
  seed: number;
  mode: GameModeId;
  rulesetPatch: RulesetPatch | null;
  /** Exact frozen package used by new saves; absent only on legacy v1 files. */
  definition: GameDefinition;
  opening: OpeningKind;
  boardLayout: HegemonyState["boardLayout"];
  botRngState: number;
  history: CommandRecord[];
  state: HegemonyState;
};

export function saveGame(path: string, save: SaveFile): void {
  assertCurrentRecipeVersions(save, "save");
  assertRecipeMatchesState(save);
  assertGameInvariants(save.state, { strictCardConservation: true });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(save, null, 2));
}

export function loadGame(path: string): SaveFile {
  let raw: string;

  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(`no save file at ${path} — start one with: npm run sim -- new --seed 42`);
  }

  const serialized = JSON.parse(raw) as Omit<Partial<SaveFile>, "version"> &
    Partial<RecipeVersions> & {
      version?: unknown;
      definition?: GameDefinition;
      state?: HegemonyState;
      history: Array<CommandRecord | LegacyMoveRecord>;
    };
  const formatVersion = serialized.version;

  if (formatVersion !== 1 && formatVersion !== SAVE_FORMAT_VERSION) {
    throw new UnsupportedVersionError("save format", formatVersion, SAVE_FORMAT_VERSION);
  }

  if (!serialized.state?.ruleset) {
    throw new Error(`save file ${path} has no game state or ruleset`);
  }

  const history = (serialized.history ?? []).map(normalizeCommandRecord);
  const state =
    formatVersion === 1 ? migrateLegacyState(serialized.state, history) : serialized.state;
  if (formatVersion === SAVE_FORMAT_VERSION) assertCurrentRecipeVersions(serialized, "save");

  // v1 predates embedded definitions, so a legacy save is pinned to the exact
  // ruleset already serialized in its state plus the authored content package.
  const definition = serialized.definition
    ? hydrateGameDefinition(serialized.definition)
    : state.definition
      ? hydrateGameDefinition(state.definition)
      : createGameDefinition({
          ruleset: state.ruleset,
          content: getAuthoredGameContent(),
        });

  if (
    serialized.definition &&
    state.definition &&
    hydrateGameDefinition(state.definition).identity.id !== definition.identity.id
  ) {
    throw new Error(`save file ${path} carries conflicting game definitions`);
  }
  if (state.definitionId !== undefined && state.definitionId !== definition.identity.id) {
    throw new Error(`save file ${path} state requires a different game definition`);
  }
  if (stableDefinitionHash(state.ruleset) !== definition.identity.rulesetHash) {
    throw new Error(`save file ${path} state ruleset does not match its game definition`);
  }

  // Restore the shared immutable reference that JSON cannot preserve. This keeps
  // the transitional `state.ruleset` API honest until PR2 removes the alias.
  state.definition = definition;
  state.definitionId = definition.identity.id;
  state.ruleset = definition.ruleset;
  assertCurrentRecipeVersions(state, "state");
  assertGameInvariants(state, { strictCardConservation: true });

  const versions =
    formatVersion === 1
      ? CURRENT_RECIPE_VERSIONS
      : {
          engineVersion: serialized.engineVersion!,
          stateSchemaVersion: serialized.stateSchemaVersion!,
          commandSchemaVersion: serialized.commandSchemaVersion!,
        };
  const loaded: SaveFile = {
    version: SAVE_FORMAT_VERSION,
    ...versions,
    seed: serialized.seed!,
    mode: serialized.mode!,
    rulesetPatch: serialized.rulesetPatch ?? null,
    definition,
    opening: serialized.opening!,
    boardLayout: serialized.boardLayout ?? state.boardLayout,
    botRngState: serialized.botRngState!,
    history,
    state,
  };
  assertRecipeMatchesState(loaded);
  return loaded;
}

function assertRecipeMatchesState(save: SaveFile): void {
  if (
    save.engineVersion !== save.state.engineVersion ||
    save.stateSchemaVersion !== save.state.stateSchemaVersion ||
    save.commandSchemaVersion !== save.state.commandSchemaVersion
  ) {
    throw new Error("save recipe versions do not match its game state");
  }
  if (save.seed !== save.state.seed || save.boardLayout !== save.state.boardLayout) {
    throw new Error("save recipe seed or board layout does not match its game state");
  }
  if (save.definition.identity.id !== save.state.definitionId) {
    throw new Error("save recipe definition does not match its game state");
  }
}

/** Accept legacy v1 `{move}` records, but never carry their client-supplied costs forward. */
export function normalizeCommandRecord(record: CommandRecord | LegacyMoveRecord): CommandRecord {
  if ("command" in record) {
    return { player: record.player, command: stripLegacyCost(record.command) };
  }
  return { player: record.player, command: stripLegacyCost(record.move) };
}

function stripLegacyCost(command: GameCommand & { cost?: unknown }): GameCommand {
  const { cost: _ignored, ...intent } = command;
  return intent as GameCommand;
}
