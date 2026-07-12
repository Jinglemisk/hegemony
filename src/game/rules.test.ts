import { describe, expect, it } from "vitest";

import {
  buildBuilding,
  calculateIncome,
  createInitialState,
  drawSeasonalEvent,
  foundColony,
  growPop,
  placeCapital,
  placeCity,
  placeColony,
  resolveArrivingPops,
  seasonName,
  settlementNetYield,
  startNewSeason,
  upgradeColonyToCity,
} from "./rules";
import { DEFAULT_RULESET, deriveRuleset } from "./ruleset";
import type { HegemonyState, HexTile, PlayerId, Pops, Settlement, SettlementKind } from "./types";

// Fixed seed so any deck draws triggered during a test are reproducible.
const SEED = 0xc0ffee;

function fresh(): HegemonyState {
  return createInitialState(SEED);
}

/** The standard metropolis+colony setup (explicit for readability). */
function freshColonySetup(): HegemonyState {
  return createInitialState(SEED, deriveRuleset(DEFAULT_RULESET, { setup: ["capital", "colony"] }));
}

/** Drop a settlement straight onto the board (no placement legality) — for tests
 *  whose subject is downstream of placement (yields, upgrades, buildings). */
function poke(state: HegemonyState, owner: PlayerId, tileId: string, kind: SettlementKind, pops: Pops) {
  tile(state, tileId).settlements.push({ owner, kind, buildings: [], pops: { ...pops } });
  state.players[owner].settlements.push(tileId);
}

function tile(state: HegemonyState, id: string): HexTile {
  const found = state.board.tiles.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`no tile ${id}`);
  return found;
}

function owned(state: HegemonyState, tileId: string, owner: PlayerId): Settlement {
  const settlement = tile(state, tileId).settlements.find((candidate) => candidate.owner === owner);
  if (!settlement) throw new Error(`no ${owner} settlement on ${tileId}`);
  return settlement;
}

// A material-resource tile (wood/stone) so tile yield never collides with the
// gold/food/influence/happiness columns the pop formulas write to.
function materialTile(state: HegemonyState): HexTile {
  const found = state.board.tiles.find(
    (candidate) => candidate.resource.type === "wood" || candidate.resource.type === "stone",
  );
  if (!found) throw new Error("no material tile on the board");
  return found;
}

function wealthy(state: HegemonyState, playerID: PlayerId) {
  state.players[playerID].resources = {
    wood: 200,
    stone: 200,
    gold: 200,
    food: 200,
    influence: 0,
    happiness: 0,
  };
}

describe("setup placement", () => {
  it("places a capital as a city and indexes it on the player", () => {
    const state = fresh();
    const result = placeCapital(state, "0", "0,0", { citizens: 1, freemen: 2, slaves: 1 });

    expect(result.ok).toBe(true);
    const settlement = owned(state, "0,0", "0");
    expect(settlement.kind).toBe("city");
    expect(settlement.pops).toEqual({ citizens: 1, freemen: 2, slaves: 1 });
    expect(state.players["0"].settlements).toEqual(["0,0"]);
  });

  it("rejects a capital with the wrong starting pop count", () => {
    const state = fresh();
    expect(placeCapital(state, "0", "0,0", { citizens: 1, freemen: 0, slaves: 0 }).ok).toBe(false);
  });

  it("rejects a capital on an occupied tile", () => {
    const state = fresh();
    placeCapital(state, "0", "0,0", { citizens: 1, freemen: 2, slaves: 1 });
    expect(placeCapital(state, "1", "0,0", { citizens: 1, freemen: 2, slaves: 1 }).ok).toBe(false);
  });

  it("rejects a capital adjacent to an existing city", () => {
    const state = fresh();
    placeCapital(state, "0", "0,0", { citizens: 1, freemen: 2, slaves: 1 });
    // "1,0" is one hex from "0,0".
    expect(placeCapital(state, "1", "1,0", { citizens: 1, freemen: 2, slaves: 1 }).ok).toBe(false);
  });

  it("founding colony: coastal voyage or beside the metropolis, never on a city tile", () => {
    const state = freshColonySetup();
    placeCapital(state, "0", "0,0", { citizens: 1, freemen: 2, slaves: 1 });
    placeCapital(state, "1", "-3,0", { citizens: 1, freemen: 2, slaves: 1 });

    // "1,1" is interior and non-adjacent — neither coast nor contiguity allows it.
    expect(placeColony(state, "0", "1,1", { citizens: 0, freemen: 0, slaves: 2 }).ok).toBe(false);
    // "3,0" is far away but COASTAL — the founding voyage (roadmap-appendix Q12).
    expect(placeColony(state, "0", "3,0", { citizens: 0, freemen: 0, slaves: 2 }).ok).toBe(true);
    expect(owned(state, "3,0", "0").kind).toBe("colony");

    // "0,0" already holds a city, so a colony there is illegal.
    expect(placeColony(state, "1", "0,0", { citizens: 0, freemen: 0, slaves: 2 }).ok).toBe(false);
  });

  it("places the second city anywhere legal — never adjacent to a city (two-city mode)", () => {
    const state = createInitialState(SEED, deriveRuleset(DEFAULT_RULESET, { setup: ["capital", "city"] }));
    placeCapital(state, "0", "0,0", { citizens: 1, freemen: 2, slaves: 1 });

    // Adjacent to the capital is illegal for a city…
    expect(placeCity(state, "0", "1,0", { citizens: 1, freemen: 1, slaves: 1 }).ok).toBe(false);
    // …but a far tile is fine (no contiguity for the starting cities).
    expect(placeCity(state, "0", "3,0", { citizens: 1, freemen: 1, slaves: 1 }).ok).toBe(true);
    expect(owned(state, "3,0", "0").kind).toBe("city");
  });
});

describe("per-settlement income (settlementNetYield)", () => {
  it("sums citizen yields: +1 influence, +2 gold, -2 food each", () => {
    const state = fresh();
    const mat = materialTile(state);
    placeCapital(state, "0", mat.id, { citizens: 1, freemen: 2, slaves: 1 });
    const settlement = owned(state, mat.id, "0");
    settlement.pops = { citizens: 3, freemen: 0, slaves: 0 };

    const income = settlementNetYield(mat, settlement);
    expect(income.influence).toBe(3);
    expect(income.gold).toBe(6);
    expect(income.food).toBe(-6);
    expect(income.happiness).toBe(0);
    expect(income[mat.resource.type]).toBe(mat.resource.amount);
  });

  it("sums slave yields: +1 tile resource, -1 food, -0.5 happiness each", () => {
    const state = fresh();
    const mat = materialTile(state);
    placeCapital(state, "0", mat.id, { citizens: 1, freemen: 2, slaves: 1 });
    const settlement = owned(state, mat.id, "0");
    settlement.pops = { citizens: 0, freemen: 0, slaves: 2 };

    const income = settlementNetYield(mat, settlement);
    expect(income[mat.resource.type]).toBe(mat.resource.amount + 2);
    expect(income.food).toBe(-2);
    expect(income.happiness).toBe(-1);
  });

  it("applies a -1 happiness penalty per pop over capacity", () => {
    const state = fresh();
    const mat = materialTile(state);
    placeCapital(state, "0", mat.id, { citizens: 1, freemen: 2, slaves: 1 });
    const settlement = owned(state, mat.id, "0");
    // Capital capacity is 10; 12 citizens => 2 over capacity.
    settlement.pops = { citizens: 12, freemen: 0, slaves: 0 };

    expect(settlementNetYield(mat, settlement).happiness).toBe(-2);
  });

  it("Marketplace adds +2 gold per supported freeman (max 3)", () => {
    const state = fresh();
    const mat = materialTile(state);
    placeCapital(state, "0", mat.id, { citizens: 1, freemen: 2, slaves: 1 });
    const settlement = owned(state, mat.id, "0");
    settlement.pops = { citizens: 0, freemen: 5, slaves: 0 };
    settlement.buildings = ["marketplace"];

    // Base 5 freemen * 2 gold + Marketplace supports 3 * 2 gold = 10 + 6.
    expect(settlementNetYield(mat, settlement).gold).toBe(16);
  });

  it("Temple adds +1 flat happiness and +1 influence per supported citizen (max 2)", () => {
    const state = fresh();
    const mat = materialTile(state);
    placeCapital(state, "0", mat.id, { citizens: 1, freemen: 2, slaves: 1 });
    const settlement = owned(state, mat.id, "0");
    settlement.pops = { citizens: 3, freemen: 0, slaves: 0 };
    settlement.buildings = ["temple"];

    const income = settlementNetYield(mat, settlement);
    expect(income.influence).toBe(3 + 2);
    expect(income.happiness).toBe(1);
  });

  it("halves colony tile yield when the tile is shared", () => {
    const state = fresh();
    const none = { citizens: 0, freemen: 0, slaves: 0 };
    poke(state, "0", "3,0", "colony", none);
    poke(state, "1", "3,0", "colony", none);

    const shared = tile(state, "3,0");
    const colony = owned(state, "3,0", "0");
    expect(shared.settlements).toHaveLength(2);
    expect(settlementNetYield(shared, colony)[shared.resource.type]).toBe(
      Math.floor(shared.resource.amount * 0.5),
    );
  });
});

describe("player income & happiness (calculateIncome)", () => {
  it("adds +1 happiness per 5 stored food", () => {
    const state = fresh();
    const mat = materialTile(state);
    placeCapital(state, "0", mat.id, { citizens: 1, freemen: 2, slaves: 1 });
    owned(state, mat.id, "0").pops = { citizens: 0, freemen: 0, slaves: 0 };

    // Starting food is 12 => floor(12 / 5) = 2 happiness.
    expect(calculateIncome(state, "0").happiness).toBe(2);
  });

  it("grants first-income grace against food-shortage happiness pressure", () => {
    const state = fresh();
    const mat = materialTile(state);
    placeCapital(state, "0", mat.id, { citizens: 1, freemen: 2, slaves: 1 });
    // 8 citizens => -16 food income; stockpile 12 => projected -4.
    owned(state, mat.id, "0").pops = { citizens: 8, freemen: 0, slaves: 0 };

    // Grace active (no gameplay income yet): only +2 stockpile happiness applies.
    expect(state.players["0"].hasCollectedGameplayIncome).toBe(false);
    expect(calculateIncome(state, "0").happiness).toBe(2);

    // After the grace turn, the -4 shortage pressure applies too: 2 - 4 = -2.
    state.players["0"].hasCollectedGameplayIncome = true;
    expect(calculateIncome(state, "0").happiness).toBe(-2);
  });
});

describe("city upgrade", () => {
  it("upgrades a colony to a city, pays the cost, and displaces a shared enemy colony", () => {
    const state = fresh();
    placeCapital(state, "0", "0,0", { citizens: 1, freemen: 2, slaves: 1 });
    placeCapital(state, "1", "-3,0", { citizens: 1, freemen: 2, slaves: 1 });
    const slave = { citizens: 0, freemen: 0, slaves: 1 };
    poke(state, "0", "3,0", "colony", slave);
    poke(state, "1", "3,0", "colony", slave);
    wealthy(state, "0");
    const before = { ...state.players["0"].resources };

    const result = upgradeColonyToCity(state, "0", "3,0");
    expect(result.ok).toBe(true);

    const upgraded = tile(state, "3,0");
    expect(upgraded.settlements).toHaveLength(1);
    expect(upgraded.settlements[0].owner).toBe("0");
    expect(upgraded.settlements[0].kind).toBe("city");
    expect(state.players["0"].resources.wood).toBe(before.wood - 30);
    expect(state.players["0"].resources.stone).toBe(before.stone - 10);
    expect(state.players["0"].resources.food).toBe(before.food - 5);
    expect(state.players["1"].settlements).not.toContain("3,0");
  });

  it("rejects an upgrade on a tile without the player's colony", () => {
    const state = fresh();
    placeCapital(state, "0", "0,0", { citizens: 1, freemen: 2, slaves: 1 });
    wealthy(state, "0");
    // "0,0" holds a city, not a colony.
    expect(upgradeColonyToCity(state, "0", "0,0").ok).toBe(false);
  });
});

describe("buildings", () => {
  it("builds a Marketplace on a city, paying its cost and consuming a slot", () => {
    const state = fresh();
    placeCapital(state, "0", "0,0", { citizens: 1, freemen: 2, slaves: 1 });
    const beforeWood = state.players["0"].resources.wood;

    const result = buildBuilding(state, "0", "0,0", "marketplace");
    expect(result.ok).toBe(true);
    expect(owned(state, "0,0", "0").buildings).toContain("marketplace");
    expect(state.players["0"].resources.wood).toBe(beforeWood - 12);
  });

  it("cannot build on a colony (no building slots)", () => {
    const state = fresh();
    placeCapital(state, "0", "0,0", { citizens: 1, freemen: 2, slaves: 1 });
    poke(state, "0", "3,0", "colony", { citizens: 0, freemen: 0, slaves: 1 });
    expect(buildBuilding(state, "0", "3,0", "marketplace").ok).toBe(false);
  });
});

describe("grow pop", () => {
  it("grows a slave for food and only once per settlement per turn", () => {
    const state = fresh();
    placeCapital(state, "0", "0,0", { citizens: 1, freemen: 2, slaves: 1 });
    const beforeFood = state.players["0"].resources.food;

    const result = growPop(state, "0", "0,0", "slaves");
    expect(result.ok).toBe(true);
    expect(owned(state, "0,0", "0").pops.slaves).toBe(2);
    expect(state.players["0"].resources.food).toBe(beforeFood - 5);

    // Second grow on the same settlement this turn is rejected.
    expect(growPop(state, "0", "0,0", "slaves").ok).toBe(false);
  });

  it("rejects growth at population capacity", () => {
    const state = fresh();
    placeCapital(state, "0", "0,0", { citizens: 1, freemen: 2, slaves: 1 });
    owned(state, "0,0", "0").pops = { citizens: 10, freemen: 0, slaves: 0 };
    expect(growPop(state, "0", "0,0", "citizens").ok).toBe(false);
  });
});

describe("season rollover", () => {
  it("advances the season and resets per-turn flags", () => {
    const state = fresh();
    state.players["0"].collectedThisTurn = true;
    state.players["0"].grownSettlementsThisTurn = ["0,0"];
    const seasonBefore = state.season;

    startNewSeason(state);

    expect(state.season).toBe(seasonBefore + 1);
    expect(state.players["0"].collectedThisTurn).toBe(false);
    expect(state.players["0"].grownSettlementsThisTurn).toEqual([]);
  });

  it("draws a seasonal event that suits the current season, in every season", () => {
    // Walk a couple of full years and assert each revealed card is legal for its season.
    for (let season = 1; season <= 8; season += 1) {
      const state = fresh();
      state.season = season;

      drawSeasonalEvent(state);

      const card = state.activeSeasonEvent?.card;
      expect(card).toBeTruthy();
      const suits = !card?.seasons || card.seasons.length === 0 || card.seasons.includes(seasonName(season));
      expect(suits).toBe(true);
    }
  });

  it("never surfaces a winter-only card outside winter", () => {
    // Civic Anxiety is tagged winter-only; a spring draw must not reveal it.
    const state = fresh();
    state.season = 1; // spring

    drawSeasonalEvent(state);

    expect(state.activeSeasonEvent?.card.id).not.toBe("season-civic-anxiety");
  });
});

describe("found colony & population transfers", () => {
  it("founds a colony, sends a pop in transit, and deposits it on arrival", () => {
    const state = fresh();
    placeCapital(state, "0", "0,0", { citizens: 1, freemen: 2, slaves: 1 });
    wealthy(state, "0");

    // Non-contiguous founding is rejected outright (roadmap-appendix D3).
    expect(foundColony(state, "0", "3,0", "0,0", "slaves").ok).toBe(false);

    const result = foundColony(state, "0", "1,0", "0,0", "slaves");
    expect(result.ok).toBe(true);

    // Colony exists but its seed pop is still in transit from the capital.
    expect(owned(state, "1,0", "0").kind).toBe("colony");
    expect(owned(state, "0,0", "0").pops.slaves).toBe(0);
    expect(state.transfers).toHaveLength(1);

    resolveArrivingPops(state, "0");
    expect(owned(state, "1,0", "0").pops.slaves).toBe(1);
    expect(state.transfers).toHaveLength(0);
  });
});

describe("deterministic rng", () => {
  it("produces identical initial deck order for the same seed", () => {
    const a = createInitialState(42);
    const b = createInitialState(42);
    expect(a.seasonalDrawPile.map((card) => card.id)).toEqual(b.seasonalDrawPile.map((card) => card.id));
    expect(a.playerDrawPile.map((card) => card.id)).toEqual(b.playerDrawPile.map((card) => card.id));
  });

  it("produces different deck order for different seeds", () => {
    const a = createInitialState(1);
    const b = createInitialState(2);
    expect(a.seasonalDrawPile.map((card) => card.id)).not.toEqual(b.seasonalDrawPile.map((card) => card.id));
  });
});
