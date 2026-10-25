// The four arms this report compares, built the way `sim batch` builds them (standard
// mode, the patch, no National Ideas). Main's default ruleset has no base income.
import { resolveTuning } from "../../../../../src/dev/tuning";
import { createGameDefinition } from "../../../../../src/game/definition";
import { GAME_MODES } from "../../../../../src/game/ruleset";
import type { RulesetPatch } from "../../../../../src/sim/io";

export const ARMS: Record<string, RulesetPatch | null> = {
  // The confirming batch (2026-10-25-no-base-income): main as it is.
  control: null,
  "leapfrog-off": { placement: { coastalLeapfrog: false } },
  // The 2026-10-24 masters-shuffled batch: 1 base food, as main then had.
  bf1: { economy: { baseIncome: { food: 1 } } },
  "bf1-leapfrog-off": { economy: { baseIncome: { food: 1 } }, placement: { coastalLeapfrog: false } },
};

export function armDefinition(arm: string) {
  if (!(arm in ARMS)) throw new Error(`unknown arm ${arm}: ${Object.keys(ARMS).join(", ")}`);
  const resolved = resolveTuning(GAME_MODES.standard.ruleset, null, {}, ARMS[arm]);
  const definition = createGameDefinition({
    ruleset: resolved.ruleset,
    content: { ...resolved.content, nationalIdeas: [] },
  });
  return { definition, patch: resolved.rulesetPatch };
}
