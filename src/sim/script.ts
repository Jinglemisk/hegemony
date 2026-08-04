import { transition } from "../game/legalMoves";
import type { GameCommand, TransitionResult } from "../game/legalMoves";
import { createGameDefinition, hydrateGameDefinition } from "../game/definition";
import type { GameDefinition } from "../game/definition";
import { getAuthoredGameContent } from "../game/content";
import { GAME_MODES, deriveRuleset } from "../game/ruleset";
import type { GameModeId } from "../game/ruleset";
import { createInitialStateFromDefinition } from "../game/state";
import type { BoardLayout, HegemonyState, PlayerId } from "../game/types";
import { normalizeCommandRecord } from "./io";
import type { CommandRecord, OpeningKind, RulesetPatch, SaveFile } from "./io";
import {
  SCRIPT_FORMAT_VERSION,
  UnsupportedVersionError,
  assertCurrentRecipeVersions,
} from "../game/version";
import { assertGameInvariants } from "../game/invariants";

/**
 * A script is a save file minus the state: the recipe alone. Replaying it from
 * a fresh initial state reproduces the save's state byte-for-byte, which makes
 * scripts the regression net for rules changes — if a recorded game stops
 * replaying cleanly, a rule moved under it.
 */
export type ScriptFile = {
  version: typeof SCRIPT_FORMAT_VERSION;
  engineVersion: string;
  stateSchemaVersion: number;
  commandSchemaVersion: number;
  seed: number;
  mode: GameModeId;
  rulesetPatch: RulesetPatch | null;
  definition: GameDefinition;
  opening: OpeningKind;
  /** Terrain layout to rebuild from. Optional so pre-existing scripts still parse
   *  (they fall back to the classic default). */
  boardLayout: BoardLayout;
  /** Where the bot decision stream is parked after the recorded moves. Optional so
   *  pre-existing scripts still parse; carried through so a CONTINUED replay resumes
   *  the same bot stream as the original save instead of restarting it. */
  botRngState: number;
  /** Canonical intent history. `moves` is accepted only to replay legacy v1 scripts. */
  commands?: CommandRecord[];
  moves?: Array<
    | CommandRecord
    | { player: CommandRecord["player"]; move: CommandRecord["command"] & { cost?: unknown } }
  >;
};

type LegacyScriptFile = Omit<
  ScriptFile,
  | "version"
  | "engineVersion"
  | "stateSchemaVersion"
  | "commandSchemaVersion"
  | "definition"
  | "boardLayout"
  | "botRngState"
> & {
  version: 1;
  definition?: GameDefinition;
  boardLayout?: BoardLayout;
  botRngState?: number;
};

export class ReplayDivergenceError extends Error {
  readonly name = "ReplayDivergenceError";

  constructor(
    readonly commandIndex: number,
    command: CommandRecord["command"],
    reasons: string[],
  ) {
    super(
      `replay diverged at command ${commandIndex} (${JSON.stringify(command)}): ${reasons.join("; ") || "(no reason)"}`,
    );
  }
}

/** Replay seam for the canonical command transition; exported for parity proof. */
export function applyReplayCommand(
  state: HegemonyState,
  actor: PlayerId,
  command: GameCommand,
): TransitionResult {
  return transition(state.definition, state, actor, command);
}

export function scriptFromSave(save: SaveFile): ScriptFile {
  return {
    version: SCRIPT_FORMAT_VERSION,
    engineVersion: save.engineVersion,
    stateSchemaVersion: save.stateSchemaVersion,
    commandSchemaVersion: save.commandSchemaVersion,
    seed: save.seed,
    mode: save.mode,
    rulesetPatch: save.rulesetPatch,
    definition: save.definition,
    opening: save.opening,
    boardLayout: save.boardLayout,
    botRngState: save.botRngState,
    commands: save.history,
  };
}

export function replayScript(script: ScriptFile | LegacyScriptFile): HegemonyState {
  if (script.version !== 1 && script.version !== SCRIPT_FORMAT_VERSION) {
    throw new UnsupportedVersionError(
      "script format",
      (script as { version: unknown }).version,
      SCRIPT_FORMAT_VERSION,
    );
  }
  if (script.version === SCRIPT_FORMAT_VERSION) assertCurrentRecipeVersions(script, "script");

  const base = GAME_MODES[script.mode].ruleset;

  if (!base) {
    throw new Error(`script names unknown mode "${script.mode}"`);
  }

  const definition = script.definition
    ? hydrateGameDefinition(script.definition)
    : createGameDefinition({
        ruleset: script.rulesetPatch ? deriveRuleset(base, script.rulesetPatch) : base,
        content: getAuthoredGameContent(),
      });
  let G = createInitialStateFromDefinition(definition, script.seed, script.boardLayout);
  const records = script.commands ?? script.moves?.map(normalizeCommandRecord) ?? [];

  records.forEach(({ player, command }, index) => {
    const result = applyReplayCommand(G, player, command);

    if (!result.ok) {
      throw new ReplayDivergenceError(index, command, result.reasons);
    }
    G = result.state;
  });

  assertGameInvariants(G, { strictCardConservation: true });
  return G;
}
