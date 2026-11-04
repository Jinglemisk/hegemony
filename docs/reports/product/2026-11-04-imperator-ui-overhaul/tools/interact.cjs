// Interaction check: drag a menu window, Esc order, H, a drawer row picking a place.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const page = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelectorAll('details.alljumps').forEach(d => d.open = true));
  await page.addStyleTag({ content: '.wrap{max-width:1480px!important;padding:0!important}' });
  await page.locator('#stage-wrap').scrollIntoViewIfNeeded();
  const S = () => page.evaluate(() => { const fw = [...document.querySelectorAll('#float .fw')].map(e => `${e.dataset.id}@${e.style.left},${e.style.top}`); return { win: !!document.querySelector('#win .win'), insp: document.querySelector('#insp').style.width, fw, moment: !!document.querySelector('#moment > *'), menu: !!document.querySelector('#menu .menu'), rail: document.querySelector('#rail').style.height, winH: document.querySelector('#win .win')?.style.height }; });
  const log = [];
  await page.click('#menu-btn'); log.push(['menu open', await S()]);
  await page.click('#menu [data-float="victory"]'); log.push(['victory', await S()]);
  const h = page.locator('#float .fw .ih h3').first(); const box = await h.boundingBox();
  await page.mouse.move(box.x + 10, box.y + 5); await page.mouse.down(); await page.mouse.move(box.x - 300, box.y + 200, { steps: 8 }); await page.mouse.up();
  log.push(['dragged', await S()]);
  await page.click('#rail [data-win="cities"]'); log.push(['cities drawer', await S()]);
  await page.click('#win tr.row, #win .bc >> nth=0'); await page.waitForTimeout(400); log.push(['row picked', await S()]);
  await page.keyboard.press('Escape'); log.push(['esc1', await S()]);
  await page.keyboard.press('Escape'); log.push(['esc2', await S()]);
  await page.keyboard.press('Escape'); log.push(['esc3', await S()]);
  await page.keyboard.press('h'); log.push(['H', await S()]);
  await page.keyboard.press('Escape'); log.push(['esc4', await S()]);
  await page.click('[data-jump="float:codex"]'); await page.fill('#float input[type="search"]', 'riot'); log.push(['codex search', await page.evaluate(() => [document.activeElement?.type, document.querySelectorAll('#float .codex nav button').length])]);
  for (const [k, v] of log) console.log(k, JSON.stringify(v));
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
