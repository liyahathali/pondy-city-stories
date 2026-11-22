// Low-poly character and vehicle models built from primitives.
import * as THREE from 'three';
import { mat, boxMesh, sharedBox, bake, pick } from './utils.js';
import { HUMAN_CELLS } from './textures.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* =================================================================== */
/* Humans                                                               */
/* =================================================================== */
// South Indian skin tones, everyday clothing colours seen on Pondicherry streets.
const SKIN = [0x8d5524, 0x6b4423, 0xa0663a, 0x7a4a2a, 0xb07848, 0x5a3825, 0x93603a];
const SHIRTS = [0xffffff, 0xf5f5f5, 0x2e86c1, 0x85c1e9, 0xe74c3c, 0xf4d03f, 0x27ae60, 0x8e44ad, 0xf39c12, 0x34495e, 0xd5dbdb, 0x16a085, 0xd35400, 0xf1948a, 0x5d6d7e, 0xa9cce3];
const PANTS = [0x2c3e50, 0x1b2631, 0x5d6d7e, 0x7b5e3b, 0x283747, 0x4d5656, 0x1f3a5f];
const SAREE = [0xc2185b, 0x8e24aa, 0x00897b, 0xef6c00, 0xe91e63, 0x1e88e5, 0xfdd835, 0x283593, 0xd81b60, 0x2e7d32, 0x6a1b9a, 0xf48fb1, 0x0d47a1, 0xbf360c];
const BORDER = [0xf1c40f, 0xd4ac0d, 0xb71c1c, 0x1b5e20, 0xffffff, 0x4a148c];

/* Ten classic Tamil-street outfit styles that NPCs are dressed in at random. */
export const OUTFITS = {
  // yellow shirt, striped lungi, white veshti folded and tied around the waist on top
  lungiUncle: () => ({ female: false, shirt: 0xf6e04b, pants: 0xf2f2ee, lungi: true, lungiStripes: 0x2e7d4f, waistCloth: 0xf7f7f2, moustache: true, hair: 0x111111, h: 0.97 }),
  // elderly man: short white dhoti, white shawl draped over one shoulder, bare chest, round specs, walking stick, newspaper
  dhotiElder: () => ({ female: false, old: true, hair: 0xcfcfcf, shirt: pick([0xffffff, 0xf3efe2, 0xdfe8f0]), dhoti: true, skirtLen: 0.5, pants: 0xf3f0e6, borderColor: pick([0x2e7d32, 0x8d2b0b, 0xd4ac0d]), towelShoulder: 0xf7f3e8, moustache: true, stick: Math.random() < 0.4, newspaper: true, h: 0.97 }),
  autoDriver: () => ({ female: false, shirt: 0xb59a62, pants: 0xb59a62, towelShoulder: 0xffffff, moustache: true, hair: 0x111111, h: 1.0 }),
  fisherman: () => ({ female: false, vest: true, shirt: 0xf5f5f5, pants: pick([0x1565c0, 0xc62828, 0x2e7d32]), lungi: true, lungiStripes: 0x111111, skirtLen: 0.55, turban: 0xf4e04d, moustache: true, hair: 0x111111, h: 0.98 }),
  priest: () => ({ female: false, bareChest: true, dhoti: true, pants: 0xf3eedc, shawl: 0xd4ac0d, vibhuti: true, hair: 0x111111, h: 0.98, bald: Math.random() < 0.5 }),
  whiteVeshti: () => ({ female: false, shirt: 0xffffff, longSleeve: true, dhoti: true, pants: 0xffffff, borderColor: 0x2e7d32, watch: true, moustache: true, hair: 0x111111, h: 1.02 }),
  officeMan: () => ({ female: false, shirt: pick([0xa9cce3, 0xffffff, 0xd5dbdb, 0xf5cba7]), longSleeve: true, pants: 0x2c3e50, idTag: true, bag: 0x212121, glasses: Math.random() < 0.5, moustache: true, hair: 0x111111, h: 1.0 }),
  paati: () => ({ female: true, old: true, saree: true, hair: 0xdddddd, shirt: 0x6a1b9a, pants: pick([0x6a1b9a, 0x1b5e20, 0x8d2b0b]), border: 0xd4ac0d, noseRing: true, jasmine: true, bindi: true, h: 0.9 }),
  flowerSeller: () => ({ female: true, saree: true, hair: 0x111111, shirt: 0xc62828, pants: 0xe65100, border: 0x1b5e20, headBasket: true, jasmine: true, bindi: true, h: 0.93 }),
  watchman: () => ({ female: false, shirt: 0x283593, pants: 0x1a237e, longSleeve: true, cap: 0x1a237e, lathi: true, moustache: true, hair: 0x333333, h: 1.0 }),
};
const OUTFIT_KEYS = Object.keys(OUTFITS);
export function outfitLook(key) { const k = key || OUTFIT_KEYS[Math.floor(Math.random() * OUTFIT_KEYS.length)]; return { skin: pick(SKIN), outfit: k, ...OUTFITS[k]() }; }

export function randomLook(kind = 'civ') {
  if (kind === 'civ' && Math.random() < 0.45) return outfitLook();
  const r = Math.random;
  if (kind === 'police') return { skin: pick(SKIN), shirt: 0xc2a46b, pants: 0xb59a62, hair: 0x111111, cap: 0xb71c1c, female: false, police: true, h: 0.98 + r() * 0.08 };
  if (kind === 'vendor') return { skin: pick(SKIN), shirt: pick([0xffffff, 0xf5f5f5, 0x85c1e9]), pants: 0xf2efe4, hair: 0x111111, female: false, lungi: true, towel: true, moustache: true, h: 0.96 };
  if (kind === 'tourist') { // foreign backpackers / visitors (White Town & the promenade are full of them)
    const f = r() < 0.5;
    return { skin: pick([0xf1c9a5, 0xe8b896, 0xd9a27e, 0xf5d0b5, 0xc68e64]), female: f, western: true, h: f ? 0.97 : 1.04,
      hair: pick([0xc9a55a, 0x5a3a22, 0x8a3b1f, 0x2b1d14, 0xe0c27a]), shirt: pick([0xffffff, 0x90caf9, 0xffcc80, 0xa5d6a7, 0xf48fb1, 0x37474f, 0xfff59d]),
      pants: pick([0xc8b48a, 0x8d6e63, 0x546e7a, 0x2c4a7a, 0xffffff]), shorts: r() < 0.6, hat: r() < 0.45 ? pick([0xe6d3a3, 0xffffff, 0x8d6e63]) : null,
      backpack: r() < 0.6 ? pick([0x1565c0, 0x2e7d32, 0x37474f, 0xe65100]) : null, camera: r() < 0.4, glasses: r() < 0.5, moustache: false, beard: !f && r() < 0.3 };
  }
  if (kind === 'youthM' && r() < 0.5) { // 2K "pullingo" style
    return { skin: pick(SKIN), female: false, h: 0.98 + r() * 0.08, hair: 0x111111, pullingo: true,
      hairDye: pick([0xe0b84a, 0xd2691e, 0xb22222, 0xc0c0c0, 0xff8c00, 0x8b4513]), puff: true,
      shirt: pick([0x39ff14, 0xff1493, 0x00e5ff, 0xffeb3b, 0xff5722, 0x7c4dff, 0xffffff, 0x111111]),
      pants: pick([0x7fa7d6, 0x9db9de, 0x5d7fa8, 0x111111]), ripped: true, chain: true, bracelet: true, earring: r() < 0.7,
      glasses: r() < 0.6, moustache: r() < 0.4, beard: r() < 0.5, phone: true, sneakers: true };
  }
  if (kind === 'youthF' && r() < 0.45) { // 2K girls: streaked hair, neon oversized tees, cargos, hoops
    return { skin: pick(SKIN), female: true, saree: false, salwar: false, western: true, h: 0.93 + r() * 0.07, hair: 0x111111,
      hairDye: pick([0x8e24aa, 0xe91e63, 0x1e88e5, 0xb22222, 0xe0b84a]), streak: true, shirt: pick([0xff1493, 0x39ff14, 0x00e5ff, 0xfff176, 0x111111, 0xffffff, 0xce93d8]),
      pants: pick([0x556b2f, 0x111111, 0x7fa7d6, 0xd7ccc8]), hoops: true, glasses: r() < 0.5, bag: r() < 0.5 ? 0x111111 : null, phone: true, sneakers: true, bindi: r() < 0.2 };
  }
  if (kind === 'youthM') return { skin: pick(SKIN), female: false, h: 0.98 + r() * 0.08, hair: 0x111111, shirt: pick([0x212121, 0xffffff, 0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0x8e24aa, 0xff7043]),
    pants: pick([0x2c4a7a, 0x1f3a5f, 0x37474f, 0x111111, 0xc8b48a]), shorts: r() < 0.2, phone: r() < 0.8, cap: r() < 0.3 ? pick([0x111111, 0xd32f2f, 0x1565c0]) : null, moustache: r() < 0.5, beard: r() < 0.35, backpack: r() < 0.25 ? 0x263238 : null };
  if (kind === 'youthF') {
    const western = r() < 0.5, c = pick(SAREE);
    return { skin: pick(SKIN), female: true, saree: false, salwar: !western, western, h: 0.93 + r() * 0.07, hair: 0x111111,
      shirt: western ? pick([0xffffff, 0xf8bbd0, 0x80deea, 0xfff59d, 0x212121, 0xce93d8]) : c, pants: western ? pick([0x2c4a7a, 0x1f3a5f, 0x111111, 0xf5f5f5]) : pick([0xffffff, 0xf5f5f5, c]),
      border: pick(BORDER), phone: r() < 0.9, jasmine: !western && r() < 0.3, bindi: r() < 0.4, bag: r() < 0.6 ? pick([0x6d4c41, 0x212121, 0xec407a, 0xffffff]) : null };
  }
  const female = r() < 0.45;
  const old = r() < 0.15;
  const hair = old ? (r() < 0.6 ? 0x9e9e9e : 0xdddddd) : 0x111111;
  if (female) {
    const saree = r() < 0.72;
    const c = pick(SAREE);
    return {
      skin: pick(SKIN), female, saree, salwar: !saree, old, hair, h: 0.92 + r() * 0.08,
      shirt: saree ? (r() < 0.5 ? c : pick(SAREE)) : pick(SAREE), pants: c, border: pick(BORDER),
      jasmine: r() < 0.55, bindi: r() < 0.8, bag: r() < 0.35 ? pick([0x6d4c41, 0x212121, 0xc62828]) : null,
    };
  }
  const lungi = r() < (old ? 0.4 : 0.16), dhoti = !lungi && old && r() < 0.4;
  return {
    skin: pick(SKIN), female, old, hair, h: 0.95 + r() * 0.1,
    shirt: pick(SHIRTS), pants: lungi ? pick([0xf2efe4, 0x1565c0, 0x2e7d32, 0x6d4c41]) : dhoti ? 0xf5f2e8 : pick(PANTS),
    lungi, dhoti, moustache: r() < 0.7, beard: r() < 0.15, bald: old && r() < 0.4, glasses: r() < 0.15,
    longSleeve: r() < 0.35,
  };
}

const geoCache = new Map();
function geo(key, make) { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); }
function part(parent, g, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true; parent.add(mesh); return mesh;
}
const capsule = (r, len) => geo(`cap${r},${len}`, () => new THREE.CapsuleGeometry(r, len, 4, 10));
const sphere = (r) => geo(`sph${r}`, () => new THREE.SphereGeometry(r, 14, 10));
const cyl = (rt, rb, h) => geo(`cyl${rt},${rb},${h}`, () => new THREE.CylinderGeometry(rt, rb, h, 14, 1, true));
const cylC = (rt, rb, h) => geo(`cylc${rt},${rb},${h}`, () => new THREE.CylinderGeometry(rt, rb, h, 14));

/**
 * Build a humanoid. Returns { root, parts, look } where root sits at the feet.
 * Parts: body (upper body, pivot at hips), head, armL/armR (pivot at shoulders), legL/legR (pivot at hips).
 */
export function makeHuman(look) {
  const root = new THREE.Group();
  const body = new THREE.Group(); body.position.y = 0.95; root.add(body);
  // pattern tags pick a cell of the shared pixel atlas (fabric / face / hair); vertex colour tints it
  const P = (pat) => ({ userData: { pat } });
  const skin = mat(look.skin, { roughness: 0.65, ...P('skin') });
  if (look.bareChest) look.shirt = look.skin;
  const blueish = (c) => { const k = new THREE.Color(c); return k.b > k.r * 1.15 && k.b > 0.15; };
  if (!look.shirtPat) look.shirtPat = look.bareChest ? 'skin' : look.police || look.vest ? 'plain' : look.female && look.saree ? 'print'
    : pick(look.ripped || look.western || look.phone ? ['plain', 'graphic', 'graphic', 'stripe', 'check'] : ['plain', 'plain', 'check', 'check', 'stripe', 'knit']);
  if (!look.lowerPat) look.lowerPat = look.saree ? 'print' : look.lungi ? (look.lungiStripes ? 'plain' : 'lcheck') : look.dhoti ? 'plain' : blueish(look.pants) && !look.police ? 'denim' : 'plain';
  const shirtM = mat(look.shirt, { roughness: 0.85, ...P(look.shirtPat) });
  const lowerM = mat(look.pants, { roughness: 0.9, ...P(look.lowerPat) });
  const hairM = mat(look.hair, { roughness: 0.7, ...P('hair') });
  const faceM = mat(look.skin, { roughness: 0.6, ...P('face') });
  const skirt = look.female ? look.saree : (look.lungi || look.dhoti);

  // ---- torso: chest + waist ----
  const chestW = look.female ? 0.9 : 1.0;
  if (look.western && look.female) look.saree = false;
  part(body, capsule(0.15, 0.26), shirtM, 0, 0.36, 0, 1.25 * chestW, 1, 0.78);
  part(body, cylC(0.15, 0.16, 0.22), look.female && look.saree ? skin : shirtM, 0, 0.12, 0, 1.15 * chestW, 1, 0.8); // waist (bare midriff for saree)
  if (look.female && look.saree) {
    // blouse + pallu draped from right hip over the left shoulder, with a border
    part(body, capsule(0.15, 0.12), mat(look.shirt), 0, 0.42, 0, 1.18 * chestW, 1, 0.82);
    const pallu = part(body, geo('pallu', () => new THREE.BoxGeometry(0.2, 0.78, 0.03)), lowerM, 0.02, 0.33, 0.13);
    pallu.rotation.z = -0.62;
    const back = part(body, geo('palluB', () => new THREE.BoxGeometry(0.22, 0.75, 0.03)), lowerM, -0.12, 0.2, -0.13);
    back.rotation.z = 0.08;
    part(body, geo('palluEdge', () => new THREE.BoxGeometry(0.04, 0.8, 0.035)), mat(look.border), 0.1, 0.3, 0.135).rotation.z = -0.62;
  }
  if (look.police) {
    part(body, geo('belt', () => new THREE.CylinderGeometry(0.19, 0.19, 0.06, 14)), mat(0x3e2723), 0, 0.03, 0, 1.0, 1, 0.82);
    part(body, geo('badge', () => new THREE.BoxGeometry(0.06, 0.07, 0.01)), mat(0xd4af37, { metalness: 0.8 }), 0.09, 0.45, 0.125);
  }
  if (look.waistCloth) { // veshti folded and knotted around the waist over the lungi
    part(body, cylC(0.19, 0.22, 0.32), mat(look.waistCloth), 0, -0.06, 0, 1.18, 1, 0.92);
    part(body, geo('knot', () => new THREE.SphereGeometry(0.05, 6, 5)), mat(look.waistCloth), 0.05, 0.02, 0.17);
    part(body, geo('flap', () => new THREE.BoxGeometry(0.12, 0.2, 0.03)), mat(look.waistCloth), 0.06, -0.12, 0.18);
  }
  if (look.shawl) { // shawl over the left shoulder, crossing the chest and hanging down the back
    const f = part(body, geo('shawlF', () => new THREE.BoxGeometry(0.22, 0.7, 0.035)), mat(look.shawl), -0.02, 0.33, 0.125); f.rotation.z = 0.55;
    const b = part(body, geo('shawlB', () => new THREE.BoxGeometry(0.3, 0.85, 0.035)), mat(look.shawl), -0.08, 0.2, -0.125); b.rotation.z = -0.15;
    part(body, geo('shawlS', () => new THREE.BoxGeometry(0.16, 0.06, 0.27)), mat(look.shawl), -0.18, 0.58, 0);
  }
  if (look.vest) part(body, capsule(0.152, 0.2), mat(0xf5f5f5), 0, 0.33, 0, 1.22, 1, 0.8);
  if (look.towelShoulder) { const t2 = part(body, geo('towS', () => new THREE.BoxGeometry(0.14, 0.5, 0.04)), mat(look.towelShoulder), 0.17, 0.42, 0.11); t2.rotation.z = -0.15; part(body, geo('towS2', () => new THREE.BoxGeometry(0.14, 0.04, 0.26)), mat(look.towelShoulder), 0.19, 0.6, 0); }
  if (look.idTag) { part(body, geo('lanyard', () => new THREE.TorusGeometry(0.1, 0.006, 4, 12, Math.PI)), mat(0xc62828), 0, 0.52, 0.09).rotation.z = Math.PI; part(body, geo('idcard', () => new THREE.BoxGeometry(0.06, 0.08, 0.01)), mat(0xffffff), 0, 0.38, 0.125); }
  if (look.towel) part(body, geo('towel', () => new THREE.BoxGeometry(0.42, 0.05, 0.28)), mat(0xf4e04d), 0, 0.6, 0);
  if (look.chain) { const c = part(body, geo('chain', () => new THREE.TorusGeometry(0.11, 0.012, 5, 16)), mat(0xd4af37, { metalness: 0.9, roughness: 0.2 }), 0, 0.53, 0.04); c.rotation.x = 1.25; }
  if (look.backpack) part(body, geo('bpack', () => new THREE.BoxGeometry(0.3, 0.4, 0.16)), mat(look.backpack), 0, 0.36, -0.2);
  if (look.camera) part(body, geo('cam', () => new THREE.BoxGeometry(0.12, 0.08, 0.06)), mat(0x111111), 0.05, 0.3, 0.15);
  if (look.bag) { const b = part(body, geo('bag', () => new THREE.BoxGeometry(0.08, 0.26, 0.3)), mat(look.bag), -0.27, 0.05, 0); b.rotation.z = 0.1; }

  // ---- neck + head ----
  part(body, cylC(0.055, 0.06, 0.12), skin, 0, 0.66, 0);
  const head = new THREE.Group(); head.position.y = 0.83; body.add(head);
  part(head, sphere(0.115), faceM, 0, 0, 0, 0.92, 1.08, 1.0);            // painted face (eyes, brows, lips) from the atlas
  part(head, geo('nose', () => new THREE.BoxGeometry(0.026, 0.045, 0.03)), skin, 0, -0.015, 0.112);
  for (const s of [-1, 1]) part(head, geo('ear', () => new THREE.SphereGeometry(0.025, 6, 4)), skin, s * 0.105, 0, 0, 0.5, 1, 0.8);
  if (!look.bald) part(head, geo('hairCap2', () => new THREE.SphereGeometry(0.122, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.52)), hairM, 0, 0.015, -0.01, 0.95, 1.05, 1.02).rotation.x = -0.38; // hairline above the forehead
  else part(head, geo('hairRing', () => new THREE.SphereGeometry(0.12, 12, 6, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.2)), hairM, 0, 0.0, -0.01, 0.95, 1.05, 1.02);
  if (look.female) {
    part(head, sphere(0.07), hairM, 0, -0.04, -0.13);                       // bun / plait base
    part(head, capsule(0.035, 0.3), hairM, 0, -0.25, -0.12);                // plait
    if (look.jasmine) for (let i = 0; i < 7; i++) part(head, geo('jas', () => new THREE.SphereGeometry(0.016, 5, 4)), mat(0xffffff, { emissive: 0x333333 }), Math.sin(i * 0.9) * 0.06, 0.02 - i * 0.025, -0.16 - Math.cos(i * 0.9) * 0.01);
    if (look.bindi) part(head, geo('bindi', () => new THREE.SphereGeometry(0.009, 5, 4)), mat(0xc62828), 0, 0.055, 0.112);
  } else {
    if (look.moustache) part(head, geo('moust', () => new THREE.BoxGeometry(0.08, 0.016, 0.02)), hairM, 0, -0.045, 0.108);
    if (look.beard) part(head, sphere(0.1), hairM, 0, -0.06, 0.02, 0.95, 0.6, 0.95);
  }
  if (look.hat) { part(head, cylC(0.2, 0.2, 0.015), mat(look.hat), 0, 0.06, 0); part(head, cylC(0.1, 0.12, 0.1), mat(look.hat), 0, 0.12, 0); }
  if (look.cap) { part(head, geo('capT', () => new THREE.SphereGeometry(0.127, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5)), mat(look.cap), 0, 0.045, -0.005).rotation.x = -0.32; part(head, geo('capV', () => new THREE.BoxGeometry(0.16, 0.015, 0.12)), mat(look.cap), 0, 0.085, 0.15).rotation.x = -0.12; }
  if (look.puff) { // tall spiky puff with dyed tips
    part(head, geo('puff', () => new THREE.SphereGeometry(0.1, 10, 8)), hairM, 0, 0.13, 0.01, 1.0, 1.15, 1.1);
    part(head, geo('puffTop', () => new THREE.ConeGeometry(0.08, 0.14, 8)), mat(look.hairDye), 0, 0.24, 0.03).rotation.x = -0.35;
    for (const sx of [-1, 1]) part(head, geo('spike', () => new THREE.ConeGeometry(0.03, 0.08, 5)), mat(look.hairDye), sx * 0.05, 0.22, 0.05).rotation.z = -sx * 0.5;
  }
  if (look.streak) part(head, geo('streak', () => new THREE.BoxGeometry(0.04, 0.03, 0.2)), mat(look.hairDye), 0.06, 0.1, 0);
  if (look.earring) part(head, geo('stud', () => new THREE.SphereGeometry(0.012, 5, 4)), mat(0xd4af37, { metalness: 0.9, roughness: 0.2 }), 0.11, -0.03, 0);
  if (look.hoops) for (const sx of [-1, 1]) { const hp = part(head, geo('hoop', () => new THREE.TorusGeometry(0.025, 0.005, 4, 10)), mat(0xd4af37, { metalness: 0.9, roughness: 0.2 }), sx * 0.11, -0.06, 0); hp.rotation.y = Math.PI / 2; }
  if (look.roundGlasses) for (const sx of [-1, 1]) { const g2 = part(head, geo('rg', () => new THREE.TorusGeometry(0.025, 0.004, 4, 12)), mat(0x8d8d8d, { metalness: 0.8 }), sx * 0.042, 0.02, 0.113); }
  if (look.vibhuti) for (let k = 0; k < 3; k++) part(head, geo('vib', () => new THREE.BoxGeometry(0.11, 0.008, 0.005)), mat(0xffffff), 0, 0.055 + k * 0.018, 0.112);
  if (look.turban) { part(head, geo('turb', () => new THREE.TorusGeometry(0.11, 0.035, 6, 14)), mat(look.turban), 0, 0.07, 0).rotation.x = Math.PI / 2; }
  if (look.noseRing) part(head, geo('nring', () => new THREE.TorusGeometry(0.01, 0.003, 4, 8)), mat(0xd4af37, { metalness: 0.9 }), 0.018, -0.02, 0.115);
  if (look.headBasket) { part(head, cylC(0.24, 0.18, 0.14), mat(0x8d6e63), 0, 0.2, 0); for (let k = 0; k < 6; k++) part(head, geo('jasB', () => new THREE.TorusGeometry(0.06, 0.02, 4, 10)), mat(k % 2 ? 0xffffff : 0xff9800), Math.cos(k) * 0.12, 0.29, Math.sin(k) * 0.12).rotation.x = Math.PI / 2; }
  if (look.glasses) part(head, geo('glasses', () => new THREE.BoxGeometry(0.17, 0.035, 0.01)), mat(0x222222), 0, 0.02, 0.112);
  if (look.police) {
    part(head, cylC(0.125, 0.12, 0.1), mat(look.cap), 0, 0.1, 0);
    part(head, geo('visor', () => new THREE.BoxGeometry(0.2, 0.015, 0.09)), mat(0x111111), 0, 0.055, 0.12);
  }
  if (look.helmet) part(head, geo('helmet', () => new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6)), mat(look.helmet, { roughness: 0.3 }), 0, 0.02, 0);

  // ---- arms ----
  const sleeveLen = look.bareChest || look.vest ? 0.001 : look.female ? (look.saree ? 0.1 : 0.2) : look.longSleeve || look.police ? 0.44 : 0.2;
  const arm = (side) => {
    const g = new THREE.Group(); g.position.set(side * 0.215 * chestW, 0.56, 0); body.add(g);
    part(g, capsule(0.048, 0.48), skin, 0, -0.29, 0);
    part(g, capsule(0.058, sleeveLen), look.female && look.saree ? mat(look.shirt) : shirtM, 0, -0.04 - sleeveLen / 2, 0);
    part(g, sphere(0.05), skin, 0, -0.6, 0.01, 0.9, 1.1, 0.7);
    if (look.female && side < 0) part(g, geo('bangle', () => new THREE.TorusGeometry(0.05, 0.012, 5, 10)), mat(0xd4af37, { metalness: 0.8, roughness: 0.3 }), 0, -0.5, 0).rotation.x = Math.PI / 2;
    return g;
  };
  const armL = arm(-1), armR = arm(1);
  if (look.stick) { const st = part(armR, cylC(0.012, 0.012, 1.05), mat(0x6d4c41), 0, -0.98, 0.08); st.rotation.x = 0.12; }
  if (look.lathi) part(armR, cylC(0.015, 0.015, 1.0), mat(0x5d4037), 0, -0.85, 0.08).rotation.x = 0.4;
  if (look.newspaper) part(armL, geo('paper', () => new THREE.BoxGeometry(0.03, 0.26, 0.2)), mat(0xeeeeee), 0, -0.6, 0.06);
  if (look.watch) part(armL, geo('watch', () => new THREE.TorusGeometry(0.05, 0.012, 4, 10)), mat(0xd4af37, { metalness: 0.9 }), 0, -0.52, 0).rotation.x = Math.PI / 2;
  if (look.bracelet) part(armL, geo('brace', () => new THREE.TorusGeometry(0.052, 0.012, 4, 10)), mat(0xd4af37, { metalness: 0.9, roughness: 0.2 }), 0, -0.52, 0).rotation.x = Math.PI / 2;
  if (look.phone) part(armR, geo('phone', () => new THREE.BoxGeometry(0.075, 0.14, 0.012)), mat(0x111111), 0, -0.66, 0.06);
  if (look.umbrella) {
    const u = new THREE.Group(); u.position.set(0, -0.62, 0.05); armR.add(u);
    part(u, cylC(0.01, 0.01, 1.1), mat(0x333333), 0, 0.5, 0);
    const c = part(u, geo('umb', () => new THREE.ConeGeometry(0.55, 0.3, 10, 1, true)), mat(look.umbrella, { side: THREE.DoubleSide }), 0, 1.1, 0);
    c.castShadow = true;
    armR.userData.umbrella = true;
  }

  // ---- legs ----
  const legM = skirt ? skin : lowerM;
  const leg = (side) => {
    const g = new THREE.Group(); g.position.set(side * 0.095, 0.95, 0); root.add(g);
    part(g, capsule(0.068, 0.42), legM, 0, -0.25, 0);
    part(g, capsule(0.058, 0.36), look.shorts ? skin : legM, 0, -0.66, 0);
    if (look.shorts) part(g, capsule(0.072, 0.12), lowerM, 0, -0.42, 0);
    if (look.ripped) { part(g, geo('rip', () => new THREE.BoxGeometry(0.07, 0.05, 0.02)), skin, 0, -0.45, 0.065); part(g, geo('rip2', () => new THREE.BoxGeometry(0.05, 0.03, 0.02)), skin, 0.01, -0.22, 0.07); }
    const foot = part(g, geo('foot', () => new THREE.BoxGeometry(0.1, 0.06, 0.24)), mat(look.police ? 0x1a1a1a : look.western || look.cap || look.sneakers ? 0xf5f5f5 : 0x4e342e), 0, -0.92, 0.05);
    foot.castShadow = false;
    return g;
  };
  const legL = leg(-1), legR = leg(1);
  if (!skirt && (!look.female || look.western)) part(root, capsule(0.15, 0.08), lowerM, 0, 0.92, 0, 1.2, 1, 0.8); // hips/trousers seat
  if (skirt) {
    // saree / lungi / dhoti: a wrapped cloth cylinder that sways with the stride
    const len = look.skirtLen || (look.female ? 0.92 : 0.86);
    const sk = new THREE.Group(); sk.position.y = 0.97; root.add(sk);
    part(sk, cyl(0.17, look.female ? 0.25 : 0.22, len), mat(look.pants, { side: THREE.DoubleSide, roughness: 0.9, ...P(look.lowerPat) }), 0, -len / 2, 0, 1.15, 1, 0.9);
    part(sk, cyl(look.female ? 0.252 : 0.222, look.female ? 0.256 : 0.226, 0.07), mat(look.female ? look.border : (look.dhoti ? 0xd4ac0d : look.pants)), 0, -len + 0.05, 0, 1.15, 1, 0.9);
    if (look.lungiStripes) for (let k = 0; k < 5; k++) part(sk, cyl(0.172 + k * 0.012, 0.175 + k * 0.012, 0.035), mat(look.lungiStripes), 0, -0.12 - k * (len - 0.2) / 5, 0, 1.16, 1, 0.91);
    if (look.borderColor) part(sk, cyl(0.226, 0.228, 0.05), mat(look.borderColor), 0, -len + 0.11, 0, 1.15, 1, 0.9);
    root.userData.skirt = sk;
  }
  if (look.salwar) { // salwar kameez: long kurta to the knees + dupatta
    part(body, cyl(0.16, 0.22, 0.55), shirtM, 0, -0.2, 0, 1.15, 1, 0.85);
    const dup = part(body, geo('dup', () => new THREE.BoxGeometry(0.5, 0.06, 0.2)), mat(look.border), 0, 0.6, 0.02); dup.rotation.z = 0.1;
  }

  // merge each rigid part into one vertex-coloured mesh (keeps draw calls low with many NPCs)
  for (const g of [body, head, armL, armR, legL, legR, root, root.userData.skirt]) if (g) bakeDirect(g);
  const s = look.h || 1;
  root.scale.setScalar(s);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  return { root, parts: { body, head, armL, armR, legL, legR }, look };
}

const HUMAN_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 });
const HUMAN_MAT_DS = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });
export function setHumanAtlas(tex) { for (const m of [HUMAN_MAT, HUMAN_MAT_DS]) { m.map = tex; m.needsUpdate = true; } }
/** Merge the direct mesh children of a group into a single vertex-coloured mesh. */
function bakeDirect(group) {
  for (const ds of [false, true]) {
  const meshes = group.children.filter((o) => o.isMesh && !!o.material.side === ds && !o.material.map);
  if (meshes.length < (ds ? 1 : 2)) continue;
  const geos = [];
  for (const m of meshes) {
    m.updateMatrix();
    const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    // remap the part's own 0..1 UVs into its atlas cell (inset half a texel so cells never bleed)
    const cellK = HUMAN_CELLS[(m.material.userData && m.material.userData.pat) || 'plain'] || HUMAN_CELLS.plain;
    const span = (cellK[2] || 1) * 64 / 256, u0 = cellK[0] * 64 / 256, v1 = 1 - cellK[1] * 64 / 256, e = 0.5 / 256;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + e + (uv.getX(i) % 1.0001) * (span - 2 * e), v1 - span + e + uv.getY(i) * (span - 2 * e));
    const n = g.attributes.position.count, c = m.material.color, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    geos.push(g); group.remove(m);
  }
  const merged = new THREE.Mesh(mergeGeometries(geos), ds ? HUMAN_MAT_DS : HUMAN_MAT);
  merged.castShadow = true; group.add(merged);
  }
}

/** Animate limbs. phase: walk cycle; amt: 0..1 swing amount. */
export function animateHuman(h, phase, amt, pose = 'walk') {
  const p = h.parts, L = h.look;
  const ud = h.root.userData; ud.pose = pose; ud.phase = phase; ud.amt = amt;   // read by the realistic avatar driver
  p.body.rotation.set(L.old ? 0.12 : 0, 0, 0); p.body.position.y = 0.95; h.root.rotation.x = 0;
  p.head.rotation.set(0, 0, 0);
  p.legL.position.y = p.legR.position.y = 0.95;
  const sk = h.root.userData.skirt; if (sk) sk.rotation.set(0, 0, 0);
  const umb = p.armR.userData.umbrella;
  if (pose === 'sit') {
    p.legL.rotation.set(-1.45, 0, 0.12); p.legR.rotation.set(-1.45, 0, -0.12);
    p.armL.rotation.set(-1.1, 0, 0.1); p.armR.rotation.set(-1.1, 0, -0.1);
    if (sk) sk.rotation.x = -0.7;
    return;
  }
  if (pose === 'bench') {
    p.legL.rotation.set(-1.4, 0, 0.05); p.legR.rotation.set(-1.4, 0, -0.05);
    p.legL.position.y = p.legR.position.y = 0.95;
    p.armL.rotation.set(-0.3, 0, 0.15); p.armR.rotation.set(-0.3, 0, -0.15);
    if (sk) sk.rotation.x = -0.8;
    return;
  }
  if (pose === 'down') {
    p.legL.rotation.set(0, 0, 0.1); p.legR.rotation.set(0, 0, -0.1);
    p.armL.rotation.set(0, 0, 1.2); p.armR.rotation.set(0, 0, -1.2);
    return;
  }
  if (pose === 'swim') {
    const s = Math.sin(phase);
    p.armL.rotation.set(-2.6 + s, 0, 0); p.armR.rotation.set(-2.6 - s, 0, 0);
    p.legL.rotation.set(s * 0.4, 0, 0); p.legR.rotation.set(-s * 0.4, 0, 0);
    return;
  }
  const stride = (sk ? 0.5 : 0.8) * (L.old ? 0.7 : 1);
  const s = Math.sin(phase) * amt;
  const crouch = pose === 'crouch';
  p.legL.rotation.set(s * stride - (crouch ? 0.9 : 0), 0, 0);
  p.legR.rotation.set(-s * stride - (crouch ? 0.9 : 0), 0, 0);
  // knees: slight extra bend on the back swing is implied by the capsule shins
  p.armL.rotation.set(-s * 0.6, 0, 0.08);
  p.armR.rotation.set(umb ? -0.9 : s * 0.6, 0, umb ? 0.1 : -0.08);
  if (sk) { sk.rotation.x = s * 0.06; sk.rotation.z = Math.sin(phase * 2) * 0.02 * amt; }
  // counter-rotation of shoulders and a little head bob for a natural gait
  p.body.rotation.y = -s * 0.12;
  p.head.rotation.y = s * 0.06;
  if (crouch) {
    p.body.position.y = 0.62; p.legL.position.y = p.legR.position.y = 0.62; p.body.rotation.x = 0.35;
    p.legL.rotation.x -= 0.2; p.legR.rotation.x -= 0.2;
  }
  if (pose === 'jump') { p.legL.rotation.x = -0.6; p.legR.rotation.x = 0.3; p.armL.rotation.set(-2.4, 0, 0.3); p.armR.rotation.set(-2.4, 0, -0.3); }
  if (pose === 'punchL') { p.armL.rotation.set(-1.6, 0, 0); p.body.rotation.y = 0.35; }
  if (pose === 'punchR') { p.armR.rotation.set(-1.6, 0, 0); p.body.rotation.y = -0.35; }
  if (pose === 'arrest') { p.armL.rotation.set(-1.4, 0, 0); p.armR.rotation.set(-1.4, 0, 0); }
  if (pose === 'talk') { p.armR.rotation.set(-0.9 + Math.sin(phase * 2) * 0.35, 0, -0.25); p.head.rotation.y = Math.sin(phase * 0.7) * 0.2; p.head.rotation.x = Math.sin(phase * 1.3) * 0.08; }
  if (pose === 'call') { p.armR.rotation.set(-2.6 + Math.sin(phase * 3) * 0.3, 0, -0.3); } // vendor waving
  if (pose === 'swag') { // pullingo walk: phone speaker held up, head nodding to the beat, free hand gesturing
    const s2 = Math.sin(phase) * amt, b = Math.sin(phase * 2);
    p.legL.rotation.set(s2 * 0.75, 0, 0.04); p.legR.rotation.set(-s2 * 0.75, 0, -0.04);
    p.armR.rotation.set(-1.9, 0, -0.35); p.armL.rotation.set(-0.6 + Math.sin(phase * 1.5) * 0.6, 0, 0.35 + Math.abs(b) * 0.3);
    p.body.rotation.set(-0.05, -s2 * 0.2, b * 0.05); p.head.rotation.set(Math.abs(b) * 0.25 - 0.1, 0, b * 0.08);
    p.body.position.y = 0.95 + Math.abs(b) * 0.05;
    return;
  }
  if (pose === 'film') { p.armR.rotation.set(-1.45, 0, -0.1); p.armL.rotation.set(-1.3, 0, 0.35); p.head.rotation.x = 0.1; return; }
  if (pose === 'dance') { // reel dance: arms up and swinging, hips bouncing
    const d = Math.sin(phase * 2.2);
    p.armL.rotation.set(-2.2 + d * 0.6, 0, 0.5 + d * 0.3); p.armR.rotation.set(-2.2 - d * 0.6, 0, -0.5 + d * 0.3);
    p.body.rotation.set(0, d * 0.35, d * 0.1); p.body.position.y = 0.95 + Math.abs(d) * 0.06;
    p.legL.rotation.set(Math.max(0, d) * -0.4, 0, 0.05); p.legR.rotation.set(Math.max(0, -d) * -0.4, 0, -0.05);
    p.head.rotation.set(0, -d * 0.2, d * 0.1);
    return;
  }
  if (pose === 'selfie') { p.armR.rotation.set(-2.3, 0.3, -0.5); p.head.rotation.x = -0.15; return; }
  if (pose === 'idle') { p.armL.rotation.set(0.05, 0, 0.1); p.armR.rotation.set(umb ? -0.9 : 0.05, 0, -0.1); p.head.rotation.y = Math.sin(phase * 0.3) * 0.4; }
  p.body.position.y += Math.abs(Math.sin(phase)) * 0.035 * amt;
}

/* =================================================================== */
/* Vehicles                                                             */
/* =================================================================== */
export const LIGHT_MATS = {
  head: new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff2c8, emissiveIntensity: 0.2, roughness: 0.2 }),
  tail: new THREE.MeshStandardMaterial({ color: 0x8b0000, emissive: 0xff1a1a, emissiveIntensity: 0.3, roughness: 0.3 }),
  sirenR: new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff0000, emissiveIntensity: 0, roughness: 0.3 }),
  sirenB: new THREE.MeshStandardMaterial({ color: 0x000055, emissive: 0x1e5bff, emissiveIntensity: 0, roughness: 0.3 }),
};
const GLASS = new THREE.MeshStandardMaterial({ color: 0x1b2633, roughness: 0.05, metalness: 0.7 }); GLASS.userData.noMerge = true;
const TYRE = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
const RIM = new THREE.MeshStandardMaterial({ color: 0xbfc5cc, roughness: 0.3, metalness: 0.8 });
const BLACK = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });
const CHROME = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.15, metalness: 0.95 }); CHROME.userData.noMerge = true;
const SEAT = new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 0.8 });
const SEAT_AUTO = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.6 });
const AUTO_IND = new THREE.MeshStandardMaterial({ color: 0xff9a1a, emissive: 0xff7a00, emissiveIntensity: 0.4, roughness: 0.4 });
const _cylG = new THREE.CylinderGeometry(1, 1, 1, 18);

const wheelGeoCache = new Map();
function wheel(parent, r, w, x, y, z) {
  const k = r + ',' + w;
  if (!wheelGeoCache.has(k)) {
    const t = new THREE.CylinderGeometry(r, r, w, 14); t.rotateZ(Math.PI / 2);
    const h = new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 8); h.rotateZ(Math.PI / 2);
    wheelGeoCache.set(k, [t, h]);
  }
  const [tg, hg] = wheelGeoCache.get(k);
  const pivot = new THREE.Group(); pivot.position.set(x, y, z); parent.add(pivot);
  const spin = new THREE.Group(); pivot.add(spin);
  const tm = new THREE.Mesh(tg, TYRE); tm.castShadow = true; spin.add(tm);
  const hm = new THREE.Mesh(hg, RIM); spin.add(hm);
  // spoke marker so the spin is visible
  const sp = new THREE.Mesh(sharedBox(w + 0.03, r * 1.1, 0.06), RIM); spin.add(sp);
  tm.userData.keep = hm.userData.keep = sp.userData.keep = true;
  return { pivot, spin, r };
}

export const CAR_COLORS = [0xd0d3d4, 0xffffff, 0xc0392b, 0x1f3a93, 0x7f8c8d, 0x111111, 0x8e1b1b, 0x2e86c1, 0xd4ac0d, 0x196f3d, 0xe67e22];

/** Build vehicle mesh. Returns { group, wheels:[], steerWheels:[], seat:{x,y,z}, riderVisible, sirens:[] } */
export function makeVehicleModel(type, color) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const isCar = type === 'car' || type === 'police' || type === 'taxi';
  const paint = isCar ? new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.3 })
    : new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.45 });
  paint.userData.noMerge = true; // glossy clear-coat paint reflects the sky
  const out = { group: g, body, wheels: [], steerWheels: [], seat: { x: 0, y: 0.5, z: 0 }, riderVisible: false, sirens: [], paint, lean: null };
  const B = (w, h, d, m, x, y, z) => boxMesh(body, w, h, d, m, x, y, z);
  const C2 = (m, r, len, x, y, z) => { const o = new THREE.Mesh(_cylG, m); o.scale.set(r, len, r); o.rotation.x = Math.PI / 2; o.position.set(x, y, z); body.add(o); return o; };

  if (type === 'car' || type === 'police' || type === 'taxi') {
    buildCar(type, out, body, g, paint, B);
  } else if (type === 'bus') {
    B(2.5, 2.4, 10.8, paint, 0, 1.75, 0);
    B(2.52, 0.9, 9.0, GLASS, 0, 2.25, -0.6);
    B(2.4, 1.1, 0.06, GLASS, 0, 2.15, 5.41);
    B(2.54, 0.35, 10.84, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), 0, 1.25, 0); // white band
    B(2.54, 0.2, 10.84, new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.5 }), 0, 2.97, 0);
    B(2.3, 0.15, 10.4, new THREE.MeshStandardMaterial({ color: 0xdddddd }), 0, 3.02, 0);
    B(0.4, 0.2, 0.05, LIGHT_MATS.head, -0.9, 0.9, 5.42); B(0.4, 0.2, 0.05, LIGHT_MATS.head, 0.9, 0.9, 5.42);
    B(0.3, 0.3, 0.05, LIGHT_MATS.tail, -1.0, 1.0, -5.42); B(0.3, 0.3, 0.05, LIGHT_MATS.tail, 1.0, 1.0, -5.42);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.38), busBoardMat()); board.position.set(0, 2.92, 5.43); body.add(board);
    for (const s2 of [-1, 1]) B(0.04, 1.6, 0.9, new THREE.MeshStandardMaterial({ color: 0x222831 }), s2 * 1.27, 1.55, 3.2); // doors
    plate(body, true, 0, 0.75, 5.43, 0); plate(body, true, 0, 0.9, -5.43, Math.PI);
    for (const [x, z, s] of [[-1.15, 3.6, 1], [1.15, 3.6, 1], [-1.15, -3.3, 0], [1.15, -3.3, 0]]) {
      const w = wheel(g, 0.55, 0.4, x, 0.55, z); out.wheels.push(w); if (s) out.steerWheels.push(w);
    }
    out.seat = { x: 0.8, y: 1.6, z: 4.5 };
  } else if (type === 'auto') {
    // Puducherry auto rickshaw (Bajaj RE style): rounded front cowl, open sides, curved black canvas hood
    const black = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.55 });
    const hood = new THREE.MeshStandardMaterial({ color: Math.random() < 0.85 ? 0x141414 : 0xf2c40f, roughness: 0.95, side: THREE.DoubleSide });
    const ext = (pts, w, m, x = 0) => { const e = extrudeProfile(pts, w, m, 0.03); e.position.x += x; body.add(e); return e; };
    B(1.28, 0.12, 2.45, black, 0, 0.36, -0.05);                                                           // floor pan
    ext([[0.72, 0.36], [1.24, 0.36], [1.36, 0.55], [1.36, 0.9], [1.22, 1.22], [0.95, 1.32], [0.82, 1.3], [0.82, 0.55]], 0.9, paint);   // front cowl
    ext([[-1.32, 0.36], [-0.18, 0.36], [-0.12, 0.62], [-0.24, 0.98], [-0.6, 1.03], [-1.22, 1.03], [-1.36, 0.8]], 1.34, paint);         // rear tub
    for (const sx of [-1, 1]) B(0.02, 0.06, 1.1, CHROME, sx * 0.675, 0.78, -0.75);                    // chrome side strip
    // canopy: arched roof shell along z + rounded back
    const roofShape = new THREE.Shape(); const RW = 0.7, RH = 0.16;
    roofShape.moveTo(-RW, 0); for (let i = 0; i <= 12; i++) { const t = i / 12, x = -RW + t * 2 * RW; roofShape.lineTo(x, Math.sin(t * Math.PI) * RH); }
    for (let i = 12; i >= 0; i--) { const t = i / 12, x = -RW + t * 2 * RW; roofShape.lineTo(x * 0.96, Math.sin(t * Math.PI) * RH - 0.045); }
    const roofG = new THREE.ExtrudeGeometry(roofShape, { depth: 2.15, bevelEnabled: false, curveSegments: 4 }); roofG.translate(0, 1.86, -1.3);
    const roof = new THREE.Mesh(roofG, hood); body.add(roof);
    B(1.38, 0.86, 0.05, hood, 0, 1.43, -1.29);                                                          // back curtain
    B(0.6, 0.22, 0.02, GLASS, 0, 1.55, -1.32);                                                          // small rear window
    for (const sx of [-1, 1]) {
      B(0.06, 0.07, 2.1, black, sx * 0.69, 1.83, -0.25);                                               // roof rails
      B(0.05, 0.86, 0.05, black, sx * 0.67, 1.43, -1.25);                                              // rear posts
      B(0.06, 0.12, 0.9, hood, sx * 0.7, 1.74, -0.8);                                                  // rolled side canvas
      B(0.04, 0.6, 0.04, black, sx * 0.44, 1.56, 0.88).rotation.x = -0.32;                             // A-pillars
    }
    B(0.92, 0.5, 0.025, GLASS, 0, 1.58, 0.91).rotation.x = -0.32;                                       // windscreen
    B(0.95, 0.04, 0.05, paint, 0, 1.82, 0.84); B(0.4, 0.015, 0.02, black, 0.12, 1.37, 0.995).rotation.z = 0.3; // visor band + wiper
    // front: round chrome headlamp, indicators, mudguard, handlebar, mirror
    C2(CHROME, 0.11, 0.08, 0, 1.0, 1.36); C2(LIGHT_MATS.head, 0.09, 0.02, 0, 1.0, 1.405);
    for (const sx of [-1, 1]) B(0.08, 0.05, 0.05, LIGHT_MATS.tail.clone ? AUTO_IND : AUTO_IND, sx * 0.34, 1.12, 1.27);
    B(0.32, 0.06, 0.5, paint, 0, 0.56, 1.05);
    B(0.75, 0.035, 0.035, CHROME, 0, 1.18, 0.62); for (const sx of [-1, 1]) B(0.04, 0.04, 0.13, black, sx * 0.37, 1.18, 0.6);
    B(0.03, 0.22, 0.03, black, -0.62, 1.42, 0.8); B(0.1, 0.07, 0.02, CHROME, -0.62, 1.55, 0.8);
    // seats: driver saddle + passenger bench with backrest
    B(0.42, 0.12, 0.42, SEAT_AUTO, 0, 0.92, 0.32);
    B(1.18, 0.16, 0.55, SEAT_AUTO, 0, 0.82, -0.82); B(1.18, 0.5, 0.12, SEAT_AUTO, 0, 1.15, -1.14);
    B(1.2, 0.05, 0.05, CHROME, 0, 1.32, -0.42);                                                          // grab bar behind driver
    // rear: tail lamps, bumper, commercial (yellow) plates
    plate(body, true, 0, 0.62, 1.38, 0, 0.55); plate(body, true, 0, 0.6, -1.37, Math.PI, 0.6);
    B(0.16, 0.1, 0.04, LIGHT_MATS.tail, -0.5, 0.72, -1.36); B(0.16, 0.1, 0.04, LIGHT_MATS.tail, 0.5, 0.72, -1.36);
    B(1.3, 0.05, 0.06, CHROME, 0, 0.42, -1.4);
    const fw = wheel(g, 0.25, 0.14, 0, 0.25, 1.05); out.wheels.push(fw); out.steerWheels.push(fw);
    out.wheels.push(wheel(g, 0.25, 0.16, -0.58, 0.25, -0.75), wheel(g, 0.25, 0.16, 0.58, 0.25, -0.75));
    out.seat = { x: 0, y: 0.98, z: 0.3 }; out.riderVisible = true;
  } else if (type === 'motorcycle' || type === 'scooter') {
    const lean = new THREE.Group(); g.add(lean); g.remove(body); lean.add(body); out.lean = lean;
    if (type === 'motorcycle') {
      B(0.32, 0.3, 0.6, paint, 0, 0.95, 0.25);       // tank
      B(0.3, 0.12, 0.7, SEAT, 0, 0.95, -0.35);       // seat
      B(0.25, 0.35, 0.6, CHROME, 0, 0.6, 0.0);       // engine
      B(0.12, 0.12, 0.9, CHROME, 0.2, 0.45, -0.4);   // exhaust
      B(0.06, 0.06, 0.7, BLACK, 0, 1.15, 0.65).rotation.x = 0.4;  // fork top
      B(0.75, 0.05, 0.05, CHROME, 0, 1.2, 0.62);      // handlebar
      B(0.18, 0.18, 0.1, LIGHT_MATS.head, 0, 1.05, 0.85);
      B(0.14, 0.08, 0.05, LIGHT_MATS.tail, 0, 0.9, -0.82);
      B(0.28, 0.06, 0.4, paint, 0, 0.75, -0.75);    // rear mudguard
    } else {
      B(0.42, 0.55, 0.5, paint, 0, 0.65, -0.35);     // rear body
      B(0.36, 0.12, 0.6, SEAT, 0, 0.98, -0.35);
      B(0.38, 0.06, 0.55, BLACK, 0, 0.35, 0.15);     // floorboard
      B(0.38, 0.75, 0.15, paint, 0, 0.7, 0.5);       // front shield
      B(0.6, 0.06, 0.06, CHROME, 0, 1.15, 0.55);
      B(0.2, 0.14, 0.08, LIGHT_MATS.head, 0, 1.05, 0.6);
      B(0.16, 0.08, 0.05, LIGHT_MATS.tail, 0, 0.85, -0.62);
    }
    plate(body, false, 0, 0.62, type === 'motorcycle' ? -0.9 : -0.66, Math.PI, 0.45);
    const r = type === 'motorcycle' ? 0.33 : 0.25;
    const fw = wheel(lean, r, 0.1, 0, r, type === 'motorcycle' ? 0.78 : 0.62);
    const rw = wheel(lean, r, 0.12, 0, r, type === 'motorcycle' ? -0.72 : -0.55);
    out.wheels.push(fw, rw); out.steerWheels.push(fw);
    out.seat = { x: 0, y: type === 'motorcycle' ? 1.05 : 1.08, z: -0.28 }; out.riderVisible = true;
  }
  else if (type === 'cycle') {
    // everyday Indian roadster bicycle (black frame, carrier at the back)
    const lean = new THREE.Group(); g.add(lean); g.remove(body); lean.add(body); out.lean = lean;
    const frame = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.5 });
    const tube = (x1, y1, z1, x2, y2, z2) => { const len = Math.hypot(y2 - y1, z2 - z1); const m = new THREE.Mesh(sharedBox(0.04, len, 0.04), frame); m.position.set(0, (y1 + y2) / 2, (z1 + z2) / 2); m.rotation.x = Math.atan2(z2 - z1, y2 - y1); body.add(m); };
    tube(0, 0.35, -0.55, 0, 0.9, -0.15); tube(0, 0.35, -0.55, 0, 0.35, 0.0); tube(0, 0.35, 0.0, 0, 0.9, -0.15);
    tube(0, 0.35, 0.0, 0, 0.95, 0.45); tube(0, 0.9, -0.15, 0, 0.95, 0.45); tube(0, 0.35, 0.6, 0, 1.05, 0.45);
    B(0.5, 0.03, 0.03, CHROME, 0, 1.05, 0.42); B(0.18, 0.06, 0.24, SEAT, 0, 0.95, -0.17);
    B(0.22, 0.03, 0.4, frame, 0, 0.8, -0.6); B(0.1, 0.08, 0.06, LIGHT_MATS.head, 0, 0.95, 0.52);
    const fw = wheel(lean, 0.35, 0.04, 0, 0.35, 0.6); const rw = wheel(lean, 0.35, 0.04, 0, 0.35, -0.55);
    out.wheels.push(fw, rw); out.steerWheels.push(fw);
    out.seat = { x: 0, y: 1.0, z: -0.2 }; out.riderVisible = true;
  }
  else if (RETRO_TYPES.includes(type)) buildRetroBike(type, out, body, g, paint, B);
  // soft contact shadow / ambient occlusion under the vehicle
  {
    const L = isCar ? 4.6 : type === 'bus' ? 11.6 : type === 'auto' ? 3.0 : 2.2, Wd = isCar ? 2.3 : type === 'bus' ? 3.0 : type === 'auto' ? 1.8 : 0.9;
    const sh = new THREE.Mesh(SHADOW_GEO, shadowMat()); sh.scale.set(Wd, L, 1); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; sh.renderOrder = -1; sh.userData.keep = true; g.add(sh);
  }
  bake(body);
  const ext = VEHICLE_GLB[type];
  if (ext && ext.length) useVehicleModel(out, body, ext[Math.floor(Math.random() * ext.length)], type, color);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  return out;
}

/* ---------------- realistic cars: lofted body shell, glass greenhouse, interior, alloy wheels ---------------- */
const SHADOW_GEO = new THREE.PlaneGeometry(1, 1);
let _shadowMat = null;
function shadowMat() {
  if (_shadowMat) return _shadowMat;
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 64, 4, 32, 64, 62); g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(0.55, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.save(); x.scale(1, 2); x.fillStyle = g; x.beginPath(); x.arc(32, 32, 32, 0, Math.PI * 2); x.fill(); x.restore();
  const t = new THREE.CanvasTexture(c);
  return (_shadowMat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
}
const CAR_GLASS = new THREE.MeshPhysicalMaterial({ color: 0x1a2630, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.58, clearcoat: 1, envMapIntensity: 1.6, side: THREE.DoubleSide }); CAR_GLASS.userData.noMerge = true;
const TRIM = new THREE.MeshStandardMaterial({ color: 0x0d0d0e, roughness: 0.45 });
const PLASTIC = new THREE.MeshStandardMaterial({ color: 0x1c1d1f, roughness: 0.7 });
const INTERIOR = new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.85 });
const ALLOY_W = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.28, metalness: 0.9 }); ALLOY_W.userData.noMerge = true;
const RUBBER = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.92 });
const DISC = new THREE.MeshStandardMaterial({ color: 0x6b6b6b, roughness: 0.5, metalness: 0.7 });
const HEAD_LENS = new THREE.MeshPhysicalMaterial({ color: 0xffffff, emissive: 0xfff4dc, emissiveIntensity: 0.25, roughness: 0.05, transmission: 0, clearcoat: 1, metalness: 0.2 }); HEAD_LENS.userData.noMerge = true;
const TAIL_LENS = new THREE.MeshPhysicalMaterial({ color: 0xa00d0d, emissive: 0xff1a1a, emissiveIntensity: 0.35, roughness: 0.08, clearcoat: 1 }); TAIL_LENS.userData.noMerge = true;
const IND_LENS = new THREE.MeshStandardMaterial({ color: 0xff9a1a, emissive: 0xff7a00, emissiveIntensity: 0.3, roughness: 0.2 });
let _grille = null;
function grilleMat() {
  if (_grille) return _grille;
  const c = document.createElement('canvas'); c.width = 128; c.height = 32; const x = c.getContext('2d');
  x.fillStyle = '#060607'; x.fillRect(0, 0, 128, 32);
  for (let j = 0; j < 5; j++) for (let i = 0; i < 22; i++) { x.fillStyle = '#2b2d31'; const ox = i * 6 + (j % 2) * 3, oy = j * 6 + 2; x.beginPath(); x.moveTo(ox, oy + 2); x.lineTo(ox + 2, oy); x.lineTo(ox + 4, oy + 2); x.lineTo(ox + 2, oy + 4); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  return (_grille = new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, metalness: 0.3 }));
}

const CAR_STYLES = {
  // L length, W width, R wheel radius, axles, hood/belt/roof heights and glass break points (z from front +L/2 to rear -L/2)
  hatch: { L: 3.85, W: 1.70, R: 0.31, aF: 1.22, aR: -1.2, nose: 0.66, hood: 0.86, belt: 0.95, roof: 1.5, zA: 0.78, zA2: 0.05, zR: -1.35, zC: -1.72, tail: 'hatch' },
  sedan: { L: 4.4, W: 1.74, R: 0.32, aF: 1.38, aR: -1.27, nose: 0.66, hood: 0.84, belt: 0.95, roof: 1.47, zA: 0.92, zA2: 0.18, zR: -0.95, zC: -1.45, tail: 'trunk' },
  suv: { L: 4.3, W: 1.80, R: 0.36, aF: 1.32, aR: -1.32, nose: 0.74, hood: 1.0, belt: 1.1, roof: 1.68, zA: 0.92, zA2: 0.25, zR: -1.75, zC: -1.95, tail: 'hatch' },
};

function buildCar(type, out, body, g, paint, B) {
  const style = type === 'police' ? 'sedan' : type === 'taxi' ? pick(['sedan', 'suv']) : pick(['hatch', 'hatch', 'sedan', 'sedan', 'suv']);
  const S = CAR_STYLES[style], F = S.L / 2, Rr = -S.L / 2, hw = S.W / 2, R = S.R, archR = R + 0.07;
  const sm = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
  // plan-view half width: rounded corners at both ends
  const halfW = (z) => { const u = z >= 0 ? z / F : z / -Rr; return hw * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 6)), 1 / 6) * (z > 0 ? 1 - 0.05 * sm(0.6, 1, u) : 1) + 0.0001; };
  // side-view top of the lower body (hood -> cowl -> beltline -> trunk/tail)
  const topY = (z) => {
    if (z > S.zA) { const u = (z - S.zA) / (F - S.zA); return S.hood + (S.belt - S.hood) * (1 - sm(0, 0.25, u)) - (S.hood - S.nose) * Math.pow(sm(0.7, 1, u), 1.4); }
    if (z > S.zC) return S.belt + 0.03 * (S.zA - z) / (S.zA - S.zC);
    if (S.tail === 'trunk') { const u = (S.zC - z) / (S.zC - Rr); return S.belt + 0.03 - 0.02 * u - 0.18 * Math.pow(sm(0.75, 1, u), 2); }
    const u = (S.zC - z) / (S.zC - Rr); return S.belt + 0.03 - 0.1 * Math.pow(sm(0.5, 1, u), 2);
  };
  // underside with real wheel arches
  const botY = (z) => {
    let y = 0.3 + 0.06 * sm(F - 0.35, F, z) + 0.12 * sm(-(Rr + 0.35), -Rr, -z);
    for (const ax of [S.aF, S.aR]) { const d = Math.abs(z - ax); if (d < archR) y = Math.max(y, R + Math.sqrt(archR * archR - d * d)); }
    return y;
  };
  const roofY = (z) => {
    if (z > S.zA || z < S.zC) return null;
    if (z > S.zA2) return topY(z) + (S.roof - topY(z)) * sm(S.zA, S.zA2, z) ;
    if (z > S.zR) return S.roof - 0.03 * Math.pow((z - (S.zA2 + S.zR) / 2) / ((S.zA2 - S.zR) / 2), 2);
    return topY(z) + (S.roof - 0.03 - topY(z)) * sm(S.zC, S.zR, z);
  };
  // ---- loft helper: rings (same point count) along z, with end caps ----
  const loft = (zs, ring, cap = true) => {
    const rings = zs.map((z) => ring(z)), n = rings[0].length, pos = [], idx = [];
    zs.forEach((z, i) => rings[i].forEach(([x, y]) => pos.push(x, y, z)));
    for (let i = 0; i < zs.length - 1; i++) for (let j = 0; j < n; j++) {
      const a = i * n + j, b = i * n + (j + 1) % n, c = (i + 1) * n + j, d = (i + 1) * n + (j + 1) % n;
      idx.push(a, c, b, b, c, d);
    }
    if (cap) for (const [ri, flip] of [[0, false], [zs.length - 1, true]]) {
      const base = pos.length / 3; const z = zs[ri]; let cx = 0, cy = 0; rings[ri].forEach(([x, y]) => { cx += x; cy += y; });
      pos.push(cx / n, cy / n, z);
      for (let j = 0; j < n; j++) { const a = ri * n + j, b = ri * n + (j + 1) % n; flip ? idx.push(base, a, b) : idx.push(base, b, a); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    return geo;
  };
  // rounded-rectangle ring with slight side bulge (tumblehome)
  const rrect = (w, y0, y1, rb, rt, bulge = 0.02, topNarrow = 1) => {
    const pts = [], seg = 5, h = Math.max(0.002, y1 - y0); rb = Math.min(rb, h / 2, w * 0.9); rt = Math.min(rt, h / 2, w * 0.9);
    const side = (sgn) => {
      const P = [];
      for (let i = 0; i <= seg; i++) { const a = -Math.PI / 2 + (i / seg) * Math.PI / 2; P.push([sgn * (w - rb + Math.cos(a) * rb), y0 + rb + Math.sin(a) * rb]); }
      for (let i = 1; i < 4; i++) { const t = i / 4, y = y0 + rb + t * (h - rb - rt); P.push([sgn * (w * (1 + bulge * Math.sin(t * Math.PI)) * (1 - (1 - topNarrow) * t)), y]); }
      const wt = w * topNarrow;
      for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI / 2; P.push([sgn * (wt - rt + Math.cos(a) * rt), y1 - rt + Math.sin(a) * rt]); }
      return P;
    };
    const R1 = side(1), L1 = side(-1).reverse();
    return [[0, y0], ...R1, [0, y1], ...L1];   // closed ring: bottom centre -> right side -> top centre -> left side
  };
  const N = 64, zs = []; for (let i = 0; i <= N; i++) zs.push(F - 0.02 - (i / N) * (S.L - 0.04));
  // lower body shell (paint)
  const lower = new THREE.Mesh(loft(zs, (z) => rrect(halfW(z), botY(z), Math.max(botY(z) + 0.04, topY(z)), 0.08, 0.13, 0.025)), paint);
  lower.castShadow = true; body.add(lower);
  // greenhouse (tinted glass) + roof skin (paint) + pillars
  const gz = []; const M = 30; for (let i = 0; i <= M; i++) gz.push(S.zA - 0.02 - (i / M) * (S.zA - S.zC - 0.04));
  const gRing = (z, inset, yPad) => { const yb = topY(z) - 0.02, yr = Math.max(yb + 0.01, (roofY(z) ?? yb) + yPad), w = halfW(z) - inset; return rrect(w, yb, yr, 0.01, 0.16, 0.0, 0.8); };
  body.add(new THREE.Mesh(loft(gz, (z) => gRing(z, 0.07, 0)), CAR_GLASS));
  const rz = gz.filter((z) => z < S.zA2 + 0.06 && z > S.zR - 0.06);
  const roofRing = (z) => { const yr = roofY(z), w = (halfW(z) - 0.07) * 0.8 + 0.01; const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10, x = -w + 2 * w * t; pts.push([x, yr - 0.025 + 0.035 * Math.sin(t * Math.PI) + (Math.abs(x) > w - 0.12 ? -0.05 * ((Math.abs(x) - (w - 0.12)) / 0.12) : 0)]); } for (let i = 10; i >= 0; i--) { const t = i / 10, x = -w + 2 * w * t; pts.push([x * 0.98, yr - 0.07]); } return pts.reverse(); };
  if (rz.length > 2) { const roof = new THREE.Mesh(loft(rz, roofRing), paint); roof.castShadow = true; body.add(roof); }
  const pillar = (z0, z1, wid, m) => { for (const sx of [-1, 1]) {
    const y0 = topY(z0) - 0.01, y1 = (roofY(z1) ?? S.roof) - 0.05, x0 = sx * (halfW(z0) - 0.075), x1 = sx * ((halfW(z1) - 0.07) * 0.8 - 0.06);
    const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1), len = a.distanceTo(b);
    const m2 = new THREE.Mesh(sharedBox(0.035, len, wid), m); m2.position.copy(a).add(b).multiplyScalar(0.5);
    m2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); body.add(m2); } };
  pillar(S.zA - 0.03, S.zA2 + 0.03, 0.06, paint);                                      // A pillars
  const zB = (S.zA2 + S.zR) / 2 + 0.05; pillar(zB, zB - 0.02, 0.07, TRIM);               // B pillars (black)
  if (S.tail === 'hatch') pillar(S.zC + 0.08, S.zR - 0.02, 0.2, paint); else pillar(S.zC + 0.08, S.zR - 0.02, 0.14, paint); // C/D pillars
  // window frame line along the belt
  for (const sx of [-1, 1]) { const len = S.zA - S.zC; const m = new THREE.Mesh(sharedBox(0.02, 0.025, len), TRIM); m.position.set(sx * (halfW((S.zA + S.zC) / 2) - 0.05), S.belt + 0.01, (S.zA + S.zC) / 2); body.add(m); }
  // ---- interior (seen through the glass) ----
  const iw = hw - 0.25;
  B(iw * 2, 0.06, S.zA - S.zC - 0.2, INTERIOR, 0, S.belt - 0.08, (S.zA + S.zC) / 2);         // floor/sill fill
  B(iw * 2, 0.14, 0.36, PLASTIC, 0, S.belt + 0.03, S.zA - 0.36);                           // dashboard
  const sw = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.022, 6, 16), PLASTIC); sw.position.set(0.38, S.belt + 0.12, S.zA - 0.6); sw.rotation.x = -0.35; body.add(sw); // RHD steering wheel
  for (const [zz, rows] of [[zB + 0.05, [-0.38, 0.38]], [zB - 0.6, [-0.4, 0, 0.4]]]) {
    if (zz - 0.3 < S.zC || (roofY(zz - 0.25) ?? 0) < S.belt + 0.5) continue;
    for (const xx of rows) { B(rows.length > 2 ? 0.34 : 0.44, 0.42, 0.1, INTERIOR, xx, S.belt + 0.12, zz - 0.25); if (rows.length < 3 || xx) B(0.2, 0.12, 0.08, INTERIOR, xx, S.belt + 0.4, zz - 0.25); }
  }
  // ---- front: headlights, DRL, grille, bumper, fog lamps ----
  const zf = F - 0.14, yh = topY(zf) - 0.07;
  for (const sx of [-1, 1]) {
    const x = sx * (halfW(zf) - 0.2);
    const hl = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.24, 4, 10), HEAD_LENS); hl.rotation.set(0, sx * 0.45, Math.PI / 2); hl.scale.set(1, 1, 0.7); hl.position.set(x, yh, zf - 0.01); body.add(hl);
    const drl = new THREE.Mesh(sharedBox(0.26, 0.018, 0.02), LIGHT_MATS.head); drl.rotation.y = sx * 0.45; drl.position.set(x, yh - 0.06, zf + 0.02); body.add(drl);
    const ind = new THREE.Mesh(sharedBox(0.07, 0.04, 0.03), IND_LENS); ind.position.set(sx * (halfW(zf) - 0.05), yh, zf - 0.02); body.add(ind);
    const fog = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12), HEAD_LENS); fog.rotation.x = Math.PI / 2; fog.position.set(sx * (halfW(F - 0.05) - 0.18), 0.43, F - 0.03); body.add(fog);
    // mirrors (body colour shell on a black base)
    const mz = S.zA - 0.12, mx = sx * (halfW(mz) + 0.06);
    B(0.06, 0.05, 0.08, TRIM, sx * (halfW(mz) + 0.01), S.belt + 0.04, mz);
    const mir = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 6), paint); mir.scale.set(1.0, 0.65, 0.55); mir.position.set(mx + sx * 0.05, S.belt + 0.1, mz - 0.02); body.add(mir);
    // door seams + handles
    for (const zz of [S.zA - 0.08, zB - 0.02, S.tail === 'trunk' ? S.zC + 0.05 : S.zC + 0.12]) { const m = new THREE.Mesh(sharedBox(0.006, S.belt - 0.42, 0.012), TRIM); m.position.set(sx * (halfW(zz) * 1.02 + 0.003), (S.belt + 0.42) / 2, zz); body.add(m); }
    for (const zz of [zB + 0.12, zB - 0.62]) { if (zz < S.zC + 0.1) continue; const m = new THREE.Mesh(sharedBox(0.02, 0.03, 0.15), CHROME); m.position.set(sx * (halfW(zz) * 1.025 + 0.004), S.belt - 0.1, zz); body.add(m); }
    // tail lights wrapping the rear corner
    const zr = Rr + 0.12, yt = topY(zr) - 0.08;
    const tl = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.22, 4, 10), TAIL_LENS); tl.rotation.set(0, -sx * 0.55, Math.PI / 2); tl.scale.set(1, 1, 0.7); tl.position.set(sx * (halfW(zr) - 0.16), yt, zr - 0.05); body.add(tl);
    // wheel-arch liners
    for (const ax of [S.aF, S.aR]) {
      const ar = new THREE.Mesh(new THREE.CylinderGeometry(archR - 0.01, archR - 0.01, 0.42, 16, 1, true, 0, Math.PI), TRIM);
      ar.rotation.z = Math.PI / 2; ar.rotation.y = 0; ar.material = ARCH; ar.position.set(sx * (hw - 0.22), R, ax); body.add(ar);
    }
  }
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(hw * 0.95, 0.13), grilleMat()); gr.position.set(0, yh - 0.04, F - 0.035); body.add(gr);
  B(hw * 1.1, 0.12, 0.05, PLASTIC, 0, 0.44, F - 0.04);                                          // lower intake / bumper
  B(hw * 0.5, 0.025, 0.03, CHROME, 0, yh + 0.035, F - 0.06);                                    // chrome strip
  B(S.W - 0.1, 0.08, 0.06, PLASTIC, 0, 0.36, Rr + 0.05);                                        // rear diffuser
  for (const sx of [-1, 1]) { const w2 = new THREE.Mesh(sharedBox(0.45, 0.012, 0.012), PLASTIC); w2.rotation.y = sx * 0.12; w2.position.set(sx * 0.24, topY(S.zA) + 0.03, S.zA - 0.04); body.add(w2); } // wipers
  B(S.W - 0.4, 0.1, S.aF - S.aR - 0.4, PLASTIC, 0, 0.33, (S.aF + S.aR) / 2);                  // chassis between the wheels
  const commercial = type === 'taxi';
  plate(body, commercial, 0, 0.5, F + 0.005, 0, 0.9); plate(body, commercial, 0, topY(Rr + 0.05) - 0.22, Rr - 0.005, Math.PI, 0.9);
  if (style === 'sedan' && type !== 'police') { const ant = new THREE.Mesh(sharedBox(0.01, 0.25, 0.01), PLASTIC); ant.position.set(0, S.roof + 0.1, S.zR + 0.1); ant.rotation.x = -0.4; body.add(ant); }
  if (style === 'suv') for (const sx of [-1, 1]) B(0.04, 0.05, (S.zA2 - S.zR) * 0.85, CHROME, sx * (hw - 0.3), S.roof + 0.04, (S.zA2 + S.zR) / 2);
  if (type === 'police') {
    const blue = new THREE.MeshStandardMaterial({ color: 0x1a4fa0, roughness: 0.4 });
    for (const sx of [-1, 1]) {
      const st = new THREE.Mesh(sharedBox(0.01, 0.1, S.L * 0.7), blue); st.position.set(sx * (hw * 1.03 + 0.01), 0.68, 0); body.add(st);
      const t = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.24), policeTextMat()); t.position.set(sx * (hw * 1.03 + 0.02), 0.84, -0.1); t.rotation.y = sx * Math.PI / 2; body.add(t);
    }
    B(1.0, 0.08, 0.28, BLACK, 0, S.roof + 0.04, -0.2);
    const r = boxMesh(g, 0.45, 0.12, 0.26, LIGHT_MATS.sirenR, -0.25, S.roof + 0.14, -0.2);
    const bl = boxMesh(g, 0.45, 0.12, 0.26, LIGHT_MATS.sirenB, 0.25, S.roof + 0.14, -0.2);
    r.userData.keep = bl.userData.keep = true; out.sirens.push(r, bl);
  }
  if (type === 'taxi') B(0.6, 0.16, 0.28, new THREE.MeshStandardMaterial({ color: 0xfff176, emissive: 0x554400 }), 0, S.roof + 0.08, -0.3);
  // ---- alloy wheels ----
  for (const [sx, z, st] of [[-1, S.aF, 1], [1, S.aF, 1], [-1, S.aR, 0], [1, S.aR, 0]]) {
    const w = alloyWheel(g, R, 0.23, sx * (hw - 0.15), z, sx); out.wheels.push(w); if (st) out.steerWheels.push(w);
  }
  out.seat = { x: 0.38, y: S.belt - 0.25, z: zB + 0.0 };   // right-hand drive, as in India
  out.style = style; out.riderVisible = true; out.carRider = true;
}
const ARCH = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9, side: THREE.DoubleSide });
const wheelCache = new Map();
function alloyWheel(parent, r, w, x, z, side) {
  const k = r.toFixed(3) + w;
  if (!wheelCache.has(k)) {
    // tyre: lathe of a rounded sidewall profile, axis along x
    const rim = r * 0.64, prof = [];
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * Math.PI; prof.push(new THREE.Vector2(r - 0.045 + Math.cos(a) * 0.045, (w / 2 - 0.045) * Math.sin(a) + Math.sin(a) * 0.045)); }
    prof.unshift(new THREE.Vector2(rim, -w / 2 + 0.02)); prof.push(new THREE.Vector2(rim, w / 2 - 0.02));
    const tyre = new THREE.LatheGeometry(prof, 28); tyre.rotateZ(Math.PI / 2);
    // 5-spoke alloy face
    const sh = new THREE.Shape(); sh.absarc(0, 0, rim, 0, Math.PI * 2, false);
    for (let i = 0; i < 5; i++) { const a0 = (i / 5) * Math.PI * 2 + 0.22, a1 = a0 + Math.PI * 2 / 5 - 0.44, hole = new THREE.Path();
      hole.moveTo(Math.cos(a0) * rim * 0.38, Math.sin(a0) * rim * 0.38); hole.absarc(0, 0, rim * 0.86, a0 + 0.08, a1 - 0.08, false); hole.lineTo(Math.cos(a1) * rim * 0.38, Math.sin(a1) * rim * 0.38); sh.holes.push(hole); }
    const face = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 2, curveSegments: 18 }); face.rotateY(Math.PI / 2);
    const barrel = new THREE.CylinderGeometry(rim, rim, w - 0.04, 20, 1, true); barrel.rotateZ(Math.PI / 2);
    const disc = new THREE.CylinderGeometry(rim * 0.78, rim * 0.78, 0.025, 20); disc.rotateZ(Math.PI / 2);
    const hub = new THREE.CylinderGeometry(rim * 0.2, rim * 0.22, 0.05, 10); hub.rotateZ(Math.PI / 2);
    wheelCache.set(k, { tyre, face, barrel, disc, hub, rim });
  }
  const W = wheelCache.get(k);
  const pivot = new THREE.Group(); pivot.position.set(x, r, z); parent.add(pivot);
  const spin = new THREE.Group(); pivot.add(spin);
  const add = (geo, m, ox = 0) => { const o = new THREE.Mesh(geo, m); o.position.x = ox; o.castShadow = true; o.userData.keep = true; spin.add(o); return o; };
  add(W.tyre, RUBBER); add(W.barrel, TRIM); add(W.disc, DISC, -side * 0.02);
  const f = add(W.face, ALLOY_W, side * (w / 2 - 0.05)); if (side < 0) f.rotation.y = Math.PI;
  add(W.hub, ALLOY_W, side * (w / 2 - 0.02));
  return { pivot, spin, r };
}

/* ---------------- drop-in vehicle models (models/vehicles/<type>.glb or <type>_<anything>.glb) ---------------- */
export const VEHICLE_GLB = {};
/** glTF loader with Draco + Meshopt decoding (many downloaded models are compressed). */
export async function makeGLTFLoader() {
  const [{ GLTFLoader }, { DRACOLoader }, { MeshoptDecoder }] = await Promise.all([
    import('three/addons/loaders/GLTFLoader.js'), import('three/addons/loaders/DRACOLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]);
  const l = new GLTFLoader(); l.setDRACOLoader(new DRACOLoader().setDecoderPath('lib/addons/libs/draco/')); l.setMeshoptDecoder(MeshoptDecoder);
  return l;
}
const VLEN = { car: 4, taxi: 4.1, police: 4.3, auto: 2.7, bus: 11, motorcycle: 2.1, scooter: 1.8, cycle: 1.7, moped: 1.75, twostroke: 2, vintage: 1.8, commuter: 2, retro80: 1.75 };
export async function loadVehicleModels() {
  let list = [];
  try { list = await (await fetch('models/vehicles/', { cache: 'no-store' })).json(); } catch (e) { return 0; }
  const loader = await makeGLTFLoader(); let n = 0;
  for (const f of list) {
    const m = f.match(/^([a-z0-9]+)/i); const type = m && m[1].toLowerCase();
    if (!type || !VLEN[type] || !/\.(glb|gltf)$/i.test(f)) continue;
    try {
      const gl = await new Promise((res, rej) => loader.load('models/vehicles/' + encodeURIComponent(f), res, undefined, rej));
      const sc = gl.scene;
      // normalise: longest horizontal side along z, length to the game's size, sitting on y = 0, centred
      let box = new THREE.Box3().setFromObject(sc), size = box.getSize(new THREE.Vector3());
      const holder = new THREE.Group(); holder.add(sc);
      if (size.x > size.z) sc.rotation.y = Math.PI / 2;
      if (/_rev/i.test(f)) sc.rotation.y += Math.PI;
      holder.updateMatrixWorld(true); box = new THREE.Box3().setFromObject(holder); size = box.getSize(new THREE.Vector3());
      const k = VLEN[type] / Math.max(size.z, 1e-3); sc.scale.multiplyScalar(k);
      holder.updateMatrixWorld(true); box = new THREE.Box3().setFromObject(holder); const c = box.getCenter(new THREE.Vector3());
      sc.position.set(-c.x, -box.min.y, -c.z);
      sc.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      (VEHICLE_GLB[type] = VEHICLE_GLB[type] || []).push({ holder, paintable: /paint/i.test(f) }); n++;
    } catch (e) { console.warn('vehicle model skipped:', f, e); }
  }
  return n;
}
function useVehicleModel(out, body, tpl, type, color) {
  for (const c of body.children) c.visible = false;               // hide the drawn body (keeps lights logic alive)
  const m = tpl.holder.clone(true); body.add(m);
  // recolour the paint for variety: materials named like "paint" / "body" / "carpaint"
  m.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    o.material = mats.map((mt) => { if (/paint|body|car|exterior/i.test(mt.name || '') && !/glass|window|tyre|tire|wheel|chrome|light/i.test(mt.name || '')) { const c2 = mt.clone(); if (type !== 'police' && type !== 'taxi' && type !== 'auto' && type !== 'bus') c2.color.setHex(color); return c2; } return mt; });
    if (o.material.length === 1) o.material = o.material[0];
  });
  // the model brings its own wheels: hide the drawn ones (spinning arbitrary model nodes can wobble, so they stay still)
  for (const w of out.wheels) w.pivot.visible = false;
  out.wheels = []; out.steerWheels = [];
}

/* ---------------- classic Indian two-wheelers (generic, unbranded) ---------------- */
export const RETRO_TYPES = ['moped', 'twostroke', 'vintage', 'commuter', 'retro80'];
export const RETRO_COLORS = {
  moped: [0x1f6b3a, 0x1f6b3a, 0x7a1c1c, 0x1d3f8a, 0x111111],
  twostroke: [0xc0281e, 0xc0281e, 0x111111, 0x1d3f8a, 0xe8e8e8],
  vintage: [0x2bb5a8, 0x6fb7d9, 0xe9dfc4, 0xd8b32a, 0xb3261e, 0x4a7f3a],
  commuter: [0x6b1420, 0x6b1420, 0x111111, 0x1d3f8a, 0x8a8f96],
  retro80: [0xe8461f, 0xe8461f, 0xf2f2f2, 0x1d3f8a, 0xf1c40f],
};
const GOLD = new THREE.MeshStandardMaterial({ color: 0xd9a520, roughness: 0.35, metalness: 0.6 });
const ALLOY = new THREE.MeshStandardMaterial({ color: 0xa9adb3, roughness: 0.45, metalness: 0.7 });
const AMBER = new THREE.MeshStandardMaterial({ color: 0xff9a1a, emissive: 0xff7a00, emissiveIntensity: 0.4, roughness: 0.4 });
const SEAT_BLK = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.55 });
const sphGeo = new THREE.SphereGeometry(1, 16, 10), cylGeo = new THREE.CylinderGeometry(1, 1, 1, 16);

/** Spoked wheel: tyre + chrome rim + thin spokes + hub (spins with the existing wheel pivot). */
function spokedWheel(parent, r, w, z, dark) {
  const wh = wheel(parent, r, w, 0, r, z);
  const rimM = dark ? BLACK : CHROME;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.78, 0.018, 6, 20), rimM); ring.rotation.y = Math.PI / 2; wh.spin.add(ring);
  if (!dark) for (let i = 0; i < 9; i++) {
    const s = new THREE.Mesh(sharedBox(0.008, r * 1.5, 0.008), CHROME); s.rotation.x = (i / 9) * Math.PI; wh.spin.add(s);
  }
  const hub = new THREE.Mesh(cylGeo, ALLOY); hub.scale.set(r * 0.28, w + 0.04, r * 0.28); hub.rotation.z = Math.PI / 2; wh.spin.add(hub);
  ring.userData.keep = hub.userData.keep = true;
  return wh;
}

function buildRetroBike(type, out, body, g, paint, B) {
  const lean = new THREE.Group(); g.add(lean); g.remove(body); lean.add(body); out.lean = lean;
  const S = (m, sx, sy, sz, x, y, z, rx = 0) => { const o = new THREE.Mesh(sphGeo, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.rotation.x = rx; body.add(o); return o; };
  const C = (m, r, len, x, y, z, rx = Math.PI / 2, rz = 0) => { const o = new THREE.Mesh(cylGeo, m); o.scale.set(r, len, r); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); body.add(o); return o; };
  const rod = (m, t, x, y1, z1, y2, z2) => { const len = Math.hypot(y2 - y1, z2 - z1); const o = new THREE.Mesh(sharedBox(t, len, t), m); o.position.set(x, (y1 + y2) / 2, (z1 + z2) / 2); o.rotation.x = Math.atan2(z2 - z1, y2 - y1); body.add(o); return o; };
  const lamp = (r, y, z, ring = CHROME) => { C(ring, r, 0.14, 0, y, z); C(LIGHT_MATS.head, r * 0.85, 0.02, 0, y, z + 0.075); };
  const ind = (y, z, w = 0.42) => { for (const s of [-1, 1]) S(AMBER, 0.04, 0.035, 0.05, s * w / 2, y, z); };
  const mirrors = (y, z, w = 0.62) => { for (const s of [-1, 1]) { rod(CHROME, 0.015, s * w / 2, y, z, y + 0.22, z - 0.04); C(CHROME, 0.055, 0.02, s * w / 2, y + 0.25, z - 0.04); } };
  const fork = (topY, topZ, wz, wr, m = CHROME) => { for (const s of [-1, 1]) rod(m, 0.04, s * 0.09, topY, topZ, wr, wz); };
  const shocks = (y1, z1, y2, z2, w = 0.3) => { for (const s of [-1, 1]) { rod(CHROME, 0.045, s * w / 2, y1, z1, y2, z2); rod(BLACK, 0.06, s * w / 2, y1 + (y2 - y1) * 0.2, z1 + (z2 - z1) * 0.2, y1 + (y2 - y1) * 0.55, z1 + (z2 - z1) * 0.55); } };
  let fz, rz, r, seatY, seatZ, dark = false;

  if (type === 'moped') {
    // Step-through 50cc moped: tube frame, pedals, box tank under the seat, rear carrier
    r = 0.28; fz = 0.62; rz = -0.55;
    const tube = paint;
    rod(tube, 0.07, 0, 1.0, 0.5, 0.45, 0.1); rod(tube, 0.07, 0, 0.45, 0.1, 0.45, -0.2); rod(tube, 0.06, 0, 0.45, -0.2, 0.86, -0.35);
    B(0.26, 0.22, 0.42, paint, 0, 0.72, -0.32);                 // tank box under seat
    B(0.27, 0.04, 0.1, GOLD, 0, 0.72, -0.12);                   // trim
    B(0.24, 0.1, 0.42, SEAT_BLK, 0, 0.9, -0.32); B(0.2, 0.08, 0.2, SEAT_BLK, 0, 0.89, -0.72);  // twin saddles
    B(0.26, 0.03, 0.5, CHROME, 0, 0.82, -0.75); rod(CHROME, 0.02, 0.12, 0.82, -1.0, 0.55, -0.62); rod(CHROME, 0.02, -0.12, 0.82, -1.0, 0.55, -0.62);
    B(0.18, 0.2, 0.26, ALLOY, 0, 0.36, -0.22);                  // engine
    C(BLACK, 0.06, 0.16, 0, 0.34, -0.05, 0, Math.PI / 2);        // pedal crank
    for (const s of [-1, 1]) B(0.1, 0.03, 0.05, BLACK, s * 0.14, 0.34 + s * 0.08, -0.05);
    C(CHROME, 0.04, 0.6, 0.12, 0.33, -0.5);                     // exhaust
    fork(1.0, 0.5, fz, r); B(0.62, 0.035, 0.035, CHROME, 0, 1.12, 0.46);
    lamp(0.08, 1.02, 0.58); B(0.16, 0.04, 0.36, paint, 0, r + 0.32, fz);  // front mudguard
    B(0.2, 0.04, 0.4, paint, 0, r + 0.34, rz - 0.05); B(0.1, 0.06, 0.04, LIGHT_MATS.tail, 0, 0.78, -1.02);
    mirrors(1.12, 0.45, 0.5);
    seatY = 1.0; seatZ = -0.3; plate(body, false, 0, 0.68, -1.04, Math.PI, 0.38);
  } else if (type === 'twostroke' || type === 'commuter') {
    const two = type === 'twostroke';
    r = 0.32; fz = 0.72; rz = -0.66;
    // tank: teardrop for the 2-stroke, squarer for the commuter
    if (two) { S(paint, 0.17, 0.12, 0.33, 0, 0.98, 0.26); for (const s of [-1, 1]) B(0.012, 0.03, 0.42, GOLD, s * 0.165, 0.98, 0.24); }
    else { B(0.3, 0.2, 0.52, paint, 0, 0.98, 0.26); for (const s of [-1, 1]) { B(0.012, 0.035, 0.36, ALLOY, s * 0.152, 0.98, 0.22); B(0.012, 0.035, 0.1, GOLD, s * 0.152, 1.02, 0.42); } }
    B(0.27, 0.1, 0.72, SEAT_BLK, 0, 0.98, -0.34);                // long flat seat
    B(0.24, 0.2, 0.3, paint, 0, 0.78, -0.24);                    // side panel
    for (const s of [-1, 1]) B(0.01, 0.04, 0.2, two ? GOLD : ALLOY, s * 0.122, 0.78, -0.24);
    // engine: finned cylinder block + crankcase
    B(0.26, 0.24, 0.32, ALLOY, 0, 0.48, 0.02);
    for (let i = 0; i < 5; i++) B(two ? 0.28 : 0.22, 0.02, 0.26, ALLOY, 0, 0.66 + i * 0.04, two ? 0.18 : 0.14);
    S(paint, 0.04, 0.09, 0.09, 0.15, 0.46, 0.06);                 // engine side cover badge
    rod(BLACK, 0.06, 0, 0.9, 0.48, 0.5, -0.3); rod(BLACK, 0.05, 0, 0.9, 0.48, 0.42, 0.25); // frame
    if (two) { C(CHROME, 0.065, 0.55, 0.14, 0.36, -0.12); C(CHROME, 0.04, 0.35, 0.14, 0.4, -0.55); }  // expansion chamber + silencer
    else C(CHROME, 0.05, 0.9, 0.14, 0.36, -0.35);
    B(0.3, 0.1, 0.42, CHROME, 0, 0.42, -0.62);                    // chain guard
    shocks(0.96, -0.62, r + 0.05, rz + 0.04);
    fork(1.12, 0.6, fz, r); B(0.7, 0.035, 0.035, CHROME, 0, 1.2, 0.58);
    if (two) lamp(0.1, 1.06, 0.78); else { B(0.22, 0.16, 0.1, BLACK, 0, 1.05, 0.78); B(0.19, 0.13, 0.02, LIGHT_MATS.head, 0, 1.05, 0.835); }
    ind(1.08, 0.74, 0.42);
    B(0.14, 0.03, 0.5, CHROME, 0, r + 0.3, fz + 0.05);           // chrome front mudguard
    B(0.17, 0.03, 0.58, CHROME, 0, r + 0.38, rz - 0.06).rotation.x = -0.25;
    B(0.12, 0.07, 0.05, LIGHT_MATS.tail, 0, 0.86, -0.98); ind(0.86, -0.96, 0.32);
    if (!two) { B(0.28, 0.03, 0.34, CHROME, 0, 1.0, -0.82); }     // rear carrier
    else rod(CHROME, 0.025, 0, 1.02, -0.68, 1.02, -0.86);          // grab rail
    mirrors(1.2, 0.56, 0.58);
    seatY = 1.07; seatZ = -0.28; plate(body, false, 0, 0.72, -1.0, Math.PI, 0.42);
  } else if (type === 'vintage') {
    // Classic steel scooter: bulbous side cowls, tall leg shield, fender-mounted look, split seats
    r = 0.22; fz = 0.62; rz = -0.5; dark = true;
    S(paint, 0.27, 0.24, 0.42, 0, 0.5, -0.5);                     // rear cowl body
    B(0.4, 0.12, 0.5, paint, 0, 0.66, -0.4);
    B(0.4, 0.06, 0.58, BLACK, 0, 0.3, 0.12);                      // floorboard + rubber strips
    for (let i = 0; i < 4; i++) B(0.38, 0.015, 0.03, ALLOY, 0, 0.335, -0.08 + i * 0.12);
    B(0.46, 0.85, 0.06, paint, 0, 0.72, 0.45).rotation.x = -0.18;   // leg shield
    B(0.48, 0.03, 0.08, CHROME, 0, 1.12, 0.38);
    for (const s of [-1, 1]) B(0.015, 0.8, 0.04, CHROME, s * 0.235, 0.72, 0.46).rotation.x = -0.18;
    rod(paint, 0.1, 0, 0.6, 0.5, 1.1, 0.4);                       // steering column
    S(paint, 0.16, 0.13, 0.3, 0, r + 0.13, fz);                   // bulbous front fender
    C(BLACK, 0.06, 0.03, 0, r + 0.25, fz + 0.27, 0.6);
    B(0.66, 0.06, 0.12, paint, 0, 1.18, 0.38);                    // handlebar casing
    lamp(0.085, 1.2, 0.46);                                      // headlamp on the bar
    for (const s of [-1, 1]) C(SEAT_BLK, 0.035, 0.1, s * 0.36, 1.18, 0.38, 0, Math.PI / 2);
    B(0.36, 0.12, 0.36, SEAT_BLK, 0, 0.88, -0.22); B(0.32, 0.1, 0.3, SEAT_BLK, 0, 0.86, -0.6);   // split seats
    rod(CHROME, 0.02, 0, 0.88, -0.78, 0.88, -0.86);
    B(0.12, 0.08, 0.05, LIGHT_MATS.tail, 0, 0.66, -0.92);
    B(0.18, 0.1, 0.06, CHROME, 0, 0.58, -0.92);
    mirrors(1.18, 0.36, 0.5);
    seatY = 0.98; seatZ = -0.28; plate(body, false, 0, 0.5, -0.94, Math.PI, 0.36);
    plate(body, false, 0, 0.92, 0.495, 0, 0.32);
  } else {
    // 80s plastic gearless scooter: angular apron with the headlamp in it, spare wheel on the back
    r = 0.21; fz = 0.6; rz = -0.5;
    B(0.42, 0.42, 0.6, paint, 0, 0.55, -0.42);                    // rear body
    B(0.36, 0.1, 0.5, BLACK, 0, 0.36, -0.42);
    B(0.38, 0.06, 0.5, BLACK, 0, 0.3, 0.12);                      // floor
    B(0.44, 0.7, 0.08, paint, 0, 0.66, 0.48).rotation.x = -0.25;   // apron
    B(0.4, 0.28, 0.2, paint, 0, 1.02, 0.52);                      // headlamp nose
    B(0.3, 0.12, 0.02, LIGHT_MATS.head, 0, 1.02, 0.625); ind(1.02, 0.6, 0.38);
    B(0.62, 0.05, 0.05, BLACK, 0, 1.18, 0.42); rod(BLACK, 0.06, 0, 0.9, 0.5, 1.18, 0.42);
    B(0.14, 0.04, 0.3, paint, 0, r + 0.25, fz);
    B(0.36, 0.12, 0.62, SEAT_BLK, 0, 0.86, -0.35);
    B(0.12, 0.08, 0.05, LIGHT_MATS.tail, 0, 0.7, -0.74);
    // spare wheel standing upright on a carrier behind the seat
    B(0.3, 0.03, 0.18, CHROME, 0, 0.86, -0.8);
    const sp = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.06, 8, 18), TYRE); sp.position.set(0, 1.08, -0.82); sp.rotation.y = Math.PI / 2; body.add(sp); sp.userData.noMerge = true;
    C(CHROME, 0.11, 0.08, 0, 1.08, -0.82, 0, Math.PI / 2);
    mirrors(1.18, 0.42, 0.56);
    seatY = 0.97; seatZ = -0.28; plate(body, false, 0, 0.6, -0.73, Math.PI, 0.36);
  }
  const fw = spokedWheel(lean, r, type === 'moped' ? 0.06 : 0.1, fz, dark || type === 'retro80');
  const rw = spokedWheel(lean, r, type === 'moped' ? 0.07 : 0.12, rz, dark || type === 'retro80');
  B(0.04, 0.32, 0.04, BLACK, 0.1, 0.16, -0.05).rotation.x = 0.5;   // side stand
  out.wheels.push(fw, rw); out.steerWheels.push(fw);
  out.seat = { x: 0, y: seatY, z: seatZ }; out.riderVisible = true;
}

/* ---------------- car profiles (z forward, y up) ---------------- */
const CAR_PROFILES = {
  hatch: {
    body: [[-1.85, 0.3], [1.85, 0.3], [1.92, 0.62], [1.8, 0.8], [0.7, 0.98], [0.05, 1.48], [-1.25, 1.48], [-1.8, 1.05], [-1.9, 0.62]],
    glass: [[0.62, 1.0], [0.06, 1.44], [-1.22, 1.44], [-1.7, 1.06]],
    ws: [[0.7, 0.98], [0.07, 1.46]], rw: [[-1.25, 1.46], [-1.78, 1.07]],
    front: 1.9, rear: -1.88, axleF: 1.25, axleR: -1.25, roofY: 1.48, tailY: 0.86, mirrorY: 1.0,
  },
  sedan: {
    body: [[-2.15, 0.3], [2.1, 0.3], [2.16, 0.62], [2.05, 0.8], [0.85, 0.96], [0.2, 1.43], [-0.95, 1.43], [-1.5, 1.0], [-2.12, 0.95], [-2.18, 0.6]],
    glass: [[0.78, 0.98], [0.21, 1.39], [-0.93, 1.39], [-1.42, 1.01]],
    ws: [[0.85, 0.96], [0.22, 1.41]], rw: [[-0.95, 1.41], [-1.48, 1.0]],
    front: 2.14, rear: -2.16, axleF: 1.35, axleR: -1.35, roofY: 1.43, tailY: 0.82, mirrorY: 1.0,
  },
  suv: {
    body: [[-2.1, 0.35], [2.1, 0.35], [2.16, 0.7], [2.05, 0.95], [0.95, 1.12], [0.45, 1.72], [-1.95, 1.75], [-2.12, 1.2], [-2.15, 0.7]],
    glass: [[0.88, 1.15], [0.46, 1.68], [-1.92, 1.7], [-2.02, 1.18]],
    ws: [[0.95, 1.12], [0.47, 1.7]], rw: [[-1.96, 1.72], [-2.08, 1.22]],
    front: 2.14, rear: -2.14, axleF: 1.35, axleR: -1.35, roofY: 1.75, tailY: 1.0, mirrorY: 1.2,
  },
};
function extrudeProfile(pts, width, material, bevel) {
  const shape = new THREE.Shape(); pts.forEach(([z, y], i) => (i ? shape.lineTo(z, y) : shape.moveTo(z, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 });
  g.rotateY(-Math.PI / 2); g.translate(width / 2 - bevel, 0, 0);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material); m.castShadow = true; return m;
}

/* ---------------- number plates: Puducherry registration (PY) ---------------- */
// Private vehicles: white plate, black text. Commercial (taxi/auto/bus): yellow plate, black text.
const plateMats = { priv: [], comm: [] };
function plateMat(commercial) {
  const arr = commercial ? plateMats.comm : plateMats.priv;
  if (arr.length < 10) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 56; const x = c.getContext('2d');
    x.fillStyle = commercial ? '#f7d117' : '#f5f5f5'; x.fillRect(0, 0, 256, 56);
    x.strokeStyle = '#111'; x.lineWidth = 4; x.strokeRect(2, 2, 252, 52);
    const L = 'ABCDEFGHJKLMNPRSTUVWXYZ', d = () => Math.floor(Math.random() * 10);
    const txt = `PY 0${1 + Math.floor(Math.random() * 5)} ${L[Math.floor(Math.random() * L.length)]}${L[Math.floor(Math.random() * L.length)]} ${d()}${d()}${d()}${d()}`;
    x.fillStyle = '#111'; x.font = 'bold 36px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 128, 30, 240);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    arr.push(new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 }));
  }
  return arr[Math.floor(Math.random() * arr.length)];
}
function plate(parent, commercial, x, y, z, rotY, scale = 1) {
  const m = new THREE.Mesh(geoPlate || (geoPlate = new THREE.PlaneGeometry(0.52, 0.12)), plateMat(commercial));
  m.position.set(x, y, z); m.rotation.y = rotY; m.scale.setScalar(scale); parent.add(m); return m;
}
let geoPlate = null;

let _policeText = null;
function policeTextMat() {
  if (_policeText) return _policeText;
  const c = document.createElement('canvas'); c.width = 256; c.height = 56; const x = c.getContext('2d');
  x.fillStyle = '#1a4fa0'; x.font = 'bold 40px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('POLICE', 128, 30);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (_policeText = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.4 }));
}
const BUS_ROUTES = [['VILLIANUR', 'வில்லியனூர்'], ['BUS STAND', 'பேருந்து நிலையம்'], ['ARIYANKUPPAM', 'அரியாங்குப்பம்'], ['LAWSPET', 'லாஸ்பேட்டை'], ['CUDDALORE', 'கடலூர்'], ['CHENNAI ECR', 'சென்னை']];
function busBoardMat() {
  const [en, ta] = pick(BUS_ROUTES);
  const c = document.createElement('canvas'); c.width = 512; c.height = 102; const x = c.getContext('2d');
  x.fillStyle = '#111'; x.fillRect(0, 0, 512, 102);
  x.fillStyle = '#ff9f1c'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold 40px "Nirmala UI", "Latha", "Noto Sans Tamil", Arial'; x.fillText(ta, 256, 32, 490);
  x.font = 'bold 30px Arial'; x.fillText(en, 256, 78, 490);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.6 });
}
