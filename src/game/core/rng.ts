import type { EventCard } from "../types";

export function expandDeck(cards: EventCard[]): EventCard[] {
  return cards.flatMap((card) => Array.from({ length: card.count }, () => card));
}

export function createSeed(): number {
  return Math.floor(Math.random() * 0x1_0000_0000);
}

/**
 * Deterministic Fisher-Yates shuffle driven by a mulberry32 PRNG. Returns the
 * shuffled copy plus the advanced PRNG state so the caller can persist it on
 * {@link HegemonyState.rng} and keep later reshuffles reproducible from the
 * game's initial seed.
 */
export function shuffleWithSeed<T>(cards: T[], seedState: number): { cards: T[]; state: number } {
  let state = seedState >>> 0;
  const nextUnit = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };

  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextUnit() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return { cards: shuffled, state: state >>> 0 };
}
