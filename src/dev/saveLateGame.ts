import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { getAuthoredGameContent } from "../game/content";
import { createGameDefinition } from "../game/definition";
import { GAME_MODES, boardRulesetPatch, deriveRuleset } from "../game/ruleset";
import { STATE_SCHEMA_VERSION } from "../game/version";
import { createSimRng, deriveBotSeed } from "../sim/rng";
import { buildNewGame } from "../sim/setup";
import { botsToYear } from "./botsToYear";

/** Plays a quick start to Year 9 with the master bots and stores the board, so
 *  `?dev=late-game` opens at once. Run `npm run dev:late-game` again after a change to
 *  the rules or the state's shape; until then the scene plays the bots itself. The board
 *  records the commit and the date it was made from. */
const SEED = 42;
const patch = boardRulesetPatch("archipelago");
const base = GAME_MODES.standard.ruleset;
const definition = createGameDefinition({
  ruleset: patch ? deriveRuleset(base, patch) : base,
  content: getAuthoredGameContent(),
});
const start = buildNewGame({
  seed: SEED,
  mode: "standard",
  definition,
  opening: "policy",
  boardLayout: "archipelago",
  simRng: createSimRng(deriveBotSeed(SEED)),
});
const state = botsToYear(start, 9);
const madeFrom = {
  commit: execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim(),
  date: new Date().toISOString().slice(0, 10),
};
writeFileSync(
  new URL("./late-game.json", import.meta.url),
  JSON.stringify({ stateSchemaVersion: STATE_SCHEMA_VERSION, madeFrom, state }),
);
console.log(
  `late-game: seed ${SEED}, year ${state.year}, turn ${state.turn}, from ${madeFrom.commit}`,
);
