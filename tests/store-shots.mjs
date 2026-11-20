import { chromium } from 'playwright';
const out = process.argv[2];
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function session(w, h, dsf) { const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, isMobile: true, hasTouch: true }); const p = await c.newPage(); await p.goto(process.env.URL || 'http://127.0.0.1:4180/'); await p.waitForTimeout(2500); await p.evaluate(() => { const d = window.__tw.data(); d.settings.quality = 'high'; window.__tw.unlockAll(); }); return p; }
const p = await session(960, 540, 2);
async function shot(level, x, name, ch) {
  await p.evaluate(([l, x, ch]) => { window.__tw.w3d.setQuality('high', true); window.__tw.start(l, ch); const g = window.__tw.game; g.p.x = x === 'boss' ? g.boss.x - 240 : x; g.p.y = 150; window.__tw.w3d.snapCam = true; }, [level, x, ch]);
  await p.waitForTimeout(1800); await p.evaluate(() => { document.querySelector('#toast').classList.remove('show'); const b = window.__tw.game.boss; if (b) { window.__tw.manual(true); b.warn = 0; b.wound = 0; } });
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${out}/${name}.png` });
  await p.evaluate(() => window.__tw.manual(false));
}
await shot(0, 1300, 'store-1-forest', 'wren');
await shot(4, 'boss', 'store-2-boss', 'bobble');
await shot(6, 2600, 'store-3-caverns', 'bobble');
await shot(11, 1500, 'store-4-castle', 'wren');
await shot(16, 1800, 'store-5-mines', 'pip');
await shot(19, 'boss', 'store-7-golem', 'pip');
await p.evaluate(() => { document.querySelector('#scr-pause').classList.add('hidden'); window.__tw.manual(true); });
await p.evaluate(() => { window.__tw.start(0); window.__tw.manual(false); document.querySelector('[data-testid=pause]').click(); document.querySelector('#btn-quit').click(); });
await p.waitForTimeout(800); await p.screenshot({ path: `${out}/store-6-map.png` });
await p.evaluate(() => { window.__tw.setData({ bank: 640 }); document.querySelector('#scr-map [data-go=title]')?.click(); document.querySelector('[data-go=shop]').click(); }); await p.waitForTimeout(500); await p.screenshot({ path: `${out}/store-8-costumes.png` });
const f = await session(1024, 500, 1);
await f.evaluate(() => { window.__tw.w3d.setQuality('high', false); document.querySelectorAll('#scr-title .menu, #btn-play').forEach((e) => (e.style.display = 'none')); document.querySelector('.hint-rot').style.display = 'none'; });
await f.waitForTimeout(2500);
await f.screenshot({ path: `${out}/feature-1024x500.png` });
await b.close();
