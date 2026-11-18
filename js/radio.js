// In-car radio. Original music generated live with WebAudio in South Indian ragas
// (kuthu / film-melody / devotional styles), Tamil RJ breaks, plus a "My Music" station
// that plays the player's own audio files from the game's `music` folder.
import { G } from './state.js';
import { t, lang } from './i18n.js';
import { seeded } from './utils.js';

const RAGAS = {
  mayamalavagowla: [0, 1, 4, 5, 7, 8, 11], mohanam: [0, 2, 4, 7, 9], kalyani: [0, 2, 4, 6, 7, 9, 11],
  shankarabharanam: [0, 2, 4, 5, 7, 9, 11], natabhairavi: [0, 2, 3, 5, 7, 8, 10], hindolam: [0, 3, 5, 8, 10],
  kharaharapriya: [0, 2, 3, 5, 7, 9, 10], sindhubhairavi: [0, 1, 3, 5, 7, 8, 10],
};
const STYLE = {
  kuthu: { bpm: [148, 168], ragas: ['mayamalavagowla', 'kharaharapriya', 'natabhairavi', 'shankarabharanam'], lead: 'nadaswaram', sections: ['intro', 'A', 'A', 'B', 'drop', 'A', 'B', 'B', 'A', 'outro'],
    low: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0], high: [0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1], clap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], shaker: 1 },
  melody: { bpm: [80, 96], ragas: ['mohanam', 'kalyani', 'hindolam', 'sindhubhairavi', 'kharaharapriya'], lead: 'flute', sections: ['intro', 'A', 'A', 'B', 'inter', 'A', 'B', 'outro'],
    low: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0], high: [0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0], clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], shaker: 0.5 },
  bakthi: { bpm: [70, 84], ragas: ['mayamalavagowla', 'mohanam', 'shankarabharanam', 'kalyani'], lead: 'nadaswaram', sections: ['intro', 'A', 'B', 'A', 'B', 'outro'],
    low: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], high: [0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0], clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], shaker: 0, bells: true },
};
const TITLES = {
  kuthu: [['ஆட்டோ ராஜா', 'Auto Raja'], ['பாண்டி குத்து', 'Pondy Kuthu'], ['மச்சான் வா', 'Machan Vaa'], ['ECR ரேஸ்', 'ECR Race'], ['தப்பாட்டம்', 'Thappattam'], ['வெள்ளை நகர வேட்டை', 'White Town Vettai'], ['பீச் ரோடு பீட்', 'Beach Road Beat']],
  melody: [['கடற்கரை காதல்', 'Kadarkarai Kaadhal'], ['மழை சாரல்', 'Mazhai Saaral'], ['நிலா வெளிச்சம்', 'Nila Velicham'], ['உன் கண்கள்', 'Un Kangal'], ['அலைகள் பேசும்', 'Alaigal Pesum'], ['மல்லிகைப் பூ', 'Malligai Poo'], ['மாலை நேரம்', 'Maalai Neram']],
  bakthi: [['விநாயகா சரணம்', 'Vinayaga Saranam'], ['கோயில் மணி', 'Koyil Mani'], ['வில்லியனூர் தேர்', 'Villianur Ther'], ['அருள் தரும் அம்மா', 'Arul Tharum Amma'], ['மணக்குள விநாயகர்', 'Manakula Vinayagar']],
};
const ARTISTS = [['பாண்டி பாய்ஸ்', 'Pondy Boys'], ['கடல் குரல்கள்', 'Kadal Kuralgal'], ['DJ முருகா', 'DJ Muruga'], ['ஸ்வர சங்கமம்', 'Swara Sangamam'], ['புதுவை இசைக்குழு', 'Puduvai Isaikuzhu'], ['தென்றல் ட்ரியோ', 'Thendral Trio']];
// RJ breaks: [Tamil, English]; {s}=station, {song}=next song, {time}=clock
const RJ = {
  hello: [['வணக்கம் புதுச்சேரி! நீங்க கேட்டுட்டு இருக்கறது {s}.', "Vanakkam Pondicherry! You're listening to {s}."], ['ஹலோ பாண்டி மக்களே! {s}-க்கு வரவேற்கிறோம்.', 'Hello Pondy people! Welcome to {s}.']],
  next: [['அடுத்த பாடல்: {song}. என்ஜாய் பண்ணுங்க!', 'Next up: {song}. Enjoy!'], ['இப்போ வருது {song}. வால்யூம் கூட்டுங்க!', 'Here comes {song}. Turn it up!']],
  info: [['இப்போ நேரம் {time}.', 'The time is {time}.'], ['எம்.ஜி. ரோட்டுல டிராஃபிக் அதிகம், பார்த்து ஓட்டுங்க.', 'Heavy traffic on MG Road, drive carefully.'],
    ['ஹெல்மெட் போடுங்க, உயிர் முக்கியம்!', 'Wear a helmet — your life matters!'], ['இன்னைக்கு கடற்கரையில அலை அதிகம்.', 'Big waves at the beach today.'],
    ['முருகன் டீ ஸ்டால் — பத்து ரூபாயில சூடான டீ!', 'Murugan Tea Stall — hot tea for just ten rupees!'], ['புதுவை சில்க்ஸ் — தீபாவளி தள்ளுபடி ஆரம்பம்!', 'Puduvai Silks — Deepavali sale is on!']],
  rain: [['மழை பெய்யுது, மெதுவா ஓட்டுங்க!', "It's raining, drive slowly!"]],
};

export class Radio {
  constructor() {
    this.stations = [
      { id: 'kuthu', name: 'Pondy FM 98.3', ta: 'பாண்டி FM 98.3', style: 'kuthu', color: '#ff4fa3' },
      { id: 'melody', name: 'Kadal Osai 91.1', ta: 'கடல் ஓசை 91.1', style: 'melody', color: '#23d5c7' },
      { id: 'bakthi', name: 'Bakthi FM 104.2', ta: 'பக்தி FM 104.2', style: 'bakthi', color: '#ffb300' },
      { id: 'mine', name: 'My Music', ta: 'என் பாடல்கள்', file: true, color: '#b388ff' },
      { id: 'off', name: 'Radio Off', ta: 'வானொலி அணை', off: true, color: '#888' },
    ];
    this.idx = 0; this.on = false; this.song = null; this.songCount = 0;
    this.files = null; this.audioEl = null; this.boxT = 0;
    this.el = { box: document.getElementById('radioBox'), st: document.getElementById('radioStation'), song: document.getElementById('radioSong') };
    this.loadFiles();
  }

  /* ---------------- player's own music + optional stream URLs ---------------- */
  async loadFiles() {
    this.files = [];
    try {
      const r = await fetch('music/', { cache: 'no-store' });
      const txt = await r.text();
      let list = [];
      try { list = JSON.parse(txt); } catch (e) { list = [...txt.matchAll(/href="([^"]+\.(?:mp3|ogg|m4a|wav|aac|flac))"/gi)].map((m) => decodeURIComponent(m[1].split('/').pop())); }
      this.files = list.filter((f) => /\.(mp3|ogg|m4a|wav|aac|flac)$/i.test(f)).map((f) => 'music/' + encodeURIComponent(f));
    } catch (e) { /* no music folder */ }
    try {
      const r = await fetch('music/streams.json', { cache: 'no-store' });
      if (r.ok) {
        const streams = await r.json();
        const at = this.stations.findIndex((s) => s.id === 'off');
        streams.filter((s) => s && s.url).forEach((s, i) => this.stations.splice(at + i, 0, { id: 'stream' + i, name: s.name || 'Internet Radio', ta: s.name || 'இணைய வானொலி', stream: s.url, color: '#64b5ff' }));
      }
    } catch (e) { /* optional */ }
  }

  get station() { return this.stations[this.idx]; }
  label(st = this.station) { return lang() === 'ta' ? st.ta : st.name; }

  next() {
    if (!G.player.vehicle || G.player.vehicle.type === 'cycle') return;
    this.stopAll();
    this.idx = (this.idx + 1) % this.stations.length;
    this.start();
  }

  showBox(sec = 4) { this.boxT = sec; this.el.box.classList.add('show'); }
  setText(songText) {
    const st = this.station;
    this.el.st.textContent = '📻 ' + this.label(st); this.el.st.style.color = st.color;
    this.el.song.innerHTML = songText || '';
  }

  start() {
    const st = this.station;
    this.on = true; this.showBox();
    if (st.off) { this.setText(''); this.on = false; return; }
    if (st.file || st.stream) return this.startFile(st);
    if (!G.audio.ready) { this.on = false; return; }
    this.setText('');
    this.rjBreak(true);
  }

  stopAll() {
    this.on = false;
    if (this.drone) { try { this.drone.forEach((o) => o.stop()); } catch (e) { /* already stopped */ } this.drone = null; }
    this.song = null; this.pending = null;
    if (this.audioEl) { this.audioEl.pause(); }
    if (G.speech && this.rjSpeaking) { G.speech.stop(); this.rjSpeaking = false; }
  }

  /* ---------------- file / stream playback ---------------- */
  startFile(st) {
    if (!this.audioEl) { this.audioEl = new Audio(); this.audioEl.addEventListener('ended', () => this.nextFile()); this.audioEl.addEventListener('error', () => this.nextFile(true)); }
    if (st.stream) { this.audioEl.src = st.stream; this.setText(''); }
    else {
      if (!this.files || !this.files.length) { this.setText(t('radio.nomusic')); this.showBox(7); return; }
      if (!this.curFile) return this.nextFile();
      if (!this.audioEl.src.endsWith(this.curFile)) this.audioEl.src = this.curFile;
      this.setText('🎵 ' + decodeURIComponent(this.curFile.split('/').pop()).replace(/\.[a-z0-9]+$/i, ''));
    }
    this.audioEl.volume = this.vol();
    this.audioEl.play().catch(() => {});
  }
  nextFile(err) {
    const st = this.station;
    if (!st.file || !this.files.length) { if (err && st.stream) this.setText('⚠ stream unavailable'); return; }
    this.curFile = this.files[Math.floor(Math.random() * this.files.length)];
    this.audioEl.src = this.curFile; this.startFile(st); this.showBox();
  }

  vol() { return (G.settings.radioVolume ?? 0.6) * (G.settings.volume ?? 0.7); }

  /* ---------------- RJ talk between songs ---------------- */
  rjBreak(first) {
    const st = this.station, songMeta = this.makeSong(st.style);
    const fill = (pair) => pair.map((s, i) => s.replace('{s}', i ? st.name : st.ta).replace('{song}', i ? songMeta.title[1] : songMeta.title[0]).replace('{time}', G.env.clockString()));
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const parts = [];
    if (first || Math.random() < 0.4) parts.push(fill(pick(RJ.hello)));
    if (G.env.rain > 0.5) parts.push(fill(pick(RJ.rain))); else if (Math.random() < 0.6) parts.push(fill(pick(RJ.info)));
    parts.push(fill(pick(RJ.next)));
    const ta = parts.map((p) => p[0]).join(' '), en = parts.map((p) => p[1]).join(' ');
    this.setText(`🎙 <i>${lang() === 'ta' ? ta : `${ta}<br><small>${en}</small>`}</i>`); this.showBox(7);
    this.jingle();
    this.pending = songMeta;
    const startSong = () => { if (this.on && this.pending === songMeta && this.station === st) this.playSong(songMeta); };
    this.rjSpeaking = true;
    const spoke = G.speech && G.speech.sayRadio ? G.speech.sayRadio(ta, this.vol()) : null;
    if (spoke) spoke.then(() => { this.rjSpeaking = false; startSong(); });
    else setTimeout(() => { this.rjSpeaking = false; startSong(); }, 4500);
  }

  jingle() {
    const ctx = G.audio.ctx, out = this.out(); const now = ctx.currentTime + 0.05;
    [0, 4, 7, 12].forEach((s, i) => this.tone(523.25 * Math.pow(2, s / 12), now + i * 0.11, 0.35, 'triangle', 0.12, out));
  }

  out() {
    if (!this.gain) {
      const ctx = G.audio.ctx;
      this.gain = ctx.createGain(); this.gain.gain.value = 0;
      this.comp = ctx.createDynamicsCompressor(); this.comp.threshold.value = -18; this.comp.ratio.value = 3;
      this.comp.connect(this.gain); this.gain.connect(G.audio.master);
    }
    return this.comp;
  }

  /* ---------------- procedural song generation ---------------- */
  makeSong(style) {
    const rng = seeded(Date.now() % 100000 + this.songCount++ * 7919);
    const S = STYLE[style];
    const raga = S.ragas[Math.floor(rng() * S.ragas.length)];
    const scale = RAGAS[raga];
    const bpm = S.bpm[0] + rng() * (S.bpm[1] - S.bpm[0]);
    const root = 50 + Math.floor(rng() * 7); // MIDI note of the tonic (Sa)
    const titles = TITLES[style];
    const title = titles[Math.floor(rng() * titles.length)], artist = ARTISTS[Math.floor(rng() * ARTISTS.length)];
    // melodic phrases (2 bars = 32 sixteenth steps) built as a random walk over the raga
    const phrase = (lo, hi, density) => {
      const notes = []; let deg = lo + Math.floor(rng() * (hi - lo));
      for (let st = 0; st < 32;) {
        const len = [2, 2, 4, 4, 6, 8][Math.floor(rng() * (density > 0.6 ? 4 : 6))];
        if (rng() < density) {
          deg = Math.max(lo, Math.min(hi, deg + [-2, -1, -1, 1, 1, 2, 0][Math.floor(rng() * 7)]));
          notes.push({ st, len: Math.min(len, 32 - st), deg });
        }
        st += len;
      }
      if (notes.length) { notes[notes.length - 1].deg = lo + scale.length; } // resolve to Sa
      return notes;
    };
    const n = scale.length;
    const dens = style === 'kuthu' ? 0.8 : 0.65;
    const A = phrase(n, n * 2 - 1, dens), B = phrase(n + 2, n * 2 + 2, dens), A2 = A.map((x, i) => (i > A.length - 3 ? { ...x, deg: x.deg + (rng() < 0.5 ? 1 : -1) } : x));
    const prog = [[0, 0, 3, 4], [0, 5, 3, 4], [0, 3, 0, 4], [5, 3, 0, 4]][Math.floor(rng() * 4)];
    return { style, raga, scale, bpm, root, title, artist, A, A2, B, prog, sections: S.sections };
  }

  playSong(song) {
    const ctx = G.audio.ctx;
    this.song = song; this.bar = 0; this.step = 0; this.nextT = ctx.currentTime + 0.1;
    this.setText(`🎵 <b>${lang() === 'ta' ? song.title[0] : song.title[1]}</b> — ${lang() === 'ta' ? song.artist[0] : song.artist[1]} <small>(${song.raga})</small>`); this.showBox(5);
    // tanpura-style drone on Sa and Pa
    const out = this.out();
    const dg = ctx.createGain(); dg.gain.value = song.style === 'kuthu' ? 0.025 : 0.05; dg.connect(out);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.connect(dg);
    this.drone = [0, 7, 12].map((s) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = this.hz(song.root - 12 + s); o.connect(lp); o.start(); return o; });
  }

  hz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
  noteHz(song, deg) { const n = song.scale.length; const oct = Math.floor(deg / n); return this.hz(song.root + song.scale[((deg % n) + n) % n] + 12 * (oct - 1)); }

  update(dt, playing) {
    const v = G.player && G.player.vehicle;
    const inCar = playing && v && v.type !== 'cycle' && !v.destroyed;
    // radio follows you in and out of vehicles
    if (inCar && !this.on && !this.station.off && !this.wasIn) { this.start(); }
    if (!inCar && this.on) this.stopAll();
    this.wasIn = inCar && this.on;
    if (this.gain) this.gain.gain.setTargetAtTime(inCar ? this.vol() * 0.9 : 0, G.audio.ctx.currentTime, 0.15);
    if (this.audioEl) this.audioEl.volume = inCar ? this.vol() : 0;
    if (this.boxT > 0) { this.boxT -= dt; if (this.boxT <= 0) this.el.box.classList.remove('show'); }
    if (!inCar) { this.el.box.classList.remove('show'); return; }
    if (this.song && this.on) this.schedule();
  }

  schedule() {
    const ctx = G.audio.ctx, song = this.song, stepDur = 60 / song.bpm / 4;
    while (this.nextT < ctx.currentTime + 0.18) {
      const secIdx = Math.floor(this.bar / 4);
      if (secIdx >= song.sections.length) { // song finished -> drone off, RJ talks, next song
        if (this.drone) { this.drone.forEach((o) => o.stop(ctx.currentTime + 0.5)); this.drone = null; }
        this.song = null; this.rjBreak(false); return;
      }
      this.playStep(song, song.sections[secIdx], this.bar, this.step, this.nextT, stepDur);
      this.nextT += stepDur;
      this.step++; if (this.step >= 16) { this.step = 0; this.bar++; }
    }
  }

  playStep(song, sec, bar, step, time, sd) {
    const S = STYLE[song.style], out = this.out();
    const full = sec !== 'intro' && sec !== 'outro';
    const fade = sec === 'outro' ? Math.max(0.15, 1 - ((bar % 4) * 16 + step) / 64) : 1;
    // percussion
    if (S.low[step] && sec !== 'intro') this.drumLow(time, (song.style === 'kuthu' ? 0.55 : 0.35) * fade, out);
    if (S.high[step] && (full || song.style !== 'kuthu')) this.drumHigh(time, (song.style === 'kuthu' ? 0.22 : 0.16) * fade, out);
    if (S.clap[step] && full) this.clap(time, 0.18 * fade, out);
    if (S.shaker && step % (S.shaker < 1 ? 2 : 1) === 0 && full) this.shaker(time, 0.03 * fade, out);
    if (S.bells && step === 0) this.bell(time, 0.08 * fade, out);
    if (sec === 'drop' && step % 4 === 0) this.drumLow(time, 0.6, out);
    // bass on the chord root
    const chordDeg = song.prog[bar % 4];
    if (full && (step === 0 || step === 8 || (song.style === 'kuthu' && (step === 6 || step === 14)))) this.bass(this.noteHz(song, chordDeg) / 2, time, sd * 3, 0.22 * fade, out);
    // pad chord at the start of each bar (melody style + intro/inter)
    if (step === 0 && (song.style !== 'kuthu' || sec === 'intro' || sec === 'inter')) this.pad([chordDeg, chordDeg + 2, chordDeg + 4].map((d) => this.noteHz(song, d + song.scale.length)), time, sd * 16, 0.05 * fade, out);
    // lead melody
    if (sec === 'A' || sec === 'B' || sec === 'drop' || (sec === 'inter' && bar % 2 === 1) || (sec === 'outro' && bar % 4 < 2)) {
      const ph = sec === 'B' ? song.B : bar % 4 >= 2 ? song.A2 : song.A;
      const local = (bar % 2) * 16 + step;
      for (const n of ph) if (n.st === local) this.lead(song, this.noteHz(song, n.deg), time, n.len * sd, 0.12 * fade, out);
    }
    // a little counter-melody in the interlude
    if (sec === 'inter' && bar % 2 === 0 && step % 4 === 0) this.pluck(this.noteHz(song, song.scale.length + ((bar * 3 + step) % 5)), time, 0.08, out);
  }

  /* ---------------- instruments ---------------- */
  tone(f, time, dur, type, gain, out) {
    const ctx = G.audio.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, time); g.gain.linearRampToValueAtTime(gain, time + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g); g.connect(out); o.start(time); o.stop(time + dur + 0.05);
  }
  noise(time, dur, gain, type, freq, out, q = 1) {
    const ctx = G.audio.ctx, s = ctx.createBufferSource(); s.buffer = G.audio.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, time); g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(time, Math.random() * 1.5); s.stop(time + dur + 0.02);
  }
  drumLow(time, gain, out) { // thavil / parai low stroke
    const ctx = G.audio.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150, time); o.frequency.exponentialRampToValueAtTime(52, time + 0.14);
    g.gain.setValueAtTime(gain, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.28);
    o.connect(g); g.connect(out); o.start(time); o.stop(time + 0.3);
    this.noise(time, 0.05, gain * 0.5, 'bandpass', 900, out, 2);
  }
  drumHigh(time, gain, out) { // tabla / mridangam "ta" stroke
    const ctx = G.audio.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(420, time); o.frequency.exponentialRampToValueAtTime(300, time + 0.08);
    g.gain.setValueAtTime(gain, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
    o.connect(g); g.connect(out); o.start(time); o.stop(time + 0.15);
    this.noise(time, 0.03, gain * 0.6, 'highpass', 2500, out);
  }
  clap(time, gain, out) { this.noise(time, 0.09, gain, 'bandpass', 1400, out, 0.8); this.noise(time + 0.012, 0.07, gain * 0.7, 'bandpass', 1600, out, 0.8); }
  shaker(time, gain, out) { this.noise(time, 0.035, gain, 'highpass', 6500, out); }
  bell(time, gain, out) { this.tone(1568, time, 1.4, 'sine', gain, out); this.tone(2349, time, 1.0, 'sine', gain * 0.6, out); this.tone(3951, time, 0.6, 'sine', gain * 0.3, out); }
  bass(f, time, dur, gain, out) { this.tone(f, time, dur, 'triangle', gain, out); this.tone(f * 2, time, dur * 0.5, 'sine', gain * 0.3, out); }
  pad(freqs, time, dur, gain, out) {
    const ctx = G.audio.ctx, lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, time); g.gain.linearRampToValueAtTime(gain, time + dur * 0.3); g.gain.linearRampToValueAtTime(0, time + dur);
    lp.connect(g); g.connect(out);
    for (const f of freqs) for (const det of [-6, 6]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(time); o.stop(time + dur + 0.05); }
  }
  pluck(f, time, gain, out) { // veena-like pluck with a small upward bend (gamakam)
    const ctx = G.audio.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(f * 0.985, time); o.frequency.linearRampToValueAtTime(f, time + 0.06);
    g.gain.setValueAtTime(gain, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.9);
    o.connect(g); g.connect(out); o.start(time); o.stop(time + 1);
  }
  lead(song, f, time, dur, gain, out) {
    const ctx = G.audio.ctx, S = STYLE[song.style];
    const g = ctx.createGain(), o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 5.2; lg.gain.value = f * 0.012; lfo.connect(lg); lg.connect(o.frequency);
    // gamakam: slide into the note from slightly below
    o.frequency.setValueAtTime(f * 0.955, time); o.frequency.setTargetAtTime(f, time, 0.025);
    const a = Math.min(0.04, dur * 0.3);
    g.gain.setValueAtTime(0, time); g.gain.linearRampToValueAtTime(gain, time + a); g.gain.setValueAtTime(gain * 0.85, time + Math.max(a, dur * 0.7)); g.gain.linearRampToValueAtTime(0, time + dur);
    if (S.lead === 'nadaswaram') {
      o.type = 'sawtooth';
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 1.2;
      const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = f; o2.detune.value = 4; lg.connect(o2.frequency);
      o2.frequency.setValueAtTime(f * 0.955, time); o2.frequency.setTargetAtTime(f, time, 0.025);
      const g2 = ctx.createGain(); g2.gain.value = 0.35; o2.connect(g2); g2.connect(bp);
      o.connect(bp); bp.connect(g); o2.start(time); o2.stop(time + dur + 0.05);
    } else { // bamboo flute
      o.type = 'sine';
      const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 2; const g2 = ctx.createGain(); g2.gain.value = 0.12; o2.connect(g2); g2.connect(g);
      o2.start(time); o2.stop(time + dur + 0.05);
      o.connect(g);
      this.noise(time, Math.min(0.15, dur), gain * 0.25, 'bandpass', f * 2, out, 3);
    }
    g.connect(out); lfo.start(time); o.start(time); lfo.stop(time + dur + 0.05); o.stop(time + dur + 0.05);
  }
}
