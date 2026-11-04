// Sixth-version check: nested tooltips, the hand's fixed place, the composer's lines, the offer answered, today's tags.
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch({ headless: true });
  const page = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelectorAll('details.alljumps').forEach(d => d.open = true));
  await page.addStyleTag({ content: '.wrap{max-width:1480px!important;padding:0!important}' });
  await page.locator('#stage-wrap').scrollIntoViewIfNeeded(); await page.waitForTimeout(600);
  const wait = (ms = 350) => page.waitForTimeout(ms);
  const tips = () => page.evaluate(() => [...document.querySelectorAll('#tips .tip')].map(t => (t.classList.contains('locked') ? 'L:' : 'u:') + t.querySelector('b')?.textContent));
  const log = [];
  const center = async sel => page.evaluate(sel => { const r = document.querySelector(sel).getClientRects()[0]; return [r.left + Math.min(r.width / 2, 12), r.top + r.height / 2]; }, sel);
  // a plain tooltip follows and never locks
  let [x, y] = await center('.cell[data-tip="wood"]'); await page.mouse.move(x, y); await wait(800); log.push(['wood, rested', await tips()]);
  // happiness locks, its Riot opens a second, the Riot's Unrest tokens a third
  [x, y] = await center('#mood'); await page.mouse.move(x, y); await wait(200); log.push(['mood, 0.2 s', await tips()]);
  await wait(600); log.push(['mood, 0.8 s', await tips()]);
  await page.mouse.move(x + 30, y + 30, { steps: 4 });
  [x, y] = await center('#tips .tip u[data-term="riot"]'); await page.mouse.move(x, y, { steps: 6 }); await wait(150); log.push(['on Riot', await tips()]);
  await wait(700);
  [x, y] = await center('#tips .tip:nth-child(2) u[data-term="unrest"]'); await page.mouse.move(x, y, { steps: 8 }); await wait(150); log.push(['on Unrest, inside Riot', await tips()]);
  log.push(['Unrest tip links Riot?', await page.evaluate(() => !!document.querySelector('#tips .tip:nth-child(3) [data-term="riot"]'))]);
  await page.screenshot({ path: `${OUT}/tips-nested.png`, clip: await page.locator('#stage-wrap').boundingBox() });
  await page.mouse.move(700, 600, { steps: 4 }); await wait(500); log.push(['off, 0.5 s', await tips()]);
  // the hand stays put
  const hand = () => page.evaluate(() => { const h = document.querySelector('#hand'); return `${h.style.left}+${h.style.width}${h.hidden ? ' hidden' : ''}`; });
  for (const j of ['pick:none', 'pick:-5,0', 'win:cities', 'winpick:cities', 'pick:3,-3', 'win:ideas', 'hand:empty', 'hand:sample']) { await page.click(`[data-jump="${j}"]`); await wait(); log.push(['hand at ' + j, await hand()]); }
  await page.click('[data-jump="winpick:cities"]'); await wait(); await page.screenshot({ path: `${OUT}/hand-joined.png`, clip: await page.locator('#stage-wrap').boundingBox() });
  await page.click('[data-jump="pick:none"]'); await wait(); await page.screenshot({ path: `${OUT}/hand-none.png`, clip: await page.locator('#stage-wrap').boundingBox() });
  // the composer adds lines; gold is capped at what you hold
  await page.click('[data-jump="trade:-5,6"]'); await wait();
  const cm = () => page.evaluate(() => [document.querySelector('#moment footer span')?.textContent, document.querySelector('[data-act="deal-send"]')?.disabled, document.querySelector('#toast').hidden ? '' : document.querySelector('#toast').textContent]);
  await page.click('#moment [data-add="want"][data-k="wood"]'); await page.click('#moment [data-add="want"][data-k="wood"]'); log.push(['want 2 wood', await cm()]);
  for (let i = 0; i < 3; i++) await page.click('#moment [data-add="give"][data-k="gold"]'); log.push(['give gold ×3', await cm()]);
  await page.screenshot({ path: `${OUT}/composer.png`, clip: await page.locator('#stage-wrap').boundingBox() });
  await page.click('[data-act="deal-send"]'); await wait(); log.push(['sent', await cm(), await page.evaluate(() => !!document.querySelector('#moment > *'))]);
  // the offer answered leaves the alarms row
  await page.click('[data-jump="offer:open"]'); await wait(); log.push(['offer open', await page.evaluate(() => document.querySelector('.alarm[data-alarm="offer"]').hidden)]);
  await page.click('#drop [data-act="ans"] >> nth=0'); await wait(); log.push(['answered', await page.evaluate(() => [document.querySelector('.alarm[data-alarm="offer"]').hidden, !!document.querySelector('#drop > *')])]);
  // today's tags carry the source only
  await page.click('[data-jump="seat:Nikos"]'); await page.click('[data-shell="today"]'); await wait(); log.push(['today, seat', await page.textContent('#stage-tag')]);
  await page.click('[data-shell="prop"]'); await page.click('[data-jump="confirm:buy"]'); await page.click('[data-shell="today"]'); await wait(); log.push(['today, confirm', await page.textContent('#stage-tag')]);
  await page.click('[data-shell="prop"]'); await page.keyboard.press('Escape');
  // every toast seen while clicking through the scenes
  const seen = new Set();
  page.on('console', () => { });
  for (const j of ['riot:ask', 'riot:sheet', 'hunger:', 'asm:open', 'play:settlers']) {
    await page.click(`[data-jump="${j}"]`); await wait();
    const btn = await page.$('#drop [data-act="calm-end"], #moment [data-act="roll"], #moment [data-act="let-go"], #moment [data-act="asm-seal"], #moment [data-act="play-go"]:not([disabled])');
    if (btn) { await btn.click(); await wait(100); const t = await page.evaluate(() => document.querySelector('#toast').hidden ? '' : document.querySelector('#toast').textContent); if (t) seen.add(t); log.push([j + ' acted', await page.evaluate(() => [!!document.querySelector('#moment > *'), !!document.querySelector('#drop > *')])]); }
    else log.push([j, 'no act button']);
  }
  log.push(['toasts', [...seen]]);
  for (const [k, v] of log) console.log(k.padEnd(26), JSON.stringify(v));
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
