import type { HexTile, PopType, Pops, Resources, Settlement } from "../../game/types";

// The two-panel split (docs/feat/two-panel.md): the LEFT rail is what you *act on*,
// the RIGHT rail is what you *consult*. Two tab families, one shared label lookup.
export type LedgerTab = "cities" | "buildings" | "pops" | "market";
export type ConsultTab = "chronicle" | "codex" | "victory" | "agora";
export type EmpireTab = LedgerTab | ConsultTab;

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
