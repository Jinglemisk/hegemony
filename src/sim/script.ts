import { transition } from "../game/legalMoves";
import { createGameDefinition, hydrateGameDefinition } from "../game/definition";
import type { GameDefinition } from "../game/definition";
import { getAuthoredGameContent } from "../game/content";
import { GAME_MODES, deriveRuleset } from "../game/ruleset";
import type { GameModeId } from "../game/ruleset";
import { createInitialStateFromDefinition } from "../game/state";
import type { BoardLayout, HegemonyState } from "../game/types";
import { normalizeCommandRecord } from "./io";
import type { CommandRecord, OpeningKind, RulesetPatch, SaveFile } from "./io";

/**
 * A script is a save file minus the state: the recipe alone. Replaying it from
 * a fresh initial state reproduces the save's state byte-for-byte, which makes
 * scripts the regression net for rules changes — if a recorded game stops
 * replaying cleanly, a rule moved under it.
 */
export type ScriptFile = {
  version: 1;
  seed: number;
  mode: GameModeId;
  rulesetPatch: RulesetPatch | null;
  definition?: GameDefinition;
  opening: OpeningKind;
  /** Terrain layout to rebuild from. Optional so pre-existing scripts still parse
   *  (they fall back to the classic default). */
  boardLayout?: BoardLayout;
  /** Where the bot decision stream is parked after the recorded moves. Optional so
   *  pre-existing scripts still parse; carried through so a CONTINUED replay resumes
   *  the same bot stream as the original save instead of restarting it. */
  botRngState?: number;
  /** Canonical intent history. `moves` is accepted only to replay legacy v1 scripts. */
  commands?: CommandRecord[];
  moves?: Array<
    | CommandRecord
    | { player: CommandRecord["player"]; move: CommandRecord["command"] & { cost?: unknown } }
  >;
};

export function scriptFromSave(save: SaveFile): ScriptFile {
  return {
    version: 1,
    seed: save.seed,
    mode: save.mode,
    rulesetPatch: save.rulesetPatch,
    definition: save.definition ?? save.state.definition,
    opening: save.opening,
    boardLayout: save.state.boardLayout,
    botRngState: save.botRngState,
    commands: save.history,
  };
}

export function replayScript(script: ScriptFile): HegemonyState {
  if (script.version !== 1) {
    throw new Error(`unsupported script version ${String(script.version)}`);
  }

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
    const result = transition(G.definition, G, player, command);

    if (!result.ok) {
      throw new Error(
        `replay diverged at command ${index} (${JSON.stringify(command)}): ${result.reasons.join("; ") || "(no reason)"}`,
      );
    }
    G = result.state;
  });

  return G;
}
