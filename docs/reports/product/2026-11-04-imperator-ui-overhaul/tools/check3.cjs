// Render check: every jump in each shell, the stage at its full 1440×900, plus overlap and overflow notes.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const ONLY = process.argv[3] ? process.argv[3].split(',') : null;
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelectorAll('details.alljumps').forEach(d => d.open = true));
  await page.addStyleTag({ content: '.wrap{max-width:1480px!important;padding:0!important}' });
  await page.waitForTimeout(900);
  const stage = page.locator('#stage-wrap');
  const jumps = await page.$$eval('[data-jump]', bs => bs.map(b => b.dataset.jump));
  const notes = [];
  for (const shell of ['prop', 'b']) {
    await page.click(`[data-shell="${shell}"]`);
    for (const j of jumps) {
      const name = `${shell}-${j.replace(/[:,]/g, '_')}`;
      if (ONLY && !ONLY.some(o => name.includes(o))) continue;
      await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
      await page.click(`[data-jump="${j}"]`);
      await page.waitForTimeout(450);
      await stage.screenshot({ path: `${OUT}/${name}.png` });
      // panels that overlap each other or leave the stage, and scrolled content
      const info = await page.evaluate(() => {
        const st = document.querySelector('#stage').getBoundingClientRect(); const k = st.width / 1440;
        const sel = ['.bar', '.seal', '.alarms', '#rail', '.dock', '#corner', '#cfm .cfm', '#fan .fan', '#win .win', '#float .fw', '#drop > *', '#moment .card, #moment .composer, #moment .handv', '#outl > *', '#hand', '#menu .menu'];
        const boxes = [];
        for (const s of sel) for (const el of document.querySelectorAll(s)) {
          const r = el.getBoundingClientRect(); if (!r.width || getComputedStyle(el).display === 'none') continue;
          boxes.push({ s, x: Math.round((r.left - st.left) / k), y: Math.round((r.top - st.top) / k), w: Math.round(r.width / k), h: Math.round(r.height / k), scroll: el.scrollHeight > el.clientHeight + 2 || [...el.querySelectorAll('.wb,.log,.codex article,.codex nav,.ob')].some(c => c.scrollHeight > c.clientHeight + 2) });
        }
        const over = [];
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (ix > 2 && iy > 2) over.push(`${a.s}×${b.s} ${ix}x${iy}`);
        }
        const out = boxes.filter(b => b.x < -1 || b.y < -1 || b.x + b.w > 1441 || b.y + b.h > 901).map(b => `${b.s} off-stage`);
        const scrolled = boxes.filter(b => b.scroll).map(b => `${b.s} scrolls`);
        const insp = boxes.find(b => b.s === '#corner');
        return { over, out, scrolled, insp: insp ? `${insp.w}x${insp.h}@${insp.x},${insp.y}` : '' };
      });
      notes.push(`${name}: insp ${info.insp} | overlaps ${info.over.join('; ') || '-'} | ${[...info.out, ...info.scrolled].join('; ')}`);
    }
  }
  await page.click('[data-shell="today"]'); await page.click('[data-jump="win:agora"]'); await page.waitForTimeout(400); await stage.screenshot({ path: `${OUT}/today-agora.png` });
  await page.click('[data-shell="prop"]');
  await page.screenshot({ path: `${OUT}/page-top.png` });
  fs.writeFileSync(`${OUT}/notes.txt`, notes.join('\n') + '\nerrors ' + JSON.stringify(errs));
  console.log(notes.join('\n')); console.log('errors', JSON.stringify(errs));
  await browser.close();
})();
