import { applyMove } from "../game/legalMoves";
import { GAME_MODES, deriveRuleset } from "../game/ruleset";
import type { GameModeId } from "../game/ruleset";
import { createInitialState } from "../game/state";
import type { HegemonyState } from "../game/types";
import type { MoveRecord, OpeningKind, RulesetPatch, SaveFile } from "./io";

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
  opening: OpeningKind;
  /** Where the bot decision stream is parked after the recorded moves. Optional so
   *  pre-existing scripts still parse; carried through so a CONTINUED replay resumes
   *  the same bot stream as the original save instead of restarting it. */
  botRngState?: number;
  moves: MoveRecord[];
};

export function scriptFromSave(save: SaveFile): ScriptFile {
  return {
    version: 1,
    seed: save.seed,
    mode: save.mode,
    rulesetPatch: save.rulesetPatch,
    opening: save.opening,
    botRngState: save.botRngState,
    moves: save.history,
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

  const G = createInitialState(script.seed, script.rulesetPatch ? deriveRuleset(base, script.rulesetPatch) : base);

  script.moves.forEach(({ player, move }, index) => {
    if (G.currentPlayer !== player) {
      throw new Error(
        `replay diverged at move ${index}: script says player ${player} acts, but the game is on player ${G.currentPlayer}`,
      );
    }

    const result = applyMove(G, player, move);

    if (!result.ok) {
      throw new Error(
        `replay diverged at move ${index} (${JSON.stringify(move)}): ${result.reasons.join("; ") || "(no reason)"}`,
      );
    }
  });

  return G;
}
