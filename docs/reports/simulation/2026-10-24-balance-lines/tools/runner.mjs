// Balance lines: plays the arms in queue.json one after another, at the lowest CPU
// priority, and writes each report, turn CSV, patch and log into the dated report
// folder. An arm whose report already exists is skipped, so a stopped run resumes.
//   node runner.mjs [queue.json]
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, openSync, closeSync, readFileSync, writeFileSync } from 'node:fs';

const REPO = '/Users/jinglemisk/Desktop/hegemony-code-health';
const OUT = `${REPO}/docs/reports/simulation/2026-10-24-balance-lines`;
const HERE = new URL('.', import.meta.url).pathname;
const PRELOAD = `${HERE}bots-preload.mts`;
const JOBS = process.env.JOBS ?? '2';
const QUEUE = process.argv[2] ?? `${HERE}queue.json`;

const TABLES = {
  masters: ['--games', '40', '--policy', 'master', '--without-ideas', 'all'],
  'masters-ideas': ['--games', '40', '--policy', 'master'],
  mixed: ['--games', '10', '--seats', 'slaver,civic,trader,master', '--rotate'],
};

mkdirSync(`${OUT}/patches`, { recursive: true });
mkdirSync(`${OUT}/logs`, { recursive: true });
const progress = (line) => {
  const stamped = `${new Date().toISOString().slice(11, 19)} ${line}`;
  console.log(stamped);
  appendFileSync(`${OUT}/logs/progress.log`, `${stamped}\n`);
};

// The queue is read again before each arm, so arms can be added while it runs.
const failed = new Set();
for (;;) {
  const queue = JSON.parse(readFileSync(QUEUE, 'utf8'));
  const arm = queue.find((a) => !failed.has(a.name) && !existsSync(`${OUT}/${a.name}.json`));
  if (!arm) {
    // Until <queue>.closed exists, an empty queue waits for more arms.
    if (existsSync(`${QUEUE}.closed`)) break;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 60_000);
    continue;
  }
  const report = `${OUT}/${arm.name}.json`;
  const args = ['batch', '--turns', '56', '--seed', String(arm.seed ?? 1000), '--jobs', JOBS, ...TABLES[arm.table]];
  args.push('--board', arm.board ?? 'classic', ...(arm.extra ?? []));
  if (arm.ruleset) {
    const path = `${OUT}/patches/${arm.name}.ruleset.json`;
    writeFileSync(path, `${JSON.stringify(arm.ruleset, null, 2)}\n`);
    args.push('--ruleset-patch', path);
  }
  if (arm.tune) {
    const path = `${OUT}/patches/${arm.name}.tune.json`;
    writeFileSync(path, `${JSON.stringify(arm.tune, null, 2)}\n`);
    args.push('--tune-patch', path);
  }
  const env = { ...process.env };
  const node = ['-n', '19', 'node', '--import', 'tsx'];
  // Code constants (bot pricing) are rewritten at load by the const hook; meta does not
  // record them, so the patch folder keeps them beside the report.
  if (arm.consts) {
    writeFileSync(`${OUT}/patches/${arm.name}.consts.json`, `${JSON.stringify(arm.consts, null, 2)}\n`);
    env.LEVER_CONSTS = JSON.stringify(arm.consts);
    node.push('--import', `${HERE}levers/register-const-hook.mjs`);
  }
  if (arm.bots) {
    writeFileSync(`${OUT}/patches/${arm.name}.bots.json`, `${JSON.stringify(arm.bots, null, 2)}\n`);
    env.HEG_BOTS = JSON.stringify(arm.bots);
    node.push('--import', PRELOAD);
  }
  args.push('--report', report, '--csv', `${OUT}/${arm.name}.csv`);

  progress(`start ${arm.name} (${arm.line}): ${args.slice(1).join(' ')}`);
  const log = openSync(`${OUT}/logs/${arm.name}.log`, 'w');
  const started = Date.now();
  const run = spawnSync('nice', [...node, 'src/sim/cli.ts', ...args], { cwd: REPO, env, stdio: ['ignore', log, log] });
  closeSync(log);
  const minutes = ((Date.now() - started) / 60000).toFixed(1);
  const ok = run.status === 0 && existsSync(report);
  if (!ok) failed.add(arm.name);
  progress(`${ok ? 'done' : `FAILED (${run.status ?? run.signal})`} ${arm.name} in ${minutes} min`);
}
progress('queue finished');
