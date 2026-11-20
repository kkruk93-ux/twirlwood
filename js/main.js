import { Game } from './game.js';
import { LEVELS, WORLDS } from './levels.js';
import { World3D } from './world3d.js';
import { createInput } from './input.js';
import { drawPortrait } from './art.js';
import * as audio from './audio.js';
import * as store from './storage.js';
import './monetization.js';
import { COSTUMES, ACHIEVEMENTS, medals, medalFor } from './meta.js';

const $ = (s) => document.querySelector(s);
let data = store.load();
const input = createInput($('#pad'));
let state = 'title', settingsFrom = 'title', toastTimer = 0, mapWorld = 0, trialMode = false;

let w3d;
try { w3d = new World3D($('#game')); } catch (e) {
  $('#loading').textContent = 'This device does not support WebGL, which Twirlwood needs.'; throw e;
}
const game = new Game({
  hud(g) {
    $('#hearts').innerHTML = Array.from({ length: g.maxHearts }, (_, i) => `<span class="heart${i < g.hearts ? '' : ' empty'}"><svg viewBox="0 0 16 16"><path d="M8 14.2 1.9 8.1A3.6 3.6 0 0 1 8 3.6a3.6 3.6 0 0 1 6.1 4.5Z"/></svg></span>`).join('');
    $('#hud-coins').textContent = g.coinCount;
    $('#hud-gems').textContent = `${g.gems.filter(Boolean).length}/${g.gemTotal}`;
    $('#hud-lives').textContent = g.lives;
    const c = $('#hud-char'); c.className = `hud-char ${g.charId}`; c.textContent = g.charId[0].toUpperCase();
  },
  bossStart() { audio.setSong(game.def.world, true); },
  toast,
  complete(g) { onComplete(g); },
  gameOver() { data.lives = 5; store.save(data); state = 'over'; show('over'); },
});
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1300); }
applySettings();

// ---------- screens ----------
const SCREENS = ['title', 'map', 'pause', 'settings', 'about', 'done', 'over', 'help', 'shop', 'ach', 'intro'];
function show(name) {
  SCREENS.forEach((s) => $(`#scr-${s}`).classList.toggle('hidden', s !== name));
  const inLevel = ['playing', 'paused', 'done', 'over'].includes(state);
  $('#hud').classList.toggle('hidden', !inLevel);
  $('#pad').classList.toggle('hidden', name !== null);
  if (name === 'map') renderMap();
  if (name === 'shop') renderShop();
  if (name === 'ach') renderAch();
}
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
  audio.initAudio(); audio.sfx('click');
  const to = b.dataset.go;
  if (to === 'settings') { settingsFrom = state === 'paused' ? 'pause' : 'title'; fillSettings(); }
  show(to);
}));

const stars = (s) => (s ? s.stars.filter(Boolean).length : 0);
function worldUnlocked(w) { return w === 0 || data.unlocked > w * 5; }
const pipOpen = () => data.unlocked > 5;
const roster = () => (pipOpen() ? ['wren', 'bobble', 'pip'] : ['wren', 'bobble']);
function costumesFor() { const o = {}; for (const [h, list] of Object.entries(COSTUMES)) { const c = list.find((x) => x.id === data.wear[h]); o[h] = c && c.map; } return o; }
function unlockAch(id) {
  if (data.ach[id]) return false; const a = ACHIEVEMENTS.find((x) => x.id === id); if (!a) return false;
  data.ach[id] = Date.now(); store.save(data); setTimeout(() => toast(`🏆 ${a.name}`), 400); audio.sfx('gem'); return true;
}
function renderMap() {
  if (!roster().includes(data.char)) data.char = 'wren';
  document.querySelectorAll('.hero').forEach((el) => { el.classList.toggle('sel', el.dataset.char === data.char); el.classList.toggle('locked', !roster().includes(el.dataset.char)); });
  $('#btn-trial').classList.toggle('sel', trialMode);
  $('#world-tabs').innerHTML = WORLDS.map((w, i) => `<button class="tab${i === mapWorld ? ' sel' : ''}${worldUnlocked(i) ? '' : ' locked'}" data-w="${i}" data-testid="tab-${i}">${i + 1}</button>`).join('');
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => { if (worldUnlocked(+b.dataset.w)) { mapWorld = +b.dataset.w; audio.sfx('click'); renderMap(); } }));
  const W = WORLDS[mapWorld];
  const total = LEVELS.reduce((a, _, i) => a + stars(data.levels[i]), 0);
  $('#world-name').textContent = `${W.name} · ★ ${total}/${LEVELS.length * 3}${trialMode ? ' · Time Trial' : ''}`;
  const col = ['#6fd35a', '#8ff0ff', '#ffb0d8', '#ff9a4a'][mapWorld];
  const pts = [[70, 190], [220, 90], [370, 180], [520, 80], [680, 150]];
  let svg = `<path d="M${pts.map((p) => p.join(',')).join(' C')}" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="22" stroke-linecap="round"/>`;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; d += ` C${a[0] + 70},${a[1]} ${b[0] - 70},${b[1]} ${b[0]},${b[1]}`; }
  svg = `<path d="${d}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="26" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="14" stroke-linecap="round" stroke-dasharray="2 18"/>`;
  pts.forEach((p, k) => {
    const i = mapWorld * 5 + k, s = data.levels[i], locked = i + 1 > data.unlocked, boss = k === 4;
    const fill = locked ? '#666' : s && s.done ? '#ffe066' : '#fff';
    svg += `<g class="node" data-lvl="${i}" data-testid="lvl-${i}" transform="translate(${p[0]},${p[1]})" opacity="${locked ? 0.55 : 1}">
      <circle r="${boss ? 34 : 28}" fill="${boss ? '#e0453a' : '#3a2a6e'}" stroke="${fill}" stroke-width="5"/>
      <text y="9" text-anchor="middle" font-size="${boss ? 22 : 24}" fill="${fill}">${locked ? '🔒' : boss ? '👑' : k + 1}</text>
      <text y="${boss ? 56 : 50}" text-anchor="middle" font-size="15" fill="#fff">${LEVELS[i].name}</text>
      <text y="${boss ? -42 : -36}" text-anchor="middle" font-size="16" fill="#ffe066">${locked ? '' : trialMode ? (data.trial[i] ? `${{ gold: '🥇', silver: '🥈', bronze: '🥉' }[data.trial[i].medal] || ''} ${fmtT(data.trial[i].t)}` : '—') : '★'.repeat(stars(s)) + '☆'.repeat(3 - stars(s))}</text></g>`;
  });
  $('#map-svg').innerHTML = svg;
  document.querySelectorAll('.node').forEach((n) => n.addEventListener('click', () => { const i = +n.dataset.lvl; if (i + 1 <= data.unlocked) { audio.initAudio(); startLevel(i); } }));
  $('#map-info').textContent = trialMode ? 'Time Trial: race for gold, silver or bronze. Falls cost no lives.' : `Lives: ${data.lives} · Coins banked: ${data.bank}${pipOpen() ? '' : ' · Beat world 1 to unlock Pip'} · Press Y in a level to switch heroes.`;
}
document.querySelectorAll('.hero').forEach((el) => {
  drawPortrait(el.querySelector('canvas'), el.dataset.char);
  el.addEventListener('click', () => { audio.initAudio(); audio.sfx('click'); if (!roster().includes(el.dataset.char)) { toast('Beat Bramblecrown to unlock Pip'); return; } data.char = el.dataset.char; store.save(data); renderMap(); });
});
const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const fmtT = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
$('#btn-trial').addEventListener('click', () => { trialMode = !trialMode; audio.sfx('click'); renderMap(); });

function startLevel(i) {
  game.lives = data.lives; game.roster = roster(); game.costumes = costumesFor(); game.trial = trialMode;
  game.load(i, roster().includes(data.char) ? data.char : 'wren');
  w3d.build(game);
  input.clear(); state = 'playing'; show(null);
  $('#hud-level').textContent = `${Math.floor(i / 5) + 1}-${(i % 5) + 1} ${LEVELS[i].name}`;
  audio.setSong(LEVELS[i].world, false); audio.startMusic();
  $('#hud-timer').classList.toggle('hidden', !trialMode);
  perf.reset();
  tryLandscape();
}
function pause() { if (state !== 'playing') return; state = 'paused'; show('pause'); }
function resume() { state = 'playing'; input.clear(); show(null); }
$('#btn-pause').addEventListener('click', () => { audio.sfx('click'); pause(); });
$('#btn-resume').addEventListener('click', resume);
$('#btn-restart').addEventListener('click', () => startLevel(game.levelIndex));
$('#btn-help').addEventListener('click', () => show('help'));
$('#btn-help-back').addEventListener('click', () => show('pause'));
$('#btn-quit').addEventListener('click', () => { data.lives = game.lives; store.save(data); toMap(); });
function toMap() { state = 'menu'; audio.stopMusic(); mapWorld = LEVELS[game.levelIndex]?.world ?? mapWorld; show('map'); }

const bossLvl = (i) => i % 5 === 4;
function onComplete(g) {
  const i = g.levelIndex, prev = data.levels[i];
  const gems = g.gems.map((v, k) => v || (prev && prev.gems[k]) || false);
  const coinsOk = g.coinCount >= Math.ceil(g.coinTotal * 0.9);
  const st = [true, gems.every(Boolean), coinsOk || (prev && prev.stars[2])];
  data.levels[i] = { done: true, stars: st, coins: Math.max(g.coinCount, prev ? prev.coins : 0), gems, time: prev ? Math.min(prev.time, g.time) : g.time };
  data.unlocked = Math.max(data.unlocked, Math.min(LEVELS.length, i + 2));
  data.lives = g.lives;
  // bank coins + stats + achievements
  const earned = g.coinCount; data.bank += earned; data.stats.coins += earned; data.stats.kills += g.kills; data.stats.switches += g.switches; if (g.secretFound) data.stats.secrets++;
  const fresh = [];
  const tryA = (id, cond) => { if (cond && unlockAch(id)) fresh.push(ACHIEVEMENTS.find((a) => a.id === id).name); };
  tryA('first', true); tryA('gems', g.gems.every(Boolean) && g.gemTotal > 0); tryA('nohit', g.hurts === 0); tryA('secret', g.secretFound);
  if (bossLvl(i)) tryA('boss' + g.def.world, true);
  tryA('pip', data.unlocked > 5); tryA('rich', data.stats.coins >= 1000); tryA('stomp', data.stats.kills >= 100);
  tryA('stars', LEVELS.reduce((a, _, k) => a + stars(data.levels[k]), 0) >= 45);
  let trialHtml = '';
  if (g.trial) {
    const md = medals(g.pxW, bossLvl(i)), medal = medalFor(g.time, md), best = data.trial[i];
    const better = !best || g.time < best.t;
    if (better) data.trial[i] = { t: g.time, medal: medal || (best && best.medal) || null };
    tryA('trial', medal === 'gold');
    trialHtml = `<div class="medal">${{ gold: '🥇 Gold', silver: '🥈 Silver', bronze: '🥉 Bronze' }[medal] || 'No medal'}</div>Time <b>${fmtT(g.time)}</b>${better ? ' · <b>New best!</b>' : ` · Best ${fmtT(best.t)}`}<br><small>Gold ${fmtT(md.gold)} · Silver ${fmtT(md.silver)} · Bronze ${fmtT(md.bronze)}</small>`;
  }
  store.save(data);
  state = 'done';
  const last = i === LEVELS.length - 1, bossDone = bossLvl(i);
  $('#done-title').textContent = last ? 'Twirlwood is saved!' : bossDone ? `${g.world.bossName} defeated!` : 'Level clear!';
  $('#done-stars').innerHTML = st.map((s) => `<span class="${s ? '' : 'off'}">⭐</span>`).join('');
  $('#done-stats').innerHTML = `Coins: <b>${g.coinCount}/${g.coinTotal}</b> · Star gems: <b>${g.gems.filter(Boolean).length}/${g.gemTotal}</b><br>Time: <b>${fmt(g.time)}</b> · Falls: <b>${g.deaths}</b>${bossDone && !last ? `<br><small>New world unlocked: ${WORLDS[g.def.world + 1].name}</small>` : ''}${last ? '<br><small>Thanks for playing! Collect every star.</small>' : ''}`;
  $('#btn-done-next').classList.toggle('hidden', last);
  $('#done-extra').innerHTML = `${trialHtml}<div>+${earned} coins banked (total 🪙 ${data.bank})</div>${fresh.length ? `<div>🏆 ${fresh.join(' · ')}</div>` : ''}${data.unlocked > 5 && i === 4 ? '<div>New hero unlocked: <b>Pip</b>!</div>' : ''}`;
  show('done');
  // count-up for the stars
  [...$('#done-stars').children].forEach((el, k) => { el.style.opacity = 0; el.style.transform = 'scale(.3)'; setTimeout(() => { el.style.transition = 'all .25s'; el.style.opacity = ''; el.style.transform = ''; if (!el.classList.contains('off')) audio.sfx('coin'); }, 300 + k * 280); });
}
$('#btn-done-map').addEventListener('click', toMap);
$('#btn-done-retry').addEventListener('click', () => startLevel(game.levelIndex));
$('#btn-done-next').addEventListener('click', () => startLevel(game.levelIndex + 1));
$('#btn-over-map').addEventListener('click', toMap);
$('#btn-over-retry').addEventListener('click', () => startLevel(game.levelIndex));

// ---------- intro (story stills over the 3D world) ----------
const STORY = [
  [0, 'In the valley of Twirlwood, lanterns keep the old stories glowing.'],
  [5, 'One night the Lantern Seeds were stolen and scattered through frost caverns…'],
  [10, '…across the castles in the clouds…'],
  [15, '…and deep into the fiery mines.'],
  [0, 'Wren, Bobble and Pip set off along the winding path to bring the light home.'],
];
let introStep = 0, introTimer = 0, introThen = 'map';
function playIntro(then) { introThen = then; introStep = -1; state = 'intro'; show('intro'); nextIntro(); }
function nextIntro() {
  clearTimeout(introTimer); introStep++;
  if (introStep >= STORY.length) { endIntro(); return; }
  const [lvl, text] = STORY[introStep];
  game.load(lvl, 'wren'); w3d.build(game);
  const el = $('#intro-text'); el.style.opacity = 0; setTimeout(() => { el.textContent = text; el.style.opacity = 1; }, 250);
  $('#intro-dots').textContent = STORY.map((_, k) => (k === introStep ? '●' : '○')).join('');
  introTimer = setTimeout(nextIntro, 5200);
}
function endIntro() { clearTimeout(introTimer); data.introSeen = true; store.save(data); game.load(0, 'wren'); w3d.build(game); state = 'menu'; show(introThen); }
$('#scr-intro').addEventListener('click', (e) => { if (e.target.id !== 'btn-intro-skip') nextIntro(); });
$('#btn-intro-skip').addEventListener('click', endIntro);
$('#btn-play').addEventListener('click', () => { audio.initAudio(); audio.sfx('click'); if (!data.introSeen) playIntro('map'); else show('map'); });
$('#btn-story').addEventListener('click', () => { audio.initAudio(); playIntro('title'); });

// ---------- costume shop ----------
function renderShop() {
  $('#shop-bank').textContent = data.bank;
  $('#shop-list').innerHTML = Object.entries(COSTUMES).map(([h, list]) => `<div class="shop-col"><h3>${h[0].toUpperCase() + h.slice(1)}${h === 'pip' && !pipOpen() ? ' 🔒' : ''}</h3>${list.map((c) => {
    const own = c.price === 0 || data.owned[h + ':' + c.id], wear = data.wear[h] === c.id;
    return `<button class="cos${wear ? ' sel' : ''}" data-h="${h}" data-c="${c.id}"><span class="sw" style="background:linear-gradient(135deg,${c.sw[0]} 55%,${c.sw[1]} 55%)"></span>${c.name}<span class="pr">${wear ? 'Worn' : own ? 'Wear' : '🪙 ' + c.price}</span></button>`; }).join('')}</div>`).join('');
  document.querySelectorAll('.cos').forEach((b) => b.addEventListener('click', () => {
    const h = b.dataset.h, c = COSTUMES[h].find((x) => x.id === b.dataset.c), key = h + ':' + c.id;
    if (c.price && !data.owned[key]) {
      if (data.bank < c.price) { toast('Not enough coins yet'); audio.sfx('hurt'); return; }
      data.bank -= c.price; data.owned[key] = true; audio.sfx('life'); unlockAch('style');
    } else audio.sfx('click');
    data.wear[h] = c.id; store.save(data); renderShop();
  }));
}
function renderAch() {
  const n = ACHIEVEMENTS.filter((a) => data.ach[a.id]).length;
  $('#ach-count').textContent = `${n}/${ACHIEVEMENTS.length}`;
  $('#ach-list').innerHTML = ACHIEVEMENTS.map((a) => `<div class="ach${data.ach[a.id] ? ' on' : ''}"><span>${data.ach[a.id] ? '🏆' : '🔒'}</span><div><b>${a.name}</b><small>${a.desc}</small></div></div>`).join('');
}

// ---------- settings ----------
function fillSettings() {
  const s = data.settings;
  for (const k of ['sfx', 'music', 'vibe', 'shake', 'invert', 'psx']) $(`#set-${k}`).checked = s[k];
  $('#set-size').value = s.size; $('#set-opacity').value = s.opacity; $('#set-quality').value = s.quality;
}
function applySettings() {
  const s = data.settings;
  audio.setSfx(s.sfx); audio.setMusic(s.music);
  game.settings = { shake: s.shake, vibe: s.vibe };
  const pad = $('#pad'); pad.style.setProperty('--s', s.size / 100); pad.style.setProperty('--o', s.opacity / 100); pad.classList.toggle('inverted', s.invert);
  w3d.setQuality(s.quality, s.psx); w3d.lite = !!s.lite;
  input.haptic = s.vibe;
}
for (const k of ['sfx', 'music', 'vibe', 'shake', 'invert', 'psx']) $(`#set-${k}`).addEventListener('change', (e) => { data.settings[k] = e.target.checked; store.save(data); applySettings(); });
$('#set-size').addEventListener('input', (e) => { data.settings.size = +e.target.value; store.save(data); applySettings(); });
$('#set-opacity').addEventListener('input', (e) => { data.settings.opacity = +e.target.value; store.save(data); applySettings(); });
$('#set-quality').addEventListener('change', (e) => { data.settings.quality = e.target.value; data.settings.autoQ = false; store.save(data); applySettings(); if (state === 'paused' || state === 'menu' || state === 'title') w3d.build(game); });
$('#btn-settings-back').addEventListener('click', () => show(settingsFrom));
$('#btn-reset').addEventListener('click', () => { if (confirm('Reset all progress?')) { const s = data.settings; data = store.reset(); data.settings = s; store.save(data); toast('Progress reset'); } });

// auto quality: drop to low if the device struggles
const perf = { t: 0, frames: 0, slow: 0, reset() { this.t = 0; this.frames = 0; this.slow = 0; } };
function checkPerf(dt) {
  if (!data.settings.autoQ) return;
  const retro = data.settings.quality === 'retro' || data.settings.quality === 'low';
  if (retro && data.settings.lite) return;
  perf.t += dt; perf.frames++;
  if (perf.t >= 2) { const fps = perf.frames / perf.t; perf.slow = fps < (retro ? 30 : 40) ? perf.slow + 1 : 0; perf.t = 0; perf.frames = 0;
    if (perf.slow >= 2) { if (retro) { data.settings.lite = true; toast('Lighter scenery for smoother play (next level)'); } else { data.settings.quality = 'retro'; toast('Graphics set to Retro for smoother play'); } perf.slow = 0; store.save(data); applySettings(); } }
}

// ---------- loop ----------
const STEP = 1 / 120;
let last = performance.now(), acc = 0, manual = false;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const inp = input.poll();
  if (inp.pausePressed) { inp.pausePressed = false; if (state === 'playing') pause(); else if (state === 'paused') resume(); }
  if (state === 'playing' && !manual) {
    acc += dt; let first = true;
    while (acc >= STEP) {
      game.update(STEP, first ? inp : { ...inp, jumpPressed: false, actionPressed: false, specialPressed: false, switchPressed: false });
      first = false; acc -= STEP;
    }
    checkPerf(dt);
    data.stats.playTime += dt;
    if (game.trial) $('#hud-timer').textContent = fmtT(game.time);
  }
  if (['playing', 'paused', 'done', 'over'].includes(state)) { w3d.update(game, state === 'playing' ? dt : 0.0001); }
  else w3d.idle(game, dt);
  w3d.render();
  requestAnimationFrame(frame);
}
// title backdrop: level 1 scenery
game.load(0, data.char); w3d.build(game);
$('#loading').classList.add('hidden');
requestAnimationFrame(frame);

addEventListener('resize', () => w3d.resize());
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); store.save(data); audio.suspendAudio(); } else audio.resumeAudio(); });
addEventListener('pagehide', () => store.save(data));
function tryLandscape() { try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch (e) { /* unsupported */ } }

// ---------- test hooks (no effect in normal play) ----------
window.__tw = {
  game, w3d, input, LEVELS,
  start(i, ch) { if (ch) data.char = ch; startLevel(i); },
  manual(on) { manual = on; },
  sim(seconds, bot = true, assist = true) {
    game.bot = bot; game.assist = assist;
    const n = Math.round(seconds / STEP), blank = {};
    for (let k = 0; k < n && state === 'playing'; k++) { game.update(STEP, blank); if (game.done && game.doneShown) break; if (k % 6 === 0) game.events.length = 0; }
    game.bot = false; game.assist = false;
    return this.info();
  },
  info() { return { state, level: game.levelIndex, x: Math.round(game.p.x), w: game.pxW, done: game.done, coins: game.coinCount, coinTotal: game.coinTotal, gems: game.gems.filter(Boolean).length, gemTotal: game.gemTotal, hearts: game.hearts, rescues: game.rescues, boss: game.boss ? game.boss.alive : null, time: +game.time.toFixed(1) }; },
  data: () => data, unlockAll() { data.unlocked = LEVELS.length; data.introSeen = true; store.save(data); },
  intro() { playIntro('title'); }, setData(o) { Object.assign(data, o); store.save(data); },
};

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => {});
