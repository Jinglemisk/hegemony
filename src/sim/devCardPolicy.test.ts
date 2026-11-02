import { describe, expect, it } from "vitest";
import { enumerateLegalCommands, transition, type GameCommand } from "../game/legalMoves";
import { projectForPlayer } from "../game/projection";
import { mulberry32 } from "../game/core/rng";
import { happinessLevel } from "../game/happiness";
import type { RulesetPatch } from "../game/ruleset";
import { owned, scenario } from "../game/testing/scenario";
import type { DevCardId, HegemonyState } from "../game/types";
import { POLICIES, projectPolicyHorizon, type PersonalityId } from "./policies";
import { createSimRng } from "./rng";
import { runGame } from "./runner";

const names: PersonalityId[] = ["slaver", "civic", "trader"];

/** A mid-game turn for seat 0, its event card resolved: a capital and a colony. */
function midGame(patch?: RulesetPatch) {
  return scenario({ patch })
    .opening()
    .mutate((G) => {
      G.pendingPlayerEvent = null;
      G.year = 4;
    });
}

/** Seat 0's choices, each from its own projection and applied through the transition,
 *  until it would end its turn. */
function playOwnTurn(name: PersonalityId, start: HegemonyState) {
  let G = start;
  const moves: GameCommand[] = [];
  for (let action = 0; action < 30; action += 1) {
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
  return { G, moves };
}

describe("bots and the development deck", () => {
  it.each(names)(
    "%s buys and plays cards through legal commands",
    (name) => {
      // Calm, the ladder and growing once a turn, as before the per-turn caps: with three
      // of each, the slaver and the civic spend the gold on calm and promotions first.
      const G = midGame({ turnCaps: { calm: 1, ladder: 1, grow: 1 } })
        .withResources("0", { gold: 6, wood: 0, stone: 0, food: 10, influence: 0 })
        .withDevCard("0", "caravan")
        .build();
      const { moves } = playOwnTurn(name, G);
      expect(moves.filter((move) => move.type === "playDevCard")).toHaveLength(1);
      expect(moves.filter((move) => move.type === "buyDevCard")).toHaveLength(1);
    },
    30000,
  );

  it.each(names)("%s aims a rival card at the leader", (name) => {
    const G = midGame()
      .withDevCard("0", "agitators")
      .withSettlement("2", "-1,2", "city", { citizens: 3, freemen: 3, slaves: 2 })
      .withResources("2", "wealthy")
      .build();
    const keep = (move: GameCommand) => move.type === "endTurn" || move.type === "playDevCard";
    const moves = enumerateLegalCommands(G, "0").filter(keep);
    const choice = POLICIES[name].choose(
      projectForPlayer(G.definition, G, "0"),
      moves,
      createSimRng(1),
    );
    expect(choice).toMatchObject({ type: "playDevCard", target: "2" });
  });

  it("plays whole games with cards bought, drawn and played", () => {
    let bought = 0;
    let played = 0;
    runGame({
      seed: 5,
      mode: "standard",
      policy: POLICIES.trader,
      turns: 40,
      hooks: {
        onMove: (_G, _player, move) => {
          if (move.type === "buyDevCard") bought += 1;
          if (move.type === "playDevCard") played += 1;
        },
      },
    });
    expect(bought).toBeGreaterThan(0);
    expect(played).toBeGreaterThan(0);
  }, 120000);
});

/** Seat 0's riot rolled on "Revolt spreads" (two pops), holding `cards`: the pops wait for
 *  its answers. */
function riotPops(cards: DevCardId[]) {
  const build = midGame();
  for (const card of cards) build.withDevCard("0", card);
  const G = build.build();
  G.players["0"].unrestTokens = happinessLevel(G, "0") - G.ruleset.economy.unrest.riotThreshold;
  let next = transition(G.definition, G, "0", { type: "endTurn" });
  if (!next.ok) throw new Error(next.reasons.join("; "));
  const rioting = structuredClone(next.state);
  // The rng state whose next d6 is a 2.
  rioting.rng = Array.from({ length: 64 }, (_, state) => state).find(
    (state) => 1 + Math.floor(mulberry32(state).value * 6) === 2,
  )!;
  next = transition(G.definition, rioting, "0", { type: "resolveRiot" });
  if (!next.ok) throw new Error(next.reasons.join("; "));
  expect(next.state.pendingRiot?.losses?.owed).toBe(2);
  return next.state;
}

const answer = (name: PersonalityId, G: HegemonyState) =>
  POLICIES[name].choose(
    projectForPlayer(G.definition, G, "0"),
    enumerateLegalCommands(G, "0"),
    createSimRng(1),
  );

describe("bots and happiness", () => {
  it.each(names)("%s gives up a card worth nothing to keep a pop", (name) => {
    expect(answer(name, riotPops(["agitators"]))).toEqual({ type: "resolveRiotPop", pay: "card" });
  });

  it("weighs the hand's average card against the pop at its own weights", () => {
    // Settlers is a freeman: the slaver would sooner lose it than a slave, the civic and
    // the trader the other way round.
    const G = riotPops(["settlers"]);
    expect(answer("slaver", G)).toEqual({ type: "resolveRiotPop", pay: "card" });
    expect(answer("civic", G)).toEqual({ type: "resolveRiotPop", pay: "pop" });
    expect(answer("trader", G)).toEqual({ type: "resolveRiotPop", pay: "pop" });
  });

  it("forecasts a free card at each turn end at +3 or higher", () => {
    const content = (level: number, patch?: RulesetPatch) => {
      const G = scenario({ patch })
        .opening()
        .mutate((draft) => {
          draft.pendingPlayerEvent = null;
          for (const tileId of draft.players["0"].settlements)
            owned(draft, tileId, "0").pops.slaves = 0;
          owned(draft, "-2,0", "0").buildings = Array.from({ length: level }, () => "temple");
        })
        .build();
      return projectPolicyHorizon(G, "0").freeCards;
    };
    // This turn's end and each of the six the forecast plays.
    expect(content(3)).toBe(7);
    expect(content(2)).toBe(0);
    expect(content(3, { devCards: { freeCard: false } })).toBe(0);
  });
});
