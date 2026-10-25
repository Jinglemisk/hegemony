// Replays the setup of the 40 masters games (seeds 1000–1039, continental, no Ideas) and
// prints what each seat's colony went on. Run from the repo root on the code to test:
//   npx tsx docs/reports/simulation/2026-10-25-last-colony-pick/tools/colony-picks.mts [baseFood] [--out picks.json] [--against picks.json]
// --out saves every setup pick; --against counts the picks that moved from a saved run.
import { readFileSync, writeFileSync } from "node:fs";
import { GAME_MODES } from "../../../../../src/game/ruleset";
import { createGameDefinition, createModeDefinition } from "../../../../../src/game/definition";
import { enumerateLegalCommands, transition } from "../../../../../src/game/legalMoves";
import { createInitialStateFromDefinition } from "../../../../../src/game/state";
import { projectForPlayer } from "../../../../../src/game/projection";
import { resolvePolicy } from "../../../../../src/sim/policies";
import { createSimRng, deriveBotSeed } from "../../../../../src/sim/rng";

const args = process.argv.slice(2);
const flag = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const baseFood = Number(args.find((a) => /^\d+$/.test(a)) ?? 0);
const ruleset = GAME_MODES.standard.ruleset;
const definition = createGameDefinition({
  ruleset: {
    ...ruleset,
    economy: { ...ruleset.economy, baseIncome: { ...ruleset.economy.baseIncome, food: baseFood } },
  },
  content: { ...createModeDefinition("standard").content, nationalIdeas: [] },
});
const policy = resolvePolicy("master");

type Pick = { seed: number; seat: string; phase: string; tile: string; kind: string; slots: number };
const picks: Pick[] = [];
for (let seed = 1000; seed < 1040; seed++) {
  const rng = createSimRng(deriveBotSeed(seed));
  let G = createInitialStateFromDefinition(definition, seed, "continental");
  while (G.phase !== "gameplay") {
    const seat = G.currentPlayer;
    const command = policy.choose(projectForPlayer(G.definition, G, seat), enumerateLegalCommands(G, seat), rng);
    if (!("tileId" in command)) throw new Error(`unexpected setup command ${command.type}`);
    const tile = G.board.tiles.find((t) => t.id === command.tileId)!;
    picks.push({ seed, seat, phase: G.phase, tile: tile.id, kind: tile.resource?.type ?? tile.terrain, slots: tile.slots });
    const result = transition(G.definition, G, seat, command);
    if (!result.ok) throw new Error("rejected");
    G = result.state;
  }
}

const saved: Pick[] | null = flag("--against") ? JSON.parse(readFileSync(flag("--against")!, "utf8")) : null;
console.log(`base food ${baseFood}: colony site by seat (pick order 3, 2, 1, 0)`);
for (const seat of ["3", "2", "1", "0"]) {
  const mine = picks.filter((p) => p.phase === "setupColony" && p.seat === seat);
  const of = (kind: string) => mine.filter((p) => p.kind === kind).length;
  const slots = (mine.reduce((a, p) => a + p.slots, 0) / mine.length).toFixed(1);
  const moved = saved
    ? ` | moved ${mine.filter((p) => !saved.some((s) => s.seed === p.seed && s.seat === seat && s.phase === p.phase && s.tile === p.tile)).length}`
    : "";
  console.log(`  seat ${seat}: plains ${of("food")} / stone ${of("stone")} / wood ${of("wood")} | slots ${slots}${moved}`);
}
if (saved) {
  const capitals = picks.filter((p) => p.phase === "setupCapital");
  const movedCapitals = capitals.filter((p) => !saved.some((s) => s.seed === p.seed && s.seat === p.seat && s.phase === p.phase && s.tile === p.tile));
  console.log(`  capitals moved: ${movedCapitals.length} of ${capitals.length}`);
}
if (flag("--out")) writeFileSync(flag("--out")!, JSON.stringify(picks));
