// Proposal B check: the rail centred and clear of the inspector, drawers the outliner's width, the log line across the dock,
// End turn under it, and every drawer control doing its job.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const page = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelectorAll('details.alljumps').forEach(d => d.open = true));
  await page.addStyleTag({ content: '.wrap{max-width:1480px!important;padding:0!important}' });
  await page.locator('#stage-wrap').scrollIntoViewIfNeeded();
  const wait = () => page.waitForTimeout(420);
  const geo = () => page.evaluate(() => {
    const st = document.querySelector('#stage').getBoundingClientRect(), K = st.width / 1440;
    const r = s => { const e = document.querySelector(s); if (!e || !e.offsetWidth) return null; const a = e.getBoundingClientRect(); return [Math.round((a.left - st.left) / K), Math.round((a.top - st.top) / K), Math.round(a.width / K), Math.round(a.height / K)]; };
    const btn = r('#rail button:first-child'), last = r('#rail button:last-child');
    const wb = document.querySelector('#win .wb');
    return { rail: r('#rail'), icons: btn && [btn[1], last[1] + last[3]], insp: r('#insp .insp'), win: r('#win .win'), chron: r('#chron'), end: r('.endturn'), hand: r('#hand'), sideways: wb ? wb.scrollWidth > wb.clientWidth + 1 : null };
  });
  const log = [];
  await page.click('[data-shell="b"]');
  for (const j of ['pick:none', 'pick:-5,0', 'pick:-6,6', 'win:cities', 'winpick:cities']) { await page.click(`[data-jump="${j}"]`); await wait(); log.push([j, await geo()]); }
  for (const j of ['win:overview', 'win:cities', 'win:people', 'win:ideas', 'win:agora']) { await page.click(`[data-jump="${j}"]`); await wait(); log.push([j + ' fits', (await geo()).sideways === false]); }
  // centred tabs switch the page; a place opens the inspector; a free Idea asks; the hand opens
  await page.click('[data-jump="win:overview"]'); await page.click('#win .btabs [data-tab="people"]'); await wait();
  log.push(['tab → people', await page.evaluate(() => document.querySelector('#win .btabs [aria-selected="true"]').dataset.tab)]);
  await page.click('#win .bwhere button >> nth=0'); await wait(); log.push(['where → pick', await page.evaluate(() => document.querySelector('#insp h3')?.textContent)]);
  await page.click('[data-jump="win:overview"]'); await page.click('#win .bp >> nth=2'); await wait(); log.push(['place → pick', await page.evaluate(() => document.querySelector('#insp h3')?.textContent)]);
  await page.click('[data-jump="win:ideas"]'); await page.click('#win .bi.free >> nth=0'); await wait(); log.push(['free idea asks', await page.evaluate(() => document.querySelector('#cfm .cfm')?.textContent.trim().slice(0, 60))]);
  await page.keyboard.press('Escape'); await page.click('#win .bi.taken >> nth=0'); await wait(); log.push(['taken idea: no ask', await page.evaluate(() => !!document.querySelector('#cfm .cfm'))]);
  await page.click('[data-jump="win:overview"]'); await page.click('#win [data-hand]'); await wait(); log.push(['view the hand', await page.evaluate(() => !!document.querySelector('#moment .handv'))]);
  // the words moved into tooltips: an Idea's effect shows on hover
  await page.keyboard.press('Escape'); await page.click('[data-jump="win:ideas"]'); await page.hover('#win .bi.free >> nth=0'); await page.waitForTimeout(250);
  log.push(['idea tooltip', await page.evaluate(() => document.querySelector('#tips .tip')?.textContent.slice(0, 70))]);
  await page.click('[data-jump="win:agora"]'); await page.hover('#win .bl >> nth=0'); await page.waitForTimeout(250);
  log.push(['law tooltip', await page.evaluate(() => document.querySelector('#tips .tip')?.textContent.slice(0, 70))]);
  // Proposal is untouched
  await page.click('[data-shell="prop"]'); await page.click('[data-jump="winpick:cities"]'); await wait(); log.push(['Proposal joined', await geo()]);
  for (const [k, v] of log) console.log(k.padEnd(22), JSON.stringify(v));
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
