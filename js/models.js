// Low-poly models built from primitives (original designs). All flat-shaded.
import * as THREE from 'three';

const matCache = new Map();
export const psxShaders = [];
export const psx = { snap: 0, dither: 1, time: 0 }; // snap 0 = off, otherwise grid resolution
const BAYER = `
float bayer2(vec2 a) { return mod(a.x * 2.0 + a.y * 3.0, 4.0); }
float bayer4(vec2 p) { return (4.0 * bayer2(mod(p, 2.0)) + bayer2(mod(floor(p * 0.5), 2.0))) / 16.0; }
`;
// PS1-style shader patch: vertex snapping, 15-bit colour with ordered dithering,
// optional wind sway (needs an aSway attribute).
export function patchPSX(m, sway = false) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSnap = { value: psx.snap }; sh.uniforms.uDither = { value: psx.dither }; sh.uniforms.uTime = { value: psx.time };
    psxShaders.push(sh);
    let vs = 'uniform float uSnap;\nuniform float uTime;\n' + (sway ? 'attribute float aSway;\n' : '') + sh.vertexShader;
    if (sway) vs = vs.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.x += sin(uTime * 1.9 + position.x * 0.45 + position.z * 0.3) * aSway * 0.16;\n transformed.z += cos(uTime * 1.5 + position.x * 0.3) * aSway * 0.1;');
    sh.vertexShader = vs.replace('#include <project_vertex>', '#include <project_vertex>\n if (uSnap > 0.0) { gl_Position.xy = floor(gl_Position.xy / gl_Position.w * uSnap + 0.5) / uSnap * gl_Position.w; }');
    sh.fragmentShader = 'uniform float uDither;\n' + BAYER + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n if (uDither > 0.5) { gl_FragColor.rgb = floor(gl_FragColor.rgb * 31.0 + bayer4(floor(gl_FragCoord.xy))) / 31.0; }');
  };
  m.customProgramCacheKey = () => (sway ? 'psx-sway' : 'psx');
  return m;
}
export function setSnap(v) { psx.snap = v; psx.dither = v > 0 ? 1 : 0; for (const s of psxShaders) { s.uniforms.uSnap.value = v; s.uniforms.uDither.value = psx.dither; } }
export function setTime(t) { psx.time = t; for (const s of psxShaders) s.uniforms.uTime.value = t; }
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    const m = opts.basic ? new THREE.MeshBasicMaterial({ color, transparent: !!opts.opacity, opacity: opts.opacity ?? 1, fog: opts.fog ?? true, side: opts.side ?? THREE.FrontSide })
      : new THREE.MeshLambertMaterial({ color, flatShading: !!opts.flat, emissive: opts.emissive ?? 0x000000, transparent: !!opts.opacity, opacity: opts.opacity ?? 1, side: opts.side ?? THREE.FrontSide });
    matCache.set(key, patchPSX(m));
  }
  return matCache.get(key);
}
function m(geo, color, x = 0, y = 0, z = 0, opts) { const o = new THREE.Mesh(geo, mat(color, opts)); o.position.set(x, y, z); return o; }
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const ico = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);
const cone = (r, h, s = 5) => new THREE.ConeGeometry(r, h, s);
const cyl = (a, b, h, s = 6) => new THREE.CylinderGeometry(a, b, h, s);
const sph = (r, w = 7, h = 5, ps = 0, pl = Math.PI * 2, ts = 0, tl = Math.PI) => new THREE.SphereGeometry(r, w, h, ps, pl, ts, tl);
function pivot(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

// Characters face +Z. Origin at the feet. Height ~1.35 units.
export function makeWren() {
  const root = new THREE.Group(), body = pivot(root, 0, 0, 0);
  const legL = pivot(body, -0.1, 0.45, 0), legR = pivot(body, 0.1, 0.45, 0);
  legL.add(m(box(0.13, 0.45, 0.13), 0x2a1a4a, 0, -0.22, 0)); legR.add(m(box(0.13, 0.45, 0.13), 0x2a1a4a, 0, -0.22, 0));
  legL.add(m(box(0.15, 0.08, 0.22), 0xff5a7a, 0, -0.44, 0.04)); legR.add(m(box(0.15, 0.08, 0.22), 0xff5a7a, 0, -0.44, 0.04));
  body.add(m(cyl(0.17, 0.24, 0.48, 6), 0x2cc9b0, 0, 0.68, 0));
  body.add(m(ico(0.06), 0xffe066, 0, 0.62, 0.22));
  const armL = pivot(body, -0.24, 0.88, 0), armR = pivot(body, 0.24, 0.88, 0);
  armL.add(m(box(0.09, 0.38, 0.09), 0xffd2b0, 0, -0.18, 0)); armR.add(m(box(0.09, 0.38, 0.09), 0xffd2b0, 0, -0.18, 0));
  const head = pivot(body, 0, 1.12, 0);
  head.add(m(ico(0.25, 1), 0xffd2b0));
  head.add(m(sph(0.27, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.5), 0xf08a2e, 0, 0.03, -0.03));
  const earL = m(cone(0.08, 0.26, 4), 0xf08a2e, -0.14, 0.27, -0.02); earL.rotation.z = 0.35; head.add(earL);
  const earR = m(cone(0.08, 0.26, 4), 0xf08a2e, 0.14, 0.27, -0.02); earR.rotation.z = -0.35; head.add(earR);
  head.add(m(box(0.06, 0.09, 0.03), 0x2a1a4a, -0.09, 0.0, 0.23)); head.add(m(box(0.06, 0.09, 0.03), 0x2a1a4a, 0.09, 0.0, 0.23));
  head.add(m(ico(0.04), 0xff9a7a, 0, -0.06, 0.25));
  // extra detail: eye whites, fringe, belt, hands, cuffs, knees
  const eyes = pivot(head, 0, 0, 0.215);
  eyes.add(m(box(0.09, 0.12, 0.02), 0xffffff, -0.09, 0.0, 0)); eyes.add(m(box(0.09, 0.12, 0.02), 0xffffff, 0.09, 0.0, 0));
  for (let i = -2; i <= 2; i++) { const f = m(cone(0.06, 0.16, 4), 0xf08a2e, i * 0.07, 0.17, 0.2); f.rotation.x = 1.9; head.add(f); }
  body.add(m(cyl(0.245, 0.245, 0.07, 8), 0x6a3a1a, 0, 0.5, 0)); body.add(m(box(0.08, 0.07, 0.03), 0xffe066, 0, 0.5, 0.24));
  armL.add(m(ico(0.075), 0xffd2b0, 0, -0.4, 0)); armR.add(m(ico(0.075), 0xffd2b0, 0, -0.4, 0));
  armL.add(m(cyl(0.065, 0.065, 0.08, 6), 0x2cc9b0, 0, -0.04, 0)); armR.add(m(cyl(0.065, 0.065, 0.08, 6), 0x2cc9b0, 0, -0.04, 0));
  legL.add(m(box(0.16, 0.06, 0.16), 0xff5a7a, 0, -0.36, 0)); legR.add(m(box(0.16, 0.06, 0.16), 0xff5a7a, 0, -0.36, 0));
  const scarf = pivot(body, 0, 0.94, -0.12);
  scarf.add(m(box(0.34, 0.08, 0.12), 0xff5a7a, 0, 0, 0.1));
  const tail = pivot(scarf, 0, 0, -0.05); tail.add(m(box(0.1, 0.06, 0.42), 0xff5a7a, 0, 0, -0.2));
  return { root, body, legL, legR, armL, armR, head, tail, eyes, kind: 'wren' };
}

export function makeBobble() {
  const root = new THREE.Group(), body = pivot(root, 0, 0, 0);
  const legL = pivot(body, -0.11, 0.38, 0), legR = pivot(body, 0.11, 0.38, 0);
  legL.add(m(box(0.13, 0.38, 0.13), 0x7a3cc8, 0, -0.18, 0)); legR.add(m(box(0.13, 0.38, 0.13), 0xffcc33, 0, -0.18, 0));
  legL.add(m(cone(0.08, 0.26, 4), 0x7a3cc8, 0, -0.36, 0.1).rotateX(Math.PI / 2)); legR.add(m(cone(0.08, 0.26, 4), 0xffcc33, 0, -0.36, 0.1).rotateX(Math.PI / 2));
  body.add(m(sph(0.33, 8, 6, 0, Math.PI), 0x9b5cf0, 0, 0.62, 0));
  body.add(m(sph(0.33, 8, 6, Math.PI, Math.PI), 0xffcc33, 0, 0.62, 0));
  const ruff = m(new THREE.TorusGeometry(0.2, 0.07, 4, 8), 0xffffff, 0, 0.93, 0); ruff.rotation.x = Math.PI / 2; body.add(ruff);
  const armL = pivot(body, -0.32, 0.8, 0), armR = pivot(body, 0.32, 0.8, 0);
  armL.add(m(box(0.09, 0.34, 0.09), 0xffcc33, 0, -0.16, 0)); armR.add(m(box(0.09, 0.34, 0.09), 0x9b5cf0, 0, -0.16, 0));
  const head = pivot(body, 0, 1.13, 0);
  head.add(m(ico(0.23, 1), 0xffe2c8));
  head.add(m(ico(0.06), 0xff4a6a, 0, -0.02, 0.23));
  head.add(m(box(0.05, 0.08, 0.03), 0x2a1a4a, -0.08, 0.05, 0.2)); head.add(m(box(0.05, 0.08, 0.03), 0x2a1a4a, 0.08, 0.05, 0.2));
  const hatL = pivot(head, -0.08, 0.16, 0), hatR = pivot(head, 0.08, 0.16, 0);
  const cl = m(cone(0.13, 0.5, 5), 0xe8414e, 0, 0.22, 0); hatL.add(cl); hatL.rotation.z = 0.9;
  const cr = m(cone(0.13, 0.5, 5), 0x9b5cf0, 0, 0.22, 0); hatR.add(cr); hatR.rotation.z = -0.9;
  hatL.add(m(ico(0.07), 0xffd23a, 0, 0.5, 0)); hatR.add(m(ico(0.07), 0xffd23a, 0, 0.5, 0));
  head.add(m(cyl(0.24, 0.24, 0.1, 8), 0xe8414e, 0, 0.13, 0));
  const eyes = pivot(head, 0, 0.05, 0.19);
  eyes.add(m(box(0.09, 0.12, 0.02), 0xffffff, -0.08, 0, 0)); eyes.add(m(box(0.09, 0.12, 0.02), 0xffffff, 0.08, 0, 0));
  head.add(m(box(0.16, 0.03, 0.03), 0x8a2a3a, 0, -0.1, 0.2));
  for (let i = 0; i < 6; i++) body.add(m(ico(0.05), i % 2 ? 0xffcc33 : 0x9b5cf0, Math.cos(i * 1.05) * 0.28, 0.96, Math.sin(i * 1.05) * 0.28));
  body.add(m(ico(0.05), 0xffd23a, 0, 0.72, 0.33)); body.add(m(ico(0.05), 0xffd23a, 0, 0.55, 0.33));
  armL.add(m(ico(0.08), 0xffffff, 0, -0.36, 0)); armR.add(m(ico(0.08), 0xffffff, 0, -0.36, 0));
  legL.add(m(ico(0.045), 0xffd23a, 0, -0.38, 0.24)); legR.add(m(ico(0.045), 0xffd23a, 0, -0.38, 0.24));
  return { root, body, legL, legR, armL, armR, head, hatL, hatR, eyes, kind: 'bobble' };
}

export function animateHero(h, s) {
  // s: {t, run, air, vy, glide, spin, pound, squash, attack, dash, dance}
  const ph = s.t * 14, sw = Math.sin(ph) * s.run;
  if (s.air) {
    // jump: tuck legs on the way up, reach down when falling
    const up = Math.max(-1, Math.min(1, -(s.vy || 0) / 600));
    h.legL.rotation.x = -0.4 - up * 0.6; h.legR.rotation.x = 0.3 + up * 0.3;
    h.armL.rotation.x = -1.2 - up * 1.4; h.armR.rotation.x = -1.2 - up * 1.4;
  } else {
    h.legL.rotation.x = sw * 1.0; h.legR.rotation.x = -sw * 1.0;
    h.armL.rotation.x = -sw * 0.9; h.armR.rotation.x = sw * 0.9;
  }
  h.armL.rotation.z = s.glide ? -1.4 : -0.12; h.armR.rotation.z = s.glide ? 1.4 : 0.12;
  // lean into the run
  h.body.rotation.x = s.run * 0.18;
  if (s.dash) { h.body.rotation.x = 0.55; h.armL.rotation.x = 1.0; h.armR.rotation.x = 1.0; h.legL.rotation.x = 0.8; h.legR.rotation.x = 0.5; }
  if (s.attack) { const k = s.attack / 0.3; h.armR.rotation.x = -1.6 - Math.sin(k * Math.PI) * 1.5; h.armL.rotation.x = -0.8; h.body.rotation.y = (1 - k) * Math.PI * 2; } else h.body.rotation.y = 0;
  const bob = s.run && !s.air ? Math.abs(Math.sin(ph)) * 0.07 : (s.air ? 0 : Math.sin(s.t * 3) * 0.015);
  h.body.position.y = bob;
  h.body.scale.set(1 + s.squash * 0.25, 1 - s.squash * 0.25, 1 + s.squash * 0.25);
  if (s.spin) h.body.rotation.x = -s.spin * 18; else if (s.pound) h.body.rotation.x = s.t * 30;
  if (s.dance) { h.body.rotation.y = s.t * 8; h.armL.rotation.x = -2.6; h.armR.rotation.x = -2.6; }
  h.head.rotation.z = s.run && !s.air ? Math.sin(ph) * 0.06 : 0;
  if (h.eyes) h.eyes.scale.y = (s.t % 3.1) < 0.12 ? 0.15 : 1; // blink
  if (h.tail) { h.tail.rotation.y = Math.sin(s.t * 12) * 0.4; h.tail.rotation.x = -0.3 - s.run * 0.5 + (s.air ? 0.6 : 0); }
  if (h.hatL) { const f = Math.sin(s.t * 10) * (s.run ? 0.25 : 0.08) + (s.air ? 0.25 : 0); h.hatL.rotation.z = 0.9 + f; h.hatR.rotation.z = -0.9 - f; }
}

// ---------- enemies ----------
export function makeEnemy(type, world) {
  const root = new THREE.Group(), g = pivot(root, 0, 0, 0);
  const parts = { root, g };
  if (type === 'bug') {
    g.add(m(sph(0.42, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0x3cb85a, 0, 0.18, 0));
    for (let i = -1; i <= 1; i++) g.add(m(cone(0.08, 0.3, 4), 0xffe066, 0, 0.6, i * 0.2));
    g.add(m(ico(0.18), 0x3cb85a, 0, 0.3, 0.42)); g.add(m(box(0.05, 0.08, 0.05), 0x111111, -0.08, 0.36, 0.56)); g.add(m(box(0.05, 0.08, 0.05), 0x111111, 0.08, 0.36, 0.56));
    parts.legs = [];
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const lg = pivot(g, s * 0.32, 0.18, -0.2 + i * 0.2); lg.add(m(box(0.05, 0.2, 0.05), 0x2a1a4a, 0, -0.1, 0)); parts.legs.push(lg); }
  } else if (type === 'crab') {
    g.add(m(box(0.7, 0.3, 0.5), 0x5a6aa8, 0, 0.25, 0));
    g.add(m(new THREE.OctahedronGeometry(0.4, 0), 0x8ff0ff, 0, 0.55, 0, { emissive: 0x204060 }));
    for (const s of [-1, 1]) { const c = pivot(g, s * 0.45, 0.3, 0.25); c.add(m(box(0.2, 0.15, 0.25), 0x8ff0ff, 0, 0, 0.1)); }
    g.add(m(box(0.06, 0.12, 0.06), 0x111111, -0.12, 0.42, 0.26)); g.add(m(box(0.06, 0.12, 0.06), 0x111111, 0.12, 0.42, 0.26));
  } else if (type === 'roller') {
    const ball = pivot(g, 0, 0.4, 0); parts.ball = ball;
    ball.add(m(ico(0.32, 0), 0x8a6a3a));
    const v = new THREE.Vector3();
    const pos = ico(0.32, 0).attributes.position;
    for (let i = 0; i < pos.count; i += 3) { v.fromBufferAttribute(pos, i).normalize(); const c = m(cone(0.07, 0.25, 4), 0xddddcc); c.position.copy(v.clone().multiplyScalar(0.36)); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v); ball.add(c); }
  } else if (type === 'hopper') {
    const sq = pivot(g, 0, 0, 0); parts.sq = sq;
    sq.add(m(cyl(0.16, 0.2, 0.4, 6), 0xfff1d8, 0, 0.2, 0));
    sq.add(m(sph(0.45, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), world === 1 ? 0x5a8ae8 : 0xe8414e, 0, 0.38, 0));
    for (const [x, z] of [[0.2, 0.2], [-0.25, 0.05], [0.05, -0.28], [0, 0.32]]) sq.add(m(ico(0.07), 0xffffff, x, 0.62, z));
    sq.add(m(box(0.05, 0.1, 0.05), 0x2a1a4a, -0.07, 0.25, 0.18)); sq.add(m(box(0.05, 0.1, 0.05), 0x2a1a4a, 0.07, 0.25, 0.18));
  } else if (type === 'wisp') {
    g.add(m(ico(0.28, 1), 0x9af0ff, 0, 0.35, 0, { emissive: 0x4ab0d0 }));
    g.add(m(ico(0.42, 1), 0xbff8ff, 0, 0.35, 0, { basic: true, opacity: 0.25 }));
    parts.wings = [];
    for (const s of [-1, 1]) { const w = pivot(g, s * 0.2, 0.4, -0.05); w.add(m(box(0.5, 0.02, 0.22), 0xddf8ff, s * 0.25, 0, 0, { basic: true, opacity: 0.7 })); parts.wings.push(w); }
  } else if (type === 'bat') {
    g.add(m(ico(0.22, 0), 0x6a4aa8, 0, 0.3, 0));
    g.add(m(cone(0.06, 0.15, 3), 0x6a4aa8, -0.1, 0.52, 0)); g.add(m(cone(0.06, 0.15, 3), 0x6a4aa8, 0.1, 0.52, 0));
    g.add(m(box(0.05, 0.05, 0.03), 0xffe066, -0.07, 0.33, 0.2, { emissive: 0xaa8800 })); g.add(m(box(0.05, 0.05, 0.03), 0xffe066, 0.07, 0.33, 0.2, { emissive: 0xaa8800 }));
    parts.wings = [];
    for (const s of [-1, 1]) { const w = pivot(g, s * 0.18, 0.32, 0); w.add(m(box(0.55, 0.03, 0.3), 0x3a2a6a, s * 0.28, 0, 0)); parts.wings.push(w); }
  }
  return parts;
}

export function makeBoss(kind) {
  const root = new THREE.Group(), g = pivot(root, 0, 0, 0), parts = { root, g };
  if (kind === 'bramble') {
    g.add(m(sph(1.15, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0x5a3a9a, 0, 0.35, 0));
    for (let i = -2; i <= 2; i++) g.add(m(cone(0.18, 0.7, 4), 0xff8a3a, 0, 1.5 - Math.abs(i) * 0.15, i * 0.35));
    g.add(m(ico(0.45, 0), 0x5a3a9a, 0, 0.8, 1.1));
    g.add(m(box(0.12, 0.18, 0.08), 0xffffff, -0.18, 0.95, 1.5)); g.add(m(box(0.12, 0.18, 0.08), 0xffffff, 0.18, 0.95, 1.5));
    for (let i = 0; i < 5; i++) { const c = m(cone(0.07, 0.3, 4), 0xffd23a, Math.cos(i * 1.256) * 0.25, 1.35, 1.0 + Math.sin(i * 1.256) * 0.25); g.add(c); }
    parts.legs = [];
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const lg = pivot(g, s * 0.9, 0.4, -0.5 + i * 0.5); lg.add(m(box(0.12, 0.45, 0.12), 0x2a1a4a, 0, -0.2, 0)); parts.legs.push(lg); }
  } else if (kind === 'frost') {
    g.add(m(box(1.3, 0.9, 1.0), 0x8fc8f0, 0, 0.9, 0));
    g.add(m(box(0.9, 0.6, 0.8), 0xbfe8ff, 0, 1.65, 0));
    g.add(m(new THREE.OctahedronGeometry(0.35, 0), 0x8ff0ff, 0, 2.2, 0, { emissive: 0x2a6080 }));
    g.add(m(box(0.15, 0.12, 0.05), 0x2040a0, -0.2, 1.7, 0.42, { emissive: 0x2050ff })); g.add(m(box(0.15, 0.12, 0.05), 0x2040a0, 0.2, 1.7, 0.42, { emissive: 0x2050ff }));
    parts.legs = [];
    for (const s of [-1, 1]) { const lg = pivot(g, s * 0.4, 0.45, 0); lg.add(m(box(0.35, 0.45, 0.4), 0x6a98c8, 0, -0.22, 0)); parts.legs.push(lg); }
    for (const s of [-1, 1]) { const a = pivot(g, s * 0.85, 1.2, 0); a.add(m(box(0.3, 0.8, 0.3), 0x8fc8f0, 0, -0.35, 0)); parts.legs.push(a); }
  } else {
    g.add(m(ico(0.6, 0), 0x2a2a5a, 0, 0.7, 0));
    const beak = m(cone(0.18, 0.5, 4), 0xffb030, 0, 0.8, 0.7); beak.rotation.x = Math.PI / 2; g.add(beak);
    g.add(m(box(0.1, 0.1, 0.05), 0xff3030, -0.2, 0.95, 0.5, { emissive: 0x801010 })); g.add(m(box(0.1, 0.1, 0.05), 0xff3030, 0.2, 0.95, 0.5, { emissive: 0x801010 }));
    for (let i = 0; i < 5; i++) g.add(m(cone(0.06, 0.3, 4), 0xffd23a, Math.cos(i * 1.256) * 0.22, 1.35, 0.1 + Math.sin(i * 1.256) * 0.22));
    const tl = m(cone(0.25, 0.7, 4), 0x2a2a5a, 0, 0.7, -0.7); tl.rotation.x = -Math.PI / 2; g.add(tl);
    parts.wings = [];
    for (const s of [-1, 1]) { const w = pivot(g, s * 0.5, 0.8, 0); w.add(m(box(1.3, 0.06, 0.6), 0x3a3a7a, s * 0.65, 0, 0)); parts.wings.push(w); }
  }
  return parts;
}

// ---------- pickups / props ----------
export function makeCoin() { const g = new THREE.Group(); const c = m(cyl(0.22, 0.22, 0.06, 10), 0xf5c400, 0, 0, 0, { emissive: 0x403000 }); c.rotation.x = Math.PI / 2; g.add(c); return g; }
export function makeGem() { const g = new THREE.Group(); g.add(m(new THREE.OctahedronGeometry(0.32, 0), 0xb07cff, 0, 0, 0, { emissive: 0x4a2a90 })); g.add(m(ico(0.5, 1), 0xd5b4ff, 0, 0, 0, { basic: true, opacity: 0.2 })); return g; }
export function makeHeart() {
  const s = new THREE.Shape(); s.moveTo(0, -0.25); s.bezierCurveTo(-0.35, 0, -0.25, 0.3, 0, 0.12); s.bezierCurveTo(0.25, 0.3, 0.35, 0, 0, -0.25);
  const g = new THREE.Group(); g.add(m(new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false, curveSegments: 4 }), 0xff4a6a, 0, 0, -0.05, { emissive: 0x501020 })); return g;
}
export function makeLife() {
  const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.13 : 0.32, a = i * Math.PI / 5 + Math.PI / 2; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const g = new THREE.Group(); g.add(m(new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false }), 0x4ae0a0, 0, 0, -0.05, { emissive: 0x105030 })); return g;
}
export { m as meshOf, box, ico, cone, cyl, sph };
