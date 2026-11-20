// Tiny WebAudio synth: sound effects and a looping tune, all generated in code.
let ctx = null, master = null, musicGain = null, sfxGain = null;
let musicOn = true, sfxOn = true, musicTimer = null, nextNote = 0, step = 0, musicWanted = false;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  sfxGain = ctx.createGain(); sfxGain.gain.value = sfxOn ? 0.5 : 0; sfxGain.connect(master);
  musicGain = ctx.createGain(); musicGain.gain.value = musicOn ? 0.16 : 0; musicGain.connect(master);
  if (musicWanted) startMusic();
}

export function setSfx(on) { sfxOn = on; if (sfxGain) sfxGain.gain.value = on ? 0.5 : 0; }
export function setMusic(on) { musicOn = on; if (musicGain) musicGain.gain.value = on ? 0.16 : 0; }

function tone(freq, dur, type = 'square', vol = 0.3, slide = 0, delay = 0, dest = sfxGain) {
  if (!ctx || !dest) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.3, freq = 800, delay = 0, dest = sfxGain, hp = false) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = hp ? 'highpass' : 'lowpass'; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(dest); s.start(t);
}

const SFX = {
  jump: () => tone(380, 0.14, 'square', 0.18, 1.9),
  djump: () => { tone(520, 0.12, 'triangle', 0.25, 1.8); tone(780, 0.1, 'sine', 0.15, 1.5, 0.04); },
  coin: () => { tone(988, 0.07, 'square', 0.14); tone(1319, 0.16, 'square', 0.14, 1, 0.06); },
  gem: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, 'triangle', 0.25, 1, i * 0.07)),
  heart: () => [523, 659, 784].forEach((f, i) => tone(f, 0.15, 'sine', 0.3, 1, i * 0.06)),
  stomp: () => { tone(300, 0.12, 'square', 0.25, 0.4); noise(0.08, 0.2, 1500); },
  hurt: () => { tone(220, 0.3, 'sawtooth', 0.25, 0.4); },
  pound: () => { noise(0.25, 0.45, 500); tone(120, 0.25, 'sine', 0.5, 0.5); },
  dash: () => { noise(0.15, 0.2, 3000); tone(600, 0.12, 'triangle', 0.12, 2); },
  glide: () => tone(700, 0.08, 'sine', 0.06, 1.2),
  spring: () => tone(200, 0.35, 'triangle', 0.35, 4),
  crate: () => { noise(0.18, 0.35, 1200); tone(160, 0.1, 'square', 0.15, 0.6); },
  check: () => [659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.25, 1, i * 0.08)),
  fall: () => tone(600, 0.6, 'sine', 0.25, 0.2),
  bosshit: () => { tone(160, 0.35, 'sawtooth', 0.35, 0.5); noise(0.2, 0.3, 900); },
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.22, 'square', 0.16, 1, i * 0.11)),
  click: () => tone(660, 0.05, 'square', 0.1),
  crumble: () => noise(0.3, 0.2, 700),
  switch: () => { [440, 660, 880].forEach((f, i) => tone(f, 0.1, 'triangle', 0.2, 1, i * 0.04)); noise(0.15, 0.15, 4000); },
  warn: () => { tone(880, 0.09, 'square', 0.16); tone(880, 0.09, 'square', 0.16, 1, 0.14); },
  roar: () => { tone(90, 0.7, 'sawtooth', 0.4, 0.6); noise(0.6, 0.35, 600); },
  lava: () => noise(0.3, 0.2, 400),
  swing: () => { noise(0.12, 0.25, 2500); tone(500, 0.1, 'triangle', 0.12, 0.6); },
  bounce: () => tone(300, 0.25, 'sine', 0.3, 2.5),
  life: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.15, 'square', 0.15, 1, i * 0.07)),
  clank: () => { tone(900, 0.08, 'square', 0.15, 0.7); tone(1400, 0.1, 'triangle', 0.1); },
  bat: () => tone(1200, 0.2, 'sawtooth', 0.06, 0.4),
};
export function sfx(name) { if (sfxOn && ctx && SFX[name]) try { SFX[name](); } catch (e) { /* ignore */ } }

// Procedural music: each world has its own scale, chord loop, tempo and
// instruments; the melody is generated from a seed (A A B A phrasing).
// Boss fights switch to a darker, faster arrangement with heavier drums.
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11], hminor: [0, 2, 3, 5, 7, 8, 11] };
const STYLES = [
  { root: 261.63, scale: 'major', prog: [0, 5, 3, 4], bpm: 118, lead: 'triangle', arp: 'square', seed: 11, swing: 0.08 },
  { root: 220.0, scale: 'dorian', prog: [0, 3, 6, 4], bpm: 96, lead: 'sine', arp: 'triangle', seed: 23, echo: true },
  { root: 293.66, scale: 'lydian', prog: [0, 1, 4, 3], bpm: 128, lead: 'square', arp: 'triangle', seed: 37, swing: 0.05 },
  { root: 196.0, scale: 'minor', prog: [0, 6, 5, 4], bpm: 138, lead: 'sawtooth', arp: 'square', seed: 53 },
];
const BOSS = { root: 207.65, scale: 'hminor', prog: [0, 5, 3, 4], bpm: 150, lead: 'sawtooth', arp: 'square', seed: 71, heavy: true };
let style = STYLES[0], bossMode = false, mel = [], echoNode = null;
function rngS(seed) { let x = seed; return () => ((x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); }
function compose(st) {
  const r = rngS(st.seed), phrase = () => { const out = []; let deg = 4;
    for (let i = 0; i < 32; i++) { // 2 bars of 16ths, notes on 8ths mostly
      if (i % 2 && r() < 0.8) { out.push(null); continue; }
      if (r() < 0.22) { out.push(null); continue; }
      deg += Math.round((r() - 0.5) * 4); deg = Math.max(0, Math.min(11, deg)); out.push(deg);
    } return out; };
  const A = phrase(), B = phrase();
  return [...A, ...A.map((d, i) => (i > 24 && d !== null ? Math.max(0, d - 1) : d)), ...B, ...A];
}
export function setSong(i, boss = false) { style = boss ? { ...BOSS, root: BOSS.root * [1, 0.94, 1.06, 0.9][i] || BOSS.root } : STYLES[i] || STYLES[0]; bossMode = boss; mel = compose(style); step = 0; }
mel = compose(style);
const freqOf = (st, deg, oct = 0) => { const sc = SCALES[st.scale], n = sc.length; const o = Math.floor(deg / n); return st.root * Math.pow(2, (sc[((deg % n) + n) % n] + 12 * (o + oct)) / 12); };
function scheduleMusic() {
  if (!ctx) return;
  const st = style, s16 = 60 / st.bpm / 4;
  if (st.echo && !echoNode) { echoNode = ctx.createDelay(); echoNode.delayTime.value = s16 * 3; const fb = ctx.createGain(); fb.gain.value = 0.35; echoNode.connect(fb); fb.connect(echoNode); echoNode.connect(musicGain); }
  while (nextNote < ctx.currentTime + 0.3) {
    const d = nextNote - ctx.currentTime, k = step % 16, bar = Math.floor(step / 16), chord = st.prog[bar % st.prog.length];
    const sw = (st.swing && k % 2) ? s16 * st.swing * 4 : 0, dd = d + sw;
    // drums
    if (k === 0 || k === 8 || (st.heavy && (k === 6 || k === 11))) { tone(140, 0.16, 'sine', 0.7, 0.35, dd, musicGain); }
    if (k === 4 || k === 12) noise(0.12, 0.28, 1800, dd, musicGain);
    if (k % 2 === 0) noise(0.03, st.heavy ? 0.12 : 0.07, 7000, dd, musicGain, true);
    // bass
    if (k % 4 === 0) tone(freqOf(st, chord, -2) * (k === 4 || k === 12 ? 2 : 1), s16 * 3.2, st.heavy ? 'sawtooth' : 'triangle', 0.5, 1, dd, musicGain);
    // pad at bar start
    if (k === 0) [0, 2, 4].forEach((x) => tone(freqOf(st, chord + x, -1), s16 * 15, 'sine', 0.12, 1, dd, musicGain));
    // arpeggio
    if (k % 2 === 1 || st.heavy) { const x = [0, 2, 4, 7][(k >> (st.heavy ? 0 : 1)) % 4]; tone(freqOf(st, chord + x, 0), s16 * 0.9, st.arp, 0.06, 1, dd, musicGain); }
    // melody
    const m = mel[step % mel.length];
    if (m !== null && m !== undefined) { tone(freqOf(st, m + (st.heavy ? 0 : 0), 1), s16 * 1.8, st.lead, st.lead === 'sine' ? 0.32 : st.lead === 'triangle' ? 0.3 : 0.12, 1, dd, musicGain); if (st.echo && echoNode) tone(freqOf(st, m, 1), s16 * 1.8, 'sine', 0.12, 1, dd, echoNode); }
    nextNote += s16; step++;
  }
}
export function startMusic() {
  musicWanted = true;
  if (!ctx || musicTimer) return;
  nextNote = ctx.currentTime + 0.05;
  musicTimer = setInterval(scheduleMusic, 80);
}
export function stopMusic() { musicWanted = false; if (musicTimer) clearInterval(musicTimer); musicTimer = null; }
export function suspendAudio() { if (ctx && ctx.state === 'running') ctx.suspend(); }
export function resumeAudio() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
