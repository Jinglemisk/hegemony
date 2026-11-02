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
/** v18 (board modes, slice 1): the layouts are renamed, `shuffled` to `continental` and
 *  `classic` to `scenario`. Older saves name a layout this engine no longer reads, so
 *  they are rejected, not aliased. Commands are unchanged. */
/** v19 (board modes, slice 2): the `archipelago` layout, and the ruleset's placement block
 *  carries the sea reach. Older pinned rulesets cannot answer it, so older saves are
 *  rejected. Commands are unchanged. */
/** v20 (board modes, Q81): Silphium makes seven luxury goods, and an Archipelago board
 *  deals the oracle onto an island. The same seed lays a different board and seats the
 *  goods elsewhere, so older saves are rejected. Commands are unchanged. */
/** v21 (development deck, slice 1): the deck replaces Ventures. The state carries the
 *  deck's pile, discards and hands and the once-a-turn card flags, the ruleset the card's
 *  price for the venture stake, and the content the cards for the expedition tables.
 *  Command v8 drops the venture and adds buying and playing a card. The same seed deals
 *  the deck after every older shuffle, but older saves are rejected, not migrated. */
/** v22 (development deck, slice 2): the free card at +3 and a riot's card. The ruleset
 *  carries both switches and the free card's level, and a pending riot carries the pops
 *  still to answer once its die is cast. Command v9 adds the answer, pop or card. Older
 *  saves are rejected, not migrated. */
/** v23 (agency package, optional event pops): a seat may decline a pop card to the bottom
 *  of the player deck. The ruleset carries the switch, and command v10 adds the decline
 *  to resolving an event. Older saves are rejected, not migrated. */
/** v24 (agency package, kept Laws): repeals are voted first, and a Law still blocked at
 *  its turn is kept by its seat. The state carries each seat's kept Law and the ruleset
 *  the switch. Proposing takes the same command, now for a blocked or a kept Law too, so
 *  commands are unchanged. Older saves are rejected, not migrated. */
/** v25 (agency package, year forecast): next year's card is public, and a game longer
 *  than the deck shuffles the spent years back in a year earlier, so the next card can
 *  show. Such a v24 recording replays differently, so older saves are rejected. Commands
 *  are unchanged. */
export const STATE_SCHEMA_VERSION = 25;
export const COMMAND_SCHEMA_VERSION = 10;

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
