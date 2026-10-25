// Extra figures per arm: personality wins, Ports and goods, colonies and cities at the end.
//   node extra.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('..', import.meta.url));
const ARMS = [
  ['conti-masters', `${OUT}/conti-masters`],
  ['archi-masters hop 4', `${OUT}/archi-masters-hop4`],
  ['archi-masters any shore', `${OUT}/archi-masters-anyshore`],
  ['conti-mixed', `${OUT}/conti-mixed`],
  ['archi-mixed hop 4', `${OUT}/archi-mixed-hop4`],
];
for (const [label, base] of ARMS) {
  const rep = JSON.parse(readFileSync(`${base}.json`, 'utf8'));
  const lines = readFileSync(`${base}.csv`, 'utf8').trim().split('\n');
  const head = lines[0].split(',');
  const col = (n) => head.indexOf(n);
  const finals = lines.slice(1).map((l) => l.split(',')).filter((c) => c[col('final')] === '1');
  const avg = (name) => (finals.reduce((a, c) => a + Number(c[col(name)]), 0) / finals.length).toFixed(2);
  const pol = ['slaver', 'civic', 'trader', 'master'].map((p) => rep.results.perPolicy?.[p]?.wins ?? '-').join(' / ');
  const forced = JSON.stringify(rep.forced ?? {}).slice(0, 120);
  const b = rep.buildings;
  console.log(`\n${label}: wins by personality ${pol}; end cities ${avg('cities')}, colonies ${avg('colonies')}, luxuries held ${avg('activeLuxuries')}; forced ${forced}`);
  console.log(`  a game: ports ${b.port.perGame}, temples ${b.temple.perGame}, forums ${b.forum.perGame}, goods claimed ${rep.luxuries.claimedPerGame}; colonies founded in play ${rep.movesByType.foundColony.perGame}; turns ${rep.perGame.reduce((a, g) => a + g.turnsPlayed, 0) / rep.perGame.length}`);
}
