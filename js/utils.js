import * as THREE from 'three';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
export const dist = (ax, az, bx, bz) => Math.sqrt(dist2(ax, az, bx, bz));

/** Wrap an angle to [-PI, PI]. */
export function wrapAngle(a) {
  if (!Number.isFinite(a)) return 0;
  a = (a + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}
export function angleLerp(a, b, t) { return a + wrapAngle(b - a) * t; }

/** Deterministic seeded RNG (mulberry32) so the city layout is identical every run. */
export function seeded(seed) {
  let s = seed >>> 0;
  const f = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (a, b) => a + f() * (b - a);
  f.int = (a, b) => Math.floor(a + f() * (b - a + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  return f;
}

/* ------------------------------------------------------------------ */
/* Merged geometry builder for axis-aligned boxes and quads             */
/* ------------------------------------------------------------------ */
export class GeoBuilder {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.col = []; this.idx = []; this.n = 0; }

  quad(p0, p1, p2, p3, normal, uvs, color) {
    const base = this.n;
    for (const p of [p0, p1, p2, p3]) this.pos.push(p[0], p[1], p[2]);
    for (let i = 0; i < 4; i++) { this.nor.push(normal[0], normal[1], normal[2]); this.col.push(color.r, color.g, color.b); }
    for (const t of uvs) this.uv.push(t[0], t[1]);
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.n += 4;
  }

  /**
   * Axis-aligned box. opts.tile = [tileW, tileH] maps side UVs in world metres (for window textures).
   * opts.sides / opts.top / opts.bottom toggle faces.
   */
  box(cx, cy, cz, sx, sy, sz, color, opts = {}) {
    const c = color.isColor ? color : new THREE.Color(color);
    const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
    const tw = opts.tile ? opts.tile[0] : 1e9, th = opts.tile ? opts.tile[1] : 1e9;
    const vy0 = opts.vBase !== undefined ? opts.vBase : 0;
    const v0 = vy0, v1 = vy0 + (y1 - y0) / th;
    const sides = opts.sides !== false, top = opts.top !== false, bottom = opts.bottom === true;
    if (sides) {
      // +X face
      let ua = z1 / tw;
      this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [[ua, v0], [ua + (z1 - z0) / tw, v0], [ua + (z1 - z0) / tw, v1], [ua, v1]], c);
      // -X face
      ua = z0 / tw;
      this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [[ua, v0], [ua + (z1 - z0) / tw, v0], [ua + (z1 - z0) / tw, v1], [ua, v1]], c);
      // +Z face
      ua = x0 / tw;
      this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [[ua, v0], [ua + (x1 - x0) / tw, v0], [ua + (x1 - x0) / tw, v1], [ua, v1]], c);
      // -Z face
      ua = x1 / tw;
      this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [[ua, v0], [ua + (x1 - x0) / tw, v0], [ua + (x1 - x0) / tw, v1], [ua, v1]], c);
    }
    if (top) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], [[x0 / 8, z1 / 8], [x1 / 8, z1 / 8], [x1 / 8, z0 / 8], [x0 / 8, z0 / 8]], c);
    if (bottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], c);
  }

  /** Horizontal rectangle at height y with world-space UVs (scale metres per repeat). */
  flat(x0, z0, x1, z1, y, color, uvScale = 8) {
    const c = color.isColor ? color : new THREE.Color(color);
    this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0],
      [[x0 / uvScale, z1 / uvScale], [x1 / uvScale, z1 / uvScale], [x1 / uvScale, z0 / uvScale], [x0 / uvScale, z0 / uvScale]], c);
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.n > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

/* ------------------------------------------------------------------ */
/* Bake: merge every mesh in a group into one mesh per material         */
/* ------------------------------------------------------------------ */
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const BAKE_VC = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.05 });
/**
 * Merge a group's meshes to cut draw calls. Plain coloured meshes are merged into ONE vertex-coloured mesh;
 * textured / transparent / glowing ones are merged per material. Meshes with userData.keep stay separate.
 */
export function bake(group, { castShadow = true, receiveShadow = true } = {}) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const byMat = new Map(), vc = [];
  const toRemove = [];
  group.traverse((o) => {
    if (!o.isMesh || o.userData.keep || o.isInstancedMesh) return;
    const mt = o.material;
    const plain = mt.isMeshStandardMaterial && !mt.map && !mt.transparent && !mt.vertexColors && mt.side === THREE.FrontSide && !(mt.emissive && (mt.emissive.r + mt.emissive.g + mt.emissive.b) > 0 && mt.emissiveIntensity > 0) && !mt.userData.noMerge;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (plain) {
      const n = g.attributes.position.count, c = mt.color, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      vc.push(g);
    } else {
      if (!byMat.has(mt)) byMat.set(mt, []);
      byMat.get(mt).push(g);
    }
    toRemove.push(o);
  });
  for (const o of toRemove) o.parent.remove(o);
  const addMesh = (geo, m) => { const mesh = new THREE.Mesh(geo, m); mesh.castShadow = castShadow; mesh.receiveShadow = receiveShadow; group.add(mesh); };
  if (vc.length) addMesh(mergeGeometries(vc, false), BAKE_VC);
  for (const [mt, geos] of byMat) { for (const g of geos) if (g.attributes.color) g.deleteAttribute('color'); addMesh(mergeGeometries(geos, false), mt); }
  return group;
}

/* ------------------------------------------------------------------ */
/* Material cache                                                       */
/* ------------------------------------------------------------------ */
const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.0, ...opts });
  matCache.set(key, m);
  return m;
}

/** Simple helper that adds a box mesh to a parent. */
export function boxMesh(parent, w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(sharedBox(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}
const boxCache = new Map();
export function sharedBox(w, h, d) {
  const k = `${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`;
  if (!boxCache.has(k)) boxCache.set(k, new THREE.BoxGeometry(w, h, d));
  return boxCache.get(k);
}
export function cylMesh(parent, rt, rb, h, seg, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** Text sprite-ish plane texture */
export function textTexture(text, { w = 512, h = 128, bg = '#1d3557', fg = '#ffffff', font = 'bold 64px Arial', border = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  if (border) { x.strokeStyle = border; x.lineWidth = 8; x.strokeRect(4, 4, w - 8, h - 8); }
  x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
