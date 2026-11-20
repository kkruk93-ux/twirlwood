// Twirlwood core simulation. Gameplay runs on a 2D plane (distance along the
// path x, height y) with a fixed step; the 3D renderer maps it onto a spline.
import { T, ROWS, buildLevel } from './levels.js';
import { sfx } from './audio.js';

export const VH = 360;
const GRAV = 2000;
export const CHARS = {
  wren: { name: 'Wren', speed: 215, jumpV: 640, dblV: 580, dbl: true, dash: true, w: 18, h: 40 },
  bobble: { name: 'Bobble', speed: 198, jumpV: 655, glide: true, pound: true, w: 20, h: 40 },
  pip: { name: 'Pip', speed: 236, jumpV: 625, spin: true, superJump: true, w: 16, h: 34 },
};
export const BOSS_HP = 6;
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
const rnd = (a, b) => a + Math.random() * (b - a);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const SOLID = (t) => t === 1 || t === 4 || t === 5 || t === 8;
const FLOOR = (t) => SOLID(t) || t === 2 || t === 6;

export class Game {
  constructor(hooks) {
    this.hooks = hooks; this.settings = { shake: true, vibe: true };
    this.t = 0; this.assist = false; this.bot = false; this.lives = 5; this.roster = ['wren', 'bobble'];
  }

  load(index, charId) {
    const L = buildLevel(index);
    this.levelIndex = index; this.def = L.def; this.world = L.world; this.W = L.width; this.pxW = L.width * T;
    this.charId = charId; this.C = CHARS[charId];
    this.grid = new Uint8Array(L.width * ROWS); // 0 empty 1 solid 2 plank 3 spikes 4 crate 5 ice 6 cloud 7 lava 8 conveyor
    this.ents = []; this.coins = []; this.plats = []; this.springs = []; this.checks = []; this.shots = []; this.events = [];
    this.goal = null; this.boss = null; this.gemTotal = 0; this.coinTotal = 0; this.doors = []; this.bonusSpot = null; this.exits = []; this.ropes = [];
    let start = { x: 40, y: 300 };
    const codes = { '#': 1, '=': 2, '^': 3, 'B': 4, '~': 5, 'c': 6, '%': 7, '>': 8 };
    for (let cx = 0; cx < L.width; cx++) for (let cy = 0; cy < ROWS; cy++) {
      const ch = L.cols[cx][cy], x = cx * T, y = cy * T, i = cy * L.width + cx;
      if (codes[ch]) { this.grid[i] = codes[ch]; if (ch === 'B') this.coinTotal += 2; continue; }
      switch (ch) {
        case 'P': start = { x: x + 6, y: y + T }; break;
        case 'o': this.coins.push({ kind: 'coin', x: x + 15, y: y + 15, got: false }); this.coinTotal++; break;
        case 'h': this.coins.push({ kind: 'heart', x: x + 15, y: y + 15, got: false }); break;
        case '1': this.coins.push({ kind: 'life', x: x + 15, y: y + 15, got: false }); break;
        case 'v': this.coins.push({ kind: 'coin', x: x + 15, y: y + 15, got: false, bonus: true }); break;
        case 'G': this.coins.push({ kind: 'gem', x: x + 15, y: y + 15, got: false, id: this.gemTotal++ }); break;
        case 'C': this.checks.push({ x: x + 15, y: y + T, on: false }); break;
        case 'E': this.goal = { x: x - 6, y: y - 60, w: 42, h: 90 }; break;
        case 'S': this.springs.push({ x: x + 3, y: y + T - 12, w: 24, h: 12, t: 0 }); break;
        case 'M': this.plats.push({ kind: 'move', x, y: y + T - 10, w: 90, h: 10, bx: x, by: y + T - 10, ax: 'x', range: 180, speed: 1.0, ph: 0, dx: 0, dy: 0 }); break;
        case 'V': this.plats.push({ kind: 'move', x, y: y + T - 10, w: 90, h: 10, bx: x, by: y + T - 10, ax: 'y', range: 150, speed: 0.9, ph: 0, dx: 0, dy: 0 }); break;
        case 'X': this.plats.push({ kind: 'crumble', x, y, w: 30, h: 12, bx: x, by: y, state: 0, timer: 0, dx: 0, dy: 0 }); break;
        case 'b': this.ents.push(this.mkEnemy('bug', x + 2, y + T - 20, 26, 20)); break;
        case 'a': this.ents.push(this.mkEnemy('crab', x + 1, y + T - 22, 28, 22)); break;
        case 'r': { const e = this.mkEnemy('roller', x + 3, y + T - 24, 24, 24); e.vx = -90; this.ents.push(e); break; }
        case 'm': this.ents.push(this.mkEnemy('hopper', x + 3, y + T - 26, 24, 26)); break;
        case 'w': { const e = this.mkEnemy('wisp', x + 3, y + 5, 24, 22); e.bx = e.x; e.by = e.y; e.ph = Math.random() * 6; this.ents.push(e); break; }
        case 't': { const e = this.mkEnemy('bat', x + 3, y + 4, 24, 18); e.bx = e.x; e.by = e.y; e.state = 'hang'; this.ents.push(e); break; }
        case 'R': { const pl = { kind: 'move', swing: true, ax: 'x', x, y, w: 84, h: 10, px: x + 15, py: y - 60, len: 140, amp: 0.85, speed: 1.5, ph: cx * 0.7, bx: x, by: y, range: 0, dx: 0, dy: 0 }; this.plats.push(pl); this.ropes.push(pl); break; }
        case 'O': for (let k = 0; k < 4; k++) this.plats.push({ kind: 'move', wheel: true, ax: 'x', x, y, w: 72, h: 10, px: x + 15, py: y, len: 85, speed: 0.55, ph: k * Math.PI / 2, bx: x, by: y, range: 0, dx: 0, dy: 0 }); this.wheels = (this.wheels || []).concat([{ x: x + 15, y }]); break;
        case 'f': { const e = this.mkEnemy('ember', x + 4, 312, 22, 24); e.bx = x + 4; e.timer = 0.5 + (cx % 3) * 0.5; e.state = 'wait'; this.ents.push(e); break; }
        case 'D': this.doors.push({ x: x + 2, y: y - 30, w: 26, h: 60 }); break;
        case 'U': this.bonusSpot = { x: x + 6, y: y + T }; break;
        case 'Q': this.exits.push({ x: x + 2, y: y - 30, w: 26, h: 60 }); break;
        case 'K': {
          const kind = L.world.boss;
          const e = this.mkEnemy('boss', x, y + T - 52, 68, 52); e.kind = kind; e.hp = BOSS_HP; e.face = -1; e.state = 'walk'; e.timer = 2;
          if (kind === 'storm') { e.y = 120; e.h = 44; e.state = 'fly'; }
          if (kind === 'magma') { e.w = 76; e.h = 60; e.y = y + T - 60; }
          this.boss = e; this.ents.push(e); break;
        }
        default: break;
      }
    }
    this.start = start; this.respawn = { ...start };
    this.p = this.mkPlayer(start);
    this.hearts = 3; this.maxHearts = 3; this.coinCount = 0; this.gems = new Array(this.gemTotal).fill(false);
    this.deaths = 0; this.time = 0; this.done = false; this.doneT = 0; this.doneShown = false; this.shakeT = 0; this.fade = 1; this.rescues = 0;
    this.stuckT = 0; this.bestX = 0; this.over = false; this.lifeCoins = 0; this.switchCD = 0;
    this.hooks.hud(this);
  }

  mkEnemy(type, x, y, w, h) { return { type, x, y, w, h, vx: type === 'bug' || type === 'crab' ? -45 : 0, vy: 0, alive: true, deadT: 0.5, t: Math.random() * 3, onGround: false, hitT: 0, id: Math.random() }; }
  mkPlayer(s) {
    return { x: s.x, y: s.y - this.C.h, w: this.C.w, h: this.C.h, vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, buffer: 0,
      airJumps: 1, dashT: 0, dashUsed: false, pounding: false, inv: 0, squash: 0, ride: null, gliding: false, anim: 0, spinT: 0, attackT: 0, flipUsed: false, onIce: false };
  }

  tile(cx, cy) {
    if (cx < 0 || cx >= this.W) return 1;
    if (cy >= ROWS) return 0;
    if (cy < 0) return this.grid[cx] === 1 ? 1 : 0;
    return this.grid[cy * this.W + cx];
  }
  solid(cx, cy) { return SOLID(this.tile(cx, cy)); }
  setTile(cx, cy, v) { if (cx >= 0 && cx < this.W && cy >= 0 && cy < ROWS) this.grid[cy * this.W + cx] = v; }

  update(dt, inp) {
    this.t += dt;
    if (this.fade > 0) this.fade = Math.max(0, this.fade - dt * 2.5);
    this.switchCD = Math.max(0, this.switchCD - dt); if (this.warpCD) this.warpCD = Math.max(0, this.warpCD - dt);
    this.updatePlats(dt);
    if (!this.done && !this.over) { this.time += dt; this.updatePlayer(dt, inp); }
    else if (this.done) {
      this.doneT += dt; this.p.vx = 0; this.p.anim += dt;
      if (this.doneT > 1.4 && !this.doneShown) { this.doneShown = true; this.hooks.complete(this); }
    }
    this.updateEnemies(dt);
    this.updateShots(dt);
    for (const k of this.coins) if (k.pop) { k.vy += 1200 * dt; k.y += k.vy * dt; const cy = Math.floor((k.y + 8) / T), cx = Math.floor(k.x / T); if (k.vy > 0 && FLOOR(this.tile(cx, cy))) { k.y = cy * T - 8; k.pop = false; } }
    for (const s of this.springs) s.t = Math.max(0, s.t - dt);
    if (this.shakeT > 0) this.shakeT -= dt;
  }

  updatePlats(dt) {
    for (const pl of this.plats) {
      const ox = pl.x, oy = pl.y;
      if (pl.kind === 'move') {
        pl.ph += dt * pl.speed;
        const k = (1 - Math.cos(pl.ph)) / 2;
        if (pl.swing) { const a = Math.sin(pl.ph) * pl.amp; pl.x = pl.px + Math.sin(a) * pl.len - pl.w / 2; pl.y = pl.py + Math.cos(a) * pl.len; pl.ang = a; }
        else if (pl.wheel) { pl.x = pl.px + Math.cos(pl.ph) * pl.len - pl.w / 2; pl.y = pl.py + Math.sin(pl.ph) * pl.len; }
        else if (pl.ax === 'x') pl.x = pl.bx + k * pl.range; else pl.y = pl.by - k * pl.range;
      } else if (pl.kind === 'crumble') {
        if (pl.state === 1) { pl.timer -= dt; pl.x = pl.bx + Math.sin(this.t * 60) * 1.5; if (pl.timer <= 0) { pl.state = 2; pl.timer = 3; pl.vy = 0; pl.x = pl.bx; sfx('crumble'); } }
        else if (pl.state === 2) { pl.vy += GRAV * dt; pl.y += pl.vy * dt; pl.timer -= dt; if (pl.timer <= 0) { pl.state = 0; pl.x = pl.bx; pl.y = pl.by; } }
      }
      pl.dx = pl.x - ox; pl.dy = pl.y - oy;
    }
  }

  switchChar() {
    if (this.switchCD > 0 || this.done || this.roster.length < 2) return;
    const p = this.p;
    const r = this.roster, i = r.indexOf(this.charId);
    this.charId = r[(i + 1) % r.length]; this.C = CHARS[this.charId];
    const bottom = p.y + p.h; p.w = this.C.w; p.h = this.C.h; p.y = bottom - p.h;
    p.pounding = false; p.dashT = 0; this.switchCD = 0.6;
    sfx('switch'); this.burst(p.x + p.w / 2, p.y + p.h / 2, 18, 0xffffff, 160);
    this.hooks.hud(this);
  }

  updatePlayer(dt, inp) {
    const p = this.p, C = this.C;
    if (this.bot) inp = this.botInput(inp, dt);
    this.lastJumpHeld = inp.jump;
    if (inp.switchPressed) this.switchChar();
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (p.ride) { p.x += p.ride.dx; p.y += p.ride.dy; }
    if (dir) p.face = dir;
    p.coyote = p.onGround ? 0.1 : p.coyote - dt;
    p.buffer = inp.jumpPressed ? 0.13 : p.buffer - dt;
    p.inv = Math.max(0, p.inv - dt); p.squash *= Math.pow(0.0001, dt); p.spinT = Math.max(0, p.spinT - dt); p.attackT = Math.max(0, p.attackT - dt);

    // X = attack: Wren dashes; Bobble swings his hat on the ground or pounds in the air.
    if (inp.actionPressed) {
      if (C.dash && !p.dashUsed && p.dashT <= 0) { p.dashT = 0.17; p.dashUsed = true; p.vy = 0; sfx('dash'); this.burst(p.x + p.w / 2, p.y + p.h / 2, 8, 0xbbffff, 120); }
      else if (C.pound && !p.onGround && !p.pounding) { p.pounding = true; p.vx = 0; p.vy = -120; sfx('dash'); }
      else if (C.pound && p.onGround && p.attackT <= 0) { p.attackT = 0.3; sfx('swing'); this.hatSwing(); }
      else if (C.spin && p.attackT <= 0) { p.attackT = 0.35; sfx('swing'); this.hatSwing(); if (!p.onGround && !p.spunAir) { p.spunAir = true; p.vy = Math.min(p.vy, -160); } }
    }
    // B = special: Wren backflip (high jump from the ground); Bobble ground-pound.
    if (inp.specialPressed) {
      if (C.dash && p.onGround && !p.flipUsed) { p.vy = -820; p.onGround = false; p.coyote = 0; p.spinT = 0.5; p.flipUsed = true; p.springy = true; sfx('djump'); this.dust(p.x + p.w / 2, p.y + p.h, 8); }
      else if (C.pound && !p.onGround && !p.pounding) { p.pounding = true; p.vx = 0; p.vy = -120; sfx('dash'); }
      else if (C.dash && !p.onGround && p.airJumps > 0) { p.vy = -C.dblV; p.airJumps = 0; p.spinT = 0.35; sfx('djump'); }
      else if (C.superJump && p.onGround) { p.vy = -900; p.onGround = false; p.coyote = 0; p.spinT = 0.6; p.springy = true; sfx('spring'); this.dust(p.x + p.w / 2, p.y + p.h, 10); this.burst(p.x + p.w / 2, p.y + p.h, 10, 0xffd27a, 160); }
      else if (C.spin && !p.onGround && !p.spunAir) { p.spunAir = true; p.attackT = 0.35; p.vy = Math.min(p.vy, -260); sfx('djump'); this.hatSwing(); }
    }

    if (p.dashT > 0) {
      p.dashT -= dt; p.vx = p.face * 470; p.vy = 0;
      if (Math.random() < 0.6) this.events.push({ type: 'trail', x: p.x + p.w / 2, y: p.y + rnd(5, p.h - 5) });
      if (p.dashT <= 0) p.vx = p.face * C.speed;
    } else if (p.pounding) {
      p.vx = 0; p.vy = Math.min(p.vy + 4000 * dt, 980);
    } else {
      const target = dir * C.speed * (inp.analog ?? 1);
      const ice = p.onGround && p.onIce;
      const acc = p.onGround ? (ice ? 700 : (dir && Math.sign(dir) !== Math.sign(p.vx) ? 3600 : 2200)) : 1500;
      p.vx = dir ? approach(p.vx, target, acc * dt) : approach(p.vx, 0, (p.onGround ? (ice ? 260 : 2600) : 500) * dt);
      if (p.buffer > 0 && p.coyote > 0) {
        p.vy = Math.min(p.vy, -C.jumpV); p.coyote = 0; p.buffer = 0; p.onGround = false; p.ride = null; p.squash = -0.5;
        sfx('jump'); this.dust(p.x + p.w / 2, p.y + p.h, 6);
      } else if (inp.jumpPressed && !p.onGround && C.dbl && p.airJumps > 0) {
        p.vy = -C.dblV; p.airJumps = 0; p.buffer = 0; p.spinT = 0.35; sfx('djump');
        this.burst(p.x + p.w / 2, p.y + p.h, 10, 0xffe9a0, 140);
      }
      let g = GRAV;
      if (p.vy < 0 && !inp.jump && !p.springy) g *= 2.6;
      if (Math.abs(p.vy) < 80 && inp.jump) g *= 0.6;
      p.vy += g * dt;
      p.gliding = !!C.glide && inp.jump && p.vy > 0 && !p.onGround;
      const maxFall = p.gliding ? 85 : 720;
      if (p.vy > maxFall) p.vy = p.gliding ? approach(p.vy, maxFall, 3000 * dt) : maxFall;
    }
    if (p.vy >= 0) p.springy = false;

    const prevBottom = p.y + p.h, wasGround = p.onGround, fallV = p.vy;
    p.x += p.vx * dt; this.collideX(p);
    p.y += p.vy * dt; p.onGround = false; p.ride = null;
    const landed = this.collideY(p, prevBottom);
    if (p.onGround) {
      p.airJumps = 1; p.dashUsed = false; p.flipUsed = false; p.spunAir = false;
      if (p.onConv) p.x += 110 * dt;
      if (landed && landed !== 7 && landed !== 6) this.lastSafe = { x: p.x, y: p.y + p.h };
      if (!wasGround) {
        p.squash = Math.min(0.6, fallV / 1400);
        if (fallV > 300) this.dust(p.x + p.w / 2, p.y + p.h, 5);
        if (p.pounding) this.poundImpact();
      }
      p.pounding = false;
      if (landed === 6) { p.vy = -720; p.onGround = false; p.springy = true; sfx('bounce'); this.burst(p.x + p.w / 2, p.y + p.h, 8, 0xffffff, 90); }
    }
    p.anim += dt * (p.onGround ? Math.abs(p.vx) / 200 : 1);
    if (p.x < 0) p.x = 0;

    this.interact(prevBottom);
    if (p.y > VH + 40) {
      if (this.assist) { const s = this.lastSafe || this.respawn; p.x = s.x; p.y = s.y - p.h; p.vy = -1000; p.vx = 215; p.springy = true; this.rescues++; }
      else this.die(true);
    }
    if (this.assist) {
      if (p.x > this.bestX + 4) { this.bestX = p.x; this.stuckT = 0; } else this.stuckT += dt;
      if (this.boss && this.boss.alive && this.boss.awake) this.stuckT = 0;
      if (this.stuckT > 9) { p.vy = -1000; p.springy = true; this.stuckT = 0; this.rescues++; }
    }
  }

  hatSwing() {
    const p = this.p, reach = { x: p.face > 0 ? p.x + p.w - 4 : p.x - 34, y: p.y + 4, w: 38, h: p.h - 4 };
    for (const e of this.ents) if (e.alive && e.type !== 'boss' && overlap(reach, e)) this.kill(e);
    const cx = Math.floor((p.face > 0 ? p.x + p.w + 14 : p.x - 14) / T);
    for (let cy = Math.floor(p.y / T); cy <= Math.floor((p.y + p.h - 1) / T); cy++) if (this.tile(cx, cy) === 4) this.breakCrate(cx, cy);
    this.burst(reach.x + reach.w / 2, p.y + p.h / 2, 8, 0xffcc33, 120);
  }

  collideX(p) {
    const top = Math.floor(p.y / T), bot = Math.floor((p.y + p.h - 0.01) / T);
    const right = p.vx > 0 || (p.dashT > 0 && p.face > 0);
    if (p.vx === 0 && p.dashT <= 0) return;
    const cx = right ? Math.floor((p.x + p.w) / T) : Math.floor(p.x / T);
    for (let cy = top; cy <= bot; cy++) if (this.solid(cx, cy)) {
      if (p.dashT > 0 && this.tile(cx, cy) === 4) { this.breakCrate(cx, cy); continue; }
      p.x = right ? cx * T - p.w : (cx + 1) * T; p.vx = 0; break;
    }
  }

  collideY(p, prevBottom) {
    const l = Math.floor(p.x / T), r = Math.floor((p.x + p.w - 0.01) / T);
    let landed = 0;
    if (p.vy >= 0) {
      const cy = Math.floor((p.y + p.h) / T);
      for (let cx = l; cx <= r; cx++) {
        const t = this.tile(cx, cy);
        if (SOLID(t) || ((t === 2 || t === 6) && prevBottom <= cy * T + 0.5)) {
          if (t === 4 && p.pounding) { this.breakCrate(cx, cy); continue; }
          p.y = cy * T - p.h; p.vy = 0; p.onGround = true; landed = t; break;
        }
      }
      p.onIce = landed === 5; p.onConv = landed === 8;
      if (!p.onGround) for (const pl of this.plats) {
        if (pl.kind === 'crumble' && pl.state === 2) continue;
        if (p.x + p.w > pl.x && p.x < pl.x + pl.w && prevBottom <= pl.y - pl.dy + 1 && p.y + p.h >= pl.y) {
          p.y = pl.y - p.h; p.vy = 0; p.onGround = true; p.ride = pl; landed = 7;
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
    return landed;
  }

  breakCrate(cx, cy) {
    this.setTile(cx, cy, 0); sfx('crate'); this.shake(0.12);
    const x = cx * T + 15, y = cy * T + 15;
    this.events.push({ type: 'crate', x, y, cx, cy });
    for (let i = 0; i < 2; i++) this.coins.push({ kind: 'coin', x: x + (i ? 8 : -8), y: y - 4, got: false, vy: -260, pop: true });
  }

  poundImpact() {
    const p = this.p; sfx('pound'); this.shake(0.25); this.vibe(30);
    this.burst(p.x + p.w / 2, p.y + p.h, 18, 0xfff3c0, 220);
    const cx = Math.floor((p.x + p.w / 2) / T), cy = Math.floor((p.y + p.h + 2) / T);
    if (this.tile(cx, cy) === 4) this.breakCrate(cx, cy);
    for (const e of this.ents) if (e.alive && Math.abs(e.x + e.w / 2 - (p.x + p.w / 2)) < 70 && Math.abs(e.y + e.h - (p.y + p.h)) < 30) {
      if (e.type === 'boss') this.hitBoss(e); else this.kill(e);
    }
  }

  interact(prevBottom) {
    const p = this.p, pc = { x: p.x + p.w / 2, y: p.y + p.h / 2 };
    for (const k of this.coins) {
      if (k.got || Math.abs(k.x - pc.x) >= 18 || Math.abs(k.y - pc.y) >= 26) continue;
      k.got = true;
      if (k.kind === 'coin') {
        this.coinCount++; this.lifeCoins++; sfx('coin'); this.burst(k.x, k.y, 5, 0xffe066, 90);
        if (this.lifeCoins >= 100) { this.lifeCoins -= 100; this.lives++; sfx('life'); this.hooks.toast('1-UP!'); }
      } else if (k.kind === 'gem') { this.gems[k.id] = true; sfx('gem'); this.burst(k.x, k.y, 16, 0xd5b4ff, 180); this.hooks.toast('Star gem!'); }
      else if (k.kind === 'life') { this.lives++; sfx('life'); this.burst(k.x, k.y, 16, 0x8ff0c8, 180); this.hooks.toast('1-UP!'); }
      else { if (this.hearts < this.maxHearts) this.hearts++; else this.coinCount += 5; sfx('heart'); this.burst(k.x, k.y, 10, 0xff7a9a, 120); }
      this.hooks.hud(this);
    }
    // lava: hurts and throws you back up
    { const cx = Math.floor((p.x + p.w / 2) / T), cy = Math.floor((p.y + p.h - 4) / T);
      if (this.tile(cx, cy) === 7 && p.y + p.h > cy * T + 10) { this.hurt(p.x + p.w / 2 + p.face * 10, true); p.vy = -820; p.springy = true; p.pounding = false; this.burst(p.x + p.w / 2, cy * T + 10, 14, 0xff8a2a, 200); } }
    // secret doors (warp to the bonus room) and bonus exits
    if (this.bonusSpot && !this.warpCD) for (const d of this.doors) if (overlap(p, d)) { d.used = true; this.lastDoor = d; this.warp(this.bonusSpot.x, this.bonusSpot.y); this.hooks.toast('Secret room!'); }
    if (!this.warpCD) for (const q of this.exits) if (overlap(p, q)) { const d = this.lastDoor || this.doors[0]; if (d) this.warp(d.x + 70, d.y + 60); }
    for (const s of this.springs) if (p.vy >= 0 && overlap(p, s) && prevBottom <= s.y + 14) {
      p.vy = -930; p.springy = true; p.onGround = false; p.coyote = 0; p.buffer = 0; p.ride = null; p.pounding = false; p.airJumps = 1; p.dashUsed = false;
      s.t = 0.3; sfx('spring'); this.burst(s.x + 12, s.y, 8, 0x99ffff, 120);
    }
    const l = Math.floor(p.x / T), r = Math.floor((p.x + p.w - 0.01) / T), t0 = Math.floor(p.y / T), t1 = Math.floor((p.y + p.h - 0.01) / T);
    for (let cx = l; cx <= r; cx++) for (let cy = t0; cy <= t1; cy++) if (this.tile(cx, cy) === 3 && p.y + p.h > cy * T + 14) this.hurt(cx * T + 15);
    for (const c of this.checks) if (!c.on && Math.abs(c.x - pc.x) < 20 && p.y + p.h > c.y - 70) {
      c.on = true; this.respawn = { x: c.x - p.w / 2, y: c.y }; sfx('check'); this.burst(c.x, c.y - 50, 14, 0xffe066, 150); this.hooks.toast('Checkpoint');
    }
    for (const e of this.ents) {
      if (!e.alive || !overlap(p, e)) continue;
      const stomp = (p.vy > 0 && prevBottom <= e.y + 10) || p.pounding;
      if (e.type === 'boss') {
        const vulnerable = e.kind !== 'storm' || e.state === 'rest';
        if (stomp && e.hitT <= 0 && vulnerable) { this.hitBoss(e); this.bounce(); }
        else if (stomp && !vulnerable) this.bounce();
        else if (e.hitT <= 0) this.hurt(e.x + e.w / 2);
      } else if (e.type === 'roller' || e.type === 'ember') {
        if (p.pounding || p.dashT > 0 || p.attackT > 0) this.kill(e); else this.hurt(e.x + e.w / 2);
      } else if (e.type === 'crab') {
        if (p.pounding || p.dashT > 0 || p.attackT > 0) this.kill(e);
        else if (stomp) { this.bounce(); sfx('clank'); }
        else this.hurt(e.x + e.w / 2);
      } else if (stomp || p.dashT > 0 || p.attackT > 0) { this.kill(e); if (stomp) this.bounce(); }
      else this.hurt(e.x + e.w / 2);
    }
    for (const s of this.shots) if (s.alive && overlap(p, s)) { s.alive = false; this.hurt(s.x); }
    if (this.goal && overlap(p, this.goal) && (!this.boss || !this.boss.alive) && !this.done) {
      this.done = true; this.doneT = 0; this.doneShown = false; sfx('win'); this.vibe(60);
      this.burst(this.goal.x + 21, this.goal.y + 30, 40, 0xffe066, 260);
    }
  }

  warp(x, y) {
    const p = this.p; p.x = x; p.y = y - p.h; p.vx = 0; p.vy = 0; p.ride = null; this.warpCD = 0.6; this.bestX = p.x; this.stuckT = 0;
    this.respawnBack = this.respawn; sfx('switch'); this.fade = 0.8; this.events.push({ type: 'warp' }); this.burst(p.x + p.w / 2, p.y + p.h / 2, 20, 0xd5b4ff, 200);
  }

  bounce() { const p = this.p; p.vy = this.lastJumpHeld ? -600 : -420; p.pounding = false; p.airJumps = 1; p.dashUsed = false; p.dashT = 0; }

  kill(e) {
    e.alive = false; e.deadT = 0.5; sfx('stomp'); this.vibe(15);
    this.burst(e.x + e.w / 2, e.y + e.h / 2, 12, { hopper: 0xff7a8a, wisp: 0xbbffff, bat: 0x9a7ad8, roller: 0x8a6a3a, crab: 0x8ff0ff, ember: 0xff8a2a }[e.type] || 0x7fe08a, 160);
  }

  hitBoss(e) {
    if (e.hitT > 0) return;
    e.hp--; e.hitT = 1.2; sfx('bosshit'); this.shake(0.3); this.vibe(40);
    this.burst(e.x + e.w / 2, e.y + 10, 20, 0xffb04a, 220);
    if (e.kind === 'storm') { e.state = 'rise'; e.timer = 0.2; }
    if (e.hp === BOSS_HP / 2) { this.hooks.toast(`${this.world.bossName} is furious!`); e.phase2 = true; this.shake(0.5); sfx('roar'); this.burst(e.x + e.w / 2, e.y + e.h / 2, 30, 0xff4a4a, 260); }
    if (e.hp <= 0) {
      this.kill(e); this.hooks.toast(`${this.world.bossName} defeated!`); this.shots.length = 0;
      for (let i = 0; i < 6; i++) this.coins.push({ kind: 'coin', x: e.x + 10 + i * 10, y: Math.min(e.y, 250), got: false, vy: -300 - i * 20, pop: true });
    } else if (e.hp !== BOSS_HP / 2) this.hooks.toast(`Hit! ${e.hp} to go`);
  }

  hurt(fromX, lava = false) {
    const p = this.p;
    if (this.done) return;
    if (p.inv > 0) { if (lava) { p.vy = -820; } return; }
    this.hearts--; p.inv = 1.3; this.hooks.hud(this);
    sfx('hurt'); this.shake(0.25); this.vibe(80);
    p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * 230; p.vy = -380; p.pounding = false; p.dashT = 0;
    this.burst(p.x + p.w / 2, p.y + p.h / 2, 10, 0xff5a7a, 150);
    if (this.hearts <= 0) this.die(false);
  }

  die(pit) {
    if (this.assist) return;
    this.deaths++; this.lives--; sfx(pit ? 'fall' : 'hurt');
    if (this.lives <= 0) { this.over = true; this.hooks.gameOver(this); return; }
    this.hearts = this.maxHearts;
    this.hooks.toast(`Lives: ${this.lives}`);
    this.p = this.mkPlayer(this.respawn); this.p.inv = 1.2; this.fade = 1; this.shots.length = 0;
    if (this.boss && this.boss.alive) { this.boss.hp = BOSS_HP; this.boss.phase2 = false; this.boss.warn = 0; if (this.boss.homeX !== undefined) { this.boss.x = this.boss.homeX; this.boss.y = this.boss.homeY; } this.boss.state = this.boss.kind === 'storm' ? 'fly' : 'walk'; }
    this.hooks.hud(this);
  }

  updateEnemies(dt) {
    const p = this.p;
    for (const e of this.ents) {
      e.t += dt;
      if (!e.alive) { e.deadT -= dt; continue; }
      if (Math.abs(e.x - p.x) > 900 && e.type !== 'boss') continue;
      if (e.type === 'bug' || e.type === 'crab' || e.type === 'roller') {
        e.vy += GRAV * dt; e.x += e.vx * dt;
        const front = e.vx > 0 ? e.x + e.w : e.x;
        const cx = Math.floor(front / T), cyB = Math.floor((e.y + e.h + 2) / T), cyM = Math.floor((e.y + e.h / 2) / T);
        if (this.solid(cx, cyM) || this.tile(cx, cyM) === 3) { e.vx = -e.vx; e.x += e.vx * dt * 2; }
        else if (e.onGround && !FLOOR(this.tile(cx, cyB))) e.vx = -e.vx;
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
      } else if (e.type === 'bat') {
        if (e.state === 'hang') { if (Math.abs(p.x - e.x) < 150 && p.y > e.y) { e.state = 'swoop'; e.tx = p.x; e.ty = p.y + 10; e.timer = 0; sfx('bat'); } }
        else if (e.state === 'swoop') { e.timer += dt; const k = Math.min(1, e.timer / 0.9); e.vx = (e.tx - e.bx) > 0 ? 1 : -1; e.x = e.bx + (e.tx - e.bx) * k; e.y = e.by + (e.ty - e.by) * Math.sin(k * Math.PI); if (k >= 1) { e.state = 'back'; e.timer = 0; e.bx2 = e.x; } }
        else { e.timer += dt; const k = Math.min(1, e.timer / 1.2); e.x = e.bx2 + (e.bx - e.bx2) * k; e.y = e.by; if (k >= 1) { e.state = 'cool'; e.timer = 1.2; } }
        if (e.state === 'cool') { e.timer -= dt; if (e.timer <= 0) e.state = 'hang'; }
      } else if (e.type === 'ember') { // fire sprite: leaps out of the lava
        if (e.state === 'wait') { e.timer -= dt; e.y = 312; if (e.timer <= 0) { e.state = 'up'; e.vy = -720; } }
        else { e.vy += 1300 * dt; e.y += e.vy * dt; if (e.y > 312 && e.vy > 0) { e.state = 'wait'; e.timer = 1.6; e.y = 312; } }
      } else if (e.type === 'boss') this.updateBoss(e, dt);
    }
  }

  updateBoss(e, dt) {
    const p = this.p;
    if (e.homeX === undefined) { e.homeX = e.x; e.homeY = e.y; e.minX = e.x - 330; e.maxX = e.x + 300; }
    e.hitT = Math.max(0, e.hitT - dt);
    if (!e.awake && p.x < e.minX - 60) return;
    if (!e.awake) this.hooks.bossStart?.(e);
    e.awake = true;
    const rage = e.phase2 ? 2 : (BOSS_HP - e.hp) > 1 ? 1 : 0;
    e.warn = Math.max(0, (e.warn || 0) - dt);
    if (e.kind === 'storm') {
      e.timer -= dt;
      if (e.state === 'fly') {
        e.face = Math.sign(p.x - e.x) || 1;
        e.x += (p.x - 20 - e.x) * Math.min(1, dt * (0.8 + rage * 0.3)); e.y = 110 + Math.sin(e.t * 2) * 25;
        if (e.timer <= 0 && e.t % 2 < 1) { if (Math.random() < 0.5) for (const v of e.phase2 ? [-90, 0, 90] : [0]) this.shots.push({ type: 'feather', x: e.x + e.w / 2, y: e.y + e.h, w: 12, h: 16, vx: v, vy: 220, alive: true, life: 3 }); }
        if (e.timer <= -2.5 + rage * 0.4) { e.state = 'aim'; e.timer = 0.7; e.warn = 0.7; sfx('warn'); }
      } else if (e.state === 'aim') { // telegraph: hover and flash before diving
        e.y = 110 + Math.sin(e.t * 30) * 3; if (e.timer <= 0) { e.state = 'dive'; e.timer = 0; sfx('bat'); e.dives = (e.dives || 0) + 1; }
      } else if (e.state === 'dive') {
        e.y += 520 * dt; if (e.y >= 300 - e.h) { e.y = 300 - e.h; e.state = 'rest'; e.timer = 1.6 - rage * 0.25; this.shake(0.2); this.dust(e.x + e.w / 2, 300, 12); }
      } else if (e.state === 'rest') { if (e.timer <= 0) { e.state = 'rise'; } }
      else if (e.state === 'rise') { e.y -= 300 * dt; if (e.y <= 110) { if (e.phase2 && e.dives % 2 === 1) { e.state = 'aim'; e.timer = 0.6; e.warn = 0.6; sfx('warn'); } else { e.state = 'fly'; e.timer = 1.5; } } }
      e.x = Math.max(e.minX, Math.min(e.maxX, e.x));
      return;
    }
    const speed = (e.kind === 'frost' ? 50 : 70) + rage * 35;
    e.vy += GRAV * dt;
    if (e.onGround) {
      e.timer -= dt;
      e.vx = approach(e.vx, e.face * speed, 400 * dt);
      if (e.x < e.minX) e.face = 1; if (e.x > e.maxX) e.face = -1;
      if (e.timer <= 0 && !e.warn && !e.wound) { e.wound = true; e.warn = 0.55; e.vx = 0; sfx('warn'); }
      if (e.wound && e.warn <= 0) {
        e.wound = false;
        e.vy = -620; e.face = Math.sign(p.x - e.x) || 1; e.vx = e.face * speed * 1.4; e.timer = rnd(1.6, 2.6) - rage * 0.3;
        e.icicles = true;
      }
      if (e.wound) e.vx = 0;
    }
    e.x += e.vx * dt;
    e.x = Math.max(e.minX - 20, Math.min(e.maxX + 20, e.x));
    const wasAir = !e.onGround;
    this.enemyFall(e, dt);
    if (wasAir && e.onGround && e.t > 1) {
      this.shake(0.15); this.dust(e.x + e.w / 2, e.y + e.h, 10);
      if (e.icicles) { e.icicles = false; this.bossLanding(e, rage); }
    }
  }

  bossLanding(e, rage) {
    const p = this.p, cx = e.x + e.w / 2, gy = e.y + e.h;
    if (e.kind === 'frost' || e.kind === 'magma') { sfx('crumble'); for (let i = 0; i < 1 + rage; i++) this.shots.push({ type: e.kind === 'frost' ? 'icicle' : 'ember', x: p.x + rnd(-90, 90), y: -20 - i * 50, w: 12, h: 22, vx: 0, vy: 0, g: 900, alive: true, life: 3 }); }
    if (e.kind === 'bramble' && e.phase2) for (const v of [-170, 170]) this.shots.push({ type: 'seed', x: cx, y: e.y, w: 14, h: 14, vx: v, vy: -520, g: 1200, alive: true, life: 2.2 });
    if ((e.kind === 'frost' || e.kind === 'magma') && e.phase2) for (const v of [-250, 250]) this.shots.push({ type: 'wave', x: cx - 8, y: gy - 18, w: 16, h: 18, vx: v, vy: 0, alive: true, life: 1.8 });
    if (e.kind === 'bramble' && !e.phase2 && rage > 0) this.shots.push({ type: 'seed', x: cx, y: e.y, w: 14, h: 14, vx: Math.sign(p.x - cx) * 160, vy: -480, g: 1200, alive: true, life: 2.2 });
  }

  updateShots(dt) {
    for (const s of this.shots) { s.vy += (s.g || 0) * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (s.life <= 0 || s.y > VH + 40) s.alive = false; }
    this.shots = this.shots.filter((s) => s.alive);
  }

  enemyFall(e, dt) {
    e.y += e.vy * dt; e.onGround = false;
    const cy = Math.floor((e.y + e.h) / T), l = Math.floor(e.x / T), r = Math.floor((e.x + e.w - 1) / T);
    if (e.vy >= 0) for (let cx = l; cx <= r; cx++) { if (FLOOR(this.tile(cx, cy))) { e.y = cy * T - e.h; e.vy = 0; e.onGround = true; break; } }
    if (e.y > VH + 100) e.alive = false;
  }

  burst(x, y, n, col, sp) { this.events.push({ type: 'burst', x, y, n, col, sp }); }
  dust(x, y, n) { this.events.push({ type: 'dust', x, y, n }); }
  shake(t) { if (this.settings.shake) this.shakeT = Math.max(this.shakeT, t); }
  vibe(ms) { if (this.settings.vibe && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { /* ignore */ } }

  // Test bot: runs right, times jumps over gaps/walls/enemies, rides moving planks, fights bosses.
  botFloor(cx, cyF) {
    for (let cy = cyF; cy < ROWS; cy++) { const t = this.tile(cx, cy); if (t === 7 || t === 3) break; if (FLOOR(t)) return true; }
    const x = cx * T + 15;
    return this.plats.some((pl) => pl.x <= x && pl.x + pl.w >= x && !(pl.kind === 'crumble' && pl.state === 2) && pl.y >= cyF * T - 4);
  }
  groundTop(cx) { for (let cy = 0; cy < ROWS; cy++) { const t = this.tile(cx, cy); if (t === 7 || t === 3) return null; if (FLOOR(t)) return cy * T; } return null; }
  botSwing(p, o, feet, ahead) {
    const pc = p.x + p.w / 2, near = (pl) => (pl.swing || pl.wheel) && pl.px > p.x - 200 && pl.px < p.x + 260;
    if (p.ride && (p.ride.swing || p.ride.wheel)) {
      const pl = p.ride, plc = pl.x + pl.w / 2; this.botTarget = null;
      o.right = pc < plc - 8; o.left = pc > plc + 8;
      // next surface: another swinging plank ahead, or the ground past the gap
      const nx = this.plats.filter((q) => q !== pl && (q.swing || q.wheel) && q.x > pl.x + 20 && q.x < pl.x + pl.w + 120 && q.y > pl.y - 70 && q.y < pl.y + 90);
      const edge = pl.x + pl.w; let gx = null;
      for (let cx = Math.floor(edge / T); cx < Math.floor(edge / T) + 5; cx++) { const gt = this.groundTop(cx); if (gt !== null && gt >= pl.y - 70) { gx = cx * T; break; } }
      const toNext = nx.find((q) => q.x - edge < 60 && q.x + q.w > edge + 10);
      if ((gx !== null && gx - edge < 70 && pl.dx >= -0.2) || toNext) { o.right = true; o.left = false; o.jumpPressed = true; this.botHold = 0.3; this.botTarget = toNext || null; }
      o.jump = this.botHold > 0; return o;
    }
    if (!p.onGround && this.botTarget) {
      const t = this.botTarget, tc = t.x + t.w / 2; o.right = tc > pc + 4; o.left = tc < pc - 4; o.jump = p.vy < 0; if (this.C.spin && !p.spunAir && p.vy > 60) o.specialPressed = true;
      if (p.y > 360) this.botTarget = null; return o;
    }
    if (p.onGround) {
      const cands = this.plats.filter(near);
      if (!cands.length) return null;
      const gapAhead = this.groundTop(Math.floor((ahead + 16) / T)) === null || this.groundTop(Math.floor((ahead + 16) / T)) > feet + 4;
      if (!gapAhead) return null;
      const t = cands.find((q) => q.x < ahead + 70 && q.x + q.w > ahead + 15 && q.y > feet - 85 && q.y < feet + 30);
      o.right = false;
      if (t) { o.right = true; o.jumpPressed = true; this.botHold = 0.25; this.botTarget = t; }
      o.jump = this.botHold > 0; return o;
    }
    return null;
  }
  botInput(inp, dt) {
    const p = this.p, C = this.C;
    const o = { left: false, right: true, jump: false, action: false, jumpPressed: false, actionPressed: false };
    const feet = p.y + p.h, ahead = p.x + p.w + 6;
    const cxA = Math.floor((ahead + 16) / T), cyF = Math.floor((feet + 2) / T);
    const cxW = Math.floor((ahead + 4) / T);
    const wall = this.solid(cxW, Math.floor((feet - 10) / T)) || this.solid(cxW, Math.floor((feet - 35) / T));
    if (wall && C.pound && p.onGround && this.tile(cxW, Math.floor((feet - 10) / T)) === 4) o.actionPressed = true;
    if (wall && (C.dash || C.spin) && p.onGround && this.tile(cxW, Math.floor((feet - 10) / T)) === 4) o.actionPressed = true;
    const gap = !this.botFloor(cxA, cyF);
    let gapW = 0; if (gap) { while (gapW < 8 && !this.botFloor(cxA + gapW, cyF)) gapW++; }
    const spike = this.tile(Math.floor((ahead + 20) / T), cyF - 1) === 3 || this.tile(Math.floor((ahead + 40) / T), cyF - 1) === 3;
    const enemy = this.ents.some((e) => e.alive && e.type !== 'boss' && e.x > p.x && e.x - p.x < 75 && Math.abs(e.y + e.h - feet) < 50);
    this.botHold = (this.botHold || 0) - dt;
    const b = this.boss;
    if (b && b.alive && Math.abs(b.x - p.x) < 300) {
      const bc = b.x + b.w / 2, pcx = p.x + p.w / 2;
      o.right = bc > pcx + 6; o.left = bc < pcx - 6;
      const canHit = b.kind !== 'storm' || b.state === 'rest';
      if (!canHit) { o.right = false; o.left = false; }
      if (p.onGround && canHit && Math.abs(bc - pcx) < 120 && b.hitT <= 0) { o.jumpPressed = true; this.botHold = 0.5; }
      o.jump = this.botHold > 0;
      if (!p.onGround && C.pound && Math.abs(bc - pcx) < 30 && canHit) o.actionPressed = true;
      if (b.hitT > 0) { o.left = true; o.right = false; }
      return o;
    }
    // swinging planks and plank wheels
    { const r = this.botSwing(p, o, feet, ahead); if (r) return r; }
    // riding a moving plank
    if (p.ride && p.ride.kind === 'move' && !p.ride.swing && !p.ride.wheel) {
      const pl = p.ride; this.botVert = null;
      if (pl.ax === 'x') {
        const landAhead = this.botFloor(Math.floor((pl.x + pl.w + 45) / T), cyF);
        o.right = landAhead && pl.dx > 0; if (!o.right && p.x + p.w > pl.x + pl.w - 6) o.left = true;
        if (landAhead && pl.dx > 0 && p.x + p.w > pl.x + pl.w - 12) { o.jumpPressed = true; this.botHold = 0.2; }
      } else {
        o.right = false;
        const ledge = this.solid(Math.floor((pl.x + pl.w + 60) / T), Math.floor((pl.y + 5) / T)) ? false : true;
        if (pl.y < 170 && pl.dy <= 0 && ledge) { o.right = true; o.jumpPressed = true; this.botHold = 0.35; }
      }
      o.jump = this.botHold > 0; return o;
    }
    // wait at the edge for a moving plank
    const mover = this.plats.find((pl) => pl.kind === 'move' && !pl.swing && !pl.wheel && pl.bx > p.x - (pl.ax === 'y' ? 260 : 120) && pl.bx < p.x + 240);
    if (mover && p.onGround && mover.ax === 'x' && gap) {
      if (mover.x > ahead + 25 || mover.x + mover.w < ahead + 40) { o.right = false; return o; }
      o.jumpPressed = true; this.botHold = 0.12; o.jump = true; return o;
    }
    if (mover && p.onGround && mover.ax === 'y' && p.x > mover.x - 40 && p.x < mover.x + 260) {
      const pc = p.x + p.w / 2;
      if (pc < mover.x + 15) { o.right = true; return o; }
      if (pc > mover.x + mover.w - 15) { o.right = false; o.left = true; return o; }
      o.right = false;
      if (mover.y > feet - 45 && mover.y < feet + 2 && mover.dy > 0) { o.jumpPressed = true; this.botHold = 0.2; o.jump = true; this.botVert = mover; }
      return o;
    }
    if (!p.onGround && this.botVert) {
      const mv = this.botVert, pc = p.x + p.w / 2;
      o.right = pc < mv.x + mv.w / 2 - 8; o.left = pc > mv.x + mv.w / 2 + 8; o.jump = this.botHold > 0; return o;
    }
    this.botVert = null;
    const stepUp = this.plats.some((pl) => pl.kind === 'crumble' && pl.state !== 2 && pl.x > p.x + p.w && pl.x < ahead + 30 && pl.y < feet - 4 && pl.y > feet - 50);
    if (p.onGround && stepUp && !this.p.ride) { o.jumpPressed = true; this.botHold = 0.15; o.jump = true; return o; }
    if (p.onGround && (wall || gap || spike || enemy)) {
      o.jumpPressed = true;
      this.botHold = wall || enemy || spike ? 0.45 : Math.min(0.45, 0.06 + gapW * 0.07);
    }
    o.jump = this.botHold > 0 || (!p.onGround && gap && p.vy > 0);
    if (!p.onGround && p.vy > 120 && C.dbl && p.airJumps > 0 && (gap || wall) && !this.botFloor(Math.floor((p.x + p.w / 2) / T), cyF)) o.jumpPressed = true;
    if (!p.onGround && p.vy > 120 && C.spin && !p.spunAir && (gap || wall) && !this.botFloor(Math.floor((p.x + p.w / 2) / T), cyF)) o.specialPressed = true;
    return o;
  }
}
