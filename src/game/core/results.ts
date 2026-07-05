import type { Resources } from "../types";

/**
 * Result of a mutating move. `ok: false` carries the same human-readable
 * reasons the matching `get*Status` validator produces, so failures can be
 * surfaced without re-deriving them.
 */
export type MoveResult = { ok: true } | { ok: false; reasons: string[] };

export const MOVE_OK: MoveResult = { ok: true };

export function invalid(...reasons: string[]): MoveResult {
  return { ok: false, reasons };
}

export type ActionStatus = {
  can: boolean;
  reasons: string[];
  cost?: Partial<Resources>;
};
