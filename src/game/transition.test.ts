import { describe, expect, it } from "vitest";

import { reduceGameCommand } from "../client/controller";
import { enumerateLegalCommands, enumerateLegalOptions, transition } from "./legalMoves";
import type { GameCommand } from "./legalMoves";
import { scenario } from "./testing/scenario";

describe("atomic game transition", () => {
  it("publishes a new state and typed log events without mutating its input", () => {
    const state = scenario().build();
    const before = JSON.stringify(state);
    const command = enumerateLegalCommands(state, state.currentPlayer)[0];

    const result = transition(state.definition, state, state.currentPlayer, command);

    expect(result.ok).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
    if (!result.ok) return;
    expect(result.state).not.toBe(state);
    expect(result.events).toEqual(
      result.state.log.slice(state.log.length).map((entry) => ({ type: "log", entry })),
    );
  });

  it("rejects atomically and leaves the original byte-identical", () => {
    const state = scenario().build();
    const before = JSON.stringify(state);

    const result = transition(state.definition, state, "1", { type: "endTurn" });

    expect(result.ok).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
  });

  it("keeps effective costs out of commands and ignores a spoofed legacy cost", () => {
    const state = scenario()
      .opening()
      .withResources("0", "wealthy")
      .mutate((draft) => {
        draft.pendingPlayerEvent = null;
        draft.pendingRiot = null;
      })
      .build();
    const option = enumerateLegalOptions(state, "0").find(
      ({ command }) => command.type === "buildBuilding",
    );

    expect(option?.cost).toBeDefined();
    expect(option?.command).not.toHaveProperty("cost");
    if (!option?.cost) return;

    const spoofed = { ...option.command, cost: {} } as unknown as GameCommand;
    const result = transition(state.definition, state, "0", spoofed);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const [resource, amount] of Object.entries(option.cost)) {
      const key = resource as keyof (typeof state.players)["0"]["resources"];
      expect(result.state.players["0"].resources[key]).toBe(
        state.players["0"].resources[key] - (amount ?? 0),
      );
    }
  });

  it("gives the browser adapter byte-identical execution", () => {
    const state = scenario().build();
    const command = enumerateLegalCommands(state, state.currentPlayer)[0];
    const direct = transition(state.definition, state, state.currentPlayer, command);

    expect(direct.ok).toBe(true);
    if (!direct.ok) return;
    expect(JSON.stringify(reduceGameCommand(state, state.currentPlayer, command))).toBe(
      JSON.stringify(direct.state),
    );
  });
});
