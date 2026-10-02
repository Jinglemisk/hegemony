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

/** The player's active goods: owned and unsuppressed. There is no cap on how many. */
export function activeClaims(G: HegemonyState, playerID: PlayerId): LuxuryAsset[] {
  return ownedClaims(G, playerID).filter((asset) => asset.suppressedTurns === 0);
}

/** The luxury term of the level: every active good adds `happinessPerGood`. */
export function luxuryHappinessBonus(G: HegemonyState, playerID: PlayerId): number {
  return activeClaims(G, playerID).length * G.ruleset.economy.luxury.happinessPerGood;
}

/** The unclaimed goods a Port in a settlement on `tileId` could seize. */
export function claimableLuxuriesAt(G: HegemonyState, tileId: string): LuxuryAsset[] {
  return G.board.luxuries.filter((asset) => asset.owner === null && asset.tileIds.includes(tileId));
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
