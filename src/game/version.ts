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
/** v6 (v2 migration, Step 6): the year deck replaces seasons and the omen; Voice
 *  reads standing Laws. Older saves are rejected, not migrated. */
/** v7 (Step 7): twelve player-card kinds, explicit token verbs, no coupon state.
 *  Command v3 removes card choice and venture stake arguments. */
/** v8 (Step 8): player-only Assembly, Appendix B effects, no veto/replacement choice.
 * Command v4 names the vote payment. Older saves are rejected. */
/** v9 (Step 9): public Ideas, concealed setup picks; command v5 adds pick/buy. */
/** v10 (Step 13): an open Idea draft with no setup-pick store, pending hunger, and log
 *  moments. Command v6 adds the hunger choice. Older saves are rejected. */
/** v11 (Step 17): hunger is settled at turn end, and food may be below zero during
 *  its owner's turn. A v10 save can hold a hunger pick taken at income, so older
 *  saves are rejected. Commands are unchanged. */
/** v12 (Step 18): pops on the move count for happiness, the titles and the vote, and
 *  no stock but food goes below zero. A v11 recording replays differently, so older
 *  saves are rejected. Commands are unchanged. */
/** v13 (code health, single sources): the ruleset carries the Idea price and purchase
 *  limit, the revolt's slave share and the Assembly tie rule. Older pinned rulesets
 *  cannot answer them, so older saves are rejected. Commands are unchanged. */
/** v14 (code health, typed Laws): every Law effect is typed data, no Law is a named
 *  rule flag, a Law card carries no `tradeOff`, and the Port's luxury claim is a
 *  building flag. Older pinned content holds rule flags nothing reads and no claim
 *  flag, so older saves are rejected. Commands are unchanged. */
/** v15 (player trade, PR 1): open trade offers on the state, a Ready step in the
 *  Assembly's preparation, and traded pops on the move that name their giver. Command v7
 *  adds the trade commands and Ready. Older saves are rejected. */
/** v16 (player trade, PR 2): the bank is a ruleset switch, off by default, every
 *  settlement makes base food, and the state counts each seat's offers in the trading
 *  window. Older pinned rulesets cannot answer the switches, so older saves are
 *  rejected. Commands are unchanged. */
/** v17 (game settings, engine): base food becomes a base income in every resource, all
 *  zero by default, and the ruleset carries the game's length in years. Older pinned
 *  rulesets carry `baseFood` and no length, so older saves are rejected. Commands are
 *  unchanged. */
export const STATE_SCHEMA_VERSION = 17;
export const COMMAND_SCHEMA_VERSION = 7;

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
