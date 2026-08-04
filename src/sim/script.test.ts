import { describe, expect, it } from "vitest";

import { resolveTuning } from "../dev/tuning";
import { GAME_MODES } from "../game/ruleset";
import type { CommandRecord, SaveFile } from "./io";
import { randomPolicy } from "./policies";
import { createSimRng, deriveBotSeed } from "./rng";
import { runGame, runTurns } from "./runner";
import { replayScript, scriptFromSave } from "./script";
import { buildNewGame } from "./setup";

describe("record/replay", () => {
  it("replays legacy move records while stripping their derived costs", () => {
    const commands: CommandRecord[] = [];
    const G = runGame({
      seed: 19,
      mode: "standard",
      policy: randomPolicy,
      turns: 4,
      hooks: { onMove: (_G, player, command) => commands.push({ player, command }) },
    });
    const moves = commands.map(({ player, command }) => ({
      player,
      move: { ...command, cost: { gold: 0 } },
    }));

    const replayed = replayScript({
      version: 1,
      seed: 19,
      mode: "standard",
      rulesetPatch: null,
      opening: "random",
      moves,
    });

    expect(JSON.stringify(replayed)).toBe(JSON.stringify(G));
  });

  it("pins and replays the exact low-number definition after a JSON round trip", () => {
    const commands: CommandRecord[] = [];
    const definition = resolveTuning(GAME_MODES.standard.ruleset, "low-number-core-v1").definition;
    const G = runGame({
      seed: 31,
      mode: "standard",
      definition,
      policy: randomPolicy,
      turns: 12,
      hooks: { onMove: (_G, player, command) => commands.push({ player, command }) },
    });
    const serializedScript = JSON.parse(
      JSON.stringify({
        version: 1,
        seed: 31,
        mode: "standard",
        rulesetPatch: null,
        definition,
        opening: "random",
        commands,
      }),
    );

    const replayed = replayScript(serializedScript);

    expect(replayed.definitionId).toBe(definition.identity.id);
    expect(JSON.stringify(replayed)).toBe(JSON.stringify(G));
  });

  it("replaying a recorded game reproduces the state byte-for-byte", () => {
    const commands: CommandRecord[] = [];
    const G = runGame({
      seed: 21,
      mode: "standard",
      policy: randomPolicy,
      turns: 20,
      hooks: { onMove: (_G, player, command) => commands.push({ player, command }) },
    });

    const replayed = replayScript({
      version: 1,
      seed: 21,
      mode: "standard",
      rulesetPatch: null,
      opening: "random",
      commands,
    });

    expect(JSON.stringify(replayed)).toBe(JSON.stringify(G));
  });

  it("throws when the script diverges from the rules", () => {
    const commands: CommandRecord[] = [];
    runGame({
      seed: 21,
      mode: "standard",
      policy: randomPolicy,
      turns: 4,
      hooks: { onMove: (_G, player, command) => commands.push({ player, command }) },
    });

    // Wrong seed → different decks/board draws → the recorded moves stop fitting.
    expect(() =>
      replayScript({
        version: 1,
        seed: 22,
        mode: "standard",
        rulesetPatch: null,
        opening: "random",
        commands,
      }),
    ).toThrow(/replay diverged/);
  });

  it("carries the bot RNG stream so a continued replay matches a continued original", () => {
    const seed = 77;
    const history: CommandRecord[] = [];
    const rng = createSimRng(deriveBotSeed(seed));
    const G = buildNewGame({
      seed,
      mode: "standard",
      opening: "random",
      simRng: rng,
      onMove: (_G, player, command) => history.push({ player, command }),
    });
    const state = runTurns(G, randomPolicy, rng, 12, {
      onMove: (_G, player, command) => history.push({ player, command }),
    });

    const save: SaveFile = {
      version: 1,
      seed,
      mode: "standard",
      rulesetPatch: null,
      opening: "random",
      botRngState: rng.state(), // the ADVANCED stream position
      history,
      state,
    };

    const script = scriptFromSave(save);
    expect(script.botRngState).toBe(save.botRngState);

    // Rebuild the replayed save exactly as `replay --out` does.
    const replayedState = replayScript(script);
    const replayedBotRngState = script.botRngState ?? deriveBotSeed(seed);

    // Continue both from their parked streams → identical futures.
    const continuedOriginal = runTurns(
      structuredClone(save.state),
      randomPolicy,
      createSimRng(save.botRngState),
      8,
    );
    const continuedReplay = runTurns(
      structuredClone(replayedState),
      randomPolicy,
      createSimRng(replayedBotRngState),
      8,
    );
    expect(JSON.stringify(continuedReplay)).toBe(JSON.stringify(continuedOriginal));

    // Control: the old reset-to-start behavior diverges — which is the bug this fixes.
    const continuedReset = runTurns(
      structuredClone(replayedState),
      randomPolicy,
      createSimRng(deriveBotSeed(seed)),
      8,
    );
    expect(JSON.stringify(continuedReset)).not.toBe(JSON.stringify(continuedOriginal));
  });
});
