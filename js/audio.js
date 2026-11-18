// Fully synthesised audio (WebAudio): engine, horns, siren, rain, sea waves, impacts, UI blips.
import { G } from './state.js';

export class Audio {
  constructor() { this.ctx = null; this.ready = false; }

  init() {
    if (this.ready) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = G.settings.volume; this.master.connect(ctx.destination);
    // noise buffer
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    // engine
    this.engOsc = ctx.createOscillator(); this.engOsc.type = 'sawtooth';
    this.engOsc2 = ctx.createOscillator(); this.engOsc2.type = 'square';
    this.engFilter = ctx.createBiquadFilter(); this.engFilter.type = 'lowpass'; this.engFilter.frequency.value = 600;
    this.engGain = ctx.createGain(); this.engGain.gain.value = 0;
    this.engOsc.connect(this.engFilter); this.engOsc2.connect(this.engFilter); this.engFilter.connect(this.engGain); this.engGain.connect(this.master);
    this.engOsc.start(); this.engOsc2.start();
    // siren
    this.sirOsc = ctx.createOscillator(); this.sirOsc.type = 'triangle'; this.sirGain = ctx.createGain(); this.sirGain.gain.value = 0;
    this.sirOsc.connect(this.sirGain); this.sirGain.connect(this.master); this.sirOsc.start();
    // ambience loops: rain, waves, city
    const loop = (freq, type, q = 0.7) => {
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0; src.connect(f); f.connect(g); g.connect(this.master); src.start();
      return g;
    };
    this.rainGain = loop(2500, 'highpass');
    this.waveGain = loop(500, 'lowpass');
    this.cityGain = loop(300, 'bandpass', 0.4);
    this.ready = true;
  }

  setVolume(v) { if (this.master) this.master.gain.value = v; }

  vol(pos, range = 120) {
    if (!pos) return 1;
    const p = G.camera.position; const d = Math.hypot(pos.x - p.x, pos.z - p.z);
    return Math.max(0, 1 - d / range);
  }

  tone(freq, dur, type = 'square', gain = 0.2, slide = 0, delay = 0) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  }
  burst(dur, freq, gain = 0.4, type = 'lowpass') {
    if (!this.ready) return;
    const t = this.ctx.currentTime, s = this.ctx.createBufferSource(); s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  horn(pos, pitch = 1) { const v = this.vol(pos, 90) * 0.18; if (v < 0.01) return; this.tone(410 * pitch, 0.35, 'square', v); this.tone(520 * pitch, 0.35, 'square', v * 0.8); }
  crash(k, pos) { const v = this.vol(pos, 80); this.burst(0.4 + k * 0.4, 900, 0.5 * k * v + 0.05); this.tone(90, 0.3, 'sawtooth', 0.15 * k * v, -40); }
  explosion(pos) { const v = this.vol(pos, 200); this.burst(1.8, 400, 0.9 * v); this.tone(60, 1.2, 'sawtooth', 0.4 * v, -30); }
  punch() { this.burst(0.08, 1500, 0.35); this.tone(140, 0.08, 'sine', 0.3, -60); }
  whoosh() { this.burst(0.12, 3000, 0.06, 'highpass'); }
  thud(pos) { this.burst(0.15, 300, 0.4 * this.vol(pos, 60)); }
  jump() { this.tone(240, 0.08, 'sine', 0.05, 80); }
  door() { this.tone(180, 0.06, 'square', 0.08); this.tone(120, 0.08, 'square', 0.08, 0, 0.07); }
  pickup() { [660, 880, 1320].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.15, 0, i * 0.06)); }
  wantedUp() { this.tone(300, 0.25, 'sawtooth', 0.12, 200); }
  wantedClear() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.15, 0, i * 0.1)); }
  missionPass() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'square', 0.12, 0, i * 0.13)); }
  missionFail() { [400, 300, 200].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.12, 0, i * 0.2)); }
  checkpoint() { this.tone(880, 0.15, 'triangle', 0.18); this.tone(1320, 0.2, 'triangle', 0.15, 0, 0.08); }
  chatter() { for (let i = 0; i < 5; i++) this.tone(180 + Math.random() * 160, 0.07, 'triangle', 0.05, 30, i * 0.08); }
  thunder() { this.burst(2.5, 120, 0.8); }
  wasted() { this.tone(200, 1.5, 'sawtooth', 0.2, -150); }

  update(dt) {
    if (!this.ready) return;
    const P = G.player, v = P && P.vehicle, t = this.ctx.currentTime;
    // engine
    if (v && !v.destroyed && v.type !== 'cycle') {
      const k = Math.abs(v.speed) / v.cfg.maxSpeed;
      const E = v.cfg.eng; // [base Hz, 2nd osc ratio, filter brightness] for the retro bikes
      const base = E ? E[0] : v.isTwoWheel ? 70 : v.type === 'bus' ? 35 : v.type === 'auto' ? 55 : 48;
      const gear = (k * 4) % 1;
      const f = base * (1 + k * 2.2 + gear * 0.5);
      this.engOsc.frequency.setTargetAtTime(f, t, 0.05); this.engOsc2.frequency.setTargetAtTime(f * (E ? E[1] : v.type === 'auto' ? 0.5 : 1.01), t, 0.05);
      this.engFilter.frequency.setTargetAtTime((400 + k * 1600) * (E ? E[2] : 1), t, 0.1);
      this.engGain.gain.setTargetAtTime(0.06 + k * 0.07, t, 0.1);
    } else this.engGain.gain.setTargetAtTime(0, t, 0.1);
    // siren: nearest police car with siren on
    let best = 0;
    for (const c of G.vehicles) if (c.siren) best = Math.max(best, this.vol(c.pos, 160));
    const ph = (G.time * 1.2) % 1;
    this.sirOsc.frequency.setTargetAtTime(ph < 0.5 ? 700 + ph * 600 : 1300 - (ph - 0.5) * 1200, t, 0.03);
    this.sirGain.gain.setTargetAtTime(best * 0.07, t, 0.1);
    // ambience
    const cam = G.camera.position;
    this.rainGain.gain.setTargetAtTime(G.env.rain * 0.12, t, 0.3);
    const sea = Math.max(0, 1 - Math.abs(cam.x - 530) / 120) * (0.6 + 0.4 * Math.sin(G.time * 0.8));
    this.waveGain.gain.setTargetAtTime(sea * 0.18, t, 0.3);
    this.cityGain.gain.setTargetAtTime(Math.min(1, G.vehicles.length / 30) * 0.03, t, 0.5);
  }
}
