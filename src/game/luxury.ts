import { getBuilding, getLuxuryGood, getLuxuryGoods } from "./content";
import type { GameContent } from "./content";
import { endDealLending, holderOf } from "./deals";
import { allocateEntityId } from "./entity";
import { selectLuxuryVertices } from "./mapTopology";
import type { HegemonyState, HexTile, LuxuryAsset, PlayerId } from "./types";
import type { Ruleset } from "./ruleset";
import { addLog, getOwnedSettlement, getPlayerName, zeroedYearTerm } from "./core/query";
import type { MoveResult } from "./core/results";
import { MOVE_OK, invalid } from "./core/results";

/**
 * Luxury goods (docs/plans/luxury-goods.md). One module owns every luxury
 * calculation; the unrest thresholds, the Beloved metric, the ledger, the sim's
 * valuation, and every UI surface read these selectors instead of restating them.
 *
 * The load-bearing rule: an asset stores ownership and suppression, NEVER whether
 * it is active. {@link activeClaims} derives activity in one stable ordering from
 * ownership and suppression, so no state can contradict it.
 *
 * The Port rule (docs/plans/agency-package.md, ruling 7): a good counts only while its
 * holder has a Port beside it. Ownership carries that: a good is claimed by a new Port,
 * goes in trade only to a seat with a Port beside it, and goes back to the board when its
 * holder's last Port beside it falls, so a held good always has one.
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

const assetIdOrder = new Intl.Collator(undefined, { numeric: true });
/** Every good that counts for the player, in stable asset-id order: its own, but those
 *  it lent out, and those lent to it (deals.ts). */
export function heldClaims(G: HegemonyState, playerID: PlayerId): LuxuryAsset[] {
  return G.board.luxuries
    .filter((asset) => holderOf(G, asset) === playerID)
    .sort((a, b) => assetIdOrder.compare(a.id, b.id));
}

/** The player's active goods: held and unsuppressed. There is no cap on how many. */
export function activeClaims(G: HegemonyState, playerID: PlayerId): LuxuryAsset[] {
  return heldClaims(G, playerID).filter((asset) => asset.suppressedTurns === 0);
}

/** The luxury term of the level: every active good adds `happinessPerGood`, and
 *  none of them counts in a Blockade year. */
export function luxuryHappinessBonus(G: HegemonyState, playerID: PlayerId): number {
  if (zeroedYearTerm(G) === "luxuryHappiness") {
    return 0;
  }

  return activeClaims(G, playerID).length * G.ruleset.economy.luxury.happinessPerGood;
}

/** Every good beside `tileId`, claimed or not: those a Port there stands beside. */
export function luxuriesBeside(G: HegemonyState, tileId: string): LuxuryAsset[] {
  return G.board.luxuries.filter((asset) => asset.tileIds.includes(tileId));
}

/** The unclaimed goods a Port in a settlement on `tileId` could seize. */
export function claimableLuxuriesAt(G: HegemonyState, tileId: string): LuxuryAsset[] {
  return luxuriesBeside(G, tileId).filter((asset) => asset.owner === null);
}

/** Whether `seat` has a Port in a settlement on one of the good's two tiles. */
export function hasPortBeside(G: HegemonyState, seat: PlayerId, asset: LuxuryAsset): boolean {
  return asset.tileIds.some((tileId) =>
    getOwnedSettlement(G, tileId, seat)?.buildings.some(
      (id) => getBuilding(G.definition.content, id)?.claimsLuxury,
    ),
  );
}

export function luxuryName(G: HegemonyState, asset: LuxuryAsset): string {
  return getLuxuryGood(G.definition.content, asset.goodId)?.name ?? asset.goodId;
}

/**
 * The one ownership-transfer seam. The Port's claim, player trade and the Port rule's
 * release all go through it, so "one good, one owner" is checked in exactly one place.
 * A release (`null`) clears the claim origin with the owner, and ends a deal lending it.
 */
export function transferLuxury(
  G: HegemonyState,
  assetId: string,
  newOwner: PlayerId | null,
): MoveResult {
  const asset = G.board.luxuries.find((candidate) => candidate.id === assetId);

  if (!asset) {
    return invalid("No such luxury good.");
  }
  if (asset.owner === newOwner) {
    return invalid("Already owned by that player.");
  }

  asset.owner = newOwner;
  if (newOwner === null) {
    asset.claimedAtSettlementId = null;
    endDealLending(G, asset.id);
  }
  return MOVE_OK;
}

/**
 * The Port rule's release, run wherever a Port of `seat` on `tileId` falls: each good
 * beside that tile the seat holds with no other Port of its own beside it goes back to
 * the board unclaimed. A Port already standing beside a released good does not take it;
 * only a newly built one claims. Off under the comparison switch. Returns the goods
 * released, by name.
 */
export function releaseLuxuriesAfterPortLoss(
  G: HegemonyState,
  seat: PlayerId,
  tileId: string,
): string[] {
  if (!G.ruleset.economy.luxury.needsPort) return [];
  const released: string[] = [];
  for (const asset of luxuriesBeside(G, tileId)) {
    if (asset.owner !== seat || hasPortBeside(G, seat, asset)) continue;
    transferLuxury(G, asset.id, null);
    const name = luxuryName(G, asset);
    addLog(
      G,
      `${name} goes back to the board unclaimed: ${getPlayerName(G, seat)} has no Port beside it.`,
      seat,
    );
    released.push(name);
  }
  return released;
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
