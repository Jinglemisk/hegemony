import { describe, expect, it } from "vitest";
import { enumerateLegalCommands, transition, type GameCommand } from "../game/legalMoves";
import { projectForPlayer } from "../game/projection";
import { scenario } from "../game/testing/scenario";
import type { HegemonyState } from "../game/types";
import { POLICIES, type PersonalityId } from "./policies";
import { createSimRng } from "./rng";
import { runGame } from "./runner";

const names: PersonalityId[] = ["slaver", "civic", "trader"];

/** A mid-game turn for seat 0, its event card resolved: a capital and a colony. */
function midGame() {
  return scenario()
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
      const G = midGame()
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
