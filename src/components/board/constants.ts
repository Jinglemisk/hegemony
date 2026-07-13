import { PLAYER_NAMES } from "../../game/data";
import type { BuildingId, PopType, SettlementKind } from "../../game/types";

export const PLAYER_DISPLAY_NAMES = PLAYER_NAMES;

export const SETTLEMENT_SORT: Record<SettlementKind, number> = {
  capital: 1,
  city: 1,
  colony: 2
};

export const BUILDING_AFFINITY: Record<BuildingId, PopType> = {
  marketplace: "freemen",
  temple: "citizens",
  workshop: "slaves",
  granary: "citizens",
  forum: "citizens",
  aqueduct: "freemen",
  odeon: "citizens"
};

export const DETAIL_TOOLTIP_WIDTH = 260;
