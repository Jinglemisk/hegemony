// Seat by seat on the masters table: wins, size at year 5 and 14, hunger, and the titles
// held at the end, for the 10-24 arm with 1 base food and main's arm with none.
//   node seats.mjs
import { readFileSync } from 'node:fs';

const SIM = '/Users/jinglemisk/Desktop/hegemony-code-health/docs/reports/simulation';
const ARMS = [
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
  // The last row of a player's year is its state after its own turn and the others'.
  const last = new Map();
  for (const line of lines.slice(1)) {
    const c = line.split(',');
    if (c[col('final')] === '1') continue;
    last.set(`${c[col('game')]}:${c[col('player')]}:${c[col('year')]}`, c);
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
