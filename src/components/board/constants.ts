import type { SettlementKind } from "../../game/types";

export const SETTLEMENT_SORT: Record<SettlementKind, number> = {
  capital: 1,
  city: 1,
  colony: 2,
};
