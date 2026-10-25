// Joins each arm's setup replay with its batch's winners: who wins from which kind of
// start, over the 160 seat-games of an arm.   node sites.mjs
import { existsSync, readFileSync } from 'node:fs';

const SIM = new URL('../../', import.meta.url).pathname;
const HERE = `${SIM}2026-10-25-leapfrog-off`;
// The confirming batch (#140): in the repo once merged, else the checkout it ran in.
const CONFIRMING = existsSync(`${SIM}2026-10-25-no-base-income/masters.json`)
  ? `${SIM}2026-10-25-no-base-income/masters.json`
  : '/Users/jinglemisk/Desktop/hegemony-code-health/docs/reports/simulation/2026-10-25-no-base-income/masters.json';
const ARMS = [
  ['bf1', `${SIM}2026-10-24-balance-lines/masters-shuffled.json`],
  ['bf1-leapfrog-off', `${HERE}/masters-bf1.json`],
  ['control', CONFIRMING],
  ['leapfrog-off', `${HERE}/masters.json`],
];

for (const [arm, reportPath] of ARMS) {
  const setups = JSON.parse(readFileSync(`${HERE}/setups-${arm}.json`, 'utf8')).games;
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const winner = Object.fromEntries(report.perGame.map((g) => [g.seed, g.winner]));
  const rows = setups.flatMap((g) =>
    Object.entries(g.seats).map(([seat, s]) => ({ ...s, seat, won: winner[g.seed] === seat ? 1 : 0 })),
  );
  const split = (label, fn) => {
    const groups = {};
    for (const r of rows) (groups[fn(r)] ??= []).push(r);
    const parts = Object.entries(groups)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, rs]) => `${k}: ${rs.reduce((a, r) => a + r.won, 0)} of ${rs.length}`);
    console.log(`  ${label} — ${parts.join(' · ')}`);
  };
  console.log(`\n${arm} (wins of seat-games)`);
  split('capital distance from centre', (r) => r.dist);
  split('capital on the coast', (r) => (r.coast ? 'coast' : 'inland'));
  split('free land within 2', (r) => (r.free2 <= 8 ? '≤8' : r.free2 <= 10 ? '9–10' : '≥11'));
  split('food slots held', (r) => (r.foodSlots === 0 ? '0' : r.foodSlots <= 5 ? '1–5' : '6+'));
  split('colony from capital', (r) => (r.colDist <= 1 ? '1' : r.colDist <= 3 ? '2–3' : '4+'));
  split('start income', (r) => String(r.income));
  split('capital makes', (r) => r.capRes);
  split('founding colony makes', (r) => r.colRes);
  // Seat 0 alone: does its edge follow its capital?
  const s0 = rows.filter((r) => r.seat === '0');
  const s0w = (f) => `${s0.filter(f).reduce((a, r) => a + r.won, 0)} of ${s0.filter(f).length}`;
  console.log(`  seat 0, capital on the rim ${s0w((r) => r.dist === 3)}, off it ${s0w((r) => r.dist !== 3)}`);
}
