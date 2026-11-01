import { writeFileSync } from "node:fs";
import { getAuthoredGameContent } from "../game/content";
import { createGameDefinition } from "../game/definition";
import { GAME_MODES, boardRulesetPatch, deriveRuleset } from "../game/ruleset";
import { STATE_SCHEMA_VERSION } from "../game/version";
import { createSimRng, deriveBotSeed } from "../sim/rng";
import { buildNewGame } from "../sim/setup";
import { botsToYear } from "./botsToYear";

/** Plays a quick start to Year 12 with the master bots and stores the board, so
 *  `?dev=late-game` opens at once. Run `npm run dev:late-game` again after a change to
 *  the rules or the state's shape; until then the scene plays the bots itself. */
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
const state = botsToYear(start, 12);
writeFileSync(
  new URL("./late-game.json", import.meta.url),
  JSON.stringify({ stateSchemaVersion: STATE_SCHEMA_VERSION, state }),
);
console.log(`late-game: seed ${SEED}, year ${state.year}, turn ${state.turn}`);
