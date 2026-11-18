// Player character controller (on foot + driving) and third-person camera rig.
import * as THREE from 'three';
import { G } from './state.js';
import { clamp, lerp, wrapAngle, angleLerp } from './utils.js';
import { makeHuman, animateHuman } from './models.js';
import { pedal } from './vehicle.js';
import { boxMesh, mat } from './utils.js';
import { SEA_X } from './config.js';
import { t, vlabel } from './i18n.js';
import { SHOP_TYPES } from './stalls.js';

export class Player {
  constructor(x, z, yaw = 0) {
    const h = makeHuman({ skin: 0x8d5524, shirt: 0x17b3a3, pants: 0xd8c7a0, hair: 0x111111, female: false });
    // Vice City vibes: floral shirt dots + sunglasses
    for (let i = 0; i < 10; i++) boxMesh(h.parts.body, 0.07, 0.07, 0.01, mat(i % 2 ? 0xff5fa2 : 0xffe066), (Math.random() - 0.5) * 0.36, 0.1 + Math.random() * 0.45, 0.125);
    boxMesh(h.parts.head, 0.24, 0.06, 0.02, mat(0x050505, { metalness: 0.6, roughness: 0.2 }), 0, 0.02, 0.135);
    this.h = h; this.mesh = h.root; G.scene.add(this.mesh);
    this.pos = new THREE.Vector3(x, 0, z); this.yaw = yaw; this.vy = 0; this.onGround = true;
    this.crouch = false; this.health = 100; this.maxHealth = 100; this.armor = 0;
    this.vehicle = null; this.phase = 0; this.moveAmt = 0;
    this.punchT = 0; this.punchSide = 0; this.downT = 0; this.dead = false; this.swimming = false;
    this.invuln = 0; this.speedNow = 0;
    this._tmpOut = { hit: false };
  }

  worldPos() { return this.vehicle ? this.vehicle.pos : this.pos; }

  hurt(amount, cause) {
    if (this.dead || this.invuln > 0) return;
    this.health -= amount;
    G.hud && G.hud.flashDamage();
    if (this.health <= 0) { this.health = 0; this.dead = true; G.game.wasted(cause); }
  }
  heal(n) { this.health = Math.min(this.maxHealth, this.health + n); }

  onCrash(impact) {
    G.cam.shake = Math.min(1, impact / 20);
    if (this.vehicle && this.vehicle.isTwoWheel && impact > 13) {
      // thrown off the bike!
      const v = this.vehicle; this.exitVehicle(true);
      this.knockDown(v.vx * 0.4, v.vz * 0.4);
      this.hurt(Math.round(impact * 1.2), 'crash');
    } else if (impact > 12) this.hurt(Math.round((impact - 12) * 0.8), 'crash');
  }

  knockDown(vx = 0, vz = 0) { this.downT = 1.6; this.kvx = vx; this.kvz = vz; this.vy = 3; this.onGround = false; }

  /* ------------------------------------------------------------ */
  enterNearestVehicle() {
    let best = null, bd = 4.2;
    for (const v of G.vehicles) {
      if (v.destroyed || v.hp <= 0) continue;
      const d = Math.hypot(v.pos.x - this.pos.x, v.pos.z - this.pos.z) - v.cfg.length * 0.3;
      if (d < bd) { bd = d; best = v; }
    }
    if (!best) return false;
    this.enterVehicle(best);
    return true;
  }

  enterVehicle(v) {
    if (v.driver && v.driver !== 'player') {
      const wasCop = v.type === 'police';
      v.ejectDriver();
      G.police.addCrime(wasCop ? 'copcarjack' : 'carjack', v.pos);
      G.hud.notify(t(wasCop ? 'stolenCop' : 'carjacked'));
    } else if (v.type === 'police' && !v.official) G.police.addCrime('copcar', v.pos);
    if (v.ai && v.ai.mode === 'police') G.police.forget(v);
    if (v.rider && !v.driver) v.removeRider();
    v.driver = 'player'; v.ai = null; v.parked = false; v.persistent = v.persistent && true;
    this.vehicle = v; this.crouch = false;
    if (v.model.riderVisible) {
      (v.model.lean || v.mesh).add(this.mesh);
      const s = v.model.seat; this.mesh.position.set(s.x, s.y - 0.95, s.z); this.mesh.rotation.set(0, 0, 0);
      animateHuman(this.h, 0, 0, 'sit');
    } else this.mesh.visible = false;
    G.cam.snapBehind = true;
    G.hud.notify(vlabel(v.type), 2);
    G.audio && G.audio.door();
    G.missions && G.missions.onEnterVehicle(v);
  }

  exitVehicle(force = false) {
    const v = this.vehicle; if (!v) return;
    if (!force && Math.abs(v.speed) > 9) return;
    if (this.mesh.parent !== G.scene) { this.mesh.parent.remove(this.mesh); G.scene.add(this.mesh); }
    this.mesh.visible = true;
    v.driver = null; v.parked = true;
    // step out on the right (driver) side, or the left if blocked
    const rx = Math.cos(v.heading), rz = -Math.sin(v.heading);
    const off = v.cfg.width / 2 + 0.7;
    let x = v.pos.x - rx * off, z = v.pos.z - rz * off;
    if (G.colliders.pointBlocked(x, z, 0.5)) { x = v.pos.x + rx * off; z = v.pos.z + rz * off; }
    if (G.colliders.pointBlocked(x, z, 0.5)) { x = v.pos.x - Math.sin(v.heading) * (v.cfg.length / 2 + 0.8); z = v.pos.z - Math.cos(v.heading) * (v.cfg.length / 2 + 0.8); }
    this.pos.set(x, 0, z); this.yaw = v.heading; this.vy = 0;
    this.vehicle = null;
    G.audio && G.audio.door();
    G.environmentHeadlightOff = true;
  }

  /* ------------------------------------------------------------ */
  update(dt) {
    if (this.dead) return;
    const I = G.input;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.vehicle) return this.updateDriving(dt, I);

    // ---- on foot ----
    if (I.hit('KeyF') && this.downT <= 0) { if (this.enterNearestVehicle()) return; }
    if (I.hit('KeyC') || I.hit('ControlLeft')) this.crouch = !this.crouch;

    let mx = I.axis('KeyA', 'KeyD') + I.axis('ArrowLeft', 'ArrowRight');
    let mz = I.axis('KeyS', 'KeyW') + I.axis('ArrowDown', 'ArrowUp');
    const len = Math.hypot(mx, mz); if (len > 1) { mx /= len; mz /= len; }
    const run = I.key('ShiftLeft') || I.key('ShiftRight');
    let speed = this.crouch ? 1.6 : run ? 6.4 : 2.6;
    if (this.swimming) speed = 1.8;
    const cy = G.cam.yaw;
    // camera-relative: forward = (sin yaw, cos yaw), right = (-cos yaw, sin yaw)
    const fx = Math.sin(cy), fz = Math.cos(cy), rx = -Math.cos(cy), rz = Math.sin(cy);
    let vx = (fx * mz + rx * mx) * speed, vz = (fz * mz + rz * mx) * speed;
    if (this.downT > 0) {
      this.downT -= dt; vx = this.kvx || 0; vz = this.kvz || 0; this.kvx *= 0.9; this.kvz *= 0.9;
    }
    const moving = Math.hypot(vx, vz) > 0.1;
    if (moving && this.downT <= 0) this.yaw = angleLerp(this.yaw, Math.atan2(vx, vz), Math.min(1, dt * 12));
    this.pos.x += vx * dt; this.pos.z += vz * dt;
    this.speedNow = Math.hypot(vx, vz);

    // ground / jump
    const ground = this.swimming ? -0.75 : G.walkables.height(this.pos.x, this.pos.z);
    if (I.hit('Space') && this.onGround && !this.crouch && this.downT <= 0 && !this.swimming) { this.vy = 5.6; this.onGround = false; G.audio && G.audio.jump(); }
    this.vy -= 16 * dt; this.pos.y += this.vy * dt;
    if (this.pos.y <= ground) { this.pos.y = ground; this.vy = 0; this.onGround = true; }
    else if (this.pos.y - ground > 0.05) this.onGround = false;

    // collisions
    G.colliders.resolveCircle(this.pos, 0.35, this.pos.y, this._tmpOut, 'vehonly');
    if (G.walkables.height(this.pos.x, this.pos.z) - this.pos.y > 0.5) {
      // bumped into a raised platform from the side: step back
      this.pos.x -= vx * dt; this.pos.z -= vz * dt;
    }
    this.collideVehicles(dt);
    // sea: wade then swim, with a limit
    this.swimming = this.pos.x > SEA_X + 3;
    if (this.pos.x > SEA_X + 30) this.pos.x = SEA_X + 30;

    // punching
    if (this.punchT > 0) this.punchT -= dt;
    if ((I.clicked || I.hit('KeyQ')) && this.punchT <= 0 && this.downT <= 0 && !this.swimming) {
      this.punchT = 0.38; this.punchSide ^= 1; this.didHit = false;
      G.audio && G.audio.whoosh();
    }
    if (this.punchT > 0.15 && this.punchT < 0.28 && !this.didHit) this.tryHit();

    // interaction
    if (I.hit('KeyE')) this.interact();

    // animation
    this.moveAmt = lerp(this.moveAmt, moving ? (run ? 1 : 0.6) : 0, Math.min(1, dt * 10));
    this.phase += dt * (run ? 11 : this.crouch ? 5 : 7.5) * (moving ? 1 : 0);
    let pose = this.crouch ? 'crouch' : 'walk';
    if (!this.onGround && !this.swimming) pose = 'jump';
    if (this.swimming) { pose = 'swim'; this.phase += dt * 4; }
    if (this.punchT > 0.1) pose = this.punchSide ? 'punchR' : 'punchL';
    if (this.downT > 0) pose = 'down';
    animateHuman(this.h, this.phase, this.moveAmt, pose);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.set(this.downT > 0 ? -Math.PI / 2 : 0, this.yaw, 0, 'YXZ');
    if (this.downT > 0) this.mesh.position.y += 0.25;
    if (this.swimming) this.mesh.rotation.x = 0.0;
  }

  collideVehicles(dt) {
    const cir = this._cir || (this._cir = []);
    for (const v of G.vehicles) {
      if (Math.abs(v.pos.x - this.pos.x) > 8 || Math.abs(v.pos.z - this.pos.z) > 8) continue;
      v.circles(cir);
      for (const c of cir) {
        const dx = this.pos.x - c.x, dz = this.pos.z - c.z, d = Math.hypot(dx, dz), R = c.r + 0.35;
        if (d >= R || d < 1e-4) continue;
        if (this.pos.y > 1.4 && !v.isTwoWheel) continue; // standing on top
        const nx = dx / d, nz = dz / d;
        this.pos.x += nx * (R - d); this.pos.z += nz * (R - d);
        const sp = Math.hypot(v.vx, v.vz);
        if (sp > 4 && this.downT <= 0 && (v.vx * -nx + v.vz * -nz) > 2) {
          this.hurt(Math.round(sp * 2.2), 'roadkill');
          this.knockDown(v.vx * 0.5 + nx * 3, v.vz * 0.5 + nz * 3);
          G.audio && G.audio.thud();
        }
      }
    }
  }

  tryHit() {
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    for (const p of G.peds) {
      if (p.dead) continue;
      const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > 1.6 || (dx * fx + dz * fz) / (d || 1) < 0.4) continue;
      this.didHit = true;
      p.hitByPlayer(26, this.pos);
      G.audio && G.audio.punch();
      break;
    }
  }

  interact() {
    if (G.missions && G.missions.tryStartNearby()) return;
    for (const s of G.world.shops || []) {
      if (Math.hypot(s.x - this.pos.x, s.z - this.pos.z) > 3.2) continue;
      const T = SHOP_TYPES[s.type], name = G.settings.lang === 'ta' ? T.ta : T.en;
      if (G.money < T.price) { G.hud.notify(t('shop.money', name)); return; }
      if (T.heal && this.health >= this.maxHealth) { G.hud.notify(t('chai.full')); return; }
      G.money -= T.price; this.heal(T.heal);
      G.hud.notify(T.heal ? t('shop.ok', name, T.heal, T.price) : t('shop.flowers', name, T.price));
      G.audio && G.audio.pickup();
      const v = G.peds.find((p) => p.state === 'vendor' && Math.hypot(p.pos.x - s.vendor.x, p.pos.z - s.vendor.z) < 1); if (v) v.say('thanks', 2.5, true);
      return;
    }
    let best = null, bd = 2.8;
    for (const p of G.peds) { if (p.dead || p.down) continue; const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z); if (d < bd) { bd = d; best = p; } }
    if (best) best.talkTo(this);
  }

  /* ------------------------------------------------------------ */
  updateDriving(dt, I) {
    const v = this.vehicle;
    if (I.hit('KeyF')) {
      const fast = Math.abs(v.speed) > 9;
      this.exitVehicle(true);
      if (fast) { this.knockDown(v.vx * 0.3, v.vz * 0.3); this.hurt(10, 'bail'); } // bailing out at speed
      return;
    }
    const thr = I.axis('KeyS', 'KeyW') + I.axis('ArrowDown', 'ArrowUp');
    const steer = -(I.axis('KeyA', 'KeyD') + I.axis('ArrowLeft', 'ArrowRight'));
    v.update(dt, { throttle: clamp(thr, -1, 1), steer: clamp(steer, -1, 1), handbrake: I.key('Space') });
    if (v.type === 'cycle') pedal(this.h, v.wheelRot);
    if (I.key('KeyH')) { v.honk(); G.pedMgr.onHonk(v); G.animals && G.animals.onHonk(v.pos); }
    if (v.type === 'police' && I.hit('KeyG')) { v.siren = !v.siren; }
    this.pos.copy(v.pos);
    G.stats.distance += Math.abs(v.speed) * dt;
    if (v.destroyed) { this.exitVehicle(true); }
    if (I.hit('KeyE')) { G.missions && G.missions.tryStartNearby(); }
  }
}

/* ================================================================ */
export class CameraRig {
  constructor(camera) {
    this.cam = camera; this.yaw = 0; this.pitch = -0.18; this.dist = 4.6; this.zoom = 1;
    this.target = new THREE.Vector3(); this.pos = new THREE.Vector3(); this.shake = 0; this.snapBehind = true;
    this.lastManual = 0;
  }
  update(dt) {
    const P = G.player, I = G.input, s = G.settings.sensitivity;
    if (I.mdx || I.mdy) {
      this.yaw -= I.mdx * 0.0024 * s;
      this.pitch -= I.mdy * 0.0022 * s * (G.settings.invertY ? -1 : 1);
      this.pitch = clamp(this.pitch, -1.2, 0.5);
      this.lastManual = G.time;
    }
    if (I.wheel) this.zoom = clamp(this.zoom + I.wheel * 0.12, 0.6, 2.2);
    const v = P.vehicle;
    let tgt, dist, height;
    if (v) {
      tgt = this._t || (this._t = new THREE.Vector3());
      tgt.set(v.pos.x, v.cfg.camH * 0.55 + 0.6, v.pos.z);
      dist = v.cfg.camDist * this.zoom; height = 0;
      // auto-follow behind the vehicle
      const idle = G.time - this.lastManual > 1.4;
      if (this.snapBehind) { this.yaw = v.heading; this.pitch = -0.2; this.snapBehind = false; }
      else if (idle && Math.abs(v.speed) > 1.5) {
        const want = v.speed >= 0 ? v.heading : v.heading;
        this.yaw = angleLerp(this.yaw, want, Math.min(1, dt * 2.6));
        this.pitch = lerp(this.pitch, -0.2, dt * 2);
      }
    } else {
      tgt = this._t2 || (this._t2 = new THREE.Vector3());
      tgt.set(P.pos.x, P.pos.y + (P.crouch ? 1.15 : 1.6), P.pos.z);
      if (P.downT > 0) tgt.y = P.pos.y + 0.6;
      dist = (P.crouch ? 3.8 : 4.6) * this.zoom;
    }
    this.target.lerp(tgt, Math.min(1, dt * (v ? 14 : 18)));
    if (this.target.distanceToSquared(tgt) > 400) this.target.copy(tgt);
    // desired position
    const cp = Math.cos(this.pitch);
    const dx = -Math.sin(this.yaw) * cp, dz = -Math.cos(this.yaw) * cp, dy = -Math.sin(this.pitch);
    // camera collision with buildings
    let d = dist;
    for (let t = 0.6; t <= dist; t += 0.4) {
      const x = this.target.x + dx * t, y = this.target.y + dy * t, z = this.target.z + dz * t;
      if (G.colliders.pointBlocked(x, z, y)) { d = Math.max(0.8, t - 0.5); break; }
    }
    this.pos.set(this.target.x + dx * d, Math.max(0.4, this.target.y + dy * d), this.target.z + dz * d);
    this.cam.position.copy(this.pos);
    if (this.shake > 0) {
      this.cam.position.x += (Math.random() - 0.5) * this.shake * 0.6; this.cam.position.y += (Math.random() - 0.5) * this.shake * 0.4;
      this.shake = Math.max(0, this.shake - dt * 2.5);
    }
    this.cam.lookAt(this.target);
    // speed FOV
    const sp = v ? Math.abs(v.speed) : 0;
    const fov = 68 + clamp(sp / 40, 0, 1) * 14;
    if (Math.abs(this.cam.fov - fov) > 0.05) { this.cam.fov = lerp(this.cam.fov, fov, Math.min(1, dt * 3)); this.cam.updateProjectionMatrix(); }
  }
}
