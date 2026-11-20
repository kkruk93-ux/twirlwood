// Input: on-screen virtual gamepad (analog stick + A/B/X/Y), a real gamepad via
// the Gamepad API, and keyboard. Multitouch; each pointer is tracked separately.
export function createInput(padEl) {
  const keys = new Set();
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump', KeyK: 'jump',
    KeyX: 'action', KeyJ: 'action', ShiftLeft: 'action',
    KeyC: 'special', KeyL: 'special', ArrowDown: 'special', KeyS: 'special',
    KeyV: 'switch', KeyQ: 'switch', Tab: 'switch',
  };
  const state = { left: false, right: false, jump: false, action: false, special: false, switch: false, analog: 1,
    jumpPressed: false, actionPressed: false, specialPressed: false, switchPressed: false, pausePressed: false, usingPad: false };
  let prev = {};
  addEventListener('keydown', (e) => {
    if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Enter') { if (!e.repeat) state.pausePressed = true; return; }
    if (KEYMAP[e.code]) { keys.add(KEYMAP[e.code]); e.preventDefault(); }
  });
  addEventListener('keyup', (e) => { if (KEYMAP[e.code]) keys.delete(KEYMAP[e.code]); });
  addEventListener('blur', () => { keys.clear(); touches.clear(); stick.id = null; });

  // --- virtual pad ---
  const stickEl = padEl.querySelector('.stick'), knob = padEl.querySelector('.knob');
  const btnEls = [...padEl.querySelectorAll('.pbtn')];
  const touches = new Map(); // pointerId -> button key
  const stick = { id: null, cx: 0, cy: 0, dx: 0, dy: 0 };
  function btnAt(x, y) {
    let best = null, bd = Infinity;
    for (const b of btnEls) { const r = b.getBoundingClientRect(); const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)); if (d < r.width * 0.78 && d < bd) { bd = d; best = b.dataset.k; } }
    return best;
  }
  function stickZone(x) { return x < innerWidth * 0.45 === !padEl.classList.contains('inverted'); }
  padEl.addEventListener('pointerdown', (e) => {
    e.preventDefault(); padEl.setPointerCapture?.(e.pointerId);
    const b = btnAt(e.clientX, e.clientY);
    if (b) { touches.set(e.pointerId, b); return; }
    if (stick.id === null && stickZone(e.clientX)) {
      stick.id = e.pointerId; stick.cx = e.clientX; stick.cy = e.clientY; stick.dx = stick.dy = 0;
      const r = stickEl.getBoundingClientRect(); stickEl.style.left = `${e.clientX - r.width / 2}px`; stickEl.style.top = `${e.clientY - r.height / 2}px`; stickEl.classList.add('active');
    }
  });
  padEl.addEventListener('pointermove', (e) => {
    if (e.pointerId === stick.id) {
      const max = stickEl.getBoundingClientRect().width * 0.4;
      let dx = e.clientX - stick.cx, dy = e.clientY - stick.cy; const l = Math.hypot(dx, dy);
      if (l > max) { dx *= max / l; dy *= max / l; }
      stick.dx = dx / max; stick.dy = dy / max; knob.style.transform = `translate(${dx}px, ${dy}px)`;
    } else if (touches.has(e.pointerId)) { const b = btnAt(e.clientX, e.clientY); if (b) touches.set(e.pointerId, b); }
  });
  const end = (e) => {
    if (e.pointerId === stick.id) { stick.id = null; stick.dx = stick.dy = 0; knob.style.transform = ''; stickEl.classList.remove('active'); stickEl.style.left = ''; stickEl.style.top = ''; }
    touches.delete(e.pointerId);
  };
  padEl.addEventListener('pointerup', end); padEl.addEventListener('pointercancel', end);
  padEl.addEventListener('contextmenu', (e) => e.preventDefault());

  const virtual = {};
  let padPausePrev = false;
  return {
    state, virtual,
    poll() {
      const held = { left: keys.has('left'), right: keys.has('right'), jump: keys.has('jump'), action: keys.has('action'), special: keys.has('special'), switch: keys.has('switch') };
      let analog = 1;
      for (const v of touches.values()) held[v] = true;
      if (stick.id !== null) {
        if (stick.dx < -0.25) held.left = true; if (stick.dx > 0.25) held.right = true;
        if (Math.abs(stick.dx) > 0.25) analog = Math.min(1, 0.45 + Math.abs(stick.dx) * 0.7);
      }
      // Gamepad API (standard mapping: 0 A, 1 B, 2 X, 3 Y, 9 Start, 12-15 d-pad)
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const gp of pads) {
        if (!gp || !gp.connected) continue;
        const b = (i) => gp.buttons[i] && gp.buttons[i].pressed, ax = gp.axes[0] || 0;
        if (ax < -0.3 || b(14)) held.left = true; if (ax > 0.3 || b(15)) held.right = true;
        if (Math.abs(ax) > 0.3) analog = Math.min(1, 0.4 + Math.abs(ax) * 0.7);
        if (b(0)) held.jump = true; if (b(1)) held.special = true; if (b(2)) held.action = true; if (b(3)) held.switch = true;
        if (b(9) && !padPausePrev) state.pausePressed = true; padPausePrev = b(9);
        if (gp.buttons.some((x) => x.pressed) || Math.abs(ax) > 0.3) state.usingPad = true;
      }
      for (const k of Object.keys(virtual)) if (virtual[k]) held[k] = true;
      for (const el of btnEls) el.classList.toggle('on', !!held[el.dataset.k] && [...touches.values()].includes(el.dataset.k));
      Object.assign(state, held); state.analog = analog;
      for (const k of ['jump', 'action', 'special', 'switch']) state[k + 'Pressed'] = held[k] && !prev[k];
      prev = held;
      return state;
    },
    clear() { keys.clear(); touches.clear(); for (const k of Object.keys(virtual)) virtual[k] = false; prev = { jump: true, action: true, special: true, switch: true }; },
  };
}
