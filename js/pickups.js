// Collectibles: rupee cash bundles (saved), dropped cash, and health packs.
import * as THREE from 'three';
import { G } from './state.js';
import { seeded } from './utils.js';
import { POI } from './config.js';
import { t } from './i18n.js';

function rupeeTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#2e7d32'; x.beginPath(); x.arc(64, 64, 60, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#a5d6a7'; x.lineWidth = 8; x.stroke();
  x.fillStyle = '#fff'; x.font = 'bold 80px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('₹', 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function crossTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#e53935'; x.fillRect(48, 16, 32, 96); x.fillRect(16, 48, 96, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Pickups {
  constructor() {
    this.list = []; this.collected = new Set();
    const tex = rupeeTexture();
    this.cashMat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0x1b5e20, emissiveIntensity: 0.6, roughness: 0.4, metalness: 0.3 });
    this.cashGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.1, 20); this.cashGeo.rotateX(Math.PI / 2);
    this.healthMat = new THREE.MeshStandardMaterial({ map: crossTexture(), emissive: 0x550000, emissiveIntensity: 0.4 });
    this.healthGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const rng = seeded(4242);
    // Fixed rupee bundles around town (each worth ₹100–₹500)
    let id = 0;
    const tries = 4000;
    for (let k = 0; k < tries && id < 80; k++) {
      const e = G.roads.edges[Math.floor(rng() * G.roads.edges.length)];
      const t = rng() * e.len, side = rng() < 0.5 ? 1 : -1;
      const p = G.roads.lanePoint(e, e.a, t, (e.w / 2 + 1.5) * side, {});
      if (G.colliders.pointBlocked(p.x, p.z, 0.5)) continue;
      this.add('cash', p.x, p.z, 100 + Math.floor(rng() * 5) * 100, `c${id++}`);
    }
    // a few special ones at landmarks
    const special = [[POI.aayi.x + 6, POI.aayi.z + 6], [512 - 4, -250], [POI.paradise.x - 10, POI.paradise.z], [POI.villianur.x + 40, POI.villianur.z + 60], [-70, 470], [POI.railway.x, 351]];
    special.forEach(([x, z], i) => this.add('cash', x, z, 750, `s${i}`));
    // health packs (respawn)
    [[POI.hospital.respawn.x, POI.hospital.respawn.z + 6], [300, -40], [-150, -280], [20, 200], [-1100, 60], [470, 1260], [-320, 100]]
      .forEach(([x, z], i) => this.add('health', x, z, 50, `h${i}`));
  }

  add(type, x, z, value, id, temp = false) {
    const m = new THREE.Mesh(type === 'cash' ? this.cashGeo : this.healthGeo, type === 'cash' ? this.cashMat : this.healthMat);
    m.position.set(x, 1, z); m.castShadow = false; G.scene.add(m);
    const p = { type, x, z, value, id, mesh: m, temp, respawnAt: 0 };
    this.list.push(p);
    return p;
  }

  dropCash(x, z, amount) { const p = this.add('cash', x, z, amount, null, true); p.mesh.scale.setScalar(0.7); p.expire = G.time + 40; }

  applySave(ids) { this.collected = new Set(ids || []); for (const p of this.list) if (p.id && this.collected.has(p.id) && p.type === 'cash') p.mesh.visible = false; }

  update(dt) {
    const P = G.player, pp = P.worldPos();
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (p.temp && G.time > p.expire) { G.scene.remove(p.mesh); this.list.splice(i, 1); continue; }
      if (!p.mesh.visible) {
        if (p.type === 'health' && p.respawnAt && G.time > p.respawnAt) p.mesh.visible = true;
        continue;
      }
      p.mesh.rotation.y += dt * 2.5; p.mesh.position.y = 1 + Math.sin(G.time * 3 + p.x) * 0.15;
      const dx = pp.x - p.x, dz = pp.z - p.z;
      if (dx * dx + dz * dz > (P.vehicle ? 6.5 : 2.2)) continue;
      if (p.type === 'cash') {
        G.money += p.value; G.hud.moneyPop(p.value); G.audio && G.audio.pickup(); G.fx.sparkle(p.x, 1, p.z, 0x9ccc65);
        if (p.temp) { G.scene.remove(p.mesh); this.list.splice(i, 1); }
        else { p.mesh.visible = false; this.collected.add(p.id); G.hud.notify(t('found', p.value, this.collected.size, this.list.filter((q) => q.type === 'cash' && !q.temp).length)); }
      } else if (P.health < P.maxHealth) {
        P.heal(p.value); p.mesh.visible = false; p.respawnAt = G.time + 60; G.audio && G.audio.pickup(); G.hud.notify(t('health')); G.fx.sparkle(p.x, 1, p.z, 0xff8a80);
      }
    }
  }
}
