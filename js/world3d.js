// 3D renderer: maps the 2D simulation onto a winding CatmullRom spline and
// draws low-poly scenery, characters and effects with a PS1-like look.
import * as THREE from 'three';
import { T, ROWS } from './levels.js';
import { makeWren, makeBobble, animateHero, makeEnemy, makeBoss, makeCoin, makeGem, makeHeart, makeLife, mat, patchPSX, setSnap, meshOf, box, ico, cone, cyl } from './models.js';

const UP = new THREE.Vector3(0, 1, 0);
const D = 1.0;          // half width of the path
const STEP = 0.25;      // LUT resolution in units
const QUALITY = { low: { h: 240, decor: 0.45, snap: 120 }, medium: { h: 360, decor: 0.75, snap: 180 }, high: { h: 600, decor: 1, snap: 0 } };

function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export class World3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x6fc8ff);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, 16 / 9, 0.3, 260);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x6a5a8a, 1.6); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.6); this.sun.position.set(0.4, 1, 0.6); this.scene.add(this.sun);
    this.level = new THREE.Group(); this.scene.add(this.level);
    this.quality = 'medium'; this.psxOn = true;
    this.tmpV = new THREE.Vector3(); this.tmpQ = new THREE.Quaternion(); this.tmpM = new THREE.Matrix4();
    this.camU = 0; this.camH = 3; this.parts = [];
    this.texNoise = this.makeNoiseTex(); this.texCrate = this.makeCrateTex();
    this.resize();
  }

  setQuality(q, psxOn) {
    this.quality = QUALITY[q] ? q : 'medium'; this.psxOn = psxOn;
    setSnap(psxOn ? (QUALITY[this.quality].snap || 240) : 0);
    this.resize();
  }

  resize() {
    const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight);
    const target = Math.min(QUALITY[this.quality].h, h * Math.min(2, devicePixelRatio || 1));
    this.renderer.setPixelRatio(target / h);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  makeNoiseTex() {
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
    for (let i = 0; i < 32; i++) for (let j = 0; j < 32; j++) { const v = 200 + Math.floor(Math.random() * 55); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(i, j, 1, 1); }
    x.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 6; i++) x.fillRect(Math.random() * 32, Math.random() * 32, 4, 3);
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  makeCrateTex() {
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
    x.fillStyle = '#d89a4a'; x.fillRect(0, 0, 32, 32); x.fillStyle = '#a86a2a'; x.fillRect(0, 0, 32, 3); x.fillRect(0, 29, 32, 3); x.fillRect(0, 0, 3, 32); x.fillRect(29, 0, 3, 32);
    x.strokeStyle = '#8a5020'; x.lineWidth = 3; x.beginPath(); x.moveTo(3, 3); x.lineTo(29, 29); x.moveTo(29, 3); x.lineTo(3, 29); x.stroke();
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  // ---------- path ----------
  buildPath(len, seed) {
    const r = rng(seed * 7919 + 13);
    const pts = []; let x = 0, z = 0, y = 0, a = 0, va = 0;
    const n = Math.ceil((len + 60) / 9) + 2;
    for (let i = 0; i < n; i++) {
      pts.push(new THREE.Vector3(x, y, z));
      va = va * 0.6 + (r() - 0.5) * 0.5; va = Math.max(-0.32, Math.min(0.32, va));
      if (i > 2) a += va;
      x += Math.cos(a) * 9; z += Math.sin(a) * 9;
      if (i > 3) y = Math.max(-5, Math.min(7, y + (r() - 0.5) * 2.6));
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const total = curve.getLength();
    const count = Math.ceil(total / STEP);
    const sp = curve.getSpacedPoints(count);
    const P = new Float32Array((count + 1) * 3), Tg = new Float32Array((count + 1) * 3), N = new Float32Array((count + 1) * 3);
    for (let i = 0; i <= count; i++) {
      const p = sp[i], q = sp[Math.min(count, i + 1)], o = sp[Math.max(0, i - 1)];
      P[i * 3] = p.x; P[i * 3 + 1] = p.y; P[i * 3 + 2] = p.z;
      const t = new THREE.Vector3().subVectors(q, o).normalize();
      Tg[i * 3] = t.x; Tg[i * 3 + 1] = t.y; Tg[i * 3 + 2] = t.z;
      const nn = new THREE.Vector3(-t.z, 0, t.x).normalize(); // horizontal side normal (camera side)
      N[i * 3] = nn.x; N[i * 3 + 1] = 0; N[i * 3 + 2] = nn.z;
    }
    this.path = { P, Tg, N, count, total };
    // smoothed elevation profile so the ground slopes gently
  }

  frame(u, out) { // out: {p, t, n}
    const f = Math.max(0, Math.min(this.path.count - 1.0001, u / STEP)), i = Math.floor(f), k = f - i;
    const { P, Tg, N } = this.path, a = i * 3, b = a + 3;
    out.p.set(P[a] + (P[b] - P[a]) * k, P[a + 1] + (P[b + 1] - P[a + 1]) * k, P[a + 2] + (P[b + 2] - P[a + 2]) * k);
    out.t.set(Tg[a] + (Tg[b] - Tg[a]) * k, Tg[a + 1] + (Tg[b + 1] - Tg[a + 1]) * k, Tg[a + 2] + (Tg[b + 2] - Tg[a + 2]) * k).normalize();
    out.n.set(N[a] + (N[b] - N[a]) * k, 0, N[a + 2] + (N[b + 2] - N[a + 2]) * k).normalize();
    return out;
  }
  // physics (px, py) + depth z -> world position
  map(px, py, z = 0, out = new THREE.Vector3()) {
    const f = this._f || (this._f = { p: new THREE.Vector3(), t: new THREE.Vector3(), n: new THREE.Vector3() });
    this.frame(px / T + 4, f);
    return out.copy(f.p).addScaledVector(UP, (300 - py) / T).addScaledVector(f.n, z);
  }
  orient(obj, px, face = 1, upright = true) {
    const f = this._f2 || (this._f2 = { p: new THREE.Vector3(), t: new THREE.Vector3(), n: new THREE.Vector3() });
    this.frame(px / T + 4, f);
    const t = upright ? this.tmpV.set(f.t.x, 0, f.t.z).normalize() : this.tmpV.copy(f.t);
    if (face < 0) t.negate();
    const zAxis = t, xAxis = new THREE.Vector3().crossVectors(UP, zAxis).normalize(), yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis);
    this.tmpM.makeBasis(xAxis, yAxis, zAxis); obj.quaternion.setFromRotationMatrix(this.tmpM);
  }

  // ---------- level build ----------
  clear() {
    this.level.traverse((o) => { if (o.geometry && o.userData.own) o.geometry.dispose(); });
    this.scene.remove(this.level); this.level = new THREE.Group(); this.scene.add(this.level);
  }

  build(game) {
    this.clear();
    this.g = game; const w = game.world;
    this.buildPath(game.W + 10, game.levelIndex + 1);
    const fogCol = new THREE.Color(w.fog);
    this.scene.fog = new THREE.Fog(fogCol, 22, w.cave ? 70 : 110);
    this.renderer.setClearColor(fogCol);
    this.hemi.color.set(w.cave ? 0xbfd8ff : 0xffffff); this.hemi.groundColor.set(w.cave ? 0x303060 : 0x6a5a8a);
    this.hemi.intensity = w.cave ? 1.3 : 1.6;
    this.makeSky(w);
    this.buildTerrain(game);
    this.buildStatic(game);
    this.buildScenery(game);
    this.buildDynamic(game);
    this.makeParticles();
    this.camU = game.p.x / T + 4; this.camH = 3; this.snapCam = true;
  }

  makeSky(w) {
    const geo = new THREE.SphereGeometry(200, 16, 10), col = [], top = new THREE.Color(w.sky[0]), bot = new THREE.Color(w.sky[1]);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const k = Math.max(0, Math.min(1, (pos.getY(i) + 40) / 200)); const c = bot.clone().lerp(top, k); col.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    this.sky = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.sky.geometry.userData = {}; this.sky.userData.own = true; this.sky.renderOrder = -1;
    this.level.add(this.sky);
    if (!w.cave) {
      const sun = new THREE.Mesh(new THREE.CircleGeometry(12, 10), new THREE.MeshBasicMaterial({ color: w.sky3 ? 0xfff4d0 : 0xfffbe0, fog: false }));
      sun.userData.own = true; this.sunDisc = sun; this.level.add(sun);
    } else this.sunDisc = null;
  }

  buildTerrain(game) {
    const w = game.world, pos = [], col = [], uv = [];
    const cGrass = new THREE.Color(w.grass), cDirt = new THREE.Color(w.dirt), cDirt2 = new THREE.Color(w.dirt2), cIce = new THREE.Color(0xd8f4ff);
    const fa = { p: new THREE.Vector3(), t: new THREE.Vector3(), n: new THREE.Vector3() }, fb = { p: new THREE.Vector3(), t: new THREE.Vector3(), n: new THREE.Vector3() };
    const P = (f, h, z) => [f.p.x + f.n.x * z, f.p.y + h, f.p.z + f.n.z * z];
    const quad = (a, b, c, d, ca, cb, uvs) => { // a b c d counter-clockwise
      pos.push(...a, ...b, ...c, ...a, ...c, ...d);
      col.push(ca.r, ca.g, ca.b, ca.r, ca.g, ca.b, cb.r, cb.g, cb.b, ca.r, ca.g, ca.b, cb.r, cb.g, cb.b, cb.r, cb.g, cb.b);
      uv.push(uvs[0], uvs[1], uvs[2], uvs[3], uvs[4], uvs[5], uvs[0], uvs[1], uvs[4], uvs[5], uvs[6], uvs[7]);
    };
    const isS = (cx, cy) => { const t = game.tile(cx, cy); return t === 1 || t === 5; };
    const deep = w.sky3 ? -3 : -9;
    for (let cx = 0; cx < game.W; cx++) {
      this.frame(cx + 4, fa); this.frame(cx + 5, fb);
      let cy = 0;
      while (cy < ROWS) {
        if (!isS(cx, cy)) { cy++; continue; }
        const r0 = cy; while (cy + 1 < ROWS && isS(cx, cy + 1)) cy++; const r1 = cy; cy++;
        const hT = 10 - r0, hB = r1 === ROWS - 1 ? deep : 10 - (r1 + 1);
        const ice = game.tile(cx, r0) === 5;
        const top = ice ? cIce : cGrass, side = cDirt, side2 = r1 === ROWS - 1 ? cDirt2 : cDirt;
        if (!isS(cx, r0 - 1)) {
          quad(P(fa, hT, D), P(fb, hT, D), P(fb, hT, -D), P(fa, hT, -D), top, top, [cx, 0, cx + 1, 0, cx + 1, 1, cx, 1]);
          const lip = ice ? cIce : cGrass.clone().multiplyScalar(0.85);
          quad(P(fa, hT - 0.22, D + 0.02), P(fb, hT - 0.22, D + 0.02), P(fb, hT, D + 0.02), P(fa, hT, D + 0.02), lip, lip, [cx, 0, cx + 1, 0, cx + 1, 0.2, cx, 0.2]);
        }
        // front (camera side) and back
        quad(P(fa, hB, D), P(fb, hB, D), P(fb, hT, D), P(fa, hT, D), side2, side, [cx, hB, cx + 1, hB, cx + 1, hT, cx, hT]);
        quad(P(fb, hB, -D), P(fa, hB, -D), P(fa, hT, -D), P(fb, hT, -D), side2, side, [cx, hB, cx + 1, hB, cx + 1, hT, cx, hT]);
        // ends
        for (let r = r0; r <= r1; r++) {
          const a = 10 - r, b = r === ROWS - 1 ? deep : 9 - r, sd = side.clone().multiplyScalar(0.8);
          if (!isS(cx - 1, r)) quad(P(fa, b, -D), P(fa, b, D), P(fa, a, D), P(fa, a, -D), sd, sd, [0, b, 1, b, 1, a, 0, a]);
          if (!isS(cx + 1, r)) quad(P(fb, b, D), P(fb, b, -D), P(fb, a, -D), P(fb, a, D), sd, sd, [0, b, 1, b, 1, a, 0, a]);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    const m = patchPSX(new THREE.MeshLambertMaterial({ vertexColors: true, map: this.texNoise, flatShading: true }));
    const mesh = new THREE.Mesh(geo, m); mesh.userData.own = true; this.level.add(mesh);
  }

  // merged static geometry helper: list of [geometry, color, matrix]
  merge(list) {
    const pos = [], col = [], nor = [];
    const c = new THREE.Color(), nm = new THREE.Matrix3();
    for (const [g0, color, mtx] of list) {
      const g = g0.index ? g0.toNonIndexed() : g0.clone(); g.applyMatrix4(mtx); g.computeVertexNormals();
      c.set(color);
      const p = g.attributes.position, n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(c.r, c.g, c.b); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return geo;
  }
  placeMatrix(px, py, z = 0, scale = 1, yaw = 0, upright = false) {
    const o = new THREE.Object3D(); this.map(px, py, z, o.position); this.orient(o, px, 1, upright);
    if (yaw) o.rotateY(yaw); o.scale.setScalar(scale); o.updateMatrix(); return o.matrix.clone();
  }

  buildStatic(game) {
    const w = game.world, list = [];
    const plankG = box(0.98, 0.22, 1.7), spikeG = cone(0.13, 0.45, 4), cloudG = ico(0.5, 0);
    for (let cx = 0; cx < game.W; cx++) for (let cy = 0; cy < ROWS; cy++) {
      const t = game.tile(cx, cy), x = cx * T + 15, y = cy * T;
      if (t === 2) { const m = this.placeMatrix(x, y + 3.3); list.push([plankG, w.plank, m]); }
      else if (t === 3) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) list.push([spikeG, j === 1 ? 0xe0e0f0 : 0xb0b0d0, this.placeMatrix(cx * T + 5 + i * 10, y + T - 6.5, -0.6 + j * 0.6)]);
      else if (t === 6) for (let i = 0; i < 3; i++) { const m = this.placeMatrix(cx * T + 8 + i * 7, y + 10, -0.5 + i * 0.5, 0.9 + (i % 2) * 0.3); list.push([cloudG, 0xffffff, m]); }
    }
    if (list.length) { const mesh = new THREE.Mesh(this.merge(list), patchPSX(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }))); mesh.userData.own = true; this.level.add(mesh); }
    // crates are separate so they can break
    this.crates = new Map();
    const crateM = patchPSX(new THREE.MeshLambertMaterial({ map: this.texCrate })), crateG = box(0.95, 0.95, 0.95);
    for (let cx = 0; cx < game.W; cx++) for (let cy = 0; cy < ROWS; cy++) if (game.tile(cx, cy) === 4) {
      const c = new THREE.Mesh(crateG, crateM); this.map(cx * T + 15, cy * T + 15, 0, c.position); this.orient(c, cx * T + 15, 1, false);
      this.level.add(c); this.crates.set(cy * game.W + cx, c);
    }
    // springs, checkpoints, goal
    for (const s of game.springs) {
      const g = new THREE.Group(); g.add(meshOf(cyl(0.3, 0.35, 0.12, 8), 0x888899, 0, 0.06, 0)); const top = meshOf(cyl(0.34, 0.34, 0.12, 8), 0xff5a7a, 0, 0.3, 0); g.add(top);
      g.add(meshOf(cyl(0.12, 0.12, 0.25, 6), 0xdddddd, 0, 0.18, 0));
      this.map(s.x + 12, s.y + 12, 0, g.position); this.orient(g, s.x + 12); s.mesh = g; s.top = top; this.level.add(g);
    }
    for (const c of game.checks) {
      const g = new THREE.Group(); g.add(meshOf(cyl(0.06, 0.08, 1.9, 5), 0x5a3a2a, 0, 0.95, 0)); g.add(meshOf(box(0.4, 0.06, 0.06), 0x5a3a2a, 0.18, 1.88, 0));
      const lamp = meshOf(box(0.24, 0.32, 0.24), 0x6a6a8a, 0.36, 1.66, 0); g.add(lamp);
      this.map(c.x, c.y, -0.6, g.position); this.orient(g, c.x); c.mesh = g; c.lamp = lamp; this.level.add(g);
    }
    if (game.goal) {
      const g = new THREE.Group(), gl = game.goal;
      const ring = meshOf(new THREE.TorusGeometry(1.0, 0.16, 5, 14), 0x7a4a22, 0, 1.25, 0); g.add(ring);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.9, 14), mat(0x8ff0c8, { basic: true, opacity: 0.75, side: THREE.DoubleSide })); disc.position.y = 1.25; g.add(disc);
      for (let i = 0; i < 6; i++) { const l = meshOf(box(0.2, 0.08, 0.12), i % 2 ? 0x6fd35a : 0xff9a3a, Math.cos(i) * 1.1, 1.25 + Math.sin(i) * 1.1, 0); g.add(l); }
      this.map(gl.x + gl.w / 2, gl.y + gl.h, 0, g.position); this.orient(g, gl.x + gl.w / 2); g.rotateY(Math.PI / 2);
      this.goalMesh = g; this.goalDisc = disc; this.level.add(g);
    }
  }

  buildScenery(game) {
    const w = game.world, r = rng(game.levelIndex * 31 + 7), q = QUALITY[this.quality].decor;
    const kinds = {
      tree: () => [[cyl(0.18, 0.25, 1.6, 5), 0x6a4a3a, 0, 0.8, 0], [ico(1.0, 0), w.grass === 0x6fd35a ? 0x4fa65a : 0x5a8a5a, 0, 2.2, 0], [ico(0.7, 0), 0x6fc35a, 0.5, 1.8, 0.3]],
      pine: () => [[cyl(0.15, 0.2, 1, 5), 0x6a4a3a, 0, 0.5, 0], [cone(0.9, 1.6, 6), 0x2f7a4a, 0, 1.6, 0], [cone(0.65, 1.2, 6), 0x3f9a5a, 0, 2.4, 0]],
      flower: () => [[cyl(0.03, 0.03, 0.5, 3), 0x3a8a3a, 0, 0.25, 0], [ico(0.13, 0), [0xff7a9a, 0xffe066, 0x9fd0ff, 0xd5b4ff][Math.floor(r() * 4)], 0, 0.55, 0]],
      shroom: () => [[cyl(0.15, 0.2, 0.6, 5), 0xfff1d8, 0, 0.3, 0], [cone(0.55, 0.45, 7), r() < 0.5 ? 0xe8414e : 0x9b5cf0, 0, 0.75, 0]],
      bush: () => [[ico(0.5, 0), 0x5ab84a, 0, 0.35, 0], [ico(0.4, 0), 0x6fd35a, 0.45, 0.3, 0.1]],
      lantern: () => [[cyl(0.05, 0.06, 1.4, 4), 0x3a2a2a, 0, 0.7, 0], [box(0.25, 0.3, 0.25), 0xffe066, 0, 1.5, 0]],
      crystal: () => [[new THREE.OctahedronGeometry(0.5, 0), 0x8ff0ff, 0, 0.8, 0, 1, 2.2], [new THREE.OctahedronGeometry(0.35, 0), 0xd5b4ff, 0.45, 0.5, 0.1, 1, 1.8]],
      icepine: () => [[cyl(0.12, 0.16, 0.8, 5), 0x6a7aa8, 0, 0.4, 0], [cone(0.8, 1.5, 6), 0xbfe8ff, 0, 1.4, 0], [cone(0.55, 1.1, 6), 0xffffff, 0, 2.2, 0]],
      stalag: () => [[cone(0.5, 2.5, 5), 0x6a7ac8, 0, 9, 0, 1, 1, Math.PI]],
      rock: () => [[new THREE.DodecahedronGeometry(0.6, 0), 0x6a78a8, 0, 0.3, 0]],
      tower: () => [[cyl(0.9, 1.0, 5, 8), 0xf0e8ff, 0, 2.5, 0], [cone(1.2, 2, 8), 0xe85a9a, 0, 6, 0], [box(0.3, 0.5, 0.1), 0x4a3a8a, 0, 3.5, 0.95]],
      cloudpuff: () => [[ico(1.2, 1), 0xffffff, 0, -2.5, 0], [ico(0.9, 1), 0xfff4fa, 1.2, -2.8, 0.3], [ico(0.8, 1), 0xffffff, -1.1, -2.9, -0.2]],
      banner: () => [[cyl(0.05, 0.05, 2.4, 4), 0x8a6a4a, 0, 1.2, 0], [box(0.04, 0.8, 0.6), 0xe8414e, 0, 1.9, 0.3]],
    };
    const lists = {};
    const add = (kind, px, z, s, yaw, hOff = 0) => {
      const parts = kinds[kind]();
      const base = new THREE.Object3D(); this.map(px, 300 - hOff * T, z, base.position); base.rotation.y = yaw; base.scale.setScalar(s); base.updateMatrix();
      for (const [g, c, x, y, zz, sx = 1, sy = 1, rx = 0] of parts) {
        const lm = new THREE.Matrix4().compose(new THREE.Vector3(x, y, zz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)), new THREE.Vector3(sx, sy, sx));
        (lists[c] = lists[c] || []).push([g, c, base.matrix.clone().multiply(lm)]);
      }
    };
    // avoid placing scenery on top of the path itself
    const samples = []; for (let u = 0; u < this.path.total; u += 2) { const f = this.frame(u, { p: new THREE.Vector3(), t: new THREE.Vector3(), n: new THREE.Vector3() }); samples.push(f.p.clone()); }
    const clear = (v, rad) => { for (const s of samples) { const dx = s.x - v.x, dz = s.z - v.z; if (dx * dx + dz * dz < rad * rad) return false; } return true; };
    const v = new THREE.Vector3();
    for (let px = -120; px < game.pxW + 300; px += 30) {
      const n = (w.sky3 ? 2 : 3) * q;
      for (let k = 0; k < n; k++) {
        if (r() > 0.75) continue;
        const kind = w.decor[Math.floor(r() * w.decor.length)];
        const z = -(2.2 + r() * 26); const pxj = px + r() * 30;
        this.map(pxj, 300, z, v); if (!clear(v, 2)) continue;
        // ground level for scenery: follow the path height loosely
        let h = 0; if (w.sky3 && kind !== 'cloudpuff') h = -3 - r() * 3; if (kind === 'stalag') h = r() * 2;
        add(kind, pxj, z, 0.7 + r() * 0.8, r() * 6.28, h);
      }
      if (r() < 0.25 * q && !w.sky3) { const kind = w.cave ? 'crystal' : 'flower'; this.map(px, 300, 2.2 + r() * 2, v); if (clear(v, 1.8)) add(kind, px, 2.2 + r() * 1.5, w.cave ? 0.3 : 0.6, r() * 6, 0); }
    }
    // far silhouettes for depth
    const farG = w.sky3 ? ico(1, 1) : cone(1, 1, 6);
    for (let px = -200; px < game.pxW + 600; px += 160) {
      const z = -(45 + r() * 50); this.map(px, 300, z, v); if (!clear(v, 30)) continue;
      const s = 8 + r() * 14, base = new THREE.Object3D(); base.position.copy(v); base.position.y += w.sky3 ? -14 : -2;
      base.scale.set(s * (w.sky3 ? 1.6 : 1), s * (w.sky3 ? 0.6 : 1.4), s); base.updateMatrix();
      (lists['far'] = lists['far'] || []).push([farG, w.far, base.matrix.clone()]);
    }
    const all = Object.values(lists).flat();
    if (all.length) { const mesh = new THREE.Mesh(this.merge(all), patchPSX(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }))); mesh.userData.own = true; this.level.add(mesh); }
    // shared ground plane far below for cave/forest depth
    if (!w.sky3) {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mat(new THREE.Color(w.far).multiplyScalar(0.55).getHex(), {})); pl.rotation.x = -Math.PI / 2; pl.position.y = -8; pl.userData.own = true;
      const c = this.map(game.pxW / 2, 300); pl.position.x = c.x; pl.position.z = c.z; this.level.add(pl);
    }
  }

  buildDynamic(game) {
    this.heroes = { wren: makeWren(), bobble: makeBobble() };
    for (const h of Object.values(this.heroes)) { h.root.visible = false; this.level.add(h.root); }
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.35, 10), mat(0x000000, { basic: true, opacity: 0.3 })); this.shadow.rotation.x = -Math.PI / 2; this.level.add(this.shadow);
    for (const e of game.ents) { e.model = e.type === 'boss' ? makeBoss(e.kind) : makeEnemy(e.type, game.def.world); this.level.add(e.model.root); }
    const makers = { coin: makeCoin, gem: makeGem, heart: makeHeart, life: makeLife };
    this.makers = makers;
    for (const k of game.coins) { k.mesh = makers[k.kind](); this.level.add(k.mesh); }
    for (const pl of game.plats) {
      const wdt = pl.w / T;
      pl.mesh = meshOf(box(wdt * 0.98, 0.3, 1.6), pl.kind === 'move' ? 0x8ff0c8 : 0xe8c890);
      this.level.add(pl.mesh);
    }
    this.shotMeshes = [];
  }

  makeParticles() {
    const N = 700; this.pN = N;
    const geo = new THREE.BufferGeometry();
    this.pPos = new Float32Array(N * 3); this.pCol = new Float32Array(N * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, sizeAttenuation: true }));
    this.points.frustumCulled = false; this.points.userData.own = true; this.level.add(this.points);
    this.parts = [];
  }
  spawn(x, y, vx, vy, life, col, z = 0) { if (this.parts.length < this.pN) this.parts.push({ x, y, z, vx, vy, vz: (Math.random() - 0.5) * 60, life, max: life, c: new THREE.Color(col) }); }

  // ---------- per-frame ----------
  update(game, dt) {
    if (!this.path) return;
    const g = game;
    // events from the simulation
    for (const ev of g.events) {
      if (ev.type === 'burst') for (let i = 0; i < ev.n; i++) { const a = Math.random() * 6.283, s = ev.sp * (0.3 + Math.random() * 0.7); this.spawn(ev.x, ev.y, Math.cos(a) * s, Math.sin(a) * s, 0.4 + Math.random() * 0.4, ev.col); }
      else if (ev.type === 'dust') for (let i = 0; i < ev.n; i++) this.spawn(ev.x + (Math.random() - 0.5) * 16, ev.y, (Math.random() - 0.5) * 180, -Math.random() * 70, 0.4, 0xffffff);
      else if (ev.type === 'trail') this.spawn(ev.x, ev.y, 0, 0, 0.3, 0xbbffff);
      else if (ev.type === 'crate') {
        const c = this.crates.get(ev.cy * g.W + ev.cx); if (c) c.visible = false;
        for (let i = 0; i < 12; i++) this.spawn(ev.x, ev.y, (Math.random() - 0.5) * 320, -Math.random() * 300, 0.7, i % 2 ? 0xc8873a : 0x8a5a2a);
      }
    }
    g.events.length = 0;
    const p = g.p;
    // hero
    for (const [id, h] of Object.entries(this.heroes)) h.root.visible = id === g.charId && !(p.inv > 0 && Math.floor(p.inv * 15) % 2 && !g.done);
    const hero = this.heroes[g.charId];
    this.map(p.x + p.w / 2, p.y + p.h, 0, hero.root.position);
    this.orient(hero.root, p.x + p.w / 2, p.face);
    hero.root.rotateY(p.face * -0.45); // turn slightly toward the camera
    animateHero(hero, { t: g.t, run: p.onGround ? Math.min(1, Math.abs(p.vx) / 150) : 0, air: !p.onGround, glide: p.gliding, spin: p.spinT, pound: p.pounding, squash: p.squash, attack: p.attackT, dance: g.done });
    // blob shadow
    const sy = this.groundBelow(g, p);
    if (sy !== null) { this.shadow.visible = true; this.map(p.x + p.w / 2, sy - 0.5, 0, this.shadow.position); this.shadow.position.y += 0.03; const d = (sy - (p.y + p.h)) / T; this.shadow.scale.setScalar(Math.max(0.3, 1 - d * 0.12)); } else this.shadow.visible = false;
    // enemies
    for (const e of g.ents) {
      const md = e.model; if (!md) continue;
      const vis = e.alive || e.deadT > 0; md.root.visible = vis; if (!vis) continue;
      this.map(e.x + e.w / 2, e.y + e.h, 0, md.root.position);
      this.orient(md.root, e.x + e.w / 2, e.type === 'boss' ? (e.face || 1) : (e.vx < 0 ? -1 : 1));
      if (e.type !== 'boss') md.root.rotateY(e.vx < 0 ? 0.5 : -0.5);
      const s = e.alive ? 1 : Math.max(0.01, e.deadT / 0.5);
      md.g.scale.set(1 + (1 - s) * 0.6, s, 1 + (1 - s) * 0.6);
      if (md.legs) md.legs.forEach((l, i) => (l.rotation.x = Math.sin(e.t * 14 + i * 1.7) * 0.6));
      if (md.wings) md.wings.forEach((w, i) => (w.rotation.z = Math.sin(e.t * (e.type === 'boss' ? 8 : 22)) * 0.7 * (i ? -1 : 1)));
      if (md.ball) md.ball.rotation.x += (e.vx / T) * dt / 0.4;
      if (md.sq) { const k = e.onGround ? Math.max(0, Math.sin(e.t * 6)) * 0.12 : -0.12; md.sq.scale.set(1 + k, 1 - k, 1 + k); }
      if (e.type === 'boss') md.root.visible = vis && !(e.hitT > 0 && Math.floor(e.hitT * 20) % 2);
    }
    // pickups
    for (const k of g.coins) {
      if (!k.mesh) { k.mesh = this.makers[k.kind](); this.level.add(k.mesh); }
      k.mesh.visible = !k.got; if (k.got) continue;
      this.map(k.x, k.y + Math.sin(g.t * 3 + k.x) * 3, 0, k.mesh.position);
      k.mesh.rotation.y = g.t * 2.5 + k.x;
    }
    for (const pl of g.plats) { this.map(pl.x + pl.w / 2, pl.y + 4.5, 0, pl.mesh.position); this.orient(pl.mesh, pl.x + pl.w / 2, 1, false); pl.mesh.visible = !(pl.kind === 'crumble' && pl.state === 2 && pl.timer < 2.4); }
    for (const s of g.springs) s.top.position.y = 0.3 + (s.t > 0 ? Math.sin(s.t * 30) * 0.08 : 0);
    for (const c of g.checks) if (c.on && !c.lit) { c.lit = true; c.lamp.material = mat(0xffe066, { emissive: 0xaa8800 }); }
    if (this.goalMesh) { const open = !g.boss || !g.boss.alive; this.goalDisc.visible = open; this.goalMesh.children[0].rotation.z = g.t; this.goalDisc.material.opacity = 0.55 + Math.sin(g.t * 4) * 0.2; }
    // projectiles
    while (this.shotMeshes.length < g.shots.length) { const sm = meshOf(cone(0.12, 0.6, 4), 0xbfe8ff); this.level.add(sm); this.shotMeshes.push(sm); }
    this.shotMeshes.forEach((sm, i) => { const s = g.shots[i]; sm.visible = !!s; if (s) { this.map(s.x + s.w / 2, s.y + s.h / 2, 0, sm.position); sm.rotation.set(Math.PI, 0, 0); sm.material = mat(s.type === 'feather' ? 0x5a5aa8 : 0xbfe8ff); } });
    // particles
    let n = 0; const v = this.tmpV;
    for (const q of this.parts) {
      q.vy += 500 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt / T; q.life -= dt;
      if (q.life <= 0) continue;
      this.map(q.x, q.y, q.z, v); this.pPos[n * 3] = v.x; this.pPos[n * 3 + 1] = v.y; this.pPos[n * 3 + 2] = v.z;
      const k = Math.min(1, q.life / (q.max * 0.5)); this.pCol[n * 3] = q.c.r * k; this.pCol[n * 3 + 1] = q.c.g * k; this.pCol[n * 3 + 2] = q.c.b * k; n++;
    }
    this.parts = this.parts.filter((q) => q.life > 0);
    this.points.geometry.setDrawRange(0, n);
    this.points.geometry.attributes.position.needsUpdate = true; this.points.geometry.attributes.color.needsUpdate = true;
    this.updateCamera(g, dt);
  }

  groundBelow(g, p) {
    const cx = Math.floor((p.x + p.w / 2) / T);
    for (let cy = Math.max(0, Math.floor((p.y + p.h) / T)); cy < ROWS; cy++) { const t = g.tile(cx, cy); if (t === 1 || t === 2 || t === 4 || t === 5 || t === 6) return cy * T + (t === 2 ? 3 : 0); }
    for (const pl of g.plats) if (p.x + p.w / 2 > pl.x && p.x + p.w / 2 < pl.x + pl.w && pl.y >= p.y + p.h - 2) return pl.y;
    return null;
  }

  updateCamera(g, dt) {
    const p = g.p, targetU = (p.x + p.w / 2) / T + 4 + p.face * 1.6 + p.vx / T * 0.25;
    const hp = (300 - (p.y + p.h / 2)) / T;
    const k = this.snapCam ? 1 : Math.min(1, dt * 3.2);
    this.camU += (targetU - this.camU) * k;
    const targetH = Math.max(0.5, Math.min(7, hp));
    this.camH += (targetH - this.camH) * (this.snapCam ? 1 : Math.min(1, dt * 2.2));
    this.snapCam = false;
    const f = this.frame(this.camU, this._fc || (this._fc = { p: new THREE.Vector3(), t: new THREE.Vector3(), n: new THREE.Vector3() }));
    const cam = this.camera, dist = 11.5;
    cam.position.copy(f.p).addScaledVector(f.n, dist).addScaledVector(UP, this.camH + 2.6);
    if (g.shakeT > 0) { cam.position.x += (Math.random() - 0.5) * g.shakeT * 1.5; cam.position.y += (Math.random() - 0.5) * g.shakeT * 1.5; }
    const look = this.tmpV.copy(f.p).addScaledVector(UP, this.camH + 0.6);
    cam.lookAt(look);
    this.sky.position.copy(cam.position);
    if (this.sunDisc) { this.sunDisc.position.copy(cam.position).addScaledVector(f.n, -150).add(this.tmpV.set(f.t.x * 50, 60, f.t.z * 50)); this.sunDisc.lookAt(cam.position); }
  }

  render() { this.renderer.render(this.scene, this.camera); }

  // title/map backdrop: slow fly-along
  idle(game, dt) {
    if (!this.path) return;
    game.t += dt;
    this.update(game, dt);
    const u = (game.t * 2.5) % Math.max(10, game.W - 10) + 4;
    const f = this.frame(u, this._fc);
    this.camera.position.copy(f.p).addScaledVector(f.n, 13).addScaledVector(UP, 5);
    this.camera.lookAt(this.tmpV.copy(f.p).addScaledVector(UP, 2).addScaledVector(f.t, 3));
    this.sky.position.copy(this.camera.position);
  }
}
