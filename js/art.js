// Procedural character and enemy art (original designs drawn with Canvas paths).
const TAU = Math.PI * 2;
function ell(c, x, y, rx, ry, fill, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); c.fillStyle = fill; c.fill(); }
function outline(c) { c.lineWidth = 2; c.strokeStyle = 'rgba(30,15,50,.85)'; c.stroke(); }

// pose: {t, run (0..1), air (-1 up .. 1 down), face (1/-1), squash, special}
export function drawWren(c, x, y, p) {
  c.save(); c.translate(x, y); c.scale(p.face * (1 + p.squash * 0.25), 1 - p.squash * 0.25);
  const sw = Math.sin(p.t * 16) * p.run;
  const bob = p.run ? Math.abs(Math.sin(p.t * 16)) * 2 : Math.sin(p.t * 3) * 1;
  if (p.special === 'spin') c.rotate(p.t * 25);
  // scarf
  c.beginPath(); c.moveTo(-4, -30 - bob);
  const fl = Math.sin(p.t * 12) * 3;
  c.quadraticCurveTo(-16, -32 - bob + fl, -24 - p.run * 6, -26 - bob - fl); c.lineTo(-22 - p.run * 6, -21 - bob); c.quadraticCurveTo(-12, -26 - bob, -2, -26 - bob);
  c.fillStyle = '#ff5a7a'; c.fill(); outline(c);
  // legs
  c.lineCap = 'round'; c.lineWidth = 5; c.strokeStyle = '#2a1a4a';
  const la = p.air ? -0.5 : sw * 0.9, lb = p.air ? 0.7 : -sw * 0.9;
  c.beginPath(); c.moveTo(-3, -12 - bob); c.lineTo(-3 + Math.sin(la) * 11, -12 - bob + Math.cos(la) * 11); c.stroke();
  c.beginPath(); c.moveTo(3, -12 - bob); c.lineTo(3 + Math.sin(lb) * 11, -12 - bob + Math.cos(lb) * 11); c.stroke();
  // body
  c.beginPath(); c.moveTo(-8, -12 - bob); c.quadraticCurveTo(-9, -26 - bob, 0, -28 - bob); c.quadraticCurveTo(9, -26 - bob, 8, -12 - bob); c.closePath();
  c.fillStyle = '#2cc9b0'; c.fill(); outline(c);
  ell(c, 0, -18 - bob, 3, 3, '#ffe066');
  // arms
  c.lineWidth = 4; c.strokeStyle = '#ffd2b0';
  const aa = p.air ? -2.2 : -sw * 0.8;
  c.beginPath(); c.moveTo(4, -24 - bob); c.lineTo(4 + Math.sin(aa + 0.6) * 10, -24 - bob + Math.cos(aa + 0.6) * 10); c.stroke();
  // head
  c.beginPath(); c.arc(1, -36 - bob, 9, 0, TAU); c.fillStyle = '#ffd2b0'; c.fill(); outline(c);
  // hair + ears (fox-like)
  c.beginPath(); c.moveTo(-9, -37 - bob); c.quadraticCurveTo(-6, -48 - bob, 3, -46 - bob); c.quadraticCurveTo(10, -46 - bob, 10, -38 - bob); c.quadraticCurveTo(2, -42 - bob, -9, -37 - bob);
  c.fillStyle = '#f08a2e'; c.fill(); outline(c);
  c.beginPath(); c.moveTo(-6, -44 - bob); c.lineTo(-9, -54 - bob); c.lineTo(-1, -46 - bob); c.fillStyle = '#f08a2e'; c.fill(); outline(c);
  c.beginPath(); c.moveTo(3, -46 - bob); c.lineTo(5, -56 - bob); c.lineTo(9, -44 - bob); c.fillStyle = '#f08a2e'; c.fill(); outline(c);
  // eye
  ell(c, 5, -36 - bob, 2, p.blink ? 0.4 : 2.6, '#2a1a4a');
  ell(c, 5.6, -37 - bob, 0.8, 0.8, '#fff');
  c.restore();
}

export function drawBobble(c, x, y, p) {
  c.save(); c.translate(x, y); c.scale(p.face * (1 + p.squash * 0.25), 1 - p.squash * 0.25);
  const sw = Math.sin(p.t * 14) * p.run;
  const bob = p.run ? Math.abs(Math.sin(p.t * 14)) * 2.5 : Math.sin(p.t * 3) * 1;
  // glide cape (spread when gliding)
  if (p.special === 'glide') {
    c.beginPath(); c.moveTo(-4, -26 - bob); c.quadraticCurveTo(-26, -34, -30, -12); c.quadraticCurveTo(-14, -20, -4, -14);
    c.moveTo(4, -26 - bob); c.quadraticCurveTo(26, -34, 30, -12); c.quadraticCurveTo(14, -20, 4, -14);
    c.fillStyle = '#ffcc33'; c.fill(); outline(c);
  }
  // legs
  c.lineCap = 'round'; c.lineWidth = 5;
  const la = p.air ? 0.4 : sw, lb = p.air ? -0.4 : -sw;
  c.strokeStyle = '#7a3cc8'; c.beginPath(); c.moveTo(-4, -10 - bob); c.lineTo(-4 + Math.sin(la) * 9, -10 - bob + Math.cos(la) * 9); c.stroke();
  c.strokeStyle = '#ffcc33'; c.beginPath(); c.moveTo(4, -10 - bob); c.lineTo(4 + Math.sin(lb) * 9, -10 - bob + Math.cos(lb) * 9); c.stroke();
  // round body with diamonds
  c.beginPath(); c.ellipse(0, -18 - bob, 11, 11, 0, 0, TAU); c.fillStyle = '#9b5cf0'; c.fill(); outline(c);
  c.save(); c.clip();
  c.fillStyle = '#ffcc33';
  for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 8, -30 - bob); c.lineTo(i * 8 + 4, -24 - bob); c.lineTo(i * 8, -18 - bob); c.lineTo(i * 8 - 4, -24 - bob); c.fill(); c.beginPath(); c.moveTo(i * 8 + 4, -18 - bob); c.lineTo(i * 8 + 8, -12 - bob); c.lineTo(i * 8 + 4, -6 - bob); c.lineTo(i * 8, -12 - bob); c.fill(); }
  c.restore();
  // ruff collar
  for (let i = 0; i < 5; i++) ell(c, -8 + i * 4, -28 - bob, 3, 2.5, '#fff');
  // head
  c.beginPath(); c.arc(0, -36 - bob, 8.5, 0, TAU); c.fillStyle = '#ffe2c8'; c.fill(); outline(c);
  ell(c, 6, -34 - bob, 2.2, 2.2, '#ff7a9a');
  // two-point hat with bells
  const flop = Math.sin(p.t * 10) * (p.run ? 3 : 1) + (p.air < 0 ? 3 : 0);
  c.beginPath(); c.moveTo(-8, -40 - bob); c.quadraticCurveTo(-14, -52 - bob, -20, -46 - bob + flop); c.quadraticCurveTo(-8, -50 - bob, 0, -44 - bob);
  c.quadraticCurveTo(8, -58 - bob, 18, -50 - bob - flop); c.quadraticCurveTo(10, -48 - bob, 8, -40 - bob); c.closePath();
  c.fillStyle = '#e8414e'; c.fill(); outline(c);
  ell(c, -20, -46 - bob + flop, 3, 3, '#ffd23a'); ell(c, 18, -50 - bob - flop, 3, 3, '#ffd23a');
  // eyes + grin
  ell(c, 3, -37 - bob, 1.8, p.blink ? 0.4 : 2.4, '#2a1a4a');
  c.beginPath(); c.arc(3, -33 - bob, 3.2, 0.1, Math.PI - 0.6); c.lineWidth = 1.6; c.strokeStyle = '#2a1a4a'; c.stroke();
  c.restore();
}

export function drawEnemy(c, e, x, y, t) {
  c.save(); c.translate(x, y);
  if (!e.alive) { c.globalAlpha = Math.max(0, e.deadT / 0.4); c.scale(1.3, 0.3); }
  if (e.type === 'bug') {
    c.scale(e.vx < 0 ? -1 : 1, 1);
    const k = Math.sin(t * 14) * 3;
    c.strokeStyle = '#2a1a4a'; c.lineWidth = 2.5;
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 6, -5); c.lineTo(i * 6 + (i % 2 ? k : -k), 0); c.stroke(); }
    c.beginPath(); c.ellipse(0, -11, 14, 10, 0, Math.PI, 0); c.lineTo(14, -6); c.lineTo(-14, -6); c.closePath(); c.fillStyle = '#3cb85a'; c.fill(); outline(c);
    c.fillStyle = '#ffe066';
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 7 - 3, -15); c.lineTo(i * 7, -24); c.lineTo(i * 7 + 3, -15); c.fill(); }
    ell(c, 12, -10, 5, 5, '#3cb85a'); ell(c, 14, -11, 2, 2.4, '#fff'); ell(c, 14.6, -11, 1, 1.4, '#000');
  } else if (e.type === 'hopper') {
    const sq = e.onGround ? Math.max(0, Math.sin(e.t * 6)) * 0.12 : -0.1;
    c.scale(1 + sq, 1 - sq);
    c.beginPath(); c.rect(-6, -12, 12, 12); c.fillStyle = '#fff1d8'; c.fill(); outline(c);
    c.beginPath(); c.ellipse(0, -14, 15, 11, 0, Math.PI, 0); c.closePath(); c.fillStyle = '#e8414e'; c.fill(); outline(c);
    ell(c, -6, -19, 3, 2.4, '#fff'); ell(c, 5, -21, 2.4, 2, '#fff'); ell(c, 0, -15, 2, 1.5, '#fff');
    ell(c, -3, -6, 1.4, 2, '#2a1a4a'); ell(c, 3, -6, 1.4, 2, '#2a1a4a');
  } else if (e.type === 'wisp') {
    const fl = Math.sin(t * 20) * 6;
    c.globalAlpha *= 0.95;
    ell(c, -11, -12 - fl * 0.3, 9, 4 + fl * 0.2, 'rgba(200,240,255,.75)', -0.5);
    ell(c, 11, -12 - fl * 0.3, 9, 4 + fl * 0.2, 'rgba(200,240,255,.75)', 0.5);
    const g = c.createRadialGradient(0, -10, 1, 0, -10, 13); g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#9af0ff'); g.addColorStop(1, 'rgba(80,160,255,0)');
    ell(c, 0, -10, 13, 13, g);
    ell(c, -3, -11, 1.6, 2.4, '#20305a'); ell(c, 3, -11, 1.6, 2.4, '#20305a');
  } else if (e.type === 'boss') {
    c.scale(e.face, 1);
    if (e.hitT > 0 && Math.floor(e.hitT * 20) % 2) c.globalAlpha *= 0.4;
    const k = Math.sin(t * 8) * 4;
    c.strokeStyle = '#2a1a4a'; c.lineWidth = 5;
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 10, -10); c.lineTo(i * 10 + (i % 2 ? k : -k), 0); c.stroke(); }
    c.beginPath(); c.ellipse(0, -28, 34, 26, 0, Math.PI, 0); c.lineTo(34, -12); c.lineTo(-34, -12); c.closePath();
    c.fillStyle = e.hp > 1 ? '#5a3a9a' : '#a03a6a'; c.fill(); outline(c);
    c.fillStyle = '#ff8a3a';
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 12 - 5, -48 + Math.abs(i) * 5); c.lineTo(i * 12, -66 + Math.abs(i) * 6); c.lineTo(i * 12 + 5, -48 + Math.abs(i) * 5); c.fill(); }
    ell(c, 30, -24, 13, 12, '#5a3a9a'); ell(c, 34, -28, 4, 5, '#fff'); ell(c, 35, -28, 2, 3, '#e8414e');
    c.beginPath(); c.moveTo(40, -18); c.lineTo(50, -14); c.lineTo(40, -12); c.fillStyle = '#ffe066'; c.fill();
    // crown
    c.beginPath(); c.moveTo(22, -36); c.lineTo(24, -46); c.lineTo(28, -40); c.lineTo(32, -48); c.lineTo(35, -40); c.lineTo(39, -45); c.lineTo(38, -34); c.closePath(); c.fillStyle = '#ffd23a'; c.fill(); outline(c);
  }
  c.restore();
}

export function drawPortrait(canvas, who) {
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);
  const g = c.createRadialGradient(60, 60, 5, 60, 60, 60); g.addColorStop(0, 'rgba(255,240,180,.6)'); g.addColorStop(1, 'rgba(255,240,180,0)');
  c.fillStyle = g; c.fillRect(0, 0, 120, 120);
  c.save(); c.translate(60, 112); c.scale(1.9, 1.9);
  (who === 'wren' ? drawWren : drawBobble)(c, 0, 0, { t: 0.2, run: 0, air: 0, face: 1, squash: 0 });
  c.restore();
}
