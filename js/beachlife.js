// Beach life on Promenade Beach: children's beach cricket (bowl, bat, field, run between the wickets),
// fishermen hauling a net from a wooden boat with gulls circling over it, gulls on the sand, footprints.
import * as THREE from 'three';
import { G } from './state.js';
import { randomLook, makeHuman, animateHuman } from './models.js';
import { SEA_X } from './config.js';
import { dialogue } from './i18n.js';
import { seeded, pick, rand, clamp } from './utils.js';

const rng = seeded(2468);
/** Height of the visible sand surface (it slopes into the sea east of the promenade wall). */
export function sandY(x) {
  const P = [[SEA_X - 10, -0.09], [SEA_X + 10, -0.3], [SEA_X + 45, -1.6]];
  if (x <= P[0][0]) return 0;
  for (let i = 0; i < P.length - 1; i++) if (x <= P[i + 1][0]) return P[i][1] + (P[i + 1][1] - P[i][1]) * (x - P[i][0]) / (P[i + 1][0] - P[i][0]);
  return P[P.length - 1][1];
}
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
const put = (p, geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); p.add(o); return o; };

/* ===================== cricket ===================== */
const PX = 527.0, ZB = 99, ZN = 85;          // pitch along the shore, striker's end (ZB) and bowler's end (ZN)
function stumps(scene, z) {
  const m = M(0xcfa66a, { roughness: 0.9 });
  for (const dx of [-0.1, 0, 0.1]) { const s = put(scene, new THREE.CylinderGeometry(0.016, 0.018, 0.62, 6), m, PX + dx, sandY(PX) + 0.26, z); s.rotation.z = (rng() - 0.5) * 0.08; s.castShadow = true; }
}
function bat(h) {
  const g = new THREE.Group(); g.userData.prop = true;
  const wood = M(0xd9b77c, { roughness: 0.7 }), grip = M(0x222222);
  const handle = put(g, new THREE.CylinderGeometry(0.016, 0.016, 0.22, 6), grip, 0, -0.11, 0); handle.userData.prop = true;
  const blade = put(g, new THREE.BoxGeometry(0.08, 0.46, 0.035), wood, 0, -0.45, 0.01); blade.userData.prop = true;
  g.position.set(0, -0.55, 0.06); g.rotation.x = -0.25; h.parts.armR.add(g); return g;
}
function kidLook(i) {
  const girl = i === 2 || i === 5;
  const L = randomLook(girl ? 'youthF' : 'youthM');
  L.h = 0.58 + Math.random() * 0.14; L.tropical = -1; L.backpack = false; L.moustache = false; L.beard = false; L.college = false; L.saree = false; L.lungi = false; L.dhoti = false; L.vest = false; L.umbrella = null;
  L.shirt = pick([0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0xffffff, 0xff7043, 0x8e24aa, 0x00acc1]);
  L.shirtPat = pick(['plain', 'plain', 'stripe', 'graphic']);
  if (!girl) { L.shorts = true; L.pants = pick([0x1f3a5f, 0x37474f, 0x5d4037, 0x2e7d32]); }
  return L;
}

class Cricket {
  constructor() { this.kids = null; this.phase = 'idle'; this.t = 0; this.cool = 0; }
  build(scene) {
    stumps(scene, ZB + 0.25); stumps(scene, ZN - 0.25);
    this.ball = put(scene, new THREE.SphereGeometry(0.04, 12, 8), M(0xd7e82a, { roughness: 0.9 }));
    this.ballSh = put(scene, new THREE.CircleGeometry(0.06, 10), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.3, depthWrite: false }));
    this.ballSh.rotation.x = -Math.PI / 2; this.ball.visible = this.ballSh.visible = false;
  }
  spawn() {
    const mgr = G.pedMgr; if (!mgr) return;
    const spots = [[PX, ZB - 0.6], [PX + 0.9, ZN + 0.4], [PX - 0.3, ZN - 7], [PX, ZB + 2.6], [523.2, 92], [530.6, 89], [524.2, 105]];
    this.kids = spots.map(([x, z], i) => { const p = mgr.spawnAt(x, z, kidLook(i), 'civ'); p.state = 'cricket'; p.onBeach = true; p.speed = 1; return p; });
    [this.striker, this.non, this.bowler, this.keeper, ...this.fielders] = this.kids;
    this.bats = [bat(this.striker.h), bat(this.non.h)];
    this.reset(); this.say(this.bowler, 'cricket');
  }
  alive() { return this.kids && this.kids.every((k) => G.peds.includes(k) && !k.dead && !k.down && k.state === 'cricket'); }
  end() { if (this.kids) for (const k of this.kids) if (G.peds.includes(k) && k.state === 'cricket') { k.state = 'stroll'; k.lane = 527; k.dir = 1; k.speed = 1; } this.kids = null; this.ball.visible = this.ballSh.visible = false; }
  go(k, x, z, speed = 1.4, yaw) { k.ct = { x, z }; k.cspeed = speed; k.cyaw = yaw; k.cpose = null; }
  pose(k, p, ph) { k.ct = null; k.cpose = p; k.cphase = ph; }
  say(k, ctx) { if (k && Math.hypot(G.player.pos.x - k.pos.x, G.player.pos.z - k.pos.z) < 30 && Math.random() < 0.7) k.say(ctx, 2.6); }
  reset() {
    this.go(this.striker, PX, ZB - 0.6, 1.4, Math.PI); this.go(this.non, PX + 0.9, ZN + 0.4, 1.4, Math.PI);
    this.go(this.bowler, PX - 0.3, ZN - 7, 1.3, 0); this.go(this.keeper, PX, ZB + 2.6, 1.4, Math.PI);
    const fs = [[523.2, 92], [530.6, 89], [524.2, 105]]; this.fielders.forEach((f, i) => this.go(f, fs[i][0], fs[i][1], 1.3, Math.atan2(PX - fs[i][0], ZB - fs[i][1])));
    this.phase = 'reset'; this.t = 0; this.ball.visible = this.ballSh.visible = false;
  }
  setBall(p) { this.ball.position.copy(p); this.ballSh.position.set(p.x, sandY(p.x) + 0.01, p.z); this.ball.visible = this.ballSh.visible = true; }
  flight(a, b, dur, arc, bounceAt = 0) { this.fl = { a: a.clone(), b: b.clone(), dur, arc, bounceAt, t: 0 }; }
  stepFlight(dt) {
    const f = this.fl; if (!f) return true; f.t = Math.min(f.dur, f.t + dt); const u = f.t / f.dur;
    const p = f.a.clone().lerp(f.b, u);
    if (f.bounceAt) { const k = u < f.bounceAt ? u / f.bounceAt : (u - f.bounceAt) / (1 - f.bounceAt), h = u < f.bounceAt ? f.arc * 0.6 : f.arc * 0.35; p.y += Math.sin(Math.PI * k) * h * (u < f.bounceAt ? 1 - k * 0.6 : 1); if (u < f.bounceAt) p.y = f.a.y + (sandY(p.x) + 0.04 - f.a.y) * k + Math.sin(Math.PI * k) * h * 0.2; }
    else p.y += Math.sin(Math.PI * u) * f.arc;
    this.setBall(p); return f.t >= f.dur;
  }
  update(dt) {
    const pp = G.player.worldPos(), d = Math.hypot(pp.x - PX, pp.z - (ZB + ZN) / 2), h = G.env.hour;
    const daytime = h > 6.5 && h < 18.3 && G.env.rain < 0.4;
    if (!this.kids) { this.cool -= dt; if (d < 110 && d > 20 && daytime && this.cool <= 0) this.spawn(); return; }
    if (!this.alive() || !daytime) { this.end(); this.cool = 20; return; }
    this.t += dt;
    const S = this.striker, B = this.bowler, K = this.keeper;
    switch (this.phase) {
      case 'reset': if (this.t > 4 && Math.hypot(B.pos.x - (PX - 0.3), B.pos.z - (ZN - 7)) < 0.5) { this.phase = 'runup'; this.t = 0; this.go(B, PX - 0.3, ZN - 0.4, 3.4, 0); this.pose(S, 'bat', 0); if (Math.random() < 0.3) this.say(pick(this.fielders), 'cricket'); } break;
      case 'runup': if (Math.hypot(B.pos.x - (PX - 0.3), B.pos.z - (ZN - 0.4)) < 0.3 || this.t > 5) { this.phase = 'deliver'; this.t = 0; this.pose(B, 'bowl', 0); } break;
      case 'deliver': {
        B.cphase = Math.min(1, this.t / 0.45);
        if (this.t > 0.32 && !this.fl) this.flight(new THREE.Vector3(B.pos.x + 0.2, sandY(B.pos.x) + 1.25, B.pos.z + 0.5), new THREE.Vector3(PX + 0.15, sandY(PX) + 0.55, ZB - 1.0), 0.8, 0.5, 0.68);
        if (this.fl) { const done = this.stepFlight(dt); S.cphase = clamp((this.fl.t - 0.45) / 0.3, 0, 1); if (done) { this.fl = null; this.contact(); } }
        break;
      }
      case 'hit': {
        const done = this.stepFlight(dt);
        if (done && !this.landed) { this.landed = true; this.rollTo = this.fl.b.clone(); }
        // batsmen run their runs
        if (this.runs > 0 && this.arrived(S) && this.arrived(this.non)) { this.runs--; if (this.runs > 0) { this.swapEnds(); } }
        const F = this.chaser;
        if (F && this.landed && Math.hypot(F.pos.x - this.rollTo.x, F.pos.z - this.rollTo.z) < 0.6) { this.phase = 'pickup'; this.t = 0; this.pose(F, 'pickup', 0); }
        break;
      }
      case 'pickup': {
        const F = this.chaser;
        if (this.t > 0.6 && !this.fl) { this.pose(F, 'throw', 0); F.yaw = Math.atan2(PX - F.pos.x, ZN - F.pos.z); this.flight(new THREE.Vector3(F.pos.x, sandY(F.pos.x) + 1.1, F.pos.z), new THREE.Vector3(PX, sandY(PX) + 0.9, ZN - 0.6), Math.hypot(PX - F.pos.x, ZN - F.pos.z) / 13 + 0.3, 1.6); }
        if (this.fl) { F.cphase = clamp(this.fl.t / 0.25, 0, 1); if (this.stepFlight(dt)) { this.fl = null; this.ball.visible = this.ballSh.visible = false; this.afterBall(); } }
        break;
      }
      case 'keeper': {
        if (this.stepFlight(dt)) { this.fl = null; this.pose(K, 'pickup', 0); this.phase = 'wait'; this.t = 0; this.ball.visible = this.ballSh.visible = false; }
        break;
      }
      case 'celebrate': case 'wait': if (this.t > (this.phase === 'celebrate' ? 3 : 1.6)) this.afterBall(); break;
    }
  }
  arrived(k) { return !k.ct || Math.hypot(k.pos.x - k.ct.x, k.pos.z - k.ct.z) < 0.25; }
  swapEnds() { const sAtB = this.striker.pos.z > (ZB + ZN) / 2; this.go(this.striker, PX + (sAtB ? 0.5 : -0.5), sAtB ? ZN + 0.4 : ZB - 0.6, 3.6); this.go(this.non, PX + (sAtB ? -0.5 : 0.5), sAtB ? ZB - 0.6 : ZN + 0.4, 3.6); }
  contact() {
    const S = this.striker, r = Math.random();
    if (r < 0.62) {             // along the ground into the field
      const tx = clamp(PX + rand(-5, 4), 522.5, 531.5), tz = clamp(ZB - rand(3, 16), 78, 108);
      this.flight(this.ball.position, new THREE.Vector3(tx, sandY(tx) + 0.05, tz), Math.hypot(tx - PX, tz - ZB) / 9 + 0.2, 0.4);
      this.hitTo(tx, tz, Math.hypot(tx - PX, tz - ZB) > 9 ? 2 : 1); this.say(this.non, 'cricket');
    } else if (r < 0.8) {      // big lofted hit towards the water: "sixer"
      const tx = clamp(PX + rand(3, 7), 522.5, 534), tz = clamp(ZB - rand(8, 18), 78, 108);
      this.flight(this.ball.position, new THREE.Vector3(tx, sandY(tx) + 0.05, tz), 1.6, 6);
      this.hitTo(tx, tz, 0); this.big = true;
      for (const k of this.kids) if (k !== this.chaser) this.pose(k, 'dance', 0); this.say(pick(this.fielders), 'cricket');
    } else {                   // beaten: the keeper takes it (sometimes it clips the stumps: out!)
      this.flight(this.ball.position, new THREE.Vector3(PX, sandY(PX) + 0.5, ZB + 2.3), 0.35, 0.1);
      this.phase = 'keeper'; this.t = 0; this.out = Math.random() < 0.35;
      if (this.out) { for (const f of this.fielders) this.pose(f, 'dance', 0); this.say(this.bowler, 'cricket'); }
    }
  }
  hitTo(tx, tz, runs) {
    let best = null, bd = 1e9; for (const f of [...this.fielders, this.bowler]) { const dd = Math.hypot(f.pos.x - tx, f.pos.z - tz); if (dd < bd) { bd = dd; best = f; } }
    this.chaser = best; this.go(best, tx, tz, 3.6); this.phase = 'hit'; this.t = 0; this.landed = false; this.runs = runs;
    if (runs > 0) this.swapEnds();
  }
  afterBall() {
    if (this.out) {   // striker out: swaps places with a fielder, new batter takes the bat
      const f = this.fielders.shift(); const s = this.striker;
      this.bats[0].removeFromParent(); this.bats[0] = bat(f.h);
      this.striker = f; this.fielders.push(s); this.out = false;
    } else if (this.striker.pos.z < (ZB + ZN) / 2) { const s = this.striker; this.striker = this.non; this.non = s; }   // odd runs: batters changed ends
    // every few balls a new bowler
    if (Math.random() < 0.3) { const f = this.fielders.shift(); this.fielders.push(this.bowler); this.bowler = f; }
    this.big = false; this.fl = null; this.reset();
  }
}

/* ===================== fishermen on a wooden boat ===================== */
function fisherLook(i) {
  const L = randomLook('civ'); L.female = false; L.h = 1; L.lungi = true; L.dhoti = false; L.saree = false; L.tropical = -1; L.backpack = false; L.umbrella = null;
  L.vest = i === 1; L.bareChest = i !== 1 && i !== 3; L.headTowel = i % 2 === 0; L.fisher = true; L.skin = pick([0x5a3a22, 0x6b4423, 0x4e3220]); L.moustache = true;
  L.pants = pick([0x1f5fa8, 0x2e7d32, 0x8e2430, 0x6a4c93]);
  return L;
}
class FishingBoat {
  build(scene) {
    const BX = 558, BZ = 150;
    const g = new THREE.Group(); g.position.set(BX, -0.45, BZ); scene.add(g); this.g = g;
    // planked wooden vallam: tapered hull with sheer, painted gunwale stripe, thwarts, outboard, oars
    const plank = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#6b4a2e'; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 128; i += 14) { x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, i, 128, 2); x.fillStyle = `rgba(${150 + Math.random() * 40},${110 + Math.random() * 30},70,0.18)`; x.fillRect(0, i + 2, 128, 12); } for (let k = 0; k < 600; k++) { x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(Math.random() * 128, Math.random() * 128, 3, 1); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const hullM = new THREE.MeshStandardMaterial({ map: plank, roughness: 0.85, side: THREE.DoubleSide });
    const hg = new THREE.BoxGeometry(1.9, 1.0, 8.4, 2, 2, 24), p = hg.attributes.position;
    for (let i = 0; i < p.count; i++) { const Z = p.getZ(i) / 4.2, Y = p.getY(i), t = 1 - Math.pow(Math.abs(Z), 2.4); p.setX(i, p.getX(i) * Math.max(0.04, t) * (Y < 0 ? 0.55 : 1)); p.setY(i, Y + Math.pow(Math.abs(Z), 3) * 0.55); }
    hg.computeVertexNormals(); const hull = put(g, hg, hullM, 0, 0.35, 0); hull.castShadow = true;
    put(g, new THREE.BoxGeometry(1.5, 0.06, 6.4), M(0x4e3422), 0, 0.2, 0);                               // floor boards
    for (const z of [-2.2, -0.2, 1.8]) put(g, new THREE.BoxGeometry(1.6, 0.06, 0.22), M(0x5a3d28), 0, 0.62, z);   // thwarts
    for (const sx of [-1, 1]) put(g, new THREE.BoxGeometry(0.06, 0.12, 6.8), M(0x1f7a8c), sx * 0.93, 0.86, 0);   // blue gunwale stripe
    put(g, new THREE.BoxGeometry(0.3, 0.55, 0.35), M(0x1b1b1b), 0, 0.95, -4.1); put(g, new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), M(0x333333), 0, 0.45, -4.25);
    for (const sx of [-1, 1]) { const o = put(g, new THREE.BoxGeometry(0.06, 0.06, 3.0), M(0x8a6a44), sx * 0.55, 0.7, -0.8); o.rotation.y = sx * 0.05; }
    const flag = put(g, new THREE.PlaneGeometry(0.5, 0.3), M(0xd32f2f, { side: THREE.DoubleSide }), 0.25, 2.0, 3.9); put(g, new THREE.CylinderGeometry(0.02, 0.02, 1.6, 5), M(0x6b4a2c), 0, 1.4, 3.9); this.flag = flag;
    // catch pile: silver fish that build up as the net comes in
    const fishG = new THREE.SphereGeometry(0.16, 8, 5); fishG.scale(0.32, 0.22, 1);
    this.fish = new THREE.InstancedMesh(fishG, M(0xc9d2d8, { metalness: 0.6, roughness: 0.3 }), 60); this.fish.count = 0; g.add(this.fish);
    this.fishPos = Array.from({ length: 60 }, () => [rand(-0.5, 0.5), 0.3 + rand(0, 0.15), rand(-1.6, 0.6), rand(0, 6.28)]);
    // net: a curtain hanging from a line of orange floats, in a loop from the starboard side
    this.floats = []; const fm = M(0xff7a1a, { roughness: 0.5 });
    for (let i = 0; i < 26; i++) { const f = put(scene, new THREE.SphereGeometry(0.13, 8, 6), fm); f.scale.y = 0.75; this.floats.push(f); }
    const netTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.strokeStyle = 'rgba(30,70,40,0.9)'; x.lineWidth = 2; for (let i = 0; i <= 64; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 64); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(64, i); x.stroke(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 2); return t; })();
    this.netGeo = new THREE.BufferGeometry(); const n = 26, pos = new Float32Array(n * 2 * 3), uv = new Float32Array(n * 2 * 2), idx = [];
    for (let i = 0; i < n; i++) { uv.set([i / (n - 1), 1, i / (n - 1), 0], i * 4); if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    this.netGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); this.netGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); this.netGeo.setIndex(idx);
    const net = new THREE.Mesh(this.netGeo, new THREE.MeshStandardMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1 })); net.frustumCulled = false; scene.add(net);
    this.bundle = put(g, new THREE.IcosahedronGeometry(0.45, 1), new THREE.MeshStandardMaterial({ map: netTex, color: 0x9fb8a0, transparent: true, side: THREE.DoubleSide })); this.bundle.visible = false;
    this.splash = put(scene, new THREE.RingGeometry(0.5, 0.8, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); this.splash.rotation.x = -Math.PI / 2;
    // the crew: three haul the net on the starboard side, one minds the outboard
    this.crew = [];
    for (let i = 0; i < 4; i++) {
      const h = makeHuman(fisherLook(i)); g.add(h.root);
      if (i < 3) { h.root.position.set(0.35, 0.23, -1.5 + i * 1.5); h.root.rotation.y = Math.PI / 2; } else { h.root.position.set(0, 0.2, -3.4); h.root.rotation.y = 0; }
      h.phase0 = i * 0.9; this.crew.push(h);
    }
    G.extraHosts = (G.extraHosts || []).concat(this.crew);
    // two distant boats on the horizon for depth
    this.far = [];
    for (const [x, z] of [[640, 40], [700, 230]]) { const b = put(scene, hg, hullM, x, -0.3, z); b.rotation.y = rng() * 3; b.scale.setScalar(0.9); this.far.push(b); }
    this.T = 0; this.cycle = 48; this.BX = BX; this.BZ = BZ; this.sayT = 6;
  }
  update(dt) {
    const pp = G.player.worldPos(); const near = Math.hypot(pp.x - this.BX, pp.z - this.BZ) < 220;
    this.T += dt; const t = G.time || this.T, u = (this.T % this.cycle) / this.cycle, g = this.g;
    g.position.y = -0.45 + Math.sin(t * 1.1) * 0.06; g.rotation.z = Math.sin(t * 0.8) * 0.045; g.rotation.x = Math.sin(t * 0.55 + 1) * 0.025;
    this.flag.rotation.y = Math.sin(t * 3) * 0.3;
    for (const [i, b] of this.far.entries()) { b.position.y = -0.35 + Math.sin(t * 0.9 + i) * 0.08; b.rotation.z = Math.sin(t * 0.7 + i) * 0.05; }
    if (!near) return;
    // phases: cast (0-0.06), haul (0.06-0.86), lift catch aboard (0.86-1)
    const casting = u < 0.06, lifting = u > 0.86;
    const R = casting ? 2 + (u / 0.06) * 8 : lifting ? 1.1 : 10 - ((u - 0.06) / 0.8) * 8.9;
    const pos = this.netGeo.attributes.position, sea = -0.42;
    const cx = this.BX + 0.95 + R * 0.95, cz = this.BZ;
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI / 2 + (i / 25) * Math.PI, x = cx - Math.cos(a) * R * 0.95 + (lifting ? -R : 0), z = cz + Math.sin(a) * Math.max(1.0, R * 0.35 + 1.5);
      const bob = Math.sin(t * 1.4 + i * 0.6) * 0.05, fl = this.floats[i];
      fl.visible = !lifting; fl.position.set(x, sea + bob, z);
      pos.setXYZ(i * 2, x, sea + bob, z); pos.setXYZ(i * 2 + 1, x, sea - 1.3 - Math.min(1, R / 6) * 0.6, z);
    }
    pos.needsUpdate = true;
    if (casting) { const k = u / 0.06; this.splash.position.set(cx + R * 0.4, sea + 0.02, cz); this.splash.scale.setScalar(1 + k * 4); this.splash.material.opacity = 0.6 * (1 - k); } else this.splash.material.opacity = 0;
    // bundle of netted fish swung aboard at the end
    this.bundle.visible = lifting; if (lifting) { const k = (u - 0.86) / 0.14; this.bundle.position.set(1.4 - k * 1.2, 0.2 + Math.sin(Math.PI * Math.min(1, k * 1.3)) * 1.0, -0.4); }
    const n = Math.floor(clamp((u - 0.2) / 0.8, 0, 1) * 45) + 6; this.fish.count = n;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < n; i++) { const [x, y, z, r] = this.fishPos[i], flap = i % 5 === 0 ? Math.sin(t * 9 + i) * 0.5 : 0; e.set(0, r, Math.PI / 2 * (i % 2) + flap); q.setFromEuler(e); m.compose(new THREE.Vector3(x, y + (i > 25 ? 0.12 : 0), z), q, new THREE.Vector3(1, 1, 1)); this.fish.setMatrixAt(i, m); }
    this.fish.instanceMatrix.needsUpdate = true;
    // crew animation: rhythmic hand-over-hand hauling, a casting throw, the stern man steering
    this.crew.forEach((h, i) => {
      if (i === 3) { animateHuman(h, t * 0.5, 0, 'sit'); h.root.position.y = 0.2 - 0.35; return; }
      if (casting && i === 1) animateHuman(h, Math.min(1, (u / 0.06) * 1.5), 0, 'throw');
      else if (lifting) animateHuman(h, t * 2 + h.phase0, 0, 'pull');
      else animateHuman(h, t * 2.4 + h.phase0, 0, 'pull');
    });
    this.sayT -= dt;
    if (this.sayT <= 0 && Math.hypot(pp.x - this.BX, pp.z - this.BZ) < 60) { this.sayT = rand(7, 14); const sp = this.speaker || (this.speaker = { pos: new THREE.Vector3(), keepBubble: true }); sp.pos.setFromMatrixPosition(this.crew[1 + Math.floor(Math.random() * 2)].root.matrixWorld); sp.pos.y -= 0.6; const line = dialogue('fishermen'); G.hud && G.hud.speech(sp, line, 3); G.speech && G.speech.say(line[0], null, Math.hypot(pp.x - this.BX, pp.z - this.BZ), false); }
  }
}

/* ===================== seagulls ===================== */
function gullMesh() {
  const g = new THREE.Group(), white = M(0xf4f4f2, { roughness: 0.6 }), grey = M(0x9aa3aa, { roughness: 0.6 }), dark = M(0x222222);
  const body = put(g, new THREE.SphereGeometry(0.12, 10, 8), white); body.scale.set(0.8, 0.75, 1.8);
  put(g, new THREE.SphereGeometry(0.075, 8, 6), white, 0, 0.06, 0.2);
  const beak = put(g, new THREE.ConeGeometry(0.018, 0.08, 5), M(0xf2b632), 0, 0.05, 0.3); beak.rotation.x = Math.PI / 2;
  const tail = put(g, new THREE.BoxGeometry(0.12, 0.02, 0.12), dark, 0, 0.01, -0.24);
  const wings = [];
  for (const sx of [-1, 1]) { const pv = new THREE.Group(); pv.position.set(sx * 0.07, 0.04, 0.02); g.add(pv); const w = put(pv, new THREE.BoxGeometry(0.42, 0.015, 0.16), grey, sx * 0.21, 0, 0); const tip = put(pv, new THREE.BoxGeometry(0.1, 0.016, 0.12), dark, sx * 0.4, 0, -0.01); wings.push(pv); }
  g.userData.wings = wings; g.scale.setScalar(1.15); return g;
}
class Gulls {
  build(scene, boat) {
    this.boat = boat; this.list = [];
    for (let i = 0; i < 11; i++) {
      const m = gullMesh(); scene.add(m);
      const onSand = i >= 8;
      this.list.push({ m, mode: onSand ? 'sand' : 'circle', r: rand(6, 14), h: rand(5, 11), sp: rand(0.25, 0.45) * (i % 2 ? 1 : -1), a: rand(0, 6.28), cx: i < 5 ? boat.BX + 4 : 532, cz: i < 5 ? boat.BZ : rand(-40, 280), home: onSand ? { x: rand(531, 533.5), z: rand(20, 140) } : null, fl: 0, flap: rand(0, 6) });
    }
  }
  update(dt) {
    const pp = G.player.worldPos(), t = G.time || 0;
    for (const s of this.list) {
      const m = s.m, W = m.userData.wings;
      if (s.mode === 'sand') {
        const x = s.home.x, z = s.home.z; m.position.set(x, sandY(x) + 0.13, z); m.rotation.set(0, Math.sin(t * 0.5 + s.a) * 1.2, 0);
        for (const [k, w] of W.entries()) w.rotation.set(0, 0, (k ? -1 : 1) * -1.25);   // folded
        if (Math.hypot(pp.x - x, pp.z - z) < 5) { s.mode = 'takeoff'; s.fl = 0; }
        continue;
      }
      if (s.mode === 'takeoff') { s.fl += dt; m.position.y += dt * 2.5; m.position.x += dt * 2; if (s.fl > 2.5) { s.mode = 'circle'; s.cx = m.position.x; s.cz = m.position.z; s.a = 0; s.ret = 25; } }
      else {
        s.a += s.sp * dt; const bob = Math.sin(t * 0.7 + s.flap) * 0.6;
        const x = s.cx + Math.cos(s.a) * s.r, z = s.cz + Math.sin(s.a) * s.r * 0.8;
        m.position.set(x, s.h + bob, z); m.rotation.set(0, Math.atan2(-Math.sin(s.a) * s.sp, Math.cos(s.a) * s.sp * 0.8) , -Math.sign(s.sp) * 0.25);
        if (s.ret !== undefined) { s.ret -= dt; if (s.ret <= 0) { s.mode = 'sand'; s.ret = undefined; } }
      }
      const flapping = Math.sin(t * 0.4 + s.flap) > 0.2 || s.mode === 'takeoff';
      const ang = flapping ? Math.sin(t * 9 + s.flap) * 0.55 : 0.08 + Math.sin(t * 2 + s.flap) * 0.05;
      W[0].rotation.set(0, 0, ang); W[1].rotation.set(0, 0, -ang);
    }
  }
}

/* ===================== footprints in the sand ===================== */
function footprints(scene) {
  const geo = new THREE.CircleGeometry(0.06, 8); geo.scale(1, 1.9, 1); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: 0x5b4a33, transparent: true, opacity: 0.28, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const prints = [];
  for (let tr = 0; tr < 46; tr++) {
    let x = rand(522, 533), z = rand(-55, 295), hd = rng() < 0.5 ? 0 : Math.PI;
    for (let s = 0; s < 30; s++) {
      hd += (rng() - 0.5) * 0.35; x += Math.sin(hd) * 0.68; z += Math.cos(hd) * 0.68;
      if (x < 521.8 || x > 534 || (z > 58 && z < 78) || (z > 198 && z < 218) || (z > -48 && z < -32)) break;
      const side = s % 2 ? 1 : -1; prints.push([x + Math.cos(hd) * 0.1 * side, z - Math.sin(hd) * 0.1 * side, hd]);
    }
  }
  const im = new THREE.InstancedMesh(geo, mat, prints.length), m = new THREE.Matrix4(), q = new THREE.Quaternion();
  prints.forEach(([x, z, hd], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hd); m.compose(new THREE.Vector3(x, sandY(x) + 0.015, z), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m); });
  im.renderOrder = 1; scene.add(im);
}

export class BeachLife {
  constructor(scene) {
    this.cricket = new Cricket(); this.cricket.build(scene);
    this.boat = new FishingBoat(); this.boat.build(scene);
    this.gulls = new Gulls(); this.gulls.build(scene, this.boat);
    footprints(scene);
  }
  update(dt) { this.cricket.update(dt); this.boat.update(dt); this.gulls.update(dt); }
}
