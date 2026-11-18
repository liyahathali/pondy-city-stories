// Roadside food & street stalls (pani puri cart, bajji, tender coconut, sugarcane juice, flowers,
// fruit, roasted corn). Each stall has a vendor who calls out in Tamil; press E to buy.
import * as THREE from 'three';
import { G } from './state.js';
import { mat, boxMesh, cylMesh, bake, seeded, textTexture } from './utils.js';

const rng = seeded(2024);

export const SHOP_TYPES = {
  pani:      { price: 30, heal: 25, ta: 'பானி பூரி', en: 'Pani puri', call: 'vendorPani' },
  bajji:     { price: 20, heal: 20, ta: 'பஜ்ஜி / போண்டா', en: 'Bajji & bonda', call: 'vendorBajji' },
  coconut:   { price: 40, heal: 35, ta: 'இளநீர்', en: 'Tender coconut', call: 'vendorCoconut' },
  sugarcane: { price: 25, heal: 25, ta: 'கரும்புச் சாறு', en: 'Sugarcane juice', call: 'vendorSugarcane' },
  flowers:   { price: 20, heal: 0,  ta: 'மல்லிகைப் பூ', en: 'Jasmine flowers', call: 'vendorFlowers' },
  fruits:    { price: 30, heal: 20, ta: 'பழங்கள்', en: 'Fruits', call: 'vendorFruits' },
  corn:      { price: 20, heal: 15, ta: 'சுட்ட சோளம்', en: 'Roasted corn', call: 'vendorCorn' },
  sundal:    { price: 15, heal: 15, ta: 'சுண்டல்', en: 'Sundal', call: 'vendorCart' },
  tea:       { price: 10, heal: 30, ta: 'டீ / காபி', en: 'Tea & coffee', call: 'vendorTea' },
};

const BAND = [0xe8452c, 0xf6b21b, 0x3aa845, 0x2c7fd1, 0xf06a2a];

/** Large wooden spoked cart wheel (axis along X). */
function spokedWheel(parent, r, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = Math.PI / 2; parent.add(g);
  const wood = mat(0x7a4b2a, { roughness: 0.9 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 6, 20), wood); g.add(rim);
  const iron = new THREE.Mesh(new THREE.TorusGeometry(r + 0.03, 0.015, 4, 20), mat(0x333333, { metalness: 0.6 })); g.add(iron);
  for (let i = 0; i < 10; i++) { const s = boxMesh(g, 0.025, r * 2, 0.025, wood, 0, 0, 0); s.rotation.z = (i / 10) * Math.PI; }
  cylMesh(g, 0.07, 0.07, 0.12, 8, wood, 0, 0, 0).rotation.x = Math.PI / 2;
  return g;
}
function stripedPole(parent, x, y0, h, z, r = 0.05) {
  const n = Math.round(h / 0.18);
  for (let i = 0; i < n; i++) cylMesh(parent, r, r, h / n, 8, mat(BAND[i % BAND.length], { roughness: 0.6 }), x, y0 + (i + 0.5) * (h / n), z);
}
function scallopRoof(parent, w, d, y) {
  boxMesh(parent, w + 0.3, 0.05, d + 0.3, mat(0x8d5a3c, { roughness: 1 }), 0, y, 0);        // rusty tin sheet
  boxMesh(parent, w + 0.25, 0.04, d + 0.25, mat(0xb07a52, { roughness: 1 }), 0, y + 0.06, 0);
  const tri = new THREE.ConeGeometry(0.09, 0.14, 3);
  const cols = [0xd84315, 0xf9a825];
  for (const [len, axis, off] of [[w + 0.3, 'x', (d + 0.3) / 2], [w + 0.3, 'x', -(d + 0.3) / 2], [d + 0.3, 'z', (w + 0.3) / 2], [d + 0.3, 'z', -(w + 0.3) / 2]]) {
    const n = Math.floor(len / 0.18);
    for (let i = 0; i < n; i++) {
      const t = new THREE.Mesh(tri, mat(cols[i % 2])); t.rotation.x = Math.PI;
      const p = -len / 2 + (i + 0.5) * (len / n);
      if (axis === 'x') t.position.set(p, y - 0.09, off); else t.position.set(off, y - 0.09, p);
      parent.add(t);
    }
  }
}
const glassM = () => new THREE.MeshStandardMaterial({ color: 0xdff3f7, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1, depthWrite: false });
function cluster(parent, n, color, x, y, z, sx, sz, r = 0.05) {
  const g = new THREE.SphereGeometry(r, 7, 5), m = mat(color, { roughness: 0.7 });
  for (let i = 0; i < n; i++) { const s = new THREE.Mesh(g, m); s.position.set(x + (rng() - 0.5) * sx, y + rng() * r * 2, z + (rng() - 0.5) * sz); parent.add(s); }
}
function sign(parent, ta, en, w, y, z, bg) {
  const tx = textTexture(`${ta}  •  ${en}`, { w: 1024, h: 128, bg, fg: '#fff', font: 'bold 54px "Nirmala UI", "Latha", "Noto Sans Tamil", Arial' });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 8), new THREE.MeshStandardMaterial({ map: tx, emissiveMap: tx, emissive: 0xffffff, emissiveIntensity: 0.15, side: THREE.DoubleSide }));
  m.position.set(0, y, z); m.userData.keep = true; parent.add(m);
  (G._signMats = G._signMats || []).push(m.material);
}

/** Build one stall facing local +Z (customers stand on +Z, vendor on -Z). */
export function buildStall(type, x, z, yaw) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; G.scene.add(g);
  const T = SHOP_TYPES[type];
  let w = 1.9, d = 1.2;
  if (type === 'pani') {
    // the classic Pondy beach pani-puri cart (see reference photo)
    w = 2.3; d = 1.15;
    for (const [sx, sz] of [[-0.75, 0.62], [0.75, 0.62], [-0.75, -0.62], [0.75, -0.62]]) spokedWheel(g, 0.42, sx, 0.44, sz);
    boxMesh(g, 2.2, 0.06, 1.05, mat(0x6d4326), 0, 0.72, 0);                          // wooden bed
    for (let i = 0; i < 4; i++) boxMesh(g, 2.24, 0.07, 1.09, mat(BAND[i]), 0, 0.79 + i * 0.07, 0); // painted bands
    boxMesh(g, 2.2, 0.1, 1.05, mat(0xf2ede4), 0, 1.11, 0);                            // counter
    const glass = glassM(); const gm = boxMesh(g, 2.1, 0.55, 0.95, glass, 0, 1.44, 0); gm.castShadow = false; gm.userData.keep = true;
    for (const sx of [-1.05, -0.35, 0.35, 1.05]) boxMesh(g, 0.05, 0.58, 0.05, mat(0xf2ede4), sx, 1.44, 0.48); // frame
    boxMesh(g, 2.14, 0.05, 0.99, mat(0xf2ede4), 0, 1.73, 0);
    cluster(g, 40, 0xd9a441, -0.5, 1.2, 0.1, 0.8, 0.6, 0.055);                           // puris
    cluster(g, 30, 0xe0b04f, 0.55, 1.2, 0.1, 0.7, 0.6, 0.055);
    for (let i = 0; i < 9; i++) { // water bottles on top
      const b = cylMesh(g, 0.045, 0.045, 0.3, 8, new THREE.MeshStandardMaterial({ color: 0xcfe8f3, transparent: true, opacity: 0.6, roughness: 0.1 }), -0.85 + i * 0.12, 1.91, -0.25);
      b.userData.keep = true; b.castShadow = false;
      cylMesh(g, 0.03, 0.03, 0.05, 6, mat(0x1565c0), -0.85 + i * 0.12, 2.08, -0.25);
    }
    cylMesh(g, 0.22, 0.2, 0.3, 12, mat(0x9e9e9e, { metalness: 0.7, roughness: 0.3 }), 0.7, 1.9, -0.25); // pani pot
    for (const [sx, sz] of [[-1.05, 0.48], [1.05, 0.48], [-1.05, -0.48], [1.05, -0.48]]) stripedPole(g, sx, 1.75, 0.95, sz);
    scallopRoof(g, 2.2, 1.05, 2.72);
  } else if (type === 'bajji') {
    boxMesh(g, 1.8, 0.85, 1.0, mat(0x5d4037), 0, 0.42, 0);
    boxMesh(g, 1.85, 0.05, 1.05, mat(0xbdbdbd, { metalness: 0.6 }), 0, 0.87, 0);
    const kadai = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0x1a1a1a, { metalness: 0.5 })); kadai.position.set(-0.4, 1.25, -0.1); g.add(kadai);
    cylMesh(g, 0.34, 0.34, 0.02, 14, mat(0x8a5a1a, { roughness: 0.2 }), -0.4, 1.22, -0.1);  // hot oil
    cylMesh(g, 0.25, 0.28, 0.35, 10, mat(0x37474f), -0.4, 1.05, -0.1);                      // stove
    boxMesh(g, 0.7, 0.04, 0.5, mat(0xcfd8dc, { metalness: 0.6 }), 0.45, 0.92, 0.1);
    cluster(g, 26, 0xd2691e, 0.45, 0.96, 0.1, 0.55, 0.38, 0.06);
    for (const [sx, sz] of [[-0.9, 0.5], [0.9, 0.5], [-0.9, -0.5], [0.9, -0.5]]) cylMesh(g, 0.03, 0.03, 2.3, 5, mat(0x795548), sx, 1.15, sz);
    boxMesh(g, 2.3, 0.04, 1.5, mat(0x1e88e5, { roughness: 0.9 }), 0, 2.3, 0);              // blue tarp
  } else if (type === 'coconut') {
    w = 1.8; d = 1.4;
    boxMesh(g, 1.6, 0.4, 1.1, mat(0x6d4c41), 0, 0.5, 0);
    for (const sx of [-0.6, 0.6]) spokedWheel(g, 0.3, sx * 1.2, 0.3, 0);
    const cg = new THREE.SphereGeometry(0.16, 8, 6), cm = mat(0x4f8f2a, { roughness: 0.7 });
    for (let i = 0; i < 34; i++) { const c = new THREE.Mesh(cg, cm); const a = rng() * 6.28, r = rng() * 0.55; c.position.set(Math.cos(a) * r, 0.8 + (0.55 - r) * 0.6 + rng() * 0.1, Math.sin(a) * r * 0.8); c.scale.set(1, 1.2, 1); g.add(c); }
    boxMesh(g, 0.04, 0.05, 0.4, mat(0x9e9e9e, { metalness: 0.8 }), 0.6, 0.73, 0.4).rotation.y = 0.5;     // aruval knife
    cylMesh(g, 0.03, 0.03, 2.2, 5, mat(0xdddddd), 0, 1.6, 0);
    const u = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.5, 10), mat(0xe53935)); u.position.y = 2.7; g.add(u);
  } else if (type === 'sugarcane') {
    boxMesh(g, 1.6, 0.85, 0.9, mat(0x2e7d32), 0, 0.42, 0);
    boxMesh(g, 0.7, 0.6, 0.6, mat(0x43a047, { metalness: 0.3 }), -0.35, 1.15, -0.05);            // crusher
    const wh = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 6, 16), mat(0x37474f, { metalness: 0.6 })); wh.position.set(-0.35, 1.25, 0.3); g.add(wh);
    for (let i = 0; i < 12; i++) { const s = cylMesh(g, 0.025, 0.025, 2.2, 5, mat(i % 2 ? 0x7b8f3a : 0x9a7b4f), 0.45 + (i % 4) * 0.08, 1.1, -0.35 + Math.floor(i / 4) * 0.06); s.rotation.z = 0.15; }
    for (let i = 0; i < 5; i++) cylMesh(g, 0.04, 0.035, 0.12, 8, new THREE.MeshStandardMaterial({ color: 0xc5e1a5, transparent: true, opacity: 0.8 }), 0.1 + i * 0.1, 0.92, 0.3).userData.keep = true;
    boxMesh(g, 2.0, 0.04, 1.3, mat(0xfdd835), 0, 2.25, 0);
    for (const [sx, sz] of [[-0.8, 0.45], [0.8, 0.45], [-0.8, -0.45], [0.8, -0.45]]) cylMesh(g, 0.03, 0.03, 2.25, 5, mat(0x795548), sx, 1.12, sz);
  } else if (type === 'flowers') {
    w = 1.6; d = 1.2;
    boxMesh(g, 1.4, 0.5, 0.9, mat(0x8d6e63), 0, 0.25, 0);
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.18, 12), mat(0xa1887f)); b.position.set(-0.45 + (i % 2) * 0.9, 0.6, -0.2 + Math.floor(i / 2) * 0.4); g.add(b); }
    const jas = new THREE.TorusGeometry(0.17, 0.035, 5, 14);
    for (let i = 0; i < 8; i++) { const t = new THREE.Mesh(jas, mat(i % 3 === 2 ? 0xff9800 : 0xffffff, { emissive: i % 3 === 2 ? 0x331a00 : 0x222222 })); t.rotation.x = Math.PI / 2; t.position.set(-0.5 + (i % 4) * 0.33, 0.72 + Math.floor(i / 4) * 0.05, 0.2 - Math.floor(i / 4) * 0.4); g.add(t); }
    cluster(g, 30, 0xffa000, 0.45, 0.72, -0.2, 0.4, 0.3, 0.04);   // marigolds
    cluster(g, 20, 0xe91e63, -0.45, 0.72, -0.2, 0.4, 0.3, 0.035); // roses
    const u = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.4, 10), mat(0x7b1fa2)); u.position.y = 2.2; g.add(u);
    cylMesh(g, 0.025, 0.025, 2.0, 5, mat(0xdddddd), 0, 1.1, 0);
  } else if (type === 'fruits') {
    for (const sx of [-0.7, 0.7]) spokedWheel(g, 0.33, sx * 1.15, 0.33, 0);
    boxMesh(g, 1.9, 0.12, 1.1, mat(0x5d4037), 0, 0.7, 0);
    const bg = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 5), bm = mat(0xf4d03f);
    for (let i = 0; i < 40; i++) { const b = new THREE.Mesh(bg, bm); b.position.set(-0.8 + rng() * 0.7, 0.85 + rng() * 0.15, -0.4 + rng() * 0.8); b.rotation.z = 1.2 + rng() * 0.6; g.add(b); }
    cluster(g, 20, 0xf39c12, 0.3, 0.84, 0, 0.5, 0.8, 0.07);    // mangoes
    cluster(g, 14, 0xc0392b, 0.75, 0.84, 0, 0.3, 0.8, 0.065);  // apples
    cylMesh(g, 0.03, 0.03, 1.6, 5, mat(0xdddddd), 0, 1.5, 0);
    const u = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.45, 10), mat(0x00897b)); u.position.y = 2.35; g.add(u);
  } else if (type === 'corn') {
    w = 1.3; d = 1.0;
    boxMesh(g, 1.1, 0.75, 0.75, mat(0x455a64, { metalness: 0.4 }), 0, 0.38, 0);
    boxMesh(g, 1.0, 0.08, 0.6, mat(0x212121), 0, 0.8, 0);
    cluster(g, 10, 0xff5722, 0, 0.82, 0, 0.8, 0.4, 0.05);                         // embers
    for (let i = 0; i < 6; i++) { const c = cylMesh(g, 0.035, 0.03, 0.22, 7, mat(0xe6b422), -0.35 + i * 0.14, 0.9, 0.05); c.rotation.z = Math.PI / 2; }
    for (let i = 0; i < 8; i++) { const c = cylMesh(g, 0.035, 0.03, 0.22, 7, mat(0xa5c95a), -0.4 + i * 0.11, 0.86, -0.3); c.rotation.z = Math.PI / 2; }
  } else if (type === 'sundal') {
    for (const sx of [-0.6, 0.6]) spokedWheel(g, 0.3, sx * 1.1, 0.3, 0);
    boxMesh(g, 1.4, 0.55, 0.9, mat(0xff7043), 0, 0.75, 0); boxMesh(g, 1.5, 0.05, 1.0, mat(0xffffff), 0, 1.05, 0);
    for (let i = 0; i < 3; i++) { cylMesh(g, 0.2, 0.18, 0.18, 12, mat(0xb0bec5, { metalness: 0.7 }), -0.45 + i * 0.45, 1.15, 0); cluster(g, 10, [0xc8a165, 0xe8d18a, 0x7cb342][i], -0.45 + i * 0.45, 1.24, 0, 0.25, 0.25, 0.03); }
    cylMesh(g, 0.03, 0.03, 1.6, 5, mat(0xdddddd), 0, 1.9, 0);
    const u = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.45, 10), mat(0xff7043)); u.position.y = 2.75; g.add(u);
  }
  if (type !== 'tea' && type !== 'corn') sign(g, T.ta, T.en, Math.min(2.2, w), type === 'pani' ? 2.95 : type === 'flowers' ? 1.0 : 1.85, d / 2 + 0.12, '#7b1fa2');
  g.traverse((o) => { if (o.isMesh && !o.userData.keep) o.castShadow = true; });
  bake(g);
  // world-space collider (stalls are axis-aligned or rotated by 90°)
  const rot = Math.abs(Math.sin(yaw)) > 0.5;
  G.colliders.addC(x, z, rot ? d + 0.2 : w + 0.2, rot ? w + 0.2 : d + 0.2, 1.4, 'stall');
  // vendor stands behind (local -Z), customers on +Z
  const bx = -Math.sin(yaw) * (d / 2 + 0.45), bz = -Math.cos(yaw) * (d / 2 + 0.45);
  const shop = { type, x, z, yaw, vendor: { x: x + bx, z: z + bz, yaw }, front: { x: x + Math.sin(yaw) * (d / 2 + 0.8), z: z + Math.cos(yaw) * (d / 2 + 0.8) } };
  return shop;
}

/** Place stalls along the promenade, busy city streets, bus stand, beaches and Villianur. */
export function buildStalls(w) {
  const shops = [];
  const add = (type, x, z, yaw) => { if (G.colliders.pointBlocked(x, z, 0.5)) return; shops.push(buildStall(type, x, z, yaw)); };
  // Promenade (facing the walkers; vendor stands on the sea side)
  const prom = [['pani', -20], ['sundal', -60], ['corn', 15], ['coconut', 45], ['pani', 85], ['fruits', 120], ['sundal', 150], ['bajji', 185], ['pani', -230], ['corn', -270], ['coconut', -320], ['sundal', -380], ['flowers', 250], ['sugarcane', 220]];
  for (const [type, z] of prom) add(type, 509.2, z, -Math.PI / 2);
  // City sidewalks: busy shopping roads get several stalls each
  const busy = [[10, 'MG'], [170, 'Mission'], [-150, 'Anna'], [-320, 'Maraimalai']];
  const types = ['bajji', 'coconut', 'sugarcane', 'flowers', 'fruits', 'pani', 'corn', 'fruits', 'coconut', 'flowers'];
  let k = 0;
  for (const r of G.roads.sidewalkRects) {
    const vertical = r[3] - r[1] > r[2] - r[0];
    const cx = (r[0] + r[2]) / 2, cz = (r[1] + r[3]) / 2;
    const onBusyNS = vertical && busy.some(([bx]) => Math.abs(Math.abs(cx - bx) - (bx === 10 || bx === -320 ? 8.5 : bx === 170 || bx === -150 ? 7.5 : 0)) < 1.2);
    const onNehru = !vertical && Math.abs(Math.abs(cz + 120) - 7.5) < 1.2 && cx < 240;
    if (!onBusyNS && !onNehru) continue;
    if (rng() < 0.72 || k >= 22) continue;
    const len = vertical ? r[3] - r[1] : r[2] - r[0];
    if (len < 20) continue;
    const t = 6 + rng() * (len - 12);
    const type = types[k++ % types.length];
    if (vertical) { const roadSide = cx > busy.find(([bx]) => Math.abs(cx - bx) < 12)[0] ? -1 : 1; add(type, cx + roadSide * 0.2, r[1] + t, roadSide > 0 ? Math.PI / 2 : -Math.PI / 2); }
    else { const roadSide = cz > -120 ? -1 : 1; add(type, cx - (r[2] - r[0]) / 2 + t, cz + roadSide * 0.2, roadSide > 0 ? 0 : Math.PI); }
  }
  // Bus stand, railway station, Paradise Beach, Villianur temple, Botanical Garden gate
  add('bajji', -336, -185, Math.PI); add('coconut', -387, -130, 0); add('fruits', -334, -172, -Math.PI / 2);
  add('coconut', 150, 309.5, 0); add('pani', 230, 309.5, 0);
  add('coconut', 495, 1290, -Math.PI / 2); add('pani', 497, 1330, -Math.PI / 2); add('corn', 495, 1370, -Math.PI / 2);
  add('flowers', -1093.5, -125, Math.PI / 2); add('flowers', -1093.5, -95, Math.PI / 2); add('coconut', -1093.5, -60, Math.PI / 2);
  add('sugarcane', 7, 470, Math.PI / 2);
  // tea stalls built earlier become shops too
  for (const s of w.teaStalls) shops.push({ type: 'tea', x: s.x, z: s.z, yaw: 0, vendor: { x: s.x, z: s.z - 1.25, yaw: 0 }, front: { x: s.x, z: s.z + 1.6 } });
  w.shops = shops;
  return shops;
}
