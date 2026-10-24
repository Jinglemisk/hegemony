// One table per table type (mixed, masters): every finished balance-lines arm beside its
// control from the 2026-10-22 trade batches, on the balance check's rules and the food and
// gold figures.   node summarize.mjs [--json]
import { existsSync, readFileSync } from 'node:fs';

const SIM = '/Users/jinglemisk/Desktop/hegemony-code-health/docs/reports/simulation';
const TP = `${SIM}/2026-10-22-trade-paired`;
const OUT = `${SIM}/2026-10-24-balance-lines`;
const HERE = new URL('.', import.meta.url).pathname;
const queue = JSON.parse(readFileSync(`${HERE}queue-full.json`, 'utf8'));

const CONTROLS = [
  { name: 'control (10-22)', table: 'mixed', base: `${TP}/mixed-trade-base-food` },
  { name: 'control, no base food (10-22)', table: 'mixed', base: `${TP}/mixed-trade` },
  { name: 'control (10-22)', table: 'masters', base: `${TP}/masters-trade-base-food` },
];
// The 10-22 controls are on the classic board; the shuffled arms' controls are
// mixed-shuffled and masters-shuffled. --classic adds the old ones.
const arms = [
  ...(process.argv.includes('--classic') ? CONTROLS : []),
  ...queue
    .filter((a) => existsSync(`${OUT}/${a.name}.json`))
    .map((a) => ({ name: a.name, table: a.table.startsWith('masters') ? 'masters' : 'mixed', base: `${OUT}/${a.name}` })),
];

const r0 = (x) => Math.round(x);
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const pct = (a, b) => (b ? `${r0((100 * a) / b)}%` : '–');
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return NaN;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const count = (v) => (typeof v === 'number' ? v : (v?.count ?? 0));
const POLICIES = ['slaver', 'civic', 'trader', 'master'];

function readCsv(path) {
  const lines = readFileSync(path, 'utf8').trim().split('\n');
  const head = lines[0].split(',');
  return lines.slice(1).map((l) => {
    const c = l.split(',');
    const o = {};
    head.forEach((h, i) => (o[h] = /^-?\d+(\.\d+)?$/.test(c[i]) ? Number(c[i]) : c[i]));
    return o;
  });
}

function figures(arm) {
  const rep = JSON.parse(readFileSync(`${arm.base}.json`, 'utf8'));
  const rows = readCsv(`${arm.base}.csv`);
  const games = rep.perGame.length;
  const f = {};
  const policyOf = (g, seat) => g.seatPolicies?.[seat] ?? 'master';

  // Endings and wins.
  const ended = rep.terminations;
  f['Games by race / by deck'] = `${ended.victoryRace ?? 0} / ${ended.deckExhausted ?? 0}`;
  f['Won on a tiebreak'] = Object.entries(rep.results.total.winsDecidedBy ?? {})
    .filter(([k]) => k !== 'race' && k !== 'titles')
    .reduce((a, [, v]) => a + count(v), 0);
  f['Wins by seat'] = [0, 1, 2, 3].map((s) => rep.results.perSeat[s].wins).join(' / ');
  if (arm.table === 'mixed')
    f['Wins slaver / civic / trader / master'] = POLICIES.map((p) => rep.results.perPolicy[p]?.wins ?? 0).join(' / ');

  // Gold and Treasurer.
  const endGold = {};
  let treasurerHeld = 0;
  let winsWithTreasurer = 0;
  for (const g of rep.perGame) {
    for (const [seat, s] of Object.entries(g.seats)) {
      (endGold[policyOf(g, seat)] ??= []).push(s.finalGold);
      if (s.finalTitles.includes('treasurer')) treasurerHeld += 1;
    }
    if (g.winner != null && g.seats[g.winner].finalTitles.includes('treasurer')) winsWithTreasurer += 1;
  }
  f['Treasurer held at the end; winners holding it'] = `${treasurerHeld}; ${winsWithTreasurer}`;
  f['End gold, median'] =
    arm.table === 'mixed' ? POLICIES.map((p) => median(endGold[p] ?? [])).join(' / ') : `${median(endGold.master)}`;

  // Per seat-game figures from the turn rows.
  const seat = new Map();
  for (const r of rows) {
    const key = `${r.game}:${r.player}`;
    if (!seat.has(key)) seat.set(key, { policy: r.policy, gold: 0, food: 0, last: null });
    const s = seat.get(key);
    if (r.player === r.actingSeat && r.final !== 1) {
      s.gold += r.incomeGold;
      s.food += r.incomeFood;
    }
    s.last = r;
  }
  const byPolicy = {};
  for (const s of seat.values()) (byPolicy[s.policy] ??= []).push(s);
  const groupLine = (fn) =>
    arm.table === 'mixed' ? POLICIES.map((p) => fn(byPolicy[p] ?? [])).join(' / ') : `${fn(byPolicy.master)}`;
  const avg = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  f['Gold income a seat-game'] = groupLine((l) => r0(avg(l.map((s) => s.gold))));
  f['Slave share at the end'] = groupLine((l) => {
    const sl = avg(l.map((s) => s.last.slaves));
    const all = avg(l.map((s) => s.last.slaves + s.last.freemen + s.last.citizens));
    return pct(sl, all);
  });
  f['Pops at year 14 (mean)'] = r1(rep.perYear[13].pops.mean);

  // Food.
  f['Turns begun short of food'] = rep.foodPurchases.total.turnsBegunShort;
  f['Dole uses a game'] = r1(rep.currencyVerbs.dole.perGame);
  f['Pops lost to hunger a seat-game'] = groupLine((l) => r2(avg(l.map((s) => s.last.popsLostToHunger))));
  const prices = rep.trade?.total?.prices?.food?.gold;
  f['Food sold for gold: trades, median price'] = prices ? `${prices.trades}, ${prices.price.median}` : '0';
  const trade = rep.trade?.total;
  f['Trades settled a game'] = trade ? r1(count(trade.offers?.settled) / games) : '–';
  f['Food traded a game'] = trade ? r1(count(trade.given?.food) / games) : '–';
  f['Bank buys a game (trader)'] = `${r1(rep.currencyVerbs.bankBuy.perGame)} (${r1(count(rep.reach.perPolicy.trader?.counts?.['command:bankBuy']) / (rep.reach.perPolicy.trader?.seatGames || 1))})`;
  f['Ventures a game'] = r1(rep.currencyVerbs.fundExpedition.perGame);

  // The balance check's rules.
  const infl = rep.perYear.map((y) => y.influence.total.median);
  f['Influence median, year 10 → 14 (a year)'] = `${infl[9]} → ${infl[13]} (${r1((infl[13] - infl[9]) / 4)})`;
  const late = rep.riots.total.byYear.filter((y) => y.year >= 8);
  const riots = late.reduce((a, y) => a + y.riots, 0);
  const turns = late.reduce((a, y) => a + y.playerTurns, 0);
  let riotLine = pct(riots, turns);
  if (arm.table === 'mixed') {
    const sl = (rep.riots.perPolicy.slaver?.byYear ?? []).filter((y) => y.year >= 8);
    riotLine += ` (slaver ${pct(sl.reduce((a, y) => a + y.riots, 0), sl.reduce((a, y) => a + y.playerTurns, 0))})`;
  }
  f['Riot turns from year 8 (rule ≤10%)'] = riotLine;
  const bel = rep.beloved.total;
  f['Beloved: turns held, sole luxury leader (rule ≤60%)'] = `${bel.turnsHeld}, ${pct(bel.soleLuxuryLeader, bel.turnsHeld)}`;

  // Runaway leader, Q80 option B's reading: the year-5 income leader's wins, and the
  // year-10 stock of the leader against the laggard (laggard floored at 1).
  const byGame = new Map();
  for (const r of rows) {
    if (r.final === 1 || r.player !== r.actingSeat) continue;
    if (!byGame.has(r.game)) byGame.set(r.game, { y5: {}, y10: {}, winner: r.winner });
    const g = byGame.get(r.game);
    if (r.year === 5) g.y5[r.player] = r.incomeWood + r.incomeStone + r.incomeGold + r.incomeFood;
    if (r.year === 10) g.y10[r.player] = r.wood + r.stone + r.gold + r.food;
  }
  let leaderGames = 0;
  let leaderWins = 0;
  const ratios = [];
  for (const g of byGame.values()) {
    const inc = Object.entries(g.y5);
    if (inc.length === 4) {
      const top = Math.max(...inc.map(([, v]) => v));
      const leaders = inc.filter(([, v]) => v === top);
      if (leaders.length === 1 && g.winner !== '') {
        leaderGames += 1;
        if (String(g.winner) === String(leaders[0][0])) leaderWins += 1;
      }
    }
    const st = Object.values(g.y10);
    if (st.length === 4) ratios.push(Math.max(...st) / Math.max(1, Math.min(...st)));
  }
  f['Year-5 income leader wins (rule ≤40%)'] = `${leaderWins}/${leaderGames} (${pct(leaderWins, leaderGames)})`;
  f['Year-10 stock, leader ÷ laggard: median; games ≤2.5×'] = `${r1(median(ratios))}; ${ratios.filter((x) => x <= 2.5).length}/${ratios.length}`;
  return f;
}

// --md a,b,c prints those arms as one markdown table, metrics down, arms across.
const mdAt = process.argv.indexOf('--md');
if (mdAt > -1) {
  const names = process.argv[mdAt + 1].split(',');
  const cols = names.map((n) => {
    const arm = arms.find((a) => a.name === n) ?? { name: n, table: n.startsWith('masters') ? 'masters' : 'mixed', base: `${OUT}/${n}` };
    return { ...arm, f: figures(arm) };
  });
  // --rows "Wins~Influence" keeps the metrics whose name contains one of those words.
  const rowsAt = process.argv.indexOf('--rows');
  const wanted = rowsAt > -1 ? process.argv[rowsAt + 1].split('~') : null;
  const keys = Object.keys(cols[0].f).filter((k) => !wanted || wanted.some((w) => k.includes(w)));
  console.log(`| | ${cols.map((c) => c.name).join(' | ')} |`);
  console.log(`| --- | ${cols.map(() => '---').join(' | ')} |`);
  for (const k of keys) console.log(`| ${k} | ${cols.map((c) => c.f[k] ?? '–').join(' | ')} |`);
  process.exit(0);
}

const all = arms.map((a) => ({ ...a, f: figures(a) }));
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(all.map(({ name, table, f }) => ({ name, table, f })), null, 1));
} else {
  for (const table of ['mixed', 'masters']) {
    const cols = all.filter((a) => a.table === table);
    if (!cols.length) continue;
    console.log(`\n## ${table}\n`);
    for (const c of cols) console.log(`- ${c.name}`);
    console.log();
    const keys = Object.keys(cols[0].f);
    for (const k of keys) console.log(`${k}:\n  ${cols.map((c) => `${c.name.slice(0, 26).padEnd(26)} ${c.f[k] ?? '–'}`).join('\n  ')}`);
  }
}
