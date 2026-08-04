import { PLAYER_IDS } from "./data";
import { getPlayerEventCards, getResolutionCards, getSeasonalEventCards } from "./content";
import type { BallotItem, PoliticianId } from "./assembly/types";
import type { EventCard, HegemonyState, Pops, Settlement } from "./types";
import { COMMAND_SCHEMA_VERSION, STATE_SCHEMA_VERSION } from "./version";

export interface InvariantViolation {
  code: string;
  path: string;
  message: string;
}

export interface InvariantOptions {
  /** Full authored-card accounting is appropriate for authority snapshots, saves,
   * and replay proofs. Projected views intentionally replace private cards, while
   * focused rule fixtures may deliberately rig a partial deck. */
  strictCardConservation?: boolean;
}

export class GameInvariantError extends Error {
  readonly name = "GameInvariantError";

  constructor(readonly violations: InvariantViolation[]) {
    super(
      `game invariant violation${violations.length === 1 ? "" : "s"}: ${violations
        .map(({ code, path, message }) => `${code} at ${path}: ${message}`)
        .join("; ")}`,
    );
  }
}

/**
 * Validate the cheap structural guarantees every consumer relies on. This is kept
 * independent of command handling so importers, replay, and generated tests can run
 * the same checks at their own boundaries.
 */
export function collectInvariantViolations(
  G: HegemonyState,
  options: InvariantOptions = {},
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const add = (code: string, path: string, message: string) =>
    violations.push({ code, path, message });

  if (G.stateSchemaVersion !== STATE_SCHEMA_VERSION) {
    add("version.state", "stateSchemaVersion", `expected ${STATE_SCHEMA_VERSION}`);
  }
  if (G.commandSchemaVersion !== COMMAND_SCHEMA_VERSION) {
    add("version.command", "commandSchemaVersion", `expected ${COMMAND_SCHEMA_VERSION}`);
  }
  if (G.definitionId !== G.definition?.identity.id) {
    add("definition.identity", "definitionId", "does not match the pinned definition");
  }
  if (G.ruleset !== G.definition?.ruleset) {
    add("definition.ruleset", "ruleset", "is not the pinned definition ruleset reference");
  }
  if (!Number.isSafeInteger(G.nextEntityId) || G.nextEntityId < 1) {
    add("identity.counter", "nextEntityId", "must be a positive safe integer");
  }

  const settlementIds = new Set<string>();
  const settlementById = new Map<string, Settlement>();
  const ownerTileKeys = new Set<string>();

  for (const [tileIndex, tile] of G.board.tiles.entries()) {
    for (const [settlementIndex, settlement] of tile.settlements.entries()) {
      const path = `board.tiles[${tileIndex}].settlements[${settlementIndex}]`;
      if (!settlement.id) add("identity.missing", `${path}.id`, "settlement has no stable id");
      if (settlementIds.has(settlement.id)) {
        add("identity.duplicate", `${path}.id`, `duplicate settlement id ${settlement.id}`);
      }
      settlementIds.add(settlement.id);
      settlementById.set(settlement.id, settlement);

      if (settlement.tileId !== tile.id) {
        add("settlement.location", `${path}.tileId`, `expected containing tile ${tile.id}`);
      }
      if (!PLAYER_IDS.includes(settlement.owner)) {
        add("settlement.owner", `${path}.owner`, `unknown player ${settlement.owner}`);
      }
      const ownerTileKey = `${settlement.owner}:${tile.id}`;
      if (ownerTileKeys.has(ownerTileKey)) {
        add("settlement.ambiguous", path, "one player cannot own two settlements on one tile");
      }
      ownerTileKeys.add(ownerTileKey);
      validatePops(settlement.pops, `${path}.pops`, add, false);
    }
  }

  for (const playerID of PLAYER_IDS) {
    const indexed = G.players[playerID]?.settlements ?? [];
    const boardOwned = G.board.tiles
      .filter((tile) => tile.settlements.some((settlement) => settlement.owner === playerID))
      .map((tile) => tile.id);
    if (!sameMultiset(indexed, boardOwned)) {
      add(
        "settlement.index",
        `players.${playerID}.settlements`,
        `index [${indexed.join(", ")}] disagrees with board [${boardOwned.join(", ")}]`,
      );
    }
    if (new Set(indexed).size !== indexed.length) {
      add(
        "settlement.indexDuplicate",
        `players.${playerID}.settlements`,
        "contains duplicate tiles",
      );
    }
  }

  const transferIds = new Set<string>();
  for (const [index, transfer] of G.transfers.entries()) {
    const path = `transfers[${index}]`;
    if (!transfer.id || transferIds.has(transfer.id)) {
      add("transfer.identity", `${path}.id`, "transfer id is missing or duplicated");
    }
    transferIds.add(transfer.id);
    if (!PLAYER_IDS.includes(transfer.owner)) {
      add("transfer.owner", `${path}.owner`, `unknown player ${transfer.owner}`);
    }
    if (!transfer.fromSettlementId || !transfer.toSettlementId) {
      add("transfer.reference", path, "requires stable source and target settlement ids");
    }
    for (const [field, settlementId] of [
      ["fromSettlementId", transfer.fromSettlementId],
      ["toSettlementId", transfer.toSettlementId],
    ] as const) {
      const settlement = settlementById.get(settlementId);
      // A destination can disappear while pops are travelling; arrival then returns
      // them to the stable source. Existing endpoints must always retain ownership.
      if (settlement && settlement.owner !== transfer.owner) {
        add("transfer.ownership", `${path}.${field}`, "endpoint belongs to another player");
      }
    }
    validatePops(transfer.pops, `${path}.pops`, add, true);
  }

  for (const id of [...settlementIds, ...transferIds]) {
    const allocated = Number(id.match(/-(\d+)$/)?.[1]);
    if (Number.isSafeInteger(allocated) && allocated >= G.nextEntityId) {
      add("identity.counter", "nextEntityId", `must be greater than allocated identity ${id}`);
    }
  }

  if (options.strictCardConservation) {
    validateEventCards(G, "seasonal", getSeasonalEventCards(G.definition.content), add);
    validateEventCards(G, "player", getPlayerEventCards(G.definition.content), add);
    validateResolutionCards(G, add);
  }
  validateAssembly(G, add);

  return violations;
}

export function assertGameInvariants(G: HegemonyState, options: InvariantOptions = {}): void {
  const violations = collectInvariantViolations(G, options);
  if (violations.length > 0) throw new GameInvariantError(violations);
}

function validatePops(
  pops: Pops,
  path: string,
  add: (code: string, path: string, message: string) => void,
  requirePositive: boolean,
) {
  let total = 0;
  for (const [kind, amount] of Object.entries(pops)) {
    if (!Number.isSafeInteger(amount) || amount < 0) {
      add("pops.invalid", `${path}.${kind}`, "must be a non-negative safe integer");
    }
    total += amount;
  }
  if (requirePositive && total <= 0) add("pops.emptyTransfer", path, "transfer must carry a pop");
}

function sameMultiset(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

function validateEventCards(
  G: HegemonyState,
  deck: "seasonal" | "player",
  definitions: EventCard[],
  add: (code: string, path: string, message: string) => void,
) {
  const expected = new Map(definitions.map((card) => [card.id, card.count]));
  const actual = new Map<string, number>();
  const count = (card: EventCard | undefined | null) => {
    if (card) actual.set(card.id, (actual.get(card.id) ?? 0) + 1);
  };

  const draw = deck === "seasonal" ? G.seasonalDrawPile : G.playerDrawPile;
  const discard = deck === "seasonal" ? G.seasonalDiscardPile : G.playerDiscardPile;
  draw.forEach(count);
  discard.forEach(count);
  if (deck === "seasonal") count(G.activeSeasonEvent?.card);
  else count(G.pendingPlayerEvent?.card);

  for (const [cardId, expectedCount] of expected) {
    const actualCount = actual.get(cardId) ?? 0;
    if (actualCount !== expectedCount) {
      add(
        "cards.conservation",
        `${deck}Cards.${cardId}`,
        `expected ${expectedCount} live copies, found ${actualCount}`,
      );
    }
  }
  for (const cardId of actual.keys()) {
    if (!expected.has(cardId)) add("cards.unknown", `${deck}Cards.${cardId}`, "unknown card id");
  }
}

function validateResolutionCards(
  G: HegemonyState,
  add: (code: string, path: string, message: string) => void,
) {
  const expected = new Set(getResolutionCards(G.definition.content).map((card) => card.id));
  const actual = new Map<string, number>();
  const countId = (cardId: string) => actual.set(cardId, (actual.get(cardId) ?? 0) + 1);
  const countItem = (item: BallotItem | null | undefined) => {
    if (item?.kind === "enact") countId(item.card.id);
  };

  for (const politician of Object.keys(G.politicianDecks) as PoliticianId[]) {
    G.politicianDecks[politician].forEach(countId);
    G.politicianDiscards[politician].forEach(countId);
  }
  G.activeLaws.forEach((law) => countId(law.cardId));

  const session = G.assembly;
  if (session?.phase === "proposal") {
    countItem(session.houseItem);
    Object.values(session.held).forEach((held) => held && countId(held.card.id));
    Object.values(session.proposals).forEach(countItem);
  } else if (session?.phase === "voting") {
    session.ballot.slice(session.ballotIndex).forEach(countItem);
  }

  for (const cardId of expected) {
    const count = actual.get(cardId) ?? 0;
    if (count !== 1) {
      add(
        "cards.resolutionConservation",
        `resolutionCards.${cardId}`,
        `expected 1 live copy, found ${count}`,
      );
    }
  }
  for (const cardId of actual.keys()) {
    if (!expected.has(cardId))
      add("cards.unknownResolution", `resolutionCards.${cardId}`, "unknown card id");
  }
}

function validateAssembly(
  G: HegemonyState,
  add: (code: string, path: string, message: string) => void,
) {
  const session = G.assembly;
  if (!session) return;

  if (session.year < 1 || session.season !== G.season) {
    add("assembly.calendar", "assembly", "session must belong to the current season");
  }
  if (
    new Set(session.voteOrder).size !== PLAYER_IDS.length ||
    !PLAYER_IDS.every((playerID) => session.voteOrder.includes(playerID))
  ) {
    add("assembly.voteOrder", "assembly.voteOrder", "must contain every player exactly once");
  }

  for (const playerID of PLAYER_IDS) {
    if (session.held[playerID] && session.proposals[playerID]) {
      add("assembly.cardState", `assembly.held.${playerID}`, "held and proposed cards overlap");
    }
    if (session.proposalDone[playerID] && session.held[playerID]) {
      add(
        "assembly.proposalState",
        `assembly.proposalDone.${playerID}`,
        "finalized seat still holds a card",
      );
    }
    const proposal = session.proposals[playerID];
    if (
      proposal?.kind === "enact" &&
      proposal.card.kind === "directive" &&
      (!proposal.target || proposal.target === playerID)
    ) {
      add("assembly.directiveTarget", `assembly.proposals.${playerID}.target`, "must name a rival");
    }
  }

  if (session.phase === "proposal") {
    if (session.ballot.length !== 0 || session.ballotIndex !== 0 || session.voteIndex !== 0) {
      add("assembly.phase", "assembly", "proposal phase cannot have an active ballot");
    }
    if (session.proposalDone[session.activePlayer]) {
      add("assembly.actor", "assembly.activePlayer", "proposal actor has already finalized");
    }
  } else if (session.phase === "voting") {
    if (
      session.ballot.length === 0 ||
      session.ballotIndex < 0 ||
      session.ballotIndex >= session.ballot.length
    ) {
      add("assembly.ballotIndex", "assembly.ballotIndex", "must select a live ballot item");
    }
    if (session.voteIndex < 0 || session.voteIndex >= session.voteOrder.length) {
      add("assembly.voteIndex", "assembly.voteIndex", "must select a live voter");
    } else if (session.activePlayer !== session.voteOrder[session.voteIndex]) {
      add("assembly.actor", "assembly.activePlayer", "does not match the active voter");
    }
    if (new Set(session.votes.map((vote) => vote.playerID)).size !== session.votes.length) {
      add("assembly.duplicateVote", "assembly.votes", "a player voted twice on one item");
    }
  } else if (session.activePlayer !== session.resumePlayer) {
    add("assembly.actor", "assembly.activePlayer", "closing actor must be the suspended player");
  }
}
