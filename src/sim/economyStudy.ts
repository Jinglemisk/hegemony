import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { PLAYER_IDS } from "../game/data";
import { installGameContent } from "../game/content";
import { GAME_MODES } from "../game/ruleset";
import type { BoardLayout } from "../game/types";
import { resolveTuning } from "../dev/tuning";
import { isTuningPresetId } from "../dev/tuningPresets";
import type { TuningPresetId } from "../dev/tuningPresets";
import { renderBatchReport } from "./format";
import type { RulesetPatch } from "./io";
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

const args = flags(process.argv.slice(2));
const games = int(args.games, 10);
const turns = int(args.turns, 120);
const baseSeed = int(args.seed, 73000);
const boardLayout = (args.board ?? "shuffled") as BoardLayout;
if (boardLayout !== "classic" && boardLayout !== "shuffled")
  throw new Error(`Bad board: ${boardLayout}`);
const policy = resolvePolicy(args.policy ?? "smart");
const presetArg = args.preset ?? "low-number-core-v1";
const presetId: TuningPresetId | null =
  presetArg === "standard" ? null : isTuningPresetId(presetArg) ? presetArg : null;
if (presetArg !== "standard" && !presetId) throw new Error(`Bad preset: ${presetArg}`);
const reportPath = args.report ?? ".sim/low-number-economy.json";
const csvPath = args.csv;

const resolved = resolveTuning(GAME_MODES.standard.ruleset, presetId);
installGameContent(resolved.content);
const patch = resolved.rulesetPatch as RulesetPatch;
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
        aggregator.beginGame(game, seed, state);
      },
      onMove: (state, player, move) => {
        aggregator.onMove(state, player, move);
      },
      onTurnEnd: (state) => {
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
  mode: presetId ?? "standard-study",
  boardLayout,
  baseSeed,
  botSeedRule: "seed ^ 0x9e3779b9",
  rulesetPatch: patch,
  tuningPresetId: resolved.presetId,
  resolvedContentHash: resolved.resolvedContentHash,
  generatedAt: new Date().toISOString(),
});

const playerRows = snapshots.flatMap((snapshot) => PLAYER_IDS.map((id) => snapshot.players[id]));
const finalRows = [...snapshots]
  .reverse()
  .filter(
    (snapshot, index, all) =>
      all.findIndex((candidate) => candidate.game === snapshot.game) === index,
  )
  .flatMap((snapshot) => PLAYER_IDS.map((id) => snapshot.players[id]));
const resources = ["wood", "stone", "gold", "food", "influence"] as const;
const openingPops =
  resolved.ruleset.placementPopCounts.capital + resolved.ruleset.placementPopCounts.colony;
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
  population: {
    observations: percentiles(playerRows.map((row) => row.pops)),
    final: percentiles(finalRows.map((row) => row.pops)),
    netGrowth: percentiles(finalRows.map((row) => row.pops - openingPops)),
  },
  configuredFloorViolations: playerRows.reduce(
    (count, row) =>
      count +
      Object.entries(resolved.ruleset.economy.stockpileFloors).filter(
        ([resource, floor]) =>
          row.resources[resource as keyof typeof row.resources] <
          (floor ?? Number.NEGATIVE_INFINITY),
      ).length,
    0,
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
installGameContent(null);
