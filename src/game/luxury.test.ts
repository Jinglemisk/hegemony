import { describe, expect, it } from "vitest";

import { buildBuilding } from "./actions";
import { collectInvariantViolations } from "./invariants";
import { happinessLevel, standingHappiness } from "./happiness";
import {
  activeClaims,
  claimableLuxuriesAt,
  luxuryHappinessBonus,
  ownedClaims,
  transferLuxury,
} from "./luxury";
import { isCoastalTile } from "./map";
import { getBuildBuildingStatus } from "./status";
import { beginTurnFor, createGame } from "./turn";
import { applyUnrestAtTurnEnd, unrestStatus } from "./unrest";
import { victoryMetricValue } from "./victory";
import type { HegemonyState, LuxuryAsset, PlayerId } from "./types";

// The scripted two-city opening: every player starts gameplay with a capital and a
// second city already placed, which is what a Port needs (a non-colony settlement).
const SEED = 0xa171c;
const preloadedGame = (seed: number) => createGame(seed, undefined, "classic", true);

/** Move an existing city onto a chosen coastal tile so a Port is placeable there.
 *  Rigging position is fine — the claim rules under test don't depend on how the
 *  city got there. */
function rigCityOnTile(G: HegemonyState, playerID: PlayerId, tileId: string) {
  const fromTileId = G.players[playerID].settlements.find((owned) => {
    const tile = G.board.tiles.find((candidate) => candidate.id === owned);
    return tile?.settlements.some(
      (settlement) => settlement.owner === playerID && settlement.kind !== "colony",
    );
  });
  const fromTile = G.board.tiles.find((candidate) => candidate.id === fromTileId);
  const toTile = G.board.tiles.find((candidate) => candidate.id === tileId);
  const settlement = fromTile?.settlements.find(
    (candidate) => candidate.owner === playerID && candidate.kind !== "colony",
  );
  if (!fromTile || !toTile || !settlement || !fromTileId) throw new Error("cannot rig city");

  fromTile.settlements = fromTile.settlements.filter((candidate) => candidate !== settlement);
  settlement.tileId = toTile.id;
  toTile.settlements.push(settlement);
  G.players[playerID].settlements = G.players[playerID].settlements.map((owned) =>
    owned === fromTileId ? tileId : owned,
  );
}

function fund(G: HegemonyState, playerID: PlayerId) {
  Object.assign(G.players[playerID].resources, { wood: 99, stone: 99, gold: 99 });
}

/** A game rigged so player 0's city sits on one of the first asset's claim tiles. */
function gameWithPortSite(): { G: HegemonyState; asset: LuxuryAsset; tileId: string } {
  const G = preloadedGame(SEED);
  // The scripted opening can leave a pending player event; the claim rules under
  // test sit behind that gate, so clear it.
  G.pendingPlayerEvent = null;
  const asset = G.board.luxuries[0];
  const tileId = asset.tileIds[0];
  rigCityOnTile(G, "0", tileId);
  fund(G, "0");
  return { G, asset, tileId };
}

describe("the luxury registry", () => {
  it("seats six unique unclaimed goods on eligible shared vertices at creation", () => {
    const G = preloadedGame(SEED);

    expect(G.board.luxuries).toHaveLength(6);
    expect(new Set(G.board.luxuries.map((asset) => asset.goodId)).size).toBe(6);
    expect(new Set(G.board.luxuries.map((asset) => asset.vertexId)).size).toBe(6);

    for (const asset of G.board.luxuries) {
      expect(asset.owner).toBeNull();
      expect(asset.claimedAtSettlementId).toBeNull();
      expect(asset.suppressedTurns).toBe(0);
      for (const tileId of asset.tileIds) {
        const tile = G.board.tiles.find((candidate) => candidate.id === tileId);
        expect(tile).toBeDefined();
        expect(isCoastalTile(tile!, G.board.tiles)).toBe(true);
      }
    }

    expect(collectInvariantViolations(G)).toEqual([]);
  });
});

describe("the Port and the claim", () => {
  it("is unbuildable inland, with the authoritative reason", () => {
    const G = preloadedGame(SEED);
    const inland = G.board.tiles.find(
      (tile) =>
        !isCoastalTile(tile, G.board.tiles) &&
        tile.settlements.some(
          (settlement) => settlement.owner === "0" && settlement.kind !== "colony",
        ),
    );
    // The scripted opening may not give player 0 an inland city on every seed;
    // rig one if needed.
    if (!inland) {
      const target = G.board.tiles.find(
        (tile) => !isCoastalTile(tile, G.board.tiles) && tile.settlements.length === 0,
      )!;
      rigCityOnTile(G, "0", target.id);
      fund(G, "0");
      const status = getBuildBuildingStatus(G, "0", target.id, "port");
      expect(status.can).toBe(false);
      expect(status.reasons.join(" ")).toMatch(/inland/);
      return;
    }
    fund(G, "0");
    const status = getBuildBuildingStatus(G, "0", inland.id, "port");
    expect(status.can).toBe(false);
    expect(status.reasons.join(" ")).toMatch(/inland/);
  });

  it("is unbuildable on a coast with no unclaimed good adjacent, with a reason", () => {
    const G = preloadedGame(SEED);
    const luxuryTiles = new Set(G.board.luxuries.flatMap((asset) => asset.tileIds));
    const bareCoast = G.board.tiles.find(
      (tile) =>
        isCoastalTile(tile, G.board.tiles) &&
        !luxuryTiles.has(tile.id) &&
        tile.settlements.length === 0 &&
        tile.terrain !== "oracle",
    )!;
    rigCityOnTile(G, "0", bareCoast.id);
    fund(G, "0");

    const status = getBuildBuildingStatus(G, "0", bareCoast.id, "port");
    expect(status.can).toBe(false);
    expect(status.reasons.join(" ")).toMatch(/No unclaimed luxury/);
  });

  it("claims the adjacent good through the ownership seam — first Port wins", () => {
    const { G, asset, tileId } = gameWithPortSite();

    const result = buildBuilding(G, "0", tileId, "port");
    expect(result.ok).toBe(true);
    expect(asset.owner).toBe("0");
    expect(asset.claimedAtSettlementId).toBeTruthy();
    expect(ownedClaims(G, "0").map((claim) => claim.id)).toContain(asset.id);

    // The rival's Port on the OTHER adjacent tile now has nothing to claim there.
    const rivalTile = asset.tileIds[1];
    rigCityOnTile(G, "1", rivalTile);
    fund(G, "1");
    expect(claimableLuxuriesAt(G, rivalTile).map((claim) => claim.id)).not.toContain(asset.id);

    expect(collectInvariantViolations(G)).toEqual([]);
  });

  it("refuses a second claim on a claimed good", () => {
    const { G, asset } = gameWithPortSite();
    expect(transferLuxury(G, asset.id, "0").ok).toBe(true);
    asset.claimedAtSettlementId = "settlement-rigged";

    const rivalTile = asset.tileIds[1];
    rigCityOnTile(G, "1", rivalTile);
    fund(G, "1");
    const status = getBuildBuildingStatus(G, "1", rivalTile, "port", asset.vertexId);
    expect(status.can).toBe(false);
  });

  it("raises the level by the good's worth the moment it is claimed", () => {
    const { G, tileId } = gameWithPortSite();
    const before = happinessLevel(G, "0");

    expect(buildBuilding(G, "0", tileId, "port").ok).toBe(true);
    expect(luxuryHappinessBonus(G, "0")).toBe(G.ruleset.economy.luxury.happinessPerGood);
    expect(happinessLevel(G, "0")).toBe(before + G.ruleset.economy.luxury.happinessPerGood);
  });

  it("trade changes only the owner; the claim origin still names the first Port", () => {
    const { G, asset, tileId } = gameWithPortSite();
    expect(buildBuilding(G, "0", tileId, "port").ok).toBe(true);
    const origin = asset.claimedAtSettlementId;

    expect(transferLuxury(G, asset.id, "2").ok).toBe(true);
    expect(asset.owner).toBe("2");
    expect(asset.claimedAtSettlementId).toBe(origin);
  });
});

describe("activity and suppression", () => {
  function grantGoods(G: HegemonyState, playerID: PlayerId, count: number) {
    for (const asset of G.board.luxuries.slice(0, count)) {
      asset.owner = playerID;
      asset.claimedAtSettlementId = "settlement-rigged";
    }
  }

  it("counts every good a player holds: there is no cap", () => {
    const G = preloadedGame(SEED);
    grantGoods(G, "0", 5);

    expect(ownedClaims(G, "0")).toHaveLength(5);
    expect(activeClaims(G, "0")).toHaveLength(5);
    expect(luxuryHappinessBonus(G, "0")).toBe(5 * G.ruleset.economy.luxury.happinessPerGood);
  });

  it("suppression expires at turn start, before the turn-end check", () => {
    const G = preloadedGame(SEED);
    grantGoods(G, "0", 1);
    const asset = ownedClaims(G, "0")[0];

    expect(luxuryHappinessBonus(G, "0")).toBe(2);
    asset.suppressedTurns = 1;
    expect(luxuryHappinessBonus(G, "0")).toBe(0);
    expect(activeClaims(G, "0")).toHaveLength(0);

    beginTurnFor(G, "0");

    expect(asset.suppressedTurns).toBe(0);
    expect(luxuryHappinessBonus(G, "0")).toBe(2);
  });
});

describe("luxuries in the level", () => {
  function grant(G: HegemonyState, count: number) {
    for (const asset of G.board.luxuries.slice(0, count)) {
      asset.owner = "0";
      asset.claimedAtSettlementId = "settlement-rigged";
    }
  }

  it("hold a realm above the riot line, and losing them drops it back", () => {
    const G = preloadedGame(SEED);
    grant(G, 2);
    // Enough tokens to riot without the goods' +4.
    G.players["0"].unrestTokens = standingHappiness(G, "0") - 1;
    expect(happinessLevel(G, "0")).toBe(1);

    applyUnrestAtTurnEnd(G, "0");
    expect(G.pendingRiot).toBeNull();

    // Strip the goods: the same board now riots.
    for (const asset of G.board.luxuries) {
      asset.owner = null;
      asset.claimedAtSettlementId = null;
    }
    expect(happinessLevel(G, "0")).toBe(-3);
    applyUnrestAtTurnEnd(G, "0");
    expect(G.pendingRiot).toMatchObject({ playerID: "0" });
  });

  it("feed the Beloved metric", () => {
    const G = preloadedGame(SEED);
    const before = victoryMetricValue(G, "0", "happiness");
    grant(G, 1);

    expect(victoryMetricValue(G, "0", "happiness")).toBe(before + 2);
  });

  it("show in the unrest status beside the level they are part of", () => {
    const G = preloadedGame(SEED);
    grant(G, 1);
    const tokens = standingHappiness(G, "0") + 2;
    G.players["0"].unrestTokens = tokens;

    const status = unrestStatus(G, "0");
    expect(status.luxuryBonus).toBe(2);
    expect(status.tokens).toBe(tokens);
    expect(status.happiness).toBe(-2);
    // Without the good the level would sit below the riot line.
    expect(status.tier).toBe("discontent");
  });
});
