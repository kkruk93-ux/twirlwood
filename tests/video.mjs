// Records a short headless clip of the bot playing (camera showcase).
import { chromium } from 'playwright';
const out = process.argv[2];
const b = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, recordVideo: { dir: out, size: { width: 960, height: 540 } } });
const p = await ctx.newPage(); const errors = [];
p.on('pageerror', (e) => errors.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(process.env.URL || 'http://127.0.0.1:4180/'); await p.waitForTimeout(3000);
await p.evaluate(() => window.__tw.unlockAll());
const play = async (level, ch, ms, x) => {
  await p.evaluate(([l, ch, x]) => { window.__tw.start(l, ch); const g = window.__tw.game; if (x) { g.p.x = x; g.p.y = 120; window.__tw.w3d.snapCam = true; } g.bot = true; g.assist = true; }, [level, ch, x]);
  await p.waitForTimeout(ms);
};
await play(0, "wren", 10000);
await play(6, "bobble", 7000, 1800);
await play(11, "wren", 7000, 1200);
await play(16, "pip", 9000, 600);
await play(9, "bobble", 6000, 4300);
await play(19, "pip", 13000, 3700);
await p.evaluate(() => { window.__tw.game.bot = false; });
await ctx.close(); await b.close();
console.log('errors', JSON.stringify(errors));
