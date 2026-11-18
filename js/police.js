// Wanted level, crime reporting, police dispatch, evasion and arrest.
import { G } from './state.js';
import { rand, pick, clamp } from './utils.js';
import { randomLook } from './models.js';
import { t } from './i18n.js';

const CRIMES = { assault: 22, hitped: 30, murder: 70, carjack: 25, copcar: 70, copcarjack: 160, copassault: 140, copkill: 260, ramcop: 45, mission: 0 };
export const THRESH = [0, 40, 150, 320, 580, 950];

export class Police {
  constructor() { this.heat = 0; this.stars = 0; this.lastSeen = 0; this.units = new Set(); this.spawnT = 0; this.evading = false; this.cops = 0; }

  starsFor(h) { let s = 0; for (let i = 1; i < THRESH.length; i++) if (h >= THRESH[i]) s = i; return s; }

  witnessed(pos) {
    for (const v of G.vehicles) if (v.type === 'police' && v.driver && v.driver !== 'player' && Math.hypot(v.pos.x - pos.x, v.pos.z - pos.z) < 80) return true;
    for (const p of G.peds) if (p.kind === 'cop' && !p.dead && Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z) < 60) return true;
    return false;
  }

  addCrime(type, pos) {
    let amt = CRIMES[type] || 20;
    if (!amt) return;
    pos = pos || G.player.worldPos();
    if (!this.witnessed(pos) && this.stars === 0) amt *= 0.55;
    this.heat = Math.min(THRESH[5] + 100, this.heat + amt);
    this.refresh(true);
  }

  setStars(n) { this.heat = Math.max(this.heat, THRESH[n] + 1); this.refresh(true); }

  refresh(seen) {
    const s = this.starsFor(this.heat);
    if (s !== this.stars) {
      if (s > this.stars) { G.hud && G.hud.notify(t('wanted', '★'.repeat(s))); G.audio && G.audio.wantedUp(); }
      this.stars = s;
    }
    if (seen) { this.lastSeen = G.time; this.lastKnown = { ...G.player.worldPos() }; }
  }

  clear() {
    this.heat = 0; this.stars = 0;
    for (const v of [...this.units]) { if (G.vehicles.includes(v) && v.driver !== 'player') G.traffic.toTraffic(v); }
    this.units.clear();
    for (const p of G.peds) if (p.kind === 'cop') { p.state = 'walk'; p.hostile = false; p.snapToSidewalk(); }
  }

  forget(v) { this.units.delete(v); }

  deployCops(v) {
    const n = G.peds.filter((p) => p.kind === 'cop' && !p.dead).length;
    if (n >= 6) return;
    const cnt = this.stars >= 3 ? 2 : 1;
    for (let i = 0; i < cnt; i++) {
      const side = i ? 1 : -1;
      const rx = Math.cos(v.heading) * side * 1.6, rz = -Math.sin(v.heading) * side * 1.6;
      const p = G.pedMgr.spawnAt(v.pos.x + rx, v.pos.z + rz, randomLook('police'), 'cop');
      p.state = 'chase';
    }
  }

  spawnUnit() {
    const R = G.roads, pp = G.player.worldPos();
    for (let k = 0; k < 10; k++) {
      const a = Math.random() * Math.PI * 2, r = rand(90, 170);
      const ne = R.nearestEdge(pp.x + Math.cos(a) * r, pp.z + Math.sin(a) * r, 50);
      if (!ne || ne.edge.len < 20) continue;
      const e = ne.edge;
      // drive towards the player
      const A = R.nodes[e.a], B = R.nodes[e.b];
      const from = Math.hypot(A.x - pp.x, A.z - pp.z) > Math.hypot(B.x - pp.x, B.z - pp.z) ? e.a : e.b;
      const t = clamp(from === e.a ? ne.t : e.len - ne.t, 5, e.len - 5);
      const v = G.traffic.spawnOnEdge(e, from, t, 'police', 'police');
      if (v) { v.siren = true; v.ai.mode = 'police'; this.units.add(v); return v; }
    }
    return null;
  }

  update(dt) {
    const P = G.player;
    if (this.stars === 0) { this.evading = false; this.heat = Math.max(0, this.heat - dt * 2); return; }
    const pp = P.worldPos();
    // are we seen by any police unit?
    let seen = false;
    for (const v of G.vehicles) {
      if (v.type !== 'police' || v.driver === 'player' || !v.driver || v.destroyed) continue;
      const d = Math.hypot(v.pos.x - pp.x, v.pos.z - pp.z);
      if (d < 25 || (d < 75 && !G.colliders.lineBlocked(v.pos.x, v.pos.z, pp.x, pp.z, 1.5, 4))) { seen = true; break; }
      // patrol cars join the chase
      if (d < 120 && v.ai && v.ai.mode === 'traffic') { v.ai.mode = 'police'; v.ai.path = null; this.units.add(v); }
    }
    if (!seen) for (const p of G.peds) if (p.kind === 'cop' && !p.dead && !p.down && Math.hypot(p.pos.x - pp.x, p.pos.z - pp.z) < 30) { seen = true; break; }
    if (seen) this.refresh(true);
    const unseen = G.time - this.lastSeen;
    this.evading = unseen > 2.5;
    const evadeTime = 7 + this.stars * 3;
    if (unseen > evadeTime) {
      // drop a star
      const s = this.stars - 1;
      this.heat = s > 0 ? THRESH[s] + 1 : 0;
      this.lastSeen = G.time;
      this.refresh(false);
      if (s === 0) { this.clear(); G.hud.notify(t('lostCops')); G.audio && G.audio.wantedClear(); }
      return;
    }
    // keep enough units on the chase
    for (const v of [...this.units]) if (!G.vehicles.includes(v) || v.destroyed || v.driver === 'player') this.units.delete(v);
    const want = [0, 1, 2, 3, 5, 7][this.stars];
    this.spawnT -= dt;
    if (this.units.size < want && this.spawnT <= 0) { this.spawnT = this.stars >= 4 ? 2.5 : 5; this.spawnUnit(); }
  }
}
