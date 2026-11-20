// Low-poly models built from primitives (original designs). All flat-shaded.
import * as THREE from 'three';

const matCache = new Map();
export const psxShaders = [];
export const psx = { snap: 0 }; // 0 = off, otherwise grid resolution
export function patchPSX(m) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSnap = { value: psx.snap };
    psxShaders.push(sh);
    sh.vertexShader = 'uniform float uSnap;\n' + sh.vertexShader.replace('#include project_vertex', '#include project_vertex\n if (uSnap > 0.0) { gl_Position.xy = floor(gl_Position.xy / gl_Position.w * uSnap + 0.5) / uSnap * gl_Position.w; }');
  };
  return m;
}
export function setSnap(v) { psx.snap = v; for (const s of psxShaders) s.uniforms.uSnap.value = v; }
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    const m = opts.basic ? new THREE.MeshBasicMaterial({ color, transparent: !!opts.opacity, opacity: opts.opacity ?? 1, fog: opts.fog ?? true, side: opts.side ?? THREE.FrontSide })
      : new THREE.MeshLambertMaterial({ color, flatShading: true, emissive: opts.emissive ?? 0x000000, transparent: !!opts.opacity, opacity: opts.opacity ?? 1, side: opts.side ?? THREE.FrontSide });
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
  const scarf = pivot(body, 0, 0.94, -0.12);
  scarf.add(m(box(0.34, 0.08, 0.12), 0xff5a7a, 0, 0, 0.1));
  const tail = pivot(scarf, 0, 0, -0.05); tail.add(m(box(0.1, 0.06, 0.42), 0xff5a7a, 0, 0, -0.2));
  return { root, body, legL, legR, armL, armR, head, tail, kind: 'wren' };
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
  return { root, body, legL, legR, armL, armR, head, hatL, hatR, kind: 'bobble' };
}

export function animateHero(h, s) {
  // s: {t, run, air, glide, spin, pound, squash, attack, dance}
  const sw = Math.sin(s.t * 15) * s.run;
  h.legL.rotation.x = s.air ? -0.6 : sw * 0.9; h.legR.rotation.x = s.air ? 0.5 : -sw * 0.9;
  h.armL.rotation.x = s.air ? -2.4 : -sw * 0.8; h.armR.rotation.x = s.air ? -2.4 : sw * 0.8;
  h.armL.rotation.z = s.glide ? -1.4 : 0; h.armR.rotation.z = s.glide ? 1.4 : 0;
  if (s.attack) { h.armR.rotation.x = -1.6 - Math.sin(s.attack * 20) * 1.2; h.body.rotation.y = s.attack * 18; } else h.body.rotation.y = 0;
  const bob = s.run ? Math.abs(Math.sin(s.t * 15)) * 0.05 : Math.sin(s.t * 3) * 0.015;
  h.body.position.y = bob;
  h.body.scale.set(1 + s.squash * 0.25, 1 - s.squash * 0.25, 1 + s.squash * 0.25);
  h.body.rotation.x = s.spin ? -s.spin * 18 : s.pound ? s.t * 30 : 0;
  if (s.dance) { h.body.rotation.y = s.t * 8; h.armL.rotation.x = -2.6; h.armR.rotation.x = -2.6; }
  if (h.tail) { h.tail.rotation.y = Math.sin(s.t * 12) * 0.4; h.tail.rotation.x = -0.3 - s.run * 0.5 + (s.air ? 0.6 : 0); }
  if (h.hatL) { const f = Math.sin(s.t * 10) * (s.run ? 0.25 : 0.08); h.hatL.rotation.z = 0.9 + f; h.hatR.rotation.z = -0.9 - f; }
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
