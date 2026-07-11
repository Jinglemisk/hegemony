import { mulberry32 } from "../game/core/rng";

/**
 * The sim's own PRNG stream, independent of the game's `G.rng`: bot decisions
 * must never advance the deck-shuffle state, or changing a bot policy would
 * change which cards come up. Same mulberry32 core, separate stream.
 */
export type SimRng = {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  pick<T>(items: T[]): T;
  /** The serializable stream position — persist it to keep later runs deterministic. */
  state(): number;
};

/** Default bot seed: the game seed pushed onto a decorrelated stream. */
export function deriveBotSeed(gameSeed: number): number {
  return (gameSeed ^ 0x9e3779b9) >>> 0;
}

export function createSimRng(seed: number): SimRng {
  let state = seed >>> 0;

  const next = () => {
    const step = mulberry32(state);
    state = step.state;
    return step.value;
  };

  return {
    next,
    int: (maxExclusive: number) => Math.floor(next() * maxExclusive),
    pick: <T>(items: T[]): T => {
      if (items.length === 0) {
        throw new Error("cannot pick from an empty list");
      }
      return items[Math.floor(next() * items.length)];
    },
    state: () => state,
  };
}
