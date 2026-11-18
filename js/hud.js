// HUD: money, health, wanted stars, clock, minimap with GPS, full map, prompts, messages and speech bubbles.
import * as THREE from 'three';
import { G } from './state.js';
import { WORLD, SEA_X, DISTRICTS, MAP_LABELS, POI, TEA_STALLS, CANAL } from './config.js';
import { MISSIONS } from './missions.js';
import { clamp } from './utils.js';
import { t, place, vlabel, applyStatic } from './i18n.js';
import { SHOP_TYPES } from './stalls.js';

const $ = (id) => document.getElementById(id);
const fmt = (s) => s.replace(/~y~/g, '<span class="y">').replace(/~r~/g, '<span class="r">').replace(/~b~/g, '<span class="b">').replace(/~w~/g, '</span>');

export class HUD {
  constructor() {
    this.el = {
      money: $('money'), clock: $('clock'), health: $('healthFill'), stars: $('stars'), loc: $('location'),
      notify: $('notify'), obj: $('objective'), timer: $('timer'), big: $('bigMsg'), bigT: $('bigTitle'), bigS: $('bigSub'),
      prompt: $('prompt'), speed: $('speedo'), vhp: $('vehHealthFill'), vname: $('vehName'), dmg: $('damage'),
      mini: $('minimap'), bubbles: $('bubbles'), mapCanvas: $('bigmap'), mapWrap: $('mapScreen'), weather: $('weather'),
      missionCard: $('missionCard'), mcTitle: $('mcTitle'), mcIntro: $('mcIntro'),
    };
    this.miniCtx = this.el.mini.getContext('2d');
    this.locName = ''; this.locTimer = 0; this.notifyT = 0; this.bigT = 0; this.cardT = 0;
    this.bubbles = new Map();
    this.gps = null; this.gpsT = 0; this.shownMoney = G.money;
    this.renderMapImage();
    this.el.mapCanvas.addEventListener('mousedown', (e) => this.onMapClick(e));
    this.el.mapCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
    for (let i = 0; i < 5; i++) { const s = document.createElement('span'); s.textContent = '★'; this.el.stars.appendChild(s); }
  }

  /* ---------------- pre-rendered map image ---------------- */
  renderMapImage() {
    const S = 1; // px per metre
    const W = Math.ceil((WORLD.maxX - WORLD.minX) * S), H = Math.ceil((WORLD.maxZ - WORLD.minZ) * S);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const X = (wx) => (wx - WORLD.minX) * S, Z = (wz) => (wz - WORLD.minZ) * S;
    x.fillStyle = '#2f4a2c'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#1b6a8a'; x.fillRect(X(SEA_X + 2), 0, W, H);
    x.fillStyle = '#d6c08b'; x.fillRect(X(SEA_X - 10), 0, 12 * S, H); x.fillRect(X(440), Z(1120), X(SEA_X) - X(440), Z(1560) - Z(1120));
    x.fillStyle = '#263c24'; x.fillRect(X(-407), Z(-457), 900 * S, 765 * S); // city ground
    // parks
    x.fillStyle = '#3f7a3a';
    for (const [a, b, cc, d] of [[358, -192, 412, -129], [-141, 385, 0, 520], [99, 208, 161, 290], [358, -272, 412, -208], [99, -352, 161, -288]]) x.fillRect(X(a), Z(b), (cc - a) * S, (d - b) * S);
    // canal
    x.fillStyle = '#1b6a8a'; x.fillRect(X(CANAL.x0), Z(CANAL.z0), (CANAL.x1 - CANAL.x0) * S, (CANAL.z1 - CANAL.z0) * S);
    // buildings
    for (const b of G.colliders.all) {
      if (b.tag === 'building' || b.tag === 'church' || b.tag === 'temple') { x.fillStyle = b.tag === 'building' ? '#4b5450' : '#8a6d4f'; x.fillRect(X(b.x0), Z(b.z0), (b.x1 - b.x0) * S, (b.z1 - b.z0) * S); }
    }
    // railway
    x.strokeStyle = '#6d6d6d'; x.lineWidth = 3; x.setLineDash([6, 4]);
    for (const tz of [358, 368]) { x.beginPath(); x.moveTo(X(-900), Z(tz)); x.lineTo(X(520), Z(tz)); x.stroke(); }
    x.setLineDash([]);
    // roads
    const R = G.roads;
    for (const e of R.edges) {
      const A = R.nodes[e.a], B = R.nodes[e.b];
      x.strokeStyle = e.kind === 'highway' ? '#d8cfae' : '#b9b9b9'; x.lineWidth = Math.max(3, e.w * S * 0.95); x.lineCap = 'square';
      x.beginPath(); x.moveTo(X(A.x), Z(A.z)); x.lineTo(X(B.x), Z(B.z)); x.stroke();
    }
    this.mapImg = c; this.mapS = S; this.X = X; this.Z = Z;
  }

  onLanguage() { this.locName = ''; this._prompt = null; this._obj = null; if (G.missions.active) this.objective(G.missions.stepText()); }

  /* ---------------- messages ---------------- */
  notify(text, secs = 4) { this.el.notify.innerHTML = fmt(text); this.el.notify.classList.add('show'); this.notifyT = secs; }
  objective(text) { if (this._obj === text) return; this._obj = text; this.el.obj.innerHTML = fmt(text); this.el.obj.style.opacity = text ? 1 : 0; }
  bigMessage(title, sub = '', color = '#ffd23f', secs = 4) {
    this.el.bigT.textContent = title; this.el.bigT.style.color = color; this.el.bigS.textContent = sub;
    this.el.big.classList.add('show'); this.bigT = secs;
  }
  missionTitle(title, intro) { this.el.mcTitle.textContent = title; this.el.mcIntro.textContent = intro; this.el.missionCard.classList.add('show'); this.cardT = 6; }
  moneyPop(v) { this.notify(`+₹${v}`, 1.5); }
  flashDamage() { this.el.dmg.style.opacity = 0.6; }
  speech(ped, text, secs = 3) {
    let b = this.bubbles.get(ped);
    if (!b) { b = { el: document.createElement('div') }; b.el.className = 'bubble'; this.el.bubbles.appendChild(b.el); this.bubbles.set(ped, b); }
    if (Array.isArray(text)) {
      const [ta, en] = text;
      b.el.innerHTML = G.settings.lang === 'ta' || !en ? `<span class="ta">${ta}</span>` : `<span class="ta">${ta}</span><small>${en}</small>`;
    } else b.el.textContent = text;
    b.t = secs;
  }
  removeSpeech(ped) { const b = this.bubbles.get(ped); if (b) { b.el.remove(); this.bubbles.delete(ped); } }

  /* ---------------- per-frame ---------------- */
  update(dt) {
    const P = G.player, pp = P.worldPos();
    // money ticks up GTA-style
    this.shownMoney += (G.money - this.shownMoney) * Math.min(1, dt * 6);
    if (Math.abs(G.money - this.shownMoney) < 1) this.shownMoney = G.money;
    this.el.money.textContent = '₹' + Math.round(this.shownMoney).toLocaleString('en-IN').padStart(8, '0');
    this.el.clock.textContent = G.env.clockString();
    this.el.weather.textContent = G.env.rain > 0.5 ? '🌧' : G.env.night > 0.5 ? '🌙' : '☀';
    this.el.health.style.width = `${(P.health / P.maxHealth) * 100}%`;
    this.el.health.parentElement.classList.toggle('low', P.health < 30);
    // stars
    const stars = this.el.stars.children, S = G.police.stars, blink = G.police.evading && Math.floor(G.time * 4) % 2;
    for (let i = 0; i < 5; i++) stars[i].className = i < S ? (blink ? 'on blink' : 'on') : '';
    // location name
    this.locCheck = (this.locCheck || 0) - dt;
    if (this.locCheck <= 0) {
      this.locCheck = 0.5;
      const d = DISTRICTS.find((r) => pp.x >= r.x0 && pp.x <= r.x1 && pp.z >= r.z0 && pp.z <= r.z1);
      const road = G.roads.onRoad(pp.x, pp.z);
      const name = d ? place(d.name) : t('outskirts');
      if (name !== this.locName) { this.locName = name; this.locTimer = 4; this.el.loc.innerHTML = `${name}${road ? `<small>${place(road.name)}</small>` : ''}`; this.el.loc.classList.add('show'); }
    }
    if (this.locTimer > 0) { this.locTimer -= dt; if (this.locTimer <= 0) this.el.loc.classList.remove('show'); }
    if (this.notifyT > 0) { this.notifyT -= dt; if (this.notifyT <= 0) this.el.notify.classList.remove('show'); }
    if (this.bigT > 0) { this.bigT -= dt; if (this.bigT <= 0) this.el.big.classList.remove('show'); }
    if (this.cardT > 0) { this.cardT -= dt; if (this.cardT <= 0) this.el.missionCard.classList.remove('show'); }
    this.el.dmg.style.opacity = Math.max(0, parseFloat(this.el.dmg.style.opacity || 0) - dt * 1.5);
    // mission timer
    const M = G.missions;
    if (M.active && M.timer > 0) { const t = Math.ceil(M.timer); this.el.timer.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; this.el.timer.style.display = 'block'; this.el.timer.classList.toggle('urgent', t <= 10); }
    else this.el.timer.style.display = 'none';
    // vehicle info
    const v = P.vehicle;
    if (v) {
      this.el.speed.style.display = 'block';
      this.el.speed.querySelector('b').textContent = Math.round(Math.abs(v.speed) * 3.6);
      this.el.vname.textContent = vlabel(v.type) + (v.type === 'police' ? t('siren') : '');
      this.el.vhp.style.width = `${(v.hp / v.cfg.hp) * 100}%`;
    } else this.el.speed.style.display = 'none';
    this.updatePrompt();
    this.updateBubbles(dt);
    this.drawMinimap(dt);
  }

  updatePrompt() {
    const P = G.player; let txt = '';
    if (!P.dead) {
      const giver = G.missions.nearbyGiver();
      if (giver) txt = t('p.mission', G.missions.title(giver));
      else if (!P.vehicle) {
        let near = null, bd = 4.2;
        for (const v of G.vehicles) { if (v.destroyed) continue; const d = Math.hypot(v.pos.x - P.pos.x, v.pos.z - P.pos.z) - v.cfg.length * 0.3; if (d < bd) { bd = d; near = v; } }
        if (near) txt = t(near.driver && near.driver !== 'player' ? 'p.jack' : 'p.enter', vlabel(near.type));
        else { const sh = (G.world.shops || []).find((s) => Math.hypot(s.x - P.pos.x, s.z - P.pos.z) < 3.2); if (sh) { const T = SHOP_TYPES[sh.type]; txt = t('p.shop', G.settings.lang === 'ta' ? T.ta : T.en, T.price); } }
        if (!txt && false) txt = '';
        if (!txt && G.peds.some((p) => !p.dead && !p.down && Math.hypot(p.pos.x - P.pos.x, p.pos.z - P.pos.z) < 2.8)) txt = t('p.talk');
      } else if (Math.abs(P.vehicle.speed) < 9) txt = '';
    }
    if (txt !== this._prompt) { this._prompt = txt; this.el.prompt.innerHTML = txt; this.el.prompt.style.opacity = txt ? 1 : 0; }
  }

  updateBubbles(dt) {
    const v = new THREE.Vector3(), w = innerWidth, h = innerHeight;
    for (const [ped, b] of this.bubbles) {
      b.t -= dt;
      if (b.t <= 0 || ped.dead || !G.peds.includes(ped)) { this.removeSpeech(ped); continue; }
      v.set(ped.pos.x, ped.pos.y + 2.25, ped.pos.z).project(G.camera);
      const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      b.el.style.display = vis ? 'block' : 'none';
      if (vis) b.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
    }
  }

  /* ---------------- minimap ---------------- */
  gpsTarget() {
    const t = G.missions.currentTarget();
    if (t) return t;
    return G.waypoint || null;
  }

  updateGPS(dt) {
    this.gpsT -= dt;
    const tgt = this.gpsTarget();
    if (!tgt) { this.gps = null; return; }
    if (this.gpsT > 0) return;
    this.gpsT = 1.0;
    const R = G.roads, pp = G.player.worldPos();
    const a = R.nearestNode(pp.x, pp.z), b = R.nearestNode(tgt.x, tgt.z);
    const path = R.path(a.id, b.id);
    this.gps = path ? [[pp.x, pp.z], ...path.map((id) => [R.nodes[id].x, R.nodes[id].z]), [tgt.x, tgt.z]] : null;
  }

  drawMinimap(dt) {
    this.updateGPS(dt);
    const c = this.el.mini, x = this.miniCtx, W = c.width, H = c.height, R = W / 2;
    const P = G.player, pp = P.worldPos();
    const speed = P.vehicle ? Math.abs(P.vehicle.speed) : 0;
    const zoom = this.miniZoom = (this.miniZoom || 1.4) + ((clamp(1.6 - speed / 40, 0.75, 1.6)) - (this.miniZoom || 1.4)) * Math.min(1, dt * 2);
    const yaw = G.cam.yaw;
    const rot = -Math.PI / 2 - Math.atan2(Math.cos(yaw), Math.sin(yaw));
    x.save(); x.clearRect(0, 0, W, H);
    x.beginPath(); x.arc(R, R, R - 3, 0, Math.PI * 2); x.clip();
    x.fillStyle = '#1b6a8a'; x.fillRect(0, 0, W, H);
    x.translate(R, R); x.rotate(rot); x.scale(zoom, zoom);
    x.drawImage(this.mapImg, -this.X(pp.x), -this.Z(pp.z));
    const wx = (X) => X - pp.x, wz = (Z) => Z - pp.z;
    // GPS route
    if (this.gps) {
      x.strokeStyle = G.missions.active ? '#ffe94d' : '#e040fb'; x.lineWidth = 5 / zoom; x.lineJoin = 'round';
      x.beginPath(); this.gps.forEach(([gx, gz], i) => (i ? x.lineTo(wx(gx), wz(gz)) : x.moveTo(wx(gx), wz(gz)))); x.stroke();
    }
    x.restore();
    // blips in screen space (rotated)
    const toScreen = (X, Z) => {
      const dx = (X - pp.x) * zoom, dz = (Z - pp.z) * zoom;
      const cs = Math.cos(rot), sn = Math.sin(rot);
      return [R + dx * cs - dz * sn, R + dx * sn + dz * cs];
    };
    const blip = (X, Z, color, size = 5, label, clampEdge = false, shape = 'circle') => {
      let [sx, sy] = toScreen(X, Z);
      const dx = sx - R, dy = sy - R, d = Math.hypot(dx, dy);
      if (d > R - 10) { if (!clampEdge) return; sx = R + (dx / d) * (R - 10); sy = R + (dy / d) * (R - 10); }
      x.fillStyle = color; x.strokeStyle = '#000'; x.lineWidth = 1.5;
      x.beginPath();
      if (shape === 'square') x.rect(sx - size, sy - size, size * 2, size * 2); else x.arc(sx, sy, size, 0, Math.PI * 2);
      x.fill(); x.stroke();
      if (label) { x.fillStyle = '#000'; x.font = `bold ${size * 1.5}px Arial`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, sx, sy + 0.5); }
    };
    // landmarks
    blip(POI.hospital.x, POI.hospital.z, '#ffffff', 6, 'H');
    blip(POI.police.x, POI.police.z, '#448aff', 6, 'P');
    for (const s of G.world.shops || []) blip(s.x, s.z, s.type === 'tea' ? '#a1887f' : '#ffb74d', 3, '');
    for (const m of G.missions.available()) if (!G.missions.active) blip(m.giver.x, m.giver.z, m.color, 7, G.missions.title(m)[0], true, 'square');
    for (const v of G.vehicles) if (v.type === 'police' && v.siren && v.driver !== 'player') blip(v.pos.x, v.pos.z, Math.floor(G.time * 5) % 2 ? '#ff1744' : '#2979ff', 4, '', true);
    for (const p of G.peds) if (p.kind === 'cop' && G.police.stars > 0 && !p.dead) blip(p.pos.x, p.pos.z, '#2979ff', 3);
    const t = this.gpsTarget(); if (t) blip(t.x, t.z, G.missions.active ? '#ffe94d' : '#e040fb', 6, '', true);
    // player arrow (always up = camera direction; rotate by heading-yaw)
    const heading = P.vehicle ? P.vehicle.heading : P.yaw;
    x.save(); x.translate(R, R); x.rotate(-(heading - yaw));
    x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, -9); x.lineTo(6, 7); x.lineTo(0, 3); x.lineTo(-6, 7); x.closePath(); x.fill(); x.stroke();
    x.restore();
    // north marker
    const [nx, ny] = toScreen(pp.x, pp.z - 1000); const nd = Math.hypot(nx - R, ny - R);
    const ex = R + ((nx - R) / nd) * (R - 12), ey = R + ((ny - R) / nd) * (R - 12);
    x.fillStyle = '#000'; x.beginPath(); x.arc(ex, ey, 8, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 11px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('N', ex, ey + 1);
    // ring
    x.strokeStyle = 'rgba(0,0,0,0.85)'; x.lineWidth = 5; x.beginPath(); x.arc(R, R, R - 3, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 1.5; x.beginPath(); x.arc(R, R, R - 6, 0, Math.PI * 2); x.stroke();
  }

  /* ---------------- full-screen map ---------------- */
  openMap() { this.el.mapWrap.style.display = 'flex'; this.drawBigMap(); }
  closeMap() { this.el.mapWrap.style.display = 'none'; }
  drawBigMap() {
    const c = this.el.mapCanvas; const maxW = innerWidth * 0.92, maxH = innerHeight * 0.84;
    const img = this.mapImg; const s = Math.min(maxW / img.width, maxH / img.height);
    c.width = img.width * s; c.height = img.height * s; this.bigScale = s;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, c.width, c.height);
    const P = (wx, wz) => [this.X(wx) * s, this.Z(wz) * s];
    x.font = 'bold 13px Arial'; x.textAlign = 'center';
    for (const [n0, lx, lz] of MAP_LABELS) { const n = place(n0); const [px, pz] = P(lx, lz); x.lineWidth = 3; x.strokeStyle = '#000'; x.strokeText(n, px, pz); x.fillStyle = '#fff'; x.fillText(n, px, pz); }
    for (const m of G.missions.available()) { const [px, pz] = P(m.giver.x, m.giver.z); x.fillStyle = m.color; x.fillRect(px - 6, pz - 6, 12, 12); x.strokeStyle = '#000'; x.strokeRect(px - 6, pz - 6, 12, 12); x.fillStyle = '#000'; x.font = 'bold 10px Arial'; x.fillText(G.missions.title(m)[0], px, pz + 4); }
    const dot = (wx, wz, col, label) => { const [px, pz] = P(wx, wz); x.fillStyle = col; x.beginPath(); x.arc(px, pz, 6, 0, 7); x.fill(); x.strokeStyle = '#000'; x.stroke(); x.fillStyle = '#000'; x.font = 'bold 9px Arial'; x.fillText(label, px, pz + 3); };
    dot(POI.hospital.x, POI.hospital.z, '#fff', 'H'); dot(POI.police.x, POI.police.z, '#448aff', 'P');
    if (G.waypoint) { const [px, pz] = P(G.waypoint.x, G.waypoint.z); x.fillStyle = '#e040fb'; x.beginPath(); x.arc(px, pz, 7, 0, 7); x.fill(); }
    const pp = G.player.worldPos(); const [px, pz] = P(pp.x, pp.z);
    x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 2; x.beginPath(); x.arc(px, pz, 7, 0, 7); x.fill(); x.stroke();
    x.fillStyle = '#ff4fa3'; x.beginPath(); x.arc(px, pz, 3, 0, 7); x.fill();
  }
  onMapClick(e) {
    const r = this.el.mapCanvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) / this.bigScale / this.mapS + WORLD.minX, mz = (e.clientY - r.top) / this.bigScale / this.mapS + WORLD.minZ;
    if (e.button === 2) G.waypoint = null; else G.waypoint = { x: mx, z: mz };
    this.gpsT = 0; this.drawBigMap();
  }
}
