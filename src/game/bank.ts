import { addLog, getPlayerName } from "./core/query";
import { MOVE_OK, invalid } from "./core/results";
import type { ActionStatus, MoveResult } from "./core/results";
import type { BankRules } from "./ruleset";
import type { BankRates, HegemonyState, HexTile, PlayerId, TradableMaterial } from "./types";

/**
 * The bank exchange (roadmap-appendix D6/Q14): a gold-mediated static market. Sell
 * `sell` of a material for 1 gold; buy 1 of a material for `buy` gold. Never direct
 * barter — gold is the unit of account. Rates are derived ONCE from the board at game
 * creation and never move: the bank is the corridor wall that player trade (Phase 4)
 * will price inside, not a market that drifts.
 *
 * No cap on trades per turn — the round-trip spread is the tax, and every trade
 * shrinks the trader's Treasurer stockpile (both directions destroy net value).
 */

export const TRADABLE_MATERIALS: TradableMaterial[] = ["wood", "stone", "food"];

/**
 * Derive this game's rates from the board (Q14 — the user's call: the tile layout is
 * the supply). `scarcity` classes materials by tile count: the strictly most common
 * sells worse (abundant), the strictly rarest sells better and costs more (scarce),
 * everything else is baseline. One step off baseline, computed once, static all game
 * — Classic always prices the same, each Shuffled board gets its own texture.
 */
export function deriveBankRates(tiles: HexTile[], rules: BankRules): BankRates {
  const uniform: BankRates = {
    wood: { ...rules.baseline },
    stone: { ...rules.baseline },
    food: { ...rules.baseline }
  };

  if (rules.derivation === "uniform") {
    return uniform;
  }

  const counts = TRADABLE_MATERIALS.map(
    (material) => [material, tiles.filter((tile) => tile.resource.type === material).length] as const
  );
  const most = Math.max(...counts.map(([, count]) => count));
  const least = Math.min(...counts.map(([, count]) => count));

  if (most === least) {
    return uniform;
  }

  const rates = uniform;
  for (const [material, count] of counts) {
    if (count === most && counts.filter(([, c]) => c === most).length === 1) {
      rates[material] = { ...rules.abundant };
    } else if (count === least && counts.filter(([, c]) => c === least).length === 1) {
      rates[material] = { ...rules.scarce };
    }
  }

  return rates;
}

export function getBankSellStatus(G: HegemonyState, playerID: PlayerId, material: TradableMaterial): ActionStatus {
  const reasons: string[] = [];
  const rate = G.bank[material];

  if (G.phase !== "gameplay") reasons.push("The bank opens with gameplay.");
  if (G.pendingPlayerEvent || G.pendingRiot) reasons.push("Resolve the pending event first.");
  if (G.players[playerID].resources[material] < rate.sell) {
    reasons.push(`Selling takes ${rate.sell} ${material} for 1 gold.`);
  }

  return { can: reasons.length === 0, reasons, cost: { [material]: rate.sell } };
}

export function getBankBuyStatus(G: HegemonyState, playerID: PlayerId, material: TradableMaterial): ActionStatus {
  const reasons: string[] = [];
  const rate = G.bank[material];

  if (G.phase !== "gameplay") reasons.push("The bank opens with gameplay.");
  if (G.pendingPlayerEvent || G.pendingRiot) reasons.push("Resolve the pending event first.");
  if (G.players[playerID].resources.gold < rate.buy) {
    reasons.push(`Buying 1 ${material} costs ${rate.buy} gold.`);
  }

  return { can: reasons.length === 0, reasons, cost: { gold: rate.buy } };
}

/** Sell `sell`-rate worth of a material for 1 gold. */
export function bankSell(G: HegemonyState, playerID: PlayerId, material: TradableMaterial): MoveResult {
  const status = getBankSellStatus(G, playerID, material);

  if (!status.can) {
    return invalid(...status.reasons);
  }

  const rate = G.bank[material];
  const resources = G.players[playerID].resources;
  resources[material] -= rate.sell;
  resources.gold += 1;
  addLog(G, `${getPlayerName(G, playerID)} sold ${rate.sell} ${material} to the bank for 1 gold.`);
  return MOVE_OK;
}

/** Buy 1 of a material for its `buy`-rate in gold. */
export function bankBuy(G: HegemonyState, playerID: PlayerId, material: TradableMaterial): MoveResult {
  const status = getBankBuyStatus(G, playerID, material);

  if (!status.can) {
    return invalid(...status.reasons);
  }

  const rate = G.bank[material];
  const resources = G.players[playerID].resources;
  resources.gold -= rate.buy;
  resources[material] += 1;
  addLog(G, `${getPlayerName(G, playerID)} bought 1 ${material} from the bank for ${rate.buy} gold.`);
  return MOVE_OK;
}
