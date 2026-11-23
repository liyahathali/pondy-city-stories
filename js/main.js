// Entry point: boots the renderer, builds Pondicherry, runs the game loop, menus and save/load.
import * as THREE from 'three';
import { G } from './state.js';
import { ColliderGrid, Walkables } from './collision.js';
import { RoadNetwork } from './roads.js';
import { makeTextures, setPixelStyle } from './textures.js';
import { setHumanAtlas, loadVehicleModels } from './models.js';
import { RealHumans } from './realhumans.js';
import { BeachLife } from './beachlife.js';
import { Conversations } from './dialogue.js';
import { Animals } from './animals.js';
import { World } from './world.js';
import { Environment } from './environment.js';
import { Player, CameraRig } from './player.js';
import { Vehicle, VTYPES } from './vehicle.js';
import { Traffic } from './traffic.js';
import { PedManager } from './peds.js';
import { Police } from './police.js';
import { FX } from './fx.js';
import { Pickups } from './pickups.js';
import { Missions } from './missions.js';
import { HUD } from './hud.js';
import { Audio } from './audio.js';
import { Input } from './input.js';
import { POI } from './config.js';
import { t, applyStatic, vlabel } from './i18n.js';
import { Speech } from './speech.js';
import { Post } from './post.js';
import { Radio } from './radio.js';
import { TouchControls, isTouchDevice, goFullscreenLandscape } from './touch.js';

const SAVE_KEY = 'pondy_city_save_v1';
const SETTINGS_KEY = 'pondy_city_settings_v1';
const $ = (id) => document.getElementById(id);
// wait for the next frame, but never longer than 150 ms (some browsers throttle rAF while busy compiling shaders)
const frame = () => new Promise((r) => { let done = false; const go = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(() => setTimeout(go, 0)); setTimeout(go, 150); });

// Persistent parked vehicles at landmarks (respawn at home when you are far away)
const PARKED = [
  ['scooter', 495, -118, Math.PI], ['motorcycle', 495, -108, Math.PI], ['car', 495, -150, Math.PI],
  ['auto', -350, -150, Math.PI], ['bus', -372, -175, Math.PI / 2], ['bus', -372, -160, Math.PI / 2], ['bus', -372, -143, Math.PI / 2],
  ['police', 152, -100, Math.PI], ['police', 152, -60, Math.PI], ['taxi', 200, 305, Math.PI / 2], ['motorcycle', -1096.5, -70, Math.PI],
  ['car', 490, 1255, -Math.PI / 2], ['scooter', 424, -30, 0], ['cycle', 495, -126, Math.PI], ['cycle', 426, -60, 0], ['auto', 176, 30, 0], ['car', -145.5, -230, 0], ['scooter', 15.5, 140, Math.PI],
  ['flycar', 495, -142, Math.PI], ['flycar', 424, -48, 0],
  ['twostroke', 495, -112, Math.PI], ['vintage', 495, -104, Math.PI], ['retro80', 424, -36, 0], ['commuter', 426, -66, 0], ['moped', 495, -130, Math.PI],
];

function showErrLater(e) { setTimeout(() => { const el = document.getElementById('loadText'); if (el) { el.parentElement.classList.remove('hidden'); el.textContent = 'Menu error: ' + e.message; } }, 0); }

class Game {
  constructor() {
    G.game = this;
    try { Object.assign(G.settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) { /* ignore */ }
    if (!G.settings.lang) G.settings.lang = 'en';
    applyStatic();
    this.canvas = $('game');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.2, 5000);
    G.scene = this.scene; G.camera = this.camera; G.renderer = this.renderer;
    G.post = this.post = new Post(this.renderer);
    this.applyQuality();
    addEventListener('resize', () => this.resize()); this.resize();
    this.autoQuality();
    G.input = new Input(this.canvas);
    G.isTouch = isTouchDevice();
    if (G.isTouch) { G.touch = new TouchControls(G.input); G.input.touch = true; }
    G.audio = new Audio();
    G.speech = new Speech();
    if (G.settings.voices === undefined) G.settings.voices = true;
    this.last = performance.now();
    this.state = 'loading';
    this.slowmo = 1;
    this.boot();
  }

  /** Pick Low graphics automatically on light/integrated GPUs (once; the player can change it in Settings). */
  autoQuality() {
    if (G.settings.autoQ) return;
    let gpu = '';
    try { const gl = this.renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); gpu = e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; } catch (e) { /* ignore */ }
    const weak = /vega (3|6|8)|radeon\(tm\) graphics|intel.*(hd|uhd|iris)|mali|adreno|powervr|swiftshader|llvmpipe|basic render/i.test(gpu) || (navigator.hardwareConcurrency || 8) <= 4;
    const phone = isTouchDevice();
    G.settings.quality = weak || phone ? 'low' : 'medium';
    if (phone) { G.settings.renderScale = 0.6; G.settings.pixel = true; }
    G.settings.autoQ = true; G.gpu = gpu;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(G.settings)); } catch (e) { /* ignore */ }
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight, false);
    if (this.post) this.post.setSize(innerWidth, innerHeight, this.renderer.getPixelRatio());
  }

  applyQuality() {
    const q = G.settings.quality;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, q === 'high' ? 1.5 : 1.0));
    // upscaler: render the 3D scene at a lower resolution and sharpen it up to full screen
    if (G.settings.renderScale === undefined) G.settings.renderScale = q === 'high' ? 1 : q === 'medium' ? 0.85 : 0.7;
    if (G.settings.effects === undefined) G.settings.effects = true;
    if (G.settings.pixel === undefined) G.settings.pixel = true;
    if (G.settings.realChars === undefined) G.settings.realChars = true;
    if (G.animals) G.animals.cap = q === 'high' ? 14 : q === 'medium' ? 10 : 6;
    if (G.real) G.real.limit = q === 'high' ? 30 : q === 'medium' ? 18 : 10;
    if (G.isTouch) { if (G.real) G.real.limit = Math.min(G.real.limit, 5); if (G.animals) G.animals.cap = Math.min(G.animals.cap, 6); }
    setPixelStyle(G.tex, G.settings.pixel);
    if (this.post) { this.post.scale = G.settings.renderScale; this.post.effects = G.settings.effects; }
    this.renderer.shadowMap.enabled = q !== 'low';
    if (G.env) { G.env.sun.castShadow = q !== 'low'; G.env.sun.shadow.mapSize.set(q === 'high' ? 2048 : 1024, q === 'high' ? 2048 : 1024); if (G.env.sun.shadow.map) { G.env.sun.shadow.map.dispose(); G.env.sun.shadow.map = null; } }
    if (G.traffic) G.traffic.target = q === 'high' ? 34 : q === 'medium' ? 22 : 12;
    if (G.pedMgr) { G.pedMgr.target = q === 'high' ? 55 : q === 'medium' ? 32 : 18; G.pedMgr.cap = q === 'high' ? 120 : q === 'medium' ? 72 : 38; }
    this.camera.far = q === 'low' ? 650 : q === 'medium' ? 1400 : 5000; this.camera.updateProjectionMatrix();
    if (G.env) G.env.farLimit = this.camera.far * 0.95;
    this.resize();
  }

  async step(pct, text) { $('loadFill').style.width = pct + '%'; $('loadText').textContent = text; await frame(); }

  async boot() {
    try {
      await this.step(5, t('load.textures'));
      const T = makeTextures(); G.tex = T; setHumanAtlas(T.human); setPixelStyle(T, G.settings.pixel !== false);
      await this.step(15, t('load.streets'));
      G.colliders = new ColliderGrid(24); G.walkables = new Walkables();
      G.roads = new RoadNetwork(); G.roads.buildMeshes(this.scene, T);
      await this.step(30, t('load.city'));
      G.world = new World(this.scene, T, G.roads, G.colliders);
      await this.step(70, t('load.sky'));
      G.env = new Environment(this.scene, this.renderer);
      G.fx = new FX(this.scene);
      G.cam = new CameraRig(this.camera);
      await this.step(80, t('load.people'));
      try { await loadVehicleModels(); } catch (e) { console.warn(e); }
      G.player = new Player(POI.spawn.x, POI.spawn.z, -Math.PI / 2);
      G.cam.yaw = -Math.PI / 2;
      G.traffic = new Traffic(); G.pedMgr = new PedManager(); G.police = new Police();
      G.pickups = new Pickups(); G.missions = new Missions();
      G.hud = new HUD();
      G.animals = new Animals();
      G.beach = new BeachLife(this.scene);
      G.convos = new Conversations();
      G.real = new RealHumans(); G.real.load().then(() => this.applyQuality()).catch((e) => console.warn('realistic characters unavailable:', e));
      G.radio = new Radio();
      this.spawnParked();
      G.world.setSignalPhase(0);
      this.applyQuality();
      await this.step(92, t('load.shaders'));
      G.env.update(0.016, G.player.pos);
      G.cam.update(0.016);
      this.renderer.compile(this.scene, this.camera);
      this.renderer.render(this.scene, this.camera);
      $('loadFill').style.width = '100%'; $('loadText').textContent = t('load.ready'); this.loaded = true;
      $('loading').classList.add('hidden'); $('titleMenu').classList.remove('hidden');
      $('btnContinue').disabled = !localStorage.getItem(SAVE_KEY);
      this.state = 'title';
      try { this.bindUI(); } catch (e) { console.error(e); showErrLater(e); }
      this.loop();
    } catch (err) {
      console.error(err);
      $('loadText').textContent = 'Error while loading: ' + err.message;
    }
  }

  spawnParked() {
    for (const [type, x, z, h] of PARKED) G.vehicles.push(new Vehicle(type, x, z, h, { persistent: true, parked: true }));
  }

  /* ------------------------------------------------------------ */
  bindUI() {
    const show = (id) => { for (const s of ['pause', 'controls', 'settings', 'garage']) $(s).classList.add('hidden'); if (id) $(id).classList.remove('hidden'); };
    this.show = show;
    $('btnNew').onclick = () => { if (G.isTouch) goFullscreenLandscape(); G.audio.init(); this.newGame(); };
    $('btnContinue').onclick = () => { if (G.isTouch) goFullscreenLandscape(); G.audio.init(); this.newGame(); this.load(); };
    $('btnResume').onclick = () => this.resume();
    $('btnSave').onclick = () => { this.save(); this.renderPauseStats(t('saved.pause')); };
    $('btnLoad').onclick = () => { if (this.load()) this.resume(); else this.renderPauseStats(t('nosave')); };
    $('btnMap').onclick = () => { show(null); this.openMap(); };
    $('btnQuit').onclick = () => location.reload();
    // Fullscreen (works in Edge/Chrome/Firefox; F11 also works)
    document.querySelectorAll('.btnFull').forEach((b) => (b.onclick = () => {
      if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
    }));
    document.querySelectorAll('.btnControls').forEach((b) => (b.onclick = () => { this.backTo = this.state === 'title' ? null : 'pause'; show('controls'); }));
    document.querySelectorAll('.btnSettings').forEach((b) => (b.onclick = () => { this.backTo = this.state === 'title' ? null : 'pause'; this.syncSettings(); show('settings'); }));
    document.querySelectorAll('.btnBack').forEach((b) => (b.onclick = () => { if (this.state === 'garage') return this.resume(); show(this.backTo); }));
    const saveSettings = () => { localStorage.setItem(SETTINGS_KEY, JSON.stringify(G.settings)); };
    $('setQuality').onchange = (e) => { G.settings.quality = e.target.value; delete G.settings.renderScale; this.applyQuality(); this.syncSettings(); saveSettings(); };
    $('setSens').oninput = (e) => { G.settings.sensitivity = +e.target.value; saveSettings(); };
    $('setVol').oninput = (e) => { G.settings.volume = +e.target.value; G.audio.setVolume(G.settings.volume); saveSettings(); };
    $('setInvert').onchange = (e) => { G.settings.invertY = e.target.checked; saveSettings(); };
    $('setVoices').onchange = (e) => { G.settings.voices = e.target.checked; if (!e.target.checked) G.speech.stop(); saveSettings(); };
    $('setRadioVol').oninput = (e) => { G.settings.radioVolume = +e.target.value; saveSettings(); };
    $('setScale').oninput = (e) => { G.settings.renderScale = +e.target.value; $('scaleVal').textContent = Math.round(G.settings.renderScale * 100) + '%'; this.applyQuality(); saveSettings(); };
    $('setFx').onchange = (e) => { G.settings.effects = e.target.checked; this.applyQuality(); saveSettings(); };
    $('setPixel').onchange = (e) => { G.settings.pixel = e.target.checked; this.applyQuality(); saveSettings(); };
    $('setReal').onchange = (e) => { G.settings.realChars = e.target.checked; saveSettings(); };
    // language
    const setLang = (l) => { G.settings.lang = l; saveSettings(); applyStatic(); this.buildGarage(); $('setLang').value = l; if (G.hud) G.hud.onLanguage(); };
    $('setLang').onchange = (e) => setLang(e.target.value);
    $('btnLang').onclick = () => setLang(G.settings.lang === 'ta' ? 'en' : 'ta');
    this.buildGarage();
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.state === 'playing' && !this.ignoreUnlock) this.pause();
      this.ignoreUnlock = false;
    });
  }

  buildGarage() {
    const icons = { car: '🚗', taxi: '🚕', police: '🚓', auto: '🛺', motorcycle: '🏍️', scooter: '🛵', cycle: '🚲', bus: '🚌', moped: '🛵', twostroke: '🏍️', vintage: '🛵', commuter: '🏍️', retro80: '🛵', flycar: '🛸' };
    const grid = $('garageGrid'); grid.innerHTML = '';
    for (const [k, c] of Object.entries(VTYPES)) {
      const b = document.createElement('button');
      b.innerHTML = `<div class="ico">${icons[k]}</div><div class="nm">${vlabel(k)}</div><div class="st">${t('garage.top', Math.round(c.maxSpeed * 3.6))}</div>`;
      b.onclick = () => { this.spawnSelected(k); this.resume(); };
      grid.appendChild(b);
    }
  }

  syncSettings() {
    $('setLang').value = G.settings.lang;
    $('setQuality').value = G.settings.quality; $('setSens').value = G.settings.sensitivity;
    $('setVol').value = G.settings.volume; $('setInvert').checked = G.settings.invertY;
    $('setScale').value = G.settings.renderScale ?? 1; $('scaleVal').textContent = Math.round((G.settings.renderScale ?? 1) * 100) + '%'; $('setFx').checked = G.settings.effects !== false; $('setPixel').checked = G.settings.pixel !== false; $('setReal').checked = G.settings.realChars !== false;
    $('setVoices').checked = G.settings.voices !== false; $('setRadioVol').value = G.settings.radioVolume ?? 0.6;
  }

  newGame() {
    $('title').classList.add('hidden'); $('hud').classList.remove('hidden');
    this.state = 'playing'; G.paused = false;
    G.input.lock();
    G.hud.bigMessage(t('welcome.title'), t('welcome.sub'), '#ff4fa3', 4.5);
    setTimeout(() => G.hud.notify(t('tutorial'), 9), 2500);
    setTimeout(() => { if (!G.speech.hasTamil) G.hud.notify(t('noTamilVoice'), 10); }, 13000);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused'; G.paused = true; this.renderPauseStats();
    this.show('pause'); G.input.unlock();
  }
  resume() {
    this.show(null); this.closeMap(true);
    this.state = 'playing'; G.paused = false; this.ignoreUnlock = false;
    G.input.lock(); G.audio.init();
  }
  renderPauseStats(msg = '') {
    const s = G.stats;
    $('pauseStats').innerHTML = `${msg ? `<b style="color:#ffd23f">${msg}</b><br>` : ''}${t('pause.stats', G.money.toLocaleString('en-IN'), G.missions.done.size, G.pickups.collected.size, (s.distance / 1000).toFixed(1), G.env.clockString())}`;
  }
  openMap() { this.state = 'map'; G.paused = true; this.ignoreUnlock = true; G.input.unlock(); G.hud.openMap(); }
  closeMap(silent) { G.hud.closeMap(); if (!silent && this.state === 'map') this.resume(); }
  openGarage() { this.state = 'garage'; G.paused = true; this.ignoreUnlock = true; G.input.unlock(); this.show('garage'); }

  spawnSelected(type) {
    const P = G.player; if (P.vehicle) P.exitVehicle(true);
    // remove previously delivered vehicle if unused
    if (this.delivered && this.delivered.driver !== 'player') { const i = G.vehicles.indexOf(this.delivered); if (i >= 0) { this.delivered.dispose(); G.vehicles.splice(i, 1); } }
    const ne = G.roads.nearestEdge(P.pos.x, P.pos.z, 60);
    let x, z, h;
    if (ne && ne.d < 40) {
      const p = G.roads.lanePoint(ne.edge, ne.edge.a, ne.t, ne.edge.w / 4, {});
      x = p.x; z = p.z; h = Math.atan2(p.dx, p.dz);
    } else { x = P.pos.x + Math.sin(P.yaw) * 4; z = P.pos.z + Math.cos(P.yaw) * 4; h = P.yaw; }
    for (const v of [...G.vehicles]) if (v.driver !== 'player' && !v.persistent && Math.hypot(v.pos.x - x, v.pos.z - z) < 7) { v.dispose(); G.vehicles.splice(G.vehicles.indexOf(v), 1); }
    const v = new Vehicle(type, x, z, h, { parked: true }); v.official = type === 'police';
    G.vehicles.push(v); this.delivered = v;
    G.fx.sparkle(x, 1.5, z, 0x23d5c7);
    G.hud.notify(t('delivered', vlabel(type)));
  }

  /* ------------------------------------------------------------ */
  wasted(cause) {
    if (this.respawning) return; this.respawning = true;
    G.hud.bigMessage(t('wasted'), '', '#ff3b3b', 3.5); G.audio.wasted();
    G.missions.fail(''); this.slowmo = 0.3;
    setTimeout(() => this.respawn(POI.hospital.respawn, t('hospitalBill')), 3200);
  }
  busted() {
    if (this.respawning) return; this.respawning = true;
    G.hud.bigMessage(t('busted'), '', '#64b5ff', 3.5); G.audio.wasted();
    G.missions.fail(''); this.slowmo = 0.3;
    if (G.player.vehicle) G.player.exitVehicle(true);
    G.player.dead = true;
    setTimeout(() => this.respawn(POI.police.respawn, t('fine')), 3200);
  }
  respawn(at, msg) {
    $('fade').style.opacity = 1;
    setTimeout(() => {
      const P = G.player;
      if (P.vehicle) P.exitVehicle(true);
      P.pos.set(at.x, 0, at.z); P.health = P.maxHealth; P.dead = false; P.downT = 0; P.invuln = 3;
      G.money = Math.max(0, G.money - 100);
      G.police.clear();
      G.cam.target.set(at.x, 1.6, at.z);
      for (const p of [...G.peds]) if (p.kind === 'cop') { p.dispose(); G.peds.splice(G.peds.indexOf(p), 1); }
      this.slowmo = 1; this.respawning = false;
      $('fade').style.opacity = 0;
      G.hud.notify(msg);
    }, 900);
  }

  /* ------------------------------------------------------------ */
  save(auto = false) {
    const P = G.player, pp = P.worldPos();
    const data = {
      v: 1, money: G.money, health: P.health, pos: [pp.x, pp.z], yaw: P.vehicle ? P.vehicle.heading : P.yaw,
      hour: G.env.hour, missions: [...G.missions.done], pickups: [...G.pickups.collected], stats: G.stats, savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    $('btnContinue').disabled = false;
    G.hud.notify(t(auto ? 'saved.auto' : 'saved'), 2);
  }
  load() {
    let d; try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { d = null; }
    if (!d) return false;
    const P = G.player;
    if (P.vehicle) P.exitVehicle(true);
    if (G.missions.active) G.missions.cleanup();
    G.money = d.money; P.health = d.health || 100; P.pos.set(d.pos[0], 0, d.pos[1]); P.yaw = d.yaw || 0;
    if (G.colliders.pointBlocked(P.pos.x, P.pos.z, 0.5)) P.pos.set(POI.spawn.x, 0, POI.spawn.z);
    G.env.hour = d.hour ?? 17.3;
    G.missions.done = new Set(d.missions || []); G.missions.cleanup();
    G.pickups.applySave(d.pickups);
    Object.assign(G.stats, d.stats || {});
    G.police.clear();
    G.traffic.clear(); G.pedMgr.clear(); this.spawnParked();
    G.cam.yaw = P.yaw; G.cam.target.set(P.pos.x, 1.6, P.pos.z);
    G.hud.notify(t('loaded'), 2);
    return true;
  }

  /* ------------------------------------------------------------ */
  handleGlobalKeys() {
    const I = G.input;
    if (this.state === 'playing') {
      if (I.hit('Escape') || I.hit('KeyP')) this.pause();
      else if (I.hit('KeyM')) this.openMap();
      else if (I.hit('KeyV')) this.openGarage();
      else if (I.hit('KeyN')) { const r = G.env.toggleWeather(); G.hud.notify(t(r ? 'rain.on' : 'rain.off')); }
      else if (I.hit('KeyR')) G.radio.next();
      else if (I.hit('KeyK')) this.save();
      else if (I.hit('KeyL')) this.load();
    } else if (this.state === 'map') {
      if (I.hit('KeyM') || I.hit('Escape')) this.closeMap();
    } else if (this.state === 'garage') {
      if (I.hit('KeyV') || I.hit('Escape')) this.resume();
    } else if (this.state === 'paused') {
      if (I.hit('KeyP')) this.resume();
    }
    G.env.timeScale = this.state === 'playing' && I.key('KeyT') ? 25 : 1;
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    try { this.tick(); } catch (e) { if (!this._errShown) { this._errShown = true; console.error(e); G.hud && G.hud.notify('⚠ ' + e.message, 10); } }
  }

  tick() {
    const now = performance.now(); let dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.handleGlobalKeys();
    const playing = this.state === 'playing';
    if (playing || this.state === 'title') {
      const sdt = dt * this.slowmo;
      G.time += sdt;
      if (playing) {
        G.player.update(sdt);
        G.traffic.update(sdt);
        G.pedMgr.update(sdt);
        G.animals && G.animals.update(sdt);
        G.beach && G.beach.update(sdt);
        G.convos && G.convos.update(sdt);
        if (G.player && !G.playerSpeaker) G.playerSpeaker = { pos: G.player.pos, keepBubble: true, voice: { female: false, pitchJ: 0, rate: 1 }, h: G.player.h };
        G.police.update(sdt);
        G.missions.update(sdt);
        G.pickups.update(sdt);
      } else {
        // title screen: slow orbit around the Gandhi statue at sunset
        G.cam.yaw += dt * 0.05; // title screen: keep it light (crowds spawn once you start)
      }
      G.cam.update(sdt);
      G.env.update(sdt, G.player.worldPos());
      G.env.updateHeadlight(G.player.vehicle);
      G.world.update(sdt, G.time);
      G.fx.update(sdt);
      if (G.real) { if (G.settings.realChars !== false) G.real.update(sdt); else if (G.real.active.size) for (const av of [...G.real.active]) G.real.detach(av.host); }
      if (playing) G.hud.update(sdt);
      G.audio.update(sdt);
      G.radio && G.radio.update(dt, playing);
    }
    if (G.touch) G.touch.update(this.state);
    G.input.endFrame();
    this.post.render(this.scene, this.camera, G.time, G.env ? G.env.grade : { bloom: 0.5, threshold: 1, saturation: 1.1, tint: new THREE.Vector3(1, 1, 1) });
  }
}

window.G = G; // handy for debugging from the browser console
// Show unexpected errors on screen instead of silently freezing
const showErr = (msg) => { console.error(msg); const el = document.getElementById('loadText'); if (el && !(G.game && G.game.loaded)) el.textContent = 'Error: ' + msg; else if (G.hud) G.hud.notify('⚠ ' + msg, 8); };
addEventListener('error', (e) => showErr(e.message || String(e)));
addEventListener('unhandledrejection', (e) => showErr((e.reason && e.reason.message) || String(e.reason)));
new Game();

// offline cache / installable app (works on https hosting such as GitHub Pages, and on localhost)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
