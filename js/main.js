import { Game } from './game.js';
import { LEVELS } from './levels.js';
import { createInput } from './input.js';
import { drawPortrait } from './art.js';
import * as audio from './audio.js';
import * as store from './storage.js';
import './monetization.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#game');
let data = store.load();
const input = createInput($('#touch'));
let state = 'title', prevScreen = 'title', settingsFrom = 'title';
let toastTimer = 0;

const game = new Game(canvas, {
  hud(g) {
    $('#hearts').innerHTML = Array.from({ length: g.maxHearts }, (_, i) => `<span class="heart${i < g.hearts ? '' : ' empty'}">❤️</span>`).join('');
    $('#hud-coins').textContent = g.coinCount;
    $('#hud-gems').textContent = `${g.gems.filter(Boolean).length}/${g.gemTotal}`;
  },
  toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1300); },
  complete(g) { onComplete(g); },
});
applySettings();

// ---------- screens ----------
const SCREENS = ['title', 'select', 'pause', 'settings', 'about', 'done'];
function show(name) {
  SCREENS.forEach((s) => $(`#scr-${s}`).classList.toggle('hidden', s !== name));
  const playing = name === null;
  $('#hud').classList.toggle('hidden', !playing && name !== 'pause' && name !== 'done' && !(name === 'settings' && settingsFrom === 'pause'));
  $('#touch').classList.toggle('hidden', !playing);
  if (name === 'select') renderSelect();
}
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
  audio.initAudio(); audio.sfx('click');
  const to = b.dataset.go;
  if (to === 'settings') { settingsFrom = state === 'paused' ? 'pause' : 'title'; fillSettings(); }
  show(to);
}));

function renderSelect() {
  document.querySelectorAll('.char').forEach((el) => el.classList.toggle('sel', el.dataset.char === data.char));
  $('#levels').innerHTML = LEVELS.map((L, i) => {
    const s = data.levels[i]; const locked = i + 1 > data.unlocked;
    const info = locked ? 'Locked' : s ? `★ ${s.gems.filter(Boolean).length}/${s.gems.length} · ${s.coins} coins · ${fmt(s.time)}` : 'New!';
    return `<button class="lvl${locked ? ' locked' : ''}" data-lvl="${i}" data-testid="lvl-${i}" ${locked ? 'disabled' : ''}><b>${i + 1}. ${L.name}</b><span>${info}</span></button>`;
  }).join('');
  document.querySelectorAll('.lvl').forEach((b) => b.addEventListener('click', () => { if (!b.disabled) { audio.initAudio(); startLevel(+b.dataset.lvl); } }));
}
document.querySelectorAll('.char').forEach((el) => {
  drawPortrait(el.querySelector('canvas'), el.dataset.char);
  el.addEventListener('click', () => { audio.initAudio(); audio.sfx('click'); data.char = el.dataset.char; store.save(data); renderSelect(); });
});
const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

function startLevel(i) {
  game.load(i, data.char);
  input.clear(); state = 'playing'; show(null);
  $('#hud-level').textContent = `${i + 1}. ${LEVELS[i].name}`;
  audio.startMusic();
  tryLandscape();
}
function pause() { if (state !== 'playing') return; state = 'paused'; show('pause'); }
function resume() { state = 'playing'; input.clear(); show(null); }
$('#btn-pause').addEventListener('click', () => { audio.sfx('click'); pause(); });
$('#btn-resume').addEventListener('click', resume);
$('#btn-restart').addEventListener('click', () => startLevel(game.levelIndex));
$('#btn-quit').addEventListener('click', () => { state = 'menu'; audio.stopMusic(); show('select'); });

function onComplete(g) {
  const i = g.levelIndex;
  const prev = data.levels[i];
  const gems = g.gems.map((v, k) => v || (prev && prev.gems[k]) || false);
  data.levels[i] = { done: true, coins: Math.max(g.coinCount, prev ? prev.coins : 0), gems, time: prev ? Math.min(prev.time, g.time) : g.time };
  data.unlocked = Math.max(data.unlocked, Math.min(LEVELS.length, i + 2));
  store.save(data);
  state = 'done';
  const last = i === LEVELS.length - 1;
  $('#done-title').textContent = last ? 'Forest saved!' : 'Level clear!';
  $('#done-stats').innerHTML = `Coins: <b>${g.coinCount}</b><br>Star gems: <b>${g.gems.filter(Boolean).length}/${g.gemTotal}</b><br>Time: <b>${fmt(g.time)}</b> · Falls: <b>${g.deaths}</b>${last ? '<br><small>More worlds are coming in the full version.</small>' : ''}`;
  $('#btn-done-next').classList.toggle('hidden', last);
  show('done');
}
$('#btn-done-map').addEventListener('click', () => { state = 'menu'; audio.stopMusic(); show('select'); });
$('#btn-done-retry').addEventListener('click', () => startLevel(game.levelIndex));
$('#btn-done-next').addEventListener('click', () => startLevel(game.levelIndex + 1));

// ---------- settings ----------
function fillSettings() {
  const s = data.settings;
  $('#set-sfx').checked = s.sfx; $('#set-music').checked = s.music; $('#set-vibe').checked = s.vibe; $('#set-shake').checked = s.shake; $('#set-size').value = s.size;
}
function applySettings() {
  const s = data.settings;
  audio.setSfx(s.sfx); audio.setMusic(s.music);
  game.settings = { shake: s.shake, vibe: s.vibe };
  document.documentElement.style.setProperty('--s', s.size / 100);
}
['sfx', 'music', 'vibe', 'shake'].forEach((k) => $(`#set-${k}`).addEventListener('change', (e) => { data.settings[k] = e.target.checked; store.save(data); applySettings(); }));
$('#set-size').addEventListener('input', (e) => { data.settings.size = +e.target.value; store.save(data); applySettings(); });
$('#btn-settings-back').addEventListener('click', () => show(settingsFrom));
$('#btn-reset').addEventListener('click', () => { if (confirm('Reset all progress?')) { const s = data.settings; data = store.reset(); data.settings = s; store.save(data); game.hooks.toast('Progress reset'); } });

// ---------- loop ----------
const STEP = 1 / 120;
let last = performance.now(), acc = 0, titleT = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const inp = input.poll();
  if (inp.pausePressed) { inp.pausePressed = false; if (state === 'playing') pause(); else if (state === 'paused') resume(); }
  if (state === 'playing' && !manual) {
    acc += dt; let first = true;
    while (acc >= STEP) {
      game.update(STEP, first ? inp : { ...inp, jumpPressed: false, actionPressed: false });
      first = false; acc -= STEP;
    }
  }
  if (game.def) {
    if (state !== 'playing' && state !== 'paused' && state !== 'done') { titleT += dt; game.t += dt; game.fade = 0; game.camX = (Math.sin(titleT * 0.1) * 0.5 + 0.5) * Math.max(0, game.pxW - game.VW); }
    game.render();
  }
  requestAnimationFrame(frame);
}
let manual = false;
// title backdrop: show level 1 scenery behind the menu
game.load(0, data.char);
requestAnimationFrame(frame);

addEventListener('resize', () => game.resize());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { pause(); audio.suspendAudio(); } else audio.resumeAudio();
});
function tryLandscape() {
  try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* not supported */ }
}

// ---------- test/debug hooks (no effect in normal play) ----------
window.__tw = {
  game, input, LEVELS,
  start(i, ch) { if (ch) data.char = ch; startLevel(i); },
  manual(on) { manual = on; },
  sim(seconds, bot = true, assist = true) {
    game.bot = bot; game.assist = assist;
    const n = Math.round(seconds / STEP);
    const blank = { left: false, right: false, jump: false, action: false, jumpPressed: false, actionPressed: false };
    for (let k = 0; k < n && state === 'playing'; k++) { game.update(STEP, blank); if (game.done && game.doneShown) break; }
    game.bot = false; game.assist = false;
    return this.info();
  },
  info() { return { state, level: game.levelIndex, x: Math.round(game.p.x), w: game.pxW, done: game.done, coins: game.coinCount, gems: game.gems.filter(Boolean).length, gemTotal: game.gemTotal, hearts: game.hearts, rescues: game.rescues, boss: game.boss ? game.boss.alive : null, time: +game.time.toFixed(1) }; },
  data: () => data,
};

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => {});
