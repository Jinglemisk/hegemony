import { describe, expect, it } from "vitest";
import { openAssembly } from "../game/assembly";
import { happinessLevel } from "../game/happiness";
import { enumerateLegalCommands, type GameCommand } from "../game/legalMoves";
import { projectForPlayer } from "../game/projection";
import { scenario } from "../game/testing/scenario";
import type { HegemonyState } from "../game/types";
import { victoryCardsHeld, voiceHolder } from "../game/victory";
import { POLICIES, type PersonalityId } from "./policies";
import { createSimRng } from "./rng";

// The AI reach audit: content the rotated batch never used, in a position where it
// is clearly the best move. A bot that still passes cannot see it.

const names: PersonalityId[] = ["slaver", "civic", "trader"];

function choose(name: PersonalityId, G: HegemonyState, keep: (move: GameCommand) => boolean) {
  const moves = enumerateLegalCommands(G, "0").filter(keep);
  return POLICIES[name].choose(projectForPlayer(G.definition, G, "0"), moves, createSimRng(1));
}

/** One mouth short at the next income, with no gold to buy food and only the
 *  Idea's price in influence. */
function oneMouthShort(city: { tileId: string; slaves: number; port?: boolean }, eaters: number) {
  const G = scenario()
    .withSettlement("0", city.tileId, "city", { citizens: 1, freemen: 0, slaves: city.slaves })
    .withSettlement("0", "-3,0", "colony", { citizens: 0, freemen: eaters, slaves: 0 })
    .withResources("0", { food: 0, wood: 0, stone: 0, gold: 0, influence: 6 })
    .build();
  G.phase = "gameplay";
  G.year = 5;
  G.activeYearCard = null;
  G.players["0"].collectedThisTurn = true;
  G.players["0"].nationalIdeas = [{ id: "public-dole", acquired: "setup", year: 1 }];
  if (city.port) {
    const tile = G.board.tiles.find((t) => t.id === city.tileId)!;
    tile.settlements.find((s) => s.owner === "0")!.buildings.push("port");
  }
  return G;
}

const buys = (ideaId: string) => (m: GameCommand) =>
  m.type === "endTurn" || (m.type === "buyIdea" && m.ideaId === ideaId);

describe("the AI reach audit", () => {
  it.each(names)("%s buys Urban Planning when the city's extra slot feeds the realm", (name) => {
    // Six plains slots and seven slaves: one idles. Four colony freemen and the
    // citizen eat five; six working slaves leave one mouth short.
    const G = oneMouthShort({ tileId: "-2,1", slaves: 7 }, 6);
    expect(choose(name, G, buys("urban-planning"))).toMatchObject({
      type: "buyIdea",
      ideaId: "urban-planning",
    });
  });

  it.each(names)("%s buys Harbour Planning when the Port's slot feeds the realm", (name) => {
    // A coastal plains city of four slots, one held by its Port: three of four slaves work.
    const G = oneMouthShort({ tileId: "3,0", slaves: 4, port: true }, 3);
    expect(choose(name, G, buys("harbour-planning"))).toMatchObject({
      type: "buyIdea",
      ideaId: "harbour-planning",
    });
  });

  it.each(names)("%s buys Good Harvest to cover a shortfall", (name) => {
    const G = oneMouthShort({ tileId: "-2,1", slaves: 6 }, 6);
    expect(choose(name, G, buys("good-harvest"))).toMatchObject({
      type: "buyIdea",
      ideaId: "good-harvest",
    });
  });

  it.each(names)("%s calms with food under Festival Calendar to stop a riot", (name) => {
    const G = scenario()
      .withSettlement("0", "-2,1", "city", { citizens: 1, freemen: 1, slaves: 2 })
      .withResources("0", { food: 20, wood: 0, stone: 0, gold: 0, influence: 0 })
      .build();
    G.phase = "gameplay";
    G.year = 5;
    G.activeYearCard = null;
    G.players["0"].collectedThisTurn = true;
    G.activeLaws = [{ cardId: "festival-calendar", author: "1", enactedYear: 4, order: 0 }];
    G.players["0"].unrestTokens += happinessLevel(G, "0") - G.ruleset.economy.unrest.riotThreshold;
    expect(happinessLevel(G, "0")).toBe(G.ruleset.economy.unrest.riotThreshold);
    expect(choose(name, G, (m) => m.type === "endTurn" || m.type === "civicCalm")).toMatchObject({
      type: "civicCalm",
      payment: "gold",
    });
  });

  it.each(names)(
    "%s draws Stratokles to break the Voice that would win a rival the game",
    (name) => {
      const G = scenario().opening().withResources("0", { influence: 12 }).build();
      G.pendingPlayerEvent = null;
      G.year = 12;
      G.yearOpener = "0";
      G.activeLaws = [
        { cardId: "guild-charter", author: "1", enactedYear: 6, order: G.lawOrder++ },
        { cardId: "civic-pride", author: "1", enactedYear: 8, order: G.lawOrder++ },
      ];
      G.politicianDecks.perdiccas = G.politicianDecks.perdiccas.filter(
        (id) => id !== "guild-charter" && id !== "civic-pride",
      );
      // Rival 1 also holds Treasurer and Civic Elite: with Voice it wins at its next turn.
      G.players["1"].resources.gold = 40;
      G.board.tiles
        .find((t) => t.id === G.players["1"].settlements[0])!
        .settlements.find((s) => s.owner === "1")!.pops.citizens += 6;
      expect(voiceHolder(G)).toBe("1");
      expect(victoryCardsHeld(G, "1")).toBe(G.ruleset.victory.cardsToWin);
      openAssembly(G, "0");
      expect(G.currentPlayer).toBe("0");
      // Stratokles against passing: before the fix every Directive scored only its prize,
      // so no bot paid to draw one even to stop a rival's winning Voice.
      const move = choose(
        name,
        G,
        (m) =>
          m.type === "assemblyPass" || (m.type === "assemblyDraw" && m.politician === "stratokles"),
      );
      expect(move).toEqual({ type: "assemblyDraw", politician: "stratokles" });
    },
  );
});
