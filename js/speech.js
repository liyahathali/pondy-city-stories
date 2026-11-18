// Tamil voice for NPCs using the browser's built-in speech synthesis (Web Speech API).
// Microsoft Edge ships natural Tamil voices ("Pallavi", "Valluvar"); Chrome/Firefox use any installed ta-IN voice.
// If no Tamil voice exists, NPCs still talk via on-screen speech bubbles.
import { G } from './state.js';

export class Speech {
  constructor() {
    this.ok = 'speechSynthesis' in window;
    this.voices = []; this.last = 0; this.enabled = true;
    if (this.ok) {
      const load = () => { this.voices = speechSynthesis.getVoices().filter((v) => /^ta(-|_|$)/i.test(v.lang)); };
      load(); speechSynthesis.onvoiceschanged = load;
    }
  }
  get hasTamil() { return this.voices.length > 0; }

  /** Speak a Tamil line. who: object with a stable voice/pitch choice; dist: metres from the player. */
  say(text, who = {}, dist = 0, priority = false, lang = 'ta-IN') {
    if (lang !== 'ta-IN') return this.sayOther(text, who, dist, priority, lang);
    if (!this.ok || !this.enabled || !this.hasTamil || G.settings.voices === false) return;
    if (dist > 18) return;
    const now = performance.now();
    if (!priority && (speechSynthesis.speaking || now - this.last < 1200)) return;
    if (priority) speechSynthesis.cancel();
    this.last = now;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ta-IN';
    // pick a voice matching gender when names make it obvious, else any Tamil voice
    const fem = this.voices.find((v) => /pallavi|female|woman|shruti|kani/i.test(v.name));
    const male = this.voices.find((v) => /valluvar|male|man/i.test(v.name) && !/female/i.test(v.name));
    u.voice = (who.female ? fem : male) || this.voices[0];
    u.pitch = who.female ? 1.1 + (who.pitchJ || 0) : 0.9 + (who.pitchJ || 0);
    u.rate = who.old ? 0.85 : 1.0;
    u.volume = Math.max(0.15, 1 - dist / 18) * (G.settings.volume ?? 0.7);
    speechSynthesis.speak(u);
  }
  /** Foreign tourists speak English or French with whatever voice the system has. */
  sayOther(text, who, dist, priority, lang) {
    if (!this.ok || G.settings.voices === false || dist > 18) return;
    const now = performance.now();
    if (!priority && (speechSynthesis.speaking || now - this.last < 1200)) return;
    this.last = now;
    const u = new SpeechSynthesisUtterance(text); u.lang = lang;
    const vs = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2)));
    if (vs.length) u.voice = vs[Math.abs(Math.round((who.pitchJ || 0) * 100)) % vs.length];
    u.pitch = who.female ? 1.15 : 0.95; u.volume = Math.max(0.15, 1 - dist / 18) * (G.settings.volume ?? 0.7);
    speechSynthesis.speak(u);
  }

  /** Radio DJ voice (not distance-based). Resolves when finished; returns null without a Tamil voice. */
  sayRadio(text, vol = 0.6) {
    if (!this.ok || !this.hasTamil || G.settings.voices === false) return null;
    speechSynthesis.cancel();
    return new Promise((res) => {
      const u = new SpeechSynthesisUtterance(text); u.lang = 'ta-IN';
      u.voice = this.voices.find((v) => /pallavi|female/i.test(v.name)) || this.voices[0];
      u.rate = 1.08; u.pitch = 1.05; u.volume = Math.min(1, vol * 1.4);
      let done = false; const fin = () => { if (!done) { done = true; res(); } };
      u.onend = fin; u.onerror = fin; setTimeout(fin, 12000);
      this.last = performance.now() + 4000;
      speechSynthesis.speak(u);
    });
  }
  stop() { if (this.ok) speechSynthesis.cancel(); }
}
