// Procedurally generated canvas textures (no external image assets needed).
import * as THREE from 'three';
import { seeded } from './utils.js';

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, { repeat = true, srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}
function noise(ctx, w, h, amount, rng, alpha = 0.08) {
  for (let i = 0; i < amount; i++) {
    const v = Math.floor(rng() * 255);
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    const s = 1 + rng() * 3;
    ctx.fillRect(rng() * w, rng() * h, s, s);
  }
}

export function makeTextures() {
  const rng = seeded(7);
  const T = {};

  /* ---------- Asphalt ---------- */
  {
    const [c, x] = canvas(256, 256);
    x.fillStyle = '#4a4a4d'; x.fillRect(0, 0, 256, 256);
    noise(x, 256, 256, 9000, rng, 0.12);
    for (let i = 0; i < 18; i++) { // patches / repairs
      x.fillStyle = `rgba(${rng() < 0.5 ? 30 : 90},${rng() < 0.5 ? 30 : 90},${rng() < 0.5 ? 35 : 90},0.12)`;
      x.fillRect(rng() * 256, rng() * 256, 10 + rng() * 50, 6 + rng() * 30);
    }
    // Indian-road wear: hairline cracks, tar patches, oil drips, pale dust at the edges
    for (let i = 0; i < 14; i++) {
      let px = rng() * 256, py = rng() * 256; x.strokeStyle = `rgba(20,20,22,${0.35 + rng() * 0.3})`; x.lineWidth = 1; x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 8; k++) { px += (rng() - 0.5) * 22; py += (rng() - 0.5) * 22; x.lineTo(px, py); } x.stroke();
    }
    for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(25,25,28,0.35)'; const w = 18 + rng() * 40; x.fillRect(rng() * 256, rng() * 256, w, w * (0.4 + rng() * 0.6)); }
    for (let i = 0; i < 10; i++) { x.fillStyle = 'rgba(15,12,10,0.18)'; x.beginPath(); x.ellipse(rng() * 256, rng() * 256, 4 + rng() * 10, 3 + rng() * 6, rng() * 3, 0, Math.PI * 2); x.fill(); }
    for (let i = 0; i < 1600; i++) { const v = 140 + rng() * 60; x.fillStyle = `rgba(${v},${v},${v - 6},0.18)`; x.fillRect(Math.floor(rng() * 256), Math.floor(rng() * 256), 1, 1); } // aggregate
    T.asphalt = tex(c);
  }
  /* ---------- Sidewalk pavers ---------- */
  {
    const [c, x] = canvas(128, 128);
    x.fillStyle = '#b5aa98'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const v = 160 + Math.floor(rng() * 30);
      x.fillStyle = `rgb(${v},${v - 8},${v - 22})`;
      x.fillRect(i * 32 + 1, j * 32 + 1, 30, 30);
    }
    noise(x, 128, 128, 1500, rng, 0.1);
    for (let i = 0; i < 3; i++) { x.fillStyle = 'rgba(70,60,45,0.22)'; x.fillRect(Math.floor(rng() * 4) * 32 + 1, Math.floor(rng() * 4) * 32 + 1, 30, 30); } // stained / replaced tiles
    x.strokeStyle = 'rgba(40,35,30,0.4)'; x.beginPath(); x.moveTo(70, 66); x.lineTo(84, 80); x.lineTo(93, 77); x.stroke();      // cracked tile
    T.sidewalk = tex(c);
  }
  /* ---------- Ground: dusty grass/earth ---------- */
  {
    const [c, x] = canvas(256, 256);
    x.fillStyle = '#7d8a4a'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2500; i++) {
      const g = rng();
      x.fillStyle = g < 0.4 ? 'rgba(150,120,70,0.25)' : g < 0.8 ? 'rgba(80,120,50,0.25)' : 'rgba(60,90,30,0.3)';
      const s = 2 + rng() * 8; x.fillRect(rng() * 256, rng() * 256, s, s);
    }
    noise(x, 256, 256, 6000, rng, 0.08);
    T.ground = tex(c);
  }
  /* ---------- Lawn ---------- */
  {
    const [c, x] = canvas(128, 128);
    x.fillStyle = '#4f8a3a'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 3000; i++) { x.fillStyle = rng() < 0.5 ? 'rgba(90,150,60,0.4)' : 'rgba(40,90,30,0.4)'; x.fillRect(rng() * 128, rng() * 128, 1, 2 + rng() * 3); }
    T.lawn = tex(c);
  }
  /* ---------- Sand ---------- */
  {
    const [c, x] = canvas(128, 128);
    x.fillStyle = '#dcc79a'; x.fillRect(0, 0, 128, 128);
    noise(x, 128, 128, 5000, rng, 0.12);
    T.sand = tex(c);
  }
  /* ---------- Stone path ---------- */
  {
    const [c, x] = canvas(128, 128);
    x.fillStyle = '#c9bfae'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      const v = 185 + Math.floor(rng() * 40); x.fillStyle = `rgb(${v},${v - 6},${v - 18})`;
      x.fillRect(i * 16 + ((j % 2) * 8), j * 16, 15, 15);
    }
    T.paving = tex(c);
  }

  /* ---------- Building facades: colonial (White Town) ---------- */
  // 4x4 window cells; one cell = 3.5m wide, one floor = 3.5m tall.
  const facade = (style) => {
    const S = 512, cell = S / 4;
    const [c, x] = canvas(S, S);
    const [e, ex] = canvas(S, S);
    ex.fillStyle = '#000'; ex.fillRect(0, 0, S, S);
    // colonial walls use a neutral grey base: the shader tints only the grey (wall) and keeps white trim/shutters white
    x.fillStyle = style === 'colonial' ? '#c8c8c8' : '#f2efe8'; x.fillRect(0, 0, S, S);
    noise(x, S, S, 6000, rng, 0.05);
    // weathering streaks
    for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(80,70,60,0.05)'; x.fillRect(rng() * S, rng() * S, 2 + rng() * 6, 20 + rng() * 80); }
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const cx = i * cell, cy = j * cell;
      const lit = rng() < 0.4;
      const warm = rng() < 0.7 ? '#ffcf7a' : '#fff1c4';
      if (style === 'colonial') {
        const ww = cell * 0.42, wh = cell * 0.62, wx = cx + (cell - ww) / 2, wy = cy + cell * 0.18;
        // white trim frame
        x.fillStyle = '#ffffff'; x.fillRect(wx - 6, wy - 6, ww + 12, wh + 12);
        x.beginPath(); x.arc(wx + ww / 2, wy, ww / 2 + 6, Math.PI, 0); x.fill();
        // glass / opening
        x.fillStyle = '#2b2d33'; x.fillRect(wx, wy, ww, wh);
        x.beginPath(); x.arc(wx + ww / 2, wy, ww / 2, Math.PI, 0); x.fill();
        // shutters (french green / blue) – open or closed
        const shut = rng() < 0.45 ? '#ece8df' : rng() < 0.5 ? '#2f6b55' : rng() < 0.5 ? '#2d5f8a' : '#cfd8dc';
        if (rng() < 0.6) { // closed shutters
          x.fillStyle = shut; x.fillRect(wx, wy, ww, wh);
          x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 2;
          for (let k = 0; k < wh; k += 6) { x.beginPath(); x.moveTo(wx, wy + k); x.lineTo(wx + ww, wy + k); x.stroke(); }
          x.beginPath(); x.moveTo(wx + ww / 2, wy); x.lineTo(wx + ww / 2, wy + wh); x.stroke();
        } else {
          x.fillStyle = shut; x.fillRect(wx - 16, wy, 12, wh); x.fillRect(wx + ww + 4, wy, 12, wh);
          if (lit) { ex.fillStyle = warm; ex.fillRect(wx, wy, ww, wh); ex.beginPath(); ex.arc(wx + ww / 2, wy, ww / 2, Math.PI, 0); ex.fill(); }
          x.strokeStyle = '#ddd'; x.lineWidth = 2; x.strokeRect(wx, wy, ww, wh);
          x.beginPath(); x.moveTo(wx + ww / 2, wy); x.lineTo(wx + ww / 2, wy + wh); x.stroke();
        }
        // sill + cornice band
        x.fillStyle = '#ffffff'; x.fillRect(wx - 10, wy + wh + 4, ww + 20, 6);
        x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(cx, cy + cell - 8, cell, 3);
      } else {
        // Tamil quarter: square windows with grilles, some small balconies
        const ww = cell * 0.5, wh = cell * 0.45, wx = cx + (cell - ww) / 2, wy = cy + cell * 0.25;
        x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(wx - 4, wy - 10, ww + 8, 6); // sunshade
        x.fillStyle = lit ? '#3a3326' : '#24272c'; x.fillRect(wx, wy, ww, wh);
        if (lit) { ex.fillStyle = rng() < 0.3 ? '#bfe3ff' : warm; ex.fillRect(wx, wy, ww, wh); }
        const curtain = rng() < 0.5;
        if (curtain) { x.fillStyle = ['#c0392b', '#2980b9', '#8e44ad', '#16a085'][Math.floor(rng() * 4)]; x.globalAlpha = 0.6; x.fillRect(wx, wy, ww * 0.35, wh); x.globalAlpha = 1; }
        x.strokeStyle = '#555'; x.lineWidth = 2;
        for (let k = 1; k < 5; k++) { x.beginPath(); x.moveTo(wx + (ww * k) / 5, wy); x.lineTo(wx + (ww * k) / 5, wy + wh); x.stroke(); }
        x.strokeRect(wx, wy, ww, wh);
        if (rng() < 0.15) { x.fillStyle = '#ddd'; x.fillRect(wx + ww + 6, wy + wh - 18, 22, 16); } // AC unit
        x.fillStyle = 'rgba(0,0,0,0.1)'; x.fillRect(cx, cy + cell - 6, cell, 6); // floor slab line
      }
    }
    const t = tex(c); const te = tex(e);
    return [t, te];
  };
  [T.colonial, T.colonialE] = facade('colonial');
  [T.tamil, T.tamilE] = facade('tamil');

  /* ---------- Shop fronts (ground floor band, 3 shops per 14m tile) ---------- */
  {
    const W = 512, H = 128;
    const [c, x] = canvas(W, H); const [e, ex] = canvas(W, H);
    ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
    x.fillStyle = '#e8e2d5'; x.fillRect(0, 0, W, H);
    const sw = W / 3;
    for (let i = 0; i < 3; i++) {
      const sx = i * sw + 8, sy = 22, w = sw - 16, h = H - 26;
      if (rng() < 0.4) { // rolling shutter
        x.fillStyle = '#8d9196'; x.fillRect(sx, sy, w, h);
        x.strokeStyle = '#6c7075'; for (let k = 0; k < h; k += 5) { x.beginPath(); x.moveTo(sx, sy + k); x.lineTo(sx + w, sy + k); x.stroke(); }
      } else { // open shop with goods
        x.fillStyle = '#2a2420'; x.fillRect(sx, sy, w, h);
        ex.fillStyle = '#ffe2a8'; ex.fillRect(sx, sy, w, h);
        for (let k = 0; k < 40; k++) {
          x.fillStyle = `hsl(${Math.floor(rng() * 360)},60%,${35 + rng() * 30}%)`;
          x.fillRect(sx + rng() * (w - 10), sy + 8 + rng() * (h - 30), 6 + rng() * 10, 6 + rng() * 10);
        }
        x.fillStyle = '#6b4f35'; x.fillRect(sx, sy + h - 18, w, 18); // counter
      }
      x.fillStyle = `hsl(${Math.floor(rng() * 360)},55%,45%)`; x.fillRect(sx - 4, 2, w + 8, 18); // fascia
    }
    T.shop = tex(c); T.shopE = tex(e);
  }

  /* ---------- Sign atlas (4 x 8) ---------- */
  {
    const W = 1024, H = 512, cw = W / 4, ch = H / 8;
    const [c, x] = canvas(W, H);
    const names = ['SRI MURUGAN STORES', 'BOULANGERIE', 'TEA STALL', 'MOBILE SHOP', 'PONDY TEXTILES', 'ANANDA BHAVAN', 'PHARMACY', 'SWEETS & SNACKS',
      'CAFÉ DU PORT', 'LE PETIT BISTRO', 'SARAVANA HOTEL', 'KUMAR CYCLES', 'GOLD JEWELLERS', 'FRUIT MART', 'XEROX & PRINT', 'BIRYANI CENTRE',
      'RAJA TAILORS', 'AUTO SPARES', 'BOOK HOUSE', 'MEALS READY', 'HOTEL PARIS', 'FLOWER SHOP', 'ELECTRICALS', 'FRESH JUICE',
      'BAKERY', 'LA TERRASSE', 'SILK SAREES', 'IDLI DOSA', 'MEDICAL', 'HARDWARE', 'SPICE MARKET', 'GUEST HOUSE'];
    const cols = ['#c0392b', '#1f618d', '#117a65', '#7d3c98', '#b9770e', '#1c2833', '#a93226', '#2e4053'];
    names.forEach((n, k) => {
      const i = k % 4, j = Math.floor(k / 4);
      x.fillStyle = cols[k % cols.length]; x.fillRect(i * cw + 2, j * ch + 2, cw - 4, ch - 4);
      x.strokeStyle = '#f7dc6f'; x.lineWidth = 3; x.strokeRect(i * cw + 6, j * ch + 6, cw - 12, ch - 12);
      x.fillStyle = '#fff'; x.font = 'bold 26px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(n, i * cw + cw / 2, j * ch + ch / 2 + 2, cw - 20);
    });
    T.signs = tex(c, { repeat: false });
  }

  /* ---------- Roof tiles (Mangalore tiles for village houses) ---------- */
  {
    const [c, x] = canvas(64, 64);
    x.fillStyle = '#a4462b'; x.fillRect(0, 0, 64, 64);
    for (let j = 0; j < 8; j++) { x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, j * 8 + 6, 64, 2); }
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(i * 8 + (j % 2) * 4, j * 8, 1, 8); }
    T.roofTiles = tex(c);
  }
  /* ---------- Gopuram (temple tower) bands ---------- */
  {
    const [c, x] = canvas(256, 64);
    const cols = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#e67e22', '#9b59b6', '#ecf0f1', '#1abc9c'];
    for (let i = 0; i < 32; i++) {
      x.fillStyle = cols[i % cols.length]; x.fillRect(i * 8, 0, 8, 64);
      x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(i * 8, 0, 1, 64);
      x.fillStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); x.arc(i * 8 + 4, 20, 3, 0, Math.PI * 2); x.fill();
    }
    x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(0, 54, 256, 10); x.fillRect(0, 0, 256, 4);
    T.gopuram = tex(c);
  }
  /* ---------- Water normal-ish ripple (used as bump) ---------- */
  {
    const [c, x] = canvas(256, 256);
    x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 600; i++) {
      x.strokeStyle = `rgba(${rng() < 0.5 ? 255 : 0},${rng() < 0.5 ? 255 : 0},255,0.12)`; x.lineWidth = 1 + rng() * 2;
      const px = rng() * 256, py = rng() * 256; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 10, py - 4, px + 24, py); x.stroke();
    }
    T.ripple = tex(c, { srgb: false });
  }
  /* ---------- Railway ballast ---------- */
  {
    const [c, x] = canvas(64, 64);
    x.fillStyle = '#6d655b'; x.fillRect(0, 0, 64, 64); noise(x, 64, 64, 1200, rng, 0.25);
    T.ballast = tex(c);
  }
  /* ---------- Foliage cards (alpha-tested, chunky pixel leaves) ---------- */
  const leafTex = (W, H, draw) => { const [c, x] = canvas(W, H); draw(x); const t = tex(c, { repeat: false }); t.magFilter = THREE.NearestFilter; t.generateMipmaps = true; return t; };
  const LG = ['#2f5d1e', '#3d7426', '#4c8a2e', '#5f9e36', '#28501a', '#6fae3e'];
  T.leaves = leafTex(64, 64, (x) => {
    for (let i = 0; i < 260; i++) {
      const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 29;
      const px = 32 + Math.cos(a) * r, py = 32 + Math.sin(a) * r * 0.9;
      x.fillStyle = LG[Math.floor(rng() * LG.length)]; x.fillRect(Math.round(px), Math.round(py), 2 + Math.floor(rng() * 3), 2 + Math.floor(rng() * 2));
    }
    for (let i = 0; i < 60; i++) { x.fillStyle = 'rgba(190,230,120,0.9)'; x.fillRect(Math.round(20 + rng() * 26), Math.round(8 + rng() * 22), 1, 1); } // sun-lit leaf tips
  });
  T.bougain = leafTex(64, 64, (x) => {
    for (let i = 0; i < 200; i++) { const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 28; x.fillStyle = LG[Math.floor(rng() * 4)]; x.fillRect(Math.round(32 + Math.cos(a) * r), Math.round(34 + Math.sin(a) * r * 0.85), 3, 2); }
    const FL = ['#d81b78', '#e91e8c', '#c2185b', '#f06292', '#b0126a'];
    for (let i = 0; i < 150; i++) { const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 27; x.fillStyle = FL[Math.floor(rng() * FL.length)]; x.fillRect(Math.round(32 + Math.cos(a) * r), Math.round(32 + Math.sin(a) * r * 0.8), 2 + Math.floor(rng() * 2), 2); }
  });
  T.frond = leafTex(32, 128, (x) => {
    x.fillStyle = '#5a6b2a'; x.fillRect(15, 0, 2, 128);
    for (let y = 4; y < 124; y += 3) { const w = Math.sin((y / 128) * Math.PI) * 15; x.fillStyle = LG[(y / 3) % 5 | 0]; x.fillRect(16 - w, y, w - 1, 2); x.fillRect(17, y + 1, w - 1, 2); }
  });

  /* ---------- weathering on the Tamil-quarter concrete: damp stains under windows + patchy repaint ---------- */
  {
    const img = T.tamil.image, x = img.getContext('2d'), S = img.width, cell = S / 4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const cx = i * cell + cell * 0.25, cy = j * cell + cell * 0.72;
      for (let k = 0; k < 6; k++) { x.fillStyle = `rgba(60,55,45,${0.05 + rng() * 0.08})`; x.fillRect(cx + rng() * cell * 0.5, cy, 3 + rng() * 6, 10 + rng() * cell * 0.4); }
    }
    for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(${150 + rng() * 60},${130 + rng() * 50},${100 + rng() * 40},0.10)`; x.fillRect(rng() * S, rng() * S, 30 + rng() * 90, 20 + rng() * 60); }
    x.fillStyle = 'rgba(40,40,30,0.18)'; x.fillRect(0, S - 10, S, 10);
    T.tamil.needsUpdate = true;
  }
  T.human = makeHumanAtlas(rng);
  return T;
}

/* ---------- Character atlas: greyscale fabric patterns + painted face (tinted by vertex colour) ----------
   256x256, 64px cells. Index -> rect in HUMAN_CELLS below. Nearest-filtered for the chunky pixel look. */
export const HUMAN_CELLS = {
  plain: [0, 0], check: [1, 0], stripe: [2, 0], denim: [3, 0],
  print: [0, 1], skin: [1, 1], hair: [2, 1], lcheck: [3, 1],
  graphic: [0, 2], knit: [1, 2], face: [2, 2, 2], // face spans 2x2 cells
};
function makeHumanAtlas(rng) {
  const [c, x] = canvas(256, 256);
  const cell = (k) => { const [i, j] = HUMAN_CELLS[k]; return [i * 64, j * 64]; };
  const px = (X, Y, w, h, col) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  const weave = (X, Y, base) => { px(X, Y, 64, 64, base); for (let i = 0; i < 260; i++) { const v = rng() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.08)'; px(X + Math.floor(rng() * 64), Y + Math.floor(rng() * 64), 1, 1, v); }
    for (let k = 0; k < 4; k++) px(X + Math.floor(rng() * 60), Y, 2, 64, 'rgba(0,0,0,0.05)'); }   // soft fold shadows
  let [X, Y] = cell('plain'); weave(X, Y, '#f4f4f4');
  [X, Y] = cell('check'); weave(X, Y, '#f2f2f2');
  for (let k = 0; k < 64; k += 8) { px(X + k, Y, 3, 64, 'rgba(60,60,60,0.35)'); px(X, Y + k, 64, 3, 'rgba(60,60,60,0.35)'); px(X + k + 5, Y, 1, 64, 'rgba(255,255,255,0.5)'); }
  [X, Y] = cell('stripe'); weave(X, Y, '#f2f2f2'); for (let k = 0; k < 64; k += 6) px(X + k, Y, 2, 64, 'rgba(50,50,60,0.4)');
  [X, Y] = cell('denim'); weave(X, Y, '#e6e9ee'); for (let i = 0; i < 64; i++) px(X + i, Y + ((i * 3) % 64), 1, 40, 'rgba(255,255,255,0.06)');
  px(X + 30, Y, 1, 64, 'rgba(240,200,120,0.6)'); px(X + 10, Y + 40, 8, 4, 'rgba(255,255,255,0.35)'); // seam + faded knee
  [X, Y] = cell('print'); weave(X, Y, '#f0f0f0');
  for (let i = 0; i < 18; i++) { const cx = X + 4 + Math.floor(rng() * 56), cy = Y + 4 + Math.floor(rng() * 56); px(cx - 2, cy, 5, 1, 'rgba(120,20,40,0.55)'); px(cx, cy - 2, 1, 5, 'rgba(120,20,40,0.55)'); px(cx, cy, 1, 1, 'rgba(255,215,90,0.9)'); }
  [X, Y] = cell('skin'); px(X, Y, 64, 64, '#f6f6f6'); for (let i = 0; i < 120; i++) px(X + Math.floor(rng() * 64), Y + Math.floor(rng() * 64), 2, 2, 'rgba(120,60,40,0.05)');
  [X, Y] = cell('hair'); px(X, Y, 64, 64, '#d8d8d8'); for (let i = 0; i < 64; i += 2) px(X + i, Y, 1, 64, rng() < 0.5 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)');
  [X, Y] = cell('lcheck'); weave(X, Y, '#f4f4f4'); for (let k = 0; k < 64; k += 16) { px(X + k, Y, 6, 64, 'rgba(40,40,40,0.4)'); px(X, Y + k, 64, 6, 'rgba(40,40,40,0.4)'); px(X + k + 9, Y, 2, 64, 'rgba(0,0,0,0.25)'); }
  [X, Y] = cell('graphic'); weave(X, Y, '#f4f4f4');   // T-shirt chest print (front is u≈0.25..0.5 on the capsule)
  px(X + 14, Y + 26, 14, 12, 'rgba(30,30,30,0.85)'); px(X + 16, Y + 28, 10, 2, 'rgba(255,200,40,1)'); px(X + 16, Y + 32, 7, 2, 'rgba(255,80,80,1)');
  [X, Y] = cell('knit'); weave(X, Y, '#efefef'); for (let j = 0; j < 64; j += 4) for (let i = 0; i < 64; i += 4) px(X + i + (j % 8 ? 2 : 0), Y + j, 2, 2, 'rgba(0,0,0,0.12)');
  // face: 128x128 region wrapping a sphere; front of the head is u = 0.25 (x = 32) — eyes, brows, nose shadow, lips
  [X, Y] = cell('face'); px(X, Y, 128, 128, '#f6f6f6');
  for (let i = 0; i < 160; i++) px(X + Math.floor(rng() * 128), Y + Math.floor(rng() * 128), 2, 2, 'rgba(120,60,40,0.05)');
  const fx = X + 32, ey = Y + 56;
  for (const s of [-1, 1]) {
    const ex = fx + s * 7;
    px(ex - 3, ey - 6, 7, 2, 'rgba(25,18,14,0.9)');            // brow
    px(ex - 3, ey - 1, 6, 4, '#ffffff');                        // sclera
    px(ex - 1 + (s < 0 ? 0 : 0), ey - 1, 3, 4, '#2a1a12');     // iris
    px(ex, ey, 1, 1, '#ffffff');                               // catch-light
    px(ex - 3, ey + 3, 6, 1, 'rgba(90,50,35,0.35)');           // lower lid shadow
  }
  px(fx - 1, ey + 2, 2, 9, 'rgba(110,60,40,0.25)'); px(fx - 3, ey + 10, 6, 2, 'rgba(90,45,30,0.35)'); // nose
  px(fx - 5, ey + 16, 10, 2, 'rgba(150,60,60,0.75)'); px(fx - 4, ey + 18, 8, 1, 'rgba(120,50,50,0.45)'); // lips
  px(fx - 14, ey + 6, 4, 4, 'rgba(200,90,80,0.08)'); px(fx + 10, ey + 6, 4, 4, 'rgba(200,90,80,0.08)'); // cheeks
  const t = tex(c, { repeat: false }); t.magFilter = THREE.NearestFilter; t.generateMipmaps = true;
  return t;
}

/** Benglooru-style chunky look: nearest-neighbour magnification on the world textures (mipmaps keep distance clean). */
export function setPixelStyle(T, on) {
  if (!T) return;
  for (const k of Object.keys(T)) {
    const t = T[k]; if (!t || !t.isTexture || k === 'leaves' || k === 'bougain' || k === 'frond' || k === 'human' || k === 'signs' || k === 'ripple') continue;
    const want = on ? THREE.NearestFilter : THREE.LinearFilter;
    if (t.magFilter === want) continue;
    // halve the big canvases so the texel grid reads as deliberate chunky pixels up close
    const img = t.image;
    if (img && img.width >= 256 && img.getContext) {
      if (!t.userData.hi) {
        t.userData.hi = img;
        const lo = document.createElement('canvas'); lo.width = img.width / 2; lo.height = img.height / 2;
        const lx = lo.getContext('2d'); lx.imageSmoothingEnabled = true; lx.drawImage(img, 0, 0, lo.width, lo.height);
        t.userData.lo = lo;
      }
      t.image = on ? t.userData.lo : t.userData.hi;
    }
    t.magFilter = want; t.needsUpdate = true;
  }
}
