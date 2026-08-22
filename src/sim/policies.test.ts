import { describe, expect, it } from "vitest";

import { enumerateLegalCommands, transition } from "../game/legalMoves";
import { RESOLUTION_CARDS } from "../game/assembly/deck";
import { PLAYER_IDS } from "../game/data";
import { projectForPlayer } from "../game/projection";
import { DEFAULT_RULESET, deriveRuleset } from "../game/ruleset";
import { LOW_NUMBER_RULESET_PATCH } from "../dev/tuningPresets";
import { scenario } from "../game/testing/scenario";
import { endTurn } from "../game/turn";
import type { HegemonyState } from "../game/types";
import {
  beamPolicy,
  evaluatePlacement,
  evaluatePolicyUnrestRisk,
  greedyPolicy,
  masterPolicy,
  POLICY_UNREST_WEIGHTS,
  politicalPolicy,
  policyEconomyThresholds,
  projectPolicyHorizon,
  settlerPolicy,
  smartPolicy,
} from "./policies";
import { createSimRng } from "./rng";
import { playTurn, runGame } from "./runner";
import { buildNewGame } from "./setup";
import { getTile } from "../game/core/query";
import { hexDistance } from "../game/map";
import { createGameDefinition } from "../game/definition";
import { getAuthoredGameContent } from "../game/content";
import { GAME_MODES } from "../game/ruleset";
import { createInitialStateFromDefinition } from "../game/state";

function observe(G: HegemonyState, player = G.currentPlayer) {
  return projectForPlayer(G.definition, G, player);
}

describe("policy denomination capabilities", () => {
  it("derives thresholds from the active ruleset while preserving standard behavior", () => {
    expect(policyEconomyThresholds(DEFAULT_RULESET)).toEqual({
      ventureGoldReserve: 25,
      sellSurplus: 40,
      lowGold: 10,
      woodStarved: 20,
      goldRich: 20,
      materialScoreDivisor: 10,
    });
    expect(
      policyEconomyThresholds(deriveRuleset(DEFAULT_RULESET, LOW_NUMBER_RULESET_PATCH)),
    ).toEqual({
      ventureGoldReserve: 10,
      sellSurplus: 18,
      lowGold: 4,
      woodStarved: 9,
      goldRich: 9,
      materialScoreDivisor: 5,
    });
  });
});

describe("rule-driven bank chains", () => {
  it("never re-enters generic search as cross-material buy/sell churn", () => {
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
    G.players[G.currentPlayer].hasCollectedGameplayIncome = true;
    G.activeLaws.push({
      cardId: "aqueduct-levy",
      author: "0",
      enactedSeason: G.season,
      order: G.lawOrder++,
    });
    Object.assign(G.players[G.currentPlayer].resources, {
      wood: 0,
      stone: 40,
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
  const risk = (happiness: number) => evaluatePolicyUnrestRisk(DEFAULT_RULESET, happiness);
  const mild = DEFAULT_RULESET.economy.unrest.popLossThreshold;
  const severe = DEFAULT_RULESET.economy.unrest.severeThreshold;

  it("classifies just above, at, and below the live mild-riot threshold", () => {
    expect(risk(mild + 1)).toEqual({ tier: "buffer", scorePenalty: 8 });
    expect(risk(mild)).toEqual({
      tier: "unrest",
      scorePenalty: POLICY_UNREST_WEIGHTS.mildRiotPenalty,
    });
    expect(risk(mild - 1)).toEqual({
      tier: "unrest",
      scorePenalty: POLICY_UNREST_WEIGHTS.mildRiotPenalty,
    });
  });

  it("classifies just above, at, and below the live severe-revolt threshold", () => {
    expect(risk(severe + 1)).toEqual({
      tier: "unrest",
      scorePenalty: POLICY_UNREST_WEIGHTS.mildRiotPenalty,
    });
    expect(risk(severe)).toMatchObject({ tier: "revolt" });
    expect(risk(severe).scorePenalty).toBeCloseTo(400 / 3);
    expect(risk(severe - 1)).toEqual(risk(severe));
  });

  it("keeps mild-event weight independent while following severe ruleset consequences", () => {
    const shifted = deriveRuleset(DEFAULT_RULESET, {
      economy: {
        unrest: {
          popLossThreshold: -3,
          severeThreshold: -7,
        },
      },
    });
    const harsher = deriveRuleset(shifted, {
      economy: {
        unrest: {
          severeRollModifier: -3,
          severePopLossMultiplier: 3,
        },
      },
    });

    expect(evaluatePolicyUnrestRisk(shifted, -3).scorePenalty).toBe(
      POLICY_UNREST_WEIGHTS.mildRiotPenalty,
    );
    expect(evaluatePolicyUnrestRisk(harsher, -3)).toEqual(evaluatePolicyUnrestRisk(shifted, -3));
    expect(evaluatePolicyUnrestRisk(harsher, -7).scorePenalty).toBeGreaterThan(
      evaluatePolicyUnrestRisk(shifted, -7).scorePenalty,
    );
  });

  it("records a transient threshold crossing even when terminal happiness recovers", () => {
    const G = projectionFixture();
    const projection = projectPolicyHorizon(G, "0", 3);

    expect(projection.resources.happiness).toBe(0);
    expect(projection.unrest).toMatchObject({
      minimumHappiness: -6,
      mildRiotEvents: 1,
      severeRiotEvents: 0,
    });
    expect(projection.unrest.riskPenalty).toBeGreaterThan(
      risk(projection.resources.happiness).scorePenalty,
    );
  });

  it("applies the configured severe rebound before projected income resumes", () => {
    const G = projectionFixture();
    G.ruleset = deriveRuleset(G.ruleset, {
      economy: { unrest: { severeRebound: 1 } },
    });
    G.players["0"].resources.happiness = severe + 1;
    G.players["0"].timedHappinessModifiers[0].amountPerTurn = -2;
    const projection = projectPolicyHorizon(G, "0", 1);

    expect(projection.unrest).toMatchObject({
      minimumHappiness: severe - 1,
      mildRiotEvents: 0,
      severeRiotEvents: 1,
    });
    expect(projection.resources.happiness).toBe(G.ruleset.economy.unrest.severeRebound + 2);
    expect(evaluatePolicyUnrestRisk(G.ruleset, severe)).toEqual(risk(severe));
  });

  it.each([
    ["smart", smartPolicy],
    ["beam", beamPolicy],
  ] as const)(
    "%s rejects an unsafe promotion but takes the supported equivalent",
    (_name, policy) => {
      expect(chooseFreemanPromotion(policy, 0).type).toBe("endTurn");
      expect(chooseFreemanPromotion(policy, 30)).toMatchObject({
        type: "promotePop",
        from: "freemen",
      });
    },
  );
});

function projectionFixture(): HegemonyState {
  const G = scenario({
    patch: {
      economy: { foodStockpileHappinessDivisor: 0 },
    },
  })
    .opening()
    .build();
  const player = G.players["0"];

  G.pendingPlayerEvent = null;
  G.pendingRiot = null;
  G.activeSeasonEvent = null;
  G.yearOmen = null;
  G.activeLaws = [];
  player.hasCollectedGameplayIncome = true;
  Object.assign(player.resources, { food: 100, happiness: -4 });
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
      settlement.buildings = index === 0 ? ["temple", "temple"] : [];
    }
  }
  player.timedHappinessModifiers = [
    {
      amountPerTurn: -2,
      turnsRemaining: 1,
      sourceCardId: "test-transient-unrest",
      sourceName: "Transient unrest",
      sourceDeck: "player",
      sourceScope: "activePlayer",
    },
  ];

  return G;
}

function chooseFreemanPromotion(policy: typeof smartPolicy | typeof beamPolicy, food: number) {
  const G = scenario({
    patch: {
      economy: {
        firstIncomeFoodGrace: false,
        foodStockpileHappinessDivisor: 0,
      },
    },
  }).build();
  const player = G.players["0"];
  const tile = G.board.tiles.find((candidate) => candidate.resource?.type === "wood");
  if (!tile) throw new Error("promotion fixture needs a wood tile");

  G.phase = "gameplay";
  G.currentPlayer = "0";
  tile.settlements.push({
    id: `settlement-${G.nextEntityId++}`,
    tileId: tile.id,
    owner: "0",
    kind: "city",
    buildings: ["gymnasion"],
    pops: { citizens: 0, freemen: 2, slaves: 0 },
  });
  player.settlements = [tile.id];
  player.hasCollectedGameplayIncome = true;
  Object.assign(player.resources, {
    wood: 0,
    stone: 0,
    gold: 2,
    food,
    influence: 0,
    happiness: 0,
  });

  const moves = enumerateLegalCommands(G, "0");
  const promotion = moves.find((move) => move.type === "promotePop" && move.from === "freemen");
  const endTurnMove = moves.find((move) => move.type === "endTurn");
  if (!promotion || !endTurnMove) {
    throw new Error("promotion fixture did not enumerate its comparison moves");
  }

  return policy.choose(observe(G), [promotion, endTurnMove], createSimRng(1));
}

/** Cycle whole turns until the agora convenes (spring of Year 2+). Unattended seats can
 *  pick up an event or riot on the way; both are dismissed exactly as the engine suites do. */
function playUntilAssembly(G: HegemonyState, limit = 40): void {
  let turns = 0;
  while (!G.assembly && G.phase === "gameplay" && turns < limit) {
    G.pendingPlayerEvent = null;
    G.pendingRiot = null;
    endTurn(G);
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
    hiddenVariant.seasonalDrawPile.reverse();
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
    const a = runGame({ seed: 17, mode: "standard", policy: masterPolicy, turns: 8 });
    const b = runGame({ seed: 17, mode: "standard", policy: masterPolicy, turns: 8 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  }, 30000);

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
  it("is deterministic across assemblies: same seed twice → byte-identical game", () => {
    const a = runGame({ seed: 21, mode: "standard", policy: politicalPolicy, turns: 60 });
    const b = runGame({ seed: 21, mode: "standard", policy: politicalPolicy, turns: 60 });
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
    const G = scenario({ seed: 11 }).opening().build();
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
    const G = scenario({ seed: 13 }).opening().build();
    playUntilAssembly(G);
    expect(G.assembly?.phase).toBe("proposal");

    const me = G.currentPlayer;
    const rivals = PLAYER_IDS.filter((playerID) => playerID !== me);
    const target = rivals[0];
    for (const rival of rivals) G.players[rival].resources.food = rival === target ? 200 : 0;
    G.assembly!.held[me] = {
      card: RESOLUTION_CARDS.find((card) => card.id === "grain-riot")!,
      draws: 1,
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

  it("plays complete turns across seeds without tripping the anti-peek assertion", () => {
    for (const seed of [1, 2, 3]) {
      const G = runGame({ seed, mode: "standard", policy: beamPolicy, turns: 5 });
      expect(["gameplay", "gameOver"]).toContain(G.phase);
    }
  }, 30000);
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

  it("seats the first metropolis on the breadbasket of the classic board", () => {
    const G = createInitialStateFromDefinition(definition, 5, "classic");
    const commands = enumerateLegalCommands(G, G.currentPlayer);
    const command = smartPolicy.choose(observe(G), commands, createSimRng(1));

    expect(command.type).toBe("placeCapital");
    const tile = getTile(G, (command as { tileId: string }).tileId)!;
    expect(tile.resource).toEqual({ type: "food", amount: 10 });
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
        expect(capital.resource?.amount ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it("is a pure function of the seed", () => {
    const build = () =>
      buildNewGame({ seed: 42, mode: "standard", opening: "policy", simRng: createSimRng(7) });

    expect(JSON.stringify(build())).toBe(JSON.stringify(build()));
  });

  it("discounts frontier a rival can also reach", () => {
    const G = createInitialStateFromDefinition(definition, 5, "classic");
    const site = getTile(G, "-2,1")!; // food 8, the second-best seat on the classic board
    const legalCapitals = G.board.tiles.filter(
      (tile) =>
        tile.terrain !== "oracle" &&
        tile.id !== site.id &&
        (tile.resource?.amount ?? 0) > 0 &&
        hexDistance(tile, site) >= 2,
    );
    const nearby = legalCapitals.filter((tile) => hexDistance(tile, site) === 2);
    const far = legalCapitals.reduce((a, b) =>
      hexDistance(b, site) > hexDistance(a, site) ? b : a,
    );
    expect(hexDistance(far, site)).toBeGreaterThanOrEqual(4);

    const pops = { citizens: 4, freemen: 0, slaves: 0 };
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
