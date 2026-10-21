import { describe, expect, it } from "vitest";

import {
  createCommandEvents,
  createCommandMoves,
  reduceGameCommand,
} from "../client/commandAdapter";
import { enumerateLegalCommands, transition } from "../game/legalMoves";
import type { GameCommand } from "../game/legalMoves";
import { scenario } from "../game/testing/scenario";
import type { PlayerId } from "../game/types";
import { applySimCommand } from "../sim/runner";
import { applyReplayCommand } from "../sim/script";
import { GAME_COMMAND_TYPES } from "./commandParity";

describe("behavioral command-consumer parity", () => {
  it("constructs every browser command as real player intent", () => {
    const calls: Array<{ command: GameCommand; actor?: PlayerId }> = [];
    const dispatch = (command: GameCommand, actor?: PlayerId) => calls.push({ command, actor });
    const moves = createCommandMoves(dispatch);
    const events = createCommandEvents(dispatch);
    const pops = { citizens: 1, freemen: 2, slaves: 3 };
    const terms = {
      give: { resources: { wood: 2 }, goods: [], pops },
      get: { resources: { food: 1 }, goods: ["luxury-1"], pops: { ...pops, slaves: 0 } },
    };

    moves.placeCapital("tile-a", pops);
    moves.placeCity("tile-b", pops);
    moves.placeColony("tile-c", pops);
    moves.foundColony("tile-d", "tile-a", "freemen");
    moves.upgradeColonyToCity("tile-d");
    moves.buildBuilding("tile-a", "marketplace");
    moves.growPop("tile-a", "citizens");
    moves.movePops("tile-a", "tile-b", pops);
    moves.resolvePendingPlayerEvent("tile-a");
    moves.resolveHunger([{ tileId: "tile-a", pop: "freemen" }]);
    moves.bankSell("wood");
    moves.bankBuy("stone");
    moves.dole();
    moves.pickIdea("2", "good-harvest");
    moves.buyIdea("treasury-grant");
    moves.civicCalm("influence");
    moves.promotePop("tile-a", "freemen");
    moves.demotePop("tile-a", "citizens");
    moves.fundExpedition("merchantConvoy");
    moves.buyRiotInsurance("concession", { tileId: "tile-a", from: "citizens" });
    moves.resolveRiot();
    moves.assemblyDraw("1", "demosthenes");
    moves.assemblyDiscardHeld("1");
    moves.assemblyPropose("1", "2");
    moves.assemblyProposeRepeal("1", "law-a");
    moves.assemblyPass("1");
    moves.assemblyBribe("1", "gold");
    moves.assemblyVote("1", true);
    moves.assemblyClose();
    moves.assemblyReady("2");
    moves.tradeOffer("0", ["1", "3"], terms);
    moves.tradeAnswer("1", "offer-9", { kind: "counter", terms, places: { from: "tile-b" } });
    moves.tradeSettle("0", "offer-9", "1", { to: "tile-a" });
    moves.tradeWithdraw("0", "offer-9");
    events.endTurn();

    expect(calls).toEqual([
      { command: { type: "placeCapital", tileId: "tile-a", pops }, actor: undefined },
      { command: { type: "placeCity", tileId: "tile-b", pops }, actor: undefined },
      { command: { type: "placeColony", tileId: "tile-c", pops }, actor: undefined },
      {
        command: {
          type: "foundColony",
          tileId: "tile-d",
          sourceTileId: "tile-a",
          pop: "freemen",
        },
        actor: undefined,
      },
      { command: { type: "upgradeColonyToCity", tileId: "tile-d" }, actor: undefined },
      {
        command: { type: "buildBuilding", tileId: "tile-a", buildingId: "marketplace" },
        actor: undefined,
      },
      { command: { type: "growPop", tileId: "tile-a", pop: "citizens" }, actor: undefined },
      {
        command: { type: "movePops", sourceTileId: "tile-a", targetTileId: "tile-b", pops },
        actor: undefined,
      },
      {
        command: { type: "resolveEvent", targetTileId: "tile-a" },
        actor: undefined,
      },
      {
        command: { type: "resolveHunger", leave: [{ tileId: "tile-a", pop: "freemen" }] },
        actor: undefined,
      },
      { command: { type: "bankSell", material: "wood" }, actor: undefined },
      { command: { type: "bankBuy", material: "stone" }, actor: undefined },
      { command: { type: "dole" }, actor: undefined },
      { command: { type: "pickIdea", ideaId: "good-harvest" }, actor: "2" },
      { command: { type: "buyIdea", ideaId: "treasury-grant" }, actor: undefined },
      { command: { type: "civicCalm", payment: "influence" }, actor: undefined },
      {
        command: { type: "promotePop", tileId: "tile-a", from: "freemen" },
        actor: undefined,
      },
      {
        command: { type: "demotePop", tileId: "tile-a", from: "citizens" },
        actor: undefined,
      },
      {
        command: { type: "fundExpedition", expeditionId: "merchantConvoy" },
        actor: undefined,
      },
      {
        command: {
          type: "buyRiotInsurance",
          optionId: "concession",
          demoteTarget: { tileId: "tile-a", from: "citizens" },
        },
        actor: undefined,
      },
      { command: { type: "resolveRiot" }, actor: undefined },
      { command: { type: "assemblyDraw", politician: "demosthenes" }, actor: "1" },
      { command: { type: "assemblyDiscardHeld" }, actor: "1" },
      {
        command: { type: "assemblyPropose", target: "2" },
        actor: "1",
      },
      { command: { type: "assemblyProposeRepeal", cardId: "law-a" }, actor: "1" },
      { command: { type: "assemblyPass" }, actor: "1" },
      { command: { type: "assemblyBribe", payment: "gold" }, actor: "1" },
      { command: { type: "assemblyVote", yea: true }, actor: "1" },
      { command: { type: "assemblyClose" }, actor: undefined },
      { command: { type: "assemblyReady" }, actor: "2" },
      { command: { type: "tradeOffer", to: ["1", "3"], terms }, actor: "0" },
      {
        command: {
          type: "tradeAnswer",
          offerId: "offer-9",
          answer: { kind: "counter", terms, places: { from: "tile-b" } },
        },
        actor: "1",
      },
      {
        command: {
          type: "tradeSettle",
          offerId: "offer-9",
          partner: "1",
          places: { to: "tile-a" },
        },
        actor: "0",
      },
      { command: { type: "tradeWithdraw", offerId: "offer-9" }, actor: "0" },
      { command: { type: "endTurn" }, actor: undefined },
    ]);
    expect(calls.map(({ command }) => command.type)).toEqual(GAME_COMMAND_TYPES);
  });

  it("publishes byte-identical state through browser, simulator, replay, and engine seams", () => {
    const state = scenario({ seed: 9182 }).build();
    const actor = state.currentPlayer;
    const command = enumerateLegalCommands(state, actor)[0];
    const direct = transition(state.definition, state, actor, command);
    const simulated = applySimCommand(state, actor, command);
    const replayed = applyReplayCommand(state, actor, command);

    expect(direct.ok).toBe(true);
    expect(simulated.ok).toBe(true);
    expect(replayed.ok).toBe(true);
    if (!direct.ok || !simulated.ok || !replayed.ok) return;

    const expected = JSON.stringify(direct.state);
    expect(JSON.stringify(reduceGameCommand(state, actor, command))).toBe(expected);
    expect(JSON.stringify(simulated.state)).toBe(expected);
    expect(JSON.stringify(replayed.state)).toBe(expected);
  });
});
