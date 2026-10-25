// The control against the bonus arm, seat by seat. Year figures are each seat's row right
// after its own turn of that year (a CSV row is the table at the start of the acting seat's
// turn, so a seat's state after its year-Y turn is its row in the next snapshot).
//   node compare.mjs <control base path> <arm base path>     (paths without .json/.csv)
// The control is the confirming batch (#140): docs/reports/simulation/2026-10-25-no-base-income/masters
import { readFileSync } from 'node:fs';

const SEATS = ['0', '1', '2', '3'];
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const f = (x) => x.toFixed(2);

function load(base) {
  const report = JSON.parse(readFileSync(`${base}.json`, 'utf8'));
  const lines = readFileSync(`${base}.csv`, 'utf8').trim().split('\n');
  const head = lines[0].split(',');
  const col = (name) => head.indexOf(name);
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
  const after = new Map();
  const own = [];
  for (const [game, list] of snapshots) {
    list.forEach((snap, at) => {
      if (snap.final === '1') return;
      own.push(snap.rows[snap.acting]);
      if (list[at + 1]) after.set(`${game}:${snap.acting}:${snap.year}`, list[at + 1].rows[snap.acting]);
    });
  }
  const games = [...snapshots.keys()];
  const num = (row, name) => name.split('+').reduce((a, k) => a + Number(row[col(k)]), 0);
  return {
    report,
    // Mean of a CSV field after each seat's own turn of year y (y = 0: the table as play opens).
    at: (seat, y, name) =>
      mean(
        (y === 0 ? games.map((g) => snapshots.get(g)[0].rows[seat]) : games.map((g) => after.get(`${g}:${seat}:${y}`)))
          .filter(Boolean)
          .map((row) => num(row, name)),
      ),
    // Income paid on the seat's own turns, years 1..y, a game.
    paid: (seat, y, name) =>
      own.filter((row) => row[col('player')] === seat && Number(row[col('year')]) <= y).reduce((a, row) => a + num(row, name), 0) /
      games.length,
  };
}

const control = load(process.argv[2]);
const arm = load(process.argv[3]);
const perSeat = (fn) => SEATS.map((s) => f(fn(control, s))).join(' / ') + '  →  ' + SEATS.map((s) => f(fn(arm, s))).join(' / ');
const reach = (data, seat, keys) => mean(data.report.perGame.map((g) => keys.reduce((a, k) => a + (g.seats[seat].reach[k] ?? 0), 0)));
const seatGame = (data, seat, fn) => mean(data.report.perGame.map((g) => fn(g.seats[seat])));

const wins = (d) => SEATS.map((s) => d.report.results.perSeat[s].wins).join(' / ');
console.log(`meta.seatBonus: ${JSON.stringify(arm.report.meta.seatBonus ?? null)}`);
console.log(`wins by seat              ${wins(control)}  →  ${wins(arm)}`);
const same = arm.report.perGame.filter((g, i) => g.winner === control.report.perGame[i].winner).length;
console.log(`same winner as control    ${same} of ${arm.report.perGame.length}`);
const ends = (d) => `${d.report.perGame.filter((g) => g.termination === 'victoryRace').length} race, ${d.report.perGame.filter((g) => g.termination === 'deckExhausted').length} deck`;
console.log(`endings                   ${ends(control)}  →  ${ends(arm)}`);
for (const by of ['race', 'titles', 'happiness', 'pops']) {
  const v = (d) => SEATS.map((s) => d.report.results.perSeat[s].winsDecidedBy[by]).join(' / ');
  console.log(`  won on ${by.padEnd(17)}${v(control)}  →  ${v(arm)}`);
}

console.log('\nstone');
console.log(`stone held as play opens  ${perSeat((d, s) => d.at(s, 0, 'stone'))}`);
for (const y of [1, 2, 3, 5, 8, 14]) console.log(`stone held, year ${String(y).padEnd(8)} ${perSeat((d, s) => d.at(s, y, 'stone'))}`);
console.log(`stone paid, years 1-5     ${perSeat((d, s) => d.paid(s, 5, 'incomeStone'))}`);
console.log(`stone paid, the game      ${perSeat((d, s) => d.paid(s, 14, 'incomeStone'))}`);
for (const res of ['stone', 'wood', 'food', 'gold']) {
  console.log(`trade net ${res.padEnd(16)}${perSeat((d, s) => seatGame(d, s, (x) => x.trade.received[res] - x.trade.given[res]))}`);
}

console.log('\nwhat stone buys, a game');
const T = ['building:temple'];
const F = ['building:forum'];
const U = ['command:upgradeColonyToCity'];
const P = ['building:port'];
console.log(`Temples                   ${perSeat((d, s) => reach(d, s, T))}`);
console.log(`Forums                    ${perSeat((d, s) => reach(d, s, F))}`);
console.log(`city upgrades             ${perSeat((d, s) => reach(d, s, U))}`);
console.log(`Ports                     ${perSeat((d, s) => reach(d, s, P))}`);
console.log(`Temples+Forums+upgrades   ${perSeat((d, s) => reach(d, s, [...T, ...F, ...U]))}`);
console.log(`stone spent on them+Ports ${perSeat((d, s) => 3 * reach(d, s, [...T, ...F, ...U]) + 2 * reach(d, s, P))}`);

console.log('\nsize');
for (const y of [1, 3, 5]) console.log(`cities, year ${String(y).padEnd(12)}${perSeat((d, s) => d.at(s, y, 'cities'))}`);
for (const y of [5, 14]) console.log(`pops, year ${String(y).padEnd(14)}${perSeat((d, s) => d.at(s, y, 'pops'))}`);
console.log(`slaves, year 14           ${perSeat((d, s) => d.at(s, 14, 'slaves'))}`);
console.log(`happiness, year 14        ${perSeat((d, s) => d.at(s, 14, 'happiness'))}`);
console.log(`grown, slaves+freemen     ${perSeat((d, s) => reach(d, s, ['grow:slaves', 'grow:freemen']))}`);
console.log(`pops lost, hunger         ${perSeat((d, s) => seatGame(d, s, (x) => x.popsLostToHunger))}`);
console.log(`pops lost, unrest         ${perSeat((d, s) => seatGame(d, s, (x) => x.popsLostToUnrest))}`);
console.log(`Doles                     ${perSeat((d, s) => reach(d, s, ['command:dole']))}`);
for (const t of ['polis-builder', 'demos', 'civic-elite', 'beloved', 'voice']) {
  const v = (d) => SEATS.map((s) => d.report.results.perSeat[s].finalTitles[t]).join(' / ');
  console.log(`${t.padEnd(26)}${v(control)}  →  ${v(arm)}`);
}
