import type { HegemonyState } from "./types";

export type EntityKind = "settlement" | "transfer" | "luxury";

/** Allocate a deterministic, match-local identity from serialized state. Accepts any
 *  holder of the counter so creation-time allocation (luxury seating happens before
 *  the state object exists) shares the same sequence. */
export function allocateEntityId(G: Pick<HegemonyState, "nextEntityId">, kind: EntityKind): string {
  const id = `${kind}-${G.nextEntityId}`;
  G.nextEntityId += 1;
  return id;
}
