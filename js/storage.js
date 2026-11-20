const KEY = 'twirlwood.v1';
const DEFAULTS = () => ({
  settings: { sfx: true, music: true, vibe: true, shake: true, size: 100 },
  char: 'wren', unlocked: 1, levels: {},
});
export function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!raw) return DEFAULTS();
    const d = DEFAULTS();
    return { ...d, ...raw, settings: { ...d.settings, ...(raw.settings || {}) }, levels: raw.levels || {} };
  } catch (e) { return DEFAULTS(); }
}
export function save(data) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage full or blocked */ } }
export function reset() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } return DEFAULTS(); }
