// Touch controls for phones & tablets (Android / iOS). They drive the same Input object the keyboard uses,
// so every game system works unchanged:
//   left thumb  : floating joystick (walk / drive; push to the edge to run)
//   right thumb : drag to look around, pinch to zoom
//   buttons     : context-sensitive (on foot vs. in a vehicle) + a small top bar for menus.
import { G } from './state.js';

export const isTouchDevice = () => (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && matchMedia('(pointer: coarse)').matches;

const FOOT = [
  { code: 'Space', label: '⤒', name: 'Jump', cls: 'b-jump' },
  { code: 'KeyQ', label: '✊', name: 'Punch', cls: 'b-punch' },
  { code: 'KeyF', label: '🛵', name: 'Get in', cls: 'b-enter' },
  { code: 'KeyE', label: '💬', name: 'Talk / Use', cls: 'b-use' },
  { code: 'KeyC', label: '⇩', name: 'Crouch', cls: 'b-crouch' },
];
const DRIVE = [
  { code: 'Space', label: '■', name: 'Brake', cls: 'b-jump' },
  { code: 'KeyH', label: '📯', name: 'Horn', cls: 'b-punch' },
  { code: 'KeyF', label: '⇱', name: 'Get out', cls: 'b-enter' },
  { code: 'KeyE', label: '🎯', name: 'Mission', cls: 'b-use' },
  { code: 'KeyG', label: '🚨', name: 'Siren', cls: 'b-crouch', police: true },
];
const TOP = [
  { code: 'Escape', label: '⏸' }, { code: 'KeyM', label: '🗺' }, { code: 'KeyR', label: '📻' }, { code: 'KeyV', label: '🚗' }, { code: 'KeyN', label: '🌧' },
];

export class TouchControls {
  constructor(input) {
    this.I = input; this.mode = null; this.stick = null; this.look = new Map(); this.pinch = 0;
    document.body.classList.add('touch');
    const root = this.root = document.createElement('div'); root.id = 'touch'; document.body.appendChild(root);
    root.innerHTML = `<div id="tLeft"></div><div id="tRight"></div><div id="tStick"><div id="tKnob"></div></div><div id="tButtons"></div><div id="tTop"></div>`;
    this.left = root.querySelector('#tLeft'); this.right = root.querySelector('#tRight');
    this.stickEl = root.querySelector('#tStick'); this.knob = root.querySelector('#tKnob');
    this.btns = root.querySelector('#tButtons'); this.top = root.querySelector('#tTop');
    for (const b of TOP) this.top.appendChild(this.button(b, 'tb'));
    const stop = (e) => { e.preventDefault(); };
    // joystick (left half)
    this.left.addEventListener('touchstart', (e) => { stop(e); for (const t of e.changedTouches) if (!this.stick) { this.stick = { id: t.identifier, x: t.clientX, y: t.clientY }; this.showStick(t.clientX, t.clientY); } }, { passive: false });
    // look / pinch (right half)
    this.right.addEventListener('touchstart', (e) => { stop(e); for (const t of e.changedTouches) this.look.set(t.identifier, { x: t.clientX, y: t.clientY }); this.pinch = this.pinchDist(); }, { passive: false });
    addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (this.stick && t.identifier === this.stick.id) {
          let dx = t.clientX - this.stick.x, dy = t.clientY - this.stick.y; const R = 60, d = Math.hypot(dx, dy);
          if (d > R) { dx *= R / d; dy *= R / d; }
          this.I.jx = dx / R; this.I.jy = -dy / R; this.I.touchRun = d > R * 0.95;
          this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
        } else if (this.look.has(t.identifier)) {
          const p = this.look.get(t.identifier);
          if (this.look.size === 1) { this.I.mdx += (t.clientX - p.x) * 2.2; this.I.mdy += (t.clientY - p.y) * 2.2; }
          p.x = t.clientX; p.y = t.clientY;
        }
      }
      if (this.look.size === 2) { const d = this.pinchDist(); if (this.pinch && Math.abs(d - this.pinch) > 18) { this.I.wheel += d < this.pinch ? 1 : -1; this.pinch = d; } }
      if (e.cancelable && (this.stick || this.look.size)) e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (this.stick && t.identifier === this.stick.id) { this.stick = null; this.I.jx = this.I.jy = 0; this.I.touchRun = false; this.stickEl.style.opacity = 0.35; this.knob.style.transform = ''; this.placeStickHome(); }
        this.look.delete(t.identifier);
      }
      this.pinch = this.pinchDist();
    };
    addEventListener('touchend', end); addEventListener('touchcancel', end);
    this.placeStickHome(); this.setMode('foot');
  }
  pinchDist() { if (this.look.size < 2) return 0; const [a, b] = [...this.look.values()]; return Math.hypot(a.x - b.x, a.y - b.y); }
  showStick(x, y) { this.stickEl.style.left = x + 'px'; this.stickEl.style.top = y + 'px'; this.stickEl.style.opacity = 0.9; }
  placeStickHome() { this.stickEl.style.left = Math.max(110, innerWidth * 0.16) + 'px'; this.stickEl.style.top = (innerHeight - 120) + 'px'; }
  button(b, cls) {
    const el = document.createElement('div'); el.className = cls + ' ' + (b.cls || ''); el.innerHTML = `<span>${b.label}</span>${b.name ? `<small>${b.name}</small>` : ''}`;
    const down = (e) => { e.preventDefault(); e.stopPropagation(); el.classList.add('on'); this.I.pressed.add(b.code); this.I.down.add(b.code); if (navigator.vibrate) navigator.vibrate(8); };
    const up = (e) => { e.preventDefault(); el.classList.remove('on'); this.I.down.delete(b.code); };
    el.addEventListener('touchstart', down, { passive: false }); el.addEventListener('touchend', up); el.addEventListener('touchcancel', up);
    return el;
  }
  setMode(m) {
    if (this.mode === m) return; this.mode = m; this.btns.innerHTML = '';
    for (const b of m.startsWith('drive') ? DRIVE : FOOT) if (!b.police || m === 'driveP') this.btns.appendChild(this.button(b, 'tbtn'));
  }
  /** called every frame: show controls only while playing, and swap the button set on foot / in a vehicle */
  update(state) {
    const playing = state === 'playing', menu = state === 'map' || state === 'garage';
    this.root.style.display = playing || menu ? 'block' : 'none';
    this.root.classList.toggle('menuOnly', menu);
    if (!playing) return;
    const P = G.player; this.setMode(P && P.vehicle ? (P.vehicle.type === 'police' ? 'driveP' : 'drive') : 'foot');
  }
}

/** Ask for fullscreen + landscape on phones (must run inside a tap). */
export function goFullscreenLandscape() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  try { const p = req && req.call(el, { navigationUI: 'hide' }); if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {}); } catch (e) { /* iOS Safari: use Add to Home Screen */ }
}
