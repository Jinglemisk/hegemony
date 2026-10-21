import { existsSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { createModeDefinition } from "../game/definition";

import { DEFAULT_RULESET } from "../game/ruleset";
import { scenario } from "../game/testing/scenario";
import { Aggregator } from "../sim/telemetry";
import { COMMAND_PARITY, GAME_COMMAND_TYPES } from "./commandParity";

describe("three-axis move parity gate", () => {
  it("gives every legal move concrete frontend and simulation evidence", () => {
    expect(Object.keys(COMMAND_PARITY)).toEqual(GAME_COMMAND_TYPES);
    expect(new Set(GAME_COMMAND_TYPES).size).toBe(GAME_COMMAND_TYPES.length);

    for (const moveType of GAME_COMMAND_TYPES) {
      const coverage = COMMAND_PARITY[moveType];

      const { frontend } = coverage;
      if (frontend.kind === "batch-only") {
        // Off in the game people play, so no screen owes it a surface.
        const value = frontend.ruleset
          .split(".")
          .reduce<unknown>((at, key) => (at as Record<string, unknown>)?.[key], DEFAULT_RULESET);
        expect(value, `${moveType}: ${frontend.ruleset}`).toBe(false);
      } else {
        for (const surface of frontend.surfaces) {
          expect(existsSync(surface), `${moveType}: missing frontend evidence ${surface}`).toBe(
            true,
          );
        }
      }
      expect(
        existsSync(coverage.simulation.implementation),
        `${moveType}: missing simulation evidence file`,
      ).toBe(true);
      expect(coverage.simulation.evidence.trim(), `${moveType}: simulation evidence`).not.toBe("");
    }
  });

  it("zero-fills universal telemetry and counts an observed move", () => {
    const aggregator = new Aggregator();
    const G = scenario({ seed: 77 }).opening().build();

    aggregator.beginGame(0, 77, G);
    aggregator.onMove(G, G.currentPlayer, { type: "endTurn" });
    aggregator.endGame(G);

    const report = aggregator.buildReport({
      games: 1,
      turns: 0,
      policy: "master",
      mode: "standard",
      boardLayout: "classic",
      baseSeed: 77,
      opening: "policy",
      botSeedRule: "test",
      rulesetPatch: null,
      definition: createModeDefinition("standard").identity,
      generatedAt: "test",
    });

    expect(Object.keys(report.movesByType)).toEqual(GAME_COMMAND_TYPES);
    expect(report.movesByType.endTurn).toEqual({ count: 1, perGame: 1 });
    expect(report.movesByType.assemblyBribe).toEqual({ count: 0, perGame: 0 });
  });
});
