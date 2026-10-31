import type { HexTile, PopType, Pops, Resources, Settlement } from "../../game/types";

// The realm sheet's pages, which you act on, and the consult sheet's, which you read.
export type LedgerTab = "cities" | "ladder" | "build";
export type ConsultTab = "codex" | "victory" | "agora" | "costs";

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
