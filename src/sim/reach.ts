import { VOTE_PAYMENTS } from "../game/assembly";
import { TRADABLE_MATERIALS } from "../game/bank";
import { CIVIC_CALM_PAYMENTS, DEMOTE_FROM, PROMOTE_FROM } from "../game/civic";
import { getAuthoredGameContent, getExpeditionTables } from "../game/content";
import { GROWABLE_POPS } from "../game/core/pops";
import { HUNGER_POPS } from "../game/hunger";
import type { GameCommand } from "../game/legalMoves";
import type { HegemonyState, PlayerId } from "../game/types";
import { GAME_COMMAND_TYPES } from "../parity/commandParity";
import {
  BUILDING_CONTENT_IDS,
  PLAYER_EVENT_CONTENT_IDS,
  YEAR_CARD_CONTENT_IDS,
  LAW_CONTENT_IDS,
  DIRECTIVE_CONTENT_IDS,
  NATIONAL_IDEA_CONTENT_IDS,
  RIOT_INSURANCE_CONTENT_IDS,
  POLITICIAN_CONTENT_IDS,
} from "../parity/featureParity";

/** Separate acquisition/proposal from successful use; never hide an unused ID. */
export const REACH_IDS = [
  ...GAME_COMMAND_TYPES.map((id) => `command:${id}`),
  ...BUILDING_CONTENT_IDS.map((id) => `building:${id}`),
  ...PLAYER_EVENT_CONTENT_IDS.flatMap((id) => [`playerDraw:${id}`, `playerResolve:${id}`]),
  ...YEAR_CARD_CONTENT_IDS.map((id) => `year:${id}`),
  ...getExpeditionTables(getAuthoredGameContent()).map((table) => `venture:${table.id}`),
  ...LAW_CONTENT_IDS.flatMap((id) => [`lawProposed:${id}`, `law:${id}`]),
  ...DIRECTIVE_CONTENT_IDS.flatMap((id) => [`directiveProposed:${id}`, `directive:${id}`]),
  ...NATIONAL_IDEA_CONTENT_IDS.flatMap((id) => [`ideaSetup:${id}`, `ideaBought:${id}`]),
  ...["bankBuy", "bankSell"].flatMap((verb) =>
    TRADABLE_MATERIALS.map((material) => `${verb}:${material}`),
  ),
  ...CIVIC_CALM_PAYMENTS.map((payment) => `calm:${payment}`),
  ...PROMOTE_FROM.map((pop) => `promote:${pop}`),
  ...DEMOTE_FROM.map((pop) => `demote:${pop}`),
  ...GROWABLE_POPS.map((pop) => `grow:${pop}`),
  // One count for each pop a hunger pick sends away, by its class.
  ...HUNGER_POPS.map((pop) => `hunger:${pop}`),
  ...VOTE_PAYMENTS.map((payment) => `votes:${payment}`),
  ...RIOT_INSURANCE_CONTENT_IDS.map((id) => `insurance:${id}`),
  ...POLITICIAN_CONTENT_IDS.map((id) => `politician:${id}`),
];
export type ReachReport = {
  /** Per personality seat-game, including capped participation. */
  seatGames: number;
  counts: Record<string, number>;
  perSeatGame: Record<string, number>;
};
export function emptyReachCounts(): Record<string, number> {
  return Object.fromEntries(REACH_IDS.map((id) => [id, 0]));
}
export function moveReachIds(
  G: HegemonyState,
  player: PlayerId,
  move: GameCommand,
  before?: HegemonyState,
): string[] {
  const ids = [`command:${move.type}`];
  switch (move.type) {
    case "buildBuilding":
      ids.push(`building:${move.buildingId}`);
      break;
    case "pickIdea":
      ids.push(`ideaSetup:${move.ideaId}`);
      break;
    case "buyIdea":
      ids.push(`ideaBought:${move.ideaId}`);
      break;
    case "fundExpedition":
      ids.push(`venture:${move.expeditionId}`);
      break;
    case "bankBuy":
    case "bankSell":
      ids.push(`${move.type}:${move.material}`);
      break;
    case "civicCalm":
      ids.push(`calm:${move.payment}`);
      break;
    case "promotePop":
      ids.push(`promote:${move.from}`);
      break;
    case "demotePop":
      ids.push(`demote:${move.from}`);
      break;
    case "growPop":
      ids.push(`grow:${move.pop}`);
      break;
    case "resolveHunger":
      for (const { pop } of move.leave) ids.push(`hunger:${pop}`);
      break;
    case "assemblyBribe":
      ids.push(`votes:${move.payment}`);
      break;
    case "assemblyDraw":
      ids.push(`politician:${move.politician}`);
      break;
    case "buyRiotInsurance":
      ids.push(`insurance:${move.optionId}`);
      break;
    case "resolveEvent": {
      const card = before?.pendingPlayerEvent?.card ?? G.lastPlayerEvent;
      if (card) ids.push(`playerResolve:${card.id}`);
      break;
    }
    case "assemblyPropose": {
      const proposal = G.assembly?.proposals[player];
      if (proposal?.kind === "enact") ids.push(`${proposal.card.kind}Proposed:${proposal.card.id}`);
      break;
    }
  }
  return ids;
}
