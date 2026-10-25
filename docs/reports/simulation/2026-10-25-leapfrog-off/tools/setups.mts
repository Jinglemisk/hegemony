// Where each seat's capital and founding colony land, seeds 1000–1039, four master bots,
// shuffled board, no Ideas: the setup only, no game is played. The method of the
// 2026-10-24 rim finding, on main, for any arm in arms.mts.
//   node --import tsx setups.mts <arm> [out.json]
import { writeFileSync } from "node:fs";
import { calculateIncome } from "../../../../../src/game/economy/income";
import { claimableLuxuriesAt } from "../../../../../src/game/luxury";
import { hexDistance, isCoastalTile } from "../../../../../src/game/map";
import { canPlaceColonyOnTile } from "../../../../../src/game/settlement";
import type { PlayerId } from "../../../../../src/game/types";
import { resolvePolicy } from "../../../../../src/sim/policies";
import { createSimRng, deriveBotSeed } from "../../../../../src/sim/rng";
import { buildNewGame } from "../../../../../src/sim/setup";
import { armDefinition } from "./arms.mts";

const arm = process.argv[2] ?? "control";
const out = process.argv[3];
const { definition } = armDefinition(arm);
const policy = resolvePolicy("master");
const SEATS: PlayerId[] = ["0", "1", "2", "3"];

type Seat = Record<string, number | string | boolean>;
const games: { seed: number; seats: Record<string, Seat>; centre: number }[] = [];

for (let i = 0; i < 40; i++) {
  const seed = 1000 + i;
  const G = buildNewGame({
    seed,
    mode: "standard",
    definition,
    opening: "policy",
    boardLayout: "shuffled",
    simRng: createSimRng(deriveBotSeed(seed)),
    policy,
  });
  const tiles = G.board.tiles;
  const byId = new Map(tiles.map((t) => [t.id, t]));
  const seats: Record<string, Seat> = {};
  let closest = { seat: -1, d: 99 };

  for (const seat of SEATS) {
    const [capId, colId] = G.players[seat].settlements;
    const cap = byId.get(capId)!;
    const col = byId.get(colId)!;
    const d = hexDistance(cap, { q: 0, r: 0 });
    if (d < closest.d) closest = { seat: Number(seat), d };
    const income = calculateIncome(G, seat);
    seats[seat] = {
      dist: d,
      coast: isCoastalTile(cap, tiles),
      slots: cap.slots,
      capRes: cap.resource?.type ?? "none",
      free2: tiles.filter(
        (t) => t.settlements.length === 0 && t.terrain !== "oracle" && hexDistance(t, cap) <= 2,
      ).length,
      colDist: hexDistance(col, cap),
      colCoast: isCoastalTile(col, tiles),
      colSlots: col.slots,
      colRes: col.resource?.type ?? "none",
      colCentre: hexDistance(col, { q: 0, r: 0 }),
      // Moorings: unclaimed goods a Port on the capital or the colony could take.
      moorings: claimableLuxuriesAt(G, capId).length + claimableLuxuriesAt(G, colId).length,
      // Tiles the seat may found on at the first gameplay turn (gameplay geometry).
      reach: tiles.filter((t) => canPlaceColonyOnTile(G, seat, t).can).length,
      foodSlots: [cap, col].filter((t) => t.resource?.type === "food").reduce((a, t) => a + t.slots, 0),
      pops: G.players[seat].settlements
        .flatMap((id) => byId.get(id)!.settlements.filter((x) => x.owner === seat))
        .reduce((a, x) => a + x.pops.citizens + x.pops.freemen + x.pops.slaves, 0),
      foodIncome: income.food,
      income: income.wood + income.stone + income.gold + income.food,
    };
  }
  games.push({ seed, seats, centre: closest.seat });
}

const num = (s: Seat, k: string) => (typeof s[k] === "boolean" ? (s[k] ? 1 : 0) : Number(s[k]));
const mean = (seat: string, k: string) =>
  games.reduce((a, g) => a + num(g.seats[seat], k), 0) / games.length;
const f2 = (x: number) => x.toFixed(2);
const pc = (x: number) => `${Math.round(100 * x)}%`;
const share = (seat: string, k: string, v: string) =>
  games.filter((g) => g.seats[seat][k] === v).length;

console.log(`arm ${arm} (${definition.identity.id})`);
console.log(
  "seat | capital from centre | on coast | slots | free land within 2 | colony from capital | colony non-contiguous | colony on coast | moorings | reach at start | food slots held | pops | food income | income",
);
for (const s of SEATS) {
  const nonContig = games.filter((g) => Number(g.seats[s].colDist) > 1).length;
  console.log(
    `  ${s}  | ${f2(mean(s, "dist"))} | ${pc(mean(s, "coast"))} | ${f2(mean(s, "slots"))} | ${f2(mean(s, "free2"))} | ${f2(mean(s, "colDist"))} | ${nonContig} | ${pc(mean(s, "colCoast"))} | ${f2(mean(s, "moorings"))} | ${f2(mean(s, "reach"))} | ${f2(mean(s, "foodSlots"))} | ${f2(mean(s, "pops"))} | ${f2(mean(s, "foodIncome"))} | ${f2(mean(s, "income"))}`,
  );
}
console.log(
  "capital on the rim (distance 3):",
  SEATS.map((s) => games.filter((g) => g.seats[s].dist === 3).length).join(" / "),
);
console.log(
  "capital resource food / wood / stone / gold / none, by seat:",
  SEATS.map((s) => ["food", "wood", "stone", "gold", "none"].map((v) => share(s, "capRes", v)).join("-")).join(" | "),
);
console.log(
  "colony resource food / wood / stone / gold / none, by seat:",
  SEATS.map((s) => ["food", "wood", "stone", "gold", "none"].map((v) => share(s, "colRes", v)).join("-")).join(" | "),
);
console.log(
  "games where the seat's capital is the most central (ties to the lower seat):",
  SEATS.map((s) => games.filter((g) => g.centre === Number(s)).length).join(" / "),
);
console.log(
  "seat 0 capital distance spread:",
  [0, 1, 2, 3].map((d) => `${d}: ${games.filter((g) => g.seats["0"].dist === d).length}`).join(", "),
);
if (out) writeFileSync(out, JSON.stringify({ arm, definition: definition.identity.id, games }, null, 1));
