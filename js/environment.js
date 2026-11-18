// Sky, sun/moon lighting, day-night cycle, fog, stars, rain and lightning.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { G } from './state.js';
import { clamp, lerp, rand } from './utils.js';
import { LIGHT_MATS } from './models.js';

const C = (h) => new THREE.Color(h);
// fog / ambient colour keyframes by hour
const FOG_KEYS = [
  [0, C(0x0a1020)], [4.5, C(0x101830)], [5.8, C(0x8a6a80)], [6.6, C(0xf0b48a)], [8, C(0xbcd3e6)], [12, C(0xc4dcef)],
  [16, C(0xc8d8e6)], [17.4, C(0xf2b27a)], [18.2, C(0xd9715a)], [18.9, C(0x4a3558)], [19.8, C(0x141a33)], [24, C(0x0a1020)],
];
function keyColor(keys, h, out) {
  for (let i = 0; i < keys.length - 1; i++) {
    const [h0, c0] = keys[i], [h1, c1] = keys[i + 1];
    if (h >= h0 && h <= h1) return out.copy(c0).lerp(c1, (h - h0) / (h1 - h0));
  }
  return out.copy(keys[0][1]);
}

export class Environment {
  constructor(scene, renderer) {
    this.scene = scene; this.renderer = renderer;
    this.hour = 17.3;            // start just before sunset at Rock Beach
    this.daySeconds = 14 * 60;   // real seconds per in-game day
    this.timeScale = 1;
    this.rain = 0; this.rainTarget = 0; this.weatherTimer = rand(150, 300);
    this.night = 0;

    this.sky = new Sky(); this.sky.scale.setScalar(4500); scene.add(this.sky);
    const u = this.sky.material.uniforms;
    u.turbidity.value = 6; u.rayleigh.value = 1.6; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.85;
    if (u.cloudCoverage) { u.cloudCoverage.value = 0.35; u.cloudDensity.value = 0.45; u.cloudScale.value = 0.00025; }

    scene.fog = new THREE.Fog(0xbfd9ef, 80, 900);
    this.hemi = new THREE.HemisphereLight(0xcfe6ff, 0x5a5040, 0.7); scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; sc.near = 1; sc.far = 600;
    this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.6;
    scene.add(this.sun, this.sun.target);
    this.sunDir = new THREE.Vector3();

    // Stars
    const sg = new THREE.BufferGeometry(); const sp = [];
    for (let i = 0; i < 2500; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 0.95);
      sp.push(Math.sin(ph) * Math.cos(th) * 3000, Math.cos(ph) * 3000, Math.sin(ph) * Math.sin(th) * 3000);
    }
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.stars = new THREE.Points(sg, this.starMat); scene.add(this.stars);
    // Moon
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(60, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf4f1e0, fog: false }));
    scene.add(this.moon);

    // Rain (line segments around the camera)
    const N = 6000, rp = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) { const x = rand(-60, 60), y = rand(0, 45), z = rand(-60, 60); rp.set([x, y, z, x + 0.05, y - 0.9, z + 0.02], i * 6); }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    this.rainMat = new THREE.LineBasicMaterial({ color: 0xaab8c8, transparent: true, opacity: 0 });
    this.rainLines = new THREE.LineSegments(rg, this.rainMat); this.rainLines.frustumCulled = false; scene.add(this.rainLines);
    this.lightning = 0;
    this.headlight = new THREE.SpotLight(0xfff2d0, 0, 60, 0.5, 0.5, 1.2); scene.add(this.headlight, this.headlight.target);
    this._c = new THREE.Color(); this._c2 = new THREE.Color();
    // Image-based lighting: a small sky-only scene is turned into a reflection/irradiance map (PMREM)
    // so cars, glass, the sea and wet roads reflect the actual sky (sunset reflections etc.).
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envScene = new THREE.Scene(); this.envSky = new Sky(); this.envSky.scale.setScalar(900); this.envScene.add(this.envSky);
    this.envT = 0; this.envHour = -1; this.envRain = -1;
    this.grade = { bloom: 0.5, threshold: 1.0, saturation: 1.12, tint: new THREE.Vector3(1, 1, 1) };
  }

  setWeather(raining) { this.rainTarget = raining ? 1 : 0; }
  toggleWeather() { this.setWeather(this.rainTarget < 0.5); return this.rainTarget > 0.5; }

  clockString() {
    const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  update(dt, focus) {
    this.hour = (this.hour + (dt * this.timeScale * 24) / this.daySeconds) % 24;
    const h = this.hour;
    // sun path: rises over the sea (east, +X) at 6, sets inland (west) at 18
    const th = ((h - 6.2) / 12.6) * Math.PI; // sunrise ~6:10, sunset ~18:50
    this.sunDir.set(Math.cos(th), Math.sin(th) * 0.92, 0.35).normalize();
    const elev = this.sunDir.y;
    this.night = clamp((0.03 - elev) / 0.17, 0, 1);
    const day = 1 - this.night;

    // weather transitions
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) { this.weatherTimer = rand(180, 420); this.rainTarget = Math.random() < 0.3 ? 1 : 0; }
    this.rain += (this.rainTarget - this.rain) * Math.min(1, dt * 0.25);
    const r = this.rain;

    const u = this.sky.material.uniforms;
    u.sunPosition.value.copy(this.sunDir).multiplyScalar(1000);
    u.turbidity.value = lerp(5, 18, r); u.rayleigh.value = lerp(1.6, 0.6, r) * (elev < 0.15 ? 2.4 : 1);
    if (u.cloudCoverage) { u.cloudCoverage.value = lerp(0.35, 0.92, r); u.cloudDensity.value = lerp(0.45, 0.85, r); u.time.value += dt; }
    this.sky.visible = true;

    // lights
    const sunI = clamp(elev * 4, 0, 1);
    const sunCol = this._c.setRGB(1, lerp(0.55, 0.97, clamp(elev * 3, 0, 1)), lerp(0.35, 0.92, clamp(elev * 3, 0, 1)));
    this.sun.color.copy(sunCol);
    let moonI = this.night * 0.45;
    if (sunI > 0.001) { this.sun.intensity = sunI * 3.0 * (1 - r * 0.7); this.sun.position.copy(focus).addScaledVector(this.sunDir, 300); }
    else { // moonlight from the opposite side
      this.sun.intensity = moonI; this.sun.color.setRGB(0.6, 0.7, 1.0);
      this.sun.position.copy(focus).addScaledVector(this._moonDir || (this._moonDir = new THREE.Vector3(-0.4, 0.8, 0.3).normalize()), 300);
    }
    this.sun.target.position.copy(focus);
    this.hemi.intensity = lerp(0.12, 0.85, day) * (1 - r * 0.35) + this.lightning * 2;
    keyColor(FOG_KEYS, h, this._c2);
    if (r > 0) this._c2.lerp(C(day > 0.5 ? 0x7d8590 : 0x151a22), r * 0.75);
    this.scene.fog.color.copy(this._c2);
    this.hemi.color.copy(this._c2).lerp(C(0xffffff), 0.4);
    this.scene.fog.near = lerp(80, 20, r); this.scene.fog.far = Math.min(this.farLimit || 1e9, lerp(950, 260, r) * (this.night > 0.5 ? 0.7 : 1));
    this.renderer.toneMappingExposure = lerp(0.42, 0.5, day) * (1 - r * 0.2) + this.lightning;

    // night sky
    this.starMat.opacity = clamp(this.night * 1.2 - r, 0, 1);
    this.stars.position.copy(focus);
    this.moon.position.copy(focus).add(new THREE.Vector3(-0.5, 0.65, 0.4).normalize().multiplyScalar(2800));
    this.moon.visible = this.night > 0.2 && r < 0.6;

    // rain particles follow the camera
    this.rainMat.opacity = r * 0.55;
    this.rainLines.visible = r > 0.02;
    if (this.rainLines.visible) {
      const cam = G.camera.position;
      this.rainLines.position.set(cam.x, cam.y - 20, cam.z);
      const pos = this.rainLines.geometry.attributes.position; const a = pos.array;
      const fall = 32 * dt;
      for (let i = 0; i < a.length; i += 6) {
        a[i + 1] -= fall; a[i + 4] -= fall;
        if (a[i + 4] < 0) { a[i + 1] += 45; a[i + 4] += 45; }
      }
      pos.needsUpdate = true;
      // lightning
      if (r > 0.8 && Math.random() < dt * 0.05) { this.lightning = 0.9; G.audio && G.audio.thunder(); }
    }
    this.lightning = Math.max(0, this.lightning - dt * 2.5);

    // wet roads look shinier
    if (G.roads && G.roads.asphaltMat) { G.roads.asphaltMat.roughness = lerp(0.92, 0.35, r); G.roads.asphaltMat.color.setScalar(lerp(1, 0.7, r)); }

    // vehicle lights & world night materials
    LIGHT_MATS.head.emissiveIntensity = 0.15 + this.night * 3;
    LIGHT_MATS.tail.emissiveIntensity = 0.3 + this.night * 1.5;
    if (G.world) {
      G.world.setNight(Math.max(this.night, r * 0.5), G.camera.position, dt);
      if (G.world.lighthouseLamp) G.world.lighthouseLamp.emissiveIntensity = this.night * 4;
    }
    if (G._signMats) for (const m of G._signMats) m.emissiveIntensity = 0.05 + this.night * 0.6;

    // refresh sky reflections when the light has changed enough (cheap: every few seconds at most)
    this.envT -= dt;
    if (this.envT <= 0 && (Math.abs(this.hour - this.envHour) > 0.2 || Math.abs(this.rain - this.envRain) > 0.15 || this.envHour < 0)) {
      this.envT = 3; this.envHour = this.hour; this.envRain = this.rain;
      const su = this.sky.material.uniforms, eu = this.envSky.material.uniforms;
      for (const k of Object.keys(su)) { const v = su[k].value; if (v && v.copy) eu[k].value.copy(v); else eu[k].value = v; }
      const rt = this.pmrem.fromScene(this.envScene, 0.02, 0.1, 2000);
      if (this.envRT) this.envRT.dispose();
      this.envRT = rt; this.scene.environment = rt.texture;
    }
    this.scene.environmentIntensity = (0.04 + day * 0.16) * (1 - r * 0.4);
    // colour grade for the post-processing pass: warm at golden hour, cool at night, grey in rain
    const golden = clamp(1 - Math.abs(elev - 0.08) / 0.12, 0, 1);
    const G2 = this.grade;
    G2.bloom = lerp(0.45, 0.95, this.night) + golden * 0.2;
    G2.threshold = lerp(1.15, 0.55, this.night);
    G2.saturation = lerp(1.15, 0.95, Math.max(this.night * 0.6, r * 0.8));
    const warm = G.settings.pixel !== false ? (1 - this.night) * (1 - r * 0.7) : 0; // sunny storybook warmth for the pixel art style
    G2.tint.set(1 + golden * 0.06 - this.night * 0.05 + warm * 0.05, 1 - this.night * 0.02 + warm * 0.005, 1 - golden * 0.08 + this.night * 0.06 - warm * 0.07);
    if (warm) G2.saturation += warm * 0.06;
  }

  /** Spotlight headlight for the vehicle the player drives (night only). */
  updateHeadlight(vehicle) {
    const L = this.headlight;
    if (!vehicle || this.night < 0.1) { L.intensity = 0; return; }
    const fx = Math.sin(vehicle.heading), fz = Math.cos(vehicle.heading);
    const len = vehicle.cfg.length / 2;
    L.position.set(vehicle.pos.x + fx * len, 1.0, vehicle.pos.z + fz * len);
    L.target.position.set(vehicle.pos.x + fx * (len + 20), 0, vehicle.pos.z + fz * (len + 20));
    L.intensity = this.night * 120;
  }
}
