// Old Pier (Rock Beach / Promenade, Pondicherry): a long, low concrete pier on paired trestle columns
// running straight out to sea, rusted railings, tall lamp posts, weathered and stained concrete,
// a collapsed section near the far end, black boulder sea wall and fishing boats on the sand beside it.
import * as THREE from 'three';
import { bake, seeded } from './utils.js';

const rng = seeded(4242);
export const PIER = { x0: 513, z: -40, len: 200, deck: 2.7, w: 7 };

/* ---------------- weathered textures (canvas) ---------------- */
function crack(x, x0, y0, len, w) {
  x.strokeStyle = `rgba(30,28,24,${0.35 + Math.random() * 0.35})`; x.lineWidth = w; x.beginPath(); x.moveTo(x0, y0);
  let a = Math.random() * Math.PI * 2, px = x0, py = y0;
  for (let i = 0; i < len; i++) { a += (Math.random() - 0.5) * 0.9; px += Math.cos(a) * 6; py += Math.sin(a) * 6; x.lineTo(px, py); if (Math.random() < 0.08) crack(x, px, py, len / 3, w * 0.6); }
  x.stroke();
}
function concreteCanvas(W, H, tide = false) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.fillStyle = '#9c988e'; x.fillRect(0, 0, W, H);
  for (let k = 0; k < 140; k++) {                       // blotchy ageing: darker/lighter patches
    const r = 10 + Math.random() * 60, g = x.createRadialGradient(0, 0, 0, 0, 0, r);
    const dark = Math.random() < 0.6; g.addColorStop(0, dark ? 'rgba(60,56,48,0.22)' : 'rgba(220,214,200,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.save(); x.translate(Math.random() * W, Math.random() * H); x.fillStyle = g; x.fillRect(-r, -r, r * 2, r * 2); x.restore();
  }
  for (let k = 0; k < 9000; k++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)'; x.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  for (let k = 0; k < 26; k++) {                        // vertical water/rust streaks running down
    const sx = Math.random() * W, rust = Math.random() < 0.45, len = H * (0.2 + Math.random() * 0.6), sy = Math.random() * H * 0.4;
    const g = x.createLinearGradient(0, sy, 0, sy + len);
    g.addColorStop(0, rust ? 'rgba(140,70,30,0.45)' : 'rgba(40,38,34,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(sx, sy, 2 + Math.random() * 7, len);
  }
  for (let k = 0; k < 7; k++) {                         // spalled patches exposing aggregate
    const px = Math.random() * W, py = Math.random() * H, r = 8 + Math.random() * 18;
    x.fillStyle = 'rgba(120,112,98,0.9)'; x.beginPath(); for (let a = 0; a < 7; a += 0.6) x.lineTo(px + Math.cos(a) * r * (0.6 + Math.random() * 0.5), py + Math.sin(a) * r * (0.6 + Math.random() * 0.5)); x.fill();
    x.strokeStyle = 'rgba(40,36,30,0.6)'; x.lineWidth = 1.5; x.stroke();
    for (let j = 0; j < 12; j++) { x.fillStyle = 'rgba(70,64,56,0.8)'; x.fillRect(px + (Math.random() - 0.5) * r, py + (Math.random() - 0.5) * r, 2, 2); }
  }
  for (let k = 0; k < 10; k++) crack(x, Math.random() * W, Math.random() * H, 10 + Math.random() * 25, 1.2);
  if (tide) {                                            // algae / barnacle band at the water line, dark wet below
    const t0 = H * 0.18, t1 = H * 0.30;
    const g = x.createLinearGradient(0, t0 - 30, 0, t1); g.addColorStop(0, 'rgba(60,70,40,0)'); g.addColorStop(0.5, 'rgba(45,58,34,0.85)'); g.addColorStop(1, 'rgba(18,22,16,0.95)');
    x.fillStyle = g; x.fillRect(0, t0 - 30, W, t1 - t0 + 30); x.fillStyle = 'rgba(16,20,14,0.95)'; x.fillRect(0, t1, W, H - t1);
    for (let k = 0; k < 1400; k++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(200,200,180,0.35)' : 'rgba(10,12,8,0.5)'; x.beginPath(); x.arc(Math.random() * W, t0 + Math.random() * (t1 - t0 + 40), 1 + Math.random() * 1.8, 0, 7); x.fill(); }
  }
  return c;
}
function texMat(canvas, opts = {}) {
  const t = new THREE.CanvasTexture(canvas); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, ...opts });
}
function rustCanvas() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#b4b6b4'; x.fillRect(0, 0, 128, 128);    // old pale grey paint
  for (let k = 0; k < 40; k++) { const r = 2 + Math.random() * 9; x.fillStyle = `hsla(${20 + Math.random() * 12},${35 + Math.random() * 20}%,${28 + Math.random() * 14}%,0.8)`; x.beginPath(); x.arc(Math.random() * 128, Math.random() * 128, r, 0, 7); x.fill(); }
  for (let k = 0; k < 1500; k++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,190,120,0.12)'; x.fillRect(Math.random() * 128, Math.random() * 128, 1, 1); }
  return c;
}

/* ---------------- geometry helpers ---------------- */
const S = 3;   // metres per texture tile
function box(w, h, d) {   // box with world-scaled UVs so texture density stays constant
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / S + rng() * 0.0, uv.getY(k) * dims[f][1] / S); }
  return g;
}
function put(parent, geo, m, x, y, z, rx = 0, ry = 0, rz = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); parent.add(o); return o; }

export function buildPier(w) {
  const { scene, col } = w, walk = w.walk;
  const { x0, z: PZ, len: L, deck: DY, w: PW } = PIER;
  const deckM = texMat(concreteCanvas(512, 512));
  const colC = concreteCanvas(128, 512, true); const colT = new THREE.CanvasTexture(colC); colT.colorSpace = THREE.SRGBColorSpace; colT.wrapS = THREE.RepeatWrapping; colT.anisotropy = 8; colT.flipY = false;
  const colM = new THREE.MeshStandardMaterial({ map: colT, roughness: 0.95 });
  const rustT = new THREE.CanvasTexture(rustCanvas()); rustT.wrapS = rustT.wrapT = THREE.RepeatWrapping; rustT.colorSpace = THREE.SRGBColorSpace;
  const railM = new THREE.MeshStandardMaterial({ map: rustT, roughness: 0.75, metalness: 0.3 });
  const lampM = new THREE.MeshStandardMaterial({ color: 0x8d9093, roughness: 0.55, metalness: 0.6 });
  const glassM = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffd9a0, emissiveIntensity: 0.0, roughness: 0.3 });
  const rebarM = new THREE.MeshStandardMaterial({ color: 0x4a2c1c, roughness: 0.8, metalness: 0.4 });
  const g = new THREE.Group(); g.position.set(x0, 0, PZ); scene.add(g);

  const SPAN = 7, COLZ = 2.8, BOT = -6.2, CAP_TOP = DY - 0.35;
  const GAP0 = 131, GAP1 = 152;              // collapsed section (local x)
  const inGap = (a) => a > GAP0 && a < GAP1;

  // --- landward ramp from the promenade up onto the deck
  const ramp = box(12.4, 0.45, PW); const rm = put(g, ramp, deckM, 6, (0.35 + DY) / 2 - 0.2, 0, 0, 0, Math.atan2(DY - 0.35, 12));
  rm.rotation.z = Math.atan2(DY - 0.5, 12);
  put(g, box(1.2, DY + 0.4, PW + 0.6), deckM, 12.3, (DY - 0.4) / 2 - 0.2, 0);   // abutment block
  for (let i = 0; i < 9; i++) walk.add(x0 + i * 1.35, PZ - PW / 2, x0 + (i + 1) * 1.35, PZ + PW / 2, 0.3 + (i / 8) * (DY - 0.3));

  // --- trestle bents (paired square columns + cap beam + low tie beam)
  const colGeo = (h) => { const cg = new THREE.BoxGeometry(0.72, h, 0.72); const uv = cg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.6, 1 - uv.getY(i) * (h / 7.4)); return cg; };
  const bents = [];
  for (let bx = 12; bx <= L; bx += SPAN) bents.push(bx);
  bents.forEach((bx, bi) => {
    const broken = bx === 145;                  // one bent snapped off in the collapse
    for (const sz of [-COLZ, COLZ]) {
      const top = broken ? (sz < 0 ? 0.9 : -0.1) : CAP_TOP - 0.85, h = top - BOT;
      const c = put(g, colGeo(h), colM, bx + rng.range(-0.05, 0.05), BOT + h / 2, sz, rng.range(-0.012, 0.012), 0, rng.range(-0.012, 0.012));
      if (broken) { c.rotation.z = sz < 0 ? 0.06 : -0.1; for (let r = 0; r < 4; r++) put(g, new THREE.CylinderGeometry(0.025, 0.025, 0.9 + rng() * 0.6, 4), rebarM, bx + (r % 2 - 0.5) * 0.45, top + 0.4, sz + (r < 2 ? -0.25 : 0.25), rng.range(-0.5, 0.5), 0, rng.range(-0.6, 0.6)); }
      else col.addC(x0 + bx, PZ + sz, 0.8, 0.8, CAP_TOP - 0.9, 'pier');
    }
    if (!broken) {
      put(g, box(0.95, 0.85, PW + 0.5), deckM, bx, CAP_TOP - 0.42, 0);              // cap beam
      put(g, box(0.45, 0.45, COLZ * 2), colM.clone(), bx, 0.25, 0);                  // tie beam near water
    }
  });

  // --- deck slabs per span, edge beams, kerbs (missing in the collapse, one slab hanging into the sea)
  for (let i = 0; i < bents.length - 1; i++) {
    const a = bents[i], b = bents[i + 1], mid = (a + b) / 2;
    if (inGap(mid)) continue;
    const sag = rng.range(-0.04, 0.02);
    put(g, box(SPAN + 0.02, 0.35, PW), deckM, mid, DY - 0.175 + sag, 0, rng.range(-0.004, 0.004), 0, rng.range(-0.003, 0.003));
    for (const sz of [-PW / 2 + 0.2, PW / 2 - 0.2]) { put(g, box(SPAN, 0.6, 0.4), deckM, mid, DY - 0.65, sz); put(g, box(SPAN, 0.22, 0.32), deckM, mid, DY + 0.11, sz * 1.0); }
    walk.add(x0 + a - 0.2, PZ - PW / 2, x0 + b + 0.2, PZ + PW / 2, DY);
  }
  // collapsed slab: one end still on the bent at 131, other end in the water
  { const hs = put(g, box(SPAN + 0.5, 0.35, PW - 0.3), deckM, 0, 0, 0); hs.position.set(GAP0 + 3.3, DY - 1.6, 0.4); hs.rotation.set(0.08, 0.05, -0.42); }
  { const hs = put(g, box(SPAN, 0.35, PW - 1), deckM, 0, 0, 0); hs.position.set(GAP1 - 4, -0.25, -0.6); hs.rotation.set(-0.15, 0.2, 0.25); }   // slab lying in the shallows
  for (const ex of [GAP0, GAP1]) for (let r = 0; r < 9; r++) {                // exposed rebar at the broken edges
    const dir = ex === GAP0 ? 1 : -1;
    put(g, new THREE.CylinderGeometry(0.022, 0.022, 0.6 + rng() * 1.1, 4), rebarM, ex + dir * 0.35, DY - 0.2 + rng.range(-0.1, 0.05), -PW / 2 + 0.4 + r * (PW - 0.8) / 8, rng.range(-0.3, 0.3), 0, Math.PI / 2 + dir * rng.range(0.1, 0.7));
  }

  // --- railings: square posts + two rails, rusted; some posts missing, some rails bent or gone
  for (const sz of [-PW / 2 + 0.2, PW / 2 - 0.2]) {
    let prevPost = null;
    for (let px = 12.5; px <= L - 0.5; px += 2.33) {
      if (inGap(px) || rng() < 0.06) { prevPost = null; continue; }
      const lean = rng() < 0.1 ? rng.range(-0.25, 0.25) : 0;
      put(g, box(0.09, 1.05, 0.09), railM, px, DY + 0.22 + 0.52, sz, lean, 0, 0);
      if (prevPost !== null && rng() > 0.08) {
        const mx = (px + prevPost) / 2, ln = px - prevPost, bent = rng() < 0.08 ? rng.range(-0.25, 0.25) : 0;
        put(g, box(ln, 0.06, 0.06), railM, mx, DY + 1.25, sz, 0, bent, 0);
        if (rng() > 0.12) put(g, box(ln, 0.05, 0.05), railM, mx, DY + 0.75, sz, 0, bent * 0.5, rng() < 0.05 ? 0.3 : 0);
      }
      prevPost = px;
    }
    // dangling rail at the collapse edge
    put(g, box(3.2, 0.06, 0.06), railM, GAP0 + 1.3, DY + 0.4, sz, 0, 0, -0.7);
  }

  // --- tall lamp posts with a swan-neck arm (as on the real pier), every 14 m on both sides, staggered
  const lamps = [];
  for (let lx = 19, k = 0; lx < L - 2; lx += 14, k++) {
    if (inGap(lx)) continue;
    const sz = (k % 2 ? 1 : -1) * (PW / 2 - 0.2), dead = rng() < 0.18, tilt = rng() < 0.12 ? rng.range(-0.07, 0.07) : 0;
    const lp = new THREE.Group(); lp.position.set(lx, DY + 0.22, sz); lp.rotation.set(tilt, 0, tilt * 0.6); g.add(lp);
    put(lp, new THREE.CylinderGeometry(0.16, 0.2, 0.6, 8), lampM, 0, 0.3, 0);
    put(lp, new THREE.CylinderGeometry(0.06, 0.09, 6.6, 8), lampM, 0, 3.6, 0);
    if (!dead) {
      const arm = new THREE.TorusGeometry(0.55, 0.04, 6, 10, Math.PI / 2); const a = put(lp, arm, lampM, 0, 6.9, -Math.sign(sz) * 0.55, 0, Math.PI / 2, 0); a.rotation.set(0, Math.PI / 2 * Math.sign(sz), 0);
      put(lp, box(0.32, 0.14, 0.55), lampM, 0, 7.35, -Math.sign(sz) * 0.85);
      lamps.push(put(lp, box(0.26, 0.05, 0.46), glassM, 0, 7.27, -Math.sign(sz) * 0.85));
    }
  }
  w.nightMats.push([glassM, 2.5]);

  // --- T-head at the far end with the shell of an old kiosk
  put(g, box(14, 0.4, 12), deckM, L - 4, DY - 0.2, 0);
  for (const [bx, bz] of [[L - 10, -5], [L - 10, 5], [L + 2, -5], [L + 2, 5], [L - 4, -5], [L - 4, 5]]) put(g, colGeo(DY - 0.4 - BOT), colM, bx, BOT + (DY - 0.4 - BOT) / 2, bz);
  walk.add(x0 + L - 11, PZ - 6, x0 + L + 3, PZ + 6, DY);
  const kz = put(g, box(4, 2.4, 0.25), deckM, L - 3, DY + 1.2, 2.5); kz.rotation.y = 0.0;
  put(g, box(0.25, 2.4, 3), deckM, L - 5, DY + 1.2, 1.1); put(g, box(0.25, 1.4, 3), deckM, L - 1, DY + 0.7, 1.1);
  bake(g);

  /* ---------------- beach scene beside the pier: black boulders + fishing boats with green nets ---------------- */
  const beach = new THREE.Group(); scene.add(beach);
  const bould = new THREE.DodecahedronGeometry(1, 1); { const p = bould.attributes.position; for (let i = 0; i < p.count; i++) { const s = 1 + Math.sin(p.getX(i) * 5.1 + p.getZ(i) * 3.3) * 0.18; p.setXYZ(i, p.getX(i) * s, p.getY(i) * 0.7 * s, p.getZ(i) * s); } bould.computeVertexNormals(); }
  const bM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
  const spots = [];
  for (let z = PZ - 70; z < PZ - 6; z += 1.4) for (let x = 512; x < 519 + (PZ - 6 - z) * 0.06; x += 1.6) if (rng() > 0.1 && !(x > 512.5 && z > -87 && z < -57)) spots.push([x + rng.range(-0.4, 0.4), z + rng.range(-0.4, 0.4)]);
  const im = new THREE.InstancedMesh(bould, bM, spots.length), mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), cc = new THREE.Color();
  spots.forEach(([x, z], i) => { const s = rng.range(0.7, 1.4); e.set(rng() * 3, rng() * 3, rng() * 3); q.setFromEuler(e); mx.compose(new THREE.Vector3(x, 0.25 - (x - 512) * 0.05, z), q, new THREE.Vector3(s * 1.2, s, s)); im.setMatrixAt(i, mx); im.setColorAt(i, cc.setHSL(0.6, 0.04, rng.range(0.1, 0.2))); });
  im.castShadow = im.receiveShadow = true; scene.add(im);

  const hullM = new THREE.MeshStandardMaterial({ color: 0xf0efe9, roughness: 0.55 });
  const bandMs = [0x1f9a8a, 0x2f6fb5, 0xd94a3a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));
  const netM = new THREE.MeshStandardMaterial({ color: 0x2f7d3a, roughness: 1, flatShading: true });
  const boat = (x, z, ry, band, float = false) => {
    const b = new THREE.Group(); b.position.set(x, float ? -0.55 : 0.05, z); b.rotation.set(float ? 0.02 : 0.06, ry, float ? 0.03 : -0.05); beach.add(b);
    const hg = new THREE.BoxGeometry(6.4, 0.9, 1.7, 16, 2, 2), p = hg.attributes.position;
    for (let i = 0; i < p.count; i++) { const X = p.getX(i) / 3.2, Y = p.getY(i), t = 1 - Math.pow(Math.abs(X), 2.2); p.setZ(i, p.getZ(i) * Math.max(0.05, t) * (Y < 0 ? 0.6 : 1)); p.setY(i, Y + Math.pow(Math.abs(X), 3) * 0.45); }
    hg.computeVertexNormals(); put(b, hg, hullM, 0, 0.45, 0);
    put(b, box(5.6, 0.14, 1.75), bandMs[band], 0, 0.86, 0);
    put(b, box(0.4, 0.5, 0.35), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 }), -3.1, 1.1, 0);   // outboard motor
    for (let n = 0; n < 3; n++) { const ng = new THREE.IcosahedronGeometry(0.55 + rng() * 0.25, 1); const o = put(b, ng, netM, -1.3 + n * 1.2, 1.05, rng.range(-0.2, 0.2)); o.scale.set(1.3, 0.55, 1); }
    if (!float) col.addC(x, z, 3, 3, 1.2, 'boat');
  };
  boat(524, PZ - 10, 0.4, 0); boat(527.5, PZ + 9, -0.3, 1); boat(527, PZ + 33, 0.15, 0); boat(527.5, PZ + 47, 0.6, 2); boat(560, PZ - 18, 1.2, 0, true);
  bake(beach);
  w.treeSpots.push([508, PZ - 9, 'palm'], [508, PZ + 9, 'palm'], [506, PZ - 26, 'palm']);
  return g;
}
