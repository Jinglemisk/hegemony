import { expect, it } from "vitest";
import { openAssembly } from "../game/assembly";
import { PLAYER_IDS } from "../game/data";
import { enumerateLegalCommands, transition, type GameCommand } from "../game/legalMoves";
import { projectForPlayer } from "../game/projection";
import { owned, scenario } from "../game/testing/scenario";
import { voiceHolder } from "../game/victory";
import { smartPolicy } from "./policies";
import { createSimRng } from "./rng";
import { Aggregator, snapshotsToCsv } from "./telemetry";

it("buys an affordable pivotal coalition, authors Voice and reports the seat's Assembly activity", () => {
  let G = scenario().opening().withResources("0", { influence: 2, gold: 4 }).build();
  G.pendingPlayerEvent = null;
  G.year = 6;
  G.yearOpener = "1";
  for (const id of PLAYER_IDS)
    for (const tileId of G.players[id].settlements) owned(G, tileId, id).pops.citizens = 0;
  owned(G, G.players["2"].settlements[0], "2").pops.citizens = 1;
  G.activeLaws = [{ cardId: "guild-charter", author: "0", enactedYear: 2, order: G.lawOrder++ }];
  G.politicianDecks.perdiccas = G.politicianDecks.perdiccas.filter((id) => id !== "guild-charter");
  G.politicianDecks.kleistophenes = [
    "rural-bloc",
    ...G.politicianDecks.kleistophenes.filter((id) => id !== "rural-bloc"),
  ];
  const aggregator = new Aggregator();
  aggregator.beginGame(0, 42, G);
  openAssembly(G, "0");
  const take = (player: typeof G.currentPlayer, command: GameCommand) => {
    const result = transition(G.definition, G, player, command);
    expect(result.ok, JSON.stringify(command)).toBe(true);
    if (!result.ok) throw new Error(result.reasons.join("; "));
    G = result.state;
    aggregator.onMove(G, player, command);
  };
  take("0", { type: "assemblyDraw", politician: "kleistophenes" });
  take("0", { type: "assemblyPropose" });
  for (const id of ["1", "2", "3"] as const) take(id, { type: "assemblyPass" });
  take("1", { type: "assemblyVote", yea: true });
  take("2", { type: "assemblyVote", yea: false });
  take("3", { type: "assemblyVote", yea: false });
  const choose = () =>
    smartPolicy.choose(
      projectForPlayer(G.definition, G, "0"),
      enumerateLegalCommands(G, "0"),
      createSimRng(1),
    );
  for (let purchase = 0; purchase < 2; purchase++) {
    const move = choose();
    expect(move).toEqual({ type: "assemblyBribe", payment: "gold" });
    take("0", move);
  }
  expect(choose()).toEqual({ type: "assemblyVote", yea: true });
  take("0", choose());
  expect(G.assembly!.results[0]).toMatchObject({ passed: true, yea: 4, nay: 3 });
  expect(voiceHolder(G)).toBe("0");
  aggregator.onTurnEnd(G);
  aggregator.endGame(G);
  const report = aggregator.buildReport({
    games: 1,
    turns: 56,
    policy: "smart",
    mode: "standard",
    boardLayout: "classic",
    baseSeed: 42,
    opening: "policy",
    botSeedRule: "test",
    rulesetPatch: null,
    definition: G.definition.identity,
    generatedAt: "test",
  });
  expect(report.assembly.perSeat["0"].count).toMatchObject({
    lawsProposed: 1,
    lawsPassed: 1,
    authoredLawsStanding: 2,
    votesBought: 2,
    voiceClaims: 1,
    voiceHeldTurns: 1,
  });
  expect(report.assembly.goldSpent.count).toBe(4);
  expect(snapshotsToCsv(aggregator.allSnapshots()).split("\n")[0]).toContain(
    "authoredLawsStanding,voiceHeld",
  );
});
