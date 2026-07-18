import { describe, expect, it } from "vitest";

import { bankBuy, bankSell, deriveBankRates } from "./bank";
import { DEFAULT_RULESET, deriveRuleset } from "./ruleset";
import { scenario } from "./testing/scenario";
import type { HegemonyState } from "./types";

/** The 0xc0ffee bootstrap leaves a pending player event; clear it so it never blocks the verbs under test. */
const clearPending = (draft: HegemonyState) => {
  draft.pendingPlayerEvent = null;
};

describe("bank rate derivation (D6/Q14)", () => {
  it("classes the classic board by tile supply: wood abundant, stone & food baseline", () => {
    const G = scenario().opening().mutate(clearPending).build();

    // Phase 2 composition: 15 wood tiles, 8 stone, 8 food. Wood is strictly most common
    // (abundant); stone and food tie at 8, so neither is strictly rarest → both baseline.
    expect(G.bank.wood).toEqual(DEFAULT_RULESET.economy.bank.abundant);
    expect(G.bank.stone).toEqual(DEFAULT_RULESET.economy.bank.baseline);
    expect(G.bank.food).toEqual(DEFAULT_RULESET.economy.bank.baseline);
  });

  it("uniform derivation prices everything at baseline", () => {
    const G = scenario({ patch: { economy: { bank: { derivation: "uniform" } } } })
      .opening().mutate(clearPending)
      .build();

    for (const material of ["wood", "stone", "food"] as const) {
      expect(G.bank[material]).toEqual(DEFAULT_RULESET.economy.bank.baseline);
    }
  });

  it("an evenly supplied board collapses to baseline everywhere", () => {
    const tile = (type: "wood" | "stone" | "food") =>
      ({ resource: { type, amount: 4 } }) as Parameters<typeof deriveBankRates>[0][number];
    const rates = deriveBankRates(
      [tile("wood"), tile("stone"), tile("food")],
      DEFAULT_RULESET.economy.bank
    );

    expect(rates.wood).toEqual(DEFAULT_RULESET.economy.bank.baseline);
    expect(rates.stone).toEqual(DEFAULT_RULESET.economy.bank.baseline);
    expect(rates.food).toEqual(DEFAULT_RULESET.economy.bank.baseline);
  });

  it("rates are static: the ruleset knob changes games, never a game in flight", () => {
    const scarcity = scenario().opening().mutate(clearPending).build();
    const uniform = scenario({ patch: { economy: { bank: { derivation: "uniform" } } } })
      .opening().mutate(clearPending)
      .build();

    expect(scarcity.bank.wood.sell).not.toBe(uniform.bank.wood.sell);
    // deriveRuleset merges cleanly — the knob is data, not code.
    expect(deriveRuleset(DEFAULT_RULESET, { economy: { bank: { derivation: "uniform" } } }).economy.bank.derivation).toBe(
      "uniform"
    );
  });
});

describe("bank trades", () => {
  it("selling exchanges the sell-rate of a material for 1 gold", () => {
    const G = scenario().opening().mutate(clearPending).build();
    const { wood, gold } = G.players["0"].resources;

    expect(bankSell(G, "0", "wood").ok).toBe(true);

    expect(G.players["0"].resources.wood).toBe(wood - G.bank.wood.sell);
    expect(G.players["0"].resources.gold).toBe(gold + 1);
  });

  it("buying exchanges the buy-rate in gold for 1 material", () => {
    const G = scenario().opening().mutate(clearPending).build();
    const { stone, gold } = G.players["0"].resources;

    expect(bankBuy(G, "0", "stone").ok).toBe(true);

    expect(G.players["0"].resources.stone).toBe(stone + 1);
    expect(G.players["0"].resources.gold).toBe(gold - G.bank.stone.buy);
  });

  it("rejects unaffordable trades, allows unlimited affordable ones (no per-turn cap)", () => {
    const G = scenario().opening().mutate(clearPending).withResources("1", { wood: 2, gold: 0 }).build();

    expect(bankSell(G, "1", "wood").ok).toBe(false);
    expect(bankBuy(G, "1", "food").ok).toBe(false);

    const rich = scenario().opening().mutate(clearPending).withResources("1", { wood: 40 }).build();
    for (let i = 0; i < 10; i += 1) {
      expect(bankSell(rich, "1", "wood").ok).toBe(true);
    }
  });

  it("stays shut while a riot is pending — income comes before commerce", () => {
    const G = scenario().opening().mutate(clearPending).build();
    G.pendingRiot = { playerID: "0", tier: "unrest", boughtInsurance: [] };

    expect(bankSell(G, "0", "wood").ok).toBe(false);
    expect(bankBuy(G, "0", "wood").ok).toBe(false);
  });
});
