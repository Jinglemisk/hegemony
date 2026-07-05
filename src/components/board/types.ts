import type { HexTile, PopType, Resources, Settlement } from "../../game/types";

export type EmpireTab = "cities" | "buildings" | "pops";

export type OwnedHolding = {
  tile: HexTile;
  settlement: Settlement;
};

export type PopEconomy = Record<PopType, Resources>;
