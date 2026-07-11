import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { LegalMove } from "../game/legalMoves";
import type { deriveRuleset, GameModeId } from "../game/ruleset";
import type { HegemonyState, PlayerId } from "../game/types";

export const DEFAULT_SAVE_PATH = ".sim/game.json";

export type RulesetPatch = Parameters<typeof deriveRuleset>[1];

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

  return save;
}
