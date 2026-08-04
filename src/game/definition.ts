import { getAuthoredGameContent } from "./content";
import type { GameContent } from "./content";
import { GAME_MODES } from "./ruleset";
import type { GameModeId, Ruleset } from "./ruleset";

export const RULESET_VERSION = "1";
export const CONTENT_VERSION = "1";

export interface DefinitionIdentity {
  readonly id: string;
  readonly rulesetVersion: string;
  readonly rulesetHash: string;
  readonly contentVersion: string;
  readonly contentHash: string;
}

/**
 * Complete immutable rules and effective content for one match. The current state
 * contract pins this frozen object alongside its identity, so snapshots may share
 * it safely and no query needs process-global content.
 */
export interface GameDefinition {
  readonly identity: DefinitionIdentity;
  readonly ruleset: Ruleset;
  readonly content: GameContent;
}

export type GameDefinitionInput = {
  ruleset: Ruleset;
  content: GameContent;
  rulesetVersion?: string;
  contentVersion?: string;
};

/**
 * Canonical JSON makes hashes stable across object construction and key order.
 * Its treatment of `undefined` deliberately matches JSON.stringify: object keys
 * disappear and array holes become null. Definition IDs therefore survive a
 * save-file round trip unchanged.
 */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((child) => (child === undefined ? "null" : canonicalJson(child))).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/**
 * Versioned 64-bit FNV-1a. This is an identity checksum, not a security primitive;
 * its browser-safe synchronous output is sufficient for definition mismatch detection.
 */
export function stableDefinitionHash(value: unknown): string {
  const input = canonicalJson(value);
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = (hash * prime) & mask;
  }

  return hash.toString(16).padStart(16, "0");
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
}

export function createGameDefinition({
  ruleset,
  content,
  rulesetVersion = RULESET_VERSION,
  contentVersion = CONTENT_VERSION,
}: GameDefinitionInput): GameDefinition {
  // Clone before freezing so authored tables and caller-owned tuning inputs remain reusable.
  const frozenRuleset = deepFreeze(structuredClone(ruleset));
  const frozenContent = deepFreeze(structuredClone(content));
  const rulesetHash = stableDefinitionHash(frozenRuleset);
  const contentHash = stableDefinitionHash(frozenContent);
  const identity = deepFreeze({
    id: `${rulesetVersion}:${rulesetHash}/${contentVersion}:${contentHash}`,
    rulesetVersion,
    rulesetHash,
    contentVersion,
    contentHash,
  });

  return deepFreeze({ identity, ruleset: frozenRuleset, content: frozenContent });
}

export function createModeDefinition(mode: GameModeId): GameDefinition {
  return createGameDefinition({
    ruleset: GAME_MODES[mode].ruleset,
    content: getAuthoredGameContent(),
  });
}

/**
 * Rebuild an immutable definition received from JSON and verify every persisted
 * identity field. Never trust the saved hashes before hashing the saved payload.
 */
export function hydrateGameDefinition(serialized: unknown): GameDefinition {
  if (!serialized || typeof serialized !== "object") {
    throw new Error("game definition is missing or malformed");
  }

  const candidate = serialized as Partial<GameDefinition>;
  const identity = candidate.identity as Partial<DefinitionIdentity> | undefined;
  if (
    !identity ||
    typeof identity.id !== "string" ||
    typeof identity.rulesetVersion !== "string" ||
    typeof identity.rulesetHash !== "string" ||
    typeof identity.contentVersion !== "string" ||
    typeof identity.contentHash !== "string" ||
    !candidate.ruleset ||
    !candidate.content
  ) {
    throw new Error("game definition is missing required identity, ruleset, or content fields");
  }

  const hydrated = createGameDefinition({
    ruleset: candidate.ruleset,
    content: candidate.content,
    rulesetVersion: identity.rulesetVersion,
    contentVersion: identity.contentVersion,
  });

  for (const field of [
    "id",
    "rulesetVersion",
    "rulesetHash",
    "contentVersion",
    "contentHash",
  ] as const) {
    if (hydrated.identity[field] !== identity[field]) {
      throw new Error(
        `game definition identity mismatch for ${field}: expected ${String(identity[field])}, calculated ${hydrated.identity[field]}`,
      );
    }
  }

  return hydrated;
}

/** Assert the state's compatibility alias still points at its pinned definition. */
export function assertStateDefinition(state: {
  definition?: GameDefinition;
  definitionId?: string;
  ruleset?: Ruleset;
}): asserts state is { definition: GameDefinition; definitionId: string; ruleset: Ruleset } {
  if (!state.definition) {
    throw new Error("game state has no definition");
  }
  if (state.definition.identity.id !== state.definitionId) {
    throw new Error(
      `game definition mismatch: state requires ${String(state.definitionId)}, carries ${state.definition.identity.id}`,
    );
  }
  // Immer may expose two distinct draft proxies for the same shared object while a
  // browser transition is executing. Fast-path the normal shared reference, then
  // compare its small ruleset payload only for adapters that cannot preserve aliases.
  if (
    state.ruleset !== state.definition.ruleset &&
    stableDefinitionHash(state.ruleset) !== state.definition.identity.rulesetHash
  ) {
    throw new Error("game ruleset alias does not reference the state's pinned definition");
  }
}
