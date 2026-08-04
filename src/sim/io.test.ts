import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveTuning } from "../dev/tuning";
import { GAME_MODES } from "../game/ruleset";
import { createInitialStateFromDefinition } from "../game/state";
import { loadGame, saveGame } from "./io";
import type { SaveFile } from "./io";
import { CURRENT_RECIPE_VERSIONS, SAVE_FORMAT_VERSION } from "../game/version";
import { UnsupportedVersionError } from "../game/version";
import { enumerateLegalCommands, transition } from "../game/legalMoves";

describe("save definition hydration", () => {
  it("restores an immutable definition and the state's shared ruleset alias", () => {
    const directory = mkdtempSync(join(tmpdir(), "hegemony-definition-"));
    const path = join(directory, "game.json");

    try {
      const definition = resolveTuning(
        GAME_MODES.standard.ruleset,
        "low-number-core-v1",
      ).definition;
      const state = createInitialStateFromDefinition(definition, 73);
      const save: SaveFile = {
        version: SAVE_FORMAT_VERSION,
        ...CURRENT_RECIPE_VERSIONS,
        seed: 73,
        mode: "standard",
        rulesetPatch: null,
        definition,
        opening: "manual",
        boardLayout: state.boardLayout,
        botRngState: 1,
        history: [],
        state,
      };

      saveGame(path, save);
      const loaded = loadGame(path);

      expect(loaded.definition?.identity).toEqual(definition.identity);
      expect(loaded.state.definition).toBe(loaded.definition);
      expect(loaded.state.ruleset).toBe(loaded.state.definition.ruleset);
      expect(Object.isFrozen(loaded.state.definition.content)).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("migrates legacy unversioned settlement state deterministically", () => {
    const directory = mkdtempSync(join(tmpdir(), "hegemony-legacy-save-"));
    const path = join(directory, "game.json");
    try {
      const state = createInitialStateFromDefinition(
        resolveTuning(GAME_MODES.standard.ruleset, "low-number-core-v1").definition,
        91,
      );
      const command = enumerateLegalCommands(state, "0")[0];
      expect(command.type).toBe("placeCapital");
      if (command.type !== "placeCapital") throw new Error("expected an opening placement");
      const result = transition(state.definition, state, "0", command);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("opening placement failed");
      const legacyState = structuredClone(result.state) as unknown as Record<string, unknown>;
      delete legacyState.engineVersion;
      delete legacyState.stateSchemaVersion;
      delete legacyState.commandSchemaVersion;
      delete legacyState.nextEntityId;
      const settlement = (legacyState.board as typeof state.board).tiles.find(
        (tile) => tile.id === command.tileId,
      )!.settlements[0] as unknown as Record<string, unknown>;
      delete settlement.id;
      delete settlement.tileId;

      writeFileSync(
        path,
        JSON.stringify({
          version: 1,
          seed: 91,
          mode: "standard",
          rulesetPatch: null,
          definition: result.state.definition,
          opening: "manual",
          botRngState: 1,
          history: [{ player: "0", command }],
          state: legacyState,
        }),
      );

      const loaded = loadGame(path);
      const migrated = loaded.state.board.tiles.find((tile) => tile.id === command.tileId)!
        .settlements[0];
      expect(loaded.version).toBe(SAVE_FORMAT_VERSION);
      expect(migrated).toMatchObject({ id: "settlement-1", tileId: command.tileId });
      expect(loaded.state.nextEntityId).toBe(2);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("distinguishes unsupported save formats from malformed state", () => {
    const directory = mkdtempSync(join(tmpdir(), "hegemony-version-save-"));
    const path = join(directory, "game.json");
    try {
      writeFileSync(path, JSON.stringify({ version: 99 }));
      expect(() => loadGame(path)).toThrow(UnsupportedVersionError);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
