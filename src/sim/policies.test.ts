import { describe, expect, it } from "vitest";

import { enumerateLegalCommands, transition } from "../game/legalMoves";
import { RESOLUTION_CARDS } from "../game/assembly/deck";
import { PLAYER_IDS, PLAYER_EVENT_CARDS } from "../game/data";
import { projectForPlayer } from "../game/projection";
import { DEFAULT_RULESET } from "../game/ruleset";
import { owned, scenario } from "../game/testing/scenario";
import { movePops, upgradeColonyToCity } from "../game/actions";
import { endTurn } from "../game/turn";
import { yearDeckSize } from "../game/year";
import { resolveRiot } from "../game/riot";
import { unrestOutcome } from "../game/unrest";
import type { HegemonyState } from "../game/types";
import {
  beamPolicy,
  competitiveDelta,
  evaluatePlacement,
  evaluatePolicyUnrestRisk,
  frontierValue,
  greedyPolicy,
  masterPolicy,
  PERSONALITY_WEIGHTS,
  placementFrontier,
  POLICIES,
  POLICY_UNREST_WEIGHTS,
  politicalPolicy,
  projectPolicyHorizon,
  settlerPolicy,
  smartPolicy,
} from "./policies";
import { createSimRng } from "./rng";
import { playTurn, runGame } from "./runner";
import { buildNewGame } from "./setup";
import { getTile } from "../game/core/query";
import { victoryCardsHeld, voiceHolder } from "../game/victory";
import { hexDistance } from "../game/map";
import { isAdjacentToCity } from "../game/settlement";
import { createGameDefinition } from "../game/definition";
import { getAuthoredGameContent } from "../game/content";
import { GAME_MODES } from "../game/ruleset";
import { createInitialStateFromDefinition } from "../game/state";

function observe(G: HegemonyState, player = G.currentPlayer) {
  return projectForPlayer(G.definition, G, player);
}

describe("searched bank chains", () => {
  it("does not churn buys and sells under a tuned equal-rate bank", () => {
    const G = scenario({
      patch: {
        economy: {
          bank: { derivation: "uniform", baseline: { sell: 2, buy: 2 } },
        },
      },
    })
      .opening()
      .build();
    G.pendingPlayerEvent = null;
    G.activeLaws.push({
      cardId: "civic-pride",
      author: "0",
      enactedYear: G.year,
      order: G.lawOrder++,
    });
    Object.assign(G.players[G.currentPlayer].resources, {
      wood: 0,
      stone: 14,
      gold: 8,
      food: 0,
    });

    let forced = 0;
    playTurn(
      G,
      smartPolicy,
      createSimRng(1),
      { onForceEndTurn: () => (forced += 1) },
      { maxActions: 30 },
    );

    expect(forced).toBe(0);
  });
});

describe("policy unrest risk", () => {
  const G = scenario().opening().build();
  const risk = (happiness: number, state = G) =>
    evaluatePolicyUnrestRisk(state, unrestOutcome(state, "0", happiness));
  const mild = DEFAULT_RULESET.economy.unrest.riotThreshold;
  const severe = DEFAULT_RULESET.economy.unrest.revoltThreshold;

  it("classifies just above, at, and below the live riot line", () => {
    // The two lines stand three apart, so each step above the riot line is a third.
    expect(risk(mild + 1).tier).toBe("buffer");
    expect(risk(mild + 1).proximity).toBeCloseTo(2 / 3);
    expect(risk(mild + 2).proximity).toBeCloseTo(1 / 3);
    expect(risk(mild + 3)).toEqual({ tier: "safe", proximity: 0 });
    expect(risk(mild).tier).toBe("unrest");
    expect(risk(mild - 1).tier).toBe("unrest");
  });

  it("classifies just above, at, and below the live revolt line", () => {
    expect(risk(severe + 1).tier).toBe("unrest");
    expect(risk(severe).tier).toBe("revolt");
    expect(risk(severe - 1)).toEqual(risk(severe));
  });

  it("follows the ruleset's lines", () => {
    const shifted = scenario({
      patch: { economy: { unrest: { riotThreshold: -1, revoltThreshold: -8 } } },
    })
      .opening()
      .build();

    expect(risk(-1, shifted).tier).toBe("unrest");
    expect(risk(-6, shifted).tier).toBe("unrest");
    expect(risk(-8, shifted).tier).toBe("revolt");
  });

  it("a riot from tokens is met once: it spends them and the level recovers", () => {
    const G = projectionFixture();
    G.players["0"].unrestTokens = 3;
    const projection = projectPolicyHorizon(G, "0", 3);

    expect(projection.unrest).toMatchObject({
      minimumHappiness: -3,
      riotEvents: 1,
      revoltEvents: 0,
    });
    // The projection works on a copy: the live tokens are untouched.
    expect(G.players["0"].unrestTokens).toBe(3);
  });

  it("charges a riot what the riot table is expected to take, at the seat's weights", () => {
    // One freeman, no building, no gold, food to spare: the table takes pops.
    const G = projectionFixture();
    G.players["0"].unrestTokens = 3;
    G.players["0"].resources.gold = 0;
    const charge = (weights = PERSONALITY_WEIGHTS.civic) =>
      projectPolicyHorizon(G, "0", 0, weights).unrest.riskPenalty;

    // A seat that weighs a freeman higher is charged more for the same riot.
    const civic = PERSONALITY_WEIGHTS.civic;
    expect(charge()).toBeGreaterThan(0);
    expect(
      charge({ ...civic, pops: { ...civic.pops, freemen: 2 * civic.pops.freemen } }),
    ).toBeGreaterThan(charge());

    // A Temple the riot can burn spares a pop, which outweighs its stone.
    const bare = charge();
    owned(G, G.players["0"].settlements[0], "0").buildings.push("temple");
    G.players["0"].unrestTokens = 4;
    expect(charge()).toBeLessThan(bare);
  });

  it("lets the slaves a riot is expected to take leave, so a slave-held level recovers", () => {
    // Six slaves hold the level at −3. With nothing to burn a riot takes five sixths of
    // a pop, so the second riot has taken a slave and five slaves stand at −2.
    const held = projectionFixture();
    held.players["0"].resources.gold = 10;
    slavesInCapital(held, 6);
    expect(projectPolicyHorizon(held, "0", 3).unrest).toMatchObject({
      minimumHappiness: -3,
      riotEvents: 2,
    });
    // The projection works on a copy: the live slaves are untouched.
    expect(slavesInCapital(held)).toBe(6);

    // Seven need a third riot: the level is still −3 with six.
    const deeper = projectionFixture();
    deeper.players["0"].resources.gold = 10;
    slavesInCapital(deeper, 7);
    expect(projectPolicyHorizon(deeper, "0", 3).unrest.riotEvents).toBe(3);
  });

  it("charges a level near the riot line a share of a riot at each later turn end", () => {
    // One freeman and tokens: the same riot at every level, so only the distance differs.
    const at = (tokens: number, horizon = 1) => {
      const G = projectionFixture();
      G.players["0"].unrestTokens = tokens;
      G.players["0"].resources.gold = 10;
      return projectPolicyHorizon(G, "0", horizon).unrest.riskPenalty;
    };
    const riot = at(3, 0);

    expect(at(0)).toBe(0);
    expect(at(2)).toBeCloseTo(POLICY_UNREST_WEIGHTS.bufferRiotShare * (2 / 3) * riot);
    expect(at(1)).toBeCloseTo(POLICY_UNREST_WEIGHTS.bufferRiotShare * (1 / 3) * riot);
    // The current check charges only an actual riot.
    expect(at(2, 0)).toBe(0);
  });

  it("runs a revolt for real: the ruleset's share of the slaves leave the projected board", () => {
    const G = projectionFixture();
    slavesInCapital(G, 12);
    const projection = projectPolicyHorizon(G, "0", 2);

    // Twelve slaves revolt at −6; the six left riot at −3.
    expect(projection.unrest).toMatchObject({
      minimumHappiness: -6,
      revoltEvents: 1,
      riotEvents: 2,
    });
    expect(slavesInCapital(G)).toBe(12);

    // The revolt is charged each slave it sends away, the ruleset's share rounded down,
    // at the seat's weight for a slave.
    const share = G.ruleset.economy.unrest.revoltSlaveShare;
    const charge = (slaves: number, weights = PERSONALITY_WEIGHTS.civic) => {
      slavesInCapital(G, slaves);
      return projectPolicyHorizon(G, "0", 0, weights).unrest.riskPenalty;
    };
    const perSlave = charge(12) / Math.floor(12 * share);
    expect(charge(17)).toBeCloseTo(Math.floor(17 * share) * perSlave);
    const { civic, slaver } = PERSONALITY_WEIGHTS;
    expect(charge(12, slaver) / charge(12)).toBeCloseTo(slaver.pops.slaves / civic.pops.slaves);
  });

  it("counts bought calm at the current check, even with no future income", () => {
    const G = projectionFixture();
    slavesInCapital(G, 6);
    G.year = yearDeckSize(G);
    expect(projectPolicyHorizon(G, "0").unrest.riotEvents).toBe(1);
    G.players["0"].calmActive = true;
    expect(projectPolicyHorizon(G, "0").unrest.riotEvents).toBe(0);
    expect(projectPolicyHorizon(G, "0", 1).unrest.riotEvents).toBe(1);
    expect(G.players["0"].calmActive).toBe(true);
  });

  it("keeps Blockade through the collected turn's check, then expires it", () => {
    const G = projectionFixture();
    slavesInCapital(G, 6);
    G.board.luxuries[0].owner = "0";
    G.activeYearCard = G.definition.content.yearCards.find((card) => card.id === "year-blockade")!;
    expect(projectPolicyHorizon(G, "0", 1).unrest.riotEvents).toBe(1);
    expect(G.activeYearCard.id).toBe("year-blockade");
  });

  it("buys calm on later turns while the stocks last, and leaves this turn's to the seat", () => {
    // Six slaves hold the level at −3. Gold pays first: 2 gold is 2.5 at the default
    // weights and 2 influence is 4. The freeman makes 1 gold a year.
    const G = projectionFixture({ calm: true });
    slavesInCapital(G, 6);
    Object.assign(G.players["0"].resources, { gold: 3, influence: 2 });
    // This turn's check is the seat's own: it riots, and the forecast buys nothing.
    expect(projectPolicyHorizon(G, "0", 0)).toMatchObject({
      unrest: { riotEvents: 1 },
      resources: { gold: 3, influence: 2 },
    });
    // Year one pays 2 of its 4 gold, year two 2 of 3, year three 2 of 2.
    expect(projectPolicyHorizon(G, "0", 3)).toMatchObject({
      unrest: { minimumHappiness: -3, riotEvents: 1 },
      resources: { gold: 0, influence: 2 },
    });
    // Year four holds 1 gold and pays the influence, year five pays its 2 gold, and
    // year six holds 1 gold and nothing else: that riot is met.
    expect(projectPolicyHorizon(G, "0", 6)).toMatchObject({
      unrest: { riotEvents: 2 },
      resources: { gold: 1, influence: 0 },
    });
    expect(G.players["0"].calmActive).toBe(false);
  });

  it("buys calm only where it changes what happens, and not during setup", () => {
    // Ten slaves stand at −5 and calm leaves them at −3: a riot either way.
    const deep = projectionFixture({ calm: true });
    slavesInCapital(deep, 10);
    Object.assign(deep.players["0"].resources, { gold: 10, influence: 20 });
    expect(projectPolicyHorizon(deep, "0", 1)).toMatchObject({
      unrest: { riotEvents: 2 },
      resources: { gold: 11, influence: 20 },
    });

    // Twelve stand at −6, calmed to −4 this year. Next year calm turns the revolt
    // into a riot, so it is bought.
    slavesInCapital(deep, 12);
    deep.players["0"].calmActive = true;
    expect(projectPolicyHorizon(deep, "0", 1)).toMatchObject({
      unrest: { revoltEvents: 0, riotEvents: 2 },
      resources: { gold: 9, influence: 20 },
    });

    // Setup picks land for the whole game: nothing is bought there, as with food.
    const setup = projectionFixture({ calm: true });
    slavesInCapital(setup, 6);
    setup.phase = "setupColony";
    setup.players["0"].collectedThisTurn = false;
    setup.players["0"].resources.influence = 20;
    expect(projectPolicyHorizon(setup, "0", 1)).toMatchObject({
      unrest: { riotEvents: 1 },
      resources: { influence: 20 },
    });
  });

  it.each([
    ["smart", smartPolicy],
    ["beam", beamPolicy],
  ] as const)(
    "%s will not grow a freeman it cannot feed but grows the fed equivalent",
    (_name, policy) => {
      // Three food buys the freeman and leaves three mouths with an empty granary:
      // all three leave at the next income. Unspent, it feeds the two for a turn.
      expect(chooseFreemanGrowth(policy, 3).type).toBe("endTurn");
      expect(chooseFreemanGrowth(policy, 60)).toMatchObject({ type: "growPop", pop: "freemen" });
    },
  );
});

describe("the forecast buys food", () => {
  /** A citizen and six freemen on a mountain: nothing grows, so seven food a year. */
  const importer = (resources: Partial<HegemonyState["players"]["0"]["resources"]>) => {
    const G = scenario()
      .withSettlement("0", "-2,0", "city", { citizens: 1, freemen: 6, slaves: 0 })
      .withResources("0", { food: 0, wood: 0, stone: 0, gold: 0, influence: 0, ...resources })
      .build();
    G.phase = "gameplay";
    G.currentPlayer = "0";
    G.year = 5;
    G.players["0"].collectedThisTurn = true;
    G.activeYearCard = null;
    return G;
  };

  it("keeps a pop fed this turn fed in later years, from the seat's gold", () => {
    // Step 18's case: 100 gold and seven short. With no purchase in the forecast, a pop
    // fed now starved a year later and the count stayed at seven whatever was bought.
    let G = importer({ food: -7, gold: 100 });
    for (let bought = 0; bought <= 7; bought += 1) {
      expect(projectPolicyHorizon(G, "0").expectedStarvationPopLoss).toBe(7 - bought);
      const buy = transition(G.definition, G, "0", { type: "bankBuy", material: "food" });
      if (!buy.ok) throw new Error(buy.reasons.join("; "));
      G = buy.state;
    }
  });

  it("pays from the stocks at the seat's own prices and leaves the current turn to the seat", () => {
    // Fed this turn. Each later year six freemen earn 6 gold and seven food cost 14.
    const fed = projectPolicyHorizon(importer({ gold: 100 }), "0", 3);
    expect(fed.expectedStarvationPopLoss).toBe(0);
    expect(fed.resources).toMatchObject({ gold: 100 - 3 * 8, food: 0, influence: 3 });

    // Food short now is not bought back: the seat has to do that itself this turn.
    expect(projectPolicyHorizon(importer({ food: -7, gold: 100 }), "0", 0)).toMatchObject({
      expectedStarvationPopLoss: 7,
      resources: { gold: 100 },
    });

    // No gold and no influence: the first year's 6 gold buys three and four freemen
    // leave, the second year's 2 gold buys one and two leave. The citizen is fed in
    // the third year by a Dole, bought with the 3 influence it has made by then.
    expect(projectPolicyHorizon(importer({}), "0", 3).expectedStarvationPopLoss).toBe(6);
  });

  it("buys the cheaper food first, by the seat's weights", () => {
    // Three short a year once the six freemen's gold is spent: the Dole covers it.
    const master = projectPolicyHorizon(importer({ influence: 30 }), "0", 1);
    expect(master.resources).toMatchObject({ gold: 0, influence: 30 + 1 - 4 * 3, food: 0 });
    expect(master.expectedStarvationPopLoss).toBe(0);

    // The trader weighs 2 gold at 4.5 and Public Dole's 2 influence at 3: the Dole first.
    const G = importer({ gold: 100, influence: 30 });
    G.players["0"].nationalIdeas = [{ id: "public-dole", acquired: "setup", year: 1 }];
    const trader = projectPolicyHorizon(G, "0", 1, PERSONALITY_WEIGHTS.trader);
    expect(trader.resources).toMatchObject({ gold: 106, influence: 31 - 7 * 2 });
    expect(projectPolicyHorizon(G, "0", 1).resources).toMatchObject({ gold: 92, influence: 31 });
  });

  it("follows the food past the horizon to the game's last year", () => {
    // Four freemen and a plains slave in year 2, twelve incomes to come: three food
    // short a year, 6 gold of it against 4 gold of income.
    const at = (gold: number, year = 2, slaves = 1) => {
      const G = scenario()
        .withSettlement("0", "-2,1", "city", { citizens: 0, freemen: 4, slaves })
        .withResources("0", { food: 0, wood: 0, stone: 0, gold, influence: 0 })
        .build();
      G.phase = "gameplay";
      G.currentPlayer = "0";
      G.year = year;
      G.players["0"].collectedThisTurn = true;
      G.activeYearCard = null;
      return projectPolicyHorizon(G, "0");
    };

    // 24 gold lasts the twelve years.
    expect(at(24)).toMatchObject({ expectedStarvationPopLoss: 0, starvedAfterHorizon: 0 });
    // 14 lasts seven. The six-year forecast closes with 2 gold and nobody lost; in the
    // eighth year 4 gold buys two of the three food and a freeman leaves. He stops
    // eating, and what he made is left in the sum, so the count stops there. He misses
    // five of the twelve incomes, and is counted as that share of a pop.
    expect(at(14)).toMatchObject({
      expectedStarvationPopLoss: 0,
      starvedAfterHorizon: 5 / 12,
      resources: { gold: 2, food: 0 },
    });
    // From year 9 the horizon reaches the last year and nothing is carried on.
    expect(at(14, 9)).toMatchObject({ expectedStarvationPopLoss: 0, starvedAfterHorizon: 0 });
    // A seat whose land feeds it carries nothing on either, with no gold at all.
    expect(at(0, 2, 4)).toMatchObject({
      expectedStarvationPopLoss: 0,
      starvedAfterHorizon: 0,
      resources: { gold: 24, food: 0 },
    });
  });

  it("does not count on the bank during setup", () => {
    // Setup picks land for the whole game and the forecast sees six years of it.
    const G = importer({ gold: 100 });
    G.phase = "setupColony";
    G.players["0"].collectedThisTurn = false;
    expect(projectPolicyHorizon(G, "0", 2)).toMatchObject({
      expectedStarvationPopLoss: 7,
      resources: { gold: 106 },
    });
  });
});

describe("pops on the move", () => {
  it("keeps a moved slave on the count: the move does not change the projected riots", () => {
    const G = projectionFixture();
    slavesInCapital(G, 6);
    const [capital, colony] = G.players["0"].settlements;
    expect(projectPolicyHorizon(G, "0", 3).unrest.riotEvents).toBe(2);
    expect(movePops(G, "0", capital, colony, { citizens: 0, freemen: 0, slaves: 1 }).ok).toBe(true);
    // Five stand and one is on the road. It counts now and arrives before the next income.
    expect(projectPolicyHorizon(G, "0", 3).unrest.riotEvents).toBe(2);
    expect(G.transfers).toHaveLength(1);
  });

  it.each([
    ["master", masterPolicy],
    ["slaver", POLICIES.slaver],
    ["civic", POLICIES.civic],
    ["trader", POLICIES.trader],
  ] as const)("%s moves an idle hill slave to an open plains slot", (_name, policy) => {
    // The hill makes nothing. On the plains the slave makes 1 food a turn, for the
    // realm's last food: nothing can follow the move, so it stands on its own value.
    const G = scenario()
      .withSettlement("0", "0,-2", "city", { citizens: 0, freemen: 0, slaves: 1 })
      .withSettlement("0", "-1,0", "colony", { citizens: 0, freemen: 0, slaves: 1 })
      .withResources("0", { food: 1, wood: 0, stone: 0, gold: 0, influence: 0 })
      .build();
    G.phase = "gameplay";
    G.currentPlayer = "0";
    G.players["0"].collectedThisTurn = true;
    G.activeYearCard = null;
    const moves = enumerateLegalCommands(G, "0").filter(
      (move) =>
        move.type === "endTurn" || (move.type === "movePops" && move.sourceTileId === "-1,0"),
    );
    expect(policy.choose(observe(G), moves, createSimRng(1))).toEqual({
      type: "movePops",
      sourceTileId: "-1,0",
      targetTileId: "0,-2",
      pops: { citizens: 0, freemen: 0, slaves: 1 },
    });
  });

  const everyBuild = [
    ["master", masterPolicy],
    ["slaver", POLICIES.slaver],
    ["civic", POLICIES.civic],
    ["trader", POLICIES.trader],
  ] as const;
  /** Player 0 with two settlements, on its own turn after income. */
  const realm = (
    first: [string, "city" | "colony", { citizens: number; freemen: number; slaves: number }],
    second: [string, "city" | "colony", { citizens: number; freemen: number; slaves: number }],
    food: number,
  ) => {
    const G = scenario()
      .withSettlement("0", ...first)
      .withSettlement("0", ...second)
      .withResources("0", { food, wood: 0, stone: 0, gold: 0, influence: 0 })
      .build();
    G.phase = "gameplay";
    G.currentPlayer = "0";
    G.players["0"].collectedThisTurn = true;
    G.activeYearCard = null;
    return G;
  };
  const moveOrEnd = (G: HegemonyState) =>
    enumerateLegalCommands(G, "0").filter(
      (move) => move.type === "endTurn" || move.type === "movePops",
    );

  it.each(everyBuild)(
    "%s fills an open slot with an idle slave, also the last room",
    (_n, policy) => {
      // The plains colony has two slots open and room for one more pop. The hill slave
      // makes nothing where it stands. An idle slave once weighed as much as a working
      // one and the open slot as much as a worked one, so the move lost its 1 food.
      const G = realm(
        ["0,-3", "colony", { citizens: 0, freemen: 1, slaves: 2 }],
        ["-1,0", "colony", { citizens: 0, freemen: 0, slaves: 1 }],
        1,
      );
      expect(policy.choose(observe(G), moveOrEnd(G), createSimRng(1))).toEqual({
        type: "movePops",
        sourceTileId: "-1,0",
        targetTileId: "0,-3",
        pops: { citizens: 0, freemen: 0, slaves: 1 },
      });
    },
  );

  it.each(everyBuild)("%s sends as many slaves as the target has slots open", (_n, policy) => {
    // Four idle hill slaves; the plains city works four of six slots and has room for
    // three. One slave or all four were the only offers: two is the move.
    const G = realm(
      ["-2,1", "city", { citizens: 1, freemen: 0, slaves: 4 }],
      ["-1,0", "colony", { citizens: 0, freemen: 0, slaves: 4 }],
      4,
    );
    expect(policy.choose(observe(G), moveOrEnd(G), createSimRng(1))).toEqual({
      type: "movePops",
      sourceTileId: "-1,0",
      targetTileId: "-2,1",
      pops: { citizens: 0, freemen: 0, slaves: 2 },
    });
  });
});

describe("frontier value", () => {
  it("is nothing without a colony piece, and comes back when an upgrade frees one", () => {
    // Four colonies are every piece. The coast is still open to a fifth by the board,
    // and the engine refuses it.
    const G = scenario()
      .withSettlement("0", "0,-2", "city", { citizens: 1, freemen: 0, slaves: 0 })
      .withSettlement("0", "-3,0", "colony", { citizens: 0, freemen: 1, slaves: 0 })
      .withSettlement("0", "-3,2", "colony", { citizens: 0, freemen: 1, slaves: 0 })
      .withSettlement("0", "3,-3", "colony", { citizens: 0, freemen: 1, slaves: 0 })
      .withSettlement("0", "3,0", "colony", { citizens: 0, freemen: 1, slaves: 0 })
      .withResources("0", "wealthy")
      .build();
    G.phase = "gameplay";
    G.currentPlayer = "0";
    expect(enumerateLegalCommands(G, "0").some((move) => move.type === "foundColony")).toBe(false);
    expect(frontierValue(G, "0")).toBe(0);

    expect(upgradeColonyToCity(G, "0", "-3,2").ok).toBe(true);
    expect(enumerateLegalCommands(G, "0").some((move) => move.type === "foundColony")).toBe(true);
    expect(frontierValue(G, "0")).toBeGreaterThan(0);
  });
});

/** Player 0 with one freeman, no slaves, no Temples and food to spare: a level of 0.
 *  Calm is priced out of reach unless the case is about calm: the others are about
 *  what a riot or a revolt costs a seat that has to meet it. */
function projectionFixture({ calm = false } = {}): HegemonyState {
  const G = scenario(calm ? {} : { patch: { civicCalm: { influenceCost: 99, goldCost: 99 } } })
    .opening()
    .build();
  const player = G.players["0"];

  G.pendingPlayerEvent = null;
  G.pendingRiot = null;
  G.activeYearCard = null;
  G.activeLaws = [];
  Object.assign(player.resources, { food: 100 });
  for (const [index, tileId] of player.settlements.entries()) {
    const settlement = G.board.tiles
      .find((tile) => tile.id === tileId)
      ?.settlements.find((candidate) => candidate.owner === "0");
    if (settlement) {
      settlement.pops = {
        citizens: 0,
        freemen: index === 0 ? 1 : 0,
        slaves: 0,
      };
      settlement.buildings = [];
    }
  }

  return G;
}

/** Read, or first set, the slaves in player 0's first settlement. */
function slavesInCapital(G: HegemonyState, slaves?: number): number {
  const settlement = G.board.tiles
    .find((tile) => tile.id === G.players["0"].settlements[0])!
    .settlements.find((candidate) => candidate.owner === "0")!;

  if (slaves !== undefined) {
    settlement.pops.slaves = slaves;
  }
  return settlement.pops.slaves;
}

function chooseFreemanGrowth(policy: typeof smartPolicy | typeof beamPolicy, food: number) {
  const G = scenario().build();
  const player = G.players["0"];
  const tile = G.board.tiles.find((candidate) => candidate.resource?.type === "wood");
  if (!tile) throw new Error("growth fixture needs a wood tile");

  G.phase = "gameplay";
  G.currentPlayer = "0";
  tile.settlements.push({
    id: `settlement-${G.nextEntityId++}`,
    tileId: tile.id,
    owner: "0",
    kind: "city",
    buildings: [],
    pops: { citizens: 0, freemen: 2, slaves: 0 },
  });
  player.settlements = [tile.id];
  Object.assign(player.resources, {
    wood: 0,
    stone: 0,
    gold: 2,
    food,
    influence: 0,
  });

  const moves = enumerateLegalCommands(G, "0");
  const growth = moves.find((move) => move.type === "growPop" && move.pop === "freemen");
  const endTurnMove = moves.find((move) => move.type === "endTurn");
  if (!growth || !endTurnMove) {
    throw new Error("growth fixture did not enumerate its comparison moves");
  }

  return policy.choose(observe(G), [growth, endTurnMove], createSimRng(1));
}

/** Cycle whole turns until the agora convenes (Year 2+). Unattended seats can
 *  pick up an event or riot on the way; both are dismissed exactly as the engine suites do. */
function playUntilAssembly(G: HegemonyState, limit = 40): void {
  let turns = 0;
  while (!G.assembly && G.phase === "gameplay" && turns < limit) {
    G.pendingPlayerEvent = null;
    endTurn(G);
    if (G.pendingRiot) resolveRiot(G, G.currentPlayer);
    turns += 1;
  }
}

/** Recursively freeze, approximating immer's deep-frozen committed UI state. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

describe("policy evaluation is side-effect-free", () => {
  it("cannot change its choice when only hidden entropy and deck order change", () => {
    const G = scenario()
      .opening()
      .withResources("0", "wealthy")
      .mutate((draft) => {
        draft.pendingPlayerEvent = null;
        draft.pendingRiot = null;
      })
      .build();
    const hiddenVariant = structuredClone(G);
    hiddenVariant.seed += 999;
    hiddenVariant.rng ^= 0x7fffffff;
    hiddenVariant.yearDrawPile.reverse();
    hiddenVariant.playerDrawPile.reverse();
    for (const deck of Object.values(hiddenVariant.politicianDecks)) deck.reverse();

    const firstView = observe(G);
    const secondView = observe(hiddenVariant);
    expect(JSON.stringify(secondView)).toBe(JSON.stringify(firstView));

    const commands = enumerateLegalCommands(G, G.currentPlayer);
    expect(masterPolicy.choose(firstView, commands, createSimRng(44))).toEqual(
      masterPolicy.choose(secondView, commands, createSimRng(44)),
    );
  });

  it("greedy and smart choose on a deep-frozen state without throwing (immer-safe)", () => {
    const rng = createSimRng(4);
    const G = runGame({ seed: 4, mode: "standard", policy: greedyPolicy, turns: 8 });
    const moves = enumerateLegalCommands(G, G.currentPlayer);
    expect(moves.length).toBeGreaterThan(0);

    deepFreeze(G);

    // The old evaluator mutated G.players[x].resources in place then restored it —
    // which throws on frozen state. The projection now runs on a copy.
    expect(() => greedyPolicy.choose(observe(G), moves, rng)).not.toThrow();
    expect(() => smartPolicy.choose(observe(G), moves, rng)).not.toThrow();
    // The beam searches on clones only, so a frozen committed state is safe too.
    expect(() => beamPolicy.choose(observe(G), moves, rng)).not.toThrow();
    // The political bot evaluates on structuredClones too — never mutates the passed G.
    expect(() => politicalPolicy.choose(observe(G), moves, rng)).not.toThrow();
    // The settler bot's frontier term only READS the board (canPlaceColonyOnTile) — safe on frozen state.
    expect(() => settlerPolicy.choose(observe(G), moves, rng)).not.toThrow();
    // Master composes the beam with the political + frontier score and is equally safe.
    expect(() => masterPolicy.choose(observe(G), moves, rng)).not.toThrow();
  });
});

// The settler bot adds map/expansion foresight — a frontier term over the same smart
// evaluation — so like the others it must stay deterministic and complete games (its
// one-ply search still meets the agora, where it passes like smart).
describe("settler policy", () => {
  it("is deterministic: same seed twice → byte-identical game", () => {
    const a = runGame({ seed: 31, mode: "standard", policy: settlerPolicy, turns: 60 });
    const b = runGame({ seed: 31, mode: "standard", policy: settlerPolicy, turns: 60 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  }, 60000);

  it("plays complete games across seeds without deadlocking", () => {
    for (const seed of [1, 2, 3]) {
      const G = runGame({ seed, mode: "standard", policy: settlerPolicy, turns: 80 });
      expect(["gameplay", "gameOver"]).toContain(G.phase);
    }
  }, 90000);
});

describe("master policy", () => {
  it("is deterministic: same seed twice → byte-identical game", () => {
    const a = runGame({ seed: 17, mode: "standard", policy: masterPolicy, turns: 4 });
    const b = runGame({ seed: 17, mode: "standard", policy: masterPolicy, turns: 4 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  }, 60000);

  it("uses the political Assembly strategy and carries the session to completion", () => {
    let G = scenario({ seed: 23 }).opening().build();
    playUntilAssembly(G);
    expect(G.assembly).toBeTruthy();

    const masterRng = createSimRng(1);
    const politicalRng = createSimRng(1);
    let steps = 0;

    while (G.assembly && steps < 500) {
      const player = G.currentPlayer;
      const moves = enumerateLegalCommands(G, player);
      expect(moves.length).toBeGreaterThan(0);

      const choice = masterPolicy.choose(observe(G), moves, masterRng);
      // The Assembly half of master is deliberately the proven political heuristic.
      expect(choice).toEqual(politicalPolicy.choose(observe(G), moves, politicalRng));
      const result = transition(G.definition, G, player, choice);
      expect(result.ok).toBe(true);
      if (!result.ok) break;
      G = result.state;
      steps += 1;
    }

    expect(G.assembly).toBeNull();
    expect(steps).toBeLessThan(500);
  });
});

// The political bot plays the Assembly (Phase 3-C). Its heuristics score hypothetical
// enactments on clones, so — like the beam — they must be deterministic, RNG-free, and
// side-effect-free even mid-agora. And a fully-engaged assembly must never deadlock the
// runner (it once did: an engaged agora blew past the single-turn action cap and the
// force-end tried an endTurn that is illegal while the agora stands).
describe("political policy", () => {
  it("values a ballot item once: own gain, less the best rival gain, plus the leader's loss", () => {
    const G = scenario().build();
    const before = { "0": 50, "1": 80, "2": 60, "3": 40 };
    const value = (gains: Partial<typeof before>) =>
      competitiveDelta(before, G, "0", (_state, player) => before[player] + (gains[player] ?? 0));

    // A neutral Law: the untouched leader adds nothing to the seat's own gain.
    expect(value({ "0": 19 })).toBe(19);
    // A Directive on the leader counts its loss; on another rival, only the prize.
    expect(value({ "0": 2, "1": -30 })).toBe(32);
    expect(value({ "0": 2, "2": -30 })).toBe(2);
    expect(value({ "0": 5, "3": 12 })).toBe(-7);
  });

  it("smart bots author passing Laws, hold Voice and finish without action caps", () => {
    const passedSeats = new Set<string>();
    const voices = new Set<string>();
    let capped = 0;
    const years = yearDeckSize(scenario().build());
    for (const seed of [2, 3, 4]) {
      const G = runGame({
        seed,
        mode: "standard",
        policy: smartPolicy,
        turns: years * PLAYER_IDS.length,
        hooks: {
          onMove: (state) => {
            for (const id of PLAYER_IDS)
              if (
                state.assemblyPassedByPlayer[id] > 0 &&
                state.activeLaws.some((law) => law.author === id)
              )
                passedSeats.add(id);
            const holder = voiceHolder(state);
            if (holder) voices.add(holder);
            expect(state.activeLaws.length).toBeLessThanOrEqual(4);
          },
          onForceEndTurn: () => {
            capped++;
          },
        },
      });
      expect(G.phase).toBe("gameOver");
      if (G.gameOverReason === "deckExhausted") expect(G.year).toBe(years);
      else {
        expect(G.gameOverReason).toBe("victoryRace");
        expect(G.year).toBeLessThanOrEqual(years);
        expect(G.winner).not.toBeNull();
        expect(victoryCardsHeld(G, G.winner!)).toBeGreaterThanOrEqual(G.ruleset.victory.cardsToWin);
      }
    }
    expect(capped).toBe(0);
    expect([...passedSeats].sort()).toEqual([...PLAYER_IDS]);
    expect(voices.size).toBeGreaterThan(0);
  }, 90000);

  it("is deterministic across assemblies: same seed twice → byte-identical game", () => {
    const a = runGame({ seed: 21, mode: "standard", policy: politicalPolicy, turns: 12 });
    const b = runGame({ seed: 21, mode: "standard", policy: politicalPolicy, turns: 12 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  }, 60000);

  it("plays complete games across seeds without deadlocking through the agora", () => {
    for (const seed of [1, 2, 3]) {
      const G = runGame({ seed, mode: "standard", policy: politicalPolicy, turns: 80 });
      expect(["gameplay", "gameOver"]).toContain(G.phase);
    }
  }, 90000);

  it("chooses at an OPEN assembly without advancing game RNG or mutating (anti-peek)", () => {
    const G = scenario({ seed: 7 }).opening().build();
    playUntilAssembly(G);
    expect(G.assembly).toBeTruthy(); // the agora convened

    const moves = enumerateLegalCommands(G, G.currentPlayer);
    expect(moves.length).toBeGreaterThan(0);

    const rngBefore = G.rng;
    const snapshot = JSON.stringify(G);
    politicalPolicy.choose(observe(G), moves, createSimRng(1));

    // The seeded stream never advanced, and the evaluation ran only on clones.
    expect(G.rng).toBe(rngBefore);
    expect(JSON.stringify(G)).toBe(snapshot);
  });

  it("passes in the proposal round when it cannot afford to fish or repeal", () => {
    const G = scenario({ seed: 5 }).opening().build();
    playUntilAssembly(G);
    if (!G.assembly || G.assembly.phase !== "proposal") {
      return; // reached voting straight away this seed — the gate is exercised elsewhere
    }
    const me = G.currentPlayer;
    G.players[me].resources.influence = 0; // nothing to spend

    const choice = politicalPolicy.choose(
      observe(G, me),
      enumerateLegalCommands(G, me),
      createSimRng(1),
    );
    expect(choice.type).toBe("assemblyPass");
  });

  it("draws from Stratokles when his authored prize is the available line", () => {
    // A Directive never counts toward Voice, so only the prize can make it worth a draw.
    const G = scenario({ seed: 11, patch: { assembly: { prizes: { stratokles: { gold: 40 } } } } })
      .opening()
      .build();
    playUntilAssembly(G);
    expect(G.assembly?.phase).toBe("proposal");

    const me = G.currentPlayer;
    G.players[me].resources.influence = 100;
    for (const politician of ["demosthenes", "perdiccas", "kleistophenes"] as const) {
      G.politicianDecks[politician] = [];
      G.politicianDiscards[politician] = [];
    }

    const choice = politicalPolicy.choose(
      observe(G, me),
      enumerateLegalCommands(G, me),
      createSimRng(1),
    );
    expect(choice).toMatchObject({ type: "assemblyDraw", politician: "stratokles" });
  });

  it("values only deck composition, never the hidden top-card order", () => {
    const G = scenario({ seed: 29 }).opening().build();
    playUntilAssembly(G);
    expect(G.assembly?.phase).toBe("proposal");

    const me = G.currentPlayer;
    G.players[me].resources.influence = 100;
    const moves = enumerateLegalCommands(G, me);
    const before = politicalPolicy.choose(observe(G), moves, createSimRng(1));

    for (const politician of ["demosthenes", "perdiccas", "kleistophenes", "stratokles"] as const) {
      G.politicianDecks[politician].reverse();
    }

    expect(politicalPolicy.choose(observe(G), moves, createSimRng(1))).toEqual(before);
  });

  it("aims a Directive at the rival it hurts most", () => {
    // The prize makes the Directive worth proposing; the target is the question.
    const G = scenario({ seed: 13, patch: { assembly: { prizes: { stratokles: { gold: 40 } } } } })
      .opening()
      .build();
    playUntilAssembly(G);
    expect(G.assembly?.phase).toBe("proposal");

    const me = G.currentPlayer;
    const rivals = PLAYER_IDS.filter((playerID) => playerID !== me);
    const target = rivals[0];
    for (const rival of rivals) G.players[rival].resources.food = rival === target ? 200 : 0;
    G.assembly!.held[me] = {
      card: RESOLUTION_CARDS.find((card) => card.id === "grain-riot")!,
    };

    const choice = politicalPolicy.choose(
      observe(G, me),
      enumerateLegalCommands(G, me),
      createSimRng(1),
    );
    expect(choice).toMatchObject({ type: "assemblyPropose", target });
  });
});

// The beam search is compute-heavy, so these run short games and lift vitest's default
// 5s per-test timeout (they can exceed it on slower CI hardware).
describe("beam policy", () => {
  it("is deterministic: same seed twice → byte-identical game", () => {
    const a = runGame({ seed: 13, mode: "standard", policy: beamPolicy, turns: 8 });
    const b = runGame({ seed: 13, mode: "standard", policy: beamPolicy, turns: 8 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  }, 30000);

  it("consumes no game RNG and never mutates the passed state (anti-peek)", () => {
    const G = runGame({ seed: 8, mode: "standard", policy: beamPolicy, turns: 5 });
    const moves = enumerateLegalCommands(G, G.currentPlayer);
    if (moves.length === 0) return; // gameOver — nothing to choose

    const rngBefore = G.rng;
    const snapshot = JSON.stringify(G);
    beamPolicy.choose(observe(G), moves, createSimRng(1));

    // The seeded stream never advanced, and the search ran only on clones.
    expect(G.rng).toBe(rngBefore);
    expect(JSON.stringify(G)).toBe(snapshot);
  }, 30000);

  it.each([1, 2, 3])(
    "plays seed %i's complete turns without tripping the anti-peek assertion",
    (seed) => {
      const G = runGame({ seed, mode: "standard", policy: beamPolicy, turns: 4 });
      expect(["gameplay", "gameOver"]).toContain(G.phase);
    },
    30000,
  );
});

describe("opening placement", () => {
  const definition = createGameDefinition({
    ruleset: GAME_MODES.standard.ruleset,
    content: getAuthoredGameContent(),
  });
  const searchPolicies = [
    greedyPolicy,
    smartPolicy,
    beamPolicy,
    politicalPolicy,
    settlerPolicy,
    masterPolicy,
  ];

  it("seats the first metropolis on food land with enough slave work slots", () => {
    const G = createInitialStateFromDefinition(definition, 5, "classic");
    const commands = enumerateLegalCommands(G, G.currentPlayer);
    const command = smartPolicy.choose(observe(G), commands, createSimRng(1));

    expect(command.type).toBe("placeCapital");
    const tile = getTile(G, (command as { tileId: string }).tileId)!;
    expect(tile.resource).toMatchObject({ type: "food" });
    if (command.type !== "placeCapital") throw new Error("expected capital placement");
    expect(tile.slots).toBeGreaterThanOrEqual(command.pops.slaves);
  });

  it("every search policy places identically — openings are a held constant in A/Bs", () => {
    const G = createInitialStateFromDefinition(definition, 5, "classic");
    const commands = enumerateLegalCommands(G, G.currentPlayer);
    const choices = searchPolicies.map((policy) =>
      JSON.stringify(policy.choose(observe(G), commands, createSimRng(1))),
    );

    expect(new Set(choices).size).toBe(1);
  });

  it("policy openings put every capital on yielding land", () => {
    for (const seed of [5, 42, 73000]) {
      const G = buildNewGame({
        seed,
        mode: "standard",
        opening: "policy",
        boardLayout: "shuffled",
        simRng: createSimRng(seed),
      });
      expect(G.phase).toBe("gameplay");
      for (const player of Object.values(G.players)) {
        const capital = getTile(G, player.settlements[0])!;
        expect(capital.resource).not.toBeNull();
      }
    }
  });

  it("is a pure function of the seed", () => {
    const build = () =>
      buildNewGame({ seed: 42, mode: "standard", opening: "policy", simRng: createSimRng(7) });

    expect(JSON.stringify(build())).toBe(JSON.stringify(build()));
  });

  it("founds the setup colony away from a city when a comparable site is open", () => {
    let G = createInitialStateFromDefinition(definition, 5, "classic");
    const capitals = { "0": "-2,0", "1": "0,-2", "2": "2,0", "3": "0,2" } as const;
    while (G.phase === "setupCapital") {
      const placed = transition(G.definition, G, G.currentPlayer, {
        type: "placeCapital",
        tileId: capitals[G.currentPlayer],
        pops: { citizens: 1, freemen: 1, slaves: 2 },
      });
      if (!placed.ok) throw new Error(placed.reasons.join());
      G = placed.state;
    }

    // Seat 3 weighs four-slot plains beside a capital against three-slot plains on the
    // open coast. A colony beside a city can never be upgraded, so the open site wins.
    const command = masterPolicy.choose(
      observe(G),
      enumerateLegalCommands(G, G.currentPlayer),
      createSimRng(1),
    );
    expect(command).toMatchObject({ type: "placeColony", tileId: "-3,2" });
    expect(isAdjacentToCity(G, getTile(G, "-3,2")!)).toBe(false);
    expect(isAdjacentToCity(G, getTile(G, "0,-3")!)).toBe(true);
  });

  it("counts a hill's slots in the frontier once Land Reform lets its slaves grow food", () => {
    // From the forest at 0,-1 the best three sites are plains (5), forest (4) and,
    // under Land Reform, the four-slot hill instead of a three-slot mountain.
    const G = scenario()
      .withSettlement("0", "0,-1", "city", { citizens: 1, freemen: 0, slaves: 0 })
      .build();
    G.phase = "gameplay";
    expect(placementFrontier(G, "0").frontier).toBe(12);
    G.activeLaws.push({ cardId: "land-reform", author: "1", enactedYear: 1, order: 0 });
    expect(placementFrontier(G, "0").frontier).toBe(13);
  });

  it("discounts frontier a rival can also reach", () => {
    const G = createInitialStateFromDefinition(definition, 5, "classic");
    const site = getTile(G, "-2,1")!; // six-slot plains, the second-best seat on the classic board
    const legalCapitals = G.board.tiles.filter(
      (tile) =>
        tile.terrain !== "oracle" &&
        tile.id !== site.id &&
        tile.resource !== null &&
        hexDistance(tile, site) >= 2,
    );
    const nearby = legalCapitals.filter((tile) => hexDistance(tile, site) === 2);
    const far = legalCapitals.reduce((a, b) =>
      hexDistance(b, site) > hexDistance(a, site) ? b : a,
    );
    expect(hexDistance(far, site)).toBeGreaterThanOrEqual(4);

    const pops = { citizens: 1, freemen: 3, slaves: 0 };
    const place = (rivalTile: string) => {
      const first = transition(G.definition, G, "0", {
        type: "placeCapital",
        tileId: rivalTile,
        pops,
      });
      if (!first.ok) throw new Error(first.reasons.join());
      const second = transition(G.definition, first.state, "1", {
        type: "placeCapital",
        tileId: site.id,
        pops,
      });
      if (!second.ok) throw new Error(second.reasons.join());
      return second.state;
    };

    // Same site, same pops, same own income: only the shared frontier differs. A rival
    // two hexes away can only take frontier from the site, never add to it.
    const farScore = evaluatePlacement(place(far.id), "1");
    const nearScores = nearby.map((tile) => evaluatePlacement(place(tile.id), "1"));
    expect(Math.max(...nearScores)).toBeLessThanOrEqual(farScore);
    expect(Math.min(...nearScores)).toBeLessThan(farScore);
  });
});

describe("v2 card scoring", () => {
  it("places a captured slave where it feeds a hungry citizen, using legal resolutions", () => {
    const initial = scenario().build();
    const plains = initial.board.tiles.find((tile) => tile.terrain === "plains")!;
    const hill = initial.board.tiles.find((tile) => tile.terrain === "hill")!;
    const G = scenario()
      .withSettlement("0", plains.id, "capital", { citizens: 1, freemen: 0, slaves: 0 })
      .withSettlement("0", hill.id, "colony", { citizens: 0, freemen: 0, slaves: 0 })
      .withResources("0", { wood: 0, stone: 0, gold: 0, food: 0, influence: 0 })
      .mutate((state) => {
        state.phase = "gameplay";
        state.currentPlayer = "0";
        state.activeYearCard = null;
        state.pendingPlayerEvent = {
          card: PLAYER_EVENT_CARDS.find((card) => card.id === "player-captured-laborers")!,
          playerID: "0",
        };
      })
      .build();
    const commands = enumerateLegalCommands(G, "0");
    expect(commands).toHaveLength(2);
    for (const policy of [smartPolicy, masterPolicy]) {
      const command = policy.choose(observe(G), commands, createSimRng(1));
      expect(command).toEqual({ type: "resolveEvent", targetTileId: plains.id });
      expect(transition(G.definition, G, "0", command).ok).toBe(true);
    }
  });
});

describe("hunger choice", () => {
  it("bots pick who leaves with their scorer, from the legal splits", () => {
    const G = scenario()
      .withSettlement("0", "-2,0", "city", { citizens: 2, freemen: 2, slaves: 1 })
      .withResources("0", { food: 0 })
      .mutate((state) => {
        state.phase = "gameplay";
        state.currentPlayer = "0";
        state.players["0"].collectedThisTurn = true;
        state.pendingHunger = { playerID: "0", unfed: 2 };
      })
      .build();
    const commands = enumerateLegalCommands(G, "0");
    expect(commands.map((c) => c.type)).toEqual([
      "resolveHunger",
      "resolveHunger",
      "resolveHunger",
    ]);
    for (const policy of [smartPolicy, masterPolicy]) {
      const command = policy.choose(observe(G), commands, createSimRng(1));
      expect(commands).toContainEqual(command);
      const result = transition(G.definition, G, "0", command);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.state.pendingHunger).toBeNull();
    }
  });
});
