import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import process from "node:process";

import { createSeed } from "../game/core/rng";
import {
  previewBuildBuilding,
  previewFoundColony,
  previewMovePops,
  previewPlaceSettlement,
  previewUpgradeColonyToCity,
} from "../game/economy/preview";
import type { EconomyPreview } from "../game/economy/preview";
import { applyMove, describeMove, enumerateLegalMoves } from "../game/legalMoves";
import type { LegalMove } from "../game/legalMoves";
import { GAME_MODES } from "../game/ruleset";
import type { GameModeId } from "../game/ruleset";
import type { BuildingId, PopType, Pops } from "../game/types";
import { renderBatchReport, renderHeader, renderLegal, renderLog, renderPreview, renderProjection, renderShow } from "./format";
import { DEFAULT_SAVE_PATH, loadGame, saveGame } from "./io";
import type { MoveRecord, OpeningKind, RulesetPatch, SaveFile } from "./io";
import { resolvePolicy } from "./policies";
import { createSimRng, deriveBotSeed } from "./rng";
import { runGame, runTurns } from "./runner";
import { replayScript, scriptFromSave } from "./script";
import type { ScriptFile } from "./script";
import { buildNewGame } from "./setup";
import { Aggregator, snapshotsToCsv } from "./telemetry";

/**
 * Headless driver for the Hegemony engine. Commands operate on a JSON save file
 * (default .sim/game.json) so a game can be played move-by-move from the shell.
 * See docs/simulation.md for the full reference.
 */

// Piping into head/grep closes stdout early; exit quietly instead of crashing.
process.stdout.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EPIPE") {
    process.exit(0);
  }
  throw error;
});

const BOOLEAN_FLAGS = new Set(["json", "quiet", "manual-setup", "help"]);

type Flags = Record<string, string | boolean>;

function parseArgs(tokens: string[]): { positionals: string[]; flags: Flags } {
  const positionals: string[] = [];
  const flags: Flags = {};

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const name = token.slice(2);
    const next = tokens[index + 1];

    if (BOOLEAN_FLAGS.has(name) || next === undefined || next.startsWith("--")) {
      flags[name] = true;
    } else {
      flags[name] = next;
      index += 1;
    }
  }

  return { positionals, flags };
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function requireInt(value: string | boolean | undefined, name: string): number {
  const parsed = typeof value === "string" ? Number(value) : NaN;

  if (!Number.isInteger(parsed)) {
    fail(`${name} must be an integer (got ${String(value)})`);
  }

  return parsed;
}

const POP_ALIASES: Record<string, PopType> = {
  c: "citizens",
  citizen: "citizens",
  citizens: "citizens",
  f: "freemen",
  freeman: "freemen",
  freemen: "freemen",
  s: "slaves",
  slave: "slaves",
  slaves: "slaves",
};

function parsePopType(value: string | undefined): PopType {
  const pop = value ? POP_ALIASES[value.toLowerCase()] : undefined;

  if (!pop) {
    fail(`expected a pop type (citizens|freemen|slaves), got ${String(value)}`);
  }

  return pop;
}

/** "citizens=1,slaves=2" (or "c=1,s=2") → Pops. */
function parsePops(spec: string | undefined): Pops {
  const pops: Pops = { citizens: 0, freemen: 0, slaves: 0 };

  if (!spec) {
    fail("expected a pop spec like citizens=2,slaves=1 (or c=2,s=1)");
  }

  for (const part of spec.split(",")) {
    const [key, rawAmount] = part.split("=");
    const pop = POP_ALIASES[key?.toLowerCase() ?? ""];
    const amount = Number(rawAmount);

    if (!pop || !Number.isInteger(amount) || amount < 0) {
      fail(`bad pop spec entry "${part}" — use e.g. citizens=2,slaves=1`);
    }

    pops[pop] += amount;
  }

  return pops;
}

const TILE_ID = /^-?\d+,-?\d+$/;

function requireTileId(value: string | undefined, name: string): string {
  if (!value || !TILE_ID.test(value)) {
    fail(`${name} must be a tile id like 0,0 or -2,1 (got ${String(value)})`);
  }

  return value;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function parseMode(flags: Flags): GameModeId {
  const mode = (typeof flags.mode === "string" ? flags.mode : "standard") as GameModeId;

  if (!GAME_MODES[mode]) {
    fail(`unknown mode "${mode}" — expected one of: ${Object.keys(GAME_MODES).join(", ")}`);
  }

  return mode;
}

function parsePatch(flags: Flags): RulesetPatch | null {
  if (typeof flags["ruleset-patch"] !== "string") {
    return null;
  }

  return JSON.parse(readFileSync(flags["ruleset-patch"], "utf8")) as RulesetPatch;
}

function cmdNew(flags: Flags, file: string) {
  const seed = flags.seed !== undefined ? requireInt(flags.seed, "--seed") : createSeed();
  const mode = parseMode(flags);
  const patch = parsePatch(flags);

  const opening: OpeningKind = flags["manual-setup"]
    ? "manual"
    : ((typeof flags.opening === "string" ? flags.opening : "random") as OpeningKind);

  if (!["random", "fixed", "manual"].includes(opening)) {
    fail(`unknown opening "${opening}" — expected random, fixed, or manual`);
  }

  const botSeed = flags["bot-seed"] !== undefined ? requireInt(flags["bot-seed"], "--bot-seed") : deriveBotSeed(seed);
  const simRng = createSimRng(botSeed);
  const history: MoveRecord[] = [];

  const state = buildNewGame({
    seed,
    mode,
    patch,
    opening,
    simRng,
    onMove: (_G, player, move) => history.push({ player, move }),
  });

  const save: SaveFile = {
    version: 1,
    seed,
    mode,
    rulesetPatch: patch,
    opening,
    botRngState: simRng.state(),
    history,
    state,
  };

  saveGame(file, save);

  console.log(`New ${mode} game — seed ${seed}, opening ${opening}, saved to ${file}`);
  console.log(renderShow(state));
}

function cmdShow(flags: Flags, file: string) {
  const save = loadGame(file);

  if (flags.json) {
    console.log(JSON.stringify(save.state, null, 2));
    return;
  }

  const onlyPlayer = typeof flags.player === "string" ? (flags.player as SaveFile["state"]["currentPlayer"]) : undefined;
  console.log(renderShow(save.state, onlyPlayer));
}

function cmdLog(flags: Flags, file: string) {
  const save = loadGame(file);
  const tail = flags.tail !== undefined ? requireInt(flags.tail, "--tail") : 20;
  console.log(renderLog(save.state, tail));
}

function cmdLegal(flags: Flags, file: string) {
  const save = loadGame(file);

  if (flags.json) {
    console.log(JSON.stringify(enumerateLegalMoves(save.state, save.state.currentPlayer), null, 2));
    return;
  }

  console.log(renderLegal(save.state));
}

function applyAndSave(save: SaveFile, file: string, move: LegalMove, quiet = false) {
  const G = save.state;
  const player = G.currentPlayer;
  const logBefore = G.log.length;
  const result = applyMove(G, player, move);

  if (!result.ok) {
    const reasons = result.reasons.length > 0 ? result.reasons.join(" ") : "(the engine gave no reason)";
    fail(`Move rejected: ${describeMove(move)} — ${reasons}`);
  }

  save.history.push({ player, move });
  saveGame(file, save);

  if (!quiet) {
    console.log(`player ${player}: ${describeMove(move)}`);
    for (const entry of G.log.slice(logBefore)) {
      console.log(`  ${entry.message}`);
    }
  }
}

function cmdMove(positionals: string[], file: string) {
  const save = loadGame(file);
  const [sub, ...args] = positionals;

  const move = ((): LegalMove => {
    switch (sub) {
      case "build":
        return { type: "buildBuilding", tileId: requireTileId(args[0], "tile"), buildingId: args[1] as BuildingId, cost: {} };
      case "found":
        return {
          type: "foundColony",
          tileId: requireTileId(args[0], "target tile"),
          sourceTileId: requireTileId(args[1], "source tile"),
          pop: parsePopType(args[2]),
          cost: {},
        };
      case "upgrade":
        return { type: "upgradeColonyToCity", tileId: requireTileId(args[0], "tile"), cost: {} };
      case "grow":
        return { type: "growPop", tileId: requireTileId(args[0], "tile"), pop: parsePopType(args[1]), cost: {} };
      case "pops":
        return {
          type: "movePops",
          sourceTileId: requireTileId(args[0], "source tile"),
          targetTileId: requireTileId(args[1], "target tile"),
          pops: parsePops(args[2]),
        };
      case "place-capital":
        return { type: "placeCapital", tileId: requireTileId(args[0], "tile"), pops: parsePops(args[1]) };
      case "place-colony":
        return { type: "placeColony", tileId: requireTileId(args[0], "tile"), pops: parsePops(args[1]) };
      case "resolve": {
        // Accept "resolve", "resolve 1", "resolve -2,1", "resolve 1 -2,1".
        if (args[0] !== undefined && TILE_ID.test(args[0])) {
          return { type: "resolveEvent", choiceIndex: 0, targetTileId: args[0] };
        }
        const choiceIndex = args[0] !== undefined ? requireInt(args[0], "choice index") : 0;
        const targetTileId = args[1] !== undefined ? requireTileId(args[1], "target tile") : undefined;
        return { type: "resolveEvent", choiceIndex, targetTileId };
      }
      case "index": {
        const moves = enumerateLegalMoves(save.state, save.state.currentPlayer);
        const index = requireInt(args[0], "move index");

        if (index < 0 || index >= moves.length) {
          fail(`move index ${index} out of range — legal moves: 0..${moves.length - 1} (see: legal)`);
        }

        return moves[index];
      }
      default:
        fail(`unknown move "${String(sub)}" — see: npm run sim -- help`);
    }
  })();

  applyAndSave(save, file, move);
}

function cmdEndTurn(file: string) {
  const save = loadGame(file);
  applyAndSave(save, file, { type: "endTurn" });
}

function cmdPreview(positionals: string[], flags: Flags, file: string) {
  const save = loadGame(file);
  const G = save.state;
  const playerID = G.currentPlayer;
  const [sub, ...args] = positionals;

  if (!sub && flags.index === undefined) {
    console.log(renderProjection(G, playerID));
    return;
  }

  const preview = ((): EconomyPreview | null => {
    if (flags.index !== undefined) {
      const moves = enumerateLegalMoves(G, playerID);
      const index = requireInt(flags.index, "--index");

      if (index < 0 || index >= moves.length) {
        fail(`move index ${index} out of range — legal moves: 0..${moves.length - 1}`);
      }

      return previewLegalMove(save, moves[index]);
    }

    switch (sub) {
      case "build":
        return previewBuildBuilding(G, playerID, requireTileId(args[0], "tile"), args[1] as BuildingId);
      case "found":
        return previewFoundColony(
          G,
          playerID,
          requireTileId(args[0], "target tile"),
          requireTileId(args[1], "source tile"),
          parsePopType(args[2]),
        );
      case "upgrade":
        return previewUpgradeColonyToCity(G, playerID, requireTileId(args[0], "tile"));
      case "pops":
        return previewMovePops(
          G,
          playerID,
          requireTileId(args[0], "source tile"),
          requireTileId(args[1], "target tile"),
          parsePops(args[2]),
        );
      default:
        fail(`unknown preview "${String(sub)}" — expected build, found, upgrade, pops, or --index N`);
    }
  })();

  if (!preview) {
    fail("That action is not currently legal, so there is nothing to preview.");
  }

  console.log(renderPreview(preview));
}

function previewLegalMove(save: SaveFile, move: LegalMove): EconomyPreview | null {
  const G = save.state;
  const playerID = G.currentPlayer;

  switch (move.type) {
    case "buildBuilding":
      return previewBuildBuilding(G, playerID, move.tileId, move.buildingId);
    case "foundColony":
      return previewFoundColony(G, playerID, move.tileId, move.sourceTileId, move.pop);
    case "upgradeColonyToCity":
      return previewUpgradeColonyToCity(G, playerID, move.tileId);
    case "movePops":
      return previewMovePops(G, playerID, move.sourceTileId, move.targetTileId, move.pops);
    case "placeCapital":
      return previewPlaceSettlement(G, playerID, "capital", move.tileId, move.pops);
    case "placeColony":
      return previewPlaceSettlement(G, playerID, "colony", move.tileId, move.pops);
    default:
      fail(`no economy preview exists for "${move.type}" moves`);
  }
}

function cmdAuto(flags: Flags, file: string) {
  const save = loadGame(file);
  const turns = flags.turns !== undefined ? requireInt(flags.turns, "--turns") : 40;
  const policy = resolvePolicy(typeof flags.policy === "string" ? flags.policy : "random");
  // Continue the save's bot stream by default so command sequences stay reproducible.
  const botSeed = flags["bot-seed"] !== undefined ? requireInt(flags["bot-seed"], "--bot-seed") : save.botRngState;
  const rng = createSimRng(botSeed);
  const quiet = Boolean(flags.quiet);

  runTurns(save.state, policy, rng, turns, {
    onMove: (_G, player, move) => {
      save.history.push({ player, move });
      if (!quiet) {
        console.log(`player ${player}: ${describeMove(move)}`);
      }
    },
  });

  save.botRngState = rng.state();
  saveGame(file, save);

  if (typeof flags.record === "string") {
    writeJson(flags.record, scriptFromSave(save));
    console.log(`Recorded ${save.history.length} moves to ${flags.record}.`);
  }

  console.log(`\nPlayed ${turns} turns with the ${policy.name} policy — saved to ${file}.`);
  console.log(renderHeader(save.state));
}

function cmdReplay(flags: Flags, file: string) {
  if (typeof flags.script !== "string") {
    fail("replay needs --script <path> (record one with: auto --record s.json)");
  }

  const script = JSON.parse(readFileSync(flags.script, "utf8")) as ScriptFile;
  const state = replayScript(script);

  console.log(`Replayed ${script.moves.length} moves cleanly (seed ${script.seed}, mode ${script.mode}).`);
  console.log(renderHeader(state));

  const out = typeof flags.out === "string" ? flags.out : flags.out === true ? file : undefined;

  if (out) {
    const save: SaveFile = {
      version: 1,
      seed: script.seed,
      mode: script.mode,
      rulesetPatch: script.rulesetPatch,
      opening: script.opening,
      botRngState: deriveBotSeed(script.seed),
      history: script.moves,
      state,
    };
    saveGame(out, save);
    console.log(`Saved the replayed game to ${out}.`);
  }
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2));
}

function cmdBatch(flags: Flags) {
  if (flags.games === undefined) {
    fail("batch needs --games <N>");
  }

  const games = requireInt(flags.games, "--games");
  const turns = flags.turns !== undefined ? requireInt(flags.turns, "--turns") : 40;
  const policy = resolvePolicy(typeof flags.policy === "string" ? flags.policy : "random");
  const mode = parseMode(flags);
  const patch = parsePatch(flags);
  const baseSeed = flags.seed !== undefined ? requireInt(flags.seed, "--seed") : createSeed();
  const reportPath = typeof flags.report === "string" ? flags.report : ".sim/report.json";
  const csvPath = typeof flags.csv === "string" ? flags.csv : undefined;

  const aggregator = new Aggregator();
  const logEvery = games <= 20 ? 1 : 10;

  for (let game = 0; game < games; game += 1) {
    const seed = (baseSeed + game) >>> 0;

    const G = runGame({
      seed,
      mode,
      patch,
      policy,
      turns,
      trimLogTo: 200,
      hooks: {
        onGameStart: (state) => aggregator.beginGame(game, seed, state),
        onMove: (state, player, move) => aggregator.onMove(state, player, move),
        onTurnEnd: (state) => aggregator.onTurnEnd(state),
        onForceEndTurn: (state, resolutions) => aggregator.onForceEndTurn(state, resolutions),
      },
    });

    aggregator.endGame(G);

    if ((game + 1) % logEvery === 0) {
      console.log(`game ${game + 1}/${games} done (seed ${seed})`);
    }
  }

  const report = aggregator.buildReport({
    games,
    turns,
    policy: policy.name,
    mode,
    baseSeed,
    botSeedRule: "seed ^ 0x9e3779b9",
    rulesetPatch: patch,
    generatedAt: new Date().toISOString(),
  });

  writeJson(reportPath, report);
  console.log(`\nReport written to ${reportPath}.`);

  if (csvPath) {
    mkdirSync(dirname(csvPath), { recursive: true });
    writeFileSync(csvPath, snapshotsToCsv(aggregator.allSnapshots()));
    console.log(`Turn snapshots written to ${csvPath}.`);
  }

  console.log("\n" + renderBatchReport(report));
}

const HELP = `Hegemony headless sim — usage: npm run sim -- <command> [args] [--file path]

Save file defaults to ${DEFAULT_SAVE_PATH}.

  new        --seed N [--mode standard|fastStart|deathmatch] [--ruleset-patch p.json]
             [--manual-setup | --opening random|fixed] [--bot-seed N]
  show       [--json] [--player 0..3]
  log        [--tail N]
  legal      [--json]                      list this player's legal moves, indexed
  preview                                  income projection for the current player
  preview    build <tile> <building> | found <tile> <src> <pop> | upgrade <tile>
             | pops <src> <dst> <popSpec> | --index N
  move       build <tile> <building>       building: marketplace|temple|workshop|granary
             found <tile> <srcTile> <pop>
             upgrade <tile>
             grow <tile> <pop>
             pops <srcTile> <dstTile> <popSpec>     popSpec: citizens=1,slaves=2 (or c=1,s=2)
             place-capital <tile> <popSpec>
             place-colony <tile> <popSpec>
             resolve [choiceIndex] [targetTile]
             index <N>                     apply the Nth move from \`legal\`
  end-turn
  auto       [--turns N] [--policy random|greedy] [--record s.json] [--quiet]
  batch      --games N [--turns N] [--policy p] [--seed N] [--report r.json] [--csv t.csv]
  replay     --script s.json [--out save.json]

Tile ids are axial "q,r" coords, e.g. 0,0 or -2,1.`;

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { positionals, flags } = parseArgs(rest);
  const file = typeof flags.file === "string" ? flags.file : DEFAULT_SAVE_PATH;

  switch (command) {
    case "new":
      return cmdNew(flags, file);
    case "show":
      return cmdShow(flags, file);
    case "log":
      return cmdLog(flags, file);
    case "legal":
      return cmdLegal(flags, file);
    case "move":
      return cmdMove(positionals, file);
    case "end-turn":
      return cmdEndTurn(file);
    case "preview":
      return cmdPreview(positionals, flags, file);
    case "auto":
      return cmdAuto(flags, file);
    case "replay":
      return cmdReplay(flags, file);
    case "batch":
      return cmdBatch(flags);
    case "help":
    case undefined:
      console.log(HELP);
      return;
    default:
      fail(`unknown command "${command}"\n\n${HELP}`);
  }
}

main();
