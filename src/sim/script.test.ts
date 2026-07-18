import { describe, expect, it } from "vitest";

import type { MoveRecord, SaveFile } from "./io";
import { randomPolicy } from "./policies";
import { createSimRng, deriveBotSeed } from "./rng";
import { runGame, runTurns } from "./runner";
import { replayScript, scriptFromSave } from "./script";
import { buildNewGame } from "./setup";

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

  it("carries the bot RNG stream so a continued replay matches a continued original", () => {
    const seed = 77;
    const history: MoveRecord[] = [];
    const rng = createSimRng(deriveBotSeed(seed));
    const G = buildNewGame({
      seed,
      mode: "standard",
      opening: "random",
      simRng: rng,
      onMove: (_G, player, move) => history.push({ player, move }),
    });
    runTurns(G, randomPolicy, rng, 12, { onMove: (_G, player, move) => history.push({ player, move }) });

    const save: SaveFile = {
      version: 1,
      seed,
      mode: "standard",
      rulesetPatch: null,
      opening: "random",
      botRngState: rng.state(), // the ADVANCED stream position
      history,
      state: G,
    };

    const script = scriptFromSave(save);
    expect(script.botRngState).toBe(save.botRngState);

    // Rebuild the replayed save exactly as `replay --out` does.
    const replayedState = replayScript(script);
    const replayedBotRngState = script.botRngState ?? deriveBotSeed(seed);

    // Continue both from their parked streams → identical futures.
    const continuedOriginal = structuredClone(save.state);
    runTurns(continuedOriginal, randomPolicy, createSimRng(save.botRngState), 8);
    const continuedReplay = structuredClone(replayedState);
    runTurns(continuedReplay, randomPolicy, createSimRng(replayedBotRngState), 8);
    expect(JSON.stringify(continuedReplay)).toBe(JSON.stringify(continuedOriginal));

    // Control: the old reset-to-start behavior diverges — which is the bug this fixes.
    const continuedReset = structuredClone(replayedState);
    runTurns(continuedReset, randomPolicy, createSimRng(deriveBotSeed(seed)), 8);
    expect(JSON.stringify(continuedReset)).not.toBe(JSON.stringify(continuedOriginal));
  });
});
