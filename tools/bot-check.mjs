// Node-only completability check: runs the test bot through every level for both
// heroes and reports which chunk each assist rescue happened in.
import { Game } from '../js/game.js';
import { LEVELS, CHUNKS } from '../js/levels.js';
const chunkAt = (lvl, x) => { let c = Math.floor(x / 30); for (const n of LEVELS[lvl].chunks) { const w = CHUNKS[n][0].length; if (c < w) return n; c -= w; } return '?'; };
const tally = {};
let fails = 0;
for (const ch of ['wren', 'bobble', 'pip']) for (let i = 0; i < LEVELS.length; i++) {
  const g = new Game({ hud() {}, toast() {}, complete() {}, gameOver() {} });
  g.load(i, ch); g.bot = true; g.assist = true;
  let last = 0; const where = [];
  for (let k = 0; k < 120 * 300 && !g.done; k++) { g.update(1 / 120, {}); g.events.length = 0; if (g.rescues !== last) { last = g.rescues; where.push(chunkAt(i, g.p.x)); } }
  if (!g.done) fails++;
  for (const w of where) tally[w] = (tally[w] || 0) + 1;
  console.log(ch.padEnd(6), String(i).padStart(2), g.done ? 'DONE' : 'FAIL', `t=${g.time.toFixed(0)}s`, 'rescues:', where.join(',') || '-');
}
console.log('rescues by chunk', tally, 'fails', fails);
