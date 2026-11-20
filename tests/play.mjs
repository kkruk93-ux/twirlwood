// Headless check: loads the game, plays each level with the built-in test bot
// (assist on), checks console errors, takes screenshots.
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://127.0.0.1:4180/';
const out = process.argv[2] || 'screenshots';
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(URL); await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/01-title.png` });
await page.click('[data-testid=btn-play]'); await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/02-select.png` });
const results = [];
for (const ch of ['wren', 'bobble']) {
  for (let i = 0; i < 3; i++) {
    await page.evaluate(([i, ch]) => { window.__tw.start(i, ch); window.__tw.manual(true); }, [i, ch]);
    let info;
    for (let k = 0; k < 60; k++) {
      info = await page.evaluate(() => window.__tw.sim(5));
      if (info.done) break;
    }
    if (info.done) await page.evaluate(() => window.__tw.sim(2));
    results.push({ ch, ...info });
    await page.evaluate(() => window.__tw.manual(false));
  }
}
console.log(JSON.stringify(results, null, 1));
// gameplay screenshots at interesting spots
async function shot(level, x, name, ch = 'wren') {
  await page.evaluate(([l, x, ch]) => { window.__tw.start(l, ch); const g = window.__tw.game; g.p.x = x; g.p.y = 100; g.camX = x - 300; }, [level, x, ch]);
  await page.evaluate(() => document.querySelector('#toast').classList.remove('show'));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${name}.png` });
}
await shot(0, 1200, '03-level1', 'wren');
await shot(1, 2300, '04-level2', 'bobble');
await shot(2, 8900, '05-level3-boss', 'wren');
// real touch input check: hold right via touch overlay
await page.evaluate(() => window.__tw.start(0, 'wren')); await page.waitForTimeout(300);
const x0 = await page.evaluate(() => window.__tw.game.p.x);
const r = await page.locator('#t-right').boundingBox();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 }] });
await page.waitForTimeout(700);
const j = await page.locator('#t-jump').boundingBox();
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 }, { x: j.x + j.width / 2, y: j.y + j.height / 2, id: 2 }] });
await page.waitForTimeout(120);
const vy = await page.evaluate(() => window.__tw.game.p.vy);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
const x1 = await page.evaluate(() => window.__tw.game.p.x);
console.log('touch move dx', Math.round(x1 - x0), 'vy after jump touch', Math.round(vy));
await page.click('[data-testid=pause]'); await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/06-pause.png` });
console.log('errors', errors);
await browser.close();
