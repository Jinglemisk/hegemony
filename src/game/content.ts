import {
  BUILDINGS,
  EXPEDITION_TABLES,
  OMEN_TABLE,
  PLAYER_EVENT_CARDS,
  RIOT_TABLE,
  SEASONAL_EVENT_CARDS,
  TERRAIN_DECK,
} from "./data";
import type { BuildingDefinition, BuildingId, EventCard, EventTableDefinition } from "./types";

/**
 * The content-override seam. The engine's "what exists" tables — {@link BUILDINGS}
 * and the {@link TERRAIN_DECK} — are otherwise module constants read directly by the
 * rules code. Reading them through these accessors instead lets a DEV tuning session
 * swap in patched content (a Villa that yields +3, a richer breadbasket) WITHOUT
 * editing source, exactly as a game mode swaps in a patched {@link Ruleset}.
 *
 * The override is null by default, so `getBuildings()`/`getTerrainDeck()` return the
 * authored constants and every test / sim / production build behaves identically.
 * Browser tuning and headless simulation install a package before creating a game. The
 * package stays fixed for that run, keeping the rules engine deterministic just as a
 * plain constant would.
 */

export type TerrainDeck = typeof TERRAIN_DECK;

export interface GameContent {
  buildings: BuildingDefinition[];
  terrain: TerrainDeck;
  seasonalEvents: EventCard[];
  playerEvents: EventCard[];
  riotTable: EventTableDefinition;
  expeditionTables: EventTableDefinition[];
  omenTable: EventTableDefinition;
}

const AUTHORED_CONTENT: GameContent = {
  buildings: BUILDINGS,
  terrain: TERRAIN_DECK,
  seasonalEvents: SEASONAL_EVENT_CARDS,
  playerEvents: PLAYER_EVENT_CARDS,
  riotTable: RIOT_TABLE,
  expeditionTables: EXPEDITION_TABLES,
  omenTable: OMEN_TABLE,
};

let activeContent: GameContent = AUTHORED_CONTENT;

/** Authored source package. Presets must clone it before making changes. */
export function getAuthoredGameContent(): GameContent {
  return AUTHORED_CONTENT;
}

/** The complete content package currently installed for fresh games. */
export function getGameContent(): GameContent {
  return activeContent;
}

/** Install one fixed package, or restore every authored content family with null. */
export function installGameContent(content: GameContent | null): void {
  activeContent = content ?? AUTHORED_CONTENT;
}

/** The building roster in effect — the dev override if one is set, else the authored {@link BUILDINGS}. */
export function getBuildings(): BuildingDefinition[] {
  return activeContent.buildings;
}

/** Resolve one building from the effective roster, including a dev-tuned override. */
export function getBuilding(buildingId: BuildingId): BuildingDefinition | undefined {
  return getBuildings().find((building) => building.id === buildingId);
}

/** The terrain deck in effect — the dev override if one is set, else the authored {@link TERRAIN_DECK}. */
export function getTerrainDeck(): TerrainDeck {
  return activeContent.terrain;
}

export function getSeasonalEventCards(): EventCard[] {
  return activeContent.seasonalEvents;
}

export function getPlayerEventCards(): EventCard[] {
  return activeContent.playerEvents;
}

export function getRiotTable(): EventTableDefinition {
  return activeContent.riotTable;
}

export function getExpeditionTables(): EventTableDefinition[] {
  return activeContent.expeditionTables;
}

export function getOmenTable(): EventTableDefinition {
  return activeContent.omenTable;
}

/**
 * DEV-ONLY. Install (or clear, with null) content overrides for the next game created.
 * A missing key leaves that override untouched; an explicit null clears it back to the
 * authored constant. Call before {@link createGame}; do not mutate mid-game.
 */
export function setContentOverrides(overrides: {
  buildings?: BuildingDefinition[] | null;
  terrain?: TerrainDeck | null;
  seasonalEvents?: EventCard[] | null;
  playerEvents?: EventCard[] | null;
  riotTable?: EventTableDefinition | null;
  expeditionTables?: EventTableDefinition[] | null;
  omenTable?: EventTableDefinition | null;
}): void {
  activeContent = {
    ...activeContent,
    ...(Object.hasOwn(overrides, "buildings")
      ? { buildings: overrides.buildings ?? AUTHORED_CONTENT.buildings }
      : {}),
    ...(Object.hasOwn(overrides, "terrain")
      ? { terrain: overrides.terrain ?? AUTHORED_CONTENT.terrain }
      : {}),
    ...(Object.hasOwn(overrides, "seasonalEvents")
      ? { seasonalEvents: overrides.seasonalEvents ?? AUTHORED_CONTENT.seasonalEvents }
      : {}),
    ...(Object.hasOwn(overrides, "playerEvents")
      ? { playerEvents: overrides.playerEvents ?? AUTHORED_CONTENT.playerEvents }
      : {}),
    ...(Object.hasOwn(overrides, "riotTable")
      ? { riotTable: overrides.riotTable ?? AUTHORED_CONTENT.riotTable }
      : {}),
    ...(Object.hasOwn(overrides, "expeditionTables")
      ? { expeditionTables: overrides.expeditionTables ?? AUTHORED_CONTENT.expeditionTables }
      : {}),
    ...(Object.hasOwn(overrides, "omenTable")
      ? { omenTable: overrides.omenTable ?? AUTHORED_CONTENT.omenTable }
      : {}),
  };
}
