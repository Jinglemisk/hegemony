// Do two batch reports play the same games? Compares everything but meta, then per-game winners.
//   node same.mjs a.json b.json
import { readFileSync } from 'node:fs';

const [a, b] = process.argv.slice(2).map((p) => JSON.parse(readFileSync(p, 'utf8')));
const strip = (report) => ({ ...report, meta: undefined });
console.log('identical apart from meta:', JSON.stringify(strip(a)) === JSON.stringify(strip(b)));
const games = a.perGame.length;
let sameWinner = 0;
let sameGame = 0;
for (let i = 0; i < games; i++) {
  if (a.perGame[i].winner === b.perGame[i].winner) sameWinner += 1;
  if (JSON.stringify(a.perGame[i]) === JSON.stringify(b.perGame[i])) sameGame += 1;
}
console.log(`games ${games}; same winner ${sameWinner}; identical game rows ${sameGame}`);
console.log('wins by seat:', [0, 1, 2, 3].map((s) => a.results.perSeat[s].wins).join('/'), 'vs', [0, 1, 2, 3].map((s) => b.results.perSeat[s].wins).join('/'));
const pol = (r) => ['slaver', 'civic', 'trader', 'master'].map((p) => r.results.perPolicy?.[p]?.wins ?? 0).join('/');
console.log('wins by policy:', pol(a), 'vs', pol(b));
