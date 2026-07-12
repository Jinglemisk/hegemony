import { describe, expect, it } from "vitest";

import type { MoveRecord } from "./io";
import { randomPolicy } from "./policies";
import { runGame } from "./runner";
import { replayScript } from "./script";

describe("record/replay", () => {
  it("replaying a recorded game reproduces the state byte-for-byte", () => {
    const moves: MoveRecord[] = [];
    const G = runGame({
      seed: 21,
      mode: "standard",
      policy: randomPolicy,
      turns: 20,
      hooks: { onMove: (_G, player, move) => moves.push({ player, move }) },
    });

    const replayed = replayScript({
      version: 1,
      seed: 21,
      mode: "standard",
      rulesetPatch: null,
      opening: "random",
      moves,
    });

    expect(JSON.stringify(replayed)).toBe(JSON.stringify(G));
  });

  it("throws when the script diverges from the rules", () => {
    const moves: MoveRecord[] = [];
    runGame({
      seed: 21,
      mode: "standard",
      policy: randomPolicy,
      turns: 4,
      hooks: { onMove: (_G, player, move) => moves.push({ player, move }) },
    });

    // Wrong seed → different decks/board draws → the recorded moves stop fitting.
    expect(() =>
      replayScript({ version: 1, seed: 22, mode: "standard", rulesetPatch: null, opening: "random", moves }),
    ).toThrow(/replay diverged/);
  });
});
