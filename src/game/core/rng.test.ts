import { describe, expect, it } from "vitest";

import { mulberry32, shuffleWithSeed } from "./rng";

describe("mulberry32", () => {
  it("pins the step sequence so the PRNG can never drift silently", () => {
    // Saved games and recorded sim scripts replay against these exact values.
    const first = mulberry32(0xc0ffee);
    expect(first).toEqual({ state: 1844214243, value: 0.021141508361324668 });

    const second = mulberry32(first.state);
    expect(second).toEqual({ state: 3675780056, value: 0.6661099966149777 });

    const third = mulberry32(second.state);
    expect(third).toEqual({ state: 1212378573, value: 0.7799714196007699 });
  });

  it("normalizes the incoming state to uint32", () => {
    expect(mulberry32(-1)).toEqual(mulberry32(0xffffffff));
  });
});

describe("shuffleWithSeed", () => {
  it("pins a known shuffle and the advanced state", () => {
    const { cards, state } = shuffleWithSeed([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0xc0ffee);
    expect(cards).toEqual([4, 5, 2, 8, 3, 10, 9, 7, 6, 1]);
    expect(state).toBe(3611838859);
  });

  it("leaves the input untouched", () => {
    const input = [1, 2, 3];
    shuffleWithSeed(input, 7);
    expect(input).toEqual([1, 2, 3]);
  });
});
