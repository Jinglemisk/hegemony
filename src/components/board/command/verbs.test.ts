import { describe, expect, it } from "vitest";
import { openAssembly } from "../../../game/assembly/assembly";
import { happinessLevel } from "../../../game/happiness";
import { scenario } from "../../../game/testing/scenario";
import { endTurn } from "../../../game/turn";
import type { HegemonyState } from "../../../game/types";
import { turnBlocked, turnPending } from "./verbs";

/** Seat 0's open turn, with no fate card drawn. */
const openTurn = () =>
  scenario()
    .opening()
    .mutate((draft) => {
      draft.pendingPlayerEvent = null;
    })
    .build();

/** The gate as the board asks it, for the viewer at `seat`. */
const blockedFor = (G: HegemonyState, seat = "0") =>
  turnBlocked({ isActive: G.currentPlayer === seat, phase: G.phase, pending: turnPending(G) });

describe("the turn gate", () => {
  it("is open on the viewer's own turn", () => {
    expect(blockedFor(openTurn())).toBeNull();
  });

  it("waits on the engine's pending decision before the turn: a riot, a fate card", () => {
    const riot = openTurn();
    riot.players["0"].unrestTokens =
      happinessLevel(riot, "0") - riot.ruleset.economy.unrest.riotThreshold;
    expect(endTurn(riot).ok).toBe(true);
    expect(riot.pendingRiot).not.toBeNull();
    expect(blockedFor(riot)).toBe("Finish the pending decision first.");

    const fate = scenario().opening().build();
    expect(fate.pendingPlayerEvent).not.toBeNull();
    expect(blockedFor(fate)).toBe("Finish the pending decision first.");
  });

  it("names the sitting Assembly before the seat", () => {
    const G = openTurn();
    openAssembly(G, "0");
    expect(blockedFor(G)).toBe("The Assembly is sitting: return to it to act.");
    expect(blockedFor(G, "1")).toBe("The Assembly is sitting: return to it to act.");
  });

  it("then the seat, then the phase", () => {
    expect(blockedFor(openTurn(), "1")).toBe("Current player's turn only.");
    const setup = scenario().build();
    expect(blockedFor(setup, setup.currentPlayer)).toBe("Gameplay only.");
  });
});
