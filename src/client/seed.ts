/**
 * Create browser-owned entropy for a new match. The deterministic engine never
 * manufactures a seed: callers record and inject this value into the match recipe.
 */
export function createBrowserSeed(): number {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0];
}
