import { describe, expect, it } from "vitest";

import { createLowNumberContent, LOW_NUMBER_RULESET_PATCH } from "../dev/tuningPresets";
import { getAuthoredGameContent, getBuilding } from "./content";
import {
  canonicalJson,
  createGameDefinition,
  createModeDefinition,
  hydrateGameDefinition,
  stableDefinitionHash,
} from "./definition";
import { enumerateLegalCommands, transition } from "./legalMoves";
import { DEFAULT_RULESET, deriveRuleset } from "./ruleset";
import { createInitialStateFromDefinition } from "./state";

describe("game definitions", () => {
  it("hashes canonical JSON independently of key order and JSON-only omissions", () => {
    const first = { z: [1, undefined, 3], omitted: undefined, nested: { b: 2, a: 1 } };
    const roundTripped = JSON.parse(JSON.stringify(first)) as unknown;
    const reordered = { nested: { a: 1, b: 2 }, z: [1, null, 3] };

    expect(canonicalJson(first)).toBe(canonicalJson(reordered));
    expect(stableDefinitionHash(first)).toBe(stableDefinitionHash(roundTripped));
  });

  it("deep-freezes a package and preserves its identity through JSON hydration", () => {
    const definition = createModeDefinition("standard");
    const hydrated = hydrateGameDefinition(JSON.parse(JSON.stringify(definition)));

    expect(hydrated.identity).toEqual(definition.identity);
    expect(Object.isFrozen(hydrated)).toBe(true);
    expect(Object.isFrozen(hydrated.ruleset.startingResources)).toBe(true);
    expect(Object.isFrozen(hydrated.content.buildings[0].cost)).toBe(true);
  });

  it("rejects content whose persisted identity was tampered with", () => {
    const serialized = JSON.parse(JSON.stringify(createModeDefinition("standard")));
    serialized.content.buildings[0].cost.wood += 1;

    expect(() => hydrateGameDefinition(serialized)).toThrow(/identity mismatch/);
  });

  it("runs standard and low-number games interleaved without content leakage", () => {
    const standard = createModeDefinition("standard");
    const lowNumber = createGameDefinition({
      ruleset: deriveRuleset(DEFAULT_RULESET, LOW_NUMBER_RULESET_PATCH),
      content: createLowNumberContent(getAuthoredGameContent()),
    });
    let standardGame = createInitialStateFromDefinition(standard, 41);
    let lowNumberGame = createInitialStateFromDefinition(lowNumber, 41);
    const standardVillaWood = getBuilding(standard.content, "villa")?.cost.wood;
    const lowNumberVillaWood = getBuilding(lowNumber.content, "villa")?.cost.wood;

    expect(standard.identity.id).not.toBe(lowNumber.identity.id);
    expect(standardVillaWood).not.toBe(lowNumberVillaWood);

    // Alternate real engine transitions so neither match can depend on whichever
    // definition another caller resolved most recently.
    for (let step = 0; step < 2; step += 1) {
      for (const kind of ["standard", "lowNumber"] as const) {
        const game = kind === "standard" ? standardGame : lowNumberGame;
        const command = enumerateLegalCommands(game, game.currentPlayer)[0];
        expect(command).toBeDefined();
        const result = transition(game.definition, game, game.currentPlayer, command);
        expect(result.ok).toBe(true);
        if (!result.ok) continue;
        if (kind === "standard") standardGame = result.state;
        else lowNumberGame = result.state;
      }
    }

    expect(standardGame.definitionId).toBe(standard.identity.id);
    expect(lowNumberGame.definitionId).toBe(lowNumber.identity.id);
    expect(getBuilding(standardGame.definition.content, "villa")?.cost.wood).toBe(
      standardVillaWood,
    );
    expect(getBuilding(lowNumberGame.definition.content, "villa")?.cost.wood).toBe(
      lowNumberVillaWood,
    );
  });

  it("rejects a state whose pinned definition identity drifts", () => {
    const game = createInitialStateFromDefinition(createModeDefinition("standard"), 9);
    game.definitionId = "tampered";

    expect(() => enumerateLegalCommands(game, game.currentPlayer)).toThrow(/definition mismatch/);
  });

  it("preserves the definition/ruleset alias through the browser's Immer transition", () => {
    const game = createInitialStateFromDefinition(createModeDefinition("standard"), 17);
    const command = enumerateLegalCommands(game, game.currentPlayer)[0];
    const result = transition(game.definition, game, game.currentPlayer, command);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.state;

    expect(next.definition).toBe(game.definition);
    expect(next.ruleset).toBe(next.definition.ruleset);
  });
});
