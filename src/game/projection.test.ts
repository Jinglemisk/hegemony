import { describe, expect, it } from "vitest";

import { commandActorEligibility, currentWorkflow, eligibleActors } from "./actors";
import { openAssembly } from "./assembly";
import { getResolutionCard } from "./content";
import { transition } from "./legalMoves";
import { projectForPlayer, projectForSpectator } from "./projection";
import { scenario } from "./testing/scenario";

describe("workflow actor eligibility", () => {
  it("uses the active turn for ordinary play and the decision owner for interruptions", () => {
    const G = scenario().opening().build();
    expect(currentWorkflow(G)).toBe(G.pendingPlayerEvent ? "eventDecision" : "turn");
    expect(eligibleActors(G)).toEqual([G.currentPlayer]);
    expect(commandActorEligibility(G, "1", { type: "endTurn" }).eligible).toBe(false);

    G.pendingPlayerEvent = {
      playerID: "2",
      card: G.definition.content.playerEvents[0],
    };
    expect(currentWorkflow(G)).toBe("eventDecision");
    expect(eligibleActors(G)).toEqual(["2"]);
    expect(commandActorEligibility(G, "2", { type: "endTurn" }).eligible).toBe(false);
    expect(commandActorEligibility(G, "2", { type: "resolveEvent", choiceIndex: 0 }).eligible).toBe(
      true,
    );
  });

  it("admits every undecided Assembly proposer, then only the sequential voter and closer", () => {
    const G = scenario().opening().build();
    G.pendingPlayerEvent = null;
    openAssembly(G, G.currentPlayer);

    expect(eligibleActors(G)).toEqual(["0", "1", "2", "3"]);
    G.assembly!.proposalDone["2"] = true;
    expect(eligibleActors(G)).toEqual(["0", "1", "3"]);
    expect(commandActorEligibility(G, "1", { type: "assemblyPass" }).eligible).toBe(true);
    expect(commandActorEligibility(G, "1", { type: "assemblyVote", yea: true }).eligible).toBe(
      false,
    );
    expect(transition(G.definition, G, "1", { type: "assemblyVote", yea: true }).ok).toBe(false);
    expect(transition(G.definition, G, "1", { type: "assemblyPass" }).ok).toBe(true);

    G.assembly!.phase = "voting";
    G.assembly!.voteIndex = 1;
    expect(eligibleActors(G)).toEqual([G.assembly!.voteOrder[1]]);

    G.assembly!.phase = "closing";
    G.assembly!.activePlayer = "3";
    expect(eligibleActors(G)).toEqual(["3"]);
    expect(commandActorEligibility(G, "3", { type: "assemblyClose" }).eligible).toBe(true);
  });
});

describe("player and spectator projections", () => {
  it("removes entropy and draw identities without mutating authority", () => {
    const G = scenario().opening().build();
    const before = JSON.stringify(G);
    const view = projectForPlayer(G.definition, G, G.currentPlayer);

    expect(JSON.stringify(G)).toBe(before);
    expect(view.state.seed).toBe(0);
    expect(view.state.rng).toBe(0);
    expect(view.state.seasonalDrawPile).toHaveLength(G.seasonalDrawPile.length);
    expect(view.state.seasonalDrawPile.every((card) => card.id === "__hidden_event__")).toBe(true);
    expect(view.state.playerDrawPile.every((card) => card.id === "__hidden_event__")).toBe(true);
    for (const deck of Object.values(view.state.politicianDecks)) {
      expect(deck.every((cardId) => cardId === "__hidden_resolution__")).toBe(true);
    }
  });

  it("shows only the viewer's held card and sealed proposal before voting", () => {
    const G = scenario().opening().build();
    G.pendingPlayerEvent = null;
    openAssembly(G, G.currentPlayer);
    const held = getResolutionCard(G.definition.content, "land-reform")!;
    const proposed = getResolutionCard(G.definition.content, "public-works")!;
    G.assembly!.held["0"] = { card: held, draws: 1 };
    G.assembly!.proposals["1"] = { kind: "enact", card: proposed, proposer: "1" };

    const player0 = projectForPlayer(G.definition, G, "0");
    const player1 = projectForPlayer(G.definition, G, "1");
    const spectator = projectForSpectator(G.definition, G);

    expect(player0.state.assembly?.held["0"]?.card.id).toBe("land-reform");
    expect(player0.state.assembly?.proposals["1"]).toBeNull();
    expect(player1.state.assembly?.held["0"]).toBeNull();
    expect(player1.state.assembly?.proposals["1"]).toMatchObject({ proposer: "1" });
    expect(Object.values(spectator.state.assembly!.held).every((card) => card === null)).toBe(true);
    expect(
      Object.values(spectator.state.assembly!.proposals).every((proposal) => proposal === null),
    ).toBe(true);
    expect(spectator.legalOptions).toEqual([]);
  });

  it("keeps a pending event choice private to its actor", () => {
    const G = scenario().stackPlayerEvent("player-temple-donation").opening().build();
    expect(G.pendingPlayerEvent?.playerID).toBe("0");
    const actor = projectForPlayer(G.definition, G, "0");
    const rival = projectForPlayer(G.definition, G, "1");
    const spectator = projectForSpectator(G.definition, G);

    expect(actor.state.pendingPlayerEvent?.card.id).toBe("player-temple-donation");
    expect(actor.legalOptions.every(({ command }) => command.type === "resolveEvent")).toBe(true);
    expect(rival.state.pendingPlayerEvent).toBeNull();
    expect(rival.state.lastPlayerEvent).toBeNull();
    expect(rival.legalOptions).toEqual([]);
    expect(spectator.state.pendingPlayerEvent).toBeNull();
    expect(spectator.state.log.some((entry) => entry.message.includes("Temple Donation"))).toBe(
      false,
    );
    expect(spectator.workflow).toBe("eventDecision");
    expect(spectator.eligibleActors).toEqual(["0"]);
  });
});
