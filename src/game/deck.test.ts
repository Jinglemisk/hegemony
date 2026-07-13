import { describe, expect, it } from "vitest";
import { GROW_POP_COSTS, PLAYER_EVENT_CARDS, SEASONAL_EVENT_CARDS } from "./data";
import { drawPlayerEvent, resolvePendingPlayerEvent } from "./events";
import { growPop } from "./actions";
import { getGrowPopStatus } from "./status";
import type { EventCard, EventEffect, PopType, SeasonName } from "./types";
import { scenario } from "./testing/scenario";

/**
 * The deck-tuning contract (balance.html ledger issues 5/10/12). The valuation is
 * the balance report's own basis so the EV guard stays comparable to its findings:
 *
 *   - every resource unit (wood/stone/gold/food/influence/happiness) counts 1
 *   - a free pop counts its full grow cost (it also dodges the growth throttle)
 *   - a grow coupon counts its face saving × 0.5 — it expires end of turn, so
 *     roughly half of them land on a turn where growing is affordable and legal
 *   - exchanges count their net gain at full use; per-pop payouts count their floor
 *   - choice cards count their best option (players pick greedily)
 *
 * If a content edit moves EV or the harm share out of band, this test is the
 * tripwire — retune the deck, don't widen the band without a decision.
 */

const COUPON_UTILIZATION = 0.5;

function popValue(pop: PopType): number {
  return Object.values(GROW_POP_COSTS[pop]).reduce((sum, amount) => sum + (amount ?? 0), 0);
}

function effectValue(effect: EventEffect): number {
  switch (effect.type) {
    case "resourceDelta":
    case "happinessDelta":
      return effect.amount;
    case "timedHappinessDelta":
      return effect.amountPerTurn * effect.turns;
    case "addPops":
      return popValue(effect.pop) * effect.amount;
    case "actionCostDiscount":
      return effect.amount * COUPON_UTILIZATION;
    case "resourceExchange":
      return Math.floor(effect.maxAmount * effect.ratio) - effect.maxAmount;
    case "resourceDeltaPerPop":
      return effect.minimum;
    case "choice":
      return Math.max(...effect.options.map((option) => option.reduce((sum, entry) => sum + effectValue(entry), 0)));
    default:
      throw new Error(`deck valuation has no rule for effect type ${(effect as { type: string }).type}`);
  }
}

function cardValue(card: EventCard): number {
  return card.effects.reduce((sum, effect) => sum + effectValue(effect), 0);
}

describe("player deck tuning contract", () => {
  const copies = PLAYER_EVENT_CARDS.reduce((sum, card) => sum + card.count, 0);

  it("expected value per draw lands near +2 resource-equivalents", () => {
    const totalValue = PLAYER_EVENT_CARDS.reduce((sum, card) => sum + card.count * cardValue(card), 0);
    const ev = totalValue / copies;

    expect(ev).toBeGreaterThanOrEqual(1.7);
    expect(ev).toBeLessThanOrEqual(2.5);
  });

  it("roughly a quarter of the deck is harm", () => {
    const harmCopies = PLAYER_EVENT_CARDS.filter((card) => cardValue(card) < 0).reduce(
      (sum, card) => sum + card.count,
      0
    );
    const harmShare = harmCopies / copies;

    expect(harmShare).toBeGreaterThanOrEqual(0.22);
    expect(harmShare).toBeLessThanOrEqual(0.28);
  });

  it("no choice card has a dominated option (every option is within reach of the best)", () => {
    for (const card of PLAYER_EVENT_CARDS) {
      for (const effect of card.effects) {
        if (effect.type !== "choice") {
          continue;
        }

        const optionValues = effect.options.map((option) =>
          option.reduce((sum, entry) => sum + effectValue(entry), 0)
        );
        const best = Math.max(...optionValues);

        for (const value of optionValues) {
          // An option worth under a third of the best pick is dead weight. The band
          // is set by Emergency Labor, the model shape: its safe option (2 wood) is
          // 40% of its greedy option (5) — situational, not strictly worse.
          expect(value, `${card.name} carries a dominated option`).toBeGreaterThanOrEqual(best / 3);
        }
      }
    }
  });
});

describe("seasonal deck safety", () => {
  const SEASONS: SeasonName[] = ["spring", "summer", "autumn", "winter"];

  function isHarm(card: EventCard): boolean {
    return card.effects.some((effect) => {
      if (effect.type === "incomeModifier") return effect.amount < 0;
      if (effect.type === "buildingCostMultiplier") return effect.multiplier > 1;
      if (effect.type === "scaledHappinessDelta") return effect.amountPerPops < 0;
      if (effect.type === "timedHappinessDelta") return effect.amountPerTurn < 0;
      if (effect.type === "resourceDelta" || effect.type === "happinessDelta") return effect.amount < 0;
      return false;
    });
  }

  it("no season is auto-safe: every pool holds at least one harm card", () => {
    for (const season of SEASONS) {
      const pool = SEASONAL_EVENT_CARDS.filter(
        (card) => !card.seasons || card.seasons.length === 0 || card.seasons.includes(season)
      );
      const harmCopies = pool.filter(isHarm).reduce((sum, card) => sum + card.count, 0);

      expect(harmCopies, `${season} has no harm cards`).toBeGreaterThan(0);
    }
  });
});

describe("grow coupons (actionCostDiscount on growPop)", () => {
  function drawCard(cardId: string) {
    const G = scenario()
      .opening()
      .mutate((state) => {
        state.pendingPlayerEvent = null;
      })
      .withResources("0", "wealthy")
      .build();

    G.playerDrawPile.unshift(PLAYER_EVENT_CARDS.find((card) => card.id === cardId)!);
    drawPlayerEvent(G, "0");
    expect(resolvePendingPlayerEvent(G, "0").ok).toBe(true);
    return G;
  }

  it("discounts the next matching grow, then is consumed", () => {
    const G = drawCard("player-citizenship-rolls");
    const capital = G.players["0"].settlements[0];

    expect(G.players["0"].actionCostDiscounts).toHaveLength(2);
    expect(getGrowPopStatus(G, "0", capital, "citizens").cost).toMatchObject({ food: 4, gold: 1 });

    const before = { ...G.players["0"].resources };
    expect(growPop(G, "0", capital, "citizens").ok).toBe(true);
    expect(before.food - G.players["0"].resources.food).toBe(4);
    expect(before.gold - G.players["0"].resources.gold).toBe(1);
    expect(G.players["0"].actionCostDiscounts).toHaveLength(0);

    // The coupon is spent — the next settlement grows at full price.
    const colony = G.players["0"].settlements[1];
    expect(getGrowPopStatus(G, "0", colony, "citizens").cost).toMatchObject({ food: 9, gold: 2 });
  });

  it("ignores grows of a different pop type", () => {
    const G = drawCard("player-willing-hands");
    const capital = G.players["0"].settlements[0];

    expect(getGrowPopStatus(G, "0", capital, "citizens").cost).toMatchObject({ food: 9, gold: 2 });
    expect(growPop(G, "0", capital, "citizens").ok).toBe(true);

    // The freeman coupon survived the citizen grow.
    expect(G.players["0"].actionCostDiscounts).toHaveLength(1);
    const colony = G.players["0"].settlements[1];
    expect(getGrowPopStatus(G, "0", colony, "freemen").cost).toMatchObject({ food: 3 });
  });
});

describe("harm card mechanics", () => {
  it("losses clamp at zero — a harm card never drives a stock negative", () => {
    const G = scenario()
      .opening()
      .mutate((state) => {
        state.pendingPlayerEvent = null;
      })
      .withResources("0", { food: 1 })
      .build();

    G.playerDrawPile.unshift(PLAYER_EVENT_CARDS.find((card) => card.id === "player-granary-rats")!);
    drawPlayerEvent(G, "0");
    expect(resolvePendingPlayerEvent(G, "0").ok).toBe(true);

    expect(G.players["0"].resources.food).toBe(0);
  });

  it("fractional exchange payouts round down", () => {
    const G = scenario()
      .opening()
      .mutate((state) => {
        state.pendingPlayerEvent = null;
      })
      .withResources("0", { wood: 3, gold: 0 })
      .build();

    G.playerDrawPile.unshift(PLAYER_EVENT_CARDS.find((card) => card.id === "player-caravan-contacts")!);
    drawPlayerEvent(G, "0");
    // Option B: exchange up to 4 wood at 1.5 — with 3 wood that's floor(4.5) = 4 gold.
    expect(resolvePendingPlayerEvent(G, "0", undefined, 1).ok).toBe(true);

    expect(G.players["0"].resources.wood).toBe(0);
    expect(G.players["0"].resources.gold).toBe(4);
  });
});
