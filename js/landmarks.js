// Hand-built Pondicherry landmarks (procedural, low-poly).
import * as THREE from 'three';
import { G } from './state.js';
import { mat, boxMesh, cylMesh, bake, textTexture, seeded } from './utils.js';
import { makeHuman } from './models.js';
import { TEA_STALLS, SEA_X } from './config.js';

const rng = seeded(99);
const STEP_Z = [-400, -300, -230, -20, 30, 110, 175, 250]; // openings in the sea wall with steps to the beach
const WHITE = () => mat(0xf6f3ec, { roughness: 0.7 });
const STONE = () => mat(0xb9ad97, { roughness: 0.95 });

function group(scene, x, z, rot = 0) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g); return g; }

function lawn(scene, T, x0, z0, x1, z1, y = 0.03) {
  const t = T.lawn.clone(); t.needsUpdate = true; t.repeat.set((x1 - x0) / 6, (z1 - z0) / 6);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({ map: t, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m); return m;
}
function pathStrip(scene, T, x0, z0, x1, z1, y = 0.07) {
  const t = T.paving.clone(); t.needsUpdate = true; t.repeat.set((x1 - x0) / 3, (z1 - z0) / 3);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -4 }));
  m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m); return m;
}
function signBoard(parent, text, w, h, x, y, z, rotY = 0, opts = {}) {
  const tx = textTexture(text, { w: 1024, h: Math.round(1024 * h / w), bg: opts.bg || '#f4d03f', fg: opts.fg || '#111', font: opts.font || `bold ${Math.round(1024 * h / w * 0.55)}px Arial`, border: opts.border });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tx, emissiveMap: tx, emissive: 0xffffff, emissiveIntensity: 0.05, roughness: 0.6, side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = rotY; m.userData.keep = true; parent.add(m);
  G._signMats = G._signMats || []; G._signMats.push(m.material);
  return m;
}
/** Fence of posts + rails around a rectangle with gate gaps. gates: list of {side:'N'|'S'|'E'|'W', at, w} */
function fence(w, x0, z0, x1, z1, h, material, gates = [], tag = 'fence') {
  const g = new THREE.Group(); w.scene.add(g);
  const sides = { N: [[x0, z0], [x1, z0]], S: [[x0, z1], [x1, z1]], W: [[x0, z0], [x0, z1]], E: [[x1, z0], [x1, z1]] };
  for (const [k, [a, b]] of Object.entries(sides)) {
    const vertical = a[0] === b[0];
    const lo = vertical ? a[1] : a[0], hi = vertical ? b[1] : b[0];
    const cuts = gates.filter((gt) => gt.side === k).map((gt) => [gt.at - gt.w / 2, gt.at + gt.w / 2]).sort((p, q) => p[0] - q[0]);
    let s = lo; const runs = [];
    for (const [c0, c1] of cuts) { if (c0 > s) runs.push([s, c0]); s = c1; }
    if (s < hi) runs.push([s, hi]);
    for (const [r0, r1] of runs) {
      const len = r1 - r0, mid = (r0 + r1) / 2;
      const cx = vertical ? a[0] : mid, cz = vertical ? mid : a[1];
      boxMesh(g, vertical ? 0.25 : len, h, vertical ? len : 0.25, material, cx, h / 2, cz);
      w.col.add(cx - (vertical ? 0.2 : len / 2), cz - (vertical ? len / 2 : 0.2), cx + (vertical ? 0.2 : len / 2), cz + (vertical ? 0.2 : len / 2), h, tag);
    }
  }
  for (const gt of gates) { // gate pillars
    const s = sides[gt.side]; const vertical = s[0][0] === s[1][0];
    for (const o of [-gt.w / 2, gt.w / 2]) boxMesh(g, 0.6, h + 0.8, 0.6, material, vertical ? s[0][0] : gt.at + o, (h + 0.8) / 2, vertical ? gt.at + o : s[0][1]);
  }
  bake(g);
}
function triPrism(len, width, height, material) {
  // gable roof prism along local Z
  const shape = new THREE.Shape(); shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0); shape.lineTo(0, height); shape.lineTo(-width / 2, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false }); geo.translate(0, 0, -len / 2);
  const m = new THREE.Mesh(geo, material); m.castShadow = true; m.receiveShadow = true; return m;
}

/** Dravidian gopuram tower. Faces +Z in local space. */
function gopuram(parent, T, x, z, baseW, baseD, tiers, rot = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; parent.add(g);
  const base = mat(0xe8dcc0); const tierMat = new THREE.MeshStandardMaterial({ map: T.gopuram, roughness: 0.8 });
  boxMesh(g, baseW, 7, baseD, base, 0, 3.5, 0);
  boxMesh(g, baseW * 0.32, 5.2, baseD + 0.2, mat(0x3b2a1d), 0, 2.6, 0); // doorway
  let y = 7, w = baseW * 0.95, d = baseD * 0.8;
  for (let i = 0; i < tiers; i++) {
    const h = 3.2 - i * 0.12;
    boxMesh(g, w, h, d, tierMat, 0, y + h / 2, 0);
    boxMesh(g, w + 0.4, 0.35, d + 0.4, mat(0xd35400), 0, y + h, 0);
    y += h + 0.2; w *= 0.87; d *= 0.86;
  }
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(d * 0.6, d * 0.6, w, 12, 1, false, 0, Math.PI), mat(0xc0392b));
  roof.rotation.z = Math.PI / 2; roof.position.y = y; g.add(roof);
  const gold = mat(0xf1c40f, { metalness: 0.8, roughness: 0.3 });
  const n = Math.max(3, Math.round(w / 2));
  for (let i = 0; i < n; i++) {
    const k = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.4, 8), gold);
    k.position.set(-w / 2 + (i + 0.5) * (w / n), y + d * 0.6 + 0.6, 0); g.add(k);
  }
  return { g, top: y + d * 0.6 + 1.3 };
}

export function buildLandmarks(w) {
  const { scene, T, col } = w;
  w.walk = G.walkables;

  /* ================= Promenade (Goubert Avenue sea front) =================
     Reference: wide grey-paved walk, palms + hedges on the road side, a low
     white sea wall with sky-blue painted caps/chevrons, boulders below. */
  {
    const PZ0 = -176, PZ1 = -144, PX1 = 527;           // Gandhi Thidal plaza bulges over the rocks
    const g = new THREE.Group(); scene.add(g);
    const wallMat = seaWallMat();
    const wallSeg = (x0, z0, x1, z1) => {
      const along = Math.abs(z1 - z0) > Math.abs(x1 - x0), len = along ? Math.abs(z1 - z0) : Math.abs(x1 - x0);
      const m = wallMat.clone(); m.map = wallMat.map.clone(); m.map.needsUpdate = true; m.map.repeat.set(len / 1.6, 1);
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      boxMesh(g, along ? 0.45 : len, 0.85, along ? len : 0.45, m, cx, 0.42, cz);
      boxMesh(g, along ? 0.55 : len + 0.1, 0.12, along ? len + 0.1 : 0.55, mat(0x4aa3df, { roughness: 0.6 }), cx, 0.9, cz); // blue cap
      col.add(cx - (along ? 0.3 : len / 2), cz - (along ? len / 2 : 0.3), cx + (along ? 0.3 : len / 2), cz + (along ? len / 2 : 0.3), 1.0, 'rail');
    };
    // the sea wall has openings with steps down to the beach
    const cuts = [...STEP_Z.map((sz) => [sz - 1.8, sz + 1.8]), [PZ0, PZ1]].sort((p1, p2) => p1[0] - p2[0]);
    let zs = -452;
    for (const [c0, c1] of cuts) { if (c0 - zs > 0.5) wallSeg(513.2, zs, 513.2, c0); zs = c1; }
    if (302 - zs > 0.5) wallSeg(513.2, zs, 513.2, 302);
    for (const sz of STEP_Z) for (let k = 0; k < 3; k++) boxMesh(g, 1.1, 0.3, 3.4, mat(0xc9c2b4), 513.9 + k * 1.1, 0.15 - k * 0.12, sz);
    wallSeg(513.2, PZ0, PX1, PZ0); wallSeg(PX1, PZ0, PX1, PZ1); wallSeg(513.2, PZ1, PX1, PZ1);
    // hedge planters on the road side of the walk (gaps for crossings) — blue & white painted kerbs
    const hedge = mat(0x3f7f2e, { roughness: 0.95 }), kerb = kerbMat(17);
    const roadKerb = (x, z0, z1) => { const len = z1 - z0; const k = boxMesh(g, 0.3, 0.22, len, kerbMat(len), x, 0.11, (z0 + z1) / 2); k.userData.keep = true; };
    roadKerb(497.1, -450, 300); roadKerb(482.9, -450, 300);
    for (let z = -433; z < 296; z += 26) if (z < PZ0 - 20 || z > PZ1 + 6) w.treeSpots.push([499.4, z, 'almond']);
    for (let z = -446; z < 296; z += 26) {
      if (z > PZ0 - 20 && z < PZ1 + 6) continue;
      { const k = boxMesh(g, 1.3, 0.35, 17, kerb, 498.6, 0.18, z + 8.5); k.userData.keep = true; }
      boxMesh(g, 1.1, 0.75, 16.6, hedge, 498.6, 0.65, z + 8.5);
      col.add(497.9, z, 499.3, z + 17, 0.9, 'hedge');
    }
    // benches facing the sea
    for (let z = -440; z < 295; z += 22) {
      if ((z > PZ0 - 6 && z < PZ1 + 6) || Math.abs(z + 300) < 8) continue;
      boxMesh(g, 0.6, 0.12, 2.2, mat(0x8d6e63), 511.4, 0.5, z); boxMesh(g, 0.12, 0.5, 2.2, mat(0x8d6e63), 511.8, 0.8, z);
      for (const o of [-0.9, 0.9]) boxMesh(g, 0.5, 0.45, 0.12, STONE(), 511.4, 0.22, z + o);
      col.addC(511.5, z, 0.8, 2.2, 0.9, 'bench');
      w.benches = w.benches || []; w.benches.push({ x: 511.2, z, yaw: Math.PI / 2 });
    }
    // Beach Road lamp posts: tall grey poles with curved swan-neck arms and bright white LED heads
    const lampM = mat(0x8a9097, { metalness: 0.6, roughness: 0.4 });
    w.bulbMatShared = w.bulbMatShared || new THREE.MeshStandardMaterial({ color: 0xf4f8ff, emissive: 0xe6efff, emissiveIntensity: 0 });
    const arc = new THREE.TorusGeometry(0.9, 0.06, 6, 12, Math.PI * 0.75);
    const swan = (x, z, both) => {
      cylMesh(g, 0.1, 0.16, 9, 8, lampM, x, 4.5, z);
      for (const s2 of both ? [-1, 1] : [-1]) {
        const a = new THREE.Mesh(arc, lampM); a.position.set(x + s2 * 0.9, 9, z); a.rotation.set(0, 0, s2 > 0 ? 0 : Math.PI * 0.25); if (s2 < 0) a.rotation.y = Math.PI; g.add(a);
        const b = boxMesh(g, 0.6, 0.12, 0.28, w.bulbMatShared, x + s2 * 1.75, 9.25, z); b.userData.keep = true;
        w.streetLights.push({ x: x + s2 * 1.75, z });
      }
      col.addC(x, z, 0.35, 0.35, 9, 'pole');
    };
    for (let z = -430; z < 295; z += 28) {
      if (z > PZ0 - 4 && z < PZ1 + 4) continue;
      swan(512.4, z, false);                 // sea-side row, arms over the walk
      swan(499.6, z + 14, true);             // road-side row between the hedges, arms over road and walk
    }
    w.nightMats.push([w.bulbMatShared, 3]);
    w.wallSeats = [];
    for (let z = -430; z < 290; z += 9) if (z < PZ0 - 3 || z > PZ1 + 3) w.wallSeats.push({ x: 513.3, z, yaw: Math.PI / 2 });
    bake(g);

    /* ---------- Gandhi Thidal (from reference photo): red granite steps, iron-fenced plinth,
       white cusped-arch canopy with a pointed roof, bronze statue on a white stepped pedestal,
       and eight tall carved granite pillars on white square bases ---------- */
    const cx = 512, cz = -160;
    pathStrip(scene, T, 497, PZ0, PX1, PZ1, 0.09);
    const gs = group(scene, cx, cz);
    const red = mat(0x9c5a4f, { roughness: 0.75 }), redTop = mat(0xb07a6c, { roughness: 0.7 }), whiteM = WHITE(), plinthM = mat(0x8a7e6a, { roughness: 0.9 });
    // three broad red-granite steps up to the plaza
    boxMesh(gs, 27, 0.16, 29, red, 0, 0.08, 0); boxMesh(gs, 26, 0.16, 28, red, 0, 0.24, 0); boxMesh(gs, 25, 0.12, 27, redTop, 0, 0.38, 0);
    w.walk.add(cx - 13.5, cz - 14.5, cx + 13.5, cz + 14.5, 0.44);
    col.add(cx - 13.5, cz - 14.5, cx + 13.5, cz + 14.5, 0.44, 'vehonly');
    // low stone plinth carrying the iron fence (14 x 14)
    for (const [x0, z0, x1, z1] of [[-7, -7, 7, -6.6], [-7, 6.6, 7, 7], [6.6, -7, 7, 7], [-7, -7, -6.6, -1.4], [-7, 1.4, -6.6, 7]]) boxMesh(gs, x1 - x0, 0.6, z1 - z0, plinthM, (x0 + x1) / 2, 0.74, (z0 + z1) / 2);
    // tall black railings with spear tips
    const iron = mat(0x111214, { metalness: 0.6, roughness: 0.35 }), spear = new THREE.ConeGeometry(0.04, 0.12, 4);
    const rail = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 0.16);
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
        boxMesh(gs, 0.025, 1.45, 0.025, iron, x, 1.77, z);
        const sp = new THREE.Mesh(spear, iron); sp.position.set(x, 2.55, z); gs.add(sp);
      }
      for (const y of [1.2, 2.3]) boxMesh(gs, Math.abs(x1 - x0) + 0.05, 0.04, Math.abs(z1 - z0) + 0.05, iron, (x0 + x1) / 2, y, (z0 + z1) / 2);
    };
    rail(-6.8, -6.8, 6.8, -6.8); rail(-6.8, 6.8, 6.8, 6.8); rail(6.8, -6.8, 6.8, 6.8); rail(-6.8, -6.8, -6.8, -1.4); rail(-6.8, 1.4, -6.8, 6.8);
    for (const [px, pz] of [[-6.8, -6.8], [6.8, -6.8], [-6.8, 6.8], [6.8, 6.8], [-6.8, -1.4], [-6.8, 1.4]]) boxMesh(gs, 0.18, 1.8, 0.18, iron, px, 1.95, pz);
    for (const [x0, z0, x1, z1] of [[-7, -7, 7, -6.6], [-7, 6.6, 7, 7], [6.6, -7, 7, 7], [-7, -7, -6.6, -1.4], [-7, 1.4, -6.6, 7]])
      col.add(cx + Math.min(x0, x1), cz + Math.min(z0, z1), cx + Math.max(x0, x1), cz + Math.max(z0, z1), 2.6, 'fence');
    // white stepped pedestal (with a white ramp-like stair as in the photo)
    boxMesh(gs, 6.4, 0.5, 6.4, whiteM, 0, 0.69, 0); boxMesh(gs, 5.4, 0.5, 5.4, whiteM, 0, 1.19, 0);
    const ramp = boxMesh(gs, 2.2, 0.25, 3.4, whiteM, -3.2, 0.9, 0); ramp.rotation.z = 0.32;
    boxMesh(gs, 1.7, 1.3, 1.7, whiteM, 0, 2.08, 0); boxMesh(gs, 1.9, 0.15, 1.9, whiteM, 0, 2.8, 0);
    // canopy: four slender white columns, cusped (scalloped) arches, cornice, pointed roof + finial
    const colH = 4.8, top = 1.44 + colH;
    for (const [px, pz] of [[-2.1, -2.1], [2.1, -2.1], [-2.1, 2.1], [2.1, 2.1]]) {
      cylMesh(gs, 0.17, 0.2, colH, 12, whiteM, px, 1.44 + colH / 2, pz);
      boxMesh(gs, 0.5, 0.3, 0.5, whiteM, px, 1.59, pz); boxMesh(gs, 0.5, 0.25, 0.5, whiteM, px, top - 0.1, pz);
    }
    const lobe = new THREE.TorusGeometry(0.42, 0.07, 5, 10, Math.PI);
    for (const face of [0, 1, 2, 3]) {
      const fg = new THREE.Group(); fg.rotation.y = face * Math.PI / 2; gs.add(fg);
      boxMesh(fg, 4.6, 0.5, 0.35, whiteM, 0, top + 0.1, 2.1);                 // lintel
      for (const [ox, oy, sc] of [[-1.05, top - 0.75, 1], [1.05, top - 0.75, 1], [0, top - 0.35, 1.25], [-0.55, top - 0.45, 0.8], [0.55, top - 0.45, 0.8]]) {
        const l = new THREE.Mesh(lobe, whiteM); l.position.set(ox, oy, 2.1); l.scale.setScalar(sc); fg.add(l);
      }
    }
    boxMesh(gs, 5.2, 0.25, 5.2, whiteM, 0, top + 0.47, 0);                       // cornice
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const k = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 4), whiteM); k.position.set(Math.cos(a) * 2.45 * 1.05, top + 0.75, Math.sin(a) * 2.45 * 1.05); gs.add(k); }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.0, 4, 1), whiteM); roof.rotation.y = Math.PI / 4; roof.position.y = top + 1.6; gs.add(roof);
    const drum = cylMesh(gs, 0.55, 0.7, 0.5, 12, whiteM, 0, top + 2.6, 0); void drum;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), whiteM); bulb.position.y = top + 3.05; bulb.scale.y = 1.2; gs.add(bulb);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.2, 8), whiteM); fin.position.y = top + 4.0; gs.add(fin);
    // bronze statue on the pedestal, facing the road (west)
    const bronze = mat(0x26221d, { metalness: 0.55, roughness: 0.45 });
    const h = makeHuman({ skin: 0x26221d, shirt: 0x26221d, pants: 0x26221d, hair: 0x26221d, female: false, dhoti: true, bald: true });
    h.root.traverse((o) => { if (o.isMesh) o.material = bronze; });
    h.parts.legL.rotation.x = 0.3; h.parts.legR.rotation.x = -0.2; h.parts.armR.rotation.x = -0.45;
    boxMesh(h.parts.armR, 0.05, 1.7, 0.05, bronze, 0, -0.9, 0.15).rotation.x = 0.4; // walking stick
    h.root.scale.setScalar(1.55); h.root.position.y = 2.88; h.root.rotation.y = -Math.PI / 2; gs.add(h.root);
    // eight tall carved granite pillars on white square bases with dark caps
    const carved = pillarMat();
    const pillarPos = [[-11.5, -12], [-11.5, 12], [-4.5, -12.5], [-4.5, 12.5], [4, -12.5], [4, 12.5], [11, -11.5], [11, 11.5]];
    for (const [px, pz] of pillarPos) {
      boxMesh(gs, 1.7, 1.7, 1.7, whiteM, px, 1.29, pz);
      boxMesh(gs, 1.95, 0.2, 1.95, mat(0x2b2a28), px, 2.24, pz);                 // dark capstone of the base
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 11, 10), carved); shaft.position.set(px, 7.85, pz); shaft.castShadow = true; gs.add(shaft);
      cylMesh(gs, 0.6, 0.55, 0.35, 10, mat(0x4e4943), px, 2.5, pz);
      cylMesh(gs, 0.55, 0.45, 0.45, 10, mat(0x4e4943), px, 13.5, pz);              // capital
      boxMesh(gs, 1.15, 0.3, 1.15, mat(0x4e4943), px, 13.85, pz);
      col.addC(cx + px, cz + pz, 1.7, 1.7, 14, 'pillar');
    }
    w.thidal = { cx, cz, steps: [] };
    for (let z = -12; z <= 12; z += 1.6) if (Math.abs(z) > 2) w.thidal.steps.push({ x: cx - 13.2, z: cz + z, yaw: -Math.PI / 2 });   // people sit on the red steps facing the road
    bake(gs);
    col.addC(cx, cz, 6.4, 6.4, 8, 'statue');

    /* ---------- Old Lighthouse (1836): white tower across Goubert Avenue ---------- */
    const lx = 474, lz = -100;
    const lh = group(scene, lx, lz);
    boxMesh(lh, 9, 0.6, 9, mat(0xd8d2c4), 0, 0.3, 0);
    const lt = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.6, 26, 20), whiteM); lt.position.y = 13.5; lh.add(lt);
    for (let k = 0; k < 4; k++) cylMesh(lh, 2.45 - k * 0.24, 2.5 - k * 0.24, 0.35, 20, mat(0xeeeeee), 0, 3 + k * 6, 0);
    for (let k = 0; k < 6; k++) { const win = boxMesh(lh, 0.5, 0.9, 0.1, mat(0x263238), 0, 5 + k * 3.6, 2.3 - k * 0.12); win.userData.keep = true; }
    cylMesh(lh, 2.5, 2.5, 0.4, 20, mat(0x37474f), 0, 26.7, 0);
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; cylMesh(lh, 0.03, 0.03, 0.9, 4, mat(0x37474f), Math.cos(a) * 2.4, 27.3, Math.sin(a) * 2.4); }
    cylMesh(lh, 1.2, 1.2, 2.2, 14, mat(0xffffff), 0, 28.0, 0);
    const lamp = cylMesh(lh, 1.0, 1.0, 1.4, 12, new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffee88, emissiveIntensity: 0 }), 0, 28.0, 0); lamp.userData.keep = true;
    w.lighthouseLamp = lamp.material;
    const ldome = new THREE.Mesh(new THREE.SphereGeometry(1.3, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x37474f)); ldome.position.y = 29.1; lh.add(ldome);
    bake(lh); col.addC(lx, lz, 5.4, 5.4, 32, 'lighthouse');

    /* ---------- North Beach Road: rock spire garden, blue railing, yellow compound wall ---------- */
    {
      const rz = -480, rx = 506;
      const park = group(scene, rx, rz);
      boxMesh(park, 18, 0.25, 22, mat(0x7da85a), 0, 0.12, 0);
      const rockM = new THREE.MeshStandardMaterial({ color: 0x8c7f70, roughness: 1, flatShading: true });
      const spire = [[0, 0, 3.2, 2.2], [0.4, 2.2, 2.6, 2.0], [-0.3, 4.0, 2.1, 1.9], [0.2, 5.6, 1.6, 1.8], [-0.1, 7.0, 1.1, 1.6], [0.1, 8.2, 0.7, 1.4], [0, 9.2, 0.35, 1.0]];
      for (const [ox, oy, r, h2] of spire) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), rockM); m.position.set(ox, oy + h2 / 2, ox * 0.5); m.scale.set(r, h2, r * 0.85); m.rotation.y = oy; m.castShadow = true; park.add(m); }
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), rockM); m.position.set(Math.cos(a) * 4, 0.6, Math.sin(a) * 4.5); m.scale.setScalar(rng.range(0.7, 1.3)); park.add(m); }
      bake(park); col.addC(rx, rz, 7, 7, 10, 'rock');
      // blue painted railing on a blue/white plinth around the garden
      fence(w, rx - 9, rz - 11, rx + 9, rz + 11, 1.1, mat(0x2f86d6, { metalness: 0.3, roughness: 0.5 }), [{ side: 'W', at: rz, w: 3 }], 'fence');
      const pg = new THREE.Group(); scene.add(pg);
      for (const [x0, z0, x1, z1] of [[rx - 9, rz - 11, rx + 9, rz - 11], [rx - 9, rz + 11, rx + 9, rz + 11], [rx + 9, rz - 11, rx + 9, rz + 11]]) {
        const len = Math.hypot(x1 - x0, z1 - z0), alongZ = x0 === x1;
        const k = boxMesh(pg, alongZ ? 0.45 : len, 0.4, alongZ ? len : 0.45, kerbMat(len), (x0 + x1) / 2, 0.2, (z0 + z1) / 2); k.userData.keep = true;
      }
      // long yellow compound wall with white pilasters on the town side
      const wallC = mat(0xf2c230, { roughness: 0.85 }), pil = WHITE();
      boxMesh(pg, 0.35, 2.4, 110, wallC, 480.5, 1.2, -515);
      for (let z = -570; z <= -460; z += 4) boxMesh(pg, 0.55, 2.6, 0.5, pil, 480.5, 1.3, z);
      boxMesh(pg, 0.5, 0.15, 110, pil, 480.5, 2.45, -515);
      col.add(480.2, -570, 480.8, -460, 2.4, 'wall');
      lawn(scene, T, 470, -570, 480.2, -460, 0.03);
      for (let z = -565; z < -460; z += 9) w.treeSpots.push([474, z, 'palm']);
      bake(pg);
    }

    // French war memorial
    const wm = group(scene, 506, -300);
    boxMesh(wm, 6, 0.6, 6, STONE(), 0, 0.3, 0);
    for (const [px, pz] of [[-2.3, -2.3], [2.3, -2.3], [-2.3, 2.3], [2.3, 2.3]]) cylMesh(wm, 0.3, 0.35, 5, 10, whiteM, px, 3.1, pz);
    boxMesh(wm, 6, 0.8, 6, whiteM, 0, 6, 0); boxMesh(wm, 1.2, 2.4, 1.2, mat(0x4e3b24, { metalness: 0.6 }), 0, 1.8, 0);
    bake(wm); col.addC(506, -300, 6, 6, 6, 'memorial');

    // Rock Beach riprap: a wide band of flat, angular granite slabs (dark grey and rust-brown)
    // sloping from the sea wall down to the sand, as on the real Pondicherry sea front.
    const slabs = [];
    const openingAt = (z) => STEP_Z.some((sz) => Math.abs(z - sz) < 2.4);
    for (let z = -456; z < 302; z += 1.35) {
      if (z > PZ0 - 1 && z < PZ1 + 1) continue;
      const groyne = (z > 60 && z < 76) || (z > 200 && z < 216);
      const bandEnd = z < -60 ? 528 : groyne ? 545 : 521.5;   // Rock Beach is all rocks; Promenade Beach has sand in front
      for (let x = 513.9; x < bandEnd; x += 1.45) {
        if (openingAt(z) && x < bandEnd - 1) continue;
        if (rng() < 0.08) continue;
        if (x > 512.5 && x < 531.5 && z > -86.5 && z < -57.5) continue;   // café footprint
        const t = (x - 513.5) / Math.max(1, bandEnd - 513.5);
        slabs.push([x + rng.range(-0.4, 0.4), z + rng.range(-0.35, 0.35), t]);
      }
    }
    const sg = new THREE.BoxGeometry(1, 1, 1, 2, 1, 2).toNonIndexed();
    { const p = sg.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i); const j = Math.sin(X * 9.1 + Z * 7.3 + Y * 3.1); p.setXYZ(i, X * (1 + j * 0.12), Y + (Y > 0 ? j * 0.08 : 0), Z * (1 - j * 0.1)); } sg.computeVertexNormals(); }
    const slabMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true });
    const tiles = new Map();
    for (const sl of slabs) { const k = Math.floor(sl[1] / 120); if (!tiles.has(k)) tiles.set(k, []); tiles.get(k).push(sl); }
    const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), cA = new THREE.Color();
    for (const list of tiles.values()) {
      const rm = new THREE.InstancedMesh(sg, slabMat, list.length);
      list.forEach(([x, z, t], i) => {
        const sx = rng.range(1.3, 2.4), sy = rng.range(0.45, 0.9), sz = rng.range(1.0, 1.9);
        e.set(rng.range(-0.25, 0.25), rng() * Math.PI, rng.range(-0.25, 0.25) - t * 0.15); q.setFromEuler(e);
        mx.compose(new THREE.Vector3(x, 0.55 - t * 1.0 + rng.range(-0.15, 0.15), z), q, new THREE.Vector3(sx, sy, sz));
        rm.setMatrixAt(i, mx);
        const rust = rng() < 0.3;
        rm.setColorAt(i, rust ? cA.setHSL(0.05 + rng() * 0.03, 0.32, rng.range(0.3, 0.42)) : cA.setHSL(0.08, 0.04, rng.range(0.2, 0.38)));
      });
      rm.computeBoundingSphere(); rm.castShadow = rm.receiveShadow = true; scene.add(rm);
    }
  }

  /* ================= Bharathi Park + Aayi Mandapam ================= */
  {
    const x0 = 358, x1 = 412, z0 = -192, z1 = -129, cx = 385, cz = -160;
    lawn(scene, T, x0, z0, x1, z1);
    pathStrip(scene, T, cx - 2, z0, cx + 2, z1); pathStrip(scene, T, x0, cz - 2, x1, cz + 2);
    pathStrip(scene, T, cx - 11, cz - 9, cx + 11, cz + 9, 0.055);
    fence(w, x0, z0, x1, z1, 0.8, mat(0x2e4d3a, { metalness: 0.4 }), [{ side: 'N', at: cx, w: 4 }, { side: 'S', at: cx, w: 4 }, { side: 'W', at: cz, w: 4 }, { side: 'E', at: cz, w: 4 }]);
    for (let i = 0; i < 26; i++) {
      const x = rng.range(x0 + 3, x1 - 3), z = rng.range(z0 + 3, z1 - 3);
      if (Math.abs(x - cx) < 14 && Math.abs(z - cz) < 12) continue; if (Math.abs(x - cx) < 4 || Math.abs(z - cz) < 4) continue;
      w.treeSpots.push([x, z, 'broad']);
    }
    // Aayi Mandapam
    const am = group(scene, cx, cz);
    const wm = WHITE();
    boxMesh(am, 15, 0.4, 12, wm, 0, 0.2, 0); boxMesh(am, 13.8, 0.4, 10.8, wm, 0, 0.6, 0); boxMesh(am, 12.6, 0.4, 9.6, wm, 0, 1.0, 0);
    for (const px of [-5, -2.5, 2.5, 5]) for (const pz of [-3.8, 3.8]) {
      cylMesh(am, 0.38, 0.42, 6, 14, wm, px, 4.2, pz); boxMesh(am, 1.0, 0.35, 1.0, wm, px, 7.3, pz); boxMesh(am, 1.0, 0.3, 1.0, wm, px, 1.35, pz);
    }
    for (const px of [-5, 5]) cylMesh(am, 0.38, 0.42, 6, 14, wm, px, 4.2, 0);
    boxMesh(am, 12, 1.0, 9, wm, 0, 8.0, 0); boxMesh(am, 12.6, 0.3, 9.6, wm, 0, 8.6, 0);
    boxMesh(am, 6, 1.8, 6, wm, 0, 9.7, 0);
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 6.2, 18, 1, false, -Math.PI / 2, Math.PI), wm); arch.rotation.z = Math.PI / 2; arch.position.y = 10.6; am.add(arch);
    boxMesh(am, 2.2, 3.2, 1.8, mat(0xe9e4d8), 0, 2.8, 0); // central plinth
    bake(am); col.addC(cx, cz, 13, 10, 11, 'monument');
    w.walk.add(cx - 7.5, cz - 6, cx + 7.5, cz + 6, 0.4);
    // fountains
    for (const [fx, fz] of [[cx - 16, cz], [cx + 16, cz]]) {
      const f = group(scene, fx, fz); cylMesh(f, 2.2, 2.4, 0.6, 20, STONE(), 0, 0.3, 0);
      const water = cylMesh(f, 2.0, 2.0, 0.1, 20, mat(0x3a7ca5, { roughness: 0.1 }), 0, 0.55, 0); water.userData.keep = true;
      cylMesh(f, 0.25, 0.3, 1.6, 8, STONE(), 0, 0.8, 0); bake(f); col.addC(fx, fz, 4.6, 4.6, 0.6, 'vehonly');
    }
  }

  /* ================= Raj Nivas ================= */
  {
    const g = group(scene, 385, -240);
    boxMesh(g, 40, 9, 16, WHITE(), 0, 4.5, -4); boxMesh(g, 41, 0.4, 17, mat(0xe0d6c0), 0, 9.2, -4);
    for (let i = -6; i <= 6; i++) cylMesh(g, 0.35, 0.38, 8.5, 10, WHITE(), i * 3, 4.25, 4.6);
    boxMesh(g, 40, 0.6, 2.6, WHITE(), 0, 8.8, 4.6);
    for (let i = -6; i <= 6; i++) boxMesh(g, 1.2, 2.2, 0.1, mat(0x3e5a3c), i * 3 + 1.5, 2, 4.05);
    cylMesh(g, 0.1, 0.12, 9, 6, mat(0xdddddd), 0, 13.5, -4);
    const flag = new THREE.Group(); flag.position.set(0.9, 17, -4); g.add(flag);
    boxMesh(flag, 1.8, 0.4, 0.04, mat(0xff9933), 0, 0.4, 0); boxMesh(flag, 1.8, 0.4, 0.04, mat(0xffffff), 0, 0, 0); boxMesh(flag, 1.8, 0.4, 0.04, mat(0x138808), 0, -0.4, 0);
    const chakra = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), mat(0x000080)); chakra.position.set(0, 0, 0.03); flag.add(chakra);
    bake(g); col.add(365, -252, 405, -236, 10, 'building'); col.add(365, -236, 405, -235, 9, 'building');
    lawn(scene, T, 358, -272, 412, -208);
    fence(w, 358, -272, 412, -208, 2.4, mat(0xf3ead2), [{ side: 'S', at: 385, w: 6 }], 'wall');
  }

  /* ================= Manakula Vinayagar Temple ================= */
  {
    const x0 = 289, x1 = 341, z0 = -111, z1 = -49;
    const stripes = templeWallMat();
    fence(w, x0, z0, x1, z1, 3, stripes, [{ side: 'E', at: -80, w: 6 }], 'wall');
    pathStrip(scene, T, x0, z0, x1, z1, 0.04);
    gopuram(scene, T, 338, -80, 12, 7, 5, Math.PI / 2);
    col.add(334, -86, 342, -82, 25, 'temple'); col.add(334, -78, 342, -74, 25, 'temple');
    const sh = group(scene, 312, -80);
    boxMesh(sh, 14, 6, 18, mat(0xf0e2c0), 0, 3, 0); boxMesh(sh, 15, 0.5, 19, mat(0xd35400), 0, 6.2, 0);
    gopuram(sh, T, 0, 0, 6, 6, 3, Math.PI / 2).g.position.y = 6.4;
    // temple elephant
    const el = new THREE.Group(); el.position.set(326, 0, -70); el.rotation.y = Math.PI / 2; scene.add(el);
    const ge = mat(0x6e6a6a);
    boxMesh(el, 1.6, 1.5, 2.8, ge, 0, 2.0, 0); boxMesh(el, 1.2, 1.2, 1.0, ge, 0, 2.4, 1.7);
    boxMesh(el, 0.3, 1.6, 0.3, ge, 0, 1.4, 2.25).rotation.x = 0.15;
    for (const [lx, lz] of [[-0.5, 1], [0.5, 1], [-0.5, -1], [0.5, -1]]) boxMesh(el, 0.45, 1.3, 0.45, ge, lx, 0.65, lz);
    boxMesh(el, 0.1, 1.0, 0.8, ge, -0.65, 2.4, 1.5); boxMesh(el, 0.1, 1.0, 0.8, ge, 0.65, 2.4, 1.5);
    boxMesh(el, 1.62, 0.9, 1.6, mat(0xc0392b), 0, 2.5, 0); // decorated cloth
    bake(el); bake(sh);
    col.add(305, -89, 319, -71, 12, 'temple'); col.addC(326, -70, 3, 2, 3, 'elephant');
  }

  /* ================= Churches ================= */
  const church = (cx, cz, faceRot, wallC, trimC, big) => {
    const g = group(scene, cx, cz, faceRot);
    const W = big ? 16 : 14, L = big ? 40 : 30, H = big ? 14 : 12;
    const wallM = mat(wallC), trimM = mat(trimC);
    boxMesh(g, W, H, L, wallM, 0, H / 2, 0);
    const roof = triPrism(L, W + 1, 5, mat(0x5d4037)); roof.position.y = H; g.add(roof);
    // twin front towers (front is +Z local)
    for (const s of [-1, 1]) {
      const tx = s * (W / 2 - 2.5), tz = L / 2 - 1;
      boxMesh(g, 6, H + 12, 6, wallM, tx, (H + 12) / 2, tz);
      for (let k = 1; k < 4; k++) boxMesh(g, 6.4, 0.4, 6.4, trimM, tx, k * (H + 12) / 4, tz);
      if (big) { const sp = new THREE.Mesh(new THREE.ConeGeometry(3.4, 11, 4), mat(0x6d4c41)); sp.rotation.y = Math.PI / 4; sp.position.set(tx, H + 12 + 5.5, tz); g.add(sp); }
      else { const d = new THREE.Mesh(new THREE.SphereGeometry(2.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), trimM); d.position.set(tx, H + 12, tz); g.add(d); }
      boxMesh(g, 0.25, 2.2, 0.25, mat(0xf1c40f, { metalness: 0.7 }), tx, H + 12 + (big ? 11.5 : 3.2), tz);
      boxMesh(g, 1.2, 0.25, 0.25, mat(0xf1c40f, { metalness: 0.7 }), tx, H + 12 + (big ? 11.9 : 3.6), tz);
    }
    boxMesh(g, W - 10, H + 3, 1, wallM, 0, (H + 3) / 2, L / 2 + 1.5);
    const rose = new THREE.Mesh(new THREE.CircleGeometry(2.0, 20), new THREE.MeshStandardMaterial({ color: 0x1f3a93, emissive: 0x6b2fbf, emissiveIntensity: 0.1, roughness: 0.2 }));
    rose.position.set(0, H - 1.5, L / 2 + 2.05); g.add(rose);
    boxMesh(g, 3.2, 5.5, 0.3, mat(0x4e342e), 0, 2.75, L / 2 + 2.05); // door
    for (let k = -3; k <= 3; k++) for (const s of [-1, 1]) boxMesh(g, 0.2, 4.5, 1.6, mat(0x283593), s * (W / 2 + 0.05), H / 2, k * (L / 8)); // windows
    bake(g);
    // collider in world space (rotation is multiple of PI/2)
    const along = Math.abs(Math.sin(faceRot)) > 0.5;
    const sx = along ? L + 4 : W + 2, sz = along ? W + 2 : L + 4;
    col.addC(cx, cz, sx, sz, H + 10, 'church');
  };
  church(130, 252, Math.PI, 0x8d4f3a, 0xf5f5f5, true);           // Sacred Heart Basilica (brown/white gothic), faces north
  lawn(scene, T, 99, 208, 161, 290);
  church(128, -320, Math.PI / 2, 0xf3e5ab, 0x5dade2, false);     // Immaculate Conception Cathedral, faces Mission Street
  lawn(scene, T, 99, -352, 161, -288);

  /* ================= Hospital ================= */
  {
    const g = group(scene, 318, 160);
    const map = T.colonial.clone(), em = T.colonialE.clone(); map.needsUpdate = em.needsUpdate = true; map.repeat.set(3, 0.8); em.repeat.set(3, 0.8);
    const m = new THREE.MeshStandardMaterial({ map, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: 0, color: new THREE.Color(1.5, 1.5, 1.48) });
    boxMesh(g, 44, 11, 22, m, 0, 5.5, 0).userData.keep = true; w.nightMats.push([m, 0.8]);
    boxMesh(g, 45, 0.6, 23, WHITE(), 0, 11.2, 0);
    boxMesh(g, 3, 0.9, 0.2, mat(0xd32f2f, { emissive: 0xd32f2f, emissiveIntensity: 0.4 }), -16, 9, -11.2); boxMesh(g, 0.9, 3, 0.2, mat(0xd32f2f, { emissive: 0xd32f2f, emissiveIntensity: 0.4 }), -16, 9, -11.2);
    signBoard(g, 'GOVERNMENT GENERAL HOSPITAL', 18, 1.6, 0, 9.5, -11.15, Math.PI, { bg: '#ffffff', fg: '#c62828' });
    bake(g); col.addC(318, 160, 44, 22, 12, 'building');
  }
  /* ================= Police station ================= */
  {
    const g = group(scene, 132, -80);
    boxMesh(g, 20, 8, 28, mat(0xc0392b), 0, 4, 0); boxMesh(g, 20.6, 0.5, 28.6, WHITE(), 0, 8.2, 0);
    for (let k = -4; k <= 4; k++) boxMesh(g, 0.2, 2.2, 1.4, WHITE(), 10.05, 5, k * 3);
    boxMesh(g, 0.2, 3, 3, mat(0x4e342e), 10.05, 1.5, 0);
    signBoard(g, 'POLICE STATION', 10, 1.4, 10.15, 7, 0, Math.PI / 2, { bg: '#1a237e', fg: '#ffffff' });
    bake(g); col.addC(132, -80, 20, 28, 9, 'building');
    fence(w, 99, -111, 161, -49, 1.8, WHITE(), [{ side: 'E', at: -80, w: 10 }], 'wall');
  }

  /* ================= Bus stand ================= */
  {
    const x0 = -390, x1 = -330, z0 = -192, z1 = -129;
    pathStrip(scene, T, x0, z0, x1, z1, 0.04);
    const g = group(scene, -360, -160);
    for (let i = -2; i <= 2; i++) for (const pz of [-8, 8]) { cylMesh(g, 0.35, 0.35, 6, 8, mat(0x90a4ae), i * 11, 3, pz); col.addC(-360 + i * 11, -160 + pz, 0.7, 0.7, 6, 'pole'); }
    boxMesh(g, 50, 0.6, 20, mat(0x546e7a), 0, 6.3, 0); boxMesh(g, 51, 0.3, 21, mat(0xf5b041), 0, 6.75, 0);
    boxMesh(g, 12, 4, 8, mat(0xfbeee6), -23, 2, 22); // ticket office
    signBoard(g, 'PONDICHERRY BUS STAND  •  பேருந்து நிலையம்', 26, 2, 0, 8.2, 10.6, 0, { bg: '#0d47a1', fg: '#ffffff' });
    for (let i = -4; i <= 4; i++) boxMesh(g, 0.25, 0.02, 9, mat(0xffffff), i * 5.5, 0.06, -20);
    bake(g); col.addC(-383, -138, 12, 8, 4, 'building');
  }

  /* ================= Railway station ================= */
  {
    const g = group(scene, 185, 318);
    const cream = mat(0xf3e5c0), maroon = mat(0x7b241c);
    boxMesh(g, 70, 9, 14, cream, 0, 4.5, 0); boxMesh(g, 71, 0.8, 15, maroon, 0, 9.4, 0);
    boxMesh(g, 16, 13, 15, cream, 0, 6.5, 0); boxMesh(g, 16.6, 0.8, 15.6, maroon, 0, 13.4, 0);
    for (let k = -10; k <= 10; k++) if (Math.abs(k) > 2) boxMesh(g, 1.6, 3.2, 0.2, maroon, k * 3.2, 4, -7.05);
    boxMesh(g, 5, 4, 0.3, mat(0x3e2723), 0, 2, -7.1);
    signBoard(g, 'PUDUCHERRY', 14, 2.2, 0, 11, -7.6, Math.PI, { bg: '#f7dc6f', fg: '#000', border: '#000' });
    bake(g); col.addC(185, 318, 70, 14, 14, 'building');
    // platform + canopy
    const p = group(scene, 190, 351);
    boxMesh(p, 250, 0.9, 8, mat(0xbdb5a6), 0, 0.45, 0);
    boxMesh(p, 250, 0.1, 0.4, mat(0xf4d03f), 0, 0.92, 3.8);
    for (let i = -10; i <= 10; i++) cylMesh(p, 0.18, 0.18, 4.2, 6, maroon, i * 10, 3, -1);
    boxMesh(p, 210, 0.3, 7, mat(0x8d6e63), 0, 5.2, -0.5);
    signBoard(p, 'PUDUCHERRY', 8, 1.2, -40, 3.5, -0.8, 0, { bg: '#f7dc6f', fg: '#000', border: '#000' });
    signBoard(p, 'PUDUCHERRY', 8, 1.2, 40, 3.5, -0.8, 0, { bg: '#f7dc6f', fg: '#000', border: '#000' });
    bake(p); col.add(65, 347, 315, 355, 0.9, 'vehonly'); w.walk.add(65, 347, 315, 355, 0.9);
    // parked train on track 2
    const trainBlue = mat(0x1f4e8c), roofM = mat(0x9e9e9e);
    let tx = 80;
    for (let k = 0; k < 6; k++) {
      const t = group(scene, tx, 368);
      if (k === 0) { boxMesh(t, 17, 3.8, 3.1, mat(0xc0392b), 0, 2.6, 0); boxMesh(t, 17, 0.5, 3.2, mat(0xf5f5f5), 0, 2.2, 0); boxMesh(t, 0.1, 1, 2.4, mat(0x1b2633), 8.55, 3.4, 0); }
      else {
        boxMesh(t, 21, 3.6, 3.1, trainBlue, 0, 2.5, 0); boxMesh(t, 21, 0.4, 2.9, roofM, 0, 4.4, 0);
        for (let i = -9; i <= 9; i += 1.5) for (const s of [-1, 1]) boxMesh(t, 0.9, 0.7, 0.05, mat(0x10161f), i, 3, s * 1.56);
        boxMesh(t, 21.02, 0.15, 3.12, mat(0xf4d03f), 0, 2.0, 0);
      }
      for (const o of [-6, 6]) boxMesh(t, 2.4, 0.6, 2.6, mat(0x222222), o, 0.6, 0);
      bake(t); col.addC(tx, 368, k === 0 ? 17 : 21, 3.2, 5, 'train');
      tx += k === 0 ? 19.5 : 21.8;
    }
  }

  /* ================= Botanical Garden ================= */
  {
    const x0 = -141, x1 = 0, z0 = 385, z1 = 520;
    lawn(scene, T, x0, z0, x1, z1);
    fence(w, x0, z0, x1, z1, 2.2, mat(0x1b5e20), [{ side: 'E', at: 450, w: 6 }], 'fence');
    pathStrip(scene, T, -75, 446, x1, 454); pathStrip(scene, T, -74, z0 + 2, -66, z1 - 2);
    const f = group(scene, -70, 450);
    cylMesh(f, 6, 6.4, 0.8, 28, STONE(), 0, 0.4, 0); cylMesh(f, 5.6, 5.6, 0.1, 28, mat(0x3a7ca5, { roughness: 0.1 }), 0, 0.75, 0);
    cylMesh(f, 0.6, 1.0, 2.5, 10, STONE(), 0, 1.25, 0); cylMesh(f, 1.6, 0.4, 0.4, 14, STONE(), 0, 2.6, 0);
    bake(f); col.addC(-70, 450, 12, 12, 0.8, 'vehonly');
    // glasshouse
    const gh = group(scene, -110, 420);
    const glass = new THREE.MeshStandardMaterial({ color: 0xbfe6d6, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.2 });
    const ghm = boxMesh(gh, 16, 5, 10, glass, 0, 2.5, 0); ghm.castShadow = false;
    const roof = triPrism(16, 10.2, 3, glass); roof.rotation.y = Math.PI / 2; roof.position.y = 5; roof.castShadow = false; gh.add(roof);
    for (let i = -8; i <= 8; i += 2) boxMesh(gh, 0.1, 5, 10.1, mat(0xffffff), i, 2.5, 0);
    col.addC(-110, 420, 16, 10, 7, 'building');
    for (let i = 0; i < 70; i++) {
      const x = rng.range(x0 + 4, x1 - 4), z = rng.range(z0 + 4, z1 - 4);
      if (Math.hypot(x + 70, z - 450) < 12 || Math.abs(x + 70) < 6 || (Math.abs(z - 450) < 6 && x > -75) || (Math.abs(x + 110) < 12 && Math.abs(z - 420) < 8)) continue;
      w.treeSpots.push([x, z, rng() < 0.3 ? 'palm' : 'broad']);
    }
    signBoard(scene, 'BOTANICAL GARDEN', 8, 1.4, 1.2, 3.6, 450, Math.PI / 2, { bg: '#1b5e20', fg: '#fff' });
  }

  /* ================= Paradise Beach ================= */
  {
    const thatch = mat(0xa1887f), wood = mat(0x6d4c41);
    for (let i = 0; i < 7; i++) {
      const hx = 470 + (i % 2) * 14, hz = 1270 + i * 22;
      const g = group(scene, hx, hz);
      boxMesh(g, 6, 2.8, 5, mat(0xd7ccc8), 0, 1.4, 0);
      const r = new THREE.Mesh(new THREE.ConeGeometry(5.2, 2.8, 4), thatch); r.rotation.y = Math.PI / 4; r.position.y = 4.2; g.add(r);
      for (const [px, pz] of [[-3, 2.8], [3, 2.8]]) cylMesh(g, 0.12, 0.12, 2.8, 6, wood, px, 1.4, pz);
      bake(g); col.addC(hx, hz, 6, 5, 4, 'building');
    }
    const ucols = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71, 0xe67e22, 0x9b59b6];
    for (let i = 0; i < 22; i++) {
      const ux = rng.range(500, 518), uz = rng.range(1180, 1520);
      const g = group(scene, ux, uz);
      cylMesh(g, 0.04, 0.04, 2.6, 5, mat(0xeeeeee), 0, 1.3, 0);
      const c = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.7, 10), mat(rng.pick(ucols))); c.position.y = 2.7; g.add(c);
      boxMesh(g, 0.7, 0.15, 1.8, mat(0xffffff), 1.2, 0.3, 0);
      bake(g);
    }
    for (let i = 0; i < 6; i++) { // fishing catamarans
      const g = group(scene, rng.range(512, 522), 1200 + i * 45, rng.range(-0.3, 0.3));
      for (const o of [-0.35, 0, 0.35]) boxMesh(g, 0.35, 0.35, 7, wood, o, 0.2, 0);
      cylMesh(g, 0.06, 0.06, 4, 5, wood, 0, 2.2, 1);
      bake(g);
    }
    const lt = group(scene, 505, 1350); for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cylMesh(lt, 0.1, 0.1, 3.5, 5, wood, px, 1.75, pz);
    boxMesh(lt, 2.6, 0.2, 2.6, wood, 0, 3.5, 0); boxMesh(lt, 2.6, 1.6, 2.6, mat(0xd32f2f), 0, 4.4, 0); bake(lt);
    signBoard(scene, 'PARADISE BEACH', 9, 1.6, 500, 3.6, 1243, Math.PI, { bg: '#00838f', fg: '#fff' });
    w.col.addC(505, 1350, 2.6, 2.6, 5, 'tower');
  }

  /* ================= Villianur Temple ================= */
  {
    const x0 = -1205, x1 = -1110, z0 = -175, z1 = -52;
    fence(w, x0, z0, x1, z1, 4, templeWallMat(), [{ side: 'E', at: -110, w: 8 }], 'wall');
    pathStrip(scene, T, x0, z0, x1, z1, 0.04);
    gopuram(scene, T, -1113, -110, 16, 9, 8, Math.PI / 2);
    col.add(-1118, -118, -1108, -102, 34, 'temple');
    const sh = group(scene, -1160, -110);
    boxMesh(sh, 26, 7, 30, mat(0xf0e2c0), 0, 3.5, 0); boxMesh(sh, 27, 0.5, 31, mat(0xd35400), 0, 7.2, 0);
    const v = gopuram(sh, T, 0, 0, 8, 8, 4, Math.PI / 2); v.g.position.y = 7.4;
    bake(sh); col.addC(-1160, -110, 26, 30, 12, 'temple');
    for (let i = 0; i < 6; i++) { const m = group(scene, -1125, -150 + i * 16); cylMesh(m, 0.6, 0.6, 6, 8, STONE(), 0, 3, 0); bake(m); col.addC(-1125, -150 + i * 16, 1.2, 1.2, 6, 'pillar'); }
    // temple tank with steps
    const tk = group(scene, -1178, 25);
    for (let k = 0; k < 5; k++) boxMesh(tk, 62 - k * 6, 0.5, 52 - k * 6, STONE(), 0, -0.25 - k * 0.5, 0);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(36, 26), mat(0x2e6b5a, { roughness: 0.1, metalness: 0.2 })); water.rotation.x = -Math.PI / 2; water.position.y = -2.0; water.userData.keep = true; tk.add(water);
    boxMesh(tk, 4, 6, 4, mat(0xf0e2c0), 0, 0, 0);
    bake(tk); col.addC(-1178, 25, 62, 52, 0.9, 'vehonly');
    // temple car (ther)
    const tc = group(scene, -1220, 90);
    boxMesh(tc, 5, 2, 6, mat(0x5d4037), 0, 2, 0);
    for (let k = 0; k < 4; k++) boxMesh(tc, 4.4 - k * 0.8, 1.6, 5.4 - k * 0.8, mat(k % 2 ? 0x8d6e63 : 0x6d4c41), 0, 3.8 + k * 1.6, 0);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3, 8), mat(0xc0392b)); top.position.y = 11.5; tc.add(top);
    for (const [px, pz] of [[-2.7, -2], [2.7, -2], [-2.7, 2], [2.7, 2]]) { const wh = cylMesh(tc, 1.1, 1.1, 0.5, 12, mat(0x3e2723), px, 1.1, pz); wh.rotation.z = Math.PI / 2; }
    bake(tc); col.addC(-1220, 90, 6, 7, 10, 'chariot');
  }

  /* ================= Tea stalls ================= */
  w.teaStalls = [];
  for (const s of TEA_STALLS) {
    const g = group(scene, s.x, s.z);
    boxMesh(g, 2.2, 1.1, 1.4, mat(0x2e86c1), 0, 0.55, 0);
    boxMesh(g, 2.6, 0.08, 2.0, mat(0xc0392b), 0, 2.3, 0);
    for (const [px, pz] of [[-1.1, -0.9], [1.1, -0.9], [-1.1, 0.9], [1.1, 0.9]]) cylMesh(g, 0.04, 0.04, 2.3, 4, mat(0x795548), px, 1.15, pz);
    cylMesh(g, 0.2, 0.25, 0.5, 8, mat(0xb0bec5, { metalness: 0.8, roughness: 0.3 }), 0.5, 1.35, 0);
    for (let k = 0; k < 4; k++) cylMesh(g, 0.05, 0.04, 0.1, 6, mat(0xffffff), -0.6 + k * 0.2, 1.15, 0.3);
    signBoard(g, 'TEA • CHAI ₹10', 2.2, 0.45, 0, 2.6, 0.95, 0, { bg: '#f1c40f', fg: '#7b241c' });
    bake(g); col.addC(s.x, s.z, 2.4, 1.6, 1.2, 'stall');
    w.teaStalls.push(s);
  }
}

let _templeMat = null;
function templeWallMat() {
  if (_templeMat) return _templeMat;
  const c = document.createElement('canvas'); c.width = 64; c.height = 8; const x = c.getContext('2d');
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#f5f5f5' : '#c0392b'; x.fillRect(i * 8, 0, 8, 8); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 1); t.colorSpace = THREE.SRGBColorSpace;
  _templeMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  return _templeMat;
}

let _seaWall = null;
/** White sea wall with sky-blue chevrons (as painted along Pondicherry's promenade). */
function seaWallMat() {
  if (_seaWall) return _seaWall;
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#f2f0ea'; x.fillRect(0, 0, 128, 64);
  x.fillStyle = '#3f9be0'; x.beginPath(); x.moveTo(0, 0); x.lineTo(128, 0); x.lineTo(64, 40); x.closePath(); x.fill();
  x.fillStyle = 'rgba(0,0,0,0.08)'; for (let i = 0; i < 300; i++) x.fillRect(Math.random() * 128, Math.random() * 64, 2, 2);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  _seaWall = new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 });
  return _seaWall;
}

/** Kerb stones painted alternately sky-blue and white (Pondicherry beach road style). */
let _kerbTex = null;
function kerbMat(len) {
  if (!_kerbTex) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 8; const x = c.getContext('2d');
    x.fillStyle = '#f4f4f0'; x.fillRect(0, 0, 64, 8); x.fillStyle = '#2f86d6'; x.fillRect(0, 0, 32, 8);
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(31, 0, 2, 8); x.fillRect(63, 0, 1, 8);
    _kerbTex = new THREE.CanvasTexture(c); _kerbTex.wrapS = _kerbTex.wrapT = THREE.RepeatWrapping; _kerbTex.colorSpace = THREE.SRGBColorSpace;
  }
  const t = _kerbTex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, len / 1.2), 1);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 });
}

let _pillar = null;
/** Carved granite texture for the Gandhi Thidal pillars (stacked relief panels and bands). */
function pillarMat() {
  if (_pillar) return _pillar;
  const c = document.createElement('canvas'); c.width = 128; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#5c5650'; x.fillRect(0, 0, 128, 512);
  for (let y = 0; y < 512; y += 64) {
    x.fillStyle = '#3e3a35'; x.fillRect(0, y, 128, 8); x.fillRect(0, y + 56, 128, 4);
    x.fillStyle = '#6e675f'; x.fillRect(0, y + 8, 128, 3);
    for (let k = 0; k < 4; k++) { // little relief figures in niches
      const px = k * 32 + 6; x.fillStyle = '#48433d'; x.fillRect(px, y + 14, 20, 38);
      x.fillStyle = '#7a7269'; x.beginPath(); x.arc(px + 10, y + 22, 4, 0, 7); x.fill(); x.fillRect(px + 6, y + 27, 8, 14); x.fillRect(px + 5, y + 41, 4, 9); x.fillRect(px + 11, y + 41, 4, 9);
    }
  }
  for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? 0 : 255},${Math.random() < 0.5 ? 0 : 255},${Math.random() < 0.5 ? 0 : 255},0.05)`; x.fillRect(Math.random() * 128, Math.random() * 512, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2.5); t.colorSpace = THREE.SRGBColorSpace;
  return (_pillar = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }));
}
