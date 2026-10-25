// 2026-10-25-last-colony-pick, run from this folder with the controls' paths:
//   node tools/seats.mjs "control=<#140 folder>/masters" "fix=$PWD/masters" "control-bf1=../2026-10-24-balance-lines/masters-shuffled" "fix-bf1=$PWD/masters-bf1"
// Seat by seat on the masters table: wins, size at year 5 and 14, hunger, and the titles
// held at the end, for the 10-24 arm with 1 base food and main's arm with none.
//   node seats.mjs
import { readFileSync } from 'node:fs';

const SIM = '/Users/jinglemisk/Desktop/hegemony-code-health/docs/reports/simulation';
const ARMS = process.argv.length > 2 ? process.argv.slice(2).map((a) => a.split('=')) : [
  ['1 base food (10-24)', `${SIM}/2026-10-24-balance-lines/masters-shuffled`],
  ['no base income (main)', `${SIM}/2026-10-25-no-base-income/masters`],
];
const TITLES = ['polis-builder', 'demos', 'civic-elite', 'treasurer', 'beloved', 'voice'];
const mean = (xs) => (xs.reduce((a, b) => a + b, 0) / (xs.length || 1)).toFixed(2);

for (const [label, base] of ARMS) {
  const rep = JSON.parse(readFileSync(`${base}.json`, 'utf8'));
  const lines = readFileSync(`${base}.csv`, 'utf8').trim().split('\n');
  const head = lines[0].split(',');
  const col = (name) => head.indexOf(name);
  // A turn's rows are written as the turn ends, so their acting seat is the one about to play.
  // A seat's state after its own year-Y turn is therefore its row in the next snapshot
  // (the final rows after the game's last turn).
  const snapshots = new Map();
  for (const line of lines.slice(1)) {
    const c = line.split(',');
    const game = c[col('game')];
    if (!snapshots.has(game)) snapshots.set(game, []);
    const list = snapshots.get(game);
    const key = `${c[col('turn')]}:${c[col('final')]}`;
    if (list.at(-1)?.key !== key) list.push({ key, year: c[col('year')], acting: c[col('actingSeat')], final: c[col('final')], rows: {} });
    list.at(-1).rows[c[col('player')]] = c;
  }
  const last = new Map();
  for (const [game, list] of snapshots) {
    list.forEach((snap, at) => {
      if (snap.final === '1' || !list[at + 1]) return;
      last.set(`${game}:${snap.acting}:${snap.year}`, list[at + 1].rows[snap.acting]);
    });
  }
  console.log(`\n${label}`);
  console.log('seat | wins | cities, colonies at year 5 | pops at year 5, 14 | pops lost to hunger | titles held at the end');
  for (const seat of [0, 1, 2, 3]) {
    const y5 = [];
    const y14 = [];
    for (const g of rep.perGame) {
      const a = last.get(`${g.game}:${seat}:5`);
      const b = last.get(`${g.game}:${seat}:14`);
      if (a) y5.push(a);
      if (b) y14.push(b);
    }
    const num = (rows, name) => rows.map((c) => Number(c[col(name)]));
    const hunger = rep.perGame.map((g) => g.seats[seat].popsLostToHunger);
    const titles = TITLES.map((t) => `${t} ${rep.perGame.filter((g) => g.seats[seat].finalTitles.includes(t)).length}`);
    console.log(
      `  ${seat}  | ${rep.results.perSeat[seat].wins} | ${mean(num(y5, 'cities'))}, ${mean(num(y5, 'colonies'))} | ${mean(num(y5, 'pops'))}, ${mean(num(y14, 'pops'))} | ${mean(hunger)} | ${titles.join(', ')}`,
    );
  }
}
