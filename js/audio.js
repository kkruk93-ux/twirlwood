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
function noise(dur, vol = 0.3, freq = 800, delay = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t);
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
  swing: () => { noise(0.12, 0.25, 2500); tone(500, 0.1, 'triangle', 0.12, 0.6); },
  bounce: () => tone(300, 0.25, 'sine', 0.3, 2.5),
  life: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.15, 'square', 0.15, 1, i * 0.07)),
  clank: () => { tone(900, 0.08, 'square', 0.15, 0.7); tone(1400, 0.1, 'triangle', 0.1); },
  bat: () => tone(1200, 0.2, 'sawtooth', 0.06, 0.4),
};
export function sfx(name) { if (sfxOn && ctx && SFX[name]) try { SFX[name](); } catch (e) { /* ignore */ } }

// Original loops, one per world (+ a faster boss variant).
const SONGS = [
  { mel: [0, 4, 7, 9, 7, 4, 2, 4, 0, 2, 4, 7, 9, 12, 9, 7, 5, 9, 12, 9, 7, 4, 2, 0, 2, 4, 7, 4, 2, -1, 0, -1], bass: [0, 0, 5, 5, 7, 7, 0, 0], root: 523.25, beat: 0.2, wave: 'triangle' },
  { mel: [0, 3, 7, 10, 7, 3, 5, 7, 12, 10, 7, 5, 3, 5, 7, -1, 0, 7, 12, 15, 12, 10, 7, 5, 3, 2, 0, 2, 3, -1, -1, -1], bass: [0, 0, 8, 8, 5, 5, 7, 7], root: 440, beat: 0.24, wave: 'sine' },
  { mel: [7, 9, 12, 14, 12, 9, 7, 4, 5, 7, 9, 12, 9, 7, 5, 2, 4, 7, 11, 12, 14, 12, 11, 7, 9, 7, 5, 4, 2, 4, 0, -1], bass: [0, 0, 9, 9, 5, 5, 7, 7], root: 587.33, beat: 0.18, wave: 'square' },
];
let song = SONGS[0], bossMode = false;
export function setSong(i, boss = false) { song = SONGS[i] || SONGS[0]; bossMode = boss; }
function scheduleMusic() {
  if (!ctx) return;
  const beat = song.beat * (bossMode ? 0.8 : 1);
  while (nextNote < ctx.currentTime + 0.3) {
    const m = song.mel[step % song.mel.length];
    if (m >= 0) tone(song.root * Math.pow(2, m / 12), beat * 0.9, song.wave, song.wave === 'square' ? 0.18 : 0.35, 1, nextNote - ctx.currentTime, musicGain);
    if (step % 4 === 0) {
      const b = song.bass[Math.floor(step / 4) % song.bass.length];
      tone(song.root / 4 * Math.pow(2, b / 12), beat * 3.6, 'sine', 0.6, 1, nextNote - ctx.currentTime, musicGain);
    }
    if (bossMode && step % 2 === 0) tone(90, 0.06, 'square', 0.15, 0.5, nextNote - ctx.currentTime, musicGain);
    nextNote += beat; step++;
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
