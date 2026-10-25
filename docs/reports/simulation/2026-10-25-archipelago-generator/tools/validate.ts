// Archipelago generator validation and the sea-rule test (2026-10-25). Generates boards and
// plays no games. For each seed it checks the board against the generator's limits, runs
// setup with the engine's placement rules, and has the bots place the four capitals under
// each sea rule. The sea rules other than today's live in this script only.
//   nice -n 19 npx tsx docs/reports/simulation/2026-10-25-archipelago-generator/tools/validate.ts [seeds] [boards.json]
import { writeFileSync } from "node:fs";
import {
  ARCHIPELAGO_LIMITS,
  boardAspect,
  checkArchipelago,
  generateArchipelago,
} from "../../../../../src/game/archipelago";
import { deriveBankRates } from "../../../../../src/game/bank";
import { getTerrainDeck } from "../../../../../src/game/content";
import { mulberry32 } from "../../../../../src/game/core/rng";
import { createGameDefinition, createModeDefinition } from "../../../../../src/game/definition";
import { enumerateLegalCommands, transition } from "../../../../../src/game/legalMoves";
import type { GameCommand } from "../../../../../src/game/legalMoves";
import { createLuxuryAssets } from "../../../../../src/game/luxury";
import { axialRadius, hexDistance, isCoastalTile } from "../../../../../src/game/map";
import { axialToPlane, luxuryEligibleVertices } from "../../../../../src/game/mapTopology";
import { canPlaceColonyOnTile, settlementSlaveResource } from "../../../../../src/game/settlement";
import { createInitialStateFromDefinition } from "../../../../../src/game/state";
import type { HegemonyState, HexTile, PlayerId, Pops } from "../../../../../src/game/types";
import { buildNewGame } from "../../../../../src/sim/setup";
import {
  choosePlacement,
  evaluatePlacement,
  placementFrontier,
  resolvePolicy,
} from "../../../../../src/sim/policies";
import { createSimRng, deriveBotSeed } from "../../../../../src/sim/rng";
import type { SimRng } from "../../../../../src/sim/rng";

const SEEDS = Number(process.argv[2] ?? 1000);
const BOARDS_OUT = process.argv[3];
// Sea rules whose founding voyage is also tested, comma-separated, e.g. "hop 3,own group".
const VOYAGE = (process.argv[4] ?? "").split(",").filter(Boolean);
const SHOWN = 24;

// The masters batches' table: the standard rules, no National Ideas.
const STANDARD = createModeDefinition("standard");
const DEFINITION = createGameDefinition({
  ruleset: STANDARD.ruleset,
  content: { ...STANDARD.content, nationalIdeas: [] },
});
const DECK = getTerrainDeck(DEFINITION.content);
const SEATS: PlayerId[] = ["0", "1", "2", "3"];
// DEFAULT_WEIGHTS.frontier in src/sim/policies.ts: the weight the master bot puts on each
// slot of the best three founding sites.
const FRONTIER_WEIGHT = 2;

// ── Boards in a match ────────────────────────────────────────────────────────────────

function matchOn(tiles: HexTile[], seed: number): HegemonyState {
  const G = createInitialStateFromDefinition(DEFINITION, seed, "shuffled");
  const identity = { nextEntityId: 1 };
  const luxuries = createLuxuryAssets(identity, tiles, G.ruleset, G.definition.content, seed);
  return {
    ...G,
    nextEntityId: identity.nextEntityId,
    board: { tiles, luxuries },
    bank: deriveBankRates(tiles, G.ruleset.economy.bank),
  };
}

// ── Sea rules ────────────────────────────────────────────────────────────────────────

type GroupOf = Map<string, number>;
type SeaRule = {
  name: string;
  /** Whether the seat may found on this coastal tile across water. */
  reach(G: HegemonyState, me: PlayerId, tile: HexTile, groupOf: GroupOf): boolean;
};

const ownTiles = (G: HegemonyState, me: PlayerId) =>
  G.players[me].settlements.map((id) => G.board.tiles.find((tile) => tile.id === id)!);
const hop = (n: number): SeaRule => ({
  name: `hop ${n}`,
  reach: (G, me, tile) =>
    ownTiles(G, me).some(
      (own) => isCoastalTile(own, G.board.tiles) && hexDistance(own, tile) <= n,
    ),
});
const TODAY = "unlimited (today)";
const RULES: SeaRule[] = [
  { name: "no leapfrog", reach: () => false },
  hop(2),
  hop(3),
  hop(4),
  {
    name: "own group",
    reach: (G, me, tile, groupOf) =>
      ownTiles(G, me).some((own) => groupOf.get(own.id) === groupOf.get(tile.id)),
  },
  { name: TODAY, reach: () => true },
];

const withoutLeapfrog = new WeakMap<HegemonyState, HegemonyState>();
function contiguousOnly(G: HegemonyState) {
  let shadow = withoutLeapfrog.get(G);
  if (!shadow) {
    shadow = {
      ...G,
      ruleset: { ...G.ruleset, placement: { ...G.ruleset.placement, coastalLeapfrog: false } },
    };
    withoutLeapfrog.set(G, shadow);
  }
  return shadow;
}

/** The engine's colony placement with the sea rule swapped. Today's rule is the widest, so a
 *  tile it refuses stays refused; a tile it allows is allowed when it borders the realm or
 *  the rule reaches it. */
function canFound(G: HegemonyState, me: PlayerId, tile: HexTile, rule: SeaRule, groupOf: GroupOf) {
  if (!canPlaceColonyOnTile(G, me, tile).can) return false;
  if (rule.name === TODAY || canPlaceColonyOnTile(contiguousOnly(G), me, tile).can) return true;
  return rule.reach(G, me, tile, groupOf);
}

/** `placementFrontier` under a sea rule, plus how many sites the seat can found on at all. */
function frontierUnder(G: HegemonyState, me: PlayerId, rule: SeaRule, groupOf: GroupOf) {
  const rivals = SEATS.filter((seat) => seat !== me && G.players[seat].settlements.length > 0);
  const reachable: { amount: number; contested: boolean }[] = [];
  for (const tile of G.board.tiles) {
    const amount = settlementSlaveResource(tile, G) ? tile.slots : 0;
    if (amount === 0 || !canFound(G, me, tile, rule, groupOf)) continue;
    reachable.push({
      amount,
      contested: rivals.some((rival) => canFound(G, rival, tile, rule, groupOf)),
    });
  }
  reachable.sort((a, b) => b.amount - a.amount);
  let frontier = 0;
  let contested = 0;
  for (const site of reachable.slice(0, 3)) {
    frontier += site.amount;
    contested += site.contested ? site.amount : 0;
  }
  return { frontier, contested, sites: reachable.length };
}

// ── The bots' capital picks under a rule ─────────────────────────────────────────────

type Placement = Extract<GameCommand, { tileId: string; pops: Pops }>;
type Cache = { states: Map<string, HegemonyState>; rest: Map<string, number> };
const keyOf = (history: Placement[]) =>
  history
    .map(({ tileId, pops }) => `${tileId}:${pops.citizens}${pops.freemen}${pops.slaves}`)
    .join("|");

function after(G: HegemonyState, history: Placement[], move: Placement, cache: Cache) {
  const key = keyOf([...history, move]);
  let state = cache.states.get(key);
  if (!state) {
    const result = transition(G.definition, G, G.currentPlayer, move);
    if (!result.ok) throw new Error(`setup move refused: ${key}`);
    state = result.state;
    cache.states.set(key, state);
  }
  return { state, key };
}

/** `evaluatePlacement` with the frontier term taken under the rule. The rest of the score
 *  does not read the sea, so it is cached across rules. */
function scoreUnder(
  G: HegemonyState,
  key: string,
  me: PlayerId,
  rule: SeaRule,
  groupOf: GroupOf,
  cache: Cache,
) {
  const restKey = `${key}#${me}`;
  let rest = cache.rest.get(restKey);
  if (rest === undefined) {
    const today = placementFrontier(G, me);
    rest = evaluatePlacement(G, me) - FRONTIER_WEIGHT * today.frontier + today.contested;
    cache.rest.set(restKey, rest);
  }
  const under = frontierUnder(G, me, rule, groupOf);
  return { score: rest + FRONTIER_WEIGHT * under.frontier - under.contested, rest, ...under };
}

function representativeSplit(placements: Placement[]) {
  let best = placements[0];
  let bestSpread = Infinity;
  for (const placement of placements) {
    const counts = [placement.pops.citizens, placement.pops.freemen, placement.pops.slaves];
    const spread = Math.max(...counts) - Math.min(...counts);
    if (spread < bestSpread) {
      bestSpread = spread;
      best = placement;
    }
  }
  return best;
}

/** `choosePlacement` for a capital, scored under the rule: rank tiles by their most even
 *  split, then score every split of the top three tiles; ties go to the bot's rng. */
function chooseCapital(
  G: HegemonyState,
  history: Placement[],
  rule: SeaRule,
  groupOf: GroupOf,
  rng: SimRng,
  cache: Cache,
) {
  const me = G.currentPlayer;
  const moves = enumerateLegalCommands(G, me) as Placement[];
  const byTile = new Map<string, Placement[]>();
  for (const move of moves) byTile.set(move.tileId, [...(byTile.get(move.tileId) ?? []), move]);
  const scored = (move: Placement) => {
    const next = after(G, history, move, cache);
    return { move, ...scoreUnder(next.state, next.key, me, rule, groupOf, cache) };
  };

  let candidates = moves;
  if (byTile.size > 3) {
    candidates = [...byTile.values()]
      .map(representativeSplit)
      .map(scored)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .flatMap(({ move }) => byTile.get(move.tileId)!);
  }
  let best: ReturnType<typeof scored>[] = [];
  for (const option of candidates.map(scored)) {
    if (best.length === 0 || option.score > best[0].score) best = [option];
    else if (option.score === best[0].score) best.push(option);
  }
  return best.length === 1 ? best[0] : rng.pick(best);
}

type CapitalRun = {
  picks: ReturnType<typeof chooseCapital>[];
  final: ReturnType<typeof scoreUnder>[];
  state: HegemonyState;
  history: Placement[];
};

function placeCapitals(G0: HegemonyState, seed: number, rule: SeaRule, groupOf: GroupOf, cache: Cache) {
  const rng = createSimRng(deriveBotSeed(seed));
  let G = G0;
  const history: Placement[] = [];
  const picks: CapitalRun["picks"] = [];
  let replicaMismatch = 0;
  while (G.phase === "setupCapital") {
    // The replica is checked against the bots' own chooser on the first 50 seeds.
    if (rule.name === TODAY && seed <= 50) {
      const real = choosePlacement(
        G,
        enumerateLegalCommands(G, G.currentPlayer),
        createSimRng(rng.state()),
      );
      const mine = chooseCapital(G, history, rule, groupOf, createSimRng(rng.state()), cache);
      if (keyOf([real as Placement]) !== keyOf([mine.move])) replicaMismatch += 1;
    }
    const pick = chooseCapital(G, history, rule, groupOf, rng, cache);
    picks.push(pick);
    G = after(G, history, pick.move, cache).state;
    history.push(pick.move);
  }
  const key = keyOf(history);
  const final = SEATS.map((seat) => scoreUnder(G, key, seat, rule, groupOf, cache));
  return { run: { picks, final, state: G, history } as CapitalRun, rng, replicaMismatch };
}

/** The founding colonies, by the bots under today's rules, to the end of setup. */
function placeColonies(G0: HegemonyState, rng: SimRng) {
  let G = G0;
  while (G.phase === "setupColony") {
    const move = choosePlacement(G, enumerateLegalCommands(G, G.currentPlayer), rng);
    const result = transition(G.definition, G, G.currentPlayer, move);
    if (!result.ok) throw new Error("colony refused");
    G = result.state;
  }
  return G;
}

/** Whether the founding voyage may reach the tile under the rule: today any coast; under
 *  another rule a tile beside the capital, or a coastal tile the rule reaches. */
function voyageReaches(G: HegemonyState, me: PlayerId, tileId: string, rule: SeaRule, groupOf: GroupOf) {
  if (rule.name === TODAY) return true;
  const tile = G.board.tiles.find((candidate) => candidate.id === tileId)!;
  if (ownTiles(G, me).some((own) => hexDistance(own, tile) === 1)) return true;
  return isCoastalTile(tile, G.board.tiles) && rule.reach(G, me, tile, groupOf);
}

/** `choosePlacement` for a founding colony under the rule: every split of every tile the
 *  voyage reaches, scored, ties to the bot's rng. Null when the voyage reaches nothing. */
function placeColoniesUnder(
  run: CapitalRun,
  rule: SeaRule,
  groupOf: GroupOf,
  rng: SimRng,
  cache: Cache,
) {
  let G = run.state;
  const history = [...run.history];
  while (G.phase === "setupColony") {
    const me = G.currentPlayer;
    const moves = (enumerateLegalCommands(G, me) as Placement[]).filter((move) =>
      voyageReaches(G, me, move.tileId, rule, groupOf),
    );
    if (moves.length === 0) return null;
    let best: { move: Placement; score: number }[] = [];
    for (const move of moves) {
      const next = after(G, history, move, cache);
      const { score } = scoreUnder(next.state, next.key, me, rule, groupOf, cache);
      if (best.length === 0 || score > best[0].score) best = [{ move, score }];
      else if (score === best[0].score) best.push({ move, score });
    }
    const pick = best.length === 1 ? best[0] : rng.pick(best);
    G = after(G, history, pick.move, cache).state;
    history.push(pick.move);
  }
  const key = keyOf(history);
  return { state: G, final: SEATS.map((seat) => scoreUnder(G, key, seat, rule, groupOf, cache)) };
}

const settlementsOf = (G: HegemonyState) =>
  G.board.tiles.flatMap((tile) =>
    tile.settlements.map((settlement) => ({ tile: tile.id, owner: settlement.owner, kind: settlement.kind })),
  );

/** Setup by uniformly drawn legal moves, as the focused test does. */
function randomSetupLegal(G0: HegemonyState, seed: number) {
  let G = G0;
  let state = seed;
  while (G.phase === "setupCapital" || G.phase === "setupColony") {
    const commands = enumerateLegalCommands(G, G.currentPlayer);
    if (commands.length === 0) return false;
    const draw = mulberry32(state);
    state = draw.state;
    const result = transition(G.definition, G, G.currentPlayer, commands[Math.floor(draw.value * commands.length)]);
    if (!result.ok) return false;
    G = result.state;
  }
  return SEATS.every(
    (seat) =>
      G.players[seat].settlements.length === 2 &&
      G.board.tiles.some((tile) => tile.slots > 0 && canPlaceColonyOnTile(G, seat, tile).can),
  );
}

// ── Collecting ───────────────────────────────────────────────────────────────────────

const series = new Map<string, number[]>();
const add = (name: string, value: number) => {
  if (!series.has(name)) series.set(name, []);
  series.get(name)!.push(value);
};
const counts = new Map<string, number>();
const bump = (name: string, by = 1) => counts.set(name, (counts.get(name) ?? 0) + by);
const timed = <T>(name: string, run: () => T): T => {
  const start = performance.now();
  const value = run();
  bump(`seconds in ${name}`, (performance.now() - start) / 1000);
  return value;
};

const DISC = axialRadius(3);
const extent = (tiles: readonly { q: number; r: number }[]) => {
  const points = tiles.map(({ q, r }) => axialToPlane(q, r));
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    width: Math.max(...xs) - Math.min(...xs) + Math.sqrt(3),
    height: Math.max(...ys) - Math.min(...ys) + 2,
  };
};
const discExtent = extent(DISC);
const boards: unknown[] = [];

function seatGapRows(prefix: string, run: CapitalRun) {
  const [first, , , fourth] = run.picks;
  add(`${prefix} pick score seat 0`, first.score);
  add(`${prefix} pick score seat 3`, fourth.score);
  const final = run.final;
  add(`${prefix} final score seat 0`, final[0].score);
  add(`${prefix} final score seat 3`, final[3].score);
  add(`${prefix} final gap 0-3`, final[0].score - final[3].score);
  add(
    `${prefix} final gap 0-3, sea part`,
    FRONTIER_WEIGHT * (final[0].frontier - final[3].frontier) -
      (final[0].contested - final[3].contested),
  );
  add(`${prefix} final gap 0-3, tile part`, final[0].rest - final[3].rest);
  add(`${prefix} founding sites seat 0`, final[0].sites);
  add(`${prefix} founding sites seat 3`, final[3].sites);
  const top = Math.max(...final.map((row) => row.score));
  if (final[0].score === top) bump(`${prefix} seat 0 best of four`);
  if (final[3].score === top) bump(`${prefix} seat 3 best of four`);
  bump(`${prefix} seats with no founding site`, final.filter((row) => row.sites === 0).length);
  const capitals = run.state.board.tiles.filter((tile) =>
    tile.settlements.some((settlement) => settlement.kind !== "colony"),
  );
  add(`${prefix} capital slots seat 0`, capitals.find((t) => t.settlements[0].owner === "0")!.slots);
  add(`${prefix} capital slots seat 3`, capitals.find((t) => t.settlements[0].owner === "3")!.slots);
}

const started = performance.now();
let generationMs = 0;
let replicaMismatches = 0;
let realBotMismatches = 0;

for (let seed = 1; seed <= SEEDS; seed += 1) {
  // The generator.
  const t0 = performance.now();
  const board = generateArchipelago(seed, DECK);
  const ms = performance.now() - t0;
  generationMs += ms;
  add("ms per board", ms);
  add("draws per board", board.draws);
  if (board.fallback) bump("fallback boards");
  const broken = checkArchipelago(board.tiles, ARCHIPELAGO_LIMITS);
  if (broken.length > 0) {
    bump("boards breaking a limit");
    console.error(`seed ${seed}: ${broken.join("; ")}`);
  }

  const { tiles, layout } = board;
  const byId = new Map(tiles.map((tile) => [tile.id, tile]));
  const groupOf: GroupOf = new Map();
  layout.groups.forEach((group, index) =>
    group.forEach((island) => layout.islands[island].forEach((id) => groupOf.set(id, index))),
  );
  add("tiles", tiles.length);
  add("islands", layout.islands.length);
  layout.islands.forEach((island) => add("island size", island.length));
  add("groups", layout.groups.length);
  for (const group of layout.groups) {
    add("islands per group", group.length);
    const groupTiles = group.flatMap((island) => layout.islands[island].map((id) => byId.get(id)!));
    add("tiles per group", groupTiles.length);
    add("plains per group", groupTiles.filter((tile) => tile.terrain === "plains").length);
    add(
      "food slots per group",
      groupTiles.filter((tile) => tile.terrain === "plains").reduce((sum, t) => sum + t.slots, 0),
    );
  }
  for (const island of layout.islands) {
    const terrains = new Set(island.map((id) => byId.get(id)!.resource?.type));
    if (!terrains.has("food")) bump("islands without plains");
    if (terrains.has("food") && terrains.has("wood") && terrains.has("stone")) {
      bump("islands with food, wood and stone");
    }
  }
  add("coastal tiles", tiles.filter((tile) => isCoastalTile(tile, tiles)).length);
  add("moorings", luxuryEligibleVertices(tiles).length);
  add("aspect", boardAspect(tiles));
  add("farthest tile from centre", Math.max(...tiles.map((tile) => hexDistance(tile, { q: 0, r: 0 }))));
  const size = extent(tiles);
  add("drawn width / disc", size.width / discExtent.width);
  add("drawn height / disc", size.height / discExtent.height);

  // A plain shuffle of the same deck on the same islands: what the group rule prevents.
  const land = tiles.filter((tile) => tile.terrain !== "oracle");
  let shuffleState = seed ^ 0x5bd1e995;
  const cards = land.map((tile) => tile.resource?.type ?? null);
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const draw = mulberry32(shuffleState);
    shuffleState = draw.state;
    const swap = Math.floor(draw.value * (index + 1));
    [cards[index], cards[swap]] = [cards[swap], cards[index]];
  }
  const shuffled = new Map(land.map((tile, index) => [tile.id, cards[index]]));
  for (const group of layout.groups) {
    const kinds = new Set(group.flatMap((island) => layout.islands[island].map((id) => shuffled.get(id))));
    if (!kinds.has("food")) bump("plain shuffle: groups without plains");
    if (!kinds.has("food") || !kinds.has("wood") || !kinds.has("stone")) {
      bump("plain shuffle: groups missing a resource");
    }
  }

  // Legal starts by uniformly drawn legal moves.
  const G = matchOn(tiles, seed);
  if (!timed("random setups", () => randomSetupLegal(G, seed))) bump("random setups without four legal starts");

  // Goods on the board: today's six, spaced evenly around the coast.
  const goodsPerGroup = layout.groups.map(() => 0);
  for (const asset of G.board.luxuries) goodsPerGroup[groupOf.get(asset.tileIds[0])!] += 1;
  goodsPerGroup.forEach((count) => add("goods per group", count));
  bump("groups without a good", goodsPerGroup.filter((count) => count === 0).length);

  // The bots' capitals under each sea rule, on this board and on the Continental board.
  const continental = createInitialStateFromDefinition(DEFINITION, seed, "shuffled");
  const oneGroup: GroupOf = new Map(continental.board.tiles.map((tile) => [tile.id, 0]));
  const caches = { arch: { states: new Map(), rest: new Map() }, cont: { states: new Map(), rest: new Map() } };
  let shown: Record<string, unknown> | null = null;
  const capitalsByRule: Record<string, string[]> = {};
  const voyagesByRule: Record<string, { tile: string; owner: string; kind: string }[]> = {};
  for (const rule of RULES) {
    const arch = timed("archipelago capitals", () => placeCapitals(G, seed, rule, groupOf, caches.arch));
    const cont = timed("continental capitals", () => placeCapitals(continental, seed, rule, oneGroup, caches.cont));
    replicaMismatches += arch.replicaMismatch + cont.replicaMismatch;
    seatGapRows(`arch ${rule.name}`, arch.run);
    seatGapRows(`cont ${rule.name}`, cont.run);

    const capitalIslands = arch.run.history.map((move) =>
      layout.islands.findIndex((island) => island.includes(move.tileId)),
    );
    if (new Set(capitalIslands).size < 4) bump(`arch ${rule.name} boards with capitals sharing an island`);
    const capitalGroups = new Set(arch.run.history.map((move) => groupOf.get(move.tileId)));
    capitalsByRule[rule.name] = arch.run.history.map((move) => move.tileId);
    add(`arch ${rule.name} groups holding a capital`, capitalGroups.size);

    // The founding voyage under the same rule, for the rules named on the command line.
    if (VOYAGE.includes(rule.name)) {
      const p = `voyage ${rule.name}`;
      const voyage = timed("founding voyages", () =>
        placeColoniesUnder(arch.run, rule, groupOf, createSimRng(arch.rng.state()), caches.arch),
      );
      if (!voyage) bump(`${p} setups where a voyage reached nothing`);
      else {
        for (const seat of SEATS) {
          const [capitalId, colonyId] = voyage.state.players[seat].settlements;
          const sameIsland = layout.islands.some((island) => island.includes(capitalId) && island.includes(colonyId));
          if (sameIsland) bump(`${p} colonies on the capital's island`);
          else if (groupOf.get(capitalId) === groupOf.get(colonyId)) bump(`${p} colonies elsewhere in the group`);
          else bump(`${p} colonies in another group`);
          add(`${p} founding sites after setup`, voyage.final[Number(seat)].sites);
        }
        bump(`${p} seats with no founding site`, voyage.final.filter((row) => row.sites === 0).length);
        voyagesByRule[rule.name] = settlementsOf(voyage.state);
      }
    }

    if (rule.name === TODAY) {
      // Today's rules to the end of setup: the founding colonies, then room to grow.
      // On the first 50 seeds the voyage replica must place the colonies the bots place.
      const replica =
        VOYAGE.length > 0 && seed <= 50
          ? placeColoniesUnder(arch.run, rule, groupOf, createSimRng(arch.rng.state()), caches.arch)
          : null;
      const done = timed("bot colonies", () => placeColonies(arch.run.state, arch.rng));
      if (replica) {
        const settled = (state: HegemonyState) => SEATS.map((seat) => state.players[seat].settlements.join()).join("|");
        if (settled(replica.state) !== settled(done)) bump("voyage replica disagreeing with the bots' colonies");
      }
      for (const seat of SEATS) {
        const [capitalId, colonyId] = done.players[seat].settlements;
        if (!colonyId) bump("bot setups: seats without a colony");
        const sameIsland = layout.islands.some((island) => island.includes(capitalId) && island.includes(colonyId));
        if (sameIsland) bump("bot setups: colonies on the capital's island");
        else if (groupOf.get(capitalId) === groupOf.get(colonyId)) bump("bot setups: colonies elsewhere in the capital's group");
        else bump("bot setups: colonies in another group");
        if (!done.board.tiles.some((tile) => tile.slots > 0 && canPlaceColonyOnTile(done, seat, tile).can)) {
          bump("bot setups: seats without room to grow");
        }
        add("bot setups: founding sites after setup", frontierUnder(done, seat, rule, groupOf).sites);
      }
      if (seed <= SHOWN) {
        shown = {
          seed,
          draws: board.draws,
          fallback: board.fallback,
          tiles: tiles.map(({ q, r, terrain, slots }) => ({ q, r, terrain, slots })),
          islands: layout.islands,
          groups: layout.groups,
          goods: done.board.luxuries.map((asset) => asset.vertexId),
          capitalsByRule,
          voyagesByRule,
          settlements: settlementsOf(done),
        };
      }
      // The real bot path (projected view, policy object) picks the same capitals on the
      // Continental board as the replica.
      if (seed <= 20) {
        const real = buildNewGame({
          seed,
          mode: "standard",
          definition: DEFINITION,
          opening: "policy",
          boardLayout: "shuffled",
          simRng: createSimRng(deriveBotSeed(seed)),
          policy: resolvePolicy("master"),
        });
        const realCapitals = SEATS.map((seat) => real.players[seat].settlements[0]).join(",");
        const replica = cont.run.history.map((move) => move.tileId).join(",");
        if (realCapitals !== replica) realBotMismatches += 1;
      }
    }
  }
  if (shown) boards.push(shown);
  if (seed % 50 === 0) {
    console.error(`${seed} seeds, ${((performance.now() - started) / 1000).toFixed(0)} s`);
  }
}

// ── Report ───────────────────────────────────────────────────────────────────────────

const sorted = (values: number[]) => [...values].sort((a, b) => a - b);
const at = (values: number[], share: number) => values[Math.floor(share * (values.length - 1))];
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const fmt = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2));
const spread = (name: string) => {
  const values = sorted(series.get(name) ?? []);
  return `${name}: mean ${fmt(mean(values))}, min ${fmt(values[0])}, p10 ${fmt(at(values, 0.1))}, median ${fmt(at(values, 0.5))}, p90 ${fmt(at(values, 0.9))}, max ${fmt(values[values.length - 1])} (n ${values.length})`;
};
const histogram = (name: string) => {
  const tally = new Map<number, number>();
  for (const value of series.get(name) ?? []) tally.set(value, (tally.get(value) ?? 0) + 1);
  return `${name}: ${[...tally.entries()].sort((a, b) => a[0] - b[0]).map(([value, n]) => `${value}×${n}`).join(", ")}`;
};

const lines: string[] = [];
const out = (line = "") => lines.push(line);
out(`Archipelago generator validation: seeds 1 to ${SEEDS}, default limits`);
out(JSON.stringify(ARCHIPELAGO_LIMITS));
out();
out(`boards breaking a limit: ${counts.get("boards breaking a limit") ?? 0}`);
out(`fallback boards: ${counts.get("fallback boards") ?? 0}`);
out(`random setups without four legal starts: ${counts.get("random setups without four legal starts") ?? 0}`);
for (const name of [
  "bot setups: seats without a colony",
  "bot setups: seats without room to grow",
  "bot setups: colonies on the capital's island",
  "bot setups: colonies elsewhere in the capital's group",
  "bot setups: colonies in another group",
]) out(`${name}: ${counts.get(name) ?? 0} of ${SEEDS * 4}`);
out(spread("bot setups: founding sites after setup"));
out(`generation: ${fmt(generationMs / SEEDS)} ms a board on average`);
out(spread("ms per board"));
out(histogram("draws per board"));
out(spread("draws per board"));
out();
for (const name of ["tiles", "islands", "groups", "islands per group"]) out(histogram(name));
out(histogram("island size"));
for (const name of [
  "tiles per group",
  "plains per group",
  "food slots per group",
  "coastal tiles",
  "moorings",
  "goods per group",
  "aspect",
  "farthest tile from centre",
  "drawn width / disc",
  "drawn height / disc",
]) out(spread(name));
out(histogram("plains per group"));
out(histogram("goods per group"));
out(`groups without a good: ${counts.get("groups without a good") ?? 0} of ${(series.get("tiles per group") ?? []).length}`);
const islandCount = (series.get("island size") ?? []).length;
out(`islands without plains: ${counts.get("islands without plains") ?? 0} of ${islandCount}`);
out(`islands with food, wood and stone: ${counts.get("islands with food, wood and stone") ?? 0} of ${islandCount}`);
const groupCount = (series.get("tiles per group") ?? []).length;
out(`plain shuffle instead: groups without plains ${counts.get("plain shuffle: groups without plains") ?? 0} of ${groupCount}, groups missing a resource ${counts.get("plain shuffle: groups missing a resource") ?? 0} of ${groupCount}`);
const disc = createInitialStateFromDefinition(DEFINITION, 1, "shuffled").board.tiles;
out(`Continental for reference: 37 tiles, ${disc.filter((tile) => isCoastalTile(tile, disc)).length} coastal, ${luxuryEligibleVertices(disc).length} moorings`);
out();
out(`Sea rules: the bots' capital picks, seat 0 (first) against seat 3 (fourth)`);
out(`replica of choosePlacement disagreeing with it under today's rule: ${replicaMismatches} picks`);
out(`replica disagreeing with the real master bot's capitals on Continental, seeds 1 to 20: ${realBotMismatches} games`);
out(
  [
    "board, rule",
    "pick score seat 0",
    "pick score seat 3",
    "after four capitals: seat 0",
    "seat 3",
    "gap 0-3 (median)",
    "of which sea",
    "of which tile",
    "seat 0 best of four",
    "seat 3 best of four",
    "founding sites seat 0",
    "seat 3",
    "seats with no site",
    "capital slots 0 / 3",
  ].join(" | "),
);
for (const board of ["arch", "cont"]) {
  for (const rule of RULES) {
    const p = `${board} ${rule.name}`;
    const m = (name: string) => fmt(mean(series.get(`${p} ${name}`)!));
    const med = (name: string) => fmt(at(sorted(series.get(`${p} ${name}`)!), 0.5));
    out(
      [
        p,
        m("pick score seat 0"),
        m("pick score seat 3"),
        m("final score seat 0"),
        m("final score seat 3"),
        `${m("final gap 0-3")} (${med("final gap 0-3")})`,
        m("final gap 0-3, sea part"),
        m("final gap 0-3, tile part"),
        `${(100 * (counts.get(`${p} seat 0 best of four`) ?? 0)) / SEEDS}%`,
        `${(100 * (counts.get(`${p} seat 3 best of four`) ?? 0)) / SEEDS}%`,
        m("founding sites seat 0"),
        m("founding sites seat 3"),
        String(counts.get(`${p} seats with no founding site`) ?? 0),
        `${m("capital slots seat 0")} / ${m("capital slots seat 3")}`,
      ].join(" | "),
    );
  }
}
out();
for (const rule of RULES) {
  out(
    `arch ${rule.name}: boards with two capitals on one island ${counts.get(`arch ${rule.name} boards with capitals sharing an island`) ?? 0} of ${SEEDS}; ${histogram(`arch ${rule.name} groups holding a capital`)}`,
  );
}
out();
if (VOYAGE.length > 0) {
  out(`Founding voyage under the same rule (capital and colony by the bots), archipelago`);
  out(`voyage replica disagreeing with the bots' colonies under today's rule, seeds 1 to 50: ${counts.get("voyage replica disagreeing with the bots' colonies") ?? 0}`);
  for (const name of VOYAGE) {
    const p = `voyage ${name}`;
    const c = (key: string) => counts.get(`${p} ${key}`) ?? 0;
    out(
      `${name}: colonies on the capital's island ${c("colonies on the capital's island")}, elsewhere in the group ${c("colonies elsewhere in the group")}, in another group ${c("colonies in another group")} (of ${SEEDS * 4}); setups where a voyage reached nothing ${c("setups where a voyage reached nothing")}; ${spread(`${p} founding sites after setup`)}; seats with no founding site ${c("seats with no founding site")}`,
    );
  }
  out();
}
for (const [name, value] of counts) if (name.startsWith("seconds in")) out(`${name}: ${value.toFixed(0)}`);
out(`run time: ${((performance.now() - started) / 1000).toFixed(0)} s`);

console.log(lines.join("\n"));
if (BOARDS_OUT) writeFileSync(BOARDS_OUT, JSON.stringify({ limits: ARCHIPELAGO_LIMITS, boards }, null, 1));
