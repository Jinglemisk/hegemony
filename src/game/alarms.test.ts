import { describe, expect, it } from "vitest";
import { realmAlarms } from "./alarms";
import type { RealmAlarm } from "./alarms";
import { scenario } from "./testing/scenario";
import type { HegemonyState, PlayerId } from "./types";

const find = <K extends RealmAlarm["kind"]>(G: HegemonyState, seat: PlayerId, kind: K) =>
  realmAlarms(G, seat).find(
    (alarm): alarm is Extract<RealmAlarm, { kind: K }> => alarm.kind === kind,
  );

describe("the alarms row", () => {
  it("warns of the Assembly in the year before it sits, and not in its own year", () => {
    const G = scenario()
      .withSettlement("0", "-2,0", "city", { citizens: 1, slaves: 0, freemen: 0 })
      .build();
    G.phase = "gameplay";
    G.year = 1;
    expect(find(G, "0", "assemblyNextYear")).toEqual({ kind: "assemblyNextYear", year: 2 });
    G.year = 2;
    expect(find(G, "0", "assemblyNextYear")).toBeUndefined();
  });

  it("names a rival one title short of the race, but not to that rival", () => {
    // Fourteen pops and six citizens: Demos and Civic Elite, two of the three to win.
    const G = scenario()
      .withSettlement("0", "-2,0", "city", { citizens: 1, slaves: 0, freemen: 0 })
      .withSettlement("1", "2,-2", "city", { citizens: 6, slaves: 0, freemen: 2 })
      .withSettlement("1", "2,0", "city", { citizens: 0, slaves: 0, freemen: 6 })
      .build();
    G.phase = "gameplay";
    const short = find(G, "0", "oneTitleShort");
    expect(short?.seats.map((holding) => holding.seat)).toEqual(["1"]);
    expect(short?.seats[0].titles.map((title) => title.card.id).sort()).toEqual([
      "civic-elite",
      "demos",
    ]);
    expect(find(G, "1", "oneTitleShort")).toBeUndefined();
  });

  it("points at a free luxury a Port could claim, ready once the realm can pay", () => {
    const asset = scenario().build().board.luxuries[0];
    const tileId = asset.tileIds[0];
    const G = scenario()
      .withSettlement("0", tileId, "city", { citizens: 1, slaves: 0, freemen: 0 })
      .withResources("0", { gold: 0, stone: 0 })
      .build();
    G.phase = "gameplay";
    expect(find(G, "0", "portClaim")?.sites).toEqual([
      expect.objectContaining({ tileId, affordable: false, luxuries: [asset] }),
    ]);
    Object.assign(G.players["0"].resources, { gold: 4, stone: 2 });
    expect(find(G, "0", "portClaim")?.sites[0].affordable).toBe(true);
    G.board.luxuries.find((candidate) => candidate.id === asset.id)!.owner = "1";
    expect(find(G, "0", "portClaim")).toBeUndefined();
  });
});
