// Game-to-game spread of the per-game figures this report compares: the mean a game and
// twice its standard error, for Ports, temples, cities at the end and gold income.
//   node spread.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('..', import.meta.url));
const ARMS = ['conti-masters', 'archi-masters-hop4', 'archi-masters-anyshore', 'conti-mixed', 'archi-mixed-hop4'];

const meanAnd2se = (xs) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
  return `${m.toFixed(2)} ± ${((2 * sd) / Math.sqrt(xs.length)).toFixed(2)}`;
};

for (const arm of ARMS) {
  const rep = JSON.parse(readFileSync(`${OUT}/${arm}.json`, 'utf8'));
  const perGame = (key) =>
    rep.perGame.map((g) => Object.values(g.seats).reduce((a, s) => a + (s.reach[key] ?? 0), 0));

  // Gold income a seat-game, summed over each seat's own turns, then averaged per game.
  const lines = readFileSync(`${OUT}/${arm}.csv`, 'utf8').trim().split('\n');
  const head = lines[0].split(',');
  const col = (name) => head.indexOf(name);
  const gold = new Map();
  const cities = new Map();
  for (const line of lines.slice(1)) {
    const c = line.split(',');
    const game = c[col('game')];
    if (c[col('final')] === '1') cities.set(game, (cities.get(game) ?? 0) + Number(c[col('cities')]) / 4);
    else if (c[col('player')] === c[col('actingSeat')])
      gold.set(game, (gold.get(game) ?? 0) + Number(c[col('incomeGold')]) / 4);
  }

  console.log(
    `${arm}: ports ${meanAnd2se(perGame('building:port'))}; temples ${meanAnd2se(perGame('building:temple'))}; ` +
      `cities at the end ${meanAnd2se([...cities.values()])}; ` +
      `gold income a seat-game ${meanAnd2se([...gold.values()])}`,
  );
}
