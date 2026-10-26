// The figures behind the report's open points, per batch:
// - the year-5 income leader's wins read at the start of each seat's own turn and after it;
// - the year-10 stocks behind the leader ÷ laggard ratio (the laggard counted as at least 1);
// - the same ratio on pops, the baseline's other snowball measure;
// - on a mixed table, which personality leads year-5 income and year-10 stock.
//   node open-points.mjs <report> [<report> ...]   (a report path, with or without .json)
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const SEATS = ['0', '1', '2', '3'];
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (a, b) => `${Math.round((100 * a) / b)}%`;

for (const arg of process.argv.slice(2)) {
  const base = arg.replace(/\.(json|csv)$/, '');
  const rep = JSON.parse(readFileSync(`${base}.json`, 'utf8'));
  const lines = readFileSync(`${base}.csv`, 'utf8').trim().split('\n');
  const head = lines[0].split(',');
  const at = Object.fromEntries(head.map((h, i) => [h, i]));
  const num = (c, name) => Number(c[at[name]]);
  const snapshots = new Map();
  for (const line of lines.slice(1)) {
    const c = line.split(',');
    if (!snapshots.has(c[at.game])) snapshots.set(c[at.game], []);
    const list = snapshots.get(c[at.game]);
    const key = `${c[at.turn]}:${c[at.final]}`;
    if (list.at(-1)?.key !== key) list.push({ key, year: Number(c[at.year]), acting: c[at.actingSeat], final: c[at.final] === '1', rows: {} });
    list.at(-1).rows[c[at.player]] = c;
  }
  const income = (c) => num(c, 'incomeWood') + num(c, 'incomeStone') + num(c, 'incomeGold') + Math.max(0, num(c, 'incomeFood'));
  const stock = (c) => num(c, 'wood') + num(c, 'stone') + num(c, 'gold') + num(c, 'food');
  const reading = { start: [0, 0], after: [0, 0] };
  const stocks = { leader: [], laggard: [], laggardAtMostOne: 0, games: 0 };
  const popRatios = [];
  const leads = { income: {}, stock: {} };
  for (const g of rep.perGame) {
    const list = snapshots.get(String(g.game)) ?? [];
    const policy = (seat) => g.seatPolicies?.[seat] ?? rep.meta.policy;
    const start = {};
    const after = {};
    list.forEach((s, i) => {
      if (s.final) return;
      start[`${s.acting}:${s.year}`] = s.rows[s.acting];
      if (list[i + 1]) after[`${s.acting}:${s.year}`] = list[i + 1].rows[s.acting];
    });
    for (const [name, map] of [['start', start], ['after', after]]) {
      const cells = SEATS.map((s) => map[`${s}:5`]);
      if (!cells.every(Boolean) || g.winner == null) continue;
      const inc = cells.map(income);
      const top = SEATS.filter((_, s) => inc[s] === Math.max(...inc));
      if (top.length !== 1) continue;
      reading[name][1] += 1;
      if (top[0] === String(g.winner)) reading[name][0] += 1;
      if (name === 'after') leads.income[policy(top[0])] = (leads.income[policy(top[0])] ?? 0) + 1;
    }
    const y10 = SEATS.map((s) => after[`${s}:10`]);
    if (y10.every(Boolean)) {
      const st = y10.map(stock);
      stocks.games += 1;
      stocks.leader.push(Math.max(...st));
      stocks.laggard.push(Math.min(...st));
      if (Math.min(...st) <= 1) stocks.laggardAtMostOne += 1;
      const pops = y10.map((c) => num(c, 'pops'));
      popRatios.push(Math.max(...pops) / Math.max(1, Math.min(...pops)));
      const lead = SEATS[st.indexOf(Math.max(...st))];
      leads.stock[policy(lead)] = (leads.stock[policy(lead)] ?? 0) + 1;
    }
  }
  console.log(`\n${basename(base)}`);
  console.log(`  year-5 income leader wins: start of its own turn ${reading.start[0]}/${reading.start[1]} (${pct(...reading.start)}); after it ${reading.after[0]}/${reading.after[1]} (${pct(...reading.after)})`);
  console.log(`  year-10 stock: leader median ${median(stocks.leader)}, laggard median ${median(stocks.laggard)}; laggard at 1 or less in ${stocks.laggardAtMostOne}/${stocks.games}`);
  console.log(`  year-10 pops, leader ÷ laggard: median game ${median(popRatios).toFixed(2)}×`);
  if (rep.meta.seatPolicies) {
    console.log(`  year-5 income leader by personality: ${JSON.stringify(leads.income)}`);
    console.log(`  year-10 stock leader by personality: ${JSON.stringify(leads.stock)}`);
  }
}
