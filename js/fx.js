// Lightweight pooled sprite particles: smoke, fire, explosions, sparkles.
import * as THREE from 'three';
import { G } from './state.js';
import { rand } from './utils.js';

function radial(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, inner); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.smokeTex = radial('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
    this.fireTex = radial('rgba(255,240,180,1)', 'rgba(255,80,0,0)');
    this.pool = []; this.active = [];
    for (let i = 0; i < 260; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.smokeTex, transparent: true, depthWrite: false }));
      s.visible = false; scene.add(s); this.pool.push(s);
    }
    this.flash = new THREE.PointLight(0xffaa55, 0, 40, 1.5); scene.add(this.flash);
    this.flashT = 0;
  }
  emit(x, y, z, o) {
    const s = this.pool.pop(); if (!s) return;
    s.visible = true; s.position.set(x, y, z);
    s.material.map = o.fire ? this.fireTex : this.smokeTex;
    s.material.blending = o.fire ? THREE.AdditiveBlending : THREE.NormalBlending;
    s.material.color.setHex(o.color || 0xffffff); s.material.opacity = o.alpha || 0.8;
    s.scale.setScalar(o.size || 1);
    s.userData = { vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, life: o.life || 1, max: o.life || 1, grow: o.grow || 1, a0: o.alpha || 0.8, size: o.size || 1 };
    this.active.push(s);
  }
  smoke(x, y, z, color = 0x777777) { this.emit(x + rand(-0.3, 0.3), y, z + rand(-0.3, 0.3), { color, vy: rand(1, 2), vx: rand(-0.3, 0.3), vz: rand(-0.3, 0.3), life: 2.2, size: 1, grow: 2.2, alpha: 0.5 }); }
  fire(x, y, z) { this.emit(x, y, z, { fire: true, color: 0xffaa33, vy: rand(1.5, 3), life: 0.7, size: 1.2, grow: 0.4, alpha: 0.9 }); }
  dust(x, z) { this.emit(x, 0.3, z, { color: 0xc8b89a, vy: 0.6, life: 1.0, size: 0.6, grow: 2, alpha: 0.35 }); }
  sparkle(x, y, z, color = 0xfff176) { for (let i = 0; i < 10; i++) this.emit(x, y, z, { fire: true, color, vx: rand(-2, 2), vy: rand(1, 4), vz: rand(-2, 2), life: 0.6, size: 0.35, grow: 0.3, alpha: 1 }); }
  explosion(x, y, z) {
    for (let i = 0; i < 40; i++) this.emit(x, y, z, { fire: true, color: i % 3 ? 0xff8a30 : 0xffe080, vx: rand(-6, 6), vy: rand(2, 9), vz: rand(-6, 6), life: rand(0.5, 1.1), size: rand(1.5, 3), grow: 1.6, alpha: 1 });
    for (let i = 0; i < 25; i++) this.emit(x, y + 1, z, { color: 0x222222, vx: rand(-2, 2), vy: rand(2, 5), vz: rand(-2, 2), life: rand(2, 4), size: 2, grow: 3, alpha: 0.7 });
    this.flash.position.set(x, y + 2, z); this.flash.intensity = 400; this.flashT = 0.5;
    G.cam && (G.cam.shake = Math.max(G.cam.shake, 0.8 * Math.max(0, 1 - Math.hypot(G.player.worldPos().x - x, G.player.worldPos().z - z) / 60)));
  }
  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const s = this.active[i], u = s.userData;
      u.life -= dt;
      if (u.life <= 0) { s.visible = false; this.active.splice(i, 1); this.pool.push(s); continue; }
      const k = 1 - u.life / u.max;
      s.position.x += u.vx * dt; s.position.y += u.vy * dt; s.position.z += u.vz * dt;
      u.vx *= 0.97; u.vz *= 0.97;
      s.scale.setScalar(u.size * (1 + k * u.grow));
      s.material.opacity = u.a0 * (1 - k);
    }
    if (this.flashT > 0) { this.flashT -= dt; this.flash.intensity = Math.max(0, this.flashT * 800); }
  }
}
