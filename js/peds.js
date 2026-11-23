// Pedestrians and police officers on foot.
import * as THREE from 'three';
import { G } from './state.js';
import { clamp, lerp, rand, pick, angleLerp, wrapAngle } from './utils.js';
import { makeHuman, animateHuman, randomLook } from './models.js';
import { dialogue, convo, REEL_LINES, GAANA_LINES } from './i18n.js';
import { Vehicle } from './vehicle.js';
/** A pullingo-style look (bounded retries, then forced style) */
function pullingoLook() {
  for (let i = 0; i < 12; i++) { const l = randomLook('youthM'); if (l.pullingo) return l; }
  return Object.assign(randomLook('youthM'), { pullingo: true, puff: true, hairDye: 0xe0b84a, chain: true, ripped: true, sneakers: true, phone: true });
}
const pickReel = () => REEL_LINES[Math.floor(Math.random() * REEL_LINES.length)];
import { SHOP_TYPES } from './stalls.js';
import { CAFE, vendorProp, waiterRoute } from './cafe.js';

export class Ped {
  constructor(x, z, look, kind = 'civ') {
    this.kind = kind;
    this.h = makeHuman(look || randomLook(kind === 'cop' ? 'police' : 'civ'));
    this.mesh = this.h.root; G.scene.add(this.mesh);
    this.pos = new THREE.Vector3(x, 0, z);
    this.yaw = rand(-Math.PI, Math.PI);
    this.state = 'walk'; this.health = kind === 'cop' ? 120 : 100;
    this.dead = false; this.down = false; this.downT = 0; this.vx = 0; this.vz = 0;
    this.speed = rand(1.1, 1.5); this.phase = rand(0, 6); this.t = 0;
    this.nav = null; this.fleeT = 0; this.talkT = 0; this.attackT = 0; this.arrestT = 0;
    this.removeAt = 0; this.hostile = false; this.sayT = rand(2, 8); this.greeted = -99;
    this.voice = { female: this.h.look.female, old: this.h.look.old, pitchJ: rand(-0.12, 0.12) };
    this.snapToSidewalk();
  }

  /** Say a Tamil line from a dialogue context: bubble on screen + spoken voice when close. */
  say(ctx, secs = 3.5, priority = false) {
    const line = dialogue(ctx);
    G.hud && G.hud.speech(this, line, secs);
    const pp = G.player.worldPos();
    G.speech && G.speech.say(line[0], this.voice, Math.hypot(pp.x - this.pos.x, pp.z - this.pos.z), priority);
    this.sayT = rand(8, 16);
    return line;
  }
  sayLine(main, sub, lang = 'ta-IN', secs = 3.4) {
    G.hud && G.hud.speech(this, [main, sub], secs);
    const pp = G.player.worldPos();
    G.speech && G.speech.say(main, this.voice, Math.hypot(pp.x - this.pos.x, pp.z - this.pos.z), false, lang);
  }
  /** Group leader runs a scripted conversation among the members when the player is close enough to hear. */
  tickConvo(dt) {
    const c = this.cv || (this.cv = { t: rand(1, 6), i: 0, script: null });
    c.t -= dt; if (c.t > 0) return;
    const pp = G.player.worldPos();
    if (Math.hypot(pp.x - this.pos.x, pp.z - this.pos.z) > 28) { c.t = 2; return; }
    if (!c.script || c.i >= c.script.length) { c.script = convo(this.groupKind); c.i = 0; if (c.done) { c.done = false; c.t = rand(10, 18); return; } }
    const [who, main, sub, lang] = c.script[c.i++];
    const sp = this.members[who % this.members.length];
    if (sp && !sp.dead && G.peds.includes(sp)) sp.sayLine(main, sub, lang || 'ta-IN', 3.6);
    c.t = 3.4 + main.length * 0.02;
    if (c.i >= c.script.length) c.done = true;
  }
  greetCtx() { const h = G.env.hour; return h < 4 || h > 21 ? 'greetNight' : h < 12 ? 'greetMorning' : 'greetEvening'; }

  snapToSidewalk() {
    const r = G.roads.nearestEdge(this.pos.x, this.pos.z, 80);
    if (!r) { this.nav = null; return; }
    const e = r.edge;
    const from = Math.random() < 0.5 ? e.a : e.b;
    const t = from === e.a ? r.t : e.len - r.t;
    this.nav = { e, from, t, side: Math.random() < 0.5 ? 1 : -1 };
  }

  sidewalkPoint(out) {
    const n = this.nav; const off = (n.e.w / 2 + (n.e.kind === 'city' ? 1.6 : 1.2)) * n.side;
    return G.roads.lanePoint(n.e, n.from, clamp(n.t, 0, n.e.len), off, out);
  }

  knock(fromX, fromZ, force, dmg) {
    if (this.dead) return;
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ, d = Math.hypot(dx, dz) || 1;
    this.vx = (dx / d) * force; this.vz = (dz / d) * force; this.vy = Math.min(6, force * 0.35);
    this.down = true; this.downT = rand(2.5, 4);
    this.health -= dmg;
    if (this.health <= 0) this.die();
    G.audio && G.audio.thud(this.pos);
    G.pedMgr.panic(this.pos, 25);
  }

  hitByPlayer(dmg, from) {
    if (this.dead) return;
    this.health -= dmg;
    const dx = this.pos.x - from.x, dz = this.pos.z - from.z, d = Math.hypot(dx, dz) || 1;
    this.pos.x += (dx / d) * 0.3; this.pos.z += (dz / d) * 0.3;
    G.police.addCrime(this.kind === 'cop' ? 'copassault' : 'assault', this.pos);
    if (this.health <= 0) { this.knock(from.x, from.z, 4, 0); this.die(); G.police.addCrime(this.kind === 'cop' ? 'copkill' : 'murder', this.pos); G.stats.kills++; }
    else if (this.health < 50 && !this.down) { this.down = true; this.downT = 2; this.vx = (dx / d) * 2; this.vz = (dz / d) * 2; this.vy = 1.5; }
    if (this.kind === 'cop') this.hostile = true;
    else if (!this.dead && Math.random() < 0.25 && !this.h.look.female) { this.state = 'fight'; } // some fight back
    else this.flee(from);
    G.pedMgr.panic(this.pos, 18, this);
  }

  die() {
    if (this.dead) return;
    this.dead = true; this.down = true; this.health = 0; this.removeAt = G.time + 30;
    if (this.killedByPlayer !== false) {
      // drop some cash
      G.pickups && G.pickups.dropCash(this.pos.x, this.pos.z, Math.round(rand(10, 120)));
    }
  }

  flee(from) {
    if (this.dead || this.kind === 'cop') return;
    this.state = 'flee'; this.fleeT = rand(6, 10); this.fleeFrom = { x: from.x, z: from.z };
    this.speed = rand(4.5, 6);
    if (Math.random() < 0.35) this.say('flee', 1.6);
  }

  talkTo(player) {
    if (this.dead || this.down) return;
    if (this.state === 'vendor' || this.state === 'bench') { this.say(this.state === 'vendor' ? (this.callCtx || 'vendorTea') : 'promenade', 4, true); return; }
    this.prevState = this.state === 'talk' ? this.prevState : this.state;
    this.state = 'talk'; this.talkT = 4.5;
    this.yaw = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
    const ctx = this.kind === 'cop' ? 'cop' : G.env.rain > 0.5 && Math.random() < 0.4 ? 'rain' : this.t - this.greeted > 30 ? this.greetCtx() : 'chat';
    this.greeted = this.t;
    this.say(ctx, 4.5, true);
  }

  update(dt, near) {
    this.t += dt;
    if (this.dead || this.down) return this.updateDown(dt);
    let mvx = 0, mvz = 0, moveSpeed = 0, pose = 'walk';
    const P = G.player, pp = P.worldPos();

    if (this.kind === 'cop' && G.police.stars > 0) this.state = 'chase';
    else if (this.kind === 'cop' && this.state === 'chase') { this.state = 'walk'; this.snapToSidewalk(); }

    switch (this.state) {
      case 'talk': {
        this.talkT -= dt; pose = 'talk';
        if (this.talkT <= 0) this.state = this.prevState === 'stroll' ? 'stroll' : 'walk';
        break;
      }
      case 'pause': { // group stops: leader holds the phone up, everyone squeezes in
        pose = this.members ? (this.reel ? 'film' : 'selfie') : 'idle'; this.pauseT -= dt; this.phase += dt * 2;
        if (this.pauseT <= 0) { this.state = this.prevState || 'walk'; if (this.reel) { this.yaw = this.pauseYaw; this.reel = false; } }
        break;
      }
      case 'vendor': { // stall keeper: calls out to passers-by
        pose = 'idle';
        const d = Math.hypot(pp.x - this.pos.x, pp.z - this.pos.z);
        if (d < 14 && !P.vehicle) {
          this.yaw = angleLerp(this.yaw, Math.atan2(pp.x - this.pos.x, pp.z - this.pos.z), Math.min(1, dt * 3));
          pose = this.sayT > 6 ? 'call' : 'idle';
          this.sayT -= dt; if (this.sayT <= 0) this.say(this.callCtx || 'vendorTea', 3);
        } else this.yaw = angleLerp(this.yaw, this.homeYaw, Math.min(1, dt * 2));
        this.pos.x = this.home.x; this.pos.z = this.home.z;
        break;
      }
      case 'waiter': { // café waiter: walks the aisles between the counter and the tables with a tray
        if (!this.route) { this.route = waiterRoute(G.world); this.ri = 0; }
        if (this.waitT > 0) { this.waitT -= dt; pose = 'idle'; this.yaw = angleLerp(this.yaw, this.faceYaw, Math.min(1, dt * 4)); break; }
        const tg = this.route[this.ri], dx = tg.x - this.pos.x, dz = tg.z - this.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.2) {
          if (tg.stop) { this.waitT = tg.stop; this.faceYaw = tg.yaw; if (Math.hypot(pp.x - this.pos.x, pp.z - this.pos.z) < 12 && Math.random() < 0.5) this.say('vendorTea', 2.5); }
          if (++this.ri >= this.route.length) { this.route = waiterRoute(G.world); this.ri = 0; }
        } else { mvx = dx / d; mvz = dz / d; moveSpeed = 1.05; }
        break;
      }
      case 'bench': { // sitting on a promenade bench, watching the sea
        pose = this.standHang ? 'idle' : this.onSand || this.onBike || this.chair ? 'sit' : 'bench';
        this.pos.set(this.home.x, this.home.y !== undefined ? this.home.y : this.onWall ? 0.5 : this.onSand ? -0.78 : 0.08, this.home.z); this.yaw = this.homeYaw;
        if (this.standHang) this.phase += dt * 1.5;
        if (this.mate) { this.sayT -= dt; if (this.sayT <= 0 && Math.hypot(pp.x - this.pos.x, pp.z - this.pos.z) < 22) { this.say(this.chair ? 'chat' : 'promenade', 3.5); this.sayT = this.chair ? rand(12, 26) : rand(5, 11); } }
        break;
      }
      case 'stroll': { // promenade walk, in small groups of friends/families
        const L = this.leader && !this.leader.dead && G.peds.includes(this.leader) && ['stroll', 'walk', 'pause', 'talk'].includes(this.leader.state) ? this.leader : null;
        if (this.leader && !L && this.leader.state === 'flee') this.flee(this.leader.fleeFrom || this.pos);
        if (L) {
          const fy = L.state === 'pause' ? L.pauseYaw : L.yaw, fx = Math.sin(fy), fz = Math.cos(fy);
          const tx = L.pos.x - fz * this.slot[0] - fx * this.slot[1], tz = L.pos.z + fx * this.slot[0] - fz * this.slot[1];
          const dx = tx - this.pos.x, dz = tz - this.pos.z, d = Math.hypot(dx, dz);
          if (d > 0.15) { mvx = dx / d; mvz = dz / d; moveSpeed = Math.min(2.4, d * 2.2); }
          if (L.state === 'pause' || L.state === 'talk') {
            if (d < 0.5) { moveSpeed = 0; const toL = Math.atan2(L.pos.x - this.pos.x, L.pos.z - this.pos.z); this.yaw = angleLerp(this.yaw, L.reel ? toL : fy, Math.min(1, dt * 3)); }
            pose = L.state === 'pause' ? (L.reel && d < 0.8 ? 'dance' : 'idle') : 'walk';
            if (pose === 'dance') this.phase += dt * 3;
          }
          this.dir = L.dir;
          if (d > 25) { this.pos.x = tx; this.pos.z = tz; }
        } else if (this.leader) { this.leader = null; this.state = 'walk'; this.snapToSidewalk(); break; } else {
          if (this.pos.z < (this.lane > 520 ? -55 : -440)) this.dir = 1; else if (this.pos.z > 290) this.dir = -1;
          mvx = (this.lane - this.pos.x) * 0.5; mvz = this.dir; const n = Math.hypot(mvx, mvz); mvx /= n; mvz /= n; moveSpeed = this.speed;
          if (Math.random() < dt * 0.01) this.dir *= -1;
        }
        this.sayT -= dt;
        if (this.sayT <= 0 && (this.leader || this.followers) && Math.hypot(pp.x - this.pos.x, pp.z - this.pos.z) < 20) this.say(Math.random() < 0.5 ? 'promenade' : 'chat', 3.2);
        else if (this.sayT <= 0 && this.prop && Math.hypot(pp.x - this.pos.x, pp.z - this.pos.z) < 16) { this.say('vendorCart', 3); this.sayT = rand(7, 14); }
        break;
      }
      case 'flee': {
        this.fleeT -= dt;
        const dx = this.pos.x - this.fleeFrom.x, dz = this.pos.z - this.fleeFrom.z, d = Math.hypot(dx, dz) || 1;
        mvx = dx / d; mvz = dz / d; moveSpeed = this.speed;
        if (this.fleeT <= 0) { this.state = 'walk'; this.speed = rand(1.1, 1.5); this.snapToSidewalk(); }
        break;
      }
      case 'fight': {
        const dx = pp.x - this.pos.x, dz = pp.z - this.pos.z, d = Math.hypot(dx, dz);
        if (P.vehicle || d > 25 || P.dead) { this.flee(pp); break; }
        if (d > 1.2) { mvx = dx / d; mvz = dz / d; moveSpeed = 5; }
        else { this.yaw = Math.atan2(dx, dz); this.attackT -= dt; pose = this.attackT > 0.6 ? 'punchR' : 'walk'; if (this.attackT <= 0) { this.attackT = 1.1; P.hurt(5, 'fight'); G.audio && G.audio.punch(); } }
        break;
      }
      case 'chase': { // police on foot
        const dx = pp.x - this.pos.x, dz = pp.z - this.pos.z, d = Math.hypot(dx, dz);
        const stars = G.police.stars;
        if (d > 1.1) { mvx = dx / d; mvz = dz / d; moveSpeed = d > 40 ? 3 : 5.6; this.arrestT = 0; }
        else {
          this.yaw = Math.atan2(dx, dz);
          const veh = P.vehicle;
          if (stars >= 3 || this.hostile) {
            this.attackT -= dt; pose = this.attackT > 0.6 ? 'punchR' : 'arrest';
            if (this.attackT <= 0) { this.attackT = 1.0; if (!veh) { P.hurt(7 + stars * 2, 'police'); G.audio && G.audio.punch(); } else if (Math.abs(veh.speed) < 1.5) this.arrestT += 1; }
          } else {
            pose = 'arrest';
            if (!veh || Math.abs(veh.speed) < 1.5) this.arrestT += dt; else this.arrestT = 0;
          }
          if (this.arrestT > 1.6 && (!veh || Math.abs(veh.speed) < 1.5)) G.game.busted();
        }
        break;
      }
      default: { // walking along the sidewalk
        if (!this.nav) { this.snapToSidewalk(); if (!this.nav) break; }
        const n = this.nav;
        n.t += this.speed * dt;
        if (n.t >= n.e.len) {
          const node = G.roads.nodes[G.roads.other(n.e, n.from)];
          const opts = node.edges.filter((id) => id !== n.e.id).map((id) => G.roads.edges[id]).filter((e) => e.kind !== 'highway');
          const next = opts.length ? pick(opts) : n.e;
          n.from = node.id; n.e = next; n.t = 0;
          if (Math.random() < 0.2) n.side *= -1;
        }
        const p = this.sidewalkPoint(this._sp || (this._sp = {}));
        const dx = p.x - this.pos.x, dz = p.z - this.pos.z, d = Math.hypot(dx, dz);
        if (d > 0.05) { mvx = dx / d; mvz = dz / d; moveSpeed = Math.min(this.speed * 1.5, d * 3); }
        if (d > 15) { this.pos.x = p.x; this.pos.z = p.z; }
        // pause sometimes
        if (Math.random() < dt * 0.02) { this.state = 'talk'; this.talkT = rand(2, 5); }
      }
    }

    if (this.members && this.members.length > 1 && !this.dead) this.tickConvo(dt);
    if (this.singer && (this.state === 'walk' || this.state === 'stroll')) {
      this.singT = (this.singT ?? rand(1, 3)) - dt;
      if (this.singT <= 0) { this.singT = rand(3.2, 4.5); const [ta, en] = GAANA_LINES[(this.lineI = ((this.lineI ?? Math.floor(Math.random() * 8)) + 1) % GAANA_LINES.length)]; G.hud && G.hud.speech(this, ['🎤 ' + ta, en], 3.4); }
    }
    // groups stop now and then for a selfie
    if (this.members && (this.state === 'stroll' || this.state === 'walk') && this.groupKind !== 'family') {
      this.selfieT = (this.selfieT ?? rand(25, 60)) - dt;
      if (this.selfieT <= 0) {
        this.selfieT = rand(35, 75); this.prevState = this.state; this.state = 'pause'; this.pauseYaw = this.yaw;
        this.reel = (this.groupKind === 'girls' || this.groupKind === 'mixed') && Math.random() < 0.65;
        this.pauseT = this.reel ? rand(9, 13) : rand(5, 8);
        if (this.reel) { this.yaw = this.pauseYaw + Math.PI; this.sayLine(...pickReel()); }
      }
    }
    // reactions to the player walking up close
    if (!P.vehicle && this.state !== 'chase' && this.state !== 'fight' && this.state !== 'flee') {
      const d = Math.hypot(pp.x - this.pos.x, pp.z - this.pos.z);
      if (d < 0.75 && P.speedNow > 4 && this.state !== 'vendor' && this.state !== 'bench') {
        this.pos.x += (this.pos.x - pp.x) / (d || 1) * 0.5; this.pos.z += (this.pos.z - pp.z) / (d || 1) * 0.5;
        if (this.t - (this.bumpT || -9) > 4) { this.bumpT = this.t; this.say('bumped', 2.5, true); }
      } else if (d < 3.2 && this.t - this.greeted > 40 && Math.random() < dt * 0.6 && this.state !== 'bench') {
        this.greeted = this.t; this.say(this.kind === 'cop' ? 'cop' : this.greetCtx(), 3);
      }
    }
    if (this.kind === 'cop' && this.state === 'chase') { this.sayT -= dt; if (this.sayT <= 0) this.say('copChase', 2.5); }

    if (moveSpeed > 0) {
      this.pos.x += mvx * moveSpeed * dt; this.pos.z += mvz * moveSpeed * dt;
      this.yaw = angleLerp(this.yaw, Math.atan2(mvx, mvz), Math.min(1, dt * 8));
      if (this.state !== 'walk') G.colliders.resolveCircle(this.pos, 0.3, 0, this._co || (this._co = { hit: false }), 'vehonly');
    }
    this.checkVehicles(dt);
    if (this.state !== 'bench') this.pos.y = G.walkables.height(this.pos.x, this.pos.z);
    if (near) {
      this.phase += dt * moveSpeed * 2.6;
      if (this.singer && pose === 'walk') pose = 'swag';
      if (pose === 'walk' && moveSpeed < 0.15) pose = 'idle';
      if (pose === 'idle' || pose === 'call' || pose === 'talk') this.phase += dt * 2;
      animateHuman(this.h, this.phase, clamp(moveSpeed / 3, 0, 1), pose);
    }
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.set(0, this.yaw, 0);
  }

  updateDown(dt) {
    this.vy = (this.vy || 0) - 16 * dt;
    this.pos.x += this.vx * dt; this.pos.z += this.vz * dt; this.pos.y = Math.max(0, this.pos.y + this.vy * dt);
    this.vx *= Math.exp(-dt * 3); this.vz *= Math.exp(-dt * 3);
    G.colliders.resolveCircle(this.pos, 0.3, 0, this._co || (this._co = { hit: false }), 'vehonly');
    animateHuman(this.h, 0, 0, 'down');
    this.mesh.position.set(this.pos.x, this.pos.y + 0.2, this.pos.z);
    this.mesh.rotation.set(-Math.PI / 2, this.yaw, 0, 'YXZ');
    if (!this.dead) {
      this.downT -= dt;
      if (this.downT <= 0) { this.down = false; if (this.kind === 'cop') this.hostile = true; else this.flee(G.player.worldPos()); }
    }
    this.checkVehicles(dt);
  }

  checkVehicles(dt) {
    // look out for oncoming vehicles: step briskly out of their path (and turn to look at them)
    if (!this.dead && !this.down && this.state !== 'bench' && this.state !== 'vendor') for (const v of G.vehicles) {
      const sp = Math.hypot(v.vx, v.vz); if (sp < 4 || (v.alt || 0) > 1.5) continue;
      const dx = this.pos.x - v.pos.x, dz = this.pos.z - v.pos.z; if (dx * dx + dz * dz > 400) continue;
      const fx = v.vx / sp, fz = v.vz / sp, along = dx * fx + dz * fz, lat = dx * -fz + dz * fx;
      if (along > 0 && along < v.cfg.length / 2 + sp * 0.9 && Math.abs(lat) < v.cfg.width / 2 + 0.9) {
        const s2 = lat >= 0 ? 1 : -1, step = Math.min(4.5, 2 + sp * 0.15) * dt;
        const nx = this.pos.x - fz * s2 * step, nz = this.pos.z + fx * s2 * step;
        if (!G.colliders.pointBlocked(nx, nz)) { this.pos.x = nx; this.pos.z = nz; }
        this.dodgeT = 0.6;
      }
    }
    for (const v of G.vehicles) {
      const dx = this.pos.x - v.pos.x, dz = this.pos.z - v.pos.z;
      const reach = v.cfg.length / 2 + 1.2;
      if (Math.abs(dx) > reach || Math.abs(dz) > reach) continue;
      const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
      const along = dx * fx + dz * fz, lat = dx * -fz + dz * fx;
      if (Math.abs(along) > v.cfg.length / 2 + 0.3 || Math.abs(lat) > v.cfg.width / 2 + 0.3) continue;
      const sp = Math.hypot(v.vx, v.vz);
      if (sp > 3.5) {
        if (this.dead) { v.vx *= 0.97; v.vz *= 0.97; continue; }
        const byPlayer = v.driver === 'player';
        this.knock(v.pos.x - fx * 2, v.pos.z - fz * 2, sp * 0.8 + 2, sp * 7);
        this.vx += v.vx * 0.6; this.vz += v.vz * 0.6;
        if (byPlayer) {
          G.police.addCrime(this.dead ? (this.kind === 'cop' ? 'copkill' : 'murder') : this.kind === 'cop' ? 'copassault' : 'hitped', this.pos);
          G.cam.shake = 0.3;
          if (this.dead) G.stats.kills++;
        }
      } else {
        // push out gently
        const push = (v.cfg.width / 2 + 0.3) - Math.abs(lat);
        this.pos.x += -fz * Math.sign(lat) * push; this.pos.z += fx * Math.sign(lat) * push;
      }
    }
  }

  dispose() { G.scene.remove(this.mesh); G.hud && G.hud.removeSpeech(this); }
}

/* ================================================================ */
export class PedManager {
  constructor() { this.target = 40; this.cap = 90; this.timer = 0; this.strollT = 0; this.spotT = 0; }
  full(extra = 0) { return G.peds.length + extra >= this.cap; }

  /** A driver honks: pedestrians just ahead step aside and shout. */
  onHonk(v) {
    if (this._honkT && G.time - this._honkT < 1.5) return; this._honkT = G.time;
    const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
    let said = false;
    for (const p of G.peds) {
      if (p.dead || p.down || p.state === 'vendor' || p.state === 'bench') continue;
      const dx = p.pos.x - v.pos.x, dz = p.pos.z - v.pos.z, along = dx * fx + dz * fz, lat = dx * -fz + dz * fx;
      if (along < 0 || along > 14 || Math.abs(lat) > 4) continue;
      const side = Math.sign(lat) || 1; p.pos.x += -fz * side * 1.2; p.pos.z += fx * side * 1.2;
      if (!said) { said = true; p.say('honked', 2.5, true); p.yaw = Math.atan2(-dx, -dz); }
    }
  }

  /** Promenade crowd: groups of 1–3 strolling up and down the sea front (busiest in the evening). */
  spawnStrollers(pp) {
    if (this.full(4)) return;
    const h = G.env.hour, busy = h > 16 && h < 21 ? 1 : h > 6 && h < 10 ? 0.7 : h > 21 || h < 5 ? 0.15 : 0.45;
    const want = Math.round(40 * busy * (G.settings.quality === 'low' ? 0.3 : G.settings.quality === 'medium' ? 0.6 : 1) * (G.env.rain > 0.5 ? 0.3 : 1));
    const have = G.peds.filter((p) => p.state === 'stroll' && !p.leader).length;
    if (have >= Math.ceil(want / 2)) return;
    const z = clamp(pp.z + rand(-110, 110), -440, 290);
    if (Math.abs(z - pp.z) < 25 && Math.abs(pp.x - 505) < 30) return;
    if (z > -182 && z < -138) return;
    const onSand = z > -60 && Math.random() < 0.35;
    const lane = onSand ? rand(526, 534) : rand(501.5, 507.5), dir = Math.random() < 0.5 ? 1 : -1;
    if (Math.random() < 0.2 && G.peds.filter((p) => p.prop).length < 4) {   // balloon / candy-floss / drum sellers walking the sea front
      const n = Math.random() < 0.3 ? 2 : 1, prop = pick(['balloons', 'balloons', 'candy', 'drums']);
      let first = null;
      for (let i = 0; i < n; i++) {
        const v = this.spawnAt(lane + i * 0.9, z - i * 0.6, randomLook('vendor'), 'civ');
        v.prop = prop; vendorProp(v.h, prop); v.sayT = rand(2, 8);
        if (i === 0) { first = v; v.state = 'stroll'; v.lane = lane; v.dir = dir; v.yaw = dir > 0 ? 0 : Math.PI; v.speed = rand(0.55, 0.8); }
        else { v.state = 'stroll'; v.leader = first; v.slot = [0.9, 0.3]; }
      }
      return;
    }
    const kind = this.pickGroupKind();
    const leader = this.spawnGroup(kind, lane, z, 'stroll');
    leader.lane = lane; leader.dir = dir; leader.yaw = dir > 0 ? 0 : Math.PI; leader.speed = rand(0.85, 1.2);
  }

  pickGroupKind() {
    const r = Math.random();
    return r < 0.17 ? 'family' : r < 0.29 ? 'couple' : r < 0.47 ? 'boys' : r < 0.70 ? 'girls' : r < 0.80 ? 'mixed' : r < 0.94 ? 'tourists' : 'single';
  }

  /** Spawn a group (leader + followers in formation) of a given kind. */
  spawnGroup(kind, x, z, state) {
    const looks = {
      family: () => [randomLook('civ'), randomLook('civ'), randomLook('civ'), ...(Math.random() < 0.5 ? [randomLook('civ')] : [])],
      couple: () => [randomLook('youthM'), randomLook('youthF')],
      boys: () => Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => randomLook('youthM')),
      girls: () => Array.from({ length: 3 + Math.floor(Math.random() * 2) }, () => randomLook('youthF')),
      mixed: () => [randomLook('youthM'), randomLook('youthF'), randomLook('youthM'), randomLook('youthF')],
      tourists: () => Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => randomLook('tourist')),
      single: () => [null],
    }[kind]();
    if (kind === 'family') { looks[2].h = 0.62; looks[2].shorts = !looks[2].female; if (looks[3]) looks[3].h = 0.72; } // children
    const SLOTS = [[0.75, 0.1], [-0.75, 0.1], [0.4, 1.0], [-0.4, 1.0], [1.15, 1.0]];
    const members = [];
    looks.forEach((lk, i) => {
      const p = this.spawnAt(x + (SLOTS[i - 1] ? SLOTS[i - 1][0] : 0), z, lk, 'civ');
      p.state = state;
      if (i > 0) { p.leader = members[0]; p.slot = SLOTS[(i - 1) % SLOTS.length]; p.state = 'stroll'; }
      members.push(p);
    });
    if (members.length > 1) { members[0].members = members; members[0].groupKind = kind; members[0].followers = true; }
    return members[0];
  }

  /** Tourist groups and gangs of friends exploring White Town's streets. */
  spawnWhiteTownGroup(pp) {
    if (this.full(4)) return;
    const have = G.peds.filter((p) => p.members && p.state !== 'stroll' && p.state !== 'bench').length;
    if (have >= 5) return;
    for (let k = 0; k < 6; k++) {
      const a = Math.random() * Math.PI * 2, r = rand(40, 110);
      const ne = G.roads.nearestEdge(pp.x + Math.cos(a) * r, pp.z + Math.sin(a) * r, 30);
      if (!ne || ne.edge.kind !== 'city') continue;
      const side = Math.random() < 0.5 ? 1 : -1;
      const pt = G.roads.lanePoint(ne.edge, ne.edge.a, ne.t, (ne.edge.w / 2 + 1.6) * side, {});
      if (pt.x < 242 && Math.random() < 0.6) continue; // mostly White Town
      const kind = Math.random() < 0.45 ? 'tourists' : ['boys', 'girls', 'mixed', 'couple', 'family'][Math.floor(Math.random() * 5)];
      const L = this.spawnGroup(kind, pt.x, pt.z, 'walk');
      L.speed = rand(0.9, 1.15);
      L.nav = { e: ne.edge, from: ne.edge.a, t: ne.t, side };
      return;
    }
  }

  /** Gangs hanging out on parked two-wheelers by Beach Road and sitting on the Gandhi Thidal steps. */
  spawnHangouts(pp) {
    if (this.full(4)) return;
    const W = G.world;
    if (!W.hangouts) {
      W.hangouts = [];
      for (const z of [-205, -190, -128, -112, -60, -35, 20, 60, 95, 140]) W.hangouts.push({ x: 495.7, z, bike: true });
      for (const st of (W.thidal ? W.thidal.steps : [])) if (Math.random() < 0.6) W.hangouts.push({ x: st.x, z: st.z, steps: true });
    }
    const h = G.env.hour; if (G.env.rain > 0.5 || (h > 1 && h < 6)) return;
    for (const s of W.hangouts) {
      if (s.ped && G.peds.includes(s.ped) && !s.ped.dead) continue;
      if (Math.hypot(s.x - pp.x, s.z - pp.z) > 110 || Math.hypot(s.x - pp.x, s.z - pp.z) < 10) continue;
      if (s.bike) {
        // a parked scooter/bike with one lad sitting sideways on it and friends standing around
        if (!s.v || !G.vehicles.includes(s.v) || s.v.driver) { s.v = new Vehicle(pick(['scooter', 'scooter', 'motorcycle', 'twostroke', 'vintage', 'commuter', 'retro80']), s.x, s.z, Math.PI, { parked: true }); G.vehicles.push(s.v); }
        const girls = Math.random() < 0.25, kind = girls ? 'girls' : 'boys';
        const look = () => randomLook(girls ? 'youthF' : 'youthM');
        const sitter = this.spawnAt(s.x, s.z, look(), 'civ');
        sitter.home = { x: s.x - 0.05, z: s.z + 0.25, y: 0.12 }; sitter.homeYaw = Math.PI / 2; sitter.state = 'bench'; sitter.onBike = true;
        const members = [sitter];
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const q = this.spawnAt(s.x - 1.1 - (i % 2) * 0.5, s.z - 0.8 + i * 0.8, look(), 'civ');
          q.home = { x: q.pos.x, z: q.pos.z }; q.homeYaw = Math.atan2(s.x - q.pos.x, s.z - q.pos.z); q.state = 'bench'; q.standHang = true;
          members.push(q);
        }
        sitter.members = members; sitter.groupKind = kind; s.ped = sitter;
      } else if (s.steps && Math.random() < 0.7) {
        const kind = Math.random() < 0.55 ? 'boys' : 'girls';
        const members = [];
        for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
          const p = this.spawnAt(s.x, s.z + i * 0.6, randomLook(kind === 'boys' ? 'youthM' : 'youthF'), 'civ');
          p.home = { x: s.x, z: s.z + i * 0.6, y: -0.22 }; p.homeYaw = -Math.PI / 2; p.state = 'bench';
          members.push(p);
        }
        members[0].members = members; members[0].groupKind = kind; s.ped = members[0];
      } else s.ped = { dead: false };
    }
  }

  /** Random pullingo lads strolling with a phone speaker, singing gaana. */
  spawnSinger(pp) {
    if (this.full(4)) return;
    if (G.peds.filter((p) => p.singer && !p.dead).length >= 3) return;
    for (let k = 0; k < 6; k++) {
      const a = Math.random() * Math.PI * 2, r = rand(35, 90);
      const ne = G.roads.nearestEdge(pp.x + Math.cos(a) * r, pp.z + Math.sin(a) * r, 30);
      if (!ne || ne.edge.kind === 'highway') continue;
      const side = Math.random() < 0.5 ? 1 : -1;
      const pt = G.roads.lanePoint(ne.edge, ne.edge.a, ne.t, (ne.edge.w / 2 + 1.6) * side, {});
      const look = pullingoLook();
      const p = this.spawnAt(pt.x, pt.z, look, 'civ');
      p.singer = true; p.speed = rand(1.0, 1.25); p.nav = { e: ne.edge, from: ne.edge.a, t: ne.t, side };
      if (Math.random() < 0.5) { // a mate joins in
        const l2 = pullingoLook();
        const q = this.spawnAt(pt.x + 0.8, pt.z, l2, 'civ'); q.state = 'stroll'; q.leader = p; q.slot = [0.8, 0.2];
        p.members = [p, q]; p.groupKind = 'boys';
      }
      return;
    }
  }

  /** Original gaana/kuthu beat from the nearest singer's phone speaker (gets louder as you get closer). */
  updateBeat(pp) {
    const A = G.audio; if (!A || !A.ready || !G.radio) return;
    let best = null, bd = 30;
    for (const p of G.peds) if (p.singer && !p.dead && !p.down && p.state !== 'flee') { const d = Math.hypot(p.pos.x - pp.x, p.pos.z - pp.z); if (d < bd) { bd = d; best = p; } }
    if (!best || G.paused) { this.beatT = null; return; }
    const ctx = A.ctx, vol = (1 - bd / 30) * 0.5 * (G.player.vehicle ? 0.4 : 1), sd = 60 / 156 / 4;
    if (!this.beatT || this.beatT < ctx.currentTime) { this.beatT = ctx.currentTime + 0.05; this.beatStep = 0; }
    const R = G.radio, out = A.master;
    const low = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0], high = [0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1];
    const mel = [7, 0, 9, 0, 7, 5, 4, 0, 5, 0, 4, 2, 0, 0, 2, 4];
    while (this.beatT < ctx.currentTime + 0.15) {
      const st = this.beatStep % 16, bar = Math.floor(this.beatStep / 16) % 4;
      if (low[st]) R.drumLow(this.beatT, 0.5 * vol, out);
      if (high[st]) R.drumHigh(this.beatT, 0.2 * vol, out);
      if (st === 4 || st === 12) R.clap(this.beatT, 0.18 * vol, out);
      if (mel[st] && bar % 2 === 0) R.pluck(220 * Math.pow(2, (mel[st] + (bar === 2 ? 2 : 0)) / 12), this.beatT, 0.12 * vol, out);
      this.beatT += sd; this.beatStep++;
    }
  }

  /** Couples sitting together on the sea wall or the sand, watching the waves and talking. */
  spawnCouples(pp) {
    if (this.full(4)) return;
    const W = G.world; W.coupleSpots = W.coupleSpots || [];
    if (!W.coupleSpots.length) {
      for (let z = -425; z < 285; z += 13) W.coupleSpots.push({ x: 513.3, z: z + 4, sand: false });
      for (let z = -40; z < 280; z += 11) if (!((z > 55 && z < 80) || (z > 195 && z < 220))) W.coupleSpots.push({ x: 527 + (z % 3), z, sand: true });
    }
    const h = G.env.hour; if (G.env.rain > 0.5 || (h > 1 && h < 6)) return;
    const busy = h > 16 && h < 23 ? 2 : 4;
    W.coupleSpots.forEach((s, i) => {
      if ((i * 3 + Math.floor(h / 3)) % busy !== 0) return;
      if (s.ped && G.peds.includes(s.ped) && !s.ped.dead) return;
      if (Math.abs(s.z - pp.z) > 100 || Math.abs(s.x - pp.x) > 120 || Math.hypot(s.x - pp.x, s.z - pp.z) < 12) return;
      const kind = Math.random() < 0.7 ? 'couple' : Math.random() < 0.5 ? 'girls' : 'boys';
      const n = kind === 'couple' ? 2 : 3;
      const looks = kind === 'couple' ? [randomLook('youthM'), randomLook('youthF')] : Array.from({ length: n }, () => randomLook(kind === 'girls' ? 'youthF' : 'youthM'));
      const members = looks.map((lk, j) => {
        const p = this.spawnAt(s.x, s.z + j * 0.62, lk, 'civ');
        p.home = { x: s.x, z: s.z + j * 0.62 }; p.homeYaw = Math.PI / 2 + (j === 0 ? 0.15 : -0.15); p.state = 'bench'; p.onWall = !s.sand; p.onSand = s.sand;
        return p;
      });
      members[0].members = members; members[0].groupKind = kind; s.ped = members[0];
    });
  }

  /** Vendors at tea stalls/carts and people on benches near the player. */
  spawnSpots(pp) {
    const W = G.world;
    this.spawnCafe(pp, W);
    if (this.full(4)) return;
    for (const s of W.shops || []) this.spot(s, pp, () => ({ x: s.vendor.x, z: s.vendor.z, yaw: s.vendor.yaw, kind: s.type, call: SHOP_TYPES[s.type].call }));
    const hr = G.env.hour, wallBusy = hr > 16.5 || hr < 1 ? 3 : 7; // dusk and night: lots of people on the wall
    (W.wallSeats || []).forEach((b, i) => {
      if ((i * 5 + Math.floor(hr)) % wallBusy !== 0 || G.env.rain > 0.5) return;
      this.spot(b, pp, () => ({ x: b.x, z: b.z, yaw: Math.PI / 2, kind: 'bench', wall: true }));
    });
    (W.benches || []).forEach((b, i) => {
      if ((i * 7 + Math.floor(G.env.hour)) % 3 !== 0) return; // about a third of benches are taken
      this.spot(b, pp, () => ({ x: b.x, z: b.z + (Math.random() - 0.5) * 0.9, yaw: Math.PI / 2, kind: 'bench' }));
    });
  }
  /** Café customers have their own allowance on top of the street crowd, so the café is never empty. */
  spawnCafe(pp, W) {
    const hr = G.env.hour, cafeCap = G.settings.quality === 'low' || G.isTouch ? 8 : G.settings.quality === 'medium' ? 14 : 22;
    if (W.cafeTableSpots && Math.hypot(CAFE.x - pp.x, CAFE.z - pp.z) < 85 && !(W.cafeWaiter && G.peds.includes(W.cafeWaiter) && !W.cafeWaiter.dead)) {
      const lk = randomLook('civ'); lk.female = false; lk.shirt = 0xf4f4f0; lk.shirtPat = 'plain'; lk.longSleeve = true; lk.pants = 0x1c1c1c; lk.tropical = -1; lk.lungi = false; lk.dhoti = false; lk.vest = false;
      const wt = this.spawnAt(CAFE.x + 1.5, CAFE.z - 10.4, lk, 'civ'); wt.state = 'waiter'; wt.prop = 'tray'; vendorProp(wt.h, 'tray'); W.cafeWaiter = wt;
    }
    for (const s of W.shops || []) if (s.type === 'coffee') this.spot(s, pp, () => ({ x: s.vendor.x, z: s.vendor.z, yaw: s.vendor.yaw, kind: 'coffee', call: 'vendorTea' }));
    if (W.cafeSeats && Math.hypot(CAFE.x - pp.x, CAFE.z - pp.z) < 85) {
      if (!W.cafeTables) { const by = {}; for (const st of W.cafeSeats) (by[st.table] ??= []).push(st); W.cafeTables = Object.values(by); }
      W.cafeTables.forEach((list, i) => {
        if ((i * 3 + Math.floor(hr)) % 4 === 0 || (hr > 0.5 && hr < 6.5)) return;     // a few tables free; quiet before dawn
        if (list.ped && G.peds.includes(list.ped) && !list.ped.dead) return;
        if (G.peds.filter((q) => q.chair).length >= cafeCap) return;
        const kind = pick(['friendsM', 'friendsF', 'couple', 'family', 'tourists', 'mixed']);
        const n = kind === 'couple' ? 2 : 2 + Math.floor(Math.random() * 3);
        const lookFor = (j) => kind === 'couple' ? randomLook(j ? 'youthF' : 'youthM') : kind === 'friendsM' ? randomLook('youthM') : kind === 'friendsF' ? randomLook('youthF') : kind === 'tourists' ? randomLook('tourist') : kind === 'mixed' ? randomLook(j % 2 ? 'youthF' : 'youthM') : randomLook('civ');
        const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5), members = [];
        for (let j = 0; j < n; j++) {
          const st = list[order[j]], p = this.spawnAt(st.x, st.z, lookFor(j), 'civ');
          p.home = { x: st.x, z: st.z, y: CAFE.floor + CAFE.seatY }; p.homeYaw = st.yaw; p.yaw = st.yaw; p.state = 'bench'; p.chair = true; p.sayT = rand(2, 24);
          members.push(p);
        }
        for (let j = 0; j < members.length; j++) members[j].mate = members[(j + 1) % members.length];
        if (members.length > 1) { members[0].members = members; members[0].groupKind = kind; }
        list.ped = members[0];
      });
    }
  }
  spot(s, pp, make) {
    if (s.ped && G.peds.includes(s.ped) && !s.ped.dead) return;
    if (Math.hypot(s.x - pp.x, s.z - pp.z) > 110) return;
    const m = make();
    let vl = randomLook(m.kind === 'flowers' ? 'civ' : 'vendor'); if (m.kind === 'flowers') { vl.female = true; }
    if (m.kind === 'seafood') { for (let k = 0; k < 30 && !vl.female; k++) vl = randomLook('civ'); vl.female = true; vl.saree = true; }
    const p = this.spawnAt(m.x, m.z, m.kind === 'bench' ? null : (m.kind === 'flowers' ? null : vl), 'civ');
    p.home = { x: m.x, z: m.z }; p.homeYaw = m.yaw; p.yaw = m.yaw;
    p.state = m.kind === 'bench' ? 'bench' : 'vendor'; p.vendorKind = m.kind; p.callCtx = m.call; p.onWall = !!m.wall;
    s.ped = p;
    if (m.kind === 'bench' && Math.random() < 0.5) { // a companion on the same bench
      const q = this.spawnAt(m.x, m.z + 0.7, null, 'civ'); q.home = { x: m.x, z: m.z + 0.7 }; q.homeYaw = m.yaw; q.state = 'bench'; q.onWall = !!m.wall; q.mate = p; p.mate = q;
    }
  }

  spawnAt(x, z, look, kind = 'civ') {
    if (!look && kind === 'civ') { look = randomLook('civ'); if (G.env && G.env.rain > 0.4 && Math.random() < 0.7) look.umbrella = pick([0x111111, 0x1565c0, 0xc62828, 0x6a1b9a, 0x2e7d32]); }
    const p = new Ped(x, z, look, kind);
    G.peds.push(p);
    return p;
  }

  /** Make nearby peds run away from a point. */
  panic(pos, radius, except) {
    for (const p of G.peds) {
      if (p === except || p.dead || p.down || p.kind === 'cop' || p.state === 'vendor') continue;
      if (Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z) < radius && p.state !== 'fight') p.flee(pos);
    }
  }

  trySpawn() {
    if (this.full(4)) return;
    const pp = G.player.worldPos();
    for (let k = 0; k < 6; k++) {
      const a = Math.random() * Math.PI * 2, r = rand(45, 130);
      const x = pp.x + Math.cos(a) * r, z = pp.z + Math.sin(a) * r;
      const ne = G.roads.nearestEdge(x, z, 40);
      if (!ne || ne.edge.kind === 'highway') continue;
      const side = Math.random() < 0.5 ? 1 : -1;
      const pt = G.roads.lanePoint(ne.edge, ne.edge.a, ne.t, (ne.edge.w / 2 + 1.6) * side, {});
      if (G.colliders.pointBlocked(pt.x, pt.z)) continue;
      const p = this.spawnAt(pt.x, pt.z, null, Math.random() < 0.05 ? 'cop' : 'civ');
      p.nav = { e: ne.edge, from: ne.edge.a, t: ne.t, side };
      if (Math.random() < 0.5) { p.nav.from = ne.edge.b; p.nav.t = ne.edge.len - ne.t; p.nav.side = -side; }
      return;
    }
  }

  update(dt) {
    const pp = G.player.worldPos();
    const target = this.target;
    this.timer -= dt;
    const alive = G.peds.filter((p) => !p.dead).length;
    if (this.timer <= 0 && alive < target) { this.timer = 0.15; this.trySpawn(); }
    // sea-front crowd and fixed characters
    this.strollT -= dt;
    if (this.strollT <= 0 && pp.x > 400 && pp.z > -500 && pp.z < 340) { this.strollT = 0.5; this.spawnStrollers(pp); this.spawnCouples(pp); this.spawnHangouts(pp); }
    this.singerT = (this.singerT || 0) - dt;
    if (this.singerT <= 0) { this.singerT = 4; this.spawnSinger(pp); }
    this.updateBeat(pp);
    this.groupT = (this.groupT || 0) - dt;
    if (this.groupT <= 0 && pp.x > -420 && pp.x < 500 && pp.z > -470 && pp.z < 320) { this.groupT = 2.5; this.spawnWhiteTownGroup(pp); }
    this.spotT -= dt;
    if (this.spotT <= 0) { this.spotT = 1.5; this.spawnSpots(pp); }
    for (let i = G.peds.length - 1; i >= 0; i--) {
      const p = G.peds[i];
      const d = Math.hypot(p.pos.x - pp.x, p.pos.z - pp.z);
      if (d > 170 || (p.dead && G.time > p.removeAt)) { p.dispose(); G.peds.splice(i, 1); continue; }
      p.update(dt, d < 90);
    }
  }

  clear() { for (const p of G.peds) p.dispose(); G.peds.length = 0; }
}
