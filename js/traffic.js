// AI traffic (left-hand Indian traffic with signals, honking and congestion) and police pursuit driving.
import * as THREE from 'three';
import { G } from './state.js';
import { Vehicle, collideVehicles, VTYPES } from './vehicle.js';
import { clamp, rand, pick, wrapAngle } from './utils.js';
import { randomLook } from './models.js';

const SIGNAL_CYCLE = [9, 2.5, 9, 2.5];

export class Traffic {
  constructor() {
    this.timer = 0; this.phase = 0; this.phaseT = SIGNAL_CYCLE[0];
    this.target = 38;
    this._scan = [];
  }

  /* ------------------------- signals ------------------------- */
  updateSignals(dt) {
    this.phaseT -= dt;
    if (this.phaseT <= 0) { this.phase = (this.phase + 1) % 4; this.phaseT = SIGNAL_CYCLE[this.phase]; G.world.setSignalPhase(this.phase); }
  }
  /** Can a vehicle travelling along a vertical (N-S) or horizontal edge pass a signal now? */
  green(vertical) { return vertical ? this.phase === 0 : this.phase === 2; }
  amber(vertical) { return vertical ? this.phase === 1 : this.phase === 3; }

  /* ------------------------- spawning ------------------------- */
  randomType() {
    const r = Math.random();
    // Pondicherry mix: two-wheelers dominate, then cars and autos, a few cycles and buses
    if (r < 0.27) return Math.random() < 0.6 ? 'motorcycle' : pick(['twostroke', 'commuter', 'commuter', 'moped']);
    if (r < 0.47) return Math.random() < 0.65 ? 'scooter' : pick(['vintage', 'retro80', 'moped']);
    if (r < 0.54) return 'cycle';
    if (r < 0.73) return 'car';
    if (r < 0.85) return 'auto';
    if (r < 0.90) return 'bus';
    if (r < 0.95) return 'taxi';
    return 'police';
  }

  spawnOnEdge(e, from, t, type, mode = 'traffic') {
    const R = G.roads;
    const laneOff = this.laneOffset(e, type);
    const p = R.lanePoint(e, from, t, laneOff, {});
    // clearance
    for (const v of G.vehicles) if (Math.abs(v.pos.x - p.x) < 9 && Math.abs(v.pos.z - p.z) < 9) return null;
    const pp = G.player.worldPos(); if (Math.hypot(p.x - pp.x, p.z - pp.z) < 25) return null;
    const v = new Vehicle(type, p.x, p.z, Math.atan2(p.dx, p.dz), { siren: false });
    v.driver = { ai: true };
    v.ai = { mode, edge: e.id, from, next: null, cruise: this.cruiseFor(e, type), stuckT: 0, reverseT: 0, angry: 0, blockedT: 0 };
    const sp = v.ai.cruise * 0.8; v.vx = p.dx * sp; v.vz = p.dz * sp;
    if (v.model.riderVisible) v.addRider(randomLook(type === 'police' ? 'police' : 'civ'));
    G.vehicles.push(v);
    return v;
  }

  laneOffset(e, type) {
    const base = e.w / 4;
    if (VTYPES[type] && VTYPES[type].twoWheel) return base + (type === 'cycle' ? 1.6 : 0.9);
    if (type === 'auto') return base + 0.4;
    return base;
  }
  cruiseFor(e, type) {
    const c = VTYPES[type];
    const lim = e.kind === 'highway' ? rand(17, 23) : e.kind === 'village' ? rand(9, 12) : rand(10, 14);
    return Math.min(c.maxSpeed * 0.85, lim);
  }

  trySpawn() {
    const R = G.roads, pp = G.player.worldPos();
    for (let k = 0; k < 8; k++) {
      const a = Math.random() * Math.PI * 2, r = rand(90, 230);
      const ne = R.nearestEdge(pp.x + Math.cos(a) * r, pp.z + Math.sin(a) * r, 60);
      if (!ne || ne.edge.len < 20) continue;
      const e = ne.edge, from = Math.random() < 0.5 ? e.a : e.b;
      const t = clamp(from === e.a ? ne.t : e.len - ne.t, 8, e.len - 15);
      if (t <= 8 || t >= e.len - 15) continue;
      if (Math.random() < 0.12 && e.kind === 'city') return this.spawnParked(e, t);
      if (this.spawnOnEdge(e, from, t, this.randomType())) return;
    }
  }

  spawnParked(e, t) {
    const R = G.roads, side = Math.random() < 0.5 ? 1 : -1;
    const type = pick(['car', 'car', 'scooter', 'scooter', 'motorcycle', 'auto', 'cycle', 'vintage', 'twostroke', 'commuter', 'retro80', 'moped']);
    const p = R.lanePoint(e, e.a, t, (e.w / 2 - (type === 'car' || type === 'auto' ? 1.0 : 0.6)) * side, {});
    // two-wheelers park angled to the kerb, like everywhere in Pondy
    for (const v of G.vehicles) if (Math.abs(v.pos.x - p.x) < 7 && Math.abs(v.pos.z - p.z) < 7) return;
    const v = new Vehicle(type, p.x, p.z, Math.atan2(p.dx, p.dz) + (side > 0 ? 0 : Math.PI), { parked: true });
    G.vehicles.push(v);
  }

  /* ------------------------- per-frame ------------------------- */
  update(dt) {
    this.updateSignals(dt);
    const pp = G.player.worldPos();
    const target = this.target;
    const aiCount = G.vehicles.filter((v) => v.ai && v.ai.mode === 'traffic').length;
    this.timer -= dt;
    if (this.timer <= 0 && aiCount < target) { this.timer = 0.2; this.trySpawn(); }

    for (let i = G.vehicles.length - 1; i >= 0; i--) {
      const v = G.vehicles[i];
      const d = Math.hypot(v.pos.x - pp.x, v.pos.z - pp.z);
      const keep = v.driver === 'player' || v === G.player.vehicle || (G.missions && G.missions.isMissionVehicle(v));
      if (!keep) {
        if ((v.persistent && d > 320 && v.home) && (v.destroyed || Math.hypot(v.pos.x - v.home.x, v.pos.z - v.home.z) > 5)) {
          // reset persistent vehicle back home when far away
          v.dispose(); G.vehicles.splice(i, 1);
          const nv = new Vehicle(v.type, v.home.x, v.home.z, v.home.h, { persistent: true, parked: true, color: v.model.paint.color.getHex() });
          G.vehicles.push(nv); continue;
        }
        if (!v.persistent && (d > 280 || (v.destroyed && G.time > v.removeAt && d > 60))) {
          if (v.ai && v.ai.mode === 'police') G.police.forget(v);
          v.dispose(); G.vehicles.splice(i, 1); continue;
        }
      }
      if (v.driver === 'player') continue; // the player updates their own vehicle
      const ctl = this._ctl || (this._ctl = { throttle: 0, steer: 0, handbrake: false });
      ctl.throttle = 0; ctl.steer = 0; ctl.handbrake = false;
      if (v.ai && !v.destroyed) {
        if (v.ai.mode === 'traffic') this.driveTraffic(v, dt, ctl);
        else if (v.ai.mode === 'police') this.drivePolice(v, dt, ctl);
      } else { ctl.handbrake = true; }
      if (d > 200 && v.ai && v.ai.mode === 'traffic') { // cheap far update
        v.update(dt, ctl); continue;
      }
      v.update(dt, ctl);
    }
    collideVehicles(G.vehicles);
  }

  chooseNext(e, nodeId) {
    const R = G.roads, node = R.nodes[nodeId];
    const opts = node.edges.filter((id) => id !== e.id);
    if (!opts.length) return e.id; // dead end: U-turn
    // prefer going straight
    const straight = opts.find((id) => R.edges[id].vertical === e.vertical);
    if (straight !== undefined && Math.random() < 0.55) return straight;
    return pick(opts);
  }

  /** Look ahead for obstacles; returns the max safe speed. */
  obstacleSpeed(v, dt, desired) {
    const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
    const look = 8 + Math.abs(v.speed) * 1.4;
    let maxS = desired, blocker = null;
    const halfW = v.cfg.width / 2;
    const test = (ox, oz, ow, ol, who) => {
      const dx = ox - v.pos.x, dz = oz - v.pos.z;
      const along = dx * fx + dz * fz; if (along <= 0 || along > look + ol) return;
      const lat = Math.abs(dx * -fz + dz * fx); if (lat > halfW + ow + 0.5) return;
      const gap = along - v.cfg.length / 2 - ol;
      const s = Math.max(0, (gap - 1.5) * 0.9);
      if (s < maxS) { maxS = s; blocker = who; }
    };
    for (const o of G.vehicles) {
      if (o === v || Math.abs(o.pos.x - v.pos.x) > 30 || Math.abs(o.pos.z - v.pos.z) > 30) continue;
      test(o.pos.x, o.pos.z, o.cfg.width / 2, o.cfg.length / 2, o);
    }
    const P = G.player;
    if (!P.vehicle) test(P.pos.x, P.pos.z, 0.4, 0.4, 'player');
    for (const p of G.peds) { if (Math.abs(p.pos.x - v.pos.x) > 20 || Math.abs(p.pos.z - v.pos.z) > 20) continue; test(p.pos.x, p.pos.z, 0.3, 0.3, p); }
    if (G.animals) for (const a of G.animals.list) { if (Math.abs(a.pos.x - v.pos.x) > 20 || Math.abs(a.pos.z - v.pos.z) > 20) continue; test(a.pos.x, a.pos.z, a.S.r, a.S.len / 2, 'animal'); }  // cows block the road
    return [maxS, blocker];
  }

  driveTraffic(v, dt, ctl) {
    const R = G.roads, ai = v.ai;
    let e = R.edges[ai.edge];
    let A = R.nodes[ai.from], B = R.nodes[R.other(e, ai.from)];
    let dx = (B.x - A.x) / e.len, dz = (B.z - A.z) / e.len;
    let t = (v.pos.x - A.x) * dx + (v.pos.z - A.z) * dz;
    const clearB = (e.vertical ? B.hw : B.vw) / 2;
    if (ai.next === null && t > e.len - 30) ai.next = this.chooseNext(e, B.id);
    // advance to the next edge once inside the junction
    const swAt = e.len - this.laneOffset(e, v.type) - 1.5;
    if (ai.next === null && t > e.len + 10) ai.next = this.chooseNext(e, B.id);
    if (ai.next !== null && t > swAt) {
      ai.from = B.id; ai.edge = ai.next; ai.next = null;
      e = R.edges[ai.edge]; A = B; B = R.nodes[R.other(e, ai.from)];
      dx = (B.x - A.x) / e.len; dz = (B.z - A.z) / e.len;
      t = (v.pos.x - A.x) * dx + (v.pos.z - A.z) * dz;
      ai.cruise = this.cruiseFor(e, v.type);
    }
    const laneOff = this.laneOffset(e, v.type);
    const look = 5 + Math.abs(v.speed) * 0.5;
    let tp;
    if (t + look < e.len || ai.next === null) tp = R.lanePoint(e, ai.from, Math.min(t + look, e.len), laneOff, this._tp || (this._tp = {}));
    else {
      const ne = R.edges[ai.next];
      const rem = t + look - e.len;
      tp = R.lanePoint(ne, B.id, Math.max(rem, laneOff + 1), this.laneOffset(ne, v.type), this._tp || (this._tp = {}));
    }
    // desired speed
    let desired = ai.cruise;
    const distToNode = e.len - t;
    if (ai.next !== null && R.edges[ai.next].vertical !== e.vertical && distToNode < 18) desired = Math.min(desired, 5 + distToNode * 0.3);
    if (B.signal) {
      const stopAt = e.len - clearB - 4.5;
      if (t < stopAt + 0.5 && !this.green(e.vertical)) {
        if (!(this.amber(e.vertical) && stopAt - t < 6)) desired = Math.min(desired, Math.max(0, (stopAt - t) * 0.7));
      }
    }
    const [obs, blocker] = this.obstacleSpeed(v, dt, desired);
    desired = Math.min(desired, obs);
    // impatient honking — this is India after all
    if (blocker && desired < 1 && Math.abs(v.speed) < 1) {
      ai.blockedT += dt;
      if (ai.blockedT > (blocker === 'player' || (blocker.driver === 'player') ? 1.2 : 3) && Math.random() < dt * 1.5) v.honk();
    } else ai.blockedT = 0;
    if (ai.angry > 0) { ai.angry -= dt; if (Math.random() < dt * 2) v.honk(); }

    this.steerTo(v, tp.x, tp.z, desired, ctl, dt);
  }

  steerTo(v, tx, tz, desired, ctl, dt) {
    const ai = v.ai;
    const want = Math.atan2(tx - v.pos.x, tz - v.pos.z);
    let diff = wrapAngle(want - v.heading);
    // stuck handling: reverse out
    if (ai.reverseT > 0) {
      ai.reverseT -= dt; ctl.throttle = -0.8; ctl.steer = -Math.sign(diff) || 1; return;
    }
    if (desired > 2 && Math.abs(v.speed) < 0.6) { ai.stuckT += dt; if (ai.stuckT > (ai.mode === 'police' ? 1.5 : 4)) { ai.stuckT = 0; ai.reverseT = 1.4; } }
    else ai.stuckT = Math.max(0, ai.stuckT - dt);
    if (Math.abs(diff) > 1.2) desired = Math.min(desired, 6);
    ctl.steer = clamp(diff * 2.4, -1, 1);
    const sp = v.speed;
    if (sp < desired - 0.5) ctl.throttle = clamp((desired - sp) * 0.4, 0.2, 1);
    else if (sp > desired + 0.8) ctl.throttle = -clamp((sp - desired) * 0.35, 0.15, 1);
    if (desired < 0.3 && Math.abs(sp) < 0.8) { ctl.throttle = 0; ctl.handbrake = true; }
  }

  /* ------------------------- police pursuit ------------------------- */
  drivePolice(v, dt, ctl) {
    const R = G.roads, ai = v.ai, P = G.player, pp = P.worldPos();
    v.siren = true;
    const d = Math.hypot(pp.x - v.pos.x, pp.z - v.pos.z);
    ai.repath = (ai.repath || 0) - dt;
    const direct = d < 45 && !G.colliders.lineBlocked(v.pos.x, v.pos.z, pp.x, pp.z, 1.0, 3);
    let tx, tz, desired = v.cfg.maxSpeed * 0.92;
    if (direct) {
      const pv = P.vehicle;
      tx = pp.x + (pv ? pv.vx * 0.6 : 0); tz = pp.z + (pv ? pv.vz * 0.6 : 0);
      if (!pv) {
        desired = clamp((d - 9) * 1.2, 0, desired);
        if (d < 16 && !ai.deployed && Math.abs(v.speed) < 3) { G.police.deployCops(v); ai.deployed = true; }
      } else if (d < 10) desired = Math.max(Math.abs(pv.speed) + 4, 8);
    } else {
      if (ai.repath <= 0 || !ai.path) {
        ai.repath = 1.5;
        const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
        const start = R.nearestNode(v.pos.x + fx * 12, v.pos.z + fz * 12);
        const goal = R.nearestNode(pp.x, pp.z);
        ai.path = R.path(start.id, goal.id); ai.idx = 0;
      }
      if (ai.path && ai.idx < ai.path.length) {
        let n = R.nodes[ai.path[ai.idx]];
        if (Math.hypot(n.x - v.pos.x, n.z - v.pos.z) < 9 && ai.idx < ai.path.length - 1) { ai.idx++; n = R.nodes[ai.path[ai.idx]]; }
        tx = n.x; tz = n.z;
        const want = Math.atan2(tx - v.pos.x, tz - v.pos.z);
        if (Math.abs(wrapAngle(want - v.heading)) > 0.7 && Math.hypot(n.x - v.pos.x, n.z - v.pos.z) < 30) desired = 9;
      } else { tx = pp.x; tz = pp.z; }
    }
    // don't plough through other traffic too badly
    const [obs, blocker] = this.obstacleSpeed(v, dt, desired);
    if (blocker && blocker !== 'player' && blocker.driver !== 'player') desired = Math.min(desired, obs + 3);
    this.steerTo(v, tx, tz, desired, ctl, dt);
    if (ai.deployed && d > 40) ai.deployed = false;
  }

  /** Convert a vehicle to normal traffic AI on the nearest road. */
  toTraffic(v) {
    const ne = G.roads.nearestEdge(v.pos.x, v.pos.z, 80);
    if (!ne) { v.ai = null; return; }
    const e = ne.edge;
    const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
    const A = G.roads.nodes[e.a], B = G.roads.nodes[e.b];
    const forwardToB = (B.x - A.x) * fx + (B.z - A.z) * fz > 0;
    v.ai = { mode: 'traffic', edge: e.id, from: forwardToB ? e.a : e.b, next: null, cruise: this.cruiseFor(e, v.type), stuckT: 0, reverseT: 0, angry: 0, blockedT: 0 };
    v.siren = false;
  }

  clear() { for (const v of G.vehicles) v.dispose(); G.vehicles.length = 0; }
}
