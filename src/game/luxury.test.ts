import { describe, expect, it } from "vitest";

import { buildBuilding } from "./actions";
import { collectInvariantViolations } from "./invariants";
import {
  activeClaims,
  claimableLuxuriesAt,
  effectiveHappiness,
  luxuryHappinessBonus,
  ownedClaims,
  transferLuxury,
} from "./luxury";
import { isCoastalTile } from "./map";
import { getBuildBuildingStatus } from "./status";
import { DEFAULT_RULESET } from "./ruleset";
import { createGame } from "./turn";
import { applyUnrestUpkeep, unrestStatus } from "./unrest";
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

  it("never mutates the stored happiness bank when a good is claimed", () => {
    const { G, tileId } = gameWithPortSite();
    const before = G.players["0"].resources.happiness;

    expect(buildBuilding(G, "0", tileId, "port").ok).toBe(true);
    expect(G.players["0"].resources.happiness).toBe(before);
    expect(luxuryHappinessBonus(G, "0")).toBe(G.ruleset.economy.luxury.happinessPerGood);
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

describe("activity, cap, and suppression", () => {
  function grantGoods(G: HegemonyState, playerID: PlayerId, count: number) {
    for (const asset of G.board.luxuries.slice(0, count)) {
      asset.owner = playerID;
      asset.claimedAtSettlementId = "settlement-rigged";
    }
  }

  it("keeps goods over the active cap owned but inactive, deterministically", () => {
    const G = preloadedGame(SEED);
    const cap = G.ruleset.economy.luxury.activeCapPerPlayer;
    grantGoods(G, "0", cap + 2);

    expect(ownedClaims(G, "0")).toHaveLength(cap + 2);
    const active = activeClaims(G, "0");
    expect(active).toHaveLength(cap);
    // Same state, same active set: stable asset-id order decides, not iteration luck.
    expect(activeClaims(G, "0").map((asset) => asset.id)).toEqual(active.map((asset) => asset.id));
    expect(luxuryHappinessBonus(G, "0")).toBe(cap * G.ruleset.economy.luxury.happinessPerGood);
  });

  it("suppression removes the bonus and expiry at upkeep restores it", () => {
    const G = preloadedGame(SEED);
    grantGoods(G, "0", 1);
    const asset = ownedClaims(G, "0")[0];

    expect(luxuryHappinessBonus(G, "0")).toBe(2);
    asset.suppressedTurns = 1;
    expect(luxuryHappinessBonus(G, "0")).toBe(0);
    expect(activeClaims(G, "0")).toHaveLength(0);

    // Keep the upkeep quiet: no riot, no starvation bookkeeping under grace.
    G.players["0"].hasCollectedGameplayIncome = false;
    G.players["0"].resources.happiness = 0;
    applyUnrestUpkeep(G, "0");

    expect(asset.suppressedTurns).toBe(0);
    expect(luxuryHappinessBonus(G, "0")).toBe(2);
  });
});

describe("effective happiness", () => {
  it("moves the riot threshold: two active goods hold -7 above the -5 line", () => {
    const G = preloadedGame(SEED);
    G.players["0"].hasCollectedGameplayIncome = false;
    G.players["0"].resources.happiness = -7;

    for (const asset of G.board.luxuries.slice(0, 2)) {
      asset.owner = "0";
      asset.claimedAtSettlementId = "settlement-rigged";
    }
    expect(effectiveHappiness(G, "0")).toBe(-3);

    applyUnrestUpkeep(G, "0");
    expect(G.pendingRiot).toBeNull();

    // Strip the goods: the same stored bank now riots.
    for (const asset of G.board.luxuries) {
      asset.owner = null;
      asset.claimedAtSettlementId = null;
    }
    applyUnrestUpkeep(G, "0");
    expect(G.pendingRiot).toMatchObject({ playerID: "0", tier: "unrest" });
  });

  it("feeds the Beloved metric (Q44) — and stops when the dial is off", () => {
    const G = preloadedGame(SEED);
    G.players["0"].resources.happiness = 3;
    G.board.luxuries[0].owner = "0";
    G.board.luxuries[0].claimedAtSettlementId = "settlement-rigged";

    expect(victoryMetricValue(G, "0", "happiness")).toBe(5);

    // The dial is pinned per match, so the off case is a differently-created game.
    const off = structuredClone(DEFAULT_RULESET);
    off.economy.luxury.countsTowardBeloved = false;
    const G2 = createGame(SEED, off, "classic", true);
    G2.players["0"].resources.happiness = 3;
    G2.board.luxuries[0].owner = "0";
    G2.board.luxuries[0].claimedAtSettlementId = "settlement-rigged";
    expect(victoryMetricValue(G2, "0", "happiness")).toBe(3);
  });

  it("shows all three numbers in the unrest status — raw, bonus, effective", () => {
    const G = preloadedGame(SEED);
    G.players["0"].resources.happiness = -6;
    G.board.luxuries[0].owner = "0";
    G.board.luxuries[0].claimedAtSettlementId = "settlement-rigged";

    const status = unrestStatus(G, "0");
    expect(status.storedHappiness).toBe(-6);
    expect(status.luxuryBonus).toBe(2);
    expect(status.happiness).toBe(-4);
    // The tier judges by the effective line, so the offset visibly averts unrest.
    expect(status.tier).toBe("discontent");
  });
});

describe("the bot knows the verb", () => {
  it("enumerates the Port claim explicitly and the master policy takes it", async () => {
    const { masterPolicy } = await import("../sim/policies");
    const { createSimRng } = await import("../sim/rng");
    const { projectForPlayer } = await import("../game/projection");
    const { enumerateLegalCommands } = await import("./legalMoves");

    const { G, asset, tileId } = gameWithPortSite();
    G.currentPlayer = "0";

    const commands = enumerateLegalCommands(G, "0");
    const portCommand = commands.find(
      (command) => command.type === "buildBuilding" && command.buildingId === "port",
    );
    expect(portCommand).toMatchObject({ tileId, claimVertexId: asset.vertexId });

    // The behavioral floor (the Assembly lesson — the verb ships with a bot that
    // uses it): offered the claim against passing, the composed policy builds the
    // Port, and executing its choice through the engine completes the claim.
    // Whether the Port outbids founding yet another colony mid-game is balance,
    // owned by the Phase 4 exit A/Bs — luxuries are late-game infrastructure.
    const { transition } = await import("./legalMoves");
    const endTurn = commands.find((command) => command.type === "endTurn")!;
    const choice = masterPolicy.choose(
      projectForPlayer(G.definition, G, "0"),
      [portCommand!, endTurn],
      createSimRng(7),
    );
    expect(choice).toMatchObject({ type: "buildBuilding", buildingId: "port" });

    const applied = transition(G.definition, G, "0", choice);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      const claimed = applied.state.board.luxuries.find((entry) => entry.id === asset.id);
      expect(claimed?.owner).toBe("0");
    }
  });
});

describe("invariants", () => {
  it("rejects duplicate ownership of one good and an owner without a claim origin", () => {
    const G = preloadedGame(SEED);
    G.board.luxuries[0].owner = "0";

    const violations = collectInvariantViolations(G);
    expect(violations.some((violation) => violation.code === "luxury.origin")).toBe(true);
  });

  it("rejects a duplicated good", () => {
    const G = preloadedGame(SEED);
    G.board.luxuries[1].goodId = G.board.luxuries[0].goodId;

    const violations = collectInvariantViolations(G);
    expect(violations.some((violation) => violation.code === "luxury.unique")).toBe(true);
  });
});
