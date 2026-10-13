import { describe, expect, it } from "vitest";
import { getPlayerBankRate } from "../game/bank";
import { happinessLevel } from "../game/happiness";
import { playerDole } from "../game/ideaRules";
import { enumerateLegalCommands, transition, type GameCommand } from "../game/legalMoves";
import { projectForPlayer } from "../game/projection";
import { owned, scenario } from "../game/testing/scenario";
import type { HegemonyState, Pops } from "../game/types";
import { ventureOutcomes } from "./chance";
import { POLICIES, type PersonalityId } from "./policies";
import { createSimRng } from "./rng";
import { playTurn, runGame } from "./runner";
import { buildNewGame } from "./setup";
import { Aggregator } from "./telemetry";

const names: PersonalityId[] = ["slaver", "civic", "trader"];
function realm(pops = { citizens: 1, freemen: 2, slaves: 2 }) {
  const G = scenario()
    .withSettlement("0", "-2,0", "city", pops)
    .withResources("0", { food: 50, wood: 12, stone: 12, gold: 12, influence: 12 })
    .build();
  G.phase = "gameplay";
  G.players["0"].collectedThisTurn = true;
  G.activeYearCard = null;
  return G;
}
function choose(
  name: PersonalityId | "master",
  G: HegemonyState,
  keep: (move: GameCommand) => boolean,
) {
  const moves = enumerateLegalCommands(G, "0").filter(keep);
  return POLICIES[name].choose(projectForPlayer(G.definition, G, "0"), moves, createSimRng(1));
}

/** Play the seat's choices until it ends its turn; the turn itself is not ended. */
function playOwnTurn(name: PersonalityId | "master", start: HegemonyState) {
  let G = start;
  const moves: GameCommand[] = [];
  for (let action = 0; action < 30; action++) {
    const move = POLICIES[name].choose(
      projectForPlayer(G.definition, G, "0"),
      enumerateLegalCommands(G, "0"),
      createSimRng(1),
    );
    if (move.type === "endTurn") break;
    moves.push(move);
    const result = transition(G.definition, G, "0", move);
    if (!result.ok) throw new Error(result.reasons.join("; "));
    G = result.state;
  }
  const foodBought = moves.filter(
    (move) => move.type === "dole" || (move.type === "bankBuy" && move.material === "food"),
  ).length;
  return { G, moves, foodBought };
}

describe("shared personality search", () => {
  it("prefers slave growth, citizen promotion and freeman growth on the same fed board", () => {
    const G = realm();
    owned(G, "-2,0", "0").buildings.push("temple");
    Object.assign(G.players["0"].resources, { wood: 0, stone: 0, influence: 0, gold: 2 });
    const keep = (m: GameCommand) =>
      m.type === "endTurn" || m.type === "growPop" || m.type === "promotePop";
    expect(choose("slaver", G, keep)).toMatchObject({ type: "growPop", pop: "slaves" });
    const civicFirst = choose("civic", G, keep);
    const civicNext = transition(G.definition, G, "0", civicFirst);
    expect(civicNext.ok).toBe(true);
    if (!civicNext.ok) return;
    const civicSecond = choose("civic", civicNext.state, keep);
    expect([civicFirst, civicSecond]).toContainEqual({
      type: "promotePop",
      tileId: "-2,0",
      from: "freemen",
    });
    expect(choose("trader", G, keep)).toMatchObject({ type: "growPop", pop: "freemen" });
  });

  it.each([
    ["slaver", "estate", { citizens: 0, freemen: 0, slaves: 4 }],
    ["civic", "forum", { citizens: 3, freemen: 1, slaves: 1 }],
    ["trader", "marketplace", { citizens: 1, freemen: 3, slaves: 1 }],
  ] as const)("%s builds its class building for the real income", (name, buildingId, pops) => {
    const G = realm({ ...pops });
    const move = choose(
      name,
      G,
      (m) => m.type === "endTurn" || (m.type === "buildBuilding" && m.buildingId === buildingId),
    );
    expect(move).toMatchObject({ type: "buildBuilding", buildingId });
    expect(transition(G.definition, G, "0", move).ok).toBe(true);
  });

  it("the trader keeps its only citizen from the standard opening", () => {
    // It weights a freeman above a citizen, so on points alone it would pay the one
    // influence to demote the citizen setup gave it, and lose its vote and influence.
    const G = scenario().opening().build();
    G.pendingPlayerEvent = null;
    G.players["0"].resources.influence = 3;
    const keep = (m: GameCommand) =>
      m.type === "endTurn" || (m.type === "demotePop" && m.from === "citizens");
    expect(enumerateLegalCommands(G, "0").filter(keep)).toHaveLength(2);
    expect(choose("trader", G, keep)).toEqual({ type: "endTurn" });

    // Short one food, it lets a freeman go before the citizen.
    const hungry = structuredClone(G);
    hungry.players["0"].resources.food = -1;
    const short = transition(hungry.definition, hungry, "0", { type: "endTurn" });
    if (!short.ok) throw new Error(short.reasons.join("; "));
    expect(choose("trader", short.state, () => true)).toMatchObject({
      type: "resolveHunger",
      leave: [{ pop: "freemen" }],
    });
  });

  it.each([...names, "master"] as const)(
    "%s buys the food it is short of now and holds none ahead",
    (name) => {
      for (const payment of ["gold", "influence"] as const) {
        // A full city of eight mouths, eight food short after income. The same
        // shortfall comes every year, and nothing is bought against it.
        const G = realm({ citizens: 1, freemen: 7, slaves: 0 });
        G.year = 5;
        Object.assign(G.players["0"].resources, {
          food: -8,
          wood: 0,
          stone: 0,
          gold: 0,
          influence: 0,
          [payment]: 100,
        });
        const turn = playOwnTurn(name, G);
        expect(turn.foodBought).toBe(8);
        expect(turn.G.players["0"].resources.food).toBeGreaterThanOrEqual(0);
      }
    },
    30000,
  );

  it.each([...names, "master"] as const)(
    "%s buys no food ahead of a shortfall it can pay for when it comes",
    (name) => {
      for (const payment of ["gold", "influence"] as const) {
        // The same city in year 13, fed this turn and eight short at the last income.
        // The food costs the same then, so buying it now only parks the stock in food.
        // Before the forecast bought food, all eight were bought a year early.
        const G = realm({ citizens: 1, freemen: 7, slaves: 0 });
        G.year = 13;
        Object.assign(G.players["0"].resources, {
          food: 0,
          wood: 0,
          stone: 0,
          gold: 0,
          influence: 0,
          [payment]: 100,
        });
        expect(playOwnTurn(name, G).foodBought).toBe(0);
      }
    },
    30000,
  );

  it.each([...names, "master"] as const)(
    "%s feeds its pops this turn though its gold cannot keep them fed",
    (name) => {
      // Seven mouths on a mountain, three short, 4 gold and nothing coming that could
      // feed them all next year. The forecast loses them whether they eat today or
      // not, so only the charge for food short now pays for the purchase. Without it
      // the gold went to wood, stone or a promotion and three pops left.
      const doomed = realm({ citizens: 1, freemen: 6, slaves: 0 });
      doomed.year = 5;
      Object.assign(doomed.players["0"].resources, {
        food: -3,
        wood: 0,
        stone: 0,
        gold: 4,
        influence: 0,
      });
      // All 4 gold goes to food: one from the bank, and a Colonists' Voyage, whose 2
      // gold bring 1.5 food on average against the bank's one.
      const last = playOwnTurn(name, doomed);
      expect(last.moves).toEqual([
        { type: "bankBuy", material: "food" },
        { type: "fundExpedition", expeditionId: "colonistsVoyage" },
      ]);
      expect(last.G.players["0"].resources.gold).toBe(0);

      // An importer in year 8: nine mouths, three plains slaves, six short every year
      // against 8 gold of income. Its 20 gold cannot feed everyone to the horizon, and
      // the forecast would sooner lose two pops now than run out later. Fed, the seat
      // stands at zero food, where the search can reach the slave that feeds them.
      const importer = scenario()
        .withSettlement("0", "-2,1", "city", { citizens: 1, freemen: 4, slaves: 3 })
        .withSettlement("0", "0,-2", "city", { citizens: 0, freemen: 4, slaves: 0 })
        .withResources("0", { food: -6, wood: 0, stone: 0, gold: 20, influence: 0 })
        .build();
      importer.phase = "gameplay";
      importer.year = 8;
      importer.players["0"].collectedThisTurn = true;
      importer.activeYearCard = null;
      const turn = playOwnTurn(name, importer);
      expect(turn.foodBought).toBeGreaterThanOrEqual(6);
      expect(turn.G.players["0"].resources.food).toBeGreaterThanOrEqual(0);
    },
    30000,
  );

  it.each([...names, "master"] as const)(
    "%s grows a freeman past its food line only when its gold feeds him to the last year",
    (name) => {
      // Three freemen and one plains slave: two food short every year, bought from the
      // bank with the freemen's gold. A fourth freeman makes it three short: 6 gold of
      // food against 4 of income, so 2 gold a year out of the stock.
      const choice = (
        year: number,
        gold: number,
        pops = { citizens: 0, freemen: 3, slaves: 1 },
      ) => {
        const G = scenario()
          .withSettlement("0", "-2,1", "city", pops)
          .withResources("0", { food: 3, wood: 0, stone: 0, gold, influence: 0 })
          .build();
        G.phase = "gameplay";
        G.year = year;
        G.players["0"].collectedThisTurn = true;
        G.activeYearCard = null;
        return choose(
          name,
          G,
          (m) => m.type === "endTurn" || (m.type === "growPop" && m.pop === "freemen"),
        );
      };
      const grows = { type: "growPop", pop: "freemen" };

      // Year 2 leaves twelve incomes: 24 gold feeds him to year 14, and 28 is in hand.
      expect(choice(2, 28)).toMatchObject(grows);
      // 14 gold lasts seven years. Six of them are the forecast, which grew him and
      // then lost him: the food is now followed to the game's last year.
      expect(choice(2, 14)).toEqual({ type: "endTurn" });
      // From year 9 the same 14 gold lasts to the end.
      expect(choice(9, 14)).toMatchObject(grows);
      // Inside the forecast as before: 6 gold runs out in the fourth year.
      expect(choice(5, 6)).toEqual({ type: "endTurn" });
      // A seat whose land feeds it needs no gold: three plains slaves feed the third
      // freeman, in year 2 as in any other.
      expect(choice(2, 0, { citizens: 0, freemen: 2, slaves: 3 })).toMatchObject(grows);
      // A realm that buys its food keeps a year's purchases in hand against a lean
      // year. In year 12 two incomes are left: 4 gold feeds the fourth freeman to the
      // end, and buys two of the three food a year he would leave the realm short.
      expect(choice(12, 4)).toEqual({ type: "endTurn" });
      expect(choice(12, 20)).toMatchObject(grows);
    },
  );

  it("sequences selling wood into a Port for the trader", () => {
    // Four slaves hold the level at −2, so the Port's +2 is worth its price.
    const G = realm({ citizens: 0, freemen: 0, slaves: 4 });
    const asset = G.board.luxuries.find((good) => good.owner === null)!;
    const tile = G.board.tiles.find((tile) => tile.id === asset.tileIds[0])!;
    const home = owned(G, "-2,0", "0");
    G.board.tiles.find((t) => t.id === "-2,0")!.settlements = [];
    home.tileId = tile.id;
    tile.settlements.push(home);
    G.players["0"].settlements = [tile.id];
    Object.assign(G.players["0"].resources, { food: 0, wood: 3, gold: 3, stone: 2, influence: 0 });
    const move = choose("trader", G, (m) => m.type === "endTurn" || m.type === "bankSell");
    expect(move).toEqual({ type: "bankSell", material: "wood" });
    const sale = transition(G.definition, G, "0", move);
    expect(sale.ok).toBe(true);
    if (!sale.ok) return;
    expect(
      choose(
        "trader",
        sale.state,
        (m) => m.type === "endTurn" || (m.type === "buildBuilding" && m.buildingId === "port"),
      ),
    ).toMatchObject({ type: "buildBuilding", buildingId: "port" });
  });

  it("searches past a sole costly Forum to find its promotion payoff", () => {
    const G = realm({ citizens: 0, freemen: 1, slaves: 2 });
    owned(G, "-2,0", "0").buildings.push("temple");
    Object.assign(G.players["0"].resources, { wood: 0, stone: 3, gold: 2, influence: 0 });
    expect(
      choose(
        "civic",
        G,
        (m) => m.type === "endTurn" || (m.type === "buildBuilding" && m.buildingId === "forum"),
      ),
    ).toMatchObject({ type: "buildBuilding", buildingId: "forum" });
  });

  it("scores a venture to reach Treasurer but refuses its negative gold expectation away from the title", () => {
    const G = realm({ citizens: 0, freemen: 0, slaves: 0 });
    G.year = 14;
    G.players["0"].resources.gold = G.ruleset.victory.minimums.gold - 1;
    const keep = (m: GameCommand) =>
      m.type === "endTurn" || (m.type === "fundExpedition" && m.expeditionId === "merchantConvoy");
    expect(choose("trader", G, keep)).toEqual({
      type: "fundExpedition",
      expeditionId: "merchantConvoy",
    });
    const poor = structuredClone(G);
    poor.players["0"].resources.gold = 10;
    expect(choose("trader", poor, keep)).toEqual({ type: "endTurn" });
  });

  it("exhausts public venture outcomes, including every uniform Voyage destination, without mutation", () => {
    const G = realm({ citizens: 0, freemen: 0, slaves: 0 });
    const other = G.board.tiles.find((tile) => tile.id !== "-2,0" && tile.resource)!;
    const second = structuredClone(owned(G, "-2,0", "0"));
    second.id = `settlement-${G.nextEntityId++}`;
    second.tileId = other.id;
    other.settlements.push(second);
    G.players["0"].settlements.push(other.id);
    const before = JSON.stringify(G);
    const command = { type: "fundExpedition", expeditionId: "colonistsVoyage" } as const;
    const outcomes = ventureOutcomes(G, "0", command);
    expect(outcomes).toHaveLength(7);
    expect(outcomes.reduce((sum, o) => sum + o.probability, 0)).toBeCloseTo(1);
    const jackpots = outcomes.filter((o) => o.state.lastTableRoll?.roll === 6);
    expect(jackpots.map((o) => o.probability)).toEqual([1 / 12, 1 / 12]);
    expect(jackpots.map((o) => owned(o.state, "-2,0", "0").pops.freemen).sort()).toEqual([0, 1]);
    for (const o of outcomes) expect(o.state.rng).toBe(G.rng);
    expect(JSON.stringify(G)).toBe(before);
  });

  it.each(names)("%s makes the same legal choice when hidden rolls and decks differ", (name) => {
    const G = realm();
    const altered = structuredClone(G);
    altered.rng ^= 0xfffffff;
    altered.yearDrawPile.reverse();
    altered.playerDrawPile.reverse();
    const keep = (m: GameCommand) => m.type === "endTurn" || m.type === "fundExpedition";
    const move = choose(name, G, keep);
    expect(choose(name, altered, keep)).toEqual(move);
    expect(enumerateLegalCommands(G, "0")).toContainEqual(move);
  });

  it.each(names)(
    "%s scores Ideas in policy and fixed openings and buys a useful second Idea",
    (name) => {
      const policy = POLICIES[name];
      const G = buildNewGame({
        seed: 17,
        mode: "standard",
        opening: "fixed",
        policy,
        simRng: createSimRng(1),
      });
      expect(Object.values(G.players).every((p) => p.nationalIdeas.length === 1)).toBe(true);
      const buying = realm();
      buying.players["0"].nationalIdeas = [{ id: "assembly-brokers", acquired: "setup", year: 1 }];
      const move = choose(name, buying, (m) => m.type === "endTurn" || m.type === "buyIdea");
      expect(move.type).toBe("buyIdea");
      expect(transition(buying.definition, buying, "0", move).ok).toBe(true);
    },
  );

  it.each([...names, "master"] as const)(
    "%s buys legal calm to avoid the visible turn-end riot",
    (name) => {
      // The last year: calm is the whole riot avoided. Earlier it only moves a riot
      // that six slaves bring every year, until the riots have taken one of them.
      const G = realm({ citizens: 0, freemen: 0, slaves: 6 });
      G.year = 14;
      Object.assign(G.players["0"].resources, {
        food: 0,
        wood: 0,
        stone: 0,
        influence: 0,
        gold: 2,
      });
      const moves = enumerateLegalCommands(G, "0").filter(
        (m) => m.type === "endTurn" || m.type === "civicCalm",
      );
      const move = POLICIES[name].choose(
        projectForPlayer(G.definition, G, "0"),
        moves,
        createSimRng(1),
      );
      expect(move).toEqual({ type: "civicCalm", payment: "gold" });
      const result = transition(G.definition, G, "0", move);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const end = transition(G.definition, result.state, "0", { type: "endTurn" });
      expect(end.ok).toBe(true);
      if (end.ok) expect(end.state.pendingRiot).toBeNull();
    },
  );

  it.each([...names, "master"] as const)(
    "%s at the riot line raises a legal, affordable Port",
    (name) => {
      // Six slaves hold the level at −3. The Port's good is the cheapest lasting +2:
      // 4 gold and 2 stone, where two Temples would take 6 stone and two settlements.
      // There is no food for the ladder: with 2 food a slave is promoted instead, the
      // level stands at −2, and at the riot table's prices that is cure enough.
      const G = scenario()
        .withSettlement("0", "-2,-1", "city", { citizens: 0, freemen: 0, slaves: 6 })
        .withResources("0", { food: 0, wood: 0, stone: 2, gold: 4, influence: 0 })
        .build();
      G.phase = "gameplay";
      G.players["0"].collectedThisTurn = true;
      G.activeYearCard = null;
      expect(happinessLevel(G, "0")).toBe(G.ruleset.economy.unrest.riotThreshold);
      const next = playTurn(G, POLICIES[name], createSimRng(1));
      expect(owned(next, "-2,-1", "0").buildings).toContain("port");
      expect(next.turn).toBeGreaterThan(G.turn);
    },
    30000,
  );

  it.each(["civic", "trader", "master"] as const)(
    "%s faces a riot that calm would only move a year",
    (name) => {
      // Six slaves in year 5. The riot table takes a slave here, which a slaver weighs
      // at 45 and the others at 12. Calm costs 2 gold, the realm makes none to buy it
      // again, and the same riot comes next year: only the slaver pays to put it off.
      const G = realm({ citizens: 0, freemen: 0, slaves: 6 });
      G.year = 5;
      Object.assign(G.players["0"].resources, {
        food: 0,
        wood: 0,
        stone: 0,
        influence: 0,
        gold: 2,
      });
      expect(choose(name, G, (m) => m.type === "endTurn" || m.type === "civicCalm")).toEqual({
        type: "endTurn",
      });
    },
  );

  it.each(["trader", "master"] as const)(
    "%s grows a slave past the riot line when it can go on buying calm for it",
    (name) => {
      // Five plains slaves feed five of six citizens and hold the level at −2. A sixth
      // feeds the last citizen and takes the level to −3: calm every year, 2 of the 6
      // influence the citizens make, against a Dole every year without him. The
      // forecast used to read calm as bought once and gone, so the sixth slave was a
      // riot a year and no seat grew him. The civic still does not: it weighs the
      // influence and the standing level half as much again.
      const G = scenario()
        .withSettlement("0", "-2,1", "city", { citizens: 2, freemen: 0, slaves: 5 })
        .withSettlement("0", "-3,2", "colony", { citizens: 4, freemen: 0, slaves: 0 })
        .withResources("0", { food: 2, wood: 0, stone: 0, gold: 0, influence: 6 })
        .build();
      G.phase = "gameplay";
      G.year = 5;
      G.players["0"].collectedThisTurn = true;
      G.activeYearCard = null;
      expect(happinessLevel(G, "0")).toBe(G.ruleset.economy.unrest.riotThreshold + 1);

      const { G: after, moves } = playOwnTurn(name, G);
      expect(moves).toContainEqual({ type: "growPop", tileId: "-2,1", pop: "slaves" });
      expect(moves).toContainEqual({ type: "civicCalm", payment: "influence" });
      expect(owned(after, "-2,1", "0").pops.slaves).toBe(6);
    },
  );

  it.each(names)("%s declines calm when no turn-end riot needs it", (name) => {
    const G = realm({ citizens: 0, freemen: 0, slaves: 4 });
    Object.assign(G.players["0"].resources, { food: 0, wood: 0, stone: 0, influence: 0, gold: 2 });
    expect(choose(name, G, (m) => m.type === "endTurn" || m.type === "civicCalm")).toEqual({
      type: "endTurn",
    });
  });

  /** End the turn at the riot line and list the insurance the seat buys before it rolls. */
  function insuranceBought(name: PersonalityId | "master", pops: Pops, food = 10) {
    const start = realm(pops);
    Object.assign(start.players["0"].resources, {
      food,
      wood: 0,
      stone: 0,
      gold: 6,
      influence: 6,
    });
    const ended = transition(start.definition, start, "0", { type: "endTurn" });
    if (!ended.ok || !ended.state.pendingRiot) throw new Error("the fixture does not riot");
    let G = ended.state;
    const bought: string[] = [];
    for (let action = 0; action < 4; action++) {
      const move = POLICIES[name].choose(
        projectForPlayer(G.definition, G, "0"),
        enumerateLegalCommands(G, "0"),
        createSimRng(1),
      );
      if (move.type !== "buyRiotInsurance") {
        expect(move).toEqual({ type: "resolveRiot" });
        break;
      }
      bought.push(move.optionId);
      const result = transition(G.definition, G, "0", move);
      if (!result.ok) throw new Error(result.reasons.join("; "));
      G = result.state;
    }
    return bought;
  }

  it.each(["civic", "trader", "master"] as const)(
    "%s buys riot insurance only where it saves more than it costs",
    (name) => {
      // Six slaves hold the level at −3 and nothing can burn. The bread dole's +1 saves
      // a third of a slave for 4 food, where the food is spare: 30 feeds the citizen to
      // the last year. With 10 it is not, now that the forecast keeps the gold and the
      // influence for calm, and the dole is left. Patronage's next +1 saves another
      // third for 3 influence, and the slave it saves is the one whose loss ends the
      // riots. The rule used to buy both. The only citizen is not conceded.
      const pops = { citizens: 1, freemen: 0, slaves: 6 };
      expect(insuranceBought(name, pops, 30)).toEqual(["breadDole"]);
      expect(insuranceBought(name, pops)).toEqual([]);
    },
  );

  it("the slaver concedes a citizen to save a slave", () => {
    // A citizen and a freeman weigh the same to the slaver and a slave three times as
    // much, so the demotion is the cheapest +1 on the table. The rule never took it.
    expect(insuranceBought("slaver", { citizens: 2, freemen: 0, slaves: 6 })).toEqual([
      "concession",
      "patronage",
    ]);
  });

  it.each(names)(
    "%s ends a normal turn without a forced action cap",
    (name) => {
      let forced = 0;
      const G = realm();
      const next = playTurn(G, POLICIES[name], createSimRng(1), { onForceEndTurn: () => forced++ });
      expect(next.turn).toBeGreaterThan(G.turn);
      expect(forced).toBe(0);
    },
    30000,
  );

  it("finishes a mixed personality game without illegal moves or action caps", () => {
    let caps = 0;
    // Turns a seat ended short of food while it could still pay for one.
    let shortWithMeans = 0;
    const G = runGame({
      seed: 1000,
      mode: "standard",
      policy: POLICIES.master,
      seatPolicies: {
        "0": POLICIES.slaver,
        "1": POLICIES.civic,
        "2": POLICIES.trader,
        "3": POLICIES.master,
      },
      turns: 56,
      hooks: {
        onForceEndTurn: () => caps++,
        onMove: (state, player, command) => {
          if (command.type !== "endTurn" || state.pendingHunger?.playerID !== player) return;
          const held = state.players[player].resources;
          if (
            held.gold >= getPlayerBankRate(state, player, "food").buy ||
            held.influence >= playerDole(state, player).influenceCost
          )
            shortWithMeans++;
        },
      },
    });
    expect(G.phase).toBe("gameOver");
    expect(caps).toBe(0);
    expect(shortWithMeans).toBe(0);
    if (G.gameOverReason === "deckExhausted") expect(G.year).toBe(14);
    else expect(G.gameOverReason).toBe("victoryRace");
  }, 300000);

  it("reports personality titles and final cards with finished-seat denominators", () => {
    const agg = new Aggregator();
    const G = realm({ citizens: 5, freemen: 0, slaves: 0 });
    G.players["0"].resources.gold = 35;
    G.phase = "gameOver";
    G.gameOverReason = "deckExhausted";
    G.winner = "0";
    const seats = { "0": "civic", "1": "slaver", "2": "trader", "3": "trader" };
    agg.beginGame(0, 1, G, seats);
    agg.endGame(G);
    const capped = structuredClone(G);
    capped.phase = "gameplay";
    agg.beginGame(1, 2, capped, seats);
    agg.endGame(capped);
    const report = agg.buildReport({
      games: 2,
      turns: 56,
      policy: "mixed",
      mode: "standard",
      boardLayout: "classic",
      opening: "policy",
      baseSeed: 1,
      botSeedRule: "test",
      rulesetPatch: null,
      definition: G.definition.identity,
      generatedAt: "test",
    });
    expect(report.perPolicy.civic).toMatchObject({
      finishedSeatGames: 1,
      cappedSeatGames: 1,
      wins: 1,
      winRate: 1,
      finalTitles: { "civic-elite": 1, treasurer: 1 },
    });
    expect(report.perPolicy.trader).toMatchObject({
      finishedSeatGames: 2,
      cappedSeatGames: 2,
      wins: 0,
    });
    expect(report.perPolicy.civic.finalCards.mean).toBe(report.perGame[0].finalCards["0"]);
  });
});
