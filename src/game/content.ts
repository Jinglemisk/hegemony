import {
  BUILDINGS,
  EXPEDITION_TABLES,
  LUXURY_GOODS,
  PLAYER_EVENT_CARDS,
  RIOT_TABLE,
  YEAR_CARDS,
  TERRAIN_DECK,
} from "./data";
import { RESOLUTION_CARDS } from "./assembly/deck";
import type { ResolutionCard } from "./assembly/types";
import type {
  BuildingDefinition,
  BuildingId,
  EventCard,
  EventTableDefinition,
  LuxuryGoodDefinition,
  LuxuryGoodId,
  YearCard,
} from "./types";

export type TerrainDeck = typeof TERRAIN_DECK;

export interface GameContent {
  buildings: BuildingDefinition[];
  terrain: TerrainDeck;
  yearCards: YearCard[];
  playerEvents: EventCard[];
  riotTable: EventTableDefinition;
  expeditionTables: EventTableDefinition[];
  resolutions: ResolutionCard[];
  luxuryGoods: LuxuryGoodDefinition[];
}

const AUTHORED_CONTENT: GameContent = {
  buildings: BUILDINGS,
  terrain: TERRAIN_DECK,
  yearCards: YEAR_CARDS,
  playerEvents: PLAYER_EVENT_CARDS,
  riotTable: RIOT_TABLE,
  expeditionTables: EXPEDITION_TABLES,
  resolutions: RESOLUTION_CARDS,
  luxuryGoods: LUXURY_GOODS,
};

/** Authored source package. Presets must clone it before making changes. */
export function getAuthoredGameContent(): GameContent {
  return AUTHORED_CONTENT;
}

/** Pure content selectors. Callers must supply the match's pinned content package. */
export function getBuildings(content: GameContent): BuildingDefinition[] {
  return content.buildings;
}

export function getBuilding(
  content: GameContent,
  buildingId: BuildingId,
): BuildingDefinition | undefined {
  return content.buildings.find((building) => building.id === buildingId);
}

export function getTerrainDeck(content: GameContent): TerrainDeck {
  return content.terrain;
}

export function getYearCards(content: GameContent): YearCard[] {
  return content.yearCards;
}

export function getPlayerEventCards(content: GameContent): EventCard[] {
  return content.playerEvents;
}

export function getRiotTable(content: GameContent): EventTableDefinition {
  return content.riotTable;
}

export function getExpeditionTables(content: GameContent): EventTableDefinition[] {
  return content.expeditionTables;
}

export function getResolutionCards(content: GameContent): ResolutionCard[] {
  return content.resolutions;
}

export function getResolutionCard(content: GameContent, cardId: string): ResolutionCard | null {
  return content.resolutions.find((card) => card.id === cardId) ?? null;
}

export function getLuxuryGoods(content: GameContent): LuxuryGoodDefinition[] {
  return content.luxuryGoods;
}

export function getLuxuryGood(
  content: GameContent,
  goodId: LuxuryGoodId,
): LuxuryGoodDefinition | undefined {
  return content.luxuryGoods.find((good) => good.id === goodId);
}
