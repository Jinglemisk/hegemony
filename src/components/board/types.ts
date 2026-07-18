import type { HexTile, PopType, Pops, Resources, Settlement } from "../../game/types";

export type EmpireTab = "cities" | "buildings" | "pops" | "market" | "victory" | "codex";

export type OwnedHolding = {
  tile: HexTile;
  settlement: Settlement;
};

/** A tile the viewer holds, paired with its pops — the row type behind every
 *  source/target picker. */
export type SettlementEntry = {
  tile: HexTile;
  pops: Pops;
};

export type PopEconomy = Record<PopType, Resources>;
