import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { LegalMove } from "../game/legalMoves";
import { getAuthoredGameContent } from "../game/content";
import {
  createGameDefinition,
  hydrateGameDefinition,
  stableDefinitionHash,
} from "../game/definition";
import type { GameModeId, RulesetPatch } from "../game/ruleset";
import type { HegemonyState, PlayerId } from "../game/types";
import type { GameDefinition } from "../game/definition";

export const DEFAULT_SAVE_PATH = ".sim/game.json";

export type { RulesetPatch } from "../game/ruleset";

export type OpeningKind = "random" | "fixed" | "manual";

export type MoveRecord = { player: PlayerId; move: LegalMove };

/**
 * A save is the full recipe for the game, not just its current state: seed +
 * mode + patch rebuild the initial state, `history` is every move applied
 * since (setup placements included), and `botRngState` is where the bot's
 * decision stream is parked. Replaying the recipe reproduces `state` exactly —
 * which is what makes saves shareable as bug reports and balance scenarios.
 */
export type SaveFile = {
  version: 1;
  seed: number;
  mode: GameModeId;
  rulesetPatch: RulesetPatch | null;
  /** Exact frozen package used by new saves; absent only on legacy v1 files. */
  definition?: GameDefinition;
  opening: OpeningKind;
  botRngState: number;
  history: MoveRecord[];
  state: HegemonyState;
};

export function saveGame(path: string, save: SaveFile): void {
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

  const save = JSON.parse(raw) as SaveFile;

  if (save.version !== 1) {
    throw new Error(`save file ${path} has unsupported version ${String(save.version)}`);
  }

  if (!save.state?.ruleset) {
    throw new Error(`save file ${path} has no game state or ruleset`);
  }

  // v1 predates embedded definitions, so a legacy save is pinned to the exact
  // ruleset already serialized in its state plus the authored content package.
  const definition = save.definition
    ? hydrateGameDefinition(save.definition)
    : save.state.definition
      ? hydrateGameDefinition(save.state.definition)
      : createGameDefinition({
          ruleset: save.state.ruleset,
          content: getAuthoredGameContent(),
        });

  if (
    save.definition &&
    save.state.definition &&
    hydrateGameDefinition(save.state.definition).identity.id !== definition.identity.id
  ) {
    throw new Error(`save file ${path} carries conflicting game definitions`);
  }
  if (save.state.definitionId !== undefined && save.state.definitionId !== definition.identity.id) {
    throw new Error(`save file ${path} state requires a different game definition`);
  }
  if (stableDefinitionHash(save.state.ruleset) !== definition.identity.rulesetHash) {
    throw new Error(`save file ${path} state ruleset does not match its game definition`);
  }

  // Restore the shared immutable reference that JSON cannot preserve. This keeps
  // the transitional `state.ruleset` API honest until PR2 removes the alias.
  save.definition = definition;
  save.state.definition = definition;
  save.state.definitionId = definition.identity.id;
  save.state.ruleset = definition.ruleset;

  return save;
}
