// Seat figures for the leapfrog arms beside their controls, from the batch reports and
// turn snapshots.   node compare.mjs
import { existsSync, readFileSync } from 'node:fs';

const SIM = new URL('../../', import.meta.url).pathname;
const HERE = `${SIM}2026-10-25-leapfrog-off`;
// The confirming batch (#140): in the repo once merged, else the checkout it ran in.
const CONFIRMING = existsSync(`${SIM}2026-10-25-no-base-income/masters.json`)
  ? `${SIM}2026-10-25-no-base-income/masters`
  : '/Users/jinglemisk/Desktop/hegemony-code-health/docs/reports/simulation/2026-10-25-no-base-income/masters';
const ARMS = [
  { name: 'BF1 control (10-24 masters-shuffled)', base: `${SIM}2026-10-24-balance-lines/masters-shuffled` },
  { name: 'BF1, leapfrog off', base: `${HERE}/masters-bf1` },
  { name: 'BF0 control (confirming batch)', base: CONFIRMING },
  { name: 'BF0, leapfrog off', base: `${HERE}/masters` },
];
const SEATS = ['0', '1', '2', '3'];
const r2 = (x) => (Math.round(x * 100) / 100).toFixed(2);

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

const winnersBySeed = {};
for (const arm of ARMS) {
  if (!existsSync(`${arm.base}.json`)) {
    console.log(`\n## ${arm.name}: not run`);
    continue;
  }
  const rep = JSON.parse(readFileSync(`${arm.base}.json`, 'utf8'));
  const rows = readCsv(`${arm.base}.csv`);
  winnersBySeed[arm.name] = Object.fromEntries(rep.perGame.map((g) => [g.seed, g.winner]));
  const games = rep.perGame.length;
  const line = (label, fn) => console.log(`${label}: ${SEATS.map(fn).join(' / ')}`);
  console.log(`\n## ${arm.name} — ${rep.meta.definition.id}`);
  console.log(`games ${games}; ended by the race ${rep.terminations.victoryRace ?? 0}, by the deck ${rep.terminations.deckExhausted ?? 0}`);
  line('wins by seat', (s) => rep.results.perSeat[s].wins);
  line('race wins by seat', (s) => rep.results.perSeat[s].winsDecidedBy.race);
  const dec = rep.results.total.winsDecidedBy;
  console.log(`wins decided by: ${Object.entries(dec).map(([k, v]) => `${k} ${typeof v === 'number' ? v : v.count}`).join(', ')}`);
  for (const t of ['polis-builder', 'demos', 'civic-elite', 'voice', 'beloved', 'treasurer'])
    line(`${t} held at the end`, (s) => rep.results.perSeat[s].finalTitles[t] ?? 0);
  line('gameplay colonies founded a game', (s) => r2(rep.perGame.reduce((a, g) => a + (g.seats[s].reach['command:foundColony'] ?? 0), 0) / games));
  line('colonies upgraded to cities a game', (s) => r2(rep.perGame.reduce((a, g) => a + (g.seats[s].reach['command:upgradeColonyToCity'] ?? 0), 0) / games));
  line('Ports built a game', (s) => r2(rep.perGame.reduce((a, g) => a + (g.seats[s].reach['building:port'] ?? 0), 0) / games));
  line('pops lost to hunger a game', (s) => r2(rep.perGame.reduce((a, g) => a + g.seats[s].popsLostToHunger, 0) / games));
  line('turns begun short of food', (s) => rep.foodPurchases.perSeat[s].turnsBegunShort);
  line('Dole uses a game', (s) => r2(rep.perGame.reduce((a, g) => a + (g.seats[s].reach['command:dole'] ?? 0), 0) / games));

  // A row is the table at the start of the acting seat's turn. Incomes are read at the
  // start of the seat's own turn of that year. Stocks and counts "at year Y" are read
  // after the seat's own turn of year Y (the start of its turn in year Y+1; the final
  // row for year 14), so every seat has had the same number of turns. The confirming
  // batch's report read the year's last row instead, which comes before the last seat's
  // turn of that year.
  const own = rows.filter((r) => r.player === r.actingSeat && r.final !== 1);
  const after = new Map();
  for (const r of own) after.set(`${r.game}:${r.player}:${r.year - 1}`, r);
  for (const r of rows) if (r.final === 1) after.set(`${r.game}:${r.player}:final`, r);
  const at = (year, s, key) => {
    const final = (g) => {
      const r = after.get(`${g.game}:${s}:final`);
      return r && r.year <= year ? r : undefined;
    };
    const xs = rep.perGame
      .map((g) => after.get(`${g.game}:${s}:${year}`) ?? final(g))
      .filter(Boolean)
      .map((r) => r[key]);
    return xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  };
  const income = (r) => r.incomeWood + r.incomeStone + r.incomeGold + r.incomeFood;
  for (const y of [1, 3, 5]) {
    line(`income year ${y} (wood+stone+gold+food)`, (s) => {
      const xs = own.filter((r) => r.year === y && String(r.player) === s).map(income);
      return r2(xs.reduce((a, b) => a + b, 0) / (xs.length || 1));
    });
  }
  line('food income year 3', (s) => r2(at(3, s, 'incomeFood')));
  line('cities at year 5', (s) => r2(at(5, s, 'cities')));
  line('colonies at year 5', (s) => r2(at(5, s, 'colonies')));
  line('cities at year 10', (s) => r2(at(10, s, 'cities')));
  for (const y of [1, 3, 5, 10, 14]) line(`pops at year ${y}`, (s) => r2(at(y, s, 'pops')));
  line('reach (frontier tiles) at year 3', (s) => r2(at(3, s, 'frontierTiles')));
  line('influence at year 14', (s) => r2(at(14, s, 'influence')));

  // The year-5 income leader's wins (ties skipped).
  let lg = 0;
  let lw = 0;
  const leaderSeat = [0, 0, 0, 0];
  for (const g of rep.perGame) {
    const inc = SEATS.map((s) => own.find((r) => r.game === g.game && r.year === 5 && String(r.player) === s)).map((r) => (r ? income(r) : -1));
    const top = Math.max(...inc);
    if (inc.filter((v) => v === top).length !== 1 || g.winner == null) continue;
    lg += 1;
    leaderSeat[inc.indexOf(top)] += 1;
    if (String(inc.indexOf(top)) === String(g.winner)) lw += 1;
  }
  console.log(`year-5 income leader wins ${lw} of ${lg}; leader by seat ${leaderSeat.join(' / ')}`);
}

const same = (a, b) => {
  const A = winnersBySeed[a];
  const B = winnersBySeed[b];
  if (!A || !B) return '–';
  return Object.keys(A).filter((s) => A[s] === B[s]).length;
};
console.log(`\nsame winner as the control: BF1 ${same(ARMS[0].name, ARMS[1].name)}, BF0 ${same(ARMS[2].name, ARMS[3].name)}`);
