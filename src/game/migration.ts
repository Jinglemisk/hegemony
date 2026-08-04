import type { GameCommand } from "./legalMoves";
import type { HegemonyState, PlayerId, Settlement } from "./types";
import {
  CURRENT_RECIPE_VERSIONS,
  COMMAND_SCHEMA_VERSION,
  STATE_SCHEMA_VERSION,
  UnsupportedVersionError,
} from "./version";

export interface HistoricalCommandRecord {
  player: PlayerId;
  command: GameCommand;
}

/**
 * Upgrade the unversioned state embedded by legacy v1 saves. Settlement identities
 * follow placement-command order, so loading a legacy snapshot and replaying its
 * recipe derive the same deterministic IDs rather than board-array-order accidents.
 */
export function migrateLegacyState(
  serialized: unknown,
  history: HistoricalCommandRecord[],
): HegemonyState {
  if (!serialized || typeof serialized !== "object") {
    throw new Error("legacy save has no game state");
  }

  const state = serialized as HegemonyState;
  if (state.stateSchemaVersion !== undefined && state.stateSchemaVersion !== STATE_SCHEMA_VERSION) {
    throw new UnsupportedVersionError(
      "legacy state schema",
      state.stateSchemaVersion,
      STATE_SCHEMA_VERSION,
    );
  }
  if (
    state.commandSchemaVersion !== undefined &&
    state.commandSchemaVersion !== COMMAND_SCHEMA_VERSION
  ) {
    throw new UnsupportedVersionError(
      "legacy command schema",
      state.commandSchemaVersion,
      COMMAND_SCHEMA_VERSION,
    );
  }
  Object.assign(state, CURRENT_RECIPE_VERSIONS);

  const settlements: Array<{ tileId: string; settlement: Settlement }> = [];

  for (const tile of state.board.tiles) {
    for (const settlement of tile.settlements) {
      settlement.tileId = settlement.tileId || tile.id;
      settlements.push({ tileId: tile.id, settlement });
    }
  }

  const needsIdentityMigration =
    !Number.isSafeInteger(state.nextEntityId) ||
    settlements.some(({ settlement }) => !settlement.id || !settlement.tileId) ||
    state.transfers.some(
      (transfer) => !transfer.id || !transfer.fromSettlementId || !transfer.toSettlementId,
    );
  if (!needsIdentityMigration) return state;

  // Legacy IDs shared presentation fields (season/log text) rather than an entity
  // namespace. Reconstruct the new allocator from command chronology, including
  // identities whose entities have already left the current snapshot.
  let nextEntityId = 1;
  const assignedSettlements = new Set<Settlement>();
  const assignedTransfers = new Set<(typeof state.transfers)[number]>();
  const allocate = (kind: "settlement" | "transfer") => `${kind}-${nextEntityId++}`;

  const assignAt = (player: PlayerId, tileId: string) => {
    const match = settlements.find(
      (entry) =>
        entry.tileId === tileId &&
        entry.settlement.owner === player &&
        !assignedSettlements.has(entry.settlement),
    );
    const id = allocate("settlement");
    if (match) {
      match.settlement.id = id;
      assignedSettlements.add(match.settlement);
    }
  };
  const assignTransfer = (player: PlayerId, fromTileId: string, toTileId: string) => {
    const match = state.transfers.find(
      (transfer) =>
        transfer.owner === player &&
        transfer.fromTileId === fromTileId &&
        transfer.toTileId === toTileId &&
        !assignedTransfers.has(transfer),
    );
    const id = allocate("transfer");
    if (match) {
      match.id = id;
      assignedTransfers.add(match);
    }
  };

  for (const { player, command } of history) {
    if (
      command.type === "placeCapital" ||
      command.type === "placeCity" ||
      command.type === "placeColony"
    ) {
      assignAt(player, command.tileId);
    } else if (command.type === "foundColony") {
      assignAt(player, command.tileId);
      assignTransfer(player, command.sourceTileId, command.tileId);
    } else if (command.type === "movePops") {
      assignTransfer(player, command.sourceTileId, command.targetTileId);
    }
  }
  for (const { settlement } of settlements) {
    if (!assignedSettlements.has(settlement)) {
      settlement.id = allocate("settlement");
      assignedSettlements.add(settlement);
    }
  }

  for (const transfer of state.transfers) {
    if (!assignedTransfers.has(transfer)) {
      transfer.id = allocate("transfer");
      assignedTransfers.add(transfer);
    }
    transfer.fromSettlementId ||=
      settlements.find(
        ({ tileId, settlement }) =>
          tileId === transfer.fromTileId && settlement.owner === transfer.owner,
      )?.settlement.id ?? `missing:${transfer.owner}:${transfer.fromTileId}`;
    transfer.toSettlementId ||=
      settlements.find(
        ({ tileId, settlement }) =>
          tileId === transfer.toTileId && settlement.owner === transfer.owner,
      )?.settlement.id ?? `missing:${transfer.owner}:${transfer.toTileId}`;
  }

  state.nextEntityId = nextEntityId;
  return state;
}
