// Run the bot over one chunk (start + chunk + goal) for both heroes, N trials with random start delays.
import { Game } from '../js/game.js';
import { LEVELS } from '../js/levels.js';
const names = process.argv.slice(2);
for (const name of names) for (const world of [0]) {
  LEVELS.push({ world, name: 'test', chunks: ['start', name, 'check', name, 'goal'] });
  const idx = LEVELS.length - 1;
  for (const ch of ['wren', 'bobble']) {
    let res = [];
    for (let trial = 0; trial < 6; trial++) {
      const g = new Game({ hud() {}, toast() {}, complete() {}, gameOver() {} });
      g.load(idx, ch); g.bot = true; g.assist = true;
      for (let k = 0; k < trial * 37; k++) { g.bot = false; g.update(1 / 120, {}); } g.bot = true;
      for (let k = 0; k < 120 * 60 && !g.done; k++) { g.update(1 / 120, {}); g.events.length = 0; }
      res.push(g.done ? g.rescues : 'F');
    }
    console.log(name.padEnd(10), ch.padEnd(6), 'rescues per trial:', res.join(' '));
  }
  LEVELS.pop();
}
