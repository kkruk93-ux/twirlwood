// Save data in localStorage with a backup copy and light validation.
const KEY = 'twirlwood.v2', BAK = 'twirlwood.v2.bak';
const DEFAULTS = () => ({
  settings: { sfx: true, music: true, vibe: true, shake: true, size: 100, opacity: 55, invert: false, quality: 'retro', psx: true, autoQ: true, lite: false },
  char: 'wren', unlocked: 1, levels: {}, lives: 5,
  bank: 0, owned: {}, wear: { wren: 'classic', bobble: 'classic', pip: 'classic' }, ach: {}, trial: {}, introSeen: false,
  stats: { kills: 0, coins: 0, secrets: 0, switches: 0, playTime: 0 },
});
function parse(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const d = DEFAULTS();
  const out = { ...d, ...raw, settings: { ...d.settings, ...(raw.settings || {}) }, levels: raw.levels && typeof raw.levels === 'object' ? raw.levels : {},
    wear: { ...d.wear, ...(raw.wear || {}) }, stats: { ...d.stats, ...(raw.stats || {}) }, owned: raw.owned || {}, ach: raw.ach || {}, trial: raw.trial || {} };
  for (const k of ['unlocked', 'lives', 'bank']) if (!Number.isFinite(out[k]) || out[k] < 0) out[k] = d[k];
  if (out.lives < 1) out.lives = 5;
  return out;
}
export function load() {
  for (const k of [KEY, BAK]) { try { const d = parse(JSON.parse(localStorage.getItem(k))); if (d) return d; } catch (e) { /* try backup */ } }
  return DEFAULTS();
}
let saveTimer = 0;
export function save(data) {
  try { const s = JSON.stringify(data); localStorage.setItem(KEY, s); clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(BAK, s); } catch (e) { /* ignore */ } }, 1500); } catch (e) { /* storage full or blocked */ }
}
export function reset() { try { localStorage.removeItem(KEY); localStorage.removeItem(BAK); } catch (e) { /* ignore */ } return DEFAULTS(); }
