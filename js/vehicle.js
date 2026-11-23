// Arcade vehicle physics with drifting, collisions, damage, fire and explosions.
import * as THREE from 'three';
import { G } from './state.js';
import { clamp, lerp, pick, rand } from './utils.js';
import { makeVehicleModel, makeHuman, animateHuman, randomLook, CAR_COLORS, LIGHT_MATS, RETRO_COLORS } from './models.js';
import { SEA_X } from './config.js';

export const VTYPES = {
  car:        { label: 'Hatchback',      maxSpeed: 36, accel: 9.5, brake: 24, steer: 0.62, wheelBase: 2.6, width: 1.8, length: 4.0, grip: 9,  mass: 1100, hp: 100, camDist: 7.5, camH: 2.5, circles: 2, twoWheel: false },
  taxi:       { label: 'Yellow Taxi',    maxSpeed: 34, accel: 9,   brake: 24, steer: 0.62, wheelBase: 2.6, width: 1.8, length: 4.0, grip: 9,  mass: 1100, hp: 100, camDist: 7.5, camH: 2.5, circles: 2, twoWheel: false },
  police:     { label: 'Police Car',     maxSpeed: 44, accel: 12,  brake: 26, steer: 0.62, wheelBase: 2.6, width: 1.8, length: 4.0, grip: 10, mass: 1250, hp: 140, camDist: 7.5, camH: 2.5, circles: 2, twoWheel: false },
  auto:       { label: 'Auto Rickshaw',  maxSpeed: 17, accel: 5.5, brake: 16, steer: 0.75, wheelBase: 1.9, width: 1.4, length: 2.7, grip: 7,  mass: 350,  hp: 70,  camDist: 6,   camH: 2.6, circles: 2, twoWheel: false },
  motorcycle: { label: 'Motorcycle',     maxSpeed: 38, accel: 12,  brake: 22, steer: 0.7,  wheelBase: 1.5, width: 0.8, length: 2.1, grip: 11, mass: 190,  hp: 60,  camDist: 5,   camH: 2.0, circles: 2, twoWheel: true },
  scooter:    { label: 'Scooter',        maxSpeed: 25, accel: 8.5, brake: 18, steer: 0.75, wheelBase: 1.3, width: 0.8, length: 1.8, grip: 10, mass: 110,  hp: 50,  camDist: 4.6, camH: 1.9, circles: 2, twoWheel: true },
  cycle:      { label: 'Bicycle',        maxSpeed: 8,  accel: 2.6, brake: 9,  steer: 0.8,  wheelBase: 1.15, width: 0.6, length: 1.7, grip: 9, mass: 90,   hp: 30,  camDist: 4.4, camH: 1.9, circles: 2, twoWheel: true },
  moped:      { label: 'Moped 50',       maxSpeed: 15, accel: 5,   brake: 14, steer: 0.8,  wheelBase: 1.17, width: 0.7, length: 1.75, grip: 9, mass: 75,  hp: 40,  camDist: 4.4, camH: 1.9, circles: 2, twoWheel: true, eng: [95, 2.0, 1.4] },
  twostroke:  { label: '2-Stroke 100',   maxSpeed: 36, accel: 14,  brake: 21, steer: 0.72, wheelBase: 1.38, width: 0.8, length: 2.0, grip: 11, mass: 105, hp: 55,  camDist: 4.9, camH: 2.0, circles: 2, twoWheel: true, eng: [88, 2.02, 1.8] },
  vintage:    { label: 'Classic Scooter', maxSpeed: 22, accel: 7,  brake: 16, steer: 0.75, wheelBase: 1.12, width: 0.8, length: 1.8, grip: 9, mass: 105, hp: 50,  camDist: 4.6, camH: 1.9, circles: 2, twoWheel: true, eng: [62, 0.5, 0.9] },
  commuter:   { label: 'Commuter 100',   maxSpeed: 28, accel: 9,   brake: 19, steer: 0.72, wheelBase: 1.38, width: 0.8, length: 2.0, grip: 10, mass: 110, hp: 55,  camDist: 4.9, camH: 2.0, circles: 2, twoWheel: true, eng: [66, 1.01, 1.0] },
  retro80:    { label: 'Retro Scooter',  maxSpeed: 23, accel: 8,   brake: 17, steer: 0.76, wheelBase: 1.1, width: 0.78, length: 1.75, grip: 10, mass: 100, hp: 50, camDist: 4.6, camH: 1.9, circles: 2, twoWheel: true, eng: [80, 1.5, 1.2] },
  flycar:     { label: 'Nova Sky (flying EV)', maxSpeed: 44, accel: 13, brake: 26, steer: 0.6, wheelBase: 2.96, width: 1.95, length: 4.8, grip: 10, mass: 1500, hp: 180, camDist: 8.5, camH: 2.5, circles: 2, twoWheel: false, eng: [118, 1.5, 2.4], fly: true },
  bus:        { label: 'PRTC Bus',       maxSpeed: 22, accel: 3.4, brake: 12, steer: 0.55, wheelBase: 6.9, width: 2.6, length: 11,  grip: 8,  mass: 9000, hp: 260, camDist: 15,  camH: 5,   circles: 4, twoWheel: false },
};
const BUS_COLORS = [0x1565c0, 0x2e7d32, 0xc62828, 0x6a1b9a];
const AUTO_COLORS = [0xf2c40f, 0xf2c40f, 0xf2c40f, 0xf2c40f, 0x1e8449]; // Puducherry autos: yellow, a few green CNG

let _id = 1;
const smokeGeo = new THREE.SphereGeometry(0.6, 6, 5);

export class Vehicle {
  constructor(type, x, z, heading = 0, opts = {}) {
    this.id = _id++;
    this.type = type; this.cfg = VTYPES[type];
    let color = opts.color;
    if (color === undefined && type === 'flycar') color = pick([0xf2f4f7, 0x101114, 0xb5121b, 0x1f4fa3, 0x8a9199]);
    if (color === undefined) color = type === 'police' ? 0xf5f5f5 : type === 'taxi' ? 0xf4d03f : type === 'bus' ? pick(BUS_COLORS) : type === 'auto' ? pick(AUTO_COLORS) : RETRO_COLORS[type] ? pick(RETRO_COLORS[type]) : pick(CAR_COLORS);
    const model = makeVehicleModel(type === 'taxi' ? 'taxi' : type, color);
    this.model = model; this.mesh = model.group;
    this.pos = new THREE.Vector3(x, 0, z); this.heading = heading;
    this.vx = 0; this.vz = 0; this.speed = 0; this.steerAngle = 0; this.lean = 0; this.wheelRot = 0;
    this.hp = this.cfg.hp; this.destroyed = false; this.burnTime = 0; this.fire = null;
    this.driver = null;        // 'player' | ped-like AI object
    this.ai = null;            // traffic/police controller state
    this.persistent = !!opts.persistent; this.home = opts.persistent ? { x, z, h: heading } : null;
    this.siren = type === 'police' && !!opts.siren; this.sirenT = 0;
    this.horn = 0; this.honkCooldown = 0;
    this.rider = null;         // visible NPC rider mesh
    this.parked = !!opts.parked;
    G.scene.add(this.mesh);
    this.sync();
  }

  get isTwoWheel() { return this.cfg.twoWheel; }

  /** Circles approximating the vehicle footprint (world space). */
  circles(out = []) {
    out.length = 0;
    const n = this.cfg.circles, L = this.cfg.length, r = this.cfg.width / 2;
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : -L / 2 + r + (i * (L - 2 * r)) / (n - 1);
      out.push({ x: this.pos.x + fx * t, z: this.pos.z + fz * t, r: Math.max(r, 0.45) });
    }
    return out;
  }

  /** controls: {throttle -1..1, steer -1..1, handbrake bool} */
  update(dt, ctl) {
    const c = this.cfg;
    if (this.destroyed) { ctl = { throttle: 0, steer: 0, handbrake: true }; }
    if (c.fly && this.flyUpdate(dt, ctl)) return;
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    const rx = -fz, rz = fx; // right vector
    let vf = this.vx * fx + this.vz * fz;
    let vl = this.vx * rx + this.vz * rz;
    const thr = ctl.throttle;
    if (thr > 0) {
      if (vf < -0.5) vf += c.brake * dt * thr;
      else vf += c.accel * thr * dt * (1 - Math.max(0, vf) / c.maxSpeed * 0.65);
    } else if (thr < 0) {
      if (vf > 0.5) vf -= c.brake * dt * -thr;
      else vf -= c.accel * 0.6 * -thr * dt;
    } else {
      vf -= Math.sign(vf) * Math.min(Math.abs(vf), 2.2 * dt); // rolling resistance
    }
    vf = clamp(vf, -c.maxSpeed * 0.3, c.maxSpeed);
    vf -= vf * 0.04 * dt; // drag
    if (ctl.handbrake) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 9 * dt);
    // grip: lateral velocity decays
    const grip = ctl.handbrake ? c.grip * 0.18 : c.grip;
    vl *= Math.exp(-grip * dt);
    // steering
    const spdN = Math.min(1, Math.abs(vf) / c.maxSpeed);
    const targetSteer = ctl.steer * c.steer * (1 - 0.55 * spdN);
    this.steerAngle = lerp(this.steerAngle, targetSteer, Math.min(1, dt * 8));
    const yaw = (vf / c.wheelBase) * Math.tan(this.steerAngle) * (ctl.handbrake ? 1.35 : 1);
    this.heading += yaw * dt;
    this.vx = fx * vf + rx * vl; this.vz = fz * vf + rz * vl;
    this.speed = vf;
    this.drift = Math.abs(vl);

    // integrate
    this.pos.x += this.vx * dt; this.pos.z += this.vz * dt;

    if (c.fly) this.followGround(dt);
    // keep out of the sea
    if (this.pos.x > SEA_X + 6) { this.pos.x = SEA_X + 6; this.vx = Math.min(0, this.vx) - 1; this.damage(Math.abs(vf) * 0.5); }

    this.collideStatic();
    this.sync(dt);
    if (this.honkCooldown > 0) this.honkCooldown -= dt;
    this.updateFire(dt);
  }

  /** Flying EV: G toggles flight. In the air: W/S thrust, A/D yaw, Space climb, C/Shift descend. Returns true while airborne. */
  flyUpdate(dt, ctl) {
    const c = this.cfg; this.alt ??= 0; this.avy ??= 0; this.flyK ??= 0; this.pitchV ??= 0; this.rollV ??= 0;
    const overSea = this.pos.x > SEA_X + 4, ground = overSea ? 1.4 : Math.max(0, G.walkables.height(this.pos.x, this.pos.z));
    if (ctl.toggleFly && !this.destroyed) {
      if (!this.flying) { this.flying = true; this.landing = false; this.avy = 3; }
      else if (overSea) G.hud && G.hud.notify('Cannot land on water — fly back over land / தண்ணீரில் இறக்க முடியாது', 2.5);
      else this.landing = true;
    }
    if (this.driver !== 'player' && this.flying && !overSea) this.landing = true;      // abandoned: settles down by itself
    if (this.destroyed && this.flying) { this.landing = true; }
    this.flyK = clamp(this.flyK + (this.flying ? dt : -dt) * 1.4, 0, 1);
    if (!this.flying) return false;
    // vertical
    let want = this.landing ? -3.5 : ((ctl.up ? 1 : 0) - (ctl.down ? 1 : 0)) * 8;
    if (!this.landing && this.alt < ground + 2.2 && !ctl.down) want = Math.max(want, 3);   // lift-off to a hover height
    this.avy = lerp(this.avy, want, Math.min(1, dt * 2.5));
    this.alt += this.avy * dt;
    if (this.alt < ground) { this.alt = ground; this.avy = Math.max(0, this.avy); }
    if (this.alt > 160) { this.alt = 160; this.avy = Math.min(0, this.avy); }
    if (this.landing && this.alt <= ground + 0.03) { this.flying = false; this.landing = false; this.alt = ground; this.avy = 0; }
    // horizontal: thrust along the nose, yaw on the spot, strong air damping (no skidding)
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    let vf = this.vx * fx + this.vz * fz;
    const thr = ctl.throttle;
    if (thr) vf += thr * c.accel * 1.25 * dt * (1 - Math.max(0, vf) / 66); else vf -= Math.sign(vf) * Math.min(Math.abs(vf), 5 * dt);
    vf = clamp(vf, -14, 62);
    this.heading += ctl.steer * (1.15 - Math.min(0.5, Math.abs(vf) / 120)) * dt * (vf < -0.5 ? -1 : 1);
    this.vx = fx * vf; this.vz = fz * vf; this.speed = vf; this.drift = 0;
    this.pos.x += this.vx * dt; this.pos.z += this.vz * dt;
    this.pos.x = clamp(this.pos.x, -2200, SEA_X + 420);
    this.pitchV = lerp(this.pitchV, -thr * 0.07 - this.avy * 0.012, Math.min(1, dt * 3));
    this.rollV = lerp(this.rollV, ctl.steer * 0.28 * Math.min(1, Math.abs(vf) / 18), Math.min(1, dt * 3));
    this.collideStatic();
    this.sync(dt);
    if (this.honkCooldown > 0) this.honkCooldown -= dt;
    this.updateFire(dt);
    return true;
  }
  /** On wheels: drop under gravity off ledges, ride up onto platforms (e.g. after landing on the pier). */
  followGround(dt) {
    this.alt ??= 0; this.avy ??= 0;
    const gr = Math.max(0, G.walkables.height(this.pos.x, this.pos.z));
    if (this.alt > gr + 0.05) { this.avy -= 16 * dt; this.alt = Math.max(gr, this.alt + this.avy * dt); if (this.alt === gr) this.avy = 0; }
    else { this.alt = gr; this.avy = 0; }
    this.pitchV = lerp(this.pitchV || 0, 0, Math.min(1, dt * 4)); this.rollV = lerp(this.rollV || 0, 0, Math.min(1, dt * 4));
  }

  collideStatic() {
    const tmp = this._cir || (this._cir = []);
    this.circles(tmp);
    const out = this._out || (this._out = { hit: false });
    let worst = 0, nx = 0, nz = 0;
    for (const ci of tmp) {
      const p = { x: ci.x, z: ci.z };
      G.colliders.resolveCircle(p, ci.r, (this.alt || 0) + 0.4, out);
      if (out.hit) {
        this.pos.x += p.x - ci.x; this.pos.z += p.z - ci.z;
        if (out.depth > worst) { worst = out.depth; nx = out.nx; nz = out.nz; }
      }
    }
    if (worst > 0) {
      const vn = this.vx * nx + this.vz * nz;
      if (vn < 0) {
        this.vx -= vn * nx * 1.3; this.vz -= vn * nz * 1.3;
        const impact = -vn;
        if (impact > 6) {
          this.damage((impact - 6) * (this.cfg.mass > 2000 ? 0.6 : 2.2));
          if (this.driver === 'player') { G.player.onCrash(impact); }
          G.audio && G.audio.crash(Math.min(1, impact / 25), this.pos);
        }
        this.vx *= 0.85; this.vz *= 0.85;
      }
    }
  }

  damage(amount, cause) {
    if (this.destroyed || amount <= 0) return;
    this.hp -= amount;
    if (this.hp <= 0) { this.hp = 0; this.burnTime = 5; } // start burning, explode later
  }

  updateFire(dt) {
    // smoke when badly damaged
    const frac = this.hp / this.cfg.hp;
    if (!this.destroyed && frac < 0.4 && Math.random() < dt * (frac < 0.15 ? 12 : 4)) G.fx && G.fx.smoke(this.pos.x, 1.2, this.pos.z, frac < 0.15 ? 0x222222 : 0x777777);
    if (!this.destroyed && this.hp <= 0) {
      this.burnTime -= dt;
      if (Math.random() < dt * 25) G.fx && G.fx.fire(this.pos.x + rand(-0.5, 0.5), 1.0, this.pos.z + rand(-0.5, 0.5));
      if (this.burnTime <= 0) this.explode();
    }
  }

  explode() {
    this.destroyed = true;
    this.vx *= 0.2; this.vz *= 0.2;
    G.fx && G.fx.explosion(this.pos.x, 1, this.pos.z);
    G.audio && G.audio.explosion(this.pos);
    // char the paint
    this.model.paint.color.setHex(0x1c1c1c);
    this.mesh.traverse((o) => { if (o.isMesh && o.material !== LIGHT_MATS.head) { o.material = o.material.clone(); o.material.color && o.material.color.multiplyScalar(0.25); } });
    // blast damage
    const P = G.player;
    if (P) {
      const pp = P.worldPos();
      const d = Math.hypot(pp.x - this.pos.x, pp.z - this.pos.z);
      if (d < 7) { if (P.vehicle === this) P.exitVehicle(true); P.hurt(Math.round((7 - d) * 18), 'explosion'); }
    }
    for (const p of G.peds) { const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z); if (d < 7) p.knock(this.pos.x, this.pos.z, 12, 200); }
    for (const v of G.vehicles) if (v !== this && Math.hypot(v.pos.x - this.pos.x, v.pos.z - this.pos.z) < 6) { v.damage(40); v.vx += (v.pos.x - this.pos.x) * 2; v.vz += (v.pos.z - this.pos.z) * 2; }
    if (this.type === 'police' && this.lastHitByPlayer) G.police.addCrime('copcar');
    if (this.driver && this.driver !== 'player') this.ejectDriver(true);
    this.removeAt = G.time + 40;
  }

  sync(dt = 0) {
    const m = this.mesh;
    m.position.set(this.pos.x, 0, this.pos.z);
    m.rotation.y = this.heading;
    if (this.cfg.fly) {
      const k = this.flyK || 0, t = G.time || 0, hover = this.flying ? Math.sin(t * 2.1) * 0.06 * k : 0;
      m.position.y = (this.alt || 0) + hover + k * 0.25;
      this.model.body.rotation.set(this.pitchV || 0, 0, this.rollV || 0);
      for (const f of this.model.folds) { f.rotation.z = -f.userData.side * k * Math.PI / 2; f.position.y = 0.38 + k * 0.12; }
      for (const wg of this.model.wings) wg.scale.x = 0.01 + k;
      this.model.glowM.opacity = k * (0.55 + 0.25 * Math.sin(t * 31) * Math.sin(t * 17));
      const sh = this.model.shadow, up = m.position.y; sh.position.y = -up + 0.03; sh.material.opacity = 0.35 * Math.max(0, 1 - up / 45); sh.scale.setScalar(1 + up * 0.02);
    }
    const wr = this.wheelRot += (this.speed * dt) / 0.33;
    for (const w of this.model.wheels) w.spin.rotation.x = wr * (0.33 / w.r);
    for (const w of this.model.steerWheels) w.pivot.rotation.y = this.steerAngle * (this.isTwoWheel ? 0.6 : 1);
    if (this.model.lean) {
      const target = this.isTwoWheel ? clamp(-this.steerAngle * Math.abs(this.speed) * 0.08, -0.5, 0.5) : 0;
      this.lean = lerp(this.lean, target, Math.min(1, dt * 6));
      this.model.lean.rotation.z = this.lean;
      this.model.lean.position.y = 0;
    }
    // police light bar
    if (this.model.sirens.length) {
      this.sirenT += dt;
      const on = this.siren;
      const ph = Math.floor(this.sirenT * 6) % 2;
      this.model.sirens[0].material = on && ph ? SIREN_ON_R : SIREN_OFF_R;
      this.model.sirens[1].material = on && !ph ? SIREN_ON_B : SIREN_OFF_B;
    }
    if (this.rider) {
      const s = this.model.seat;
      this.rider.root.position.set(s.x, s.y - 0.95, s.z);
      if (this.type === 'cycle') pedal(this.rider, this.wheelRot);
    }
  }

  /** Attach a visible NPC rider (for two-wheelers and autos) */
  addRider(look) {
    if (!this.model.riderVisible) return;
    look = look || randomLook();
    if (this.isTwoWheel && this.type !== 'cycle' && !look.police && Math.random() < 0.55) look.helmet = pick([0x111111, 0xc62828, 0xffffff, 0x1565c0, 0xf9a825]);
    const h = makeHuman(look);
    animateHuman(h, 0, 0, 'sit');
    if (this.type === 'cycle') pedal(h, 0);
    (this.model.lean || this.mesh).add(h.root);
    this.rider = h; this.sync();
  }
  removeRider() { if (this.rider) { this.rider.root.parent.remove(this.rider.root); this.rider = null; } }

  /** AI driver leaves the vehicle (carjack / crash / explosion). */
  ejectDriver(dead = false) {
    if (!this.driver || this.driver === 'player') return;
    const look = this.rider ? this.rider.look : randomLook(this.type === 'police' ? 'police' : 'civ');
    this.removeRider();
    const side = this.isTwoWheel ? 1 : 1.6;
    const rx = Math.cos(this.heading) * -side, rz = Math.sin(this.heading) * side;
    const ped = G.pedMgr && G.pedMgr.spawnAt(this.pos.x + rx * -1, this.pos.z + rz * -1, look, this.type === 'police' ? 'cop' : 'civ');
    if (ped) { if (dead) ped.knock(this.pos.x, this.pos.z, 6, 200); else ped.flee(G.player.worldPos()); }
    this.driver = null; this.ai = null;
  }

  dispose() {
    G.scene.remove(this.mesh);
    if (this.fire) this.fire = null;
  }
}

const SIREN_ON_R = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 4 });
const SIREN_OFF_R = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0x220000 });
const SIREN_ON_B = new THREE.MeshStandardMaterial({ color: 0x1e5bff, emissive: 0x1e5bff, emissiveIntensity: 4 });
const SIREN_OFF_B = new THREE.MeshStandardMaterial({ color: 0x000055, emissive: 0x000022 });

/** Vehicle ↔ vehicle collision resolution (circle pairs). */
export function collideVehicles(list) {
  const ca = [], cb = [];
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (Math.abs((a.alt || 0) - (b.alt || 0)) > 1.6) continue;   // one of them is flying over the other
      const reach = (a.cfg.length + b.cfg.length) / 2 + 1;
      if (Math.abs(a.pos.x - b.pos.x) > reach || Math.abs(a.pos.z - b.pos.z) > reach) continue;
      a.circles(ca); b.circles(cb);
      for (const p of ca) for (const q of cb) {
        const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz), R = p.r + q.r;
        if (d >= R || d < 1e-4) continue;
        const nx = dx / d, nz = dz / d, pen = R - d;
        const ma = a.parked && !a.driver ? a.cfg.mass * 3 : a.cfg.mass, mb = b.parked && !b.driver ? b.cfg.mass * 3 : b.cfg.mass;
        const ta = mb / (ma + mb), tb = ma / (ma + mb);
        a.pos.x -= nx * pen * ta; a.pos.z -= nz * pen * ta; b.pos.x += nx * pen * tb; b.pos.z += nz * pen * tb;
        const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
        if (rv < 0) {
          const jimp = -(1.3) * rv / (1 / ma + 1 / mb);
          a.vx -= (jimp / ma) * nx; a.vz -= (jimp / ma) * nz; b.vx += (jimp / mb) * nx; b.vz += (jimp / mb) * nz;
          const impact = -rv;
          if (impact > 5) {
            a.damage((impact - 5) * 1.6 * Math.min(2, mb / ma)); b.damage((impact - 5) * 1.6 * Math.min(2, ma / mb));
            if (a.driver === 'player' || b.driver === 'player') {
              G.audio && G.audio.crash(Math.min(1, impact / 20), a.pos);
              G.player.onCrash(impact);
              const other = a.driver === 'player' ? b : a;
              other.lastHitByPlayer = true;
              if (other.type === 'police' && impact > 6) G.police.addCrime('ramcop');
              if (other.ai && other.ai.mode === 'traffic') { other.ai.angry = 3; other.honk(); }
            }
            if (a.isTwoWheel && impact > 10 && a.driver && a.driver !== 'player') a.ejectDriver();
            if (b.isTwoWheel && impact > 10 && b.driver && b.driver !== 'player') b.ejectDriver();
          }
        }
      }
    }
  }
}

Vehicle.prototype.honk = function () {
  if (this.honkCooldown > 0) return;
  this.honkCooldown = rand(1.5, 4);
  G.audio && G.audio.horn(this.pos, this.isTwoWheel ? 1.4 : this.type === 'bus' ? 0.6 : this.type === 'auto' ? 1.2 : 1);
};

/** Bicycle rider: legs pedal with the crank. */
export function pedal(h, rot) {
  const a = rot * 0.5;
  h.parts.legL.rotation.set(-1.0 + Math.sin(a) * 0.5, 0, 0.05);
  h.parts.legR.rotation.set(-1.0 - Math.sin(a) * 0.5, 0, -0.05);
  h.parts.armL.rotation.set(-1.0, 0, 0.1); h.parts.armR.rotation.set(-1.0, 0, -0.1);
  h.parts.body.rotation.x = 0.25;
}
