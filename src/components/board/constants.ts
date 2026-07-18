import type { BuildingId, PopType, SettlementKind } from "../../game/types";

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
  odeon: "citizens",
  // Villa enriches the land the slaves work; the Gymnasion manufactures citizens.
  villa: "slaves",
  gymnasion: "citizens"
};

export const DETAIL_TOOLTIP_WIDTH = 260;
