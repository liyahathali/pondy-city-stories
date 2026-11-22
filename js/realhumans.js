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
const HAIR_GEO = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.58);
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
        const hh = top.y - hp.y, c = hp.clone().lerp(top, 0.5); c.z -= hh * 0.1;
        const wm = new THREE.Matrix4().compose(c, new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, 0, 0)), new THREE.Vector3(hh * 0.47, hh * 0.42, hh * 0.53));
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
    }
    const cloth = {};
    for (const [k, A] of Object.entries(T.attach || {})) {
      if (!bones[A.bone]) continue;
      const m = new THREE.Mesh(A.geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide, map: CLOTH_TEX() }));
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
      if (/Skin|Body/.test(n)) tint(o.material, skinN.getHex(), 0.55);
      else if (/Outfit_Top/.test(n)) tint(o.material, L.police ? 0xc2a46b : L.shirt, L.police || L.lungi || L.dhoti ? 0.85 : 0.55);
      else if (/Outfit_Bottom/.test(n)) tint(o.material, L.police ? 0xb59a62 : L.pants, L.police ? 0.85 : 0.6);
      else if (/Headwear/.test(n)) { o.visible = !!(L.police || L.hat || (L.cap && Math.random() < 0.5)); if (o.visible) tint(o.material, L.police ? 0xb71c1c : (L.cap || L.hat), 0.85); }
      else if (/Beard/.test(n)) o.visible = !!(L.beard || L.moustache);
    }
    // traditional wear on the realistic bodies, from the person's outfit
    const C = av.cloth || {}, show = (k, v, col) => { if (C[k]) { C[k].visible = v; if (v && col != null) C[k].material.color.setHex(col); } };
    const wrap = L.female ? !!L.saree : !!(L.lungi || L.dhoti);
    show('wrap', wrap, L.pants); show('belt', wrap && !L.female, L.lungiStripes || L.borderColor || L.pants);
    show('border', wrap, L.border || L.borderColor || L.lungiStripes || (L.dhoti ? 0xd4ac0d : L.pants));
    show('pallu', !!(L.female && L.saree), L.shirt === L.pants ? L.pants : (L.pants));
    show('towel', !!(L.towelShoulder || L.towel), typeof L.towelShoulder === 'number' ? L.towelShoulder : 0xf5f5f0);
    if (wrap) for (const o of av.meshes) if (/Outfit_Bottom/.test(o.material.name || o.name)) o.material.color.copy(new THREE.Color(L.skin || 0x8d5524)).lerp(new THREE.Color(1, 1, 1), 0.2);
    // body variety: height from the look, build varies per person, elders stoop slightly
    const bw = 0.92 + Math.random() * 0.18, ht = (L.h || 1) * (L.old ? 0.97 : 1);
    av.root.scale.set(av.T.scale * bw * ht, av.T.scale * ht, av.T.scale * (0.95 + (bw - 1) * 0.6) * ht);
    av.stoop = L.old ? 0.22 : 0;
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
    h.root.traverse((o) => { if (o.isMesh && o.visible) { o.visible = false; av.hidden.push(o); } });
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
