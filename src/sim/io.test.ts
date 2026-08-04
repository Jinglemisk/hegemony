import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveTuning } from "../dev/tuning";
import { GAME_MODES } from "../game/ruleset";
import { createInitialStateFromDefinition } from "../game/state";
import { loadGame, saveGame } from "./io";
import type { SaveFile } from "./io";

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
        version: 1,
        seed: 73,
        mode: "standard",
        rulesetPatch: null,
        definition,
        opening: "manual",
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
});
