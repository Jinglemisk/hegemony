import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import process from "node:process";

import { createCliSeed } from "./seed";
import {
  previewBuildBuilding,
  previewFoundColony,
  previewMovePops,
  previewPlaceSettlement,
  previewUpgradeColonyToCity,
} from "../game/economy/preview";
import type { EconomyPreview } from "../game/economy/preview";
import {
  describeCommand,
  enumerateLegalCommands,
  enumerateLegalOptions,
  transition,
} from "../game/legalMoves";
import type { GameCommand } from "../game/legalMoves";
import { getAuthoredGameContent } from "../game/content";
import { PLAYER_IDS } from "../game/data";
import { GAME_MODES } from "../game/ruleset";
import type { GameModeId } from "../game/ruleset";
import { resolveTuning } from "../dev/tuning";
import type { OverrideMap } from "../dev/tuning";
import { isTuningPresetId, TUNING_PRESETS } from "../dev/tuningPresets";
import type { TuningPresetId } from "../dev/tuningPresets";
import type {
  BoardLayout,
  BuildingId,
  HegemonyState,
  PlayerId,
  PopType,
  Pops,
} from "../game/types";
import {
  renderBatchReport,
  renderHeader,
  renderLegal,
  renderLog,
  renderPreview,
  renderProjection,
  renderShow,
} from "./format";
import { DEFAULT_SAVE_PATH, loadGame, normalizeCommandRecord, saveGame } from "./io";
import type { CommandRecord, OpeningKind, RulesetPatch, SaveFile } from "./io";
import { POLICIES, resolvePolicy } from "./policies";
import type { Policy } from "./policies";
import { createSimRng, deriveBotSeed } from "./rng";
import { runGame, runTurns } from "./runner";
import { replayScript, scriptFromSave } from "./script";
import type { ScriptFile } from "./script";
import { buildNewGame } from "./setup";
import { Aggregator, snapshotsToCsv } from "./telemetry";
import { CURRENT_RECIPE_VERSIONS, SAVE_FORMAT_VERSION } from "../game/version";

/**
 * Headless driver for the Hegemony engine. Commands operate on a JSON save file
 * (default .sim/game.json) so a game can be played move-by-move from the shell.
 * See docs/reference/simulation.md for the full reference.
 */

// Piping into head/grep closes stdout early; exit quietly instead of crashing.
process.stdout.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EPIPE") {
    process.exit(0);
  }
  throw error;
});

const BOOLEAN_FLAGS = new Set(["json", "quiet", "manual-setup", "help", "rotate"]);

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

function requirePositiveInt(value: string | boolean | undefined, name: string): number {
  const parsed = requireInt(value, name);

  if (parsed < 1) {
    fail(`${name} must be at least 1 (got ${parsed})`);
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

function parseBoard(flags: Flags): BoardLayout {
  const board = typeof flags.board === "string" ? flags.board : "classic";

  if (board !== "classic" && board !== "shuffled") {
    fail(`unknown board "${board}" — expected classic or shuffled`);
  }

  return board;
}

/** `--seats greedy,smart,smart,smart` → a policy per seat, plus the display names. */
function parseSeats(
  flags: Flags,
): { policies: Record<PlayerId, Policy>; names: Record<PlayerId, string> } | null {
  if (typeof flags.seats !== "string") {
    return null;
  }

  const parts = flags.seats.split(",").map((entry) => entry.trim());

  if (parts.length !== PLAYER_IDS.length) {
    fail(
      `--seats needs ${PLAYER_IDS.length} comma-separated policies (got ${parts.length}: "${flags.seats}")`,
    );
  }

  const policies = {} as Record<PlayerId, Policy>;
  const names = {} as Record<PlayerId, string>;
  PLAYER_IDS.forEach((id, index) => {
    policies[id] = resolvePolicy(parts[index]);
    names[id] = policies[id].name;
  });

  return { policies, names };
}

/** Rotate a per-seat map by `r` seats — seat i takes what sat `r` seats later, so
 *  running r=0..3 sends each policy through every seat exactly once. */
function rotateSeats<T>(base: Record<PlayerId, T>, r: number): Record<PlayerId, T> {
  const out = {} as Record<PlayerId, T>;
  PLAYER_IDS.forEach((id, index) => {
    out[id] = base[PLAYER_IDS[(index + r) % PLAYER_IDS.length]];
  });
  return out;
}

function parsePatch(flags: Flags): RulesetPatch | null {
  if (typeof flags["ruleset-patch"] !== "string") {
    return null;
  }

  return JSON.parse(readFileSync(flags["ruleset-patch"], "utf8")) as RulesetPatch;
}

/** `--tune-patch p.json` reads the dev tune-panel override map (dot-path → value),
 *  so a batch can A/B building content (Villa/Gymnasion strength, costs, level caps)
 *  and ruleset scalars in the same shape the panel's "Copy patch" produces. */
function parseTune(flags: Flags): OverrideMap | null {
  if (typeof flags["tune-patch"] !== "string") {
    return null;
  }

  return JSON.parse(readFileSync(flags["tune-patch"], "utf8")) as OverrideMap;
}

function parseTuningPreset(flags: Flags): TuningPresetId | null {
  const value = flags["tune-preset"];
  if (value === undefined) return null;
  if (!isTuningPresetId(value)) {
    fail(
      `unknown tuning preset "${String(value)}" — expected one of: ${Object.keys(TUNING_PRESETS).join(", ")}`,
    );
  }
  return value;
}

function cmdNew(flags: Flags, file: string) {
  const seed = flags.seed !== undefined ? requireInt(flags.seed, "--seed") : createCliSeed();
  const mode = parseMode(flags);
  const patch = parsePatch(flags);
  const boardLayout = parseBoard(flags);

  const opening: OpeningKind = flags["manual-setup"]
    ? "manual"
    : ((typeof flags.opening === "string" ? flags.opening : "random") as OpeningKind);

  if (!["random", "fixed", "manual"].includes(opening)) {
    fail(`unknown opening "${opening}" — expected random, fixed, or manual`);
  }

  const botSeed =
    flags["bot-seed"] !== undefined
      ? requireInt(flags["bot-seed"], "--bot-seed")
      : deriveBotSeed(seed);
  const simRng = createSimRng(botSeed);
  const history: CommandRecord[] = [];

  const state = buildNewGame({
    seed,
    mode,
    patch,
    opening,
    boardLayout,
    simRng,
    onMove: (_G, player, command) => history.push({ player, command }),
  });

  const save: SaveFile = {
    version: SAVE_FORMAT_VERSION,
    ...CURRENT_RECIPE_VERSIONS,
    seed,
    mode,
    rulesetPatch: patch,
    definition: state.definition,
    opening,
    boardLayout: state.boardLayout,
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

  const onlyPlayer =
    typeof flags.player === "string"
      ? (flags.player as SaveFile["state"]["currentPlayer"])
      : undefined;
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
    console.log(
      JSON.stringify(enumerateLegalOptions(save.state, save.state.currentPlayer), null, 2),
    );
    return;
  }

  console.log(renderLegal(save.state));
}

function applyAndSave(save: SaveFile, file: string, command: GameCommand, quiet = false) {
  const G = save.state;
  const player = G.currentPlayer;
  const result = transition(G.definition, G, player, command);

  if (!result.ok) {
    const reasons =
      result.reasons.length > 0 ? result.reasons.join(" ") : "(the engine gave no reason)";
    fail(`Command rejected: ${describeCommand(command, G.definition.content)} — ${reasons}`);
  }

  save.state = result.state;
  save.history.push({ player, command });
  saveGame(file, save);

  if (!quiet) {
    console.log(`player ${player}: ${describeCommand(command, G.definition.content)}`);
    for (const event of result.events) {
      console.log(`  ${event.entry.message}`);
    }
  }
}

/** Pick the current player's enumerated move matching `predicate` — lets named commands
 *  for payload-heavy actions (bank/civic/venture/riot) reuse the validated move instead
 *  of hand-building its cost/option fields. */
function findLegal(
  G: HegemonyState,
  predicate: (command: GameCommand) => boolean,
  description: string,
): GameCommand {
  const match = enumerateLegalCommands(G, G.currentPlayer).find(predicate);

  if (!match) {
    fail(`no legal ${description} right now (see: legal)`);
  }

  return match;
}

function cmdMove(positionals: string[], file: string) {
  const save = loadGame(file);
  const [sub, ...args] = positionals;

  const command = ((): GameCommand => {
    switch (sub) {
      case "build":
        return {
          type: "buildBuilding",
          tileId: requireTileId(args[0], "tile"),
          buildingId: args[1] as BuildingId,
        };
      case "found":
        return {
          type: "foundColony",
          tileId: requireTileId(args[0], "target tile"),
          sourceTileId: requireTileId(args[1], "source tile"),
          pop: parsePopType(args[2]),
        };
      case "upgrade":
        return { type: "upgradeColonyToCity", tileId: requireTileId(args[0], "tile") };
      case "grow":
        return {
          type: "growPop",
          tileId: requireTileId(args[0], "tile"),
          pop: parsePopType(args[1]),
        };
      case "pops":
        return {
          type: "movePops",
          sourceTileId: requireTileId(args[0], "source tile"),
          targetTileId: requireTileId(args[1], "target tile"),
          pops: parsePops(args[2]),
        };
      case "place-capital":
        return {
          type: "placeCapital",
          tileId: requireTileId(args[0], "tile"),
          pops: parsePops(args[1]),
        };
      case "place-colony":
        return {
          type: "placeColony",
          tileId: requireTileId(args[0], "tile"),
          pops: parsePops(args[1]),
        };
      case "resolve": {
        // Accept "resolve", "resolve 1", "resolve -2,1", "resolve 1 -2,1".
        if (args[0] !== undefined && TILE_ID.test(args[0])) {
          return { type: "resolveEvent", choiceIndex: 0, targetTileId: args[0] };
        }
        const choiceIndex = args[0] !== undefined ? requireInt(args[0], "choice index") : 0;
        const targetTileId =
          args[1] !== undefined ? requireTileId(args[1], "target tile") : undefined;
        return { type: "resolveEvent", choiceIndex, targetTileId };
      }
      case "bank-sell":
        return findLegal(
          save.state,
          (move) => move.type === "bankSell" && move.material === args[0],
          `bank-sell ${args[0] ?? "<material>"}`,
        );
      case "bank-buy":
        return findLegal(
          save.state,
          (move) => move.type === "bankBuy" && move.material === args[0],
          `bank-buy ${args[0] ?? "<material>"}`,
        );
      case "promote": {
        const tileId = requireTileId(args[0], "tile");
        const from = parsePopType(args[1]);
        return findLegal(
          save.state,
          (move) => move.type === "promotePop" && move.tileId === tileId && move.from === from,
          "promote",
        );
      }
      case "demote": {
        const tileId = requireTileId(args[0], "tile");
        const from = parsePopType(args[1]);
        return findLegal(
          save.state,
          (move) => move.type === "demotePop" && move.tileId === tileId && move.from === from,
          "demote",
        );
      }
      case "calm":
        return findLegal(save.state, (move) => move.type === "civicCalm", "civic calm");
      case "venture":
        return findLegal(
          save.state,
          (move) => move.type === "fundExpedition" && move.stake === args[0],
          `venture ${args[0] ?? "<gold|wood>"}`,
        );
      case "insure":
        return findLegal(
          save.state,
          (move) =>
            move.type === "buyRiotInsurance" &&
            (args[0] === undefined || move.optionId === args[0]),
          "riot insurance",
        );
      case "resolve-riot":
        return findLegal(save.state, (move) => move.type === "resolveRiot", "resolve riot");
      case "index": {
        const commands = enumerateLegalCommands(save.state, save.state.currentPlayer);
        const index = requireInt(args[0], "move index");

        if (index < 0 || index >= commands.length) {
          fail(
            `command index ${index} out of range — legal commands: 0..${commands.length - 1} (see: legal)`,
          );
        }

        return commands[index];
      }
      default:
        fail(`unknown move "${String(sub)}" — see: npm run sim -- help`);
    }
  })();

  applyAndSave(save, file, command);
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

  // `--index N` previews the Nth legal move. Many move types have no economy preview;
  // that is reported cleanly (exit 0), not treated as an error.
  if (flags.index !== undefined) {
    const commands = enumerateLegalCommands(G, playerID);
    const index = requireInt(flags.index, "--index");

    if (index < 0 || index >= commands.length) {
      fail(`command index ${index} out of range — legal commands: 0..${commands.length - 1}`);
    }

    const command = commands[index];
    const preview = previewLegalCommand(save, command);

    if (!preview) {
      console.log(
        `No economy preview for "${command.type}" commands — this action has no resource projection.`,
      );
      return;
    }

    console.log(renderPreview(preview));
    return;
  }

  const preview = ((): EconomyPreview | null => {
    switch (sub) {
      case "build":
        return previewBuildBuilding(
          G,
          playerID,
          requireTileId(args[0], "tile"),
          args[1] as BuildingId,
        );
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
        fail(
          `unknown preview "${String(sub)}" — expected build, found, upgrade, pops, or --index N`,
        );
    }
  })();

  if (!preview) {
    fail("That action is not currently legal, so there is nothing to preview.");
  }

  console.log(renderPreview(preview));
}

function previewLegalCommand(save: SaveFile, move: GameCommand): EconomyPreview | null {
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
      // Many moves (grow, bank, civic, venture, endTurn…) have no economy projection —
      // that is not an error; the caller reports it and exits cleanly.
      return null;
  }
}

function cmdAuto(flags: Flags, file: string) {
  const save = loadGame(file);
  const turns = flags.turns !== undefined ? requirePositiveInt(flags.turns, "--turns") : 40;
  const policy = resolvePolicy(typeof flags.policy === "string" ? flags.policy : "random");
  // Continue the save's bot stream by default so command sequences stay reproducible.
  const botSeed =
    flags["bot-seed"] !== undefined
      ? requireInt(flags["bot-seed"], "--bot-seed")
      : save.botRngState;
  const rng = createSimRng(botSeed);
  const quiet = Boolean(flags.quiet);

  save.state = runTurns(save.state, policy, rng, turns, {
    onMove: (_G, player, command) => {
      save.history.push({ player, command });
      if (!quiet) {
        console.log(`player ${player}: ${describeCommand(command, _G.definition.content)}`);
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
  const history = script.commands ?? script.moves?.map(normalizeCommandRecord) ?? [];

  console.log(
    `Replayed ${history.length} commands cleanly (seed ${script.seed}, mode ${script.mode}).`,
  );
  console.log(renderHeader(state));

  const out = typeof flags.out === "string" ? flags.out : flags.out === true ? file : undefined;

  if (out) {
    const save: SaveFile = {
      version: SAVE_FORMAT_VERSION,
      ...CURRENT_RECIPE_VERSIONS,
      seed: script.seed,
      mode: script.mode,
      rulesetPatch: script.rulesetPatch,
      definition: state.definition,
      opening: script.opening,
      boardLayout: state.boardLayout,
      // Resume the original bot stream where it was parked; legacy scripts without
      // the field fall back to the derived start (the pre-fix behavior).
      botRngState: script.botRngState ?? deriveBotSeed(script.seed),
      history,
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

  const games = requirePositiveInt(flags.games, "--games");
  const turns = flags.turns !== undefined ? requirePositiveInt(flags.turns, "--turns") : 40;
  const policy = resolvePolicy(typeof flags.policy === "string" ? flags.policy : "random");
  const seats = parseSeats(flags);
  const rotate = Boolean(flags.rotate);

  if (rotate && !seats) {
    fail(
      "--rotate needs --seats <p0,p1,p2,p3> (there is nothing to rotate without per-seat policies)",
    );
  }

  const mode = parseMode(flags);
  const patch = parsePatch(flags);
  const boardLayout = parseBoard(flags);
  const tune = parseTune(flags);
  const presetId = parseTuningPreset(flags);
  const resolved = resolveTuning(GAME_MODES[mode].ruleset, presetId, tune ?? {}, patch);
  const effectivePatch = resolved.rulesetPatch;
  const baseSeed = flags.seed !== undefined ? requireInt(flags.seed, "--seed") : createCliSeed();
  const reportPath = typeof flags.report === "string" ? flags.report : ".sim/report.json";
  const csvPath = typeof flags.csv === "string" ? flags.csv : undefined;

  {
    const aggregator = new Aggregator();
    const logEvery = games <= 20 ? 1 : 10;
    // Rotation reseats each policy through every seat on the SAME seed to cancel
    // first-player advantage; without it, one game per base seed.
    const rotations = seats && rotate ? PLAYER_IDS.length : 1;

    let gameIndex = 0;
    for (let base = 0; base < games; base += 1) {
      const seed = (baseSeed + base) >>> 0;

      for (let r = 0; r < rotations; r += 1) {
        const seatPolicies = seats ? rotateSeats(seats.policies, r) : undefined;
        const seatNames = seats ? rotateSeats(seats.names, r) : undefined;
        const currentGame = gameIndex;

        const G = runGame({
          seed,
          mode,
          patch: effectivePatch,
          definition: resolved.definition,
          boardLayout,
          policy,
          seatPolicies,
          turns,
          trimLogTo: 200,
          hooks: {
            onGameStart: (state) => aggregator.beginGame(currentGame, seed, state, seatNames),
            onMove: (state, player, move) => aggregator.onMove(state, player, move),
            onTurnEnd: (state) => aggregator.onTurnEnd(state),
            onForceEndTurn: (state, resolutions) => aggregator.onForceEndTurn(state, resolutions),
          },
        });

        aggregator.endGame(G);
        gameIndex += 1;
      }

      if ((base + 1) % logEvery === 0) {
        console.log(
          `seed ${base + 1}/${games} done (${rotations > 1 ? `${rotations} rotations, ` : ""}seed ${seed})`,
        );
      }
    }

    const report = aggregator.buildReport({
      games: gameIndex,
      turns,
      policy: seats ? "mixed" : policy.name,
      mode,
      boardLayout,
      seatPolicies: seats ? seats.names : null,
      baseSeed,
      botSeedRule: "seed ^ 0x9e3779b9",
      rulesetPatch: effectivePatch,
      definition: resolved.definition.identity,
      tunePatch: tune ?? null,
      tunePatchHash: resolved.manualPatchHash,
      tuningPresetId: resolved.presetId,
      resolvedContentHash: resolved.resolvedContentHash,
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
}

const BUILDING_IDS = getAuthoredGameContent()
  .buildings.map((building) => building.id)
  .join("|");
const POLICY_IDS = Object.keys(POLICIES).join("|");

const HELP = `Hegemony headless sim — usage: npm run sim -- <command> [args] [--file path]

Save file defaults to ${DEFAULT_SAVE_PATH}.

  new        --seed N [--mode standard|fastStart|deathmatch] [--ruleset-patch p.json]
             [--manual-setup | --opening random|fixed] [--bot-seed N] [--board classic|shuffled]
  show       [--json] [--player 0..3]
  log        [--tail N]
  legal      [--json]                      list this player's legal moves, indexed
  preview                                  income projection for the current player
  preview    build <tile> <building> | found <tile> <src> <pop> | upgrade <tile>
             | pops <src> <dst> <popSpec> | --index N   (--index previews any legal move)
  move       build <tile> <building>       building: ${BUILDING_IDS}
             found <tile> <srcTile> <pop>
             upgrade <tile>
             grow <tile> <pop>
             pops <srcTile> <dstTile> <popSpec>     popSpec: citizens=1,slaves=2 (or c=1,s=2)
             promote <tile> <pop> | demote <tile> <pop>
             bank-sell <material> | bank-buy <material>
             calm | venture <gold|wood> | insure [optionId] | resolve-riot
             place-capital <tile> <popSpec>
             place-colony <tile> <popSpec>
             resolve [choiceIndex] [targetTile]
             index <N>                     apply the Nth move from \`legal\`
  end-turn
  auto       [--turns N] [--policy ${POLICY_IDS}] [--record s.json] [--quiet]
  batch      --games N [--turns N] [--policy ${POLICY_IDS}] [--seed N] [--board classic|shuffled]
             [--ruleset-patch p.json] [--tune-preset low-number-core-v1] [--tune-patch p.json]
             [--seats ${POLICY_IDS}×4] [--rotate]
             [--report r.json] [--csv t.csv]
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
