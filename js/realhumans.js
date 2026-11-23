// Realistic rigged characters (skinned glTF + motion-captured walk / run / idle).
//
// The game's procedural humans stay as an invisible "control rig": all game code keeps calling
// makeHuman()/animateHuman() exactly as before. Near the camera, a realistic avatar is attached
// inside the procedural root and follows it:
//   • walking / standing / running  -> real mocap clips (crossfaded, speed-matched)
//   • every other pose (sit on bike, bench, punch, selfie, swim, crouch, ...) -> the avatar's
//     bones are posed from the procedural limb rotations ("proxy rig"), so nothing in the game breaks.
// Far-away people keep the light procedural mesh, so weak laptop GPUs stay smooth.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { G } from './state.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeGLTFLoader } from './models.js';

const BASES = { man: 'models/chars/man.glb', woman: 'models/chars/woman.glb' };
const ANIMS = 'models/chars/anims.glb';
const FULL_PROXY = new Set(['sit', 'bench', 'down', 'swim', 'crouch', 'jump', 'swag']);
const UPPER_PROXY = { talk: ['RightArm', 'RightForeArm'], call: ['RightArm', 'RightForeArm'], punchL: ['Spine', 'LeftArm', 'LeftForeArm'],
  punchR: ['Spine', 'RightArm', 'RightForeArm'], arrest: ['LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm'],
  film: ['LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm', 'Head'], selfie: ['RightArm', 'RightForeArm', 'Head'] };
const ALL_PROXY = ['Spine', 'Head', 'LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm', 'LeftUpLeg', 'LeftLeg', 'RightUpLeg', 'RightLeg'];
const CHILD = { Spine: 'Spine1', Head: 'HeadTop_End', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', RightArm: 'RightForeArm', RightForeArm: 'RightHand',
  LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot' };
const strip = (n) => n.replace(/^mixamorig:?/, '');

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
/* ---- restyle the built-in female model: denim jeans, black hair tied back (no puffs / headphones) ---- */
function restyleWoman(scene, bones) {
  let mesh = null; scene.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
  if (!mesh) return;
  // 1. repaint: yellow pants -> denim, headphone reds/cyans in the hair area -> black hair
  const mat = mesh.material, img = mat.map && mat.map.image;
  if (img) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d');
    x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height), p = d.data, W = c.width, H = c.height;
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i], g = p[i + 1], b = p[i + 2], px = (i / 4) % W, py = Math.floor(i / 4 / W);
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0, l = (r + g + b) / 3;
      if (r > 170 && g > 140 && b < 130 && r - b > 90) {            // yellow cargo pants -> blue denim with weave noise
        const k = l / 215, n = (Math.random() - 0.5) * 18;
        p[i] = 58 * k + n; p[i + 1] = 92 * k + n; p[i + 2] = 142 * k + n;
      } else if (py < H * 0.62 && !(px > W * 0.79 && py > H * 0.1 && py < H * 0.31) && sat > 0.4 && mx > 80) {   // headphones / glasses accents -> black
        const v = 14 + Math.random() * 10; p[i] = v; p[i + 1] = v * 0.9; p[i + 2] = v * 0.85;
      }
    }
    x.putImageData(d, 0, 0);
    const t = new THREE.CanvasTexture(c); t.flipY = mat.map.flipY; t.colorSpace = mat.map.colorSpace; t.wrapS = mat.map.wrapS; t.wrapT = mat.map.wrapT;
    mat.map = t; mat.needsUpdate = true;
  }
}
const _garm = new Map();
// Tropical camp-collar shirts (reference: "Le Pondichéry" rack): fixed, deterministic prints so every shirt of a design matches
export const TROPICAL = [
  { base: '#b51f26', inks: ['#8f8c86', '#cdc6b8', '#6d6865'], kinds: ['monstera', 'hibiscus', 'palm'], n: 46 },        // red, grey-cream leaves + hibiscus
  { base: '#c6d9e8', inks: ['#2e5c92', '#5f8cbf', '#24466f'], kinds: ['hibiscus', 'leaf', 'palm', 'leaf'], n: 80 },      // pale blue, dense blue florals
  { base: '#1b1b1c', inks: ['#e7dabe', '#b9a37f', '#f3ecdc'], kinds: ['monstera', 'palm', 'hibiscus'], n: 48 },          // black, cream leaves
  { base: '#f1efea', inks: ['#6c7074', '#a3a6a9', '#4d5155'], kinds: ['palm', 'palm', 'monstera'], n: 44 },              // white, grey palm fronds
  { base: '#79c1b6', inks: ['#e0733a', '#2f6f5e', '#efc56a', '#f3efe4'], kinds: ['monstera', 'hibiscus', 'palm', 'leaf'], n: 50 },   // teal, orange + green tropical
];
function drawTropical(x, W, H, d) {
  let sd = 1337 + d.n; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  x.fillStyle = d.base; x.fillRect(0, 0, W, H);
  const palm = (L, ink) => { x.strokeStyle = ink; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(L * 0.5, -L * 0.12, L, 0); x.stroke(); x.fillStyle = ink;
    for (let i = 2; i < 22; i++) { const t = i / 22, px = L * t, py = -L * 0.12 * 4 * t * (1 - t) * 0.5, ll = L * 0.36 * Math.sin(Math.PI * Math.min(1, t * 1.15)); for (const sg of [-1, 1]) { x.save(); x.translate(px, py); x.rotate(sg * (0.9 - t * 0.4)); x.beginPath(); x.ellipse(ll / 2, 0, ll / 2, 3.2, 0, 0, Math.PI * 2); x.fill(); x.restore(); } } };
  const monstera = (R, ink) => { x.fillStyle = ink; x.beginPath(); x.ellipse(0, 0, R, R * 0.8, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = d.base;
    for (let i = 0; i < 7; i++) { const a = -Math.PI * 0.85 + i * 0.3; for (const sg of [-1, 1]) { x.save(); x.rotate(sg * a); x.beginPath(); x.moveTo(R * 0.35, 0); x.lineTo(R * 1.05, -4); x.lineTo(R * 1.05, 4); x.closePath(); x.fill(); x.restore(); } }
    x.strokeStyle = d.base; x.lineWidth = 2; x.beginPath(); x.moveTo(-R, 0); x.lineTo(R, 0); x.stroke(); for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(-R * 0.2 + i * R * 0.3, (i % 2 ? 1 : -1) * R * 0.35, R * 0.08, 0, 7); x.fillStyle = d.base; x.fill(); } };
  const hibiscus = (R, ink, ink2) => { x.fillStyle = ink; for (let i = 0; i < 5; i++) { x.save(); x.rotate(i * Math.PI * 0.4); x.beginPath(); x.ellipse(R * 0.55, 0, R * 0.55, R * 0.42, 0, 0, Math.PI * 2); x.fill(); x.restore(); }
    x.strokeStyle = d.base; x.lineWidth = 1.5; for (let i = 0; i < 5; i++) { x.save(); x.rotate(i * Math.PI * 0.4 + 0.3); x.beginPath(); x.moveTo(0, 0); x.lineTo(R * 0.85, 0); x.stroke(); x.restore(); }
    x.strokeStyle = ink2; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 0); x.lineTo(R * 0.9, -R * 0.5); x.stroke(); x.fillStyle = ink2; x.beginPath(); x.arc(R * 0.9, -R * 0.5, 4, 0, 7); x.fill(); };
  const leaf = (L, ink) => { x.fillStyle = ink; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(L * 0.5, -L * 0.3, L, 0); x.quadraticCurveTo(L * 0.5, L * 0.3, 0, 0); x.fill(); x.strokeStyle = d.base; x.lineWidth = 1.2; x.beginPath(); x.moveTo(0, 0); x.lineTo(L, 0); x.stroke(); };
  for (let k = 0; k < d.n; k++) {
    const kind = d.kinds[k % d.kinds.length], ink = d.inks[k % d.inks.length], ink2 = d.inks[(k + 1) % d.inks.length];
    const cx = r() * W, cy = r() * H, rot = r() * Math.PI * 2, sc = d.n > 25 ? 0.42 : 0.6;
    for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) {   // tile seamlessly
      const px = cx + ox, py = cy + oy; if (px < -150 || px > W + 150 || py < -150 || py > H + 150) continue;
      x.save(); x.translate(px, py); x.rotate(rot);
      if (kind === 'palm') palm(150 * sc, ink); else if (kind === 'monstera') monstera(55 * sc, ink); else if (kind === 'hibiscus') hibiscus(38 * sc, ink, ink2); else leaf(70 * sc, ink);
      x.restore();
    }
  }
}
function garmentTex(pat, colour) {   // shirt / T-shirt / banian fabric with a front placket, collar band or print (front = canvas edges)
  const key = pat + colour; if (_garm.has(key)) return _garm.get(key);
  const trop = /^tropical(\d)$/.exec(pat), W = trop ? 512 : 256, H = W, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const col = '#' + new THREE.Color(colour).getHexString(), dark = 'rgba(0,0,0,0.28)', light = 'rgba(255,255,255,0.35)';
  x.fillStyle = col; x.fillRect(0, 0, W, H);
  if (trop) drawTropical(x, W, H, TROPICAL[+trop[1]]);
  else if (pat === 'check') { for (let k = 0; k < W; k += 16) { x.fillStyle = dark; x.fillRect(k, 0, 5, H); x.fillRect(0, k, W, 5); x.fillStyle = light; x.fillRect(k + 9, 0, 1, H); x.fillRect(0, k + 9, W, 1); } }
  else if (pat === 'stripe') { for (let k = 0; k < W; k += 10) { x.fillStyle = dark; x.fillRect(k, 0, 3, H); } }
  else if (pat === 'banian') { x.fillStyle = '#f4f4f0'; x.fillRect(0, 0, W, H); for (let k = 0; k < W; k += 3) { x.fillStyle = 'rgba(0,0,0,0.05)'; x.fillRect(k, 0, 1, H); } }
  else if (pat === 'knit') { for (let j = 0; j < H; j += 6) for (let i = 0; i < W; i += 6) { x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(i + (j % 12 ? 3 : 0), j, 3, 3); } }
  for (let k = 0; k < 2000; k++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'; x.fillRect(Math.random() * W, Math.random() * H, 1, 1); }
  for (const ox of [0, W]) {                                    // front details centred on u = 0
    if (trop) { x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(ox - 7, 0, 14, H); x.fillStyle = '#efe9dc'; for (let yy = 40; yy < H; yy += 70) { x.beginPath(); x.arc(ox, yy, 5, 0, 7); x.fill(); } }   // camp-collar placket + coconut buttons
    if (pat === 'formal' || pat === 'check' || pat === 'stripe') { x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(ox - 6, 0, 12, H); x.fillStyle = '#f4f4f4'; for (let yy = 30; yy < H; yy += 34) { x.beginPath(); x.arc(ox, yy, 3, 0, 7); x.fill(); } }
    if (pat === 'graphic') { x.fillStyle = 'rgba(15,15,15,0.85)'; x.fillRect(ox - 34, 60, 68, 54); x.fillStyle = '#ffcc33'; x.fillRect(ox - 26, 70, 52, 8); x.fillStyle = '#ff5a5a'; x.fillRect(ox - 26, 84, 34, 8); x.fillStyle = '#fff'; x.fillRect(ox - 26, 98, 44, 6); }
    if (pat === 'banian') { x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(ox, 0, 34, 40, 0, 0, Math.PI); x.fill(); }
  }
  if (pat !== 'banian') { x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(0, 0, W, 10); }     // collar band
  x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, H - 8, W, 8);                              // hem
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (trop) t.wrapS = t.wrapT = THREE.RepeatWrapping; _garm.set(key, t); return t;
}
const KURTI = [[0x1f1f22, 0xb5462e, 0xe9c9a0], [0x7b1e3a, 0xd4af37, 0xf3e3c3], [0x1d4e89, 0xe6e6e6, 0xd4af37], [0x2e6b4f, 0xf2d16b, 0xc0392b], [0xf1e4cc, 0xb03a2e, 0x1d4e89], [0xd35400, 0x1b2631, 0xf7dc6f], [0x5b2c6f, 0xf5cba7, 0xd4af37]];
const _kurtiTex = [];
function kurtiTex(i) {   // printed kurti: base fabric, scattered flower motifs, embroidered yoke at the front, patterned hem border
  if (_kurtiTex[i]) return _kurtiTex[i];
  const [base, acc, acc2] = KURTI[i % KURTI.length].map((h) => '#' + h.toString(16).padStart(6, '0'));
  const W = 512, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, W, H);
  for (let k = 0; k < 900; k++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)'; x.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  const flower = (cx, cy, r) => { x.fillStyle = acc; for (let a = 0; a < 8; a++) { x.beginPath(); x.ellipse(cx + Math.cos(a * Math.PI / 4) * r * 0.55, cy + Math.sin(a * Math.PI / 4) * r * 0.55, r * 0.4, r * 0.18, a * Math.PI / 4, 0, Math.PI * 2); x.fill(); } x.fillStyle = acc2; x.beginPath(); x.arc(cx, cy, r * 0.25, 0, Math.PI * 2); x.fill(); };
  for (let k = 0; k < 26; k++) flower(Math.random() * W, 70 + Math.random() * (H - 150), 9 + Math.random() * 6);
  // hem border band (canvas bottom = bottom of the cylinder)
  x.fillStyle = acc2; x.fillRect(0, H - 62, W, 62); x.fillStyle = acc;
  for (let s = 0; s < W; s += 32) { x.beginPath(); x.moveTo(s, H - 31); x.lineTo(s + 16, H - 52); x.lineTo(s + 32, H - 31); x.lineTo(s + 16, H - 10); x.closePath(); x.fill(); }
  x.fillStyle = base; for (let s = 0; s < W; s += 32) x.fillRect(s + 13, H - 34, 6, 6);
  // embroidered yoke centred on the front (u = 0 wraps the canvas edges)
  for (const ox of [0, W]) {
    x.fillStyle = acc2; x.fillRect(ox - 46, 0, 92, 120); x.fillStyle = acc;
    for (let yy = 10; yy < 110; yy += 18) for (let xx = -38; xx < 38; xx += 18) { x.beginPath(); x.moveTo(ox + xx, yy + 8); x.lineTo(ox + xx + 8, yy); x.lineTo(ox + xx + 16, yy + 8); x.lineTo(ox + xx + 8, yy + 16); x.fill(); }
    x.fillStyle = base; x.beginPath(); x.moveTo(ox - 10, 0); x.lineTo(ox, 46); x.lineTo(ox + 10, 0); x.fill();   // keyhole neckline
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (_kurtiTex[i] = t);
}
let _denim = null;
function DENIM_TEX() {   // twill weave + seams, tinted per person (blue denim, olive/khaki cargo, black)
  if (_denim) return _denim;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#e8e8e8'; x.fillRect(0, 0, 128, 128);
  for (let i = -128; i < 128; i += 3) { x.strokeStyle = 'rgba(0,0,0,0.09)'; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 128, 128); x.stroke(); }
  for (let k = 0; k < 900; k++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'; x.fillRect(Math.random() * 128, Math.random() * 128, 1, 2); }
  x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(62, 0, 3, 128); x.fillStyle = 'rgba(230,180,90,0.5)'; x.fillRect(66, 0, 1, 128);   // side seam + stitching
  _denim = new THREE.CanvasTexture(c); _denim.wrapS = _denim.wrapT = THREE.RepeatWrapping; _denim.repeat.set(2, 2); _denim.colorSpace = THREE.SRGBColorSpace;
  return _denim;
}
let _clothTex = null;
function CLOTH_TEX() {   // woven cotton texture shared by all cloth pieces (tinted per person)
  if (_clothTex) return _clothTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#f2f2f2'; x.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 64; i += 2) { x.fillStyle = 'rgba(0,0,0,0.05)'; x.fillRect(i, 0, 1, 64); x.fillRect(0, i, 64, 1); }
  for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(0,0,0,0.06)'; x.fillRect(Math.random() * 64, 0, 3, 64); }   // soft vertical folds
  _clothTex = new THREE.CanvasTexture(c); _clothTex.wrapS = _clothTex.wrapT = THREE.RepeatWrapping; _clothTex.repeat.set(4, 3); _clothTex.colorSpace = THREE.SRGBColorSpace;
  return _clothTex;
}
// Indian men's short hair (side part, a little volume on top, tapered nape, sideburns) and a thick moustache,
// both modelled in a unit head frame (centre of the skull, +z = face).
const HAIR_GEO = (() => {
  const cap = new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.6); cap.rotateX(-0.4); cap.scale(0.93, 0.98, 1.0); cap.translate(0, 0.0, -0.04);
  const top = new THREE.SphereGeometry(0.8, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5); top.scale(0.7, 0.34, 0.55); top.translate(0.12, 0.5, 0.42);
  const parts = [cap];
  for (const sx of [-1, 1]) { const sb = new THREE.BoxGeometry(0.06, 0.3, 0.16); sb.translate(sx * 0.84, -0.2, 0.22); parts.push(sb); }
  return mergeGeometries(parts.map((g) => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; }));
})();
const MOUSTACHE_GEO = (() => {
  const parts = [];
  for (const sx of [-1, 1]) { const h = new THREE.CapsuleGeometry(0.075, 0.26, 4, 8); h.rotateZ(Math.PI / 2 + sx * 0.22); h.scale(1, 1, 0.55); h.translate(sx * 0.15, -0.74, 0.86); parts.push(h.toNonIndexed()); }
  for (const g of parts) for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  return mergeGeometries(parts);
})();
const DOWN = new THREE.Vector3(0, -1, 0), XAXIS = new THREE.Vector3(1, 0, 0);

const LIMBS = ['LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm', 'LeftUpLeg', 'LeftLeg', 'RightUpLeg', 'RightLeg'];
function onlyRot(clip, name) { if (!clip) return null; const c = clip.clone(); c.name = name; c.tracks = c.tracks.filter((t) => t.name.endsWith('.quaternion')); return c; }
/** Bake a clip from a source rig onto a target rig. Torso/hands/feet copy the world-space rotation offset from rest;
 *  arms and legs copy the world-space bone direction (works across T-pose and A-pose rest poses). */
function retarget(srcScene, clip, dstScene, name) {
  if (!clip) return null;
  const src = skClone(srcScene), dst = skClone(dstScene);
  src.updateMatrixWorld(true); dst.updateMatrixWorld(true);
  const sb = {}, db = {}, order = [];
  src.traverse((o) => { if (o.isBone) sb[strip(o.name)] = o; });
  dst.traverse((o) => { if (o.isBone) { db[strip(o.name)] = o; order.push(o); } });
  const restS = {}, restD = {};
  const wq = (b) => b.getWorldQuaternion(new THREE.Quaternion()), wp = (b) => b.getWorldPosition(new THREE.Vector3());
  for (const n of Object.keys(db)) {
    if (!sb[n]) continue;
    restS[n] = wq(sb[n]); restD[n] = wq(db[n]);
    if (LIMBS.includes(n) && db[CHILD[n]] && sb[CHILD[n]]) restD[n + '_dir'] = wp(db[CHILD[n]]).sub(wp(db[n])).normalize();
  }
  const restLocal = new Map(order.map((b) => [b, b.quaternion.clone()]));
  const mixer = new THREE.AnimationMixer(src); const act = mixer.clipAction(clip); act.play();
  const fps = 30, nF = Math.max(2, Math.round(clip.duration * fps) + 1), times = [], vals = new Map();
  for (const b of order) if (restS[strip(b.name)]) vals.set(b, []);
  for (let f = 0; f < nF; f++) {
    const t = Math.min(clip.duration, f / fps); times.push(t);
    mixer.setTime(t); src.updateMatrixWorld(true);
    for (const b of order) b.quaternion.copy(restLocal.get(b));
    for (const b of order) {
      const n = strip(b.name), arr = vals.get(b); if (!arr) continue;
      let W;
      if (restD[n + '_dir']) {
        const dir = wp(sb[CHILD[n]]).sub(wp(sb[n])).normalize();
        W = new THREE.Quaternion().setFromUnitVectors(restD[n + '_dir'], dir).multiply(restD[n]);
      } else {
        W = wq(sb[n]).multiply(restS[n].clone().invert()).multiply(restD[n]);
      }
      const pw = b.parent.getWorldQuaternion(new THREE.Quaternion());
      b.quaternion.copy(pw.invert().multiply(W)); b.updateMatrixWorld(true);
      arr.push(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
    }
  }
  const tracks = [...vals.entries()].map(([b, v]) => new THREE.QuaternionKeyframeTrack(b.name + '.quaternion', times, v));
  return new THREE.AnimationClip(name, clip.duration, tracks);
}

export class RealHumans {
  constructor() { this.ready = false; this.templates = {}; this.byGender = { man: [], woman: [] }; this.pool = {}; this.active = new Set(); this.timer = 0; this.limit = 12; }

  async load() {
    const loader = await makeGLTFLoader();
    const get = (u) => new Promise((res, rej) => loader.load(u, res, undefined, rej));
    const [man, woman, anims] = await Promise.all([get(BASES.man), get(BASES.woman), get(ANIMS)]);
    const samba = woman.animations.find((a) => /samba/i.test(a.name));
    // optional drop-in characters: models/chars/extra/*.glb|.fbx (Mixamo-rigged). File names with
    // female / woman / girl / lady become women, everything else men.
    const extras = [];
    try {
      const list = await (await fetch('models/chars/extra/', { cache: 'no-store' })).json();
      const fbx = new FBXLoader();
      for (const f of list) {
        try {
          const url = 'models/chars/extra/' + encodeURIComponent(f);
          const obj = /\.fbx$/i.test(f) ? await new Promise((res, rej) => fbx.load(url, res, undefined, rej)) : (await get(url)).scene;
          extras.push(['x:' + f, { scene: obj }, /female|woman|girl|lady|women/i.test(f) ? 'woman' : 'man']);
        } catch (e) { console.warn('character model skipped:', f, e); }
      }
    } catch (e) { /* no drop-in folder listing (static server) */ }
    for (const [key, gl, gender] of [['man', man, 'man'], ['woman', woman, 'woman'], ...extras]) {
      const scene = gl.scene; scene.updateMatrixWorld(true);
      const bones = {}; scene.traverse((o) => { if (o.isBone) bones[strip(o.name)] = o; });
      if (!bones.Hips || !bones.Head || !bones.LeftUpLeg) { console.warn('character has no Mixamo-style skeleton:', key); continue; }
      if (gender === 'woman' && key === 'woman') restyleWoman(scene, bones);
      const prefix = Object.keys(bones).length && [...Object.values(bones)][0].name.startsWith('mixamorig') ? 'mixamorig' : '';
      const hipsY = bones.Hips.getWorldPosition(_v).y;
      const rest = {};
      for (const n of ALL_PROXY) {
        const b = bones[n], c = bones[CHILD[n]]; if (!b) continue;
        const q = b.getWorldQuaternion(new THREE.Quaternion());
        const dir = c ? c.getWorldPosition(new THREE.Vector3()).sub(b.getWorldPosition(new THREE.Vector3())).normalize() : new THREE.Vector3(0, 1, 0);
        rest[n] = { q, dir };
      }
      // retarget the mocap clips onto this skeleton (bone rest orientations differ between rigs)
      const A = (n) => anims.animations.find((a) => a.name === n);
      const clips = {
        idle: retarget(anims.scene, A('idle'), scene, 'idle'), walk: retarget(anims.scene, A('walk'), scene, 'walk'),
        run: retarget(anims.scene, A('run'), scene, 'run'), agree: retarget(anims.scene, A('agree'), scene, 'agree'), shake: retarget(anims.scene, A('headShake'), scene, 'shake'), dance: scene === woman.scene ? onlyRot(samba, 'dance') : retarget(woman.scene, samba, scene, 'dance'),
      };
      scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; if (/Teeth/i.test(o.name)) o.visible = false; } });
      // short black hair cap glued to the Head bone (the man's own hair belongs to his hat mesh)
      let hairLocal = null;
      if (key === 'man') {
        const hb = bones.Head, top = bones.HeadTop_End.getWorldPosition(new THREE.Vector3()), hp = hb.getWorldPosition(new THREE.Vector3());
        const hh = top.y - hp.y, c = hp.clone().lerp(top, 0.47); c.z -= hh * 0.06;
        const wm = new THREE.Matrix4().compose(c, new THREE.Quaternion(), new THREE.Vector3(hh * 0.48, hh * 0.5, hh * 0.54));
        hairLocal = hb.matrixWorld.clone().invert().multiply(wm);
      }
      // rigid clothing pieces glued to bones: veshti/lungi/saree wrap (Hips), saree pallu (chest), shoulder towel
      const attach = {};
      {
        const P = (n) => bones[n] && bones[n].getWorldPosition(new THREE.Vector3());
        const hp = P('Hips'), ft = P('LeftFoot') || P('LeftLeg'), ch = P('Spine2') || P('Spine1'), sh = P('RightShoulder') || P('RightArm');
        const u = hp.y / 0.95;                                         // template units per metre
        const local = (bone, m) => bones[bone].matrixWorld.clone().invert().multiply(m);
        const top = hp.y + (gender === 'woman' ? -0.02 : 0.08) * u, bot = Math.max(ft.y + 0.05 * u, 0.06 * u), h = top - bot, rT = (gender === 'woman' ? 0.135 : 0.17) * u, rB = (gender === 'woman' ? 0.27 : 0.3) * u;
        attach.wrap = { bone: 'Hips', geo: new THREE.CylinderGeometry(rT, rB, h, 22, 1, true), m: local('Hips', new THREE.Matrix4().makeTranslation(hp.x, bot + h / 2, hp.z)) };
        attach.border = { bone: 'Hips', geo: new THREE.CylinderGeometry(rB * 1.01, rB * 1.012, 0.07 * u, 22, 1, true), m: local('Hips', new THREE.Matrix4().makeTranslation(hp.x, bot + 0.035 * u, hp.z)) };
        attach.belt = { bone: 'Hips', geo: new THREE.CylinderGeometry(rT * 1.02, rT * 1.02, 0.06 * u, 22, 1, true), m: local('Hips', new THREE.Matrix4().makeTranslation(hp.x, top - 0.03 * u, hp.z)) };
        if (ch) {
          const pg = new THREE.PlaneGeometry(0.2 * u, 0.42 * u);
          const pm = new THREE.Matrix4().compose(new THREE.Vector3(ch.x + 0.02 * u, ch.y - 0.16 * u, ch.z + 0.12 * u), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08, 0, 0.62)), new THREE.Vector3(1, 1, 1));
          attach.pallu = { bone: bones.Spine2 ? 'Spine2' : 'Spine1', geo: pg, m: local(bones.Spine2 ? 'Spine2' : 'Spine1', pm) };
        }
        if (gender === 'man' && ch) {
          // street clothes over the model's suit: shirt / T-shirt / banian shell, folded lungi, head towel, backpack
          const ra = P('RightArm') || sh, nk = P('Neck') || ch, sw = Math.abs(ra.x - hp.x) || 0.18 * u;
          const y0 = hp.y - 0.06 * u, y1 = nk.y - 0.015 * u, hh = y1 - y0;
          const prof = [[0.86, 0], [0.88, 0.3], [0.95, 0.6], [1.0, 0.8], [0.93, 0.9], [0.62, 0.97], [0.4, 1]].map(([r, t]) => new THREE.Vector2(r * sw, t * hh - hh / 2));
          const sg = new THREE.LatheGeometry(prof, 30); sg.scale(1, 1, 0.8);
          attach.shirt = { bone: bones.Spine1 ? 'Spine1' : 'Spine', geo: sg, m: local(bones.Spine1 ? 'Spine1' : 'Spine', new THREE.Matrix4().makeTranslation(hp.x, y0 + hh / 2, hp.z + 0.01 * u)), garment: true };
          const kn = (P('LeftLeg') || ft).y + 0.02 * u, top2 = hp.y + 0.08 * u, h2 = top2 - kn;
          attach.wrapShort = { bone: 'Hips', geo: new THREE.CylinderGeometry(0.17 * u, 0.27 * u, h2, 22, 1, true), m: local('Hips', new THREE.Matrix4().makeTranslation(hp.x, kn + h2 / 2, hp.z)) };
          const hd = P('Head'), ht = P('HeadTop_End') || hd.clone().add(new THREE.Vector3(0, 0.2 * u, 0)), hr = (ht.y - hd.y) * 0.55;
          const tw = new THREE.TorusGeometry(hr * 0.92, hr * 0.2, 8, 24); tw.rotateX(Math.PI / 2); tw.scale(1, 1, 1.12);
          attach.headTowel = { bone: 'Head', geo: tw, m: local('Head', new THREE.Matrix4().compose(new THREE.Vector3(hd.x, hd.y + hr * 0.95, hd.z - hr * 0.08), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.18, 0, 0)), new THREE.Vector3(1, 1, 1))) };
          // baggy trouser legs: loose tubes along thigh and shin bones, flared and bunched at the ankle
          const tubeAlong = (a, b, r0, r1, boneName, key2) => {
            const dir = b.clone().sub(a), len = dir.length(), g2 = new THREE.CylinderGeometry(r1, r0, len * 1.22, 18, 4, true);
            const pz = g2.attributes.position; for (let i = 0; i < pz.count; i++) { const yy = pz.getY(i); pz.setX(i, pz.getX(i) * (1 + 0.06 * Math.sin(yy / len * 9))); } // fabric folds
            g2.computeVertexNormals();
            const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize().negate());
            attach[key2] = { bone: boneName, geo: g2, m: local(boneName, new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1))), baggy: true };
          };
          for (const side of ['Left', 'Right']) {
            const th = P(side + 'UpLeg'), kn2 = P(side + 'Leg'), an = P(side + 'Foot');
            if (th && kn2 && an) { tubeAlong(th.clone().add(new THREE.Vector3(0, 0.02 * u, 0)), kn2, 0.105 * u, 0.088 * u, side + 'UpLeg', 'baggyT' + side[0]); tubeAlong(kn2, an.clone().add(new THREE.Vector3(0, 0.01 * u, 0)), 0.088 * u, 0.098 * u, side + 'Leg', 'baggyS' + side[0]); }
          }
          // short sleeves + camp collar for the printed holiday shirts (worn without the suit jacket)
          for (const side of ['Left', 'Right']) {
            const sh2 = P(side + 'Arm'), el = P(side + 'ForeArm');
            if (sh2 && el) { tubeAlong(sh2.clone().lerp(el, -0.08), sh2.clone().lerp(el, 0.5), 0.085 * u, 0.079 * u, side + 'Arm', 'sleeve' + side[0]); Object.assign(attach['sleeve' + side[0]], { baggy: false, garment: true }); const uvs = attach['sleeve' + side[0]].geo.attributes.uv; for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) * 0.45, uvs.getY(i) * 0.3); }
          }
          for (const side of ['Left', 'Right']) {     // bare arms below the short sleeve (the base body has none under its jacket)
            const sh2 = P(side + 'Arm'), el = P(side + 'ForeArm'), wr = P(side + 'Hand');
            if (sh2 && el && wr) {
              tubeAlong(sh2.clone().lerp(el, 0.35), el.clone().lerp(wr, -0.02), 0.046 * u, 0.038 * u, side + 'Arm', 'armU' + side[0]);
              tubeAlong(el.clone().lerp(wr, 0.02), wr.clone().lerp(el, 0.04), 0.037 * u, 0.028 * u, side + 'ForeArm', 'armF' + side[0]);
              for (const k of ['armU', 'armF']) { const A2 = attach[k + side[0]]; A2.baggy = false; A2.solid = 0xffffff; A2.skin = true; const pz = A2.geo.attributes.position; for (let i = 0; i < pz.count; i++) { const yy = pz.getY(i); pz.setX(i, pz.getX(i) / (1 + 0.06 * Math.sin(yy * 9 / (A2.geo.parameters.height / 1.22)))); } A2.geo.computeVertexNormals(); }
            }
          }
          { const cg = new THREE.TorusGeometry(0.075 * u, 0.022 * u, 6, 20, Math.PI * 1.6); cg.rotateX(Math.PI / 2); cg.rotateY(Math.PI * 0.7); cg.scale(1, 1, 0.9);
            attach.collar = { bone: bones.Neck ? 'Neck' : 'Spine2', geo: cg, m: local(bones.Neck ? 'Neck' : 'Spine2', new THREE.Matrix4().makeTranslation(nk.x, nk.y - 0.005 * u, nk.z + 0.005 * u)), garment: true }; }
          const bp = new THREE.BoxGeometry(0.3 * u, 0.4 * u, 0.13 * u);
          attach.backpack = { bone: bones.Spine2 ? 'Spine2' : 'Spine1', geo: bp, m: local(bones.Spine2 ? 'Spine2' : 'Spine1', new THREE.Matrix4().makeTranslation(ch.x, ch.y - 0.06 * u, ch.z - 0.19 * u)), solid: 0x263238 };
        }
        if (gender === 'woman' && ch) {
          const kTop = ch.y + 0.06 * u, kBot = hp.y - 0.42 * u, kh = kTop - kBot;
          const prof = [[0.205, 0], [0.175, 0.3], [0.15, 0.55], [0.128, 0.72], [0.13, 0.86], [0.118, 1]].map(([r, t]) => new THREE.Vector2(r * u, t * kh - kh / 2));
          attach.kurti = { bone: bones.Spine1 ? 'Spine1' : 'Spine', geo: new THREE.LatheGeometry(prof, 28), m: local(bones.Spine1 ? 'Spine1' : 'Spine', new THREE.Matrix4().makeTranslation(hp.x, kBot + kh / 2, hp.z + 0.005 * u)), kurti: true };
          const hd = P('Head'), ht = P('HeadTop_End') || hd.clone().add(new THREE.Vector3(0, 0.2 * u, 0)), hr = (ht.y - hd.y) * 0.55;
          attach.bun = { bone: 'Head', geo: new THREE.SphereGeometry(hr * 0.42, 14, 10), m: local('Head', new THREE.Matrix4().makeTranslation(hd.x, hd.y + hr * 0.75, hd.z - hr * 1.05)), solid: 0x0d0b0a };
          attach.bindi = { bone: 'Head', geo: new THREE.CircleGeometry(hr * 0.06, 12), m: local('Head', new THREE.Matrix4().makeTranslation(hd.x, hd.y + hr * 0.95, hd.z + hr * 1.02)), solid: 0xc0001a };
          const nk = P('Neck') || hd;
          const tor = new THREE.TorusGeometry(hr * 0.62, hr * 0.045, 6, 28); tor.rotateX(Math.PI / 2 - 0.25);
          attach.necklace = { bone: bones.Neck ? 'Neck' : 'Head', geo: tor, m: local(bones.Neck ? 'Neck' : 'Head', new THREE.Matrix4().makeTranslation(nk.x, nk.y - hr * 0.2, nk.z + hr * 0.12)), metal: true };
        }
        if (sh) {
          const tg = new THREE.BoxGeometry(0.16 * u, 0.025 * u, 0.42 * u);
          const tm = new THREE.Matrix4().compose(new THREE.Vector3(sh.x - 0.03 * u, sh.y + 0.05 * u, sh.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.25)), new THREE.Vector3(1, 1, 1));
          const tb = bones.RightShoulder ? 'RightShoulder' : 'Spine2'; attach.towel = { bone: tb, geo: tg, m: local(tb, tm) };
        }
      }
      this.templates[key] = { attach, key, gender, builtin: !key.startsWith('x:'), scene, clips, rest, scale: 0.95 / hipsY, hairLocal };
      this.byGender[gender].push(key); this.pool[key] = [];
    }
    this.ready = true;
  }

  /** Build (or reuse) an avatar and dress it from the procedural look. */
  make(kind) {
    const T = this.templates[kind];
    const model = skClone(T.scene);
    const meshes = []; model.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); meshes.push(o); } });
    const bones = {}; model.traverse((o) => { if (o.isBone) bones[strip(o.name)] = o; });
    const restLocal = new Map(); model.traverse((o) => { if (o.isBone) restLocal.set(o, o.quaternion.clone()); });
    let hair = null;
    if (T.hairLocal) {
      hair = new THREE.Mesh(HAIR_GEO, new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.75 }));
      hair.matrixAutoUpdate = false; hair.matrix.copy(T.hairLocal); hair.castShadow = true; bones.Head.add(hair);
      const mo = new THREE.Mesh(MOUSTACHE_GEO, new THREE.MeshStandardMaterial({ color: 0x0f0d0c, roughness: 0.8 }));
      mo.matrixAutoUpdate = false; mo.matrix.copy(T.hairLocal); mo.visible = false; bones.Head.add(mo); hair.userData.moustache = mo;
    }
    const cloth = {};
    for (const [k, A] of Object.entries(T.attach || {})) {
      if (!bones[A.bone]) continue;
      const mat = A.metal ? new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.25, metalness: 0.9 })
        : A.solid != null ? new THREE.MeshStandardMaterial({ color: A.solid, roughness: 0.6, side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide, map: A.kurti || A.garment ? null : A.baggy ? DENIM_TEX() : CLOTH_TEX() });
      const m = new THREE.Mesh(A.geo, mat);
      m.matrixAutoUpdate = false; m.matrix.copy(A.m); m.castShadow = true; m.visible = false; m.frustumCulled = false; bones[A.bone].add(m); cloth[k] = m;
    }
    const root = new THREE.Group(); root.add(model); root.scale.setScalar(T.scale);
    const mixer = new THREE.AnimationMixer(model);
    const actions = {}; for (const [k, c] of Object.entries(T.clips)) if (c) actions[k] = mixer.clipAction(c);
    return { kind, cloth, gender: T.gender, builtin: T.builtin, hair, root, model, meshes, bones, restLocal, mixer, actions, cur: null, T, host: null, hidden: [], last: new THREE.Vector3(), speed: 0 };
  }

  dress(av, L) {
    const tint = (m, hex, k) => { m.color.copy(new THREE.Color(1, 1, 1).lerp(new THREE.Color(hex), k)); };
    const skinN = new THREE.Color(L.skin || 0x8d5524); const mx = Math.max(skinN.r, skinN.g, skinN.b) || 1; skinN.multiplyScalar(1 / mx);
    for (const o of av.meshes) {
      const n = o.material.name || o.name;
      if (!av.builtin) continue;   // drop-in models keep their own clothes and skin
      if (av.gender === 'woman') { tint(o.material, skinN.getHex(), 0.3); continue; }
      if (/Skin|Body/.test(n)) {           // convert the model's light skin to the person's Indian skin tone
        const want = new THREE.Color(L.skin || 0x8d5524), base = new THREE.Color().setRGB(0.86, 0.66, 0.56, THREE.SRGBColorSpace);
        o.material.color.setRGB(Math.min(1.3, want.r / base.r * 1.05), Math.min(1.3, want.g / base.g * 1.05), Math.min(1.3, want.b / base.b * 1.05));
      }
      else if (/Eye/.test(n)) o.material.color.setHex(0x3a2516);
      else if (/Outfit_Top/.test(n)) tint(o.material, L.police ? 0xc2a46b : L.shirt, L.police || L.lungi || L.dhoti ? 0.85 : 0.55);
      else if (/Outfit_Bottom/.test(n)) tint(o.material, L.police ? 0xb59a62 : L.pants, L.police ? 0.85 : 0.6);
      else if (/Headwear/.test(n)) { o.visible = !!(L.police || L.hat || (L.cap && Math.random() < 0.5)); if (o.visible) tint(o.material, L.police ? 0xb71c1c : (L.cap || L.hat), 0.85); }
      else if (/Beard/.test(n)) o.visible = false;   // replaced by an Indian-style moustache
    }
    // traditional wear on the realistic bodies, from the person's outfit
    const C = av.cloth || {}, show = (k, v, col) => { if (C[k]) { C[k].visible = !!v; if (v && col != null) C[k].material.color.setHex(col); } };
    const wrap = L.female ? !!L.saree : !!(L.lungi || L.dhoti);
    show('wrap', wrap, L.pants); show('belt', wrap && !L.female, L.lungiStripes || L.borderColor || L.pants);
    show('border', wrap, L.border || L.borderColor || L.lungiStripes || (L.dhoti ? 0xd4ac0d : L.pants));
    show('pallu', !!(L.female && L.saree), L.shirt === L.pants ? L.pants : (L.pants));
    if (av.gender === 'man' && av.builtin && C.shirt) {
      // pick the garment from the person's look
      if (L.tropical === undefined) L.tropical = (!L.police && !L.vest && !L.bareChest && !L.old && !L.fisher && Math.random() < (L.college || L.tourist ? 0.45 : 0.3)) ? Math.floor(Math.random() * TROPICAL.length) : -1;
      const pat = L.tropical >= 0 && !L.police && !L.vest && !L.bareChest ? 'tropical' + L.tropical : L.vest || L.bareChest ? 'banian' : L.police ? 'plain' : L.longSleeve ? (L.shirtPat === 'check' ? 'check' : 'formal') : (L.shirtPat || 'plain');
      const fishy = !!(L.lungi && (L.vest || L.turban));
      C.shirt.visible = !L.police; if (C.shirt.visible) { C.shirt.material.map = garmentTex(pat, L.vest || L.bareChest ? 0xf4f4f0 : L.shirt); C.shirt.material.needsUpdate = true; }
      const bare = false;   // the garment is printed on the whole upper body (sleeves included)
      for (const o of av.meshes) if (/Outfit_Top/.test(o.material.name || o.name)) { if (!o.userData.map0) o.userData.map0 = o.material.map || 1; o.material.map = L.police ? (o.userData.map0 === 1 ? null : o.userData.map0) : garmentTex(pat, pat === 'banian' ? 0xf4f4f0 : L.shirt); o.material.needsUpdate = true; }
      const holiday = pat.startsWith('tropical');
      for (const o of av.meshes) if (/Outfit_Top/.test(o.material.name || o.name)) o.visible = !holiday;
      const skinC = av.meshes.find((o) => /Body/.test(o.material.name || o.name))?.material.color;
      for (const k of ['armUL', 'armUR', 'armFL', 'armFR']) if (C[k]) { C[k].visible = holiday; C[k].material.color.set(L.skin || 0x8d5524).multiplyScalar(0.92); C[k].material.roughness = 0.55; C[k].material.side = THREE.FrontSide; }
      if (holiday) { for (const k of ['shirt', 'sleeveL', 'sleeveR', 'collar']) if (C[k]) { C[k].visible = true; C[k].material.map = garmentTex(pat, 0xffffff); C[k].material.color.setHex(0xffffff); C[k].material.needsUpdate = true; } }
      else for (const k of ['sleeveL', 'sleeveR', 'collar']) show(k, false);
      for (const o of av.meshes) if (/Outfit_Top/.test(o.material.name || o.name)) o.material.color.copy(L.police ? new THREE.Color(0xc2a46b) : !bare ? new THREE.Color(0xffffff) : bare ? new THREE.Color(L.skin || 0x8d5524).lerp(new THREE.Color(1, 1, 1), 0.15) : new THREE.Color(L.police ? 0xc2a46b : (L.vest ? 0xf4f4f0 : L.shirt)));
      if (fishy) { show('wrap', false); show('border', false); show('belt', false); show('wrapShort', true, L.pants); }
      else show('wrapShort', false);
      show('headTowel', !!(L.turban || fishy), typeof L.turban === 'number' ? L.turban : 0xf4e04d);
      const baggy = !!(!wrap && !fishy && !L.police) && !!(L.college || L.ripped || L.baggy || (L.youth && Math.random() < 0.6));
      const pc = L.baggyCol ??= (Math.random() < 0.65 ? (L.pants || 0x2c4a7a) : [0x5d6b3a, 0x8a7a5a, 0x2b2b2b, 0x4a5a6a][Math.floor(Math.random() * 4)]);
      for (const k of ['baggyTL', 'baggyTR', 'baggySL', 'baggySR']) show(k, baggy, pc);
      show('backpack', !!L.backpack, typeof L.backpack === 'number' ? L.backpack : 0x263238);
      if (!wrap && !fishy) for (const o of av.meshes) if (/Outfit_Bottom/.test(o.material.name || o.name)) o.material.color.copy(new THREE.Color(L.pants || 0x2c4a7a).lerp(new THREE.Color(1, 1, 1), 0.08));
      if (baggy) for (const o of av.meshes) if (/Outfit_Bottom/.test(o.material.name || o.name)) o.material.color.set(pc).multiplyScalar(0.8);
      for (const o of av.meshes) if (/Footwear/.test(o.material.name || o.name)) o.material.color.setHex(fishy ? 0x3a2a1e : 0xffffff);   // rubber chappals for fishermen
    }
    if (av.gender === 'woman' && av.builtin) {
      const kurti = !(L.saree);
      if (C.kurti) { C.kurti.visible = kurti; if (kurti) { C.kurti.material.map = kurtiTex(L._kurti ??= Math.floor(Math.random() * KURTI.length)); C.kurti.material.color.setHex(0xffffff); C.kurti.material.needsUpdate = true; } }
      show('bun', true); show('bindi', !L.western || Math.random() < 0.5); show('necklace', true, Math.random() < 0.5 ? 0xd4af37 : 0xdadada);
      if (C.necklace) C.necklace.material.color.setHex((L._gold ??= Math.random() < 0.5) ? 0xd4af37 : 0xdcdcdc);
      // skin tone: brighten / darken the base texture per person
      const sk = new THREE.Color(L.skin || 0x9a6a4a), lum = sk.r * 0.3 + sk.g * 0.59 + sk.b * 0.11;
      for (const o of av.meshes) o.material.color.setRGB(1, 1, 1).multiplyScalar(0.85 + lum * 2.2);
    }
    show('towel', !!(L.towelShoulder || L.towel), typeof L.towelShoulder === 'number' ? L.towelShoulder : 0xf5f5f0);
    if (wrap) for (const o of av.meshes) if (/Outfit_Bottom/.test(o.material.name || o.name)) o.material.color.copy(new THREE.Color(L.skin || 0x8d5524)).lerp(new THREE.Color(1, 1, 1), 0.2);
    // body variety: height from the look, build varies per person, elders stoop slightly
    const bw = 0.92 + Math.random() * 0.18, ht = (L.h || 1) * (L.old ? 0.97 : 1);
    av.root.scale.set(av.T.scale * bw * ht, av.T.scale * ht, av.T.scale * (0.95 + (bw - 1) * 0.6) * ht);
    av.stoop = L.old ? 0.22 : 0;
    if (av.hair && av.hair.userData.moustache) av.hair.userData.moustache.visible = !!(L.moustache || L.beard || L.old || Math.random() < 0.35);
    if (av.hair) { av.hair.visible = !L.bald; av.hair.material.color.setHex(L.old ? 0xbdbdbd : 0x141210);
    }
  }

  attach(h) {
    // a stable random model per person (drop-in models are preferred when present)
    const g = h.look.female ? 'woman' : 'man', keys = this.byGender[g];
    if (!keys.length) return;
    if (h.look._model === undefined || !this.templates[h.look._model]) {
      const xs = keys.filter((k) => !this.templates[k].builtin);
      h.look._model = xs.length && Math.random() < 0.85 ? xs[Math.floor(Math.random() * xs.length)] : keys[Math.floor(Math.random() * keys.length)];
    }
    const kind = h.look._model;
    const av = this.pool[kind].pop() || this.make(kind);
    this.dress(av, h.look);
    av.host = h; av.hidden.length = 0;
    h.root.traverse((o) => { if (o.isMesh && o.visible && !o.userData.prop) { o.visible = false; av.hidden.push(o); } });
    h.root.add(av.root); h.av = av;
    h.root.getWorldPosition(av.last); av.speed = 0; av.cur = null;
    this.active.add(av);
  }

  detach(h) {
    const av = h.av; if (!av) return;
    for (const o of av.hidden) o.visible = true;
    av.root.removeFromParent(); av.mixer.stopAllAction(); av.host = null; h.av = null;
    this.active.delete(av); this.pool[av.kind].push(av);
  }

  /** Pick which people get a realistic body: the player always, then the nearest ones. */
  assign() {
    const cam = G.camera.position, hosts = [];
    if (G.player && G.player.h) hosts.push([G.player.h, -1]);
    for (const p of G.peds || []) if (p.h && p.mesh.parent) hosts.push([p.h, p.h.root.getWorldPosition(_v).distanceToSquared(cam)]);
    for (const v of G.vehicles || []) if (v.rider && v.rider.root.parent) hosts.push([v.rider, v.rider.root.getWorldPosition(_v).distanceToSquared(cam)]);
    hosts.sort((a, b) => a[1] - b[1]);
    const want = new Set();
    for (const [h, d] of hosts) { if (want.size >= this.limit) break; if (d < 55 * 55) want.add(h); }
    for (const av of [...this.active]) if (!want.has(av.host) || !av.host.root.parent) this.detach(av.host);
    for (const h of want) if (!h.av) this.attach(h);
  }

  update(dt) {
    if (!this.ready || !G.camera) return;
    this.timer -= dt; if (this.timer <= 0) { this.timer = 0.4; this.assign(); }
    for (const av of this.active) this.drive(av, Math.max(dt, 1e-4));
  }

  play(av, name, fade = 0.25) {
    if (av.cur === name) return av.actions[name];
    const next = av.actions[name]; if (!next) return null;
    next.reset().setEffectiveWeight(1).fadeIn(fade).play();
    if (av.cur && av.actions[av.cur]) av.actions[av.cur].fadeOut(fade);
    av.cur = name; return next;
  }

  drive(av, dt) {
    const h = av.host, ud = h.root.userData, pose = ud.pose || 'walk';
    const p = h.root.getWorldPosition(_v); const inst = p.distanceTo(av.last) / dt; av.last.copy(p);
    av.speed += (Math.min(inst, 12) - av.speed) * Math.min(1, dt * 6);
    av.model.position.y = 0;
    if (FULL_PROXY.has(pose)) {
      if (av.cur) { av.mixer.stopAllAction(); av.cur = null; }
      for (const [b, q] of av.restLocal) b.quaternion.copy(q);
      this.proxy(av, ALL_PROXY);
      av.model.position.y = (h.parts.body.position.y - 0.95) / av.T.scale;
      return;
    }
    let clip = 'idle';
    if (pose === 'dance') clip = 'dance';
    else if (pose === 'talk' && av.speed < 0.35) {          // conversations: nod along, shake the head, gesture
      av.talkT = (av.talkT ?? 0) - dt;
      if (av.talkT <= 0 || !av.talkClip) { av.talkT = 2.5 + Math.random() * 3; av.talkClip = Math.random() < 0.45 ? 'agree' : Math.random() < 0.5 ? 'shake' : 'idle'; }
      clip = av.actions[av.talkClip] ? av.talkClip : 'idle';
    }
    else if (av.speed > 3.2) clip = 'run';
    else if (av.speed > 0.35) clip = 'walk';
    const a = this.play(av, clip);
    if (a) a.timeScale = clip === 'walk' ? THREE.MathUtils.clamp(av.speed / 1.3, 0.6, 1.8) : clip === 'run' ? THREE.MathUtils.clamp(av.speed / 5, 0.7, 1.5) : 1;
    av.mixer.update(dt);
    if (av.stoop && av.bones.Spine) av.bones.Spine.rotateX(av.stoop);
    const up = UPPER_PROXY[pose] || (h.parts.armR.userData.umbrella ? ['RightArm', 'RightForeArm'] : null);
    if (up) this.proxy(av, up);
  }

  /** Pose the listed bones from the procedural limb rotations. */
  proxy(av, list) {
    const P = av.host.parts, R = av.T.rest, B = av.bones;
    const rootQ = av.model.parent.getWorldQuaternion(_q3);   // avatar root (inherits the host's facing)
    const qBody = P.body.quaternion;
    const target = (name) => {
      const r = R[name]; if (!r) return null;
      if (name === 'Spine') return qBody.clone().multiply(r.q);
      if (name === 'Head') return qBody.clone().multiply(P.head.quaternion).multiply(r.q);
      let dir;
      if (name === 'LeftArm' || name === 'RightArm') dir = DOWN.clone().applyQuaternion(qBody.clone().multiply((name[0] === 'L' ? P.armL : P.armR).quaternion));
      else if (name === 'LeftForeArm' || name === 'RightForeArm') { // follow the upper arm with a slight elbow bend forwards
        dir = DOWN.clone().applyQuaternion(qBody.clone().multiply((name[0] === 'L' ? P.armL : P.armR).quaternion));
        dir.applyAxisAngle(XAXIS, -0.35).normalize();
      } else if (name === 'LeftUpLeg' || name === 'RightUpLeg') dir = DOWN.clone().applyQuaternion((name[0] === 'L' ? P.legL : P.legR).quaternion);
      else { // shins: hang down when seated, fold back when crouching, slight bend otherwise
        const thigh = DOWN.clone().applyQuaternion((name[0] === 'L' ? P.legL : P.legR).quaternion);
        const pitch = Math.atan2(thigh.z, -thigh.y);
        if (pitch > 0.9) dir = new THREE.Vector3(0, -1, 0.12).normalize();
        else dir = thigh.clone().applyAxisAngle(XAXIS, av.host.root.userData.pose === 'crouch' ? 1.5 : 0.15).normalize();
      }
      return _q2.setFromUnitVectors(r.dir, dir).clone().multiply(r.q);
    };
    for (const name of ALL_PROXY) {
      if (!list.includes(name)) continue;
      const b = B[name]; if (!b) continue;
      const tq = target(name); if (!tq) continue;
      const world = rootQ.clone().multiply(tq);                          // desired world rotation
      const parentW = b.parent.getWorldQuaternion(_q);
      b.quaternion.copy(parentW.invert().multiply(world));
      b.updateMatrixWorld(true);
    }
  }
}
