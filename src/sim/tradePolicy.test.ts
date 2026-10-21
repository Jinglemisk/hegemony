import { describe, expect, it } from "vitest";
import { enumerateLegalCommands, transition } from "../game/legalMoves";
import { projectForPlayer } from "../game/projection";
import { scenario } from "../game/testing/scenario";
import { emptyBundle } from "../game/trade";
import type { HegemonyState, PlayerId, Pops, Resources, TradeTerms } from "../game/types";
import { POLICIES, type PolicyId } from "./policies";
import { createSimRng } from "./rng";
import { playTurn } from "./runner";

const FOREST = "-3,0";
const PLAINS = "1,0";
const NOTHING = { food: 0, wood: 0, stone: 0, gold: 0, influence: 0 };

/** Two cities on `seat`'s turn, its income collected and nothing pending. The other two
 *  seats hold nothing, so only these two can trade. */
function table(
  seat: PlayerId,
  realms: Record<"0" | "1", { tile: string; pops: Pops; resources: Partial<Resources> }>,
): HegemonyState {
  return scenario()
    .withSettlement("0", realms["0"].tile, "city", realms["0"].pops)
    .withSettlement("1", realms["1"].tile, "city", realms["1"].pops)
    .withResources("0", { ...NOTHING, ...realms["0"].resources })
    .withResources("1", { ...NOTHING, ...realms["1"].resources })
    .withResources("2", NOTHING)
    .withResources("3", NOTHING)
    .mutate((G) => {
      G.phase = "gameplay";
      G.year = 3;
      G.currentPlayer = seat;
      G.pendingPlayerEvent = null;
      G.activeYearCard = null;
      G.players[seat].collectedThisTurn = true;
    })
    .build();
}

function terms(give: Partial<Resources>, get: Partial<Resources>): TradeTerms {
  return { give: { ...emptyBundle(), resources: give }, get: { ...emptyBundle(), resources: get } };
}

/** Seat 1 offers seat 0 `offer`; what seat 0's bot answers. */
function answer(G: HegemonyState, offer: TradeTerms, policy: PolicyId = "master") {
  const made = transition(G.definition, G, "1", {
    type: "tradeOffer",
    to: ["0"],
    terms: offer,
    places: {},
  });
  if (!made.ok) throw new Error(made.reasons.join("; "));
  const command = POLICIES[policy].choose(
    projectForPlayer(made.state.definition, made.state, "0"),
    enumerateLegalCommands(made.state, "0"),
    createSimRng(1),
  );
  return command.type === "tradeAnswer" ? command.answer.kind : command.type;
}

describe("bots trade", () => {
  it("a forest seat short of food buys it with wood from a plains seat that wants a Granary", () => {
    // Seat 0 cuts wood and eats three more food a year than its city grows, with no
    // influence for the Dole. Seat 1 grows food it does not eat and has no wood.
    const G = table("0", {
      "0": {
        tile: FOREST,
        pops: { citizens: 1, freemen: 3, slaves: 3 },
        resources: { food: -3, wood: 12 },
      },
      "1": { tile: PLAINS, pops: { citizens: 0, freemen: 1, slaves: 5 }, resources: { food: 20 } },
    });

    const after = playTurn(G, POLICIES.master, createSimRng(1));
    const trade = after.log.find((entry) => entry.moment?.kind === "trade")?.moment;
    expect(trade).toMatchObject({ kind: "trade", from: "0", partner: "1" });
    if (trade?.kind !== "trade") return;
    expect(trade.terms.give.resources.wood).toBeGreaterThan(0);
    expect(trade.terms.get.resources.food).toBeGreaterThanOrEqual(3);
    expect(after.players["0"].popsLostToHunger).toBe(0);
  });

  it("refuses a deal worse than no deal, and takes one that pays", () => {
    // The civic seat grows more food than it eats and is saving stone toward its
    // Forum: 1 stone held of 3.
    const G = table("1", {
      "0": {
        tile: PLAINS,
        pops: { citizens: 2, freemen: 1, slaves: 4 },
        resources: { food: 10, stone: 1 },
      },
      "1": {
        tile: FOREST,
        pops: { citizens: 0, freemen: 1, slaves: 3 },
        resources: { food: 10, stone: 6 },
      },
    });

    // Its stone for food it does not need.
    expect(answer(G, terms({ food: 2 }, { stone: 1 }), "civic")).toBe("decline");
    // The Forum's stone for a food it can spare.
    expect(answer(G, terms({ stone: 2 }, { food: 1 }), "civic")).toBe("accept");
  });

  it("refuses a deal that hands its partner Treasurer", () => {
    // Seat 0 eats more than it grows. At 29 gold seat 1 is one short of Treasurer's 30,
    // so no counter a unit off keeps the title from it either.
    const hungry = (gold: number) =>
      table("1", {
        "0": {
          tile: FOREST,
          pops: { citizens: 0, freemen: 4, slaves: 3 },
          resources: { food: 0, gold: 10 },
        },
        "1": {
          tile: PLAINS,
          pops: { citizens: 0, freemen: 1, slaves: 5 },
          resources: { food: 20, gold },
        },
      });
    const deal = terms({ food: 4 }, { gold: 2 });

    expect(answer(hungry(29), deal)).toBe("decline");
    expect(answer(hungry(20), deal)).toBe("accept");
  });
});
