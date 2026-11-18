// Keyboard + mouse input with "pressed this frame" tracking and pointer lock.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set(); this.pressed = new Set();
    this.mdx = 0; this.mdy = 0; this.mouseDown = false; this.clicked = false; this.wheel = 0;
    this.lastMouseMove = 0; this.locked = false;
    addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());
    addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mdx += e.movementX; this.mdy += e.movementY; this.lastMouseMove = performance.now();
    });
    canvas.addEventListener('mousedown', (e) => {
      if (this.touch && performance.now() - this.lastTouch < 800) return;   // ignore mouse events emulated from taps
      if (e.button === 0) { this.mouseDown = true; this.clicked = true; }
      if (!this.locked && this.wantLock) canvas.requestPointerLock();
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouseDown = false; });
    addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; });
    this.wantLock = false; this.jx = 0; this.jy = 0; this.touchRun = false; this.lastTouch = 0;
    addEventListener('touchstart', () => { this.touch = true; this.lastTouch = performance.now(); }, { passive: true });
  }
  key(c) { return this.down.has(c) || (c === 'ShiftLeft' && this.touchRun); }
  hit(c) { return this.pressed.has(c); }
  axis(neg, pos) {
    let v = (this.down.has(pos) ? 1 : 0) - (this.down.has(neg) ? 1 : 0);
    if (neg === 'KeyA' && pos === 'KeyD') v += this.jx || 0;   // touch joystick (analog)
    if (neg === 'KeyS' && pos === 'KeyW') v += this.jy || 0;
    return v;
  }
  lock() { if (this.touch) return; this.wantLock = true; try { this.canvas.requestPointerLock(); } catch (e) { /* needs a user gesture */ } }
  unlock() { this.wantLock = false; if (document.pointerLockElement) document.exitPointerLock(); }
  endFrame() { this.pressed.clear(); this.mdx = 0; this.mdy = 0; this.clicked = false; this.wheel = 0; }
}
