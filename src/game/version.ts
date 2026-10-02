/**
 * Runtime compatibility contract for persisted matches.
 *
 * Engine releases may change without invalidating data. State and command schema
 * versions move only when their serialized shapes require migration or rejection.
 */
export const ENGINE_VERSION = "0.1.0";
/** v2 (Phase 4): the board carries the luxury-asset registry and the ruleset the
 *  `economy.luxury` block. Pre-luxury saves are rejected rather than limped along —
 *  their pinned rulesets cannot answer the new happiness questions. */
/** v3 (v2 migration, Step 3): tiles carry slots and a resource type with no printed
 *  amount, and hunger replaces the food-deficit counter on the player. Saves from
 *  `main` are rejected, not migrated. */
/** v4 (v2 migration, Step 4): the building roster is six, the ruleset carries pieces,
 *  the Dole and the move price, and players carry the move and calm flags. v2 commands
 *  add the Dole. Older saves are rejected, not migrated. */
/** v5 (v2 migration, Step 5): happiness is a level derived from the board. Players
 *  hold no happiness and no timed moods; they carry a count of Unrest tokens. Older
 *  saves are rejected, not migrated. */
export const STATE_SCHEMA_VERSION = 5;
export const COMMAND_SCHEMA_VERSION = 2;

export const SAVE_FORMAT_VERSION = 2;
export const SCRIPT_FORMAT_VERSION = 2;

export const CURRENT_RECIPE_VERSIONS = Object.freeze({
  engineVersion: ENGINE_VERSION,
  stateSchemaVersion: STATE_SCHEMA_VERSION,
  commandSchemaVersion: COMMAND_SCHEMA_VERSION,
});

export interface RecipeVersions {
  engineVersion: string;
  stateSchemaVersion: number;
  commandSchemaVersion: number;
}

export class UnsupportedVersionError extends Error {
  readonly name = "UnsupportedVersionError";

  constructor(
    readonly subject: string,
    readonly received: unknown,
    readonly supported: string | number,
  ) {
    super(`unsupported ${subject} version ${String(received)}; this engine supports ${supported}`);
  }
}

export function assertCurrentRecipeVersions(
  recipe: Partial<RecipeVersions>,
  subject: string,
): void {
  if (recipe.stateSchemaVersion !== STATE_SCHEMA_VERSION) {
    throw new UnsupportedVersionError(
      `${subject} state schema`,
      recipe.stateSchemaVersion,
      STATE_SCHEMA_VERSION,
    );
  }
  if (recipe.commandSchemaVersion !== COMMAND_SCHEMA_VERSION) {
    throw new UnsupportedVersionError(
      `${subject} command schema`,
      recipe.commandSchemaVersion,
      COMMAND_SCHEMA_VERSION,
    );
  }
}
