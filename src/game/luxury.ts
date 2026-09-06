import { getLuxuryGood, getLuxuryGoods } from "./content";
import type { GameContent } from "./content";
import { allocateEntityId } from "./entity";
import { selectLuxuryVertices } from "./mapTopology";
import type { HegemonyState, HexTile, LuxuryAsset, PlayerId } from "./types";
import type { Ruleset } from "./ruleset";
import { addLog, getPlayerName } from "./core/query";
import type { MoveResult } from "./core/results";
import { MOVE_OK, invalid } from "./core/results";

/**
 * Luxury goods (docs/plans/luxury-goods.md). One module owns every luxury
 * calculation; the unrest thresholds, the Beloved metric, the ledger, the sim's
 * valuation, and every UI surface read these selectors instead of restating them.
 *
 * The load-bearing rule: an asset stores ownership and suppression, NEVER whether
 * it is active. {@link activeClaims} derives activity in one stable ordering from
 * ownership, the per-player cap, and suppression, so no state can contradict it.
 */

/** Seat the authored goods on the board's selected moorings at match creation.
 *  Placement is the same pure selector the map renderer uses, so the registry and
 *  the drawn markers can never disagree about where a good sits. */
export function createLuxuryAssets(
  G: Pick<HegemonyState, "nextEntityId">,
  tiles: readonly HexTile[],
  ruleset: Ruleset,
  content: GameContent,
  seed: number,
): LuxuryAsset[] {
  const goods = getLuxuryGoods(content);
  const vertices = selectLuxuryVertices(tiles, {
    count: Math.min(ruleset.economy.luxury.coastalGoods, goods.length),
    random: ruleset.economy.luxury.randomPlacement,
    seed,
  });

  return vertices.map((vertex, index) => ({
    id: allocateEntityId(G, "luxury"),
    goodId: goods[index].id,
    vertexId: vertex.id,
    tileIds: vertex.tileIds,
    owner: null,
    claimedAtSettlementId: null,
    suppressedTurns: 0,
  }));
}

/** Every asset the player owns, in stable asset-id order. */
export function ownedClaims(G: HegemonyState, playerID: PlayerId): LuxuryAsset[] {
  return G.board.luxuries
    .filter((asset) => asset.owner === playerID)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

/**
 * The player's ACTIVE goods: owned, unsuppressed, within the cap — taken in stable
 * asset-id (claim) order so the same state always yields the same active set.
 * Goods over the cap stay owned-but-inactive: trade assets, not dead weight.
 */
export function activeClaims(G: HegemonyState, playerID: PlayerId): LuxuryAsset[] {
  return ownedClaims(G, playerID)
    .filter((asset) => asset.suppressedTurns === 0)
    .slice(0, Math.max(0, G.ruleset.economy.luxury.activeCapPerPlayer));
}

/** The standing effective-happiness offset (Q43). Never touches the stored bank. */
export function luxuryHappinessBonus(G: HegemonyState, playerID: PlayerId): number {
  return activeClaims(G, playerID).length * G.ruleset.economy.luxury.happinessPerGood;
}

/** stored happiness + the luxury offset — what the riot thresholds and (per Q44)
 *  the Beloved metric actually test. */
export function effectiveHappiness(G: HegemonyState, playerID: PlayerId): number {
  return G.players[playerID].resources.happiness + luxuryHappinessBonus(G, playerID);
}

/** The unclaimed goods a Port in a settlement on `tileId` could seize. */
export function claimableLuxuriesAt(G: HegemonyState, tileId: string): LuxuryAsset[] {
  return G.board.luxuries.filter((asset) => asset.owner === null && asset.tileIds.includes(tileId));
}

/** Cap gate for building a new Port (luxury-goods.md §4.4). */
export function underActiveCap(G: HegemonyState, playerID: PlayerId): boolean {
  return activeClaims(G, playerID).length < G.ruleset.economy.luxury.activeCapPerPlayer;
}

/**
 * The one ownership-transfer seam. The Port's claim uses it today; player trade
 * and denial effects use the same door later, so "one good, one owner" is checked
 * in exactly one place.
 */
export function transferLuxury(G: HegemonyState, assetId: string, newOwner: PlayerId): MoveResult {
  const asset = G.board.luxuries.find((candidate) => candidate.id === assetId);

  if (!asset) {
    return invalid("No such luxury good.");
  }
  if (asset.owner === newOwner) {
    return invalid("Already owned by that player.");
  }

  asset.owner = newOwner;
  return MOVE_OK;
}

/** Tick down denial on the player's goods at their upkeep. Nothing suppresses yet
 *  (Q48 deferred); the lifecycle exists so Directives are additions, not rewrites. */
export function tickLuxurySuppression(G: HegemonyState, playerID: PlayerId) {
  for (const asset of G.board.luxuries) {
    if (asset.owner === playerID && asset.suppressedTurns > 0) {
      asset.suppressedTurns -= 1;

      if (asset.suppressedTurns === 0) {
        const good = getLuxuryGood(G.definition.content, asset.goodId);
        addLog(
          G,
          `${getPlayerName(G, playerID)}'s ${good?.name ?? asset.goodId} trade flows again.`,
          playerID,
        );
      }
    }
  }
}

/** Presentation triple for every surface that shows happiness (a hard requirement:
 *  raw, luxury bonus, and effective are always shown together). */
export interface HappinessBreakdown {
  stored: number;
  luxuryBonus: number;
  effective: number;
}

export function happinessBreakdown(G: HegemonyState, playerID: PlayerId): HappinessBreakdown {
  const stored = G.players[playerID].resources.happiness;
  const luxuryBonus = luxuryHappinessBonus(G, playerID);
  return { stored, luxuryBonus, effective: stored + luxuryBonus };
}
