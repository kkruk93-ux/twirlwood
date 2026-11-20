// Headless check (WebGL via SwiftShader): loads the game, plays every level with
// the built-in test bot (assist on) for both heroes, checks console errors,
// takes screenshots.
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://127.0.0.1:4180/';
const out = process.argv[2] || 'screenshots';
const only = process.env.LEVELS ? process.env.LEVELS.split(',').map(Number) : null;
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(URL); await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/01-title.png` });
await page.evaluate(() => window.__tw.unlockAll());
await page.click('[data-testid=btn-play]'); await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/02-map.png` });
const results = [];
for (const ch of ['wren', 'bobble']) {
  for (let i = 0; i < 15; i++) {
    if (only && !only.includes(i)) continue;
    await page.evaluate(([i, ch]) => { window.__tw.start(i, ch); window.__tw.manual(true); }, [i, ch]);
    let info;
    for (let k = 0; k < 40; k++) { info = await page.evaluate(() => window.__tw.sim(8)); if (info.done) break; }
    if (info.done) info = await page.evaluate(() => window.__tw.sim(2));
    results.push({ ch, ...info });
    await page.evaluate(() => window.__tw.manual(false));
  }
}
for (const r of results) console.log(r.ch, r.level, r.done ? 'DONE' : 'FAIL', 'x', r.x, '/', r.w, 'gems', r.gems + '/' + r.gemTotal, 'coins', r.coins + '/' + r.coinTotal, 'rescues', r.rescues, 't', r.time, 'boss', r.boss);
if (!process.env.NOSHOTS) {
  async function shot(level, x, name, ch = 'wren', wait = 1500) {
    await page.evaluate(([l, x, ch]) => { window.__tw.start(l, ch); const g = window.__tw.game; g.p.x = x; g.p.y = 150; window.__tw.w3d.snapCam = true; document.querySelector('#toast').classList.remove('show'); }, [level, x, ch]);
    await page.waitForTimeout(wait);
    await page.evaluate(() => document.querySelector('#toast').classList.remove('show'));
    await page.screenshot({ path: `${out}/${name}.png` });
  }
  await shot(0, 1300, '03-forest', 'wren');
  await shot(6, 2600, '04-caverns', 'bobble');
  await shot(11, 1500, '05-castle', 'wren');
  await shot(4, 4300, '06-boss', 'bobble');
  // real touch input: hold the analog stick right, then press A
  await page.evaluate(() => window.__tw.start(0, 'wren')); await page.waitForTimeout(400);
  const x0 = await page.evaluate(() => window.__tw.game.p.x);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 100, y: 300, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 150, y: 300, id: 1 }] });
  await page.waitForTimeout(700);
  const a = await page.locator('#b-a').boundingBox();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 150, y: 300, id: 1 }, { x: a.x + a.width / 2, y: a.y + a.height / 2, id: 2 }] });
  await page.waitForTimeout(100);
  const vy = await page.evaluate(() => window.__tw.game.p.vy);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const x1 = await page.evaluate(() => window.__tw.game.p.x);
  console.log('touch stick dx', Math.round(x1 - x0), 'vy after A', Math.round(vy));
  const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / 2); }; requestAnimationFrame(f); }));
  console.log('headless fps (SwiftShader, CPU):', fps);
  await page.click('[data-testid=pause]'); await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/07-pause.png` });
}
console.log('errors', JSON.stringify(errors.filter((e) => !/GPU stall|swiftshader|WebGL-|GL Driver Message/i.test(e)), null, 1));
await browser.close();
