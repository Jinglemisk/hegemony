// Where the controls' colonies were founded, from the founding replays.
//   node foundings-summary.mjs
import { readFileSync } from 'node:fs';

const HERE = new URL('../', import.meta.url).pathname;
const SEATS = ['0', '1', '2', '3'];
const r2 = (x) => (Math.round(x * 100) / 100).toFixed(2);

for (const arm of ['bf1', 'control']) {
  const { checks, foundings } = JSON.parse(readFileSync(`${HERE}foundings-${arm}.json`, 'utf8'));
  const games = checks.length;
  console.log(`\n${arm}: ${games} games replayed, winners match the report in ${checks.filter((c) => c.match).length}`);
  const play = foundings.filter((f) => !f.setup);
  const line = (label, fn) => console.log(`  ${label}: ${SEATS.map((s) => fn(play.filter((f) => f.seat === s), s)).join(' / ')}`);
  line('gameplay foundings a game', (fs) => r2(fs.length / games));
  line('of them by the leapfrog (not bordering the realm)', (fs) => `${fs.filter((f) => !f.contiguous).length} of ${fs.length}`);
  line('by the leapfrog in years 1–5', (fs) => fs.filter((f) => !f.contiguous && f.year <= 5).length);
  line('slots, leapfrog sites', (fs) => r2(avg(fs.filter((f) => !f.contiguous).map((f) => f.slots))));
  line('slots, bordering sites', (fs) => r2(avg(fs.filter((f) => f.contiguous).map((f) => f.slots))));
  line('food sites founded', (fs) => fs.filter((f) => f.resource === 'food').length);
  line('mooring sites founded', (fs) => fs.filter((f) => f.moorings > 0).length);
  line('distance from the realm, leapfrog sites', (fs) => r2(avg(fs.filter((f) => !f.contiguous).map((f) => f.nearestOwn))));
  const total = play.length;
  const leap = play.filter((f) => !f.contiguous).length;
  console.log(`  all seats: ${total} gameplay foundings, ${leap} by the leapfrog (${Math.round((100 * leap) / total)}%)`);
  // Who founds first in the game, and whether it sails.
  const firstBySeat = [0, 0, 0, 0];
  let firstLeap = 0;
  for (const c of checks) {
    const f = play.find((x) => x.seed === c.seed);
    if (!f) continue;
    firstBySeat[Number(f.seat)] += 1;
    if (!f.contiguous) firstLeap += 1;
  }
  console.log(`  first gameplay founding of the game, by seat: ${firstBySeat.join(' / ')} (by the leapfrog in ${firstLeap})`);
  const setup = foundings.filter((f) => f.setup);
  console.log(`  founding colonies not bordering the capital: ${SEATS.map((s) => setup.filter((f) => f.seat === s && !f.contiguous).length).join(' / ')}`);
}

function avg(xs) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}
