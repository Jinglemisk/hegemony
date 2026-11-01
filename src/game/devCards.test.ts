import { describe, expect, it } from "vitest";
import { getAuthoredGameContent } from "./content";
import { DEV_CARDS } from "./data";
import {
  buyDevCard,
  devCardPlays,
  devDeckInstances,
  getBuyDevCardStatus,
  getPlayDevCardStatus,
  playDevCard,
} from "./devCards";
import { getBuildBuildingStatus } from "./status";
import { collectInvariantViolations } from "./invariants";
import { enumerateLegalCommands, transition } from "./legalMoves";
import type { GameCommand } from "./legalMoves";
import { projectForPlayer, projectForSpectator } from "./projection";
import { createInitialState } from "./state";
import { owned, scenario } from "./testing/scenario";
import type { HegemonyState } from "./types";

/** Seat 0's turn, its event card resolved, with gold to buy. Seat 0 holds a capital and
 *  a colony with six pops between them. */
function table() {
  return scenario()
    .opening()
    .withResources("0", { gold: 40, wood: 0, stone: 0, food: 10, influence: 0 })
    .mutate((G) => {
      G.pendingPlayerEvent = null;
    });
}

function act(G: HegemonyState, command: GameCommand): HegemonyState {
  const result = transition(G.definition, G, G.currentPlayer, command);
  if (!result.ok) throw new Error(result.reasons.join("; "));
  return result.state;
}

/** The seat's next turn, as far as the deck can tell: its flags reset, the turn on. */
function nextTurn(G: HegemonyState): HegemonyState {
  const next = structuredClone(G);
  next.turn += 1;
  next.players["0"].devCardBoughtThisTurn = false;
  next.players["0"].devCardPlayedThisTurn = false;
  return next;
}

const handOf = (G: HegemonyState, seat: "0" | "1" | "2" | "3", cardId: string) =>
  G.devHands[seat].find((held) => held.id.startsWith(`${cardId}#`))!;

describe("the development deck", () => {
  it("is the owner's forty cards: twenty yields, twelve held and eight rival", () => {
    expect(Object.fromEntries(DEV_CARDS.map((card) => [card.name, card.count]))).toEqual({
      Foraging: 5,
      Woodcutters: 5,
      "Quarry Gang": 5,
      "Bountiful Harvest": 1,
      "Civic Feast": 1,
      "Tunny Run": 1,
      "Timber Raft": 1,
      "Marble Block": 1,
      Caravan: 4,
      Settlers: 3,
      Captives: 1,
      "Master Builder": 1,
      "Festival Day": 3,
      Raiders: 4,
      Agitators: 2,
      Informer: 2,
    });
    const copies = (kind: string) =>
      DEV_CARDS.filter((card) => card.kind === kind).reduce((sum, card) => sum + card.count, 0);
    expect([copies("yield"), copies("held"), copies("rival")]).toEqual([20, 12, 8]);

    const ids = devDeckInstances(getAuthoredGameContent());
    expect(new Set(ids).size).toBe(40);
    expect(createInitialState(7).devDrawPile).toEqual(createInitialState(7).devDrawPile);
    expect(createInitialState(7).devDrawPile).not.toEqual(createInitialState(8).devDrawPile);
  });

  it("pile, discards and hands hold the whole deck, through a reshuffle", () => {
    const G = table().build();
    const devViolations = () =>
      collectInvariantViolations(G, { strictCardConservation: true }).filter((violation) =>
        violation.code.startsWith("cards.dev"),
      );
    for (let turn = 0; turn < 50; turn += 1) {
      G.turn += 1;
      G.players["0"].devCardBoughtThisTurn = false;
      G.players["0"].devCardPlayedThisTurn = false;
      G.players["0"].resources.gold = 10;
      const [play] = devCardPlays(G, "0");
      if (play) expect(playDevCard(G, "0", play).ok).toBe(true);
      expect(buyDevCard(G, "0").ok).toBe(true);
      expect(devViolations()).toEqual([]);
    }
    expect(G.log.some((entry) => entry.message.includes("shuffled into a new draw pile"))).toBe(
      true,
    );

    // A card lost from the deck is caught.
    G.devDrawPile.pop();
    expect(devViolations().map((violation) => violation.code)).toEqual(["cards.devCount"]);
  });

  it("buys one card a turn, after the event card, and never plays one the turn it came in", () => {
    let G = table().stackDevCard("settlers").withDevCard("0", "caravan").build();
    const waiting = structuredClone(G);
    waiting.pendingPlayerEvent = { playerID: "0", card: G.definition.content.playerEvents[0] };
    expect(getBuyDevCardStatus(waiting, "0").can).toBe(false);

    const gold = G.players["0"].resources.gold;
    G = act(G, { type: "buyDevCard" });
    expect(G.players["0"].resources.gold).toBe(gold - 2);
    const settlers = handOf(G, "0", "settlers");
    expect(settlers.turn).toBe(G.turn);
    expect(enumerateLegalCommands(G, "0").some((move) => move.type === "buyDevCard")).toBe(false);

    // The Settlers drawn now waits; the Caravan held from before plays, its kind chosen.
    expect(getPlayDevCardStatus(G, "0", { card: settlers.id, tileId: "-2,0" }).reasons).toContain(
      "A card is never played on the turn it came in.",
    );
    const caravan = handOf(G, "0", "caravan").id;
    expect(devCardPlays(G, "0").map((play) => play.card)).toEqual([caravan, caravan, caravan]);
    G = act(G, { type: "playDevCard", card: caravan, resource: "wood" });
    expect(G.players["0"].resources.wood).toBe(2);
    expect(G.devDiscardPile).toContain(caravan);

    // One card a turn; the next turn the Settlers plays.
    expect(devCardPlays(G, "0")).toEqual([]);
    G = nextTurn(G);
    const freemen = owned(G, "-2,0", "0").pops.freemen;
    G = act(G, { type: "playDevCard", card: settlers.id, tileId: "-2,0" });
    expect(owned(G, "-2,0", "0").pops.freemen).toBe(freemen + 1);
  });

  it("hides rivals' hands and the draw order, and shows hand counts", () => {
    let G = table()
      .withDevCard("0", "raiders")
      .withDevCard("1", "informer")
      .withDevCard("1", "settlers")
      .stackDevCard("captives")
      .build();
    G = act(G, { type: "buyDevCard" });
    // The line says a card was kept, never which.
    expect(G.log.at(-1)?.message).toBe("Damon bought a development card and kept it.");

    const own = projectForPlayer(G.definition, G, "0").state;
    expect(own.devHands["0"]).toEqual(G.devHands["0"]);
    expect(own.devHands["1"]).toHaveLength(2);
    expect(own.devHands["1"].every((held) => held.id === "__hidden_dev__")).toBe(true);
    expect(own.devDrawPile).toHaveLength(G.devDrawPile.length);
    expect(new Set(own.devDrawPile)).toEqual(new Set(["__hidden_dev__"]));

    const rival = projectForPlayer(G.definition, G, "1").state;
    expect(rival.devHands["1"]).toEqual(G.devHands["1"]);
    expect(rival.devHands["0"]).toHaveLength(2);
    expect(JSON.stringify(rival)).not.toContain(handOf(G, "0", "captives").id);
    const spectator = projectForSpectator(G.definition, G).state;
    expect(
      Object.values(spectator.devHands)
        .flat()
        .map((held) => held.id),
    ).toEqual(Array(4).fill("__hidden_dev__"));
  });

  it("counts settlements and every pop, those on the move included", () => {
    let G = table().stackDevCard("foraging").build();
    const food = G.players["0"].resources.food;
    G = act(G, { type: "buyDevCard" });
    expect(G.players["0"].resources.food).toBe(food + 2);
    expect(G.log.at(-1)?.moment).toMatchObject({
      kind: "devCard",
      cardId: "foraging",
      played: false,
      outcome: "+2 food",
    });
    expect(G.devDiscardPile.some((id) => id.startsWith("foraging#"))).toBe(true);

    // Six pops stand in the realm and one is on the move between its settlements.
    const harvest = table().stackDevCard("bountiful-harvest").build();
    const capital = owned(harvest, "-2,0", "0");
    const colony = owned(harvest, "3,0", "0");
    harvest.transfers.push({
      id: "transfer-test",
      owner: "0",
      fromSettlementId: capital.id,
      toSettlementId: colony.id,
      fromTileId: capital.tileId,
      toTileId: colony.tileId,
      pops: { citizens: 0, freemen: 1, slaves: 0 },
    });
    const fed = act(harvest, { type: "buyDevCard" });
    expect(fed.players["0"].resources.food).toBe(harvest.players["0"].resources.food + 7);
  });

  it("Raiders takes no more than the rival holds", () => {
    const G = table().withDevCard("0", "raiders").build();
    Object.assign(G.players["1"].resources, { gold: 2, wood: 0 });
    const raiders = handOf(G, "0", "raiders").id;
    const plays = devCardPlays(G, "0");
    expect(plays).toContainEqual({ card: raiders, target: "1", resource: "gold" });
    expect(plays.some((play) => play.target === "1" && play.resource === "wood")).toBe(false);

    const gold = G.players["0"].resources.gold;
    const after = act(G, { type: "playDevCard", card: raiders, target: "1", resource: "gold" });
    expect(after.players["1"].resources.gold).toBe(0);
    expect(after.players["0"].resources.gold).toBe(gold + 2);
    expect(after.log.at(-1)?.message).toBe("Damon played Raiders on Nikos: took 2 gold.");
  });

  it("an Informer makes a rival with a card discard one at random", () => {
    const G = table()
      .withDevCard("0", "informer")
      .withDevCard("2", "settlers")
      .withDevCard("2", "caravan")
      .build();
    const informer = handOf(G, "0", "informer").id;
    expect(devCardPlays(G, "0").map((play) => play.target)).toEqual(["2"]);

    const after = act(G, { type: "playDevCard", card: informer, target: "2" });
    expect(after.devHands["2"]).toHaveLength(1);
    const kept = after.devHands["2"].map((held) => held.id);
    const lost = G.devHands["2"].find((held) => !kept.includes(held.id))!;
    expect(after.devDiscardPile).toEqual(expect.arrayContaining([informer, lost.id]));
    expect(after.log.at(-1)?.message).toMatch(/^Damon played Informer on Theron: Theron discarded/);
  });

  it("plays the own held cards through their real paths", () => {
    let G = table()
      .withDevCard("0", "festival-day")
      .withDevCard("0", "master-builder")
      .withDevCard("0", "agitators")
      .build();
    // Festival Day needs a token to clear.
    const festival = handOf(G, "0", "festival-day").id;
    expect(devCardPlays(G, "0").some((play) => play.card === festival)).toBe(false);
    G.players["0"].unrestTokens = 1;
    G = act(G, { type: "playDevCard", card: festival });
    expect(G.players["0"].unrestTokens).toBe(0);

    // Agitators: the rival places the token.
    G = nextTurn(G);
    G = act(G, { type: "playDevCard", card: handOf(G, "0", "agitators").id, target: "3" });
    expect(G.players["3"].unrestTokens).toBe(1);

    // Master Builder: the next building costs 2 less wood or stone, then it is spent.
    G = nextTurn(G);
    G.players["0"].resources.stone = 3;
    const forum = () => getBuildBuildingStatus(G, "0", "-2,0", "forum").cost;
    expect(forum()).toEqual({ stone: 3 });
    G = act(G, { type: "playDevCard", card: handOf(G, "0", "master-builder").id });
    expect(forum()).toEqual({ stone: 1 });
    G = act(G, { type: "buildBuilding", tileId: "-2,0", buildingId: "forum" });
    expect(G.players["0"].resources.stone).toBe(2);
    expect(G.players["0"].buildDiscount).toBe(0);
  });
});
