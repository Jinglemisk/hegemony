// The balance check: every rule with its limit, the measured value, a 95% interval and a
// verdict, for each batch report given; then the figures v1 also recorded. The rules and how
// they run are in docs/plans/player-trade.md, "The balance check".
//   node docs/reports/simulation/2026-10-26-balance-check/tools/check.mjs <report> [<report> ...]
// A <report> is a batch report's path, with or without .json; its turn CSV sits beside it.
//
// How it reads a batch:
// - A table whose seats all play one bot (no seatPolicies in meta) judges the runaway leader;
//   on a mixed table that figure is printed for reference only. Win rates come from mixed tables.
// - A CSV snapshot is the table at the start of the acting seat's turn, so a seat's state after
//   its own year-Y turn is its row in the next snapshot (the final rows after the last turn).
//   The year's last seat is read in the next year's first snapshot, after the year card is
//   turned, so its income projection already carries that card.
// - Intervals are 95% percentile bootstraps over seeds (2,000 draws, fixed seed). Rotated games
//   on one seed share a board, so the seed is the unit.
// - A pass or fail compares the measured value with the limit, and adds "within noise" when the
//   interval crosses it.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const POLICIES = ['slaver', 'civic', 'trader', 'master'];
const SEATS = ['0', '1', '2', '3'];
const DRAWS = 2000;
const WANT = { level: 60, winRates: 160 };

// v1 on standard rules and the shuffled board: seat wins and length from the 2026-09-05
// baseline, riots from the 2026-10-19 v1-vs-v2 report. v1 sent both tiers to the riot table;
// a v2 revolt rolls none, so v2 prints its revolts beside its riots.
const V1 = [
  { name: 'v1 smart (10)', seats: '40 / 30 / 30 / 0%', turns: 103.7, race: '8 of 10', riots: 8.6 },
  { name: 'v1 master (3)', seats: '33 / 0 / 67 / 0%', turns: 83, race: '3 of 3', riots: 8.3 },
];

const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const mean = (xs) => sum(xs) / (xs.length || 1);
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return NaN;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (x) => (Number.isFinite(x) ? `${Math.round(100 * x)}%` : '–');
const r1 = (x) => (Number.isFinite(x) ? (Math.round(x * 10) / 10).toFixed(1) : '–');
const r2 = (x) => (Number.isFinite(x) ? (Math.round(x * 100) / 100).toFixed(2) : '–');
const signed = (x) => (x >= 0 ? `+${r1(x)}` : r1(x));
const thousands = (x) => x.toLocaleString('en-US');

// Deterministic draws, so the same batch prints the same intervals.
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function interval(clusters, stat) {
  const random = mulberry32(80);
  const values = [];
  for (let d = 0; d < DRAWS; d++) {
    const games = [];
    for (let i = 0; i < clusters.length; i++) games.push(...clusters[Math.floor(random() * clusters.length)]);
    const v = stat(games);
    if (Number.isFinite(v)) values.push(v);
  }
  values.sort((a, b) => a - b);
  return [values[Math.floor(0.025 * values.length)], values[Math.ceil(0.975 * values.length) - 1]];
}

function judge(value, [lo, hi], limit) {
  if (!Number.isFinite(value)) return 'no data';
  if (value <= limit) return hi > limit ? 'pass, within noise' : 'pass';
  return lo <= limit ? 'fail, within noise' : 'fail';
}

// Win rates are a benchmark while the bots and mechanics are unfinished. A build over 45% with
// the whole interval above it is flagged: the report names the bug or missing feature that
// explains it, or the rule fails.
function bench(value, [lo, hi]) {
  if (value > 0.45) return lo > 0.45 ? 'FLAG: over 45%' : 'benchmark: over 45%, within noise';
  if (value < 0.2) return hi < 0.2 ? 'benchmark: under 20%' : 'benchmark: under 20%, within noise';
  return 'benchmark: in range';
}

function load(arg) {
  const base = arg.replace(/\.(json|csv)$/, '');
  const rep = JSON.parse(readFileSync(`${base}.json`, 'utf8'));
  const lines = readFileSync(`${base}.csv`, 'utf8').trim().split('\n');
  const head = lines[0].split(',');
  const at = Object.fromEntries(head.map((h, i) => [h, i]));
  const num = (cells, name) => Number(cells[at[name]]);

  const snapshots = new Map();
  for (const line of lines.slice(1)) {
    const c = line.split(',');
    const game = Number(c[at.game]);
    if (!snapshots.has(game)) snapshots.set(game, []);
    const list = snapshots.get(game);
    const key = `${c[at.turn]}:${c[at.final]}`;
    if (list.at(-1)?.key !== key)
      list.push({ key, year: Number(c[at.year]), acting: c[at.actingSeat], final: c[at.final] === '1', holder: c[at.belovedHolder], rows: {} });
    list.at(-1).rows[c[at.player]] = c;
  }

  const uniform = rep.meta.seatPolicies == null;
  const games = rep.perGame.map((g) => {
    const list = snapshots.get(g.game) ?? [];
    const after = new Map();
    const turns = { all: 0, late: 0, lateBySeat: { 0: 0, 1: 0, 2: 0, 3: 0 }, short: 0 };
    const beloved = { held: 0, sole: 0, tied: 0 };
    list.forEach((s, i) => {
      if (s.final) return;
      turns.all += 1;
      if (s.year >= 8) {
        turns.late += 1;
        turns.lateBySeat[s.acting] += 1;
      }
      if (num(s.rows[s.acting], 'food') < 0) turns.short += 1;
      if (s.holder !== '') {
        const own = num(s.rows[s.holder], 'activeLuxuries');
        const rivals = Math.max(...SEATS.filter((x) => x !== s.holder).map((x) => num(s.rows[x], 'activeLuxuries')));
        beloved.held += 1;
        if (own > rivals) beloved.sole += 1;
        if (own > 0 && own >= rivals) beloved.tied += 1;
      }
      if (list[i + 1]) after.set(`${s.acting}:${s.year}`, list[i + 1].rows[s.acting]);
    });
    const readAll = (year, f) => {
      const cells = SEATS.map((seat) => after.get(`${seat}:${year}`));
      return cells.every(Boolean) ? cells.map(f) : null;
    };
    const late = (years) => years.filter((y) => y >= 8).length;
    // The baseline's gross income (food counted only when positive) and stock, laggard at least 1.
    const income5 = readAll(5, (c) => num(c, 'incomeWood') + num(c, 'incomeStone') + num(c, 'incomeGold') + Math.max(0, num(c, 'incomeFood')));
    const leaders = income5 ? SEATS.filter((_, s) => income5[s] === Math.max(...income5)) : [];
    const stock10 = readAll(10, (c) => num(c, 'wood') + num(c, 'stone') + num(c, 'gold') + num(c, 'food'));
    return {
      seed: g.seed,
      winner: g.winner ?? null,
      policy: (seat) => (uniform ? rep.meta.policy : g.seatPolicies[seat]),
      termination: g.termination,
      turnsPlayed: g.turnsPlayed,
      tiebreak: ['happiness', 'pops', 'seat'].includes(g.decidedBy),
      riots: SEATS.map((s) => g.seats[s].riotYears.length),
      revolts: SEATS.map((s) => g.seats[s].revoltYears.length),
      lateRiots: SEATS.map((s) => late(g.seats[s].riotYears)),
      hunger: SEATS.map((s) => g.seats[s].popsLostToHunger),
      turns,
      beloved,
      leader5: leaders.length === 1 ? leaders[0] : null,
      tied5: leaders.length > 1,
      ratio10: stock10 ? Math.max(...stock10) / Math.max(1, Math.min(...stock10)) : null,
      influence10: readAll(10, (c) => num(c, 'influence')),
      influence14: readAll(14, (c) => num(c, 'influence')),
    };
  });

  // The CSV readings must count what the report counted.
  const total = rep.riots.total.byYear;
  const checks = [
    [sum(games.map((g) => g.turns.late)), sum(total.filter((y) => y.year >= 8).map((y) => y.playerTurns))],
    [sum(games.map((g) => g.beloved.held)), rep.beloved.total.turnsHeld],
    [sum(games.map((g) => g.beloved.sole)), rep.beloved.total.soleLuxuryLeader],
    [sum(games.map((g) => g.turns.short)), rep.foodPurchases.total.turnsBegunShort],
  ];
  const agrees = checks.every(([a, b]) => a === b);
  return { name: basename(base), rep, games, uniform, agrees };
}

function check(batch) {
  const { rep, games, uniform } = batch;
  const meta = rep.meta;
  const bySeed = new Map();
  for (const g of games) (bySeed.get(g.seed) ?? bySeed.set(g.seed, []).get(g.seed)).push(g);
  const clusters = [...bySeed.values()];
  const rows = [];
  const add = (rule, limit, unit, value, ci, n, verdict, show) => rows.push({ rule, limit, unit, value, ci, n, verdict, show });
  const ofPolicy = (gs, fn) => POLICIES.map((p) => `${p} ${fn(gs, p)}`).join(', ');
  const seats = (g, p) => SEATS.filter((s) => g.policy(s) === p);
  const finished = games.filter((g) => g.winner != null);

  // Riots: the riot table reached on at most 10% of turns from year 8.
  const riotShare = (gs) => sum(gs.map((g) => sum(g.lateRiots))) / sum(gs.map((g) => g.turns.late));
  {
    const v = riotShare(games);
    const ci = interval(clusters, riotShare);
    const riots = sum(games.map((g) => sum(g.lateRiots)));
    const revolts = sum(games.map((g) => sum(g.revolts)));
    let show = `${pct(v)} (${thousands(riots)} of ${thousands(sum(games.map((g) => g.turns.late)))} turns; ${revolts} revolts in all)`;
    if (!uniform)
      show += `; ${ofPolicy(games, (gs, p) => pct(sum(gs.map((g) => sum(seats(g, p).map((s) => g.lateRiots[s])))) / sum(gs.map((g) => sum(seats(g, p).map((s) => g.turns.lateBySeat[s]))))))}`;
    add('Riots stay rare: riot turns from year 8', '≤ 10%', 'pct', v, ci, games.length, judge(v, ci, 0.1), show);
  }

  // Influence: the median stock grows by at most 5 a year from year 10 to year 14.
  const reached = games.filter((g) => g.influence10 && g.influence14);
  const growth = (gs, p) => {
    const pick = (g, list) => list.filter((_, s) => !p || g.policy(String(s)) === p);
    const r = gs.filter((g) => g.influence10 && g.influence14);
    return (median(r.flatMap((g) => pick(g, g.influence14))) - median(r.flatMap((g) => pick(g, g.influence10)))) / 4;
  };
  {
    const v = growth(reached);
    const ci = interval(clusters, (gs) => growth(gs));
    let show = `${signed(v)} a year (median ${median(reached.flatMap((g) => g.influence10))} → ${median(reached.flatMap((g) => g.influence14))})`;
    if (!uniform) show += `; ${ofPolicy(reached, (gs, p) => signed(growth(gs, p)))}`;
    add('Influence plateaus: median stock, year 10 to 14', '≤ +5.0 a year', 'signed', v, ci, reached.length, judge(v, ci, 5), show);
  }

  // Hunger: recorded, no limit yet.
  {
    const lost = (gs) => mean(gs.flatMap((g) => g.hunger));
    const v = lost(games);
    let show = r2(v);
    if (!uniform) show += `; ${ofPolicy(games, (gs, p) => r2(mean(gs.flatMap((g) => seats(g, p).map((s) => g.hunger[s])))))}`;
    add('Hunger: pops lost a seat-game', 'none set', 'num', v, interval(clusters, lost), games.length, 'record', show);
    const short = (gs) => sum(gs.map((g) => g.turns.short)) / sum(gs.map((g) => g.turns.all));
    const s = short(games);
    add('Hunger: turns begun short of food', 'none set', 'pct', s, interval(clusters, short), games.length, 'record',
      `${pct(s)} (${thousands(sum(games.map((g) => g.turns.short)))} of ${thousands(sum(games.map((g) => g.turns.all)))})`);
  }

  // Beloved: its holder is the sole luxury leader in at most 60% of the turns it is held.
  {
    const share = (gs) => sum(gs.map((g) => g.beloved.sole)) / sum(gs.map((g) => g.beloved.held));
    const held = sum(games.map((g) => g.beloved.held));
    const v = share(games);
    const ci = interval(clusters, share);
    const tied = sum(games.map((g) => g.beloved.tied)) / held;
    add('Luxuries do not decide Beloved: holder is sole luxury leader', '≤ 60% of turns held', 'pct', v, ci, games.length, held ? judge(v, ci, 0.6) : 'no data',
      `${pct(v)} of ${held} turns held (${pct(tied)} counting a tie)`);
  }

  // Runaway leader: the year-5 income leader wins at most 40%; judged where all seats play one bot.
  {
    const sole = finished.filter((g) => g.leader5 != null);
    const won = (g) => g.leader5 === String(g.winner);
    const rate = (gs) => {
      const in5 = gs.filter((g) => g.winner != null && g.leader5 != null);
      return in5.filter(won).length / in5.length;
    };
    const v = rate(games);
    const ci = interval(clusters, rate);
    const tiedOut = finished.filter((g) => g.tied5).length;
    add('Leader does not run away: year-5 income leader wins', '≤ 40%', 'pct', v, ci, sole.length, uniform ? judge(v, ci, 0.4) : 'reference (mixed table)',
      `${pct(v)} (${sole.filter(won).length} of ${sole.length}; ${tiedOut} games with a tied leader left out)`);
  }

  // Stock ratio: the leader holds at most 2.5 times the laggard's stock at year 10.
  {
    const withStock = games.filter((g) => g.ratio10 != null);
    const stat = (gs) => median(gs.filter((g) => g.ratio10 != null).map((g) => g.ratio10));
    const v = stat(games);
    const ci = interval(clusters, stat);
    add('Leader does not run away: year-10 stock, leader ÷ laggard (median game)', '≤ 2.5×', 'ratio', v, ci, withStock.length, judge(v, ci, 2.5),
      `${r1(v)}× (${withStock.filter((g) => g.ratio10 <= 2.5).length} of ${withStock.length} games at or under 2.5×)`);
  }

  // Win rates: each personality wins 20% to 45% of games, a benchmark.
  if (!uniform) {
    for (const p of POLICIES) {
      const rate = (gs) => {
        const sat = gs.filter((g) => g.winner != null && seats(g, p).length);
        return sat.filter((g) => g.policy(String(g.winner)) === p).length / sat.length;
      };
      const sat = finished.filter((g) => seats(g, p).length);
      const wins = sat.filter((g) => g.policy(String(g.winner)) === p);
      const v = rate(games);
      const ci = interval(clusters, rate);
      add(`Every build is viable: ${p} wins`, '20% to 45%', 'pct', v, ci, sat.length, bench(v, ci),
        `${pct(v)} (${wins.length} of ${sat.length}; ${wins.filter((g) => g.tiebreak).length} on a tiebreak)`);
    }
  }

  // Draws: the spread of draw swings against income, recorded.
  {
    const d = rep.drawSwingSummary.total;
    add('Draws: swing against what the seat collected', 'report only', 'pct', NaN, null, games.length, 'record',
      `resource cards ${thousands(d.resourceCards)}: median ${pct(d.collectedRatio.median)}, p90 ${pct(d.collectedRatio.p90)}; pop cards ${thousands(d.popCards)}, token cards ${d.tokenCards}, unchanged ${d.unchanged} of ${thousands(d.draws)} draws`);
  }

  // Length and endings: fourteen years, the share ending by the race recorded.
  {
    const race = (gs) => gs.filter((g) => g.termination === 'victoryRace').length / gs.length;
    const v = race(games);
    const t = rep.terminations;
    add('Length: games ending by the race', 'report only', 'pct', v, interval(clusters, race), games.length, 'record',
      `${pct(v)} (race ${t.victoryRace ?? 0}, deck ${t.deckExhausted ?? 0}, turn cap ${t.turnCap ?? 0}); ${r1(mean(games.map((g) => g.turnsPlayed)))} turns a game; ${finished.filter((g) => g.tiebreak).length} won on a tiebreak`);
  }

  add('Legibility: reads per decision against the paper\'s 5.11', 'report only', 'num', NaN, null, 0, 'by hand', 'not from a batch');

  // Header, then the table.
  const ideas = meta.withoutIdeas?.length ? (meta.withoutIdeas.length >= 12 ? 'no Ideas' : `without ${meta.withoutIdeas.join(', ')}`) : 'all Ideas';
  const seeds = clusters.length;
  const table = uniform ? `four ${meta.policy}s` : `mixed (${Object.values(meta.seatPolicies).join(', ')}, ${meta.rotations} seatings a seed)`;
  console.log(`\n## ${batch.name}\n`);
  console.log(`${meta.boardLayout} · ${table} · ${games.length} games on ${seeds} seeds from ${meta.baseSeed} · ${ideas} · patch ${meta.rulesetPatch ? JSON.stringify(meta.rulesetPatch) : 'none'} · ${meta.turns} turns · ${meta.definition?.id ?? ''}`);
  const want = uniform ? [`the level rules want ${WANT.level}`] : [`win rates want ${WANT.winRates}`, `the level rules ${WANT.level}`];
  const short = (uniform ? games.length < WANT.level : games.length < WANT.winRates) ? ` Short sample: ${want.join(' and ')} games.` : '';
  console.log(`CSV readings ${batch.agrees ? 'match' : 'DO NOT match'} the report's counts.${short}\n`);
  console.log('| Rule | Limit | Measured | 95% interval | Games | Verdict |');
  console.log('| --- | --- | --- | --- | --- | --- |');
  for (const r of rows) {
    const fmt = { pct, ratio: (x) => `${r1(x)}×`, signed, num: r2 }[r.unit];
    const ci = r.ci ? `${fmt(r.ci[0])} to ${fmt(r.ci[1])}` : '–';
    console.log(`| ${r.rule} | ${r.limit} | ${r.show} | ${ci} | ${r.n || '–'} | ${r.verdict} |`);
  }
  const notable = rows.filter((r) => /^fail|FLAG/.test(r.verdict)).map((r) => `${r.rule} (${r.verdict})`);
  console.log(`\nFails and flags: ${notable.length ? notable.join('; ') : 'none'}.`);
  return { batch, finished };
}

// The figures v1 also recorded: win spread, game length, riots a game.
function v1Table(results) {
  const cols = results.map(({ batch, finished }) => {
    const { games, uniform } = batch;
    const bySeat = SEATS.map((s) => finished.filter((g) => String(g.winner) === s).length / finished.length);
    const byPolicy = uniform
      ? '–'
      : `${POLICIES.map((p) => pct(finished.filter((g) => g.policy(String(g.winner)) === p).length / finished.filter((g) => SEATS.some((s) => g.policy(s) === p)).length).replace('%', '')).join(' / ')}%`;
    const riots = sum(games.map((g) => sum(g.riots)));
    const revolts = sum(games.map((g) => sum(g.revolts)));
    const turns = sum(games.map((g) => g.turnsPlayed));
    return {
      name: batch.name,
      seats: `${bySeat.map((x) => pct(x).replace('%', '')).join(' / ')}%`,
      policies: byPolicy,
      turns: r1(turns / games.length),
      race: `${games.filter((g) => g.termination === 'victoryRace').length} of ${games.length}`,
      riots: `${r1(riots / games.length)} (+${r1(revolts / games.length)} revolts)`,
      per100: r1((100 * (riots + revolts)) / turns),
    };
  });
  const all = [
    ...V1.map((v) => ({ ...v, policies: '–', turns: r1(v.turns), riots: r1(v.riots), per100: r1((100 * v.riots) / v.turns) })),
    ...cols,
  ];
  console.log('\n## v1 against v2: the figures both record\n');
  console.log(`| | ${all.map((c) => c.name).join(' | ')} |`);
  console.log(`| --- | ${all.map(() => '---').join(' | ')} |`);
  const line = (label, key) => console.log(`| ${label} | ${all.map((c) => c[key]).join(' | ')} |`);
  line('Wins by seat, first to fourth', 'seats');
  line('Wins slaver / civic / trader / master', 'policies');
  line('Player-turns a game', 'turns');
  line('Ended by the race', 'race');
  line('Riots a game', 'riots');
  line('Riots and revolts per 100 player-turns', 'per100');
  console.log('\nv1 counts riots at both tiers (a v1 revolt-tier riot rolled the table); v2 revolts roll none and are shown apart. v1 games ran to the race at 83 to 104 turns, v2 stops at 56.');
}

const paths = process.argv.slice(2);
if (!paths.length) {
  console.error('usage: node check.mjs <report> [<report> ...]');
  process.exit(1);
}
v1Table(paths.map(load).map(check));
