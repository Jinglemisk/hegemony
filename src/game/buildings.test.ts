import { describe, expect, it } from "vitest";

import { buildBuilding, collectIncome, movePops, upgradeColonyToCity } from "./actions";
import { dole } from "./bank";
import { calculateIncome, settlementNetYield } from "./economy/income";
import { BANKED_HAPPINESS, happinessContributions } from "./happiness";
import { collectInvariantViolations } from "./invariants";
import { enumerateLegalCommands } from "./legalMoves";
import { claimableLuxuriesAt } from "./luxury";
import { isCoastalTile } from "./map";
import { playerPieces } from "./settlement";
import {
  buildingGround,
  getBuildBuildingStatus,
  getFoundColonyStatus,
  getMovePopsStatus,
  getUpgradeColonyToCityStatus,
} from "./status";
import { owned, scenario, tile } from "./testing/scenario";
import { TEST_OPENING_SETUP } from "./config";
import type { HegemonyState } from "./types";

// v2 buildings and prices (migration Step 4): six buildings, one of each per
// settlement; a piece supply; the paid pop move; the Dole; happiness as named terms.

const NONE = { citizens: 0, freemen: 0, slaves: 0 };
const P0_CAPITAL = TEST_OPENING_SETUP[0].capital.tileId;
const P0_COLONY = TEST_OPENING_SETUP[0].colony.tileId;
/** Classic board: a three-slot forest, a three-slot hill, the seven-slot breadbasket. */
const FOREST = "-3,0";
const HILL = "-2,3";
const BREADBASKET = "1,0";

const gameplay = (draft: HegemonyState) => {
  draft.phase = "gameplay";
  draft.pendingPlayerEvent = null;
};

describe("class buildings", () => {
  it("an Estate doubles the slaves at work, at the cost of the slot it stands on", () => {
    const G = scenario()
      .withSettlement("0", FOREST, "city", { citizens: 0, freemen: 0, slaves: 3 })
      .withResources("0", "wealthy")
      .mutate(gameplay)
      .build();
    const forest = tile(G, FOREST);
    const city = owned(G, FOREST, "0");

    expect(settlementNetYield(forest, city, G.ruleset).wood).toBe(3);
    expect(buildBuilding(G, "0", FOREST, "estate").ok).toBe(true);
    // Three slots, one under the Estate: two slaves work and make 2 each; one is idle.
    expect(settlementNetYield(forest, city, G.ruleset).wood).toBe(4);
  });

  it("an Estate cannot stand on a hill, where slaves make nothing", () => {
    const G = scenario()
      .withSettlement("0", HILL, "city", { citizens: 0, freemen: 0, slaves: 2 })
      .withResources("0", "wealthy")
      .mutate(gameplay)
      .build();

    expect(getBuildBuildingStatus(G, "0", HILL, "estate").can).toBe(false);
    expect(getBuildBuildingStatus(G, "0", HILL, "temple").can).toBe(true);
  });

  it("allows one of each per settlement", () => {
    const G = scenario()
      .withSettlement("0", BREADBASKET, "city", NONE)
      .withResources("0", "wealthy")
      .mutate(gameplay)
      .build();

    expect(buildBuilding(G, "0", BREADBASKET, "granary").ok).toBe(true);
    expect(getBuildBuildingStatus(G, "0", BREADBASKET, "granary").reasons).toContain(
      "Granary is already built here.",
    );
    expect(calculateIncome(G, "0").food).toBe(2);
  });
});

describe("colonies", () => {
  it("raise nothing but a Port, and only where a luxury can be claimed", () => {
    const base = scenario().build();
    const mooring = base.board.tiles.find(
      (candidate) =>
        isCoastalTile(candidate, base.board.tiles) &&
        claimableLuxuriesAt(base, candidate.id).length,
    )!;
    const G = scenario()
      .withSettlement("0", mooring.id, "colony", { citizens: 0, freemen: 1, slaves: 1 })
      .withResources("0", "wealthy")
      .mutate(gameplay)
      .build();

    expect(getBuildBuildingStatus(G, "0", mooring.id, "granary").reasons).toContain(
      "A colony raises nothing but a Port.",
    );
    // Its ground is the one Port, whether or not the price is in hand.
    expect(buildingGround(G, "0", mooring.id)).toMatchObject({ slots: 1, built: 0, open: 1 });

    const claim = claimableLuxuriesAt(G, mooring.id)[0];
    expect(buildBuilding(G, "0", mooring.id, "port", claim.vertexId).ok).toBe(true);
    expect(G.board.luxuries.find((asset) => asset.id === claim.id)?.owner).toBe("0");
    expect(buildingGround(G, "0", mooring.id)).toMatchObject({ slots: 1, built: 1, open: 0 });
  });
});

describe("the piece supply", () => {
  const colonySites = ["-3,0", "-3,1", "-3,2", "-3,3"];

  it("stops founding at four colonies and frees a piece on an upgrade", () => {
    let builder = scenario().withSettlement("0", "0,0", "city", {
      citizens: 1,
      freemen: 2,
      slaves: 1,
    });
    for (const site of colonySites) {
      builder = builder.withSettlement("0", site, "colony", { citizens: 0, freemen: 0, slaves: 1 });
    }
    const G = builder.withResources("0", "wealthy").mutate(gameplay).build();

    expect(playerPieces(G, "0")).toMatchObject({ colonies: 4, cities: 0 });
    expect(getFoundColonyStatus(G, "0", "-2,-1").reasons.join(" ")).toMatch(/colony pieces/);
    expect(enumerateLegalCommands(G, "0").some((move) => move.type === "foundColony")).toBe(false);

    expect(upgradeColonyToCity(G, "0", "-3,3").ok).toBe(true);

    expect(playerPieces(G, "0")).toMatchObject({ colonies: 3, cities: 1 });
    expect(getFoundColonyStatus(G, "0", "-2,-1").reasons.join(" ")).not.toMatch(/colony pieces/);
  });

  it("stops upgrading at three cities, the capital not counted", () => {
    const G = scenario()
      .withSettlement("0", "0,0", "city", { citizens: 1, freemen: 2, slaves: 1 })
      .withSettlement("0", "-3,0", "city", NONE)
      .withSettlement("0", "3,-3", "city", NONE)
      .withSettlement("0", "0,3", "city", NONE)
      .withSettlement("0", "3,0", "colony", { citizens: 0, freemen: 0, slaves: 1 })
      .withResources("0", "wealthy")
      .mutate(gameplay)
      .build();

    expect(playerPieces(G, "0")).toMatchObject({ colonies: 1, cities: 3 });
    expect(getUpgradeColonyToCityStatus(G, "0", "3,0").reasons.join(" ")).toMatch(/city pieces/);
    expect(collectInvariantViolations(G).map((violation) => violation.code)).not.toContain(
      "pieces.cities",
    );
  });

  it("is an invariant: a fifth colony is a broken state", () => {
    let builder = scenario().withSettlement("0", "0,0", "city", NONE);
    for (const site of [...colonySites, "3,0"]) {
      builder = builder.withSettlement("0", site, "colony", NONE);
    }

    expect(
      collectInvariantViolations(builder.build()).map((violation) => violation.code),
    ).toContain("pieces.colonies");
  });
});

describe("the paid pop move", () => {
  const one = { citizens: 0, freemen: 1, slaves: 0 };

  it("costs 1 food a pop, once a turn", () => {
    const G = scenario()
      .opening()
      .mutate(gameplay)
      .setPops("0", P0_CAPITAL, { citizens: 1, freemen: 3, slaves: 0 })
      .withResources("0", { food: 5 })
      .build();

    expect(movePops(G, "0", P0_CAPITAL, P0_COLONY, { citizens: 0, freemen: 2, slaves: 0 }).ok).toBe(
      true,
    );
    expect(G.players["0"].resources.food).toBe(3);
    expect(getMovePopsStatus(G, "0", P0_CAPITAL, P0_COLONY, one).reasons).toContain(
      "One move per turn.",
    );
  });

  it("stops at the target's capacity, counting pops already on their way", () => {
    const G = scenario()
      .opening()
      .mutate(gameplay)
      .setPops("0", P0_CAPITAL, { citizens: 1, freemen: 3, slaves: 0 })
      .setPops("0", P0_COLONY, { citizens: 0, freemen: 0, slaves: 3 })
      .withResources("0", { food: 5 })
      .build();

    // A colony holds four: one more fits, two do not.
    expect(getMovePopsStatus(G, "0", P0_CAPITAL, P0_COLONY, one).can).toBe(true);
    expect(
      getMovePopsStatus(G, "0", P0_CAPITAL, P0_COLONY, { citizens: 0, freemen: 2, slaves: 0 })
        .reasons,
    ).toContain("The target has no room for them.");
  });
});

describe("the Dole", () => {
  it("buys 1 food with 3 influence, and is offered only when affordable", () => {
    const G = scenario()
      .opening()
      .mutate(gameplay)
      .withResources("0", { influence: 4, food: 0 })
      .build();

    expect(enumerateLegalCommands(G, "0").some((move) => move.type === "dole")).toBe(true);
    expect(dole(G, "0").ok).toBe(true);
    expect(G.players["0"].resources).toMatchObject({ influence: 1, food: 1 });
    expect(enumerateLegalCommands(G, "0").some((move) => move.type === "dole")).toBe(false);
  });
});

describe("happiness as named terms", () => {
  it("counts Temples, luxuries, slaves and calm, and banks only Temples and slaves", () => {
    const G = scenario()
      .withSettlement("0", FOREST, "city", { citizens: 0, freemen: 0, slaves: 5 })
      .withResources("0", { food: 0 })
      .mutate(gameplay)
      .mutate((draft) => {
        owned(draft, FOREST, "0").buildings.push("temple");
        draft.board.luxuries[0].owner = "0";
        draft.board.luxuries[0].claimedAtSettlementId = owned(draft, FOREST, "0").id;
        draft.players["0"].calmActive = true;
      })
      .build();

    const terms = Object.fromEntries(
      happinessContributions(G, "0").map((term) => [term.id, term.amount]),
    );
    // One Temple, one luxury at +2, five slaves at 1 per two, calm at +2.
    expect(terms).toEqual({ temples: 1, luxuries: 2, slaves: -2, calm: 2 });

    const banked = happinessContributions(G, "0")
      .filter((term) => BANKED_HAPPINESS.includes(term.id))
      .reduce((sum, term) => sum + term.amount, 0);
    expect(calculateIncome(G, "0").happiness).toBe(banked);

    expect(collectIncome(G, "0").ok).toBe(true);
    expect(G.players["0"].resources.happiness).toBe(-1);
  });
});
