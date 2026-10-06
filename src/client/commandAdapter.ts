import type { PoliticianId } from "../game/assembly";
import { transition } from "../game/legalMoves";
import type { GameCommand } from "../game/legalMoves";
import type { CivicCalmPayment } from "../game/rules";
import type {
  BuildingId,
  EventTableId,
  HegemonyState,
  HungerLeave,
  PlayerId,
  PopType,
  Pops,
  RiotInsuranceId,
  TradableMaterial,
} from "../game/types";

import type { NationalIdeaId, IdeaPopChoice } from "../game/ideaTypes";

export type GameMoves = {
  pickIdea: (playerID: PlayerId, ideaId: NationalIdeaId, target?: IdeaPopChoice) => void;
  buyIdea: (ideaId: NationalIdeaId, target?: IdeaPopChoice) => void;
  placeCapital: (tileId: string, pops: Pops) => void;
  placeCity: (tileId: string, pops: Pops) => void;
  placeColony: (tileId: string, pops: Pops) => void;
  foundColony: (tileId: string, sourceTileId: string, pop: PopType) => void;
  upgradeColonyToCity: (tileId: string) => void;
  buildBuilding: (tileId: string, buildingId: BuildingId, claimVertexId?: string) => void;
  growPop: (tileId: string, pop: PopType) => void;
  movePops: (sourceTileId: string, targetTileId: string, pops: Pops) => void;
  resolvePendingPlayerEvent: (targetTileId?: string) => void;
  resolveHunger: (leave: HungerLeave[]) => void;
  bankSell: (material: TradableMaterial) => void;
  bankBuy: (material: TradableMaterial) => void;
  dole: () => void;
  civicCalm: (payment: CivicCalmPayment) => void;
  promotePop: (tileId: string, from: PopType) => void;
  demotePop: (tileId: string, from: PopType) => void;
  fundExpedition: (expeditionId: EventTableId) => void;
  buyRiotInsurance: (
    optionId: RiotInsuranceId,
    demoteTarget?: { tileId: string; from: PopType },
  ) => void;
  resolveRiot: () => void;
  assemblyDraw: (playerID: PlayerId, politician: PoliticianId) => void;
  assemblyDiscardHeld: (playerID: PlayerId) => void;
  assemblyPropose: (playerID: PlayerId, target?: PlayerId) => void;
  assemblyProposeRepeal: (playerID: PlayerId, cardId: string) => void;
  assemblyPass: (playerID: PlayerId) => void;
  assemblyBribe: (playerID: PlayerId, payment: "gold" | "influence") => void;
  assemblyVote: (playerID: PlayerId, yea: boolean) => void;
  assemblyClose: () => void;
};

export type DispatchGameCommand = (command: GameCommand, actor?: PlayerId) => void;

export type GameEvents = {
  endTurn: () => void;
};

/**
 * Construct the browser's convenience API from intent-only commands. Keeping
 * this adapter free of React makes every UI command construction behaviorally
 * testable without duplicating command shapes in the parity manifest.
 */
export function createCommandMoves(dispatch: DispatchGameCommand): GameMoves {
  return {
    placeCapital: (tileId, pops) => dispatch({ type: "placeCapital", tileId, pops }),
    placeCity: (tileId, pops) => dispatch({ type: "placeCity", tileId, pops }),
    placeColony: (tileId, pops) => dispatch({ type: "placeColony", tileId, pops }),
    foundColony: (tileId, sourceTileId, pop) =>
      dispatch({ type: "foundColony", tileId, sourceTileId, pop }),
    upgradeColonyToCity: (tileId) => dispatch({ type: "upgradeColonyToCity", tileId }),
    buildBuilding: (tileId, buildingId, claimVertexId) =>
      dispatch({
        type: "buildBuilding",
        tileId,
        buildingId,
        ...(claimVertexId ? { claimVertexId } : {}),
      }),
    growPop: (tileId, pop) => dispatch({ type: "growPop", tileId, pop }),
    movePops: (sourceTileId, targetTileId, pops) =>
      dispatch({ type: "movePops", sourceTileId, targetTileId, pops }),
    resolvePendingPlayerEvent: (targetTileId) =>
      dispatch({ type: "resolveEvent", ...(targetTileId ? { targetTileId } : {}) }),
    resolveHunger: (leave) => dispatch({ type: "resolveHunger", leave }),
    bankSell: (material) => dispatch({ type: "bankSell", material }),
    bankBuy: (material) => dispatch({ type: "bankBuy", material }),
    dole: () => dispatch({ type: "dole" }),
    pickIdea: (playerID, ideaId, target) =>
      dispatch({ type: "pickIdea", ideaId, ...(target ? { target } : {}) }, playerID),
    buyIdea: (ideaId, target) =>
      dispatch({ type: "buyIdea", ideaId, ...(target ? { target } : {}) }),
    civicCalm: (payment) => dispatch({ type: "civicCalm", payment }),
    promotePop: (tileId, from) => dispatch({ type: "promotePop", tileId, from }),
    demotePop: (tileId, from) => dispatch({ type: "demotePop", tileId, from }),
    fundExpedition: (expeditionId) => dispatch({ type: "fundExpedition", expeditionId }),
    buyRiotInsurance: (optionId, demoteTarget) =>
      dispatch({ type: "buyRiotInsurance", optionId, ...(demoteTarget ? { demoteTarget } : {}) }),
    resolveRiot: () => dispatch({ type: "resolveRiot" }),
    assemblyDraw: (playerID, politician) =>
      dispatch({ type: "assemblyDraw", politician }, playerID),
    assemblyDiscardHeld: (playerID) => dispatch({ type: "assemblyDiscardHeld" }, playerID),
    assemblyPropose: (playerID, target) =>
      dispatch({ type: "assemblyPropose", ...(target ? { target } : {}) }, playerID),
    assemblyProposeRepeal: (playerID, cardId) =>
      dispatch({ type: "assemblyProposeRepeal", cardId }, playerID),
    assemblyPass: (playerID) => dispatch({ type: "assemblyPass" }, playerID),
    assemblyBribe: (playerID, payment) => dispatch({ type: "assemblyBribe", payment }, playerID),
    assemblyVote: (playerID, yea) => dispatch({ type: "assemblyVote", yea }, playerID),
    assemblyClose: () => dispatch({ type: "assemblyClose" }),
  };
}

export function createCommandEvents(dispatch: DispatchGameCommand): GameEvents {
  return { endTurn: () => dispatch({ type: "endTurn" }) };
}

/** Apply one browser command through the canonical transition boundary. */
export function reduceGameCommand(
  previous: HegemonyState,
  actor: PlayerId,
  command: GameCommand,
): HegemonyState {
  const result = transition(previous.definition, previous, actor, command);
  return result.ok ? result.state : previous;
}
