// Year by year, by seat: income on the seat's own turn and pops at the end of the year.
//   node years.mjs <batch base path without extension>
import { readFileSync } from 'node:fs';

const base = process.argv[2];
const lines = readFileSync(`${base}.csv`, 'utf8').trim().split('\n');
const head = lines[0].split(',');
const rows = lines.slice(1).map((l) => Object.fromEntries(l.split(',').map((c, i) => [head[i], /^-?\d+(\.\d+)?$/.test(c) ? Number(c) : c])));
const SEATS = [0, 1, 2, 3];
const mean = (xs) => (xs.reduce((a, b) => a + b, 0) / (xs.length || 1)).toFixed(2);
const own = rows.filter((r) => r.player === r.actingSeat && r.final !== 1);
// A row is the table at the start of the acting seat's turn; "after year y" is the start
// of the seat's own turn in year y+1, so every seat has had y turns.
const last = new Map();
for (const r of own) last.set(`${r.game}:${r.player}:${r.year - 1}`, r);
const gamesList = [...new Set(rows.map((r) => r.game))];
console.log('year | income by seat (own turn) | food income | pops after the seat\'s turn | food stock after | colonies + cities after');
for (let y = 1; y <= 8; y++) {
  const inc = SEATS.map((s) => mean(own.filter((r) => r.year === y && r.player === s).map((r) => r.incomeWood + r.incomeStone + r.incomeGold + r.incomeFood)));
  const food = SEATS.map((s) => mean(own.filter((r) => r.year === y && r.player === s).map((r) => r.incomeFood)));
  const end = (key) => SEATS.map((s) => mean(gamesList.map((g) => last.get(`${g}:${s}:${y}`)).filter(Boolean).map((r) => (typeof key === 'function' ? key(r) : r[key]))));
  console.log(`${y} | ${inc.join(' / ')} | ${food.join(' / ')} | ${end('pops').join(' / ')} | ${end('food').join(' / ')} | ${end((r) => r.colonies + r.cities).join(' / ')}`);
}
