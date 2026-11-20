// Twirlwood core: fixed-step platformer physics on a 2D plane, rendered with a
// fake-3D "winding path" projection (perspective slabs, curved horizon, parallax
// that swings as the path turns).
import { T, ROWS, buildLevel } from './levels.js';
import { drawWren, drawBobble, drawEnemy } from './art.js';
import { sfx } from './audio.js';

export const VH = 360;
const HZ = 40;          // horizon line used by the perspective projection
const DEPTH = 24;       // depth of slabs (fake 3D)
const GRAV = 2000;
const CHARS = {
  wren: { name: 'Wren', speed: 215, jumpV: 640, dblV: 580, dbl: true, dash: true, glide: false, w: 18, h: 40 },
  bobble: { name: 'Bobble', speed: 195, jumpV: 660, dbl: false, dash: false, glide: true, pound: true, w: 20, h: 40 },
};
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
const rnd = (a, b) => a + Math.random() * (b - a);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export class Game {
  constructor(canvas, hooks) {
    this.cv = canvas; this.c = canvas.getContext('2d');
    this.hooks = hooks; this.settings = { shake: true, vibe: true };
    this.VW = 640; this.scale = 1; this.t = 0;
    this.running = false; this.assist = false; this.bot = false;
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight);
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    this.scale = this.cv.height / VH;
    this.VW = Math.max(480, Math.min(900, this.cv.width / this.scale));
    this.offX = (this.cv.width - this.VW * this.scale) / 2;
  }

  // ---------- level setup ----------
  load(index, charId) {
    const L = buildLevel(index);
    this.levelIndex = index; this.def = L.def; this.W = L.width; this.pxW = L.width * T;
    this.charId = charId; this.C = CHARS[charId];
    this.grid = new Uint8Array(L.width * ROWS); // 0 empty 1 solid 2 plank 3 spikes 4 crate
    this.ents = []; this.coins = []; this.plats = []; this.springs = []; this.checks = []; this.parts = []; this.decor = [];
    this.goal = null; this.boss = null; this.gemTotal = 0;
    let start = { x: 40, y: 300 };
    for (let cx = 0; cx < L.width; cx++) for (let cy = 0; cy < ROWS; cy++) {
      const ch = L.cols[cx][cy], x = cx * T, y = cy * T, i = cy * L.width + cx;
      switch (ch) {
        case '#': this.grid[i] = 1; break;
        case '=': this.grid[i] = 2; break;
        case '^': this.grid[i] = 3; break;
        case 'B': this.grid[i] = 4; break;
        case 'P': start = { x: x + 6, y: y + T }; break;
        case 'o': this.coins.push({ kind: 'coin', x: x + 15, y: y + 15, got: false }); break;
        case 'h': this.coins.push({ kind: 'heart', x: x + 15, y: y + 15, got: false }); break;
        case 'G': this.coins.push({ kind: 'gem', x: x + 15, y: y + 15, got: false, id: this.gemTotal++ }); break;
        case 'C': this.checks.push({ x: x + 15, y: y + T, on: false }); break;
        case 'E': this.goal = { x: x - 6, y: y - 60, w: 42, h: 90 }; break;
        case 'S': this.springs.push({ x: x + 3, y: y + T - 12, w: 24, h: 12, t: 0 }); break;
        case 'M': this.plats.push({ kind: 'move', x, y: y + T - 10, w: 90, h: 10, bx: x, by: y + T - 10, ax: 'x', range: 180, speed: 1.0, ph: 0, dx: 0, dy: 0 }); break;
        case 'V': this.plats.push({ kind: 'move', x, y: y + T - 10, w: 90, h: 10, bx: x, by: y + T - 10, ax: 'y', range: 150, speed: 0.9, ph: 0, dx: 0, dy: 0 }); break;
        case 'X': this.plats.push({ kind: 'crumble', x, y, w: 30, h: 12, bx: x, by: y, state: 0, timer: 0, dx: 0, dy: 0 }); break;
        case 'b': this.ents.push(this.mkEnemy('bug', x + 2, y + T - 20, 26, 20)); break;
        case 'm': this.ents.push(this.mkEnemy('hopper', x + 3, y + T - 26, 24, 26)); break;
        case 'w': { const e = this.mkEnemy('wisp', x + 3, y + 5, 24, 22); e.bx = e.x; e.by = e.y; e.ph = Math.random() * 6; this.ents.push(e); break; }
        case 'K': { const e = this.mkEnemy('boss', x, y + T - 52, 68, 52); e.hp = 3; e.face = -1; e.state = 'walk'; e.timer = 2; this.boss = e; this.ents.push(e); break; }
        default: break;
      }
    }
    // decorations on exposed ground (trees/flowers/mushrooms behind the play plane)
    let seed = 1234 + index * 77;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let cx = 0; cx < L.width; cx++) {
      if (this.tile(cx, 10) === 1 && this.tile(cx, 9) === 0 && r() < 0.45) {
        const kinds = this.def.night ? ['crystal', 'tree', 'flower', 'lamp'] : index === 1 ? ['shroom', 'shroom', 'flower', 'tree'] : ['tree', 'flower', 'bush', 'tree'];
        this.decor.push({ x: cx * T + r() * 30, z: 6 + r() * 16, kind: kinds[Math.floor(r() * kinds.length)], s: 0.7 + r() * 0.6, hue: r() });
      }
    }
    this.fore = [];
    for (let x = 200; x < this.pxW; x += 260 + r() * 300) this.fore.push({ x, kind: r() < 0.5 ? 'grass' : 'fern', s: 0.8 + r() * 0.5 });
    this.start = start; this.respawn = { ...start };
    this.p = this.mkPlayer(start);
    this.hearts = 3; this.maxHearts = 3; this.coinCount = 0; this.gems = new Array(this.gemTotal).fill(false);
    this.deaths = 0; this.time = 0; this.done = false; this.doneT = 0; this.shakeT = 0; this.fade = 1; this.rescues = 0;
    this.camX = Math.max(0, start.x - this.VW * 0.35); this.stuckT = 0; this.lastX = 0; this.bestX = 0;
    this.hooks.hud(this);
  }

  mkEnemy(type, x, y, w, h) { return { type, x, y, w, h, vx: type === 'bug' ? -45 : 0, vy: 0, alive: true, deadT: 0.4, t: Math.random() * 3, onGround: false, hitT: 0 }; }
  mkPlayer(s) {
    return { x: s.x, y: s.y - this.C.h, w: this.C.w, h: this.C.h, vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, buffer: 0,
      airJumps: 1, dashT: 0, dashUsed: false, pounding: false, inv: 0, squash: 0, ride: null, gliding: false, anim: 0, spinT: 0, landT: 0, jumpHeldT: 0 };
  }

  tile(cx, cy) {
    if (cx < 0) return 1;
    if (cx >= this.W) return 1;
    if (cy >= ROWS) return 0;
    if (cy < 0) return this.grid[cx] === 1 ? 1 : 0; // full-height walls stay walls above the screen
    return this.grid[cy * this.W + cx];
  }
  solid(cx, cy) { const t = this.tile(cx, cy); return t === 1 || t === 4; }
  setTile(cx, cy, v) { if (cx >= 0 && cx < this.W && cy >= 0 && cy < ROWS) this.grid[cy * this.W + cx] = v; }

  // ---------- update ----------
  update(dt, inp) {
    this.t += dt;
    if (this.fade > 0) this.fade = Math.max(0, this.fade - dt * 2.5);
    this.updatePlats(dt);
    if (!this.done) { this.time += dt; this.updatePlayer(dt, inp); }
    else {
      this.doneT += dt; this.p.vx = 0; this.p.anim += dt;
      if (this.doneT > 1.3 && !this.doneShown) { this.doneShown = true; this.hooks.complete(this); }
    }
    this.updateEnemies(dt);
    this.updateParts(dt);
    for (const s of this.springs) s.t = Math.max(0, s.t - dt);
    // camera: look ahead in facing direction, smooth follow
    const p = this.p;
    const target = p.x + p.w / 2 + p.face * 50 + p.vx * 0.2 - this.VW / 2;
    this.camX += (target - this.camX) * Math.min(1, dt * 4.5);
    this.camX = Math.max(0, Math.min(this.pxW - this.VW, this.camX));
    if (this.shakeT > 0) this.shakeT -= dt;
  }

  updatePlats(dt) {
    for (const pl of this.plats) {
      const ox = pl.x, oy = pl.y;
      if (pl.kind === 'move') {
        pl.ph += dt * pl.speed;
        const k = (1 - Math.cos(pl.ph)) / 2; // ease back and forth
        if (pl.ax === 'x') pl.x = pl.bx + k * pl.range; else pl.y = pl.by - k * pl.range;
      } else if (pl.kind === 'crumble') {
        if (pl.state === 1) { pl.timer -= dt; pl.x = pl.bx + Math.sin(this.t * 60) * 1.5; if (pl.timer <= 0) { pl.state = 2; pl.timer = 3; pl.vy = 0; sfx('crumble'); } }
        else if (pl.state === 2) { pl.vy += GRAV * dt; pl.y += pl.vy * dt; pl.timer -= dt; if (pl.timer <= 0) { pl.state = 0; pl.x = pl.bx; pl.y = pl.by; } }
      }
      pl.dx = pl.x - ox; pl.dy = pl.y - oy;
    }
  }

  updatePlayer(dt, inp) {
    const p = this.p, C = this.C;
    if (this.bot) inp = this.botInput(inp, dt);
    this.lastJumpHeld = inp.jump;
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    // ride moving platform
    if (p.ride) { p.x += p.ride.dx; p.y += p.ride.dy; }
    if (dir) p.face = dir;
    p.coyote = p.onGround ? 0.1 : p.coyote - dt;
    p.buffer = inp.jumpPressed ? 0.13 : p.buffer - dt;
    p.inv = Math.max(0, p.inv - dt); p.squash *= Math.pow(0.0001, dt); p.spinT = Math.max(0, p.spinT - dt);

    // action
    if (inp.actionPressed) {
      if (C.dash && !p.dashUsed && p.dashT <= 0) { p.dashT = 0.17; p.dashUsed = true; p.vy = 0; sfx('dash'); this.burst(p.x + p.w / 2, p.y + p.h / 2, 8, '#bff', 120); }
      else if (C.pound && !p.onGround && !p.pounding) { p.pounding = true; p.vx = 0; p.vy = -120; sfx('dash'); }
    }

    if (p.dashT > 0) {
      p.dashT -= dt; p.vx = p.face * 470; p.vy = 0;
      if (Math.random() < 0.6) this.parts.push({ x: p.x + p.w / 2, y: p.y + rnd(5, p.h - 5), vx: -p.face * 40, vy: 0, life: 0.3, max: 0.3, col: 'rgba(190,255,255,.8)', size: 4, g: 0 });
      if (p.dashT <= 0) p.vx = p.face * C.speed;
    } else if (p.pounding) {
      p.vx = 0; p.vy = Math.min(p.vy + 4000 * dt, 980);
    } else {
      const target = dir * C.speed;
      const acc = p.onGround ? (dir && Math.sign(dir) !== Math.sign(p.vx) ? 3600 : 2200) : 1500;
      p.vx = dir ? approach(p.vx, target, acc * dt) : approach(p.vx, 0, (p.onGround ? 2600 : 500) * dt);
      // jump (with coyote time and buffer)
      if (p.buffer > 0 && p.coyote > 0) {
        p.vy = Math.min(p.vy, -C.jumpV); p.coyote = 0; p.buffer = 0; p.onGround = false; p.ride = null; p.squash = -0.5; p.jumpHeldT = 0;
        sfx('jump'); this.dust(p.x + p.w / 2, p.y + p.h, 6);
      } else if (inp.jumpPressed && !p.onGround && C.dbl && p.airJumps > 0) {
        p.vy = -C.dblV; p.airJumps = 0; p.buffer = 0; p.spinT = 0.35; sfx('djump');
        this.burst(p.x + p.w / 2, p.y + p.h, 10, '#ffe9a0', 140);
      }
      let g = GRAV;
      if (p.vy < 0 && !inp.jump && !p.springy) g *= 2.6;   // variable jump height
      if (Math.abs(p.vy) < 80 && inp.jump) g *= 0.6;          // floatier apex
      p.vy += g * dt;
      p.gliding = C.glide && inp.jump && p.vy > 0 && !p.onGround;
      const maxFall = p.gliding ? 85 : 720;
      if (p.vy > maxFall) p.vy = p.gliding ? approach(p.vy, maxFall, 3000 * dt) : maxFall;
      if (p.gliding && Math.random() < 0.15) this.parts.push({ x: p.x + p.w / 2 + rnd(-14, 14), y: p.y + 20, vx: 0, vy: 30, life: 0.5, max: 0.5, col: '#ffe066', size: 2.5, g: 0 });
    }
    if (p.vy >= 0) p.springy = false;

    const prevBottom = p.y + p.h, wasGround = p.onGround, fallV = p.vy;
    // move X
    p.x += p.vx * dt; this.collideX(p);
    // move Y
    p.y += p.vy * dt; p.onGround = false; p.ride = null;
    this.collideY(p, prevBottom);
    if (p.onGround) {
      p.airJumps = 1; p.dashUsed = false;
      if (!wasGround) {
        p.squash = Math.min(0.6, fallV / 1400); p.landT = 0.1;
        if (fallV > 300) this.dust(p.x + p.w / 2, p.y + p.h, 5);
        if (p.pounding) this.poundImpact();
      }
      p.pounding = false;
    }
    p.anim += dt * (p.onGround ? Math.abs(p.vx) / 200 : 1);
    if (p.x < 0) p.x = 0;

    this.interact(prevBottom);
    // fell into a pit
    if (p.y > VH + 40) {
      if (this.assist) { p.y = VH; p.vy = -1100; this.rescues++; }
      else this.die(true);
    }
    // test assist: unstick
    if (this.assist) {
      if (p.x > this.bestX + 4) { this.bestX = p.x; this.stuckT = 0; } else this.stuckT += dt;
      if (this.stuckT > 2.5) { p.vy = -1000; p.springy = true; this.stuckT = 0; this.rescues++; }
    }
  }

  collideX(p) {
    const top = Math.floor(p.y / T), bot = Math.floor((p.y + p.h - 0.01) / T);
    if (p.vx > 0 || p.dashT > 0 && p.face > 0) {
      const cx = Math.floor((p.x + p.w) / T);
      for (let cy = top; cy <= bot; cy++) if (this.solid(cx, cy)) {
        if (p.dashT > 0 && this.tile(cx, cy) === 4) { this.breakCrate(cx, cy); continue; }
        p.x = cx * T - p.w; p.vx = 0; break;
      }
    } else if (p.vx < 0 || p.dashT > 0) {
      const cx = Math.floor(p.x / T);
      for (let cy = top; cy <= bot; cy++) if (this.solid(cx, cy)) {
        if (p.dashT > 0 && this.tile(cx, cy) === 4) { this.breakCrate(cx, cy); continue; }
        p.x = (cx + 1) * T; p.vx = 0; break;
      }
    }
  }

  collideY(p, prevBottom) {
    const l = Math.floor(p.x / T), r = Math.floor((p.x + p.w - 0.01) / T);
    if (p.vy >= 0) {
      const cy = Math.floor((p.y + p.h) / T);
      for (let cx = l; cx <= r; cx++) {
        const t = this.tile(cx, cy);
        if (t === 1 || t === 4 || (t === 2 && prevBottom <= cy * T + 0.5)) {
          if (t === 4 && p.pounding) { this.breakCrate(cx, cy); continue; }
          p.y = cy * T - p.h; p.vy = 0; p.onGround = true; break;
        }
      }
      if (!p.onGround) for (const pl of this.plats) {
        if (pl.kind === 'crumble' && pl.state === 2) continue;
        const ptop = pl.y;
        if (p.x + p.w > pl.x && p.x < pl.x + pl.w && prevBottom <= ptop - pl.dy + 1 && p.y + p.h >= ptop) {
          p.y = ptop - p.h; p.vy = 0; p.onGround = true; p.ride = pl;
          if (pl.kind === 'crumble' && pl.state === 0) { pl.state = 1; pl.timer = 0.45; }
          break;
        }
      }
    } else {
      const cy = Math.floor(p.y / T);
      for (let cx = l; cx <= r; cx++) if (this.solid(cx, cy)) {
        if (this.tile(cx, cy) === 4) this.breakCrate(cx, cy);
        p.y = (cy + 1) * T; p.vy = 0; break;
      }
    }
  }

  breakCrate(cx, cy) {
    this.setTile(cx, cy, 0); sfx('crate'); this.shake(0.12);
    const x = cx * T + 15, y = cy * T + 15;
    for (let i = 0; i < 10; i++) this.parts.push({ x, y, vx: rnd(-160, 160), vy: rnd(-320, -60), life: 0.8, max: 0.8, col: i % 2 ? '#c8873a' : '#8a5a2a', size: rnd(3, 6), g: 1400, sq: true });
    for (let i = 0; i < 2; i++) this.coins.push({ kind: 'coin', x: x + (i ? 8 : -8), y: y - 4, got: false, vy: -260, pop: true });
  }

  poundImpact() {
    const p = this.p; sfx('pound'); this.shake(0.25); this.vibe(30);
    this.burst(p.x + p.w / 2, p.y + p.h, 18, '#fff3c0', 220);
    const cx = Math.floor((p.x + p.w / 2) / T), cy = Math.floor((p.y + p.h + 2) / T);
    if (this.tile(cx, cy) === 4) this.breakCrate(cx, cy);
    for (const e of this.ents) if (e.alive && Math.abs(e.x + e.w / 2 - (p.x + p.w / 2)) < 70 && Math.abs(e.y + e.h - (p.y + p.h)) < 30) {
      if (e.type === 'boss') this.hitBoss(e); else this.kill(e);
    }
  }

  interact(prevBottom) {
    const p = this.p, pc = { x: p.x + p.w / 2, y: p.y + p.h / 2 };
    // pickups
    for (const k of this.coins) {
      if (k.got) continue;
      if (Math.abs(k.x - pc.x) < 18 && Math.abs(k.y - pc.y) < 26) {
        k.got = true;
        if (k.kind === 'coin') { this.coinCount++; sfx('coin'); this.burst(k.x, k.y, 5, '#ffe066', 90); }
        else if (k.kind === 'gem') { this.gems[k.id] = true; sfx('gem'); this.burst(k.x, k.y, 16, '#d5b4ff', 180); this.hooks.toast('Star gem!'); }
        else if (k.kind === 'heart') { if (this.hearts < this.maxHearts) this.hearts++; else this.coinCount += 5; sfx('heart'); this.burst(k.x, k.y, 10, '#ff7a9a', 120); }
        this.hooks.hud(this);
      }
    }
    // springs
    for (const s of this.springs) if (p.vy >= 0 && overlap(p, s) && prevBottom <= s.y + 14) {
      p.vy = -930; p.springy = true; p.onGround = false; p.coyote = 0; p.buffer = 0; p.ride = null; p.pounding = false; p.airJumps = 1; p.dashUsed = false; s.t = 0.3; sfx('spring'); this.burst(s.x + 12, s.y, 8, '#9ff', 120);
    }
    // spikes
    const l = Math.floor(p.x / T), r = Math.floor((p.x + p.w - 0.01) / T), t0 = Math.floor(p.y / T), t1 = Math.floor((p.y + p.h - 0.01) / T);
    for (let cx = l; cx <= r; cx++) for (let cy = t0; cy <= t1; cy++) if (this.tile(cx, cy) === 3 && p.y + p.h > cy * T + 14) { this.hurt(cx * T + 15); }
    // checkpoints
    for (const c of this.checks) if (!c.on && Math.abs(c.x - pc.x) < 20 && p.y + p.h > c.y - 70) {
      c.on = true; this.respawn = { x: c.x - p.w / 2, y: c.y }; sfx('check'); this.burst(c.x, c.y - 50, 14, '#ffe066', 150); this.hooks.toast('Checkpoint');
    }
    // enemies
    for (const e of this.ents) {
      if (!e.alive || !overlap(p, e)) continue;
      const stomp = (p.vy > 0 && prevBottom <= e.y + 10) || p.pounding;
      if (e.type === 'boss') {
        if (stomp && e.hitT <= 0) { this.hitBoss(e); this.bounce(); }
        else if (e.hitT <= 0) this.hurt(e.x + e.w / 2);
      } else if (stomp || p.dashT > 0) { this.kill(e); if (stomp) this.bounce(); }
      else this.hurt(e.x + e.w / 2);
    }
    // goal
    if (this.goal && overlap(p, this.goal) && (!this.boss || !this.boss.alive) && !this.done) {
      this.done = true; this.doneT = 0; this.doneShown = false; sfx('win'); this.vibe(60);
      for (let i = 0; i < 40; i++) this.parts.push({ x: this.goal.x + 21, y: this.goal.y + 20, vx: rnd(-250, 250), vy: rnd(-400, -50), life: 1.5, max: 1.5, col: ['#ffe066', '#8ff0c8', '#ff7a9a', '#d5b4ff'][i % 4], size: rnd(3, 6), g: 500, sq: true });
    }
  }

  bounce() { const p = this.p; p.vy = this.lastJumpHeld ? -600 : -420; p.pounding = false; p.airJumps = 1; p.dashUsed = false; p.dashT = 0; }

  kill(e) {
    e.alive = false; e.deadT = 0.4; sfx('stomp'); this.vibe(15);
    this.burst(e.x + e.w / 2, e.y + e.h / 2, 12, e.type === 'hopper' ? '#ff7a8a' : e.type === 'wisp' ? '#bff' : '#7fe08a', 160);
    this.coinCount++; this.hooks.hud(this);
  }

  hitBoss(e) {
    if (e.hitT > 0) return;
    e.hp--; e.hitT = 1.1; sfx('bosshit'); this.shake(0.3); this.vibe(40);
    this.burst(e.x + e.w / 2, e.y + 10, 20, '#ffb04a', 220);
    if (e.hp <= 0) {
      this.kill(e); this.hooks.toast('Bramblecrown defeated!');
      for (let i = 0; i < 6; i++) this.coins.push({ kind: 'coin', x: e.x + 10 + i * 10, y: e.y, got: false, vy: -300 - i * 20, pop: true });
    } else this.hooks.toast(`Hit! ${e.hp} to go`);
  }

  hurt(fromX) {
    const p = this.p;
    if (p.inv > 0 || this.done) return;
    this.hearts--; p.inv = 1.3; this.hooks.hud(this);
    sfx('hurt'); this.shake(0.25); this.vibe(80);
    p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * 230; p.vy = -380; p.pounding = false; p.dashT = 0;
    this.burst(p.x + p.w / 2, p.y + p.h / 2, 10, '#ff5a7a', 150);
    if (this.hearts <= 0) this.die(false);
  }

  die(pit) {
    if (this.assist) return;
    this.deaths++; sfx(pit ? 'fall' : 'hurt');
    if (pit && this.hearts > 1) { this.hearts--; } else { this.hearts = this.maxHearts; this.hooks.toast('Try again!'); }
    this.p = this.mkPlayer(this.respawn); this.p.inv = 1.2; this.fade = 1;
    if (this.boss && this.boss.alive) { this.boss.hp = 3; this.boss.x = this.boss.homeX ?? this.boss.x; }
    this.hooks.hud(this);
  }

  updateEnemies(dt) {
    const p = this.p;
    for (const e of this.ents) {
      e.t += dt;
      if (!e.alive) { e.deadT -= dt; continue; }
      if (Math.abs(e.x - p.x) > this.VW * 1.2 && e.type !== 'boss') continue; // sleep off-screen
      if (e.type === 'bug') {
        e.vy += GRAV * dt; e.x += e.vx * dt;
        const front = e.vx > 0 ? e.x + e.w : e.x;
        const cx = Math.floor(front / T), cyB = Math.floor((e.y + e.h + 2) / T), cyM = Math.floor((e.y + e.h / 2) / T);
        if (this.solid(cx, cyM) || this.tile(cx, cyM) === 3) { e.vx = -e.vx; e.x += e.vx * dt * 2; }
        else if (e.onGround && !this.solid(cx, cyB) && this.tile(cx, cyB) !== 2) e.vx = -e.vx;
        this.enemyFall(e, dt);
      } else if (e.type === 'hopper') {
        e.vy += GRAV * dt;
        if (e.onGround) { e.vx = 0; e.timer = (e.timer ?? rnd(0.5, 1.2)) - dt; if (e.timer <= 0) { e.vy = -520; e.vx = Math.sign(p.x - e.x || 1) * 70; e.timer = rnd(0.9, 1.5); } }
        const nx = e.x + e.vx * dt, cx = Math.floor((e.vx > 0 ? nx + e.w : nx) / T), cy = Math.floor((e.y + e.h / 2) / T);
        if (!this.solid(cx, cy)) e.x = nx; else e.vx = 0;
        this.enemyFall(e, dt);
      } else if (e.type === 'wisp') {
        e.vx = Math.cos(e.t * 0.9 + e.ph);
        e.x = e.bx + Math.sin(e.t * 0.9 + e.ph) * 70; e.y = e.by + Math.sin(e.t * 2.3) * 22;
      } else if (e.type === 'boss') this.updateBoss(e, dt);
    }
  }

  updateBoss(e, dt) {
    const p = this.p;
    if (e.homeX === undefined) { e.homeX = e.x; e.minX = e.x - 330; e.maxX = e.x + 300; }
    e.hitT = Math.max(0, e.hitT - dt);
    const awake = p.x > e.minX - 60;
    if (!awake) return;
    const speed = 70 + (3 - e.hp) * 35;
    e.vy += GRAV * dt;
    if (e.onGround) {
      e.timer -= dt;
      e.vx = approach(e.vx, e.face * speed, 400 * dt);
      if (e.x < e.minX) e.face = 1; if (e.x > e.maxX) e.face = -1;
      if (e.timer <= 0) { e.vy = -620; e.face = Math.sign(p.x - e.x) || 1; e.vx = e.face * speed * 1.4; e.timer = rnd(1.6, 2.6) - (3 - e.hp) * 0.3; }
    }
    e.x += e.vx * dt;
    e.x = Math.max(e.minX - 20, Math.min(e.maxX + 20, e.x));
    const wasAir = !e.onGround;
    this.enemyFall(e, dt);
    if (wasAir && e.onGround && e.vy === 0 && e.t > 1) { this.shake(0.15); this.dust(e.x + e.w / 2, e.y + e.h, 10); }
  }

  enemyFall(e, dt) {
    e.y += e.vy * dt; e.onGround = false;
    const cy = Math.floor((e.y + e.h) / T), l = Math.floor(e.x / T), r = Math.floor((e.x + e.w - 1) / T);
    if (e.vy >= 0) for (let cx = l; cx <= r; cx++) { const t = this.tile(cx, cy); if (t === 1 || t === 4 || t === 2) { e.y = cy * T - e.h; e.vy = 0; e.onGround = true; break; } }
    if (e.y > VH + 100) e.alive = false;
  }

  updateParts(dt) {
    for (const k of this.coins) if (k.pop) { k.vy += 1200 * dt; k.y += k.vy * dt; const cy = Math.floor((k.y + 8) / T), cx = Math.floor(k.x / T); if (k.vy > 0 && (this.solid(cx, cy) || this.tile(cx, cy) === 2)) { k.y = cy * T - 8; k.pop = false; } }
    for (const q of this.parts) { q.vy += (q.g || 0) * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; }
    this.parts = this.parts.filter((q) => q.life > 0);
    if (this.parts.length > 400) this.parts.splice(0, this.parts.length - 400);
  }

  burst(x, y, n, col, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = rnd(sp * 0.3, sp); this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.3, 0.7), max: 0.7, col, size: rnd(2, 4.5), g: 300 }); } }
  dust(x, y, n) { for (let i = 0; i < n; i++) this.parts.push({ x: x + rnd(-8, 8), y, vx: rnd(-90, 90), vy: rnd(-70, -10), life: 0.4, max: 0.4, col: 'rgba(255,255,255,.75)', size: rnd(3, 6), g: 0 }); }
  shake(t) { if (this.settings.shake) this.shakeT = Math.max(this.shakeT, t); }
  vibe(ms) { if (this.settings.vibe && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { /* ignore */ } }

  // Simple test bot: runs right, jumps over walls/gaps/enemies/spikes.
  botInput(inp, dt) {
    const p = this.p, C = this.C;
    const o = { left: false, right: true, jump: false, action: false, jumpPressed: false, actionPressed: false };
    const feet = p.y + p.h, ahead = p.x + p.w + 6;
    const cxA = Math.floor((ahead + 16) / T), cyF = Math.floor((feet + 2) / T);
    const wall = this.solid(Math.floor((ahead + 4) / T), Math.floor((feet - 10) / T)) || this.solid(Math.floor((ahead + 4) / T), Math.floor((feet - 35) / T));
    let gap = true; for (let cy = cyF; cy < ROWS; cy++) { const t = this.tile(cxA, cy); if (t === 1 || t === 2 || t === 4) { gap = false; break; } }
    if (this.plats.some((pl) => pl.x < ahead + 40 && pl.x + pl.w > ahead && pl.y > p.y)) gap = false;
    const spike = this.tile(Math.floor((ahead + 20) / T), cyF - 1) === 3 || this.tile(Math.floor((ahead + 40) / T), cyF - 1) === 3;
    const enemy = this.ents.some((e) => e.alive && e.type !== 'boss' && e.x > p.x && e.x - p.x < 75 && Math.abs(e.y + e.h - feet) < 50);
    const boss = this.boss && this.boss.alive && Math.abs(this.boss.x - p.x) < 140;
    this.botHold = (this.botHold || 0) - dt;
    // wait for a moving plank that is still far away
    const mover = this.plats.find((pl) => pl.kind === 'move' && pl.bx > p.x - 60 && pl.bx < p.x + 320);
    if (p.onGround && gap && mover && (pl => pl.ax === 'x' ? pl.x > ahead + 30 || pl.x + pl.w < ahead : pl.y > feet + 10 || pl.y < feet - 60)(mover)) { o.right = false; return o; }
    if (this.boss && this.boss.alive && Math.abs(this.boss.x - p.x) < 260) {
      const bc = this.boss.x + this.boss.w / 2, pcx = p.x + p.w / 2;
      o.right = bc > pcx + 6; o.left = bc < pcx - 6;
      if (p.onGround && Math.abs(bc - pcx) < 120 && this.boss.hitT <= 0) { o.jumpPressed = true; this.botHold = 0.5; }
      o.jump = this.botHold > 0;
      if (!p.onGround && C.pound && Math.abs(bc - pcx) < 30) o.actionPressed = true;
      if (this.boss.hitT > 0) { o.left = true; o.right = false; }
      return o;
    }
    if (p.onGround && (wall || gap || spike || enemy || boss)) { o.jumpPressed = true; this.botHold = 0.45; }
    o.jump = this.botHold > 0 || (!p.onGround && gap);
    if (!p.onGround && p.vy > 50 && C.dbl && p.airJumps > 0 && (gap || wall)) o.jumpPressed = true;
    if (!p.onGround && C.pound && boss && this.boss.x < p.x + 10 && this.boss.x + this.boss.w > p.x) o.actionPressed = true;
    return o;
  }

  // ---------- rendering ----------
  curv(s) { const k = this.def.curve; return Math.sin(s / 520 + k[1]) * 0.75 * k[0] + Math.sin(s / 1500) * 0.3; }
  heading(s) { const k = this.def.curve; return -Math.cos(s / 520 + k[1]) * 0.75 * k[0] * 520 - Math.cos(s / 1500) * 0.3 * 1500; }

  proj(x, y, z = 0) {
    const rel = x - this.camX - this.VW / 2;
    const f = 1 / (1 + z * 0.012);
    return [this.VW / 2 + rel * f + this.sx, HZ + (y - HZ) * f + this.bend * rel * rel * f + this.sy, f];
  }

  render() {
    const c = this.c, VW = this.VW;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#000'; c.fillRect(0, 0, this.cv.width, this.cv.height);
    c.setTransform(this.scale, 0, 0, this.scale, this.offX, 0);
    c.save(); c.beginPath(); c.rect(0, 0, VW, VH); c.clip();
    this.sx = 0; this.sy = 0;
    if (this.shakeT > 0) { this.sx = rnd(-4, 4) * this.shakeT * 8; this.sy = rnd(-4, 4) * this.shakeT * 8; }
    const mid = this.camX + VW / 2;
    this.bend = -this.curv(mid) * 0.00022;
    this.drawBackground(mid);
    this.drawDecor(true);
    this.drawTerrain();
    this.drawProps();
    this.drawEntities();
    this.drawParts();
    this.drawFore();
    if (this.fade > 0) { c.fillStyle = `rgba(20,10,40,${this.fade})`; c.fillRect(0, 0, VW, VH); }
    c.restore();
  }

  drawBackground(mid) {
    const c = this.c, VW = this.VW, d = this.def;
    const g = c.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, d.sky[0]); g.addColorStop(0.55, d.sky[1]); g.addColorStop(1, d.sky[2]);
    c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    const hd = this.heading(mid);
    // sun / moon
    const sunX = VW * 0.75 - hd * 0.05 - this.camX * 0.01;
    c.fillStyle = d.night ? 'rgba(255,250,220,.95)' : 'rgba(255,255,220,.9)';
    c.beginPath(); c.arc(sunX, 70, d.night ? 22 : 30, 0, Math.PI * 2); c.fill();
    c.fillStyle = d.night ? 'rgba(255,250,220,.15)' : 'rgba(255,255,220,.25)';
    c.beginPath(); c.arc(sunX, 70, d.night ? 40 : 52, 0, Math.PI * 2); c.fill();
    if (d.night) { c.fillStyle = '#fff'; for (let i = 0; i < 50; i++) { const x = ((i * 137.5 - this.camX * 0.02 - hd * 0.03) % VW + VW) % VW, y = (i * 53) % 170; c.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 1.5 + i)); c.fillRect(x, y, 2, 2); } c.globalAlpha = 1; }
    // clouds
    c.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 6; i++) {
      const x = (((i * 210 - this.camX * 0.06 - hd * 0.08 + this.t * 6) % (VW + 200)) + VW + 200) % (VW + 200) - 100, y = 40 + (i * 37) % 80;
      c.beginPath(); c.ellipse(x, y, 34, 12, 0, 0, 7); c.ellipse(x + 20, y - 8, 22, 12, 0, 0, 7); c.ellipse(x - 18, y - 4, 18, 10, 0, 0, 7); c.fill();
    }
    // three hill layers; their offset swings with the path heading -> sense of turning
    const layers = [{ p: 0.12, h: 0.18, base: 190, amp: 60, col: d.hills[0], fq: 0.006 }, { p: 0.28, h: 0.32, base: 225, amp: 40, col: d.hills[1], fq: 0.011 }, { p: 0.5, h: 0.5, base: 255, amp: 26, col: d.hills[2], fq: 0.018 }];
    layers.forEach((L, li) => {
      const off = this.camX * L.p + hd * L.h;
      c.fillStyle = L.col; c.beginPath(); c.moveTo(0, VH);
      for (let x = 0; x <= VW + 10; x += 10) {
        const wx = x + off, rel = x - VW / 2;
        const y = L.base - (Math.sin(wx * L.fq) * 0.6 + Math.sin(wx * L.fq * 2.3 + li) * 0.4) * L.amp + this.bend * rel * rel * (0.3 + li * 0.2);
        c.lineTo(x, y);
      }
      c.lineTo(VW, VH); c.closePath(); c.fill();
      if (li === 1) { // round trees on middle layer
        for (let i = -2; i < 14; i++) {
          const wx = Math.floor(off / 70) * 70 + i * 70, x = wx - off, rel = x - VW / 2;
          const hash = Math.abs(Math.sin(wx * 12.9898) * 43758.5453) % 1;
          if (hash < 0.5) continue;
          const y = L.base - (Math.sin(wx * L.fq) * 0.6 + Math.sin(wx * L.fq * 2.3 + li) * 0.4) * L.amp + this.bend * rel * rel * 0.5;
          c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(x - 2, y - 14, 4, 16);
          c.fillStyle = L.col; c.beginPath(); c.arc(x, y - 22, 12 + hash * 8, 0, 7); c.fill();
          c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.arc(x - 4, y - 26, 6 + hash * 3, 0, 7); c.fill();
        }
      }
    });
    // light haze toward the play plane
    const hz = c.createLinearGradient(0, 200, 0, VH); hz.addColorStop(0, 'rgba(255,255,255,0)'); hz.addColorStop(1, d.night ? 'rgba(120,90,200,.25)' : 'rgba(255,255,255,.22)');
    c.fillStyle = hz; c.fillRect(0, 200, VW, VH - 200);
  }

  visibleCols() { return [Math.max(0, Math.floor((this.camX - 120) / T)), Math.min(this.W - 1, Math.ceil((this.camX + this.VW + 120) / T))]; }

  poly(pts, fill) { const c = this.c; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); c.fillStyle = fill; c.fill(); }
  edge(x0, x1, y, z) { const out = []; const n = Math.max(1, Math.ceil((x1 - x0) / 30)); for (let i = 0; i <= n; i++) out.push(this.proj(x0 + (x1 - x0) * i / n, y, z)); return out; }

  drawTerrain() {
    const c = this.c, d = this.def, [c0, c1] = this.visibleCols();
    const runs = [];
    for (let cy = 0; cy < ROWS; cy++) {
      let cx = c0;
      while (cx <= c1) {
        if (this.tile(cx, cy) !== 1) { cx++; continue; }
        const exp = this.tile(cx, cy - 1) !== 1;
        let e = cx; while (e + 1 <= c1 && this.tile(e + 1, cy) === 1 && (this.tile(e + 1, cy - 1) !== 1) === exp) e++;
        runs.push({ x0: cx * T, x1: (e + 1) * T, y: cy * T, exp, cy, l: this.tile(cx - 1, cy) !== 1, r: this.tile(e + 1, cy) !== 1 });
        cx = e + 1;
      }
    }
    // pass 1: tops and sides (behind front faces)
    for (const r of runs) {
      if (r.exp) {
        const f = this.edge(r.x0, r.x1, r.y, 0), b = this.edge(r.x0, r.x1, r.y, DEPTH).reverse();
        this.poly(f.concat(b), d.grass);
        // stripes on the grass top for depth
        const m = this.edge(r.x0, r.x1, r.y, DEPTH * 0.5);
        c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2; c.beginPath(); m.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.stroke();
      }
      const side = (x) => {
        const a = this.proj(x, r.y, 0), b = this.proj(x, r.y, DEPTH), cc = this.proj(x, r.y + T, DEPTH), dd = this.proj(x, r.y + T, 0);
        this.poly([a, b, cc, dd], d.ground[1]);
      };
      if (r.l && r.x0 > this.camX + this.VW / 2) side(r.x0);
      if (r.r && r.x1 < this.camX + this.VW / 2) side(r.x1);
    }
    // pass 2: front faces
    for (const r of runs) {
      const top = this.edge(r.x0, r.x1, r.y, 0), bot = this.edge(r.x0, r.x1, r.y + T + 0.5, 0).reverse();
      const shade = Math.min(1, (r.cy - 6) / 6);
      this.poly(top.concat(bot), r.cy >= 11 ? d.ground[1] : d.ground[0]);
      if (r.cy < 11) { c.fillStyle = `rgba(0,0,0,${0.08 + Math.max(0, shade) * 0.1})`; c.fill(); }
      // pebbles
      c.fillStyle = 'rgba(255,255,255,.08)';
      for (let x = r.x0 + 7; x < r.x1; x += 23) { const q = this.proj(x + ((x * 7 + r.cy * 13) % 11), r.y + 10 + ((x + r.cy * 5) % 13)); c.fillRect(q[0], q[1], 4, 3); }
      if (r.exp) { // grassy lip
        c.fillStyle = d.grass; c.beginPath();
        top.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
        for (let i = top.length - 1; i >= 0; i--) { const q = top[i]; c.lineTo(q[0], q[1] + 6 + (i % 2) * 3); }
        c.fill();
        c.strokeStyle = 'rgba(30,15,50,.35)'; c.lineWidth = 1.5; c.beginPath(); top.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.stroke();
      }
    }
  }

  slab(x, y, w, h, top, front, side) {
    const fa = this.edge(x, x + w, y, 0), ba = this.edge(x, x + w, y, DEPTH * 0.8).reverse();
    this.poly(fa.concat(ba), top);
    const mid = this.camX + this.VW / 2;
    const sx = x > mid ? x : x + w < mid ? x + w : null;
    if (sx !== null) this.poly([this.proj(sx, y, 0), this.proj(sx, y, DEPTH * 0.8), this.proj(sx, y + h, DEPTH * 0.8), this.proj(sx, y + h, 0)], side);
    this.poly(fa.concat(this.edge(x, x + w, y + h, 0).reverse()), front);
  }

  drawProps() {
    const c = this.c, [c0, c1] = this.visibleCols();
    for (let cx = c0; cx <= c1; cx++) for (let cy = 0; cy < ROWS; cy++) {
      const t = this.tile(cx, cy), x = cx * T, y = cy * T;
      if (t === 2) { this.slab(x, y, T, 9, '#e8b56a', '#a86a32', '#7a4a22'); if (this.tile(cx + 1, cy) !== 2) { const a = this.proj(x + T - 4, y + 9); c.fillStyle = '#7a4a22'; c.fillRect(a[0] - 2, a[1], 4, 10); } }
      else if (t === 4) {
        this.slab(x + 1, y + 1, T - 2, T - 2, '#f0b860', '#c8873a', '#8a5a2a');
        const a = this.proj(x + 1, y + 1), b = this.proj(x + T - 1, y + T - 1);
        c.strokeStyle = '#7a4a1a'; c.lineWidth = 2.5; c.strokeRect(a[0] + 2, a[1] + 2, b[0] - a[0] - 4, b[1] - a[1] - 4);
        c.beginPath(); c.moveTo(a[0] + 3, a[1] + 3); c.lineTo(b[0] - 3, b[1] - 3); c.moveTo(b[0] - 3, a[1] + 3); c.lineTo(a[0] + 3, b[1] - 3); c.stroke();
      } else if (t === 3) {
        for (let i = 0; i < 3; i++) {
          const a = this.proj(x + i * 10, y + T), b = this.proj(x + i * 10 + 5, y + 8), e = this.proj(x + i * 10 + 10, y + T);
          this.poly([a, b, e], i % 2 ? '#d8d8f0' : '#b0b0d0');
          c.strokeStyle = 'rgba(30,15,50,.6)'; c.lineWidth = 1; c.stroke();
        }
      }
    }
    // moving / crumbling planks
    for (const pl of this.plats) {
      if (pl.x + pl.w < this.camX - 60 || pl.x > this.camX + this.VW + 60) continue;
      if (pl.kind === 'move') {
        this.slab(pl.x, pl.y, pl.w, pl.h, '#8ff0c8', '#2fb98a', '#1b6f53');
        const a = this.proj(pl.x + pl.w / 2, pl.y + pl.h + 4); c.fillStyle = 'rgba(255,255,200,.7)'; c.beginPath(); c.arc(a[0], a[1], 3 + Math.sin(this.t * 8), 0, 7); c.fill();
      } else {
        c.globalAlpha = pl.state === 2 ? Math.max(0, pl.timer - 2) : 1;
        this.slab(pl.x, pl.y, pl.w, pl.h, pl.state === 1 ? '#f0a0a0' : '#e8c890', '#b08850', '#806030');
        const a = this.proj(pl.x + 8, pl.y + 3); c.strokeStyle = 'rgba(80,40,20,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(a[0] + 6, a[1] + 6); c.lineTo(a[0] + 12, a[1] + 2); c.stroke();
        c.globalAlpha = 1;
      }
    }
    // springs
    for (const s of this.springs) {
      const comp = s.t > 0 ? Math.sin(s.t * 30) * 4 : 0;
      this.slab(s.x + 4, s.y + 8, 16, 4, '#aaa', '#777', '#555');
      const a = this.proj(s.x + 12, s.y + 8); c.strokeStyle = '#ddd'; c.lineWidth = 2; c.beginPath();
      for (let i = 0; i < 4; i++) { c.lineTo(a[0] + (i % 2 ? 5 : -5), a[1] - i * 2 - comp * 0.5); } c.stroke();
      this.slab(s.x, s.y - comp, 24, 5, '#ff7a9a', '#e8414e', '#a02a3a');
    }
    // checkpoints: lantern posts
    for (const k of this.checks) {
      const b = this.proj(k.x, k.y), tp = this.proj(k.x, k.y - 58);
      c.strokeStyle = '#5a3a2a'; c.lineWidth = 4; c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(tp[0], tp[1]); c.stroke();
      c.lineWidth = 2; c.beginPath(); c.moveTo(tp[0], tp[1]); c.lineTo(tp[0] + 10, tp[1]); c.stroke();
      const lx = tp[0] + 10, ly = tp[1] + 10;
      if (k.on) { const g = c.createRadialGradient(lx, ly, 1, lx, ly, 26); g.addColorStop(0, 'rgba(255,230,120,.8)'); g.addColorStop(1, 'rgba(255,230,120,0)'); c.fillStyle = g; c.beginPath(); c.arc(lx, ly, 26, 0, 7); c.fill(); }
      c.fillStyle = k.on ? '#ffe066' : '#6a6a8a'; c.fillRect(lx - 5, ly - 7, 10, 14); c.strokeStyle = '#3a2a1a'; c.strokeRect(lx - 5, ly - 7, 10, 14);
    }
    // goal: a swirling leaf portal
    if (this.goal) {
      const g = this.goal, open = !this.boss || !this.boss.alive;
      const ctr = this.proj(g.x + g.w / 2, g.y + g.h / 2);
      c.save(); c.translate(ctr[0], ctr[1]);
      c.strokeStyle = '#7a4a22'; c.lineWidth = 6; c.beginPath(); c.ellipse(0, 0, 22, 32, 0, 0, 7); c.stroke();
      if (open) {
        for (let i = 0; i < 3; i++) { c.rotate(this.t * 1.5 + i * 2.1); const gg = c.createRadialGradient(0, 0, 2, 0, 0, 28); gg.addColorStop(0, '#fff'); gg.addColorStop(0.5, ['#8ff0c8', '#ffe066', '#d5b4ff'][i]); gg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gg; c.globalAlpha = 0.55; c.beginPath(); c.ellipse(0, 0, 18, 28, 0, 0, 7); c.fill(); }
        c.globalAlpha = 1;
      } else { c.fillStyle = 'rgba(40,20,60,.8)'; c.beginPath(); c.ellipse(0, 0, 18, 28, 0, 0, 7); c.fill(); c.fillStyle = '#ffd23a'; c.fillRect(-5, -4, 10, 9); c.beginPath(); c.arc(0, -4, 4, Math.PI, 0); c.strokeStyle = '#ffd23a'; c.lineWidth = 2; c.stroke(); }
      c.restore();
      for (let i = 0; i < 6; i++) { const lf = this.proj(g.x + g.w / 2 + Math.cos(i + this.t) * 26, g.y + g.h / 2 + Math.sin(i * 1.7 + this.t) * 36); c.fillStyle = i % 2 ? '#6fd35a' : '#ff9a3a'; c.beginPath(); c.ellipse(lf[0], lf[1], 5, 2.5, i + this.t, 0, 7); c.fill(); }
    }
  }

  drawDecor() {
    const c = this.c;
    for (const d of this.decor) {
      if (d.x < this.camX - 100 || d.x > this.camX + this.VW + 100) continue;
      const [x, y, f] = this.proj(d.x, 300, d.z), s = d.s * f;
      c.save(); c.translate(x, y); c.scale(s, s);
      if (d.kind === 'tree') {
        c.fillStyle = '#6a4a3a'; c.fillRect(-4, -40, 8, 40);
        c.fillStyle = this.def.hills[1]; c.beginPath(); c.arc(0, -52, 22, 0, 7); c.arc(-14, -40, 14, 0, 7); c.arc(14, -42, 15, 0, 7); c.fill();
        c.fillStyle = 'rgba(255,255,255,.15)'; c.beginPath(); c.arc(-6, -58, 9, 0, 7); c.fill();
      } else if (d.kind === 'flower') {
        c.strokeStyle = '#3a8a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -14); c.stroke();
        c.fillStyle = ['#ff7a9a', '#ffe066', '#9fd0ff', '#d5b4ff'][Math.floor(d.hue * 4)];
        for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(Math.cos(i * 1.26) * 4, -14 + Math.sin(i * 1.26) * 4, 3, 0, 7); c.fill(); }
        c.fillStyle = '#fff3a0'; c.beginPath(); c.arc(0, -14, 2, 0, 7); c.fill();
      } else if (d.kind === 'bush') {
        c.fillStyle = this.def.hills[0]; c.beginPath(); c.arc(-8, -8, 10, 0, 7); c.arc(6, -10, 12, 0, 7); c.arc(16, -6, 8, 0, 7); c.fill();
      } else if (d.kind === 'shroom') {
        c.fillStyle = '#fff1d8'; c.fillRect(-4, -18, 8, 18);
        c.fillStyle = d.hue > 0.5 ? '#e8414e' : '#9b5cf0'; c.beginPath(); c.ellipse(0, -18, 16, 11, 0, Math.PI, 0); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(-6, -22, 2.5, 0, 7); c.arc(5, -24, 2, 0, 7); c.fill();
      } else if (d.kind === 'crystal') {
        c.fillStyle = 'rgba(140,240,255,.85)'; c.beginPath(); c.moveTo(-6, 0); c.lineTo(-3, -26); c.lineTo(2, -32); c.lineTo(6, 0); c.fill();
        c.fillStyle = 'rgba(213,180,255,.85)'; c.beginPath(); c.moveTo(4, 0); c.lineTo(9, -18); c.lineTo(13, 0); c.fill();
      } else if (d.kind === 'lamp') {
        c.fillStyle = '#3a2a4a'; c.fillRect(-2, -34, 4, 34);
        const g = c.createRadialGradient(0, -38, 1, 0, -38, 16); g.addColorStop(0, 'rgba(255,240,160,1)'); g.addColorStop(1, 'rgba(255,240,160,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, -38, 16, 0, 7); c.fill();
      }
      c.restore();
    }
  }

  drawEntities() {
    const c = this.c;
    // pickups
    for (const k of this.coins) {
      if (k.got || k.x < this.camX - 40 || k.x > this.camX + this.VW + 40) continue;
      const [x, y] = this.proj(k.x, k.y + Math.sin(this.t * 4 + k.x) * 3);
      if (k.kind === 'coin') {
        const w = Math.abs(Math.cos(this.t * 4 + k.x * 0.1)) * 7 + 1;
        c.fillStyle = '#b07800'; c.beginPath(); c.ellipse(x + 1, y + 1, w, 8, 0, 0, 7); c.fill();
        c.fillStyle = '#f5c400'; c.beginPath(); c.ellipse(x, y, w, 8, 0, 0, 7); c.fill();
        c.fillStyle = '#fff6b0'; c.fillRect(x - w * 0.3, y - 4, Math.max(1, w * 0.3), 6);
      } else if (k.kind === 'gem') {
        const g = c.createRadialGradient(x, y, 1, x, y, 22); g.addColorStop(0, 'rgba(213,180,255,.8)'); g.addColorStop(1, 'rgba(213,180,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 22, 0, 7); c.fill();
        c.save(); c.translate(x, y); c.rotate(Math.sin(this.t * 2) * 0.3);
        c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 5 : 12, a = i * Math.PI / 5 - Math.PI / 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        c.closePath(); c.fillStyle = '#b07cff'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); c.restore();
      } else {
        c.save(); c.translate(x, y); const s = 1 + Math.sin(this.t * 6) * 0.08; c.scale(s, s);
        c.beginPath(); c.moveTo(0, 8); c.bezierCurveTo(-14, -2, -8, -14, 0, -6); c.bezierCurveTo(8, -14, 14, -2, 0, 8); c.fillStyle = '#ff5a7a'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); c.restore();
      }
    }
    // enemies
    for (const e of this.ents) {
      if (!e.alive && e.deadT <= 0) continue;
      if (e.x + e.w < this.camX - 60 || e.x > this.camX + this.VW + 60) continue;
      const [x, y] = this.proj(e.x + e.w / 2, e.y + e.h);
      c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(x, y, e.w / 2, 3, 0, 0, 7); c.fill();
      drawEnemy(c, e, x, y, e.t);
    }
    if (this.boss && this.boss.alive && this.p.x > this.boss.homeX - 420) {
      const bw = 120, x = this.VW / 2 - bw / 2;
      c.fillStyle = 'rgba(20,10,40,.6)'; c.fillRect(x - 4, 44, bw + 8, 22);
      c.fillStyle = '#ffe066'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText('BRAMBLECROWN', this.VW / 2, 53);
      for (let i = 0; i < 3; i++) { c.fillStyle = i < this.boss.hp ? '#ff5a7a' : '#555'; c.fillRect(x + i * 41, 57, 38, 6); }
    }
    // player
    const p = this.p;
    if (p.inv > 0 && Math.floor(p.inv * 15) % 2 && !this.done) return;
    const [x, y] = this.proj(p.x + p.w / 2, p.y + p.h);
    c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(x, this.groundBelow(p), 11, 3, 0, 0, 7); c.fill();
    const pose = { t: this.t, run: p.onGround ? Math.min(1, Math.abs(p.vx) / 150) : 0, air: p.onGround ? 0 : (p.vy < 0 ? -1 : 1), face: p.face, squash: p.squash, blink: (this.t % 3.2) < 0.12, special: null };
    if (p.spinT > 0) pose.special = 'spin';
    if (p.gliding) pose.special = 'glide';
    if (this.done) { pose.air = Math.sin(this.doneT * 10) > 0 ? -1 : 0; pose.squash = Math.sin(this.doneT * 12) * 0.2; }
    if (this.charId === 'wren') {
      if (pose.special === 'spin') { c.save(); c.translate(x, y - 22); c.rotate(-p.face * (0.35 - p.spinT) * 18); drawWren(c, 0, 22, { ...pose, special: null }); c.restore(); }
      else drawWren(c, x, y, pose);
    } else {
      if (p.pounding) { c.save(); c.translate(x, y - 20); c.rotate(this.t * 30); drawBobble(c, 0, 20, pose); c.restore(); }
      else drawBobble(c, x, y, pose);
    }
  }

  groundBelow(p) {
    const cx = Math.floor((p.x + p.w / 2) / T);
    for (let cy = Math.floor((p.y + p.h) / T); cy < ROWS; cy++) { const t = this.tile(cx, cy); if (t === 1 || t === 2 || t === 4) return this.proj(p.x + p.w / 2, cy * T)[1]; }
    return -100;
  }

  drawParts() {
    const c = this.c;
    for (const q of this.parts) {
      const [x, y] = this.proj(q.x, q.y); c.globalAlpha = Math.max(0, Math.min(1, q.life / (q.max * 0.6)));
      c.fillStyle = q.col;
      if (q.sq) c.fillRect(x - q.size / 2, y - q.size / 2, q.size, q.size); else { c.beginPath(); c.arc(x, y, q.size, 0, 7); c.fill(); }
    }
    c.globalAlpha = 1;
  }

  drawFore() {
    const c = this.c;
    for (const f of this.fore) {
      const [x, y, s] = this.proj(f.x, VH + 10, -28);
      if (x < -80 || x > this.VW + 80) continue;
      c.save(); c.translate(x, y); c.scale(s * f.s, s * f.s); c.globalAlpha = 0.85;
      c.fillStyle = this.def.night ? '#1a2050' : '#2a5a2a';
      if (f.kind === 'grass') { for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 6 - 3, 0); c.quadraticCurveTo(i * 9, -40, i * 12 + Math.sin(this.t * 2 + i) * 4, -60 + Math.abs(i) * 6); c.lineTo(i * 6 + 3, 0); c.fill(); } }
      else { for (let i = 0; i < 5; i++) { c.save(); c.rotate(-0.9 + i * 0.45); c.beginPath(); c.ellipse(0, -30, 7, 30, 0, 0, 7); c.fill(); c.restore(); } }
      c.restore();
    }
  }
}
