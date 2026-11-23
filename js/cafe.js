// Beach café on Goubert Avenue (white colonial block, red-tiled verandah over the promenade, arched upper
// floor with an orange-railed roof terrace and a water tank), seated customers, staff, plus beach vendors:
// ice-cream push cart, raw-mango cart, thatched seafood fry stall, and roaming balloon / candy-floss / drum sellers.
import * as THREE from 'three';
import { G } from './state.js';
import { bake, seeded, textTexture } from './utils.js';
import { SHOP_TYPES } from './stalls.js';

const rng = seeded(777);
export const CAFE = { x: 522, z: -72, x0: 514, x1: 530, z0: -85, z1: -59, floor: 0.12, seatY: -0.36 };

SHOP_TYPES.coffee = { price: 60, heal: 30, ta: 'கஃபே காபி', en: 'Café coffee', call: 'vendorTea' };
SHOP_TYPES.icecream = { price: 30, heal: 15, ta: 'ஐஸ்க்ரீம்', en: 'Ice cream', call: 'vendorCart' };
SHOP_TYPES.mango = { price: 20, heal: 15, ta: 'மாங்காய்', en: 'Raw mango slices', call: 'vendorFruits' };
SHOP_TYPES.seafood = { price: 80, heal: 45, ta: 'இறால் வறுவல்', en: 'Prawn & fish fry', call: 'vendorBajji' };

/* ---------------- textures ---------------- */
function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const limewash = () => canvasTex(256, 256, (x, w, h) => {   // white lime plaster with soft grime near the bottom
  x.fillStyle = '#f4f2ec'; x.fillRect(0, 0, w, h);
  for (let k = 0; k < 2500; k++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.06)'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  const g = x.createLinearGradient(0, h * 0.75, 0, h); g.addColorStop(0, 'rgba(120,110,90,0)'); g.addColorStop(1, 'rgba(120,110,90,0.25)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
});
const roofTiles = () => canvasTex(256, 256, (x, w, h) => {   // Mangalore tiles: rows of curved red-orange tiles
  x.fillStyle = '#b8462c'; x.fillRect(0, 0, w, h);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const g = x.createLinearGradient(c * 32, 0, c * 32 + 32, 0); g.addColorStop(0, '#8e2f1c'); g.addColorStop(0.5, '#d4603c'); g.addColorStop(1, '#8e2f1c');
    x.fillStyle = g; x.fillRect(c * 32 + 1, r * 32, 30, 30); x.fillStyle = 'rgba(40,10,5,0.45)'; x.fillRect(c * 32, r * 32 + 27, 32, 5);
  }
  for (let k = 0; k < 1500; k++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,220,180,0.06)'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
});
const floorTiles = () => canvasTex(256, 256, (x, w, h) => {   // terracotta / cream chequer
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { x.fillStyle = (r + c) % 2 ? '#b8643e' : '#e9dcc4'; x.fillRect(c * 64, r * 64, 64, 64); }
  x.strokeStyle = 'rgba(60,40,30,0.35)'; x.lineWidth = 2; for (let i = 0; i <= 256; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
  for (let k = 0; k < 2000; k++) { x.fillStyle = 'rgba(0,0,0,0.05)'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
});
const wood = (base = '#7a4a2a') => canvasTex(128, 128, (x, w, h) => {
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.12})`; x.lineWidth = 1 + Math.random() * 2; x.beginPath(); const y = Math.random() * h; x.moveTo(0, y); x.bezierCurveTo(w * 0.3, y + 4, w * 0.6, y - 4, w, y + 2); x.stroke(); }
});
const thatch = () => canvasTex(256, 256, (x, w, h) => {   // woven coconut-frond thatch
  x.fillStyle = '#9b7a4a'; x.fillRect(0, 0, w, h);
  for (let r = 0; r < h; r += 8) for (let c = 0; c < w; c += 8) { x.fillStyle = (r / 8 + c / 8) % 2 ? '#b8955c' : '#7c5d34'; x.fillRect(c, r, 8, 4); x.fillRect(c + ((r / 8) % 2 ? 4 : 0), r + 4, 4, 4); }
  for (let k = 0; k < 400; k++) { x.strokeStyle = 'rgba(60,40,20,0.4)'; x.beginPath(); const a = Math.random() * w, b = Math.random() * h; x.moveTo(a, b); x.lineTo(a + 12, b + 3); x.stroke(); }
});
function boardTex(lines, { w = 512, h = 256, bg = '#2b2118', fg = '#f3ead8', title, titleCol = '#ffd36b', font = 'Georgia' } = {}) {
  return canvasTex(w, h, (x) => {
    x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = '#8a6a44'; x.lineWidth = 10; x.strokeRect(5, 5, w - 10, h - 10);
    let y = 34; if (title) { x.fillStyle = titleCol; x.font = `bold 34px ${font}`; x.textAlign = 'center'; x.fillText(title, w / 2, 44); y = 84; }
    x.textAlign = 'left'; x.font = `22px ${font}`; x.fillStyle = fg;
    for (const [a, b] of lines) { x.fillText(a, 30, y); if (b) { x.textAlign = 'right'; x.fillText(b, w - 30, y); x.textAlign = 'left'; } y += 30; }
  }, false);
}

/* ---------------- geometry helpers ---------------- */
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
function put(parent, geo, m, x, y, z, ry = 0, rx = 0, rz = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); parent.add(o); return o; }
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
/** A wall of length `len` along local +X, height h, thickness t, with rectangular or arched openings. */
function wallGeo(len, h, t, holes = []) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(len, 0); s.lineTo(len, h); s.lineTo(0, h); s.closePath();
  for (const o of holes) {
    const p = new THREE.Path(), x0 = o.c - o.w / 2, x1 = o.c + o.w / 2, y0 = o.y0 ?? 0, y1 = y0 + o.h;
    p.moveTo(x0, y0); p.lineTo(x1, y0);
    if (o.arch) { p.lineTo(x1, y1 - o.w / 2); p.absarc(o.c, y1 - o.w / 2, o.w / 2, 0, Math.PI, false); }
    else { p.lineTo(x1, y1); p.lineTo(x0, y1); }
    p.closePath(); s.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, -t / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3);
  return g;
}

export function buildCafe(w) {
  const { scene, col } = w, walk = w.walk;
  const g = new THREE.Group(); g.position.set(CAFE.x, 0, CAFE.z); scene.add(g);
  const wallM = M(0xffffff, { map: limewash(), roughness: 0.9 }), roofM = M(0xffffff, { map: roofTiles(), roughness: 0.75 });
  const floorM = M(0xffffff, { map: floorTiles(), roughness: 0.6 }); floorM.map.repeat.set(8, 13);
  const woodM = M(0xffffff, { map: wood() }), shutterM = M(0xffffff, { map: wood('#6b3b1f') }), orangeM = M(0xffffff, { map: wood('#d9822b'), roughness: 0.7 });
  const darkM = M(0x2a2420), metalM = M(0xb9bcbf, { metalness: 0.8, roughness: 0.3 }), potM = M(0xa4552e), leafM = M(0x3f7a35, { flatShading: true });
  const H = 3.8, T = 0.3, FX = -8, EX = 8, NZ = -13, SZ = 13;
  const wx = (u) => u - 13;   // wall local u (0..26) -> z

  // --- floor slab, walls with doors / shuttered windows / arches
  put(g, B(16.2, 0.24, 26.2), floorM, 0, 0.0, 0);
  // promenade facade (west): main door, side door, 4 shuttered windows
  const westHoles = [{ c: 20, w: 2.6, h: 2.8 }, { c: 4.2, w: 1.4, h: 2.4 }, ...[8, 11.5, 15.2, 24].map((c) => ({ c, w: 1.5, h: 1.6, y0: 0.95 }))];
  const west = put(g, wallGeo(26, H, T, westHoles), wallM, FX, 0, 0, Math.PI / 2); west.position.z = SZ;
  // sea side (east): tall arches looking out over the rocks
  const east = put(g, wallGeo(26, H, T, [3, 7.5, 12, 16.5, 21].map((c) => ({ c, w: 2.2, h: 3.0, arch: true, y0: 0.6 }))), wallM, EX, 0, 0, -Math.PI / 2); east.position.z = NZ;
  put(g, wallGeo(16, H, T, [{ c: 4, w: 1.5, h: 1.6, y0: 0.95 }, { c: 12, w: 1.5, h: 1.6, y0: 0.95 }]), wallM, FX, 0, NZ, 0);
  put(g, wallGeo(16, H, T, [{ c: 8, w: 2.2, h: 3.0, arch: true, y0: 0.4 }]), wallM, EX, 0, SZ, Math.PI);
  // colliders along the walls with gaps for the doors
  col.add(CAFE.x0 - 0.2, CAFE.z0, CAFE.x0 + 0.2, CAFE.z + wx(18.6), 4, 'wall'); col.add(CAFE.x0 - 0.2, CAFE.z + wx(21.4), CAFE.x0 + 0.2, CAFE.z1, 4, 'wall');
  col.add(CAFE.x1 - 0.2, CAFE.z0, CAFE.x1 + 0.2, CAFE.z1, 4, 'wall');
  col.add(CAFE.x0, CAFE.z0 - 0.2, CAFE.x1, CAFE.z0 + 0.2, 4, 'wall'); col.add(CAFE.x0, CAFE.z1 - 0.2, CAFE.x1, CAFE.z1 + 0.2, 4, 'wall');
  walk.add(CAFE.x0, CAFE.z0, CAFE.x1, CAFE.z1, CAFE.floor);
  // wooden shutters (half open) + frames on the west windows, door frames
  for (const c of [8, 11.5, 15.2, 24]) {
    const z = wx(c);
    for (const sd of [-1, 1]) { const sh = put(g, B(0.05, 1.6, 0.75), shutterM, FX - 0.32, 1.75, z + sd * 0.75, sd * -0.9); sh.position.x -= 0.25; sh.position.z += sd * 0.2; }
    put(g, B(0.08, 0.1, 1.7), woodM, FX - 0.18, 0.92, z); put(g, B(0.08, 0.1, 1.7), woodM, FX - 0.18, 2.58, z);
  }
  for (const [c, wdt, hh] of [[20, 2.6, 2.8], [4.2, 1.4, 2.4]]) { const z = wx(c); put(g, B(0.12, 0.14, wdt + 0.2), woodM, FX - 0.15, hh, z); for (const sd of [-1, 1]) put(g, B(0.12, hh, 0.1), woodM, FX - 0.15, hh / 2, z + sd * wdt / 2); }
  // roof slab and parapets
  put(g, B(16.4, 0.3, 26.4), wallM, 0, H + 0.15, 0);
  for (const [px, pz, sx, sz] of [[0, NZ, 16.4, 0.25], [0, SZ, 16.4, 0.25], [FX, 0, 0.25, 26.4], [EX, 0, 0.25, 26.4]]) put(g, B(sx, 0.55, sz), wallM, px, H + 0.55, pz);
  // red Mangalore-tile verandah roof sloping over the promenade, on carved wooden brackets
  const vr = put(g, B(3.4, 0.12, 26.6), roofM, FX - 1.55, H - 0.55, 0, 0, 0, 0.32); vr.material.map.repeat.set(3, 18);
  put(g, B(0.15, 0.25, 26.6), M(0x7a2b1b), FX - 3.2, H - 1.1, 0);
  for (let z = -12; z <= 12; z += 3) { put(g, B(0.1, 0.1, 0.1).translate(0, 0, 0), woodM, FX - 0.4, H - 0.9, z); const br = put(g, B(1.6, 0.12, 0.12), woodM, FX - 0.9, H - 1.2, z, 0, 0, 0.55); br.userData.b = 1; }
  // upper floor on the sea side with arched openings, its own parapet and terrace
  const U0 = H + 0.3, UH = 3.2, ux0 = 1, ux1 = EX, uz0 = -9, uz1 = 5;
  put(g, wallGeo(uz1 - uz0, UH, T, [2, 5.5, 9, 12.5].map((c) => ({ c, w: 2.0, h: 2.6, arch: true }))), wallM, ux0, U0, uz1, Math.PI / 2);
  put(g, wallGeo(uz1 - uz0, UH, T, [3.5, 10.5].map((c) => ({ c, w: 2.0, h: 2.6, arch: true }))), wallM, ux1, U0, uz0, -Math.PI / 2);
  put(g, wallGeo(ux1 - ux0, UH, T, [{ c: 3.5, w: 2.0, h: 2.6, arch: true }]), wallM, ux0, U0, uz0, 0);
  put(g, wallGeo(ux1 - ux0, UH, T, [{ c: 3.5, w: 2.0, h: 2.6, arch: true }]), wallM, ux1, U0, uz1, Math.PI);
  put(g, B(ux1 - ux0 + 0.4, 0.3, uz1 - uz0 + 0.4), wallM, (ux0 + ux1) / 2, U0 + UH + 0.15, (uz0 + uz1) / 2);
  for (const [px, pz, sx, sz] of [[(ux0 + ux1) / 2, uz0, 7.4, 0.25], [(ux0 + ux1) / 2, uz1, 7.4, 0.25], [ux0, (uz0 + uz1) / 2, 0.25, 14.4], [ux1, (uz0 + uz1) / 2, 0.25, 14.4]]) put(g, B(sx, 0.5, sz), wallM, px, U0 + UH + 0.5, pz);
  put(g, new THREE.CylinderGeometry(0.75, 0.75, 1.4, 16), M(0x161616, { roughness: 0.5 }), 5.5, U0 + UH + 1.0, -6.5);   // black water tank
  put(g, new THREE.CylinderGeometry(0.55, 0.55, 1.1, 14), M(0x161616, { roughness: 0.5 }), 6.8, U0 + UH + 0.85, -4.8);
  // café name on the upper parapet, facing the promenade
  const nameT = textTexture('Le Café', { w: 512, h: 128, bg: '#f4f2ec', fg: '#2a2420', font: 'bold 70px Georgia' });
  put(g, new THREE.PlaneGeometry(3.4, 0.85), M(0xffffff, { map: nameT, roughness: 0.8 }), ux0 - 0.17, U0 + UH - 0.5, -2, -Math.PI / 2);
  put(g, new THREE.PlaneGeometry(3.4, 0.85), M(0xffffff, { map: nameT, roughness: 0.8 }), 4.5, U0 + UH - 0.5, uz0 - 0.17, Math.PI);
  // orange wooden terrace railings, umbrellas and tables on the lower roof and on top
  const railRun = (x0, z0, x1, z1, y) => {
    const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(z1 - z0, x1 - x0), n = Math.round(len / 0.35);
    const top = put(g, B(len, 0.08, 0.1), orangeM, (x0 + x1) / 2, y + 1.0, (z0 + z1) / 2, -a); top.userData.r = 1;
    put(g, B(len, 0.06, 0.08), orangeM, (x0 + x1) / 2, y + 0.15, (z0 + z1) / 2, -a);
    for (let i = 0; i <= n; i++) { const t = i / n; put(g, B(0.06, 0.9, 0.06), orangeM, x0 + (x1 - x0) * t, y + 0.55, z0 + (z1 - z0) * t); }
  };
  const RY = H + 0.3;
  railRun(FX + 0.3, NZ + 0.3, EX - 0.3, NZ + 0.3, RY); railRun(FX + 0.3, SZ - 0.3, EX - 0.3, SZ - 0.3, RY); railRun(FX + 0.3, NZ + 0.3, FX + 0.3, SZ - 0.3, RY);
  const RY2 = U0 + UH + 0.3; railRun(ux0 + 0.3, uz0 + 0.3, ux1 - 0.3, uz0 + 0.3, RY2); railRun(ux0 + 0.3, uz1 - 0.3, ux1 - 0.3, uz1 - 0.3, RY2);
  const umb = (x, y, z, c) => { put(g, new THREE.CylinderGeometry(0.03, 0.03, 2.3, 6), metalM, x, y + 1.15, z); put(g, new THREE.ConeGeometry(1.4, 0.55, 8, 1, true), M(c, { side: THREE.DoubleSide, roughness: 0.9 }), x, y + 2.35, z); };
  for (const [x, z, c] of [[-5, -9, 0xe8e2d0], [-5, 9, 0xd2452f], [-1.5, 9.5, 0xe8e2d0], [-5.5, 0, 0xd2452f]]) { umb(x, RY, z, c); terraceTable(g, x, RY, z, woodM, orangeM); }
  umb(3, RY2, -1, 0xe8e2d0); terraceTable(g, 3, RY2, -1, woodM, orangeM);
  // entrance: paved threshold through the sea-wall gap, coir doormat, open teak door leaves, ENTRANCE sign
  { const dz = wx(20);
    put(g, B(2.6, 0.1, 3.4), M(0xcfc8ba, { roughness: 0.9 }), FX - 1.25, 0.06, dz);
    put(g, B(1.0, 0.02, 1.6), M(0x8a6a3a, { roughness: 1 }), FX - 0.7, 0.12, dz);
    for (const sd of [-1, 1]) { const d = put(g, B(0.06, 2.6, 1.25), shutterM, FX + 0.55, 1.3, dz + sd * 1.25, sd * 1.25); d.position.x += 0.1; }
    const enT = textTexture('ENTRANCE  →  CAFÉ', { w: 512, h: 96, bg: '#2a2420', fg: '#ffd36b', font: 'bold 46px Georgia' });
    put(g, new THREE.PlaneGeometry(2.2, 0.42), M(0xffffff, { map: enT }), FX - 0.2, 3.05, dz, -Math.PI / 2); }
  // potted plants along the facade, menu board, notice board, round blue lounge sign
  for (const z of [-11, -6.5, -3.3, 0.2, 3.4, 9.3, 12]) { put(g, new THREE.CylinderGeometry(0.28, 0.2, 0.45, 10), potM, FX - 0.65, 0.22, z); const l = put(g, new THREE.IcosahedronGeometry(0.42, 1), leafM, FX - 0.65, 0.75, z); l.scale.set(1, 0.85, 1); }
  put(g, B(0.08, 1.2, 0.8), M(0xffffff, { map: boardTex([['Filter coffee', '40'], ['Masala tea', '30'], ['Cold coffee', '90'], ['Croissant', '70'], ['Crêpe', '120'], ['Pizza', '220']], { w: 256, h: 384, title: 'MENU' }) }), FX - 0.2, 1.65, wx(17.5), -Math.PI / 2);
  put(g, B(0.06, 0.9, 0.7), M(0xf0c419), FX - 0.2, 1.8, wx(13.3), 0);
  const loungeT = canvasTex(256, 256, (x) => { x.fillStyle = '#1f5fbf'; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = 'bold 34px Arial'; x.fillText('COFFEE', 128, 105); x.fillText('LOUNGE', 128, 145); x.font = 'bold 24px Arial'; x.fillText('OPEN ALL DAY', 128, 190); }, false);
  put(g, new THREE.CircleGeometry(0.55, 24), M(0xffffff, { map: loungeT, transparent: true }), FX - 0.2, 2.0, wx(22.6), -Math.PI / 2);

  // --- interior: service counter with coffee machine and pastry case, menu board, tables + chairs, fans, lights
  const IY = 0.12;
  put(g, B(7, 1.05, 0.7), woodM, 1.5, IY + 0.52, NZ + 1.6); put(g, B(7.1, 0.06, 0.8), M(0x3a3330, { roughness: 0.3 }), 1.5, IY + 1.08, NZ + 1.6);
  col.add(CAFE.x + 1.5 - 3.5, CAFE.z + NZ + 1.2, CAFE.x + 1.5 + 3.5, CAFE.z + NZ + 2.0, 1.2, 'counter');
  put(g, B(0.7, 0.55, 0.5), metalM, -0.6, IY + 1.38, NZ + 1.5); put(g, B(0.5, 0.12, 0.3), M(0x111111), -0.6, IY + 1.2, NZ + 1.85);
  put(g, B(1.6, 0.5, 0.6), M(0xdfeff2, { transparent: true, opacity: 0.35, roughness: 0.05 }), 3.2, IY + 1.36, NZ + 1.6);
  for (let i = 0; i < 6; i++) put(g, new THREE.SphereGeometry(0.09, 8, 6), M(0xc98a3e), 2.6 + i * 0.24, IY + 1.2, NZ + 1.6);
  put(g, B(3.2, 1.2, 0.05), M(0xffffff, { map: boardTex([['Espresso', '60'], ['Cappuccino', '110'], ['Filter coffee', '40'], ['Iced latte', '140'], ['Lemon soda', '50']], { title: 'COFFEE & BAKES' }) }), 1.5, IY + 2.5, NZ + 0.18);
  put(g, B(1.2, 1.9, 0.5), woodM, 4.8, IY + 0.95, NZ + 0.45);   // back shelf
  const glow = M(0xfff1d6, { emissive: 0xffc98a, emissiveIntensity: 0.0 }); w.nightMats.push([glow, 1.6]);
  const seats = [];
  const tables = [[-5, -7], [-5, -2.5], [-1.2, -6.8], [-1.2, -1.8], [-1.2, 3.2], [2.8, -2.5], [2.8, 2.5], [2.8, 7.5], [-1.2, 9.5], [-5.2, 11]];
  for (const [tx, tz] of tables) {
    put(g, new THREE.CylinderGeometry(0.45, 0.45, 0.04, 18), woodM, tx, IY + 0.76, tz); put(g, new THREE.CylinderGeometry(0.05, 0.06, 0.74, 8), darkM, tx, IY + 0.38, tz); put(g, new THREE.CylinderGeometry(0.25, 0.25, 0.03, 12), darkM, tx, IY + 0.02, tz);
    col.addC(CAFE.x + tx, CAFE.z + tz, 0.7, 0.7, 0.9, 'table');
    for (let k = 0; k < 2 + (rng() < 0.5 ? 1 : 0); k++) { const a = rng() * 6.28, r = rng() * 0.22; put(g, new THREE.CylinderGeometry(0.04, 0.032, 0.08, 10), M(0xf5f2ea, { roughness: 0.3 }), tx + Math.cos(a) * r, IY + 0.82, tz + Math.sin(a) * r); put(g, new THREE.CylinderGeometry(0.07, 0.07, 0.01, 12), M(0xf5f2ea, { roughness: 0.3 }), tx + Math.cos(a) * r, IY + 0.785, tz + Math.sin(a) * r); }
    if (rng() < 0.6) put(g, new THREE.CylinderGeometry(0.11, 0.11, 0.015, 14), M(0xf5f2ea), tx + 0.2, IY + 0.79, tz - 0.15);
    for (const [dx, dz] of [[0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8]]) {
      const yaw = Math.atan2(-dx, -dz); chair(g, tx + dx, IY, tz + dz, yaw, woodM, darkM);
      seats.push({ x: CAFE.x + tx + dx * 0.95, z: CAFE.z + tz + dz * 0.95, yaw, table: `${tx},${tz}` });
    }
    put(g, new THREE.CylinderGeometry(0.18, 0.12, 0.25, 12, 1, true), M(0x2a4d3a, { side: THREE.DoubleSide }), tx, H - 0.6, tz); put(g, new THREE.SphereGeometry(0.08, 8, 6), glow, tx, H - 0.7, tz);
    put(g, new THREE.CylinderGeometry(0.008, 0.008, 0.45, 4), darkM, tx, H - 0.25, tz);
  }
  for (const [fx, fz] of [[-3, -4], [-3, 6], [1, 0]]) { put(g, new THREE.CylinderGeometry(0.12, 0.12, 0.14, 10), M(0xeeeeee), fx, H - 0.35, fz); for (let i = 0; i < 3; i++) put(g, B(1.1, 0.02, 0.16), M(0xeeeeee), fx + Math.cos(i * 2.094) * 0.55, H - 0.4, fz + Math.sin(i * 2.094) * 0.55, -i * 2.094); }
  bake(g);

  // keep the rocks and boulders out of the café footprint (they were laid before it)
  w.cafeSeats = seats;
  w.shops.push({ type: 'coffee', x: CAFE.x + 1.5, z: CAFE.z + NZ + 2.6, yaw: 0, vendor: { x: CAFE.x + 0.5, z: CAFE.z + NZ + 0.85, yaw: 0 }, front: { x: CAFE.x + 1.5, z: CAFE.z + NZ + 2.6 } });
  w.cafeStaff = [];
  w.cafeTableSpots = tables.map(([tx, tz]) => ({ x: CAFE.x + tx, z: CAFE.z + tz }));
  buildBeachVendors(w);
  return g;
}

function chair(g, x, y, z, yaw, woodM, darkM) {
  const c = new THREE.Group(); c.position.set(x, y, z); c.rotation.y = yaw; g.add(c);
  put(c, B(0.42, 0.05, 0.42), woodM, 0, 0.45, 0); put(c, B(0.42, 0.5, 0.04), woodM, 0, 0.72, -0.2);
  for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) put(c, B(0.035, 0.45, 0.035), darkM, lx, 0.225, lz);
}
function terraceTable(g, x, y, z, woodM, orangeM) {
  put(g, new THREE.CylinderGeometry(0.4, 0.4, 0.04, 14), woodM, x, y + 0.74, z); put(g, new THREE.CylinderGeometry(0.04, 0.04, 0.72, 6), woodM, x, y + 0.37, z);
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.4; chair(g, x + Math.cos(a) * 0.8, y, z + Math.sin(a) * 0.8, Math.atan2(-Math.cos(a), -Math.sin(a)), orangeM, woodM); }
}

/* ---------------- beach vendors ---------------- */
function spoke(parent, r, x, y, z, m) {
  const wg = new THREE.Group(); wg.position.set(x, y, z); parent.add(wg);
  put(wg, new THREE.TorusGeometry(r, 0.03, 6, 24), m, 0, 0, 0);
  for (let i = 0; i < 8; i++) put(wg, B(0.025, r * 2, 0.025), m, 0, 0, 0, 0, 0, i * Math.PI / 8);
  put(wg, new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8), m, 0, 0, 0, 0, Math.PI / 2);
}
function brandBoard(text, sub, bg, fg) {
  return canvasTex(512, 160, (x) => {
    x.fillStyle = bg; x.fillRect(0, 0, 512, 160); x.fillStyle = fg; x.textAlign = 'center';
    x.font = 'bold italic 64px Georgia'; x.fillText(text, 256, 78); x.font = 'bold 30px Arial'; x.fillText(sub, 256, 128);
    x.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 8; i++) { x.beginPath(); x.arc(30 + i * 64, 150, 6, 0, 7); x.fill(); }
  }, false);
}
function buildBeachVendors(w) {
  const { scene, col } = w;
  const red = M(0xd8203c, { roughness: 0.5 }), blackM = M(0x222222), woodM = M(0xffffff, { map: wood('#5a3a22') }), metal = M(0xb0b3b5, { metalness: 0.7, roughness: 0.35 });

  // 1) red ice-cream push cart with a scalloped canopy (invented brand)
  {
    const x = 524.5, z = -24, g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -Math.PI / 2 + 0.2; scene.add(g);
    put(g, B(1.5, 0.85, 0.85), red, 0, 0.95, 0); put(g, B(1.52, 0.08, 0.87), M(0xf2f2f2), 0, 1.4, 0);
    put(g, B(1.0, 0.3, 0.02), M(0xffffff, { map: brandBoard('Kulfi Kool', 'ICE CREAM', '#d8203c', '#fff3c4') }), 0, 0.95, 0.44);
    put(g, B(1.0, 0.3, 0.02), M(0xffffff, { map: brandBoard('Kulfi Kool', 'ICE CREAM', '#d8203c', '#fff3c4') }), 0, 0.95, -0.44, Math.PI);
    for (const sx of [-0.7, 0.7]) for (const sz of [-0.45, 0.45]) put(g, B(0.04, 1.2, 0.04), metal, sx, 2.0, sz);
    const can = new THREE.CylinderGeometry(0.62, 0.62, 1.6, 16, 1, true, 0, Math.PI); can.rotateZ(Math.PI / 2); can.rotateX(0);
    put(g, can, M(0xd8203c, { side: THREE.DoubleSide, roughness: 0.6 }), 0, 2.55, 0, 0, Math.PI / 2);
    for (let i = 0; i < 12; i++) put(g, new THREE.ConeGeometry(0.08, 0.14, 6), M(i % 2 ? 0xffd23f : 0x1e88e5), -0.66 + i * 0.12, 2.42, 0.62, 0, Math.PI, 0);
    spoke(g, 0.42, -0.45, 0.42, 0.5, blackM); spoke(g, 0.42, -0.45, 0.42, -0.5, blackM); spoke(g, 0.42, 0.45, 0.42, 0.5, blackM); spoke(g, 0.42, 0.45, 0.42, -0.5, blackM);
    put(g, B(0.03, 0.03, 0.9), metal, 0.95, 1.1, 0);
    bake(g); col.addC(x, z, 1.4, 1.6, 1.4, 'stall');
    w.shops.push({ type: 'icecream', x, z, yaw: 0, vendor: { x: x - 0.3, z: z - 1.2, yaw: 0 }, front: { x, z: z + 1.4 } });
  }
  // 2) raw-mango cart: wooden cart on big spoked wheels, heaps of green mangoes and pineapples, red/white umbrella
  {
    const x = 525.5, z = -13, g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = 0.3; scene.add(g);
    put(g, B(2.2, 0.08, 1.0), woodM, 0, 0.95, 0); put(g, B(2.2, 0.15, 0.04), woodM, 0, 1.05, 0.5); put(g, B(2.2, 0.15, 0.04), woodM, 0, 1.05, -0.5);
    spoke(g, 0.55, 0, 0.55, 0.58, woodM); spoke(g, 0.55, 0, 0.55, -0.58, woodM); put(g, B(0.05, 0.05, 1.3), metal, 0, 0.55, 0);
    put(g, B(0.9, 0.04, 0.04), woodM, 1.5, 0.95, 0.3); put(g, B(0.9, 0.04, 0.04), woodM, 1.5, 0.95, -0.3);
    const mango = M(0x6f9a2c, { roughness: 0.55 }), pine = M(0xb98a2e, { flatShading: true });
    for (let i = 0; i < 70; i++) { const a = rng(), b = rng(), m = put(g, new THREE.SphereGeometry(0.07, 7, 5), mango, -0.9 + a * 1.2, 1.04 + (1 - Math.abs(a - 0.5) * 2) * 0.25 * rng() + 0.03, -0.38 + b * 0.76); m.scale.set(1.3, 1, 1); }
    for (let i = 0; i < 5; i++) { put(g, new THREE.CylinderGeometry(0.1, 0.12, 0.28, 8), pine, 0.55 + (i % 3) * 0.22, 1.13, -0.25 + Math.floor(i / 3) * 0.4); put(g, new THREE.ConeGeometry(0.08, 0.2, 6), M(0x3d6b2a), 0.55 + (i % 3) * 0.22, 1.37, -0.25 + Math.floor(i / 3) * 0.4); }
    put(g, new THREE.CylinderGeometry(0.02, 0.02, 2.2, 6), metal, -0.9, 2.0, 0.4, 0, 0.15, 0.15);
    const ug = new THREE.ConeGeometry(1.25, 0.45, 12, 1, true), seg = [];
    const um = put(g, ug, M(0xffffff, { side: THREE.DoubleSide, map: canvasTex(256, 64, (x) => { for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? '#d32f2f' : '#f5f5f5'; x.fillRect(i * 256 / 12, 0, 256 / 12 + 1, 64); } }, false) }), -1.05, 3.05, 0.55, 0, 0.15, 0.15);
    seg.push(um); bake(g); col.addC(x, z, 2.2, 1.4, 1.4, 'stall');
    w.shops.push({ type: 'mango', x, z, yaw: 0, vendor: { x: x - 0.4, z: z - 1.0, yaw: 0.3 }, front: { x, z: z + 1.2 } });
  }
  // 3) thatched seafood fry shack: palm-thatch roof on casuarina poles, big black tawa of prawn fry, fish on the grill
  {
    const x = 525, z = 0, g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -Math.PI / 2; scene.add(g);
    const pole = M(0x6b4a2c, { roughness: 1 });
    for (const [px, pz] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]]) put(g, new THREE.CylinderGeometry(0.06, 0.07, 2.6, 6), pole, px, 1.3, pz, 0, rng() * 0.05, rng() * 0.05);
    const roof = put(g, B(3.8, 0.12, 3.2), M(0xffffff, { map: thatch(), roughness: 1 }), 0, 2.7, 0, 0, 0.12, 0); roof.material.map.repeat.set(2, 2);
    put(g, new THREE.PlaneGeometry(3.6, 0.5), M(0x2e8b57, { side: THREE.DoubleSide, roughness: 0.9 }), 0, 2.35, 1.25);   // green tarp edge
    put(g, B(2.6, 0.85, 0.9), M(0x8a8d8f, { roughness: 0.9 }), 0, 0.43, -0.4);        // cooking platform
    const tawa = new THREE.SphereGeometry(0.55, 24, 6, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.08); tawa.scale(1, 0.4, 1);
    put(g, tawa, M(0x151515, { roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide }), -0.5, 1.0, -0.4);
    const prawn = M(0xe0682a, { roughness: 0.55 }), fish = M(0x9a4a22, { roughness: 0.5 });
    for (let i = 0; i < 40; i++) { const a = rng() * 6.28, r = rng() * 0.38, p = put(g, new THREE.TorusGeometry(0.035, 0.016, 5, 8, Math.PI * 1.3), prawn, -0.5 + Math.cos(a) * r, 0.93, -0.4 + Math.sin(a) * r, rng() * 6, Math.PI / 2); p.rotation.z = rng() * 6; }
    for (let i = 0; i < 25; i++) put(g, new THREE.SphereGeometry(0.012, 4, 3), M(0x3f7a35), -0.5 + (rng() - 0.5) * 0.7, 0.95, -0.4 + (rng() - 0.5) * 0.7);   // curry leaves
    put(g, new THREE.CylinderGeometry(0.4, 0.4, 0.03, 20), M(0x151515, { metalness: 0.6, roughness: 0.4 }), 0.75, 0.88, -0.4);
    for (let i = 0; i < 4; i++) { const f = put(g, new THREE.SphereGeometry(0.22, 10, 6), fish, 0.6 + (i % 2) * 0.2, 0.92, -0.62 + i * 0.13); f.scale.set(1, 0.18, 0.28); }
    for (const [bx, c] of [[-1.15, 0x5aa04a], [0.15, 0xc0392b], [1.15, 0xf0f0f0]]) put(g, new THREE.CylinderGeometry(0.13, 0.1, 0.14, 12), M(c), bx, 0.92, -0.75);
    const board = brandBoard('SEA FOOD', 'PRAWN • FISH • SQUID FRY', '#f6e7c8', '#c0392b');
    put(g, new THREE.PlaneGeometry(2.4, 0.6), M(0xffffff, { map: board, side: THREE.DoubleSide }), 0, 1.75, -1.25);
    for (let i = 0; i < 2; i++) put(g, new THREE.CylinderGeometry(0.2, 0.2, 0.42, 10), M(0x2e6bb5), 1.9, 0.21, -0.6 + i * 0.6);   // stools
    bake(g); col.addC(x, z, 1.4, 2.8, 1.2, 'stall');
    w.shops.push({ type: 'seafood', x, z, yaw: 0, vendor: { x: x + 1.0, z: z + 0.5, yaw: -Math.PI / 2 }, vendorLook: 'saree', front: { x: x - 1.6, z } });
  }
}

/** Waiter loop: counter -> aisle -> stop beside a table (serve) -> back along the aisle -> counter. */
export function waiterRoute(w) {
  const cz = CAFE.z - 10.4, cx = CAFE.x + 1.5, t = w.cafeTableSpots[Math.floor(Math.random() * w.cafeTableSpots.length)], ax = t.x + 1.95;
  return [{ x: cx, z: cz, stop: 2.5 + Math.random() * 2, yaw: Math.PI }, { x: ax, z: cz }, { x: ax, z: t.z, stop: 3 + Math.random() * 3, yaw: -Math.PI / 2 }, { x: ax, z: cz }];
}

/* ---------------- props for roaming vendors (carried with the person, kept visible over the realistic body) ---------------- */
export function vendorProp(h, kind) {
  const g = new THREE.Group(); g.userData.prop = true; h.root.add(g);
  const tag = (o) => { o.userData.prop = true; return o; };
  if (kind === 'balloons') {
    tag(put(g, new THREE.CylinderGeometry(0.02, 0.02, 2.0, 5), M(0x5a3a22), 0.32, 1.6, 0.15));
    const cols = [0xf4511e, 0xfdd835, 0x8e24aa, 0x1e88e5, 0x43a047, 0xe91e63, 0x00acc1, 0xff7043, 0x7e57c2];
    for (let i = 0; i < 22; i++) {
      const a = i * 2.4, r = 0.18 + (i % 4) * 0.12, y = 2.25 + (i % 5) * 0.2 - Math.floor(i / 11) * 0.1;
      const b = tag(put(g, new THREE.SphereGeometry(0.17, 12, 9), M(cols[i % cols.length], { roughness: 0.25, metalness: 0.05 }), 0.32 + Math.cos(a) * r, y, 0.15 + Math.sin(a) * r));
      b.scale.set(1, 1.08, 1);
    }
    for (let i = 0; i < 3; i++) tag(put(g, new THREE.CylinderGeometry(0.035, 0.035, 0.9, 6), M([0x43a047, 0xe53935, 0x00acc1][i]), 0.45 + i * 0.05, 1.3, 0.25, 0, 0.3, 0.2 * i));   // balloon-stick toys
  } else if (kind === 'candy') {
    tag(put(g, new THREE.CylinderGeometry(0.018, 0.022, 2.2, 5), M(0x6b4a2c), 0.15, 1.55, -0.3, 0, -0.95, 0));
    const pink = M(0xff8fc8, { roughness: 0.4, transparent: true, opacity: 0.88 });
    for (let i = 0; i < 18; i++) { const b = tag(put(g, new THREE.ConeGeometry(0.11, 0.3, 7), pink, 0.15 + (rng() - 0.5) * 0.45, 2.2 + (rng() - 0.5) * 0.5, -1.15 + (rng() - 0.5) * 0.45, 0, Math.PI + (rng() - 0.5), (rng() - 0.5))); b.scale.set(1, 1, 0.8); }
  } else if (kind === 'tray') {   // waiter's round steel tray with coffee tumblers, held at chest height
    tag(put(g, new THREE.CylinderGeometry(0.22, 0.22, 0.02, 20), M(0xc9ccd0, { metalness: 0.8, roughness: 0.25 }), 0.22, 1.12, 0.28));
    for (let i = 0; i < 3; i++) tag(put(g, new THREE.CylinderGeometry(0.035, 0.03, 0.09, 10), M(0xd9dcdf, { metalness: 0.8, roughness: 0.3 }), 0.17 + (i % 2) * 0.1, 1.18, 0.22 + i * 0.06));
  } else if (kind === 'drums') {
    const drumM = M(0xffffff, { map: canvasTex(64, 64, (x) => { x.fillStyle = '#b5452d'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#e8d3a6'; x.fillRect(0, 0, 64, 8); x.fillRect(0, 56, 64, 8); x.strokeStyle = '#f2e6cc'; x.lineWidth = 2; for (let i = 0; i < 64; i += 8) { x.beginPath(); x.moveTo(i, 8); x.lineTo(i + 8, 56); x.stroke(); } }, false), roughness: 0.8 });
    const skin = M(0xe2cfa0, { roughness: 0.9 });
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
      const d = tag(put(g, new THREE.CylinderGeometry(0.11, 0.11, 0.22, 12), drumM, sx * (0.32 + (i % 2) * 0.1), 0.75 + Math.floor(i / 2) * 0.22, -0.05 + (i % 2) * 0.12, 0, 0, Math.PI / 2 + (rng() - 0.5) * 0.4));
      tag(put(d, new THREE.CircleGeometry(0.105, 12), skin, 0, 0.111, 0, 0, -Math.PI / 2)); tag(put(d, new THREE.CircleGeometry(0.105, 12), skin, 0, -0.111, 0, 0, Math.PI / 2));
    }
    for (const sx of [-1, 1]) tag(put(g, B(0.02, 0.75, 0.02), M(0xdedede), sx * 0.22, 1.15, 0, 0, 0, sx * 0.35));
  }
  return g;
}
