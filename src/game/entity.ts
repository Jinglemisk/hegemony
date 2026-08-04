import type { HegemonyState } from "./types";

export type EntityKind = "settlement" | "transfer";

/** Allocate a deterministic, match-local identity from serialized state. */
export function allocateEntityId(G: HegemonyState, kind: EntityKind): string {
  const id = `${kind}-${G.nextEntityId}`;
  G.nextEntityId += 1;
  return id;
}
