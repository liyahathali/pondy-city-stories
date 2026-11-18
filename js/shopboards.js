// Realistic Indian shop frontages (ACP sign boards, backlit lettering, wood-slat boutique facades),
// modelled on real Puducherry/Tamil Nadu street signage. Shop names are invented local names.
// Each board is a high-resolution canvas texture with panel seams, aluminium edging, dust and
// rain streaks, plus an emissive map so the lettering glows at night.
import * as THREE from 'three';

const TAMIL = '"Nirmala UI", "Latha", "Noto Sans Tamil", "Tamil Sangam MN", sans-serif';
const SANS = '"Segoe UI", "Arial", sans-serif';
const SCRIPT = '"Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive';

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function rnd(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

/** dust, rain streaks and sun-fade over a finished board */
function weather(x, w, h, r, amount = 1) {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(90,75,55,${0.18 * amount})`);
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 40 * amount; i++) { x.fillStyle = `rgba(60,50,40,${0.04 + r() * 0.06})`; const sx = r() * w; x.fillRect(sx, r() * h * 0.3, 1 + r() * 3, h * (0.3 + r() * 0.7)); }
  for (let i = 0; i < 2500 * amount; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'; x.fillRect(r() * w, r() * h, 2, 2); }
}
/** aluminium/ACP panel seams */
function seams(x, w, h, every, col = 'rgba(0,0,0,0.18)') { x.fillStyle = col; for (let s = every; s < w; s += every) x.fillRect(s, 0, 2, h); }
function fitText(x, text, font, size, maxW) { let s = size; do { x.font = font.replace('{s}', s); s -= 2; } while (x.measureText(text).width > maxW && s > 10); return s + 2; }
function strokeText(x, text, cx, cy, fill, stroke, lw) { if (stroke) { x.lineJoin = 'round'; x.strokeStyle = stroke; x.lineWidth = lw; x.strokeText(text, cx, cy); } x.fillStyle = fill; x.fillText(text, cx, cy); }

/* ---------------- 1. sweets & snacks: yellow ACP board, bold magenta Tamil lettering ---------------- */
function sweetsBoard(name, sub, seed) {
  const W = 2048, H = 420, r = rnd(seed);
  const [c, x] = canvas(W, H), [e, ex] = canvas(W, H);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f8d927'); g.addColorStop(1, '#efc21a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  seams(x, W, H, 512, 'rgba(120,90,0,0.18)');
  x.fillStyle = '#c9cdd2'; x.fillRect(0, 0, W, 14); x.fillRect(0, H - 14, W, 14);                 // aluminium edging
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  // round badge: a plate of sweets (generic artwork)
  const bx = 210, by = H / 2;
  x.fillStyle = '#d81b60'; x.beginPath(); x.arc(bx, by, 150, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#fff'; x.beginPath(); x.arc(bx, by, 132, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#c62828'; x.beginPath(); x.ellipse(bx, by + 55, 105, 22, 0, 0, Math.PI * 2); x.fill();             // plate
  for (const [dx, dy, col] of [[-55, 25, '#f39c12'], [0, 25, '#f5b041'], [55, 25, '#f39c12'], [-28, -22, '#f5b041'], [28, -22, '#e67e22'], [0, -66, '#f39c12']]) {
    const gg = x.createRadialGradient(bx + dx - 10, by + dy - 12, 4, bx + dx, by + dy, 32); gg.addColorStop(0, '#ffe08a'); gg.addColorStop(1, col);
    x.fillStyle = gg; x.beginPath(); x.arc(bx + dx, by + dy, 30, 0, Math.PI * 2); x.fill();
    for (let k = 0; k < 10; k++) { x.fillStyle = 'rgba(160,80,0,0.35)'; x.fillRect(bx + dx + (r() - 0.5) * 40, by + dy + (r() - 0.5) * 40, 3, 3); }
  }
  // headline + sub line
  x.textAlign = 'center'; x.textBaseline = 'middle';
  const cx = (380 + W) / 2;
  fitText(x, name, `bold {s}px ${TAMIL}`, 190, W - 460);
  x.shadowColor = 'rgba(0,0,0,0.35)'; x.shadowOffsetY = 5; x.shadowBlur = 6;
  strokeText(x, name, cx, 150, '#e91e8c', '#ffffff', 14); x.shadowColor = 'transparent';
  fitText(x, sub, `bold {s}px ${TAMIL}`, 120, W - 520);
  strokeText(x, sub, cx, 320, '#1b7a3a', '#ffffff', 10);
  ex.textAlign = 'center'; ex.textBaseline = 'middle';
  ex.font = x.font; fitText(ex, name, `bold {s}px ${TAMIL}`, 190, W - 460); ex.fillStyle = '#ff7ac8'; ex.fillText(name, cx, 150);
  fitText(ex, sub, `bold {s}px ${TAMIL}`, 120, W - 520); ex.fillStyle = '#7dff9e'; ex.fillText(sub, cx, 320);
  ex.fillStyle = '#ffd6ea'; ex.beginPath(); ex.arc(bx, by, 132, 0, Math.PI * 2); ex.fill();
  weather(x, W, H, r, 1);
  return { map: tex(c), emissiveMap: tex(e), aspect: W / H };
}

/* ---------------- 2. ethnic-wear boutique: tall backlit wood-slat facade with script name ---------------- */
function boutiqueFacade(name1, name2, seed) {
  const W = 1024, H = 1400, r = rnd(seed);
  const [c, x] = canvas(W, H), [e, ex] = canvas(W, H);
  x.fillStyle = '#1a0f08'; x.fillRect(0, 0, W, H); ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  const slat = 34, gap = 10;
  for (let sx = 30; sx < W - 30; sx += slat + gap) {
    const gg = x.createLinearGradient(sx, 0, sx + slat, 0); gg.addColorStop(0, '#7a3a14'); gg.addColorStop(0.5, '#b8642a'); gg.addColorStop(1, '#6a3010');
    x.fillStyle = gg; x.fillRect(sx, 30, slat, H - 60);
    for (let k = 0; k < 14; k++) { x.fillStyle = `rgba(60,25,5,${0.15 + r() * 0.2})`; x.fillRect(sx + r() * slat, 30 + r() * (H - 60), 1, 40 + r() * 160); }  // wood grain
    // warm backlight bleeding through the gaps
    const lg = ex.createLinearGradient(0, 30, 0, H); lg.addColorStop(0, '#ff9a3c'); lg.addColorStop(0.5, '#ffb35c'); lg.addColorStop(1, '#ff8a2a');
    ex.fillStyle = lg; ex.fillRect(sx + slat, 30, gap, H - 60); ex.globalAlpha = 0.35; ex.fillRect(sx, 30, slat, H - 60); ex.globalAlpha = 1;
  }
  x.strokeStyle = '#ff9a3c'; x.lineWidth = 8; x.strokeRect(22, 22, W - 44, H - 44);                                   // LED edge strip
  ex.strokeStyle = '#ffd08a'; ex.lineWidth = 10; ex.strokeRect(22, 22, W - 44, H - 44);
  x.textAlign = ex.textAlign = 'center'; x.textBaseline = ex.textBaseline = 'middle';
  const write = (txt, y, size, font) => { fitText(x, txt, font, size, W - 160); x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 12; x.fillStyle = '#fffaf0'; x.fillText(txt, W / 2, y); x.shadowColor = 'transparent'; ex.font = x.font; ex.fillStyle = '#ffffff'; ex.fillText(txt, W / 2, y); };
  write(name1, 360, 150, `bold italic {s}px ${SCRIPT}`);
  // diamond ornament between the two names (generic)
  for (const [ctx, col] of [[x, '#fffaf0'], [ex, '#ffffff']]) { ctx.strokeStyle = col; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(W / 2, 560); ctx.lineTo(W / 2 + 70, 660); ctx.lineTo(W / 2, 760); ctx.lineTo(W / 2 - 70, 660); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(W / 2, 660, 16, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); }
  write(name2, 960, 140, `bold italic {s}px ${SCRIPT}`);
  weather(x, W, H, r, 0.4);
  return { map: tex(c), emissiveMap: tex(e), aspect: W / H };
}
function bandBoard(text, seed, bg = '#3a3d42', fg = '#ffffff') {
  const W = 2048, H = 240, r = rnd(seed); const [c, x] = canvas(W, H), [e, ex] = canvas(W, H);
  x.fillStyle = bg; x.fillRect(0, 0, W, H); seams(x, W, H, 512, 'rgba(255,255,255,0.06)');
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  x.textAlign = ex.textAlign = 'center'; x.textBaseline = ex.textBaseline = 'middle';
  fitText(x, text, `bold {s}px ${TAMIL}`, 130, W - 200); x.fillStyle = fg; x.fillText(text, W / 2, H / 2 + 6);
  ex.font = x.font; ex.fillStyle = '#ffffff'; ex.fillText(text, W / 2, H / 2 + 6);
  weather(x, W, H, r, 0.6);
  return { map: tex(c), emissiveMap: tex(e), aspect: W / H };
}

/* ---------------- 3. fashion showroom: red ACP cladding, Tamil top board + English fascia ---------------- */
function redBoard(main, sub, seed, english) {
  const W = 2048, H = english ? 360 : 420, r = rnd(seed);
  const [c, x] = canvas(W, H), [e, ex] = canvas(W, H);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#d0201f'); g.addColorStop(1, '#b0161a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  seams(x, W, H, 410, 'rgba(60,0,0,0.25)'); x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(0, 0, W, H * 0.12);   // ACP sheen
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  x.textAlign = ex.textAlign = 'center'; x.textBaseline = ex.textBaseline = 'middle';
  if (english) {
    // lower-case wordmark + small caps strapline in a white panel
    x.fillStyle = '#f7f7f7'; x.fillRect(W * 0.2, 40, W * 0.6, H - 80);
    fitText(x, main, `600 {s}px ${SANS}`, 150, W * 0.55); x.fillStyle = '#c3171c'; x.fillText(main, W / 2, H / 2 - 30);
    fitText(x, sub, `bold {s}px ${SANS}`, 52, W * 0.5); x.fillStyle = '#1d1d1d'; x.fillText(sub, W / 2, H / 2 + 75);
    ex.fillStyle = '#ffffff'; ex.fillRect(W * 0.2, 40, W * 0.6, H - 80);
  } else {
    fitText(x, main, `bold {s}px ${TAMIL}`, 175, W - 240); x.fillStyle = '#ffffff'; x.fillText(main, W / 2, H * 0.42); ex.font = x.font; ex.fillStyle = '#fff'; ex.fillText(main, W / 2, H * 0.42);
    fitText(x, sub, `bold {s}px ${TAMIL}`, 70, W - 600); x.fillStyle = '#ffe9e9'; x.fillText(sub, W / 2, H * 0.8); ex.font = x.font; ex.fillText(sub, W / 2, H * 0.8);
  }
  weather(x, W, H, r, 0.7);
  return { map: tex(c), emissiveMap: tex(e), aspect: W / H };
}
function stackBoard(text, seed) {
  const W = 1024, H = 180, r = rnd(seed); const [c, x] = canvas(W, H), [e, ex] = canvas(W, H);
  x.fillStyle = '#16191d'; x.fillRect(0, 0, W, H); x.strokeStyle = '#8a8f96'; x.lineWidth = 6; x.strokeRect(6, 6, W - 12, H - 12);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  x.textAlign = ex.textAlign = 'center'; x.textBaseline = ex.textBaseline = 'middle';
  fitText(x, text, `{s}px ${'"Georgia", "Times New Roman", serif'}`, 90, W - 120); x.fillStyle = '#f2f2f2'; x.fillText(text, W / 2, H / 2 + 4);
  ex.font = x.font; ex.fillStyle = '#fff'; ex.fillText(text, W / 2, H / 2 + 4);
  weather(x, W, H, r, 0.4);
  return { map: tex(c), emissiveMap: tex(e), aspect: W / H };
}
function showroomWindow(seed, warm) {
  const W = 1024, H = 512, r = rnd(seed); const [c, x] = canvas(W, H), [e, ex] = canvas(W, H);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, warm ? '#f3e2c4' : '#e8eef2'); g.addColorStop(1, warm ? '#c9a77a' : '#b9c4cc'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  // ceiling lights, racks and mannequins (silhouettes) seen through the glass
  for (let i = 0; i < 9; i++) { x.fillStyle = '#fffbe8'; x.fillRect(60 + i * 110, 30, 50, 10); }
  for (let i = 0; i < 6; i++) {
    const mx = 90 + i * 160 + r() * 30, col = ['#c62828', '#f5f5f5', '#1565c0', '#d4ac0d', '#6a1b9a', '#2e7d32'][Math.floor(r() * 6)];
    x.fillStyle = '#e8d2b8'; x.beginPath(); x.arc(mx, 150, 18, 0, Math.PI * 2); x.fill();
    x.fillStyle = col; x.beginPath(); x.moveTo(mx - 34, 175); x.lineTo(mx + 34, 175); x.lineTo(mx + (i % 2 ? 60 : 30), 440); x.lineTo(mx - (i % 2 ? 60 : 30), 440); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,215,90,0.8)'; for (let k = 0; k < 8; k++) x.fillRect(mx - 30 + k * 8, 420, 4, 14);   // zari border
  }
  for (let i = 0; i < 3; i++) { x.fillStyle = 'rgba(255,255,255,0.18)'; x.beginPath(); x.moveTo(i * 380 + 40, 0); x.lineTo(i * 380 + 140, 0); x.lineTo(i * 380 - 60, H); x.lineTo(i * 380 - 160, H); x.fill(); } // glass reflections
  x.fillStyle = '#2a2a2a'; for (let s = 0; s <= W; s += W / 3) x.fillRect(s - 4, 0, 8, H);                                  // mullions
  ex.drawImage(c, 0, 0); ex.fillStyle = 'rgba(0,0,0,0.35)'; ex.fillRect(0, 0, W, H);
  return { map: tex(c), emissiveMap: tex(e), aspect: W / H };
}

/* ---------------- placement ---------------- */
const FRAME = new THREE.MeshStandardMaterial({ color: 0xb9bec4, roughness: 0.35, metalness: 0.8 });
function boardMat(T, glow = 1, gloss = 0.35) {
  const m = new THREE.MeshPhysicalMaterial({ map: T.map, emissiveMap: T.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0, roughness: gloss, metalness: 0.15, clearcoat: 0.4, clearcoatRoughness: 0.3 });
  m.userData.glow = glow; return m;
}
/** a flat board of width w x height h on the facade (centre fx,fz), standing out by depth d */
function plank(group, mat, w, h, y, out, d = 0.1, frame = true) {
  const g = new THREE.BoxGeometry(w, h, d);
  const mats = [FRAME, FRAME, FRAME, FRAME, mat, FRAME];   // +z face carries the artwork
  const m = new THREE.Mesh(g, frame ? mats : mat); m.position.set(0, y, out + d / 2); m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
}

const SWEETS = [['ஸ்ரீ முருகன்', 'ஸ்வீட்ஸ் & ஸ்நாக்ஸ்'], ['கணபதி', 'ஸ்வீட்ஸ் & பேக்கரி'], ['புதுவை', 'ஸ்வீட்ஸ் & ஸ்நாக்ஸ்'], ['ஆனந்தா', 'இனிப்பகம் & காரம்']];
const BOUTIQUE = [['Thoranam', 'Kalyani', 'தோரணம்  ◆  கல்யாணி'], ['Vasantham', 'Nila', 'வசந்தம்  ◆  நிலா'], ['Marudham', 'Thendral', 'மருதம்  ◆  தென்றல்']];
const FASHION = [['அர்பன் த்ரெட்', 'ஃபேஷன் ஷோரூம்', 'urban Thread', 'FASHION FOR ALL'], ['கோஸ்ட் லைன்', 'ஆண்கள் ஆடையகம்', 'coast Line', 'MENSWEAR STUDIO']];
const STACK = ['MARINA MEN', 'COASTLINE', 'AUROVILLE Co.', 'WHITE TOWN', 'BAY BLUE'];

/**
 * Put a realistic frontage on one shop face.
 * kind: 0 sweets, 1 boutique, 2 fashion.  Returns materials that should glow at night.
 */
export function buildShopFront(scene, kind, fx, fz, face, len, floors, FLOOR_H, seed) {
  const group = new THREE.Group(); group.position.set(fx, 0, fz);
  group.rotation.y = face === 'S' ? 0 : face === 'N' ? Math.PI : face === 'E' ? Math.PI / 2 : -Math.PI / 2;
  scene.add(group);
  const glow = [], W = Math.min(len - 0.6, kind === 1 ? 9 : 11);
  if (kind === 0) {
    const [a, b] = SWEETS[seed % SWEETS.length];
    const T = sweetsBoard(a, b, seed + 3), m = boardMat(T, 0.9, 0.3);
    plank(group, m, W, W / T.aspect, 3.25 + W / T.aspect / 2, 0.05, 0.12); glow.push(m);
    // tube-light strip under the board
    const lm = new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xfff2d0, emissiveIntensity: 0 }); lm.userData.glow = 1.5;
    const tl = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.04, 0.04), lm); tl.position.set(0, 3.15, 0.2); group.add(tl); glow.push(lm);
  } else if (kind === 1) {
    const [n1, n2, ta] = BOUTIQUE[seed % BOUTIQUE.length];
    const top = Math.max(2, floors) * FLOOR_H, h = top - FLOOR_H - 0.3;
    const T = boutiqueFacade(n1, n2, seed + 5), m = boardMat(T, 1.6, 0.5);
    plank(group, m, Math.min(W, h * T.aspect * 1.25), h, FLOOR_H + 0.15 + h / 2, 0.06, 0.18); glow.push(m);
    const B = bandBoard(ta, seed + 9), mb = boardMat(B, 1.0, 0.3);
    plank(group, mb, W, W / B.aspect, FLOOR_H - 0.25, 0.06, 0.1); glow.push(mb);
    const S = showroomWindow(seed + 11, true), ms = boardMat(S, 1.2, 0.05);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.8, 2.3), ms); win.position.set(0, 1.35, 0.03); group.add(win); glow.push(ms);
    for (let i = 0; i < 3; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(W * 0.8, 0.16, 0.35), new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.6 })); st.position.set(0, 0.08 + i * 0.16 - 0.16, 0.6 - i * 0.3); st.receiveShadow = true; if (i) group.add(st); }
  } else {
    const [ta, tsub, en, enSub] = FASHION[seed % FASHION.length];
    const top = Math.max(2, floors) * FLOOR_H;
    const T1 = redBoard(ta, tsub, seed + 13, false), m1 = boardMat(T1, 0.9, 0.25);
    const T2 = redBoard(en, enSub, seed + 17, true), m2 = boardMat(T2, 1.0, 0.25);
    const red = new THREE.MeshPhysicalMaterial({ color: 0xc01a1c, roughness: 0.3, metalness: 0.2, clearcoat: 0.6 });
    const Wm = W * 0.78;
    plank(group, m1, Wm, Wm / T1.aspect, top - 0.2 - Wm / T1.aspect / 2, 0.08, 0.14); glow.push(m1);
    plank(group, m2, Wm, Wm / T2.aspect, FLOOR_H + 0.1, 0.08, 0.14); glow.push(m2);
    // red cladding frame around the first-floor display windows
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.45, top, 0.2), red); p.position.set(sx * (Wm / 2 + 0.22), top / 2, 0.12); p.castShadow = true; group.add(p); }
    const S = showroomWindow(seed + 19, false), ms = boardMat(S, 1.1, 0.05);
    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(Wm, top - FLOOR_H - Wm / T1.aspect - 1.0), ms); w1.position.set(0, (FLOOR_H + 0.9 + top - Wm / T1.aspect) / 2, 0.04); group.add(w1); glow.push(ms);
    const S2 = showroomWindow(seed + 23, true), ms2 = boardMat(S2, 1.2, 0.05);
    const w2 = new THREE.Mesh(new THREE.PlaneGeometry(Wm, 2.4), ms2); w2.position.set(0, 1.3, 0.04); group.add(w2); glow.push(ms2);
    // vertical stack of brand boards on the side pillar
    if (len > Wm + 3) for (let i = 0; i < 4; i++) {
      const ST = stackBoard(STACK[(seed + i) % STACK.length], seed + 30 + i), mst = boardMat(ST, 0.8, 0.3);
      const bw = 1.7; plank(group, mst, bw, bw / ST.aspect, top - 0.6 - i * 0.42, 0.06, 0.06).position.x = Wm / 2 + 0.45 + bw / 2; glow.push(mst);
    }
  }
  return glow;
}
