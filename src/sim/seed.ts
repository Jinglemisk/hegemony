import { randomBytes } from "node:crypto";

/** Create CLI-owned entropy when a simulation seed was not supplied explicitly. */
export function createCliSeed(): number {
  return randomBytes(4).readUInt32LE(0);
}
