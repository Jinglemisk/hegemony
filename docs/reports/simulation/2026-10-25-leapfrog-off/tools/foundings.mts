// Replays a batch's games on main to see where colonies were founded: whether each one
// bordered the seat's realm or sailed there by the leapfrog. The batch report has no
// founding positions, so the games are played again, seed for seed, exactly as `sim
// batch` plays them, and each game's winner is checked against the report's.
//   node --import tsx foundings.mts <arm> <report.json> <out.json> [firstSeed lastSeed]
import { readFileSync, writeFileSync } from "node:fs";
import type { HegemonyState, PlayerId } from "../../../../../src/game/types";
import { claimableLuxuriesAt } from "../../../../../src/game/luxury";
import { hexDistance, isCoastalTile } from "../../../../../src/game/map";
import { resolvePolicy } from "../../../../../src/sim/policies";
import { runGame } from "../../../../../src/sim/runner";
import { armDefinition } from "./arms.mts";

const [arm, reportPath, out, first = "1000", last = "1039"] = process.argv.slice(2);
const { definition, patch } = armDefinition(arm);
const report = JSON.parse(readFileSync(reportPath, "utf8"));
const policy = resolvePolicy("master");

type Founding = {
  seed: number;
  seat: PlayerId;
  year: number;
  setup: boolean;
  contiguous: boolean;
  nearestOwn: number;
  coastal: boolean;
  slots: number;
  resource: string;
  moorings: number;
};
const foundings: Founding[] = [];
const checks: { seed: number; winner: string | null; reported: string | null; match: boolean }[] = [];

for (let seed = Number(first); seed <= Number(last); seed++) {
  let prev: HegemonyState | null = null;
  const G = runGame({
    seed,
    mode: "standard",
    patch,
    definition,
    opening: "policy",
    boardLayout: "shuffled",
    policy,
    turns: 56,
    trimLogTo: 200,
    hooks: {
      onMove: (state, player, move) => {
        if ((move.type === "foundColony" || move.type === "placeColony") && prev) {
          const tiles = prev.board.tiles;
          const tile = tiles.find((t) => t.id === move.tileId)!;
          const own = prev.players[player].settlements.map((id) => tiles.find((t) => t.id === id)!);
          const nearestOwn = Math.min(...own.map((t) => hexDistance(t, tile)));
          foundings.push({
            seed,
            seat: player,
            year: prev.year,
            setup: move.type === "placeColony",
            contiguous: nearestOwn === 1,
            nearestOwn,
            coastal: isCoastalTile(tile, tiles),
            slots: tile.slots,
            resource: tile.resource?.type ?? "none",
            moorings: claimableLuxuriesAt(prev, tile.id).length,
          });
        }
        prev = state;
      },
    },
  });
  const reported = report.perGame.find((g: { seed: number }) => g.seed === seed)?.winner ?? null;
  const winner = G.phase === "gameOver" ? (G.winner ?? null) : null;
  checks.push({ seed, winner, reported, match: winner === reported });
  console.log(`seed ${seed}: winner ${winner}, report ${reported}${winner === reported ? "" : "  MISMATCH"}`);
}

writeFileSync(out, JSON.stringify({ arm, definition: definition.identity.id, checks, foundings }, null, 1));
