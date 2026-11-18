// Street animals of Puducherry — sculpted, furred, jointed models with lifelike behaviour.
//   • Dogs (Labrador, golden, black and street pariah dogs): trot, run, sit, lie, wag, bark at a running
//     player, chase passing two-wheelers for a few seconds, wander up to people and sniff around them.
//   • Cats (fluffy white Persian with blue eyes, tabby, black, calico): slink, pounce/jump, curl up asleep, bolt.
//   • Kangayam bulls & cows (hump, dewlap, painted horns, festive neck rope) and goats: graze, amble,
//     lie in the road, move off when honked at, moo / bleat.
//   • Crows and pigeons: hop and peck in flocks, burst into flight when someone comes close, circle and land.
// Bodies are lofted from cross-sections (smooth, anatomical silhouettes) with a strand-fur texture,
// soft shading from belly to back, glossy eyes and real knee/hock joints. Optional realistic models can be
// dropped into models/animals/ (see README there) and replace the built-in ones automatically.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { G } from './state.js';
import { rand, pick, clamp, wrapAngle } from './utils.js';
import { makeGLTFLoader } from './models.js';

/* ------------------------------------------------------------------ */
/* materials & textures                                                */
/* ------------------------------------------------------------------ */
function furTexture(seed, long) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#e9e9e9'; x.fillRect(0, 0, 128, 128);
  let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < (long ? 1600 : 2600); i++) {           // short directional hair strands
    const px = r() * 128, py = r() * 128, l = long ? 4 + r() * 8 : 2 + r() * 4, v = r();
    x.strokeStyle = v < 0.5 ? `rgba(0,0,0,${0.06 + r() * 0.1})` : `rgba(255,255,255,${0.12 + r() * 0.2})`;
    x.lineWidth = 1; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 2, py + l); x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const FUR = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
const SKIN = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
const GLOSS = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
let SHELL = null;  // fluffy fur shells (long-haired cats)
function initMaterials() {
  if (FUR.map) return;
  FUR.map = furTexture(7, false); SKIN.map = furTexture(11, false); SKIN.map.repeat.set(2, 2);
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d');
  x.clearRect(0, 0, 128, 128);
  for (let i = 0; i < 6500; i++) { x.fillStyle = `rgba(255,255,255,${0.55 + Math.random() * 0.45})`; x.fillRect(Math.random() * 128, Math.random() * 128, 1, 1 + Math.random() * 3); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
  SHELL = new THREE.MeshStandardMaterial({ vertexColors: true, map: t, alphaTest: 0.45, roughness: 1, side: THREE.DoubleSide });
}

/* ------------------------------------------------------------------ */
/* geometry: lofted tubes along a centre line (rings perpendicular)    */
/* ------------------------------------------------------------------ */
const _t = new THREE.Vector3(), _up = new THREE.Vector3(), SIDE = new THREE.Vector3(1, 0, 0);
/** sections: [{c:[x,y,z], rx, ry}] ; col(x,y,z,ny) -> THREE.Color ; returns BufferGeometry with uv + color */
function tube(sections, col, N = 16, caps = true) {
  const pos = [], uv = [], cols = [], idx = []; let vlen = 0;
  const C = sections.map((s) => new THREE.Vector3(...s.c));
  for (let i = 0; i < C.length; i++) {
    const a = C[Math.max(0, i - 1)], b = C[Math.min(C.length - 1, i + 1)];
    _t.subVectors(b, a).normalize();
    const side = Math.abs(_t.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : SIDE.clone().addScaledVector(_t, -_t.x).normalize();
    _up.crossVectors(_t, side).normalize();
    if (i) vlen += C[i].distanceTo(C[i - 1]);
    const { rx, ry } = sections[i];
    for (let j = 0; j <= N; j++) {
      const ang = (j / N) * Math.PI * 2, cx = Math.cos(ang), sy = Math.sin(ang);
      const p = C[i].clone().addScaledVector(side, rx * cx).addScaledVector(_up, ry * sy);
      pos.push(p.x, p.y, p.z); uv.push(j / N * 2, vlen * 4);
      const k = col(p.x, p.y, p.z, sy * (_up.y) + cx * side.y); cols.push(k.r, k.g, k.b);
    }
  }
  const R = N + 1;
  for (let i = 0; i < C.length - 1; i++) for (let j = 0; j < N; j++) { const a = i * R + j, b = a + 1, c = a + R, d = c + 1; idx.push(a, b, c, b, d, c); }
  if (caps) for (const [i, flip] of [[0, true], [C.length - 1, false]]) {
    const base = pos.length / 3; pos.push(C[i].x, C[i].y, C[i].z); uv.push(0.5, 0); const k = col(C[i].x, C[i].y, C[i].z, 0); cols.push(k.r, k.g, k.b);
    for (let j = 0; j < N; j++) { const a = i * R + j, b = a + 1; flip ? idx.push(base, b, a) : idx.push(base, a, b); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g.toNonIndexed();
}
const solid = (hex) => () => new THREE.Color(hex);
function blob(r, sx, sy, sz, x, y, z, col) {   // ellipsoid with colour
  const g = new THREE.SphereGeometry(r, 14, 10).toNonIndexed(); g.scale(sx, sy, sz); g.translate(x, y, z);
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const k = col(g.attributes.position.getX(i), g.attributes.position.getY(i), g.attributes.position.getZ(i), g.attributes.normal.getY(i)); a[i * 3] = k.r; a[i * 3 + 1] = k.g; a[i * 3 + 2] = k.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
}
function cone(r, h, x, y, z, rx, rz, hex, seg = 8) {
  const g = new THREE.ConeGeometry(r, h, seg).toNonIndexed(); g.translate(0, h / 2, 0); g.rotateX(rx); g.rotateZ(rz); g.translate(x, y, z);
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
}
const mesh = (geos, m = FUR) => { const o = new THREE.Mesh(mergeGeometries(geos.filter(Boolean)), m); o.castShadow = true; return o; };
/** gradient colouring: lighter belly, darker back, optional patches */
const shade = (base, belly, back, extra) => (x, y, z, ny) => {
  const c = new THREE.Color(base);
  if (ny < -0.2 && belly != null) c.lerp(new THREE.Color(belly), Math.min(1, (-ny - 0.2) * 1.6));
  if (ny > 0.4 && back != null) c.lerp(new THREE.Color(back), (ny - 0.4) * 0.6);
  if (extra) extra(c, x, y, z, ny);
  return c;
};

/* ------------------------------------------------------------------ */
/* generic quadruped rig                                               */
/* ------------------------------------------------------------------ */
// spec: body sections, neck pivot, head parts, legs [{x,z,y, upper, lower, r1, r2, hind}], tail chain
function buildQuad(P) {
  initMaterials();
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const parts = [tube(P.body, P.col, 18)];
  if (P.extraBody) parts.push(...P.extraBody());
  body.add(mesh(parts, P.skin ? SKIN : FUR));
  if (P.bodyGloss) body.add(mesh(P.bodyGloss(), GLOSS));
  if (P.shells) for (let k = 1; k <= P.shells; k++) {          // fluffy fur shells
    const g = tube(P.body.map((s) => ({ c: s.c, rx: s.rx + k * 0.016, ry: s.ry + k * 0.016 })), P.col, 18);
    const m = new THREE.Mesh(g, SHELL); m.castShadow = false; body.add(m);
  }
  // neck + head on a pivot so grazing / sniffing / looking moves the whole thing
  const neck = new THREE.Group(); neck.position.set(...P.neckPivot); body.add(neck);
  const off = (secs) => secs.map((s) => ({ ...s, c: [s.c[0] - P.neckPivot[0], s.c[1] - P.neckPivot[1], s.c[2] - P.neckPivot[2]] }));
  const shift = (g) => g.translate(-P.neckPivot[0], -P.neckPivot[1], -P.neckPivot[2]);
  const hp = [tube(off(P.neck), P.col, 14), tube(off(P.head), P.headCol || P.col, 16)];
  if (P.headExtra) hp.push(...P.headExtra().map(shift));
  neck.add(mesh(hp, P.skin ? SKIN : FUR));
  if (P.headGloss) neck.add(mesh(P.headGloss().map(shift), GLOSS));
  if (P.headShells) for (let k = 1; k <= P.headShells; k++) { const m = new THREE.Mesh(tube(off(P.head).map((s) => ({ ...s, rx: s.rx + k * 0.01, ry: s.ry + k * 0.01 })), P.headCol || P.col, 16), SHELL); neck.add(m); }
  // legs with a knee/hock joint
  const legs = [];
  for (const L of P.legs) {
    const hip = new THREE.Group(); hip.position.set(L.x, L.y, L.z); body.add(hip);
    const up = [tube([{ c: [0, 0.02, 0], rx: L.r1 * 1.2, ry: L.r1 * 1.35 }, { c: [0, -L.upper * 0.5, L.hind ? -0.02 : 0], rx: L.r1, ry: L.r1 * 1.15 }, { c: [0, -L.upper, 0], rx: L.r2 * 1.1, ry: L.r2 * 1.1 }], P.legCol || P.col, 10)];
    hip.add(mesh(up, P.skin ? SKIN : FUR));
    const knee = new THREE.Group(); knee.position.set(0, -L.upper, 0); hip.add(knee);
    const lo = [tube([{ c: [0, 0, 0], rx: L.r2, ry: L.r2 }, { c: [0, -L.lower * 0.6, L.hind ? 0.02 : 0], rx: L.r2 * 0.75, ry: L.r2 * 0.8 }, { c: [0, -L.lower + 0.02, 0], rx: L.r2 * 0.7, ry: L.r2 * 0.75 }], P.legCol || P.col, 10)];
    lo.push(P.foot(-L.lower));
    knee.add(mesh(lo, P.skin ? SKIN : FUR));
    legs.push({ hip, knee, hind: !!L.hind, side: Math.sign(L.x) });
  }
  // tail chain
  const tail = []; let parent = body;
  if (P.tail) {
    const t0 = new THREE.Group(); t0.position.set(...P.tail.base); body.add(t0); parent = t0;
    const n = P.tail.n, seg = P.tail.len / n;
    for (let i = 0; i < n; i++) {
      const gseg = i === 0 ? t0 : new THREE.Group(); if (i) { gseg.position.set(0, 0, -seg); parent.add(gseg); }
      const r0 = P.tail.r * (1 - i / n * 0.6), r1 = P.tail.r * (1 - (i + 1) / n * 0.6);
      const parts2 = [tube([{ c: [0, 0, 0], rx: r0, ry: r0 }, { c: [0, 0, -seg], rx: r1, ry: r1 }], P.tailCol || P.col, 8)];
      if (i === n - 1 && P.tail.tuft) parts2.push(blob(P.tail.r * 1.6, 1, 1, 2.2, 0, 0, -seg - P.tail.r * 2, solid(P.tail.tuft)));
      gseg.add(mesh(parts2, P.skin ? SKIN : FUR));
      if (P.tail.fluff) { const m = new THREE.Mesh(tube([{ c: [0, 0, 0], rx: r0 * 2.3, ry: r0 * 2.3 }, { c: [0, 0, -seg], rx: r1 * 2.3, ry: r1 * 2.3 }], P.tailCol || P.col, 8), SHELL); gseg.add(m); }
      gseg.rotation.x = P.tail.curl[i] ?? P.tail.curl[P.tail.curl.length - 1];
      tail.push(gseg); parent = gseg;
    }
  }
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root, body, neck, legs, tail, legH: P.legH, P };
}

/* ------------------------------------------------------------------ */
/* species                                                             */
/* ------------------------------------------------------------------ */
const DOG_COATS = [
  { name: 'labrador', base: 0xe0bd85, belly: 0xf3e2c0, back: 0xcfa66b, nose: 0x241a16, ears: 'flop', tail: 'otter' },
  { name: 'golden', base: 0xc98e45, belly: 0xe7c48e, back: 0xb27632, nose: 0x241a16, ears: 'flop', tail: 'otter' },
  { name: 'blacklab', base: 0x1d1b1a, belly: 0x2a2826, back: 0x141312, nose: 0x0a0a0a, ears: 'flop', tail: 'otter' },
  { name: 'pariah', base: 0xc58a4f, belly: 0xf1e3cc, back: 0xa86d38, nose: 0x1a1210, ears: 'prick', tail: 'curl' },
  { name: 'pariahW', base: 0xe9e1d2, belly: 0xf6f0e6, back: 0xcbbfa8, nose: 0x1a1210, ears: 'prick', tail: 'curl', patch: 0x8b5a2b },
  { name: 'pariahB', base: 0x2a2421, belly: 0xd8c8b0, back: 0x1a1614, nose: 0x0a0a0a, ears: 'prick', tail: 'curl' },
];
function buildDog() {
  const C = pick(DOG_COATS), lab = C.ears === 'flop', s = lab ? 1.0 : 0.92;
  const patchFn = C.patch ? (c, x, y, z) => { if (Math.sin(x * 9 + z * 7) + Math.cos(z * 11) > 1.1) c.set(C.patch); } : null;
  const col = shade(C.base, C.belly, C.back, patchFn);
  const S = (secs) => secs.map((q) => ({ c: [q[0], q[1] * s, q[2] * s], rx: q[3] * s, ry: q[4] * s }));
  const tailBase = [0, 0.6 * s, -0.43 * s];
  const P = {
    legH: 0.5 * s, col,
    body: S([[0, 0.57, -0.45, 0.05, 0.05], [0, 0.57, -0.4, 0.12, 0.13], [0, 0.57, -0.26, 0.15, 0.16], [0, 0.585, -0.07, 0.135, 0.14], [0, 0.585, 0.1, 0.155, 0.18],
      [0, 0.6, 0.25, 0.15, 0.19], [0, 0.63, 0.35, 0.12, 0.15], [0, 0.67, 0.4, 0.06, 0.07]]),
    neckPivot: [0, 0.68 * s, 0.33 * s],
    neck: S([[0, 0.66, 0.3, 0.1, 0.11], [0, 0.74, 0.38, 0.09, 0.095], [0, 0.82, 0.45, 0.075, 0.08]]),
    head: S([[0, 0.87, 0.41, 0.06, 0.06], [0, 0.885, 0.46, 0.088, 0.088], [0, 0.88, 0.53, 0.085, 0.082], [0, 0.86, 0.575, 0.066, 0.066], [0, 0.83, 0.625, 0.053, 0.048], [0, 0.82, 0.67, 0.044, 0.038], [0, 0.82, 0.69, 0.02, 0.02]]),
    headCol: shade(C.base, C.belly, C.back),
    headExtra: () => {
      const g = [];
      for (const sx of [-1, 1]) {
        if (C.ears === 'flop') { const e = blob(0.06 * s, 0.32, 1.2, 0.85, 0, 0, 0, solid(C.back)); e.rotateZ(sx * 0.25); e.translate(sx * 0.085 * s, 0.85 * s, 0.47 * s); g.push(e); }
        else g.push(cone(0.035 * s, 0.1 * s, sx * 0.055 * s, 0.93 * s, 0.46 * s, -0.15, -sx * 0.2, C.back, 6));
      }
      g.push(blob(0.05 * s, 1, 0.45, 1, 0, 0.795 * s, 0.63 * s, solid(C.belly)));                  // lower jaw
      if (lab && Math.random() < 0.6) g.push(blob(0.028 * s, 1, 0.3, 1.5, 0, 0.785 * s, 0.665 * s, solid(0xd9727a))); // panting tongue
      return g;
    },
    headGloss: () => [blob(0.026 * s, 1.1, 0.85, 0.9, 0, 0.828 * s, 0.695 * s, solid(C.nose)),
      blob(0.015 * s, 1, 1, 0.8, 0.043 * s, 0.9 * s, 0.565 * s, solid(0x3a2414)), blob(0.015 * s, 1, 1, 0.8, -0.043 * s, 0.9 * s, 0.565 * s, solid(0x3a2414))],
    legs: [
      { x: 0.08 * s, y: 0.56 * s, z: 0.25 * s, upper: 0.25 * s, lower: 0.29 * s, r1: 0.05 * s, r2: 0.032 * s },
      { x: -0.08 * s, y: 0.56 * s, z: 0.25 * s, upper: 0.25 * s, lower: 0.29 * s, r1: 0.05 * s, r2: 0.032 * s },
      { x: 0.085 * s, y: 0.56 * s, z: -0.3 * s, upper: 0.25 * s, lower: 0.29 * s, r1: 0.07 * s, r2: 0.033 * s, hind: true },
      { x: -0.085 * s, y: 0.56 * s, z: -0.3 * s, upper: 0.25 * s, lower: 0.29 * s, r1: 0.07 * s, r2: 0.033 * s, hind: true },
    ],
    foot: (y) => blob(0.04 * s, 1, 0.55, 1.35, 0, y + 0.012, 0.02 * s, shade(C.base, C.belly, null)),
    tail: C.tail === 'curl' ? { base: tailBase, n: 5, len: 0.36 * s, r: 0.028 * s, curl: [1.2, 0.7, 0.7, 0.6, 0.5] }
      : { base: tailBase, n: 5, len: 0.42 * s, r: 0.035 * s, curl: [-0.35, -0.12, -0.08, 0.05, 0.08] },
  };
  const m = buildQuad(P); m.coat = C.name; return m;
}

const CAT_COATS = [
  { name: 'persian', base: 0xf7f7f5, belly: 0xffffff, back: 0xeeeeea, eye: 0x4f9fe0, long: true },
  { name: 'persian', base: 0xf7f7f5, belly: 0xffffff, back: 0xeeeeea, eye: 0x4f9fe0, long: true },
  { name: 'tabby', base: 0xd18a45, belly: 0xf0d3a8, back: 0xb06a28, eye: 0x9acd32, stripes: 0x8a4a18 },
  { name: 'black', base: 0x1c1c1e, belly: 0x262628, back: 0x121214, eye: 0xd4b62a },
  { name: 'calico', base: 0xf2ece2, belly: 0xffffff, back: 0xe6dccd, eye: 0x9acd32, patches: true },
];
let CAT_FORCE = null;
export function _forceCat(i) { CAT_FORCE = i == null ? null : CAT_COATS[i]; }
function buildCat() {
  const C = CAT_FORCE || pick(CAT_COATS), s = C.long ? 1.05 : 1;
  const extra = C.stripes ? (c, x, y, z, ny) => { if (ny > -0.1 && Math.sin(z * 55) > 0.45) c.set(C.stripes); }
    : C.patches ? (c, x, y, z) => { const v = Math.sin(x * 18 + z * 9) + Math.cos(z * 14 - x * 6); if (v > 0.9) c.set(0xd8862e); else if (v < -1.1) c.set(0x262422); } : null;
  const col = shade(C.base, C.belly, C.back, extra);
  const S = (secs) => secs.map((q) => ({ c: [q[0], q[1] * s, q[2] * s], rx: q[3] * s, ry: q[4] * s }));
  const P = {
    legH: 0.2, col, shells: C.long ? 4 : 0, headShells: C.long ? 2 : 0,
    body: S([[0, 0.24, -0.21, 0.03, 0.03], [0, 0.245, -0.18, 0.075, 0.08], [0, 0.245, -0.08, 0.085, 0.09], [0, 0.25, 0.05, 0.08, 0.085], [0, 0.255, 0.14, 0.075, 0.085], [0, 0.27, 0.19, 0.045, 0.05]]),
    neckPivot: [0, 0.28 * s, 0.17 * s],
    neck: S([[0, 0.27, 0.16, 0.05, 0.055], [0, 0.31, 0.2, 0.045, 0.048]]),
    head: S([[0, 0.335, 0.19, 0.04, 0.04], [0, 0.345, 0.22, 0.058, 0.055], [0, 0.34, 0.255, 0.052, 0.048], [0, 0.33, 0.28, 0.03, 0.028], [0, 0.328, 0.29, 0.012, 0.012]]),
    headExtra: () => [cone(0.022 * s, 0.045 * s, 0.033 * s, 0.38 * s, 0.215 * s, -0.1, -0.25, C.back, 4), cone(0.022 * s, 0.045 * s, -0.033 * s, 0.38 * s, 0.215 * s, -0.1, 0.25, C.back, 4),
      blob(0.006 * s, 1, 0.8, 1, 0, 0.334 * s, 0.291 * s, solid(0xe39aa0))],
    headGloss: () => [blob(0.0115 * s, 1, 1.05, 0.7, 0.024 * s, 0.352 * s, 0.268 * s, solid(C.eye)), blob(0.0115 * s, 1, 1.05, 0.7, -0.024 * s, 0.352 * s, 0.268 * s, solid(C.eye)),
      blob(0.004 * s, 1, 1, 1, 0.024 * s, 0.352 * s, 0.276 * s, solid(0x050505)), blob(0.004 * s, 1, 1, 1, -0.024 * s, 0.352 * s, 0.276 * s, solid(0x050505))],
    legs: [
      { x: 0.04, y: 0.23, z: 0.13, upper: 0.11, lower: 0.12, r1: 0.022, r2: 0.016 }, { x: -0.04, y: 0.23, z: 0.13, upper: 0.11, lower: 0.12, r1: 0.022, r2: 0.016 },
      { x: 0.045, y: 0.23, z: -0.15, upper: 0.11, lower: 0.13, r1: 0.032, r2: 0.017, hind: true }, { x: -0.045, y: 0.23, z: -0.15, upper: 0.11, lower: 0.13, r1: 0.032, r2: 0.017, hind: true },
    ],
    foot: (y) => blob(0.02, 1, 0.55, 1.2, 0, y + 0.006, 0.008, shade(C.base, C.belly, null)),
    tail: { base: [0, 0.27 * s, -0.2 * s], n: 6, len: 0.3, r: 0.017, curl: [1.3, 0.05, 0.05, 0.0, -0.3, -0.45], fluff: !!C.long },
  };
  const m = buildQuad(P); m.coat = C.name; return m;
}

function buildCow(bull) {
  // Kangayam zebu: grey-white with a darker front on bulls, big hump, dewlap, long painted horns
  const base = bull ? pick([0xd9d6d0, 0xcfccc6, 0xe4e1db]) : pick([0xf0ebe0, 0xe6dccb, 0xd8c7a8, 0xbfa684]);
  const dark = bull ? 0x3c3a3a : 0x8a7a66;
  const front = (c, x, y, z, ny) => { if (bull) { const k = clamp((z - 0.1) / 0.55, 0, 1) * 0.85 + clamp((y - 1.3) / 0.25, 0, 1) * 0.6; c.lerp(new THREE.Color(dark), clamp(k, 0, 0.92)); } };
  const col = shade(base, 0xf4f1ea, null, front);
  const hornCol = bull ? pick([0xe0b23a, 0xd9a634, 0xc62828]) : pick([0xd8cfc0, 0x2f6fd0, 0xc62828]);
  const sc = bull ? 1.05 : 0.95;
  const S = (secs) => secs.map((q) => ({ c: [q[0], q[1] * sc, q[2] * sc], rx: q[3] * sc, ry: q[4] * sc }));
  const P = {
    legH: 0.78 * sc, col, skin: true,
    body: S([[0, 1.06, -0.8, 0.1, 0.1], [0, 1.08, -0.72, 0.28, 0.3], [0, 1.07, -0.45, 0.32, 0.35], [0, 1.04, -0.1, 0.33, 0.38], [0, 1.06, 0.25, 0.34, 0.41], [0, 1.1, 0.5, 0.31, 0.41], [0, 1.15, 0.66, 0.22, 0.32], [0, 1.18, 0.74, 0.08, 0.1]]),
    extraBody: () => [blob(0.27 * sc, 0.95, bull ? 1.0 : 0.6, 1.15, 0, (bull ? 1.38 : 1.34) * sc, 0.42 * sc, col),          // hump
      blob(0.2 * sc, 0.32, 1.25, 1.1, 0, 0.9 * sc, 0.62 * sc, col)],                                                           // dewlap
    neckPivot: [0, 1.25 * sc, 0.62 * sc],
    neck: S([[0, 1.16, 0.55, 0.24, 0.32], [0, 1.22, 0.75, 0.18, 0.25], [0, 1.27, 0.9, 0.13, 0.16]]),
    head: S([[0, 1.32, 0.88, 0.11, 0.12], [0, 1.3, 0.95, 0.13, 0.13], [0, 1.18, 1.08, 0.11, 0.1], [0, 1.06, 1.17, 0.095, 0.08], [0, 1.0, 1.2, 0.09, 0.07], [0, 0.98, 1.22, 0.04, 0.04]]),
    headCol: shade(bull ? 0x6f6c6a : base, null, null, (c, x, y, z) => { if (z > 1.12 * sc) c.lerp(new THREE.Color(0x2a2222), 0.8); }),
    headExtra: () => {
      const g = [];
      for (const sx of [-1, 1]) {
        g.push(blob(0.08 * sc, 1.4, 0.45, 0.8, sx * 0.17 * sc, 1.27 * sc, 0.93 * sc, solid(bull ? 0x5a5756 : base)));         // ears
        // horns: thick at the base, sweeping up and slightly forward, painted
        const horn = tube([{ c: [sx * 0.08, 1.38, 0.9], rx: 0.045, ry: 0.045 }, { c: [sx * 0.15, 1.5, 0.9], rx: 0.04, ry: 0.04 }, { c: [sx * 0.18, 1.66, 0.94], rx: 0.03, ry: 0.03 }, { c: [sx * 0.16, 1.8, 0.99], rx: 0.018, ry: 0.018 }, { c: [sx * 0.13, 1.88, 1.02], rx: 0.004, ry: 0.004 }].map((q) => ({ ...q, c: q.c.map((v) => v * sc) })),
          (x, y) => new THREE.Color(y > 1.74 * sc ? 0xb71c1c : hornCol), 8);
        g.push(horn);
      }
      if (bull || Math.random() < 0.4) {   // festive neck rope (yellow + red) and nose rope
        g.push(tube([...Array(13)].map((_, i) => { const a = (i / 12) * Math.PI * 2; return { c: [Math.cos(a) * 0.17 * sc, (1.12 + Math.sin(a) * 0.17) * sc, 0.8 * sc], rx: 0.025, ry: 0.025 }; }), solid(0xf2c40f), 8, false));
        g.push(tube([...Array(13)].map((_, i) => { const a = (i / 12) * Math.PI * 2; return { c: [Math.cos(a) * 0.15 * sc, (1.1 + Math.sin(a) * 0.15) * sc, 0.76 * sc], rx: 0.03, ry: 0.03 }; }), solid(0xc62828), 8, false));
        g.push(tube([{ c: [0.06 * sc, 1.02 * sc, 1.19 * sc], rx: 0.008, ry: 0.008 }, { c: [0.12 * sc, 1.15 * sc, 1.05 * sc], rx: 0.008, ry: 0.008 }, { c: [0.1 * sc, 1.25 * sc, 0.85 * sc], rx: 0.008, ry: 0.008 }], solid(0xc9a96e), 6));
      }
      return g;
    },
    headGloss: () => [blob(0.026 * sc, 0.9, 1, 0.8, 0.105 * sc, 1.22 * sc, 1.02 * sc, solid(0x111111)), blob(0.026 * sc, 0.9, 1, 0.8, -0.105 * sc, 1.22 * sc, 1.02 * sc, solid(0x111111)),
      blob(0.06 * sc, 1.25, 0.8, 0.5, 0, 0.99 * sc, 1.22 * sc, solid(0x1d1717))],
    legs: [
      { x: 0.17 * sc, y: 0.95 * sc, z: 0.52 * sc, upper: 0.42 * sc, lower: 0.5 * sc, r1: 0.1 * sc, r2: 0.055 * sc }, { x: -0.17 * sc, y: 0.95 * sc, z: 0.52 * sc, upper: 0.42 * sc, lower: 0.5 * sc, r1: 0.1 * sc, r2: 0.055 * sc },
      { x: 0.18 * sc, y: 0.98 * sc, z: -0.55 * sc, upper: 0.45 * sc, lower: 0.5 * sc, r1: 0.13 * sc, r2: 0.055 * sc, hind: true }, { x: -0.18 * sc, y: 0.98 * sc, z: -0.55 * sc, upper: 0.45 * sc, lower: 0.5 * sc, r1: 0.13 * sc, r2: 0.055 * sc, hind: true },
    ],
    legCol: shade(base, null, null, front),
    foot: (y) => blob(0.06 * sc, 1, 0.75, 1.15, 0, y + 0.03, 0.01, solid(0x1d1a18)),
    tail: { base: [0, 1.12 * sc, -0.78 * sc], n: 5, len: 0.75 * sc, r: 0.03 * sc, curl: [-1.35, -0.12, -0.05, -0.02, 0.0], tuft: 0x1d1a18 },
  };
  const m = buildQuad(P); m.coat = bull ? 'bull' : 'cow'; return m;
}

function buildGoat() {
  const base = pick([0x1e1c1b, 0x6b4a2e, 0xece6da, 0x8a6a4a]), patch = pick([null, 0xf0ebe0, 0x1e1c1b]);
  const col = shade(base, null, null, patch ? (c, x, y, z) => { if (Math.sin(z * 9 + x * 13) > 0.6) c.set(patch); } : null);
  const P = {
    legH: 0.42, col,
    body: [[0, 0.56, -0.36, 0.05, 0.05], [0, 0.57, -0.31, 0.12, 0.13], [0, 0.56, -0.12, 0.15, 0.17], [0, 0.56, 0.08, 0.15, 0.17], [0, 0.6, 0.23, 0.12, 0.15], [0, 0.63, 0.3, 0.05, 0.06]].map((q) => ({ c: [q[0], q[1], q[2]], rx: q[3], ry: q[4] })),
    neckPivot: [0, 0.66, 0.24],
    neck: [{ c: [0, 0.64, 0.22], rx: 0.07, ry: 0.08 }, { c: [0, 0.76, 0.32], rx: 0.055, ry: 0.06 }],
    head: [{ c: [0, 0.8, 0.31], rx: 0.05, ry: 0.05 }, { c: [0, 0.81, 0.36], rx: 0.065, ry: 0.065 }, { c: [0, 0.76, 0.44], rx: 0.045, ry: 0.045 }, { c: [0, 0.72, 0.49], rx: 0.03, ry: 0.03 }, { c: [0, 0.71, 0.5], rx: 0.01, ry: 0.01 }],
    headExtra: () => [blob(0.04, 0.35, 1.3, 0.8, 0.075, 0.78, 0.35, col).rotateZ(0), blob(0.04, 0.35, 1.3, 0.8, -0.075, 0.78, 0.35, col),
      cone(0.015, 0.12, 0.03, 0.85, 0.33, -0.9, -0.15, 0x6f6458, 6), cone(0.015, 0.12, -0.03, 0.85, 0.33, -0.9, 0.15, 0x6f6458, 6),
      cone(0.018, 0.08, 0, 0.66, 0.46, Math.PI, 0, base, 5)],                                                                // beard
    headGloss: () => [blob(0.011, 1, 1, 0.8, 0.045, 0.82, 0.39, solid(0xb88a2a)), blob(0.011, 1, 1, 0.8, -0.045, 0.82, 0.39, solid(0xb88a2a))],
    legs: [
      { x: 0.07, y: 0.5, z: 0.19, upper: 0.2, lower: 0.28, r1: 0.04, r2: 0.022 }, { x: -0.07, y: 0.5, z: 0.19, upper: 0.2, lower: 0.28, r1: 0.04, r2: 0.022 },
      { x: 0.07, y: 0.5, z: -0.25, upper: 0.2, lower: 0.28, r1: 0.055, r2: 0.022, hind: true }, { x: -0.07, y: 0.5, z: -0.25, upper: 0.2, lower: 0.28, r1: 0.055, r2: 0.022, hind: true },
    ],
    foot: (y) => blob(0.025, 1, 0.8, 1.2, 0, y + 0.015, 0.005, solid(0x2a2522)),
    tail: { base: [0, 0.6, -0.35], n: 2, len: 0.09, r: 0.022, curl: [1.0, 0.3] },
  };
  const m = buildQuad(P); m.coat = 'goat'; return m;
}

function buildBird(kind) {
  initMaterials();
  const crow = kind === 'crow', base = crow ? 0x141416 : 0x8a8f99, neckC = crow ? 0x5a5c60 : 0x5d7f6f;
  const col = shade(base, crow ? 0x1c1c1e : 0xa8adb6, null, (c, x, y, z) => { if (z > 0.04 && y > 0.12) c.set(neckC); });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  body.add(mesh([tube([{ c: [0, 0.1, -0.11], rx: 0.01, ry: 0.006 }, { c: [0, 0.11, -0.06], rx: 0.045, ry: 0.04 }, { c: [0, 0.115, 0.02], rx: 0.055, ry: 0.055 }, { c: [0, 0.13, 0.07], rx: 0.04, ry: 0.042 }], col, 12),
    tube([{ c: [0, 0.105, -0.08], rx: 0.03, ry: 0.006 }, { c: [0, 0.095, -0.17], rx: 0.04, ry: 0.004 }], solid(crow ? 0x0e0e10 : 0x4a4e56), 8),
    cone(0.004, 0.06, 0.012, 0.03, 0.005, 0.1, 0, crow ? 0x202020 : 0xc06a6a, 4), cone(0.004, 0.06, -0.012, 0.03, 0.005, 0.1, 0, crow ? 0x202020 : 0xc06a6a, 4)]));
  const neck = new THREE.Group(); neck.position.set(0, 0.15, 0.07); body.add(neck);
  neck.add(mesh([blob(0.032, 1, 1, 1.1, 0, 0.012, 0.012, col), cone(0.012, crow ? 0.05 : 0.025, 0, 0.004, 0.035, Math.PI / 2, 0, crow ? 0x111111 : 0x3a3a3a, 5)]));
  neck.add(mesh([blob(0.006, 1, 1, 1, 0.02, 0.02, 0.03, solid(crow ? 0x8a8a8a : 0xe07a1a)), blob(0.006, 1, 1, 1, -0.02, 0.02, 0.03, solid(crow ? 0x8a8a8a : 0xe07a1a))], GLOSS));
  const wings = [];
  for (const sx of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(sx * 0.04, 0.13, 0.02); body.add(w);
    const sh = new THREE.Shape(); sh.moveTo(0, 0.03); sh.quadraticCurveTo(0.12, 0.04, 0.2, -0.02); sh.lineTo(0.17, -0.06); sh.quadraticCurveTo(0.08, -0.09, 0, -0.08);
    const g = new THREE.ShapeGeometry(sh, 6).toNonIndexed(); g.rotateX(-Math.PI / 2); if (sx < 0) g.scale(-1, 1, 1);
    const c = new THREE.Color(crow ? 0x111113 : 0x7d828c), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, map: FUR.map, side: THREE.DoubleSide, roughness: 0.8 })); w.add(m);
    w.userData.sx = sx; w.rotation.y = -sx * 1.45; w.rotation.z = sx * 0.1; wings.push(w);
  }
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root, body, neck, wings, legs: [], tail: [], legH: 0.03 };
}

/* ------------------------------------------------------------------ */
/* drop-in realistic animal models: models/animals/<kind>*.glb          */
/* ------------------------------------------------------------------ */
const EXT = {};   // kind -> [{ scene, clips, len }]
const KIND_LEN = { dog: 0.95, cat: 0.5, cow: 1.9, bull: 2.0, goat: 0.85, crow: 0.3, pigeon: 0.3 };
export async function loadAnimalModels() {
  let list = [];
  try { list = await (await fetch('models/animals/', { cache: 'no-store' })).json(); } catch (e) { return; }
  if (!list.length) return;
  const loader = await makeGLTFLoader();
  for (const f of list) {
    const m = f.match(/^([a-z]+)/i), kind = m && m[1].toLowerCase();
    if (!kind || !KIND_LEN[kind] || !/\.(glb|gltf)$/i.test(f)) continue;
    try {
      const gl = await new Promise((res, rej) => loader.load('models/animals/' + encodeURIComponent(f), res, undefined, rej));
      const holder = new THREE.Group(); holder.add(gl.scene);
      let box = new THREE.Box3().setFromObject(gl.scene), size = box.getSize(new THREE.Vector3());
      if (size.x > size.z * 1.2) gl.scene.rotation.y = Math.PI / 2;
      if (/_rev/i.test(f)) gl.scene.rotation.y += Math.PI;
      holder.updateMatrixWorld(true); box = new THREE.Box3().setFromObject(holder); size = box.getSize(new THREE.Vector3());
      gl.scene.scale.multiplyScalar(KIND_LEN[kind] / Math.max(size.z, 1e-3));
      holder.updateMatrixWorld(true); box = new THREE.Box3().setFromObject(holder); const c = box.getCenter(new THREE.Vector3());
      gl.scene.position.set(-c.x, -box.min.y, -c.z);
      gl.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      (EXT[kind] = EXT[kind] || []).push({ holder, clips: gl.animations || [] });
    } catch (e) { console.warn('animal model skipped:', f, e); }
  }
}
function buildExternal(kind) {
  const list = EXT[kind]; if (!list || !list.length) return null;
  const t = pick(list), root = skClone(t.holder);
  const mixer = new THREE.AnimationMixer(root);
  const find = (re) => t.clips.find((c) => re.test(c.name));
  const clips = { walk: find(/walk|trot/i), run: find(/run|gallop/i), idle: find(/idle|stand|breath/i), graze: find(/eat|graze|peck/i), sit: find(/sit/i), lie: find(/lie|sleep|rest/i), fly: find(/fly|flap/i), bark: find(/bark|attack/i) };
  return { root, ext: { mixer, clips, cur: null }, body: root, neck: null, legs: [], tail: [], legH: 0 };
}

/* ------------------------------------------------------------------ */
/* behaviour                                                           */
/* ------------------------------------------------------------------ */
const SPEC = {
  dog: { build: buildDog, walk: 1.25, run: 5.2, r: 0.25, len: 0.5, step: 9.5 },
  cat: { build: buildCat, walk: 0.7, run: 4.0, r: 0.13, len: 0.25, step: 13 },
  cow: { build: () => buildCow(false), walk: 0.6, run: 1.6, r: 0.45, len: 1.1, step: 4.2 },
  bull: { build: () => buildCow(true), walk: 0.65, run: 2.2, r: 0.48, len: 1.2, step: 4.0 },
  goat: { build: buildGoat, walk: 0.8, run: 3.2, r: 0.2, len: 0.45, step: 8 },
};

class Animal {
  constructor(kind, x, z) {
    this.kind = kind; this.S = SPEC[kind];
    this.m = buildExternal(kind) || this.S.build();
    this.pos = new THREE.Vector3(x, 0, z); this.yaw = rand(0, Math.PI * 2); this.speed = 0;
    this.state = 'idle'; this.t = rand(1, 4); this.phase = rand(0, 6); this.target = null; this.voiceT = rand(3, 10);
    this.headDown = 0; this.sitAmt = 0; this.lieAmt = 0; this.jump = 0; this.follow = null; this.chase = null;
    G.scene.add(this.m.root); this.sync();
  }
  dispose() { G.scene.remove(this.m.root); }
  setState(s, t) { this.state = s; this.t = t; }
  pickTarget(far) {
    const a = rand(0, Math.PI * 2), d = rand(4, far || (this.kind === 'cow' || this.kind === 'bull' ? 18 : 12));
    const x = this.pos.x + Math.sin(a) * d, z = this.pos.z + Math.cos(a) * d;
    if (G.colliders.pointBlocked(x, z)) return null;
    if (this.kind === 'cow' || this.kind === 'bull') { const r = G.roads.nearestEdge(x, z, 12); if (r && r.d > r.edge.w / 2 + 2) return null; }
    return [x, z];
  }
  flee(from, t = rand(1.2, 2.2)) { this.setState('flee', t); this.yaw = Math.atan2(this.pos.x - from.x, this.pos.z - from.z) + rand(-0.4, 0.4); this.follow = this.chase = null; }
  update(dt) {
    const P = G.player, pp = P.vehicle ? P.vehicle.pos : P.pos, K = this.kind;
    const dP = Math.hypot(pp.x - this.pos.x, pp.z - this.pos.z);
    // threats: fast vehicles nearby (cattle only shy away from very close ones)
    if (this.state !== 'flee' && this.state !== 'chase') for (const v of G.vehicles) {
      if (Math.abs(v.speed) < 3) continue;
      const dx = v.pos.x - this.pos.x, dz = v.pos.z - this.pos.z, d2 = dx * dx + dz * dz;
      if (d2 < (K === 'cow' || K === 'bull' ? 7 : 22)) {
        // street dogs sometimes chase a passing two-wheeler instead of running from it
        if (K === 'dog' && v.isTwoWheel && Math.random() < 0.35) { this.chase = v; this.setState('chase', rand(2.5, 4)); this.voice(); }
        else this.flee(v.pos);
        break;
      }
    }
    if (this.state !== 'flee' && K === 'cat' && dP < 3.2 && P.moveAmt > 0.3) { this.jump = 1; this.flee(pp); }
    // voices
    this.voiceT -= dt;
    if (this.voiceT <= 0) {
      this.voiceT = K === 'dog' ? rand(6, 16) : rand(10, 30);
      if (dP < 30 && (K !== 'dog' || this.state === 'chase' || (dP < 9 && P.moveAmt > 0.6) || Math.random() < 0.25)) this.voice();
    }
    if (K === 'dog' && dP < 9 && !P.vehicle && P.moveAmt > 0.6 && this.state !== 'chase' && this.voiceT > 2) { this.voiceT = Math.min(this.voiceT, 0.4); this.yaw = Math.atan2(pp.x - this.pos.x, pp.z - this.pos.z); if (this.state === 'walk') this.setState('idle', 1.5); }
    this.t -= dt;
    if (this.t <= 0) this.decide(dP);
    let want = 0;
    if ((this.state === 'walk' || this.state === 'follow') && this.target) {
      if (this.state === 'follow' && this.follow) { this.target = [this.follow.pos.x + Math.sin(this.phase * 0.1) * 1.2, this.follow.pos.z + Math.cos(this.phase * 0.1) * 1.2]; }
      const dx = this.target[0] - this.pos.x, dz = this.target[1] - this.pos.z, d = Math.hypot(dx, dz);
      if (d < (this.state === 'follow' ? 1.0 : 0.5)) { if (this.state === 'walk') this.t = 0; }
      else { this.yaw += wrapAngle(Math.atan2(dx, dz) - this.yaw) * Math.min(1, dt * 3); want = this.state === 'follow' && d > 4 ? this.S.walk * 2 : this.S.walk; }
    } else if (this.state === 'flee') want = this.S.run;
    else if (this.state === 'chase' && this.chase) {
      const v = this.chase, dx = v.pos.x - this.pos.x, dz = v.pos.z - this.pos.z;
      this.yaw += wrapAngle(Math.atan2(dx, dz) - this.yaw) * Math.min(1, dt * 4); want = Math.hypot(dx, dz) > 2 ? this.S.run : this.S.walk;
    }
    this.speed += (want - this.speed) * Math.min(1, dt * (want > this.speed ? 3 : 5));
    if (this.speed > 0.02) {
      const nx = this.pos.x + Math.sin(this.yaw) * this.speed * dt, nz = this.pos.z + Math.cos(this.yaw) * this.speed * dt;
      if (!G.colliders.pointBlocked(nx, nz)) { this.pos.x = nx; this.pos.z = nz; } else { this.yaw += Math.PI * 0.6; this.t = Math.min(this.t, 0.5); }
    }
    this.phase += dt * this.S.step * Math.max(0.25, this.speed / this.S.walk) * 0.55;
    const gy = G.walkables ? Math.min(0.5, G.walkables.height(this.pos.x, this.pos.z)) : 0;
    this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 10);
    // pose blends
    const lerpTo = (v, to, k) => v + (to - v) * Math.min(1, dt * k);
    this.sitAmt = lerpTo(this.sitAmt, this.state === 'sit' ? 1 : 0, 4);
    this.lieAmt = lerpTo(this.lieAmt, this.state === 'lie' || this.state === 'sleep' ? 1 : 0, 2.5);
    this.headDown = lerpTo(this.headDown, this.state === 'graze' || this.state === 'sniff' ? 1 : 0, 3);
    this.jump = Math.max(0, this.jump - dt * 2.5);
    this.animate(dt); this.sync();
  }
  decide(dP) {
    const K = this.kind, r = Math.random();
    if (this.state === 'flee' || this.state === 'chase') { this.chase = null; this.setState(K === 'dog' && r < 0.3 ? 'sit' : 'idle', rand(2, 5)); return; }
    if (this.state === 'walk' || this.state === 'follow') {
      this.follow = null;
      if (K === 'cow' || K === 'bull' || K === 'goat') this.setState(r < 0.55 ? 'graze' : r < 0.75 ? 'lie' : 'idle', r < 0.75 ? rand(6, 20) : rand(2, 5));
      else if (K === 'dog') this.setState(r < 0.25 ? 'lie' : r < 0.45 ? 'sit' : r < 0.6 ? 'sniff' : 'idle', rand(3, 10));
      else this.setState(r < 0.3 ? 'sleep' : r < 0.5 ? 'sit' : 'idle', r < 0.3 ? rand(10, 25) : rand(2, 6));
      return;
    }
    // dogs wander over to a nearby person now and then and tag along
    if (K === 'dog' && r < 0.18) {
      let best = null, bd = 144; for (const p of G.peds) { const d = (p.pos.x - this.pos.x) ** 2 + (p.pos.z - this.pos.z) ** 2; if (d < bd && !p.dead) { bd = d; best = p; } }
      if (best) { this.follow = best; this.target = [best.pos.x, best.pos.z]; this.setState('follow', rand(6, 12)); return; }
    }
    if (K === 'cat' && r < 0.15) { this.jump = 1; }
    const tg = this.pickTarget(); if (tg) { this.target = tg; this.setState('walk', 14); } else this.setState('idle', 1);
  }
  onHonk(from) {
    if (this.kind === 'cow' || this.kind === 'bull' || this.kind === 'goat') {
      // cattle lumber out of the road: pick a spot off to the side of the honking vehicle
      const side = Math.random() < 0.5 ? 1 : -1, a = Math.atan2(this.pos.x - from.x, this.pos.z - from.z) + side * 1.2;
      this.target = [this.pos.x + Math.sin(a) * 6, this.pos.z + Math.cos(a) * 6]; this.setState('walk', 6); if (Math.random() < 0.5) this.voice();
    } else this.flee(from);
  }
  voice() {
    const A = G.audio; if (!A || !A.ready) return;
    const v = A.vol(this.pos, 45) * 0.22; if (v < 0.01) return;
    const K = this.kind;
    if (K === 'dog') for (let i = 0; i < 2 + (Math.random() < 0.4); i++) { A.tone(540, 0.08, 'sawtooth', v, -320, i * 0.2); A.tone(300, 0.11, 'square', v * 0.5, -120, i * 0.2); }
    else if (K === 'cat') { A.tone(620, 0.45, 'triangle', v * 0.6, 260); A.tone(900, 0.4, 'sine', v * 0.25, -200, 0.05); }
    else if (K === 'cow' || K === 'bull') { A.tone(K === 'bull' ? 105 : 140, 1.1, 'sawtooth', v * 0.7, -30); A.tone(K === 'bull' ? 210 : 280, 1.0, 'triangle', v * 0.3, -60); }
    else if (K === 'goat') for (let i = 0; i < 4; i++) A.tone(420 + (i % 2) * 40, 0.09, 'sawtooth', v * 0.5, 0, i * 0.09);
    if (this.m.neck) this.barkT = 0.4;
  }
  animate(dt) {
    const M = this.m;
    if (M.ext) return this.animateExt(dt);
    const run = this.speed > this.S.walk * 1.6, amt = clamp(this.speed / this.S.walk, 0, 1.4);
    const sit = this.sitAmt, lie = this.lieAmt, ph = this.phase;
    // gait: walk = lateral sequence, run = gallop-ish (front pair vs hind pair)
    const offs = run ? [0, 0.35, Math.PI, Math.PI + 0.35] : [0, Math.PI, Math.PI * 1.5, Math.PI * 0.5];
    M.legs.forEach((L, i) => {
      const p = ph + offs[i], s = Math.sin(p), lift = Math.max(0, Math.cos(p));
      let hip = s * (run ? 0.75 : 0.45) * Math.min(1, amt), knee = (L.hind ? -1 : 1) * lift * (run ? 0.9 : 0.6) * Math.min(1, amt);
      if (sit > 0.01) { if (L.hind) { hip = hip * (1 - sit) - 1.25 * sit; knee = knee * (1 - sit) - 1.9 * sit * -1; } else { hip *= 1 - sit; knee *= 1 - sit; } }
      if (lie > 0.01) { hip = hip * (1 - lie) + (L.hind ? -1.35 : -1.45) * lie; knee = knee * (1 - lie) + (L.hind ? 2.2 : 0.2) * lie; }
      L.hip.rotation.x = hip; L.knee.rotation.x = knee;
    });
    // body: bob, sit pitch, lie drop
    const bob = Math.abs(Math.sin(ph)) * 0.015 * amt * (run ? 2 : 1);
    M.body.position.y = bob - lie * M.legH * 0.82 - sit * M.legH * 0.25 + this.jump * Math.sin(this.jump * Math.PI) * M.legH * 0.8;
    M.body.rotation.x = -sit * 0.55 + (run ? Math.sin(ph * 2) * 0.05 : 0);
    if (M.neck) {
      const look = this.state === 'idle' ? Math.sin(performance.now() * 0.0006 + ph) * 0.45 : 0;
      M.neck.rotation.x = this.headDown * (this.kind === 'dog' ? 0.75 : 1.0) + sit * 0.35 + lie * 0.25 + (this.state === 'sleep' ? 0.5 : 0) + (this.barkT > 0 ? -0.15 : 0);
      M.neck.rotation.y = look + (this.state === 'sleep' ? 0.9 : 0);
      if (this.barkT > 0) this.barkT -= dt;
      if (this.headDown > 0.5 && this.state === 'graze') M.neck.rotation.x += Math.sin(performance.now() * 0.004) * 0.05;
    }
    // tail: dogs wag (faster when following people), cats swish slowly, cattle flick
    const tnow = performance.now() * 0.001;
    M.tail.forEach((t, i) => {
      if (i === 0) t.rotation.y = this.kind === 'dog' ? Math.sin(tnow * (this.state === 'follow' ? 18 : 9)) * (this.state === 'sleep' ? 0 : 0.5)
        : this.kind === 'cat' ? Math.sin(tnow * 1.6) * 0.35 : Math.sin(tnow * 1.3 + ph) * 0.3;
      else t.rotation.y = Math.sin(tnow * 2 - i) * (this.kind === 'cat' ? 0.15 : 0.06);
    });
  }
  animateExt(dt) {
    const E = this.m.ext, want = this.state === 'flee' || this.state === 'chase' || this.speed > this.S.walk * 1.6 ? 'run'
      : this.speed > 0.1 ? 'walk' : this.state === 'graze' || this.state === 'sniff' ? 'graze' : this.state === 'sit' ? 'sit' : this.state === 'lie' || this.state === 'sleep' ? 'lie' : 'idle';
    const clip = E.clips[want] || E.clips.idle || E.clips.walk;
    if (clip && E.cur !== clip) { const a = E.mixer.clipAction(clip); a.reset().fadeIn(0.3).play(); if (E.cur) E.mixer.clipAction(E.cur).fadeOut(0.3); E.cur = clip; }
    if (E.cur) E.mixer.clipAction(E.cur).timeScale = want === 'walk' ? clamp(this.speed / this.S.walk, 0.6, 1.6) : 1;
    E.mixer.update(dt);
  }
  sync() { this.m.root.position.copy(this.pos); this.m.root.rotation.y = this.yaw; }
}

/* ------------------------------------------------------------------ */
/* birds: crows & pigeons in flocks                                     */
/* ------------------------------------------------------------------ */
class Bird {
  constructor(kind, x, z, flock) {
    this.kind = kind; this.m = buildExternal(kind) || buildBird(kind); this.flock = flock;
    this.pos = new THREE.Vector3(x, 0, z); this.vel = new THREE.Vector3(); this.yaw = rand(0, 6.28);
    this.state = 'ground'; this.t = rand(0.5, 2); this.flap = rand(0, 6); this.peck = 0; this.off = new THREE.Vector3(rand(-1.5, 1.5), 0, rand(-1.5, 1.5));
    G.scene.add(this.m.root);
  }
  dispose() { G.scene.remove(this.m.root); }
  update(dt) {
    const F = this.flock;
    if (F.state === 'fly' || this.state !== 'ground') {
      // steer to the flock's flight target with a little individual offset; flap faster when climbing
      const tgt = F.state === 'fly' ? F.air : new THREE.Vector3(F.home.x + this.off.x, 0, F.home.z + this.off.z);
      const d = tgt.clone().add(F.state === 'fly' ? this.off.clone().multiplyScalar(1.5) : new THREE.Vector3()).sub(this.pos);
      const dist = d.length();
      if (F.state !== 'fly' && dist < 0.25) { this.state = 'ground'; this.pos.y = 0; this.vel.set(0, 0, 0); }
      else {
        this.state = 'air';
        const sp = F.state === 'fly' ? 9 : Math.min(7, dist * 2 + 1);
        this.vel.lerp(d.normalize().multiplyScalar(sp), Math.min(1, dt * 2.2));
        this.pos.addScaledVector(this.vel, dt);
        this.yaw = Math.atan2(this.vel.x, this.vel.z);
      }
    } else {
      // on the ground: hop about, peck
      this.t -= dt;
      if (this.t <= 0) { this.t = rand(0.6, 2.2); if (Math.random() < 0.5) { this.peck = 1; } else { this.yaw += rand(-1.5, 1.5); this.hop = 0.3; } }
      if (this.hop > 0) { this.hop -= dt; this.pos.x += Math.sin(this.yaw) * dt * 1.2; this.pos.z += Math.cos(this.yaw) * dt * 1.2; }
      this.peck = Math.max(0, this.peck - dt * 3);
    }
    this.animate(dt);
    this.m.root.position.set(this.pos.x, this.pos.y + (this.state === 'ground' && this.hop > 0 ? Math.sin(this.hop * 10) * 0.03 : 0), this.pos.z);
    this.m.root.rotation.y = this.yaw;
  }
  animate(dt) {
    const M = this.m;
    if (M.ext) { const c = M.ext.clips[this.state === 'air' ? 'fly' : 'idle'] || M.ext.clips.walk; if (c && M.ext.cur !== c) { M.ext.mixer.clipAction(c).reset().play(); if (M.ext.cur) M.ext.mixer.clipAction(M.ext.cur).stop(); M.ext.cur = c; } M.ext.mixer.update(dt); return; }
    if (this.state === 'air') {
      const climbing = this.vel.y > 0.5;
      this.flap += dt * (climbing ? 26 : this.flock.state === 'fly' && Math.sin(this.flap * 0.13) > 0.3 ? 2 : 17);   // flap, with glides
      const a = Math.sin(this.flap) * 0.9;
      M.wings[0].rotation.set(0, 0, -0.15 + a); M.wings[1].rotation.set(0, 0, 0.15 - a);
      M.body.rotation.x = clamp(-this.vel.y * 0.08, -0.5, 0.5);
    } else {
      for (const w of M.wings) w.rotation.set(0, -w.userData.sx * 1.45, w.userData.sx * 0.1); M.body.rotation.x = 0;
      M.neck.rotation.x = this.peck > 0 ? Math.sin(this.peck * Math.PI) * 1.2 : 0;
    }
  }
}
class Flock {
  constructor(kind, x, z, n) { this.kind = kind; this.home = new THREE.Vector3(x, 0, z); this.air = new THREE.Vector3(); this.state = 'ground'; this.t = 0; this.birds = []; for (let i = 0; i < n; i++) this.birds.push(new Bird(kind, x + rand(-1.5, 1.5), z + rand(-1.5, 1.5), this)); }
  dispose() { for (const b of this.birds) b.dispose(); }
  scare() {
    if (this.state === 'fly') return;
    this.state = 'fly'; this.t = rand(5, 9);
    const a = rand(0, Math.PI * 2); this.air.set(this.home.x + Math.sin(a) * 25, rand(9, 16), this.home.z + Math.cos(a) * 25);
    const A = G.audio; if (A && A.ready) { const v = A.vol(this.home, 40) * 0.15; if (v > 0.01) for (let i = 0; i < 6; i++) A.tone(this.kind === 'crow' ? 380 : 220, 0.05, this.kind === 'crow' ? 'square' : 'triangle', v, this.kind === 'crow' ? -150 : 0, i * 0.06); }
  }
  update(dt) {
    const P = G.player, pp = P.vehicle ? P.vehicle.pos : P.pos;
    const d = Math.hypot(pp.x - this.home.x, pp.z - this.home.z);
    if (this.state === 'ground') {
      let scared = d < (P.vehicle ? 9 : 5);
      for (const v of G.vehicles) if (Math.abs(v.speed) > 2 && Math.hypot(v.pos.x - this.home.x, v.pos.z - this.home.z) < 7) { scared = true; break; }
      for (const p of G.peds) if (Math.hypot(p.pos.x - this.home.x, p.pos.z - this.home.z) < 2.2) { scared = true; break; }
      if (scared) this.scare();
    } else {
      this.t -= dt;
      // circle around, then pick a new landing spot on open ground
      const a = performance.now() * 0.0004; this.air.x += Math.cos(a) * dt * 4; this.air.z += Math.sin(a) * dt * 4;
      if (this.t <= 0) {
        for (let k = 0; k < 8; k++) {
          const x = this.home.x + rand(-30, 30), z = this.home.z + rand(-30, 30);
          if (!G.colliders.pointBlocked(x, z) && Math.hypot(pp.x - x, pp.z - z) > 10) { this.home.set(x, 0, z); break; }
        }
        this.state = 'land';
      }
    }
    if (this.state === 'land' && this.birds.every((b) => b.state === 'ground')) this.state = 'ground';
    for (const b of this.birds) b.update(dt);
  }
}

/* ------------------------------------------------------------------ */
/* manager                                                             */
/* ------------------------------------------------------------------ */
export class Animals {
  constructor() { this.list = []; this.flocks = []; this.timer = 0; this.cap = 10; loadAnimalModels().catch(() => {}); }
  get all() { return this.list; }
  spawnNear(pp) {
    const counts = {}; for (const a of this.list) counts[a.kind] = (counts[a.kind] || 0) + 1;
    const want = { dog: Math.ceil(this.cap * 0.4), cat: Math.ceil(this.cap * 0.2), cow: Math.max(1, Math.floor(this.cap * 0.15)), bull: this.cap >= 10 ? 1 : 0, goat: Math.max(1, Math.floor(this.cap * 0.12)) };
    const R = G.roads;
    for (const kind of Object.keys(want)) {
      if ((counts[kind] || 0) >= want[kind] || this.list.length >= this.cap) continue;
      for (let tries = 0; tries < 6; tries++) {
        const a = rand(0, Math.PI * 2), d = rand(28, 70), x = pp.x + Math.sin(a) * d, z = pp.z + Math.cos(a) * d;
        if (G.colliders.pointBlocked(x, z)) continue;
        const r = R.nearestEdge(x, z, 14); if (!r) continue;
        const onRoad = r.d < r.edge.w / 2;
        if ((kind === 'cow' || kind === 'bull') ? !onRoad : onRoad) continue;
        this.list.push(new Animal(kind, x, z)); break;
      }
    }
    // bird flocks on open ground / plazas
    const maxF = Math.max(1, Math.round(this.cap / 5));
    if (this.flocks.length < maxF) for (let tries = 0; tries < 5; tries++) {
      const a = rand(0, Math.PI * 2), d = rand(20, 55), x = pp.x + Math.sin(a) * d, z = pp.z + Math.cos(a) * d;
      if (G.colliders.pointBlocked(x, z)) continue;
      this.flocks.push(new Flock(Math.random() < 0.55 ? 'crow' : 'pigeon', x, z, Math.round(rand(3, this.cap >= 10 ? 8 : 5)))); break;
    }
  }
  onHonk(pos) { for (const a of this.list) if (Math.hypot(a.pos.x - pos.x, a.pos.z - pos.z) < 14) a.onHonk(pos); for (const f of this.flocks) if (Math.hypot(f.home.x - pos.x, f.home.z - pos.z) < 18) f.scare(); }
  update(dt) {
    const P = G.player; if (!P) return;
    const pp = P.vehicle ? P.vehicle.pos : P.pos;
    this.timer -= dt; if (this.timer <= 0) { this.timer = 1.5; this.spawnNear(pp); }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const a = this.list[i];
      if (Math.hypot(a.pos.x - pp.x, a.pos.z - pp.z) > 130) { a.dispose(); this.list.splice(i, 1); continue; }
      a.update(dt);
    }
    for (let i = this.flocks.length - 1; i >= 0; i--) {
      const f = this.flocks[i];
      if (Math.hypot(f.home.x - pp.x, f.home.z - pp.z) > 120) { f.dispose(); this.flocks.splice(i, 1); continue; }
      f.update(dt);
    }
  }
  clear() { for (const a of this.list) a.dispose(); this.list.length = 0; for (const f of this.flocks) f.dispose(); this.flocks.length = 0; }
}

/** debug helper (used by the test page): place an animal in a fixed pose */
export function _testSpawn(kind, x, z, yaw, state, phase = 0, speed = 0) {
  const a = kind === 'crow' || kind === 'pigeon' ? new Bird(kind, x, z, { state: 'ground', home: new THREE.Vector3(x, 0, z), air: new THREE.Vector3() }) : new Animal(kind, x, z);
  a.yaw = yaw; if (a.setState) { a.state = state; a.phase = phase; a.speed = speed; a.sitAmt = state === 'sit' ? 1 : 0; a.lieAmt = state === 'lie' || state === 'sleep' ? 1 : 0; a.headDown = state === 'graze' ? 1 : 0; a.animate(0.016); a.sync(); }
  else { a.state = state; if (state === 'air') { a.pos.y = 1.2; a.vel.set(0, 0.6, 2); a.flap = 1; } a.animate(0.016); a.m.root.position.copy(a.pos); a.m.root.rotation.y = yaw; }
  return a;
}
