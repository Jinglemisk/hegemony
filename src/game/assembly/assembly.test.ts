import { describe, expect, it } from "vitest";

import { PLAYER_IDS } from "../data";
import { yearOf } from "../core/calendar";
import { collectIncome } from "../actions";
import { owned, scenario, tile } from "../testing/scenario";
import { closeAssembly, endTurn } from "../turn";
import type { HegemonyState, PlayerId } from "../types";
import {
  assemblyBribe,
  assemblyDiscardHeld,
  assemblyDraw,
  assemblyPass,
  assemblyPropose,
  assemblyProposeRepeal,
  assemblyVeto,
  assemblyVote,
  baseVoteWeight,
  currentVoteWeight,
  nextDrawCost,
  openAssembly
} from "./assembly";
import { getResolutionCard } from "./deck";
import { authoredSteleCount, politicianStandings } from "./power";

/**
 * The Assembly's cadence and flow (design §1.1–§1.5).
 *
 * The agora is not a screen a player opens: it is engine state that SUSPENDS the turn
 * machine between the season roll and the opener's turn. So most of this suite drives
 * the real turn loop to reach it, and then drives the real proposal / ballot verbs —
 * the only pokes are the ones that make a random draw deterministic.
 */

/** Cycle whole turns until the agora convenes. An unattended seat can pick up a player
 *  event or a riot on the way; both are dismissed exactly as victory.test.ts does. */
function playUntilAssembly(G: HegemonyState, limit = 40): number {
  let turns = 0;

  while (!G.assembly && G.phase === "gameplay" && turns < limit) {
    G.pendingPlayerEvent = null;
    G.pendingRiot = null;
    endTurn(G);
    turns += 1;
  }

  return turns;
}

/** Zero the seat's citizens everywhere, then seat `count` in their first settlement —
 *  vote weight is citizens, so the ballot tests need them exact. */
function setCitizens(G: HegemonyState, playerID: PlayerId, count: number) {
  for (const tileId of G.players[playerID].settlements) {
    owned(G, tileId, playerID).pops.citizens = 0;
  }

  owned(G, G.players[playerID].settlements[0], playerID).pops.citizens = count;
}

/**
 * The agora at the moment it convenes. Two normalisations: the random house resolution
 * is lifted off the bema so each test owns the ballot outright, and every seat is
 * seated with exactly one citizen — a year of unattended turns can starve a seat's
 * citizens away, and a house where nobody can vote passes nothing.
 */
function atAssembly(options?: Parameters<typeof scenario>[0]): HegemonyState {
  const G = scenario(options).opening().build();
  playUntilAssembly(G);

  if (!G.assembly) {
    throw new Error("the assembly never convened");
  }

  // Clear the house card so each test owns the bema outright (the async proposal keeps
  // it on `houseItem`, not the — still empty — `ballot`).
  G.assembly.houseItem = null;

  for (const playerID of PLAYER_IDS) {
    setCitizens(G, playerID, 1);
  }

  return G;
}

/** Put a known card on top of its politician's deck so a fish is deterministic. */
function stackResolution(G: HegemonyState, cardId: string) {
  const card = getResolutionCard(cardId)!;
  const deck = G.politicianDecks[card.politician];
  const at = deck.indexOf(cardId);

  if (at >= 0) {
    deck.splice(at, 1);
  }

  deck.unshift(cardId);
}

/** A seat fishes the named card out and seals it as its proposal. Proposal is async, so
 *  the seat is explicit — it defaults to player 0, which the author assertions expect. */
function proposeCard(G: HegemonyState, cardId: string, replaces?: string, by: PlayerId = "0") {
  stackResolution(G, cardId);
  G.players[by].resources.influence += G.ruleset.assembly.drawCost;

  expect(assemblyDraw(G, by, getResolutionCard(cardId)!.politician).ok).toBe(true);

  return { proposer: by, result: assemblyPropose(G, by, replaces) };
}

/** Every still-undecided seat holds its peace. `activePlayer` parks on the first
 *  undecided seat, so passing it repeatedly walks the whole round to a close. */
function passRemainingSeats(G: HegemonyState) {
  while (G.assembly!.phase === "proposal") {
    expect(assemblyPass(G, G.assembly!.activePlayer).ok).toBe(true);
  }
}

function voteEverything(G: HegemonyState, yea: boolean) {
  while (G.assembly!.phase === "voting") {
    expect(assemblyVote(G, G.assembly!.activePlayer, yea).ok).toBe(true);
  }
}

/** Seal a proposal, let the rest hold their peace, then carry it. */
function carryResolution(G: HegemonyState, cardId: string, replaces?: string, by: PlayerId = "0"): PlayerId {
  const { proposer, result } = proposeCard(G, cardId, replaces, by);
  expect(result.ok).toBe(true);
  passRemainingSeats(G);
  voteEverything(G, true);
  return proposer;
}

function plantLaw(G: HegemonyState, cardId: string, author: PlayerId | null = "0") {
  G.activeLaws.push({ cardId, author, enactedSeason: G.season, order: G.lawOrder++ });
}

const SIX_LAWS = [
  "land-reform",
  "sacred-fields",
  "festival-calendar",
  "public-works",
  "forum-rites",
  "homestead-act"
];

describe("cadence: the Assembly sits each spring from the ruleset's first year", () => {
  it("holds no assembly at all through Year 1", () => {
    const G = scenario().opening().build();

    for (let turn = 0; turn < 15; turn += 1) {
      G.pendingPlayerEvent = null;
      G.pendingRiot = null;
      expect(endTurn(G).ok, `turn ${turn}`).toBe(true);
      expect(G.assembly, `turn ${turn}`).toBeNull();
    }

    expect(yearOf(G.season)).toBe(1);
    expect(G.assembliesHeld).toBe(0);
  });

  it("convenes in the spring of Year 2, with a house resolution already on the bema", () => {
    const G = scenario().opening().build();
    expect(playUntilAssembly(G)).toBe(16);

    expect(G.season).toBe(5);
    expect(yearOf(G.season)).toBe(2);
    expect(G.assembly?.year).toBe(2);
    expect(G.assembly?.phase).toBe("proposal");
    expect(G.assembliesHeld).toBe(1);
    // Something is always on the bema, so an assembly where every seat passes still
    // has something to argue about. It rides `houseItem` until the vote assembles the
    // ballot, so no player proposal is revealed early.
    expect(G.assembly?.houseItem).not.toBeNull();
    expect(G.assembly?.houseItem?.kind).toBe("enact");
    expect(G.assembly?.ballot).toHaveLength(0);
  });

  it("ends the turn successfully but does NOT open the opener's turn while the agora sits", () => {
    const G = scenario().opening().build();
    playUntilAssembly(G, 15);
    G.pendingPlayerEvent = null;
    G.pendingRiot = null;
    const turnBefore = G.turn;

    expect(endTurn(G).ok).toBe(true);

    expect(G.assembly).not.toBeNull();
    // The season rolled and the opener rotated, but nobody has taken a turn. Proposal
    // is async, so `currentPlayer` just parks on the first undecided seat (the new
    // opener) for a headless driver; the UI lets any seat act.
    expect(G.seasonOpener).toBe("1");
    expect(G.assembly?.resumePlayer).toBe("1");
    expect(G.currentPlayer).toBe("1");
    expect(G.turn).toBe(turnBefore);
    // ...and the turn machine stays suspended: endTurn is refused outright.
    expect(endTurn(G).ok).toBe(false);
  });

  it("hands play back to the seat it interrupted when it closes", () => {
    const G = atAssembly();
    // Nothing is on the bema, so the house rises without a vote.
    passRemainingSeats(G);
    expect(G.assembly?.phase).toBe("closing");
    const turnBefore = G.turn;

    expect(closeAssembly(G).ok).toBe(true);

    expect(G.assembly).toBeNull();
    expect(G.currentPlayer).toBe("1");
    expect(G.turn).toBe(turnBefore + 1);
  });

  it("convenes again the following spring, behind the rotated opener", () => {
    const G = atAssembly();
    passRemainingSeats(G);
    expect(closeAssembly(G).ok).toBe(true);

    playUntilAssembly(G);

    expect(G.phase).toBe("gameplay");
    expect(G.season).toBe(9); // spring of Year 3
    expect(G.assembliesHeld).toBe(2);
    // The year turned, so the opener turned with it — and the agora runs off the new one.
    expect(G.seasonOpener).toBe("2");
    expect(G.assembly?.resumePlayer).toBe("2");
    // The vote runs in turn order from the new opener.
    expect(G.assembly?.voteOrder).toEqual(["2", "3", "0", "1"]);
  });

  it("is disabled outright by firstYear: 0", () => {
    const G = scenario({ patch: { assembly: { firstYear: 0 } } }).opening().build();

    for (let turn = 0; turn < 24 && G.phase === "gameplay"; turn += 1) {
      G.pendingPlayerEvent = null;
      G.pendingRiot = null;
      endTurn(G);
      expect(G.assembly, `turn ${turn}`).toBeNull();
    }

    // Well past spring of Year 2, when the agora would otherwise have convened.
    expect(G.season).toBeGreaterThan(5);
    expect(G.assembliesHeld).toBe(0);
  });
});

describe("the proposal round", () => {
  it("is asynchronous — any undecided seat may act, in any order", () => {
    const G = atAssembly();

    // Year 2's opener is player 1, so the vote runs 1→2→3→0. Proposal has no order at
    // all — currentPlayer only parks on the first undecided seat for a headless driver.
    expect(G.assembly?.voteOrder).toEqual(["1", "2", "3", "0"]);
    expect(G.assembly?.activePlayer).toBe("1");
    expect(G.assembly?.proposalDone).toEqual({ "0": false, "1": false, "2": false, "3": false });

    // A seat other than the parked one may act right away, and finalizes only itself.
    expect(assemblyPass(G, "2").ok).toBe(true);
    expect(G.assembly?.proposalDone["2"]).toBe(true);
    expect(G.assembly?.proposalDone["1"]).toBe(false);
    // A finalized seat cannot act again.
    expect(assemblyPass(G, "2").ok).toBe(false);
    // currentPlayer still parks on the first undecided seat (the opener).
    expect(G.assembly?.activePlayer).toBe("1");
  });

  it("charges the draw cost, then the redraw price for every fish after it — per seat", () => {
    const G = atAssembly({ patch: { assembly: { drawCost: 2, redrawCost: 5 } } });
    const proposer: PlayerId = "2";
    G.players[proposer].resources.influence = 20;

    expect(nextDrawCost(G, proposer)).toBe(2);
    expect(assemblyDraw(G, proposer, "demosthenes").ok).toBe(true);
    expect(G.players[proposer].resources.influence).toBe(18);

    // Throwing the fish back is free; the price is what the NEXT one costs.
    expect(assemblyDiscardHeld(G, proposer).ok).toBe(true);
    expect(nextDrawCost(G, proposer)).toBe(5);
    // Another seat's fishing count is independent — this is the opener's first draw.
    expect(nextDrawCost(G, "1")).toBe(2);
    expect(assemblyDraw(G, proposer, "demosthenes").ok).toBe(true);
    expect(G.players[proposer].resources.influence).toBe(13);
  });

  it("refuses a fish the seat cannot pay for", () => {
    const G = atAssembly();
    const proposer: PlayerId = "1";
    G.players[proposer].resources.influence = G.ruleset.assembly.drawCost - 1;

    expect(assemblyDraw(G, proposer, "demosthenes").ok).toBe(false);
  });

  it("holds the drawn card until it is discarded or proposed, and one at a time", () => {
    const G = atAssembly();
    const proposer: PlayerId = "1";
    G.players[proposer].resources.influence = 20;
    stackResolution(G, "land-reform");

    expect(assemblyDraw(G, proposer, "demosthenes").ok).toBe(true);
    expect(G.assembly?.held[proposer]?.card.id).toBe("land-reform");
    // Fishing again while holding is refused — a seat looks at one card at a time.
    expect(assemblyDraw(G, proposer, "demosthenes").ok).toBe(false);

    expect(assemblyDiscardHeld(G, proposer).ok).toBe(true);
    expect(G.assembly?.held[proposer]).toBeNull();
    // A discarded fish goes back to its politician's pile — four seats fishing for
    // seven years would otherwise strip the agora bare.
    expect(G.politicianDiscards.demosthenes).toContain("land-reform");

    stackResolution(G, "land-reform");
    expect(assemblyDraw(G, proposer, "demosthenes").ok).toBe(true);
    expect(assemblyPropose(G, proposer).ok).toBe(true);
    // The sealed proposal is secret on the seat's own slot until the vote assembles it.
    expect(G.assembly?.proposals[proposer]?.kind).toBe("enact");
    expect(G.assembly?.held[proposer]).toBeNull();
    expect(G.assembly?.proposalDone[proposer]).toBe(true);
  });

  it("lets a penniless seat hold their peace — passing is always legal", () => {
    const G = atAssembly();
    const proposer: PlayerId = "1";
    G.players[proposer].resources.influence = 0;

    expect(assemblyDraw(G, proposer, "demosthenes").ok).toBe(false);
    expect(assemblyPass(G, proposer).ok).toBe(true);
  });

  it("gives each seat exactly one proposal", () => {
    const G = atAssembly();
    const { proposer } = proposeCard(G, "land-reform");

    // Their say is spent: they can neither fish nor speak again this assembly.
    expect(G.assembly?.proposalDone[proposer]).toBe(true);
    expect(assemblyDraw(G, proposer, "demosthenes").ok).toBe(false);
    expect(assemblyPropose(G, proposer).ok).toBe(false);
    expect(assemblyPass(G, proposer).ok).toBe(false);
  });

  it("refuses to re-propose a Law that already stands", () => {
    const G = atAssembly();
    plantLaw(G, "land-reform");

    const { proposer } = proposeCard(G, "land-reform");
    expect(G.assembly?.held[proposer]?.card.id).toBe("land-reform");
    expect(assemblyPropose(G, proposer).ok).toBe(false);
  });

  it("seals a repeal for the repeal price, spending the seat's proposal", () => {
    const G = atAssembly();
    plantLaw(G, "land-reform", "3");
    const proposer: PlayerId = "1";
    G.players[proposer].resources.influence = G.ruleset.assembly.repealCost;

    expect(assemblyProposeRepeal(G, proposer, "sacred-fields").ok).toBe(false); // not standing
    expect(assemblyProposeRepeal(G, proposer, "land-reform").ok).toBe(true);

    expect(G.players[proposer].resources.influence).toBe(0);
    expect(G.assembly?.proposals[proposer]).toEqual({ kind: "repeal", cardId: "land-reform", proposer });
    expect(G.assembly?.proposalDone[proposer]).toBe(true);
  });

  it("rises without a vote when nothing was laid before the house", () => {
    const G = atAssembly();
    passRemainingSeats(G);

    expect(G.assembly?.phase).toBe("closing");
    expect(G.assembly?.results).toHaveLength(0);
  });
});

describe("the ballot", () => {
  it("votes one item at a time, in turn order", () => {
    const G = atAssembly();
    proposeCard(G, "land-reform");
    passRemainingSeats(G);

    expect(G.assembly?.phase).toBe("voting");
    expect(G.assembly?.activePlayer).toBe("1");
    // Voting out of turn is refused: every vote lands openly, in order, so the last
    // voter is a kingmaker on a close card.
    expect(assemblyVote(G, "2", true).ok).toBe(false);
    expect(assemblyVote(G, "1", true).ok).toBe(true);
    expect(G.assembly?.activePlayer).toBe("2");
  });

  it("weighs a vote in citizens", () => {
    const G = atAssembly();
    setCitizens(G, "1", 3);
    setCitizens(G, "2", 0);
    proposeCard(G, "land-reform");
    passRemainingSeats(G);

    expect(baseVoteWeight(G, "1")).toBe(3);
    expect(baseVoteWeight(G, "2")).toBe(0);

    expect(assemblyVote(G, "1", true).ok).toBe(true);
    expect(G.assembly?.votes[0]).toMatchObject({ playerID: "1", yea: true, weight: 3, bribed: 0 });
  });

  it("fails a tie by default", () => {
    const G = atAssembly();
    proposeCard(G, "land-reform");
    passRemainingSeats(G);

    // One citizen apiece, voting 1→2→3→0: two for, two against.
    expect(assemblyVote(G, "1", true).ok).toBe(true);
    expect(assemblyVote(G, "2", true).ok).toBe(true);
    expect(assemblyVote(G, "3", false).ok).toBe(true);
    expect(assemblyVote(G, "0", false).ok).toBe(true);

    const result = G.assembly!.results[0];
    expect(result).toMatchObject({ yea: 2, nay: 2, passed: false });
    expect(G.activeLaws).toHaveLength(0);
  });

  it("carries a tie when the ruleset says ties pass", () => {
    const G = atAssembly({ patch: { assembly: { tiesPass: true } } });
    proposeCard(G, "land-reform");
    passRemainingSeats(G);

    expect(assemblyVote(G, "1", true).ok).toBe(true);
    expect(assemblyVote(G, "2", true).ok).toBe(true);
    expect(assemblyVote(G, "3", false).ok).toBe(true);
    expect(assemblyVote(G, "0", false).ok).toBe(true);

    expect(G.assembly?.results[0]).toMatchObject({ yea: 2, nay: 2, passed: true });
    expect(G.activeLaws.map((law) => law.cardId)).toEqual(["land-reform"]);
  });

  it("stands a passed Law in the agora under its proposer's name", () => {
    const G = atAssembly();
    const author = carryResolution(G, "land-reform");

    expect(author).toBe("0");
    expect(G.activeLaws).toHaveLength(1);
    expect(G.activeLaws[0]).toMatchObject({ cardId: "land-reform", author: "0", enactedSeason: 5 });
    // The stele is immediately the politician's power and the author's patronage.
    const demosthenes = politicianStandings(G).find((s) => s.politician.id === "demosthenes");
    expect(demosthenes).toMatchObject({ power: 1, patron: "0" });
  });

  it("sells votes up to the per-assembly cap, and only on your own turn to cast", () => {
    const G = atAssembly();
    const rules = G.ruleset.assembly;
    proposeCard(G, "land-reform");
    passRemainingSeats(G);
    G.players["1"].resources.influence = rules.briberyCost * (rules.briberyCap + 1);

    // The cap is what stops a hoard from simply becoming votes at scale.
    for (let bought = 0; bought < rules.briberyCap; bought += 1) {
      expect(assemblyBribe(G, "1").ok, `bribe ${bought}`).toBe(true);
    }
    expect(assemblyBribe(G, "1").ok).toBe(false);
    expect(assemblyBribe(G, "2").ok).toBe(false); // not their turn to cast

    expect(currentVoteWeight(G, "1")).toBe(1 + rules.briberyCap);
    expect(assemblyVote(G, "1", true).ok).toBe(true);
    expect(G.assembly?.votes[0]).toMatchObject({ weight: 1 + rules.briberyCap, bribed: rules.briberyCap });
  });

  it("lets one veto strike the resolution outright, at the cost of the vetoer's own vote", () => {
    const G = atAssembly();
    proposeCard(G, "land-reform");
    passRemainingSeats(G);
    G.players["1"].resources.influence = G.ruleset.assembly.vetoCost * 2;

    expect(assemblyVeto(G, "1").ok).toBe(true);

    const result = G.assembly!.results[0];
    expect(result).toMatchObject({ passed: false, vetoedBy: "1" });
    // A walkout, not a free extra lever: nobody else even got to cast.
    expect(result.votes).toHaveLength(0);
    expect(G.activeLaws).toHaveLength(0);
    expect(G.assembly?.phase).toBe("closing");
  });

  it("returns a voted-down card to its politician's discard pile", () => {
    const G = atAssembly();
    proposeCard(G, "land-reform");
    passRemainingSeats(G);
    voteEverything(G, false);

    expect(G.activeLaws).toHaveLength(0);
    expect(G.politicianDiscards.demosthenes).toContain("land-reform");
    expect(G.assembly?.results[0]).toMatchObject({ passed: false, yea: 0, nay: 4 });
  });

  it("strikes a standing Law when a repeal carries, returning it to the pile", () => {
    const G = atAssembly();
    plantLaw(G, "land-reform", "3");
    const proposer = G.assembly!.activePlayer;
    G.players[proposer].resources.influence = G.ruleset.assembly.repealCost;

    expect(assemblyProposeRepeal(G, proposer, "land-reform").ok).toBe(true);
    passRemainingSeats(G);
    voteEverything(G, true);

    expect(G.activeLaws).toHaveLength(0);
    expect(G.politicianDiscards.demosthenes).toContain("land-reform");
  });
});

describe("the Law cap", () => {
  it("refuses a new Law until the proposal names one to tear down", () => {
    const G = atAssembly();
    for (const cardId of SIX_LAWS) {
      plantLaw(G, cardId, "3");
    }

    expect(G.activeLaws).toHaveLength(G.ruleset.assembly.lawCap);

    const { proposer, result } = proposeCard(G, "civic-pride");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reasons[0]).toContain("board is full");
    // Naming a Law that is not standing is no better than naming none.
    expect(assemblyPropose(G, proposer, "colonial-charter").ok).toBe(false);
    expect(assemblyPropose(G, proposer, "land-reform").ok).toBe(true);
  });

  it("actually removes the replaced Law when the replacement carries", () => {
    const G = atAssembly();
    for (const cardId of SIX_LAWS) {
      plantLaw(G, cardId, "3");
    }

    carryResolution(G, "civic-pride", "land-reform");

    expect(G.activeLaws).toHaveLength(6);
    expect(G.activeLaws.map((law) => law.cardId)).toContain("civic-pride");
    expect(G.activeLaws.map((law) => law.cardId)).not.toContain("land-reform");
    expect(G.politicianDiscards.demosthenes).toContain("land-reform");
  });
});

describe("Directives: one-time, table-wide, and they never name a target", () => {
  it("Grain Riot halves every player's stored food", () => {
    const G = atAssembly();
    G.players["0"].resources.food = 10;
    G.players["1"].resources.food = 7;
    G.players["2"].resources.food = 0;
    G.players["3"].resources.food = 21;

    carryResolution(G, "grain-riot");

    // Rounded in the mob's favour: it takes floor(half) and leaves the remainder.
    expect(G.players["0"].resources.food).toBe(5);
    expect(G.players["1"].resources.food).toBe(4);
    expect(G.players["2"].resources.food).toBe(0);
    expect(G.players["3"].resources.food).toBe(11);
  });

  it("The Streets Burn takes 3 happiness from the whole table, into the negative", () => {
    const G = atAssembly();
    const before = PLAYER_IDS.map((playerID) => G.players[playerID].resources.happiness);
    G.players["1"].resources.happiness = 1;

    carryResolution(G, "the-streets-burn");

    expect(G.players["1"].resources.happiness).toBe(-2);
    expect(G.players["0"].resources.happiness).toBe(before[0] - 3);
    expect(G.players["3"].resources.happiness).toBe(before[3] - 3);
  });

  it("General Strike suppresses one income collection for everyone", () => {
    const G = atAssembly();

    carryResolution(G, "general-strike");

    for (const playerID of PLAYER_IDS) {
      expect(G.players[playerID].incomeSuppressedTurns, playerID).toBe(1);
    }

    // The strike costs the income, not the tempo: the turn still opens and passes.
    G.players["1"].resources.happiness = 5; // keep the upkeep from starting a riot
    const gold = G.players["1"].resources.gold;
    expect(closeAssembly(G).ok).toBe(true);

    expect(G.currentPlayer).toBe("1");
    expect(G.players["1"].resources.gold).toBe(gold);
    expect(G.players["1"].collectedThisTurn).toBe(true);
    expect(G.players["1"].incomeSuppressedTurns).toBe(0);

    // ...and the next collection is normal again.
    G.players["1"].collectedThisTurn = false;
    G.pendingPlayerEvent = null;
    expect(collectIncome(G, "1").ok).toBe(true);
    expect(G.players["1"].resources.gold).toBeGreaterThan(gold);
  });

  it("The Mob Rises takes a pop from every player's largest settlement, lowest rung first", () => {
    const G = atAssembly();
    // Player 0's metropolis is the bigger holding, and it has a slave to give up.
    G.players["0"].settlements.forEach((tileId) => {
      owned(G, tileId, "0").pops = { citizens: 0, freemen: 0, slaves: 0 };
    });
    owned(G, "-2,0", "0").pops = { citizens: 1, freemen: 1, slaves: 2 };
    owned(G, "3,0", "0").pops = { citizens: 0, freemen: 1, slaves: 0 };

    carryResolution(G, "the-mob-rises");

    expect(owned(G, "-2,0", "0").pops).toEqual({ citizens: 1, freemen: 1, slaves: 1 });
    expect(owned(G, "3,0", "0").pops.freemen).toBe(1);

    for (const playerID of PLAYER_IDS) {
      expect(G.players[playerID].popsLostToUnrest, playerID).toBeGreaterThanOrEqual(1);
    }
  });

  it("Bread and Circuses pays 3 happiness and takes 5 gold, clamped at an empty purse", () => {
    const G = atAssembly();
    const happiness = G.players["0"].resources.happiness;
    G.players["0"].resources.gold = 12;
    G.players["1"].resources.gold = 2;

    carryResolution(G, "bread-and-circuses");

    expect(G.players["0"].resources.happiness).toBe(happiness + 3);
    expect(G.players["0"].resources.gold).toBe(7);
    // A stock clamps at zero — the populist giveaway never puts a polis in debt.
    expect(G.players["1"].resources.gold).toBe(0);
  });

  it("The Stele Is Broken throws down the most recently enacted Law", () => {
    const G = atAssembly();
    plantLaw(G, "land-reform", "3");
    plantLaw(G, "public-works", "3"); // enacted later — the higher `order`

    carryResolution(G, "the-stele-is-broken");

    expect(G.activeLaws.map((law) => law.cardId)).toEqual(["land-reform"]);
    expect(G.politicianDiscards.perdiccas).toContain("public-works");
  });

  it("The Stele Is Broken is a legal no-op when the agora is empty", () => {
    const G = atAssembly();

    carryResolution(G, "the-stele-is-broken");

    expect(G.activeLaws).toHaveLength(0);
    expect(G.tallyMonuments).toHaveLength(1);
    expect(G.log.some((entry) => entry.message.includes("no stele left standing"))).toBe(true);
  });

  it("Isonomia flattens every voice at the NEXT assembly, then is spent", () => {
    const G = atAssembly();
    setCitizens(G, "3", 4);

    carryResolution(G, "isonomia");

    // It changes nothing about the assembly that passed it.
    expect(G.assembly?.equalVotes).toBe(false);
    expect(baseVoteWeight(G, "3")).toBe(4);
    expect(G.pendingIsonomia).toBe(true);

    // A whole year later, the legacy lands on the assembly it was aimed at.
    expect(closeAssembly(G).ok).toBe(true);
    playUntilAssembly(G);

    expect(G.assembly?.equalVotes).toBe(true);
    expect(baseVoteWeight(G, "3")).toBe(1);
    // The demos got its equal vote exactly once.
    expect(G.pendingIsonomia).toBe(false);

    // ...and the assembly after that weighs citizens again.
    passRemainingSeats(G);
    voteEverything(G, false);
    expect(closeAssembly(G).ok).toBe(true);
    playUntilAssembly(G);
    expect(G.assembly?.equalVotes).toBe(false);
  });

  it("plants a permanent tally monument that costs no Law-cap slot", () => {
    const G = atAssembly();
    for (const cardId of SIX_LAWS) {
      plantLaw(G, cardId, "3");
    }

    // At the cap, and yet a Directive needs no `replaces` at all — a monument is
    // momentum, not a rule.
    carryResolution(G, "the-streets-burn");

    expect(G.activeLaws).toHaveLength(6);
    expect(G.tallyMonuments).toHaveLength(1);
    expect(G.tallyMonuments[0]).toMatchObject({ cardId: "the-streets-burn", author: "0" });
    expect(politicianStandings(G).find((s) => s.politician.id === "stratokles")).toMatchObject({
      power: 1,
      patron: "0"
    });
    // The card itself goes back to the pile: the monument is the record, not the card.
    expect(G.politicianDiscards.stratokles).toContain("the-streets-burn");
  });

  it("does nothing at all when it is voted down", () => {
    const G = atAssembly();
    G.players["0"].resources.food = 10;

    proposeCard(G, "grain-riot");
    passRemainingSeats(G);
    voteEverything(G, false);

    expect(G.players["0"].resources.food).toBe(10);
    expect(G.tallyMonuments).toHaveLength(0);
    expect(G.politicianDiscards.stratokles).toContain("grain-riot");
  });
});

describe("the house resolution", () => {
  /** Re-convene with every deck rigged, so the random house draw is a known card. */
  function reopenWithHouseCard(G: HegemonyState, cardId: string) {
    G.assembly = null;

    for (const politician of ["demosthenes", "perdiccas", "kleistophenes", "stratokles"] as const) {
      G.politicianDecks[politician].unshift(cardId);
    }

    openAssembly(G, "1");
  }

  it("plants an UNAUTHORED stele — nobody gains patronage from it", () => {
    // The house card is the one resolution no seat proposed, so it belongs to no seat.
    // It lends its politician power (the stele is standing) but hands nobody patronage:
    // crediting it to the season opener would pay them free Voice-card progress — and,
    // for a house Directive, free progress on Stratokles's coup clock — for doing
    // nothing at all.
    const G = atAssembly();
    reopenWithHouseCard(G, "land-reform");
    expect(G.assembly!.houseItem?.proposer).toBeNull();

    passRemainingSeats(G);
    voteEverything(G, true);

    expect(G.activeLaws[0]).toMatchObject({ cardId: "land-reform", author: null });

    const demosthenes = politicianStandings(G).find((s) => s.politician.id === "demosthenes")!;
    expect(demosthenes.power).toBe(1);
    expect(demosthenes.patron).toBeNull();
    expect(authoredSteleCount(G, "1")).toBe(0);
  });

  // Design §1.3: "Passed Laws plant a stele on the board (respecting the cap /
  // replace-at-cap)". The house card clears the same gate a proposed one does — at the
  // cap it names the OLDEST standing Law as its casualty, since with no author there is
  // nobody to make the choice and deferring to age picks no side.
  it("respects the Law cap like any other proposal", () => {
    const G = atAssembly();

    for (const cardId of SIX_LAWS) {
      plantLaw(G, cardId, "3");
    }

    reopenWithHouseCard(G, "colonial-charter");
    passRemainingSeats(G);
    voteEverything(G, true);

    expect(G.activeLaws.length).toBeLessThanOrEqual(G.ruleset.assembly.lawCap);
  });

  // Design §1.3: "A Law already active on the board can't be re-enacted." A duplicate
  // house draw is discarded and redrawn — were it allowed to stand twice, its effects
  // would apply twice (getStandingEffects walks G.activeLaws entry by entry) and its
  // politician would bank two stelae of power off a single card.
  it("never re-enacts a Law that already stands", () => {
    const G = atAssembly();
    plantLaw(G, "land-reform", "3");

    reopenWithHouseCard(G, "land-reform");
    passRemainingSeats(G);
    voteEverything(G, true);

    expect(G.activeLaws.filter((law) => law.cardId === "land-reform")).toHaveLength(1);
  });
});

describe("the coup resolves when the agora rises", () => {
  it("crowns the demagogue's patron the moment his last monument lands", () => {
    // Pin the threshold at 3 so the mechanism test is independent of the tunable
    // (the default is 5) — two monuments already stand, this Directive is the third.
    const G = atAssembly({ patch: { assembly: { coupThreshold: 3 } } });
    for (let index = 0; index < 2; index += 1) {
      G.tallyMonuments.push({
        cardId: "grain-riot",
        author: "0",
        enactedSeason: G.season,
        order: G.lawOrder++
      });
    }

    carryResolution(G, "the-streets-burn");
    expect(G.phase).toBe("gameplay");

    expect(closeAssembly(G).ok).toBe(true);

    expect(G.phase).toBe("gameOver");
    expect(G.winner).toBe("0");
    expect(G.gameOverReason).toBe("stratoklesCoup");
  });
});

describe("the board keeps its shape across an assembly", () => {
  it("never leaves a tile without the settlements the players still own", () => {
    // A guard on the pokes above: everything the flow tests do goes through the real
    // verbs, so the board must still be internally consistent at the end of one.
    const G = atAssembly();
    carryResolution(G, "land-reform");
    passRemainingSeats(G);
    expect(closeAssembly(G).ok).toBe(true);

    for (const playerID of PLAYER_IDS) {
      for (const tileId of G.players[playerID].settlements) {
        expect(tile(G, tileId).settlements.some((s) => s.owner === playerID), `${playerID}/${tileId}`).toBe(true);
      }
    }
  });
});
