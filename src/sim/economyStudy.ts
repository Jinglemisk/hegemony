import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { PLAYER_IDS } from "../game/data";
import { mergeRulesetPatches } from "../game/ruleset";
import type { BoardLayout, HegemonyState } from "../game/types";
import { renderBatchReport } from "./format";
import type { RulesetPatch } from "./io";
import { installLowNumberContent, LOW_NUMBER_RULESET_PATCH } from "./lowNumberEconomy";
import { resolvePolicy } from "./policies";
import { runGame } from "./runner";
import { Aggregator, percentiles, snapshotsToCsv } from "./telemetry";

type Flags = Record<string, string>;

function flags(tokens: string[]): Flags {
  const out: Flags = {};
  for (let index = 0; index < tokens.length; index += 2) {
    const key = tokens[index]?.replace(/^--/, "");
    const value = tokens[index + 1];
    if (!key || value === undefined)
      throw new Error(`Expected --flag value, got ${tokens.slice(index).join(" ")}`);
    out[key] = value;
  }
  return out;
}

function int(value: string | undefined, fallback: number) {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new Error(`Expected a positive integer, got ${String(value)}`);
  return parsed;
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2));
}

function floorSpendableStocks(G: HegemonyState) {
  for (const player of Object.values(G.players)) {
    player.resources.wood = Math.max(0, player.resources.wood);
    player.resources.stone = Math.max(0, player.resources.stone);
    player.resources.gold = Math.max(0, player.resources.gold);
    player.resources.influence = Math.max(0, player.resources.influence);
  }
}

const args = flags(process.argv.slice(2));
const games = int(args.games, 10);
const turns = int(args.turns, 120);
const baseSeed = int(args.seed, 73000);
const boardLayout = (args.board ?? "shuffled") as BoardLayout;
if (boardLayout !== "classic" && boardLayout !== "shuffled")
  throw new Error(`Bad board: ${boardLayout}`);
const policy = resolvePolicy(args.policy ?? "smart");
const reportPath = args.report ?? ".sim/low-number-economy.json";
const csvPath = args.csv;

installLowNumberContent();
const patch = mergeRulesetPatches(null, LOW_NUMBER_RULESET_PATCH) as RulesetPatch;
const aggregator = new Aggregator();

for (let game = 0; game < games; game += 1) {
  const seed = (baseSeed + game) >>> 0;
  const G = runGame({
    seed,
    mode: "standard",
    patch,
    boardLayout,
    policy,
    turns,
    trimLogTo: 200,
    hooks: {
      onGameStart: (state) => {
        floorSpendableStocks(state);
        aggregator.beginGame(game, seed, state);
      },
      onMove: (state, player, move) => {
        floorSpendableStocks(state);
        aggregator.onMove(state, player, move);
      },
      onTurnEnd: (state) => {
        floorSpendableStocks(state);
        aggregator.onTurnEnd(state);
      },
      onForceEndTurn: (state, resolutions) => aggregator.onForceEndTurn(state, resolutions),
    },
  });
  aggregator.endGame(G);
  console.log(`seed ${game + 1}/${games} done (seed ${seed})`);
}

const snapshots = aggregator.allSnapshots();
const batch = aggregator.buildReport({
  games,
  turns,
  policy: policy.name,
  mode: "low-number-study",
  boardLayout,
  baseSeed,
  botSeedRule: "seed ^ 0x9e3779b9",
  rulesetPatch: patch,
  generatedAt: new Date().toISOString(),
});

const playerRows = snapshots.flatMap((snapshot) => PLAYER_IDS.map((id) => snapshot.players[id]));
const resources = ["wood", "stone", "gold", "food", "influence"] as const;
const scale = {
  observations: playerRows.length,
  anyHoldingAtLeast10:
    playerRows.filter((row) => resources.some((resource) => row.resources[resource] >= 10)).length /
    playerRows.length,
  anyIncomeMagnitudeAtLeast10:
    playerRows.filter((row) => resources.some((resource) => Math.abs(row.income[resource]) >= 10))
      .length / playerRows.length,
  holdings: Object.fromEntries(
    resources.map((resource) => {
      const values = playerRows.map((row) => row.resources[resource]);
      return [
        resource,
        {
          ...percentiles(values),
          shareAtLeast10: values.filter((value) => value >= 10).length / values.length,
        },
      ];
    }),
  ),
  income: Object.fromEntries(
    resources.map((resource) => {
      const values = playerRows.map((row) => row.income[resource]);
      return [
        resource,
        {
          ...percentiles(values),
          shareMagnitudeAtLeast10:
            values.filter((value) => Math.abs(value) >= 10).length / values.length,
        },
      ];
    }),
  ),
};

writeJson(reportPath, { ...batch, scale });
if (csvPath) {
  mkdirSync(dirname(csvPath), { recursive: true });
  writeFileSync(csvPath, snapshotsToCsv(snapshots));
}

console.log(`\nReport written to ${reportPath}.`);
if (csvPath) console.log(`Turn snapshots written to ${csvPath}.`);
console.log(
  `Two-digit scale: holdings ${(100 * scale.anyHoldingAtLeast10).toFixed(1)}% · incomes ${(100 * scale.anyIncomeMagnitudeAtLeast10).toFixed(1)}%`,
);
console.log(`\n${renderBatchReport(batch)}`);
