import { describe, expect, it } from "vitest";
import { PLAYER_IDS } from "../data";
import { collectIncome } from "../actions";
import { closeAssembly } from "../turn";
import { enumerateLegalCommands } from "../legalMoves";
import { owned, scenario } from "../testing/scenario";
import { voiceHolder } from "../victory";
import type { HegemonyState, PlayerId } from "../types";
import { getAuthoredResolutionCard } from "./deck";
import type { DirectiveCard } from "./types";
import {
  assemblyBribe,
  assemblyDiscardHeld,
  assemblyDraw,
  assemblyPass,
  assemblyPropose,
  assemblyProposeRepeal,
  assemblyVote,
  baseVoteWeight,
  enactForEval,
  lawCanBeRemoved,
  openAssembly,
  previewDirective,
  restCanTurn,
  shouldOpenAssembly,
  voteOutlook,
} from "./assembly";
import { projectForPlayer } from "../projection";

function sitting(year = 2) {
  const G = scenario().opening().withResources("0", { influence: 30 }).build();
  G.year = year;
  G.pendingPlayerEvent = null;
  G.pendingRiot = null;
  openAssembly(G, "0");
  return G;
}
function propose(G: HegemonyState, id: string, by: PlayerId = "0", target?: PlayerId) {
  const card = getAuthoredResolutionCard(id)!;
  G.politicianDecks[card.politician] = [
    id,
    ...G.politicianDecks[card.politician].filter((c) => c !== id),
  ];
  expect(assemblyDraw(G, by, card.politician).ok).toBe(true);
  expect(assemblyPropose(G, by, target).ok).toBe(true);
}
function pass(G: HegemonyState) {
  while (G.assembly!.phase === "proposal") expect(assemblyPass(G, G.currentPlayer).ok).toBe(true);
}
function vote(G: HegemonyState, yea = true) {
  while (G.assembly!.phase === "voting")
    expect(assemblyVote(G, G.currentPlayer, yea).ok).toBe(true);
}
function plant(G: HegemonyState, cardId: string, author: PlayerId = "0", enactedYear = 0) {
  G.activeLaws.push({ cardId, author, enactedYear, order: G.lawOrder++ });
}
function carry(G: HegemonyState, id: string, target: PlayerId = "1") {
  propose(G, id, "0", target);
  pass(G);
  vote(G);
}

describe("v2 Assembly", () => {
  it("meets in even years 2 to 14 and votes only on player proposals", () => {
    const G = scenario().opening().build();
    for (let year = 1; year <= 14; year++) {
      G.year = year;
      expect(shouldOpenAssembly(G)).toBe(year % 2 === 0);
    }
    const rng = G.rng;
    const decks = structuredClone(G.politicianDecks);
    openAssembly(G, "0");
    pass(G);
    expect(G.rng).toBe(rng);
    expect(G.politicianDecks).toEqual(decks);
    expect(G.assembly!.ballot).toEqual([]);
    expect(G.assembly!.phase).toBe("closing");
  });
  it("charges one 2-influence draw, permits a secret proposal, and has no redraw", () => {
    const G = sitting();
    const before = G.players["0"].resources.influence;
    expect(assemblyDraw(G, "0", "perdiccas").ok).toBe(true);
    expect(G.players["0"].resources.influence).toBe(before - 2);
    expect(assemblyDiscardHeld(G, "0").ok).toBe(true);
    expect(assemblyDraw(G, "0", "perdiccas").ok).toBe(false);
    expect(enumerateLegalCommands(G, "0").some((m) => m.type === "assemblyDraw")).toBe(false);
    expect(assemblyPass(G, "0").ok).toBe(true);
  });
  it("counts the seat and every citizen, buys two votes with either payment, and fails ties", () => {
    const G = sitting();
    propose(G, "guild-charter");
    G.players["1"].resources.influence = 2;
    propose(G, "frontier-spirit", "1");
    pass(G);
    for (const id of PLAYER_IDS)
      for (const tile of G.players[id].settlements) owned(G, tile, id).pops.citizens = 0;
    expect(baseVoteWeight(G, "0")).toBe(1);
    G.players["0"].resources.gold = 2;
    expect(assemblyBribe(G, "0", "gold").ok).toBe(true);
    expect(assemblyBribe(G, "0", "influence").ok).toBe(true);
    expect(assemblyBribe(G, "0", "influence").ok).toBe(false);
    expect(assemblyBribe(G, "1", "gold").ok).toBe(false);
    expect(assemblyVote(G, "0", true).ok).toBe(true);
    for (let i = 0; i < 3; i++) expect(assemblyVote(G, G.currentPlayer, false).ok).toBe(true);
    expect(G.assembly!.results[0]).toMatchObject({ yea: 3, nay: 3, passed: false });
    expect(G.activeLaws).toHaveLength(0);
    expect(G.assembly!.results[0].votes[0]).toMatchObject({ weight: 3, bribed: 2 });
    // Bought votes carry to the next ballot, while the sitting-wide cap remains spent.
    expect(G.assembly!.phase).toBe("voting");
    expect(assemblyBribe(G, "0", "influence").ok).toBe(false);
    vote(G);
    expect(G.assembly!.results[1].votes[0]).toMatchObject({ weight: 3, bribed: 2 });
  });
  it("replaces the oldest at four and protects tenure through the following sitting", () => {
    const G = sitting(4);
    for (const id of ["land-reform", "guild-charter", "forum-rites", "frontier-spirit"])
      plant(G, id, "1", 2);
    expect(lawCanBeRemoved(G, "land-reform")).toBe(false);
    expect(assemblyProposeRepeal(G, "0", "land-reform").ok).toBe(false);
    G.year = 6;
    carry(G, "civic-pride");
    expect(G.activeLaws.map((l) => l.cardId)).toEqual([
      "guild-charter",
      "forum-rites",
      "frontier-spirit",
      "civic-pride",
    ]);
    expect(voiceHolder(G)).toBe("1");
    expect(lawCanBeRemoved(G, "civic-pride")).toBe(false);
  });
  it("keeps one price Law, rechecks tenure between ballots and never rewards an invalid enactment", () => {
    const G = sitting(6);
    plant(G, "tenant-rights", "1", 2);
    propose(G, "sacred-fields");
    G.players["1"].resources.influence = 20;
    propose(G, "festival-calendar", "1");
    pass(G);
    vote(G);
    expect(G.activeLaws.map((l) => l.cardId)).toEqual(["sacred-fields"]);
    expect(G.assembly!.results.map((r) => r.passed)).toEqual([true, false]);
    expect(G.assemblyPassedByPlayer["0"]).toBe(1);
    expect(G.assemblyPassedByPlayer["1"]).toBe(0);
    expect(G.politicianDiscards.demosthenes).toContain("festival-calendar");
  });
  it("charges 3 influence for eligible repeal and lowers standing Voice", () => {
    const G = sitting(6);
    plant(G, "guild-charter");
    plant(G, "forum-rites");
    expect(voiceHolder(G)).toBe("0");
    expect(assemblyProposeRepeal(G, "0", "guild-charter").ok).toBe(true);
    expect(G.players["0"].resources.influence).toBe(27);
    pass(G);
    vote(G);
    expect(voiceHolder(G)).toBeNull();
  });
});

describe("What the sitting keeps secret", () => {
  it("keeps a discarded draw and a sealed repeal with their seat until the ballot is read", () => {
    const G = sitting(6);
    plant(G, "guild-charter", "1", 2);
    const card = G.politicianDecks.perdiccas[0];
    expect(assemblyDraw(G, "0", "perdiccas").ok).toBe(true);
    expect(assemblyDiscardHeld(G, "0").ok).toBe(true);
    G.players["1"].resources.influence = 3;
    expect(assemblyProposeRepeal(G, "1", "guild-charter").ok).toBe(true);

    const rival = projectForPlayer(G.definition, structuredClone(G), "2").state;
    expect(rival.politicianDiscards.perdiccas).not.toContain(card);
    expect(rival.assembly!.setAside["0"]).toBeNull();
    expect(rival.assembly!.proposals["1"]).toBeNull();
    expect(JSON.stringify(rival.log)).not.toContain("Guild Charter");
    expect(
      projectForPlayer(G.definition, structuredClone(G), "0").state.assembly!.setAside["0"],
    ).toBe(card);

    pass(G);
    expect(G.assembly!.phase).toBe("voting");
    const read = projectForPlayer(G.definition, structuredClone(G), "2").state;
    expect(read.politicianDiscards.perdiccas).toContain(card);
    expect(read.assembly!.ballot).toEqual([
      { kind: "repeal", cardId: "guild-charter", proposer: "1" },
    ]);
  });
});

describe("The vote as the seats read it", () => {
  it("counts the tally, the caster and each seat still to cast at most", () => {
    const G = sitting();
    propose(G, "guild-charter");
    pass(G);
    for (const id of PLAYER_IDS)
      for (const tile of G.players[id].settlements) owned(G, tile, id).pops.citizens = 0;
    G.players["1"].resources = { ...G.players["1"].resources, gold: 2, influence: 0 };
    expect(assemblyVote(G, "0", true).ok).toBe(true);
    const outlook = voteOutlook(G)!;
    expect(outlook).toMatchObject({
      yea: 1,
      nay: 0,
      caster: { playerID: "1", weight: 1, most: 2 },
    });
    expect(outlook.rest.map((seat) => seat.playerID)).toEqual(["2", "3"]);
    // A tie fails: at 2 to 1 a single uncast vote can still sink it, at 3 to 1 it cannot.
    expect(restCanTurn(2, 1, 1)).toBe(true);
    expect(restCanTurn(3, 1, 1)).toBe(false);
    expect(restCanTurn(1, 1, 1)).toBe(true);
    expect(restCanTurn(1, 2, 1)).toBe(false);
  });
  it("previews a Directive on a copy of the board", () => {
    const G = sitting();
    G.players["1"].resources.food = 5;
    const after = previewDirective(
      G,
      getAuthoredResolutionCard("grain-riot") as DirectiveCard,
      "1",
    );
    expect(after.players["1"].resources.food).toBe(2);
    expect(G.players["1"].resources.food).toBe(5);
  });
});

describe("Directives", () => {
  it("Grain Riot takes 3 food only from its target and floors at zero", () => {
    const G = sitting();
    G.players["1"].resources.food = 2;
    const other = G.players["2"].resources.food;
    const gold = G.players["0"].resources.gold;
    carry(G, "grain-riot");
    expect(G.players["1"].resources.food).toBe(0);
    expect(G.players["2"].resources.food).toBe(other);
    expect(G.tallyMonuments).toHaveLength(1);
    expect(voiceHolder(G)).toBeNull();
    expect(G.players["0"].resources.gold).toBe(gold + 2);
  });
  it("The Streets Burn places one token on the named rival", () => {
    const G = sitting();
    const before = G.players["1"].unrestTokens;
    carry(G, "the-streets-burn");
    expect(G.players["1"].unrestTokens).toBe(before + 1);
  });
  it("General Strike suppresses one income collection for its chosen rival", () => {
    const G = sitting();
    carry(G, "general-strike");
    G.players["1"].collectedThisTurn = false;
    G.pendingPlayerEvent = null;
    const before = G.players["1"].resources.gold;
    expect(collectIncome(G, "1").ok).toBe(true);
    expect(G.players["1"].resources.gold).toBe(before);
    expect(G.players["1"].incomeSuppressedTurns).toBe(0);
  });
  it("The Mob Rises takes a pop from the rival's largest settlement", () => {
    const G = sitting();
    const large = owned(G, G.players["1"].settlements[0], "1");
    large.pops = { citizens: 1, freemen: 1, slaves: 2 };
    carry(G, "the-mob-rises");
    expect(large.pops).toEqual({ citizens: 1, freemen: 1, slaves: 1 });
  });
  it("The Stele Is Broken removes the newest authored Law only after tenure", () => {
    const G = sitting(6);
    plant(G, "guild-charter", "1", 2);
    plant(G, "forum-rites", "1", 4);
    enactForEval(G, {
      kind: "enact",
      card: getAuthoredResolutionCard("the-stele-is-broken")!,
      proposer: "0",
      target: "1",
    });
    expect(G.activeLaws).toHaveLength(2);
    G.year = 8;
    carry(G, "the-stele-is-broken");
    expect(G.activeLaws.map((l) => l.cardId)).toEqual(["guild-charter"]);
  });
  it("Isonomia fixes the next sitting's base vote at one and then expires", () => {
    const G = sitting();
    carry(G, "isonomia", "1");
    expect(G.pendingIsonomiaTarget).toBe("1");
    expect(G.assembly!.isonomiaTarget).toBeNull();
    closeAssembly(G);
    G.assembly = null;
    G.year = 4;
    openAssembly(G, "0");
    expect(baseVoteWeight(G, "1")).toBe(1);
    expect(G.pendingIsonomiaTarget).toBeNull();
    G.assembly = null;
    G.year = 6;
    openAssembly(G, "0");
    expect(baseVoteWeight(G, "1")).toBeGreaterThan(1);
  });
});
