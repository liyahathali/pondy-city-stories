// Mission system: givers on the map, step-based objectives, timers, rewards.
import * as THREE from 'three';
import { G } from './state.js';
import { Vehicle } from './vehicle.js';
import { randomLook } from './models.js';
import { t, missionText } from './i18n.js';

const P2 = Math.PI / 2;
export const MISSIONS = [
  {
    id: 'welcome', title: 'Welcome to Pondicherry', giver: { x: 506, z: -128 }, reward: 500, color: '#ff4fa3',
    intro: 'Your cousin Selvam left you his old scooter on Goubert Avenue. Take a tour of White Town.',
    steps: [
      { type: 'vehicle', vtypes: ['scooter', 'vintage', 'retro80', 'moped'], text: 'Get on the ~y~scooter~w~ parked on Goubert Avenue.', spawn: { type: 'scooter', x: 494.5, z: -136, h: Math.PI } },
      { type: 'goto', x: 420, z: -160, r: 7, text: 'Ride to ~y~Bharathi Park~w~ on Rue Dumas.' },
      { type: 'goto', x: 385, z: -152, r: 4, onFoot: true, text: 'Get off and walk to the ~y~Aayi Mandapam~w~ monument.' },
      { type: 'goto', x: 494, z: -95, r: 7, text: 'Ride back to the ~y~Old Lighthouse~w~ on the promenade.' },
    ],
  },
  {
    id: 'auto', title: 'Auto Anna\'s Night Shift', giver: { x: -334, z: -132 }, reward: 1200, color: '#ffd23f',
    intro: 'Auto Anna has a fever. Drive his auto rickshaw and keep his customers happy!',
    steps: [
      { type: 'vehicle', vtypes: ['auto'], text: 'Get in ~y~Anna\'s auto rickshaw~w~.', spawn: { type: 'auto', x: -340, z: -140, h: Math.PI } },
      { type: 'goto', x: -316, z: -100, r: 6, passenger: true, text: 'Pick up the ~y~passenger~w~ on Maraimalai Adigal Salai.' },
      { type: 'goto', x: 190, z: 303, r: 8, time: 110, text: 'Drop the passenger at the ~y~Railway Station~w~.' },
      { type: 'goto', x: 176, z: 255, r: 7, passenger: true, text: 'Pick up the ~y~nun~w~ at the Sacred Heart Basilica.' },
      { type: 'goto', x: 490, z: 40, r: 8, time: 90, text: 'Take her to the ~y~Promenade~w~ on Goubert Avenue.' },
    ],
  },
  {
    id: 'croissant', title: 'Croissants at Dawn', giver: { x: 426.5, z: -30 }, reward: 900, color: '#ff8c42',
    intro: 'The Boulangerie needs fresh croissants delivered to three White Town cafés — hot!',
    steps: [
      { type: 'vehicle', vtypes: ['scooter', 'motorcycle', 'vintage', 'retro80', 'moped', 'twostroke', 'commuter'], text: 'Hop on the ~y~delivery scooter~w~.', spawn: { type: 'scooter', x: 423.5, z: -18, h: 0 } },
      { type: 'checkpoints', points: [[283, -200], [350, -360], [488, -280], [420, 120], [350, 200]], r: 7, time: 140, text: 'Deliver to all the ~y~cafés~w~ before they go cold!' },
    ],
  },
  {
    id: 'temple', title: 'Temple Run to Villianur', giver: { x: 18.5, z: -50 }, reward: 1500, color: '#4fd1ff',
    intro: 'The temple festival starts soon. Race the flower garlands to Villianur on a Bullet!',
    steps: [
      { type: 'vehicle', vtypes: ['motorcycle', 'twostroke', 'commuter'], text: 'Get on the ~y~motorcycle~w~.', spawn: { type: 'motorcycle', x: 13, z: -62, h: Math.PI } },
      { type: 'checkpoints', points: [[10, -40], [-150, -40], [-400, -40], [-700, -40], [-1000, -40], [-1100, -40], [-1100, -110]], r: 8, time: 120, text: 'Race through the ~y~checkpoints~w~ to Villianur temple!' },
    ],
  },
  {
    id: 'hotsand', title: 'Hot Sand', giver: { x: 4, z: 446 }, reward: 2500, color: '#ff5f5f',
    intro: 'A "business deal" at the Botanical Garden went wrong. The police are coming — get to Paradise Beach!',
    steps: [
      { type: 'vehicle', vtypes: ['car', 'police', 'taxi', 'motorcycle', 'twostroke', 'commuter'], text: 'Get in the ~y~getaway car~w~.', spawn: { type: 'car', x: 13, z: 470, h: 0 } },
      { type: 'wanted', stars: 2 },
      { type: 'goto', x: 495, z: 1250, r: 9, time: 160, text: 'Escape to ~y~Paradise Beach~w~!' },
      { type: 'losewanted', text: 'Lose the ~r~cops~w~.' },
    ],
  },
  {
    id: 'train', title: 'The Last Train', giver: { x: 385, z: -133 }, reward: 800, color: '#b388ff',
    intro: 'Your friend left her ticket with you. Get to the Railway Station platform before the train leaves!',
    steps: [
      { type: 'goto', x: 190, z: 350, r: 5, time: 60, text: 'Reach the ~y~Railway Station platform~w~!' },
    ],
  },
  {
    id: 'bus', title: 'PRTC Bus Duty', giver: { x: -372, z: -133 }, reward: 2000, color: '#69f0ae',
    intro: 'The driver of the Villianur bus never showed up. Drive the route and bring the bus back in one piece.',
    steps: [
      { type: 'vehicle', vtypes: ['bus'], text: 'Get in the ~y~bus~w~.', spawn: { type: 'bus', x: -352, z: -188, h: P2 } },
      { type: 'checkpoints', points: [[-320, -110], [-400, -40], [-700, -40], [-1000, -40], [-1100, 0], [-1100, 90], [-1000, 90], [-1100, -40], [-400, -40], [-340, -160]], r: 10, time: 300, needVehicle: true, text: 'Stop at every ~y~bus stop~w~ on the Villianur route.' },
    ],
  },
  {
    id: 'patrol', title: 'Beach Patrol', giver: { x: 162.5, z: -70 }, reward: 1800, color: '#448aff',
    intro: 'Inspector Murugan needs a driver. Patrol the coast in a police car — official business, no wanted level.',
    steps: [
      { type: 'vehicle', vtypes: ['police'], text: 'Get in the ~b~police car~w~.', spawn: { type: 'police', x: 165.5, z: -55, h: Math.PI }, official: true },
      { type: 'checkpoints', points: [[490, -250], [490, 100], [420, 620], [490, 1250]], r: 10, time: 220, needVehicle: true, text: 'Patrol ~y~Rock Beach~w~, the ~y~Promenade~w~ and ~y~Paradise Beach~w~.' },
    ],
  },
];

export class Missions {
  constructor() {
    this.done = new Set(); this.active = null; this.step = 0; this.timer = 0; this.vehicle = null;
    this.markers = new Map();
    const ringGeo = new THREE.CylinderGeometry(1.6, 1.6, 6, 24, 1, true);
    for (const m of MISSIONS) {
      const mat = new THREE.MeshBasicMaterial({ color: m.color, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
      const mesh = new THREE.Mesh(ringGeo, mat); mesh.position.set(m.giver.x, 3, m.giver.z); G.scene.add(mesh);
      this.markers.set(m.id, mesh);
    }
    this.objMat = new THREE.MeshBasicMaterial({ color: 0xffe94d, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
    this.obj = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 30, 24, 1, true), this.objMat); this.obj.visible = false; G.scene.add(this.obj);
    this.objRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 6, 32), new THREE.MeshBasicMaterial({ color: 0xffe94d })); this.objRing.rotation.x = Math.PI / 2; this.objRing.visible = false; G.scene.add(this.objRing);
    this.passenger = null; this.target = null;
  }

  title(m) { return missionText(m.id).title; }
  stepText() { return this.active ? (missionText(this.active.id).steps[this.step] || '') : ''; }

  isMissionVehicle(v) { return this.active && v === this.vehicle; }
  available() { return MISSIONS.filter((m) => !this.done.has(m.id)); }

  nearbyGiver() {
    if (this.active) return null;
    const pp = G.player.worldPos();
    for (const m of this.available()) if (Math.hypot(m.giver.x - pp.x, m.giver.z - pp.z) < 4) return m;
    return null;
  }

  tryStartNearby() { const m = this.nearbyGiver(); if (!m) return false; this.start(m); return true; }

  start(m) {
    this.active = m; this.step = -1; this.timer = 0; this.vehicle = null; this.cpIndex = 0;
    const tx = missionText(m.id); G.hud.missionTitle(tx.title, tx.intro);
    for (const mk of this.markers.values()) mk.visible = false;
    this.next();
  }

  next() {
    const m = this.active;
    this.step++;
    if (this.passenger) { this.passenger.dispose(); G.peds.splice(G.peds.indexOf(this.passenger), 1); this.passenger = null; }
    if (this.step >= m.steps.length) return this.pass();
    const s = m.steps[this.step];
    if (s.time) this.timer = s.time;
    this.cpIndex = 0;
    if (s.type === 'vehicle') {
      if (s.spawn && !(G.player.vehicle && s.vtypes.includes(G.player.vehicle.type))) {
        // clear space and spawn
        for (const v of [...G.vehicles]) if (v.driver !== 'player' && Math.hypot(v.pos.x - s.spawn.x, v.pos.z - s.spawn.z) < 6) { v.dispose(); G.vehicles.splice(G.vehicles.indexOf(v), 1); }
        const v = new Vehicle(s.spawn.type, s.spawn.x, s.spawn.z, s.spawn.h, { parked: true });
        v.official = !!s.official; G.vehicles.push(v); this.vehicle = v;
      } else if (G.player.vehicle) this.vehicle = G.player.vehicle;
    }
    if (s.type === 'wanted') { G.police.setStars(s.stars); return this.next(); }
    if (s.type === 'goto' && s.passenger) {
      const p = G.pedMgr.spawnAt(s.x + 2, s.z + 1, randomLook(), 'civ'); p.state = 'talk'; p.talkT = 9999; this.passenger = p;
    }
    G.hud.objective(this.stepText());
    G.audio && G.audio.checkpoint();
  }

  currentTarget() {
    if (!this.active) return null;
    const s = this.active.steps[this.step]; if (!s) return null;
    if (s.type === 'goto') return { x: s.x, z: s.z, r: s.r };
    if (s.type === 'checkpoints') { const p = s.points[this.cpIndex]; return { x: p[0], z: p[1], r: s.r }; }
    if (s.type === 'vehicle' && this.vehicle && G.player.vehicle !== this.vehicle) return { x: this.vehicle.pos.x, z: this.vehicle.pos.z, r: 3, isVehicle: true };
    return null;
  }

  onEnterVehicle(v) { /* evaluated in update */ }

  pass() {
    const m = this.active;
    this.done.add(m.id); G.money += m.reward; G.stats.missions++;
    G.hud.bigMessage(t('mpass'), `₹${m.reward.toLocaleString('en-IN')}`, '#ffd23f');
    G.audio && G.audio.missionPass();
    if (m.id === 'hotsand' || m.id === 'patrol') G.police.clear();
    this.cleanup();
    G.game.save(true);
  }

  fail(reason) {
    if (!this.active) return;
    G.hud.bigMessage(t('mfail'), reason || '', '#ff4d4d');
    G.audio && G.audio.missionFail();
    this.cleanup();
  }

  cleanup() {
    if (this.passenger) { this.passenger.dispose(); const i = G.peds.indexOf(this.passenger); if (i >= 0) G.peds.splice(i, 1); this.passenger = null; }
    if (this.vehicle) { this.vehicle.persistent = false; }
    this.active = null; this.vehicle = null; this.timer = 0;
    G.hud.objective('');
    this.obj.visible = this.objRing.visible = false;
    for (const [id, mk] of this.markers) mk.visible = !this.done.has(id);
  }

  update(dt) {
    // giver markers pulse
    for (const mk of this.markers.values()) if (mk.visible) { mk.rotation.y += dt; mk.material.opacity = 0.3 + 0.15 * Math.sin(G.time * 3); }
    if (!this.active) return;
    const m = this.active, s = m.steps[this.step], P = G.player, pp = P.worldPos();
    if (!s) return;
    if (this.vehicle && this.vehicle.destroyed) return this.fail(t('mf.vehicle'));
    if (this.timer > 0) { this.timer -= dt; if (this.timer <= 0) return this.fail(t('mf.time')); }

    const tgt = this.currentTarget();
    if (tgt && !tgt.isVehicle) {
      this.obj.visible = this.objRing.visible = true;
      this.obj.position.set(tgt.x, 15, tgt.z); this.obj.scale.set(tgt.r, 1, tgt.r);
      this.objRing.position.set(tgt.x, 0.3 + Math.sin(G.time * 4) * 0.2, tgt.z); this.objRing.scale.setScalar(tgt.r);
      this.objMat.color.set(s.type === 'checkpoints' ? 0xff6ec7 : 0xffe94d);
    } else { this.obj.visible = this.objRing.visible = false; }

    switch (s.type) {
      case 'vehicle':
        if (P.vehicle && s.vtypes.includes(P.vehicle.type)) { this.vehicle = P.vehicle; this.next(); }
        break;
      case 'goto': {
        const d = Math.hypot(pp.x - s.x, pp.z - s.z);
        if (s.onFoot && P.vehicle) { if (d < 30) G.hud.objective(t('mo.walkAayi')); break; }
        if (s.passenger && (!P.vehicle || P.vehicle.type !== 'auto')) { G.hud.objective(t('mo.backAuto')); break; }
        if (d < s.r && (!s.passenger || Math.abs(P.vehicle.speed) < 3)) {
          if (s.passenger) G.hud.notify(t('mo.onboard'));
          this.next();
        } else if (s.passenger && d < s.r) G.hud.objective(t('mo.stop'));
        else if (!s.passenger) G.hud.objective(this.stepText());
        break;
      }
      case 'checkpoints': {
        if (s.needVehicle && P.vehicle !== this.vehicle) { G.hud.objective(t('mo.backVeh')); break; } else G.hud.objective(this.stepText());
        const p = s.points[this.cpIndex];
        if (Math.hypot(pp.x - p[0], pp.z - p[1]) < s.r) {
          this.cpIndex++; G.audio && G.audio.checkpoint(); G.fx.sparkle(p[0], 1.5, p[1], 0xff6ec7);
          G.hud.notify(t('mo.cp', this.cpIndex, s.points.length));
          if (this.cpIndex >= s.points.length) this.next();
        }
        break;
      }
      case 'losewanted':
        G.hud.objective(this.stepText());
        if (G.police.stars === 0) this.next();
        break;
    }
  }
}
