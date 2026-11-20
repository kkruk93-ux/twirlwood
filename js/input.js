// Keyboard + multitouch input. Touch uses one overlay that maps every active
// pointer to the button under it, so fingers can slide between buttons.
export function createInput(touchEl) {
  const held = { left: false, right: false, jump: false, action: false };
  const keys = new Set();
  const pointers = new Map();
  const btns = [...touchEl.querySelectorAll('.tbtn')];
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump', KeyK: 'jump',
    KeyX: 'action', ShiftLeft: 'action', ShiftRight: 'action', KeyJ: 'action', ArrowDown: 'action', KeyS: 'action',
  };
  let prev = { jump: false, action: false };
  const state = { left: false, right: false, jump: false, action: false, jumpPressed: false, actionPressed: false, pausePressed: false };

  addEventListener('keydown', (e) => {
    if (e.code === 'Escape' || e.code === 'KeyP') { state.pausePressed = true; return; }
    if (KEYMAP[e.code]) { keys.add(KEYMAP[e.code]); e.preventDefault(); }
  });
  addEventListener('keyup', (e) => { if (KEYMAP[e.code]) keys.delete(KEYMAP[e.code]); });
  addEventListener('blur', () => { keys.clear(); pointers.clear(); });

  function hit(x, y) {
    // nearest button within generous radius (thumb-friendly)
    let best = null, bd = Infinity;
    for (const b of btns) {
      const r = b.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const d = Math.hypot(x - cx, y - cy);
      if (d < r.width * 0.85 && d < bd) { bd = d; best = b.dataset.k; }
    }
    return best;
  }
  const onDown = (e) => { e.preventDefault(); touchEl.setPointerCapture?.(e.pointerId); pointers.set(e.pointerId, hit(e.clientX, e.clientY)); };
  const onMove = (e) => { if (pointers.has(e.pointerId)) pointers.set(e.pointerId, hit(e.clientX, e.clientY)); };
  const onUp = (e) => { pointers.delete(e.pointerId); };
  touchEl.addEventListener('pointerdown', onDown);
  touchEl.addEventListener('pointermove', onMove);
  touchEl.addEventListener('pointerup', onUp);
  touchEl.addEventListener('pointercancel', onUp);
  touchEl.addEventListener('contextmenu', (e) => e.preventDefault());

  const virtual = { left: false, right: false, jump: false, action: false }; // for tests/bot
  return {
    state, virtual,
    poll() {
      for (const k of Object.keys(held)) held[k] = keys.has(k) || virtual[k];
      for (const v of pointers.values()) if (v) held[v] = true;
      for (const b of btns) b.classList.toggle('on', [...pointers.values()].includes(b.dataset.k));
      state.left = held.left; state.right = held.right; state.jump = held.jump; state.action = held.action;
      state.jumpPressed = held.jump && !prev.jump;
      state.actionPressed = held.action && !prev.action;
      prev = { jump: held.jump, action: held.action };
      return state;
    },
    clear() { keys.clear(); pointers.clear(); Object.keys(virtual).forEach((k) => virtual[k] = false); prev = { jump: true, action: true }; },
  };
}
